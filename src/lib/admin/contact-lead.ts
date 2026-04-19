export type ContactLeadDetails = {
  company?: string;
  service?: string;
  brief?: string;
  submittedFrom?: string;
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
      rawMessage: raw,
    };
  } catch {
    return {
      rawMessage: raw,
      brief: raw,
    };
  }
}
