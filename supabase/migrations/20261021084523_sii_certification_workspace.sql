begin;

set local lock_timeout = '3s';
set local statement_timeout = '15s';

-- Certificación separada del circuito comercial: ningún vínculo a facturas, clientes o pagos.
create table public.sii_certification_runs (
  id uuid primary key,
  company_rut text not null,
  set_sha256 text not null check (set_sha256 ~ '^[a-f0-9]{64}$'),
  environment text not null default 'CERTIFICATION' check (environment = 'CERTIFICATION'),
  plan jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (company_rut, set_sha256)
);
create table public.sii_certification_cases (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sii_certification_runs(id),
  case_id text not null check (case_id ~ '^[0-9]{1,12}-[1-9][0-9]{0,5}$'),
  document_type_code integer not null references public.tax_document_types(code),
  folio_id uuid not null unique references public.tax_folios(id),
  folio bigint not null,
  unique (run_id, case_id)
);
create table public.sii_certification_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sii_certification_runs(id),
  name text not null check (name ~ '^[A-Za-z0-9_.-]{1,100}$'),
  kind text not null check (kind in ('DTE','BOLETA','LIBRO_CV','LIBRO_GUIA','CONSUMO','PDF','SET_SOURCE','EXCHANGE_SOURCE','RESPONSE')),
  storage_path text not null check (storage_path ~ '^sii-certification/[a-f0-9-]{36}/[a-f0-9]{64}\.(xml|pdf|enc)$'),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (run_id, name),
  check (storage_path = 'sii-certification/' || run_id::text || '/' || sha256 || right(storage_path,4))
);
create table public.sii_certification_submissions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sii_certification_runs(id),
  artifact_id uuid not null unique references public.sii_certification_artifacts(id),
  case_ids text[] not null default '{}',
  status text not null default 'PREPARED' check (status in ('PREPARED','SENDING','SUBMITTED','UNKNOWN','REJECTED','ACCEPTED','ACCEPTED_WITH_REPAIRS')),
  track_id text,
  response jsonb,
  started_at timestamptz,
  completed_at timestamptz
);
create table public.sii_certification_drafts (
  id uuid primary key default gen_random_uuid(),
  company_rut text not null,
  created_by text not null,
  set_sha256 text not null check (set_sha256 ~ '^[a-f0-9]{64}$'),
  version integer not null default 0,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique (company_rut,created_by,set_sha256)
);

alter table public.sii_certification_runs enable row level security;
alter table public.sii_certification_cases enable row level security;
alter table public.sii_certification_artifacts enable row level security;
alter table public.sii_certification_submissions enable row level security;
alter table public.sii_certification_drafts enable row level security;
revoke all on public.sii_certification_runs, public.sii_certification_cases,
  public.sii_certification_artifacts, public.sii_certification_submissions, public.sii_certification_drafts from public, anon, authenticated;
grant select, insert on public.sii_certification_runs, public.sii_certification_cases,
  public.sii_certification_artifacts to service_role;
grant select, insert, update on public.sii_certification_submissions, public.sii_certification_drafts to service_role;

create function public.finance_save_sii_certification_draft(p_company text,p_actor text,p_set_sha text,p_version integer,p_payload jsonb)
returns integer language plpgsql security invoker set search_path=public as $$
declare v_draft public.sii_certification_drafts;
begin
  if p_actor is null or length(trim(p_actor))=0 or p_set_sha !~ '^[a-f0-9]{64}$' or p_version<0
     or octet_length(p_payload::text)>4194304 then raise exception 'SII_CERT_DRAFT: borrador inválido'; end if;
  if not exists(select 1 from public.finance_settings where company_rut=p_company and dte_environment='CERTIFICATION' and dte_provider='SII_DIRECT') then
    raise exception 'SII_CERT_ENV: empresa o ambiente incompatible';
  end if;
  insert into public.sii_certification_drafts(company_rut,created_by,set_sha256,payload)
    values(p_company,p_actor,p_set_sha,p_payload) on conflict(company_rut,created_by,set_sha256) do nothing;
  select * into v_draft from public.sii_certification_drafts where company_rut=p_company and created_by=p_actor and set_sha256=p_set_sha for update;
  if v_draft.version<>p_version then raise exception 'SII_CERT_DRAFT_CONFLICT: el borrador cambió en otra sesión; recarga antes de guardar'; end if;
  update public.sii_certification_drafts set payload=p_payload,version=version+1,updated_at=now() where id=v_draft.id returning version into p_version;
  return p_version;
end $$;

create function public.finance_prepare_sii_certification(p_run uuid, p_set_sha text, p_plan jsonb, p_artifacts jsonb, p_actor text)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_settings record;
  v_existing public.sii_certification_runs;
  v_case jsonb;
  v_artifact jsonb;
  v_folio public.tax_folios;
  v_artifact_id uuid;
begin
  if p_actor is null or length(trim(p_actor)) = 0 or p_set_sha !~ '^[a-f0-9]{64}$' then
    raise exception 'SII_CERT_INPUT: identidad o set inválido';
  end if;
  if (select count(*) from public.finance_settings) <> 1 then raise exception 'SII_CERT_COMPANY: empresa ambigua'; end if;
  select company_rut, dte_environment, dte_provider into v_settings from public.finance_settings limit 1;
  if v_settings.dte_environment <> 'CERTIFICATION' or v_settings.dte_provider <> 'SII_DIRECT'
     or p_plan->>'companyRut' is distinct from v_settings.company_rut then
    raise exception 'SII_CERT_ENV: certificación o emisor incompatible';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_settings.company_rut || p_set_sha, 0));
  select * into v_existing from public.sii_certification_runs where company_rut=v_settings.company_rut and set_sha256=p_set_sha;
  if found then
    if v_existing.id <> p_run or v_existing.plan is distinct from p_plan then
      raise exception 'SII_CERT_DUPLICATE: este set ya tiene un plan reservado; no se asignan folios nuevos';
    end if;
    return v_existing.id;
  end if;
  if jsonb_typeof(p_plan->'cases') is distinct from 'array' or jsonb_array_length(p_plan->'cases') not between 1 and 500
     or jsonb_typeof(p_artifacts) is distinct from 'array' or jsonb_array_length(p_artifacts)=0 then
    raise exception 'SII_CERT_INPUT: plan o archivos incompletos';
  end if;
  insert into public.sii_certification_runs(id,company_rut,set_sha256,plan,created_by)
    values(p_run,v_settings.company_rut,p_set_sha,p_plan,p_actor);
  for v_case in select value from jsonb_array_elements(p_plan->'cases') order by (value->>'type')::integer, (value->>'folio')::bigint loop
    select f.* into v_folio from public.tax_folios f join public.tax_folio_authorizations a on a.id=f.authorization_id
      where f.id=(v_case->>'folioId')::uuid and f.document_type_code=(v_case->>'type')::integer
        and f.folio=(v_case->>'folio')::bigint and f.environment='CERTIFICATION'
        and f.status='AVAILABLE' and a.status='ACTIVE' and a.environment='CERTIFICATION'
      for update of f, a;
    if not found then raise exception 'SII_CERT_FOLIO: un folio cambió de estado; no se reservó el lote'; end if;
    insert into public.sii_certification_cases(run_id,case_id,document_type_code,folio_id,folio)
      values(p_run,v_case->>'caseId',v_folio.document_type_code,v_folio.id,v_folio.folio);
    update public.tax_folios set status='RESERVED',reserved_at=now() where id=v_folio.id;
  end loop;
  for v_artifact in select value from jsonb_array_elements(p_artifacts) loop
    if split_part(v_artifact->>'storagePath','/',2) <> p_run::text then raise exception 'SII_CERT_PATH: archivo ajeno al proceso'; end if;
    insert into public.sii_certification_artifacts(run_id,name,kind,storage_path,sha256)
      values(p_run,v_artifact->>'name',v_artifact->>'kind',v_artifact->>'storagePath',v_artifact->>'sha256') returning id into v_artifact_id;
    if v_artifact->'caseIds' is not null then
      if jsonb_typeof(v_artifact->'caseIds') is distinct from 'array'
         or v_artifact->>'kind' not in ('DTE','BOLETA','LIBRO_CV','LIBRO_GUIA','CONSUMO') then
        raise exception 'SII_CERT_BATCH: metadatos de envío inválidos';
      end if;
      if (select count(*) from jsonb_array_elements_text(v_artifact->'caseIds')) <>
         (select count(distinct value) from jsonb_array_elements_text(v_artifact->'caseIds')) then
        raise exception 'SII_CERT_BATCH: caso repetido en un envío';
      end if;
      if exists(select 1 from jsonb_array_elements_text(v_artifact->'caseIds') x
          where not exists(select 1 from public.sii_certification_cases c where c.run_id=p_run and c.case_id=x.value)) then
        raise exception 'SII_CERT_CASE: envío con casos ajenos';
      end if;
      insert into public.sii_certification_submissions(run_id,artifact_id,case_ids)
        values(p_run,v_artifact_id,array(select jsonb_array_elements_text(v_artifact->'caseIds')));
    end if;
  end loop;
  if exists (
    select c.case_id from public.sii_certification_cases c
      left join public.sii_certification_submissions s on s.run_id=c.run_id and c.case_id=any(s.case_ids)
      where c.run_id=p_run group by c.case_id having count(s.id) <> 1
  ) then raise exception 'SII_CERT_BATCH: cada caso debe pertenecer a un único envío'; end if;
  return p_run;
end $$;

-- Un envío incierto nunca se reintenta de forma automática: puede haber sido recibido por el SII.
create function public.finance_claim_sii_certification_submission(p_id uuid)
returns boolean language plpgsql security invoker set search_path = public as $$
begin
  update public.sii_certification_submissions set status='SENDING',started_at=now()
    where id=p_id and status='PREPARED';
  return found;
end $$;
create function public.finance_complete_sii_certification_submission(p_id uuid,p_track text,p_response jsonb,p_unknown boolean)
returns void language plpgsql security invoker set search_path = public as $$
declare v_submission public.sii_certification_submissions;
begin
  select * into v_submission from public.sii_certification_submissions where id=p_id for update;
  if found and v_submission.status='SUBMITTED' and not p_unknown and v_submission.track_id=p_track then return; end if;
  if not found or v_submission.status not in ('SENDING','UNKNOWN') or (v_submission.status='UNKNOWN' and p_unknown) then raise exception 'SII_CERT_STATE: envío sin adquisición exclusiva'; end if;
  if not p_unknown and (p_track is null or p_track !~ '^[0-9]{1,30}$') then raise exception 'SII_CERT_TRACK: falta Track ID válido'; end if;
  update public.sii_certification_submissions set status=case when p_unknown then 'UNKNOWN' else 'SUBMITTED' end,
    track_id=p_track,response=p_response,completed_at=now() where id=p_id;
  if not p_unknown then
    update public.tax_folios f set status='USED',used_at=now()
      from public.sii_certification_cases c where c.run_id=v_submission.run_id
        and c.case_id=any(v_submission.case_ids) and f.id=c.folio_id and f.status='RESERVED';
  end if;
end $$;

create function public.finance_record_sii_certification_status(p_id uuid,p_status text,p_response jsonb)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
  if p_status not in ('SUBMITTED','REJECTED','ACCEPTED','ACCEPTED_WITH_REPAIRS') then raise exception 'SII_CERT_STATE: estado de respuesta inválido'; end if;
  update public.sii_certification_submissions set status=p_status,response=p_response
    where id=p_id and (status='SUBMITTED' or (status='ACCEPTED_WITH_REPAIRS' and p_status in ('ACCEPTED_WITH_REPAIRS','ACCEPTED')));
  return found;
end $$;

revoke all on function public.finance_prepare_sii_certification(uuid,text,jsonb,jsonb,text),
  public.finance_claim_sii_certification_submission(uuid),
  public.finance_complete_sii_certification_submission(uuid,text,jsonb,boolean),
  public.finance_save_sii_certification_draft(text,text,text,integer,jsonb),
  public.finance_record_sii_certification_status(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.finance_prepare_sii_certification(uuid,text,jsonb,jsonb,text),
  public.finance_claim_sii_certification_submission(uuid),
  public.finance_complete_sii_certification_submission(uuid,text,jsonb,boolean),
  public.finance_save_sii_certification_draft(text,text,text,integer,jsonb),
  public.finance_record_sii_certification_status(uuid,text,jsonb) to service_role;

commit;
