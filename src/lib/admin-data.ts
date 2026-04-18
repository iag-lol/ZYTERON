import {
  getClients,
  getProjects,
  getQuotes,
  getRequests,
  getSales,
  getTaxDocuments,
  getVisits,
  type Client,
  type ClientRequest,
  type EnrichedQuote,
  type Lead,
  type Project,
  type Sale,
  type TaxDocument,
  type Visit,
} from "@/lib/admin/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ChartPoint = { label: string; value: number };

export type AdminSnapshot = {
  leads: Lead[];
  quotes: EnrichedQuote[];
  visits: Visit[];
  sales: Sale[];
  clients: Client[];
  projects: Project[];
  requests: ClientRequest[];
  taxDocuments: TaxDocument[];
  metrics: {
    totals: {
      leads: number;
      quotes: number;
      visits: number;
      sales: number;
      projects: number;
      requests: number;
      taxDocuments: number;
    };
    money: { pipelineValue: number; revenue: number; avgTicket: number };
    conversion: { winRate: number; quoteRate: number; visitRate: number };
    lastUpdated: string;
  };
  charts: {
    revenueByMonth: ChartPoint[];
    pipelineConversion: ChartPoint[];
  };
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

async function fetchLeads(): Promise<Lead[]> {
  try {
    const { supabase } = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("Lead")
      .select("id, name, email, phone, source, message, type, createdAt")
      .order("createdAt", { ascending: false });

    if (error) {
      const relationMissing =
        error.message.includes("Could not find the table") ||
        error.message.includes("relation");
      if (relationMissing) {
        return [];
      }
      throw error;
    }

    return (data ?? []) as Lead[];
  } catch {
    return [];
  }
}

function buildRevenueSeries(sales: Sale[]): ChartPoint[] {
  type Bucket = { key: string; label: string; value: number };
  const now = new Date();
  const buckets: Bucket[] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("es-CL", { month: "short" }),
      value: 0,
    });
  }

  for (const sale of sales) {
    if (!sale.createdAt || typeof sale.total !== "number") continue;
    const d = new Date(sale.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const slot = buckets.find((bucket) => bucket.key === key);
    if (slot) {
      slot.value += sale.total;
    }
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

function buildSnapshot(base: {
  leads: Lead[];
  quotes: EnrichedQuote[];
  visits: Visit[];
  sales: Sale[];
  clients: Client[];
  projects: Project[];
  requests: ClientRequest[];
  taxDocuments: TaxDocument[];
}): AdminSnapshot {
  const leads = base.leads ?? [];
  const quotes = base.quotes ?? [];
  const visits = base.visits ?? [];
  const sales = base.sales ?? [];
  const clients = base.clients ?? [];
  const projects = base.projects ?? [];
  const requests = base.requests ?? [];
  const taxDocuments = base.taxDocuments ?? [];

  const totals = {
    leads: leads.length,
    quotes: quotes.length,
    visits: visits.length,
    sales: sales.length,
    projects: projects.length,
    requests: requests.length,
    taxDocuments: taxDocuments.length,
  };

  const pipelineValue = quotes.reduce((acc, quote) => acc + (quote.totalAmount || 0), 0);
  const revenue = sales.reduce((acc, sale) => acc + (typeof sale.total === "number" ? sale.total : 0), 0);
  const avgTicket = sales.length ? revenue / sales.length : 0;
  const winRate = totals.quotes ? round((totals.sales / totals.quotes) * 100) : 0;
  const quoteRate = totals.leads ? round((totals.quotes / totals.leads) * 100) : 0;
  const visitRate = totals.quotes ? round((totals.visits / totals.quotes) * 100) : 0;

  return {
    leads,
    quotes,
    visits,
    sales,
    clients,
    projects,
    requests,
    taxDocuments,
    metrics: {
      totals,
      money: {
        pipelineValue,
        revenue,
        avgTicket: round(avgTicket),
      },
      conversion: {
        winRate,
        quoteRate,
        visitRate,
      },
      lastUpdated: new Date().toISOString(),
    },
    charts: {
      revenueByMonth: buildRevenueSeries(sales),
      pipelineConversion: [
        { label: "Leads", value: 100 },
        { label: "Cotizaciones", value: quoteRate || 1 },
        { label: "Visitas", value: visitRate || 1 },
        { label: "Ventas", value: winRate || 1 },
      ],
    },
  };
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  try {
    const [leads, quotes, visits, sales, clients, projects, requests, taxDocuments] =
      await Promise.all([
        fetchLeads(),
        getQuotes(),
        getVisits(),
        getSales(),
        getClients(),
        getProjects(),
        getRequests(),
        getTaxDocuments(),
      ]);

    return buildSnapshot({
      leads,
      quotes,
      visits,
      sales,
      clients,
      projects,
      requests,
      taxDocuments,
    });
  } catch {
    return buildSnapshot({
      leads: [],
      quotes: [],
      visits: [],
      sales: [],
      clients: [],
      projects: [],
      requests: [],
      taxDocuments: [],
    });
  }
}

export type { Client, ClientRequest, EnrichedQuote as Quote, Lead, Project, Sale, TaxDocument, Visit };
