import { compare, hash } from "bcrypt";
import { randomUUID } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { AccountStatus, AuthProvider, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isEnabled(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

const GOOGLE_AUTO_SIGNUP_ENABLED = isEnabled(process.env.PORTAL_GOOGLE_AUTO_SIGNUP);

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  accountStatus: AccountStatus;
  emailVerifiedAt: string | null;
};

function getPrismaErrorCode(error: unknown) {
  if (typeof error !== "object" || !error || !("code" in error)) return "";
  return String((error as { code?: string }).code || "");
}

function isSchemaOutOfSyncPrismaError(error: unknown) {
  const code = getPrismaErrorCode(error);
  if (code === "P2021" || code === "P2022") return true;
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("Invalid `prisma.") &&
    (message.includes("does not exist in the current database") || message.includes("column"))
  );
}

function isDbConnectionPrismaError(error: unknown) {
  const code = getPrismaErrorCode(error);
  if (code === "P1000" || code === "P1001" || code === "P1002") return true;
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("DATABASE_URL") ||
    message.includes("Can't reach database server") ||
    message.includes("connect ECONNREFUSED") ||
    message.includes("timeout") ||
    message.includes("Falta DATABASE_URL")
  );
}

async function ensureGoogleUser(params: {
  email: string;
  name: string;
  googleId?: string | null;
  isVerifiedByGoogle?: boolean;
}) {
  const email = normalizeEmail(params.email);
  const now = new Date();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      role: true,
      accountStatus: true,
      emailVerifiedAt: true,
      googleId: true,
    },
  });

  if (!existing) {
    if (!GOOGLE_AUTO_SIGNUP_ENABLED) {
      return { status: "not_registered" as const };
    }
    const created = await prisma.user.create({
      data: {
        email,
        name: params.name || email,
        passwordHash: await hash(randomUUID(), 12),
        role: Role.CLIENT,
        accountStatus: params.isVerifiedByGoogle ? AccountStatus.ACTIVE : AccountStatus.PENDING,
        authProvider: AuthProvider.GOOGLE,
        emailVerifiedAt: params.isVerifiedByGoogle ? now : null,
        googleId: params.googleId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountStatus: true,
        emailVerifiedAt: true,
      },
    });
    return { status: "ok" as const, user: created };
  }

  if (existing.accountStatus !== AccountStatus.ACTIVE) {
    return { status: "not_active" as const };
  }
  if (!existing.emailVerifiedAt) {
    return { status: "not_verified" as const };
  }

  const patch: Record<string, unknown> = {
    lastLoginAt: now,
  };
  if (params.googleId && !existing.googleId) patch.googleId = params.googleId;
  if (!existing.name && params.name) patch.name = params.name;
  await prisma.user.update({ where: { id: existing.id }, data: patch });

  return {
    status: "ok" as const,
    user: {
      id: existing.id,
      email,
      name: existing.name || params.name || email,
      role: existing.role,
      accountStatus: existing.accountStatus,
      emailVerifiedAt: existing.emailVerifiedAt,
    },
  };
}

export const portalAuthOptions: NextAuthOptions = {
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
  },
  pages: {
    signIn: "/portal-clientes/login",
    error: "/portal-clientes/login",
  },
  providers: (() => {
    const providers: NextAuthOptions["providers"] = [
      CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email);
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            accountStatus: true,
            emailVerifiedAt: true,
            passwordHash: true,
          },
        });
        if (!user) return null;
        if (user.accountStatus !== AccountStatus.ACTIVE) return null;
        if (!user.emailVerifiedAt) return null;
        if (!user.passwordHash || user.passwordHash.length < 20) return null;

        let ok = false;
        try {
          ok = await compare(password, user.passwordHash);
        } catch (error) {
          console.error("[portal/auth/credentials] Error al comparar password hash.", error);
          ok = false;
        }
        if (!ok) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountStatus: user.accountStatus,
          emailVerifiedAt: user.emailVerifiedAt.toISOString(),
        } as AuthUser;
      },
      }),
    ];
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push(
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      );
    }
    return providers;
  })(),
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      const email = normalizeEmail(user.email);
      if (!email) return false;
      const googleEmailVerified = Boolean(
        (profile as { email_verified?: boolean } | undefined)?.email_verified,
      );
      if (!googleEmailVerified) {
        return "/portal-clientes/login?error=google_email_not_verified";
      }

      try {
        const resolution = await ensureGoogleUser({
          email,
          name: user.name || email,
          googleId: account.providerAccountId,
          isVerifiedByGoogle: googleEmailVerified,
        });
        if (resolution.status === "not_registered") {
          return "/portal-clientes/login?error=google_not_registered";
        }
        if (resolution.status === "not_active") {
          return "/portal-clientes/login?error=account_not_active";
        }
        if (resolution.status === "not_verified") {
          return "/portal-clientes/login?error=email_not_verified";
        }
        const ensured = resolution.user;

        user.id = ensured.id;
        user.name = ensured.name;
        user.email = ensured.email;
        return true;
      } catch (error) {
        if (isDbConnectionPrismaError(error)) {
          console.error(
            "[portal/auth/google] Conexión a base de datos fallida. Verifica DATABASE_URL en Render.",
            error,
          );
          return "/portal-clientes/login?error=portal_db_connection";
        }
        if (isSchemaOutOfSyncPrismaError(error)) {
          console.error(
            "[portal/auth/google] Esquema desalineado en base de datos. Ejecuta portal_setup_all_in_one.sql.",
            error,
          );
          return "/portal-clientes/login?error=portal_schema";
        }
        console.error("[portal/auth/google] Error en alta/inicio de usuario Google.", error);
        return "/portal-clientes/login?error=google_auth_failed";
      }
    },
    async jwt({ token, user }) {
      const email = normalizeEmail(user?.email || token.email);
      if (!email) return token;

      try {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            role: true,
            accountStatus: true,
            emailVerifiedAt: true,
          },
        });
        if (!dbUser) return token;

        token.sub = dbUser.id;
        token.role = dbUser.role;
        token.accountStatus = dbUser.accountStatus;
        token.emailVerifiedAt = dbUser.emailVerifiedAt ? dbUser.emailVerifiedAt.toISOString() : null;
        return token;
      } catch (error) {
        if (isDbConnectionPrismaError(error)) {
          console.error(
            "[portal/auth/jwt] Conexión a base de datos fallida. Verifica DATABASE_URL en Render.",
            error,
          );
        } else if (isSchemaOutOfSyncPrismaError(error)) {
          console.error(
            "[portal/auth/jwt] Esquema desalineado en base de datos. Ejecuta portal_setup_all_in_one.sql.",
            error,
          );
        } else {
          console.error("[portal/auth/jwt] Error resolviendo usuario para token.", error);
        }
        return token;
      }
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub || "");
        session.user.role = (token.role as Role | undefined) || Role.CLIENT;
        session.user.accountStatus =
          (token.accountStatus as AccountStatus | undefined) || AccountStatus.ACTIVE;
        session.user.emailVerifiedAt = (token.emailVerifiedAt as string | null | undefined) || null;
      }
      return session;
    },
  },
};
