"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Drawer, Feedback, Field, Loading } from "@control/components/finance/fx-ui";
import {
  buildTemplateMessage,
  templateFields,
  type WhatsappTemplate,
} from "@/lib/whatsapp/template-format";
import { formatDateTime } from "@control/lib/date-time";

export function TemplatePicker({
  conversationId,
  onClose,
  onSent,
}: {
  conversationId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [templates, setTemplates] = useState<WhatsappTemplate[] | null>(null),
    [selected, setSelected] = useState(""),
    [values, setValues] = useState<Record<string, string>>({}),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    fetch("/api/admin/whatsapp/templates", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (live)
          setTemplates(d.templates.filter((t: WhatsappTemplate) => t.status === "APPROVED" && t.name !== "hello_world"));
      })
      .catch((e) => {
        if (live)
          setError(
            e.message === "WABA_ID_REQUIRED"
              ? "Vincula la cuenta de WhatsApp Business en Alertas → Cuenta de WhatsApp (WABA)."
              : e.message,
          );
      });
    return () => {
      live = false;
    };
  }, []);
  const template = templates?.find((t) => `${t.name}:${t.language}` === selected);
  let fields: ReturnType<typeof templateFields> = [],
    preview = "",
    unsupported = "";
  if (template)
    try {
      fields = templateFields(template);
      preview = buildTemplateMessage(
        template,
        Object.fromEntries(fields.map((f) => [f.key, values[f.key] || `[${f.label}]`])),
      ).preview;
    } catch (e) {
      unsupported = e instanceof Error ? e.message : "Plantilla no disponible.";
    }
  return createPortal(
    <div className="zy-full-control">
      <Drawer
        open
        title="Retomar contacto por WhatsApp"
        subtitle="Plantillas aprobadas por Meta para continuar fuera de las 24 horas."
        onClose={onClose}
      >
        <p className="fx-hint">
          El cliente debe autorizar el seguimiento. La conversación permanece en tu bandeja; cuando
          responda, se habilitan nuevamente los mensajes libres durante 24 horas.
        </p>
        <Feedback error={error || unsupported} />
        {!templates && !error ? <Loading text="Consultando plantillas aprobadas…" /> : null}
        {templates ? (
          <div className="fx-form">
            <Field label="Plantilla aprobada" span={3}>
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setValues({});
                }}
              >
                <option value="">Selecciona una plantilla…</option>
                {templates.map((t) => (
                  <option key={`${t.name}:${t.language}`} value={`${t.name}:${t.language}`}>
                    {t.name} · {t.language}
                  </option>
                ))}
              </select>
            </Field>
            {!templates.length ? (
              <p className="fx-hint">
                No hay plantillas aprobadas en esta cuenta. Crea la plantilla de seguimiento en
                WhatsApp Manager y espera la aprobación de Meta.
              </p>
            ) : null}
            {fields.map((f) => (
              <Field key={f.key} label={f.label} span={3}>
                <input
                  maxLength={1000}
                  value={values[f.key] || ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              </Field>
            ))}
            {preview ? (
              <Field label="Vista previa" span={3}>
                <div className="wa-template-preview">{preview}</div>
              </Field>
            ) : null}
            <label className="fx-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />{" "}
              El cliente autorizó recibir este seguimiento por WhatsApp.
            </label>
          </div>
        ) : null}
        <div className="fx-actions end">
          <button
            className="fx-btn primary"
            disabled={
              busy ||
              !template ||
              Boolean(unsupported) ||
              !consent ||
              fields.some((f) => !values[f.key]?.trim())
            }
            onClick={async () => {
              if (!template) return;
              setBusy(true);
              setError("");
              try {
                const r = await fetch("/api/admin/whatsapp/templates", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    requestId,
                    conversationId,
                    name: template.name,
                    language: template.language,
                    values,
                    consentAcknowledged: consent,
                  }),
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                onSent();
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : "No fue posible enviar.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Enviando…" : "Enviar plantilla"}
          </button>
        </div>
      </Drawer>
    </div>,
    document.body,
  );
}
type AlertStatus = {
  settings: {
    email_recipients: string[];
    whatsapp_recipients: string[];
    whatsapp_template: string | null;
    whatsapp_language: string;
    waba_id: string | null;
  };
  emailConfigured: boolean;
  whatsappConfigured: boolean;
  recent: Array<{
    id: string;
    channel: string;
    recipient: string;
    state: string;
    error_code: string | null;
    title: string;
    created_at: string;
  }>;
};
const states: Record<string, string> = {
  PENDING: "Pendiente",
  PROCESSING: "En proceso",
  ACCEPTED: "Aceptado por el proveedor",
  DELIVERED: "Entregado",
  FAILED: "Falló el envío",
  WAITING_CONFIGURATION: "Configuración pendiente",
  REVIEW_REQUIRED: "Revisar envío",
};
export function ContactAlertsPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<AlertStatus | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({
      emails: "",
      phones: "",
      waba: "",
      template: "",
      language: "es_CL",
    }),
    [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/admin/notifications/contacts", { cache: "no-store" })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw Error(d.error);
          if (live) {
            setData(d);
            return d as AlertStatus;
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    void load().then((d) => {
      if (d && live)
        setForm({
          emails: d.settings.email_recipients.join(", "),
          phones: d.settings.whatsapp_recipients.join(", "),
          waba: d.settings.waba_id || "",
          template: d.settings.whatsapp_template || "",
          language: d.settings.whatsapp_language,
        });
    });
    const timer = setInterval(() => void load(), 10000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  return createPortal(
    <div className="zy-full-control">
      <Drawer
        open
        wide
        title="Alertas de contacto"
        subtitle="Correo y WhatsApp para leads, chat IA, cotizaciones, contacto y mensajes entrantes."
        onClose={onClose}
      >
        <Feedback error={error} notice={notice} />
        {!data && !error ? <Loading /> : null}
        {data ? (
          <>
            <div className="fx-chips">
              <span className={`fx-chip ${data.emailConfigured ? "good" : "warn"}`}>
                Correo ·{" "}
                {data.emailConfigured ? "credenciales configuradas" : "configuración pendiente"}
              </span>
              <span
                className={`fx-chip ${data.whatsappConfigured && data.settings.whatsapp_template ? "good" : "warn"}`}
              >
                WhatsApp ·{" "}
                {data.settings.whatsapp_template
                  ? "plantilla seleccionada"
                  : "falta plantilla de alertas"}
              </span>
            </div>
            <p className="fx-hint">
              Los contactos quedan en una cola persistente al guardarse. Se procesan cada 5
              segundos, con reintentos para errores de correo. Un envío aceptado todavía puede estar
              pendiente de entrega.
            </p>
            {!data.settings.email_recipients.length&&!data.settings.whatsapp_recipients.length?<p className="fx-hint">Los avisos se conservarán en cola hasta configurar los destinatarios.</p>:null}
            <div className="fx-form">
              <Field label="Correos de aviso" span={3}>
                <input
                  value={form.emails}
                  onChange={(e) => setForm({ ...form, emails: e.target.value })}
                  placeholder="contacto@zyteron.cl"
                />
              </Field>
              <Field
                label="WhatsApp de aviso"
                span={3}
                hint="Números con código de país, separados por coma. Deben autorizar estas alertas."
              >
                <input
                  value={form.phones}
                  onChange={(e) => setForm({ ...form, phones: e.target.value })}
                  placeholder="56912345678"
                />
              </Field>
              <Field
                label="Cuenta de WhatsApp (WABA)"
                span={2}
                hint="Identificador de cuenta en Meta → WhatsApp → Configuración de API."
              >
                <input
                  value={form.waba}
                  onChange={(e) => setForm({ ...form, waba: e.target.value.replace(/\D/g, "") })}
                />
              </Field>
              <Field label="Idioma de plantilla">
                <input
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                />
              </Field>
              <Field
                label="Plantilla de avisos"
                span={3}
                hint="Plantilla aprobada con una variable de texto en el cuerpo. Esa variable contiene el resumen del contacto."
              >
                <input
                  list="wa-alert-templates"
                  value={form.template}
                  onChange={(e) => setForm({ ...form, template: e.target.value })}
                />
                <datalist id="wa-alert-templates">
                  {templates.map((t) => (
                    <option key={`${t.name}:${t.language}`} value={t.name}>
                      {t.language}
                    </option>
                  ))}
                </datalist>
              </Field>
            </div>
            <div className="fx-actions">
              <button
                className="fx-btn primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  setNotice("");
                  try {
                    const r = await fetch("/api/admin/notifications/contacts", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        emailRecipients: form.emails
                          .split(/[,;\n]/)
                          .map((v) => v.trim())
                          .filter(Boolean),
                        whatsappRecipients: form.phones
                          .split(/[,;\n]/)
                          .map((v) => v.replace(/\D/g, ""))
                          .filter(Boolean),
                        wabaId: form.waba,
                        template: form.template,
                        language: form.language,
                      }),
                    });
                    const d = await r.json();
                    if (!r.ok) throw Error(d.error);
                    setNotice(
                      "Configuración guardada. Los avisos pendientes se revisarán automáticamente.",
                    );
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "No fue posible guardar.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Guardar alertas
              </button>
              <button
                className="fx-btn"
                onClick={async () => {
                  setError("");
                  try {
                    const r = await fetch("/api/admin/whatsapp/templates", { cache: "no-store" });
                    const d = await r.json();
                    if (!r.ok) throw Error(d.error);
                    setTemplates(
                      d.templates.filter((t: WhatsappTemplate) => t.status === "APPROVED"),
                    );
                    setNotice("Plantillas consultadas. Selecciona la de avisos y guarda.");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "No se pudieron consultar.");
                  }
                }}
              >
                Consultar plantillas
              </button>
              <button
                className="fx-btn"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const r = await fetch("/api/admin/whatsapp/templates/setup", {
                      method: "POST",
                    });
                    const d = await r.json();
                    if (!r.ok) throw Error(d.error);
                    setNotice(
                      d.templates
                        .map((t: { name: string; status: string }) => `${t.name}: ${t.status}`)
                        .join(" · "),
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "No fue posible solicitar las plantillas.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Solicitar plantillas de Zyteron
              </button>
              <a
                className="fx-btn ghost"
                href="https://business.facebook.com/latest/whatsapp_manager/message_templates"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp Manager
              </a>
            </div>
            <h3 className="fx-subhead">Últimos envíos</h3>
            <div className="wa-alert-history">
              {data.recent.length ? (
                data.recent.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <small>
                        {item.channel === "EMAIL" ? "Correo" : "WhatsApp"} · {item.recipient} ·{" "}
                        {formatDateTime(item.created_at)}
                      </small>
                    </div>
                    <span>{states[item.state] || item.state}</span>
                    {item.error_code ? (
                      <small>
                        {item.error_code === "APPROVED_ALERT_TEMPLATE_REQUIRED"
                          ? "Selecciona una plantilla aprobada para avisar fuera de las 24 horas."
                          : item.error_code}
                      </small>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="fx-hint">
                  Los próximos contactos aparecerán aquí con el estado de cada canal.
                </p>
              )}
            </div>
          </>
        ) : null}
      </Drawer>
    </div>,
    document.body,
  );
}
