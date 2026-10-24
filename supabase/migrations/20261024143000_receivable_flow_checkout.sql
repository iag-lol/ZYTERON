CREATE TABLE public.zyteron_receivable_flow (
 id uuid PRIMARY KEY,
 receivable_id text NOT NULL REFERENCES public."Receivable"(id) ON DELETE RESTRICT,
 user_id text NOT NULL REFERENCES public."User"(id) ON DELETE RESTRICT,
 account_hash text NOT NULL,
 amount integer NOT NULL CHECK(amount>0),
 state text NOT NULL CHECK(state IN ('CREATING','UNKNOWN','PENDING','CONFIRMED','REJECTED','CANCELLED','REVIEW_REQUIRED')),
 commerce_order text NOT NULL UNIQUE,
 flow_order bigint UNIQUE,
 token_hash text UNIQUE,
 token_cipher text,
 checkout_url text,
 payment_id text REFERENCES public."Payment"(id) ON DELETE RESTRICT,
 accepted_at timestamptz NOT NULL DEFAULT now(),
 verified_at timestamptz,
 available_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX zyteron_receivable_flow_open ON public.zyteron_receivable_flow(receivable_id,account_hash)
 WHERE state IN ('CREATING','UNKNOWN','PENDING');
CREATE INDEX zyteron_receivable_flow_reconcile ON public.zyteron_receivable_flow(available_at)
 WHERE state IN ('PENDING','UNKNOWN');
ALTER TABLE public.zyteron_receivable_flow ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_receivable_flow FROM PUBLIC,anon,authenticated,zyteron_portal_client;
GRANT ALL ON public.zyteron_receivable_flow TO service_role;
