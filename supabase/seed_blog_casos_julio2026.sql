-- =========================================================
-- SEED: 5 artículos de blog + 5 casos de éxito (julio 2026)
-- Ejecutar en Supabase SQL Editor DESPUÉS de blog_cases_bootstrap.sql
-- (las tablas "BlogPost" y "CaseStudy" deben existir).
--
-- Idempotente: usa ON CONFLICT (slug) DO NOTHING, se puede
-- re-ejecutar sin duplicar. Fechas retroactivas variadas.
-- Casos anonimizados (rubro + comuna), siguiendo la convención
-- del contenido curado del sitio: sin nombres de empresas reales,
-- sin métricas inventadas ni citas de clientes fabricadas.
-- =========================================================

-- =========================================================
-- BLOG 1 · SEO local · publicado 2025-09-16
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'perfil-empresa-google-pymes-chile',
  'Perfil de Empresa en Google: cómo lograr que tu pyme aparezca en el mapa',
  'Cuando alguien busca tu rubro cerca suyo, Google muestra primero el mapa. Esta guía te ayuda a configurar y optimizar tu Perfil de Empresa para captar esas búsquedas.',
  $md$Cuando una persona busca "ferretería cerca de mí" o "dentista en Ñuñoa", Google muestra primero tres resultados en el mapa. Aparecer ahí es una de las formas más rápidas y económicas de conseguir clientes nuevos para una pyme, y depende de una herramienta gratuita: el Perfil de Empresa en Google (antes Google My Business).

## Por qué el mapa importa más que tu posición en los resultados

Las búsquedas con intención local ("cerca de mí", "en Providencia", "a domicilio") muestran el bloque del mapa antes que cualquier página web. Un perfil bien trabajado te permite competir ahí aunque tu sitio todavía esté construyendo autoridad en los resultados tradicionales.

Además, el perfil concentra las señales que un cliente revisa antes de llamar:

- Horario actualizado y confirmación de que estás abierto.
- Fotos reales del local, del equipo y de los trabajos.
- Reseñas con respuesta del dueño.
- Botones directos de llamada, WhatsApp y cómo llegar.

## Los 5 ajustes que más mueven la aguja

1. **Categoría principal correcta.** Es el factor de posicionamiento local más fuerte. Elige la categoría más específica posible (por ejemplo "Clínica dental" en vez de "Centro médico") y agrega categorías secundarias reales.
2. **Nombre sin relleno.** Usa el nombre real de tu negocio. Agregar palabras clave al nombre puede provocar suspensiones del perfil.
3. **Descripción con servicios y comunas.** Menciona qué haces y dónde atiendes con lenguaje natural: "Instalación y mantención de aire acondicionado en Maipú, Cerrillos y Estación Central".
4. **Fotos frescas cada mes.** Los perfiles con fotos recientes reciben más clics de cómo llegar y más llamadas. Basta con subir 2 o 3 fotos reales al mes desde el celular.
5. **Reseñas con respuesta.** Pide la reseña justo después de un buen servicio, con un enlace directo. Responde todas, incluidas las negativas, con tono profesional.

## Cómo pedir reseñas sin incomodar

El mejor momento es cuando el cliente acaba de recibir valor: terminaste la instalación, entregaste el pedido, cerró su tratamiento. Un mensaje corto por WhatsApp con el enlace directo a la reseña convierte mucho más que pedirlo en persona "para cuando pueda".

Un flujo simple que funciona:

- Termina el servicio y confirma que el cliente quedó conforme.
- Envía el enlace directo de reseña con un mensaje de una línea.
- Agradece la reseña respondiéndola dentro de la semana.

## Conecta el perfil con tu sitio web

El perfil y tu página web se refuerzan mutuamente. El sitio entrega la información profunda (precios de referencia, casos, formulario de cotización) y el perfil entrega la validación local. Asegúrate de que:

- El enlace del perfil apunte a la página de tu servicio principal, no solo al home.
- Nombre, dirección y teléfono sean idénticos en el sitio y en el perfil.
- Tu sitio tenga datos estructurados de negocio local (schema LocalBusiness).

Con el perfil optimizado y un sitio que responda lo que el cliente busca, cada búsqueda local se transforma en una oportunidad real de contacto.$md$,
  'SEO local',
  '{"seo local","google maps","perfil de empresa","pymes"}',
  7,
  'Zyteron',
  'published',
  'Perfil de Empresa en Google para pymes en Chile | Guía práctica',
  'Guía práctica para pymes chilenas: configura y optimiza tu Perfil de Empresa en Google para aparecer en el mapa, recibir llamadas y captar clientes locales.',
  '2025-09-16T12:00:00-03:00',
  '2025-09-16T12:00:00-03:00',
  '2025-09-16T12:00:00-03:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- BLOG 2 · Ventas y conversión · publicado 2025-11-04
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'responder-cotizaciones-rapido-ganar-clientes',
  'Responder cotizaciones en minutos: el hábito que más ventas genera en una pyme',
  'La mayoría de los clientes cotiza con varias empresas a la vez y avanza con la primera que responde bien. Cómo ordenar tu proceso para llegar primero.',
  $md$Cuando un cliente pide una cotización, casi siempre está cotizando con dos o tres empresas al mismo tiempo. La que responde primero con información clara parte con una ventaja enorme: define el estándar contra el que se compararán las demás.

## El costo invisible de responder tarde

Responder al día siguiente parece razonable desde adentro del negocio. Desde el punto de vista del cliente, significa que su proyecto quedó en pausa. Mientras espera, otra empresa ya le respondió, le hizo preguntas inteligentes y le propuso una llamada.

El tiempo de respuesta es una señal de cómo será trabajar contigo. Un cliente que recibe respuesta en 15 minutos asume que el servicio será igual de ágil.

## Qué hace lenta a una pyme al cotizar

Los cuellos de botella se repiten en casi todos los rubros:

- Las solicitudes llegan por canales dispersos: correo, WhatsApp, Instagram, formulario.
- Solo una persona sabe calcular precios, y no siempre está disponible.
- Cada cotización se arma desde cero en Word o Excel.
- Falta información del cliente y hay que ir y volver con preguntas.

## Un proceso de cotización que llega primero

**1. Captura con las preguntas correctas.** Un formulario web bien diseñado pide de entrada lo que necesitas para cotizar: tipo de servicio, cantidades, comuna, plazo. Así la primera respuesta ya es útil, en vez de "¿me puedes dar más detalles?".

**2. Respuesta automática inmediata con valor.** Un mensaje automático que confirma la recepción, indica el plazo real de respuesta y adjunta información de referencia (rangos de precio, ejemplos de trabajos) mantiene al cliente contigo mientras preparas la propuesta.

**3. Plantillas con precios base.** Con una estructura de cotización predefinida y precios de referencia por ítem, armar la propuesta toma minutos en vez de horas. Herramientas simples o un cotizador web pueden generar el PDF automáticamente.

**4. Seguimiento con fecha.** Toda cotización enviada necesita una fecha de seguimiento. Un recordatorio a los 2 o 3 días ("¿pudiste revisar la propuesta? ¿te hace sentido?") recupera ventas que se habrían enfriado solas.

## Cómo medir si estás mejorando

Tres indicadores bastan para empezar:

- **Tiempo hasta la primera respuesta** (meta inicial: menos de 1 hora en horario hábil).
- **Tiempo hasta la cotización formal** (meta inicial: mismo día).
- **Tasa de cierre**: de cada 10 cotizaciones enviadas, cuántas se convierten en venta.

Con esos tres números medidos durante un mes, las decisiones dejan de ser intuición: sabes exactamente dónde se pierden los clientes y qué parte del proceso conviene automatizar primero.$md$,
  'Ventas y conversión',
  '{"cotizaciones","ventas","procesos comerciales","pymes"}',
  6,
  'Zyteron',
  'published',
  'Cómo responder cotizaciones más rápido y ganar más clientes',
  'El tiempo de respuesta define quién gana la venta. Proceso práctico para que tu pyme responda cotizaciones en minutos: captura, plantillas y seguimiento.',
  '2025-11-04T12:00:00-03:00',
  '2025-11-04T12:00:00-03:00',
  '2025-11-04T12:00:00-03:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- BLOG 3 · Automatización · publicado 2026-01-13
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'agenda-online-pymes-servicios-chile',
  'Agenda online para pymes de servicios: menos llamadas, más horas reservadas',
  'Peluquerías, clínicas, talleres y consultoras pierden horas coordinando citas por teléfono. Una agenda online trabaja 24/7 y reduce las inasistencias.',
  $md$Si tu negocio funciona con horas —consultas, tratamientos, servicios técnicos, clases—, coordinar cada cita por teléfono o WhatsApp tiene un costo doble: el tiempo de quien responde y las reservas que se pierden fuera del horario de atención.

## El cliente quiere reservar cuando se acuerda, no cuando tú puedes contestar

Una parte importante de las reservas se intenta fuera del horario hábil: en la noche, el fin de semana, en el trayecto al trabajo. Si la única forma de agendar es hablar con alguien, esas intenciones se enfrían o se van a un competidor que sí tiene agenda online.

Una agenda web permite que el cliente:

- Vea la disponibilidad real y elija la hora que le acomoda.
- Reciba confirmación inmediata, sin esperar respuesta.
- Reagende o cancele solo, liberando el cupo para otra persona.

## Los recordatorios son la mitad del valor

Las inasistencias (el cliente que simplemente no llega) son una de las fugas de ingreso más grandes en negocios de servicios. Un recordatorio automático por WhatsApp o correo el día anterior, con opción de confirmar o reagendar en un clic, reduce ese problema de forma directa: la mayoría de las inasistencias son olvidos, no decisiones.

## Qué debe tener una buena agenda online

No todas las agendas sirven para todos los negocios. Antes de elegir o construir una, revisa:

- **Reglas de disponibilidad reales**: duración distinta por servicio, tiempos de preparación entre citas, bloqueos por colación o trámites.
- **Varios profesionales o recursos**: cada persona (o box, o equipo) con su propio calendario.
- **Recordatorios automáticos** configurables por canal y anticipación.
- **Pago o abono al reservar** si tu rubro sufre con las inasistencias: pedir un abono filtra a quienes no van en serio.
- **Registro del historial** de cada cliente: qué servicios ha tomado, cuándo, con quién.

## ¿Herramienta genérica o agenda propia?

Las plataformas genéricas de agendamiento resuelven bien el caso simple y permiten partir rápido. Una agenda integrada a tu propio sitio conviene cuando:

- Tus reglas de negocio son particulares (convenios, packs de sesiones, precios por horario).
- Quieres que la reserva ocurra en tu dominio, sumando confianza y SEO a tu marca.
- Necesitas que la agenda converse con el resto de tu operación: fichas de clientes, pagos, boletas, reportes.

## Por dónde partir esta semana

1. Anota durante 5 días cuántas interacciones de coordinación de horas atiende tu equipo.
2. Multiplica por el tiempo promedio de cada una: ese es el costo mensual en horas.
3. Revisa cuántas citas se pierden por inasistencia al mes.

Con esos dos números claros, evaluar una agenda online deja de ser un gasto difuso y pasa a ser una comparación directa: costo de la herramienta versus horas recuperadas y citas salvadas.$md$,
  'Automatización',
  '{"agenda online","reservas","automatización","servicios"}',
  7,
  'Zyteron',
  'published',
  'Agenda online para pymes de servicios en Chile | Guía',
  'Cómo una agenda online ayuda a tu pyme de servicios: reservas 24/7, recordatorios que reducen inasistencias y menos horas coordinando citas por teléfono.',
  '2026-01-13T12:00:00-03:00',
  '2026-01-13T12:00:00-03:00',
  '2026-01-13T12:00:00-03:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- BLOG 4 · Rendimiento web · publicado 2026-03-10
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'velocidad-web-mobile-conversion-pymes',
  'Velocidad web en mobile: el factor invisible que decide si te contactan',
  'La mayoría de tus visitas llega desde el celular, muchas veces con señal mediocre. Cómo medir la velocidad real de tu sitio y qué arreglar primero.',
  $md$La mayoría de las visitas a sitios de pymes en Chile llega desde un celular, muchas veces con señal irregular: en la calle, en el transporte, en una obra. En ese contexto, cada segundo de carga filtra visitantes. Un sitio que tarda en aparecer pierde clientes que nunca sabrás que existieron, porque se fueron antes de ver tu contenido.

## Qué significa "lento" en la práctica

La referencia útil no es cómo carga el sitio en tu oficina con WiFi, sino cómo carga en un celular promedio con red móvil. Las métricas que Google usa (Core Web Vitals) se resumen en tres preguntas simples:

- **¿Cuánto tarda en verse el contenido principal?** (LCP: idealmente bajo 2,5 segundos)
- **¿La página salta mientras carga?** (CLS: botones que se mueven justo cuando ibas a tocar)
- **¿Responde rápido cuando tocas algo?** (INP: el menú que tarda en abrir)

## Cómo medir tu sitio en 5 minutos

1. Entra a **PageSpeed Insights** (pagespeed.web.dev) y pon tu URL.
2. Mira primero la pestaña **Móvil**, no la de escritorio.
3. Fíjate en si hay "datos de usuarios reales": reflejan la experiencia efectiva de tus visitantes.
4. Repite con las 2 o 3 páginas que más visitas reciben, no solo el home.

## Los culpables habituales en sitios de pymes

En diagnósticos de sitios corporativos y de servicios, los problemas se repiten:

- **Imágenes gigantes**: fotos subidas directo de la cámara, de varios MB, que se muestran en 400 píxeles. Es la causa número uno y la más fácil de corregir.
- **Sliders y videos de fondo** en la portada que retrasan todo lo demás.
- **Exceso de plugins y scripts**: chats, mapas, píxeles y animaciones cargando al mismo tiempo.
- **Hosting subdimensionado**: servidores compartidos lentos donde ninguna optimización alcanza.
- **Temas o plantillas pesadas** que cargan librerías completas para usar una fracción.

## Qué arreglar primero (orden de impacto)

1. **Comprime y redimensiona las imágenes** al tamaño real de uso, en formato moderno (WebP/AVIF).
2. **Elimina lo que no aporta**: cada script de terceros debe justificar su costo en velocidad.
3. **Carga diferida** de lo que está fuera de pantalla: mapas, videos, secciones inferiores.
4. **Revisa el hosting**: si el servidor tarda en responder (TTFB alto), el problema es de base.
5. **Mide de nuevo** después de cada cambio, siempre en móvil.

## La velocidad también es una señal comercial

Un sitio rápido comunica lo mismo que un local ordenado: profesionalismo. El visitante no analiza métricas, pero siente la diferencia entre una página que responde al instante y una que lo hace esperar. Esa sensación termina influyendo en la decisión de llenar el formulario o seguir buscando.$md$,
  'Rendimiento web',
  '{"velocidad web","core web vitals","mobile","conversión"}',
  6,
  'Zyteron',
  'published',
  'Velocidad web en mobile: cómo medirla y mejorarla | Pymes Chile',
  'Tu sitio se visita desde celulares con señal irregular. Aprende a medir la velocidad real con PageSpeed Insights y qué arreglar primero para no perder contactos.',
  '2026-03-10T12:00:00-03:00',
  '2026-03-10T12:00:00-03:00',
  '2026-03-10T12:00:00-03:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- BLOG 5 · Marca y confianza · publicado 2026-05-26
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'correo-corporativo-dominio-propio-confianza',
  'Correo con dominio propio: la señal de confianza más barata para tu pyme',
  'Escribir desde contacto@tuempresa.cl en vez de un Gmail genérico cambia cómo te perciben clientes y proveedores. Qué necesitas y cómo configurarlo bien.',
  $md$Cuando una empresa cotiza con dos proveedores y uno escribe desde **contacto@suempresa.cl** mientras el otro lo hace desde un correo genérico tipo `empresa.ventas2020@gmail.com`, la percepción de seriedad queda definida antes de leer la propuesta. El correo con dominio propio es probablemente la señal de profesionalismo más barata que existe.

## Qué transmite un correo corporativo

- **Permanencia**: sugiere una empresa establecida, con infraestructura propia.
- **Coherencia de marca**: el dominio del correo coincide con el del sitio web que el cliente va a visitar.
- **Orden interno**: permite direcciones por función (ventas@, soporte@, administracion@) en vez de depender del teléfono personal de alguien.

Además hay un beneficio técnico directo: los correos desde dominio propio bien configurado tienen mejor llegada a bandeja de entrada que los envíos masivos desde cuentas gratuitas.

## Qué necesitas (y cuánto cuesta)

1. **Un dominio propio** (.cl se registra en NIC Chile por un costo anual bajo). Si ya tienes sitio web, este paso está listo.
2. **Un servicio de correo** asociado al dominio. Las opciones más usadas:
   - **Google Workspace**: la experiencia de Gmail con tu dominio, por usuario/mes.
   - **Microsoft 365**: Outlook con tu dominio, integrado a Word/Excel.
   - **Correo incluido en el hosting**: más económico, suficiente para volúmenes bajos, con interfaces más básicas.

Para la mayoría de las pymes, el costo total es comparable a un plan de celular.

## La configuración que evita caer en spam

Tener el correo no basta: hay tres registros DNS que le dicen al mundo que tus correos son legítimos.

- **SPF**: declara qué servidores pueden enviar correo a tu nombre.
- **DKIM**: firma digital que prueba que el mensaje salió de tu cuenta sin alteraciones.
- **DMARC**: define qué hacer con los correos que no pasen las verificaciones anteriores.

Sin estos registros, tus cotizaciones y respuestas pueden terminar en la carpeta de spam del cliente, y esa venta se pierde en silencio. Configurarlos toma minutos si lo hace alguien con experiencia, y es parte del setup estándar de cualquier proyecto web serio.

## Errores comunes al migrar

- Cambiar el correo y olvidar actualizarlo en el Perfil de Empresa en Google, redes sociales y facturación.
- Dejar la cuenta antigua sin redirección, perdiendo respuestas de clientes que escriben a la dirección de siempre.
- Usar una sola casilla para todo: separar al menos ventas y administración ordena el trabajo desde el día uno.

## El paso siguiente

Si tu sitio ya está en tu dominio, activar correo corporativo es una tarea de horas, no de semanas. Y si estás construyendo tu presencia digital desde cero, conviene resolver dominio, sitio y correo como un solo proyecto: la marca queda coherente en cada punto de contacto con el cliente.$md$,
  'Marca y confianza',
  '{"correo corporativo","dominio propio","marca","confianza"}',
  5,
  'Zyteron',
  'published',
  'Correo corporativo con dominio propio para pymes | Guía Chile',
  'Escribir desde @tuempresa.cl aumenta la confianza y mejora la llegada de tus correos. Qué necesitas, cuánto cuesta y cómo configurarlo sin caer en spam.',
  '2026-05-26T12:00:00-04:00',
  '2026-05-26T12:00:00-04:00',
  '2026-05-26T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO 1 · Ferretería · publicado 2025-10-21 · destacado
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   "projectDuration", featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'ferreteria-catalogo-online-consulta-stock',
  'Ferretería familiar en Puente Alto',
  'Ferretería y materiales de construcción',
  E'La ferretería atendía consultas de precio y stock por teléfono y WhatsApp durante todo el día. El equipo de mostrador interrumpía la atención presencial para responder, los clientes esperaban horas por una confirmación de disponibilidad y las listas de precios circulaban en fotos de planillas desactualizadas.\n\nLos maestros y contratistas —sus mejores clientes— necesitaban cotizar listas completas de materiales, y armar cada cotización a mano tomaba demasiado tiempo.',
  E'Catálogo web con los productos de mayor rotación, precios visibles y estado de disponibilidad administrable desde un panel simple.\n\n- Buscador por nombre, categoría y marca, pensado para uso desde el celular.\n- Botón de cotización que arma la lista de materiales y la envía por WhatsApp con los ítems ya detallados.\n- Panel administrativo para actualizar precios y disponibilidad sin conocimientos técnicos.\n- Página optimizada para búsquedas locales del rubro en la zona.',
  E'Las consultas repetitivas de precio y stock dejaron de interrumpir la atención en mostrador: el cliente ahora revisa el catálogo antes de llamar.\n\nLos contratistas envían su lista de materiales completa desde la web, y el equipo responde cotizaciones con los ítems ya estructurados en vez de transcribir audios. La ferretería pasó a tener presencia real en búsquedas locales de su rubro, algo que antes quedaba solo en manos de las grandes cadenas.',
  '{"Next.js","Supabase","WhatsApp Business","Panel administrable"}',
  '6 semanas',
  true,
  1,
  'published',
  'Caso: catálogo online con consulta de stock para ferretería',
  'Cómo una ferretería familiar de Puente Alto ordenó consultas de precio y stock con un catálogo web administrable y cotizaciones por WhatsApp.',
  '2025-10-21T12:00:00-03:00',
  '2025-10-21T12:00:00-03:00',
  '2025-10-21T12:00:00-03:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO 2 · Centro dental · publicado 2025-12-09 · destacado
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   "projectDuration", featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'centro-dental-agenda-online-recordatorios',
  'Centro dental en Ñuñoa',
  'Salud · Odontología',
  E'La recepción del centro pasaba gran parte del día coordinando horas por teléfono: agendar, confirmar, reagendar. Fuera del horario de atención no había forma de reservar, y las solicitudes que llegaban de noche por Instagram o WhatsApp se enfriaban hasta el día siguiente.\n\nLas inasistencias eran el problema más costoso: sillones reservados que quedaban vacíos porque el paciente olvidó su hora, sin tiempo para reasignar el cupo.',
  E'Agenda online integrada al sitio del centro, con disponibilidad real por profesional y tipo de tratamiento.\n\n- Reserva de horas 24/7 con confirmación inmediata para el paciente.\n- Recordatorio automático por WhatsApp el día anterior, con opción de confirmar o reagendar.\n- Reglas de agenda por tratamiento: duraciones distintas, tiempos de preparación de box.\n- Ficha básica de paciente con historial de atenciones para la recepción.',
  E'Los pacientes ahora reservan a cualquier hora, incluidas las noches y fines de semana en que antes no había respuesta. La recepción dedica su tiempo a la atención presencial en vez de al teléfono.\n\nLos recordatorios automáticos convirtieron los olvidos en confirmaciones o reagendamientos anticipados, lo que permite reasignar cupos que antes se perdían con el sillón vacío.',
  '{"Next.js","Supabase","WhatsApp Business","Agenda online"}',
  '7 semanas',
  true,
  2,
  'published',
  'Caso: agenda online con recordatorios para centro dental',
  'Cómo un centro dental de Ñuñoa habilitó reservas 24/7 y recordatorios automáticos por WhatsApp para reducir inasistencias y liberar a su recepción.',
  '2025-12-09T12:00:00-03:00',
  '2025-12-09T12:00:00-03:00',
  '2025-12-09T12:00:00-03:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO 3 · Arriendo de maquinaria · publicado 2026-02-17
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   "projectDuration", featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'arriendo-maquinaria-control-contratos-mantenciones',
  'Empresa de arriendo de maquinaria en Rancagua',
  'Maquinaria y equipos para construcción',
  E'La empresa administraba sus arriendos en planillas separadas: una para disponibilidad, otra para contratos, otra para mantenciones. Saber qué máquina estaba disponible, arrendada o en taller requería llamar a la persona que "sabía".\n\nLos vencimientos de contrato se detectaban tarde, las mantenciones preventivas se posponían hasta convertirse en fallas y no existía historial consultable por equipo.',
  E'Sistema web interno que centraliza el ciclo completo de cada equipo: disponibilidad, arriendos, contratos y mantenciones.\n\n- Ficha por máquina con estado actual, historial de arriendos y hoja de mantenciones.\n- Alertas de vencimiento de contratos y de mantenciones programadas por horas de uso o fecha.\n- Registro de entregas y devoluciones con observaciones y responsable.\n- Reportes de utilización por equipo para decidir compras y ventas de flota.',
  E'La disponibilidad de la flota dejó de depender de la memoria de una persona: cualquier miembro del equipo consulta el estado real de cada máquina en segundos.\n\nLas mantenciones preventivas ahora se programan con anticipación, y los vencimientos de contrato aparecen con días de aviso en vez de descubrirse encima. La gerencia obtuvo por primera vez datos de utilización por equipo para decidir inversiones de flota con números y no con intuición.',
  '{"Next.js","Supabase","Panel administrable","Reportes"}',
  '9 semanas',
  false,
  3,
  'published',
  'Caso: sistema de control de arriendos y mantenciones de maquinaria',
  'Cómo una empresa de arriendo de maquinaria de Rancagua centralizó disponibilidad, contratos y mantenciones en un sistema web y dejó atrás las planillas.',
  '2026-02-17T12:00:00-03:00',
  '2026-02-17T12:00:00-03:00',
  '2026-02-17T12:00:00-03:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO 4 · Estudio contable · publicado 2026-04-14
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   "projectDuration", featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'estudio-contable-portal-clientes-documentos',
  'Estudio contable en Santiago Centro',
  'Servicios contables y tributarios',
  E'Cada cierre de mes, el estudio recibía documentos de decenas de clientes por correo, WhatsApp y hasta en papel. El equipo perdía horas persiguiendo documentos faltantes, y los clientes preguntaban una y otra vez por el estado de sus declaraciones.\n\nLos archivos quedaban dispersos entre casillas de correo personales, con riesgo real de extraviar respaldos importantes.',
  E'Portal de clientes privado donde cada empresa sube su documentación y consulta el estado de sus trámites.\n\n- Acceso individual por cliente con carpetas mensuales predefinidas.\n- Lista de documentos requeridos por periodo, con estado pendiente/recibido/observado.\n- Notificaciones automáticas de recordatorio antes de cada cierre.\n- Repositorio histórico ordenado: cada declaración y respaldo consultable por periodo.',
  E'La recolección de documentos pasó de persecución individual a un flujo ordenado: el cliente ve exactamente qué le falta y lo sube directo al portal.\n\nLas consultas repetitivas de estado bajaron porque el cliente las responde solo, mirando su panel. El estudio ganó un archivo histórico centralizado y respaldado, y una imagen más profesional frente a sus clientes en cada interacción mensual.',
  '{"Next.js","Supabase","Portal de clientes","Notificaciones"}',
  '8 semanas',
  false,
  4,
  'published',
  'Caso: portal de clientes para estudio contable',
  'Cómo un estudio contable de Santiago Centro ordenó la recepción mensual de documentos con un portal de clientes con estados, recordatorios e historial.',
  '2026-04-14T12:00:00-04:00',
  '2026-04-14T12:00:00-04:00',
  '2026-04-14T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- =========================================================
-- CASO 5 · Gimnasio · publicado 2026-06-11
-- =========================================================
insert into public."CaseStudy"
  (id, slug, "companyName", industry, problem, solution, results, technologies,
   "projectDuration", featured, "sortOrder", status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'gimnasio-membresias-reservas-clases',
  'Gimnasio boutique en Viña del Mar',
  'Fitness y bienestar',
  E'El gimnasio controlaba membresías y pagos en una planilla que solo manejaba la administradora. Los cupos de las clases grupales se coordinaban por WhatsApp, con listas que cambiaban hasta última hora, clases sobrevendidas y alumnos que llegaban sin cupo.\n\nDetectar membresías vencidas dependía de revisiones manuales, por lo que había alumnos entrenando con planes expirados sin que nadie lo notara a tiempo.',
  E'Sistema web de membresías y reservas integrado al sitio del gimnasio.\n\n- Registro de alumnos con plan, fecha de vencimiento y estado de pago visible al instante.\n- Reserva de cupos por clase desde el celular, con lista de espera automática.\n- Avisos automáticos de vencimiento de plan antes de la fecha, con opción de renovar.\n- Panel para profesores con la asistencia real de cada clase.',
  E'Los cupos de clases se administran solos: el alumno reserva, cancela y corre la lista de espera sin intervención del staff, y las clases dejaron de sobrevenderse.\n\nLos vencimientos de membresía ahora se avisan con anticipación, lo que convirtió renovaciones tardías en renovaciones a tiempo. La administración dejó de depender de una sola persona y de una planilla, y el equipo completo trabaja sobre la misma información al día.',
  '{"Next.js","Supabase","Reservas online","Panel administrable"}',
  '7 semanas',
  false,
  5,
  'published',
  'Caso: sistema de membresías y reservas para gimnasio',
  'Cómo un gimnasio boutique de Viña del Mar automatizó membresías, vencimientos y reservas de clases grupales con un sistema web integrado a su sitio.',
  '2026-06-11T12:00:00-04:00',
  '2026-06-11T12:00:00-04:00',
  '2026-06-11T12:00:00-04:00'
)
on conflict (slug) do nothing;

-- Fuerza recarga del schema cache de PostgREST.
notify pgrst, 'reload schema';
