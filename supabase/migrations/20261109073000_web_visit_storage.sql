-- El contador público escribe mediante el backend; no admite acceso desde el navegador.
CREATE TABLE IF NOT EXISTS public."WebVisit" (
  id text PRIMARY KEY,
  path text NOT NULL,
  "pageTitle" text,
  referrer text,
  "userAgent" text,
  "ipHash" text,
  "sessionId" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webvisit_createdat ON public."WebVisit" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_webvisit_path ON public."WebVisit" (path);
CREATE INDEX IF NOT EXISTS idx_webvisit_iphash ON public."WebVisit" ("ipHash");
CREATE INDEX IF NOT EXISTS idx_webvisit_session ON public."WebVisit" ("sessionId");

ALTER TABLE public."WebVisit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."WebVisit" FROM public, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public."WebVisit" TO service_role;

NOTIFY pgrst, 'reload schema';
