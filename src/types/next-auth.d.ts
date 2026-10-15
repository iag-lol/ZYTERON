import { type Role, type AccountStatus } from "@prisma/client";
import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      accountStatus: AccountStatus;
      emailVerifiedAt?: string | null;
      credentialSessionId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionVersion?: number;
    credentialSessionId?: string;
    role?: Role;
    accountStatus?: AccountStatus;
    emailVerifiedAt?: string | null;
  }
}
