-- Almacenamiento de visitas para el backend. No concede acceso desde el navegador.
begin;

create table if not exists public."WebVisit" (
  id text primary key,
  path text not null,
  "pageTitle" text,
  referrer text,
  "userAgent" text,
  "ipHash" text,
  "sessionId" text,
  "createdAt" timestamptz not null default now()
);

create index if not exists idx_webvisit_createdat on public."WebVisit" ("createdAt" desc);
create index if not exists idx_webvisit_path on public."WebVisit" (path);
create index if not exists idx_webvisit_iphash on public."WebVisit" ("ipHash");
create index if not exists idx_webvisit_session on public."WebVisit" ("sessionId");

alter table public."WebVisit" enable row level security;
revoke all on table public."WebVisit" from public, anon, authenticated;
grant select, insert on table public."WebVisit" to service_role;

notify pgrst, 'reload schema';
commit;
