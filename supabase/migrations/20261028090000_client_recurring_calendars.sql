BEGIN;

GRANT SELECT(quote_id,first_date,charge_day)
ON public.zyteron_quote_collection_settings TO zyteron_portal_client;
CREATE POLICY zyteron_owned_collection_calendar
ON public.zyteron_quote_collection_settings FOR SELECT TO zyteron_portal_client
USING (
  public.zyteron_portal_module_enabled('invoices') AND (
    EXISTS(SELECT 1 FROM public.quotes q WHERE q.id=quote_id AND public.zyteron_client_business(q.client_id))
    OR EXISTS(
      SELECT 1 FROM public."Quote" q
      CROSS JOIN LATERAL (SELECT encode(sha256(convert_to('zyteron:legacy-view:quote:'||q.id,'UTF8')),'hex') AS h) hash
      WHERE quote_id::text=CASE WHEN q.id ~* '^[0-9a-f-]{36}$' THEN q.id ELSE
        substr(h,1,8)||'-'||substr(h,9,4)||'-4'||substr(h,14,3)||'-a'||substr(h,18,3)||'-'||substr(h,21,12) END
    )
  )
);

GRANT SELECT(id,quote_id,client_id,frequency,amount,currency,start_date,payment_day,total_installments,status)
ON public.quote_payment_plans TO zyteron_portal_client;
CREATE POLICY zyteron_owned_quote_payment_calendar
ON public.quote_payment_plans FOR SELECT TO zyteron_portal_client
USING (
  public.zyteron_portal_module_enabled('invoices')
  AND public.zyteron_client_business(client_id)
  AND EXISTS(SELECT 1 FROM public.quotes q WHERE q.id=quote_id AND q.client_id=quote_payment_plans.client_id AND q.status IN ('ACCEPTED','CONVERTED'))
);

GRANT SELECT(plan_id,quote_id,client_id,sequence,due_date,amount,status)
ON public.quote_payment_installments TO zyteron_portal_client;
CREATE POLICY zyteron_owned_quote_payment_dates
ON public.quote_payment_installments FOR SELECT TO zyteron_portal_client
USING (
  public.zyteron_portal_module_enabled('invoices')
  AND public.zyteron_client_business(client_id)
  AND EXISTS(SELECT 1 FROM public.quote_payment_plans p WHERE p.id=plan_id AND p.quote_id=quote_payment_installments.quote_id AND p.client_id=quote_payment_installments.client_id)
);

COMMIT;
