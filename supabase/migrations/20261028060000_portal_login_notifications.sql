CREATE TABLE public.zyteron_portal_login_notifications (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES public."User"(id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  recipient text NOT NULL,
  subject text NOT NULL,
  body_text text NOT NULL,
  body_html text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('credentials','google')),
  state text NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','PROCESSING','WAITING_CONFIGURATION','ACCEPTED','REVIEW_REQUIRED')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  first_attempt_at timestamptz,
  sender text,
  lease uuid,
  lease_until timestamptz,
  provider_id text,
  error_code text,
  accepted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portal_login_notifications_due ON public.zyteron_portal_login_notifications(available_at) WHERE state IN ('PENDING','PROCESSING','WAITING_CONFIGURATION');
ALTER TABLE public.zyteron_portal_login_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_portal_login_notifications FROM PUBLIC,anon,authenticated,zyteron_portal_client;
GRANT ALL ON public.zyteron_portal_login_notifications TO service_role;
