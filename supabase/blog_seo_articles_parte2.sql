-- =========================================================
-- SEED: 3 artículos de blog de decisión de compra (parte 2)
-- Ejecutar en Supabase SQL Editor DESPUÉS de blog_cases_bootstrap.sql
-- (la tabla "BlogPost" debe existir).
--
-- Artículos:
--   1. que-es-sistema-web-a-medida
--   2. errores-criticos-contratar-desarrollo-web-chile
--   3. automatizacion-whatsapp-empresas-casos-reales-chile
--
-- Idempotente: usa ON CONFLICT (slug) DO NOTHING, se puede
-- re-ejecutar sin duplicar. Contenido en markdown compatible con
-- src/lib/markdown.ts (## y ###, listas, negrita, enlaces; sin tablas).
-- Precios alineados con src/config/pricing.ts (fuente única):
--   sistema $1.290.000 · avanzado $2.490.000 · fullAdminPanel $990.000
--   booking $499.990 · dashboardReports $399.990 · whatsappAutomation $249.990
--   catalogo $299.990 · mantención system $199.990/mes · IA omnicanal
--   $1.690.000 + $199.990/mes · asistente IA ventas $899.990 + $99.990/mes.
-- =========================================================

-- =========================================================
-- BLOG · Sistemas web · que-es-sistema-web-a-medida
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt")
values (
  gen_random_uuid()::text,
  'que-es-sistema-web-a-medida',
  'Qué es un sistema web a medida y cuándo lo necesita tu empresa',
  'Cuando las planillas Excel, los correos y los grupos de WhatsApp dejan de dar abasto, un sistema web a medida ordena la operación completa. Qué es, cuánto cuesta en Chile y cómo saber si tu empresa ya lo necesita.',
  $md$Un sistema web a medida es un software construido específicamente para los procesos de tu empresa —cotizaciones, inventario, documentos, personal, vehículos, clientes— al que tu equipo accede desde cualquier navegador, sin instalar programas. Lo necesitas cuando las planillas Excel, los correos y los grupos de WhatsApp dejan de dar abasto: datos duplicados, versiones perdidas y horas de trabajo manual que podrían automatizarse. En Chile, un sistema web administrativo parte desde $1.290.000 CLP + IVA y suele estar operativo en varias semanas, no años.

En esta guía te explicamos qué es exactamente, en qué se diferencia de una página web o de un software genérico, cuáles son las señales de que tu empresa ya lo necesita, ejemplos concretos de empresas chilenas y los rangos de inversión y plazos reales para que puedas planificar con números sobre la mesa.

## Qué es exactamente un sistema web a medida

Es una aplicación privada, con usuarios y contraseñas, diseñada sobre la forma real en que trabaja tu negocio. En vez de adaptar tu operación a un software genérico, el software se adapta a tu operación: tus estados, tus flujos de aprobación, tus documentos, tus reportes.

### En qué se diferencia de una página web

Una página web muestra información a tus clientes: quién eres, qué vendes, cómo contactarte. Un sistema web trabaja para adentro: lo usa tu equipo todos los días para operar. Muchas empresas terminan teniendo ambos, conectados: la página capta clientes y el sistema procesa lo que esos clientes piden.

- **Página web**: pública, orientada a captar y convencer.
- **Sistema web**: privado, orientado a operar y ordenar.
- **Juntos**: el formulario de la página crea el registro en el sistema, sin copiar datos a mano.

### En qué se diferencia de un software genérico

Los software genéricos (ERP empaquetados, planillas compartidas, apps de suscripción) resuelven el 70% del problema y te obligan a convivir con el 30% restante: campos que no aplican, flujos que no calzan con tu proceso y reportes que igual terminas armando en Excel aparte. Un sistema a medida invierte la ecuación: se construye solo lo que tu operación necesita, con tus reglas de negocio, y crece por módulos cuando el negocio lo pide.

## 7 señales de que la planilla Excel ya no da

Excel es una gran herramienta para partir. El problema aparece cuando se convierte en el sistema central de la empresa. Estas señales indican que ese momento ya llegó:

1. **Existen varias versiones del mismo archivo.** "Inventario_final_v3_CORREGIDO.xlsx" circula por correo y nadie sabe cuál es la verdad.
2. **Solo una persona entiende la planilla.** Si se enferma o renuncia, la operación se frena.
3. **El equipo copia los mismos datos en dos o tres lugares.** Del WhatsApp al Excel, del Excel al Word de la cotización, del Word al correo.
4. **Los errores de digitación cuestan plata.** Un precio mal copiado, un stock desactualizado o una patente mal escrita generan pérdidas reales.
5. **No puedes ver el estado del negocio en el momento.** Armar el reporte mensual toma días porque hay que consolidar planillas de varias personas.
6. **El historial vive en la memoria de la gente.** Qué se le cotizó a ese cliente hace seis meses, quién aprobó ese gasto, cuándo venció ese documento: nadie lo sabe con certeza.
7. **Trabajar desde fuera de la oficina es un problema.** La planilla está en un computador específico y en terreno se anota en papel o por WhatsApp.

Si te reconoces en tres o más señales, el costo de seguir operando así —horas hombre, errores, decisiones a ciegas— ya suele superar la inversión en un sistema.

## Ejemplos de sistemas web en empresas chilenas

Estos son los tipos de sistema que más nos piden empresas en Chile, con el problema típico que resuelven:

### Intranet corporativa

Empresas con equipos distribuidos —oficina central, sucursales, gente en terreno— necesitan un solo lugar para comunicados, documentos internos, solicitudes de vacaciones y procedimientos. Una [intranet corporativa](/sistemas-web/intranet-corporativa) reemplaza la cadena de correos y los archivos dispersos por un punto único de acceso con permisos por rol: cada persona ve lo que le corresponde.

### Gestión documental

Constructoras, contratistas y empresas reguladas manejan contratos, certificados, facturas y documentación laboral que vence. Un sistema de [gestión documental](/sistemas-web/gestion-documental) centraliza los archivos con versiones, responsables y alertas de vencimiento: antes de que expire un certificado clave, el sistema avisa. Se acabó descubrir el documento vencido cuando el cliente o el fiscalizador lo pide.

### Control de flota

Empresas con vehículos —reparto, transporte, servicios en terreno— pierden margen por mantenciones atrasadas, documentos vencidos y costos que nadie consolida. Un sistema de [control de flota](/sistemas-web/control-flota) registra cada vehículo con sus mantenciones, revisión técnica, permisos y gastos, y muestra en un panel qué requiere atención esta semana.

Estos tres son puntos de partida frecuentes, no un límite: cotizadores internos, seguimiento de órdenes de trabajo, portales de clientes y paneles de indicadores siguen la misma lógica. Puedes ver el detalle de cada uno en [sistemas web a medida](/sistemas-web).

## Cuánto cuesta un sistema web a medida en Chile

Los rangos referenciales con los que trabajamos en Zyteron son:

- **Sistema web administrativo**: desde $1.290.000 CLP + IVA. Cubre un sistema con usuarios, roles, módulos de gestión y panel de administración para ordenar una operación concreta.
- **Sistema avanzado a medida**: desde $2.490.000 CLP + IVA. Para operaciones con más módulos, integraciones con otros servicios, flujos de aprobación complejos o mayor volumen de usuarios.
- **Mantención mensual de sistema**: desde $199.990 CLP + IVA al mes, para que el sistema evolucione con el negocio, se mantenga seguro y tenga soporte.

También es posible partir más acotado: si ya tienes una página web, módulos como un panel administrativo completo (desde $990.000 CLP + IVA), un sistema de reservas (desde $499.990 CLP + IVA) o un dashboard de reportes (desde $399.990 CLP + IVA) resuelven una parte del problema sin abordar todo de una vez.

El precio final depende del alcance: cantidad de pantallas, módulos, usuarios, integraciones y nivel de personalización. Por eso los valores se expresan "desde" y la cifra seria sale de una conversación sobre tu proceso, no de una tabla genérica.

### Qué incluye la inversión (y qué no)

Un proyecto bien cotizado incluye el levantamiento del proceso, el diseño de las pantallas, el desarrollo, las pruebas con tu equipo y la puesta en marcha. Los servicios externos —hosting, dominios, licencias de terceros, mensajería— se cobran por separado, y conviene que queden explícitos en la cotización desde el principio.

## Plazos reales: cuánto demora

Un sistema a medida serio no se entrega en una semana ni requiere un año. Los rangos habituales:

- **Sistema administrativo acotado** (un proceso central, pocos roles): 4 a 8 semanas.
- **Sistema con varios módulos** (por ejemplo documentos + personal + reportes): 8 a 14 semanas.
- **Sistema avanzado con integraciones**: 3 a 5 meses, generalmente entregado por etapas.

La forma más sana de abordar el plazo es por fases: una primera versión operativa con el módulo que más duele, y luego iteraciones. Así tu equipo empieza a usar el sistema en semanas y las siguientes fases se definen con la experiencia real de uso, no con supuestos.

¿Qué acelera un proyecto? Tener a alguien del equipo disponible para responder dudas del proceso, entregar a tiempo los ejemplos reales (planillas actuales, documentos tipo, listas de precios) y tomar decisiones rápidas sobre las pantallas. ¿Qué lo atrasa? Cambiar el alcance a mitad de camino y dejar las validaciones esperando semanas. El proveedor pone el desarrollo; el ritmo lo ponen ambos.

## Cómo saber si es tu momento: tres preguntas

1. **¿Cuántas horas a la semana pierde tu equipo en trabajo manual repetitivo?** Multiplica esas horas por el costo hora y por 12 meses: esa es la cifra contra la que se compara la inversión.
2. **¿Qué pasa si la persona clave de la planilla no está?** Si la respuesta es "se complica todo", el conocimiento del negocio está en riesgo.
3. **¿Puedes responderle a un cliente en el momento?** Estado del pedido, historial, documentos al día: si buscar la respuesta toma horas, el sistema se paga con la mejora de servicio.

Si las respuestas apuntan en la misma dirección, el paso siguiente no es firmar nada: es dimensionar tu caso. En el [cotizador online](/cotizador) puedes describir tu proceso y obtener un rango de inversión referencial en minutos, sin compromiso. Con eso sobre la mesa, la decisión deja de ser una intuición y pasa a ser un cálculo.

## Sigue aprendiendo

- [7 errores al contratar desarrollo web en Chile (y cómo evitarlos)](/blog/errores-criticos-contratar-desarrollo-web-chile)
- Conoce los tipos de sistema que desarrollamos en [sistemas web a medida](/sistemas-web).$md$,
  'Sistemas web',
  '{"sistemas web","software a medida","empresas","excel","precios"}',
  9,
  'Eduardo Ávila',
  'published',
  'Qué es un sistema web a medida y cuándo lo necesitas',
  'Qué es un sistema web a medida, las señales de que tu Excel quedó chico, ejemplos chilenos, precios desde $1.290.000 CLP + IVA y plazos reales por fase.',
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- BLOG · Guías de compra · errores-criticos-contratar-desarrollo-web-chile
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt")
values (
  gen_random_uuid()::text,
  'errores-criticos-contratar-desarrollo-web-chile',
  '7 errores al contratar desarrollo web en Chile (y cómo evitarlos)',
  'Contratar una página web es una inversión importante para cualquier empresa. Estos son los 7 errores que más caro cuestan en Chile —del contrato a las promesas de SEO garantizado— y cómo evitarlos antes de firmar.',
  $md$Los 7 errores más caros al contratar desarrollo web en Chile son: no pedir contrato ni factura, no exigir la propiedad del código y del dominio, elegir solo por precio, no dejar los plazos por escrito, ignorar la mantención, no revisar el portafolio y creer promesas de "primer lugar en Google garantizado". Todos son evitables con preguntas simples antes de firmar, y evitarlos marca la diferencia entre un sitio que trabaja para tu empresa durante años y un proyecto que hay que rehacer a los seis meses.

Esta guía recorre cada error con la señal de alerta concreta y la pregunta exacta que conviene hacer antes de pagar el primer peso.

## Error 1: contratar sin contrato ni factura

Es el error más frecuente y el que deja a la empresa más desprotegida. Sin contrato no hay alcance definido: cualquier ajuste se transforma en discusión sobre qué estaba incluido. Sin factura no hay respaldo tributario ni proveedor formal que responda.

**La señal de alerta**: el proveedor pide transferencia a una cuenta personal y "después vemos el papeleo".

**Cómo evitarlo**: pide un documento —contrato o al menos una propuesta formal aceptada por escrito— que detalle qué incluye el proyecto, cuántas páginas o módulos, cuántas rondas de ajustes y qué pasa si algo se atrasa. Y confirma que recibirás factura: un proveedor formal la emite sin que se la pidan dos veces.

## Error 2: no exigir la propiedad del código y del dominio

Este error se descubre tarde y duele: la empresa quiere cambiar de proveedor y resulta que el dominio está a nombre de la agencia, el hosting es una cuenta que no controla y el código nunca se entregó. El sitio queda secuestrado en la práctica, y migrarlo cuesta tiempo y plata.

**La señal de alerta**: el dominio se compra "para facilitarte el trámite" a nombre del proveedor, o el sitio vive en una plataforma de la que no puedes exportar nada.

**Cómo evitarlo**: exige por escrito tres cosas:

- El **dominio** inscrito a nombre de tu empresa (en NIC Chile para los .cl), con acceso propio.
- Acceso de administrador al **hosting** o, como mínimo, respaldo completo del sitio.
- Claridad sobre el **código**: quién es el dueño al terminar el proyecto y en qué formato se entrega.

Un proveedor serio no tiene problema con ninguno de los tres puntos, porque retiene clientes por servicio, no por candado.

## Error 3: elegir solo por precio

El presupuesto importa, pero cuando la única variable de decisión es el precio más bajo, el resultado típico es pagar dos veces: la primera por el sitio barato y la segunda por rehacerlo cuando no aparece en Google, se ve mal en celulares o el proveedor desapareció.

**La señal de alerta**: una diferencia de precio enorme sin explicación de alcance. Si una propuesta cuesta un tercio que las demás, algo no incluye: diseño propio, textos, optimización, soporte o todo lo anterior.

**Cómo evitarlo**: compara alcances, no cifras. Pide que cada propuesta detalle páginas, funcionalidades, quién escribe los contenidos, qué optimización incluye y qué soporte tiene después de la entrega. Con los alcances alineados, la comparación de precio recién se vuelve justa. Publicar precios de referencia es una buena señal de transparencia: puedes ver nuestros [planes y precios](/planes) como punto de comparación.

## Error 4: no pedir plazos por escrito

"Queda listo lueguito" no es un plazo. Sin fechas comprometidas, los proyectos web se estiran meses, y la empresa queda sin herramienta de cobro: no hay contra qué reclamar.

**La señal de alerta**: el proveedor evita comprometer fechas o responde con rangos vagos que dependen "de cómo avancemos".

**Cómo evitarlo**: pide un cronograma simple por hitos —diseño aprobado, versión de revisión, entrega— con fechas y con claridad sobre qué necesita el proveedor de tu parte en cada etapa (logo, textos, fotos, accesos). Los atrasos también se producen por material que el cliente no entrega, así que el cronograma protege a ambos lados.

## Error 5: ignorar la mantención

Una página web no es un producto que se compra una vez y queda funcionando solo para siempre: necesita actualizaciones de seguridad, respaldos, renovación de dominio y hosting, y ajustes de contenido. Quien no lo conversa al contratar, lo descubre con el sitio caído o con el dominio vencido en manos de otro.

**La señal de alerta**: la propuesta no menciona qué pasa después de la entrega, o el proveedor no ofrece ningún plan de continuidad.

**Cómo evitarlo**: pregunta desde el principio cuánto cuesta la mantención mensual y qué incluye (respaldos, actualizaciones, soporte, cambios menores), quién renueva el dominio y el hosting y cuánto cuestan esas renovaciones. Aunque decidas mantener el sitio por tu cuenta, la respuesta del proveedor te dice cuánto piensa en el largo plazo.

## Error 6: no revisar el portafolio

Cualquiera puede prometer; el portafolio muestra. Contratar sin ver trabajos anteriores es apostar a ciegas sobre calidad de diseño, velocidad y prolijidad.

**La señal de alerta**: no hay sitios publicados que se puedan visitar, o los ejemplos mostrados no cargan, se ven anticuados o funcionan mal en el celular.

**Cómo evitarlo**: pide 3 a 5 sitios reales en producción y revísalos tú mismo desde el teléfono: ¿cargan rápido?, ¿se leen bien?, ¿los formularios funcionan? Si el rubro es parecido al tuyo, mejor. Y si puedes contactar a un cliente anterior para preguntarle cómo fue trabajar con el proveedor, esa referencia vale más que cualquier presentación.

## Error 7: creer el "primer lugar en Google garantizado"

Nadie puede garantizar la primera posición en Google, porque nadie controla el algoritmo: ni la agencia más grande del mundo. El SEO serio mejora sistemáticamente la posición de un sitio con contenido, técnica y tiempo, pero se compromete con el trabajo y la tendencia, no con un puesto específico.

**La señal de alerta**: garantías de posición ("primer lugar en 30 días"), resultados instantáneos o precios sospechosamente bajos por "posicionamiento completo".

**Cómo evitarlo**: pide que te expliquen qué harían concretamente —optimización técnica, contenidos, palabras objetivo, medición— y qué indicadores reportarían mes a mes. Un proveedor que explica el cómo y muestra avances medibles es exactamente lo contrario del que vende garantías imposibles.

## Checklist rápido antes de firmar

Resumen para tener a mano en la reunión:

1. ¿Hay contrato o propuesta formal por escrito, con factura?
2. ¿El dominio queda a nombre de mi empresa y con mis accesos?
3. ¿Quién es dueño del código y del hosting al terminar?
4. ¿Qué incluye exactamente el precio y qué se cobra aparte?
5. ¿Cuáles son los hitos y fechas de entrega por escrito?
6. ¿Cuánto cuesta la mantención mensual y qué cubre?
7. ¿Puedo ver 3 a 5 sitios reales del proveedor funcionando?
8. ¿El discurso de SEO habla de trabajo y medición, o de garantías mágicas?

## Qué hacer si ya cometiste alguno de estos errores

La buena noticia: casi todos tienen arreglo, y mientras antes se aborden, más barato sale.

- **Sitio sin contrato ni respaldo**: pide hoy una copia completa del sitio y de la base de datos, y guárdala tú. Es una solicitud razonable que cualquier proveedor puede cumplir en el día.
- **Dominio a nombre del proveedor**: solicita la transferencia a nombre de tu empresa. En NIC Chile el trámite es formal y queda registrado; un proveedor serio coopera sin poner trabas.
- **Sitio que hay que rehacer**: antes de volver a contratar, define por escrito el alcance, los accesos y la propiedad, usando el checklist de arriba. El segundo proyecto se hace bien cuando el contrato corrige lo que el primero dejó al aire.
- **Mantención inexistente**: aunque el sitio funcione, verifica hoy quién renueva el dominio y el hosting y cuándo vencen. Es la revisión de cinco minutos que evita el peor escenario: el sitio caído con el dominio liberado.

Si quieres profundizar en el proceso completo de evaluación —con las preguntas para la primera reunión y cómo comparar propuestas— tenemos una guía dedicada: [cómo elegir una empresa de desarrollo web en Chile](/recursos/como-elegir-empresa-desarrollo-web-chile).

Y si estás en etapa de cotización, puedes obtener un rango de precio referencial para tu proyecto en minutos con el [cotizador online](/cotizador): llegar a las reuniones con un número de referencia te da una base concreta para comparar cualquier propuesta.

## Sigue aprendiendo

- [Qué es un sistema web a medida y cuándo lo necesita tu empresa](/blog/que-es-sistema-web-a-medida)
- Conoce cómo trabajamos los proyectos en [desarrollo web para empresas](/desarrollo-web).$md$,
  'Guías de compra',
  '{"desarrollo web","contratar agencia","errores","chile","contrato"}',
  9,
  'Eduardo Ávila',
  'published',
  '7 errores al contratar desarrollo web en Chile',
  'Los 7 errores más caros al contratar una página web en Chile: contrato, propiedad del código y dominio, plazos, mantención y SEO. Evítalos antes de firmar.',
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- BLOG · Automatización · automatizacion-whatsapp-empresas-casos-reales-chile
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt")
values (
  gen_random_uuid()::text,
  'automatizacion-whatsapp-empresas-casos-reales-chile',
  'Automatización de WhatsApp para empresas: qué resuelve y cuánto cuesta en Chile',
  'WhatsApp es el canal donde los clientes chilenos cotizan, preguntan y compran. Qué problemas resuelve automatizarlo, cómo se conecta con tu página web y los precios de referencia en Chile.',
  $md$La automatización de WhatsApp permite que una empresa responda consultas, entregue información de productos y haga seguimiento de cotizaciones de forma automática, a cualquier hora, sin depender de que alguien esté con el teléfono en la mano. En Chile, una automatización de WhatsApp parte desde $249.990 CLP + IVA como módulo de un sitio web, y las soluciones con asistente de inteligencia artificial que atienden web y WhatsApp a la vez parten desde $1.690.000 CLP + IVA más un cargo mensual.

WhatsApp es el canal donde el cliente chileno cotiza, pregunta y reclama. Esa es su fuerza y también su problema: cuando todas las conversaciones dependen de una persona respondiendo a mano, las consultas se pierden de noche y los fines de semana, y las ventas se enfrían esperando respuesta. Veamos qué resuelve la automatización, con casos de uso concretos, y cuánto cuesta cada nivel.

## Qué es la automatización de WhatsApp (y qué no es)

Automatizar WhatsApp es conectar el canal a un sistema que responde, deriva y registra según reglas o inteligencia artificial. Puede ser tan simple como una respuesta automática con menú de opciones, o tan completo como un asistente que conversa, arma una cotización preliminar y la registra en un panel.

Lo que **no** es: enviar mensajes masivos a gente que no te ha escrito. Ese camino quema el número, molesta a los clientes y arriesga bloqueos. La automatización bien hecha trabaja sobre conversaciones que el cliente inicia o acepta, y mejora la velocidad y calidad de la respuesta.

## Qué problemas resuelve: casos de uso

### 1. Respuesta inmediata, a cualquier hora

El caso más común y el de retorno más directo. Un cliente escribe a las 21:30 preguntando por un servicio; sin automatización, ese mensaje espera hasta el día siguiente, y muchas veces el cliente ya cotizó con otro. Con automatización, recibe al instante una respuesta útil: qué ofrece la empresa, rangos de referencia, horarios, y la opción de dejar sus datos para que un ejecutivo lo contacte.

Funciona especialmente bien para empresas de servicios —técnicos, salud, construcción, profesionales— donde la primera respuesta define con quién sigue conversando el cliente. El mismo principio aplica a comercios con horario de atención acotado: la consulta del domingo en la tarde se responde sola y el lunes el equipo parte el día con los datos del cliente ya capturados.

### 2. Cotizaciones y catálogo por WhatsApp

Si tu equipo responde todos los días las mismas preguntas —precio, disponibilidad, características—, esa conversación se puede estructurar. Dos niveles habituales:

- **Catálogo por WhatsApp**: el cliente navega productos con fotos y precios y arma su pedido conversando. Como proyecto parte desde $299.990 CLP + IVA.
- **Asistente que cotiza**: un asistente con inteligencia artificial conversa, entiende lo que el cliente necesita, calcula un preliminar y genera la solicitud de cotización, que queda registrada para que el equipo la cierre.

El beneficio no es solo velocidad: cada cotización queda registrada con los datos completos, en vez de dispersa en el historial del teléfono de alguien.

### 3. Seguimiento y recordatorios

La venta que más duele perder es la que ya estaba avanzada: el cliente pidió cotización, la recibió y nadie le volvió a escribir. La automatización permite programar seguimientos ("¿pudiste revisar la propuesta?") y recordatorios de horas o reservas, que en rubros con agenda reducen directamente las inasistencias.

### 4. Derivación ordenada al equipo

Cuando escriben muchas personas, el problema deja de ser responder y pasa a ser ordenar: qué conversación es una venta, cuál es soporte, cuál está esperando hace dos días. Un flujo automatizado clasifica la consulta con un par de preguntas y la deriva a la persona correcta, con el contexto ya levantado. El cliente no repite su historia tres veces y el equipo parte la conversación sabiendo qué necesita.

## Cómo se integra con tu página web

La automatización rinde el doble cuando el sitio web y WhatsApp trabajan juntos, porque cada canal hace lo que mejor sabe:

- **La página web capta y explica**: servicios, precios de referencia, casos. Es lo que Google muestra cuando te buscan.
- **WhatsApp conversa y cierra**: resuelve la duda específica y concreta la cotización o la reserva.

En la práctica, la integración significa que el botón de WhatsApp del sitio abre la conversación con contexto (desde qué página escribió el cliente, qué servicio miraba), que los formularios crean registros que disparan seguimiento automático y que todo queda en un solo historial. Las soluciones omnicanal llevan esto al máximo: un mismo asistente con la misma base de conocimiento atiende en la web y en WhatsApp, con historial centralizado y estadísticas.

### Qué necesitas para partir

Menos de lo que parece. Para una automatización seria conviene contar con:

- Un **número dedicado al negocio**, idealmente separado del teléfono personal del dueño.
- La **información base ordenada**: servicios, precios de referencia, horarios, preguntas frecuentes con sus respuestas. Es el material con el que se construyen los flujos o se entrena al asistente.
- Una **persona responsable** de revisar las conversaciones derivadas y cerrar las ventas: la automatización atiende y califica, pero el cierre sigue siendo humano.
- Si ya tienes página web, sus formularios y botones se conectan al flujo; si no, suele convenir abordar sitio y automatización como un solo proyecto.

## Cuánto cuesta la automatización de WhatsApp en Chile

Los valores de referencia con los que trabajamos en Zyteron, según el nivel de la solución:

- **Automatización por WhatsApp** (módulo para un sitio web: respuestas y flujos estructurados): desde $249.990 CLP + IVA, más costos de consumo de mensajería.
- **Catálogo por WhatsApp** (proyecto con catálogo navegable y pedidos por conversación): desde $299.990 CLP + IVA.
- **Asistente IA de ventas y atención al cliente** (atención 24/7 con calificación de clientes y panel de prospectos): desde $899.990 CLP + IVA de implementación, más desde $99.990 CLP + IVA mensuales.
- **Asistente IA omnicanal Web y WhatsApp** (un solo asistente en ambos canales, historial centralizado y flujos automatizados): desde $1.690.000 CLP + IVA de implementación, más desde $199.990 CLP + IVA mensuales.

Dos precisiones importantes para presupuestar bien:

1. Los valores son "desde" y no incluyen IVA: el precio final depende del alcance, los flujos y las integraciones de cada caso.
2. Los servicios externos se cobran aparte: la mensajería de WhatsApp y el consumo de los modelos de inteligencia artificial tienen costos de terceros que varían con el volumen de conversaciones. Una cotización seria te los muestra desde el principio.

Puedes ver el detalle de las soluciones y sus alcances en [automatización de WhatsApp para empresas](/automatizacion-whatsapp-empresas).

## Cómo saber si le conviene a tu empresa

La automatización se paga sola cuando existe volumen y repetición. Tres preguntas para evaluarlo:

- **¿Cuántas consultas llegan por WhatsApp a la semana?** Con decenas de conversaciones, cada mejora de velocidad y registro se multiplica.
- **¿Qué porcentaje de las preguntas se repite?** Si la mitad de las conversaciones son precio, horario y disponibilidad, esa mitad es automatizable hoy.
- **¿Cuántas consultas llegan fuera de horario?** Cada una de esas es hoy una venta que se enfría; con automatización, es un dato capturado y un cliente atendido.

Si el volumen todavía es bajo, suele convenir partir por el nivel más simple —respuesta automática con captura de datos— y escalar a asistente con inteligencia artificial cuando las conversaciones crezcan. Automatizar por etapas también le da tiempo al equipo para ajustar los mensajes con feedback real de los clientes.

## Errores comunes al automatizar (y cómo evitarlos)

- **Automatizar sin salida humana.** Siempre debe existir la opción de hablar con una persona; el asistente resuelve lo repetitivo y deriva lo complejo.
- **Responder rápido pero sin contenido.** Un "gracias por escribirnos, te contactaremos" no aporta nada. La primera respuesta automática debe entregar valor: información, rangos, opciones.
- **No registrar las conversaciones.** Si lo conversado no queda en un panel o historial consultable, se pierde la mitad del beneficio: los datos para hacer seguimiento y mejorar.
- **Dejar los mensajes escritos en piedra.** Los flujos se afinan con el uso; conviene revisar cada mes qué preguntas quedaron sin respuesta y ajustar.

WhatsApp ya es el canal de venta de facto de las empresas chilenas; automatizarlo bien significa atender más rápido, capturar cada oportunidad y liberar al equipo de lo repetitivo. Si quieres ver el panorama completo de procesos automatizables —no solo WhatsApp—, revisa [automatización para empresas](/automatizacion), y si prefieres partir con un número concreto para tu caso, el [cotizador online](/cotizador) te entrega un rango referencial en minutos.

## Sigue aprendiendo

- [Qué es un sistema web a medida y cuándo lo necesita tu empresa](/blog/que-es-sistema-web-a-medida)
- [7 errores al contratar desarrollo web en Chile (y cómo evitarlos)](/blog/errores-criticos-contratar-desarrollo-web-chile)$md$,
  'Automatización',
  '{"whatsapp","automatización","empresas","chile","asistente ia","precios"}',
  9,
  'Eduardo Ávila',
  'published',
  'Automatización de WhatsApp para empresas en Chile',
  'Qué resuelve automatizar WhatsApp en tu empresa: respuesta inmediata, cotizaciones y seguimiento. Precios en Chile desde $249.990 CLP + IVA y cómo partir.',
  now()
)
on conflict (slug) do nothing;

-- Verificación rápida: debe devolver 3 filas published.
select slug, status, "readMinutes", author, "publishedAt" is not null as fechado
from public."BlogPost"
where slug in (
  'que-es-sistema-web-a-medida',
  'errores-criticos-contratar-desarrollo-web-chile',
  'automatizacion-whatsapp-empresas-casos-reales-chile'
);
