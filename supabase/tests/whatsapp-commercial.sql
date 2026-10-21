BEGIN;
DO $$
DECLARE conversation uuid; lead uuid; events_before integer;
BEGIN
  INSERT INTO public.whatsapp_conversations(phone,customer_name,email,lead_id)
  VALUES('qa-'||gen_random_uuid()::text,'Contacto QA','qa@example.invalid','legacy-quote-qa')
  RETURNING id INTO conversation;
  SELECT id INTO lead FROM public.leads WHERE whatsapp_conversation_id=conversation;
  IF lead IS NULL THEN RAISE EXCEPTION 'La conversación no creó un lead'; END IF;
  SELECT count(*) INTO events_before FROM public.commercial_events WHERE aggregate_id=lead;
  UPDATE public.leads SET status='CONVERTED',notes='Seguimiento comercial',archived_at=now() WHERE id=lead;
  UPDATE public.whatsapp_conversations SET customer_name='Contacto actualizado',lead_status='nuevo' WHERE id=conversation;
  PERFORM public.zyteron_sync_whatsapp_lead(conversation);
  IF NOT EXISTS(SELECT 1 FROM public.leads WHERE id=lead AND contact_name='Contacto actualizado'
    AND status='CONVERTED' AND notes='Seguimiento comercial' AND archived_at IS NOT NULL)
    THEN RAISE EXCEPTION 'La sincronización alteró el seguimiento comercial'; END IF;
  IF (SELECT count(*) FROM public.leads WHERE whatsapp_conversation_id=conversation)<>1
    THEN RAISE EXCEPTION 'Lead duplicado por conversación'; END IF;
  IF (SELECT count(*) FROM public.commercial_events WHERE aggregate_id=lead)<>events_before
    THEN RAISE EXCEPTION 'Evento duplicado'; END IF;
  IF (SELECT lead_id FROM public.whatsapp_conversations WHERE id=conversation)<>'legacy-quote-qa'
    THEN RAISE EXCEPTION 'Se alteró el vínculo de cotización'; END IF;
  IF has_function_privilege('anon','public.zyteron_sync_whatsapp_lead(uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.zyteron_sync_whatsapp_lead(uuid)','EXECUTE')
    THEN RAISE EXCEPTION 'Función de sincronización expuesta'; END IF;
END $$;
ROLLBACK;
