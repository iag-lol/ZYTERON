CREATE TABLE public.zyteron_quote_collection_settings (
 quote_id uuid PRIMARY KEY,
 first_date date NOT NULL,
 charge_day integer NOT NULL CHECK(charge_day BETWEEN 1 AND 31),
 reminders_enabled boolean NOT NULL DEFAULT true,
 suspension_enabled boolean NOT NULL DEFAULT false,
 grace_days integer NOT NULL DEFAULT 7 CHECK(grace_days BETWEEN 0 AND 90),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zyteron_quote_collection_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_quote_collection_settings FROM PUBLIC,anon,authenticated,zyteron_portal_client;
GRANT ALL ON public.zyteron_quote_collection_settings TO service_role;
