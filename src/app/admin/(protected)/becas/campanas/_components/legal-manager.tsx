"use client";

import { useState } from "react";
import { saveLegalDraft, publishLegalVersion } from "../legal-actions";

const OFFICIAL_TERMS_TEMPLATE = `TÍTULO:
BASES OFICIALES
BECAS WEB PYME ZYTERON
EDICIÓN {{CAMPAIGN_NAME}}

1. ORGANIZADOR

La presente iniciativa denominada “Becas Web Pyme Zyteron”, en adelante también la “Campaña”, es organizada por {{ORGANIZER_LEGAL_NAME}}, RUT {{ORGANIZER_RUT}}, con domicilio en {{ORGANIZER_ADDRESS}}, en adelante “Zyteron” o el “Organizador”.

Para consultas generales relacionadas con esta Campaña, las personas interesadas podrán comunicarse al correo {{CONTACT_EMAIL}}.

Para solicitudes relacionadas con privacidad, retiro de consentimientos o ejercicio de derechos respecto de datos personales, se deberá utilizar el correo {{PRIVACY_EMAIL}}.

2. OBJETIVO DE LA CAMPAÑA

Becas Web Pyme Zyteron es una iniciativa privada de apoyo digital destinada a emprendedores, Pymes y empresas que operen en Chile y requieran fortalecer su presencia digital.

La Campaña busca seleccionar postulaciones que demuestren una necesidad real de presencia web, claridad en su propuesta, factibilidad de implementación y potencial de impacto para el negocio seleccionado.

La Campaña no constituye una rifa, juego de azar, concurso de popularidad, licitación pública, subsidio estatal, relación laboral, inversión, crédito ni promesa de resultados económicos.

La selección no dependerá de likes, comentarios, votos, etiquetas, cantidad de seguidores ni acciones de interacción en redes sociales.

3. VIGENCIA

La etapa de postulación estará disponible desde el {{START_DATE}} a las {{START_TIME}} hasta el {{END_DATE}} a las {{END_TIME}}, según horario de Chile continental.

Zyteron podrá cerrar anticipadamente las postulaciones solo por razones técnicas, operativas, de seguridad, fuerza mayor o circunstancias que comprometan la correcta ejecución de la Campaña. Cualquier cambio relevante deberá informarse en esta misma página, indicando fecha, hora y motivo de la actualización.

Las postulaciones enviadas fuera de plazo no serán consideradas.

4. COBERTURA TERRITORIAL

Podrán participar negocios, emprendimientos, Pymes y empresas que operen en Chile y que cumplan los requisitos establecidos en estas bases.

La implementación del beneficio podrá realizarse de forma remota, salvo que Zyteron informe expresamente otra modalidad en la convocatoria correspondiente.

5. QUIÉNES PUEDEN POSTULAR

Podrán postular personas naturales mayores de 18 años que sean dueñas, representantes, administradoras o cuenten con autorización suficiente para postular a nombre de un emprendimiento, negocio, Pyme o empresa que opere en Chile.

No es requisito tener empresa formalizada ni contar con RUT de empresa.

Las personas que tengan RUT de empresa podrán informarlo voluntariamente en el formulario, exclusivamente para fines de validación de la postulación. Dicho dato no será publicado en la vitrina ni difundido en redes sociales.

No podrán postular:
- Personas menores de 18 años.
- Trabajadores, socios, administradores, representantes o colaboradores directos de Zyteron involucrados en la organización de la Campaña.
- Familiares directos de las personas mencionadas anteriormente, incluyendo cónyuge, conviviente civil, padres, hijos o hermanos.
- Personas que entreguen datos falsos, incompletos, fraudulentos o pertenecientes a terceros sin autorización.
- Negocios relacionados con actividades ilícitas, contenido engañoso, vulneración de derechos de terceros, pornografía, apuestas no autorizadas, venta ilegal de productos o servicios, estafas, suplantación de identidad o cualquier actividad que Zyteron estime incompatible con sus valores o con la normativa aplicable.
- Personas que incumplan estas bases.

6. REQUISITOS DE PARTICIPACIÓN

Para que una postulación sea considerada válida, la persona postulante deberá:
- Completar el formulario oficial disponible en {{APPLICATION_URL}}.
- Entregar información verdadera, actualizada y verificable.
- Declarar que tiene facultades para postular el negocio o empresa.
- Subir un logo o imagen representativa respecto de la cual tenga derechos o autorización de uso.
- Aceptar las presentes bases.
- Aceptar la política de privacidad aplicable a la Campaña.
- Confirmar que sigue la cuenta oficial de Instagram {{OFFICIAL_INSTAGRAM_HANDLE}}.
- Cumplir los requisitos de edad y territorio indicados en estas bases.

El requisito de seguimiento de Instagram será verificado únicamente respecto de las postulaciones preseleccionadas o seleccionadas. Zyteron no solicitará contraseñas, códigos de acceso ni credenciales de Instagram.

En caso de que una cuenta sea privada y no pueda verificarse razonablemente el requisito, Zyteron podrá solicitar una validación adicional antes de confirmar el beneficio.

Cada negocio podrá participar una sola vez por edición.

El sistema podrá detectar y bloquear duplicados mediante correo electrónico, número de WhatsApp, cuenta de Instagram, RUT de empresa cuando exista y otras señales técnicas de prevención de fraude.

7. GRATUIDAD DE LA POSTULACIÓN

La postulación es completamente gratuita.
No se exige compra, pago, aporte, transferencia, suscripción pagada ni contratación de servicios para participar.
La contratación futura de servicios de Zyteron no aumenta, modifica ni garantiza posibilidades de selección.

8. BENEFICIO

La presente edición contempla {{BENEFITS_QUANTITY}} beneficio(s).
El beneficio se denomina:
{{BENEFIT_TITLE}}
Su valor referencial es de:
\${{BENEFIT_VALUE_CLP}}

El beneficio incluye exclusivamente los siguientes elementos:
{{INCLUDED_ITEMS}}

El beneficio no incluye:
{{EXCLUDED_ITEMS}}

El beneficio no es canjeable por dinero, no es transferible, no puede revenderse y no podrá ser sustituido por otro servicio, salvo acuerdo escrito de Zyteron por razones técnicas justificadas.
La disponibilidad de dominio estará sujeta a disponibilidad de registro. En caso de que el dominio solicitado no se encuentre disponible, Zyteron propondrá alternativas razonables dentro del alcance definido.

9. CRITERIOS DE SELECCIÓN

Las postulaciones válidas serán evaluadas conforme a los siguientes criterios:
- 40% Necesidad real de presencia digital.
- 25% Claridad, calidad y completitud de la postulación.
- 20% Factibilidad técnica y operativa del proyecto.
- 15% Potencial de impacto y utilidad para el negocio.

Los criterios podrán ser ajustados antes de publicar la Campaña, pero no podrán modificarse durante el período activo sin publicar una nueva versión de estas bases y un aviso visible de actualización.

10. PROCESO DE REVISIÓN Y SELECCIÓN

Una vez cerrada la etapa de postulación, Zyteron revisará los antecedentes recibidos.
La selección se realizará en la fecha estimada {{SELECTION_DATE}}.
La publicación del resultado se realizará a más tardar el {{ANNOUNCEMENT_DATE}} en {{RESULTS_PUBLICATION_CHANNELS}}.

11. EMPATE, SUPLENTES Y DESCARTE

En caso de empate técnico entre dos o más postulaciones, Zyteron priorizará según los criterios establecidos. Zyteron podrá seleccionar postulaciones suplentes si el seleccionado no responde en el plazo estipulado.

12. CONTACTO CON LA PERSONA SELECCIONADA

Zyteron contactará a la persona seleccionada mediante el correo electrónico y/o WhatsApp ingresado. La persona tendrá {{WINNER_RESPONSE_DAYS}} días hábiles desde el primer contacto verificable para responder.

13. IMPLEMENTACIÓN DEL BENEFICIO

Antes de iniciar el proyecto, la persona seleccionada deberá firmar o aceptar electrónicamente un Acuerdo de Aceptación de Beca Web Pyme Zyteron.

14. VITRINA DE PYMES Y EMPRESAS POSTULANTES

Las personas postulantes podrán autorizar voluntariamente la publicación de información básica de su negocio en la Vitrina. La autorización es opcional y no modifica las posibilidades de selección.

15. CASO DE ÉXITO Y PUBLICACIÓN DEL GANADOR

La persona seleccionada deberá aceptar un acuerdo específico de autorización de caso de éxito antes de iniciar el proyecto.

16. DATOS PERSONALES Y PRIVACIDAD

Zyteron tratará los datos personales entregados en esta postulación únicamente para gestionar la convocatoria, validar requisitos y comunicar resultados. Zyteron no venderá ni compartirá datos con terceros no autorizados.

17. USO DE LOGOS, IMÁGENES Y CONTENIDO

La persona postulante declara contar con los derechos necesarios sobre el logo o imágenes enviadas.

18. PROHIBICIONES

Queda prohibido manipular formularios, usar bots, suplantar identidad o entregar datos falsos.

19. MODIFICACIONES, SUSPENSIÓN Y FUERZA MAYOR

Zyteron podrá modificar, suspender o cancelar la Campaña por razones de fuerza mayor o problemas técnicos graves, publicando un aviso visible con la fecha y motivo de la actualización.

20. CONSULTAS Y RECLAMOS

Consultas a: {{CONTACT_EMAIL}}. Privacidad a: {{PRIVACY_EMAIL}}.

21. INSTAGRAM

Esta campaña no está patrocinada ni asociada con Instagram.

22. ACEPTACIÓN DE LAS BASES

La postulación implica que la persona declara haber leído y aceptado estas bases.
Versión de bases: {{TERMS_VERSION}}
Fecha de publicación: {{PUBLISHED_AT}}
Última actualización: {{LAST_UPDATED_AT}}`;

const OFFICIAL_PRIVACY_TEMPLATE = `# Política de Privacidad y Vitrina - Becas Web Pyme Zyteron

## 1. Responsable del tratamiento
El responsable del tratamiento de los datos personales es Zyteron SpA (o quien se indique como organizador en las bases de la campaña).

## 2. Datos que se recopilan
Recopilamos información de contacto (nombre, rol, correo, WhatsApp, región, comuna), datos del negocio (nombre comercial, rubro, presencia digital, descripción) y el logo representativo.

## 3. Finalidades de uso
Los datos obligatorios se utilizan exclusivamente para gestionar y validar la postulación, revisar antecedentes, comunicar selección o rechazo y gestionar la implementación del beneficio.

## 4. Fundamento de las autorizaciones
El tratamiento de datos obligatorios se funda en la ejecución de la solicitud de participación. Las autorizaciones para vitrina y marketing son consentimientos separados y revocables.

## 5. Datos obligatorios y opcionales
Los datos obligatorios se utilizan exclusivamente para gestionar y validar la postulación. La autorización para recibir información comercial y para aparecer en la vitrina pública es independiente, voluntaria y puede revocarse.

## 6. Consentimiento separado para marketing
El uso de datos para fines comerciales, promociones, diagnósticos o futuras convocatorias requiere autorización expresa en el formulario, la cual puede retirarse en cualquier momento.

## 7. Consentimiento separado para vitrina
La autorización de vitrina no aumenta ni reduce las posibilidades de selección. Zyteron no publicará RUT, correo, WhatsApp, respuestas privadas, documentos, códigos de postulación, puntajes ni antecedentes tributarios de las personas participantes.

## 8. Consentimiento separado para mostrar Instagram
En la vitrina pública solo se mostrará la cuenta de Instagram del negocio si el participante otorgó su consentimiento expreso para ello.

## 9. Tratamiento de logo e imágenes
Los logos subidos se utilizarán para validar la postulación y, en caso de haber otorgado autorización de vitrina, para ser exhibidos públicamente tras una aprobación manual por parte de nuestro equipo.

## 10. Almacenamiento seguro y Plazo de conservación
Los datos se almacenan en servidores seguros con cifrado y control de acceso estricto. Los datos de postulaciones no seleccionadas se conservarán durante el período de la campaña y hasta 12 meses posteriores para fines de auditoría legal y estadística.

## 11. Solicitudes de retiro y ejercicio de derechos
Para solicitar el retiro de la postulación, ocultar el perfil de la vitrina, retirar el consentimiento comercial o ejercer derechos de acceso, corrección y actualización, puedes escribir directamente a nuestro correo oficial de privacidad.`;

export default function LegalManager({
  campaign,
  versions = [],
}: {
  campaign: any;
  versions: any[];
}) {
  // Buscamos la última versión de terms para el estado inicial
  const initialTermsVersions = versions.filter((v) => v.document_type === "terms");
  const latestTerms = initialTermsVersions.length > 0 ? initialTermsVersions[0] : null;

  const [docType, setDocType] = useState("terms");
  const [title, setTitle] = useState(latestTerms?.title || "Bases Oficiales v1.0");
  const [versionNumber, setVersionNumber] = useState(latestTerms?.version_number || "v1.0");
  const [content, setContent] = useState(latestTerms?.content_markdown || OFFICIAL_TERMS_TEMPLATE);
  const [updateSummary, setUpdateSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredVersions = versions.filter((v) => v.document_type === docType);
  const currentPublished = filteredVersions.find((v) => v.is_current);

  const handleDocTypeChange = (type: string) => {
    setDocType(type);
    setError(null);
    setSuccess(null);
    
    // Auto-load latest version if exists
    const typeVersions = versions.filter((v) => v.document_type === type);
    const latestVersion = typeVersions.length > 0 ? typeVersions[0] : null;

    if (latestVersion) {
      setTitle(latestVersion.title);
      setVersionNumber(latestVersion.version_number);
      setContent(latestVersion.content_markdown);
    } else {
      if (type === "terms") {
        setTitle("Bases Oficiales v1.0");
        setVersionNumber("v1.0");
        setContent(OFFICIAL_TERMS_TEMPLATE);
      } else if (type === "privacy") {
        setTitle("Política de Privacidad y Vitrina v1.0");
        setVersionNumber("v1.0");
        setContent(OFFICIAL_PRIVACY_TEMPLATE);
      } else if (type === "gallery_terms") {
        setTitle("Condiciones de Vitrina v1.0");
        setVersionNumber("v1.0");
        setContent("Condiciones y reglas de publicación en la Vitrina Pública de Pymes...");
      } else {
        setTitle("Acuerdo del Ganador v1.0");
        setVersionNumber("v1.0");
        setContent("Términos y condiciones de entrega del proyecto y liberación de propiedad intelectual...");
      }
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await saveLegalDraft({
        campaignId: campaign.id,
        documentType: docType,
        versionNumber,
        title,
        contentMarkdown: content,
      });
      setSuccess("Borrador legal guardado correctamente.");
    } catch (err: any) {
      setError(err.message || "Error al guardar el borrador.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (versionId: string) => {
    if (!confirm("¿Está seguro de publicar esta versión? Una vez publicada no podrá modificarse en el lugar.")) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await publishLegalVersion({
        versionId,
        campaignId: campaign.id,
        documentType: docType,
        updateSummary,
      });
      setSuccess("Versión publicada como vigente.");
    } catch (err: any) {
      setError(err.message || "Error al publicar la versión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tarjeta de control de estado legal */}
      <div className="rounded-xl border bg-slate-50 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>📋 Estado Legal de la Campaña</span>
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 text-sm">
          <div className="rounded-lg bg-white p-4 border">
            <span className="block font-medium text-slate-500">Bases Oficiales</span>
            <span className={`mt-1 inline-block px-2 py-1 rounded text-xs font-bold ${campaign.current_terms_version_id || campaign.terms_content ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {campaign.current_terms_version_id || campaign.terms_content ? "PUBLICADAS ✓" : "PENDIENTE ✕"}
            </span>
          </div>
          <div className="rounded-lg bg-white p-4 border">
            <span className="block font-medium text-slate-500">Política de Privacidad</span>
            <span className={`mt-1 inline-block px-2 py-1 rounded text-xs font-bold ${campaign.current_privacy_version_id || campaign.privacy_content ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {campaign.current_privacy_version_id || campaign.privacy_content ? "PUBLICADA ✓" : "PENDIENTE ✕"}
            </span>
          </div>
          <div className="rounded-lg bg-white p-4 border">
            <span className="block font-medium text-slate-500">Condiciones de Vitrina</span>
            <span className={`mt-1 inline-block px-2 py-1 rounded text-xs font-bold ${campaign.current_gallery_terms_version_id || campaign.public_gallery_terms_content ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
              {campaign.current_gallery_terms_version_id || campaign.public_gallery_terms_content ? "PUBLICADAS ✓" : "OPCIONAL / DEFAULT"}
            </span>
          </div>
          <div className="rounded-lg bg-white p-4 border">
            <span className="block font-medium text-slate-500">Acuerdo de Ganador</span>
            <span className={`mt-1 inline-block px-2 py-1 rounded text-xs font-bold ${campaign.current_winner_agreement_version_id ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}`}>
              {campaign.current_winner_agreement_version_id ? "CONFIGURADO ✓" : "SIN CONFIGURAR"}
            </span>
          </div>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 font-medium">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 font-medium">{success}</div>}

      {/* Pestañas de documentos */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "terms", label: "Bases Oficiales" },
            { id: "privacy", label: "Política de Privacidad" },
            { id: "gallery_terms", label: "Condiciones de Vitrina" },
            { id: "winner_agreement", label: "Acuerdo del Ganador" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleDocTypeChange(tab.id)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                docType === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor de borrador / nueva versión */}
        <div className="lg:col-span-2 space-y-6 rounded-xl border bg-white p-6 shadow-sm">
          <h4 className="text-md font-bold text-slate-900 border-b pb-2">Crear o Editar Versión (Borrador)</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Número de Versión *</label>
              <input
                type="text"
                value={versionNumber}
                onChange={(e) => setVersionNumber(e.target.value)}
                placeholder="ej: v1.0, v1.1"
                className="mt-1 block w-full rounded-md border p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Título del Documento *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border p-2 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">Contenido (Markdown) *</label>
              <button
                type="button"
                onClick={() => {
                  if (docType === "terms") setContent(OFFICIAL_TERMS_TEMPLATE);
                  if (docType === "privacy") setContent(OFFICIAL_PRIVACY_TEMPLATE);
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                ↻ Cargar plantilla por defecto
              </button>
            </div>
            <textarea
              rows={15}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="block w-full rounded-md border p-3 font-mono text-xs text-slate-800 leading-relaxed"
            ></textarea>
            <p className="mt-1 text-xs text-slate-500">
              Tip: Puede utilizar variables dinámicas como {`{{CAMPAIGN_NAME}}`}, {`{{ORGANIZER_LEGAL_NAME}}`}, {`{{START_DATE}}`} que se completarán desde los datos de la campaña al mostrarse.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              disabled={loading}
              onClick={handleSaveDraft}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar Borrador"}
            </button>
          </div>
        </div>

        {/* Historial de versiones y publicación */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h4 className="text-md font-bold text-slate-900 border-b pb-2">Versiones Existentes</h4>
            {filteredVersions.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-4 text-center">No hay versiones creadas para este tipo.</p>
            ) : (
              <div className="space-y-4">
                {filteredVersions.map((ver) => (
                  <div
                    key={ver.id}
                    className={`rounded-lg border p-4 transition ${
                      ver.is_current ? "border-green-500 bg-green-50/40" : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900">
                        {ver.version_number} - {ver.title}
                      </span>
                      {ver.is_current && (
                        <span className="bg-green-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                          Vigente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mb-2">
                      Estado: {ver.published_at ? `Publicado el ${new Date(ver.published_at).toLocaleDateString()}` : "Borrador (Sin publicar)"}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setVersionNumber(ver.version_number);
                          setTitle(ver.title);
                          setContent(ver.content_markdown);
                        }}
                        className="text-xs text-blue-600 font-medium hover:underline"
                      >
                        Cargar en editor
                      </button>

                      {!ver.published_at && !ver.is_current && (
                        <div className="w-full mt-2 pt-2 border-t">
                          <input
                            type="text"
                            placeholder="Resumen de cambios (obligatorio si hay postulantes)"
                            value={updateSummary}
                            onChange={(e) => setUpdateSummary(e.target.value)}
                            className="block w-full text-xs border rounded p-1.5 mb-2"
                          />
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handlePublish(ver.id)}
                            className="w-full rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                          >
                            ✓ Publicar y activar como Vigente
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
