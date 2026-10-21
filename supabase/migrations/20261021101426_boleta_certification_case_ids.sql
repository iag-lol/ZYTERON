begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';

-- El set de boletas usa CASO-1, sin número de atención; se conserva su identificador oficial.
alter table public.sii_certification_cases
  drop constraint sii_certification_cases_case_id_check,
  add constraint sii_certification_cases_case_id_check check (
    case_id ~ '^[0-9]{1,12}-[1-9][0-9]{0,5}$'
    or (document_type_code in (39,41) and case_id ~ '^CASO-[1-9][0-9]{0,5}$')
  );
commit;
