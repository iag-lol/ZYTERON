import { Temporal } from "@js-temporal/polyfill";

type Row = Record<string, any>;
export function reportingWindow(days: 7 | 28, now = Temporal.Now.instant()) {
  const end = now.toZonedDateTimeISO("America/Santiago").startOfDay();
  const start = end.subtract({ days });
  const previousStart = start.subtract({ days });
  return {
    days,
    timezone: "America/Santiago",
    start: start.toInstant().toString(),
    end: end.toInstant().toString(),
    previousStart: previousStart.toInstant().toString(),
    label: `${start.toPlainDate()} — ${end.subtract({ days: 1 }).toPlainDate()}`,
  };
}
function serviceLine(text: string) {
  if (/sistema|automatiza|intranet|documental|flota|panel/i.test(text))
    return "sistemas_automatizacion";
  if (/soporte|mantenci[oó]n/i.test(text)) return "soporte";
  if (/web|tienda|ecommerce|cat[aá]logo|landing|seo/i.test(text)) return "web_ecommerce";
  return "sin_definir";
}
function leadService(lead?: Row) {
  let context = "";
  const notes = String(lead?.notes || "");
  if (notes.startsWith("contact_v1:")) {
    try {
      const details = JSON.parse(notes.slice("contact_v1:".length).split("\n")[0] || "null");
      context = `${details.service || ""} ${details.projectType || ""}`;
    } catch {
      /* Older free-form notes remain unclassified. */
    }
  }
  return serviceLine(`${lead?.interest || ""} ${context}`);
}
export function summarizeMeasurement(
  data: { leads: Row[]; qualifications: Row[]; quotes: Row[]; sales: Row[]; opportunities: Row[] },
  start: string,
  end: string,
) {
  const inWindow = (date: unknown) =>
    typeof date === "string" &&
    Date.parse(date) >= Date.parse(start) &&
    Date.parse(date) < Date.parse(end);
  const leads = new Map(data.leads.map((row) => [row.id, row]));
  const quotes = new Map(data.quotes.map((row) => [row.id, row]));
  const opportunities = new Map(data.opportunities.map((row) => [row.id, row]));
  const buckets = new Map<
    string,
    {
      serviceLine: string;
      source: string;
      received: number;
      qualified: number;
      proposals: number;
      opportunities: number;
      sales: number;
      salesValue: Record<string, number>;
    }
  >();
  const bucket = (leadId?: string, explicitLine?: string) => {
    const lead = leads.get(leadId || "");
    const line = ["web_ecommerce", "sistemas_automatizacion", "soporte"].includes(
      explicitLine || "",
    )
      ? explicitLine!
      : leadService(lead);
    const source = [lead?.lead_sources]
      .flat()
      .some((item) =>
        ["WEB", "CONTACTO_WEB", "COTIZADOR_WEB", "CHAT_IA", "WEB_ZYTERON"].includes(item?.code),
      )
      ? "web_registrada"
      : "sin_atribucion_web";
    const key = `${line}:${source}`;
    if (!buckets.has(key))
      buckets.set(key, {
        serviceLine: line,
        source,
        received: 0,
        qualified: 0,
        proposals: 0,
        opportunities: 0,
        sales: 0,
        salesValue: {},
      });
    return buckets.get(key)!;
  };
  const seen = new Set<string>();
  for (const lead of leads.values()) if (inWindow(lead.created_at)) bucket(lead.id).received++;
  for (const event of data.qualifications)
    if (inWindow(event.occurred_at) && !seen.has(event.aggregate_id)) {
      seen.add(event.aggregate_id);
      bucket(event.aggregate_id, event.payload?.service_line).qualified++;
    }
  for (const quote of quotes.values())
    if (inWindow(quote.sent_at))
      bucket(quote.lead_id || opportunities.get(quote.opportunity_id)?.lead_id).proposals++;
  for (const opportunity of opportunities.values())
    if (inWindow(opportunity.created_at)) bucket(opportunity.lead_id).opportunities++;
  for (const sale of new Map(data.sales.map((row) => [row.id, row])).values())
    if (sale.status === "WON" && inWindow(sale.closed_at)) {
      const quote = quotes.get(sale.quote_id);
      const target = bucket(
        quote?.lead_id || opportunities.get(sale.opportunity_id || quote?.opportunity_id)?.lead_id,
      );
      target.sales++;
      if (["CLP", "UF", "USD"].includes(sale.currency) && Number.isFinite(Number(sale.amount)))
        target.salesValue[sale.currency] =
          (target.salesValue[sale.currency] || 0) + Number(sale.amount);
    }
  return [...buckets.values()];
}
