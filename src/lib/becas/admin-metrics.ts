import { getBecasSupabaseClient } from "./supabase-client";

export type BecasCampaignSummary = {
  id: string;
  slug: string;
  title: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  announcementAt: string | null;
  benefitTitle: string | null;
  benefitValueClp: number | null;
  benefitsQuantity: number;
  galleryEnabled: boolean;
  windowProgress: { pct: number; daysLeft: number } | null;
};

export type BecasStatusSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type BecasSeriesPoint = {
  key: string;
  label: string;
  value: number;
};

export type BecasRankedItem = {
  label: string;
  value: number;
};

export type BecasFunnelStep = {
  label: string;
  value: number;
  pct: number;
};

export type BecasRecentApplication = {
  id: string;
  code: string;
  businessName: string;
  fullName: string;
  region: string;
  status: string;
  submittedAt: string | null;
};

export type BecasDashboardData = {
  campaign: BecasCampaignSummary | null;
  campaignsCount: number;
  totals: {
    total: number;
    inReview: number;
    validated: number;
    observed: number;
    rejected: number;
    galleryConsent: number;
    marketingConsent: number;
    followsInstagram: number;
  };
  perDay: BecasSeriesPoint[];
  statusSegments: BecasStatusSegment[];
  topRegions: BecasRankedItem[];
  topIndustries: BecasRankedItem[];
  funnel: BecasFunnelStep[];
  profiles: { pending: number; published: number; hidden: number; removed: number };
  winners: { total: number; accepted: number; pending: number };
  recent: BecasRecentApplication[];
};

type ApplicationRow = {
  id: string;
  application_code: string;
  status: string;
  submitted_at: string | null;
  full_name: string;
  business_name: string;
  region: string | null;
  industry: string | null;
  public_gallery_consent: boolean | null;
  marketing_consent: boolean | null;
  follows_official_instagram_declared: boolean | null;
};

// Paleta categórica validada (dataviz) sobre superficie blanca, en orden fijo.
const STATUS_SEGMENT_DEFS = [
  { key: "in_review", label: "En revisión", statuses: ["submitted", "reviewing"], color: "#2a78d6" },
  { key: "validated", label: "Validadas", statuses: ["validated"], color: "#1baf7a" },
  { key: "observed", label: "Observadas", statuses: ["observed"], color: "#eda100" },
  { key: "selected", label: "Seleccionadas", statuses: ["selected", "winner"], color: "#4a3aa7" },
  { key: "rejected", label: "Rechazadas", statuses: ["rejected", "not_selected"], color: "#e34948" },
  { key: "withdrawn", label: "Retiradas", statuses: ["withdrawn", "draft"], color: "#94a3b8" },
] as const;

const santiagoDayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const santiagoDayLabel = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "numeric",
});

function rankTop(values: Array<string | null>, top: number): BecasRankedItem[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const label = raw?.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, top).map(([label, value]) => ({ label, value }));
  const tail = sorted.slice(top).reduce((sum, [, value]) => sum + value, 0);
  if (tail > 0) head.push({ label: "Otras", value: tail });
  return head;
}

function buildDailySeries(apps: ApplicationRow[], days: number): BecasSeriesPoint[] {
  const counts = new Map<string, number>();
  for (const app of apps) {
    if (!app.submitted_at) continue;
    const key = santiagoDayKey.format(new Date(app.submitted_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const series: BecasSeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 86_400_000);
    const key = santiagoDayKey.format(date);
    series.push({ key, label: santiagoDayLabel.format(date), value: counts.get(key) ?? 0 });
  }
  return series;
}

export async function getBecasDashboardData(): Promise<BecasDashboardData> {
  const supabase = getBecasSupabaseClient();

  const { data: campaigns } = await supabase
    .from("scholarship_campaigns")
    .select(
      "id, slug, title, status, starts_at, ends_at, announcement_at, benefit_title, benefit_value_clp, benefits_quantity, is_public_gallery_enabled, created_at",
    )
    .order("created_at", { ascending: false });

  const campaignRow =
    campaigns?.find((c) => c.status === "active") ?? campaigns?.[0] ?? null;

  let windowProgress: { pct: number; daysLeft: number } | null = null;
  if (campaignRow?.starts_at && campaignRow.ends_at) {
    const start = new Date(campaignRow.starts_at).getTime();
    const end = new Date(campaignRow.ends_at).getTime();
    if (end > start) {
      windowProgress = {
        pct: Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100)),
        daysLeft: Math.max(0, Math.ceil((end - Date.now()) / 86_400_000)),
      };
    }
  }

  const campaign: BecasCampaignSummary | null = campaignRow
    ? {
        id: campaignRow.id,
        slug: campaignRow.slug,
        title: campaignRow.title,
        status: campaignRow.status,
        startsAt: campaignRow.starts_at,
        endsAt: campaignRow.ends_at,
        announcementAt: campaignRow.announcement_at,
        benefitTitle: campaignRow.benefit_title,
        benefitValueClp: campaignRow.benefit_value_clp,
        benefitsQuantity: campaignRow.benefits_quantity ?? 1,
        galleryEnabled: Boolean(campaignRow.is_public_gallery_enabled),
        windowProgress,
      }
    : null;

  let apps: ApplicationRow[] = [];
  const profiles = { pending: 0, published: 0, hidden: 0, removed: 0 };
  let winners = { total: 0, accepted: 0, pending: 0 };

  if (campaign) {
    const [appsRes, profilesRes, winnersRes] = await Promise.all([
      supabase
        .from("scholarship_applications")
        .select(
          "id, application_code, status, submitted_at, full_name, business_name, region, industry, public_gallery_consent, marketing_consent, follows_official_instagram_declared",
        )
        .eq("campaign_id", campaign.id)
        .order("submitted_at", { ascending: false }),
      supabase
        .from("scholarship_public_profiles")
        .select("status")
        .eq("campaign_id", campaign.id),
      supabase
        .from("scholarship_winners")
        .select("acceptance_status")
        .eq("campaign_id", campaign.id),
    ]);

    apps = (appsRes.data as ApplicationRow[] | null) ?? [];

    for (const profile of profilesRes.data ?? []) {
      if (profile.status === "published") profiles.published += 1;
      else if (profile.status === "pending_approval") profiles.pending += 1;
      else if (profile.status === "removed") profiles.removed += 1;
      else profiles.hidden += 1;
    }

    const winnerRows = winnersRes.data ?? [];
    winners = {
      total: winnerRows.length,
      accepted: winnerRows.filter((w) => w.acceptance_status === "accepted").length,
      pending: winnerRows.filter((w) => w.acceptance_status === "pending").length,
    };
  }

  const byStatus = (statuses: readonly string[]) =>
    apps.filter((app) => statuses.includes(app.status)).length;

  const totals = {
    total: apps.length,
    inReview: byStatus(["submitted", "reviewing"]),
    validated: byStatus(["validated", "selected", "winner"]),
    observed: byStatus(["observed"]),
    rejected: byStatus(["rejected", "not_selected"]),
    galleryConsent: apps.filter((app) => app.public_gallery_consent).length,
    marketingConsent: apps.filter((app) => app.marketing_consent).length,
    followsInstagram: apps.filter((app) => app.follows_official_instagram_declared).length,
  };

  const statusSegments = STATUS_SEGMENT_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    value: byStatus(def.statuses),
    color: def.color,
  })).filter((segment) => segment.value > 0);

  const funnelBase = Math.max(totals.total, 1);
  const funnelSteps = [
    { label: "Postulaciones recibidas", value: totals.total },
    { label: "Validadas", value: totals.validated },
    { label: "Con consentimiento de vitrina", value: totals.galleryConsent },
    { label: "Ganadores confirmados", value: winners.accepted },
  ];

  return {
    campaign,
    campaignsCount: campaigns?.length ?? 0,
    totals,
    perDay: buildDailySeries(apps, 30),
    statusSegments,
    topRegions: rankTop(apps.map((app) => app.region), 5),
    topIndustries: rankTop(apps.map((app) => app.industry), 5),
    funnel: funnelSteps.map((step) => ({
      ...step,
      pct: (step.value / funnelBase) * 100,
    })),
    profiles,
    winners,
    recent: apps.slice(0, 6).map((app) => ({
      id: app.id,
      code: app.application_code,
      businessName: app.business_name,
      fullName: app.full_name,
      region: app.region ?? "—",
      status: app.status,
      submittedAt: app.submitted_at,
    })),
  };
}
