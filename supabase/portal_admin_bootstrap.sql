-- Zyteron · Bootstrap de cuentas administrativas del Portal de Clientes
-- Ejecutar después de portal_clientes_schema.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  crypt('Zyteron.SuperAdmin!2026', gen_salt('bf', 12)),
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
  crypt('Zyteron.Admin!2026', gen_salt('bf', 12)),
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
