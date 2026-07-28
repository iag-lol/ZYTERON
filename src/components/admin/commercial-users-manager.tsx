"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Loader2,
  KeyRound,
  Trash2,
  Users,
  ShieldCheck,
  Copy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CommercialUser = {
  id: string;
  rut: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  commission_pct: number;
  last_login_at: string | null;
  created_at: string;
};

const ROLE_LABEL: Record<string, string> = {
  executive: "Ejecutivo",
  portfolio: "Gestor de cartera",
  partner: "Partner / Referidor",
};
const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: "Activo", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  suspended: { label: "Suspendido", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  invited: { label: "Invitado", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export function CommercialUsersManager({ embedded = false }: { embedded?: boolean }) {
  const [users, setUsers] = useState<CommercialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    rut: "",
    email: "",
    phone: "",
    role: "partner",
    commissionPct: "",
    password: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/comercial/users", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.users)) setUsers(data.users);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async () => {
    setError("");
    if (!form.name.trim() || !form.rut.trim() || !form.password) {
      setError("Nombre, RUT y contraseña son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/comercial/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rut: form.rut,
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          role: form.role,
          password: form.password,
          commissionPct: form.commissionPct ? Number(form.commissionPct) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear el usuario.");
        return;
      }
      setShowForm(false);
      setForm({ name: "", rut: "", email: "", phone: "", role: "partner", commissionPct: "", password: "" });
      await load();
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  const patch = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setBusyId(id);
      try {
        const res = await fetch(`/api/admin/comercial/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          window.alert(data.error || "No se pudo actualizar el usuario.");
          return false;
        }
        await load();
        return true;
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const resetPass = useCallback(
    async (id: string) => {
      const pass = window.prompt("Nueva contraseña (mínimo 6 caracteres):");
      if (!pass) return;
      if (pass.length < 6) {
        window.alert("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (await patch(id, { newPassword: pass })) {
        window.alert("Contraseña actualizada.");
      }
    },
    [patch],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!window.confirm("¿Eliminar este usuario comercial de forma permanente?")) return;
      setBusyId(id);
      try {
        const res = await fetch(`/api/admin/comercial/users/${id}`, { method: "DELETE" });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          window.alert(data.error || "No se pudo eliminar el usuario.");
          return;
        }
        await load();
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const activeCount = users.filter((u) => u.status === "active").length;
  const partnerCount = users.filter((u) => u.role === "partner").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className={cn("font-extrabold text-slate-900", embedded ? "text-lg" : "text-xl")}>
            Usuarios comerciales
          </h2>
          <p className="text-[13px] text-slate-500">Accesos por RUT y contraseña, gestionados desde el admin.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" /> Nuevo usuario
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Usuarios totales", value: users.length, icon: Users, cls: "bg-blue-50 text-blue-600" },
          { label: "Activos", value: activeCount, icon: ShieldCheck, cls: "bg-emerald-50 text-emerald-600" },
          { label: "Partners", value: partnerCount, icon: Users, cls: "bg-violet-50 text-violet-600" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{k.label}</p>
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", k.cls)}>
                <k.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-slate-900">Crear usuario comercial</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre completo" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Field label="RUT (con o sin puntos)" value={form.rut} onChange={(v) => setForm((f) => ({ ...f, rut: v }))} placeholder="12.345.678-9" />
            <Field label="Correo" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" />
            <Field label="Teléfono" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-500">Rol</span>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:border-blue-400 focus:outline-none"
              >
                <option value="partner">Partner / Referidor</option>
                <option value="executive">Ejecutivo comercial</option>
                <option value="portfolio">Gestor de cartera</option>
              </select>
            </label>
            <Field label="% comisión (opcional)" value={form.commissionPct} onChange={(v) => setForm((f) => ({ ...f, commissionPct: v }))} type="number" />
            <Field label="Contraseña inicial" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} type="text" placeholder="mín. 6 caracteres" />
          </div>
          {error && <p className="mt-3 text-[12px] font-medium text-rose-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              onClick={create}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Crear usuario
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-2 text-[13px] font-semibold text-slate-600">Aún no hay usuarios comerciales</p>
            <p className="text-[12px] text-slate-400">Crea el primer partner o ejecutivo con el botón de arriba.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((u) => {
              const st = STATUS_LABEL[u.status] ?? STATUS_LABEL.invited;
              return (
                <div key={u.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[13px] font-bold text-white">
                      {u.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-slate-800">{u.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-slate-500">
                        <button
                          onClick={() => navigator.clipboard?.writeText(u.rut).catch(() => {})}
                          className="inline-flex items-center gap-1 hover:text-slate-700"
                          title="Copiar RUT"
                        >
                          <Copy className="h-3 w-3" /> {u.rut}
                        </button>
                        {u.email && <span className="truncate">{u.email}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{ROLE_LABEL[u.role] ?? u.role}</span>
                    {u.commission_pct > 0 && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">{u.commission_pct}%</span>
                    )}
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", st.cls)}>{st.label}</span>
                    <span className="hidden text-[11px] text-slate-400 lg:inline">Últ. acceso {fmtDate(u.last_login_at)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <select
                      value={u.status}
                      disabled={busyId === u.id}
                      onChange={(e) => void patch(u.id, { status: e.target.value })}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 focus:outline-none"
                      title="Cambiar estado"
                    >
                      <option value="active">Activo</option>
                      <option value="suspended">Suspendido</option>
                      <option value="invited">Invitado</option>
                    </select>
                    <button onClick={() => void resetPass(u.id)} disabled={busyId === u.id} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Restablecer contraseña">
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button onClick={() => void remove(u.id)} disabled={busyId === u.id} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Eliminar">
                      {busyId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
