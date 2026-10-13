BEGIN;
INSERT INTO client_portal_settings(client_id,enabled,projects_visible,documents_visible,invoices_visible,tickets_visible,monitoring_visible,audits_visible)
SELECT l.client_id,u."accountStatus"='ACTIVE',true,true,true,true,true,true FROM zyteron_legacy_client_link l JOIN "User" u ON u.id=l.user_id
ON CONFLICT(client_id) DO NOTHING;
GRANT SELECT(client_id,enabled,projects_visible,documents_visible,invoices_visible,tickets_visible,monitoring_visible,audits_visible) ON client_portal_settings TO zyteron_portal_client;
CREATE POLICY zyteron_owned_portal_settings ON client_portal_settings FOR SELECT TO zyteron_portal_client USING(public.zyteron_client_business(client_id));
COMMIT;
