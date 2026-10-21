ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp_conversation_id uuid
  REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS leads_whatsapp_conversation_idx
  ON public.leads(whatsapp_conversation_id) WHERE whatsapp_conversation_id IS NOT NULL;

INSERT INTO public.lead_sources(code,name) VALUES ('WHATSAPP','WhatsApp')
ON CONFLICT(code) DO UPDATE SET active=true;

-- lead_id in WhatsApp contains the legacy quote ID; the commercial link is separate.
CREATE OR REPLACE FUNCTION public.zyteron_sync_whatsapp_lead(conversation_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE c public.whatsapp_conversations%rowtype; target_id uuid; source_uuid uuid; inserted_id uuid;
BEGIN
  SELECT * INTO c FROM public.whatsapp_conversations WHERE id=conversation_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  target_id:=public.zyteron_web_lead_id('whatsapp:'||c.id::text);
  SELECT id INTO source_uuid FROM public.lead_sources WHERE code='WHATSAPP';
  INSERT INTO public.leads(id,company_name,contact_name,email,phone,whatsapp,source_id,
    interest,notes,status,created_at,updated_at,whatsapp_conversation_id)
  VALUES(target_id,coalesce(nullif(trim(c.company),''),nullif(trim(c.customer_name),''),nullif(trim(c.profile_name),''),'+'||c.phone),
    coalesce(nullif(trim(c.customer_name),''),nullif(trim(c.profile_name),''),'+'||c.phone),
    nullif(trim(c.email),''),'+'||c.phone,'+'||c.phone,source_uuid,nullif(trim(c.requested_service),''),
    c.notes,CASE c.lead_status WHEN 'perdido' THEN 'DISQUALIFIED'
      WHEN 'calificado' THEN 'QUALIFIED' WHEN 'cotizacion_enviada' THEN 'QUALIFIED'
      WHEN 'negociacion' THEN 'QUALIFIED' WHEN 'contactado' THEN 'CONTACTED' ELSE 'NEW' END,
    c.created_at,c.updated_at,c.id)
  ON CONFLICT(id) DO NOTHING RETURNING id INTO inserted_id;
  IF inserted_id IS NULL THEN
    -- CRM stage, ownership, notes and archive state belong to the commercial team.
    UPDATE public.leads SET
      company_name=coalesce(nullif(trim(c.company),''),nullif(trim(c.customer_name),''),nullif(trim(c.profile_name),''),'+'||c.phone),
      contact_name=coalesce(nullif(trim(c.customer_name),''),nullif(trim(c.profile_name),''),'+'||c.phone),
      email=coalesce(nullif(trim(c.email),''),email),phone='+'||c.phone,whatsapp='+'||c.phone,
      interest=coalesce(nullif(trim(c.requested_service),''),interest),updated_at=now()
    WHERE id=target_id AND whatsapp_conversation_id=c.id;
  ELSE
    INSERT INTO public.commercial_events(aggregate_type,aggregate_id,event_type,payload)
    VALUES('LEAD',target_id,'LEAD_CREATED',jsonb_build_object('source','WHATSAPP','conversationId',c.id));
  END IF;
  RETURN target_id;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_sync_whatsapp_lead(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_sync_whatsapp_lead(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.zyteron_whatsapp_to_commercial()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM public.zyteron_sync_whatsapp_lead(NEW.id);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_whatsapp_to_commercial() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_whatsapp_to_commercial() TO service_role;
DROP TRIGGER IF EXISTS zyteron_whatsapp_to_commercial ON public.whatsapp_conversations;
CREATE TRIGGER zyteron_whatsapp_to_commercial AFTER INSERT OR UPDATE OF
  customer_name,profile_name,company,email,phone,requested_service,lead_status,notes
  ON public.whatsapp_conversations FOR EACH ROW
  EXECUTE FUNCTION public.zyteron_whatsapp_to_commercial();

SELECT public.zyteron_sync_whatsapp_lead(id) FROM public.whatsapp_conversations;
NOTIFY pgrst,'reload schema';
