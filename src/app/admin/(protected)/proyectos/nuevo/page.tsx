"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Clock3,
  FileText,
  Loader2,
  Mail,
  Phone,
  Receipt,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${props.className || ""}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${props.className || ""}`} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 ${props.className || ""}`} />;
}

type ClientHit = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  rut: string | null;
};

type ClientDetail = {
  client: ClientHit & { phone: string | null; city: string | null };
  quotes: Array<{ id: string; total: number; status: string | null; createdAt: string | null }>;
  sales: Array<{ id: string; total: number; description: string | null; invoiceRef: string | null; createdAt: string | null }>;
};

const clp = (value: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);

const shortDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-CL");
};

export default function NuevoProyectoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const baseForm = {
    clientId: "",
    quoteId: "",
    saleId: "",
    title: "",
    serviceArea: "Desarrollo web",
    status: "Planificado",
    priority: "Normal",
    startDate: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endDate: "",
    endTime: "",
    owner: "",
    estimatedHours: "24",
    actualHours: "0",
    hourlyRate: "35000",
    totalCharge: "0",
    description: "",
    scope: "",
  };

  const prefillForm = useMemo(() => {
    const rawPrefill = searchParams.get("prefill");
    if (!rawPrefill) return {};

    try {
      const parsed = JSON.parse(decodeURIComponent(rawPrefill)) as Partial<typeof baseForm>;
      return Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => typeof value === "string"),
      ) as Partial<typeof baseForm>;
    } catch {
      return {};
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [form, setForm] = useState({
    ...baseForm,
    ...prefillForm,
  });

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  // ── Buscador de clientes ──
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    const query = clientQuery.trim();
    if (query.length < 2) {
      setClientResults([]);
      setSearching(false);
      return;
    }

    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/admin/proyectos/nuevo/buscar?q=${encodeURIComponent(query)}`);
        const data = (await response.json()) as { clients?: ClientHit[] };
        if (seq === searchSeq.current) {
          setClientResults(data.clients ?? []);
          setResultsOpen(true);
        }
      } catch {
        if (seq === searchSeq.current) setClientResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [clientQuery]);

  async function loadClientDetail(clientId: string) {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/admin/proyectos/nuevo/buscar?clientId=${encodeURIComponent(clientId)}`);
      if (!response.ok) return;
      const data = (await response.json()) as ClientDetail;
      setClientDetail(data);
      setForm((current) => ({
        ...current,
        clientId: data.client.id,
        title: current.title || `Proyecto ${data.client.company || data.client.name}`,
      }));
    } finally {
      setLoadingDetail(false);
    }
  }

  // Si llega clientId por prefill (ej: desde Contactos), carga la ficha al entrar.
  useEffect(() => {
    if (prefillForm.clientId) {
      void loadClientDetail(prefillForm.clientId);
    }
    if ((prefillForm.quoteId || prefillForm.saleId) && !prefillForm.clientId) {
      setManualOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectClient(hit: ClientHit) {
    setResultsOpen(false);
    setClientQuery("");
    setClientResults([]);
    void loadClientDetail(hit.id);
  }

  function clearClient() {
    setClientDetail(null);
    setForm((current) => ({ ...current, clientId: "", quoteId: "", saleId: "" }));
  }

  function selectQuote(quoteId: string) {
    const quote = clientDetail?.quotes.find((item) => item.id === quoteId);
    setForm((current) => ({
      ...current,
      quoteId,
      totalCharge:
        quote && (!current.totalCharge || current.totalCharge === "0")
          ? String(quote.total)
          : current.totalCharge,
    }));
  }

  const computedCharge =
    (Number(form.hourlyRate) || 0) * (Number(form.estimatedHours) || 0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/admin/proyectos/nuevo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          hourlyRate: Number(form.hourlyRate) || 0,
          estimatedHours: Number(form.estimatedHours) || 0,
          actualHours: Number(form.actualHours) || 0,
          totalCharge: Number(form.totalCharge) || computedCharge,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data?.error || "No se pudo registrar el proyecto.");
        return;
      }

      router.push("/admin/proyectos");
    });
  }

  const selected = clientDetail?.client ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/admin/proyectos" className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Operaciones</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Crear proyecto</h1>
          <p className="mt-1 text-sm text-slate-500">Busca el cliente y sus cotizaciones y ventas se cargan solas: sin pegar IDs a mano.</p>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><UserRound className="h-4 w-4 text-blue-600" /><h2 className="text-base font-bold text-slate-900">Cliente y vínculos</h2></div>

            {!selected ? (
              <div className="relative">
                <Label>Buscar cliente</Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={clientQuery}
                    onChange={(event) => setClientQuery(event.target.value)}
                    onFocus={() => clientResults.length > 0 && setResultsOpen(true)}
                    onBlur={() => setTimeout(() => setResultsOpen(false), 150)}
                    placeholder="Nombre, empresa, email o RUT del cliente..."
                    className="pl-9"
                    autoComplete="off"
                  />
                  {(searching || loadingDetail) && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
                  )}
                </div>

                {resultsOpen && clientQuery.trim().length >= 2 && (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {clientResults.length === 0 && !searching ? (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        Sin resultados para “{clientQuery.trim()}”. Puedes crearlo en{" "}
                        <Link href="/admin/clientes/nuevo" className="font-semibold text-blue-600 hover:underline">Clientes → Nuevo</Link>.
                      </div>
                    ) : (
                      <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                        {clientResults.map((hit) => (
                          <li key={hit.id}>
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => selectClient(hit)}
                              className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-blue-50"
                            >
                              <span className="text-sm font-semibold text-slate-900">{hit.name}</span>
                              <span className="text-xs text-slate-500">
                                {[hit.company, hit.email, hit.rut].filter(Boolean).join(" · ") || "Sin datos adicionales"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-400">Escribe al menos 2 caracteres. Al seleccionar, se completan cliente, cotizaciones y ventas.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-blue-950">{selected.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-900/80">
                      {selected.company && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{selected.company}</span>}
                      {selected.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selected.email}</span>}
                      {selected.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selected.phone}</span>}
                      {selected.rut && <span>RUT {selected.rut}</span>}
                    </div>
                    <p className="text-[10px] font-mono text-blue-900/50">ID {selected.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearClient}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <X className="h-3.5 w-3.5" /> Cambiar
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label>Cotización asociada</Label>
                <div className="relative mt-1">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Select
                    value={form.quoteId}
                    onChange={(event) => selectQuote(event.target.value)}
                    disabled={!selected || loadingDetail}
                    className="pl-9"
                  >
                    <option value="">
                      {!selected
                        ? "Busca un cliente primero"
                        : clientDetail && clientDetail.quotes.length === 0
                          ? "Este cliente no tiene cotizaciones"
                          : "Sin cotización asociada"}
                    </option>
                    {clientDetail?.quotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {`${clp(quote.total)} · ${quote.status || "SIN ESTADO"} · ${shortDate(quote.createdAt)} · #${quote.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label>Venta asociada</Label>
                <div className="relative mt-1">
                  <Receipt className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Select
                    value={form.saleId}
                    onChange={(event) => set("saleId", event.target.value)}
                    disabled={!selected || loadingDetail}
                    className="pl-9"
                  >
                    <option value="">
                      {!selected
                        ? "Busca un cliente primero"
                        : clientDetail && clientDetail.sales.length === 0
                          ? "Este cliente no tiene ventas"
                          : "Sin venta asociada"}
                    </option>
                    {clientDetail?.sales.map((sale) => (
                      <option key={sale.id} value={sale.id}>
                        {`${clp(sale.total)} · ${sale.description || sale.invoiceRef || "Venta"} · ${shortDate(sale.createdAt)} · #${sale.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setManualOpen((open) => !open)}
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${manualOpen ? "rotate-180" : ""}`} />
              Ingresar IDs manualmente (avanzado)
            </button>
            {manualOpen && (
              <div className="mt-3 grid gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                <div><Label>ID cliente</Label><Input value={form.clientId} onChange={(e) => set("clientId", e.target.value)} placeholder="UUID del cliente" /></div>
                <div><Label>ID cotización</Label><Input value={form.quoteId} onChange={(e) => set("quoteId", e.target.value)} placeholder="ID cotización asociada" /></div>
                <div><Label>ID venta</Label><Input value={form.saleId} onChange={(e) => set("saleId", e.target.value)} placeholder="ID venta asociada" /></div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-blue-600" /><h2 className="text-base font-bold text-slate-900">Identificación</h2></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Título</Label><Input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Implementación ecommerce / soporte / proyecto TI" /></div>
              <div><Label>Área</Label><Input value={form.serviceArea} onChange={(e) => set("serviceArea", e.target.value)} /></div>
              <div><Label>Responsable</Label><Input value={form.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Encargado del proyecto" /></div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-600" /><h2 className="text-base font-bold text-slate-900">Tiempos y cobros</h2></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Fecha inicio</Label><Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
              <div><Label>Hora inicio</Label><Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></div>
              <div><Label>Fecha término</Label><Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></div>
              <div><Label>Hora término</Label><Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} /></div>
              <div><Label>Horas estimadas</Label><Input type="number" min={0} value={form.estimatedHours} onChange={(e) => set("estimatedHours", e.target.value)} /></div>
              <div><Label>Horas reales</Label><Input type="number" min={0} value={form.actualHours} onChange={(e) => set("actualHours", e.target.value)} /></div>
              <div><Label>Tarifa hora</Label><Input type="number" min={0} value={form.hourlyRate} onChange={(e) => set("hourlyRate", e.target.value)} /></div>
              <div><Label>Cobro total</Label><Input type="number" min={0} value={form.totalCharge} onChange={(e) => set("totalCharge", e.target.value)} placeholder={String(computedCharge)} /></div>
              <div><Label>Estado</Label><Select value={form.status} onChange={(e) => set("status", e.target.value)}><option>Planificado</option><option>En curso</option><option>En revisión</option><option>Completado</option><option>Pausado</option></Select></div>
              <div><Label>Prioridad</Label><Select value={form.priority} onChange={(e) => set("priority", e.target.value)}><option>Normal</option><option>Alta</option><option>Urgente</option><option>Baja</option></Select></div>
              <div className="md:col-span-2"><Label>Descripción</Label><Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Objetivo, entregables, stack, responsables, observaciones..." /></div>
              <div className="md:col-span-2"><Label>Scope / alcance</Label><Textarea rows={4} value={form.scope} onChange={(e) => set("scope", e.target.value)} placeholder="Módulos incluidos, exclusiones, acuerdos y coberturas." /></div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-blue-900 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-bold"><ShieldCheck className="h-4 w-4 text-blue-600" />Control de proyecto</h2>
            <div className="mt-5 space-y-3 text-sm text-blue-800">
              <p>Cliente: <span className="font-semibold">{selected?.name || (form.clientId ? `ID ${form.clientId.slice(0, 8)}…` : "Sin asignar")}</span></p>
              <p>Cotización: <span className="font-semibold">{form.quoteId ? `#${form.quoteId.slice(0, 8)}` : "—"}</span></p>
              <p>Venta: <span className="font-semibold">{form.saleId ? `#${form.saleId.slice(0, 8)}` : "—"}</span></p>
              <p>Tarifa estimada: {clp(computedCharge)}</p>
              <p>Inicio: {form.startDate || "—"} {form.startTime || ""}</p>
              <p>Término: {form.endDate || "Pendiente"} {form.endTime || ""}</p>
            </div>
          </section>
          <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"><Save className="h-4 w-4" />{pending ? "Guardando..." : "Guardar proyecto"}</button>
        </aside>
      </form>
    </div>
  );
}
