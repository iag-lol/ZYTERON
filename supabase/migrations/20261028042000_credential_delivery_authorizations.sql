-- Commercial delivery authorization does not replace password and code verification.
CREATE TABLE IF NOT EXISTS public.zyteron_credential_delivery_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public."User"(id) ON DELETE RESTRICT,
  project_id text NOT NULL REFERENCES public."Project"(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (length(trim(reason)) >= 20),
  authorized_by text NOT NULL CHECK (length(trim(authorized_by)) >= 3),
  authorized_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(user_id,project_id)
);
ALTER TABLE public.zyteron_credential_delivery_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_credential_delivery_authorizations FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zyteron_credential_delivery_authorizations TO service_role;
GRANT SELECT ON public.zyteron_credential_delivery_authorizations TO zyteron_portal_client;
CREATE POLICY credential_delivery_owner_read
  ON public.zyteron_credential_delivery_authorizations FOR SELECT TO zyteron_portal_client
  USING(user_id=current_setting('zyteron.portal_user_id',true));
