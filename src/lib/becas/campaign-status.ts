type Campaign = { status: string; starts_at?: string | null; ends_at?: string | null };

export function campaignPublicStatus(campaign: Campaign, now = new Date()) {
  if (campaign.status !== "active") return campaign.status;
  const start = Date.parse(campaign.starts_at || "");
  const end = Date.parse(campaign.ends_at || "");
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "unconfirmed";
  if (now.getTime() < start) return "scheduled";
  if (now.getTime() >= end) return "closed";
  return "active";
}

export function campaignApplicationsOpen(campaign: Campaign, now = new Date()) {
  return campaignPublicStatus(campaign, now) === "active";
}

export function displayChileDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Por definir";
  const parts = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("day")}-${part("month")}-${part("year")}`;
}

export function displayChileTime(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Por definir";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}
