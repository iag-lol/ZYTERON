-- Titles are repaired only when the original title and documented scope still match.
GRANT SELECT(project_number) ON public.projects TO zyteron_portal_client;
UPDATE public.projects SET name='Diseño de Fleet Control'
WHERE id='4ede9175-11ae-451b-8ebb-db48fa393345'
 AND name='Proyecto SOCIEDAD DE TRANSPORTES Y DIESEL SpA'
 AND description='Diseño de Fleet Control';
UPDATE public.projects SET name='Sitio web Fenice.cl'
WHERE id='e98aea13-cc74-40fe-8c24-9b28b2ababba'
 AND name='Proyecto SOCIEDAD DE TRANSPORTES Y DIESEL SpA'
 AND description='Creacion de Pagina Web Fenice.cl, nivel de seo avanzado, creacion de google Business y search console.';

CREATE FUNCTION public.zyteron_project_name_key(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
 SELECT btrim(regexp_replace(lower(translate(value,'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')),'[^a-z0-9]+',' ','g'));
$$;
REVOKE ALL ON FUNCTION public.zyteron_project_name_key(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_project_name_key(text) TO service_role;

CREATE FUNCTION public.zyteron_project_name_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE name_key text; subject_key text; company_name text; BEGIN
 name_key:=public.zyteron_project_name_key(NEW.name);
 subject_key:=pg_catalog.regexp_replace(name_key,'^(nuevo )?(proyecto|project)( |$)','');
 IF name_key IS NULL OR pg_catalog.length(name_key)<3 OR subject_key='' THEN
   RAISE EXCEPTION 'PROJECT_NAME_REQUIRED' USING ERRCODE='23514',HINT='Indica el trabajo o producto del proyecto.';
 END IF;
 FOR company_name IN
   SELECT c.legal_name FROM public.clients c WHERE c.id=NEW.client_id
   UNION ALL SELECT pg_catalog.to_jsonb(c)->>'trade_name' FROM public.clients c WHERE c.id=NEW.client_id
   UNION ALL SELECT u.company FROM public."User" u JOIN public."Project" p ON p."clientId"=u.id WHERE p.id=NEW.legacy_project_id
   UNION ALL SELECT u.name FROM public."User" u JOIN public."Project" p ON p."clientId"=u.id WHERE p.id=NEW.legacy_project_id
 LOOP
   IF public.zyteron_project_name_key(company_name) IN (name_key,subject_key) THEN
     RAISE EXCEPTION 'PROJECT_NAME_REQUIRED' USING ERRCODE='23514',HINT='El proyecto debe identificar el trabajo, no sólo su cliente.';
   END IF;
 END LOOP;
 NEW.name:=pg_catalog.btrim(NEW.name);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_project_name_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER project_specific_name BEFORE INSERT OR UPDATE OF name,client_id ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.zyteron_project_name_guard();
