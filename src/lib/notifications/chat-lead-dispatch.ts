import { sendLeadAlertEmail } from "./lead-alert";
export type ChatLeadPayload = {
  leadId: string;
  name: string;
  contact: string;
  email: string | null;
  phone: string | null;
  company?: string | null;
  industry?: string | null;
  deadline?: string | null;
  projectType: string;
  summary: string;
  budget?: string | null;
  isQuote: boolean;
  createdAtIso: string;
};
export type DispatchReport = {
  email: "queued" | "failed";
  whatsapp: "queued" | "failed";
  detail: Record<string, string>;
};
export async function dispatchChatLeadAlert(p: ChatLeadPayload): Promise<DispatchReport> {
  try {
    await sendLeadAlertEmail({
      leadId: p.leadId,
      source: "CHAT_IA",
      submittedAtIso: p.createdAtIso,
      name: p.name,
      email: p.email || "",
      phone: p.phone,
      company: p.company,
      industry: p.industry,
      deadline: p.deadline,
      service: p.projectType,
      message: p.summary,
      budget: p.budget,
    });
    return { email: "queued", whatsapp: "queued", detail: { queue: "durable" } };
  } catch {
    return { email: "failed", whatsapp: "failed", detail: { queue: "unavailable" } };
  }
}
