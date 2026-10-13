-- The retired RPC minted a sale from proposal acceptance without funds.
-- Current acceptance records only commercial state. Verified payment processing
-- uses its own ledger/receipt transaction and never calls this retired RPC.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure::text signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='accept_sales_quote' LOOP
  EXECUTE 'REVOKE EXECUTE ON FUNCTION '||f.signature||' FROM PUBLIC,anon,authenticated,service_role';
 END LOOP;
END $$;
