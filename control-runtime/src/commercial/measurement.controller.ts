import { Controller, Get, Query, ServiceUnavailableException } from "@nestjs/common";
import { RequireRoles } from "../auth/roles.decorator.js";
import { createServerSupabase } from "../domain/server-supabase.js";
import { reportingWindow, summarizeMeasurement } from "./measurement-report.js";

@Controller("commercial")
export class MeasurementController {
  @Get("measurement")
  @RequireRoles("GERENTE_GENERAL", "JEFE_VENTAS", "COMERCIAL")
  async report(@Query("days") value?: string) {
    const db = createServerSupabase();
    if (!db) throw new ServiceUnavailableException("La medición necesita conexión al CRM.");
    const window = reportingWindow(value === "28" ? 28 : 7);
    const rows = async (table: string, columns: string, filter: (query: any) => any) => {
      const result: Record<string, any>[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await filter(db.from(table).select(columns))
          .order("id")
          .range(offset, offset + 499);
        if (error)
          throw new ServiceUnavailableException("No fue posible consultar la medición comercial.");
        result.push(...(data || []));
        if (!data || data.length < 500) return result;
      }
    };
    const period = (field: string) => (query: any) =>
      query.gte(field, window.previousStart).lt(field, window.end);
    const leadColumns = "id,created_at,interest,notes,lead_sources(code)";
    const quoteColumns = "id,lead_id,opportunity_id,sent_at";
    const opportunityColumns = "id,lead_id,created_at";
    const [leads, qualifications, quotes, sales, opportunities] = await Promise.all([
      rows("leads", leadColumns, period("created_at")),
      rows("commercial_events", "id,aggregate_id,occurred_at,payload", (query) =>
        period("occurred_at")(query).eq("event_type", "LEAD_QUALIFIED"),
      ),
      rows("quotes", quoteColumns, period("sent_at")),
      rows(
        "sales",
        "id,quote_id,opportunity_id,amount,currency,status,closed_at",
        period("closed_at"),
      ),
      rows("opportunities", opportunityColumns, period("created_at")),
    ]);
    const supplement = async (
      target: Record<string, any>[],
      table: string,
      columns: string,
      ids: unknown[],
    ) => {
      const present = new Set(target.map((row) => row.id));
      const missing = [
        ...new Set(ids.filter((id): id is string => typeof id === "string" && !present.has(id))),
      ];
      for (let i = 0; i < missing.length; i += 100)
        target.push(
          ...(await rows(table, columns, (query) => query.in("id", missing.slice(i, i + 100)))),
        );
    };
    await supplement(
      quotes,
      "quotes",
      quoteColumns,
      sales.map((row) => row.quote_id),
    );
    await supplement(
      opportunities,
      "opportunities",
      opportunityColumns,
      [...sales, ...quotes].map((row) => row.opportunity_id),
    );
    await supplement(leads, "leads", leadColumns, [
      ...qualifications.map((row) => row.aggregate_id),
      ...quotes.map((row) => row.lead_id),
      ...opportunities.map((row) => row.lead_id),
    ]);
    const data = { leads, qualifications, quotes, sales, opportunities };
    return {
      window,
      current: summarizeMeasurement(data, window.start, window.end),
      previous: summarizeMeasurement(data, window.previousStart, window.start),
      unavailable: [
        "sesiones_elegibles",
        "clics_organicos_no_marca",
        "margen",
        "primera_respuesta",
      ],
      annotations: ["23-09-2026", "02-11-2026"],
      note: "Conteos por fecha de cada etapa; no representan una tasa de conversión de cohortes. Fuente WEB registrada en CRM; no implica atribución orgánica. Ventas WON únicas por ID y moneda. La aceptación de una propuesta no se cuenta como venta.",
    };
  }
}
