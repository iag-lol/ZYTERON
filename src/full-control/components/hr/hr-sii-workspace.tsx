"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileCode2, FileText, Landmark, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { hasFinancePermission, siiDocumentCatalog, siiDocumentDefinition, type Role } from "@zyteron/contracts";
import Link from "@control/components/routed-link";
import { financeApi } from "@control/lib/finance-api";
import { dteConnectionSummary } from "@control/lib/dte-connection";
import { formatDate, formatDateTime } from "@control/lib/date-time";
import { canReadHrSii, filterSiiCatalog, readHrSii, siiDownloadPath, siiDocumentStatusLabel, siiFamilies, siiImplementationLabel, siiTypePath, type HrSiiData } from "@control/lib/hr-sii";

export function HrSiiWorkspace({ role, documentTypeCode }: { role: Role; documentTypeCode: number }) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [revision, setRevision] = useState(0);
  const [pagination, setPagination] = useState({ code: documentTypeCode, page: 1 });
  const page = pagination.code === documentTypeCode ? pagination.page : 1;
  return <HrSiiScreen key={`${role}:${documentTypeCode}:${page}:${revision}`} role={role} code={documentTypeCode} page={page}
    query={query} family={family} setQuery={setQuery} setFamily={setFamily}
    refresh={() => setRevision(value => value + 1)} changePage={value => setPagination({ code: documentTypeCode, page: value })}/>;
}

function HrSiiScreen({ role, code, page, query, family, setQuery, setFamily, refresh, changePage }: {
  role: Role; code: number; page: number; query: string; family: string;
  setQuery: (value: string) => void; setFamily: (value: string) => void;
  refresh: () => void; changePage: (value: number) => void;
}) {
  const [result, setResult] = useState<{ data?: HrSiiData; error?: string }>({});
  const [connection, setConnection] = useState<ReturnType<typeof dteConnectionSummary> | null>(null);
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const running = useRef(false), alive = useRef(true);
  useEffect(() => {
    let current = true;
    alive.current = true;
    void readHrSii(role, code, page, () => current).then(data => {
      if (current && data) setResult({ data });
    }).catch(error => { if (current) setResult({ error: error instanceof Error ? error.message : "No se pudo consultar la conexión." }); });
    return () => { current = false; alive.current = false; };
  }, [role, code, page]);
  const run = async (key: string, work: () => Promise<unknown>) => {
    if (running.current) return;
    running.current = true; setBusy(key); setActionError("");
    try { await work(); }
    catch (error) { if (alive.current) setActionError(error instanceof Error ? error.message : "No se pudo completar la consulta."); }
    finally { running.current = false; if (alive.current) setBusy(""); }
  };
  const data = result.data;
  const definition = siiDocumentDefinition(code);
  if (!definition) return <main className="hrSiiPage"><p role="alert">Tipo de documento no disponible.</p><Link href="/hr/sii">Volver al catálogo</Link></main>;
  const restricted = data?.restricted || !canReadHrSii(role);
  const catalog = filterSiiCatalog(query, family);
  const status = data?.types.find(item => item.code === code);
  const requirements = data?.readiness?.requirements ?? [];
  const manage = !restricted && hasFinancePermission(role, "dte.manage");
  const environment = data?.readiness?.environment;
  const provider = data?.readiness?.provider;
  const persistent = requirements.some(item => item.key === "persistence" && item.satisfied);
  const pending = requirements.filter(item => !item.satisfied);
  const complete = requirements.filter(item => item.satisfied).length;
  const implemented = data && !restricted && !data.errors.catalog ? data.types.filter(item => item.implementationStatus === "IMPLEMENTED").length : null;
  const draftHref = [33, 34].includes(code) && status?.implementationStatus === "IMPLEMENTED" && status.catalogConfigured === true && hasFinancePermission(role, "invoice.create") ? `/finance/invoices?newType=${code}` : null;
  return <main className="hrSiiPage">
    <header className="hrSiiHeading">
      <div><Link href="/hr"><ArrowLeft size={15}/> RRHH</Link><h1>SII y documentación</h1><p>Control tributario conectado con Finanzas y acceso a los procesos laborales.</p></div>
      <button className="hrSiiButton" disabled={Boolean(busy)} onClick={refresh}><RefreshCw size={15}/>Actualizar</button>
    </header>
    <section className="hrSiiHero">
      <div><span className="hrSiiEyebrow"><Landmark size={16}/> CENTRO DOCUMENTAL</span><h2>Un catálogo completo.<br/>Cada documento con su propio circuito.</h2><p>Las opciones de la postulación permanecen visibles. La implementación, la evidencia SII y la habilitación se comprueban por separado.</p>
        <div className="hrSiiHeroTags"><span>{environment === "CERTIFICATION" ? "Certificación · sin validez tributaria" : environment === "PRODUCTION" ? "Ambiente de producción · revisar autorización" : "Ambiente no verificado"}</span><span>{provider === "SII_DIRECT" ? "Motor SII directo" : provider === "EXTERNAL" ? "Proveedor externo" : "Proveedor no verificado"}</span></div>
      </div>
      <dl><div><dt>Opciones conservadas</dt><dd>{siiDocumentCatalog.length.toString().padStart(2, "0")}</dd></div><div><dt>Formatos implementados</dt><dd>{implemented === null ? "—" : implemented.toString().padStart(2, "0")}</dd></div><div><dt>Requisitos del tipo {code}</dt><dd>{data?.readiness ? `${complete}/${requirements.length}` : "—"}</dd><small>Configuración; no autoriza una emisión</small></div></dl>
    </section>
    {result.error ? <Notice title="No se pudo sincronizar" text={result.error} error/> : null}
    {restricted ? <Notice title="Acceso financiero restringido" text="El catálogo está disponible como referencia. Consultar documentos, configuración o certificados requiere el permiso financiero dte.view. La consulta de datos financieros está bloqueada para este acceso."/> : !data && !result.error ? <p role="status" className="hrSiiLoading">Consultando el motor tributario…</p> : null}
    <div className="hrSiiLayout">
      <section className="hrSiiCatalog" aria-label="Catálogo de documentos SII">
        <div className="hrSiiPanelHeading"><div><span className="hrSiiEyebrow">DOCUMENTOS TRIBUTARIOS</span><h2>Opciones de la postulación</h2></div><span className="hrSiiCount">{catalog.length} de 12</span></div>
        <label className="hrSiiSearch"><Search size={16}/><span className="hrSiiSrOnly">Buscar tipo de documento</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nombre o código…"/></label>
        <div className="hrSiiFilters" aria-label="Familias de documentos">{["", ...siiFamilies].map(item => <button key={item} aria-pressed={family === item} onClick={() => setFamily(item)}>{item || "Todos"}</button>)}</div>
        {data?.errors.catalog ? <Notice title="Catálogo sin sincronizar" text={data.errors.catalog} error/> : null}
        <div className="hrSiiCards">{catalog.map(item => {
          const itemStatus = data?.types.find(type => type.code === item.code);
          return <Link className={`hrSiiCard${item.code === code ? " selected" : ""}`} href={siiTypePath(item.code)} key={item.code} aria-current={item.code === code ? "page" : undefined}>
            <div><span className="hrSiiCode">{item.code}</span><small>{item.family}</small><ArrowRight size={16}/></div>
            <h3>{item.name}</h3><p>{item.description}</p>
            <div className="hrSiiCardStatus"><span className={itemStatus?.implementationStatus === "IMPLEMENTED" ? "ready" : "pending"}>{restricted ? "Sin acceso financiero" : siiImplementationLabel(itemStatus?.implementationStatus)}</span></div>
            <small>{restricted ? "Requiere perfil autorizado" : itemStatus ? `${itemStatus.certified ? "Certificación registrada" : "Sin evidencia SII"} · ${itemStatus.enabledForIssue ? "Habilitado en registro" : "No habilitado"}` : "Configuración no verificada"}</small>
          </Link>;
        })}</div>
        {!catalog.length ? <div className="hrSiiEmpty"><Search/><h3>Sin coincidencias</h3><p>Prueba otro nombre, código o familia.</p><button className="hrSiiButton" onClick={() => { setQuery(""); setFamily(""); }}>Restablecer filtros</button></div> : null}
      </section>
      <aside className="hrSiiInspector" aria-label={`Preparación del tipo ${code}`}>
        <section className="hrSiiPanel"><div className="hrSiiPanelHeading"><span className="hrSiiCode">{code}</span><span className="hrSiiEyebrow">{definition.family}</span></div><h2>{definition.name}</h2><p>{definition.description}</p>
          <div className="hrSiiStatusList"><div><span>Implementación</span><strong>{restricted ? "Sin acceso" : siiImplementationLabel(status?.implementationStatus)}</strong></div><div><span>Certificación SII</span><strong>{restricted ? "Sin acceso" : status ? status.certified ? "Evidencia registrada" : "Pendiente de evidencia" : "No verificada"}</strong></div><div><span>Habilitación</span><strong>{restricted ? "Sin acceso" : status ? status.enabledForIssue ? "Habilitado en registro" : "Deshabilitado" : "No verificada"}</strong></div></div>
          {status?.catalogConfigured === false ? <p className="hrSiiCaution">Visible en el catálogo; pendiente de configuración persistente. Consultar no crea registros.</p> : null}
          <h3>Antecedentes del circuito</h3><ul className="hrSiiFieldGuide">{definition.fields.map(field => <li key={field}><FileText size={14}/>{field}</li>)}</ul><p className="hrSiiFootnote">Guía de preparación. Los campos y validaciones definitivos dependen del formato oficial y de la operación.</p>
          {draftHref ? <Link className="hrSiiButton primary" href={draftHref}>Preparar borrador en Finanzas<ArrowRight size={15}/></Link> : [56, 61].includes(code) && hasFinancePermission(role, "invoice.view") ? <Link className="hrSiiButton" href="/finance/invoices">Elegir documento original<ArrowRight size={15}/></Link> : null}
          {status?.implementationStatus === "PENDING_IMPLEMENTATION" ? <p className="hrSiiCaution">La opción se conserva. Su flujo específico de emisión está pendiente de implementación y certificación.</p> : null}
        </section>
        <section className="hrSiiPanel"><div className="hrSiiPanelHeading"><h2>Conexión y requisitos</h2><ShieldCheck size={20}/></div>
          {data?.errors.readiness ? <Notice title="Preparación no disponible" text={data.errors.readiness} error/> : null}
          {!restricted && requirements.length ? <><p>{pending.length} requisitos de configuración pendientes para el tipo {code}.</p><ol className="hrSiiRequirements">{requirements.map(item => <li className={item.satisfied ? "complete" : ""} key={item.key}><span>{item.satisfied ? <Check size={13}/> : "·"}</span><div><strong>{item.label}</strong><p>{item.detail}</p>{manage && !item.satisfied && item.actionHref ? <Link href={item.actionHref}>{item.actionLabel || "Revisar configuración"}<ArrowRight size={12}/></Link> : null}</div></li>)}</ol></> : <p>La configuración requiere una consulta autorizada al motor tributario.</p>}
          {manage && data?.readiness && provider !== "NONE" ? <button className="hrSiiButton" disabled={Boolean(busy)} onClick={() => void run("connection", async () => { const response = await financeApi.post(role, "/dte/test-connection", {}); if (alive.current) setConnection(dteConnectionSummary(response)); })}><ShieldCheck size={15}/>{busy === "connection" ? "Verificando…" : "Verificar conexión técnica"}</button> : null}
          {connection ? <div className="hrSiiConnection" role="status"><strong>{connection.serviceLabel}</strong><span>{connection.authenticationLabel}</span><span>{connection.environmentLabel}</span>{connection.checkedAt ? <small>Comprobado el {formatDateTime(connection.checkedAt)}</small> : null}</div> : null}
          <p className="hrSiiFootnote">La conexión no acredita autorización de emisión, folios disponibles ni aceptación de un documento.</p>
        </section>
      </aside>
    </div>
    <section className="hrSiiPanel" aria-label="Documentos registrados"><div className="hrSiiPanelHeading"><div><span className="hrSiiEyebrow">FUENTE FINANCIERA</span><h2>Documentos registrados · tipo {code}</h2></div>{data?.documents ? <span className="hrSiiCount">{data.documents.total} registros</span> : null}</div>
      {data?.errors.documents ? <Notice title="Listado no disponible" text={data.errors.documents} error/> : restricted ? <p><LockKeyhole size={14}/> Requiere permiso de consulta financiera.</p> : data?.documents ? <>
        {data.documents.items.length ? <div className="hrSiiDocumentTable"><table><thead><tr><th>Folio</th><th>Emisión</th><th>Ambiente</th><th>Estado registrado</th><th>Seguimiento</th><th>Archivos</th></tr></thead><tbody>{data.documents.items.map(document => <tr key={document.id}><td>{document.folio ?? "Sin folio"}</td><td>{formatDate(document.issueDate)}</td><td>{document.environment === "CERTIFICATION" ? "Certificación" : document.environment === "PRODUCTION" ? "Producción" : "No verificado"}</td><td>{siiDocumentStatusLabel(document.status)}</td><td><code>{document.trackId || "Sin Track ID"}</code><small>{document.statusMessage || "Sin respuesta adicional registrada"}</small></td><td><div className="hrSiiFileActions">{(["xml", "pdf"] as const).map(kind => <button className="hrSiiButton" disabled={Boolean(busy)} key={kind} onClick={() => void run(`${document.id}-${kind}`, () => financeApi.download(role, siiDownloadPath(document.id, kind)))}>{kind === "xml" ? <FileCode2 size={14}/> : <FileText size={14}/>} {kind.toUpperCase()}</button>)}</div></td></tr>)}</tbody></table></div> : <div className="hrSiiEmpty"><FileText/><h3>{persistent ? "Sin documentos visibles de este tipo" : "Sin registros en esta respuesta"}</h3><p>{persistent ? "Este registro corresponde a Zyteron. No representa una consulta completa de documentos externos del SII." : "La persistencia no está verificada para esta consulta. Revisa el estado de la fuente antes de concluir que no existen documentos."}</p></div>}
        <div className="hrSiiPagination"><button className="hrSiiButton" disabled={page <= 1 || Boolean(busy)} onClick={() => changePage(page - 1)}>Anterior</button><span>Página {page} de {Math.max(1, data.documents.totalPages)}</span><button className="hrSiiButton" disabled={page >= data.documents.totalPages || Boolean(busy)} onClick={() => changePage(page + 1)}>Siguiente</button></div>
      </> : !result.error ? <p>Consulta pendiente.</p> : null}
      {actionError ? <Notice title="Acción no completada" text={actionError} error/> : null}
      {data && !restricted ? <p className="hrSiiFootnote">Sincronizado el {formatDateTime(data.synchronizedAt)}. Consultar y descargar no vuelve a emitir documentos.</p> : null}
    </section>
    <section className="hrSiiLabor"><div><span className="hrSiiEyebrow">CIRCUITO LABORAL</span><h2>Remuneraciones y cumplimiento</h2><p>Los DTE no sustituyen liquidaciones de sueldo, cotizaciones previsionales ni LRE. El certificado de facturación no habilita por sí solo estos trámites.</p></div><div className="hrSiiLaborLinks"><Link href="/hr/payroll"><FileText/>Remuneraciones<ArrowRight/></Link><Link href="/hr/lre"><Landmark/>Libro de Remuneraciones · DT<ArrowRight/></Link><Link href="/hr/contracts"><FileText/>Contratos y evidencias<ArrowRight/></Link><Link href="/hr/settings"><ShieldCheck/>Integraciones y límites<ArrowRight/></Link></div><p className="hrSiiCaution">El cálculo integral de cotizaciones e impuestos, la presentación previsional y los trámites laborales requieren validación propia. No se anuncian como certificados por la postulación DTE.</p></section>
    <footer className="hrSiiSources"><a href="https://www.sii.cl/preguntas_frecuentes/factura_electronica/001_003_6625.htm" target="_blank" rel="noreferrer">Catálogo oficial SII ↗</a><a href="https://www.dt.gob.cl/portal/1628/w3-article-119846.html" target="_blank" rel="noreferrer">Libro de Remuneraciones · DT ↗</a></footer>
  </main>;
}

function Notice({ title, text, error = false }: { title: string; text: string; error?: boolean }) {
  return <div className={`hrSiiNotice${error ? " error" : ""}`} role={error ? "alert" : "note"}><LockKeyhole size={17}/><div><strong>{title}</strong><p>{text}</p></div></div>;
}
