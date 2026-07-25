-- =====================================================================
-- Memoria persistente de conversaciones de WhatsApp (agente IA)
-- =====================================================================
-- Guarda el historial de cada cliente que escribe al WhatsApp para que el
-- agente con IA recuerde el contexto aunque el servidor se reinicie o se
-- haga un nuevo deploy.
--
-- Cómo aplicarlo:
--   1) Abre Supabase -> SQL Editor.
--   2) Pega este archivo completo y ejecútalo (Run).
--
-- Es idempotente: puedes ejecutarlo varias veces sin problema.
-- Si NO lo corres, el agente igual funciona pero recuerda solo en memoria
-- (se pierde el historial al reiniciar/redeploy).
-- =====================================================================

create table if not exists public."WhatsappConversation" (
  wa_id text primary key,
  profile_name text,
  turns jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsappconversation_updated_idx
  on public."WhatsappConversation" ("updated_at");

-- Solo el backend (service role) accede a esta tabla. Activamos RLS sin
-- políticas públicas: el service role las omite y nadie más puede leerla.
do $$
begin
  alter table public."WhatsappConversation" enable row level security;
exception
  when others then null;
end
$$;
