begin;
-- Original module migration: 20261001020000_development_operations_center.sql
create extension if not exists pgcrypto;

alter table public.deployments drop constraint if exists deployments_status_check;
alter table public.deployments add constraint deployments_status_check check(status in('PLANNED','READY','PENDING_APPROVAL','QUEUED','BUILDING','IN_PROGRESS','DEPLOYING','VERIFYING','SUCCESS','BUILD_FAILED','DEPLOY_FAILED','HEALTH_CHECK_FAILED','FAILED','ROLLED_BACK','CANCELLED'));

create table if not exists public.developer_skills(
 id uuid primary key default gen_random_uuid(),user_id uuid not null,skill text not null,level text not null default 'INTERMEDIATE' check(level in('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT')),verified_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,skill)
);
create table if not exists public.project_technologies(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,category text not null default 'OTHER' check(category in('FRONTEND','BACKEND','DATABASE','HOSTING','INTEGRATION','LANGUAGE','FRAMEWORK','OTHER')),name text not null,version text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(project_id,category,name)
);
create table if not exists public.project_repositories(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,provider text not null,repository_owner text not null,repository_name text not null,repository_url text not null,default_branch text not null,integration_status text not null default 'NOT_CONFIGURED' check(integration_status in('NOT_CONFIGURED','CONNECTED','ERROR','DISCONNECTED')),visibility text not null default 'PRIVATE' check(visibility in('PRIVATE','INTERNAL','PUBLIC')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,repository_owner,repository_name)
);
create table if not exists public.pull_requests(
 id uuid primary key default gen_random_uuid(),repository_id uuid not null references public.project_repositories(id) on delete restrict,project_id uuid not null references public.projects(id) on delete restrict,external_id text not null,number integer not null,title text not null,author text,reviewers text[] not null default '{}',source_branch text not null,target_branch text not null,checks_status text not null default 'UNKNOWN' check(checks_status in('PASS','FAIL','PENDING','UNKNOWN')),status text not null default 'OPEN' check(status in('OPEN','REVIEW_REQUIRED','CHANGES_REQUESTED','APPROVED','MERGED','CLOSED')),provider_url text,opened_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(repository_id,external_id)
);
create table if not exists public.pull_request_reviews(
 id uuid primary key default gen_random_uuid(),pull_request_id uuid not null references public.pull_requests(id) on delete restrict,external_id text not null,reviewer text not null,status text not null check(status in('PENDING','APPROVED','CHANGES_REQUESTED','COMMENTED','DISMISSED')),submitted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(pull_request_id,external_id)
);
create table if not exists public.project_environments(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,name text not null,type text not null check(type in('LOCAL','DEVELOPMENT','STAGING','PRODUCTION')),url text,status text not null default 'UNKNOWN' check(status in('UNKNOWN','HEALTHY','DEGRADED','DOWN','MAINTENANCE')),deployment_provider text,external_reference text,last_deployment_id uuid references public.deployments(id) on delete set null,responsible_user_id uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(project_id,name)
);
create table if not exists public.environment_variable_metadata(
 id uuid primary key default gen_random_uuid(),environment_id uuid not null references public.project_environments(id) on delete cascade,variable_name text not null,configured boolean not null default false,last_updated_at timestamptz,created_at timestamptz not null default now(),unique(environment_id,variable_name)
);
create table if not exists public.project_development_settings(
 project_id uuid primary key references public.projects(id) on delete restrict,require_qa_for_production boolean not null default true,require_merged_pr_for_production boolean not null default true,require_release_approval boolean not null default false,require_security_review boolean not null default false,stale_pull_request_hours integer not null default 72 check(stale_pull_request_hours>0),updated_by uuid,updated_at timestamptz not null default now()
);
create table if not exists public.build_runs(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,repository_id uuid references public.project_repositories(id) on delete restrict,provider text not null,external_id text not null,status text not null check(status in('QUEUED','BUILDING','PASS','FAIL','CANCELLED','UNKNOWN')),commit_sha text,branch text,logs_reference text,started_at timestamptz,completed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,external_id)
);
create table if not exists public.qa_runs(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,release_id uuid,environment_id uuid references public.project_environments(id) on delete restrict,name text not null,status text not null default 'PLANNED' check(status in('PLANNED','IN_PROGRESS','PASSED','PASSED_WITH_OBSERVATIONS','FAILED','BLOCKED','CANCELLED')),started_by uuid,assigned_to uuid,started_at timestamptz,completed_at timestamptz,result text,notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.qa_test_cases(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,suite text not null,title text not null,description text,preconditions text,expected_result text not null,priority text not null default 'NORMAL' check(priority in('LOW','NORMAL','HIGH','CRITICAL')),active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.qa_test_results(
 id uuid primary key default gen_random_uuid(),qa_run_id uuid not null references public.qa_runs(id) on delete restrict,test_case_id uuid not null references public.qa_test_cases(id) on delete restrict,status text not null check(status in('PASS','FAIL','BLOCKED','SKIPPED')),actual_result text,evidence_document_id uuid,executed_by uuid,executed_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(qa_run_id,test_case_id)
);
create table if not exists public.bugs(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,task_id uuid references public.tasks(id) on delete restrict,title text not null,description text not null,severity text not null default 'MEDIUM' check(severity in('LOW','MEDIUM','HIGH','CRITICAL','BLOCKER')),priority text not null default 'NORMAL' check(priority in('LOW','NORMAL','HIGH','URGENT','CRITICAL')),environment text,status text not null default 'NEW' check(status in('NEW','TRIAGED','ASSIGNED','IN_PROGRESS','READY_FOR_QA','REOPENED','RESOLVED','CLOSED','WONT_FIX','DUPLICATE')),reported_by uuid,assigned_to uuid,steps_to_reproduce text,expected_behavior text,actual_behavior text,evidence_document_id uuid,client_visibility text not null default 'INTERNAL_ONLY' check(client_visibility in('INTERNAL_ONLY','CLIENT_SUMMARY','CLIENT_VISIBLE')),detected_at timestamptz not null default now(),resolved_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.bug_history(
 id uuid primary key default gen_random_uuid(),bug_id uuid not null references public.bugs(id) on delete restrict,field text not null,from_value text,to_value text,reason text,changed_by uuid,changed_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.releases(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,version text not null,name text not null,status text not null default 'DRAFT' check(status in('DRAFT','PLANNED','READY','PENDING_APPROVAL','DEPLOYING','RELEASED','FAILED','ROLLED_BACK','CANCELLED')),target_environment text not null,planned_at timestamptz,released_at timestamptz,created_by uuid,approved_by uuid,release_notes text,commit_sha text,deployment_id uuid references public.deployments(id) on delete restrict,client_visibility text not null default 'INTERNAL_ONLY' check(client_visibility in('INTERNAL_ONLY','CLIENT_SUMMARY','CLIENT_VISIBLE')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(project_id,version)
);
alter table public.qa_runs drop constraint if exists qa_runs_release_id_fkey;
alter table public.qa_runs add constraint qa_runs_release_id_fkey foreign key(release_id) references public.releases(id) on delete restrict;
create table if not exists public.technical_debt_items(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,title text not null,description text not null,impact text,severity text not null default 'MEDIUM' check(severity in('LOW','MEDIUM','HIGH','CRITICAL')),estimated_effort numeric(10,2) check(estimated_effort is null or estimated_effort>=0),status text not null default 'OPEN' check(status in('OPEN','PLANNED','IN_PROGRESS','RESOLVED','ACCEPTED')),owner_id uuid,target_date date,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.project_external_services(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete restrict,provider text not null,service_name text not null,external_id text,environment text,status text not null default 'UNKNOWN',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(project_id,provider,service_name,environment)
);
create table if not exists public.integration_connections(
 id uuid primary key default gen_random_uuid(),provider text not null,display_name text not null,external_reference text,status text not null default 'NOT_CONFIGURED' check(status in('NOT_CONFIGURED','CONNECTED','ERROR','DISCONNECTED')),last_sync_at timestamptz,last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,display_name)
);
create table if not exists public.external_integration_events(
 id uuid primary key default gen_random_uuid(),provider text not null,event_type text not null,external_id text not null,received_at timestamptz not null default now(),processed_at timestamptz,status text not null default 'RECEIVED' check(status in('RECEIVED','PROCESSING','PROCESSED','FAILED','IGNORED')),error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,external_id)
);
create table if not exists public.development_events(
 id uuid primary key default gen_random_uuid(),project_id uuid references public.projects(id) on delete restrict,aggregate_type text not null,aggregate_id uuid not null,event_type text not null,actor_id uuid,payload jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default now()
);
create table if not exists public.development_notifications(
 id uuid primary key default gen_random_uuid(),event_key text not null unique,user_id uuid,audience_role text,type text not null,title text not null,body text,entity_type text not null,entity_id uuid not null,read_at timestamptz,created_at timestamptz not null default now()
);

create index if not exists project_repositories_project_idx on public.project_repositories(project_id,integration_status);
create index if not exists pull_requests_review_queue_idx on public.pull_requests(status,checks_status,updated_at);
create index if not exists environments_status_idx on public.project_environments(status,type);
create index if not exists qa_runs_project_status_idx on public.qa_runs(project_id,status,created_at desc);
create index if not exists bugs_project_status_idx on public.bugs(project_id,status,severity,updated_at desc);
create index if not exists releases_project_status_idx on public.releases(project_id,status,planned_at);
create index if not exists debt_project_status_idx on public.technical_debt_items(project_id,status,severity);
create index if not exists development_events_project_idx on public.development_events(project_id,occurred_at desc);

create or replace function private.can_manage_development() returns boolean language sql stable security definer set search_path=public as $$select private.zyteron_role() in('GERENTE_GENERAL','JEFE_DESARROLLO')$$;
create or replace function private.can_read_development() returns boolean language sql stable security definer set search_path=public as $$select private.zyteron_role() in('GERENTE_GENERAL','JEFE_DESARROLLO','TECH_LEAD','PROGRAMADOR','QA','SOPORTE_TECNICO','DESARROLLO')$$;

do $$ declare table_name text;begin
 foreach table_name in array array['developer_skills','project_technologies','project_repositories','pull_requests','pull_request_reviews','project_environments','environment_variable_metadata','project_development_settings','build_runs','qa_runs','qa_test_cases','qa_test_results','bugs','bug_history','releases','technical_debt_items','project_external_services','integration_connections','external_integration_events','development_events','development_notifications'] loop
  execute format('alter table public.%I enable row level security',table_name);
 end loop;
end$$;

do $$ declare table_name text;begin
 foreach table_name in array array['project_technologies','project_repositories','pull_requests','project_environments','build_runs','qa_runs','qa_test_cases','bugs','releases','technical_debt_items','project_external_services'] loop
  execute format('drop policy if exists development_project_scope on public.%I',table_name);
  execute format('create policy development_project_scope on public.%I for all to authenticated using(private.can_access_project(project_id)) with check(private.can_access_project(project_id) and (private.can_manage_development() or private.zyteron_role() in(''TECH_LEAD'',''PROGRAMADOR'',''QA'')))',table_name);
 end loop;
 drop policy if exists development_project_settings_scope on public.project_development_settings;create policy development_project_settings_scope on public.project_development_settings for all to authenticated using(private.can_access_project(project_id)) with check(private.can_manage_development());
 drop policy if exists development_skills_scope on public.developer_skills;create policy development_skills_scope on public.developer_skills for select to authenticated using(private.can_read_development());create policy development_skills_manage on public.developer_skills for all to authenticated using(user_id=auth.uid() or private.can_manage_development()) with check(user_id=auth.uid() or private.can_manage_development());
 drop policy if exists development_pr_review_scope on public.pull_request_reviews;create policy development_pr_review_scope on public.pull_request_reviews for all to authenticated using(exists(select 1 from public.pull_requests p where p.id=pull_request_id and private.can_access_project(p.project_id))) with check(exists(select 1 from public.pull_requests p where p.id=pull_request_id and private.can_access_project(p.project_id)));
 drop policy if exists development_env_metadata_scope on public.environment_variable_metadata;create policy development_env_metadata_scope on public.environment_variable_metadata for select to authenticated using(exists(select 1 from public.project_environments e where e.id=environment_id and private.can_access_project(e.project_id)));
 drop policy if exists development_qa_result_scope on public.qa_test_results;create policy development_qa_result_scope on public.qa_test_results for all to authenticated using(exists(select 1 from public.qa_runs q where q.id=qa_run_id and private.can_access_project(q.project_id))) with check(exists(select 1 from public.qa_runs q where q.id=qa_run_id and private.can_access_project(q.project_id)));
 drop policy if exists development_bug_history_scope on public.bug_history;create policy development_bug_history_scope on public.bug_history for select to authenticated using(exists(select 1 from public.bugs b where b.id=bug_id and private.can_access_project(b.project_id)));
 drop policy if exists development_integrations_manage on public.integration_connections;create policy development_integrations_manage on public.integration_connections for all to authenticated using(private.can_manage_development()) with check(private.can_manage_development());
 drop policy if exists development_external_events_read on public.external_integration_events;create policy development_external_events_read on public.external_integration_events for select to authenticated using(private.can_manage_development());
 drop policy if exists development_events_scope on public.development_events;create policy development_events_scope on public.development_events for select to authenticated using((project_id is not null and private.can_access_project(project_id)) or private.can_manage_development());
 drop policy if exists development_notifications_own on public.development_notifications;create policy development_notifications_own on public.development_notifications for select to authenticated using(user_id=auth.uid() or audience_role=private.zyteron_role() or private.can_manage_development());
end$$;

insert into public.app_permissions(code,description) values
('development.dashboard.view','Ver Dev Command Center'),('development.assignment.manage','Gestionar asignación técnica'),('development.team.view','Ver equipo técnico'),('development.workload.view','Ver capacidad técnica'),
('repository.view','Ver repositorios'),('repository.connect','Conectar repositorios'),('repository.manage','Gestionar repositorios'),('pullrequest.view','Ver pull requests'),('pullrequest.review','Revisar pull requests'),
('qa.view','Ver QA'),('qa.create','Crear QA'),('qa.execute','Ejecutar QA'),('qa.approve','Aprobar QA'),('bug.view','Ver bugs'),('bug.create','Crear bugs'),('bug.assign','Asignar bugs'),('bug.edit','Editar bugs'),('bug.resolve','Resolver bugs'),
('release.view','Ver releases'),('release.create','Crear releases'),('release.approve','Aprobar releases'),('release.deploy','Desplegar releases'),('environment.view','Ver ambientes'),('environment.manage','Gestionar ambientes'),
('deployment.trigger','Ejecutar deployment'),('deployment.rollback','Registrar rollback'),('technical_debt.view','Ver deuda técnica'),('technical_debt.manage','Gestionar deuda técnica'),('development_docs.view','Ver documentación técnica'),('development_docs.manage','Gestionar documentación técnica') on conflict(code) do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('GERENTE_GENERAL'),('JEFE_DESARROLLO'))r(role) cross join public.app_permissions p where p.code like any(array['development.%','repository.%','pullrequest.%','qa.%','bug.%','release.%','environment.%','deployment.%','technical_debt.%','development_docs.%']) on conflict do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('TECH_LEAD'),('PROGRAMADOR'),('QA'),('SOPORTE_TECNICO'),('DESARROLLO'))r(role) cross join public.app_permissions p where p.code in('development.dashboard.view','development.team.view','development.workload.view','repository.view','pullrequest.view','qa.view','bug.view','bug.create','release.view','environment.view','deployment.view','technical_debt.view','development_docs.view') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'TECH_LEAD',code from public.app_permissions where code in('development.assignment.manage','repository.connect','repository.manage','pullrequest.review','qa.create','qa.execute','bug.assign','bug.edit','bug.resolve','release.create','release.deploy','environment.manage','deployment.trigger','technical_debt.manage','development_docs.manage') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'QA',code from public.app_permissions where code in('qa.create','qa.execute','qa.approve','bug.edit') on conflict do nothing;

do $$ declare table_name text;begin
 foreach table_name in array array['project_repositories','pull_requests','project_environments','build_runs','qa_runs','qa_test_cases','bugs','releases','technical_debt_items','development_events'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then execute format('alter publication supabase_realtime add table public.%I',table_name);end if;
 end loop;
end$$;
do $$ declare table_name text;begin
 foreach table_name in array array['developer_skills','project_technologies','project_repositories','pull_requests','pull_request_reviews','project_environments','project_development_settings','build_runs','qa_runs','qa_test_cases','qa_test_results','bugs','bug_history','releases','technical_debt_items','project_external_services','integration_connections','external_integration_events'] loop
  execute format('drop trigger if exists %I on public.%I',table_name||'_touch_updated_at',table_name);
  execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',table_name||'_touch_updated_at',table_name);
 end loop;
end$$;

revoke all on function private.can_manage_development() from public,anon;
revoke all on function private.can_read_development() from public,anon;
grant execute on function private.can_manage_development() to authenticated,service_role;
grant execute on function private.can_read_development() to authenticated,service_role;


-- Original module migration: 20261001040000_quality_compliance_center.sql
create sequence if not exists public.audit_number_seq;
create sequence if not exists public.finding_number_seq;
create or replace function public.next_audit_number() returns text language sql volatile set search_path=public as $$select 'AUD-'||extract(year from now() at time zone 'UTC')::integer||'-'||lpad(nextval('public.audit_number_seq')::text,6,'0')$$;
create or replace function public.next_finding_number() returns text language sql volatile set search_path=public as $$select 'FND-'||extract(year from now() at time zone 'UTC')::integer||'-'||lpad(nextval('public.finding_number_seq')::text,6,'0')$$;

create table if not exists public.audit_templates(
 id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,audit_type text not null check(audit_type in('WEB_GENERAL','SEGURIDAD','SEO','PERFORMANCE','ACCESSIBILITY','INFRASTRUCTURE','INTEGRATIONS','BACKUP','MAINTENANCE','PROJECT_DELIVERY','SERVICE_REVIEW','CUSTOM')),description text,active boolean not null default true,current_version integer not null default 0 check(current_version>=0),created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.audit_template_versions(
 id uuid primary key default gen_random_uuid(),template_id uuid not null references public.audit_templates(id) on delete restrict,version integer not null check(version>0),status text not null default 'DRAFT' check(status in('DRAFT','PUBLISHED','RETIRED')),change_summary text,published_at timestamptz,published_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(template_id,version)
);
create table if not exists public.audit_template_sections(
 id uuid primary key default gen_random_uuid(),template_version_id uuid not null references public.audit_template_versions(id) on delete restrict,code text not null,title text not null,description text,weight numeric(8,2) not null default 0 check(weight>=0),sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(template_version_id,code)
);
create table if not exists public.audit_template_checks(
 id uuid primary key default gen_random_uuid(),template_version_id uuid not null references public.audit_template_versions(id) on delete restrict,section_id uuid not null references public.audit_template_sections(id) on delete restrict,code text not null,title text not null,description text,check_type text not null default 'MANUAL' check(check_type in('MANUAL','AUTOMATED','HYBRID')),required boolean not null default true,weight numeric(8,2) not null default 0 check(weight>=0),severity_on_failure text not null default 'MEDIUM' check(severity_on_failure in('INFO','LOW','MEDIUM','HIGH','CRITICAL')),instructions text,automation_key text,auto_create_finding boolean not null default false,evidence_required boolean not null default false,sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(template_version_id,code)
);
create table if not exists public.audit_plans(
 id uuid primary key default gen_random_uuid(),client_id uuid not null references public.clients(id) on delete restrict,project_id uuid references public.projects(id) on delete restrict,service_id uuid references public.client_services(id) on delete restrict,name text not null,audit_type text not null check(audit_type in('WEB_GENERAL','SEGURIDAD','SEO','PERFORMANCE','ACCESSIBILITY','INFRASTRUCTURE','INTEGRATIONS','BACKUP','MAINTENANCE','PROJECT_DELIVERY','SERVICE_REVIEW','CUSTOM')),template_id uuid not null references public.audit_templates(id) on delete restrict,frequency text not null check(frequency in('ONE_TIME','WEEKLY','MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','CUSTOM')),custom_interval_days integer check(custom_interval_days is null or custom_interval_days>0),responsible_user_id uuid,reviewer_user_id uuid,start_date date not null,next_run_at timestamptz,active boolean not null default true,client_visibility text not null default 'INTERNAL_ONLY' check(client_visibility in('INTERNAL_ONLY','CLIENT_SUMMARY','CLIENT_VISIBLE')),created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(frequency<>'CUSTOM' or custom_interval_days is not null)
);
create table if not exists public.audit_runs(
 id uuid primary key default gen_random_uuid(),audit_number text not null unique default public.next_audit_number(),plan_id uuid references public.audit_plans(id) on delete restrict,client_id uuid not null references public.clients(id) on delete restrict,project_id uuid references public.projects(id) on delete restrict,service_id uuid references public.client_services(id) on delete restrict,template_version_id uuid not null references public.audit_template_versions(id) on delete restrict,audit_type text not null check(audit_type in('WEB_GENERAL','SEGURIDAD','SEO','PERFORMANCE','ACCESSIBILITY','INFRASTRUCTURE','INTEGRATIONS','BACKUP','MAINTENANCE','PROJECT_DELIVERY','SERVICE_REVIEW','CUSTOM')),status text not null default 'SCHEDULED' check(status in('SCHEDULED','READY','IN_PROGRESS','WAITING_INFORMATION','IN_REVIEW','REMEDIATION_REQUIRED','RETEST_REQUIRED','COMPLETED','CANCELLED')),scheduled_at timestamptz not null,started_at timestamptz,completed_at timestamptz,responsible_user_id uuid,reviewer_user_id uuid,score numeric(5,2) check(score is null or score between 0 and 100),progress numeric(5,2) not null default 0 check(progress between 0 and 100),client_visibility text not null default 'INTERNAL_ONLY' check(client_visibility in('INTERNAL_ONLY','CLIENT_SUMMARY','CLIENT_VISIBLE')),created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.audit_check_results(
 id uuid primary key default gen_random_uuid(),audit_id uuid not null references public.audit_runs(id) on delete restrict,check_id uuid not null references public.audit_template_checks(id) on delete restrict,section_id uuid not null references public.audit_template_sections(id) on delete restrict,status text not null default 'NOT_STARTED' check(status in('NOT_STARTED','PASS','PASS_WITH_OBSERVATION','FAIL','NOT_APPLICABLE','BLOCKED')),notes text,not_applicable_reason text,evidence_required boolean not null default false,executed_by uuid,executed_at timestamptz,automation_source text,weight numeric(8,2) not null default 0,severity_on_failure text not null default 'MEDIUM' check(severity_on_failure in('INFO','LOW','MEDIUM','HIGH','CRITICAL')),finding_id uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(audit_id,check_id),check(status<>'NOT_APPLICABLE' or length(trim(coalesce(not_applicable_reason,'')))>0)
);
create table if not exists public.audit_findings(
 id uuid primary key default gen_random_uuid(),finding_number text not null unique default public.next_finding_number(),audit_id uuid not null references public.audit_runs(id) on delete restrict,client_id uuid not null references public.clients(id) on delete restrict,project_id uuid references public.projects(id) on delete restrict,check_result_id uuid references public.audit_check_results(id) on delete restrict,category text not null,title text not null,description text not null,severity text not null check(severity in('INFO','LOW','MEDIUM','HIGH','CRITICAL')),priority text not null default 'NORMAL' check(priority in('LOW','NORMAL','HIGH','URGENT','CRITICAL')),status text not null default 'OPEN' check(status in('OPEN','ACKNOWLEDGED','ASSIGNED','IN_REMEDIATION','READY_FOR_RETEST','RETEST_FAILED','RESOLVED','ACCEPTED_RISK','NOT_APPLICABLE','CLOSED')),responsible_user_id uuid,due_date date,recommendation text,internal_notes text,client_summary text,client_visibility text not null default 'INTERNAL_ONLY' check(client_visibility in('INTERNAL_ONLY','CLIENT_SUMMARY','CLIENT_VISIBLE')),task_id uuid references public.tasks(id) on delete restrict,bug_id uuid references public.bugs(id) on delete restrict,accepted_risk_reason text,accepted_risk_by uuid,risk_review_at date,created_at timestamptz not null default now(),resolved_at timestamptz,updated_at timestamptz not null default now(),check(status<>'ACCEPTED_RISK' or (accepted_risk_reason is not null and accepted_risk_by is not null and risk_review_at is not null))
);
alter table public.audit_check_results drop constraint if exists audit_check_results_finding_id_fkey;
alter table public.audit_check_results add constraint audit_check_results_finding_id_fkey foreign key(finding_id) references public.audit_findings(id) on delete restrict;
create unique index if not exists audit_findings_check_unique on public.audit_findings(check_result_id) where check_result_id is not null;
create table if not exists public.audit_evidence(
 id uuid primary key default gen_random_uuid(),audit_id uuid not null references public.audit_runs(id) on delete restrict,finding_id uuid references public.audit_findings(id) on delete restrict,check_result_id uuid references public.audit_check_results(id) on delete restrict,document_id uuid,storage_path text,evidence_type text not null check(evidence_type in('SCREENSHOT','PDF','IMAGE','SAFE_LOG_EXTRACT','URL','TEXT','REPORT')),title text not null,description text,filename text,mime_type text,size_bytes bigint check(size_bytes is null or size_bytes>=0),sha256 text check(sha256 is null or sha256~'^[a-f0-9]{64}$'),external_url text,text_content text,visibility text not null default 'INTERNAL_ONLY' check(visibility in('INTERNAL_ONLY','CLIENT_VISIBLE')),uploaded_by uuid,uploaded_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.audit_remediations(
 id uuid primary key default gen_random_uuid(),finding_id uuid not null unique references public.audit_findings(id) on delete restrict,owner_id uuid,action_plan text not null,status text not null default 'PLANNED' check(status in('PLANNED','IN_PROGRESS','BLOCKED','READY_FOR_RETEST','COMPLETED','CANCELLED')),target_date date,task_id uuid references public.tasks(id) on delete restrict,bug_id uuid references public.bugs(id) on delete restrict,started_at timestamptz,completed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.audit_retests(
 id uuid primary key default gen_random_uuid(),finding_id uuid not null references public.audit_findings(id) on delete restrict,performed_by uuid,performed_at timestamptz not null default now(),result text not null check(result in('PASS','FAIL','BLOCKED')),notes text not null,evidence_id uuid references public.audit_evidence(id) on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.audit_reports(
 id uuid primary key default gen_random_uuid(),audit_id uuid not null references public.audit_runs(id) on delete restrict,version integer not null check(version>0),report_type text not null check(report_type in('INTERNAL','CLIENT')),status text not null default 'DRAFT' check(status in('DRAFT','REVIEW','APPROVED','PUBLISHED')),document_id text,sha256 text not null check(sha256~'^[a-f0-9]{64}$'),template_version_id uuid not null references public.audit_template_versions(id) on delete restrict,audit_snapshot jsonb not null,generated_by uuid,generated_at timestamptz not null default now(),approved_by uuid,approved_at timestamptz,published_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(audit_id,version,report_type)
);
create table if not exists public.audit_events(
 id uuid primary key default gen_random_uuid(),audit_id uuid references public.audit_runs(id) on delete restrict,finding_id uuid references public.audit_findings(id) on delete restrict,aggregate_type text not null,aggregate_id uuid not null,event_type text not null,actor_id uuid,payload jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default now()
);
create table if not exists public.audit_notifications(id uuid primary key default gen_random_uuid(),event_key text not null unique,user_id uuid,audience_role text,type text not null,title text not null,body text,entity_type text not null,entity_id uuid not null,read_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.audit_idempotency_keys(idempotency_key text not null,operation text not null,resource_id uuid not null,created_at timestamptz not null default now(),primary key(idempotency_key,operation));

create or replace function public.audit_event_to_outbox() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload) values(new.aggregate_type,new.aggregate_id,new.event_type,jsonb_build_object('auditId',new.audit_id,'findingId',new.finding_id,'auditEventId',new.id)||new.payload);return new;end$$;
drop trigger if exists audit_event_outbox on public.audit_events;create trigger audit_event_outbox after insert on public.audit_events for each row execute function public.audit_event_to_outbox();

create index if not exists audit_plans_client_next_idx on public.audit_plans(client_id,next_run_at) where active;
create index if not exists audit_plans_project_idx on public.audit_plans(project_id) where project_id is not null;
create index if not exists audit_runs_client_status_idx on public.audit_runs(client_id,status,scheduled_at desc);
create index if not exists audit_runs_project_status_idx on public.audit_runs(project_id,status,scheduled_at desc) where project_id is not null;
create index if not exists audit_runs_responsible_idx on public.audit_runs(responsible_user_id,status,scheduled_at);
create index if not exists audit_findings_audit_status_idx on public.audit_findings(audit_id,status,severity);
create index if not exists audit_findings_client_status_idx on public.audit_findings(client_id,status,due_date);
create index if not exists audit_findings_project_idx on public.audit_findings(project_id,status) where project_id is not null;
create index if not exists audit_findings_responsible_idx on public.audit_findings(responsible_user_id,status,due_date);
create index if not exists audit_remediations_due_idx on public.audit_remediations(status,target_date);
create index if not exists audit_events_timeline_idx on public.audit_events(audit_id,occurred_at desc);

create or replace function public.audit_template_version_immutable() returns trigger language plpgsql set search_path=public as $$begin if old.status in('PUBLISHED','RETIRED') then raise exception 'Una versión de plantilla publicada es inmutable';end if;if tg_op='DELETE' then return old;end if;return new;end$$;
drop trigger if exists audit_template_version_immutable on public.audit_template_versions;create trigger audit_template_version_immutable before update or delete on public.audit_template_versions for each row execute function public.audit_template_version_immutable();
create or replace function public.audit_template_child_immutable() returns trigger language plpgsql set search_path=public as $$declare version_id uuid;begin if tg_op='DELETE' then version_id:=old.template_version_id;else version_id:=new.template_version_id;end if;if exists(select 1 from public.audit_template_versions where id=version_id and status in('PUBLISHED','RETIRED')) then raise exception 'Los checks de una versión publicada son inmutables';end if;if tg_op='DELETE' then return old;end if;return new;end$$;
drop trigger if exists audit_template_section_immutable on public.audit_template_sections;create trigger audit_template_section_immutable before insert or update or delete on public.audit_template_sections for each row execute function public.audit_template_child_immutable();
drop trigger if exists audit_template_check_immutable on public.audit_template_checks;create trigger audit_template_check_immutable before insert or update or delete on public.audit_template_checks for each row execute function public.audit_template_child_immutable();

create or replace function private.can_manage_audits() returns boolean language sql stable security definer set search_path=public as $$select private.zyteron_role() in('GERENTE_GENERAL','JEFE_DESARROLLO','TECH_LEAD')$$;
create or replace function private.can_execute_audits() returns boolean language sql stable security definer set search_path=public as $$select private.zyteron_role() in('GERENTE_GENERAL','JEFE_DESARROLLO','TECH_LEAD','QA')$$;
create or replace function private.can_read_audit(target_audit_id uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.audit_runs a where a.id=target_audit_id and (private.can_manage_audits() or a.responsible_user_id=auth.uid() or a.reviewer_user_id=auth.uid() or (a.project_id is not null and private.can_access_project(a.project_id)) or (private.zyteron_role() in('JEFE_VENTAS','EJECUTIVA_VENTAS','COMERCIAL') and a.client_visibility<>'INTERNAL_ONLY') or (private.zyteron_role()='PORTAL_CLIENT' and a.client_visibility='CLIENT_VISIBLE' and a.client_id=nullif(auth.jwt()->'app_metadata'->>'client_id','')::uuid)))$$;

do $$declare t text;begin foreach t in array array['audit_templates','audit_template_versions','audit_template_sections','audit_template_checks','audit_plans','audit_runs','audit_check_results','audit_findings','audit_evidence','audit_remediations','audit_retests','audit_reports','audit_events','audit_notifications','audit_idempotency_keys'] loop execute format('alter table public.%I enable row level security',t);end loop;end$$;
drop policy if exists audit_templates_read on public.audit_templates;create policy audit_templates_read on public.audit_templates for select to authenticated using(private.zyteron_role() in('GERENTE_GENERAL','JEFE_DESARROLLO','TECH_LEAD','QA','PROGRAMADOR','DESARROLLO','OPERACIONES'));
drop policy if exists audit_templates_manage on public.audit_templates;create policy audit_templates_manage on public.audit_templates for all to authenticated using(private.can_manage_audits()) with check(private.can_manage_audits());
drop policy if exists audit_versions_read on public.audit_template_versions;create policy audit_versions_read on public.audit_template_versions for select to authenticated using(exists(select 1 from public.audit_templates t where t.id=template_id and (t.active or private.can_manage_audits())));
drop policy if exists audit_versions_manage on public.audit_template_versions;create policy audit_versions_manage on public.audit_template_versions for all to authenticated using(private.can_manage_audits()) with check(private.can_manage_audits());
drop policy if exists audit_sections_read on public.audit_template_sections;create policy audit_sections_read on public.audit_template_sections for select to authenticated using(exists(select 1 from public.audit_template_versions v join public.audit_templates t on t.id=v.template_id where v.id=template_version_id and (t.active or private.can_manage_audits())));
drop policy if exists audit_sections_manage on public.audit_template_sections;create policy audit_sections_manage on public.audit_template_sections for all to authenticated using(private.can_manage_audits()) with check(private.can_manage_audits());
drop policy if exists audit_checks_read on public.audit_template_checks;create policy audit_checks_read on public.audit_template_checks for select to authenticated using(exists(select 1 from public.audit_template_versions v join public.audit_templates t on t.id=v.template_id where v.id=template_version_id and (t.active or private.can_manage_audits())));
drop policy if exists audit_checks_manage on public.audit_template_checks;create policy audit_checks_manage on public.audit_template_checks for all to authenticated using(private.can_manage_audits()) with check(private.can_manage_audits());
drop policy if exists audit_plans_scope on public.audit_plans;create policy audit_plans_scope on public.audit_plans for select to authenticated using(private.can_manage_audits() or responsible_user_id=auth.uid() or reviewer_user_id=auth.uid() or (project_id is not null and private.can_access_project(project_id)));
drop policy if exists audit_plans_manage on public.audit_plans;create policy audit_plans_manage on public.audit_plans for all to authenticated using(private.can_manage_audits()) with check(private.can_manage_audits());
drop policy if exists audit_runs_scope on public.audit_runs;create policy audit_runs_scope on public.audit_runs for select to authenticated using(private.can_read_audit(id));
drop policy if exists audit_runs_manage on public.audit_runs;create policy audit_runs_manage on public.audit_runs for all to authenticated using(private.can_manage_audits() or (private.can_execute_audits() and (responsible_user_id=auth.uid() or reviewer_user_id=auth.uid()))) with check(private.can_manage_audits() or (private.can_execute_audits() and (responsible_user_id=auth.uid() or reviewer_user_id=auth.uid())));
drop policy if exists audit_check_results_scope on public.audit_check_results;create policy audit_check_results_scope on public.audit_check_results for all to authenticated using(private.can_read_audit(audit_id)) with check(private.can_read_audit(audit_id) and private.can_execute_audits());
drop policy if exists audit_findings_scope on public.audit_findings;create policy audit_findings_scope on public.audit_findings for select to authenticated using(private.can_read_audit(audit_id) and (private.zyteron_role()<>'PORTAL_CLIENT' or client_visibility='CLIENT_VISIBLE'));
drop policy if exists audit_findings_manage on public.audit_findings;create policy audit_findings_manage on public.audit_findings for all to authenticated using(private.can_manage_audits() or responsible_user_id=auth.uid() or (project_id is not null and private.can_access_project(project_id))) with check(private.can_manage_audits() or private.can_execute_audits() or responsible_user_id=auth.uid());
drop policy if exists audit_evidence_scope on public.audit_evidence;create policy audit_evidence_scope on public.audit_evidence for select to authenticated using(private.can_read_audit(audit_id) and (private.zyteron_role()<>'PORTAL_CLIENT' or visibility='CLIENT_VISIBLE'));
drop policy if exists audit_evidence_manage on public.audit_evidence;create policy audit_evidence_manage on public.audit_evidence for insert to authenticated with check(private.can_read_audit(audit_id) and private.can_execute_audits());
drop policy if exists audit_remediations_scope on public.audit_remediations;create policy audit_remediations_scope on public.audit_remediations for all to authenticated using(exists(select 1 from public.audit_findings f where f.id=finding_id and private.can_read_audit(f.audit_id))) with check(exists(select 1 from public.audit_findings f where f.id=finding_id and private.can_read_audit(f.audit_id)));
drop policy if exists audit_retests_scope on public.audit_retests;create policy audit_retests_scope on public.audit_retests for all to authenticated using(exists(select 1 from public.audit_findings f where f.id=finding_id and private.can_read_audit(f.audit_id))) with check(private.can_execute_audits() and exists(select 1 from public.audit_findings f where f.id=finding_id and private.can_read_audit(f.audit_id)));
drop policy if exists audit_reports_scope on public.audit_reports;create policy audit_reports_scope on public.audit_reports for select to authenticated using(private.can_read_audit(audit_id) and (private.zyteron_role()<>'PORTAL_CLIENT' or (report_type='CLIENT' and status='PUBLISHED')));
drop policy if exists audit_reports_manage on public.audit_reports;create policy audit_reports_manage on public.audit_reports for all to authenticated using(private.can_manage_audits() or private.can_execute_audits()) with check(private.can_manage_audits() or private.can_execute_audits());
drop policy if exists audit_events_scope on public.audit_events;create policy audit_events_scope on public.audit_events for select to authenticated using(audit_id is not null and private.can_read_audit(audit_id));
drop policy if exists audit_notifications_scope on public.audit_notifications;create policy audit_notifications_scope on public.audit_notifications for select to authenticated using(user_id=auth.uid() or audience_role=private.zyteron_role() or private.can_manage_audits());
drop policy if exists audit_idempotency_manage on public.audit_idempotency_keys;create policy audit_idempotency_manage on public.audit_idempotency_keys for all to authenticated using(private.can_manage_audits()) with check(private.can_manage_audits());

insert into public.app_permissions(code,description) values
('audit.dashboard.view','Ver Audit Command Center'),('audit.plan.view','Ver planes de auditoría'),('audit.plan.create','Crear planes de auditoría'),('audit.plan.edit','Editar planes de auditoría'),('audit.plan.disable','Desactivar planes de auditoría'),('audit.view','Ver auditorías'),('audit.create','Crear auditorías'),('audit.assign','Asignar auditorías'),('audit.execute','Ejecutar auditorías'),('audit.review','Revisar auditorías'),('audit.complete','Completar auditorías'),('finding.view','Ver hallazgos'),('finding.create','Crear hallazgos'),('finding.assign','Asignar hallazgos'),('finding.edit','Editar hallazgos'),('finding.resolve','Resolver hallazgos'),('finding.accept_risk','Aceptar riesgos'),('evidence.view','Ver evidencias'),('evidence.upload','Subir evidencias'),('retest.execute','Ejecutar retests'),('audit_report.view','Ver informes de auditoría'),('audit_report.generate','Generar informes de auditoría'),('audit_report.approve','Aprobar informes de auditoría'),('audit_report.publish','Publicar informes de auditoría'),('audit_template.view','Ver plantillas de auditoría'),('audit_template.manage','Gestionar plantillas de auditoría') on conflict(code) do update set description=excluded.description;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('GERENTE_GENERAL'),('JEFE_DESARROLLO'),('TECH_LEAD'))r(role) cross join public.app_permissions p where p.code like any(array['audit.%','finding.%','evidence.%','retest.%','audit_report.%','audit_template.%']) on conflict do nothing;
insert into public.role_permissions(role,permission_code) select 'QA',code from public.app_permissions where code in('audit.dashboard.view','audit.plan.view','audit.view','audit.execute','audit.review','finding.view','finding.create','finding.edit','finding.resolve','evidence.view','evidence.upload','retest.execute','audit_report.view','audit_report.generate','audit_template.view') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('PROGRAMADOR'),('DESARROLLO'))r(role) cross join public.app_permissions p where p.code in('audit.dashboard.view','audit.view','finding.view','finding.edit','evidence.view') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('JEFE_VENTAS'),('EJECUTIVA_VENTAS'),('COMERCIAL'))r(role) cross join public.app_permissions p where p.code in('audit.dashboard.view','audit.view','finding.view','audit_report.view') on conflict do nothing;

insert into public.audit_templates(id,code,name,audit_type,description,active,current_version) values('a0000000-0000-4000-8000-000000000001','WEB-BASE','Revisión web integral','WEB_GENERAL','Base segura para disponibilidad, HTTPS, cabeceras, calidad funcional y backup.',true,1) on conflict(code) do nothing;
insert into public.audit_template_versions(id,template_id,version,status,change_summary,published_at) values('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001',1,'DRAFT','Versión inicial controlada',null) on conflict(template_id,version) do nothing;
insert into public.audit_template_sections(id,template_version_id,code,title,weight,sort_order) values
('a0000000-0000-4000-8000-000000000010','a0000000-0000-4000-8000-000000000002','SECURITY','Seguridad defensiva',35,1),('a0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000002','PERFORMANCE','Disponibilidad y respuesta',35,2),('a0000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000002','QUALITY','Calidad funcional',30,3) on conflict(template_version_id,code) do nothing;
insert into public.audit_template_checks(template_version_id,section_id,code,title,check_type,required,weight,severity_on_failure,automation_key,auto_create_finding,evidence_required,sort_order) values
('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000010','HTTPS','HTTPS activo','AUTOMATED',true,15,'HIGH','SSL',true,false,1),('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000010','HEADERS','Cabeceras defensivas','AUTOMATED',true,20,'MEDIUM','SECURITY_HEADERS',true,false,2),('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000011','HTTP','Disponibilidad HTTP','AUTOMATED',true,20,'HIGH','HTTP_AVAILABILITY',true,false,1),('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000011','LATENCY','Tiempo de respuesta','AUTOMATED',true,15,'MEDIUM','RESPONSE_TIME',true,false,2),('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000012','FORMS','Formularios y validaciones','MANUAL',true,15,'HIGH',null,true,true,1),('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000012','BACKUP','Backup reciente y restauración verificada','MANUAL',true,15,'HIGH',null,true,true,2) on conflict(template_version_id,code) do nothing;
update public.audit_template_versions set status='PUBLISHED',published_at=now() where id='a0000000-0000-4000-8000-000000000002' and status='DRAFT';

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('audit-evidence','audit-evidence',false,20971520,array['image/png','image/jpeg','application/pdf','text/plain']),('audit-reports','audit-reports',false,20971520,array['application/pdf']) on conflict(id) do nothing;
drop policy if exists audit_storage_read on storage.objects;create policy audit_storage_read on storage.objects for select to authenticated using(bucket_id in('audit-evidence','audit-reports') and private.zyteron_role() in('GERENTE_GENERAL','JEFE_DESARROLLO','TECH_LEAD','QA'));
drop policy if exists audit_storage_write on storage.objects;create policy audit_storage_write on storage.objects for insert to authenticated with check(bucket_id in('audit-evidence','audit-reports') and private.can_execute_audits());

do $$declare t text;begin foreach t in array array['audit_runs','audit_check_results','audit_findings','audit_remediations','audit_retests','audit_reports','audit_events'] loop if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;end loop;end$$;


-- Original module migration: 20261001060000_service_desk_support_center.sql
create sequence if not exists public.support_ticket_number_seq;
create or replace function public.next_support_ticket_number() returns text language sql volatile set search_path=public as $$select 'SUP-'||extract(year from now() at time zone 'UTC')::integer||'-'||lpad(nextval('public.support_ticket_number_seq')::text,6,'0')$$;

create table if not exists public.support_ticket_types(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,active boolean not null default true,sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.support_categories(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,active boolean not null default true,sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.support_subcategories(id uuid primary key default gen_random_uuid(),category_id uuid not null references public.support_categories(id) on delete restrict,code text not null,name text not null,active boolean not null default true,sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(category_id,code));
create table if not exists public.support_queues(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,description text,team_id uuid,privacy_scope text not null default 'NORMAL' check(privacy_scope in('NORMAL','CONFIDENTIAL','RESTRICTED')),assignment_strategy text not null default 'MANUAL' check(assignment_strategy in('ROUND_ROBIN','LEAST_LOADED','PROJECT_OWNER','SERVICE_OWNER','MANUAL')),active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.support_queue_members(id uuid primary key default gen_random_uuid(),queue_id uuid not null references public.support_queues(id) on delete restrict,user_id uuid not null,role text not null default 'AGENT' check(role in('AGENT','LEAD','OBSERVER')),active boolean not null default true,created_at timestamptz not null default now(),unique(queue_id,user_id));
create table if not exists public.business_calendars(id uuid primary key default gen_random_uuid(),name text not null,timezone text not null default 'America/Santiago',mode text not null check(mode in('TWENTY_FOUR_SEVEN','BUSINESS_HOURS','CUSTOM')),working_days integer[] not null default '{1,2,3,4,5}',working_hours jsonb not null default '{"start":"09:00","end":"18:00"}'::jsonb,holidays date[] not null default '{}',active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.sla_policies(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,scope_type text not null check(scope_type in('GLOBAL','CLIENT','SERVICE','CONTRACT')),scope_id uuid,calendar_id uuid not null references public.business_calendars(id) on delete restrict,pause_statuses text[] not null default '{WAITING_CLIENT}',active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index if not exists sla_policies_scope_unique on public.sla_policies(scope_type,coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid)) where active;
create table if not exists public.sla_targets(id uuid primary key default gen_random_uuid(),policy_id uuid not null references public.sla_policies(id) on delete restrict,priority text not null check(priority in('LOW','NORMAL','HIGH','URGENT')),first_response_minutes integer not null check(first_response_minutes>0),resolution_minutes integer not null check(resolution_minutes>0),update_frequency_minutes integer check(update_frequency_minutes is null or update_frequency_minutes>0),warning_percent integer not null default 80 check(warning_percent between 1 and 99),escalation_percent integer not null default 90 check(escalation_percent between warning_percent and 100),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(policy_id,priority));

create table if not exists public.support_tickets(
 id uuid primary key default gen_random_uuid(),ticket_number text not null unique default public.next_support_ticket_number(),requester_type text not null check(requester_type in('CLIENT','INTERNAL_USER','SYSTEM','MONITORING','EMAIL','PORTAL')),client_id uuid references public.clients(id) on delete restrict,client_contact_id uuid references public.client_contacts(id) on delete restrict,requester_user_id uuid,project_id uuid references public.projects(id) on delete restrict,service_id uuid references public.client_services(id) on delete restrict,subject text not null,description text not null,ticket_type text not null references public.support_ticket_types(code) on delete restrict,category_id uuid references public.support_categories(id) on delete restrict,subcategory_id uuid references public.support_subcategories(id) on delete restrict,channel text not null check(channel in('PORTAL','EMAIL','PHONE','WHATSAPP','INTERNAL','MONITORING','API')),priority text not null default 'NORMAL' check(priority in('LOW','NORMAL','HIGH','URGENT')),severity text not null default 'INFO' check(severity in('INFO','LOW','MEDIUM','HIGH','CRITICAL')),status text not null default 'NEW' check(status in('NEW','TRIAGE','OPEN','ASSIGNED','IN_PROGRESS','WAITING_CLIENT','WAITING_INTERNAL','WAITING_THIRD_PARTY','RESOLVED','CLOSED','CANCELLED','REOPENED')),queue_id uuid references public.support_queues(id) on delete restrict,assigned_to uuid,team_id uuid,sla_policy_id uuid references public.sla_policies(id) on delete restrict,first_response_due_at timestamptz,resolution_due_at timestamptz,first_responded_at timestamptz,resolved_at timestamptz,closed_at timestamptz,resolution_code text check(resolution_code is null or resolution_code in('FIXED','INFORMATION_PROVIDED','CONFIGURATION_CHANGED','DUPLICATE','NOT_REPRODUCIBLE','USER_ERROR','THIRD_PARTY','WONT_FIX','OTHER')),resolution_summary text,root_cause text,client_visibility text not null default 'INTERNAL_ONLY' check(client_visibility in('INTERNAL_ONLY','CLIENT_VISIBLE')),privacy text not null default 'NORMAL' check(privacy in('NORMAL','CONFIDENTIAL','RESTRICTED')),reopened_count integer not null default 0 check(reopened_count>=0),sla_paused_at timestamptz,sla_first_response_remaining_minutes integer,sla_resolution_remaining_minutes integer,archived_at timestamptz,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(requester_type not in('CLIENT','PORTAL') or client_id is not null),check(status not in('RESOLVED','CLOSED') or (resolution_code is not null and length(trim(coalesce(resolution_summary,'')))>0))
);
create table if not exists public.support_routing_rules(id uuid primary key default gen_random_uuid(),name text not null,ticket_type text references public.support_ticket_types(code) on delete restrict,category_id uuid references public.support_categories(id) on delete restrict,channel text check(channel is null or channel in('PORTAL','EMAIL','PHONE','WHATSAPP','INTERNAL','MONITORING','API')),client_id uuid references public.clients(id) on delete restrict,queue_id uuid not null references public.support_queues(id) on delete restrict,priority text check(priority is null or priority in('LOW','NORMAL','HIGH','URGENT')),active boolean not null default true,position integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.ticket_messages(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete restrict,author_type text not null check(author_type in('AGENT','CLIENT','INTERNAL_USER','SYSTEM')),author_user_id uuid,author_contact_id uuid references public.client_contacts(id) on delete restrict,message_type text not null default 'MESSAGE' check(message_type in('MESSAGE','CALL_NOTE','EMAIL','PORTAL_REPLY')),body text not null,visibility text not null check(visibility in('PUBLIC_REPLY','INTERNAL_NOTE','SYSTEM_EVENT')),provider_message_id text,delivery_status text not null default 'NOT_REQUIRED' check(delivery_status in('NOT_REQUIRED','PENDING','SENT','DELIVERY_FAILED')),call_duration_minutes integer check(call_duration_minutes is null or call_duration_minutes>=0),call_outcome text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),edited_at timestamptz);
create table if not exists public.ticket_status_history(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete restrict,from_status text,to_status text not null,actor_id uuid,reason text,client_visible boolean not null default false,occurred_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.ticket_assignments(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete restrict,from_user_id uuid,to_user_id uuid not null,assigned_by uuid,reason text,assigned_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.ticket_relations(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete restrict,relation_type text not null check(relation_type in('TASK','BUG','INCIDENT','AUDIT_FINDING','CHANGE_REQUEST','FINANCE','PARENT_TICKET','CHILD_TICKET','MERGED_TICKET')),related_id uuid not null,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(ticket_id,relation_type,related_id));
create table if not exists public.ticket_watchers(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete restrict,user_id uuid not null,created_at timestamptz not null default now(),unique(ticket_id,user_id));
create table if not exists public.support_tags(id uuid primary key default gen_random_uuid(),name text not null unique,color text,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.ticket_tag_assignments(ticket_id uuid not null references public.support_tickets(id) on delete restrict,tag_id uuid not null references public.support_tags(id) on delete restrict,assigned_by uuid,created_at timestamptz not null default now(),primary key(ticket_id,tag_id));
create table if not exists public.support_saved_views(id uuid primary key default gen_random_uuid(),user_id uuid not null,name text not null,filters jsonb not null default '{}'::jsonb,shared boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.ticket_attachments(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete restrict,message_id uuid references public.ticket_messages(id) on delete restrict,document_id uuid,storage_path text not null,filename text not null,mime_type text not null,size_bytes bigint not null check(size_bytes>0 and size_bytes<=20971520),sha256 text not null check(sha256~'^[a-f0-9]{64}$'),visibility text not null default 'INTERNAL_ONLY' check(visibility in('INTERNAL_ONLY','CLIENT_VISIBLE')),uploaded_by uuid,malware_status text not null default 'NOT_SCANNED' check(malware_status in('NOT_SCANNED','CLEAN','QUARANTINED','FAILED')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.sla_events(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete restrict,target_type text not null check(target_type in('FIRST_RESPONSE','RESOLUTION','UPDATE_FREQUENCY','ALL')),event_type text not null check(event_type in('STARTED','PAUSED','RESUMED','WARNING','BREACHED','COMPLETED')),occurred_at timestamptz not null default now(),metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());

create table if not exists public.support_macros(id uuid primary key default gen_random_uuid(),name text not null,body text not null,status text,category_id uuid references public.support_categories(id) on delete restrict,tags text[] not null default '{}',active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.knowledge_categories(id uuid primary key default gen_random_uuid(),name text not null,slug text not null unique,visibility text not null default 'INTERNAL' check(visibility in('INTERNAL','CLIENT','PUBLIC')),active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.knowledge_articles(id uuid primary key default gen_random_uuid(),category_id uuid references public.knowledge_categories(id) on delete restrict,title text not null,slug text not null unique,summary text not null,status text not null default 'DRAFT' check(status in('DRAFT','REVIEW','PUBLISHED','ARCHIVED')),visibility text not null default 'INTERNAL' check(visibility in('INTERNAL','CLIENT','PUBLIC')),current_version integer not null default 1 check(current_version>0),author_id uuid,reviewer_id uuid,published_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.knowledge_versions(id uuid primary key default gen_random_uuid(),article_id uuid not null references public.knowledge_articles(id) on delete restrict,version integer not null check(version>0),content text not null,change_summary text,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(article_id,version));
create table if not exists public.support_channel_connections(id uuid primary key default gen_random_uuid(),provider text not null,display_name text not null,status text not null default 'NOT_CONFIGURED' check(status in('NOT_CONFIGURED','CONNECTED','ERROR','DISCONNECTED')),external_reference text,last_sync_at timestamptz,last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.support_email_threads(id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id) on delete restrict,provider text not null,provider_thread_id text,provider_message_id text not null,in_reply_to text,from_address text not null,received_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,provider_message_id));
create table if not exists public.csat_surveys(id uuid primary key default gen_random_uuid(),ticket_id uuid not null unique references public.support_tickets(id) on delete restrict,status text not null default 'PENDING' check(status in('PENDING','SENT','COMPLETED','EXPIRED')),invited_at timestamptz,expires_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.csat_responses(id uuid primary key default gen_random_uuid(),ticket_id uuid not null unique references public.support_tickets(id) on delete restrict,rating integer not null check(rating between 1 and 5),comment text,submitted_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.support_events(id uuid primary key default gen_random_uuid(),ticket_id uuid references public.support_tickets(id) on delete restrict,event_type text not null,actor_id uuid,payload jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default now());

create index if not exists support_tickets_client_idx on public.support_tickets(client_id,status,updated_at desc);
create index if not exists support_tickets_contact_idx on public.support_tickets(client_contact_id,created_at desc);
create index if not exists support_tickets_project_idx on public.support_tickets(project_id,status) where project_id is not null;
create index if not exists support_tickets_service_idx on public.support_tickets(service_id,status) where service_id is not null;
create index if not exists support_tickets_assigned_idx on public.support_tickets(assigned_to,status,priority);
create index if not exists support_tickets_queue_idx on public.support_tickets(queue_id,status,priority,updated_at);
create index if not exists support_tickets_sla_response_idx on public.support_tickets(first_response_due_at) where first_responded_at is null and archived_at is null;
create index if not exists support_tickets_sla_resolution_idx on public.support_tickets(resolution_due_at) where resolved_at is null and archived_at is null;
create index if not exists support_tickets_search_idx on public.support_tickets using gin(to_tsvector('spanish',ticket_number||' '||subject||' '||description));
create index if not exists ticket_messages_timeline_idx on public.ticket_messages(ticket_id,created_at desc);
create index if not exists support_events_ticket_idx on public.support_events(ticket_id,occurred_at desc);

create or replace function public.support_status_transition_guard() returns trigger language plpgsql set search_path=public as $$declare allowed text[];begin if new.status=old.status then return new;end if;allowed:=case old.status when 'NEW' then array['TRIAGE','ASSIGNED','CANCELLED'] when 'TRIAGE' then array['OPEN','ASSIGNED','WAITING_INTERNAL','CANCELLED'] when 'OPEN' then array['ASSIGNED','IN_PROGRESS','WAITING_CLIENT','WAITING_INTERNAL','WAITING_THIRD_PARTY','RESOLVED','CANCELLED'] when 'ASSIGNED' then array['IN_PROGRESS','WAITING_CLIENT','WAITING_INTERNAL','WAITING_THIRD_PARTY','RESOLVED','CANCELLED'] when 'IN_PROGRESS' then array['WAITING_CLIENT','WAITING_INTERNAL','WAITING_THIRD_PARTY','RESOLVED','CANCELLED'] when 'WAITING_CLIENT' then array['IN_PROGRESS','RESOLVED','CANCELLED'] when 'WAITING_INTERNAL' then array['TRIAGE','ASSIGNED','IN_PROGRESS','RESOLVED','CANCELLED'] when 'WAITING_THIRD_PARTY' then array['IN_PROGRESS','RESOLVED','CANCELLED'] when 'RESOLVED' then array['CLOSED','REOPENED'] when 'CLOSED' then array['REOPENED'] when 'CANCELLED' then array['REOPENED'] when 'REOPENED' then array['TRIAGE','ASSIGNED','IN_PROGRESS'] else array[]::text[] end;if not(new.status=any(allowed))then raise exception 'Transición de ticket % → % no permitida',old.status,new.status;end if;return new;end$$;
drop trigger if exists support_ticket_status_guard on public.support_tickets;create trigger support_ticket_status_guard before update of status on public.support_tickets for each row execute function public.support_status_transition_guard();
create or replace function public.knowledge_version_immutable() returns trigger language plpgsql set search_path=public as $$begin raise exception 'Las versiones de conocimiento son inmutables; crea una nueva versión';end$$;
drop trigger if exists knowledge_version_immutable on public.knowledge_versions;create trigger knowledge_version_immutable before update or delete on public.knowledge_versions for each row execute function public.knowledge_version_immutable();
create or replace function public.support_event_to_outbox() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload) values('SUPPORT_TICKET',coalesce(new.ticket_id,new.id),new.event_type,jsonb_build_object('ticketId',new.ticket_id,'supportEventId',new.id)||new.payload);return new;end$$;
drop trigger if exists support_event_outbox on public.support_events;create trigger support_event_outbox after insert on public.support_events for each row execute function public.support_event_to_outbox();

create or replace function private.support_portal_client_id() returns uuid language sql stable security definer set search_path=public as $$select client_id from public.client_portal_users where auth_user_id=auth.uid() and status='ACTIVE' limit 1$$;
create or replace function private.support_can_manage() returns boolean language sql stable security definer set search_path=public as $$select private.zyteron_role() in('GERENTE_GENERAL','JEFE_DESARROLLO','TECH_LEAD','SOPORTE_TECNICO')$$;
create or replace function private.support_can_read(target_ticket_id uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.support_tickets t where t.id=target_ticket_id and (private.support_can_manage() or t.assigned_to=auth.uid() or exists(select 1 from public.support_queue_members qm where qm.queue_id=t.queue_id and qm.user_id=auth.uid() and qm.active) or (t.project_id is not null and private.can_access_project(t.project_id)) or (private.zyteron_role()='FINANZAS' and t.ticket_type='BILLING_QUERY') or (private.zyteron_role()='RRHH' and t.requester_type='INTERNAL_USER' and (t.privacy='RESTRICTED' or exists(select 1 from public.support_queues q where q.id=t.queue_id and q.code='HR'))) or (private.zyteron_role() in('JEFE_VENTAS','EJECUTIVA_VENTAS','COMERCIAL') and t.client_id is not null and private.can_access_client(t.client_id)) or (private.zyteron_role()='PORTAL_CLIENT' and t.client_id=private.support_portal_client_id() and t.client_visibility='CLIENT_VISIBLE')))$$;

do $$declare t text;begin foreach t in array array['support_ticket_types','support_categories','support_subcategories','support_queues','support_queue_members','business_calendars','sla_policies','sla_targets','support_tickets','support_routing_rules','ticket_messages','ticket_status_history','ticket_assignments','ticket_relations','ticket_watchers','support_tags','ticket_tag_assignments','support_saved_views','ticket_attachments','sla_events','support_macros','knowledge_categories','knowledge_articles','knowledge_versions','support_channel_connections','support_email_threads','csat_surveys','csat_responses','support_events'] loop execute format('alter table public.%I enable row level security',t);end loop;end$$;
do $$declare t text;begin foreach t in array array['support_ticket_types','support_categories','support_subcategories','support_queues','business_calendars','sla_policies','sla_targets','support_routing_rules','support_macros','knowledge_categories','knowledge_articles','knowledge_versions'] loop execute format('drop policy if exists support_config_read on public.%I',t);execute format('create policy support_config_read on public.%I for select to authenticated using (private.zyteron_role()<>''PORTAL_CLIENT'')',t);execute format('drop policy if exists support_config_manage on public.%I',t);execute format('create policy support_config_manage on public.%I for all to authenticated using (private.support_can_manage()) with check (private.support_can_manage())',t);end loop;end$$;
do $$declare t text;begin foreach t in array array['support_ticket_types','support_categories','support_subcategories'] loop execute format('drop policy if exists support_catalog_portal_read on public.%I',t);execute format('create policy support_catalog_portal_read on public.%I for select to authenticated using (active)',t);end loop;end$$;
drop policy if exists support_knowledge_categories_portal_read on public.knowledge_categories;create policy support_knowledge_categories_portal_read on public.knowledge_categories for select to authenticated using(active and visibility in('CLIENT','PUBLIC'));
drop policy if exists support_knowledge_articles_portal_read on public.knowledge_articles;create policy support_knowledge_articles_portal_read on public.knowledge_articles for select to authenticated using(status='PUBLISHED' and visibility in('CLIENT','PUBLIC'));
drop policy if exists support_knowledge_versions_portal_read on public.knowledge_versions;create policy support_knowledge_versions_portal_read on public.knowledge_versions for select to authenticated using(exists(select 1 from public.knowledge_articles a where a.id=article_id and a.status='PUBLISHED' and a.visibility in('CLIENT','PUBLIC') and a.current_version=version));
drop policy if exists support_tickets_scope on public.support_tickets;create policy support_tickets_scope on public.support_tickets for select to authenticated using(private.support_can_read(id));
drop policy if exists support_tickets_create on public.support_tickets;create policy support_tickets_create on public.support_tickets for insert to authenticated with check(private.zyteron_role()<>'PORTAL_CLIENT' and (private.support_can_manage() or created_by=auth.uid() or requester_user_id=auth.uid()));
drop policy if exists support_tickets_update on public.support_tickets;create policy support_tickets_update on public.support_tickets for update to authenticated using(private.zyteron_role()<>'PORTAL_CLIENT' and private.support_can_read(id)) with check(private.zyteron_role()<>'PORTAL_CLIENT' and private.support_can_read(id));
drop policy if exists ticket_messages_read on public.ticket_messages;create policy ticket_messages_read on public.ticket_messages for select to authenticated using(private.support_can_read(ticket_id) and (private.zyteron_role()<>'PORTAL_CLIENT' or visibility in('PUBLIC_REPLY','SYSTEM_EVENT')));
drop policy if exists ticket_messages_write on public.ticket_messages;create policy ticket_messages_write on public.ticket_messages for insert to authenticated with check(private.support_can_read(ticket_id) and (private.zyteron_role()<>'PORTAL_CLIENT' or (visibility='PUBLIC_REPLY' and author_type='CLIENT')));
do $$declare t text;begin foreach t in array array['ticket_assignments','ticket_relations','ticket_watchers','sla_events','support_email_threads','support_events'] loop execute format('drop policy if exists support_ticket_child_scope on public.%I',t);execute format('create policy support_ticket_child_scope on public.%I for all to authenticated using (private.zyteron_role()<>''PORTAL_CLIENT'' and private.support_can_read(ticket_id)) with check (private.zyteron_role()<>''PORTAL_CLIENT'' and private.support_can_read(ticket_id))',t);end loop;end$$;
drop policy if exists support_status_history_read on public.ticket_status_history;create policy support_status_history_read on public.ticket_status_history for select to authenticated using(private.support_can_read(ticket_id) and (private.zyteron_role()<>'PORTAL_CLIENT' or client_visible));
drop policy if exists support_status_history_write on public.ticket_status_history;create policy support_status_history_write on public.ticket_status_history for all to authenticated using(private.zyteron_role()<>'PORTAL_CLIENT' and private.support_can_read(ticket_id)) with check(private.zyteron_role()<>'PORTAL_CLIENT' and private.support_can_read(ticket_id));
drop policy if exists support_attachments_read on public.ticket_attachments;create policy support_attachments_read on public.ticket_attachments for select to authenticated using(private.support_can_read(ticket_id) and (private.zyteron_role()<>'PORTAL_CLIENT' or visibility='CLIENT_VISIBLE'));
drop policy if exists support_attachments_write on public.ticket_attachments;create policy support_attachments_write on public.ticket_attachments for all to authenticated using(private.zyteron_role()<>'PORTAL_CLIENT' and private.support_can_read(ticket_id)) with check(private.zyteron_role()<>'PORTAL_CLIENT' and private.support_can_read(ticket_id));
drop policy if exists support_csat_surveys_read on public.csat_surveys;create policy support_csat_surveys_read on public.csat_surveys for select to authenticated using(private.support_can_read(ticket_id));
drop policy if exists support_csat_surveys_write on public.csat_surveys;create policy support_csat_surveys_write on public.csat_surveys for all to authenticated using(private.zyteron_role()<>'PORTAL_CLIENT' and private.support_can_read(ticket_id)) with check(private.zyteron_role()<>'PORTAL_CLIENT' and private.support_can_read(ticket_id));
drop policy if exists support_csat_responses_scope on public.csat_responses;create policy support_csat_responses_scope on public.csat_responses for select to authenticated using(private.support_can_read(ticket_id));
drop policy if exists support_csat_responses_create on public.csat_responses;create policy support_csat_responses_create on public.csat_responses for insert to authenticated with check(private.support_can_read(ticket_id) and exists(select 1 from public.support_tickets t where t.id=ticket_id and t.status='CLOSED'));
drop policy if exists support_queue_members_scope on public.support_queue_members;create policy support_queue_members_scope on public.support_queue_members for select to authenticated using(user_id=auth.uid() or private.support_can_manage());
drop policy if exists support_queue_members_manage on public.support_queue_members;create policy support_queue_members_manage on public.support_queue_members for all to authenticated using(private.support_can_manage()) with check(private.support_can_manage());
drop policy if exists support_tags_read on public.support_tags;create policy support_tags_read on public.support_tags for select to authenticated using(true);
drop policy if exists support_tags_manage on public.support_tags;create policy support_tags_manage on public.support_tags for all to authenticated using(private.support_can_manage()) with check(private.support_can_manage());
drop policy if exists ticket_tags_scope on public.ticket_tag_assignments;create policy ticket_tags_scope on public.ticket_tag_assignments for all to authenticated using(private.support_can_read(ticket_id)) with check(private.support_can_read(ticket_id));
drop policy if exists support_saved_views_own on public.support_saved_views;create policy support_saved_views_own on public.support_saved_views for all to authenticated using(user_id=auth.uid() or shared or private.support_can_manage()) with check(user_id=auth.uid() or private.support_can_manage());
drop policy if exists support_channels_manage on public.support_channel_connections;create policy support_channels_manage on public.support_channel_connections for all to authenticated using(private.support_can_manage()) with check(private.support_can_manage());

insert into public.app_permissions(code,description) values
('support.dashboard.view','Ver Support Command Center'),('ticket.view','Ver tickets'),('ticket.create','Crear tickets'),('ticket.edit','Editar tickets'),('ticket.assign','Asignar tickets'),('ticket.reassign','Reasignar tickets'),('ticket.change_priority','Cambiar prioridad'),('ticket.change_status','Cambiar estado'),('ticket.resolve','Resolver tickets'),('ticket.close','Cerrar tickets'),('ticket.reopen','Reabrir tickets'),('ticket.merge','Fusionar tickets'),('ticket.split','Separar tickets'),('ticket.reply','Responder tickets'),('ticket.internal_note','Crear notas internas'),('sla.view','Ver SLA'),('sla.manage','Gestionar SLA'),('queue.view','Ver colas'),('queue.manage','Gestionar colas'),('support_macro.view','Ver respuestas rápidas'),('support_macro.manage','Gestionar respuestas rápidas'),('knowledge.view','Ver conocimiento'),('knowledge.manage','Gestionar conocimiento'),('csat.view','Ver CSAT'),('support.report.view','Ver informes de soporte'),('support.export','Exportar soporte'),('internal_request.view','Ver solicitudes internas'),('internal_request.manage','Gestionar solicitudes internas') on conflict(code) do update set description=excluded.description;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('GERENTE_GENERAL'),('SOPORTE_TECNICO'))r(role) cross join public.app_permissions p where p.code like any(array['support.%','ticket.%','sla.%','queue.%','support_macro.%','knowledge.%','csat.%','internal_request.%']) on conflict do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('JEFE_DESARROLLO'),('TECH_LEAD'),('OPERACIONES'))r(role) cross join public.app_permissions p where p.code in('support.dashboard.view','ticket.view','ticket.create','ticket.edit','ticket.assign','ticket.change_priority','ticket.change_status','ticket.resolve','ticket.reply','ticket.internal_note','sla.view','queue.view','support_macro.view','knowledge.view','internal_request.view') on conflict do nothing;
insert into public.role_permissions(role,permission_code) select r.role,p.code from(values('PROGRAMADOR'),('DESARROLLO'),('QA'),('FINANZAS'),('RRHH'),('JEFE_VENTAS'),('EJECUTIVA_VENTAS'),('COMERCIAL'))r(role) cross join public.app_permissions p where p.code in('support.dashboard.view','ticket.view','ticket.create','ticket.reply','sla.view','knowledge.view','internal_request.view') on conflict do nothing;
insert into public.role_permissions(role,permission_code) values('PORTAL_CLIENT','ticket.view'),('PORTAL_CLIENT','ticket.create'),('PORTAL_CLIENT','ticket.reply'),('PORTAL_CLIENT','ticket.reopen'),('PORTAL_CLIENT','knowledge.view') on conflict do nothing;

insert into public.support_ticket_types(code,name,sort_order) values('INCIDENT','Incidente',10),('SERVICE_REQUEST','Solicitud de servicio',20),('TECHNICAL_SUPPORT','Soporte técnico',30),('BUG_REPORT','Reporte de error',40),('FEATURE_REQUEST','Solicitud de funcionalidad',50),('CHANGE_REQUEST','Solicitud de cambio',60),('ACCESS_REQUEST','Solicitud de acceso',70),('BILLING_QUERY','Consulta de facturación',80),('DOCUMENT_REQUEST','Solicitud documental',90),('CONSULTATION','Consulta',100),('COMPLAINT','Reclamo',110),('OTHER','Otro',120) on conflict(code) do nothing;
insert into public.support_categories(id,code,name,sort_order) values('b0000000-0000-4000-8000-000000000001','WEB','Web',10),('b0000000-0000-4000-8000-000000000002','SOFTWARE','Software',20),('b0000000-0000-4000-8000-000000000003','HOSTING','Hosting',30),('b0000000-0000-4000-8000-000000000004','EMAIL','Correo',40),('b0000000-0000-4000-8000-000000000005','DOMAIN','Dominio',50),('b0000000-0000-4000-8000-000000000006','BILLING','Facturación',60),('b0000000-0000-4000-8000-000000000007','ACCESS','Accesos',70),('b0000000-0000-4000-8000-000000000008','ADVICE','Asesoría',80) on conflict(code) do nothing;
insert into public.support_queues(id,code,name,privacy_scope,assignment_strategy) values('b1000000-0000-4000-8000-000000000001','GENERAL','Soporte General','NORMAL','MANUAL'),('b1000000-0000-4000-8000-000000000002','DEVELOPMENT','Desarrollo','NORMAL','LEAST_LOADED'),('b1000000-0000-4000-8000-000000000003','BILLING','Facturación','CONFIDENTIAL','MANUAL'),('b1000000-0000-4000-8000-000000000004','INFRA','Infraestructura','NORMAL','MANUAL'),('b1000000-0000-4000-8000-000000000005','HR','RR.HH. Interno','RESTRICTED','MANUAL'),('b1000000-0000-4000-8000-000000000006','IT','TI Interno','CONFIDENTIAL','MANUAL') on conflict(code) do nothing;
insert into public.business_calendars(id,name,timezone,mode,working_days,working_hours) values('b2000000-0000-4000-8000-000000000001','Horario Zyteron','America/Santiago','BUSINESS_HOURS','{1,2,3,4,5}','{"start":"09:00","end":"18:00"}') on conflict(id) do nothing;
insert into public.sla_policies(id,code,name,scope_type,scope_id,calendar_id,pause_statuses) values('b3000000-0000-4000-8000-000000000001','GLOBAL-BH','SLA Global Horario Hábil','GLOBAL',null,'b2000000-0000-4000-8000-000000000001','{WAITING_CLIENT}') on conflict(code) do nothing;
insert into public.sla_targets(policy_id,priority,first_response_minutes,resolution_minutes,warning_percent,escalation_percent) values('b3000000-0000-4000-8000-000000000001','LOW',480,2880,80,90),('b3000000-0000-4000-8000-000000000001','NORMAL',240,1440,80,90),('b3000000-0000-4000-8000-000000000001','HIGH',60,480,80,90),('b3000000-0000-4000-8000-000000000001','URGENT',15,120,70,85) on conflict(policy_id,priority) do nothing;
insert into public.support_routing_rules(name,ticket_type,queue_id,priority,position) values('Consultas de facturación','BILLING_QUERY','b1000000-0000-4000-8000-000000000003','NORMAL',10),('Bugs a Desarrollo','BUG_REPORT','b1000000-0000-4000-8000-000000000002','HIGH',20) on conflict do nothing;
insert into public.support_macros(name,body,tags) select 'Solicitud recibida','Hola {{contact.name}}, recibimos {{ticket.number}} y estamos revisando tu solicitud.','{}' where not exists(select 1 from public.support_macros where name='Solicitud recibida');
insert into public.knowledge_categories(id,name,slug,visibility) values('b4000000-0000-4000-8000-000000000001','Uso de soporte','uso-soporte','CLIENT') on conflict(slug) do nothing;
insert into public.knowledge_articles(id,category_id,title,slug,summary,status,visibility,current_version,published_at) values('b5000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','Cómo enviar evidencia segura','evidencia-segura','Guía para adjuntar información útil sin credenciales ni secretos.','PUBLISHED','CLIENT',1,now()) on conflict(slug) do nothing;
insert into public.knowledge_versions(article_id,version,content,change_summary) values('b5000000-0000-4000-8000-000000000001',1,'Describe el resultado esperado, adjunta capturas sin credenciales y nunca compartas contraseñas, tokens o cookies.','Versión inicial') on conflict(article_id,version) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('support-attachments','support-attachments',false,20971520,array['image/png','image/jpeg','application/pdf','text/plain','video/mp4','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists support_attachment_storage_read on storage.objects;create policy support_attachment_storage_read on storage.objects for select to authenticated using(bucket_id='support-attachments' and exists(select 1 from public.ticket_attachments a where a.storage_path=name and private.support_can_read(a.ticket_id) and (private.zyteron_role()<>'PORTAL_CLIENT' or a.visibility='CLIENT_VISIBLE')));
drop policy if exists support_attachment_storage_write on storage.objects;create policy support_attachment_storage_write on storage.objects for insert to authenticated with check(bucket_id='support-attachments' and private.zyteron_role()<>'PORTAL_CLIENT');
do $$declare t text;begin foreach t in array array['support_tickets','ticket_messages','ticket_status_history','ticket_assignments','ticket_relations','ticket_attachments','sla_events','support_events','csat_responses'] loop if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t)then execute format('alter publication supabase_realtime add table public.%I',t);end if;end loop;end$$;


-- Original module migration: 20261001100000_people_operations_center.sql
create extension if not exists pgcrypto;
create schema if not exists private;
create sequence if not exists public.employee_number_seq;
create sequence if not exists public.employment_contract_number_seq;
create or replace function public.next_employee_number()returns text language sql volatile set search_path=public as $$select 'EMP-'||lpad(nextval('public.employee_number_seq')::text,6,'0')$$;
create or replace function public.next_employment_contract_number()returns text language sql volatile set search_path=public as $$select 'CTR-LAB-'||extract(year from now())::integer||'-'||lpad(nextval('public.employment_contract_number_seq')::text,6,'0')$$;

create table if not exists public.employees(id uuid primary key default gen_random_uuid(),user_id uuid unique,employee_number text not null unique default public.next_employee_number(),rut text not null unique,first_name text not null,middle_name text,last_name text not null,second_last_name text,preferred_name text,personal_email text,corporate_email text,phone text,birth_date date,nationality text,address text,region text,commune text,emergency_contact jsonb not null default '{}',status text not null default 'PRE_HIRE' check(status in('PRE_HIRE','ONBOARDING','ACTIVE','LEAVE','SUSPENDED','OFFBOARDING','TERMINATED','ARCHIVED')),hire_date date,termination_date date,privacy_level text not null default 'HR_CONFIDENTIAL',archived_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(termination_date is null or hire_date is null or termination_date>=hire_date));
create table if not exists public.departments(id uuid primary key default gen_random_uuid(),name text not null,code text not null unique,manager_id uuid references public.employees(id) on delete restrict,parent_department_id uuid references public.departments(id) on delete restrict,cost_center_id uuid,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.teams(id uuid primary key default gen_random_uuid(),department_id uuid not null references public.departments(id) on delete restrict,name text not null,team_lead_id uuid references public.employees(id) on delete restrict,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(department_id,name));
create table if not exists public.job_positions(id uuid primary key default gen_random_uuid(),name text not null,code text not null unique,department_id uuid references public.departments(id) on delete restrict,description text,level text,reports_to_position_id uuid references public.job_positions(id) on delete restrict,default_permissions_profile text,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.team_members(id uuid primary key default gen_random_uuid(),team_id uuid not null references public.teams(id) on delete restrict,employee_id uuid not null references public.employees(id) on delete restrict,membership_type text not null default 'ADDITIONAL',started_at date not null default current_date,ended_at date,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(team_id,employee_id,started_at));
create table if not exists public.employment_relationships(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,company_entity_id uuid,employment_type text not null check(employment_type in('INDEFINITE','FIXED_TERM','PART_TIME','INTERNSHIP','OTHER_LEGAL_RELATIONSHIP')),start_date date not null,end_date date,status text not null default 'PLANNED' check(status in('PLANNED','ACTIVE','SUSPENDED','ENDED')),job_position_id uuid references public.job_positions(id) on delete restrict,department_id uuid references public.departments(id) on delete restrict,team_id uuid references public.teams(id) on delete restrict,manager_id uuid references public.employees(id) on delete restrict,work_location text,cost_center_id uuid,weekly_hours numeric(6,2) check(weekly_hours is null or weekly_hours>0),schedule_type text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(end_date is null or end_date>=start_date));
create unique index if not exists employment_relationship_active_unique on public.employment_relationships(employee_id)where status='ACTIVE';
create index if not exists employees_status_idx on public.employees(status);create index if not exists employees_rut_idx on public.employees(rut);create index if not exists employment_relationship_org_idx on public.employment_relationships(department_id,team_id,manager_id,status);
create table if not exists public.employee_position_history(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,value_id uuid not null,effective_from date not null,effective_to date,source text not null,source_id uuid,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.employee_department_history(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,value_id uuid not null,effective_from date not null,effective_to date,source text not null,source_id uuid,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.employee_manager_history(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,value_id uuid not null,effective_from date not null,effective_to date,source text not null,source_id uuid,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());

create table if not exists public.employment_contracts(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,employment_relationship_id uuid not null references public.employment_relationships(id) on delete restrict,contract_number text not null unique default public.next_employment_contract_number(),contract_type text not null,status text not null default 'DRAFT' check(status in('DRAFT','IN_REVIEW','READY_FOR_SIGNATURE','SIGNATURE_REQUESTED','PARTIALLY_SIGNED','SIGNED','PENDING_DT_REGISTRATION','REGISTERED','ACTIVE','EXPIRED','TERMINATED','SUPERSEDED','CANCELLED')),start_date date not null,end_date date,position_id uuid references public.job_positions(id) on delete restrict,department_id uuid references public.departments(id) on delete restrict,work_location text,weekly_hours numeric(6,2),schedule_definition jsonb not null default '{}',base_salary numeric(18,2) check(base_salary is null or base_salary>=0),currency char(3) not null default 'CLP',payment_frequency text not null default 'MONTHLY',document_id uuid references public.documents(id) on delete restrict,signature_status text not null default 'NOT_REQUESTED',signature_provider text,signed_at timestamptz,dt_registration_status text not null default 'NOT_READY',dt_registration_reference text,dt_registered_at timestamptz,dt_receipt_document_id uuid references public.documents(id) on delete restrict,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(end_date is null or end_date>=start_date));
create index if not exists employment_contract_status_idx on public.employment_contracts(status,end_date);create index if not exists employment_contract_employee_idx on public.employment_contracts(employee_id,start_date desc);
create table if not exists public.employment_annexes(id uuid primary key default gen_random_uuid(),employment_contract_id uuid not null references public.employment_contracts(id) on delete restrict,employee_id uuid not null references public.employees(id) on delete restrict,document_id uuid references public.documents(id) on delete restrict,annex_type text not null check(annex_type in('SALARY_CHANGE','POSITION_CHANGE','SCHEDULE_CHANGE','REMOTE_WORK','BENEFIT_CHANGE','LOCATION_CHANGE','OTHER')),effective_date date not null,status text not null default 'DRAFT' check(status in('DRAFT','IN_REVIEW','READY_FOR_SIGNATURE','SIGNATURE_REQUESTED','SIGNED','ACTIVE','SUPERSEDED','CANCELLED')),payload jsonb not null default '{}',signature_request_id uuid references public.signature_requests(id) on delete restrict,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());

create table if not exists public.onboarding_templates(id uuid primary key default gen_random_uuid(),name text not null,position_id uuid references public.job_positions(id) on delete restrict,department_id uuid references public.departments(id) on delete restrict,tasks jsonb not null default '[]',active boolean not null default true,version integer not null default 1,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.onboarding_instances(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,template_id uuid references public.onboarding_templates(id) on delete restrict,status text not null default 'NOT_STARTED' check(status in('NOT_STARTED','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED')),target_date date,progress numeric(5,2) not null default 0 check(progress between 0 and 100),started_at timestamptz,completed_at timestamptz,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.onboarding_tasks(id uuid primary key default gen_random_uuid(),onboarding_id uuid not null references public.onboarding_instances(id) on delete restrict,title text not null,owner_type text not null check(owner_type in('HR','SECURITY','MANAGER','IT','EMPLOYEE','FINANCE')),owner_id uuid,status text not null default 'PENDING' check(status in('PENDING','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED')),due_date date,critical boolean not null default true,position integer not null,completed_at timestamptz,completed_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.offboarding_instances(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,effective_date date not null,reason_category text not null,status text not null default 'INITIATED' check(status in('INITIATED','APPROVED','IN_PROGRESS','BLOCKED','READY_TO_FINALIZE','COMPLETED','CANCELLED')),critical_blockers integer not null default 0,started_at timestamptz not null default now(),completed_at timestamptz,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.offboarding_tasks(id uuid primary key default gen_random_uuid(),offboarding_id uuid not null references public.offboarding_instances(id) on delete restrict,title text not null,owner_type text not null,owner_id uuid,status text not null default 'PENDING' check(status in('PENDING','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED')),critical boolean not null default true,position integer not null,notes text,evidence_document_id uuid references public.documents(id) on delete restrict,completed_at timestamptz,completed_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());

create table if not exists public.leave_policies(id uuid primary key default gen_random_uuid(),code text not null,version integer not null,effective_from date not null,effective_to date,rules jsonb not null,source_reference text,status text not null default 'DRAFT' check(status in('DRAFT','PUBLISHED','RETIRED')),created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(code,version));
create table if not exists public.leave_requests(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,leave_type text not null check(leave_type in('VACATION','ADMINISTRATIVE_LEAVE','UNPAID_LEAVE','MEDICAL_LEAVE','OTHER')),start_date date not null,end_date date not null,requested_units numeric(8,2) not null check(requested_units>0),unit text not null default 'DAYS' check(unit in('DAYS','HOURS','HALF_DAY')),status text not null default 'DRAFT' check(status in('DRAFT','PENDING_MANAGER','PENDING_HR','APPROVED','REJECTED','CANCELLED')),approver_id uuid,submitted_at timestamptz,approved_at timestamptz,reason_category text,decision_reason text,document_id uuid references public.documents(id) on delete restrict,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(end_date>=start_date));
create index if not exists leave_requests_dates_idx on public.leave_requests(employee_id,start_date,end_date,status);
create table if not exists public.leave_balances(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,policy_id uuid references public.leave_policies(id) on delete restrict,period text not null,accrued numeric(10,2) not null default 0,used numeric(10,2) not null default 0,adjusted numeric(10,2) not null default 0,available numeric(10,2) not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(employee_id,period));
create table if not exists public.leave_ledger(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,leave_request_id uuid references public.leave_requests(id) on delete restrict,entry_type text not null check(entry_type in('ACCRUAL','USED','ADJUSTMENT','CARRYOVER','EXPIRATION')),units numeric(10,2) not null,entry_date date not null,reason text not null,actor_id uuid,balance_after numeric(10,2),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.medical_leave_records(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,start_date date not null,end_date date not null,days integer not null check(days>0),status text not null check(status in('RECEIVED','REVIEW','ACCEPTED','REJECTED','CLOSED')),issuer_reference text,document_id uuid references public.documents(id) on delete restrict,received_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(end_date>=start_date));

create table if not exists public.work_schedules(id uuid primary key default gen_random_uuid(),name text not null,weekly_hours numeric(6,2) not null,timezone text not null default 'America/Santiago',schedule_type text not null,rules jsonb not null default '{}',active boolean not null default true,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.employee_schedules(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,schedule_id uuid not null references public.work_schedules(id) on delete restrict,effective_from date not null,effective_to date,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.shift_assignments(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,work_date date not null,start_time time not null,end_time time not null,cross_midnight boolean not null default false,schedule_id uuid references public.work_schedules(id) on delete restrict,status text not null default 'PLANNED',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(employee_id,work_date));

create table if not exists public.employee_compensation_history(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,effective_from date not null,effective_to date,base_salary numeric(18,2) not null check(base_salary>=0),currency char(3) not null,pay_frequency text not null,contract_reference uuid references public.employment_contracts(id) on delete restrict,annex_id uuid references public.employment_annexes(id) on delete restrict,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.earning_concepts(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,classification jsonb not null default '{}',active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.deduction_concepts(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,classification jsonb not null default '{}',active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.employer_contribution_concepts(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,classification jsonb not null default '{}',active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.payroll_rules(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.payroll_rule_versions(id uuid primary key default gen_random_uuid(),payroll_rule_id uuid references public.payroll_rules(id) on delete restrict,version integer not null,effective_from date not null,effective_to date,parameters jsonb not null,source_reference text not null,status text not null default 'DRAFT' check(status in('DRAFT','PUBLISHED','RETIRED')),created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(payroll_rule_id,version));
create table if not exists public.payroll_periods(id uuid primary key default gen_random_uuid(),period text not null unique check(period~'^\d{4}-(0[1-9]|1[0-2])$'),status text not null default 'OPEN' check(status in('OPEN','CALCULATING','REVIEW','APPROVED','PAID','REPORTED','CLOSED')),payment_date date,rule_version_id uuid references public.payroll_rule_versions(id) on delete restrict,totals jsonb not null default '{}',approved_by uuid,approved_at timestamptz,finance_reference text,paid_at timestamptz,created_by uuid,created_at timestamptz not null default now(),closed_at timestamptz,updated_at timestamptz not null default now());
create table if not exists public.payroll_employee_results(id uuid primary key default gen_random_uuid(),payroll_period_id uuid not null references public.payroll_periods(id) on delete restrict,employee_id uuid not null references public.employees(id) on delete restrict,gross_total numeric(18,2) not null,deduction_total numeric(18,2) not null,employer_contribution_total numeric(18,2) not null,taxable_total numeric(18,2) not null,net_total numeric(18,2) not null,employer_cost numeric(18,2) not null,currency char(3) not null,calculation_snapshot jsonb not null,status text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(payroll_period_id,employee_id));
create table if not exists public.payroll_lines(id uuid primary key default gen_random_uuid(),payroll_result_id uuid not null references public.payroll_employee_results(id) on delete restrict,concept_type text not null check(concept_type in('EARNING','DEDUCTION','EMPLOYER_CONTRIBUTION')),concept_id uuid,code text not null,description text not null,amount numeric(18,2) not null,calculation_basis jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.pay_slips(id uuid primary key default gen_random_uuid(),payroll_period_id uuid not null references public.payroll_periods(id) on delete restrict,employee_id uuid not null references public.employees(id) on delete restrict,payroll_result_id uuid not null references public.payroll_employee_results(id) on delete restrict,document_id uuid not null references public.documents(id) on delete restrict,sha256 text not null,status text not null default 'ISSUED',issued_at timestamptz not null,acknowledged_at timestamptz,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(payroll_period_id,employee_id));

create table if not exists public.lre_schema_versions(id uuid primary key default gen_random_uuid(),code text not null,version integer not null,effective_from date not null,effective_to date,delimiter text not null default ';',column_definitions jsonb not null,source_reference text not null,status text not null default 'DRAFT' check(status in('DRAFT','PUBLISHED','RETIRED')),created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(code,version));
create table if not exists public.lre_exports(id uuid primary key default gen_random_uuid(),payroll_period_id uuid not null unique references public.payroll_periods(id) on delete restrict,schema_version_id uuid not null references public.lre_schema_versions(id) on delete restrict,status text not null check(status in('NOT_READY','READY','VALIDATION_ERROR','READY_TO_SUBMIT','SUBMITTED_EXTERNALLY','VALIDATING','DECLARED','RECTIFICATION_REQUIRED','RECTIFIED')),document_id uuid references public.documents(id) on delete restrict,receipt_document_id uuid references public.documents(id) on delete restrict,sha256 text,validation_errors text[] not null default '{}',external_reference text,generated_at timestamptz,submitted_at timestamptz,declared_at timestamptz,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.compliance_rules(id uuid primary key default gen_random_uuid(),rule_type text not null,version integer not null,effective_from date not null,effective_to date,parameters jsonb not null,source_reference text not null,active boolean not null default false,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(rule_type,version));
create table if not exists public.labor_compliance_tasks(id uuid primary key default gen_random_uuid(),employee_id uuid references public.employees(id) on delete restrict,contract_id uuid references public.employment_contracts(id) on delete restrict,task_type text not null,due_date date,status text not null,responsible_id uuid,evidence_document_id uuid references public.documents(id) on delete restrict,source_reference text,compliance_rule_id uuid references public.compliance_rules(id) on delete restrict,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());

create table if not exists public.company_assets(id uuid primary key default gen_random_uuid(),asset_code text not null unique,name text not null,asset_type text not null,serial_number text,status text not null default 'AVAILABLE',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.asset_assignments(id uuid primary key default gen_random_uuid(),asset_id uuid not null references public.company_assets(id) on delete restrict,employee_id uuid not null references public.employees(id) on delete restrict,assigned_at timestamptz not null,condition_out text,evidence_document_id uuid references public.documents(id) on delete restrict,returned_at timestamptz,condition_return text,return_evidence_document_id uuid references public.documents(id) on delete restrict,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index if not exists asset_assignment_open_unique on public.asset_assignments(asset_id)where returned_at is null;
create table if not exists public.performance_cycles(id uuid primary key default gen_random_uuid(),name text not null,start_date date not null,end_date date not null,status text not null,configuration jsonb not null default '{}',created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.performance_reviews(id uuid primary key default gen_random_uuid(),cycle_id uuid not null references public.performance_cycles(id) on delete restrict,employee_id uuid not null references public.employees(id) on delete restrict,reviewer_id uuid,review_type text not null check(review_type in('MANAGER','SELF','PEER_360','PROBATION')),status text not null,answers jsonb not null default '{}',submitted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.employee_goals(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.employees(id) on delete restrict,title text not null,description text,period text not null,owner_id uuid,status text not null check(status in('DRAFT','ACTIVE','AT_RISK','COMPLETED','CANCELLED')),progress numeric(5,2) not null default 0 check(progress between 0 and 100),evidence jsonb not null default '{}',created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.competencies(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,description text,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.training_courses(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,description text,required_for_role text,validity_days integer,active boolean not null default true,created_by uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.training_assignments(id uuid primary key default gen_random_uuid(),course_id uuid not null references public.training_courses(id) on delete restrict,employee_id uuid not null references public.employees(id) on delete restrict,status text not null check(status in('ASSIGNED','IN_PROGRESS','COMPLETED','EXPIRED')),assigned_at timestamptz not null,due_date date,completed_at timestamptz,certificate_document_id uuid references public.documents(id) on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.training_records(id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.training_assignments(id) on delete restrict,event_type text not null,payload jsonb not null default '{}',occurred_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.hr_events(id uuid primary key default gen_random_uuid(),employee_id uuid references public.employees(id) on delete restrict,aggregate_type text not null,aggregate_id uuid not null,event_type text not null,actor_id uuid,payload jsonb not null default '{}',occurred_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now());

create or replace function public.prevent_closed_payroll_mutation()returns trigger language plpgsql as $$begin if old.status='CLOSED'and row(new.period,new.rule_version_id,new.totals)is distinct from row(old.period,old.rule_version_id,old.totals)then raise exception 'Un período cerrado es inmutable';end if;return new;end$$;
drop trigger if exists payroll_period_closed_immutable on public.payroll_periods;create trigger payroll_period_closed_immutable before update on public.payroll_periods for each row execute function public.prevent_closed_payroll_mutation();
create or replace function public.hr_event_to_outbox()returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.business_event_outbox(aggregate_type,aggregate_id,event_type,payload)values(new.aggregate_type,new.aggregate_id,new.event_type,jsonb_build_object('employeeId',new.employee_id,'hrEventId',new.id)||new.payload);return new;end$$;
drop trigger if exists hr_events_outbox on public.hr_events;create trigger hr_events_outbox after insert on public.hr_events for each row execute function public.hr_event_to_outbox();

create or replace function private.hr_employee_id()returns uuid language sql stable security definer set search_path=public as $$select id from public.employees where user_id=auth.uid()limit 1$$;
create or replace function private.hr_is_hr()returns boolean language sql stable as $$select private.zyteron_role()='RRHH'$$;
create or replace function private.hr_can_view_employee(target uuid)returns boolean language sql stable security definer set search_path=public as $$select private.hr_is_hr()or(private.zyteron_role()='GERENTE_GENERAL')or target=private.hr_employee_id()or exists(select 1 from public.employment_relationships r where r.employee_id=target and r.status='ACTIVE'and r.manager_id=private.hr_employee_id())$$;
create or replace function private.hr_can_manage()returns boolean language sql stable as $$select private.hr_is_hr()$$;

do $$declare t text;begin foreach t in array array['employees','departments','teams','job_positions','team_members','employment_relationships','employee_position_history','employee_department_history','employee_manager_history','employment_contracts','employment_annexes','onboarding_templates','onboarding_instances','onboarding_tasks','offboarding_instances','offboarding_tasks','leave_policies','leave_requests','leave_balances','leave_ledger','medical_leave_records','work_schedules','employee_schedules','shift_assignments','employee_compensation_history','earning_concepts','deduction_concepts','employer_contribution_concepts','payroll_rules','payroll_rule_versions','payroll_periods','payroll_employee_results','payroll_lines','pay_slips','lre_schema_versions','lre_exports','compliance_rules','labor_compliance_tasks','company_assets','asset_assignments','performance_cycles','performance_reviews','employee_goals','competencies','training_courses','training_assignments','training_records','hr_events']loop execute format('alter table public.%I enable row level security',t);end loop;end$$;
drop policy if exists employees_read on public.employees;create policy employees_read on public.employees for select to authenticated using(private.hr_is_hr()or id=private.hr_employee_id());drop policy if exists employees_manage on public.employees;create policy employees_manage on public.employees for all to authenticated using(private.hr_can_manage())with check(private.hr_can_manage());
do $$declare t text;begin foreach t in array array['employment_relationships','employee_position_history','employee_department_history','employee_manager_history','employment_contracts','employment_annexes','onboarding_instances','offboarding_instances','leave_requests','leave_balances','leave_ledger','employee_schedules','shift_assignments','asset_assignments','performance_reviews','employee_goals','training_assignments']loop execute format('drop policy if exists %I on public.%I',t||'_read',t);execute format('create policy %I on public.%I for select to authenticated using(private.hr_can_view_employee(employee_id))',t||'_read',t);execute format('drop policy if exists %I on public.%I',t||'_manage',t);execute format('create policy %I on public.%I for all to authenticated using(private.hr_can_manage())with check(private.hr_can_manage())',t||'_manage',t);end loop;end$$;
drop policy if exists employment_contracts_read on public.employment_contracts;create policy employment_contracts_read on public.employment_contracts for select to authenticated using(private.hr_is_hr()or employee_id=private.hr_employee_id());
drop policy if exists employment_annexes_read on public.employment_annexes;create policy employment_annexes_read on public.employment_annexes for select to authenticated using(private.hr_is_hr()or employee_id=private.hr_employee_id());
drop policy if exists compensation_read on public.employee_compensation_history;create policy compensation_read on public.employee_compensation_history for select to authenticated using(private.hr_is_hr()or employee_id=private.hr_employee_id());drop policy if exists compensation_manage on public.employee_compensation_history;create policy compensation_manage on public.employee_compensation_history for all to authenticated using(private.hr_is_hr())with check(private.hr_is_hr());
drop policy if exists medical_leave_read on public.medical_leave_records;create policy medical_leave_read on public.medical_leave_records for select to authenticated using(private.hr_is_hr()or employee_id=private.hr_employee_id());drop policy if exists medical_leave_manage on public.medical_leave_records;create policy medical_leave_manage on public.medical_leave_records for all to authenticated using(private.hr_is_hr())with check(private.hr_is_hr());
drop policy if exists payroll_period_read on public.payroll_periods;create policy payroll_period_read on public.payroll_periods for select to authenticated using(private.zyteron_role()in('RRHH','FINANZAS'));drop policy if exists payroll_period_manage on public.payroll_periods;create policy payroll_period_manage on public.payroll_periods for all to authenticated using(private.hr_is_hr())with check(private.hr_is_hr());
drop policy if exists payroll_result_read on public.payroll_employee_results;create policy payroll_result_read on public.payroll_employee_results for select to authenticated using(private.hr_is_hr()or employee_id=private.hr_employee_id());drop policy if exists payroll_result_manage on public.payroll_employee_results;create policy payroll_result_manage on public.payroll_employee_results for all to authenticated using(private.hr_is_hr())with check(private.hr_is_hr());
drop policy if exists pay_slip_read on public.pay_slips;create policy pay_slip_read on public.pay_slips for select to authenticated using(private.hr_is_hr()or employee_id=private.hr_employee_id());drop policy if exists pay_slip_manage on public.pay_slips;create policy pay_slip_manage on public.pay_slips for all to authenticated using(private.hr_is_hr())with check(private.hr_is_hr());
do $$declare t text;begin foreach t in array array['departments','teams','job_positions','onboarding_templates','leave_policies','work_schedules','earning_concepts','deduction_concepts','employer_contribution_concepts','payroll_rules','payroll_rule_versions','lre_schema_versions','compliance_rules','company_assets','performance_cycles','competencies','training_courses']loop execute format('drop policy if exists %I on public.%I',t||'_read',t);execute format('create policy %I on public.%I for select to authenticated using(private.zyteron_role() is not null)',t||'_read',t);execute format('drop policy if exists %I on public.%I',t||'_manage',t);execute format('create policy %I on public.%I for all to authenticated using(private.hr_can_manage())with check(private.hr_can_manage())',t||'_manage',t);end loop;end$$;
do $$declare t text;begin foreach t in array array['onboarding_tasks','offboarding_tasks','payroll_lines','training_records']loop execute format('drop policy if exists %I on public.%I',t||'_hr',t);execute format('create policy %I on public.%I for all to authenticated using(private.hr_is_hr())with check(private.hr_is_hr())',t||'_hr',t);end loop;end$$;
drop policy if exists lre_exports_scope on public.lre_exports;create policy lre_exports_scope on public.lre_exports for all to authenticated using(private.zyteron_role()in('RRHH','FINANZAS'))with check(private.hr_is_hr());drop policy if exists compliance_tasks_scope on public.labor_compliance_tasks;create policy compliance_tasks_scope on public.labor_compliance_tasks for all to authenticated using(private.hr_is_hr())with check(private.hr_is_hr());drop policy if exists hr_events_read on public.hr_events;create policy hr_events_read on public.hr_events for select to authenticated using(employee_id is null and private.hr_is_hr()or employee_id is not null and private.hr_can_view_employee(employee_id));drop policy if exists hr_events_write on public.hr_events;create policy hr_events_write on public.hr_events for insert to authenticated with check(private.hr_can_manage());

insert into public.app_permissions(code,description)values('hr.dashboard.view','Ver People Command Center'),('employee.view','Ver colaboradores'),('employee.create','Crear colaboradores'),('employee.edit','Editar colaboradores'),('employee.archive','Archivar colaboradores'),('employee.compensation.view','Ver remuneración'),('employee.compensation.manage','Gestionar remuneración'),('org.view','Ver organización'),('org.manage','Gestionar organización'),('contract.view','Ver contratos laborales'),('contract.create','Crear contratos laborales'),('contract.edit','Editar contratos laborales'),('contract.review','Revisar contratos laborales'),('contract.request_signature','Solicitar firma contractual'),('contract.register_external','Registrar evidencia REL externa'),('annex.view','Ver anexos'),('annex.create','Crear anexos'),('annex.request_signature','Solicitar firma de anexos'),('employee_documents.view','Ver expediente laboral'),('employee_documents.manage','Gestionar expediente laboral'),('onboarding.view','Ver onboarding'),('onboarding.manage','Gestionar onboarding'),('offboarding.view','Ver offboarding'),('offboarding.manage','Gestionar offboarding'),('leave.view','Ver ausencias'),('leave.request','Solicitar ausencia'),('leave.approve','Aprobar ausencia'),('leave.adjust_balance','Ajustar saldo'),('medical_leave.view','Ver licencias médicas'),('medical_leave.manage','Gestionar licencias médicas'),('attendance.view','Ver asistencia'),('attendance.manage','Gestionar asistencia'),('payroll.view','Ver payroll'),('payroll.calculate','Calcular payroll'),('payroll.review','Revisar payroll'),('payroll.approve','Aprobar payroll'),('payroll.close','Cerrar payroll'),('lre.view','Ver LRE'),('lre.generate','Generar LRE'),('lre.mark_submitted','Registrar presentación LRE'),('performance.view','Ver desempeño'),('performance.manage','Gestionar desempeño'),('training.view','Ver capacitación'),('training.manage','Gestionar capacitación'),('hr_reports.view','Ver informes RR.HH.'),('hr_reports.export','Exportar informes RR.HH.'),('hr_settings.manage','Configurar RR.HH.')on conflict(code)do update set description=excluded.description;
insert into public.role_permissions(role,permission_code)select'RRHH',code from public.app_permissions where code like'hr.%'or code like'employee.%'or code like'org.%'or code like'contract.%'or code like'annex.%'or code like'onboarding.%'or code like'offboarding.%'or code like'leave.%'or code like'medical_leave.%'or code like'attendance.%'or code like'payroll.%'or code like'lre.%'or code like'performance.%'or code like'training.%'on conflict do nothing;
insert into public.role_permissions(role,permission_code)select r.role,p.code from(values('GERENTE_GENERAL'),('JEFE_DESARROLLO'),('TECH_LEAD'),('OPERACIONES'),('JEFE_VENTAS'))r(role)cross join public.app_permissions p where p.code in('hr.dashboard.view','employee.view','org.view','onboarding.view','offboarding.view','leave.view','leave.approve','performance.view','training.view')on conflict do nothing;
insert into public.role_permissions(role,permission_code)select'FINANZAS',code from public.app_permissions where code in('payroll.view','lre.view')on conflict do nothing;

do $$declare t text;begin foreach t in array array['employees','employment_relationships','employment_contracts','employment_annexes','onboarding_instances','onboarding_tasks','offboarding_instances','offboarding_tasks','leave_requests','leave_balances','medical_leave_records','payroll_periods','payroll_employee_results','pay_slips','lre_exports','labor_compliance_tasks','asset_assignments','performance_reviews','employee_goals','training_assignments','hr_events']loop if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'and schemaname='public'and tablename=t)then execute format('alter publication supabase_realtime add table public.%I',t);end if;end loop;end$$;

-- All module data is served through authenticated server APIs.
alter table public.asset_assignments enable row level security;
revoke all on public.asset_assignments from anon,authenticated;
grant select,insert,update,delete on public.asset_assignments to service_role;
alter table public.audit_check_results enable row level security;
revoke all on public.audit_check_results from anon,authenticated;
grant select,insert,update,delete on public.audit_check_results to service_role;
alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon,authenticated;
grant select,insert,update,delete on public.audit_events to service_role;
alter table public.audit_evidence enable row level security;
revoke all on public.audit_evidence from anon,authenticated;
grant select,insert,update,delete on public.audit_evidence to service_role;
alter table public.audit_findings enable row level security;
revoke all on public.audit_findings from anon,authenticated;
grant select,insert,update,delete on public.audit_findings to service_role;
alter table public.audit_idempotency_keys enable row level security;
revoke all on public.audit_idempotency_keys from anon,authenticated;
grant select,insert,update,delete on public.audit_idempotency_keys to service_role;
alter table public.audit_notifications enable row level security;
revoke all on public.audit_notifications from anon,authenticated;
grant select,insert,update,delete on public.audit_notifications to service_role;
alter table public.audit_plans enable row level security;
revoke all on public.audit_plans from anon,authenticated;
grant select,insert,update,delete on public.audit_plans to service_role;
alter table public.audit_remediations enable row level security;
revoke all on public.audit_remediations from anon,authenticated;
grant select,insert,update,delete on public.audit_remediations to service_role;
alter table public.audit_reports enable row level security;
revoke all on public.audit_reports from anon,authenticated;
grant select,insert,update,delete on public.audit_reports to service_role;
alter table public.audit_retests enable row level security;
revoke all on public.audit_retests from anon,authenticated;
grant select,insert,update,delete on public.audit_retests to service_role;
alter table public.audit_runs enable row level security;
revoke all on public.audit_runs from anon,authenticated;
grant select,insert,update,delete on public.audit_runs to service_role;
alter table public.audit_template_checks enable row level security;
revoke all on public.audit_template_checks from anon,authenticated;
grant select,insert,update,delete on public.audit_template_checks to service_role;
alter table public.audit_template_sections enable row level security;
revoke all on public.audit_template_sections from anon,authenticated;
grant select,insert,update,delete on public.audit_template_sections to service_role;
alter table public.audit_template_versions enable row level security;
revoke all on public.audit_template_versions from anon,authenticated;
grant select,insert,update,delete on public.audit_template_versions to service_role;
alter table public.audit_templates enable row level security;
revoke all on public.audit_templates from anon,authenticated;
grant select,insert,update,delete on public.audit_templates to service_role;
alter table public.bug_history enable row level security;
revoke all on public.bug_history from anon,authenticated;
grant select,insert,update,delete on public.bug_history to service_role;
alter table public.bugs enable row level security;
revoke all on public.bugs from anon,authenticated;
grant select,insert,update,delete on public.bugs to service_role;
alter table public.build_runs enable row level security;
revoke all on public.build_runs from anon,authenticated;
grant select,insert,update,delete on public.build_runs to service_role;
alter table public.business_calendars enable row level security;
revoke all on public.business_calendars from anon,authenticated;
grant select,insert,update,delete on public.business_calendars to service_role;
alter table public.company_assets enable row level security;
revoke all on public.company_assets from anon,authenticated;
grant select,insert,update,delete on public.company_assets to service_role;
alter table public.competencies enable row level security;
revoke all on public.competencies from anon,authenticated;
grant select,insert,update,delete on public.competencies to service_role;
alter table public.compliance_rules enable row level security;
revoke all on public.compliance_rules from anon,authenticated;
grant select,insert,update,delete on public.compliance_rules to service_role;
alter table public.csat_responses enable row level security;
revoke all on public.csat_responses from anon,authenticated;
grant select,insert,update,delete on public.csat_responses to service_role;
alter table public.csat_surveys enable row level security;
revoke all on public.csat_surveys from anon,authenticated;
grant select,insert,update,delete on public.csat_surveys to service_role;
alter table public.deduction_concepts enable row level security;
revoke all on public.deduction_concepts from anon,authenticated;
grant select,insert,update,delete on public.deduction_concepts to service_role;
alter table public.departments enable row level security;
revoke all on public.departments from anon,authenticated;
grant select,insert,update,delete on public.departments to service_role;
alter table public.developer_skills enable row level security;
revoke all on public.developer_skills from anon,authenticated;
grant select,insert,update,delete on public.developer_skills to service_role;
alter table public.development_events enable row level security;
revoke all on public.development_events from anon,authenticated;
grant select,insert,update,delete on public.development_events to service_role;
alter table public.development_notifications enable row level security;
revoke all on public.development_notifications from anon,authenticated;
grant select,insert,update,delete on public.development_notifications to service_role;
alter table public.earning_concepts enable row level security;
revoke all on public.earning_concepts from anon,authenticated;
grant select,insert,update,delete on public.earning_concepts to service_role;
alter table public.employee_compensation_history enable row level security;
revoke all on public.employee_compensation_history from anon,authenticated;
grant select,insert,update,delete on public.employee_compensation_history to service_role;
alter table public.employee_department_history enable row level security;
revoke all on public.employee_department_history from anon,authenticated;
grant select,insert,update,delete on public.employee_department_history to service_role;
alter table public.employee_goals enable row level security;
revoke all on public.employee_goals from anon,authenticated;
grant select,insert,update,delete on public.employee_goals to service_role;
alter table public.employee_manager_history enable row level security;
revoke all on public.employee_manager_history from anon,authenticated;
grant select,insert,update,delete on public.employee_manager_history to service_role;
alter table public.employee_position_history enable row level security;
revoke all on public.employee_position_history from anon,authenticated;
grant select,insert,update,delete on public.employee_position_history to service_role;
alter table public.employee_schedules enable row level security;
revoke all on public.employee_schedules from anon,authenticated;
grant select,insert,update,delete on public.employee_schedules to service_role;
alter table public.employees enable row level security;
revoke all on public.employees from anon,authenticated;
grant select,insert,update,delete on public.employees to service_role;
alter table public.employer_contribution_concepts enable row level security;
revoke all on public.employer_contribution_concepts from anon,authenticated;
grant select,insert,update,delete on public.employer_contribution_concepts to service_role;
alter table public.employment_annexes enable row level security;
revoke all on public.employment_annexes from anon,authenticated;
grant select,insert,update,delete on public.employment_annexes to service_role;
alter table public.employment_contracts enable row level security;
revoke all on public.employment_contracts from anon,authenticated;
grant select,insert,update,delete on public.employment_contracts to service_role;
alter table public.employment_relationships enable row level security;
revoke all on public.employment_relationships from anon,authenticated;
grant select,insert,update,delete on public.employment_relationships to service_role;
alter table public.environment_variable_metadata enable row level security;
revoke all on public.environment_variable_metadata from anon,authenticated;
grant select,insert,update,delete on public.environment_variable_metadata to service_role;
alter table public.external_integration_events enable row level security;
revoke all on public.external_integration_events from anon,authenticated;
grant select,insert,update,delete on public.external_integration_events to service_role;
alter table public.hr_events enable row level security;
revoke all on public.hr_events from anon,authenticated;
grant select,insert,update,delete on public.hr_events to service_role;
alter table public.integration_connections enable row level security;
revoke all on public.integration_connections from anon,authenticated;
grant select,insert,update,delete on public.integration_connections to service_role;
alter table public.job_positions enable row level security;
revoke all on public.job_positions from anon,authenticated;
grant select,insert,update,delete on public.job_positions to service_role;
alter table public.knowledge_articles enable row level security;
revoke all on public.knowledge_articles from anon,authenticated;
grant select,insert,update,delete on public.knowledge_articles to service_role;
alter table public.knowledge_categories enable row level security;
revoke all on public.knowledge_categories from anon,authenticated;
grant select,insert,update,delete on public.knowledge_categories to service_role;
alter table public.knowledge_versions enable row level security;
revoke all on public.knowledge_versions from anon,authenticated;
grant select,insert,update,delete on public.knowledge_versions to service_role;
alter table public.labor_compliance_tasks enable row level security;
revoke all on public.labor_compliance_tasks from anon,authenticated;
grant select,insert,update,delete on public.labor_compliance_tasks to service_role;
alter table public.leave_balances enable row level security;
revoke all on public.leave_balances from anon,authenticated;
grant select,insert,update,delete on public.leave_balances to service_role;
alter table public.leave_ledger enable row level security;
revoke all on public.leave_ledger from anon,authenticated;
grant select,insert,update,delete on public.leave_ledger to service_role;
alter table public.leave_policies enable row level security;
revoke all on public.leave_policies from anon,authenticated;
grant select,insert,update,delete on public.leave_policies to service_role;
alter table public.leave_requests enable row level security;
revoke all on public.leave_requests from anon,authenticated;
grant select,insert,update,delete on public.leave_requests to service_role;
alter table public.lre_exports enable row level security;
revoke all on public.lre_exports from anon,authenticated;
grant select,insert,update,delete on public.lre_exports to service_role;
alter table public.lre_schema_versions enable row level security;
revoke all on public.lre_schema_versions from anon,authenticated;
grant select,insert,update,delete on public.lre_schema_versions to service_role;
alter table public.medical_leave_records enable row level security;
revoke all on public.medical_leave_records from anon,authenticated;
grant select,insert,update,delete on public.medical_leave_records to service_role;
alter table public.offboarding_instances enable row level security;
revoke all on public.offboarding_instances from anon,authenticated;
grant select,insert,update,delete on public.offboarding_instances to service_role;
alter table public.offboarding_tasks enable row level security;
revoke all on public.offboarding_tasks from anon,authenticated;
grant select,insert,update,delete on public.offboarding_tasks to service_role;
alter table public.onboarding_instances enable row level security;
revoke all on public.onboarding_instances from anon,authenticated;
grant select,insert,update,delete on public.onboarding_instances to service_role;
alter table public.onboarding_tasks enable row level security;
revoke all on public.onboarding_tasks from anon,authenticated;
grant select,insert,update,delete on public.onboarding_tasks to service_role;
alter table public.onboarding_templates enable row level security;
revoke all on public.onboarding_templates from anon,authenticated;
grant select,insert,update,delete on public.onboarding_templates to service_role;
alter table public.pay_slips enable row level security;
revoke all on public.pay_slips from anon,authenticated;
grant select,insert,update,delete on public.pay_slips to service_role;
alter table public.payroll_employee_results enable row level security;
revoke all on public.payroll_employee_results from anon,authenticated;
grant select,insert,update,delete on public.payroll_employee_results to service_role;
alter table public.payroll_lines enable row level security;
revoke all on public.payroll_lines from anon,authenticated;
grant select,insert,update,delete on public.payroll_lines to service_role;
alter table public.payroll_periods enable row level security;
revoke all on public.payroll_periods from anon,authenticated;
grant select,insert,update,delete on public.payroll_periods to service_role;
alter table public.payroll_rule_versions enable row level security;
revoke all on public.payroll_rule_versions from anon,authenticated;
grant select,insert,update,delete on public.payroll_rule_versions to service_role;
alter table public.payroll_rules enable row level security;
revoke all on public.payroll_rules from anon,authenticated;
grant select,insert,update,delete on public.payroll_rules to service_role;
alter table public.performance_cycles enable row level security;
revoke all on public.performance_cycles from anon,authenticated;
grant select,insert,update,delete on public.performance_cycles to service_role;
alter table public.performance_reviews enable row level security;
revoke all on public.performance_reviews from anon,authenticated;
grant select,insert,update,delete on public.performance_reviews to service_role;
alter table public.project_development_settings enable row level security;
revoke all on public.project_development_settings from anon,authenticated;
grant select,insert,update,delete on public.project_development_settings to service_role;
alter table public.project_environments enable row level security;
revoke all on public.project_environments from anon,authenticated;
grant select,insert,update,delete on public.project_environments to service_role;
alter table public.project_external_services enable row level security;
revoke all on public.project_external_services from anon,authenticated;
grant select,insert,update,delete on public.project_external_services to service_role;
alter table public.project_repositories enable row level security;
revoke all on public.project_repositories from anon,authenticated;
grant select,insert,update,delete on public.project_repositories to service_role;
alter table public.project_technologies enable row level security;
revoke all on public.project_technologies from anon,authenticated;
grant select,insert,update,delete on public.project_technologies to service_role;
alter table public.pull_request_reviews enable row level security;
revoke all on public.pull_request_reviews from anon,authenticated;
grant select,insert,update,delete on public.pull_request_reviews to service_role;
alter table public.pull_requests enable row level security;
revoke all on public.pull_requests from anon,authenticated;
grant select,insert,update,delete on public.pull_requests to service_role;
alter table public.qa_runs enable row level security;
revoke all on public.qa_runs from anon,authenticated;
grant select,insert,update,delete on public.qa_runs to service_role;
alter table public.qa_test_cases enable row level security;
revoke all on public.qa_test_cases from anon,authenticated;
grant select,insert,update,delete on public.qa_test_cases to service_role;
alter table public.qa_test_results enable row level security;
revoke all on public.qa_test_results from anon,authenticated;
grant select,insert,update,delete on public.qa_test_results to service_role;
alter table public.releases enable row level security;
revoke all on public.releases from anon,authenticated;
grant select,insert,update,delete on public.releases to service_role;
alter table public.shift_assignments enable row level security;
revoke all on public.shift_assignments from anon,authenticated;
grant select,insert,update,delete on public.shift_assignments to service_role;
alter table public.sla_events enable row level security;
revoke all on public.sla_events from anon,authenticated;
grant select,insert,update,delete on public.sla_events to service_role;
alter table public.sla_policies enable row level security;
revoke all on public.sla_policies from anon,authenticated;
grant select,insert,update,delete on public.sla_policies to service_role;
alter table public.sla_targets enable row level security;
revoke all on public.sla_targets from anon,authenticated;
grant select,insert,update,delete on public.sla_targets to service_role;
alter table public.support_categories enable row level security;
revoke all on public.support_categories from anon,authenticated;
grant select,insert,update,delete on public.support_categories to service_role;
alter table public.support_channel_connections enable row level security;
revoke all on public.support_channel_connections from anon,authenticated;
grant select,insert,update,delete on public.support_channel_connections to service_role;
alter table public.support_email_threads enable row level security;
revoke all on public.support_email_threads from anon,authenticated;
grant select,insert,update,delete on public.support_email_threads to service_role;
alter table public.support_events enable row level security;
revoke all on public.support_events from anon,authenticated;
grant select,insert,update,delete on public.support_events to service_role;
alter table public.support_macros enable row level security;
revoke all on public.support_macros from anon,authenticated;
grant select,insert,update,delete on public.support_macros to service_role;
alter table public.support_queue_members enable row level security;
revoke all on public.support_queue_members from anon,authenticated;
grant select,insert,update,delete on public.support_queue_members to service_role;
alter table public.support_queues enable row level security;
revoke all on public.support_queues from anon,authenticated;
grant select,insert,update,delete on public.support_queues to service_role;
alter table public.support_routing_rules enable row level security;
revoke all on public.support_routing_rules from anon,authenticated;
grant select,insert,update,delete on public.support_routing_rules to service_role;
alter table public.support_saved_views enable row level security;
revoke all on public.support_saved_views from anon,authenticated;
grant select,insert,update,delete on public.support_saved_views to service_role;
alter table public.support_subcategories enable row level security;
revoke all on public.support_subcategories from anon,authenticated;
grant select,insert,update,delete on public.support_subcategories to service_role;
alter table public.support_tags enable row level security;
revoke all on public.support_tags from anon,authenticated;
grant select,insert,update,delete on public.support_tags to service_role;
alter table public.support_ticket_types enable row level security;
revoke all on public.support_ticket_types from anon,authenticated;
grant select,insert,update,delete on public.support_ticket_types to service_role;
alter table public.support_tickets enable row level security;
revoke all on public.support_tickets from anon,authenticated;
grant select,insert,update,delete on public.support_tickets to service_role;
alter table public.team_members enable row level security;
revoke all on public.team_members from anon,authenticated;
grant select,insert,update,delete on public.team_members to service_role;
alter table public.teams enable row level security;
revoke all on public.teams from anon,authenticated;
grant select,insert,update,delete on public.teams to service_role;
alter table public.technical_debt_items enable row level security;
revoke all on public.technical_debt_items from anon,authenticated;
grant select,insert,update,delete on public.technical_debt_items to service_role;
alter table public.ticket_assignments enable row level security;
revoke all on public.ticket_assignments from anon,authenticated;
grant select,insert,update,delete on public.ticket_assignments to service_role;
alter table public.ticket_attachments enable row level security;
revoke all on public.ticket_attachments from anon,authenticated;
grant select,insert,update,delete on public.ticket_attachments to service_role;
alter table public.ticket_messages enable row level security;
revoke all on public.ticket_messages from anon,authenticated;
grant select,insert,update,delete on public.ticket_messages to service_role;
alter table public.ticket_relations enable row level security;
revoke all on public.ticket_relations from anon,authenticated;
grant select,insert,update,delete on public.ticket_relations to service_role;
alter table public.ticket_status_history enable row level security;
revoke all on public.ticket_status_history from anon,authenticated;
grant select,insert,update,delete on public.ticket_status_history to service_role;
alter table public.ticket_tag_assignments enable row level security;
revoke all on public.ticket_tag_assignments from anon,authenticated;
grant select,insert,update,delete on public.ticket_tag_assignments to service_role;
alter table public.ticket_watchers enable row level security;
revoke all on public.ticket_watchers from anon,authenticated;
grant select,insert,update,delete on public.ticket_watchers to service_role;
alter table public.training_assignments enable row level security;
revoke all on public.training_assignments from anon,authenticated;
grant select,insert,update,delete on public.training_assignments to service_role;
alter table public.training_courses enable row level security;
revoke all on public.training_courses from anon,authenticated;
grant select,insert,update,delete on public.training_courses to service_role;
alter table public.training_records enable row level security;
revoke all on public.training_records from anon,authenticated;
grant select,insert,update,delete on public.training_records to service_role;
alter table public.work_schedules enable row level security;
revoke all on public.work_schedules from anon,authenticated;
grant select,insert,update,delete on public.work_schedules to service_role;
notify pgrst, 'reload schema';

commit;
