-- Notifications can target an assigned person OR an existing audience role.
ALTER TABLE public.commercial_notifications ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.commercial_notifications DROP CONSTRAINT IF EXISTS commercial_notification_recipient_required;
ALTER TABLE public.commercial_notifications ADD CONSTRAINT commercial_notification_recipient_required CHECK(owner_id IS NOT NULL OR audience_role IS NOT NULL);
CREATE OR REPLACE FUNCTION public.project_commercial_event_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare owner_user uuid;recipient_role text;
begin
  if new.event_type='LEAD_ASSIGNED' then
    insert into public.commercial_notifications(event_key,owner_id,type,title,body,entity_type,entity_id)
    values('LEAD_ASSIGNED:'||new.aggregate_id,nullif(new.payload->>'assignedTo','')::uuid,'LEAD_ASSIGNED','Nuevo lead asignado','Revisa el Lead Inbox','LEAD',new.aggregate_id)
    on conflict(event_key) do nothing;
  elsif new.event_type='QUOTE_APPROVAL_REQUIRED' then
    insert into public.commercial_notifications(event_key,audience_role,type,title,body,entity_type,entity_id)
    values('QUOTE_APPROVAL_REQUIRED:'||new.aggregate_id,'JEFE_VENTAS','QUOTE_APPROVAL_REQUIRED','Cotización requiere aprobación','El descuento excede la política del rol creador','QUOTE',new.aggregate_id)
    on conflict(event_key) do nothing;
  elsif new.event_type in('QUOTE_APPROVED','QUOTE_REJECTED') then
    select owner_id into owner_user from public.quotes where id=new.aggregate_id;
    if owner_user is null then return new; end if;
    insert into public.commercial_notifications(event_key,owner_id,type,title,body,entity_type,entity_id)
    values(new.event_type||':'||new.aggregate_id,owner_user,new.event_type,case when new.event_type='QUOTE_APPROVED' then 'Cotización aprobada' else 'Cotización rechazada' end,null,'QUOTE',new.aggregate_id)
    on conflict(event_key) do nothing;
  elsif new.event_type in('QUOTE_ACCEPTED','SALE_WON') then
    foreach recipient_role in array array['GERENTE_GENERAL','JEFE_DESARROLLO'] loop
      insert into public.commercial_notifications(event_key,audience_role,type,title,body,entity_type,entity_id)
      values(new.event_type||':'||new.aggregate_id||':'||recipient_role,recipient_role,new.event_type,case when new.event_type='QUOTE_ACCEPTED' then 'Cotización aceptada' else 'Venta ganada' end,null,new.aggregate_type,new.aggregate_id)
      on conflict(event_key) do nothing;
    end loop;
  elsif new.event_type='HANDOFF_READY' then
    foreach recipient_role in array array['GERENTE_GENERAL','JEFE_DESARROLLO'] loop
      insert into public.commercial_notifications(event_key,audience_role,type,title,body,entity_type,entity_id)
      values('HANDOFF_READY:'||new.aggregate_id||':'||recipient_role,recipient_role,'HANDOFF_READY','Handoff comercial listo',null,'HANDOFF',new.aggregate_id)
      on conflict(event_key) do nothing;
    end loop;
  end if;
  return new;
end$function$
;
REVOKE EXECUTE ON FUNCTION public.project_commercial_event_notification() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.project_commercial_event_notification() TO service_role;
