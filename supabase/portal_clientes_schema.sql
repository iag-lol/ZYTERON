-- Zyteron · Portal de Clientes
-- Ejecutar en Supabase SQL Editor (idempotente)

BEGIN;

-- 1) Enums
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

-- 2) User extensions
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountStatus" "AccountStatus";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProvider" "AuthProvider";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMPTZ;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMPTZ;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMPTZ;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;

UPDATE "User"
SET
  "accountStatus" = COALESCE("accountStatus", 'ACTIVE'::"AccountStatus"),
  "authProvider" = COALESCE("authProvider", 'LOCAL'::"AuthProvider");

ALTER TABLE "User" ALTER COLUMN "accountStatus" SET DEFAULT 'ACTIVE'::"AccountStatus";
ALTER TABLE "User" ALTER COLUMN "authProvider" SET DEFAULT 'LOCAL'::"AuthProvider";
ALTER TABLE "User" ALTER COLUMN "accountStatus" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "authProvider" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

-- 3) Portal tables
CREATE TABLE IF NOT EXISTS "EmailVerificationCode" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 1,
  "lastSentAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PasswordResetCode" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 1,
  "lastSentAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ClientDocument" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "uploadedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "isPrivate" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "projectId" TEXT REFERENCES "Project"("id") ON DELETE SET NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "category" TEXT,
  "assignedToId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "resolvedAt" TIMESTAMPTZ,
  "closedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL REFERENCES "SupportTicket"("id") ON DELETE CASCADE,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "authorRole" "Role" NOT NULL,
  "message" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ClientCredential" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "projectId" TEXT REFERENCES "Project"("id") ON DELETE SET NULL,
  "serviceName" TEXT NOT NULL,
  "username" TEXT,
  "secretCiphertext" TEXT,
  "secretIv" TEXT,
  "secretTag" TEXT,
  "url" TEXT,
  "notes" TEXT,
  "isSensitive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "updatedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ClientNotification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'INFO',
  "link" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ClientCommunication" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
  "channel" TEXT NOT NULL DEFAULT 'PORTAL',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PortalRequest" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "attachmentName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ClientAuditLog" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "targetUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Indexes
CREATE INDEX IF NOT EXISTS "EmailVerificationCode_userId_email_createdAt_idx"
  ON "EmailVerificationCode"("userId", "email", "createdAt");
CREATE INDEX IF NOT EXISTS "PasswordResetCode_userId_email_createdAt_idx"
  ON "PasswordResetCode"("userId", "email", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientDocument_userId_category_createdAt_idx"
  ON "ClientDocument"("userId", "category", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_status_createdAt_idx"
  ON "SupportTicket"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_ticketId_createdAt_idx"
  ON "SupportTicketMessage"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientCredential_userId_createdAt_idx"
  ON "ClientCredential"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientNotification_userId_isRead_createdAt_idx"
  ON "ClientNotification"("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientCommunication_userId_createdAt_idx"
  ON "ClientCommunication"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PortalRequest_userId_type_status_createdAt_idx"
  ON "PortalRequest"("userId", "type", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientAuditLog_targetUserId_createdAt_idx"
  ON "ClientAuditLog"("targetUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientAuditLog_actorId_createdAt_idx"
  ON "ClientAuditLog"("actorId", "createdAt");

COMMIT;

