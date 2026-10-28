BEGIN;
CREATE TABLE public.zyteron_inbox_reads (
 source text NOT NULL CHECK(source IN ('web','ticket','native','request')),
 record_id text NOT NULL,
 actor_id text NOT NULL,
 read_at timestamptz NOT NULL,
 PRIMARY KEY(source,record_id,actor_id)
);
ALTER TABLE public.zyteron_inbox_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_inbox_reads FROM PUBLIC,anon,authenticated,zyteron_portal_client;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.zyteron_inbox_reads TO service_role;
CREATE INDEX IF NOT EXISTS zyteron_web_thread_activity ON public.sales_threads((coalesce(last_message_at,created_at)) DESC,id DESC) WHERE channel='WEB_CHAT';
CREATE INDEX IF NOT EXISTS zyteron_web_message_history ON public.sales_messages(thread_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS zyteron_web_last_incoming ON public.sales_messages(thread_id,created_at DESC,id DESC) WHERE actor_kind='USER';
CREATE INDEX IF NOT EXISTS zyteron_support_message_history ON public.ticket_messages(ticket_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS zyteron_support_last_incoming ON public.ticket_messages(ticket_id,created_at DESC,id DESC) WHERE author_type='CLIENT';
CREATE INDEX IF NOT EXISTS zyteron_inbox_request_replies ON public."ClientAuditLog"("entityId","createdAt" DESC) WHERE "entityType"='PortalRequest';
DO $$ DECLARE t text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  FOREACH t IN ARRAY ARRAY['sales_threads','sales_messages'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
   END IF;
  END LOOP;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
