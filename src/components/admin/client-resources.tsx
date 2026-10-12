"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
type Resource = {
  id: string;
  userId: string;
  kind: "SERVICE" | "EVENT";
  quoteId: string;
  projectId: string;
  title: string;
  description: string;
  date: string;
  renewal: string;
  price: number;
  frequency: string;
  status: string;
  published: boolean;
};
export function ClientResources({
  users,
  resources,
  quotes,
  projects,
}: {
  users: Array<{ id: string; name: string; company: string | null }>;
  resources: Resource[];
  quotes: Array<{ id: string; userId: string; title: string }>;
  projects: Array<{ id: string; userId: string; title: string }>;
}) {
  const router = useRouter(),
    blank: Resource = {
      id: "",
      userId: users[0]?.id || "",
      kind: "SERVICE",
      quoteId: "",
      projectId: "",
      title: "",
      description: "",
      date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" }),
      renewal: "",
      price: 0,
      frequency: "ONE_TIME",
      status: "PENDING_ACTIVATION",
      published: false,
    };
  const [form, setForm] = useState(blank),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { id, ...value } = form;
      const r = await fetch("/api/portal/admin/resources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...value, ...(id ? { id } : {}) }),
      });
      if (!r.ok) throw new Error();
      setForm(blank);
      router.refresh();
    } catch {
      setError("No se pudo guardar el recurso. Revisa sus datos y vuelve a intentar.");
    } finally {
      setBusy(false);
    }
  }
  const field = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">
          {form.id ? "Editar recurso compartido" : "Nuevo recurso del cliente"}
        </h2>
        <label className="block text-sm">
          Cliente
          <select
            required
            className={field}
            value={form.userId}
            disabled={!!form.id}
            onChange={(e) =>
              setForm({ ...form, userId: e.target.value, quoteId: "", projectId: "" })
            }
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.company || u.name} · {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Tipo
          <select
            className={field}
            value={form.kind}
            disabled={!!form.id}
            onChange={(e) => setForm({ ...form, kind: e.target.value as Resource["kind"] })}
          >
            <option value="SERVICE">Servicio</option>
            <option value="EVENT">Compromiso de agenda</option>
          </select>
        </label>
        <label className="block text-sm">
          Nombre
          <input
            required
            minLength={3}
            maxLength={140}
            className={field}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          {form.kind === "SERVICE" ? "Alcance y atención contratada" : "Detalle compartido"}
          <textarea
            maxLength={3000}
            rows={3}
            className={field}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Fecha
          <input
            required
            type="date"
            className={field}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
        {form.kind === "SERVICE" && (
          <>
            <label className="block text-sm">
              Cotización y suscripción vinculada
              <select
                className={field}
                value={form.quoteId}
                onChange={(e) => setForm({ ...form, quoteId: e.target.value })}
              >
                <option value="">Sin vincular</option>
                {quotes
                  .filter((q) => q.userId === form.userId)
                  .map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              Proyecto vinculado
              <select
                className={field}
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              >
                <option value="">Sin vincular</option>
                {projects
                  .filter((q) => q.userId === form.userId)
                  .map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              Precio acordado CLP
              <input
                type="number"
                min={0}
                max={1000000000}
                className={field}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </label>
            <label className="block text-sm">
              Periodicidad
              <select
                className={field}
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              >
                {["ONE_TIME", "MONTHLY", "QUARTERLY", "ANNUAL"].map((v) => (
                  <option key={v} value={v}>
                    {(
                      {
                        ONE_TIME: "Pago único",
                        MONTHLY: "Mensual",
                        QUARTERLY: "Trimestral",
                        ANNUAL: "Anual",
                      } as Record<string, string>
                    )[v] || v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Renovación
              <input
                type="date"
                className={field}
                value={form.renewal}
                onChange={(e) => setForm({ ...form, renewal: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Estado
              <select
                className={field}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {[
                  "QUOTED",
                  "PENDING_ACTIVATION",
                  "ACTIVE",
                  "SUSPENDED",
                  "PENDING_RENEWAL",
                  "CANCELLED",
                  "EXPIRED",
                ].map((v) => (
                  <option key={v}>
                    {(
                      {
                        ONE_TIME: "Pago único",
                        MONTHLY: "Mensual",
                        QUARTERLY: "Trimestral",
                        ANNUAL: "Anual",
                        QUOTED: "En cotización",
                        PENDING_ACTIVATION: "Activación pendiente",
                        ACTIVE: "Activo",
                        SUSPENDED: "Suspendido",
                        PENDING_RENEWAL: "Renovación pendiente",
                        CANCELLED: "Cancelado",
                        EXPIRED: "Finalizado",
                      } as Record<string, string>
                    )[v] || v}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          Compartir estos datos con el cliente en su portal
        </label>
        <p className="text-xs text-slate-500">
          Los precios de servicios describen el contrato. Crear un servicio no genera una deuda,
          venta ni cargo automático; los cobros se preparan en Cotizaciones.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          disabled={busy || !users.length}
          className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white"
        >
          {busy ? "Guardando…" : "Guardar recurso"}
        </button>
        {form.id && (
          <button type="button" className="ml-3 text-sm" onClick={() => setForm(blank)}>
            Cancelar edición
          </button>
        )}
      </form>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recursos vinculados</h2>
        {resources.map((r) => (
          <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <small className="text-slate-500">
              {r.kind === "SERVICE" ? "Servicio" : "Agenda"} ·{" "}
              {r.published ? "Compartido" : "Interno"}
            </small>
            <h3 className="mt-2 font-semibold">{r.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {users.find((u) => u.id === r.userId)?.name} · {r.date}
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-emerald-800"
              onClick={() => {
                setForm(r);
                setError("");
              }}
            >
              Editar o cambiar publicación ↗
            </button>
          </article>
        ))}
        {!resources.length && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
            Todavía no hay recursos publicados. Los documentos e informes se comparten desde la
            ficha del cliente.
          </p>
        )}
      </section>
    </div>
  );
}
