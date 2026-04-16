import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_VALUE, COOKIE_KEY } from "@/lib/auth/admin-constants";

function parseCookieString(raw: string) {
  return raw.split(";").reduce<Record<string, string>>((acc, part) => {
    const [k, ...rest] = part.trim().split("=");
    if (!k) return acc;
    acc[k] = rest.join("=");
    return acc;
  }, {});
}

export async function assertAdmin() {
  const hdrs = await headers();
  const raw = hdrs.get("cookie") ?? "";
  const parsed = parseCookieString(raw);
  const token = parsed[COOKIE_KEY];
  if (!token || token !== ADMIN_SESSION_VALUE) {
    redirect("/admin/login");
  }
}
