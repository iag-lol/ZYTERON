import NextAuth from "next-auth";
import { portalAuthOptions } from "@/lib/auth/portal-auth";

const handler = NextAuth(portalAuthOptions);

export { handler as GET, handler as POST };

