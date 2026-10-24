-- El cliente puede leer el estado de archivo de sus propias cotizaciones,
-- sin acceder a motivos internos, actores o registros de otras empresas.
GRANT SELECT(quote_id,native_quote_id,client_id,state) ON public.zyteron_archived_quotes TO zyteron_portal_client;
CREATE POLICY zyteron_owned_quote_archive ON public.zyteron_archived_quotes
FOR SELECT TO zyteron_portal_client
USING(public.zyteron_client_business(client_id) AND public.zyteron_portal_module_enabled('invoices'));

GRANT SELECT(payment_reference) ON public.payments TO zyteron_portal_client;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
GRANT SELECT(id,payment_id,invoice_id,amount,reversed_at) ON public.payment_allocations TO zyteron_portal_client;
CREATE POLICY zyteron_owned_confirmed_payment_allocation ON public.payment_allocations
FOR SELECT TO zyteron_portal_client
USING(reversed_at IS NULL AND public.zyteron_portal_module_enabled('invoices')
  AND EXISTS(SELECT 1 FROM public.payments p WHERE p.id=payment_id AND p.status='CONFIRMED' AND p.confirmed_at IS NOT NULL AND public.zyteron_client_business(p.client_id))
  AND EXISTS(SELECT 1 FROM public.invoices i WHERE i.id=invoice_id AND public.zyteron_client_business(i.client_id)));
