-- =====================================================================
-- Módulo WhatsApp (bandeja de atención) — Zyteron Admin
-- =====================================================================
-- Tablas de conversaciones, mensajes, notas y respuestas rápidas.
-- Idempotente y reversible (ver bloque DROP comentado al final).
--
-- Cómo aplicarlo: Supabase -> SQL Editor -> pegar y Run.
--
-- Seguridad: RLS activado. Lectura permitida (para Realtime en el panel,
-- consistente con Lead/Quote del proyecto); TODA escritura ocurre solo por el
-- backend con service role (bypassa RLS). No hay políticas de escritura para
-- anon/authenticated, por lo que el anon key NO puede modificar datos.
--
-- NOTA: assigned_user_id y sent_by_user_id son TEXT (no uuid) para integrarse
-- con la doble autenticación del panel (cookie admin + NextAuth).
-- =====================================================================

-- ---------- Conversaciones -------------------------------------------
create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  customer_name text,
  profile_name text,
  last_message text,
  last_message_type text,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  status text not null default 'open',
  mode text not null default 'ai',
  assigned_user_id text,
  lead_status text not null default 'nuevo',
  priority text not null default 'normal',
  email text,
  company text,
  industry text,
  requested_service text,
  estimated_budget numeric,
  deadline text,
  notes text,
  tags jsonb not null default '[]'::jsonb,
  lead_id text,
  window_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_conv_phone_idx on public.whatsapp_conversations (phone);
create index if not exists whatsapp_conv_lastmsg_idx on public.whatsapp_conversations (last_message_at desc);
create index if not exists whatsapp_conv_status_idx on public.whatsapp_conversations (status);
create index if not exists whatsapp_conv_mode_idx on public.whatsapp_conversations (mode);
create index if not exists whatsapp_conv_unread_idx on public.whatsapp_conversations (unread_count);

-- ---------- Mensajes -------------------------------------------------
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  meta_message_id text unique,
  reply_to_message_id text,
  direction text not null,               -- 'in' | 'out'
  sender_type text not null,             -- 'customer' | 'ai' | 'human'
  message_type text not null default 'text',
  content text,
  media_id text,
  media_url text,
  mime_type text,
  file_name text,
  status text not null default 'sent',   -- sending|sent|delivered|read|failed|draft|received
  error_message text,
  sent_by_user_id text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz
);

create index if not exists whatsapp_msg_conv_idx on public.whatsapp_messages (conversation_id, created_at);
create index if not exists whatsapp_msg_meta_idx on public.whatsapp_messages (meta_message_id);
create index if not exists whatsapp_msg_status_idx on public.whatsapp_messages (status);

-- ---------- Notas internas -------------------------------------------
create table if not exists public.whatsapp_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  user_id text,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_notes_conv_idx on public.whatsapp_notes (conversation_id, created_at desc);

-- ---------- Respuestas rápidas ---------------------------------------
create table if not exists public.whatsapp_quick_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  shortcut text,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- updated_at automático ------------------------------------
create or replace function public.whatsapp_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists whatsapp_conv_touch on public.whatsapp_conversations;
create trigger whatsapp_conv_touch
  before update on public.whatsapp_conversations
  for each row execute function public.whatsapp_touch_updated_at();

-- ---------- RLS ------------------------------------------------------
-- Lectura para el panel (Realtime). Escritura solo service role.
do $$
declare t text;
begin
  foreach t in array array[
    'whatsapp_conversations','whatsapp_messages','whatsapp_notes','whatsapp_quick_replies'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'drop policy if exists %I on public.%I', t || '_read', t
    );
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_read', t
    );
  end loop;
end
$$;

-- ---------- Realtime -------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array[
      'whatsapp_conversations','whatsapp_messages','whatsapp_notes'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end
$$;

-- =====================================================================
-- REVERSIBLE (para revertir, descomenta y ejecuta):
-- drop table if exists public.whatsapp_messages cascade;
-- drop table if exists public.whatsapp_notes cascade;
-- drop table if exists public.whatsapp_quick_replies cascade;
-- drop table if exists public.whatsapp_conversations cascade;
-- drop function if exists public.whatsapp_touch_updated_at cascade;
-- =====================================================================
