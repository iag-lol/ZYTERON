import { createSupabaseServerClient } from "./supabase/server";

type Lead = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  message?: string;
  type?: string;
  status?: string;
  createdAt?: string;
};

type Quote = {
  id: string;
  name?: string;
  email?: string;
  total?: number;
  status?: string;
  createdAt?: string;
};

type Visit = {
  id: string;
  clientId?: string;
  date?: string;
  notes?: string;
  status?: string;
};

type Sale = {
  id: string;
  clientId?: string;
  total?: number;
  createdAt?: string;
};

type Client = {
  id: string;
  name: string;
  email?: string;
  company?: string;
  industry?: string;
  tier?: "Basic" | "Pro" | "Enterprise" | string;
};

type ChartPoint = { label: string; value: number };

export type AdminSnapshot = {
  leads: Lead[];
  quotes: Quote[];
  visits: Visit[];
  sales: Sale[];
  clients: Client[];
  metrics: {
    totals: { leads: number; quotes: number; visits: number; sales: number };
    money: { pipelineValue: number; revenue: number; avgTicket: number };
    conversion: { winRate: number; quoteRate: number; visitRate: number };
    lastUpdated: string;
  };
  charts: {
    revenueByMonth: ChartPoint[];
    pipelineConversion: ChartPoint[];
  };
};

async function fetchTable<T>(table: string, select: string): Promise<T[]> {
  const { supabase } = createSupabaseServerClient();
  const { data, error } = await supabase.from(table).select(select);
  if (error) throw error;
  return data ?? [];
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function buildSnapshot(base: { leads: Lead[]; quotes: Quote[]; visits: Visit[]; sales: Sale[]; clients: Client[] }): AdminSnapshot {
  const leads = base.leads ?? [];
  const quotes = base.quotes ?? [];
  const visits = base.visits ?? [];
  const sales = base.sales ?? [];
  const clients = base.clients ?? [];

  const totals = {
    leads: leads.length,
    quotes: quotes.length,
    visits: visits.length,
    sales: sales.length,
  };

  const pipelineValue = quotes.reduce((acc, q) => acc + (typeof q.total === "number" ? q.total : 0), 0);
  const revenue = sales.reduce((acc, s) => acc + (typeof s.total === "number" ? s.total : 0), 0);
  const avgTicket = sales.length ? revenue / sales.length : 0;

  const winRate = totals.quotes ? round(((totals.sales || 0) / totals.quotes) * 100) : 0;
  const quoteRate = totals.leads ? round(((totals.quotes || 0) / totals.leads) * 100) : 0;
  const visitRate = totals.quotes ? round(((totals.visits || 0) / totals.quotes) * 100) : 0;

  const money = { pipelineValue, revenue, avgTicket: round(avgTicket) };
  const conversion = { winRate, quoteRate, visitRate };

  const lastUpdated = new Date().toISOString();

  const revenueByMonth = buildRevenueSeries(sales);
  const pipelineConversion: ChartPoint[] = [
    { label: "Leads", value: 100 },
    { label: "Cotizaciones", value: quoteRate || 1 },
    { label: "Visitas", value: visitRate || 1 },
    { label: "Ventas", value: winRate || 1 },
  ];

  return {
    leads,
    quotes,
    visits,
    sales,
    clients,
    metrics: { totals, money, conversion, lastUpdated },
    charts: { revenueByMonth, pipelineConversion },
  };
}

function buildRevenueSeries(sales: Sale[]): ChartPoint[] {
  type Bucket = { key: string; label: string; value: number };
  const now = new Date();
  const buckets: Bucket[] = [];

  for (let i = 5; i >= 0; i--) {
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
    const slot = buckets.find((b) => b.key === key);
    if (slot) slot.value += sale.total;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  try {
    const [leads, quotes, visits, sales, clients] = await Promise.all([
      fetchTable<Lead>("Lead", "id, name, email, phone, source, message, type, createdAt"),
      fetchTable<Quote>("Quote", "id, name, email, total, status, createdAt"),
      fetchTable<Visit>("Visit", "id, clientId, date, notes, status"),
      fetchTable<Sale>("Sale", "id, clientId, total, createdAt"),
      fetchTable<Client>("User", "id, name, email, company"),
    ]);

    return buildSnapshot({ leads, quotes, visits, sales, clients });
  } catch (error) {
    // No datos si Supabase falla: devolver estructuras vacías sin datos ficticios
    const empty: AdminSnapshot = {
      leads: [],
      quotes: [],
      visits: [],
      sales: [],
      clients: [],
      metrics: {
        totals: { leads: 0, quotes: 0, visits: 0, sales: 0 },
        money: { pipelineValue: 0, revenue: 0, avgTicket: 0 },
        conversion: { winRate: 0, quoteRate: 0, visitRate: 0 },
        lastUpdated: new Date().toISOString(),
      },
      charts: { revenueByMonth: buildRevenueSeries([]), pipelineConversion: [] },
    };
    return empty;
  }
}

export { Lead, Quote, Visit, Sale, Client };
