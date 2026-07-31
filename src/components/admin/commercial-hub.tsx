"use client";

import { useState } from "react";
import { ContactRound, LayoutDashboard, UserCog, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommercialLeadsManager } from "@/components/admin/commercial-leads-manager";
import { CommercialUsersManager } from "@/components/admin/commercial-users-manager";
import { CommercialOverview } from "@/components/admin/commercial-overview";
import { CommercialFinanceManager } from "@/components/admin/commercial-finance-manager";

/**
 * Centro de mando del área comercial. Reúne en un mismo lugar el estado del
 * equipo, la evaluación de registros, la ficha completa de cada ejecutivo y
 * las finanzas (comisiones y liquidaciones).
 */

const TABS = [
  { id: "panel", label: "Panel general", icon: LayoutDashboard },
  { id: "leads", label: "Registros y potenciales", icon: ContactRound },
  { id: "equipo", label: "Equipo", icon: UserCog },
  { id: "finanzas", label: "Comisiones y liquidaciones", icon: Wallet },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CommercialHub({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState<TabId>(
    TABS.some((item) => item.id === initialTab) ? (initialTab as TabId) : "panel",
  );
  const [memberToOpen, setMemberToOpen] = useState<string | null>(null);

  function openMember(id: string) {
    setMemberToOpen(id);
    setTab("equipo");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Comercial · Partners y ejecutivos</h1>
        <p className="text-[12.5px] text-slate-500">
          Avance del equipo, evaluación de contactos, ficha completa de cada persona y control de pagos.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-bold transition-colors",
              tab === item.id ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
            )}
          >
            <item.icon className="h-4 w-4" /> {item.label}
          </button>
        ))}
      </div>

      {tab === "panel" && <CommercialOverview onOpenMember={openMember} />}
      {tab === "leads" && <CommercialLeadsManager />}
      {tab === "equipo" && (
        <CommercialUsersManager
          embedded
          openMemberId={memberToOpen}
          onMemberOpened={() => setMemberToOpen(null)}
        />
      )}
      {tab === "finanzas" && <CommercialFinanceManager />}
    </div>
  );
}
