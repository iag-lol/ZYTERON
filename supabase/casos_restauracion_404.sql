-- =========================================================
-- RESTAURACIÓN DE CASOS DE ÉXITO EN 404
--
-- El commit cdd0975 eliminó src/content/case-studies.ts, con lo que
-- 10 URLs de /casos-exito/[slug] que Google ya tenía indexadas quedaron
-- en 404. Hoy /casos-exito lee SOLO desde Supabase
-- (src/lib/content/cases-merge.ts), así que este seed devuelve esos
-- 10 casos a la base con EXACTAMENTE el mismo slug, recuperando las URLs
-- y la evidencia comercial de la sección.
--
-- Ejecutar en Supabase SQL Editor DESPUÉS de blog_cases_bootstrap.sql
-- (la tabla "CaseStudy" debe existir).
--
-- Idempotente: usa ON CONFLICT (slug) DO NOTHING, se puede re-ejecutar
-- sin duplicar ni pisar ediciones hechas en /admin/casos.
--
-- Contenido: recuperado del archivo original borrado. Se conserva la
-- fecha de publicación original (2026-05-19) como señal de antigüedad y
-- la anonimización de los casos. No se agregan métricas, porcentajes,
-- nombres de clientes ni testimonios que el material original no tuviera:
-- los resultados se describen de forma cualitativa.
--
-- Mapeo de campos del archivo original a las columnas de "CaseStudy":
--   challenge + objectives            -> problem
--   solution + implementation + notes -> solution
--   outcomes + kpis                   -> results
--   clientProfile                     -> "companyName" (perfil genérico)
-- El detalle (src/components/casos/db-case-article.tsx) renderiza
-- problem/solution/results como texto plano con whitespace-pre-line:
-- NO es Markdown, por eso se usan saltos de línea y viñetas "-".
--
-- "sortOrder" 6..15 para no desplazar los casos ya sembrados en
-- seed_blog_casos_julio2026.sql (1..5).
-- =========================================================

-- =========================================================
-- CASO · Aplicación para checklist de revisión de buses
-- slug: app-checklist-revision-buses
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'app-checklist-revision-buses',
  'Empresa de transporte con flota de buses',
  'Transporte y operación de flota',
  E'El equipo registraba las revisiones de buses en papel, lo que dificultaba buscar el historial, medir cumplimiento, detectar fallas recurrentes y generar indicadores confiables para la operación.\n\nLa empresa buscaba reemplazar esos registros manuales por formularios digitales ordenados, centralizar la evidencia de cada revisión por fecha, responsable y unidad, y tener una base para seguir cumplimiento y tiempos de respuesta.',
  E'Aplicación web con formularios de checklist por bus y tipo de revisión, pensados para completarse rápido desde terreno u oficina.\n\n- Registro estructurado de respuestas, observaciones, responsables y estados.\n- Panel administrativo para revisar el historial y filtrar por unidad, fecha o condición.\n- Datos preparados para análisis de KPIs, SLA y decisiones operativas.\n\nEl trabajo partió levantando el checklist en papel y normalizando sus campos, siguió con el diseño de los formularios digitales y la estructura de control por estado, y cerró con la visualización de indicadores y los ajustes de flujo para que el equipo adoptara el sistema sin fricción.\n\nCaso anonimizado para proteger la información operativa del cliente: no se publican datos internos, patentes, responsables ni métricas confidenciales.',
  E'El proceso dejó de depender de documentos físicos dispersos y la empresa ganó trazabilidad de cada revisión por unidad, fecha y responsable. La información quedó disponible para analizar cumplimiento, reincidencias y tiempos de respuesta, de modo que la operación pudo avanzar hacia control por SLA y decisiones basadas en datos.\n\nCon esos registros, el equipo puede seguir indicadores como revisiones realizadas por periodo, pendientes por unidad o responsable, cumplimiento del checklist por tipo de revisión e incidencias recurrentes por bus.',
  '{"Aplicación web","Formularios digitales","Panel administrable"}',
  false,
  6,
  'published',
  'Caso checklist de buses | App con formularios y KPIs',
  'Caso anónimo: checklist de buses digitalizado con formularios, historial por unidad y datos para medir cumplimiento, reincidencias y SLA internos.',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO · Sistema de control de asistencia de personal
-- slug: control-asistencia-personal
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'control-asistencia-personal',
  'Empresa con personal operativo y control diario de asistencia',
  'Operaciones y gestión de personal',
  E'El control de asistencia se gestionaba con registros poco centralizados, lo que generaba diferencias, baja trazabilidad y más tiempo administrativo al revisar el cumplimiento del personal.\n\nLa empresa buscaba registrar la asistencia de forma consultable, reducir la dependencia de planillas dispersas y revisar con facilidad por fecha, trabajador y estado.',
  E'Sistema web con formulario de registro y panel de consulta para administración.\n\n- Organización de los datos por trabajador, fecha, estado y observación.\n- Vista administrativa para revisar registros y detectar inconsistencias.\n- Base escalable para reportes, exportaciones y reglas internas.\n\nEl proyecto partió levantando el flujo de asistencia existente y definiendo los campos mínimos para evitar carga innecesaria de datos, siguió con el desarrollo del formulario y el panel, y se validó con escenarios de registro diario y revisión administrativa.\n\nCaso anonimizado: no se publican nombres de trabajadores ni datos internos del cliente.',
  E'La asistencia quedó más ordenada y fácil de consultar, la administración redujo fricción al revisar registros por periodo y el negocio obtuvo una base más confiable para su control interno.\n\nCon esos registros, el equipo puede seguir indicadores como registros por trabajador, asistencias, ausencias y observaciones por periodo, y casos pendientes de revisión.',
  '{"Sistema web","Formularios digitales","Panel administrable"}',
  false,
  7,
  'published',
  'Caso control de asistencia | Sistema web para personal',
  'Caso anónimo: sistema de control de asistencia de personal con registros ordenados por trabajador y fecha, y revisión administrativa más simple.',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO · Control de flota por combustible
-- slug: control-flota-combustible
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'control-flota-combustible',
  'Empresa de logística con flota de vehículos operativos',
  'Transporte, logística y operación vehicular',
  E'El control de combustible no estaba suficientemente ordenado para comparar consumos, revisar el historial por vehículo y detectar desviaciones o registros incompletos.\n\nLa empresa buscaba registrar cada carga por vehículo, fecha y responsable, mejorar la trazabilidad del consumo y los costos asociados, y tener una base para reportes por unidad o periodo.',
  E'Sistema web para el ingreso estructurado de cargas de combustible y sus datos asociados.\n\n- Panel de consulta por unidad, fecha, responsable y tipo de registro.\n- Estructura preparada para KPIs de consumo, costos y comportamiento por flota.\n- Base para exportaciones o reportes según la necesidad administrativa.\n\nEl proyecto definió primero los datos críticos de cada carga, creó formularios para registro rápido, construyó el panel de seguimiento de unidades y validó el flujo con escenarios operativos reales.\n\nCaso anonimizado: no se publican patentes, rutas ni montos internos del cliente.',
  E'La empresa obtuvo mejor control del historial de combustible y dejó la información disponible para revisar tendencias y desviaciones, de modo que el equipo pudo tomar decisiones con datos ordenados y verificables.\n\nCon esos registros, la operación puede seguir indicadores como consumo por vehículo, registros por periodo, costos asociados por unidad y desviaciones pendientes de revisión.',
  '{"Sistema web","Formularios digitales","Panel administrable"}',
  false,
  8,
  'published',
  'Caso control de flota y combustible | Sistema web',
  'Caso anónimo: sistema de control de flota por combustible con registros de consumo por vehículo, trazabilidad y datos para decisiones operativas.',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO · Tienda online para artículos personalizados
-- slug: tienda-online-articulos-personalizados
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'tienda-online-articulos-personalizados',
  'Negocio de artículos personalizados',
  'Ecommerce y artículos personalizados',
  E'El negocio necesitaba mostrar sus productos de forma profesional, ordenar las opciones personalizables y facilitar el contacto sin depender solo de redes sociales o mensajes manuales.\n\nLa meta era una tienda online clara y responsive, con productos y categorías bien organizados, rutas de consulta directas y una base escalable para crecer en ecommerce.',
  E'Tienda online con catálogo organizado y fichas de producto, con diseño adaptado a la venta de artículos personalizados.\n\n- Arquitectura de catálogo por tipo de producto y páginas para productos destacados.\n- Rutas de contacto y pedido con llamados a la acción claros, incluido WhatsApp.\n- Estructura base para SEO de productos y categorías.\n- Optimización responsive para navegación desde el celular.\n\nCaso anonimizado: no se publican imágenes ni datos comerciales del cliente.',
  E'El negocio obtuvo un canal propio para presentar sus productos y sus clientes pudieron revisar las opciones con mayor claridad antes de consultar. La marca quedó mejor preparada para campañas, SEO y crecimiento digital.\n\nCon la tienda publicada, el negocio puede seguir indicadores como productos publicados, categorías activas, consultas generadas desde WhatsApp o formulario y páginas de producto disponibles para indexación.',
  '{"Tienda online","Catálogo web","WhatsApp","SEO"}',
  false,
  9,
  'published',
  'Caso tienda online de artículos personalizados',
  'Caso anónimo: tienda online de artículos personalizados con catálogo ordenado, fichas de producto, contacto por WhatsApp y base para vender mejor.',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO · Control de ventas, efectivo e inventario
-- slug: control-ventas-inventario-efectivo
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'control-ventas-inventario-efectivo',
  'Negocio con venta diaria de productos',
  'Comercio, ventas e inventario',
  E'El negocio no registraba sus ventas de forma ordenada, lo que generaba pérdida de control sobre el efectivo, el inventario disponible y los productos vendidos.\n\nLa meta era registrar las ventas diarias de forma estructurada, controlar los movimientos de productos y recuperar visibilidad sobre la operación comercial.',
  E'Sistema web para registrar ventas, productos y movimientos de inventario.\n\n- Panel administrativo con información de inventario y ventas.\n- Estructura para controlar ingresos, salidas y stock disponible.\n- Base para reportes comerciales y revisión de caja según alcance.\n\nEl proyecto partió levantando el flujo de venta y registro actual, definió los datos mínimos de venta, producto, cantidad y estado, y creó el panel de administración con registros consultables, validado con escenarios reales de venta e inventario.\n\nCaso anonimizado: no se publican montos, proveedores ni productos específicos del cliente.',
  E'El negocio obtuvo mayor control sobre las ventas registradas, la información de inventario quedó ordenada y consultable, y la administración pudo revisar movimientos sin depender de la memoria o de papeles sueltos.\n\nCon esos registros, el negocio puede seguir indicadores como ventas por día o periodo, productos vendidos, stock disponible, movimientos de inventario y diferencias pendientes de revisión.',
  '{"Sistema web","Control de inventario","Panel administrable"}',
  false,
  10,
  'published',
  'Caso control de ventas e inventario | Sistema web',
  'Caso anónimo: sistema de ventas e inventario para un negocio sin registro ordenado, con control de efectivo, stock y trazabilidad comercial.',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO · Presentación web y SEO para empresa de combustible
-- slug: web-empresa-combustible-seo
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'web-empresa-combustible-seo',
  'Empresa de servicios de combustible',
  'Combustible, energía y servicios B2B',
  E'La empresa tenía problemas de posicionamiento y una presentación digital insuficiente para explicar sus servicios, generar confianza y aparecer en las búsquedas relevantes de su rubro.\n\nLa meta era ordenar los servicios en páginas claras, mejorar la presentación corporativa y dejar rutas de contacto visibles para los clientes potenciales.',
  E'Web corporativa con estructura profesional y enfoque B2B, con contenido orientado a servicios, confianza, cobertura y contacto.\n\n- SEO técnico base: titles, descriptions, canonical, sitemap, Open Graph y schema.\n- Contenido reorganizado por intención de búsqueda, con jerarquía de encabezados clara.\n- Enlaces internos hacia servicios, contacto y preguntas frecuentes.\n- Desarrollo responsive con bloques comerciales y técnicos.\n\nCaso anonimizado: no se publican datos estratégicos ni métricas confidenciales del cliente.',
  E'La empresa obtuvo una presentación digital más clara y confiable, con una estructura mejor preparada para Google y para usuarios reales. Los servicios principales quedaron más visibles y enlazados internamente, y la web quedó lista para medir mejoras desde Search Console y analítica.\n\nCon esa base, la empresa puede seguir indicadores como páginas indexables por servicio, CTR e impresiones en Search Console, consultas por formulario o WhatsApp y rendimiento móvil.',
  '{"Web corporativa","SEO técnico","Open Graph","Schema.org"}',
  false,
  11,
  'published',
  'Caso SEO empresa de combustible | Web corporativa',
  'Caso anónimo: web corporativa para una empresa de combustible con estructura clara, contenido por servicio, SEO técnico y rutas de contacto visibles.',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO · Tickets georreferenciados de daño estructural y perimetral
-- slug: tickets-dano-estructural-georreferenciado
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'tickets-dano-estructural-georreferenciado',
  'Operación de mantenimiento e infraestructura en terreno',
  'Mantenimiento, infraestructura y operación en terreno',
  E'Los daños estructurales, perimetrales o de luminaria se reportaban con información incompleta, lo que dificultaba ubicar el problema, priorizar la atención y hacer seguimiento.\n\nLa meta era crear tickets con descripción, foto y ubicación georreferenciada, centralizar los reportes y mejorar el seguimiento por estado, responsable y prioridad.',
  E'Aplicación web para registrar tickets directamente en terreno, con formulario pensado para el celular.\n\n- Carga de fotos como evidencia del problema.\n- Georreferenciación para ubicar el punto reportado.\n- Tipos de daño y campos obligatorios definidos junto al equipo.\n- Panel para revisar, filtrar y gestionar los estados de atención.\n\nCaso anonimizado: no se publican ubicaciones reales ni fotografías operativas del cliente.',
  E'Los reportes quedaron mejor documentados, con evidencia y ubicación, y el equipo pudo priorizar la atención con más contexto. La operación ganó trazabilidad por ticket, zona, estado y responsable.\n\nCon esos registros, la operación puede seguir indicadores como tickets por tipo de daño, incidencias por zona o ubicación, estados abiertos, en revisión y cerrados, y tiempos de atención según el flujo definido.',
  '{"Aplicación web","Georreferenciación","Carga de fotos","Panel administrable"}',
  false,
  12,
  'published',
  'Caso tickets georreferenciados | Foto y ubicación',
  'Caso anónimo: tickets de daño estructural y perimetral con foto, ubicación georreferenciada, luminarias y seguimiento por estado y responsable.',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO · Control de equipos, tareas, reuniones e informes
-- slug: control-equipos-tareas-reuniones-informes
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'control-equipos-tareas-reuniones-informes',
  'Empresa con equipos internos y coordinación de tareas',
  'Gestión operativa y administración interna',
  E'La coordinación de equipos, tareas, reuniones e informes dependía de canales dispersos, lo que hacía difícil revisar responsables, avances y compromisos.\n\nLa meta era centralizar la asignación de tareas, registrar reuniones e informes y mejorar el seguimiento de pendientes y estados.',
  E'Sistema web con módulos de tareas, reuniones e informes para el trabajo interno.\n\n- Panel con responsables, estados, fechas y observaciones.\n- Registro histórico para el seguimiento de compromisos y acuerdos.\n- Base escalable para reportes y nuevas funciones administrativas.\n\nEl proyecto partió levantando roles, tipos de tarea y flujo de seguimiento, diseñó los módulos internos por prioridad operativa y validó el panel con escenarios de reunión, asignación y cierre de tareas.\n\nCaso anonimizado: no se publican equipos, responsables ni documentos internos del cliente.',
  E'El equipo obtuvo mayor claridad sobre tareas y responsables, las reuniones quedaron mejor documentadas y conectadas con acciones concretas, y la administración pudo revisar pendientes e informes con más orden.\n\nCon esos registros, la empresa puede seguir indicadores como tareas asignadas y completadas, pendientes por responsable, reuniones registradas e informes emitidos por periodo.',
  '{"Sistema web","Gestión de tareas","Panel administrable","Informes"}',
  false,
  13,
  'published',
  'Caso control de equipos y tareas | Sistema web',
  'Caso anónimo: sistema para controlar equipos con asignación de tareas, reuniones, informes, responsables y seguimiento operativo centralizado.',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO · Web para cotizaciones personalizadas en PDF
-- slug: web-cotizaciones-personalizadas-pdf
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'web-cotizaciones-personalizadas-pdf',
  'Empresa de servicios con cotización B2B',
  'Servicios comerciales y cotización B2B',
  E'El equipo armaba las cotizaciones a mano, con formatos inconsistentes y pérdida de tiempo al repetir información de servicios, condiciones y datos del cliente.\n\nLa meta era estandarizar la creación de cotizaciones, generar documentos personalizados y mantener trazabilidad de las solicitudes y propuestas emitidas.',
  E'Web con formulario de levantamiento comercial y generador de cotizaciones en PDF con estructura profesional.\n\n- Campos comerciales y estructura del documento definidos junto al equipo.\n- Flujo completo desde el formulario hasta el PDF listo para enviar.\n- Registro de datos para el seguimiento de oportunidades.\n- Base para notificaciones y flujo interno de ventas.\n\nEl generador se validó con distintos escenarios de servicios y condiciones antes de la puesta en marcha.\n\nCaso anonimizado: no se publican valores, clientes ni condiciones comerciales internas.',
  E'Las cotizaciones quedaron más consistentes y profesionales, el equipo redujo tareas repetitivas al preparar cada propuesta y la información comercial quedó ordenada para el seguimiento posterior.\n\nCon ese flujo, la empresa puede seguir indicadores como cotizaciones generadas por periodo, solicitudes recibidas, estados de propuesta y servicios más cotizados.',
  '{"Web a medida","Generación de PDF","Formularios digitales"}',
  false,
  14,
  'published',
  'Caso cotizaciones en PDF | Web que las genera sola',
  'Caso anónimo: web para generar cotizaciones personalizadas en PDF con formulario comercial, propuesta ordenada y trazabilidad de cada solicitud.',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO · Control de documentación de flota, permisos, RTG y SOAP
-- slug: control-documentacion-flota-permisos-rtg-soap
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'control-documentacion-flota-permisos-rtg-soap',
  'Empresa de transporte con documentación de flota',
  'Transporte, flota y cumplimiento operativo',
  E'La documentación de flota se controlaba de forma dispersa, lo que aumentaba el riesgo de vencimientos no detectados en permisos, revisión técnica, RTG, SOAP y otros documentos relevantes.\n\nLa meta era centralizar los documentos por vehículo, controlar vencimientos y estados críticos, y facilitar la revisión administrativa de permisos.',
  E'Sistema web para registrar la documentación de flota por unidad.\n\n- Campos por tipo de documento, fecha, estado y observación.\n- Panel de vencimientos y pendientes de actualización.\n- Base escalable para alertas y carga de archivos según alcance.\n\nEl proyecto levantó primero los documentos críticos por tipo de vehículo, diseñó la estructura para permisos, RTG, SOAP y revisiones, y validó el panel con escenarios de renovación y revisión administrativa.\n\nCaso anonimizado: no se publican patentes, documentos ni fechas reales del cliente.',
  E'La documentación quedó centralizada y más fácil de auditar, el equipo ganó visibilidad de los vencimientos próximos y la empresa redujo el riesgo operativo asociado a documentos desordenados.\n\nCon esos registros, la empresa puede seguir indicadores como documentos vigentes y vencidos, vencimientos próximos por periodo, unidades con documentación incompleta y tipos de documento pendientes de actualización.',
  '{"Sistema web","Control de vencimientos","Panel administrable"}',
  false,
  15,
  'published',
  'Caso documentación de flota | Permisos, RTG y SOAP',
  'Caso anónimo: sistema para controlar documentación de flota, permisos, revisión técnica, RTG y SOAP, con vencimientos visibles y menos riesgo operativo.',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00',
  '2026-05-19T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- Fuerza recarga del schema cache de PostgREST.
notify pgrst, 'reload schema';
