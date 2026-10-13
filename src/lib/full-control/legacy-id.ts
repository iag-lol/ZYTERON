import { createHash } from "node:crypto";
export function legacyViewId(type: string, id: string) {
  if (/^[0-9a-f-]{36}$/i.test(id)) return id;
  const h = createHash("sha256").update(`zyteron:legacy-view:${type}:${id}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
