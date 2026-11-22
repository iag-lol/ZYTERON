CREATE TABLE IF NOT EXISTS public.control_user_login_ruts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rut text NOT NULL UNIQUE CHECK (rut ~ '^[1-9][0-9]{6,7}-[0-9K]$'),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.control_user_login_ruts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.control_user_login_ruts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.control_user_login_ruts TO service_role;
NOTIFY pgrst, 'reload schema';
