import { roles } from "@zyteron/contracts";
import { normalizeUserRut } from "../../full-control/lib/user-rut";

type AuthUser = {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
  banned_until?: string;
};
export type TeamAuthDependencies = {
  lookupRut: (rut: string) => Promise<string | null>;
  user: (id: string) => Promise<AuthUser | null>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ user: AuthUser; access_token: string; refresh_token: string } | null>;
  recover: (email: string) => Promise<void>;
};
export type TeamAuthResult = {
  status: number;
  body: {
    error?: string;
    message?: string;
    session?: { access_token: string; refresh_token: string };
  };
};
const enabled = (user: AuthUser | null): user is AuthUser =>
  Boolean(
    user?.email &&
    roles.includes(user.app_metadata.role as (typeof roles)[number]) &&
    user.app_metadata.role !== "PORTAL_CLIENT" &&
    (!user.banned_until || new Date(user.banned_until) <= new Date()),
  );
const denied = (): TeamAuthResult => ({
  status: 401,
  body: { error: "RUT o contraseña incorrectos." },
});
export async function teamAuthenticate(
  input: unknown,
  deps: TeamAuthDependencies,
): Promise<TeamAuthResult> {
  if (!input || typeof input !== "object") return denied();
  const value = input as Record<string, unknown>,
    rut = normalizeUserRut(value.rut),
    recover = value.action === "recover";
  const recoveryResult: TeamAuthResult = {
    status: 200,
    body: {
      message: "Si el RUT está registrado, recibirás instrucciones en el correo de esa cuenta.",
    },
  };
  if (!rut) return recover ? recoveryResult : denied();
  if (
    !recover &&
    (typeof value.password !== "string" || !value.password || value.password.length > 1024)
  )
    return denied();
  const id = await deps.lookupRut(rut),
    user = id ? await deps.user(id) : null;
  if (recover) {
    if (enabled(user)) await deps.recover(user.email!);
    return recoveryResult;
  }
  if (!enabled(user)) return denied();
  const session = await deps.signIn(user.email!, value.password as string);
  if (!session || session.user.id !== user.id || !enabled(session.user)) return denied();
  return {
    status: 200,
    body: { session: { access_token: session.access_token, refresh_token: session.refresh_token } },
  };
}
