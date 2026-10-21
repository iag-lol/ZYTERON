BEGIN;
DO $$
DECLARE lead uuid:=gen_random_uuid(); conversation uuid:=gen_random_uuid(); message uuid:=gen_random_uuid(); thread uuid:=gen_random_uuid(); web_message uuid:=gen_random_uuid();
BEGIN
 INSERT INTO public.leads(id,company_name,contact_name,email) VALUES(lead,'Empresa de prueba','Prueba','qa@example.invalid');
 IF NOT EXISTS(SELECT 1 FROM public.zyteron_contact_events WHERE event_key='lead:'||lead) THEN RAISE EXCEPTION 'Lead sin aviso'; END IF;
 INSERT INTO public.whatsapp_conversations(id,phone) VALUES(conversation,'qa-'||conversation);
 INSERT INTO public.whatsapp_messages(id,conversation_id,direction,sender_type,content) VALUES(message,conversation,'in','customer','Consulta de prueba');
 IF NOT EXISTS(SELECT 1 FROM public.zyteron_contact_events WHERE event_key='whatsapp:'||message) THEN RAISE EXCEPTION 'WhatsApp sin aviso'; END IF;
 INSERT INTO public.sales_threads(id,channel,subject) VALUES(thread,'WEB_CHAT','Prueba aislada');
 INSERT INTO public.sales_messages(id,thread_id,direction,from_name,body_text) VALUES(web_message,thread,'INBOUND','Prueba','Consulta web');
 IF NOT EXISTS(SELECT 1 FROM public.zyteron_contact_events WHERE event_key='webchat:'||web_message) THEN RAISE EXCEPTION 'Chat web sin aviso'; END IF;
 IF has_table_privilege('anon','public.zyteron_contact_events','SELECT') OR has_table_privilege('authenticated','public.zyteron_contact_settings','UPDATE') OR has_table_privilege('anon','public.whatsapp_messages','SELECT') THEN RAISE EXCEPTION 'Datos de contacto expuestos'; END IF;
END $$;
ROLLBACK;
