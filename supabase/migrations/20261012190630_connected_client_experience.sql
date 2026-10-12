BEGIN;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "sessionVersion" integer NOT NULL DEFAULT 0;
-- Existing identities and financial records stay authoritative. A restricted
-- NOLOGIN role adds RLS to client reads made through the verified web session.
DO $$BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='zyteron_portal_client') THEN CREATE ROLE zyteron_portal_client NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT; END IF; END$$;
GRANT zyteron_portal_client TO postgres;
GRANT USAGE ON SCHEMA public TO zyteron_portal_client;
CREATE OR REPLACE FUNCTION public.zyteron_portal_user() RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT nullif(current_setting('zyteron.portal_user_id',true),'')$$;
CREATE OR REPLACE FUNCTION public.zyteron_portal_owner(candidate text) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT candidate=public.zyteron_portal_user() AND EXISTS(SELECT 1 FROM public."User" WHERE id=public.zyteron_portal_user() AND "accountStatus"='ACTIVE' AND "emailVerifiedAt" IS NOT NULL)$$;
REVOKE ALL ON FUNCTION public.zyteron_portal_user(),public.zyteron_portal_owner(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_portal_user(),public.zyteron_portal_owner(text) TO zyteron_portal_client;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."User" FROM anon,authenticated,zyteron_portal_client;
GRANT SELECT(id,email,name,"firstName","lastName",role,"accountStatus","authProvider","emailVerifiedAt","lastLoginAt","createdAt","updatedAt",company,phone,address,city,country,rut,"contactName",industry,tier) ON public."User" TO zyteron_portal_client;
GRANT UPDATE("firstName","lastName",name,company,phone,address,city,country,"contactName","updatedAt") ON public."User" TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_self ON public."User";
CREATE POLICY zyteron_client_self ON public."User" TO zyteron_portal_client USING(id=public.zyteron_portal_user() AND "accountStatus"='ACTIVE' AND "emailVerifiedAt" IS NOT NULL) WITH CHECK(id=public.zyteron_portal_user() AND "accountStatus"='ACTIVE' AND "emailVerifiedAt" IS NOT NULL);
DO $$DECLARE t text; owner_column text; BEGIN
 FOR t,owner_column IN SELECT * FROM (VALUES('Project','clientId'),('Sale','clientId'),('TaxDocument','clientId'),('Receivable','clientId'),('Payment','clientId'),('ClientRequest','clientId'),('WorkOrder','clientId'),('Visit','clientId'),('ClientProcess','clientId'),('ClientDocument','userId'),('ClientCredential','userId'),('ClientCommunication','userId'),('ClientNotification','userId'),('PortalRequest','userId'),('SupportTicket','userId')) v LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated,zyteron_portal_client',t);
  EXECUTE format('GRANT SELECT ON public.%I TO zyteron_portal_client',t);
  EXECUTE format('DROP POLICY IF EXISTS zyteron_client_read ON public.%I',t);
  EXECUTE format('CREATE POLICY zyteron_client_read ON public.%I FOR SELECT TO zyteron_portal_client USING(public.zyteron_portal_owner(%I))',t,owner_column);
 END LOOP;
END$$;
REVOKE SELECT ON public."ClientProcess",public."WorkOrder",public."Visit" FROM zyteron_portal_client;
GRANT SELECT(id,"clientId",date,status,"createdAt") ON public."Visit" TO zyteron_portal_client;
GRANT SELECT(id,"clientId",code,title,stage,status,"startedAt","closedAt","createdAt","updatedAt") ON public."ClientProcess" TO zyteron_portal_client;
GRANT SELECT(id,"clientId",code,status,title,description,"plannedDate","dueDate","createdAt","updatedAt") ON public."WorkOrder" TO zyteron_portal_client;
-- Internal process events, password/reveal codes and session secrets have no
-- client reader grant. Published status is presented through Project instead.
REVOKE ALL ON public."ClientProcessEvent",public."CredentialRevealCode",public."EmailVerificationCode",public."PasswordResetCode",public."Session" FROM anon,authenticated,zyteron_portal_client;
ALTER TABLE public."CredentialRevealCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Quote" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."Quote" FROM anon,authenticated,zyteron_portal_client;
GRANT SELECT ON public."Quote" TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_quote ON public."Quote";
CREATE POLICY zyteron_client_quote ON public."Quote" FOR SELECT TO zyteron_portal_client USING(public.zyteron_portal_owner("userId") OR ("userId" IS NULL AND EXISTS(SELECT 1 FROM public."User" u WHERE u.id=public.zyteron_portal_user() AND lower(u.email)=lower("Quote".email))));
ALTER TABLE public."SupportTicketMessage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."SupportTicketMessage" FROM anon,authenticated,zyteron_portal_client;
GRANT SELECT,INSERT ON public."SupportTicketMessage" TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_message_read ON public."SupportTicketMessage";
CREATE POLICY zyteron_client_message_read ON public."SupportTicketMessage" FOR SELECT TO zyteron_portal_client USING(NOT "isInternal" AND EXISTS(SELECT 1 FROM public."SupportTicket" t WHERE t.id="ticketId" AND public.zyteron_portal_owner(t."userId")));
DROP POLICY IF EXISTS zyteron_client_message_write ON public."SupportTicketMessage";
CREATE POLICY zyteron_client_message_write ON public."SupportTicketMessage" FOR INSERT TO zyteron_portal_client WITH CHECK(NOT "isInternal" AND "authorRole"='CLIENT' AND public.zyteron_portal_owner("userId") AND EXISTS(SELECT 1 FROM public."SupportTicket" t WHERE t.id="ticketId" AND public.zyteron_portal_owner(t."userId") AND t.status NOT IN('CLOSED','RESOLVED')));
DO $$DECLARE t text; BEGIN
 FOR t IN SELECT unnest(ARRAY['SupportTicket','ClientCommunication','PortalRequest']) LOOP
  EXECUTE format('GRANT INSERT ON public.%I TO zyteron_portal_client',t);
  EXECUTE format('DROP POLICY IF EXISTS zyteron_client_insert ON public.%I',t);
  EXECUTE format('CREATE POLICY zyteron_client_insert ON public.%I FOR INSERT TO zyteron_portal_client WITH CHECK(public.zyteron_portal_owner("userId"))',t);
 END LOOP;
END$$;
DROP POLICY IF EXISTS zyteron_client_insert ON public."SupportTicket";
CREATE POLICY zyteron_client_insert ON public."SupportTicket" FOR INSERT TO zyteron_portal_client WITH CHECK(public.zyteron_portal_owner("userId") AND ("projectId" IS NULL OR EXISTS(SELECT 1 FROM public."Project" p WHERE p.id="projectId" AND public.zyteron_portal_owner(p."clientId"))));
GRANT UPDATE(status,"updatedAt") ON public."SupportTicket" TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_ticket_update ON public."SupportTicket";
CREATE POLICY zyteron_client_ticket_update ON public."SupportTicket" FOR UPDATE TO zyteron_portal_client USING(public.zyteron_portal_owner("userId") AND status NOT IN('CLOSED','RESOLVED')) WITH CHECK(public.zyteron_portal_owner("userId") AND status='WAITING_ADMIN');
GRANT UPDATE("isRead","readAt") ON public."ClientNotification" TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_notification_update ON public."ClientNotification";
CREATE POLICY zyteron_client_notification_update ON public."ClientNotification" FOR UPDATE TO zyteron_portal_client USING(public.zyteron_portal_owner("userId")) WITH CHECK(public.zyteron_portal_owner("userId"));
ALTER TABLE public."ClientAuditLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."ClientAuditLog" FROM anon,authenticated,zyteron_portal_client;
GRANT SELECT(id,action,"entityType","createdAt","targetUserId"),INSERT ON public."ClientAuditLog" TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_audit_read ON public."ClientAuditLog";
CREATE POLICY zyteron_client_audit_read ON public."ClientAuditLog" FOR SELECT TO zyteron_portal_client USING(public.zyteron_portal_owner("targetUserId"));
DROP POLICY IF EXISTS zyteron_client_audit_write ON public."ClientAuditLog";
CREATE POLICY zyteron_client_audit_write ON public."ClientAuditLog" FOR INSERT TO zyteron_portal_client WITH CHECK(public.zyteron_portal_owner("actorId") AND public.zyteron_portal_owner("targetUserId"));
ALTER TABLE public."PaymentAllocation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."PaymentAllocation" FROM anon,authenticated,zyteron_portal_client;
GRANT SELECT ON public."PaymentAllocation" TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_allocation ON public."PaymentAllocation";
CREATE POLICY zyteron_client_allocation ON public."PaymentAllocation" FOR SELECT TO zyteron_portal_client USING(EXISTS(SELECT 1 FROM public."Payment" p WHERE p.id="paymentId" AND public.zyteron_portal_owner(p."clientId")) AND EXISTS(SELECT 1 FROM public."Receivable" r WHERE r.id="receivableId" AND public.zyteron_portal_owner(r."clientId")));
GRANT SELECT(quote_id,client_id,state,paid_through,verified_at) ON public.zyteron_recurring_lifecycle TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_recurring ON public.zyteron_recurring_lifecycle;
CREATE POLICY zyteron_client_recurring ON public.zyteron_recurring_lifecycle FOR SELECT TO zyteron_portal_client USING(public.zyteron_portal_owner(client_id));
-- Public catalog reads stay public; configuration and credential codes do not.
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WebDiscount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Setting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."Setting",public."Lead" FROM anon,authenticated;
-- No fabricated tax identifier. Legacy contacts may be incomplete during
-- onboarding, and remain distinct until an administrator explicitly links them.
ALTER TABLE public.clients ALTER COLUMN rut DROP NOT NULL;
CREATE TABLE IF NOT EXISTS public.zyteron_legacy_client_link(user_id text PRIMARY KEY REFERENCES public."User"(id) ON DELETE RESTRICT,client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE RESTRICT,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.zyteron_legacy_client_link ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_legacy_client_link FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zyteron_legacy_client_link TO service_role;
GRANT SELECT ON public.zyteron_legacy_client_link TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_link ON public.zyteron_legacy_client_link;
CREATE POLICY zyteron_client_link ON public.zyteron_legacy_client_link FOR SELECT TO zyteron_portal_client USING(public.zyteron_portal_owner(user_id));
CREATE OR REPLACE FUNCTION public.zyteron_client_business(candidate uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.zyteron_legacy_client_link l WHERE l.client_id=candidate AND public.zyteron_portal_owner(l.user_id))$$;
REVOKE ALL ON FUNCTION public.zyteron_client_business(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_client_business(uuid) TO zyteron_portal_client;
GRANT SELECT(id,legal_name,trade_name,rut,country,address,general_email,phone,status) ON public.clients TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_business_read ON public.clients;
CREATE POLICY zyteron_client_business_read ON public.clients FOR SELECT TO zyteron_portal_client USING(public.zyteron_client_business(id));
ALTER TABLE public.client_services ADD COLUMN IF NOT EXISTS legacy_project_id text REFERENCES public."Project"(id) ON DELETE RESTRICT;
ALTER TABLE public.client_services ADD COLUMN IF NOT EXISTS legacy_quote_id text REFERENCES public."Quote"(id) ON DELETE RESTRICT;
GRANT SELECT(id,client_id,service_id,service_name,start_date,renewal_date,billing_frequency,agreed_price,currency,status,sla,created_at,updated_at,portal_visible,legacy_project_id,legacy_quote_id,end_date,billing_type) ON public.client_services TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_service_read ON public.client_services;
CREATE POLICY zyteron_client_service_read ON public.client_services FOR SELECT TO zyteron_portal_client USING(portal_visible AND public.zyteron_client_business(client_id));
GRANT SELECT(id,client_id,event_type,title,description,occurred_at,metadata,visibility) ON public.client_events TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_event_read ON public.client_events;
CREATE POLICY zyteron_client_event_read ON public.client_events FOR SELECT TO zyteron_portal_client USING(visibility='CLIENT_VISIBLE' AND public.zyteron_client_business(client_id));
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_messages ENABLE ROW LEVEL SECURITY;
-- Reuse the existing administrative thread/message tables for website chat.
ALTER TABLE public.sales_threads ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'EMAIL';
ALTER TABLE public.sales_threads ADD COLUMN IF NOT EXISTS legacy_user_id text REFERENCES public."User"(id) ON DELETE RESTRICT;
ALTER TABLE public.sales_threads ADD COLUMN IF NOT EXISTS visitor_hash text;
ALTER TABLE public.sales_threads ADD COLUMN IF NOT EXISTS reply_key text;
ALTER TABLE public.sales_threads ADD COLUMN IF NOT EXISTS reply_lease timestamptz;
ALTER TABLE public.sales_threads ADD COLUMN IF NOT EXISTS lead_id text REFERENCES public."Lead"(id) ON DELETE SET NULL;
ALTER TABLE public.sales_threads ADD COLUMN IF NOT EXISTS quote_id text REFERENCES public."Quote"(id) ON DELETE SET NULL;
ALTER TABLE public.sales_messages ADD COLUMN IF NOT EXISTS actor_kind text NOT NULL DEFAULT 'STAFF';
ALTER TABLE public.sales_messages ADD COLUMN IF NOT EXISTS request_key text;
CREATE UNIQUE INDEX IF NOT EXISTS zyteron_chat_turn_once ON public.sales_messages(thread_id,request_key,direction) WHERE request_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS zyteron_chat_user ON public.sales_threads(legacy_user_id,last_message_at DESC) WHERE channel='WEB_CHAT';
REVOKE ALL ON public.sales_threads,public.sales_messages FROM anon;
GRANT SELECT(id,subject,last_message_at,message_count,awaiting_reply,created_at,channel,legacy_user_id,lead_id,quote_id) ON public.sales_threads TO zyteron_portal_client;
GRANT SELECT(id,thread_id,direction,from_name,body_text,created_at,actor_kind) ON public.sales_messages TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_client_chat_thread ON public.sales_threads;
CREATE POLICY zyteron_client_chat_thread ON public.sales_threads FOR SELECT TO zyteron_portal_client USING(channel='WEB_CHAT' AND public.zyteron_portal_owner(legacy_user_id));
DROP POLICY IF EXISTS zyteron_client_chat_message ON public.sales_messages;
CREATE POLICY zyteron_client_chat_message ON public.sales_messages FOR SELECT TO zyteron_portal_client USING(EXISTS(SELECT 1 FROM public.sales_threads t WHERE t.id=thread_id AND t.channel='WEB_CHAT' AND public.zyteron_portal_owner(t.legacy_user_id)));
CREATE TABLE IF NOT EXISTS public.zyteron_request_rate(key text PRIMARY KEY,window_at timestamptz NOT NULL DEFAULT now(),hits integer NOT NULL DEFAULT 1 CHECK(hits>0));
CREATE TABLE IF NOT EXISTS public.zyteron_public_submission(namespace text NOT NULL,key_hash text NOT NULL,body_hash text NOT NULL,state text NOT NULL CHECK(state IN('PROCESSING','COMPLETE','FAILED')),response jsonb,lease_until timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(namespace,key_hash));
ALTER TABLE public.zyteron_request_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyteron_public_submission ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_request_rate,public.zyteron_public_submission FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zyteron_request_rate,public.zyteron_public_submission TO service_role;
-- The bridge backfill is performed by a reviewed application migration after
-- checking legacy IDs, roles and unique tax IDs. No financial totals change.
COMMIT;
