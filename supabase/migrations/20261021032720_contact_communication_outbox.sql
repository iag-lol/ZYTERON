CREATE TABLE public.zyteron_contact_events (
  event_key text PRIMARY KEY, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  expanded_at timestamptz
);
CREATE TABLE public.zyteron_contact_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text NOT NULL REFERENCES public.zyteron_contact_events(event_key),
  channel text NOT NULL CHECK(channel IN ('EMAIL','WHATSAPP')), recipient text NOT NULL,
  state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','PROCESSING','ACCEPTED','DELIVERED','FAILED','WAITING_CONFIGURATION','REVIEW_REQUIRED')),
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
  lease uuid, lease_until timestamptz, first_attempt_at timestamptz, provider_id text,
  error_code text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_key,channel,recipient)
);
CREATE INDEX zyteron_contact_delivery_work ON public.zyteron_contact_deliveries(state,available_at);
CREATE INDEX zyteron_contact_delivery_provider ON public.zyteron_contact_deliveries(provider_id) WHERE provider_id IS NOT NULL;
CREATE TABLE public.zyteron_contact_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  email_recipients text[] DEFAULT '{}', whatsapp_recipients text[] DEFAULT '{}', whatsapp_template text, whatsapp_language text NOT NULL DEFAULT 'es_CL',
  waba_id text, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.zyteron_contact_settings(id) VALUES(true);
ALTER TABLE public.zyteron_contact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyteron_contact_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyteron_contact_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_contact_events,public.zyteron_contact_deliveries,public.zyteron_contact_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.zyteron_contact_events,public.zyteron_contact_deliveries,public.zyteron_contact_settings TO service_role;

CREATE FUNCTION public.zyteron_queue_contact_event() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE event_id text; data jsonb; c public.whatsapp_conversations%rowtype; source_name text;
BEGIN
  IF TG_TABLE_NAME='leads' THEN
    IF NEW.whatsapp_conversation_id IS NOT NULL THEN RETURN NEW; END IF;
    SELECT name INTO source_name FROM public.lead_sources WHERE id=NEW.source_id;
    event_id:='lead:'||NEW.id;
    data:=jsonb_build_object('kind','lead','title','Nuevo contacto · '||coalesce(source_name,'CRM'),
      'name',coalesce(NEW.contact_name,NEW.company_name),'email',NEW.email,'phone',NEW.phone,
      'body',left(coalesce(NEW.notes,NEW.interest,'Nueva oportunidad de cliente'),2000),
      'href','/administracion/commercial/leads?lead='||NEW.id);
  ELSIF TG_TABLE_NAME='whatsapp_messages' THEN
    IF NEW.direction<>'in' THEN RETURN NEW; END IF;
    SELECT * INTO c FROM public.whatsapp_conversations WHERE id=NEW.conversation_id;
    event_id:='whatsapp:'||NEW.id;
    data:=jsonb_build_object('kind','whatsapp','title','Nuevo mensaje de WhatsApp',
      'name',coalesce(c.customer_name,c.profile_name,'+'||c.phone),'phone','+'||c.phone,
      'body',left(coalesce(NEW.content,'Nuevo mensaje recibido'),2000),
      'href','/administracion/commercial/whatsapp?conversation='||c.id);
  ELSE
    IF NEW.direction<>'INBOUND' OR NOT EXISTS(SELECT 1 FROM public.sales_threads WHERE id=NEW.thread_id AND channel='WEB_CHAT') THEN RETURN NEW; END IF;
    event_id:='webchat:'||NEW.id;
    data:=jsonb_build_object('kind','web','title','Nuevo mensaje en el chat web',
      'name',coalesce(NEW.from_name,'Visitante'),'body',left(coalesce(NEW.body_text,NEW.body_preview,''),2000),
      'href','/administracion/conversaciones-web?thread='||NEW.thread_id);
  END IF;
  INSERT INTO public.zyteron_contact_events(event_key,payload) VALUES(event_id,data) ON CONFLICT(event_key) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_queue_contact_event() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_queue_contact_event() TO service_role;
CREATE TRIGGER zyteron_contact_lead AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.zyteron_queue_contact_event();
CREATE TRIGGER zyteron_contact_whatsapp AFTER INSERT ON public.whatsapp_messages FOR EACH ROW EXECUTE FUNCTION public.zyteron_queue_contact_event();
CREATE TRIGGER zyteron_contact_webchat AFTER INSERT ON public.sales_messages FOR EACH ROW EXECUTE FUNCTION public.zyteron_queue_contact_event();
NOTIFY pgrst,'reload schema';

-- El navegador recibe los cambios por un endpoint de administración autenticado.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['whatsapp_conversations','whatsapp_messages','whatsapp_notes','whatsapp_quick_replies'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO service_role',t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',t||'_read',t);
  END LOOP;
END $$;
ALTER TABLE public.whatsapp_messages ADD COLUMN client_request_id uuid;
ALTER TABLE public.whatsapp_messages ADD COLUMN request_hash text;
CREATE UNIQUE INDEX whatsapp_messages_client_request ON public.whatsapp_messages(client_request_id) WHERE client_request_id IS NOT NULL;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='zyteron_contact_events') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.zyteron_contact_events;
 END IF;
END $$;
