-- Review visibility never approves, signs or activates a contract.
ALTER TABLE public.client_contracts ADD COLUMN IF NOT EXISTS portal_review_visible boolean NOT NULL DEFAULT false;
GRANT SELECT(portal_review_visible,created_at,version) ON public.client_contracts TO zyteron_portal_client;
DROP POLICY IF EXISTS zyteron_customer_published_contract_summary ON public.client_contracts;
CREATE POLICY zyteron_customer_published_contract_summary ON public.client_contracts
 FOR SELECT TO zyteron_portal_client USING (
 archived_at IS NULL AND public.zyteron_client_business(client_id)
 AND ((portal_visible AND approval_status='APPROVED' AND frozen_at IS NOT NULL)
 OR (portal_review_visible AND status IN ('DRAFT','IN_REVIEW') AND frozen_at IS NULL))
 );
