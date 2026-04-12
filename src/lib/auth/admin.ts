import { headers } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_KEY = "zyteron_admin_token";
const ADMIN_FALLBACK = "Zyteron!2026";

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
  const pass = process.env.ADMIN_PASSWORD || ADMIN_FALLBACK;
  if (!token || token !== pass) {
    redirect("/admin/login");
  }
}

export { COOKIE_KEY, ADMIN_FALLBACK };
