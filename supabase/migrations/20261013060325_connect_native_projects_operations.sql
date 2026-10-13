-- Existing website projects become the SAME operational project, without inventing
-- a sale, payment, work order, staff identity or an authorization to publish.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS legacy_project_id text UNIQUE REFERENCES public."Project"(id) ON DELETE RESTRICT;
ALTER TABLE public.projects ALTER COLUMN work_order_id DROP NOT NULL;
ALTER TABLE public.projects ALTER COLUMN progress DROP NOT NULL;
ALTER TABLE public.projects ADD CONSTRAINT projects_operational_or_native_origin CHECK(work_order_id IS NOT NULL OR legacy_project_id IS NOT NULL);
CREATE TABLE public.zyteron_native_project_link (
 native_id text PRIMARY KEY REFERENCES public."Project"(id) ON DELETE RESTRICT,
 project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE RESTRICT,
 user_id text REFERENCES public."User"(id) ON DELETE RESTRICT
);
ALTER TABLE public.zyteron_native_project_link ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_native_project_link FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zyteron_native_project_link TO service_role;
GRANT SELECT ON public.zyteron_native_project_link TO zyteron_portal_client;
CREATE POLICY native_project_owner_link ON public.zyteron_native_project_link FOR SELECT TO zyteron_portal_client
 USING(user_id=current_setting('zyteron.portal_user_id',true));
GRANT SELECT(legacy_project_id) ON public.projects TO zyteron_portal_client;
CREATE OR REPLACE FUNCTION public.zyteron_native_project_id(source_id text)
RETURNS uuid LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT CASE WHEN source_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN source_id::uuid ELSE
 (substr(h,1,8)||'-'||substr(h,9,4)||'-4'||substr(h,14,3)||'-a'||substr(h,18,3)||'-'||substr(h,21,12))::uuid END
 FROM (SELECT encode(sha256(convert_to('zyteron:legacy-view:project:'||source_id,'UTF8')),'hex') h) hashes;
$$;
REVOKE ALL ON FUNCTION public.zyteron_native_project_id(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_native_project_id(text) TO service_role;
INSERT INTO public.projects(id,legacy_project_id,client_id,name,description,scope,status,priority,progress,planned_start_date,target_date,estimated_hours,client_visibility,created_at)
SELECT public.zyteron_native_project_id(p.id),p.id,l.client_id,p.title,p.description,coalesce(p.scope,''),
 CASE p.status WHEN 'DONE' THEN 'COMPLETED' WHEN 'PLANNED' THEN 'PLANNING' WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS' WHEN 'CANCELLED' THEN 'CANCELLED' ELSE 'PLANNING' END,
 CASE WHEN p.priority IN ('LOW','NORMAL','HIGH','URGENT','CRITICAL') THEN p.priority ELSE 'NORMAL' END,
 CASE WHEN p.status='DONE' THEN 100 ELSE NULL END,p."startDate",p."endDate",p."estimatedHours",
 CASE WHEN l.client_id IS NOT NULL THEN 'CLIENT_VISIBLE' ELSE 'INTERNAL' END,p."createdAt"
FROM public."Project" p LEFT JOIN public.zyteron_legacy_client_link l ON l.user_id=p."clientId"
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.zyteron_native_project_link(native_id,project_id,user_id)
SELECT p.legacy_project_id,p.id,n."clientId" FROM public.projects p JOIN public."Project" n ON n.id=p.legacy_project_id ON CONFLICT(native_id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.zyteron_native_project_sync() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE business uuid; target_id uuid; BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
 SELECT client_id INTO business FROM public.zyteron_legacy_client_link WHERE user_id=NEW."clientId";
 target_id:=public.zyteron_native_project_id(NEW.id);
 INSERT INTO public.projects(id,legacy_project_id,client_id,name,description,scope,status,priority,progress,planned_start_date,target_date,estimated_hours,client_visibility,created_at)
 VALUES(target_id,NEW.id,business,NEW.title,NEW.description,coalesce(NEW.scope,''),
 CASE NEW.status WHEN 'DONE' THEN 'COMPLETED' WHEN 'PLANNED' THEN 'PLANNING' ELSE coalesce(NEW.status,'PLANNING') END,
 CASE WHEN NEW.priority IN ('LOW','NORMAL','HIGH','URGENT','CRITICAL') THEN NEW.priority ELSE 'NORMAL' END,
 CASE WHEN NEW.status IN ('DONE','COMPLETED') THEN 100 ELSE NULL END,NEW."startDate",NEW."endDate",NEW."estimatedHours",
 CASE WHEN business IS NOT NULL THEN 'CLIENT_VISIBLE' ELSE 'INTERNAL' END,NEW."createdAt")
 ON CONFLICT(id) DO UPDATE SET client_id=excluded.client_id,name=excluded.name,description=excluded.description,scope=excluded.scope,status=excluded.status,
 planned_start_date=excluded.planned_start_date,target_date=excluded.target_date,estimated_hours=excluded.estimated_hours;
 INSERT INTO public.zyteron_native_project_link(native_id,project_id,user_id) VALUES(NEW.id,target_id,NEW."clientId")
 ON CONFLICT(native_id) DO UPDATE SET user_id=excluded.user_id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_native_project_sync() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_native_project_sync() TO service_role;
CREATE TRIGGER native_project_operational_sync AFTER INSERT OR UPDATE OF title,description,scope,status,"clientId","startDate","endDate","estimatedHours" ON public."Project" FOR EACH ROW EXECUTE FUNCTION public.zyteron_native_project_sync();
CREATE OR REPLACE FUNCTION public.zyteron_operational_project_sync() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.legacy_project_id IS NOT NULL AND pg_trigger_depth()=1 THEN
 UPDATE public."Project" SET title=NEW.name,description=NEW.description,scope=NEW.scope,status=NEW.status,
 "startDate"=NEW.planned_start_date,"endDate"=NEW.target_date,"estimatedHours"=coalesce(round(NEW.estimated_hours)::integer,0) WHERE id=NEW.legacy_project_id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_operational_project_sync() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_operational_project_sync() TO service_role;
CREATE TRIGGER operational_project_native_sync AFTER UPDATE OF name,description,scope,status,planned_start_date,target_date,estimated_hours ON public.projects FOR EACH ROW EXECUTE FUNCTION public.zyteron_operational_project_sync();

CREATE OR REPLACE FUNCTION public.zyteron_native_project_owner_boundary() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE business uuid; BEGIN
 IF NEW.legacy_project_id IS NOT NULL THEN
 SELECT l.client_id INTO business FROM public."Project" p LEFT JOIN public.zyteron_legacy_client_link l ON l.user_id=p."clientId" WHERE p.id=NEW.legacy_project_id;
 IF NEW.client_id IS DISTINCT FROM business THEN RAISE EXCEPTION 'Native project client boundary mismatch'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_native_project_owner_boundary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_native_project_owner_boundary() TO service_role;
CREATE TRIGGER native_project_client_boundary BEFORE INSERT OR UPDATE OF client_id,legacy_project_id ON public.projects FOR EACH ROW EXECUTE FUNCTION public.zyteron_native_project_owner_boundary();
