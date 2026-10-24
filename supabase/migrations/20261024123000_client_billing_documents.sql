CREATE UNIQUE INDEX IF NOT EXISTS client_document_owner_id ON public."ClientDocument"(id,"userId");

CREATE OR REPLACE FUNCTION public.zyteron_billing_target_owned(owner_id text, kind text, source text, target_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE
 WHEN kind='PAYMENT' AND source='commercial' THEN EXISTS(SELECT 1 FROM public."Payment" p WHERE p.id=target_id AND p."clientId"=owner_id)
 WHEN kind='INVOICE' AND source='commercial' THEN EXISTS(SELECT 1 FROM public."Receivable" r WHERE r.id=target_id AND r."clientId"=owner_id)
 WHEN kind='PAYMENT' AND source='accounting' THEN EXISTS(SELECT 1 FROM public.payments p JOIN public.zyteron_legacy_client_link l ON l.client_id=p.client_id WHERE p.id::text=target_id AND l.user_id=owner_id)
 WHEN kind='INVOICE' AND source='accounting' THEN EXISTS(SELECT 1 FROM public.invoices i JOIN public.zyteron_legacy_client_link l ON l.client_id=i.client_id WHERE i.id::text=target_id AND l.user_id=owner_id)
 ELSE false END;
$$;
REVOKE ALL ON FUNCTION public.zyteron_billing_target_owned(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_billing_target_owned(text,text,text,text) TO service_role;

CREATE TABLE public.zyteron_billing_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 document_id text NOT NULL,
 user_id text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
 target_type text NOT NULL CHECK(target_type IN ('PAYMENT','INVOICE')),
 target_source text NOT NULL CHECK(target_source IN ('commercial','accounting')),
 target_id text NOT NULL CHECK(length(target_id) BETWEEN 1 AND 100),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by text REFERENCES public."User"(id) ON DELETE SET NULL,
 FOREIGN KEY(document_id,user_id) REFERENCES public."ClientDocument"(id,"userId") ON DELETE CASCADE,
 UNIQUE(document_id,target_type,target_source,target_id)
);
CREATE INDEX zyteron_billing_documents_owner ON public.zyteron_billing_documents(user_id,target_type,target_source,target_id);

CREATE FUNCTION public.zyteron_check_billing_document() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.zyteron_billing_target_owned(NEW.user_id,NEW.target_type,NEW.target_source,NEW.target_id)
 OR NOT EXISTS(SELECT 1 FROM public."ClientDocument" d WHERE d.id=NEW.document_id AND d."userId"=NEW.user_id AND d."mimeType"='application/pdf' AND d."storagePath" IS NOT NULL)
 THEN RAISE EXCEPTION 'BILLING_DOCUMENT_TARGET_INVALID' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_check_billing_document() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zyteron_billing_document_owner BEFORE INSERT OR UPDATE ON public.zyteron_billing_documents
FOR EACH ROW EXECUTE FUNCTION public.zyteron_check_billing_document();

ALTER TABLE public.zyteron_billing_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_billing_documents FROM PUBLIC,anon,authenticated,zyteron_portal_client;
GRANT SELECT,INSERT,UPDATE ON public.zyteron_billing_documents TO service_role;
GRANT SELECT ON public.zyteron_billing_documents TO zyteron_portal_client;
CREATE FUNCTION public.zyteron_billing_target_visible(kind text, source text, target_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.zyteron_billing_target_owned(pg_catalog.current_setting('zyteron.portal_user_id',true),kind,source,target_id);
$$;
REVOKE ALL ON FUNCTION public.zyteron_billing_target_visible(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_billing_target_visible(text,text,text) TO zyteron_portal_client,service_role;
CREATE POLICY zyteron_owned_billing_document ON public.zyteron_billing_documents FOR SELECT TO zyteron_portal_client
USING(user_id=current_setting('zyteron.portal_user_id',true)
 AND public.zyteron_billing_target_visible(target_type,target_source,target_id)
 AND public.zyteron_portal_module_enabled('invoices')
 AND public.zyteron_portal_module_enabled('documents'));
