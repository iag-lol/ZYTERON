export type ContactLeadDetails = {
  company?: string;
  service?: string;
  brief?: string;
  submittedFrom?: string;
  projectType?: string;
  budget?: string;
  expectedDate?: string;
  needDomain?: string;
  needHosting?: string;
  needPayments?: string;
  needAdminPanel?: string;
  needCustomSystem?: string;
  needTaxDocument?: string;
  projectFor?: string;
  needType?: string;
  featureList?: string[];
  pageCount?: string;
  contentReady?: string;
  domainHosting?: string;
  taxDocument?: string;
  budgetRange?: string;
  recommendedPlan?: string;
  estimatedFrom?: string;
  estimatedRange?: string;
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
    projectType: cleanText(details.projectType) || undefined,
    budget: cleanText(details.budget) || undefined,
    expectedDate: cleanText(details.expectedDate) || undefined,
    needDomain: cleanText(details.needDomain) || undefined,
    needHosting: cleanText(details.needHosting) || undefined,
    needPayments: cleanText(details.needPayments) || undefined,
    needAdminPanel: cleanText(details.needAdminPanel) || undefined,
    needCustomSystem: cleanText(details.needCustomSystem) || undefined,
    needTaxDocument: cleanText(details.needTaxDocument) || undefined,
    projectFor: cleanText(details.projectFor) || undefined,
    needType: cleanText(details.needType) || undefined,
    featureList: Array.isArray(details.featureList)
      ? details.featureList.map((item) => cleanText(item)).filter(Boolean)
      : undefined,
    pageCount: cleanText(details.pageCount) || undefined,
    contentReady: cleanText(details.contentReady) || undefined,
    domainHosting: cleanText(details.domainHosting) || undefined,
    taxDocument: cleanText(details.taxDocument) || undefined,
    budgetRange: cleanText(details.budgetRange) || undefined,
    recommendedPlan: cleanText(details.recommendedPlan) || undefined,
    estimatedFrom: cleanText(details.estimatedFrom) || undefined,
    estimatedRange: cleanText(details.estimatedRange) || undefined,
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
      projectType: cleanText(parsed.projectType) || undefined,
      budget: cleanText(parsed.budget) || undefined,
      expectedDate: cleanText(parsed.expectedDate) || undefined,
      needDomain: cleanText(parsed.needDomain) || undefined,
      needHosting: cleanText(parsed.needHosting) || undefined,
      needPayments: cleanText(parsed.needPayments) || undefined,
      needAdminPanel: cleanText(parsed.needAdminPanel) || undefined,
      needCustomSystem: cleanText(parsed.needCustomSystem) || undefined,
      needTaxDocument: cleanText(parsed.needTaxDocument) || undefined,
      projectFor: cleanText(parsed.projectFor) || undefined,
      needType: cleanText(parsed.needType) || undefined,
      featureList: Array.isArray(parsed.featureList)
        ? parsed.featureList.map((item) => cleanText(item)).filter(Boolean)
        : undefined,
      pageCount: cleanText(parsed.pageCount) || undefined,
      contentReady: cleanText(parsed.contentReady) || undefined,
      domainHosting: cleanText(parsed.domainHosting) || undefined,
      taxDocument: cleanText(parsed.taxDocument) || undefined,
      budgetRange: cleanText(parsed.budgetRange) || undefined,
      recommendedPlan: cleanText(parsed.recommendedPlan) || undefined,
      estimatedFrom: cleanText(parsed.estimatedFrom) || undefined,
      estimatedRange: cleanText(parsed.estimatedRange) || undefined,
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
