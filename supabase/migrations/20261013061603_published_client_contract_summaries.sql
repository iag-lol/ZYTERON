-- Publication is separate from signature, activation, payment and execution.
ALTER TABLE public.client_contracts ADD COLUMN IF NOT EXISTS portal_visible boolean NOT NULL DEFAULT false;
ALTER TABLE public.client_contracts ADD CONSTRAINT contract_portal_approved_summary CHECK(NOT portal_visible OR (approval_status='APPROVED' AND frozen_at IS NOT NULL));
GRANT SELECT(id,client_id,contract_number,name,status,signature_status,effective_status,start_date,end_date,total,currency,billing_frequency,signed_at,portal_visible,approval_status,frozen_at) ON public.client_contracts TO zyteron_portal_client;
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY zyteron_customer_published_contract_summary ON public.client_contracts FOR SELECT TO zyteron_portal_client
 USING(portal_visible AND approval_status='APPROVED' AND frozen_at IS NOT NULL AND public.zyteron_client_business(client_id));
