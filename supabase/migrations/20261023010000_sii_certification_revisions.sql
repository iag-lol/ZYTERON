begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';

-- La revisión conserva el set y proceso originales y adquiere exclusivamente folios disponibles.
do $$
begin
  if (select md5(prosrc) from pg_proc where oid='public.finance_prepare_sii_certification(uuid,text,jsonb,jsonb,text)'::regprocedure) is distinct from '45418d02a8eabd7dcb6ea80039f852a6' then
    raise exception 'SII_CERT_REVISION: definición de preparación distinta de la revisión esperada';
  end if;
end $$;

alter table public.sii_certification_runs
  add column revision integer not null default 1 check (revision>0),
  add column previous_run_id uuid references public.sii_certification_runs(id),
  drop constraint sii_certification_runs_company_rut_set_sha256_key,
  add constraint sii_certification_runs_revision_unique unique(company_rut,set_sha256,revision),
  add constraint sii_certification_runs_predecessor_unique unique(previous_run_id),
  add constraint sii_certification_runs_predecessor_check check ((revision=1)=(previous_run_id is null));

create or replace function public.finance_prepare_sii_certification(p_run uuid, p_set_sha text, p_plan jsonb, p_artifacts jsonb, p_actor text)
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
  select * into v_existing from public.sii_certification_runs where id=p_run;
  if found then
    if v_existing.company_rut<>v_settings.company_rut or v_existing.set_sha256<>p_set_sha or v_existing.plan is distinct from p_plan then
      raise exception 'SII_CERT_DUPLICATE: este proceso ya tiene un plan reservado; no se asignan folios nuevos';
    end if;
    return v_existing.id;
  end if;
  select * into v_existing from public.sii_certification_runs
    where company_rut=v_settings.company_rut and set_sha256=p_set_sha order by revision desc limit 1;
  if found then
    if p_plan->>'previousRunId' is distinct from v_existing.id::text then
      raise exception 'SII_CERT_REVISION: la revisión exige identificar el último proceso; no se asignan folios nuevos';
    end if;
    if coalesce(p_plan->'request'->>'revisionReason','')='' or
       coalesce((p_plan->'request'->>'bookNotificationBase')::bigint,1)<=coalesce((v_existing.plan->'request'->>'bookNotificationBase')::bigint,1)+2 then
      raise exception 'SII_CERT_REVISION: motivo o folios de notificación incompletos';
    end if;
  elsif p_plan->>'previousRunId' is not null then
    raise exception 'SII_CERT_REVISION: proceso anterior ajeno al set o emisor';
  end if;
  if jsonb_typeof(p_plan->'cases') is distinct from 'array' or jsonb_array_length(p_plan->'cases') not between 1 and 500
     or jsonb_typeof(p_artifacts) is distinct from 'array' or jsonb_array_length(p_artifacts)=0 then
    raise exception 'SII_CERT_INPUT: plan o archivos incompletos';
  end if;
  insert into public.sii_certification_runs(id,company_rut,set_sha256,plan,created_by,previous_run_id,revision)
    values(p_run,v_settings.company_rut,p_set_sha,p_plan,p_actor,(p_plan->>'previousRunId')::uuid,coalesce(v_existing.revision,0)+1);
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

commit;
