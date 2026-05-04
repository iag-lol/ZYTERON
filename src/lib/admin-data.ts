import {
  getClients,
  getProjects,
  getQuotes,
  getRequests,
  getSales,
  safeSelect,
  syncWonQuotesCrossModules,
  getTaxDocuments,
  getVisits,
  getWebVisits,
  type Client,
  type ClientRequest,
  type EnrichedQuote,
  type Lead,
  type Project,
  type Sale,
  type TaxDocument,
  type Visit,
  type WebVisit,
} from "@/lib/admin/repository";

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
  webVisits: WebVisit[];
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
    conversion: {
      winRate: number;
      quoteRate: number;
      visitRate: number;
      leadBase: number;
      leadBaseEstimated: boolean;
    };
    web: {
      totalVisits: number;
      todayVisits: number;
      uniqueIps: number;
      uniqueSessions: number;
      revenuePerVisit: number;
      estimated: boolean;
      topPaths: { path: string; visits: number; uniqueIps: number }[];
      recentNavigations: {
        path: string;
        createdAt: string | null;
        ip: string | null;
        ipHash: string | null;
        sessionId: string | null;
      }[];
    };
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

function isWonStatus(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized === "WON" || normalized === "GANADA" || normalized === "GANADO" || normalized.includes("WON");
}

function isValidDate(value?: string | null) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

async function fetchLeads(): Promise<Lead[]> {
  return safeSelect<Lead>("Lead", "id, name, email, phone, source, message, type, createdAt", {
    orderBy: "createdAt",
  });
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
  webVisits: WebVisit[];
}): AdminSnapshot {
  const rawLeads = base.leads ?? [];
  const quotes = base.quotes ?? [];
  const visits = base.visits ?? [];
  const rawSales = base.sales ?? [];
  const clients = base.clients ?? [];
  const projects = base.projects ?? [];
  const requests = base.requests ?? [];
  const taxDocuments = base.taxDocuments ?? [];
  const rawWebVisits = base.webVisits ?? [];

  const leads: Lead[] =
    rawLeads.length > 0
      ? rawLeads
      : quotes.map((quote) => ({
          id: `quote-${quote.id}`,
          name: quote.name || "Contacto desde cotización",
          email: quote.email || "",
          phone: quote.phone || "",
          source: "QUOTE_FALLBACK",
          message: quote.meta?.serviceSummary || quote.meta?.brief || null,
          type: "CONTACT",
          status: quote.status || "PENDING",
          createdAt: quote.createdAt || null,
        }));

  const wonQuotes = quotes.filter((quote) => isWonStatus(quote.status));
  const sales: Sale[] =
    rawSales.length > 0
      ? rawSales
      : wonQuotes.map((quote) => ({
          id: `quote-sale-${quote.id}`,
          clientId: quote.userId || null,
          total: quote.totalAmount || 0,
          createdAt: quote.createdAt || null,
          description: `Ingreso estimado desde cotización ${quote.displayNumber || quote.id}`,
          paymentMethod: "Estimado",
          invoiceRef: `QUOTE:${quote.id}`,
        }));

  const webVisits: WebVisit[] = rawWebVisits;
  const usingWebFallback = webVisits.length === 0;

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
  const leadBase =
    totals.leads > 0
      ? totals.leads
      : totals.quotes > 0
        ? totals.quotes
        : totals.visits > 0
          ? totals.visits
          : totals.sales;
  const leadBaseEstimated = totals.leads === 0 && leadBase > 0;
  const winRate = totals.quotes ? round((totals.sales / totals.quotes) * 100) : 0;
  const quoteRate = leadBase ? round((totals.quotes / leadBase) * 100) : 0;
  const visitRate = totals.quotes ? round((totals.visits / totals.quotes) * 100) : 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const fallbackVisitCandidates = [...leads, ...quotes]
    .map((item) => String(item.createdAt || "").trim())
    .filter((value) => isValidDate(value));

  const totalVisits = usingWebFallback ? fallbackVisitCandidates.length : webVisits.length;

  const todayVisits = usingWebFallback
    ? fallbackVisitCandidates.filter((value) => new Date(value).getTime() >= todayStart).length
    : webVisits.filter((visit) => {
        if (!visit.createdAt) return false;
        const ts = new Date(visit.createdAt).getTime();
        return !Number.isNaN(ts) && ts >= todayStart;
      }).length;

  const uniqueIps = usingWebFallback
    ? 0
    : new Set(
        webVisits
          .map((visit) => String(visit.ipHash || visit.ip || "").trim())
          .filter(Boolean),
      ).size;

  const uniqueSessions = usingWebFallback
    ? totalVisits
    : new Set(
        webVisits
          .map((visit) => String(visit.sessionId || "").trim())
          .filter(Boolean),
      ).size;

  const topPaths = usingWebFallback
    ? [
        { path: "/paquetes", visits: quotes.length, uniqueIps: 0 },
        { path: "/contacto", visits: leads.length, uniqueIps: 0 },
      ].filter((item) => item.visits > 0)
    : (() => {
        const pathMap = new Map<string, { visits: number; ips: Set<string> }>();
        for (const visit of webVisits) {
          const key = String(visit.path || "").trim() || "/";
          const current = pathMap.get(key) || { visits: 0, ips: new Set<string>() };
          current.visits += 1;
          const ipKey = String(visit.ipHash || visit.ip || "").trim();
          if (ipKey) current.ips.add(ipKey);
          pathMap.set(key, current);
        }
        return Array.from(pathMap.entries())
          .map(([path, value]) => ({
            path,
            visits: value.visits,
            uniqueIps: value.ips.size,
          }))
          .sort((a, b) => b.visits - a.visits)
          .slice(0, 6);
      })();

  const revenuePerVisit = totalVisits > 0 ? revenue / totalVisits : 0;
  const recentNavigations = usingWebFallback
    ? [...quotes]
        .slice(0, 8)
        .map((quote) => ({
          path: "/paquetes",
          createdAt: quote.createdAt || null,
          ip: null,
          ipHash: null,
          sessionId: null,
        }))
    : webVisits.slice(0, 8).map((visit) => ({
        path: visit.path || "/",
        createdAt: visit.createdAt || null,
        ip: visit.ip || null,
        ipHash: visit.ipHash || null,
        sessionId: visit.sessionId || null,
      }));

  return {
    leads,
    quotes,
    visits,
    sales,
    clients,
    projects,
    requests,
    taxDocuments,
    webVisits,
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
        leadBase,
        leadBaseEstimated,
      },
      web: {
        totalVisits,
        todayVisits,
        uniqueIps,
        uniqueSessions,
        revenuePerVisit: round(revenuePerVisit),
        estimated: usingWebFallback,
        topPaths,
        recentNavigations,
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
    // Reconciliación defensiva: no debe bloquear el dashboard si falla por permisos/entorno.
    try {
      await syncWonQuotesCrossModules();
    } catch (syncError) {
      console.warn("[admin/snapshot] syncWonQuotesCrossModules falló, se continúa con lectura de métricas:", syncError);
    }

    const [leads, quotes, visits, sales, clients, projects, requests, taxDocuments, webVisits] =
      await Promise.all([
        fetchLeads(),
        getQuotes(),
        getVisits(),
        getSales(),
        getClients(),
        getProjects(),
        getRequests(),
        getTaxDocuments(),
        getWebVisits(),
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
      webVisits,
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
      webVisits: [],
    });
  }
}

export type { Client, ClientRequest, EnrichedQuote as Quote, Lead, Project, Sale, TaxDocument, Visit, WebVisit };
