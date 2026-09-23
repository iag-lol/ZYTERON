-- Zyteron · Bootstrap de cuentas administrativas del Portal de Clientes
-- Ejecutar después de portal_clientes_schema.sql
-- Antes de ejecutar, define estas variables en LA MISMA sesión SQL (no las
-- guardes en este archivo ni en Git):
--   select set_config('zyteron.bootstrap_superadmin_password', '<secreto de 16-72 bytes>', false);
--   select set_config('zyteron.bootstrap_admin_password', '<otro secreto de 16-72 bytes>', false);

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  superadmin_password TEXT := current_setting('zyteron.bootstrap_superadmin_password', true);
  admin_password TEXT := current_setting('zyteron.bootstrap_admin_password', true);
BEGIN
  IF superadmin_password IS NULL
     OR superadmin_password <> btrim(superadmin_password)
     OR octet_length(superadmin_password) NOT BETWEEN 16 AND 72 THEN
    RAISE EXCEPTION 'Configura zyteron.bootstrap_superadmin_password con 16-72 bytes.';
  END IF;
  IF admin_password IS NULL
     OR admin_password <> btrim(admin_password)
     OR octet_length(admin_password) NOT BETWEEN 16 AND 72 THEN
    RAISE EXCEPTION 'Configura zyteron.bootstrap_admin_password con 16-72 bytes.';
  END IF;
  IF superadmin_password = admin_password THEN
    RAISE EXCEPTION 'Las contraseñas de SUPERADMIN y ADMIN deben ser distintas.';
  END IF;
END $$;

-- SUPERADMIN
INSERT INTO "User" (
  "id",
  "email",
  "passwordHash",
  "name",
  "firstName",
  "lastName",
  "role",
  "accountStatus",
  "authProvider",
  "emailVerifiedAt",
  "company",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  'superadmin@zyteron.cl',
  crypt(current_setting('zyteron.bootstrap_superadmin_password'), gen_salt('bf', 12)),
  'Super Admin Zyteron',
  'Super',
  'Admin',
  'SUPERADMIN',
  'ACTIVE',
  'LOCAL',
  NOW(),
  'Zyteron',
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE
SET
  "passwordHash" = EXCLUDED."passwordHash",
  "name" = EXCLUDED."name",
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  "role" = 'SUPERADMIN',
  "accountStatus" = 'ACTIVE',
  "authProvider" = 'LOCAL',
  "emailVerifiedAt" = COALESCE("User"."emailVerifiedAt", NOW()),
  "updatedAt" = NOW();

-- ADMIN
INSERT INTO "User" (
  "id",
  "email",
  "passwordHash",
  "name",
  "firstName",
  "lastName",
  "role",
  "accountStatus",
  "authProvider",
  "emailVerifiedAt",
  "company",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  'admin@zyteron.cl',
  crypt(current_setting('zyteron.bootstrap_admin_password'), gen_salt('bf', 12)),
  'Admin Zyteron',
  'Admin',
  'Zyteron',
  'ADMIN',
  'ACTIVE',
  'LOCAL',
  NOW(),
  'Zyteron',
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE
SET
  "passwordHash" = EXCLUDED."passwordHash",
  "name" = EXCLUDED."name",
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  "role" = 'ADMIN',
  "accountStatus" = 'ACTIVE',
  "authProvider" = 'LOCAL',
  "emailVerifiedAt" = COALESCE("User"."emailVerifiedAt", NOW()),
  "updatedAt" = NOW();

COMMIT;

SELECT set_config('zyteron.bootstrap_superadmin_password', '', false);
SELECT set_config('zyteron.bootstrap_admin_password', '', false);
