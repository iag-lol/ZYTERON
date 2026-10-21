"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileCheck2,
  FileText,
  Save,
  RefreshCw,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { hasFinancePermission, siiDocumentDefinition } from "@zyteron/contracts";
import { useAccess } from "@control/components/access-context";
import { financeApi, fileToUpload, type UploadedFile } from "@control/lib/finance-api";
import { formatDateTime } from "@control/lib/date-time";
import {
  initialSiiCases,
  type SiiCaseDraft,
  type SiiCaseSource,
  type SiiSetView,
  type SiiParty,
  type SiiBookEntry,
  type SiiRunDetail,
} from "@control/lib/sii-certification";
import {
  DateInput,
  Empty,
  Feedback,
  Field,
  Loading,
  LoadError,
  Section,
  Stamp,
  useAction,
  useLoad,
} from "./fx-ui";
import "@control/styles/sii-certification.css";

const statusLabel: Record<string, string> = {
  PREPARED: "Preparado",
  SENDING: "Envío en curso o por recuperar",
  SUBMITTED: "Recibido; pendiente de validación",
  UNKNOWN: "Recepción incierta",
  REJECTED: "Rechazado",
  ACCEPTED: "Aceptado",
  ACCEPTED_WITH_REPAIRS: "Aceptado con reparos",
};
function responseMessage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const latest =
    record.latest && typeof record.latest === "object"
      ? (record.latest as Record<string, unknown>)
      : record;
  return typeof latest.message === "string" ? latest.message.slice(0, 1000) : null;
}
interface SavedDraft {
  version: number;
  payload: {
    runId: string;
    date: string;
    cases: SiiCaseDraft[];
    reviewed: string[];
    purchaseEntries: SiiBookEntry[];
    commonFactor: number;
    guideStates: Record<
      string,
      {
        annulled?: 1 | 2;
        billedCaseId?: string;
        billedPaperReference?: { type: 30; folio: number; date: string };
      }
    >;
  };
}
const title = (type: number) => siiDocumentDefinition(type)?.name ?? `Documento ${type}`;
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
const inputNumber = (value: string) => (value === "" ? 0 : Number(value));
function NumberField({
  label,
  value,
  onChange,
  signed = false,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  signed?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        step="any"
        min={signed ? undefined : 0}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(inputNumber(e.target.value))}
      />
    </Field>
  );
}
function PartyFields({
  party,
  onChange,
}: {
  party: SiiParty;
  onChange: (value: SiiParty) => void;
}) {
  return (
    <div className="sc-fields">
      {(
        [
          ["rut", "RUT"],
          ["legalName", "Razón social"],
          ["businessActivity", "Giro"],
          ["address", "Dirección"],
          ["commune", "Comuna"],
          ["city", "Ciudad"],
        ] as const
      ).map(([key, label]) => (
        <Field key={key} label={label}>
          <input
            required={key !== "city"}
            value={party[key] ?? ""}
            onChange={(e) => onChange({ ...party, [key]: e.target.value })}
          />
        </Field>
      ))}
    </div>
  );
}

function CaseEditor({
  source,
  draft,
  onChange,
}: {
  source: SiiCaseSource;
  draft: SiiCaseDraft;
  onChange: (value: SiiCaseDraft) => void;
}) {
  const updateLine = (index: number, patch: Partial<SiiCaseDraft["lines"][number]>) =>
    onChange({
      ...draft,
      lines: draft.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    });
  return (
    <div className="sc-case-editor">
      <details className="sc-source" open>
        <summary>Instrucciones oficiales · {source.id}</summary>
        <pre>{source.raw}</pre>
      </details>
      <Section
        title="Receptor del documento"
        description="Datos utilizados únicamente en estos casos de certificación."
      >
        <PartyFields
          party={draft.receiver}
          onChange={(receiver) => onChange({ ...draft, receiver })}
        />
      </Section>
      {source.referenceCaseId ? (
        <Section
          title="Referencia vinculada"
          description={`Documento original: caso ${source.referenceCaseId}. Su tipo y folio se resolverán al reservar el lote.`}
        >
          <div className="sc-fields">
            <Field label="Motivo">
              <input
                value={draft.referenceReason ?? ""}
                onChange={(e) => onChange({ ...draft, referenceReason: e.target.value })}
              />
            </Field>
            <Field label="Tipo de corrección">
              <select
                value={draft.referenceCode ?? 3}
                onChange={(e) =>
                  onChange({ ...draft, referenceCode: Number(e.target.value) as 1 | 2 | 3 })
                }
              >
                <option value={1}>Anula documento</option>
                <option value={2}>Corrige texto</option>
                <option value={3}>Corrige montos</option>
              </select>
            </Field>
          </div>
        </Section>
      ) : null}
      <Section
        title="Detalle del caso"
        description="Conserva los nombres, cantidades y valores del set."
        actions={
          <button
            className="fx-btn"
            onClick={() =>
              onChange({
                ...draft,
                lines: [...draft.lines, { description: "", quantity: 1, unitPrice: 0 }],
              })
            }
          >
            <Plus size={14} />
            Partida
          </button>
        }
      >
        {draft.lines.map((line, index) => (
          <div className="sc-line" key={index}>
            <div className="sc-line-head">
              <strong>Partida {index + 1}</strong>
              <button
                className="fx-icon"
                disabled={draft.lines.length === 1}
                aria-label={`Eliminar partida ${index + 1}`}
                onClick={() =>
                  onChange({ ...draft, lines: draft.lines.filter((_, i) => i !== index) })
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
            <Field label="Descripción exacta">
              <input
                value={line.description}
                maxLength={80}
                onChange={(e) => updateLine(index, { description: e.target.value })}
              />
            </Field>
            <div className="sc-fields">
              <NumberField
                label={source.type === 43 ? "Cantidad de documentos" : "Cantidad"}
                value={line.quantity}
                onChange={(quantity) => updateLine(index, { quantity })}
              />
              {source.type === 43 ? (
                <>
                  <NumberField
                    label="Tipo de documento liquidado"
                    value={line.liquidatedType}
                    onChange={(liquidatedType) => updateLine(index, { liquidatedType })}
                  />
                  <NumberField
                    label="Total de línea"
                    signed
                    value={line.liquidationAmount}
                    onChange={(liquidationAmount) => updateLine(index, { liquidationAmount })}
                  />
                </>
              ) : (
                <>
                  <NumberField
                    label={
                      source.type === 39 && source.id.startsWith("CASO-")
                        ? "Precio unitario con IVA"
                        : "Precio unitario"
                    }
                    value={line.unitPrice}
                    onChange={(unitPrice) => updateLine(index, { unitPrice })}
                  />
                  <NumberField
                    label="Descuento (%)"
                    value={line.discountPct}
                    onChange={(discountPct) => updateLine(index, { discountPct })}
                  />
                  <NumberField
                    label="Recargo (%)"
                    value={line.surchargePct}
                    onChange={(surchargePct) => updateLine(index, { surchargePct })}
                  />
                  <Field label="Unidad de medida">
                    <input
                      maxLength={4}
                      value={line.unit ?? ""}
                      onChange={(e) => updateLine(index, { unit: e.target.value || undefined })}
                    />
                  </Field>
                </>
              )}
            </div>
            <label className="sc-check">
              <input
                type="checkbox"
                checked={Boolean(line.exempt)}
                onChange={(e) => updateLine(index, { exempt: e.target.checked })}
              />
              Ítem exento o no afecto
            </label>
          </div>
        ))}
      </Section>
      <Section
        title="Descuentos y recargos globales"
        actions={
          <button
            className="fx-btn"
            onClick={() =>
              onChange({
                ...draft,
                adjustments: [
                  ...(draft.adjustments ?? []),
                  { movement: "D", kind: "%", value: 0, description: "" },
                ],
              })
            }
          >
            <Plus size={14} />
            Ajuste
          </button>
        }
      >
        {!draft.adjustments?.length ? (
          <p className="sc-muted">Sin ajustes globales.</p>
        ) : (
          draft.adjustments.map((a, index) => (
            <div className="sc-fields" key={index}>
              <Field label="Glosa">
                <input
                  value={a.description}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      adjustments: draft.adjustments!.map((v, i) =>
                        i === index ? { ...v, description: e.target.value } : v,
                      ),
                    })
                  }
                />
              </Field>
              <Field label="Movimiento">
                <select
                  value={a.movement}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      adjustments: draft.adjustments!.map((v, i) =>
                        i === index ? { ...v, movement: e.target.value as "D" | "R" } : v,
                      ),
                    })
                  }
                >
                  <option value="D">Descuento</option>
                  <option value="R">Recargo</option>
                </select>
              </Field>
              <Field label="Unidad">
                <select
                  value={a.kind}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      adjustments: draft.adjustments!.map((v, i) =>
                        i === index ? { ...v, kind: e.target.value as "%" | "$" } : v,
                      ),
                    })
                  }
                >
                  <option>%</option>
                  <option>$</option>
                </select>
              </Field>
              <NumberField
                label="Valor"
                value={a.value}
                onChange={(value) =>
                  onChange({
                    ...draft,
                    adjustments: draft.adjustments!.map((v, i) =>
                      i === index ? { ...v, value } : v,
                    ),
                  })
                }
              />
              <label className="sc-check">
                <input
                  type="checkbox"
                  checked={Boolean(a.exempt)}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      adjustments: draft.adjustments!.map((v, i) =>
                        i === index ? { ...v, exempt: e.target.checked } : v,
                      ),
                    })
                  }
                />
                Aplica a exentos
              </label>
              <button
                className="fx-btn"
                onClick={() =>
                  onChange({
                    ...draft,
                    adjustments: draft.adjustments!.filter((_, i) => i !== index),
                  })
                }
              >
                Quitar ajuste
              </button>
            </div>
          ))
        )}
      </Section>
      {draft.dispatch ? (
        <Section title="Despacho y destino">
          <div className="sc-fields">
            <Field label="Motivo de traslado">
              <select
                value={draft.dispatch.transfer}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    dispatch: { ...draft.dispatch!, transfer: Number(e.target.value) },
                  })
                }
              >
                {[
                  [1, "Venta"],
                  [2, "Venta por efectuar"],
                  [3, "Consignación"],
                  [4, "Entrega gratuita"],
                  [5, "Traslado interno"],
                  [6, "Otro traslado sin venta"],
                  [7, "Devolución"],
                  [8, "Traslado para exportación"],
                  [9, "Venta para exportación"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Despacho por cuenta de">
              <select
                value={draft.dispatch.responsibility}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    dispatch: { ...draft.dispatch!, responsibility: Number(e.target.value) },
                  })
                }
              >
                <option value={1}>Comprador</option>
                <option value={2}>Emisor al local del comprador</option>
                <option value={3}>Emisor a otras instalaciones</option>
              </select>
            </Field>
            {(["destinationAddress", "destinationCommune"] as const).map((key, index) => (
              <Field key={key} label={index ? "Comuna de destino" : "Dirección de destino"}>
                <input
                  value={draft.dispatch![key]}
                  onChange={(e) =>
                    onChange({ ...draft, dispatch: { ...draft.dispatch!, [key]: e.target.value } })
                  }
                />
              </Field>
            ))}
          </div>
        </Section>
      ) : null}
      {source.type === 43 ? (
        <Section
          title="Comisiones de liquidación"
          actions={
            <button
              className="fx-btn"
              onClick={() =>
                onChange({
                  ...draft,
                  commissions: [
                    ...(draft.commissions ?? []),
                    { description: "", net: 0, exempt: 0 },
                  ],
                })
              }
            >
              <Plus size={14} />
              Comisión
            </button>
          }
        >
          {(draft.commissions ?? []).map((c, i) => (
            <div className="sc-fields" key={i}>
              <Field label="Glosa">
                <input
                  value={c.description}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      commissions: draft.commissions!.map((v, n) =>
                        n === i ? { ...v, description: e.target.value } : v,
                      ),
                    })
                  }
                />
              </Field>
              <NumberField
                label="Neto"
                signed
                value={c.net}
                onChange={(net) =>
                  onChange({
                    ...draft,
                    commissions: draft.commissions!.map((v, n) => (n === i ? { ...v, net } : v)),
                  })
                }
              />
              <NumberField
                label="Exento"
                signed
                value={c.exempt}
                onChange={(exempt) =>
                  onChange({
                    ...draft,
                    commissions: draft.commissions!.map((v, n) => (n === i ? { ...v, exempt } : v)),
                  })
                }
              />
              <button
                className="fx-btn"
                onClick={() =>
                  onChange({ ...draft, commissions: draft.commissions!.filter((_, n) => n !== i) })
                }
              >
                Quitar comisión
              </button>
            </div>
          ))}
        </Section>
      ) : null}
      {draft.retention ? (
        <Section title="Retención de IVA">
          <div className="sc-fields">
            <NumberField
              label="Código SII de retención"
              value={draft.retention.code}
              onChange={(code) => onChange({ ...draft, retention: { ...draft.retention!, code } })}
            />
            <NumberField
              label="Tasa de retención (%)"
              value={draft.retention.rate}
              onChange={(rate) => onChange({ ...draft, retention: { ...draft.retention!, rate } })}
            />
          </div>
        </Section>
      ) : null}
      {draft.export ? (
        <Section
          title="Antecedentes de exportación"
          description="Utiliza los códigos de las tablas de Aduana indicados por el SII."
        >
          <div className="sc-fields">
            <Field label="Moneda">
              <input
                value={draft.export.currency}
                onChange={(e) =>
                  onChange({ ...draft, export: { ...draft.export!, currency: e.target.value } })
                }
              />
            </Field>
            {(
              [
                ["exchangeRateCLP", "Tipo de cambio a pesos chilenos"],
                ["receiverCountry", "País receptor"],
                ["destinationCountry", "País destino"],
                ["service", "Indicador de servicio"],
                ["paymentCode", "Forma de pago"],
                ["saleMode", "Modalidad de venta"],
                ["saleClause", "Cláusula de venta"],
                ["clauseTotal", "Total cláusula"],
                ["transportCode", "Vía de transporte"],
                ["loadingPort", "Puerto de embarque"],
                ["unloadingPort", "Puerto de desembarque"],
                ["tareUnit", "Unidad de tara"],
                ["grossWeightUnit", "Unidad peso bruto"],
                ["netWeightUnit", "Unidad peso neto"],
                ["packageType", "Tipo de bulto"],
                ["packageCount", "Cantidad de bultos"],
                ["freight", "Flete"],
                ["insurance", "Seguro"],
              ] as const
            ).map(([key, label]) => (
              <NumberField
                key={key}
                label={label}
                value={draft.export?.[key] as number | undefined}
                onChange={(value) =>
                  onChange({ ...draft, export: { ...draft.export!, [key]: value || undefined } })
                }
              />
            ))}
            <Field label="Identificación del receptor extranjero">
              <input
                value={draft.receiver.foreignId ?? ""}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    receiver: { ...draft.receiver, foreignId: e.target.value || undefined },
                  })
                }
              />
            </Field>
            <NumberField
              label="Nacionalidad del receptor"
              value={draft.receiver.nationality}
              onChange={(nationality) =>
                onChange({ ...draft, receiver: { ...draft.receiver, nationality } })
              }
            />
          </div>
        </Section>
      ) : null}
      <Section
        title="Referencias adicionales"
        description="Documentos aduaneros u otros antecedentes exigidos por el caso."
        actions={
          <button
            className="fx-btn"
            onClick={() =>
              onChange({
                ...draft,
                additionalReferences: [
                  ...(draft.additionalReferences ?? []),
                  { type: 0, folio: "", date: today(), reason: "" },
                ],
              })
            }
          >
            <Plus size={14} />
            Referencia
          </button>
        }
      >
        {(draft.additionalReferences ?? []).map((r, i) => (
          <div className="sc-fields" key={i}>
            <NumberField
              label="Tipo de documento SII"
              value={r.type}
              onChange={(type) =>
                onChange({
                  ...draft,
                  additionalReferences: draft.additionalReferences!.map((v, n) =>
                    n === i ? { ...v, type } : v,
                  ),
                })
              }
            />
            <Field label="Folio">
              <input
                value={r.folio}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    additionalReferences: draft.additionalReferences!.map((v, n) =>
                      n === i ? { ...v, folio: e.target.value } : v,
                    ),
                  })
                }
              />
            </Field>
            <Field label="Fecha">
              <DateInput
                value={r.date}
                onChange={(date) =>
                  onChange({
                    ...draft,
                    additionalReferences: draft.additionalReferences!.map((v, n) =>
                      n === i ? { ...v, date } : v,
                    ),
                  })
                }
              />
            </Field>
            <Field label="Motivo">
              <input
                value={r.reason}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    additionalReferences: draft.additionalReferences!.map((v, n) =>
                      n === i ? { ...v, reason: e.target.value } : v,
                    ),
                  })
                }
              />
            </Field>
            <button
              className="fx-btn"
              onClick={() =>
                onChange({
                  ...draft,
                  additionalReferences: draft.additionalReferences!.filter((_, n) => n !== i),
                })
              }
            >
              Quitar referencia
            </button>
          </div>
        ))}
      </Section>
    </div>
  );
}

export function SiiCertification() {
  const { role } = useAccess(),
    action = useAction(),
    sequence = useRef(0),
    alive = useRef(true);
  const overview = useLoad(
    () =>
      financeApi.get<{
        company: SiiParty;
        runs: Array<{ id: string; createdAt: string; setSha256: string }>;
      }>(role, "/certification"),
    [role],
  );
  const [file, setFile] = useState<UploadedFile | null>(null),
    [set, setSet] = useState<SiiSetView | null>(null),
    [drafts, setDrafts] = useState<SiiCaseDraft[]>([]),
    [active, setActive] = useState(0),
    [step, setStep] = useState(0),
    [date, setDate] = useState(today()),
    [reviewed, setReviewed] = useState<string[]>([]),
    [runId, setRunId] = useState(""),
    [detail, setDetail] = useState<SiiRunDetail | null>(null);
  const [purchases, setPurchases] = useState<SiiBookEntry[]>([]),
    [factor, setFactor] = useState(0.6),
    [guideStates, setGuideStates] = useState<
      Record<
        string,
        {
          annulled?: 1 | 2;
          billedCaseId?: string;
          billedPaperReference?: { type: 30; folio: number; date: string };
        }
      >
    >({});
  const [draftVersion, setDraftVersion] = useState(0),
    [exchangeId, setExchangeId] = useState(1);
  const [clientOptions, setClientOptions] = useState<Array<{ id: string; name: string }>>([]);
  const invalidateRequests = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    void financeApi
      .get<Array<{ id: string; name: string }>>(role, "/client-options")
      .then((value) => {
        if (!cancelled) setClientOptions(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      alive.current = false;
      invalidateRequests();
    };
  }, [role, invalidateRequests]);
  const selected = set?.cases[active],
    draft = drafts[active];
  const updateDraft = (value: SiiCaseDraft) => {
    sequence.current++;
    setDrafts((rows) => rows.map((r, i) => (i === active ? value : r)));
    setReviewed((ids) => ids.filter((id) => id !== value.caseId));
  };
  const openRun = (id: string) =>
    void action.run(async () => {
      const value = await financeApi.get<SiiRunDetail>(role, `/certification/runs/${id}`);
      if (alive.current) {
        setDetail(value);
        setStep(3);
      }
    });
  const upload = (selectedFile: File) =>
    void action.run(async () => {
      const request = ++sequence.current;
      setSet(null);
      setDetail(null);
      setDrafts([]);
      setReviewed([]);
      setPurchases([]);
      const uploaded = await fileToUpload(selectedFile),
        result = await financeApi.post<SiiSetView>(role, "/certification/inspect", {
          file: uploaded,
        });
      const saved = await financeApi.get<SavedDraft | null>(
        role,
        `/certification/drafts/${result.sha256}`,
      );
      if (alive.current && sequence.current === request) {
        setDraftVersion(saved?.version ?? 0);
        setFile(uploaded);
        setSet(result);
        if (
          saved &&
          saved.payload.cases.length === result.cases.length &&
          saved.payload.cases.every(
            (c, i) => c.caseId === result.cases[i].id && Array.isArray(c.lines) && c.receiver,
          )
        ) {
          setDrafts(saved.payload.cases);
          setRunId(saved.payload.runId);
          setDate(saved.payload.date);
          setReviewed(saved.payload.reviewed);
          setPurchases(saved.payload.purchaseEntries);
          setFactor(saved.payload.commonFactor);
          setGuideStates(saved.payload.guideStates);
        } else {
          setDrafts(initialSiiCases(result));
          setRunId(crypto.randomUUID());
          setGuideStates({});
        }
        setActive(0);
        setStep(1);
      }
    });
  const saveDraft = () =>
    void action.run(async () => {
      if (!set) return;
      const result = await financeApi.post<{ version: number }>(
        role,
        `/certification/drafts/${set.sha256}`,
        {
          version: draftVersion,
          payload: {
            runId,
            date,
            cases: drafts,
            reviewed,
            purchaseEntries: purchases,
            commonFactor: factor,
            guideStates,
          },
        },
      );
      if (alive.current) setDraftVersion(result.version);
    }, "Borrador guardado para tu usuario. No se reservaron folios.");
  const moveCase = (index: number) => {
    sequence.current++;
    setActive(index);
  };
  if (overview.loading) return <Loading text="Cargando certificación SII…" />;
  if (overview.error)
    return <LoadError error={overview.error} retry={() => void overview.reload()} />;
  return (
    <div className="sc-workspace">
      <section className="sc-hero">
        <div className="sc-hero-copy">
          <span>
            <ShieldCheck size={16} />
            CERTIFICACIÓN SII
          </span>
          <h2>
            De cada caso
            <br />a su evidencia.
          </h2>
          <p>
            Prepara documentos y libros, valida sus firmas y conserva los resultados de cada envío.
          </p>
          <Stamp kind="warn">Ambiente de pruebas · sin validez tributaria</Stamp>
        </div>
        <div className="sc-progress">
          <strong>
            {set ? `${reviewed.length} / ${set.cases.length}` : detail ? detail.cases.length : "—"}
          </strong>
          <span>casos revisados</span>
          <small>La aprobación final corresponde al SII.</small>
        </div>
      </section>
      <Feedback error={action.error} notice={action.notice} />
      {set ? (
        <div className="fx-actions">
          <button className="fx-btn" disabled={action.busy || Boolean(detail)} onClick={saveDraft}>
            <Save size={15} />
            Guardar borrador
          </button>
          <small>El borrador se recupera al abrir el mismo archivo oficial.</small>
        </div>
      ) : null}
      <nav className="sc-steps" aria-label="Etapas de certificación">
        {["Set oficial", "Casos y receptores", "Libros", "Envíos y evidencias"].map(
          (label, index) => (
            <button
              key={label}
              aria-current={step === index ? "step" : undefined}
              disabled={(index === 1 || index === 2) && !set}
              onClick={() => setStep(index)}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          ),
        )}
      </nav>
      {step === 0 ? (
        <Section
          title="Importar el set vigente"
          description="Selecciona el archivo de texto descargado del SII. Importarlo consulta los folios; todavía no los reserva."
        >
          <label className="sc-upload">
            <Upload size={28} />
            <strong>{file?.fileName ?? "Seleccionar set oficial (.txt)"}</strong>
            <span>Hasta 512 KB · conserva su huella y sus instrucciones</span>
            <input
              disabled={action.busy}
              type="file"
              accept=".txt,text/plain"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 512 * 1024) action.setError("El set no puede superar 512 KB.");
                  else upload(f);
                }
              }}
            />
          </label>
          {overview.data?.runs.length ? (
            <div className="sc-runs">
              <h3>Procesos existentes</h3>
              {overview.data.runs.map((run) => (
                <button key={run.id} disabled={action.busy} onClick={() => openRun(run.id)}>
                  <FileText size={18} />
                  <span>
                    <strong>{run.setSha256.slice(0, 16)}…</strong>
                    <small>{formatDateTime(run.createdAt)}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}
      {set && step === 1 ? (
        <div className="sc-editor-layout">
          <aside className="sc-case-list">
            <header>
              <strong>{set.cases.length} casos</strong>
              <small>Set {set.sha256.slice(0, 10)}…</small>
            </header>
            {set.cases.map((c, index) => (
              <button
                key={c.id}
                className={active === index ? "active" : ""}
                onClick={() => moveCase(index)}
              >
                <span>
                  {reviewed.includes(c.id) ? (
                    <Check size={15} />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <div>
                  <strong>{c.id}</strong>
                  <small>{title(c.type)}</small>
                </div>
              </button>
            ))}
          </aside>
          <div>
            {selected && draft ? (
              <>
                <div className="sc-case-top">
                  <div>
                    <Stamp>{selected.type}</Stamp>
                    <h3>{title(selected.type)}</h3>
                    <p>
                      Caso {selected.id} · Folio candidato{" "}
                      {set.candidates.find((c) => c.caseId === selected.id)?.folio ??
                        "no disponible"}
                    </p>
                  </div>
                  <Field label="Fecha de todos los documentos">
                    <DateInput
                      value={date}
                      onChange={(value) => {
                        setDate(value);
                        setReviewed([]);
                      }}
                    />
                  </Field>
                </div>
                <div className="sc-fields">
                  <Field label="Usar datos de un cliente">
                    <select
                      defaultValue=""
                      disabled={action.busy}
                      key={selected.id}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        const selectedCase = selected.id,
                          request = ++sequence.current;
                        void action.run(async () => {
                          const party = await financeApi.get<SiiParty>(
                            role,
                            `/certification/clients/${encodeURIComponent(id)}`,
                          );
                          if (alive.current && request === sequence.current) {
                            setDrafts((rows) =>
                              rows.map((r) =>
                                r.caseId === selectedCase ? { ...r, receiver: party } : r,
                              ),
                            );
                            setReviewed((ids) => ids.filter((value) => value !== selectedCase));
                          }
                        });
                      }}
                    >
                      <option value="">Seleccionar cliente</option>
                      {clientOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button
                    className="fx-btn"
                    onClick={() => {
                      if (overview.data?.company)
                        updateDraft({ ...draft, receiver: { ...overview.data.company } });
                    }}
                  >
                    Usar emisor como receptor
                  </button>
                  {set?.format === "BOLETA" ? (
                    <button
                      className="fx-btn"
                      onClick={() =>
                        updateDraft({
                          ...draft,
                          receiver: {
                            rut: "66666666-6",
                            legalName: "Consumidor final",
                            businessActivity: "",
                            address: "",
                            commune: "",
                          },
                        })
                      }
                    >
                      Consumidor final (RUT genérico)
                    </button>
                  ) : null}
                </div>
                <CaseEditor
                  key={selected.id}
                  source={selected}
                  draft={draft}
                  onChange={updateDraft}
                />
                <div className="sc-editor-footer">
                  <button
                    className="fx-btn"
                    disabled={active === 0}
                    onClick={() => moveCase(active - 1)}
                  >
                    <ArrowLeft size={14} />
                    Anterior
                  </button>
                  <label className="sc-check">
                    <input
                      type="checkbox"
                      checked={reviewed.includes(selected.id)}
                      onChange={(e) =>
                        setReviewed((ids) =>
                          e.target.checked
                            ? [...ids, selected.id]
                            : ids.filter((id) => id !== selected.id),
                        )
                      }
                    />
                    Revisé este caso contra las instrucciones
                  </label>
                  <button
                    className="fx-btn primary"
                    onClick={() =>
                      active < set.cases.length - 1 ? moveCase(active + 1) : setStep(2)
                    }
                  >
                    {active < set.cases.length - 1 ? "Siguiente caso" : "Preparar libros"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      {set && step === 2 ? (
        <>
          <Section
            title="Libro de compras del set"
            description="Captura sus documentos exactamente como aparecen en el archivo oficial. Los importes no se incorporan a compras reales."
            actions={
              <button
                className="fx-btn"
                onClick={() =>
                  setPurchases((rows) => [
                    ...rows,
                    {
                      type: 33,
                      folio: 0,
                      date,
                      counterpartyRut: "",
                      counterpartyName: "",
                      net: 0,
                      exempt: 0,
                      vat: 0,
                    },
                  ])
                }
              >
                <Plus size={14} />
                Documento
              </button>
            }
          >
            <details className="sc-source">
              <summary>Instrucciones del libro de compras</summary>
              <pre>
                {set.sections.find((s) => s.name.startsWith("SET LIBRO DE COMPRAS"))?.raw ??
                  "Este set no incluye libro de compras."}
              </pre>
            </details>
            <NumberField
              label="Factor proporcional de IVA de uso común"
              value={factor}
              onChange={setFactor}
            />
            {purchases.map((p, index) => (
              <div className="sc-line" key={index}>
                <div className="sc-fields">
                  {(
                    [
                      ["type", "Tipo SII"],
                      ["folio", "Folio"],
                      ["net", "Neto"],
                      ["exempt", "Exento"],
                    ] as const
                  ).map(([key, label]) => (
                    <NumberField
                      key={key}
                      label={label}
                      value={p[key]}
                      onChange={(value) =>
                        setPurchases((rows) =>
                          rows.map((r, i) =>
                            i === index
                              ? {
                                  ...r,
                                  [key]: value,
                                  ...(key === "net"
                                    ? {
                                        vat: Math.round(value * 0.19),
                                        ...(r.commonVat !== undefined
                                          ? { commonVat: Math.round(value * 0.19) }
                                          : {}),
                                        ...(r.retained !== undefined
                                          ? { retained: Math.round(value * 0.19) }
                                          : {}),
                                        ...(r.nonRecoverableVat
                                          ? {
                                              nonRecoverableVat: {
                                                ...r.nonRecoverableVat,
                                                amount: Math.round(value * 0.19),
                                              },
                                            }
                                          : {}),
                                      }
                                    : {}),
                                }
                              : r,
                          ),
                        )
                      }
                    />
                  ))}
                  <Field label="RUT emisor">
                    <input
                      value={p.counterpartyRut}
                      onChange={(e) =>
                        setPurchases((rows) =>
                          rows.map((r, i) =>
                            i === index ? { ...r, counterpartyRut: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Razón social emisor">
                    <input
                      value={p.counterpartyName}
                      onChange={(e) =>
                        setPurchases((rows) =>
                          rows.map((r, i) =>
                            i === index ? { ...r, counterpartyName: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </Field>
                  <NumberField
                    label="IVA calculado"
                    value={p.vat}
                    onChange={(vat) =>
                      setPurchases((rows) => rows.map((r, i) => (i === index ? { ...r, vat } : r)))
                    }
                  />
                  <Field label="Tratamiento del IVA">
                    <select
                      value={
                        p.commonVat !== undefined
                          ? "common"
                          : p.nonRecoverableVat
                            ? "free"
                            : p.retained
                              ? "retained"
                              : "recoverable"
                      }
                      onChange={(e) =>
                        setPurchases((rows) =>
                          rows.map((r, i) => {
                            if (i !== index) return r;
                            const {
                              commonVat: discardCommon,
                              nonRecoverableVat: discardNon,
                              retained: discardRetained,
                              ...base
                            } = r;
                            void discardCommon;
                            void discardNon;
                            void discardRetained;
                            return {
                              ...base,
                              ...(e.target.value === "common"
                                ? { commonVat: r.vat }
                                : e.target.value === "free"
                                  ? { nonRecoverableVat: { code: 4 as const, amount: r.vat } }
                                  : e.target.value === "retained"
                                    ? { retained: r.vat }
                                    : {}),
                            };
                          }),
                        )
                      }
                    >
                      <option value="recoverable">Crédito fiscal recuperable</option>
                      <option value="common">IVA de uso común</option>
                      <option value="free">Entrega gratuita · no recuperable</option>
                      <option value="retained">Retención total de IVA</option>
                    </select>
                  </Field>
                </div>
                <button
                  className="fx-btn"
                  onClick={() => setPurchases((rows) => rows.filter((_, i) => i !== index))}
                >
                  Quitar documento
                </button>
              </div>
            ))}
          </Section>
          {set.cases.some((c) => c.type === 52) ? (
            <Section
              title="Libro de guías"
              description="Estos estados corresponden a los casos del set; no anulan documentos ni folios reales."
            >
              {set.cases
                .filter((c) => c.type === 52)
                .map((c) => (
                  <div className="sc-fields" key={c.id}>
                    <strong>Caso {c.id}</strong>
                    <Field label="Estado en el libro">
                      <select
                        value={
                          guideStates[c.id]?.annulled
                            ? "annulled"
                            : guideStates[c.id]?.billedCaseId !== undefined ||
                                guideStates[c.id]?.billedPaperReference
                              ? "billed"
                              : "normal"
                        }
                        onChange={(e) =>
                          setGuideStates((rows) => ({
                            ...rows,
                            [c.id]:
                              e.target.value === "annulled"
                                ? { annulled: 2 }
                                : e.target.value === "billed"
                                  ? { billedCaseId: "" }
                                  : {},
                          }))
                        }
                      >
                        <option value="normal">Traslado informado</option>
                        <option value="billed">Facturada en el período</option>
                        <option value="annulled">Guía anulada en el set</option>
                      </select>
                    </Field>
                    <Field label="Factura del mismo proceso">
                      <select
                        value={guideStates[c.id]?.billedCaseId ?? ""}
                        onChange={(e) =>
                          setGuideStates((rows) => ({
                            ...rows,
                            [c.id]: { billedCaseId: e.target.value },
                          }))
                        }
                      >
                        <option value="">Sin factura de referencia</option>
                        {set.cases
                          .filter((c) => [33, 34].includes(c.type))
                          .map((c) => (
                            <option key={c.id}>{c.id}</option>
                          ))}
                      </select>
                    </Field>
                    {guideStates[c.id]?.billedCaseId !== undefined ||
                    guideStates[c.id]?.billedPaperReference ? (
                      <NumberField
                        label="Alternativa: folio de factura en papel del ejercicio (tipo 30)"
                        value={guideStates[c.id]?.billedPaperReference?.folio}
                        onChange={(folio) =>
                          setGuideStates((rows) => ({
                            ...rows,
                            [c.id]: { billedPaperReference: { type: 30, folio, date } },
                          }))
                        }
                      />
                    ) : null}
                  </div>
                ))}
              <p>
                La referencia en papel pertenece únicamente al ejercicio de certificación: no
                registra ni emite una factura comercial.
              </p>
            </Section>
          ) : null}
          <Section
            title="Validar y reservar el proceso"
            description="Se validan los XML, firmas, timbres y PDF antes de reservar el lote. La reserva no transmite los documentos al SII."
          >
            <div className="sc-validation">
              <FileCheck2 size={24} />
              <div>
                <strong>
                  {reviewed.length} de {set.cases.length} casos revisados
                </strong>
                <p>
                  {set.folioError ??
                    "Los folios mostrados son candidatos; se vuelven a comprobar al confirmar la reserva."}
                </p>
              </div>
            </div>
            <button
              className="fx-btn primary"
              disabled={
                action.busy || Boolean(set.folioError) || reviewed.length !== set.cases.length
              }
              onClick={() =>
                void action.run(async () => {
                  const result = await financeApi.post<SiiRunDetail>(
                    role,
                    "/certification/prepare",
                    {
                      runId,
                      setFile: file,
                      date,
                      cases: drafts,
                      reviewed: true,
                      ...(purchases.length
                        ? { purchaseEntries: purchases, commonFactor: factor }
                        : {}),
                      guideStates,
                    },
                  );
                  if (alive.current) {
                    setDetail(result);
                    setStep(3);
                    void overview.reload();
                  }
                }, "Proceso validado y reservado. Los documentos aún no se han transmitido.")
              }
            >
              <ShieldCheck size={15} />
              {action.busy ? "Validando…" : "Validar XML y PDF; reservar folios"}
            </button>
          </Section>
        </>
      ) : null}
      {step === 3 ? (
        detail ? (
          <>
            <Section
              title="Envíos de certificación"
              description="Cada envío conserva su archivo, estado y Track ID. Una recepción incierta bloquea el reintento automático."
            >
              <div className="sc-submissions">
                {detail.submissions.map((submission) => {
                  const artifact = detail.artifacts.find((a) => a.id === submission.artifactId);
                  return (
                    <article key={submission.id}>
                      <div>
                        <FileText size={20} />
                        <div>
                          <h3>{artifact?.name}</h3>
                          <small>
                            {submission.trackId
                              ? `Track ID ${submission.trackId}`
                              : "Sin Track ID confirmado"}
                          </small>
                        </div>
                      </div>
                      <Stamp
                        kind={
                          submission.status === "ACCEPTED"
                            ? "good"
                            : submission.status === "UNKNOWN"
                              ? "bad"
                              : "info"
                        }
                      >
                        {statusLabel[submission.status] ?? submission.status}
                      </Stamp>
                      {responseMessage(submission.response) ? (
                        <p>{responseMessage(submission.response)}</p>
                      ) : null}
                      <div className="fx-actions">
                        <button
                          className="fx-btn"
                          disabled={action.busy}
                          onClick={() =>
                            void action.run(() =>
                              financeApi.download(
                                role,
                                `/certification/runs/${detail.run.id}/artifacts/${submission.artifactId}`,
                              ),
                            )
                          }
                        >
                          <Download size={14} />
                          XML
                        </button>
                        {submission.trackId ? (
                          <button
                            className="fx-btn"
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(async () => {
                                const result = await financeApi.post<SiiRunDetail>(
                                  role,
                                  `/certification/runs/${detail.run.id}/submissions/${submission.id}/refresh`,
                                );
                                if (alive.current) setDetail(result);
                              })
                            }
                          >
                            <RefreshCw size={14} />
                            Consultar SII
                          </button>
                        ) : null}
                        {["UNKNOWN", "SENDING"].includes(submission.status) &&
                        hasFinancePermission(role, "dte.issue") ? (
                          <button
                            className="fx-btn"
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(async () => {
                                const result = await financeApi.post<SiiRunDetail>(
                                  role,
                                  `/certification/runs/${detail.run.id}/submissions/${submission.id}/recover`,
                                );
                                if (alive.current) setDetail(result);
                              })
                            }
                          >
                            Recuperar recibo
                          </button>
                        ) : null}
                        <button
                          className="fx-btn primary"
                          disabled={
                            action.busy ||
                            submission.status !== "PREPARED" ||
                            !hasFinancePermission(role, "dte.issue")
                          }
                          onClick={() =>
                            void action.run(async () => {
                              const result = await financeApi.post<SiiRunDetail>(
                                role,
                                `/certification/runs/${detail.run.id}/submissions/${submission.id}/submit`,
                              );
                              if (alive.current) setDetail(result);
                            }, "Consulta el Track ID y la respuesta del SII para confirmar su aceptación.")
                          }
                        >
                          Enviar a certificación
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Section>
            <Section
              title="Intercambio de certificación"
              description="Valida el XML recibido y genera un acuse técnico firmado. No acepta comercialmente facturas ni transmite la respuesta automáticamente."
            >
              <div className="sc-fields">
                <NumberField
                  label="Identificador de respuesta"
                  value={exchangeId}
                  onChange={setExchangeId}
                />
                <Field label="XML recibido del intercambio SII">
                  <input
                    type="file"
                    accept=".xml,application/xml,text/xml"
                    disabled={action.busy}
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile)
                        void action.run(async () => {
                          if (selectedFile.size > 2 * 1024 * 1024)
                            throw new Error("El XML no puede superar 2 MB.");
                          const result = await financeApi.post<SiiRunDetail>(
                            role,
                            `/certification/runs/${detail.run.id}/exchange`,
                            { file: await fileToUpload(selectedFile), responseId: exchangeId },
                          );
                          if (alive.current) setDetail(result);
                        }, "Acuse técnico generado. Descárgalo en el archivo de evidencias para presentarlo al SII.");
                    }}
                  />
                </Field>
              </div>
            </Section>
            <Section
              title="Archivo y muestras impresas"
              description="Descargas autenticadas del archivo original validado."
            >
              <div className="sc-artifacts">
                {detail.artifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(() =>
                        financeApi.download(
                          role,
                          `/certification/runs/${detail.run.id}/artifacts/${artifact.id}`,
                        ),
                      )
                    }
                  >
                    <FileText size={16} />
                    <span>
                      <strong>{artifact.name}</strong>
                      <small>{artifact.sha256.slice(0, 16)}…</small>
                    </span>
                    <Download size={14} />
                  </button>
                ))}
              </div>
            </Section>
            <div className="sc-note">
              <ShieldCheck size={18} />
              <p>
                Una recepción del archivo no equivale a certificación. Simulación, intercambio,
                muestras y declaración de cumplimiento se completan con evidencia del SII.
              </p>
            </div>
          </>
        ) : (
          <Empty
            title="Sin proceso seleccionado"
            text="Abre un proceso existente o importa el set vigente."
            action={
              <button className="fx-btn" onClick={() => setStep(0)}>
                Abrir set oficial
              </button>
            }
          />
        )
      ) : null}
    </div>
  );
}
