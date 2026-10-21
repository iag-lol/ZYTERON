CREATE TABLE public.zyteron_lead_quote_drafts (
 lead_id text PRIMARY KEY, quote_id text NOT NULL REFERENCES public."Quote"(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.zyteron_monthly_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL UNIQUE,
 native_quote_id text REFERENCES public."Quote"(id) ON DELETE RESTRICT,
 user_id text NOT NULL REFERENCES public."User"(id) ON DELETE RESTRICT,
 label text NOT NULL, amount integer NOT NULL CHECK(amount>0),
 anchor_date date NOT NULL, next_due date NOT NULL,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','PAUSED')),
 reminders_enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.zyteron_billing_notices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES public.zyteron_monthly_plans(id),
 receivable_id text NOT NULL REFERENCES public."Receivable"(id), phase text NOT NULL,
 recipient text NOT NULL, balance integer NOT NULL CHECK(balance>0),
 subject text NOT NULL, body text NOT NULL,
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','PROCESSING','ACCEPTED','SUPPRESSED','REVIEW_REQUIRED')),
 lease uuid, lease_until timestamptz, first_attempt_at timestamptz, provider_id text,
 available_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(receivable_id,phase)
);
CREATE INDEX zyteron_monthly_due_idx ON public.zyteron_monthly_plans(next_due) WHERE status='ACTIVE';
CREATE INDEX zyteron_billing_pending_idx ON public.zyteron_billing_notices(available_at) WHERE state IN ('PENDING','PROCESSING');
ALTER TABLE public.zyteron_lead_quote_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyteron_monthly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyteron_billing_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_lead_quote_drafts,public.zyteron_monthly_plans,public.zyteron_billing_notices FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zyteron_lead_quote_drafts,public.zyteron_monthly_plans,public.zyteron_billing_notices TO service_role;
GRANT SELECT(id,quote_id,user_id,label,amount,anchor_date,next_due,status,created_at) ON public.zyteron_monthly_plans TO zyteron_portal_client;
CREATE POLICY zyteron_owned_monthly_plan ON public.zyteron_monthly_plans FOR SELECT TO zyteron_portal_client
 USING(public.zyteron_portal_owner(user_id) AND public.zyteron_portal_module_enabled('invoices'));
GRANT SELECT(id,quote_number,version,client_id,company_name,contact_name,contact_email,status,currency,total_amount,subtotal,discount_total,net_amount,tax_rate,tax_amount,valid_until,payment_terms,commercial_terms,billing_type,document_id,created_at,sent_at) ON public.quotes TO zyteron_portal_client;
CREATE POLICY zyteron_owned_sent_quote ON public.quotes FOR SELECT TO zyteron_portal_client
 USING(public.zyteron_client_business(client_id) AND public.zyteron_portal_module_enabled(NULL) AND status IN ('SENT','NEGOTIATING','ACCEPTED','CONVERTED','DECLINED','EXPIRED'));
GRANT SELECT(id,quote_id,description,quantity,unit_price,discount_percent,taxable,subtotal,position) ON public.quote_items TO zyteron_portal_client;
CREATE POLICY zyteron_owned_sent_quote_items ON public.quote_items FOR SELECT TO zyteron_portal_client
 USING(EXISTS(SELECT 1 FROM public.quotes q WHERE q.id=quote_items.quote_id));
GRANT SELECT(id,client_id,invoice_number,description,currency,total_amount,balance_due,issue_date,due_date,status) ON public.invoices TO zyteron_portal_client;
CREATE POLICY zyteron_owned_issued_invoice ON public.invoices FOR SELECT TO zyteron_portal_client
 USING(public.zyteron_client_business(client_id) AND public.zyteron_portal_module_enabled('invoices') AND status IN ('ISSUED','PARTIALLY_PAID','PAID','CREDITED'));

CREATE TABLE public.zyteron_proposal_delivery (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),quote_id text NOT NULL UNIQUE REFERENCES public."Quote"(id),
 payload jsonb NOT NULL,state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','ACCEPTED','REVIEW_REQUIRED')),
 first_attempt_at timestamptz NOT NULL DEFAULT now(),provider_id text
);
ALTER TABLE public.zyteron_proposal_delivery ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_proposal_delivery FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zyteron_proposal_delivery TO service_role;

ALTER TABLE public.quotes ADD COLUMN revision_of uuid REFERENCES public.quotes(id) ON DELETE RESTRICT;
CREATE INDEX zyteron_quote_revision_idx ON public.quotes(revision_of,version);
CREATE OR REPLACE FUNCTION public.create_quote_version(target_quote_id uuid,actor_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q public.quotes%rowtype; next_version integer; result_id uuid;
BEGIN
 SELECT * INTO q FROM public.quotes WHERE id=target_quote_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cotización no encontrada'; END IF;
 IF q.status IN ('ACCEPTED','CONVERTED','CANCELLED') THEN RAISE EXCEPTION 'La cotización ya tiene compromisos'; END IF;
 SELECT id INTO result_id FROM public.quotes WHERE revision_of=q.id AND status IN ('DRAFT','REJECTED') ORDER BY version DESC LIMIT 1;
 IF result_id IS NOT NULL THEN RETURN result_id; END IF;
 SELECT greatest(q.version,coalesce(max(version),0))+1 INTO next_version FROM public.quotes WHERE revision_of=q.id;
 INSERT INTO public.quote_versions(quote_id,version_number,snapshot,document_id,document_hash,created_by)
 VALUES(q.id,q.version,to_jsonb(q)||jsonb_build_object('items',(SELECT coalesce(jsonb_agg(to_jsonb(i)),'[]'::jsonb) FROM public.quote_items i WHERE i.quote_id=q.id)),q.document_id,q.document_hash,actor_user_id)
 ON CONFLICT(quote_id,version_number) DO NOTHING;
 INSERT INTO public.quotes(quote_number,version,client_id,lead_id,opportunity_id,company_name,contact_name,contact_email,owner_id,status,currency,subtotal,discount_total,net_amount,tax_rate,tax_amount,total_amount,valid_until,payment_terms,commercial_terms,notes,billing_type,created_by,revision_of)
 VALUES(q.quote_number||'-R'||next_version,next_version,q.client_id,q.lead_id,q.opportunity_id,q.company_name,q.contact_name,q.contact_email,q.owner_id,'DRAFT',q.currency,q.subtotal,q.discount_total,q.net_amount,q.tax_rate,q.tax_amount,q.total_amount,q.valid_until,q.payment_terms,q.commercial_terms,q.notes,q.billing_type,actor_user_id,q.id)
 RETURNING id INTO result_id;
 INSERT INTO public.quote_items(quote_id,catalog_service_id,description,quantity,unit_price,discount_percent,taxable,subtotal,position)
 SELECT result_id,catalog_service_id,description,quantity,unit_price,discount_percent,taxable,subtotal,position FROM public.quote_items WHERE quote_id=q.id;
 RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION public.create_quote_version(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_quote_version(uuid,uuid) TO service_role;
