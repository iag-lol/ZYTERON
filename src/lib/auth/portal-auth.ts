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

function splitName(fullName: string) {
  const clean = String(fullName || "").trim();
  if (!clean) return { firstName: "", lastName: "" };
  const parts = clean.split(/\s+/).filter(Boolean);
  const [firstName = "", ...rest] = parts;
  return { firstName, lastName: rest.join(" ") };
}

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  accountStatus: AccountStatus;
  emailVerifiedAt: string | null;
};

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
      firstName: true,
      lastName: true,
    },
  });

  if (!existing) {
    const { firstName, lastName } = splitName(params.name);
    const created = await prisma.user.create({
      data: {
        email,
        name: params.name || email,
        firstName: firstName || null,
        lastName: lastName || null,
        passwordHash: await hash(randomUUID(), 12),
        role: Role.CLIENT,
        accountStatus: AccountStatus.ACTIVE,
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
    return created;
  }

  const patch: Record<string, unknown> = {
    authProvider: AuthProvider.GOOGLE,
    lastLoginAt: now,
  };
  if (params.googleId) patch.googleId = params.googleId;
  if (!existing.emailVerifiedAt && params.isVerifiedByGoogle) {
    patch.emailVerifiedAt = now;
  }
  if (!existing.name && params.name) patch.name = params.name;
  await prisma.user.update({ where: { id: existing.id }, data: patch });

  return {
    id: existing.id,
    email,
    name: existing.name || params.name || email,
    role: existing.role,
    accountStatus: existing.accountStatus,
    emailVerifiedAt: existing.emailVerifiedAt,
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

        const ok = await compare(password, user.passwordHash);
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

      const ensured = await ensureGoogleUser({
        email,
        name: user.name || email,
        googleId: account.providerAccountId,
        isVerifiedByGoogle:
          Boolean((profile as { email_verified?: boolean } | undefined)?.email_verified) || true,
      });

      user.id = ensured.id;
      user.name = ensured.name;
      user.email = ensured.email;
      return ensured.accountStatus === AccountStatus.ACTIVE;
    },
    async jwt({ token, user }) {
      const email = normalizeEmail(user?.email || token.email);
      if (!email) return token;

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
