-- UI visibility is not an authorization boundary. Every direct client DB operation
-- must respect the verified account and the administrative portal/module switches.
CREATE OR REPLACE FUNCTION public.zyteron_portal_module_enabled(module_name text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public."User" u WHERE u.id=pg_catalog.current_setting('zyteron.portal_user_id',true)
 AND u.role::text='CLIENT' AND u."accountStatus"::text='ACTIVE' AND u."emailVerifiedAt" IS NOT NULL)
 AND NOT EXISTS(
 SELECT 1 FROM public.zyteron_legacy_client_link l JOIN public.client_portal_settings s ON s.client_id=l.client_id
 WHERE l.user_id=pg_catalog.current_setting('zyteron.portal_user_id',true)
 AND (NOT s.enabled OR NOT CASE module_name
 WHEN 'projects' THEN s.projects_visible WHEN 'documents' THEN s.documents_visible
 WHEN 'invoices' THEN s.invoices_visible WHEN 'tickets' THEN s.tickets_visible
 WHEN 'monitoring' THEN s.monitoring_visible WHEN 'audits' THEN s.audits_visible
 ELSE true END))
 AND (module_name IS NULL OR module_name IN ('projects','documents','invoices','tickets','monitoring','audits'));
$$;
REVOKE ALL ON FUNCTION public.zyteron_portal_module_enabled(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_portal_module_enabled(text) TO zyteron_portal_client,service_role;
DO $$DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['User','Quote','Project','Sale','TaxDocument','ClientDocument','SupportTicket','SupportTicketMessage','ClientNotification','ClientCommunication','ClientCredential','PortalRequest','ClientAuditLog','Receivable','Payment','PaymentAllocation','ClientProcess','ClientProcessEvent','ClientRequest','WorkOrder','Visit','clients','client_services','client_events','projects','documents','document_versions','document_links','support_tickets','ticket_messages','monitors','project_endpoints','payments','client_contracts','zyteron_native_project_link'] LOOP
  IF pg_catalog.to_regclass(pg_catalog.format('public.%I',tab)) IS NOT NULL THEN
   EXECUTE pg_catalog.format('CREATE POLICY zyteron_portal_session_guard ON public.%I AS RESTRICTIVE FOR ALL TO zyteron_portal_client USING(public.zyteron_portal_module_enabled(NULL)) WITH CHECK(public.zyteron_portal_module_enabled(NULL))',tab);
  END IF;
 END LOOP;
END $$;
DO $$DECLARE pair text[]; BEGIN
 FOREACH pair SLICE 1 IN ARRAY ARRAY[
 ['Project','projects'],['projects','projects'],
 ['ClientDocument','documents'],['documents','documents'],['document_versions','documents'],['document_links','documents'],['client_contracts','documents'],
 ['TaxDocument','invoices'],['Receivable','invoices'],['Payment','invoices'],['PaymentAllocation','invoices'],['payments','invoices'],
 ['SupportTicket','tickets'],['SupportTicketMessage','tickets'],['support_tickets','tickets'],['ticket_messages','tickets'],
 ['monitors','monitoring'],['project_endpoints','monitoring']
 ] LOOP
  IF pg_catalog.to_regclass(pg_catalog.format('public.%I',pair[1])) IS NOT NULL THEN
   EXECUTE pg_catalog.format('CREATE POLICY zyteron_portal_module_guard ON public.%I AS RESTRICTIVE FOR ALL TO zyteron_portal_client USING(public.zyteron_portal_module_enabled(%L)) WITH CHECK(public.zyteron_portal_module_enabled(%L))',pair[1],pair[2],pair[2]);
  END IF;
 END LOOP;
END $$;
-- A draft or a file with no completed scan must not become a client download.
DROP POLICY zyteron_published_document_read ON public.documents;
CREATE POLICY zyteron_published_document_read ON public.documents FOR SELECT TO zyteron_portal_client
 USING(client_visible AND classification IN ('PUBLIC','CLIENT') AND status='PUBLISHED' AND EXISTS(SELECT 1 FROM public.document_links l WHERE l.document_id=documents.id AND l.link_type='CLIENT' AND public.zyteron_client_business(l.linked_id)));
DROP POLICY zyteron_published_version_read ON public.document_versions;
CREATE POLICY zyteron_published_version_read ON public.document_versions FOR SELECT TO zyteron_portal_client
 USING(status='AVAILABLE' AND malware_status='CLEAN' AND EXISTS(SELECT 1 FROM public.documents d WHERE d.id=document_versions.document_id AND d.current_version_id=document_versions.id));
GRANT SELECT(id,code,name) ON public.document_types TO zyteron_portal_client;
CREATE POLICY zyteron_document_type_catalog ON public.document_types FOR SELECT TO zyteron_portal_client USING(public.zyteron_portal_module_enabled('documents'));
-- Audit-linked files additionally respect the audit switch; this only narrows access.
CREATE OR REPLACE FUNCTION public.zyteron_portal_audit_document_allowed(document_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.zyteron_portal_module_enabled('documents') AND
 (public.zyteron_portal_module_enabled('audits') OR NOT EXISTS(SELECT 1 FROM public.document_links l WHERE l.document_id=$1 AND l.link_type='AUDIT'));
$$;
REVOKE ALL ON FUNCTION public.zyteron_portal_audit_document_allowed(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_portal_audit_document_allowed(uuid) TO zyteron_portal_client,service_role;
CREATE POLICY zyteron_audit_document_switch ON public.documents AS RESTRICTIVE FOR SELECT TO zyteron_portal_client USING(public.zyteron_portal_audit_document_allowed(id));
-- Once a website project is managed operationally, its native row may not bypass
-- an INTERNAL publication choice (including nested credential/document lookups).
CREATE POLICY zyteron_managed_native_project_visibility ON public."Project" AS RESTRICTIVE FOR SELECT TO zyteron_portal_client USING(
 NOT EXISTS(SELECT 1 FROM public.zyteron_native_project_link l WHERE l.native_id="Project".id)
 OR EXISTS(SELECT 1 FROM public.projects p WHERE p.legacy_project_id="Project".id AND p.client_visibility='CLIENT_VISIBLE')
);
