"use client";

import { useState } from "react";
import { ContactRound, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommercialLeadsManager } from "@/components/admin/commercial-leads-manager";
import { CommercialUsersManager } from "@/components/admin/commercial-users-manager";

export function CommercialHub() {
  const [tab, setTab] = useState<"leads" | "users">("leads");
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Comercial · Partners y ejecutivos</h1>
          <p className="text-[13px] text-slate-500">Evaluación de contactos, seguimiento y administración de accesos.</p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setTab("leads")}
            className={cn("inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold", tab === "leads" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50")}
          >
            <ContactRound className="h-4 w-4" /> Registros y potenciales
          </button>
          <button
            onClick={() => setTab("users")}
            className={cn("inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold", tab === "users" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50")}
          >
            <UserCog className="h-4 w-4" /> Usuarios comerciales
          </button>
        </div>
      </div>
      {tab === "leads" ? <CommercialLeadsManager /> : <CommercialUsersManager embedded />}
    </div>
  );
}
