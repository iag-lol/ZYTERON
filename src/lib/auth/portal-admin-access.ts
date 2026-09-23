const ADMIN_ROLES = new Set(["ADMIN", "SUPERADMIN"]);

export function isActiveVerifiedPortalAdmin(user: {
  role?: string | null;
  accountStatus?: string | null;
  emailVerifiedAt?: Date | string | null;
}) {
  return (
    ADMIN_ROLES.has(String(user.role || "").toUpperCase()) &&
    user.accountStatus === "ACTIVE" &&
    Boolean(user.emailVerifiedAt)
  );
}
