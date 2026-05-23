import { type Role, type AccountStatus } from "@prisma/client";
import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      accountStatus: AccountStatus;
      emailVerifiedAt?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    accountStatus?: AccountStatus;
    emailVerifiedAt?: string | null;
  }
}
