begin;

set local lock_timeout = '3s';
set local statement_timeout = '10s';

-- Registrar un tipo permite custodiar su CAF; no acredita implementación ni autorización SII.
insert into public.tax_document_types
  (code, name, category, sign, enabled_for_issue, certified)
values
  (43, 'Liquidación factura electrónica', 'OTHER', 1, false, false),
  (110, 'Factura de exportación electrónica', 'INVOICE', 1, false, false),
  (111, 'Nota de débito de exportación electrónica', 'DEBIT_NOTE', 1, false, false),
  (112, 'Nota de crédito de exportación electrónica', 'CREDIT_NOTE', -1, false, false)
on conflict (code) do nothing;

commit;
