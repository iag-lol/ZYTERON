-- Bootstrap para módulo de gastos (Expense)
-- Ejecutar en Supabase SQL Editor sobre el proyecto conectado.

create extension if not exists pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExpenseStatus') THEN
    CREATE TYPE public."ExpenseStatus" AS ENUM ('PLANNED', 'PURCHASED', 'CANCELLED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public."Expense" (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'OTROS',
  status public."ExpenseStatus" NOT NULL DEFAULT 'PLANNED',
  amount integer CHECK (amount >= 0),
  store text,
  "invoiceNumber" text,
  "purchaseDate" date,
  "arrivalDate" date,
  "invoiceFileUrl" text,
  "invoiceFilePath" text,
  "invoiceFileName" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_status_created
  ON public."Expense" (status, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_expense_category_created
  ON public."Expense" (category, "createdAt" DESC);

CREATE OR REPLACE FUNCTION public.set_expense_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expense_updated_at ON public."Expense";
CREATE TRIGGER trg_expense_updated_at
BEFORE UPDATE ON public."Expense"
FOR EACH ROW
EXECUTE FUNCTION public.set_expense_updated_at();

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public."Expense" TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public."Expense" TO anon, authenticated;

ALTER TABLE public."Expense" ENABLE ROW LEVEL SECURITY;

-- Limpieza defensiva: elimina cualquier política previa en Expense
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'Expense'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public."Expense";', policy_record.policyname);
  END LOOP;
END
$$;

CREATE POLICY expense_select_public
ON public."Expense"
FOR SELECT
TO PUBLIC
USING (true);

CREATE POLICY expense_insert_public
ON public."Expense"
FOR INSERT
TO PUBLIC
WITH CHECK (true);

CREATE POLICY expense_update_public
ON public."Expense"
FOR UPDATE
TO PUBLIC
USING (true)
WITH CHECK (true);

CREATE POLICY expense_delete_public
ON public."Expense"
FOR DELETE
TO PUBLIC
USING (true);

-- Bucket para respaldos/facturas de gastos
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-documents', 'expense-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Limpieza defensiva: elimina cualquier política previa del bucket expense-documents en storage.objects
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        policyname LIKE 'expense_bucket_%'
        OR coalesce(qual, '') LIKE '%expense-documents%'
        OR coalesce(with_check, '') LIKE '%expense-documents%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', policy_record.policyname);
  END LOOP;
END
$$;

CREATE POLICY expense_bucket_public_read
ON storage.objects
FOR SELECT
TO PUBLIC
USING (bucket_id = 'expense-documents');

CREATE POLICY expense_bucket_public_insert
ON storage.objects
FOR INSERT
TO PUBLIC
WITH CHECK (bucket_id = 'expense-documents');

CREATE POLICY expense_bucket_public_update
ON storage.objects
FOR UPDATE
TO PUBLIC
USING (bucket_id = 'expense-documents')
WITH CHECK (bucket_id = 'expense-documents');

CREATE POLICY expense_bucket_public_delete
ON storage.objects
FOR DELETE
TO PUBLIC
USING (bucket_id = 'expense-documents');

-- Fuerza recarga de schema cache de PostgREST.
NOTIFY pgrst, 'reload schema';
