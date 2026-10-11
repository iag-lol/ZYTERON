BEGIN;
CREATE TABLE IF NOT EXISTS public.zyteron_payment_inbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dedupe text NOT NULL UNIQUE,
 kind text NOT NULL CHECK(kind IN ('CHECKOUT','QUOTE','SUBSCRIPTION')),
 quote_id text NOT NULL REFERENCES public."Quote"(id), token_cipher text NOT NULL,
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','PROCESSING','DONE','REVIEW_REQUIRED')),
 attempts int NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 lease uuid, lease_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS zyteron_inbox_queue ON public.zyteron_payment_inbox(state,available_at);
CREATE TABLE IF NOT EXISTS public.zyteron_payment_mail (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dedupe text NOT NULL UNIQUE,
 quote_id text NOT NULL REFERENCES public."Quote"(id), recipient text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('CHECKOUT_RECEIPT','QUOTE_RECEIPT','SUBSCRIPTION_CANCELLED')),
 payment_id text, amount int NOT NULL CHECK(amount>=0), payload jsonb NOT NULL DEFAULT '{}',
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','PROCESSING','ACCEPTED','REVIEW_REQUIRED')),
 lease uuid,lease_until timestamptz,first_attempt_at timestamptz,provider_id text,
 available_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS zyteron_mail_queue ON public.zyteron_payment_mail(state,available_at);
CREATE TABLE IF NOT EXISTS public.zyteron_recurring_lifecycle (
 quote_id text PRIMARY KEY REFERENCES public."Quote"(id), client_id text NOT NULL REFERENCES public."User"(id),
 subscription_id text NOT NULL UNIQUE, state text NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','CANCEL_REQUESTED','CANCEL_SCHEDULED','CANCELLED','REVIEW_REQUIRED')),
 requested_at timestamptz,verified_at timestamptz,cancel_effective_at timestamptz,
 paid_through timestamptz,maintenance_ack_at timestamptz,maintenance_version text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zyteron_payment_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyteron_payment_mail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyteron_recurring_lifecycle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_payment_inbox,public.zyteron_payment_mail,public.zyteron_recurring_lifecycle FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zyteron_payment_inbox,public.zyteron_payment_mail,public.zyteron_recurring_lifecycle TO service_role;

CREATE OR REPLACE FUNCTION public.zyteron_apply_checkout(p_id text,p_token text,p_order bigint,p_amount int,p_status int,p_paid_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE q public."Quote"; m jsonb; r record; units int:=0; stock_problem boolean:=false; sale_ref text;
BEGIN
 SELECT * INTO q FROM public."Quote" WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_ORDER_UNKNOWN'; END IF;
 m:=q.message::jsonb;
 IF m->>'type'<>'PRODUCT_CHECKOUT' OR m#>>'{flow,token}' IS DISTINCT FROM p_token OR (m#>>'{flow,flowOrder}')::bigint IS DISTINCT FROM p_order OR (m->>'total')::int IS DISTINCT FROM p_amount OR q.total<>p_amount OR p_amount<=0 OR p_status NOT IN (1,2,3,4) THEN RAISE EXCEPTION 'PAYMENT_MISMATCH';END IF;
 IF (m#>>'{flow,status}')::int=2 AND p_status<>2 THEN RETURN m;END IF;
 IF p_status=2 AND p_paid_at IS NULL THEN RAISE EXCEPTION 'PAYMENT_EVIDENCE_REQUIRED';END IF;
 m:=jsonb_set(m,'{flow}',coalesce(m->'flow','{}')||jsonb_build_object('status',p_status,'statusLabel',CASE p_status WHEN 2 THEN 'APROBADA' WHEN 3 THEN 'RECHAZADA' WHEN 4 THEN 'ANULADA' ELSE 'PENDIENTE' END,'updatedAt',now(),'evidenceVerifiedAt',now(),'paidAt',p_paid_at));
 IF p_status=2 AND m#>>'{fulfillment,stockDiscountedAt}' IS NULL THEN
  -- Aggregate duplicate item ids, lock products in stable order, then deduct once.
  FOR r IN SELECT p.id,p.stock,sum((item->>'quantity')::int)::int qty FROM jsonb_array_elements(m->'items') item JOIN public."Product" p ON p.id=item->>'productId' GROUP BY p.id,p.stock ORDER BY p.id LOOP
   PERFORM id FROM public."Product" WHERE id=r.id FOR UPDATE;
   IF (SELECT stock FROM public."Product" WHERE id=r.id)<r.qty OR r.qty<=0 THEN stock_problem:=true;END IF;
  END LOOP;
  IF NOT stock_problem THEN
   FOR r IN SELECT item->>'productId' id,sum((item->>'quantity')::int)::int qty FROM jsonb_array_elements(m->'items') item GROUP BY item->>'productId' ORDER BY item->>'productId' LOOP
    UPDATE public."Product" SET stock=stock-r.qty WHERE id=r.id AND stock>=r.qty;
    IF FOUND THEN units:=units+r.qty;END IF;
   END LOOP;
   m:=jsonb_set(m,'{fulfillment}',coalesce(m->'fulfillment','{}')||jsonb_build_object('stockDiscountedAt',now(),'stockDiscountedUnits',units,'stockDiscountError',null));
  ELSE m:=jsonb_set(m,'{fulfillment}',coalesce(m->'fulfillment','{}')||jsonb_build_object('stockDiscountError','Stock pendiente de revisión; pago recibido, despacho no confirmado.'));END IF;
 END IF;
 UPDATE public."Quote" SET message=m::text,status=CASE WHEN p_status=2 THEN 'WON'::public."QuoteStatus" WHEN p_status IN (3,4) THEN 'LOST'::public."QuoteStatus" ELSE 'PENDING'::public."QuoteStatus" END WHERE id=p_id;
 IF p_status=2 AND NOT stock_problem THEN
  sale_ref:='COT:'||p_id;
  PERFORM pg_advisory_xact_lock(hashtextextended(sale_ref,0));
  IF NOT EXISTS(SELECT 1 FROM public."Sale" WHERE "invoiceRef"=sale_ref) THEN
   INSERT INTO public."Sale"(id,"clientId",total,description,"paymentMethod","invoiceRef","createdAt","processId") VALUES(gen_random_uuid()::text,q."userId",p_amount,'Pago verificado de compra '||p_id,'CARD',sale_ref,p_paid_at,q."processId");
  END IF;
 END IF;
 IF p_status=2 AND q."userId" IS NOT NULL THEN
  INSERT INTO public."Payment"(id,"clientId",amount,currency,method,source,status,provider,"providerPaymentId","commerceOrder","idempotencyKey","receivedAt",metadata,"updatedAt")
  VALUES(gen_random_uuid()::text,q."userId",p_amount,'CLP','CARD','FLOW','CONFIRMED','FLOW',p_order::text,p_id,'flow:'||p_order,p_paid_at,jsonb_build_object('quoteId',p_id,'checkout',true),now()) ON CONFLICT("idempotencyKey") DO NOTHING;
 END IF;
 IF p_status=2 THEN
  INSERT INTO public.zyteron_payment_mail(dedupe,quote_id,recipient,kind,amount,payload)
  VALUES('checkout/'||p_order,p_id,q.email,'CHECKOUT_RECEIPT',p_amount,jsonb_build_object('flowOrder',p_order,'paidAt',p_paid_at)) ON CONFLICT(dedupe) DO NOTHING;
 END IF;
 RETURN m;
END $$;
REVOKE EXECUTE ON FUNCTION public.zyteron_apply_checkout(text,text,bigint,int,int,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_apply_checkout(text,text,bigint,int,int,timestamptz) TO service_role;
CREATE TABLE IF NOT EXISTS public.zyteron_financial_challenge (
 id uuid PRIMARY KEY,client_id text NOT NULL REFERENCES public."User"(id),quote_id text NOT NULL REFERENCES public."Quote"(id),
 purpose text NOT NULL CHECK(purpose IN ('CANCEL_SUBSCRIPTION','START_SUBSCRIPTION')),code_hash text NOT NULL,context_hash text NOT NULL,
 expires_at timestamptz NOT NULL,consumed_at timestamptz,attempts int NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zyteron_financial_challenge ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_financial_challenge FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zyteron_financial_challenge TO service_role;
CREATE TABLE IF NOT EXISTS public.zyteron_provider_operation(
 dedupe text PRIMARY KEY,quote_id text NOT NULL REFERENCES public."Quote"(id),id uuid NOT NULL UNIQUE,
 state text NOT NULL CHECK(state IN ('CREATING','UNKNOWN','READY')),result_cipher text,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zyteron_provider_operation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_provider_operation FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zyteron_provider_operation TO service_role;
CREATE TABLE IF NOT EXISTS public.zyteron_checkout_request(
 id text PRIMARY KEY,request_hash text NOT NULL,quote_id text REFERENCES public."Quote"(id),created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zyteron_checkout_request ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_checkout_request FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zyteron_checkout_request TO service_role;
CREATE OR REPLACE FUNCTION public.zyteron_sync_verified_quote_sale(p_id text) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE q public."Quote"; received bigint;ref text;
BEGIN
 SELECT * INTO q FROM public."Quote" WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR q.status::text<>'WON' OR q.total<=0 OR q."userId" IS NULL THEN RETURN false;END IF;
 SELECT coalesce(sum(a.amount),0) INTO received FROM public."PaymentAllocation" a JOIN public."Payment" p ON p.id=a."paymentId" JOIN public."Receivable" r ON r.id=a."receivableId" WHERE r."quoteId"=p_id AND p.status='CONFIRMED' AND p."clientId"=q."userId" AND p.currency='CLP';
 IF received<q.total THEN RETURN false;END IF;
 ref:='COT:'||p_id;PERFORM pg_advisory_xact_lock(hashtextextended(ref,0));
 IF NOT EXISTS(SELECT 1 FROM public."Sale" WHERE "invoiceRef"=ref) THEN INSERT INTO public."Sale"(id,"clientId",total,description,"paymentMethod","invoiceRef","createdAt","processId") VALUES(gen_random_uuid()::text,q."userId",q.total,'Pago acreditado de cotización '||p_id,'CARD',ref,now(),q."processId");END IF;
 RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.zyteron_sync_verified_quote_sale(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_sync_verified_quote_sale(text) TO service_role;
CREATE TABLE IF NOT EXISTS public.zyteron_payment_attempt(
 token_hash text PRIMARY KEY,token_cipher text NOT NULL,quote_id text NOT NULL REFERENCES public."Quote"(id),
 client_id text REFERENCES public."User"(id),kind text NOT NULL CHECK(kind IN ('CHECKOUT','QUOTE')),
 stage_key text,commerce_order text NOT NULL,flow_order bigint NOT NULL UNIQUE,amount int NOT NULL CHECK(amount>0),
 review_required boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zyteron_payment_attempt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zyteron_payment_attempt FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.zyteron_payment_attempt TO service_role;
-- Every financial and identity table is accessed by verified server sessions, never the public API key.
ALTER TABLE public."Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Receivable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Sale" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."Quote",public."Payment",public."Receivable",public."PaymentAllocation",public."Sale" FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.zyteron_sync_subscription_sale(p_quote text,p_payment text,p_invoice bigint) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE q public."Quote";p public."Payment";ref text;
BEGIN
 SELECT * INTO q FROM public."Quote" WHERE id=p_quote FOR UPDATE;
 SELECT * INTO p FROM public."Payment" WHERE id=p_payment;
 IF q."userId" IS NULL OR p."clientId" IS DISTINCT FROM q."userId" OR p.status<>'CONFIRMED' OR p.source<>'SUBSCRIPTION' OR p.provider<>'FLOW' OR p.currency<>'CLP' OR p.amount<=0 OR p.metadata->>'quoteId' IS DISTINCT FROM p_quote OR (p.metadata->>'invoiceId')::bigint IS DISTINCT FROM p_invoice THEN RETURN false;END IF;
 ref:='SUB:'||p_quote||':'||p_invoice;PERFORM pg_advisory_xact_lock(hashtextextended(ref,0));
 IF NOT EXISTS(SELECT 1 FROM public."Sale" WHERE "invoiceRef"=ref) THEN INSERT INTO public."Sale"(id,"clientId",total,description,"paymentMethod","invoiceRef","createdAt","processId") VALUES(gen_random_uuid()::text,q."userId",p.amount,'Cuota mensual verificada de '||p_quote,'CARD',ref,p."receivedAt",q."processId");END IF;
 RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.zyteron_sync_subscription_sale(text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.zyteron_sync_subscription_sale(text,text,bigint) TO service_role;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."User" FROM anon,authenticated;
COMMIT;
