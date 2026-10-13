BEGIN;
-- Native verified customers have an explicit, scoped database role. No browser grants.
GRANT SELECT(id,client_id,name,description,scope,status,planned_start_date,target_date,client_visibility,created_at) ON public.projects TO zyteron_portal_client;
CREATE POLICY zyteron_published_project_read ON public.projects FOR SELECT TO zyteron_portal_client USING(client_visibility='CLIENT_VISIBLE' AND public.zyteron_client_business(client_id));
GRANT SELECT(id,document_id,link_type,linked_id) ON public.document_links TO zyteron_portal_client;
CREATE POLICY zyteron_owned_document_link ON public.document_links FOR SELECT TO zyteron_portal_client USING(link_type='CLIENT' AND public.zyteron_client_business(linked_id));
GRANT SELECT(id,title,description,type_id,classification,status,client_visible,current_version_id,created_at) ON public.documents TO zyteron_portal_client;
CREATE POLICY zyteron_published_document_read ON public.documents FOR SELECT TO zyteron_portal_client USING(client_visible AND classification IN ('PUBLIC','CLIENT') AND status NOT IN ('ARCHIVED','TRASHED','QUARANTINED','CANCELLED') AND EXISTS(SELECT 1 FROM public.document_links l WHERE l.document_id=documents.id AND l.link_type='CLIENT' AND public.zyteron_client_business(l.linked_id)));
GRANT SELECT(id,document_id,filename,storage_path,mime_type,status,malware_status,created_at) ON public.document_versions TO zyteron_portal_client;
CREATE POLICY zyteron_published_version_read ON public.document_versions FOR SELECT TO zyteron_portal_client USING(status='AVAILABLE' AND malware_status NOT IN ('INFECTED','SUSPICIOUS','SCAN_FAILED','PENDING') AND EXISTS(SELECT 1 FROM public.documents d WHERE d.id=document_versions.document_id AND d.current_version_id=document_versions.id));
GRANT SELECT(id,client_id,subject,description,status,priority,client_visibility,created_at,updated_at) ON public.support_tickets TO zyteron_portal_client;
CREATE POLICY zyteron_owned_support_read ON public.support_tickets FOR SELECT TO zyteron_portal_client USING(client_visibility='CLIENT_VISIBLE' AND public.zyteron_client_business(client_id));
GRANT SELECT(id,ticket_id,author_type,body,visibility,created_at) ON public.ticket_messages TO zyteron_portal_client;
CREATE POLICY zyteron_public_support_message ON public.ticket_messages FOR SELECT TO zyteron_portal_client USING(visibility='PUBLIC_REPLY' AND EXISTS(SELECT 1 FROM public.support_tickets t WHERE t.id=ticket_messages.ticket_id));
GRANT INSERT(id,ticket_id,author_type,message_type,body,visibility) ON public.ticket_messages TO zyteron_portal_client;
CREATE POLICY zyteron_customer_support_reply ON public.ticket_messages FOR INSERT TO zyteron_portal_client WITH CHECK(author_type='CLIENT' AND message_type='PORTAL_REPLY' AND visibility='PUBLIC_REPLY' AND EXISTS(SELECT 1 FROM public.support_tickets t WHERE t.id=ticket_messages.ticket_id AND t.status NOT IN ('CLOSED','RESOLVED','CANCELLED')));
ALTER TABLE public.work_orders ALTER COLUMN status SET DEFAULT 'PENDING_PLANNING';
NOTIFY pgrst,'reload schema';
COMMIT;
