"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Search,
} from "lucide-react";
import { clp } from "@/config/pricing";
import {
  CATALOG_VERSION,
  exclusionText,
  CLOSED_PLANS,
  CLOSED_ADDONS,
  MANUAL_CATEGORIES,
  addonAvailability,
  calculateManualQuote,
  selectManualAddon,
  changeManualPlan,
  type ManualSelection,
  type ManualSnapshot,
} from "@/lib/manual-quote/catalog";

const initialSelection = (id: string): ManualSelection => ({
  version: CATALOG_VERSION,
  planId: CLOSED_PLANS.some((p) => p.id === id) ? id : "pyme",
  addons: [],
});
async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(data.error || "No se pudo completar la solicitud."), {
      existing: data.existing,
    });
  return data;
}

export function ScopeSummary({ quote }: { quote: ManualSnapshot }) {
  return (
    <div className="manual-scope">
      <h3>
        <FileText size={20} /> Tu alcance, por escrito
      </h3>
      <details open>
        <summary>
          {quote.base.name} · {clp(quote.base.amount)} netos
        </summary>
        <ul>
          {quote.base.includes.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p>
          <strong>Fuera del plan base:</strong> {exclusionText(quote.base.excludes.join(" "))}
        </p>
      </details>
      {quote.addons.map((a) => (
        <details key={a.id}>
          <summary>
            {a.name} × {a.quantity} · {clp(a.lineTotal)} netos
          </summary>
          <p>{a.scope}</p>
          <p>
            <strong>No incluye:</strong> {exclusionText(a.excludes)}
          </p>
          <p>{a.days * a.quantity} días hábiles adicionales.</p>
        </details>
      ))}
      <details open>
        <summary>Entrega, revisiones y condiciones</summary>
        <p>
          <strong>Plazo del proyecto: {quote.days.join(" a ")} días hábiles.</strong>{" "}
          {quote.terms.delivery}
        </p>
        <p>{quote.terms.changes}</p>
        <p>{quote.terms.handover}</p>
        <p>{quote.terms.exclusions}</p>
        <p>{quote.terms.payment}</p>
        <p>
          Catálogo {quote.version}. La cotización se conserva 7 días; antes del pago se valida que
          el catálogo siga vigente.
        </p>
      </details>
    </div>
  );
}

type Contact = { name: string; email: string; phone: string };
type Billing = {
  rut: string;
  address: string;
  documentType: "BOLETA" | "FACTURA";
  companyName: string;
  companyRut: string;
  businessLine: string;
};
export function ManualQuoteBuilder({ initialPlan = "pyme" }: { initialPlan?: string }) {
  const [selection, setSelection] = useState<ManualSelection>(initialSelection(initialPlan));
  const [contact, setContact] = useState<Contact>({ name: "", email: "", phone: "" });
  const [id, setId] = useState("");
  const [step, setStep] = useState<"contact" | "configure" | "account" | "billing" | "paid">(
    "contact",
  );
  const [authMode, setAuthMode] = useState<"register" | "login" | "verify">("register");
  const [ready, setReady] = useState(false),
    [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [accepted, setAccepted] = useState(false),
    [privacy, setPrivacy] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [reservedQuote, setReservedQuote] = useState<ManualSnapshot | null>(null);
  const [account, setAccount] = useState({
    firstName: "",
    lastName: "",
    company: "",
    password: "",
    confirmPassword: "",
  });
  const [code, setCode] = useState("");
  const [billing, setBilling] = useState<Billing>({
    rut: "",
    address: "",
    documentType: "BOLETA",
    companyName: "",
    companyRut: "",
    businessLine: "",
  });
  const requestKey = useRef("");
  const quote = reservedQuote || calculateManualQuote(selection);
  const [cooldown, setCooldown] = useState(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const downloadUrlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    },
    [],
  );
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    let cancelled = false;
    api("/api/manual-quote", undefined, "GET")
      .then((data) => {
        if (cancelled) return;
        const currentSelection = { ...data.selection, version: CATALOG_VERSION };
        try {
          if (data.locked && data.snapshot) setReservedQuote(data.snapshot);
          else calculateManualQuote(currentSelection);
        } catch {
          setNotice(
            "El catálogo se actualizó. Inicia una nueva cotización para revisar el alcance y los valores vigentes.",
          );
          return;
        }
        setId(data.id);
        setContact({ name: data.name, email: data.email, phone: data.phone || "" });
        setSelection(data.locked ? data.selection : currentSelection);
        if (!data.locked && data.selection.version !== CATALOG_VERSION)
          setNotice(
            "El catálogo se actualizó. Revisa el alcance y los precios antes de guardar o comprar; tu documento anterior se conserva hasta que guardes los cambios.",
          );
        setReady(data.ready);
        setLocked(data.locked);
        if (data.billing) setBilling(data.billing);
        setStep(
          data.paid ? "paid" : data.locked ? (data.ready ? "billing" : "account") : "configure",
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function perform(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function updatePlan(planId: string) {
    const next = changeManualPlan(selection, planId);
    setSelection(next);
    if (next.addons.length < selection.addons.length)
      setNotice(
        "Se quitaron los adicionales que ya incluye este plan o que requieren otro tipo de proyecto. El resumen muestra la selección vigente.",
      );
    setAccepted(false);
  }
  function updateAddon(id: string, quantity: number) {
    const next = selectManualAddon(selection, id, quantity);
    const removed = selection.addons.filter(
      (a) => a.id !== id && !next.addons.some((row) => row.id === a.id),
    );
    setSelection(next);
    setNotice(
      removed.length
        ? "Se actualizaron alternativas, módulos cubiertos y requisitos de tu selección. El resumen muestra los cargos vigentes."
        : "",
    );
    setAccepted(false);
  }
  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trap = String(new FormData(event.currentTarget).get("website") || "");
    await perform(async () => {
      requestKey.current ||= crypto.randomUUID();
      const data = await api("/api/manual-quote", {
        key: requestKey.current,
        ...contact,
        consent: privacy,
        selection,
        website: trap,
      });
      setId(data.id);
      setStep("configure");
    });
  }
  async function continuePurchase() {
    await perform(async () => {
      if (!locked) await api("/api/manual-quote", { quoteId: id, selection }, "PATCH");
      const status = await api("/api/manual-quote", undefined, "GET");
      setReady(status.ready);
      setStep(status.ready ? "billing" : "account");
    });
  }
  async function restart() {
    await perform(async () => {
      await api("/api/manual-quote", {}, "DELETE");
      setId("");
      setStep("contact");
      setReady(false);
      setLocked(false);
      setAccepted(false);
      setReservedQuote(null);
      setSelection(initialSelection(initialPlan));
      setAccount({ firstName: "", lastName: "", company: "", password: "", confirmPassword: "" });
      requestKey.current = "";
    });
  }
  async function save() {
    await perform(async () => {
      await api("/api/manual-quote", { quoteId: id, selection }, "PATCH");
      setNotice("Cotización guardada. Puedes retomarla en este navegador durante 7 días.");
    });
  }
  async function download() {
    await perform(async () => {
      if (!locked) await api("/api/manual-quote", { quoteId: id, selection }, "PATCH");
      const response = await fetch(`/api/manual-quote/document?draft=${id}`, {
        credentials: "same-origin",
      });
      if (!response.ok)
        throw new Error(
          "No pudimos descargar el documento. Tu selección sigue guardada; vuelve a intentarlo.",
        );
      const url = URL.createObjectURL(await response.blob());
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = url;
      const link = document.createElement("a");
      link.href = url;
      link.download = `Zyteron-cotizacion-${id.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // El selector nativo puede permanecer abierto; la siguiente descarga o el desmontaje libera el archivo.
      setNotice("Documento descargado con el alcance y los valores de tu selección.");
    });
  }
  async function authenticate(event: FormEvent) {
    event.preventDefault();
    await perform(async () => {
      if (authMode === "register") {
        try {
          const data = await api("/api/manual-quote/account", {
            quoteId: id,
            ...account,
            company: account.company || "Particular",
            email: contact.email,
          });
          setAuthMode("verify");
          setNotice(data.message);
          setCooldown(45);
        } catch (e) {
          if ((e as Error & { existing?: boolean }).existing) setAuthMode("login");
          throw e;
        }
      } else if (authMode === "verify") {
        await api("/api/portal/auth/verify-code", { email: contact.email, code });
        if (!account.password) {
          setAuthMode("login");
          setNotice("Correo verificado. Ingresa tu contraseña para continuar.");
          return;
        }
        await login();
      } else await login();
    });
  }
  async function login() {
    const result = await signIn("credentials", {
      email: contact.email,
      password: account.password,
      redirect: false,
    });
    if (result?.error)
      throw new Error(
        "No pudimos iniciar sesión. Revisa tu contraseña y verifica el correo; también puedes recuperar el acceso.",
      );
    const status = await api("/api/manual-quote", undefined, "GET");
    if (!status.ready)
      throw new Error("La cuenta debe estar activa y con correo verificado para pagar.");
    setReady(true);
    setAccount({ ...account, password: "", confirmPassword: "" });
    setStep("billing");
  }
  async function resend() {
    await perform(async () => {
      await api("/api/portal/auth/resend-code", { email: contact.email });
      setAuthMode("verify");
      setNotice("Código reenviado. Revisa tu correo y la carpeta de spam.");
      setCooldown(45);
    });
  }
  async function pay(event: FormEvent) {
    event.preventDefault();
    await perform(async () => {
      const data = await api("/api/manual-quote/checkout", {
        quoteId: id,
        expectedTotal: quote.total,
        selection,
        accepted,
        billing,
      });
      const url = new URL(data.checkoutUrl);
      if (!["www.flow.cl", "sandbox.flow.cl"].includes(url.hostname) || url.protocol !== "https:")
        throw new Error("La dirección de pago no pudo validarse.");
      setLocked(true);
      window.location.assign(url.toString());
    });
  }
  const selectedAddons = selection.addons.length;
  const normalizeSearch = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filteredAddons = CLOSED_ADDONS.filter(
    (a) =>
      (category === "Todos" ||
        (category === "Seleccionados"
          ? selection.addons.some((row) => row.id === a.id)
          : a.category === category)) &&
      (!search.trim() ||
        normalizeSearch(`${a.name} ${a.category} ${a.scope}`).includes(
          normalizeSearch(search.trim()),
        )),
  );
  const categories = ["Todos", "Seleccionados", ...MANUAL_CATEGORIES.map((c) => c.name)];
  const input = (label: string, key: keyof Contact, type = "text") => (
    <label>
      {label}
      <input
        required
        type={type}
        value={contact[key]}
        maxLength={key === "phone" ? 25 : 160}
        autoComplete={key === "name" ? "name" : key === "phone" ? "tel" : "email"}
        onChange={(e) => {
          setContact({ ...contact, [key]: e.target.value });
          requestKey.current = "";
        }}
      />
    </label>
  );
  if (loading)
    return (
      <div className="manual-loading" role="status">
        Preparando tu cotizador…
      </div>
    );
  return (
    <div className="manual-builder">
      <div className="manual-progress" aria-label="Pasos de contratación">
        {["Configura tu proyecto", "Verifica tu cuenta", "Revisa y paga"].map((name, i) => (
          <span
            key={name}
            className={
              (step === "contact" || step === "configure" ? 0 : step === "account" ? 1 : 2) === i
                ? "current"
                : ""
            }
          >
            <b>{i + 1}</b>
            {name}
          </span>
        ))}
      </div>
      {error && (
        <p ref={errorRef} tabIndex={-1} className="manual-alert error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="manual-alert" role="status">
          {notice}
        </p>
      )}
      {step === "paid" ? (
        <div className="manual-complete">
          <CheckCircle2 size={40} />
          <h2>Tu pedido ya está pagado</h2>
          <p>
            Referencia #{id.slice(0, 8).toUpperCase()}. Conservamos el alcance y los valores
            aceptados con tu pedido.
          </p>
          <Link href="/clientes/panel" className="design-button">
            Ir a mi cuenta <ArrowRight size={18} />
          </Link>
          <a href={`/api/manual-quote/document?order=${id}`} target="_blank" rel="noopener">
            Descargar alcance contratado
          </a>
          <button type="button" className="manual-secondary" onClick={restart} disabled={busy}>
            Iniciar otra cotización
          </button>
        </div>
      ) : (
        <div className="manual-layout">
          <div className="manual-content">
            {step === "contact" && (
              <section className="manual-contact">
                <p className="eyebrow">Empecemos por conocerte</p>
                <h2 ref={headingRef} tabIndex={-1}>
                  ¿Para quién cotizamos?
                </h2>
                <p>
                  Estos datos permiten guardar tu cotización y que el equipo de Zyteron pueda
                  orientarte. No necesitas crear una cuenta hasta que decidas comprar.
                </p>
                <form onSubmit={start}>
                  <div className="manual-fields">
                    {input("Nombre y apellido", "name")}
                    {input("Correo electrónico", "email", "email")}
                    {input("Teléfono o WhatsApp", "phone", "tel")}
                  </div>
                  <input
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    className="manual-trap"
                    aria-hidden="true"
                  />
                  <label className="manual-check">
                    <input
                      required
                      type="checkbox"
                      checked={privacy}
                      onChange={(e) => setPrivacy(e.target.checked)}
                    />
                    <span>
                      Acepto la{" "}
                      <Link href="/privacidad" target="_blank">
                        política de privacidad
                      </Link>{" "}
                      y que Zyteron me contacte respecto de esta cotización. Al comenzar se
                      notificará al equipo comercial.
                    </span>
                  </label>
                  <button className="design-button" disabled={busy}>
                    {busy ? "Guardando…" : "Iniciar mi cotización"}
                    <ArrowRight size={18} />
                  </button>
                </form>
              </section>
            )}
            {step === "configure" && (
              <>
                <section>
                  <p className="eyebrow">01 / La base de tu proyecto</p>
                  <h2 ref={headingRef} tabIndex={-1}>
                    Un plan para comenzar.
                  </h2>
                  <p>
                    Cada precio corresponde al alcance que se detalla aquí. Luego puedes sumar
                    adicionales.
                  </p>
                  <div className="manual-plans">
                    {CLOSED_PLANS.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        aria-pressed={selection.planId === p.id}
                        className={selection.planId === p.id ? "selected" : ""}
                        onClick={() => updatePlan(p.id)}
                      >
                        <span className="manual-plan-title">
                          {p.name}
                          <span className="manual-radio">
                            {selection.planId === p.id && <Check size={14} />}
                          </span>
                        </span>
                        <strong>
                          {clp(p.amount)}
                          <small> + IVA</small>
                        </strong>
                        <span>{p.includes[0]}</span>
                        <em>{p.days.join("–")} días hábiles base</em>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="manual-addon-section">
                  <p className="eyebrow">02 / Hazlo a tu medida</p>
                  <h2>Agrega lo que te sirve.</h2>
                  <p>
                    Mostramos qué contempla cada precio. Las funciones que ya trae tu plan no se
                    vuelven a cobrar.
                  </p>
                  <div className="manual-catalog-intro">
                    <div>
                      <strong>{CLOSED_ADDONS.length} módulos</strong>
                      <span>{MANUAL_CATEGORIES.length} categorías para construir tu proyecto</span>
                    </div>
                    <p>
                      Implementación con precio fijo. Licencias, renovaciones y consumos de terceros
                      por separado.
                    </p>
                  </div>
                  <label className="manual-search">
                    <Search size={18} aria-hidden="true" />
                    <span className="sr-only">Buscar módulos</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Busca correo, calendario, CRM, base de datos…"
                    />
                  </label>
                  <div
                    className="manual-filters"
                    role="group"
                    aria-label="Categorías de adicionales"
                  >
                    {categories.map((c) => (
                      <button
                        type="button"
                        key={c}
                        aria-pressed={category === c}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                        {c === "Seleccionados" ? ` (${selectedAddons})` : ""}
                      </button>
                    ))}
                  </div>
                  <p className="manual-result-count" role="status">
                    {filteredAddons.length} módulos
                    {search.trim() ? ` para “${search.trim()}”` : " en esta vista"}
                  </p>
                  {filteredAddons.length === 0 && (
                    <div className="manual-empty">
                      <h3>No hay módulos en esta vista.</h3>
                      <p>Prueba otra búsqueda o explora todas las categorías.</p>
                      <button
                        type="button"
                        className="manual-secondary"
                        onClick={() => {
                          setSearch("");
                          setCategory("Todos");
                        }}
                      >
                        Ver todos los módulos
                      </button>
                    </div>
                  )}
                  {MANUAL_CATEGORIES.filter((c) =>
                    filteredAddons.some((a) => a.category === c.name),
                  ).map((group, groupIndex) => (
                    <details
                      className="manual-addon-group"
                      key={`${category}-${search.trim() ? "search" : "browse"}-${group.name}`}
                      open={category !== "Todos" || Boolean(search.trim()) || groupIndex === 0}
                    >
                      <summary>
                        <span>
                          <strong>{group.name}</strong>
                          <small>{group.description}</small>
                        </span>
                        <b>
                          {filteredAddons.filter((a) => a.category === group.name).length}
                          <span className="sr-only"> módulos</span>
                        </b>
                      </summary>
                      <div className="manual-addons">
                        {filteredAddons
                          .filter((a) => a.category === group.name)
                          .map((a) => {
                            const unavailable = addonAvailability(
                                selection.planId,
                                a,
                                selection.addons,
                              ),
                              qty = selection.addons.find((row) => row.id === a.id)?.quantity || 0;
                            return (
                              <article key={a.id} className={qty ? "chosen" : ""}>
                                <div className="manual-addon-top">
                                  <label className="manual-check">
                                    <input
                                      type="checkbox"
                                      disabled={Boolean(unavailable)}
                                      checked={qty > 0}
                                      onChange={(e) => updateAddon(a.id, e.target.checked ? 1 : 0)}
                                    />
                                    <span>
                                      <strong>{a.name}</strong>
                                      <small>
                                        {unavailable || `+${a.days} días hábiles por unidad`}
                                      </small>
                                    </span>
                                  </label>
                                  <b>
                                    {unavailable?.startsWith("Incluido")
                                      ? "Incluido"
                                      : clp(a.amount)}
                                    <small>
                                      {unavailable?.startsWith("Incluido")
                                        ? "Sin cargo adicional"
                                        : "+ IVA · pago único"}
                                    </small>
                                  </b>
                                </div>
                                <p>{a.scope}</p>
                                <details>
                                  <summary>Ver límites y exclusiones</summary>
                                  <p>{a.excludes}</p>
                                  {(a.conflicts || a.covers) && (
                                    <p>
                                      Se reemplazan las alternativas incompatibles y los módulos
                                      cubiertos por esta opción. El resumen refleja los cargos
                                      vigentes.
                                    </p>
                                  )}
                                </details>
                                {a.max > 1 && qty > 0 && (
                                  <label className="manual-quantity">
                                    Cantidad
                                    <select
                                      value={qty}
                                      onChange={(e) => updateAddon(a.id, Number(e.target.value))}
                                    >
                                      {Array.from({ length: a.max }, (_, i) => (
                                        <option key={i + 1}>{i + 1}</option>
                                      ))}
                                    </select>
                                  </label>
                                )}
                              </article>
                            );
                          })}
                      </div>
                    </details>
                  ))}
                </section>
                <div className="manual-custom">
                  <h3>¿Necesitas un sistema o una integración específica?</h3>
                  <p>
                    Control de flota, ERP, gestión de personas, IA y proyectos corporativos
                    requieren un alcance técnico. El software de flota no incluye GPS, instalación
                    ni conectividad.
                  </p>
                  <Link href="/cotizador" className="text-link">
                    Solicitar propuesta a medida <ArrowRight size={16} />
                  </Link>
                </div>
                <ScopeSummary quote={quote} />
              </>
            )}
            {step === "account" && (
              <section className="manual-account">
                <p className="eyebrow">03 / Tu compra, a tu nombre</p>
                <h2 ref={headingRef} tabIndex={-1}>
                  {authMode === "verify"
                    ? "Verifica tu correo."
                    : authMode === "login"
                      ? "Bienvenido de vuelta."
                      : "Crea tu cuenta para comprar."}
                </h2>
                <p>
                  Usaremos <strong>{contact.email}</strong> para el código de seguridad, el acceso a
                  tu proyecto y tus comprobantes.
                </p>
                <div className="manual-auth-tabs">
                  <button
                    type="button"
                    aria-pressed={authMode === "register"}
                    onClick={() => {
                      setAuthMode("register");
                      setError("");
                    }}
                  >
                    Crear cuenta
                  </button>
                  <button
                    type="button"
                    aria-pressed={authMode === "login"}
                    onClick={() => {
                      setAuthMode("login");
                      setError("");
                    }}
                  >
                    Ya tengo cuenta
                  </button>
                </div>
                <form onSubmit={authenticate}>
                  <div className="manual-fields">
                    {authMode === "register" && (
                      <>
                        <label>
                          Nombre
                          <input
                            required
                            autoComplete="given-name"
                            minLength={2}
                            maxLength={80}
                            value={account.firstName}
                            onChange={(e) => setAccount({ ...account, firstName: e.target.value })}
                          />
                        </label>
                        <label>
                          Apellido
                          <input
                            required
                            autoComplete="family-name"
                            minLength={2}
                            maxLength={80}
                            value={account.lastName}
                            onChange={(e) => setAccount({ ...account, lastName: e.target.value })}
                          />
                        </label>
                        <label>
                          Empresa (opcional)
                          <input
                            autoComplete="organization"
                            maxLength={160}
                            value={account.company}
                            onChange={(e) => setAccount({ ...account, company: e.target.value })}
                          />
                        </label>
                      </>
                    )}
                    <label>
                      Correo electrónico
                      <input type="email" readOnly value={contact.email} autoComplete="username" />
                    </label>
                    {authMode === "verify" ? (
                      <label>
                        Código de seguridad
                        <input
                          required
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        />
                        <small>6 dígitos. Vence en 15 minutos y permite hasta 5 intentos.</small>
                      </label>
                    ) : (
                      <>
                        <label>
                          Contraseña
                          <input
                            required
                            type="password"
                            autoComplete={
                              authMode === "register" ? "new-password" : "current-password"
                            }
                            minLength={authMode === "register" ? 8 : 1}
                            maxLength={128}
                            value={account.password}
                            onChange={(e) => setAccount({ ...account, password: e.target.value })}
                          />
                          {authMode === "register" && (
                            <small>
                              Al menos 8 caracteres, una mayúscula, una minúscula y un número.
                            </small>
                          )}
                        </label>
                        {authMode === "register" && (
                          <label>
                            Repite la contraseña
                            <input
                              required
                              type="password"
                              autoComplete="new-password"
                              maxLength={128}
                              value={account.confirmPassword}
                              onChange={(e) =>
                                setAccount({ ...account, confirmPassword: e.target.value })
                              }
                            />
                          </label>
                        )}
                      </>
                    )}
                  </div>
                  <button className="design-button" disabled={busy}>
                    {busy
                      ? "Procesando…"
                      : authMode === "verify"
                        ? "Verificar correo y continuar"
                        : authMode === "login"
                          ? "Iniciar sesión y continuar"
                          : "Crear cuenta y recibir código"}
                    <ArrowRight size={18} />
                  </button>
                </form>
                {authMode !== "register" && (
                  <div className="manual-auth-help">
                    <button
                      type="button"
                      className="text-link"
                      disabled={busy || cooldown > 0}
                      onClick={resend}
                    >
                      {cooldown > 0
                        ? `Reenviar en ${cooldown}s`
                        : "Reenviar código de verificación"}
                    </button>
                    <Link href="/clientes/recuperar" target="_blank">
                      Recuperar contraseña
                    </Link>
                  </div>
                )}
                <p className="manual-security">
                  <LockKeyhole size={16} /> La compra requiere una cuenta activa y un correo
                  verificado.
                </p>
              </section>
            )}
            {step === "billing" && (
              <section>
                <p className="eyebrow">Último paso / Revisa antes de pagar</p>
                <h2 ref={headingRef} tabIndex={-1}>
                  Todo claro antes de contratar.
                </h2>
                <p className="manual-security">
                  <ShieldCheck size={18} /> Correo verificado: {contact.email}
                </p>
                <ScopeSummary quote={quote} />
                <form onSubmit={pay} className="manual-billing">
                  <h3>Datos para el comprobante</h3>
                  <div className="manual-fields">
                    <label>
                      Tipo de documento
                      <select
                        value={billing.documentType}
                        onChange={(e) =>
                          setBilling({
                            ...billing,
                            documentType: e.target.value as Billing["documentType"],
                          })
                        }
                      >
                        <option value="BOLETA">Boleta</option>
                        <option value="FACTURA">Factura</option>
                      </select>
                    </label>
                    <label>
                      RUT del comprador
                      <input
                        required
                        value={billing.rut}
                        placeholder="12.345.678-5"
                        maxLength={20}
                        onChange={(e) => setBilling({ ...billing, rut: e.target.value })}
                      />
                    </label>
                    <label>
                      Dirección de facturación
                      <input
                        required
                        minLength={8}
                        maxLength={260}
                        autoComplete="street-address"
                        value={billing.address}
                        onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                      />
                    </label>
                    {billing.documentType === "FACTURA" && (
                      <>
                        {(
                          [
                            ["Razón social", "companyName"],
                            ["RUT de la empresa", "companyRut"],
                            ["Giro", "businessLine"],
                          ] as const
                        ).map(([label, key]) => (
                          <label key={key}>
                            {label}
                            <input
                              required
                              maxLength={key === "companyRut" ? 20 : 160}
                              value={billing[key]}
                              onChange={(e) => setBilling({ ...billing, [key]: e.target.value })}
                            />
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                  <label className="manual-check manual-accept">
                    <input
                      required
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />
                    <span>
                      Revisé y acepto el alcance, cantidades, exclusiones, plazo y condiciones del
                      resumen, además de los{" "}
                      <Link href="/terminos" target="_blank">
                        términos del servicio
                      </Link>
                      . El pago único es de <strong>{clp(quote.total)} IVA incluido</strong>.
                    </span>
                  </label>
                  <button className="design-button" disabled={busy || !ready || !accepted}>
                    {busy ? "Preparando pago seguro…" : `Pagar ${clp(quote.total)}`}
                    <ArrowRight size={18} />
                  </button>
                  <p className="manual-security">
                    <LockKeyhole size={16} /> Continuarás en Flow. Zyteron no recibe los datos de tu
                    tarjeta.
                  </p>
                </form>
              </section>
            )}
          </div>
          <aside className="manual-receipt" aria-label="Resumen de cotización">
            <div className="manual-receipt-heading">
              <p className="eyebrow">Tu proyecto</p>
              <span>{id ? `#${id.slice(0, 8).toUpperCase()}` : "Vista previa"}</span>
            </div>
            <h2>{quote.base.name}</h2>
            <dl>
              <div>
                <dt>Plan base</dt>
                <dd>{clp(quote.base.amount)}</dd>
              </div>
              {quote.addons.map((a) => (
                <div key={a.id}>
                  <dt>
                    {a.name}
                    {a.quantity > 1 ? ` × ${a.quantity}` : ""}
                  </dt>
                  <dd>{clp(a.lineTotal)}</dd>
                </div>
              ))}
              <div className="manual-subtotal">
                <dt>Subtotal neto</dt>
                <dd>{clp(quote.net)}</dd>
              </div>
              <div>
                <dt>IVA (19%)</dt>
                <dd>{clp(quote.tax)}</dd>
              </div>
              <div className="manual-total">
                <dt>
                  Total a pagar<small>Pago único · CLP</small>
                </dt>
                <dd aria-live="polite">{clp(quote.total)}</dd>
              </div>
            </dl>
            <div className="manual-delivery">
              <Clock3 size={20} />
              <div>
                <strong>{quote.days.join("–")} días hábiles</strong>
                <span>
                  Desde pago, contenidos y accesos completos. Incluye el tiempo de los adicionales.
                </span>
              </div>
            </div>
            <p className="manual-receipt-note">
              {selectedAddons
                ? `${selectedAddons} tipos de adicionales seleccionados.`
                : "Sin adicionales seleccionados."}{" "}
              No incluye costos de terceros ni mantenimiento mensual.
            </p>
            {step === "configure" && (
              <>
                <button className="design-button" disabled={busy} onClick={continuePurchase}>
                  Comprar este proyecto <ArrowRight size={18} />
                </button>
                <button type="button" className="manual-secondary" disabled={busy} onClick={save}>
                  Guardar cotización
                </button>
              </>
            )}
            {(step === "account" || step === "billing") && !locked && (
              <button
                type="button"
                className="manual-secondary"
                disabled={busy}
                onClick={() => {
                  setStep("configure");
                  setAccepted(false);
                }}
              >
                Volver a la selección
              </button>
            )}
            {id && (
              <button type="button" className="manual-secondary" disabled={busy} onClick={download}>
                {busy ? "Preparando…" : "Descargar cotización PDF"} <FileText size={16} />
              </button>
            )}
            {id && (
              <button type="button" className="manual-secondary" onClick={restart} disabled={busy}>
                Iniciar otra cotización
              </button>
            )}
            <small>Dos rondas de ajustes · Entrega documentada</small>
          </aside>
        </div>
      )}
      {step === "configure" && (
        <div className="manual-mobile-bar">
          <span>
            <small>Total con IVA</small>
            <strong>{clp(quote.total)}</strong>
          </span>
          <button
            type="button"
            className="design-button"
            disabled={busy}
            onClick={continuePurchase}
          >
            Revisar y continuar <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
