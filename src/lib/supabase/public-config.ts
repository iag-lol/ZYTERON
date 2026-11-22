export function publicSupabaseKey(value: string | undefined) {
  const key = value?.trim() || "";
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return key;
  try {
    const role = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString()).role;
    return role === "anon" ? key : "";
  } catch {
    return "";
  }
}
export function publicSupabaseUrl(value: string | undefined) {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}
