-- =====================================================================
-- Zyteron · Versionado documental de los convenios
-- =====================================================================
-- Habilita el botón "Actualizar contrato":
--
--   · Un convenio NO firmado conserva su número (ZY-PT-2026-00001) y sube
--     el número de versión documental (v1 → v2 → v3). Por eso el número
--     deja de ser único por sí solo y pasa a serlo junto con la versión.
--
--   · Un convenio YA FIRMADO no se toca: se emite un documento nuevo con
--     identificador propio, enlazado al anterior.
--
-- Requiere: commercial_contracts.sql
-- Idempotente y reversible. Aplicar en Supabase → SQL Editor → Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · El número identifica al convenio; la versión, al documento
-- ---------------------------------------------------------------------
alter table public.commercial_contracts
  drop constraint if exists commercial_contracts_contract_number_key;

drop index if exists public.commercial_contracts_number_version_uidx;
create unique index commercial_contracts_number_version_uidx
  on public.commercial_contracts (contract_number, version)
  where contract_number is not null;

-- ---------------------------------------------------------------------
-- 2 · Origen de cada versión, para la trazabilidad
-- ---------------------------------------------------------------------
-- created  → primera emisión
-- updated  → actualización de un convenio aún no firmado
-- amended  → documento modificatorio posterior a una firma
alter table public.commercial_contracts
  add column if not exists origin text not null default 'created';

alter table public.commercial_contracts
  add column if not exists update_reason text;

-- Quién y cuándo actualizó por última vez este documento.
alter table public.commercial_contracts
  add column if not exists updated_by text;

create index if not exists commercial_contracts_supersedes_idx
  on public.commercial_contracts (supersedes_id);

-- =====================================================================
-- REVERSIBLE:
-- drop index if exists public.commercial_contracts_number_version_uidx;
-- alter table public.commercial_contracts drop column if exists origin;
-- alter table public.commercial_contracts drop column if exists update_reason;
-- alter table public.commercial_contracts drop column if exists updated_by;
-- =====================================================================
