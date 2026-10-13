-- Website/chat leads must be actionable records, not read-only projected cards.
CREATE OR REPLACE FUNCTION public.zyteron_web_lead_id(source_id text)
RETURNS uuid LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path=pg_catalog AS $$
  SELECT CASE WHEN source_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN source_id::uuid ELSE
    (substr(h,1,8)||'-'||substr(h,9,4)||'-4'||substr(h,14,3)||'-a'||substr(h,18,3)||'-'||substr(h,21,12))::uuid END
  FROM (SELECT encode(sha256(convert_to('zyteron:legacy-view:lead:'||source_id,'UTF8')),'hex') h) hashes;
$$;
REVOKE ALL ON FUNCTION public.zyteron_web_lead_id(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_web_lead_id(text) TO service_role;

INSERT INTO public.lead_sources(code,name)
SELECT DISTINCT coalesce(nullif(trim(source),''),type::text),coalesce(nullif(trim(source),''),type::text)
FROM public."Lead" ON CONFLICT(code) DO NOTHING;
INSERT INTO public.lead_sources(code,name) VALUES ('CONTACTO_WEB','Contacto web'),('COTIZADOR_WEB','Cotizador web'),('CHAT_IA','Chat IA')
ON CONFLICT(code) DO NOTHING;

INSERT INTO public.leads(id,company_name,contact_name,email,phone,source_id,interest,notes,status,client_id,created_at,updated_at)
SELECT public.zyteron_web_lead_id(l.id),coalesce(nullif(u.company,''),l.name),l.name,l.email,l.phone,s.id,l.type::text,l.message,
  CASE p.status WHEN 'LOST' THEN 'DISQUALIFIED' WHEN 'CLOSED' THEN 'CONVERTED' WHEN 'IN_PROGRESS' THEN 'CONTACTED' ELSE 'NEW' END,
  link.client_id,l."createdAt",l."createdAt"
FROM public."Lead" l
LEFT JOIN LATERAL (SELECT id,company FROM (SELECT id,company,count(*) OVER() n FROM public."User" WHERE role='CLIENT' AND (id=l."userId" OR (l."userId" IS NULL AND lower(email)=lower(l.email)))) candidates WHERE n=1) u ON true
LEFT JOIN public.zyteron_legacy_client_link link ON link.user_id=u.id AND l."userId"=u.id
LEFT JOIN public."ClientProcess" p ON p.id=l."processId"
LEFT JOIN public.lead_sources s ON s.code=coalesce(nullif(trim(l.source),''),l.type::text)
ON CONFLICT(id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.zyteron_web_lead_to_commercial()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE source_uuid uuid; company text; linked_client uuid; state text;
BEGIN
  INSERT INTO public.lead_sources(code,name) VALUES(coalesce(nullif(trim(NEW.source),''),NEW.type::text),coalesce(nullif(trim(NEW.source),''),NEW.type::text))
    ON CONFLICT(code) DO NOTHING;
  SELECT id INTO source_uuid FROM public.lead_sources WHERE code=coalesce(nullif(trim(NEW.source),''),NEW.type::text);
  SELECT u.company,CASE WHEN u.id=NEW."userId" THEN l.client_id ELSE NULL END INTO company,linked_client FROM public."User" u LEFT JOIN public.zyteron_legacy_client_link l ON l.user_id=u.id WHERE u.role='CLIENT' AND (u.id=NEW."userId" OR (NEW."userId" IS NULL AND lower(u.email)=lower(NEW.email))) AND (SELECT count(*) FROM public."User" x WHERE x.role='CLIENT' AND (x.id=NEW."userId" OR (NEW."userId" IS NULL AND lower(x.email)=lower(NEW.email))))=1;
  SELECT status INTO state FROM public."ClientProcess" WHERE id=NEW."processId";
  INSERT INTO public.leads(id,company_name,contact_name,email,phone,source_id,interest,notes,status,client_id,created_at,updated_at)
  VALUES(public.zyteron_web_lead_id(NEW.id),coalesce(nullif(company,''),NEW.name),NEW.name,NEW.email,NEW.phone,source_uuid,NEW.type::text,NEW.message,
    CASE state WHEN 'LOST' THEN 'DISQUALIFIED' WHEN 'CLOSED' THEN 'CONVERTED' WHEN 'IN_PROGRESS' THEN 'CONTACTED' ELSE 'NEW' END,linked_client,NEW."createdAt",NEW."createdAt")
  ON CONFLICT(id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_web_lead_to_commercial() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_web_lead_to_commercial() TO service_role;
DROP TRIGGER IF EXISTS zyteron_web_lead_to_commercial ON public."Lead";
CREATE TRIGGER zyteron_web_lead_to_commercial AFTER INSERT ON public."Lead"
FOR EACH ROW EXECUTE FUNCTION public.zyteron_web_lead_to_commercial();

-- One opportunity per conversion, even when a request is retried concurrently.
CREATE OR REPLACE FUNCTION public.zyteron_convert_commercial_lead(target_lead uuid, actor_id uuid, input jsonb DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE l public.leads%rowtype; stage public.pipeline_stages%rowtype; opportunity uuid; amount numeric;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id=target_lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead no encontrado'; END IF;
  IF l.status='CONVERTED' THEN
    SELECT id INTO opportunity FROM public.opportunities WHERE lead_id=l.id ORDER BY created_at LIMIT 1;
    IF opportunity IS NOT NULL THEN RETURN opportunity; END IF;
  END IF;
  IF l.status!='QUALIFIED' THEN RAISE EXCEPTION 'Califica el lead antes de convertirlo en oportunidad'; END IF;
  SELECT * INTO stage FROM public.pipeline_stages WHERE active AND kind='OPEN'
    AND (nullif(input->>'stageId','') IS NULL OR id=(input->>'stageId')::uuid) ORDER BY position LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Selecciona una etapa comercial activa'; END IF;
  amount:=coalesce(nullif(input->>'estimatedValue','')::numeric,0);
  IF amount<0 OR amount='NaN'::numeric THEN RAISE EXCEPTION 'Importe estimado inválido'; END IF;
  INSERT INTO public.opportunities(lead_id,client_id,company,name,description,owner_id,estimated_value,currency,pipeline_id,stage_id,probability,expected_close_date,next_action_at)
  VALUES(l.id,l.client_id,l.company_name,coalesce(nullif(trim(input->>'name'),''),nullif(l.interest,''),'Oportunidad '||l.company_name),l.notes,l.assigned_to,amount,'CLP',stage.pipeline_id,stage.id,stage.probability,nullif(input->>'expectedCloseDate','')::date,l.next_action_at)
    RETURNING id INTO opportunity;
  UPDATE public.leads SET status='CONVERTED',updated_at=now() WHERE id=l.id;
  INSERT INTO public.commercial_events(aggregate_type,aggregate_id,event_type,actor_id,payload)
  VALUES('LEAD',l.id,'LEAD_CONVERTED',$2,jsonb_build_object('opportunityId',opportunity)),('OPPORTUNITY',opportunity,'OPPORTUNITY_CREATED',$2,jsonb_build_object('leadId',l.id));
  RETURN opportunity;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_convert_commercial_lead(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_convert_commercial_lead(uuid,uuid,jsonb) TO service_role;

-- Proposal acceptance is not a financial settlement and must never insert a sale.
CREATE OR REPLACE FUNCTION public.zyteron_accept_commercial_proposal(target_quote uuid, actor_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE q public.quotes%rowtype;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id=target_quote FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cotización no encontrada'; END IF;
  IF q.status='ACCEPTED' THEN RETURN q.id; END IF;
  IF q.status NOT IN ('SENT','NEGOTIATING') THEN RAISE EXCEPTION 'La propuesta debe estar enviada antes de registrar su aceptación'; END IF;
  UPDATE public.quotes SET status='ACCEPTED',accepted_at=now(),updated_at=now() WHERE id=q.id;
  INSERT INTO public.commercial_events(aggregate_type,aggregate_id,event_type,actor_id,payload)
  VALUES('QUOTE',q.id,'QUOTE_ACCEPTED',$2,jsonb_build_object('saleCreated',false,'financialSettlement',false));
  RETURN q.id;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_accept_commercial_proposal(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_accept_commercial_proposal(uuid,uuid) TO service_role;
