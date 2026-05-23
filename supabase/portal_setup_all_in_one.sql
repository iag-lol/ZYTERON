-- Zyteron Portal · SETUP ALL-IN-ONE (Supabase)
-- Ejecuta este archivo completo en Supabase SQL Editor.
-- Es idempotente: puedes correrlo más de una vez.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A) Validar tabla User
DO $$
BEGIN
  IF to_regclass('public."User"') IS NULL THEN
    RAISE EXCEPTION 'No existe la tabla public."User". Debes crear/usar la base de datos del proyecto Zyteron primero.';
  END IF;
END $$;

-- B) Enums
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'Role'
        AND e.enumlabel = 'SUPERADMIN'
    ) THEN
      ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountStatus') THEN
    CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED', 'PENDING');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthProvider') THEN
    CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');
  END IF;
END $$;

-- Importante: Postgres exige COMMIT para poder usar nuevos valores enum.
COMMIT;

BEGIN;

-- C) Columnas nuevas en User
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "accountStatus" "AccountStatus";
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "authProvider" "AuthProvider";
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMPTZ;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMPTZ;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMPTZ;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;

UPDATE public."User"
SET
  "accountStatus" = COALESCE("accountStatus", 'ACTIVE'::"AccountStatus"),
  "authProvider" = COALESCE("authProvider", 'LOCAL'::"AuthProvider")
WHERE "accountStatus" IS NULL OR "authProvider" IS NULL;

ALTER TABLE public."User" ALTER COLUMN "accountStatus" SET DEFAULT 'ACTIVE'::"AccountStatus";
ALTER TABLE public."User" ALTER COLUMN "authProvider" SET DEFAULT 'LOCAL'::"AuthProvider";
ALTER TABLE public."User" ALTER COLUMN "accountStatus" SET NOT NULL;
ALTER TABLE public."User" ALTER COLUMN "authProvider" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON public."User"("googleId");

-- D) Tablas portal
CREATE TABLE IF NOT EXISTS public."EmailVerificationCode" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 1,
  "lastSentAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."PasswordResetCode" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 1,
  "lastSentAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."ClientDocument" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "uploadedById" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "isPrivate" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."SupportTicket" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "projectId" TEXT REFERENCES public."Project"("id") ON DELETE SET NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "category" TEXT,
  "assignedToId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "resolvedAt" TIMESTAMPTZ,
  "closedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."SupportTicketMessage" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL REFERENCES public."SupportTicket"("id") ON DELETE CASCADE,
  "userId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "authorRole" "Role" NOT NULL,
  "message" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."ClientCredential" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "projectId" TEXT REFERENCES public."Project"("id") ON DELETE SET NULL,
  "serviceName" TEXT NOT NULL,
  "username" TEXT,
  "secretCiphertext" TEXT,
  "secretIv" TEXT,
  "secretTag" TEXT,
  "url" TEXT,
  "notes" TEXT,
  "isSensitive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdById" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "updatedById" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."ClientNotification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'INFO',
  "link" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."ClientCommunication" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
  "channel" TEXT NOT NULL DEFAULT 'PORTAL',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."PortalRequest" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "attachmentName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."ClientAuditLog" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "targetUserId" TEXT REFERENCES public."User"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS explícito en tablas del portal (sin políticas = denegado para anon/authenticated)
ALTER TABLE public."EmailVerificationCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PasswordResetCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ClientDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SupportTicketMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ClientCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ClientNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ClientCommunication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PortalRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ClientAuditLog" ENABLE ROW LEVEL SECURITY;

-- E) Índices
CREATE INDEX IF NOT EXISTS "EmailVerificationCode_userId_email_createdAt_idx"
  ON public."EmailVerificationCode"("userId", "email", "createdAt");
CREATE INDEX IF NOT EXISTS "PasswordResetCode_userId_email_createdAt_idx"
  ON public."PasswordResetCode"("userId", "email", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientDocument_userId_category_createdAt_idx"
  ON public."ClientDocument"("userId", "category", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_status_createdAt_idx"
  ON public."SupportTicket"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_ticketId_createdAt_idx"
  ON public."SupportTicketMessage"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientCredential_userId_createdAt_idx"
  ON public."ClientCredential"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientNotification_userId_isRead_createdAt_idx"
  ON public."ClientNotification"("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientCommunication_userId_createdAt_idx"
  ON public."ClientCommunication"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PortalRequest_userId_type_status_createdAt_idx"
  ON public."PortalRequest"("userId", "type", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientAuditLog_targetUserId_createdAt_idx"
  ON public."ClientAuditLog"("targetUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientAuditLog_actorId_createdAt_idx"
  ON public."ClientAuditLog"("actorId", "createdAt");

-- F) Bootstrap de admins (con columnas ya garantizadas)
INSERT INTO public."User" (
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
  "emailVerifiedAt" = COALESCE(public."User"."emailVerifiedAt", NOW()),
  "updatedAt" = NOW();

INSERT INTO public."User" (
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
  "emailVerifiedAt" = COALESCE(public."User"."emailVerifiedAt", NOW()),
  "updatedAt" = NOW();

COMMIT;
