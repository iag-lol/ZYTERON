import { ACTIVE_PROGRESS, currentPeriod } from "@/config/commercial";
import type { Commission, Statement } from "@/lib/commercial/finance";
import { listCommissions, listStatements } from "@/lib/commercial/finance";
import {
  commercialDb,
  listAllCommercialLeads,
  listCommercialUsers,
  type AdminCommercialLead,
  type CommercialLead,
  type CommercialLeadActivity,
} from "@/lib/commercial/store";

/**
 * Métricas de avance y trazabilidad del área comercial.
 *
 * Se calculan siempre sobre los mismos criterios para que el ejecutivo y
 * administración vean cifras idénticas: el portal muestra la vista de un
 * ejecutivo y el admin la vista consolidada del equipo.
 */

const ACTIVE = ACTIVE_PROGRESS as readonly string[];

export type FunnelStep = { status: string; count: number };

export type PerformanceSnapshot = {
  totalLeads: number;
  monthLeads: number;
  activeLeads: number;
  potentialLeads: number;
  acceptedLeads: number;
  wonLeads: number;
  lostLeads: number;
  pendingEvaluation: number;
  overdueFollowUps: number;
  upcomingFollowUps: number;
  staleLeads: number;
  activities30d: number;
  lastActivityAt: string | null;
  conversionRate: number;
  acceptanceRate: number;
  funnel: FunnelStep[];
};

const DAY = 24 * 60 * 60 * 1000;

function isStale(lead: Pick<CommercialLead, "commercial_status" | "last_contact_at" | "created_at">, now: number) {
  if (["won", "lost"].includes(lead.commercial_status)) return false;
  const reference = new Date(lead.last_contact_at ?? lead.created_at).getTime();
  return now - reference > 14 * DAY;
}

export function buildPerformanceSnapshot(
  leads: Array<Pick<
    CommercialLead,
    "commercial_status" | "validation_status" | "created_at" | "last_contact_at" | "next_follow_up_at"
  >>,
  activities: Array<Pick<CommercialLeadActivity, "occurred_at" | "actor_type">>,
  now = Date.now(),
): PerformanceSnapshot {
  const period = currentPeriod(new Date(now));
  const commercialActivities = activities.filter((item) => item.actor_type !== "admin");
  const recent = commercialActivities.filter(
    (item) => now - new Date(item.occurred_at).getTime() <= 30 * DAY,
  );
  const wonLeads = leads.filter((lead) => lead.commercial_status === "won").length;
  const acceptedLeads = leads.filter((lead) => lead.validation_status === "accepted").length;
  const potentialLeads = leads.filter((lead) => lead.validation_status === "potential").length;

  const funnelCounts = new Map<string, number>();
  for (const lead of leads) {
    funnelCounts.set(lead.commercial_status, (funnelCounts.get(lead.commercial_status) ?? 0) + 1);
  }

  return {
    totalLeads: leads.length,
    monthLeads: leads.filter((lead) => lead.created_at.slice(0, 7) === period).length,
    activeLeads: leads.filter((lead) => ACTIVE.includes(lead.commercial_status)).length,
    potentialLeads,
    acceptedLeads,
    wonLeads,
    lostLeads: leads.filter((lead) => lead.commercial_status === "lost").length,
    pendingEvaluation: leads.filter((lead) => lead.validation_status === "pending").length,
    overdueFollowUps: leads.filter(
      (lead) =>
        lead.next_follow_up_at &&
        new Date(lead.next_follow_up_at).getTime() <= now &&
        !["won", "lost"].includes(lead.commercial_status),
    ).length,
    upcomingFollowUps: leads.filter(
      (lead) =>
        lead.next_follow_up_at &&
        new Date(lead.next_follow_up_at).getTime() > now &&
        new Date(lead.next_follow_up_at).getTime() - now <= 7 * DAY,
    ).length,
    staleLeads: leads.filter((lead) => isStale(lead, now)).length,
    activities30d: recent.length,
    lastActivityAt:
      commercialActivities
        .map((item) => item.occurred_at)
        .sort()
        .at(-1) ?? null,
    conversionRate: leads.length ? Math.round((wonLeads / leads.length) * 100) : 0,
    acceptanceRate: leads.length
      ? Math.round(((acceptedLeads + potentialLeads) / leads.length) * 100)
      : 0,
    funnel: Array.from(funnelCounts.entries()).map(([status, count]) => ({ status, count })),
  };
}

/** Serie de los últimos N meses con registros creados y cierres ganados. */
export function buildMonthlySeries(
  leads: Array<Pick<CommercialLead, "created_at" | "commercial_status" | "updated_at">>,
  months = 6,
  now = new Date(),
): Array<{ period: string; created: number; won: number }> {
  const buckets: Array<{ period: string; created: number; won: number }> = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.push({ period: currentPeriod(date), created: 0, won: 0 });
  }
  const byPeriod = new Map(buckets.map((bucket) => [bucket.period, bucket]));
  for (const lead of leads) {
    const created = byPeriod.get(lead.created_at.slice(0, 7));
    if (created) created.created += 1;
    if (lead.commercial_status === "won") {
      const won = byPeriod.get(lead.updated_at.slice(0, 7));
      if (won) won.won += 1;
    }
  }
  return buckets;
}

// -- Vista del ejecutivo -----------------------------------------------------

export type OwnerDashboardData = {
  snapshot: PerformanceSnapshot;
  series: Array<{ period: string; created: number; won: number }>;
  leads: CommercialLead[];
  activities: CommercialLeadActivity[];
  commissions: Commission[];
  statements: Statement[];
};

export async function getOwnerDashboardData(ownerId: string): Promise<OwnerDashboardData> {
  const [leadsResult, activitiesResult, commissions, statements] = await Promise.all([
    commercialDb()
      .from("commercial_leads")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }),
    commercialDb()
      .from("commercial_lead_activities")
      .select("*")
      .eq("owner_id", ownerId)
      .order("occurred_at", { ascending: false })
      .limit(300),
    listCommissions({ ownerId }),
    listStatements({ ownerId }),
  ]);

  const leads = (leadsResult.data as CommercialLead[]) ?? [];
  const activities = (activitiesResult.data as CommercialLeadActivity[]) ?? [];
  return {
    snapshot: buildPerformanceSnapshot(leads, activities),
    series: buildMonthlySeries(leads),
    leads,
    activities,
    commissions,
    statements,
  };
}

/**
 * Prospectos con seguimiento pendiente, ordenados por urgencia. Resuelve aquí
 * la referencia temporal para que las vistas no tengan que calcular fechas
 * durante el render.
 */
export function buildAgenda(leads: CommercialLead[], now = Date.now()) {
  const pending = leads.filter(
    (lead) => lead.next_follow_up_at && !["won", "lost"].includes(lead.commercial_status),
  );
  const byDate = (a: CommercialLead, b: CommercialLead) =>
    (a.next_follow_up_at as string).localeCompare(b.next_follow_up_at as string);

  const overdue = pending
    .filter((lead) => new Date(lead.next_follow_up_at as string).getTime() <= now)
    .sort(byDate);
  const upcoming = pending
    .filter((lead) => new Date(lead.next_follow_up_at as string).getTime() > now)
    .sort(byDate);
  const unscheduled = leads.filter(
    (lead) => !lead.next_follow_up_at && !["won", "lost"].includes(lead.commercial_status),
  );
  const staleUnscheduled = unscheduled.filter(
    (lead) => now - new Date(lead.last_contact_at ?? lead.created_at).getTime() > 14 * DAY,
  );

  return {
    overdue,
    upcoming,
    unscheduled,
    staleUnscheduled,
    overdueIds: new Set(overdue.map((lead) => lead.id)),
  };
}

/** Compromisos de contacto ya vencidos (badge de navegación). */
export function countOverdueFollowUps(
  leads: Array<Pick<CommercialLead, "commercial_status" | "next_follow_up_at">>,
  now = Date.now(),
): number {
  return leads.filter(
    (lead) =>
      lead.next_follow_up_at &&
      new Date(lead.next_follow_up_at).getTime() <= now &&
      !["won", "lost"].includes(lead.commercial_status),
  ).length;
}

// -- Vista consolidada del equipo (admin) ------------------------------------

export type TeamMemberRow = {
  id: string;
  name: string;
  rut: string;
  role: string;
  status: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  commission_pct: number;
  last_login_at: string | null;
  created_at: string;
  goal_monthly_leads: number;
  goal_monthly_won: number;
  goal_monthly_amount: number;
  snapshot: PerformanceSnapshot;
  commissionGross: number;
  commissionPaid: number;
  commissionPendingPayment: number;
  statementsPending: number;
  hasBankData: boolean;
};

export type TeamOverview = {
  members: TeamMemberRow[];
  totals: {
    executives: number;
    activeExecutives: number;
    leads: number;
    monthLeads: number;
    activeLeads: number;
    wonLeads: number;
    pendingEvaluation: number;
    overdueFollowUps: number;
    commissionGross: number;
    commissionPaid: number;
    commissionPendingPayment: number;
    statementsPending: number;
  };
  funnel: FunnelStep[];
  series: Array<{ period: string; created: number; won: number }>;
  alerts: Array<{ kind: "warning" | "danger" | "info"; title: string; detail: string; ownerId?: string }>;
};

export async function getTeamOverview(): Promise<TeamOverview> {
  const [users, leads, activitiesResult, commissions, statements] = await Promise.all([
    listCommercialUsers(),
    listAllCommercialLeads(),
    commercialDb()
      .from("commercial_lead_activities")
      .select("owner_id,occurred_at,actor_type")
      .order("occurred_at", { ascending: false })
      .limit(3000),
    listCommissions(),
    listStatements(),
  ]);

  const activities =
    (activitiesResult.data as Array<{ owner_id: string; occurred_at: string; actor_type: string }>) ?? [];

  const leadsByOwner = new Map<string, AdminCommercialLead[]>();
  for (const lead of leads) {
    const group = leadsByOwner.get(lead.owner_id) ?? [];
    group.push(lead);
    leadsByOwner.set(lead.owner_id, group);
  }
  const activitiesByOwner = new Map<string, typeof activities>();
  for (const activity of activities) {
    const group = activitiesByOwner.get(activity.owner_id) ?? [];
    group.push(activity);
    activitiesByOwner.set(activity.owner_id, group);
  }

  const members: TeamMemberRow[] = users.map((user) => {
    const ownerLeads = leadsByOwner.get(user.id) ?? [];
    const ownerActivities = activitiesByOwner.get(user.id) ?? [];
    const ownerCommissions = commissions.filter((item) => item.owner_id === user.id);
    const ownerStatements = statements.filter((item) => item.owner_id === user.id);
    const gross = ownerCommissions.reduce((sum, item) => sum + (Number(item.gross_amount) || 0), 0);
    const paid = ownerCommissions
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + (Number(item.gross_amount) || 0), 0);
    return {
      id: user.id,
      name: user.name,
      rut: user.rut,
      role: user.role,
      status: user.status,
      email: user.email,
      phone: user.phone,
      position: user.position,
      commission_pct: Number(user.commission_pct) || 0,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      goal_monthly_leads: Number(user.goal_monthly_leads) || 0,
      goal_monthly_won: Number(user.goal_monthly_won) || 0,
      goal_monthly_amount: Number(user.goal_monthly_amount) || 0,
      snapshot: buildPerformanceSnapshot(ownerLeads, ownerActivities),
      commissionGross: gross,
      commissionPaid: paid,
      commissionPendingPayment: gross - paid,
      statementsPending: ownerStatements.filter((item) => item.status === "issued").length,
      hasBankData: Boolean(user.bank_name && user.bank_account_number),
    };
  });

  const funnelCounts = new Map<string, number>();
  for (const lead of leads) {
    funnelCounts.set(lead.commercial_status, (funnelCounts.get(lead.commercial_status) ?? 0) + 1);
  }

  const teamSnapshot = buildPerformanceSnapshot(leads, activities);
  const commissionGross = commissions.reduce((sum, item) => sum + (Number(item.gross_amount) || 0), 0);
  const commissionPaid = commissions
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + (Number(item.gross_amount) || 0), 0);

  const alerts: TeamOverview["alerts"] = [];
  if (teamSnapshot.pendingEvaluation > 0) {
    alerts.push({
      kind: "warning",
      title: `${teamSnapshot.pendingEvaluation} registro(s) esperando evaluación`,
      detail: "Clasifícalos para que el ejecutivo sepa si debe seguir gestionando.",
    });
  }
  if (teamSnapshot.overdueFollowUps > 0) {
    alerts.push({
      kind: "danger",
      title: `${teamSnapshot.overdueFollowUps} seguimiento(s) vencido(s)`,
      detail: "Hay compromisos de contacto que ya pasaron su fecha.",
    });
  }
  const issuedStatements = statements.filter((item) => item.status === "issued").length;
  if (issuedStatements > 0) {
    alerts.push({
      kind: "info",
      title: `${issuedStatements} liquidación(es) emitida(s) sin pagar`,
      detail: "Regístralas como pagadas cuando se realice la transferencia.",
    });
  }
  for (const member of members) {
    if (member.status !== "active") continue;
    if (member.snapshot.totalLeads > 0 && member.snapshot.activities30d === 0) {
      alerts.push({
        kind: "warning",
        title: `${member.name} sin gestiones informadas en 30 días`,
        detail: "Su cartera está activa pero no registra avances recientes.",
        ownerId: member.id,
      });
    }
    if (member.commissionPendingPayment > 0 && !member.hasBankData) {
      alerts.push({
        kind: "danger",
        title: `${member.name} tiene comisiones sin datos bancarios`,
        detail: "Solicítale completar su cuenta bancaria antes de liquidar.",
        ownerId: member.id,
      });
    }
  }

  return {
    members: members.sort((a, b) => b.snapshot.totalLeads - a.snapshot.totalLeads),
    totals: {
      executives: users.length,
      activeExecutives: users.filter((user) => user.status === "active").length,
      leads: teamSnapshot.totalLeads,
      monthLeads: teamSnapshot.monthLeads,
      activeLeads: teamSnapshot.activeLeads,
      wonLeads: teamSnapshot.wonLeads,
      pendingEvaluation: teamSnapshot.pendingEvaluation,
      overdueFollowUps: teamSnapshot.overdueFollowUps,
      commissionGross,
      commissionPaid,
      commissionPendingPayment: commissionGross - commissionPaid,
      statementsPending: issuedStatements,
    },
    funnel: Array.from(funnelCounts.entries()).map(([status, count]) => ({ status, count })),
    series: buildMonthlySeries(leads),
    alerts,
  };
}

/** Ficha 360 de un ejecutivo para el admin. */
export async function getMemberProfile(ownerId: string) {
  const [leadsResult, activitiesResult, commissions, statements] = await Promise.all([
    commercialDb()
      .from("commercial_leads")
      .select("*")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false }),
    commercialDb()
      .from("commercial_lead_activities")
      .select("*")
      .eq("owner_id", ownerId)
      .order("occurred_at", { ascending: false })
      .limit(200),
    listCommissions({ ownerId }),
    listStatements({ ownerId }),
  ]);
  const leads = (leadsResult.data as CommercialLead[]) ?? [];
  const activities = (activitiesResult.data as CommercialLeadActivity[]) ?? [];
  return {
    leads,
    activities,
    commissions,
    statements,
    snapshot: buildPerformanceSnapshot(leads, activities),
    series: buildMonthlySeries(leads),
  };
}
