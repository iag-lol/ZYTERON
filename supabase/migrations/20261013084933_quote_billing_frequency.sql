-- A nullable declaration preserves unknown historical terms; a plan remains the collection schedule.
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS billing_type text CHECK (billing_type IN ('ONE_TIME','SUBSCRIPTION'));
CREATE OR REPLACE FUNCTION public.zyteron_quote_billing_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF OLD.billing_type IS DISTINCT FROM NEW.billing_type AND (OLD.status <> 'DRAFT' OR OLD.document_id IS NOT NULL OR OLD.sent_at IS NOT NULL OR OLD.accepted_at IS NOT NULL OR EXISTS(SELECT 1 FROM quote_payment_plans p WHERE p.quote_id=OLD.id)) THEN
   RAISE EXCEPTION 'QUOTE_BILLING_LOCKED: la modalidad requiere una nueva versión';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.zyteron_quote_billing_guard() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS zyteron_quote_billing_guard ON public.quotes;
CREATE TRIGGER zyteron_quote_billing_guard BEFORE UPDATE OF billing_type ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.zyteron_quote_billing_guard();
create or replace function public.create_sales_quote(quote_payload jsonb,item_payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_quote_id uuid;begin
 insert into public.quotes(id,client_id,lead_id,opportunity_id,company_name,contact_name,contact_email,owner_id,status,currency,subtotal,discount_total,net_amount,tax_rate,tax_amount,total_amount,valid_until,payment_terms,commercial_terms,notes,billing_type)
 values((quote_payload->>'id')::uuid,(quote_payload->>'client_id')::uuid,(quote_payload->>'lead_id')::uuid,(quote_payload->>'opportunity_id')::uuid,quote_payload->>'company_name',quote_payload->>'contact_name',quote_payload->>'contact_email',(quote_payload->>'owner_id')::uuid,quote_payload->>'status',quote_payload->>'currency',(quote_payload->>'subtotal')::numeric,(quote_payload->>'discount_total')::numeric,(quote_payload->>'net_amount')::numeric,(quote_payload->>'tax_rate')::numeric,(quote_payload->>'tax_amount')::numeric,(quote_payload->>'total_amount')::numeric,(quote_payload->>'valid_until')::date,quote_payload->>'payment_terms',quote_payload->>'commercial_terms',quote_payload->>'notes',quote_payload->>'billing_type') returning id into new_quote_id;
 insert into public.quote_items(id,quote_id,catalog_service_id,description,quantity,unit_price,discount_percent,taxable,subtotal,position)
 select (entry.value->>'id')::uuid,new_quote_id,(entry.value->>'catalog_service_id')::uuid,entry.value->>'description',(entry.value->>'quantity')::numeric,(entry.value->>'unit_price')::numeric,(entry.value->>'discount_percent')::numeric,(entry.value->>'taxable')::boolean,(entry.value->>'subtotal')::numeric,(entry.ordinality-1)::integer from jsonb_array_elements(item_payload) with ordinality as entry(value,ordinality);
 return new_quote_id;
end $$;

REVOKE ALL ON FUNCTION public.create_sales_quote(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_sales_quote(jsonb,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
