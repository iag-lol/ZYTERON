export type ContactLeadDetails = {
  company?: string;
  service?: string;
  brief?: string;
  submittedFrom?: string;
  selectedPlan?: string;
  selectedExtras?: string[];
  cartLines?: string[];
  cartTotal?: number;
};

type ParsedContactLead = ContactLeadDetails & {
  rawMessage: string;
};

const CONTACT_LEAD_PREFIX = "contact_v1:";

function cleanText(value?: string | null) {
  if (!value) return "";
  return value.trim();
}

export function serializeContactLeadDetails(details: ContactLeadDetails) {
  const payload = {
    company: cleanText(details.company) || undefined,
    service: cleanText(details.service) || undefined,
    brief: cleanText(details.brief) || undefined,
    submittedFrom: cleanText(details.submittedFrom) || undefined,
    selectedPlan: cleanText(details.selectedPlan) || undefined,
    selectedExtras: Array.isArray(details.selectedExtras)
      ? details.selectedExtras.map((item) => cleanText(item)).filter(Boolean)
      : undefined,
    cartLines: Array.isArray(details.cartLines)
      ? details.cartLines.map((item) => cleanText(item)).filter(Boolean)
      : undefined,
    cartTotal:
      typeof details.cartTotal === "number" && Number.isFinite(details.cartTotal)
        ? Math.max(0, Math.round(details.cartTotal))
        : undefined,
  };

  return `${CONTACT_LEAD_PREFIX}${JSON.stringify(payload)}`;
}

export function parseContactLeadDetails(message?: string | null): ParsedContactLead {
  const raw = cleanText(message);

  if (!raw) {
    return { rawMessage: "" };
  }

  if (!raw.startsWith(CONTACT_LEAD_PREFIX)) {
    return {
      rawMessage: raw,
      brief: raw,
    };
  }

  try {
    const parsed = JSON.parse(raw.slice(CONTACT_LEAD_PREFIX.length)) as ContactLeadDetails;
    return {
      company: cleanText(parsed.company) || undefined,
      service: cleanText(parsed.service) || undefined,
      brief: cleanText(parsed.brief) || undefined,
      submittedFrom: cleanText(parsed.submittedFrom) || undefined,
      selectedPlan: cleanText(parsed.selectedPlan) || undefined,
      selectedExtras: Array.isArray(parsed.selectedExtras)
        ? parsed.selectedExtras.map((item) => cleanText(item)).filter(Boolean)
        : undefined,
      cartLines: Array.isArray(parsed.cartLines)
        ? parsed.cartLines.map((item) => cleanText(item)).filter(Boolean)
        : undefined,
      cartTotal:
        typeof parsed.cartTotal === "number" && Number.isFinite(parsed.cartTotal)
          ? Math.max(0, Math.round(parsed.cartTotal))
          : undefined,
      rawMessage: raw,
    };
  } catch {
    return {
      rawMessage: raw,
      brief: raw,
    };
  }
}
