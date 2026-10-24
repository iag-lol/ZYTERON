-- Acceso administrativo: las credenciales y los cambios financieros no se exponen por PostgREST.
CREATE TABLE public.zyteron_portal_login_ruts (
 rut text PRIMARY KEY CHECK(rut ~ '^[0-9]{7,8}-[0-9K]$'),
 user_id text NOT NULL UNIQUE REFERENCES public."User"(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.zyteron_archived_quotes (
 quote_id uuid PRIMARY KEY, client_id uuid NOT NULL REFERENCES public.clients(id),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 500),
 actor_id text, archived_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.zyteron_quote_date_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), installment_id uuid NOT NULL REFERENCES public.quote_payment_installments(id),
 previous_date date NOT NULL, due_date date NOT NULL, reason text NOT NULL,
 actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zyteron_portal_login_ruts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyteron_archived_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyteron_quote_date_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_portal_login_ruts,public.zyteron_archived_quotes,public.zyteron_quote_date_changes FROM PUBLIC,anon,authenticated,zyteron_portal_client;
GRANT SELECT,INSERT ON public.zyteron_portal_login_ruts,public.zyteron_archived_quotes,public.zyteron_quote_date_changes TO service_role;
ALTER TABLE public.quote_payment_installments ADD COLUMN due_date_override date;

CREATE OR REPLACE FUNCTION public.quote_payment_move_due(p_installment uuid,p_expected date,p_due date,p_reason text,p_actor uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE i public.quote_payment_installments%rowtype; p public.quote_payment_plans%rowtype;
BEGIN
 SELECT * INTO p FROM public.quote_payment_plans WHERE id=(SELECT plan_id FROM public.quote_payment_installments WHERE id=p_installment) FOR UPDATE;
 SELECT * INTO i FROM public.quote_payment_installments WHERE id=p_installment FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'QUOTE_PAYMENT_NOT_FOUND'; END IF;
 IF i.status<>'SCHEDULED' OR p.status='CANCELLED' THEN RAISE EXCEPTION 'QUOTE_PAYMENT_CLOSED'; END IF;
 IF i.due_date IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'QUOTE_PAYMENT_STALE'; END IF;
 IF p_due IS NULL OR p_due<date '2000-01-01' OR p_due>current_date+interval '10 years' OR length(trim(p_reason)) NOT BETWEEN 3 AND 500 OR p_actor IS NULL THEN RAISE EXCEPTION 'QUOTE_PAYMENT_INVALID'; END IF;
 UPDATE public.quote_payment_installments SET due_date=p_due,due_date_override=p_due,period_key=to_char(p_due,'YYYY-MM') WHERE id=i.id;
 INSERT INTO public.zyteron_quote_date_changes(installment_id,previous_date,due_date,reason,actor_id) VALUES(i.id,i.due_date,p_due,trim(p_reason),p_actor);
 RETURN i.id;
END $$;
REVOKE ALL ON FUNCTION public.quote_payment_move_due(uuid,date,date,text,uuid) FROM PUBLIC,anon,authenticated,zyteron_portal_client;
GRANT EXECUTE ON FUNCTION public.quote_payment_move_due(uuid,date,date,text,uuid) TO service_role;

-- Las excepciones de fecha sobreviven a cambios de importe o extensión del plan.
CREATE OR REPLACE FUNCTION public.quote_payment_reschedule(p_plan uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v public.quote_payment_plans%rowtype; r record; due date; n integer:=0;
BEGIN
 SELECT * INTO v FROM public.quote_payment_plans WHERE id=p_plan FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'QUOTE_PAYMENT_NOT_FOUND'; END IF;
 FOR r IN SELECT id,sequence,due_date,due_date_override,amount,currency FROM public.quote_payment_installments WHERE plan_id=p_plan AND status='SCHEDULED' ORDER BY sequence FOR UPDATE LOOP
  IF v.status='CANCELLED' OR (v.total_installments IS NOT NULL AND r.sequence>v.total_installments) THEN
   UPDATE public.quote_payment_installments SET status='CANCELLED',cancel_reason=CASE WHEN v.status='CANCELLED' THEN 'Plan anulado: '||v.cancel_reason ELSE 'Plan modificado: cuota fuera del nuevo plazo' END WHERE id=r.id;
   n:=n+1;
  ELSE
   due:=coalesce(r.due_date_override,CASE WHEN v.frequency='ONE_TIME' THEN v.start_date ELSE public.quote_payment_due_date(v.start_date,v.payment_day,r.sequence) END);
   IF (due,v.amount,v.currency) IS DISTINCT FROM (r.due_date,r.amount,r.currency::text) THEN
    UPDATE public.quote_payment_installments SET due_date=due,period_key=to_char(due,'YYYY-MM'),amount=v.amount,currency=v.currency WHERE id=r.id;
    n:=n+1;
   END IF;
  END IF;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.quote_payment_reschedule(uuid) FROM PUBLIC,anon,authenticated,zyteron_portal_client;
GRANT EXECUTE ON FUNCTION public.quote_payment_reschedule(uuid) TO service_role;

-- La conversión es indivisible: ficha, cuenta, vínculo, RUT de acceso y permisos.
CREATE FUNCTION public.zyteron_enroll_lead(p_lead uuid,p_rut text,p_name text,p_email text,p_hash text,p_actor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE l public.leads%rowtype; c uuid; u text; existing_email text; existing_rut text; source_id text; digits text; tally integer:=0; factor integer:=2; k integer; verifier text;
BEGIN
 SELECT * INTO l FROM public.leads WHERE id=p_lead FOR UPDATE;
 IF NOT FOUND OR l.archived_at IS NOT NULL THEN RAISE EXCEPTION 'LEAD_NOT_FOUND'; END IF;
 IF p_rut !~ '^[0-9]{7,8}-[0-9K]$' OR length(trim(p_name)) NOT BETWEEN 2 AND 160 OR p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR p_hash !~ '^\$2[aby]\$12\$[./A-Za-z0-9]{53}$' THEN RAISE EXCEPTION 'ENROLLMENT_INVALID'; END IF;
 digits:=split_part(p_rut,'-',1);
 FOR k IN REVERSE length(digits)..1 LOOP
  tally:=tally+substr(digits,k,1)::integer*factor;factor:=CASE WHEN factor=7 THEN 2 ELSE factor+1 END;
 END LOOP;
 verifier:=CASE 11-tally%11 WHEN 11 THEN '0' WHEN 10 THEN 'K' ELSE (11-tally%11)::text END;
 IF verifier<>split_part(p_rut,'-',2) THEN RAISE EXCEPTION 'ENROLLMENT_INVALID'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('portal-email:'||lower(p_email),0));
 PERFORM pg_advisory_xact_lock(hashtextextended('portal-rut:'||p_rut,0));
 IF l.client_id IS NOT NULL THEN
  SELECT x.user_id INTO u FROM public.zyteron_legacy_client_link x JOIN public.zyteron_portal_login_ruts r ON r.user_id=x.user_id AND r.rut=p_rut JOIN public."User" a ON a.id=x.user_id AND lower(a.email)=lower(p_email) WHERE x.client_id=l.client_id;
  IF u IS NOT NULL THEN RETURN jsonb_build_object('clientId',l.client_id,'userId',u,'created',false); END IF;
  RAISE EXCEPTION 'LEAD_ALREADY_LINKED';
 END IF;
 IF EXISTS(SELECT 1 FROM public."User" WHERE lower(email)=lower(p_email)) THEN RAISE EXCEPTION 'ENROLLMENT_EMAIL_EXISTS'; END IF;
 IF EXISTS(SELECT 1 FROM public.zyteron_portal_login_ruts WHERE rut=p_rut) THEN RAISE EXCEPTION 'ENROLLMENT_RUT_EXISTS'; END IF;
 IF (SELECT count(*) FROM public.clients WHERE upper(regexp_replace(rut,'[^0-9kK]','','g'))=replace(p_rut,'-',''))>1 THEN RAISE EXCEPTION 'ENROLLMENT_CLIENT_REVIEW'; END IF;
 SELECT id,general_email INTO c,existing_email FROM public.clients WHERE upper(regexp_replace(rut,'[^0-9kK]','','g'))=replace(p_rut,'-','') FOR UPDATE;
 IF c IS NOT NULL AND (lower(coalesce(existing_email,''))<>lower(p_email) OR EXISTS(SELECT 1 FROM public.zyteron_legacy_client_link WHERE client_id=c)) THEN RAISE EXCEPTION 'ENROLLMENT_CLIENT_REVIEW'; END IF;
 IF c IS NULL THEN
  INSERT INTO public.clients(legal_name,trade_name,rut,general_email,phone,status,source,country) VALUES(trim(p_name),trim(p_name),p_rut,lower(p_email),l.phone,'ONBOARDING','LEAD','Chile') RETURNING id INTO c;
 END IF;
 u:=gen_random_uuid()::text;
 INSERT INTO public."User"(id,email,name,company,phone,rut,"passwordHash",role,"accountStatus","authProvider","createdAt","updatedAt") VALUES(u,lower(p_email),l.contact_name,trim(p_name),l.phone,p_rut,p_hash,'CLIENT','PENDING','LOCAL',now(),now());
 INSERT INTO public.zyteron_legacy_client_link(user_id,client_id) VALUES(u,c);
 INSERT INTO public.zyteron_portal_login_ruts(rut,user_id) VALUES(p_rut,u);
 INSERT INTO public.client_portal_settings(client_id,enabled) VALUES(c,true) ON CONFLICT(client_id) DO UPDATE SET enabled=true,updated_at=now();
 UPDATE public.leads SET client_id=c,rut=p_rut,company_name=trim(p_name),email=lower(p_email),status='CONVERTED',updated_at=now() WHERE id=l.id;
 UPDATE public.opportunities SET client_id=c,updated_at=now() WHERE lead_id=l.id AND client_id IS NULL;
 UPDATE public.quotes SET client_id=c,updated_at=now() WHERE lead_id=l.id AND client_id IS NULL;
 FOR source_id IN SELECT id FROM public."Lead" WHERE public.zyteron_web_lead_id(id)=l.id LOOP
  UPDATE public."Lead" SET "userId"=u WHERE id=source_id;
  UPDATE public."Quote" SET "userId"=u WHERE id IN(SELECT quote_id FROM public.zyteron_lead_quote_drafts WHERE lead_id=source_id) AND "userId" IS NULL AND lower(email)=lower(p_email);
 END LOOP;
 INSERT INTO public."ClientAuditLog"(id,"actorId","targetUserId",action,"entityType","entityId",details,"createdAt") VALUES(gen_random_uuid()::text,p_actor,u,'LEAD_CLIENT_ENROLLED','Lead',l.id::text,jsonb_build_object('clientId',c,'emailVerificationRequired',true),now());
 RETURN jsonb_build_object('clientId',c,'userId',u,'created',true);
END $$;
REVOKE ALL ON FUNCTION public.zyteron_enroll_lead(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated,zyteron_portal_client;
GRANT EXECUTE ON FUNCTION public.zyteron_enroll_lead(uuid,text,text,text,text,text) TO service_role;
