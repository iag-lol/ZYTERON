-- =========================================================
-- RESTAURACIÓN 404: 9 artículos de blog que quedaron sin URL
--
-- El commit cdd0975 eliminó src/content/blog-posts.ts, dejando en 404
-- nueve URLs que Google ya tenía indexadas. Este seed las restaura en la
-- base de datos manteniendo EXACTAMENTE el mismo slug, título e intención
-- originales, pero con el cuerpo reescrito y expandido (1.200-1.800
-- palabras) para que dejen de ser contenido fino.
--
-- La fecha de "publishedAt" conserva la del artículo original para no
-- perder la señal de antigüedad frente a Google.
--
-- Ejecutar en Supabase SQL Editor DESPUÉS de blog_cases_bootstrap.sql
-- (la tabla "BlogPost" debe existir).
--
-- Idempotente: usa ON CONFLICT (slug) DO NOTHING, se puede re-ejecutar
-- sin duplicar ni pisar ediciones hechas en /admin/blog.
--
-- Precios copiados desde src/config/pricing.ts (fuente única).
-- El contenido es Markdown compatible con src/lib/markdown.ts:
-- sólo ##/###, listas, negrita, enlaces y citas (sin tablas pipe, que
-- ese renderizador no soporta: las comparativas van como listas).
--
-- Slugs restaurados:
--   1. seo-para-empresas-chile-primeros-90-dias      (2026-04-18)
--   2. que-debe-incluir-sistema-gestion-interno-pymes (2026-06-02)
--   3. soporte-ti-pymes-santiago-que-buscar-evitar    (2026-06-03)
--   4. vender-online-chile-sin-shopify-alternativas-pymes (2026-05-30)
--   5. panel-administrativo-vs-excel-salto-digital    (2026-05-31)
--   6. landing-page-vs-sitio-web-completo-negocio     (2026-06-01)
--   7. checklist-seguridad-digital-pymes-chilenas-2026 (2026-05-29)
--   8. tienda-online-sin-inventario-catalogo-whatsapp (2026-06-05)
--   9. medir-roi-pagina-web-empresa-b2b               (2026-05-28)
-- =========================================================

-- =========================================================
-- 1) BLOG · SEO para empresas en Chile: primeros 90 días
-- slug: seo-para-empresas-chile-primeros-90-dias
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'seo-para-empresas-chile-primeros-90-dias',
  'SEO para empresas en Chile: qué hacer en los primeros 90 días',
  'Hoja de ruta de 90 días para posicionar una empresa chilena en Google: base técnica el primer mes, páginas comerciales el segundo y contenido de apoyo el tercero, con lo que sí es esperable en cada tramo.',
  $md$Los primeros 90 días de SEO en una empresa chilena se ordenan en tres tramos: del día 1 al 30 se limpia la base técnica (indexación, metadatos, velocidad y medición), del 31 al 60 se construyen las páginas comerciales que capturan intención de compra, y del 61 al 90 se suma contenido de apoyo y se ajusta con datos reales de Search Console. En ese plazo lo esperable es ver cobertura, impresiones y primeras posiciones de cola larga, no liderazgo en las búsquedas más competidas. Esta guía detalla qué hacer en cada tramo, en qué orden y cómo saber si el trabajo va bien encaminado.

## Antes de partir: define qué significa resultado

El error que arruina más planes de SEO no es técnico, es de expectativa. Una empresa que factura por cotizaciones no necesita "más visitas": necesita más solicitudes de presupuesto de empresas que puedan pagarle. Si el objetivo se define como tráfico, el equipo terminará persiguiendo búsquedas informativas de alto volumen que no convierten en nada.

Antes del día 1, deja por escrito tres cosas:

- **Qué servicio o línea de negocio quieres llenar primero.** El SEO se hace por foco, no por catálogo completo.
- **Qué evento cuenta como éxito.** Formulario enviado, clic a WhatsApp, cotización solicitada, llamada. Uno principal, dos secundarios.
- **Cuál es tu punto de partida.** Anota hoy las impresiones, clics y posición media de Search Console. Sin esa foto inicial, en el día 90 no vas a poder demostrar nada.

Este encuadre vale para una constructora en Quilicura, una consultora contable en Providencia o una empresa de mantención industrial que atiende faenas en regiones. Cambian las palabras clave, no el método.

## Días 1 a 30: dejar la base técnica sin deudas

El primer mes no genera titulares, pero determina el rendimiento de todo lo demás. Si Google no puede rastrear, entender e indexar bien el sitio, cada texto nuevo rinde menos de lo que debería.

### Indexación y consistencia

- **Search Console y sitemap**: propiedad verificada, sitemap enviado y revisión del informe de páginas. Si aparecen URLs "Rastreada: actualmente sin indexar", casi siempre el problema es contenido fino o duplicado, no un error de servidor.
- **Un H1 por página y títulos únicos**: dos páginas con el mismo title compiten entre ellas. Es el caso más común de canibalización en sitios de empresa.
- **Canonicals y códigos de estado**: cada URL debe responder 200 o redirigir con 301 a su reemplazo. Un 404 en una URL que ya tenía posiciones es tráfico que se apaga de golpe.
- **Robots.txt sin bloqueos accidentales**: revisa que no queden reglas heredadas del ambiente de desarrollo.

### Rendimiento y experiencia móvil

En Chile la mayoría de las visitas a sitios de empresa llega desde el celular, muchas veces con datos móviles y no con el wifi de la oficina. Mide con PageSpeed Insights, prioriza el peso de las imágenes y revisa que los botones de contacto sean usables con una mano. La velocidad no reemplaza al contenido, pero un sitio lento pierde a la persona antes de que lea la propuesta. Este punto está desarrollado en detalle en [velocidad web y conversión en móviles](/blog/velocidad-web-mobile-conversion-pymes).

### Medición desde el día uno

Configura los eventos de conversión antes de generar tráfico. Formulario enviado, clic en el botón de WhatsApp, clic hacia el cotizador. Si esperas al día 60 para instalar la medición, perderás dos meses de datos que no se recuperan.

### Señales locales

Si la empresa atiende una zona concreta, el Perfil de Empresa en Google es parte del trabajo del primer mes: categorías correctas, dirección y teléfono idénticos a los del sitio, fotos reales. El perfil y el sitio se refuerzan mutuamente, como explicamos en [cómo lograr que tu pyme aparezca en el mapa](/blog/perfil-empresa-google-pymes-chile).

## Días 31 a 60: construir las páginas que capturan intención comercial

Con la base limpia, el segundo mes se dedica a lo que realmente trae cotizaciones: una página por intención de búsqueda.

El punto de partida es un mapa de palabras clave simple, en una planilla, con cuatro columnas: búsqueda, intención (informativa o comercial), URL que la responderá y estado. La regla de oro es **una intención principal por URL**. Si tienes tres páginas hablando de lo mismo con distintas palabras, Google elegirá una y las otras quedarán muertas.

En una empresa de servicios B2B, la estructura que mejor funciona suele ser:

1. **Hub de servicios**: una página que ordena y enlaza a todo lo que haces.
2. **Una página por servicio principal**: con el problema que resuelve, cómo trabajan, qué incluye, plazos y precio de referencia cuando sea posible.
3. **Páginas por segmento o industria**, si vendes distinto a rubros distintos.
4. **Preguntas frecuentes reales**: las que te llegan por WhatsApp cada semana, respondidas por escrito.

Publicar precios de referencia asusta a algunas empresas, pero filtra: quien no puede pagar no escribe, y quien escribe llega mucho más avanzado en la decisión. Nuestros valores públicos están en [la página de planes](/planes) precisamente por eso.

Cada página comercial debe terminar en una ruta clara: formulario, WhatsApp o [cotizador](/cotizador). Una página que posiciona pero no ofrece un siguiente paso obvio es una visita desperdiciada.

## Días 61 a 90: contenido de apoyo, autoridad y ajuste con datos

El tercer tramo tiene dos frentes.

**Contenido de apoyo.** Artículos y guías que responden lo que la gente busca antes de contratar: cuánto cuesta, qué diferencia hay entre una opción y otra, qué revisar antes de firmar. Este contenido casi nunca convierte de inmediato, pero cubre búsquedas informativas y, sobre todo, enlaza hacia las páginas comerciales. Sin ese enlazado interno, el blog es un adorno.

**Ajuste con datos.** A los 60 días Search Console ya tiene material suficiente. Busca:

- Consultas donde apareces en posición 8 a 20: son las que más rinden con un ajuste de título y contenido.
- Páginas con muchas impresiones y pocos clics: el problema suele estar en el title y la meta description, no en el contenido.
- Consultas que llegan a una página equivocada: señal de que falta una página específica o de que hay canibalización.

También es el momento de sumar señales externas legítimas: gremios, directorios de industria, proveedores, medios especializados. Nada de compra de enlaces.

## Qué esperar realmente a los 30, 60 y 90 días

Ser honesto con esto evita conversaciones incómodas en el directorio:

- **Día 30**: mejoras de rastreo e indexación, más páginas cubiertas, primeras impresiones nuevas. Casi nada de tráfico adicional.
- **Día 60**: crecimiento de impresiones, primeras posiciones en búsquedas de cola larga y de marca, y las primeras consultas atribuibles al orgánico.
- **Día 90**: tendencia clara en impresiones y clics, posiciones estables en búsquedas específicas, y un flujo pequeño pero medible de contactos. En rubros muy competidos (créditos, inmobiliaria, retail) el horizonte real es de seis a doce meses.

Cualquiera que garantice el primer lugar en 90 días está vendiendo algo que no controla.

## Errores que hacen perder los 90 días

- **Publicar mucho y enlazar poco.** Veinte artículos sueltos rinden menos que ocho bien conectados con las páginas de servicio.
- **Repetir la comuna en cada frase.** El SEO local funciona con lenguaje natural y contenido útil, no con listas de comunas apiladas.
- **Rehacer el sitio a mitad de camino sin plan de redirecciones.** Cambiar URLs sin 301 borra el avance de los dos primeros meses.
- **Medir solo posiciones.** La posición media agrega búsquedas que no te importan. Mide clics y conversiones por página.
- **Dejar el sitio sin mantención.** Un sitio que se cae, se pone lento o queda desactualizado pierde lo ganado. La [mantención web](/servicios/mantencion-web-chile) es parte del plan de SEO, no un extra.

## Checklist resumido del plan de 90 días

1. Search Console verificado, sitemap enviado y errores de indexación revisados.
2. Titles y H1 únicos por página, canonicals correctos, sin 404 con tráfico histórico.
3. Velocidad y experiencia móvil medidas y corregidas.
4. Eventos de conversión configurados antes de generar tráfico.
5. Perfil de Empresa en Google consistente con el sitio.
6. Mapa de palabras clave con una intención por URL.
7. Hub de servicios y páginas por servicio publicadas.
8. Preguntas frecuentes reales respondidas por escrito.
9. Contenido de apoyo enlazado hacia páginas comerciales.
10. Revisión mensual de Search Console con ajustes de title y contenido.

## Preguntas frecuentes

### ¿Se puede ver impacto antes de 90 días?

Sí, sobre todo en cobertura, impresiones y búsquedas de cola larga. El impacto fuerte en posiciones competidas y en volumen de leads depende de la competencia del rubro y del punto de partida del sitio.

### ¿Qué pesa más, la parte técnica o el contenido?

Las dos, en ese orden. Sin base técnica el contenido no se indexa bien; sin contenido no cubres la intención de búsqueda real. Por eso el plan parte por lo técnico y no al revés.

### ¿Sirve el SEO si mi empresa vende a otras empresas?

Sí, y suele rendir mejor que en B2C porque el volumen de búsqueda es bajo pero muy calificado. Diez visitas al mes a una página de servicio bien hecha pueden valer más que mil visitas a un artículo genérico.

### ¿Necesito rehacer el sitio para hacer SEO?

No siempre. Si la base técnica es razonable, conviene trabajar sobre lo existente. Si el sitio no permite crear páginas por servicio, controlar metadatos o cargar rápido, ahí sí el rediseño es parte del trabajo.

## Sigue aprendiendo

- Cómo trabajamos el posicionamiento en [SEO para empresas en Chile](/servicios/seo-para-empresas-chile).
- El [checklist SEO para pymes chilenas](/recursos/checklist-seo-pymes-chile), para revisar tu sitio punto por punto.
- Qué estructura necesita un sitio de empresa en [páginas web para empresas](/paginas-web-para-empresas).$md$,
  'SEO y posicionamiento',
  '{"seo","empresas","chile","plan 90 días","search console"}',
  9,
  'Eduardo Ávila',
  'published',
  'SEO para empresas Chile: plan de 90 días',
  'Plan de SEO de 90 días para empresas chilenas: base técnica el primer mes, páginas comerciales el segundo y contenido con datos el tercero, paso a paso.',
  '2026-04-18T12:00:00-04:00'::timestamptz,
  now(),
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- 2) BLOG · Qué debe incluir un sistema de gestión interno para pymes
-- slug: que-debe-incluir-sistema-gestion-interno-pymes
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'que-debe-incluir-sistema-gestion-interno-pymes',
  'Qué debe incluir un sistema de gestión interno para pymes',
  'Los módulos que sí necesita un sistema interno de pyme chilena: usuarios y permisos, registros con estados, filtros, documentos y reportes. Con criterios para definir la primera etapa y precios de referencia.',
  $md$Un sistema de gestión interno para una pyme debe incluir cinco cosas como mínimo: acceso con usuarios y permisos por rol, formularios con validaciones que registren la información una sola vez, estados del proceso con responsable y fecha, búsqueda y filtros para encontrar cualquier registro en segundos, y reportes o exportaciones que respondan las preguntas que hoy se contestan a mano. Todo lo demás (documentos automáticos, notificaciones, integraciones, dashboards) se suma después, cuando el proceso base ya está funcionando. La clave no es cuántos módulos tiene, sino que la primera etapa resuelva el proceso que hoy genera más errores o más trabajo administrativo.

## El problema real: la información vive en tres lugares a la vez

La mayoría de las pymes chilenas no gestiona mal por falta de ganas, sino porque la operación creció más rápido que sus herramientas. El pedido llega por WhatsApp, se anota en una planilla, se confirma por correo y se factura desde otro sistema. Cada traspaso manual es una oportunidad de error.

Las señales de que el problema ya es estructural son bastante reconocibles:

- Nadie sabe cuál es la versión correcta de la planilla.
- Cuando una persona sale de vacaciones, hay procesos que se detienen.
- Responder "¿en qué va lo mío?" toma quince minutos de revisar mensajes.
- Los informes mensuales se arman copiando y pegando.
- Un dato mal digitado se descubre semanas después, cuando ya generó un problema con el cliente.

Un sistema interno no es un lujo tecnológico: es la forma de que esa información deje de depender de la memoria de una persona.

## Los cinco módulos que no pueden faltar

### 1. Usuarios, roles y permisos

Es lo primero, no lo último. Cada persona entra con su cuenta y ve solo lo que le corresponde. Esto resuelve tres cosas de una vez: se acaba la contraseña compartida, queda registrado quién hizo cada cambio, y se puede dar acceso a un externo (contador, proveedor, vendedor) sin abrirle toda la operación.

Perfiles típicos en una pyme: administrador, operaciones, ventas y consulta. Con esos cuatro alcanza para partir.

### 2. Registros con formularios validados

El corazón del sistema. La información se ingresa una vez, en un formulario que obliga a completar los campos críticos y valida formatos (RUT, correo, teléfono, montos). Esto elimina el problema clásico de las planillas: el mismo cliente escrito de cinco maneras distintas.

Un detalle que marca diferencia: el formulario debe reflejar cómo trabaja realmente el equipo. Si el sistema pide datos que en terreno nadie tiene a mano, la gente lo llena con cualquier cosa y el registro pierde valor.

### 3. Estados del proceso, con responsable y fecha

Aquí está la mayor ganancia operativa. Cada registro (pedido, solicitud, orden de trabajo, cotización, ticket) avanza por estados definidos: recibido, en revisión, aprobado, en ejecución, cerrado. Cada cambio queda con quién lo hizo y cuándo.

Con eso desaparecen las tres preguntas que más tiempo consumen en una pyme: en qué va, quién lo tiene y desde cuándo está detenido.

### 4. Búsqueda y filtros

Un sistema donde encontrar algo cuesta es un sistema que la gente abandona. Filtros por fecha, cliente, estado, responsable y categoría, más un buscador que funcione con texto parcial. Suena obvio, y es justamente lo que más se descuida cuando el desarrollo se enfoca solo en cargar datos.

### 5. Reportes y exportaciones

No hace falta un dashboard con gráficos animados. Hace falta responder las preguntas que hoy se contestan a mano: cuánto se vendió este mes por línea, qué está atrasado, qué cliente concentra más solicitudes, qué proceso se demora más. Y una exportación a Excel, porque el contador y el equipo comercial la van a pedir igual.

## Lo que se suma después (y no antes)

Cuando los cinco módulos base funcionan y el equipo los usa a diario, estas capas multiplican el valor:

- **Generación de documentos**: cotizaciones, órdenes de trabajo o certificados en PDF con los datos ya cargados. Elimina el trabajo de rellenar plantillas a mano.
- **Notificaciones automáticas**: aviso por correo o WhatsApp cuando algo cambia de estado o lleva demasiado tiempo detenido.
- **Portal para el cliente**: que el propio cliente revise el estado de su caso reduce llamadas y mejora la percepción de servicio.
- **Integraciones**: facturación, pasarelas de pago, correo, planillas existentes.
- **Dashboards con indicadores**: útiles cuando ya hay meses de datos confiables. Antes de eso, muestran ruido.

Un dashboard sobre datos mal cargados no es información: es un problema con mejor diseño.

## Cómo elegir la primera etapa

La pregunta correcta no es "qué módulos quiero", sino "qué proceso me está costando más caro hoy". Tres criterios prácticos para decidir:

1. **Dónde se pierde más tiempo administrativo.** Si alguien dedica dos horas diarias a copiar información de un lado a otro, ese proceso se paga solo.
2. **Dónde duelen más los errores.** Un despacho equivocado, una cotización con precio mal calculado o un vencimiento que se pasó tienen costo directo y costo de reputación.
3. **Qué proceso está frenando el crecimiento.** A veces la empresa no puede tomar más clientes simplemente porque la coordinación manual no da abasto.

Un buen alcance de primera etapa se lanza en semanas, no en un año, y resuelve un proceso completo de punta a punta. Es mucho mejor tener un módulo de pedidos funcionando perfecto que seis módulos a medias que nadie usa.

## Cuánto cuesta y cómo se cotiza

Los valores de referencia dependen del alcance, y por eso siempre se expresan "desde":

- **Mini panel administrativo**: desde $349.990 + IVA. Sirve cuando necesitas administrar un conjunto acotado de registros (productos, solicitudes, clientes) sin flujos complejos.
- **Panel administrativo completo**: desde $990.000 + IVA, como servicio adicional sobre un sitio existente.
- **Sistema web administrativo**: desde $1.290.000 + IVA. Es el punto de partida de un sistema propio con usuarios, estados, reportes y documentos.
- **Sistema avanzado a medida**: desde $2.490.000 + IVA, para proyectos con múltiples módulos, roles e integraciones.
- **Complementos frecuentes**: dashboard y reportes desde $399.990 + IVA, generador de PDF desde $249.990 + IVA, integración de API personalizada desde $349.990 + IVA.

El detalle actualizado está en [la página de planes](/planes), y si quieres un valor referencial para tu caso, el [cotizador](/cotizador) lo entrega en minutos. Lo importante al comparar propuestas es que el alcance esté escrito: módulos incluidos, cantidad de usuarios, qué queda fuera y qué pasa con el soporte después de la entrega.

## Errores frecuentes al encargar un sistema interno

- **Pedir todo de una vez.** Los proyectos monolíticos demoran más, cuestan más y llegan con funciones que nadie ocupa.
- **Digitalizar el desorden.** Si el proceso actual está mal definido, el sistema lo automatiza igual de mal. Primero se ordena el flujo en papel, después se programa.
- **No involucrar a quien lo va a usar.** El sistema lo diseña quien conoce la operación diaria, no solo la gerencia.
- **Olvidar la capacitación y el soporte.** Un sistema sin acompañamiento en las primeras semanas termina abandonado y todos vuelven a la planilla.
- **No planificar la migración de datos.** Los registros históricos importan; definir qué se migra y qué se archiva es parte del proyecto.

## Preguntas frecuentes

### ¿Conviene hacer un sistema completo desde el inicio?

Normalmente no. Es mejor partir con una primera versión viable del proceso más crítico, medir el uso real durante algunas semanas y escalar con esa información. Sale más barato y el resultado se ajusta mejor a la operación.

### ¿Un sistema interno necesita SEO?

No, si es privado y está detrás de un login. El SEO aplica a las páginas públicas orientadas a captar visitas desde buscadores, no a las herramientas internas.

### ¿Reemplaza a Excel?

Reemplaza las planillas críticas, esas donde el desorden tiene costo. Para análisis puntual, Excel sigue siendo útil, y por eso el sistema debe permitir exportar. La comparación completa está en [panel administrativo vs Excel](/blog/panel-administrativo-vs-excel-salto-digital).

### ¿Necesito servidor propio?

No necesariamente. La infraestructura se define según seguridad, presupuesto y escalabilidad del proyecto. La mayoría de las pymes trabaja bien con infraestructura en la nube, sin comprar ni administrar servidores.

## Sigue aprendiendo

- Cómo desarrollamos estas herramientas en [sistemas web](/sistemas-web).
- Qué es y cuándo conviene [un sistema web a medida](/blog/que-es-sistema-web-a-medida).
- Si además necesitas ordenar la presencia comercial, revisa [desarrollo web](/desarrollo-web).$md$,
  'Sistemas y automatización',
  '{"sistema de gestión","pymes","panel administrativo","software a medida","chile"}',
  9,
  'Eduardo Ávila',
  'published',
  'Sistema de gestión pyme: qué debe incluir',
  'Los módulos que sí necesita un sistema interno de pyme: usuarios y permisos, estados, filtros, reportes y documentos, con precios de referencia.',
  '2026-06-02T12:00:00-04:00'::timestamptz,
  now(),
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- 3) BLOG · Soporte TI para pymes en Santiago
-- slug: soporte-ti-pymes-santiago-que-buscar-evitar
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'soporte-ti-pymes-santiago-que-buscar-evitar',
  'Soporte TI para pymes en Santiago: qué buscar y qué evitar',
  'Cómo elegir soporte TI para una pyme en Santiago: qué debe incluir el servicio, qué preguntar antes de firmar, señales de alerta y cuándo conviene pasar de la atención puntual a un esquema mensual.',
  $md$Un buen soporte TI para una pyme en Santiago se reconoce por cuatro cosas: diagnostica antes de prometer una solución, tiene tiempos de respuesta y alcance por escrito, deja registro de lo que hizo y propone mejoras preventivas proporcionales al tamaño del negocio. Lo que conviene evitar es lo contrario: el técnico que solo aparece cuando algo se cayó, cobra por hora sin explicar qué hizo y deja la operación dependiendo de su memoria. En Zyteron el soporte TI parte desde $49.990 + IVA por requerimiento puntual, y desde $39.990 + IVA al mes cuando la necesidad es recurrente. Esta guía explica qué revisar antes de contratar y cómo saber si el esquema que tienes hoy te está costando más de lo que crees.

## El patrón que hay que romper: soporte solo cuando algo falla

La secuencia se repite en muchas pymes de Santiago. El correo deja de recibir mensajes, un computador no arranca, la web se cae un viernes por la tarde o alguien perdió el acceso a una herramienta clave. Se busca un técnico de urgencia, se paga lo que sea, se resuelve el síntoma y todos siguen.

El problema es que ese modelo tiene tres costos escondidos:

- **El costo de la caída.** Las horas en que el equipo no puede facturar, cotizar o despachar valen bastante más que la visita del técnico.
- **El costo de la recurrencia.** Si nadie corrige la causa, el mismo incidente vuelve. Cambiar la contraseña no arregla un correo que se está usando mal.
- **El costo de la dependencia.** Cuando no hay documentación, la empresa queda amarrada a la persona que hizo el último arreglo.

Un soporte serio corta esa secuencia: resuelve el incidente y además deja el terreno preparado para que no se repita.

## Qué debe incluir un servicio de soporte TI serio

### Diagnóstico antes de la propuesta

Desconfía de quien cotiza una solución sin haber revisado nada. Un diagnóstico razonable revisa el estado de los equipos, cómo están configurados los correos, quién tiene acceso a qué, si existen respaldos y si se pueden recuperar, y en qué estado está el sitio web y su hosting.

De ese diagnóstico debería salir una lista priorizada: qué es urgente, qué es importante y qué puede esperar. Si todo es urgente, no hay diagnóstico, hay venta.

### Alcance y tiempos por escrito

Es el punto que más conflictos evita. Debe quedar claro:

- Qué tipo de requerimientos entran en el servicio y cuáles se cotizan aparte.
- En cuánto tiempo se responde según la criticidad (no es lo mismo un correo caído que un mouse que falla).
- Si la atención es remota, presencial o mixta, y en qué horario.
- Cuántas horas o requerimientos incluye el plan mensual, si aplica.

### Registro de lo que se hizo

Cada requerimiento atendido debería quedar con fecha, descripción del problema, qué se hizo y qué se recomienda. Ese registro es lo que permite detectar patrones: si el mismo equipo falla tres veces en dos meses, el problema no es el equipo, es otra cosa.

También es lo que protege a la empresa. Si mañana cambias de proveedor, ese historial es tuyo.

### Recomendaciones preventivas proporcionales

Una pyme de doce personas no necesita la arquitectura de seguridad de un banco. Necesita lo básico bien hecho: contraseñas únicas con verificación en dos pasos, respaldos que alguien probó restaurar, accesos documentados, usuarios antiguos desactivados y actualizaciones al día. El checklist completo está en [seguridad digital para pymes chilenas](/blog/checklist-seguridad-digital-pymes-chilenas-2026).

Un proveedor que te ofrece soluciones enormes para problemas chicos no está cuidando tu presupuesto.

### Conexión con la web y los sistemas

En una pyme, la frontera entre "soporte" y "desarrollo" es difusa. El formulario del sitio que dejó de enviar correos, el certificado del dominio que venció, la integración de WhatsApp que dejó de responder: todo eso es soporte, pero requiere entender cómo está construido el sitio. Por eso conviene que el soporte TI converse con quien mantiene la web, o que sea el mismo equipo. La [mantención web](/servicios/mantencion-web-chile) y el soporte TI se complementan.

## Qué preguntar antes de firmar

Cinco preguntas que revelan mucho en pocos minutos:

1. **¿Cómo priorizan un incidente?** La respuesta debe hablar de impacto en la operación, no de orden de llegada.
2. **¿Qué pasa si el problema excede el alcance del plan?** Debe existir un procedimiento claro, no una sorpresa en la factura.
3. **¿Dónde queda registrado lo que hacen?** Si la respuesta es "en WhatsApp", no hay trazabilidad.
4. **¿Quién queda como titular de los accesos?** Dominio, hosting, correos y licencias deben estar a nombre de tu empresa. Siempre.
5. **¿Qué recomiendan mejorar en los próximos tres meses?** Un buen proveedor tiene una respuesta concreta después del diagnóstico.

## Señales de alerta

- **Precio por hora sin detalle de lo realizado.** Es la puerta de entrada a facturas incomprensibles.
- **Accesos a nombre del proveedor.** El caso más doloroso es la pyme que no puede recuperar su propio dominio porque quedó registrado a nombre de un tercero.
- **Cero documentación.** Si toda la información del sistema vive en la cabeza del técnico, tu continuidad operativa depende de que esa persona conteste el teléfono.
- **Soluciones que dependen de una herramienta que solo ellos manejan.** Genera dependencia innecesaria.
- **Promesas de disponibilidad total sin infraestructura que la respalde.** Nadie garantiza 100% de disponibilidad; lo serio es comprometer tiempos de respuesta.

## Cuándo conviene pasar de la atención puntual al esquema mensual

La atención por requerimiento funciona bien cuando los incidentes son esporádicos y la operación no depende críticamente de herramientas digitales. El esquema mensual empieza a convenir cuando se cumple alguna de estas condiciones:

- Hay más de dos o tres requerimientos al mes de forma sostenida.
- La operación se detiene si falla el correo, la web o un sistema interno.
- Existe un equipo con rotación, y cada ingreso o salida implica gestionar accesos.
- Hay una tienda online o un sistema con clientes conectados, donde una caída tiene costo directo.

Los valores de referencia: soporte TI desde $49.990 + IVA por requerimiento puntual, mantención mensual desde $39.990 + IVA para sitios simples, desde $79.990 + IVA para mantención profesional, desde $129.990 + IVA en ecommerce y desde $199.990 + IVA en sistemas. El detalle está en [soporte TI](/soporte-ti) y en [la página de planes](/planes).

## Preguntas frecuentes

### ¿El soporte TI puede ser remoto?

En gran medida sí. Correos, configuración de herramientas, sitio web, formularios, accesos y la mayoría de los incidentes de software se resuelven de forma remota y más rápido que coordinando una visita. Lo presencial se reserva para hardware, redes y montajes.

### ¿Conviene soporte mensual desde el inicio?

Depende del volumen. Si recibes uno o dos requerimientos al año, la atención puntual basta. Si la operación ya depende de herramientas digitales para funcionar, el esquema mensual sale más barato que las urgencias.

### ¿Necesito un proveedor con oficina en Santiago?

Ayuda para lo presencial, pero la mayor parte del servicio es remota. Lo determinante es el tiempo de respuesta comprometido y la capacidad de resolver, no la distancia física.

### ¿Qué pasa con mis datos si cambio de proveedor?

Deben entregarse los accesos, la documentación y el historial de requerimientos. Por eso conviene dejarlo escrito antes de empezar, no al momento de terminar la relación.

## Sigue aprendiendo

- Cómo atendemos empresas de la Región Metropolitana en [soporte TI para pymes en Santiago](/soporte-ti-pymes-santiago).
- Por qué el [correo corporativo con dominio propio](/blog/correo-corporativo-dominio-propio-confianza) es parte de la continuidad, no un detalle estético.
- Qué incluye la [mantención web](/servicios/mantencion-web-chile) y en qué se diferencia del soporte.$md$,
  'Soporte y continuidad',
  '{"soporte ti","pymes","santiago","continuidad operativa","mantención"}',
  8,
  'Eduardo Ávila',
  'published',
  'Soporte TI pymes Santiago: qué buscar y evitar',
  'Guía para contratar soporte TI en Santiago: qué debe incluir, cinco preguntas antes de firmar, señales de alerta y cuándo pasar a plan mensual.',
  '2026-06-03T12:00:00-04:00'::timestamptz,
  now(),
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- 4) BLOG · Cómo vender online en Chile sin Shopify
-- slug: vender-online-chile-sin-shopify-alternativas-pymes
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'vender-online-chile-sin-shopify-alternativas-pymes',
  'Cómo vender online en Chile sin Shopify: alternativas para pymes',
  'Cuatro alternativas a Shopify para vender online en Chile: catálogo con pedido por WhatsApp, tienda a medida, WooCommerce y plataformas locales. Con costos, ventajas y limitaciones de cada una.',
  $md$Se puede vender online en Chile sin Shopify con cuatro alternativas concretas: un catálogo digital con pedido por WhatsApp (desde $299.990 + IVA), una tienda a medida integrada a tu sitio (desde $599.990 + IVA), WooCommerce sobre WordPress, o una plataforma local con pasarelas chilenas ya integradas. La decisión no se toma por moda ni por precio de lista: depende de cuántos productos manejas, si el stock es estable, si necesitas cobrar en línea y quién va a administrar la tienda todos los días. Muchas pymes chilenas pagan una plataforma completa antes de tener ordenados productos, fotos, precios y despacho, y terminan con una tienda cara que vende poco.

## Antes de elegir plataforma: ordena la operación

Ninguna herramienta arregla una operación desordenada. Antes de comparar alternativas, responde estas preguntas con números:

- **¿Cuántos productos vendes realmente?** Muchos negocios tienen doscientos productos en la lista y facturan el 80% con quince.
- **¿El stock es estable o cambia todas las semanas?** Si trabajas bajo pedido o con stock variable, un carrito con inventario en línea te va a generar más problemas que ventas.
- **¿Los precios son fijos o se cotizan?** El precio fijo apunta a tienda; la cotización caso a caso apunta a catálogo con contacto.
- **¿Cómo despachas hoy?** Si no tienes resuelto el envío y su costo, el carrito va a abandonar compras en el último paso.
- **¿Quién carga los productos y responde los pedidos?** Una tienda sin dueño operativo se desactualiza en dos meses.

Con eso claro, las alternativas se ordenan solas.

## Alternativa 1: catálogo digital con pedido por WhatsApp

Es la opción que mejor funciona en Chile para negocios que están partiendo o que tienen stock variable. El sitio muestra los productos con fotos, descripciones y condiciones, y cada ficha tiene un botón que abre WhatsApp con el nombre del producto ya escrito en el mensaje. Tú coordinas pago y entrega en la conversación.

**Conviene cuando**: vendes bajo pedido o personalizado, el stock cambia seguido, el ticket promedio es alto o la venta requiere asesoría (medidas, colores, plazos).

**Ventajas**: inversión menor, se lanza rápido, no exige mantener inventario en línea y conserva el trato directo, que en muchos rubros es lo que cierra la venta.

**Limitaciones**: la venta no se cierra sola, alguien tiene que responder. Si te llegan cincuenta pedidos al día, este modelo se satura.

**Precio de referencia**: desde $299.990 + IVA. Está desarrollado en detalle en [tienda online sin inventario](/blog/tienda-online-sin-inventario-catalogo-whatsapp).

## Alternativa 2: tienda a medida integrada a tu sitio

Una tienda desarrollada dentro de tu propio sitio, con catálogo, carrito, pagos chilenos y panel de administración de productos y pedidos.

**Conviene cuando**: los precios son estables, el volumen justifica automatizar el cobro, y necesitas que la tienda se vea y funcione como tu marca, no como una plantilla.

**Ventajas**: control total del diseño y de la estructura de URLs (lo que importa para SEO), sin mensualidad de plataforma, e integración directa con el resto del sitio y con sistemas internos.

**Limitaciones**: mayor inversión inicial y dependencia de un equipo que la mantenga. No es la opción para validar una idea.

**Precio de referencia**: desde $599.990 + IVA con carrito y pagos integrados. Los complementos más pedidos son gestión de stock desde $249.990 + IVA e integración de pagos (Flow, Webpay, Mercado Pago) desde $149.990 + IVA. Todo el detalle está en [tiendas online](/tiendas-online).

## Alternativa 3: WooCommerce sobre WordPress

La opción de código abierto más usada del mundo. Se instala sobre WordPress, no cobra comisión por venta y tiene plugins para casi todo, incluidas las pasarelas chilenas.

**Conviene cuando**: ya tienes un sitio en WordPress funcionando bien, alguien del equipo se maneja con la plataforma y quieres evitar mensualidades de software.

**Ventajas**: costo de licencia cero, enorme ecosistema de extensiones, y el catálogo es exportable si algún día migras.

**Limitaciones**: la mantención es responsabilidad tuya. Actualizaciones, seguridad, respaldos y compatibilidad entre plugins son trabajo real y constante. Una tienda WooCommerce sin mantención es un riesgo de seguridad, no un ahorro. Comparamos ambos enfoques en [WordPress vs web a medida](/recursos/wordpress-vs-web-a-medida-chile).

## Alternativa 4: plataformas SaaS con foco local

Existen plataformas de comercio electrónico orientadas al mercado latinoamericano que llegan con las pasarelas chilenas y las opciones de despacho ya integradas.

**Conviene cuando**: quieres lanzar rápido, con soporte en español y sin equipo técnico propio.

**Ventajas**: puesta en marcha veloz, funciones prearmadas y soporte incluido.

**Limitaciones**: personalización acotada, costo mensual permanente y menor control sobre la estructura técnica del sitio, lo que puede limitar el SEO. Antes de contratar, revisa siempre dos cosas: si puedes controlar títulos, direcciones y metadatos de cada página, y si puedes exportar tu catálogo y tus clientes el día que quieras irte.

## Comparativa rápida

- **Catálogo + WhatsApp** — Inversión: la más baja. Cierre de venta: asistido. Ideal para: stock variable, productos personalizados, validar demanda. Riesgo: depende de que alguien responda.
- **Tienda a medida** — Inversión: media a alta. Cierre de venta: automático. Ideal para: marcas con volumen y precios estables. Riesgo: requiere equipo que la mantenga.
- **WooCommerce** — Inversión: media. Cierre de venta: automático. Ideal para: quienes ya usan WordPress. Riesgo: mantención y seguridad quedan de tu lado.
- **SaaS local** — Inversión: baja inicial, mensual permanente. Cierre de venta: automático. Ideal para: lanzar rápido sin equipo técnico. Riesgo: menor control y costo acumulado en el tiempo.

## Los costos que hay que sumar en todos los casos

Cualquiera sea la alternativa, el presupuesto real de vender online incluye:

- **Comisión de la pasarela de pagos.** Webpay, Flow y Mercado Pago cobran un porcentaje por transacción. No es costo del sitio, es costo de la venta.
- **Despacho.** Definir tarifas, zonas y plazos antes de lanzar. Un costo de envío que aparece recién al final del carrito es la principal causa de compras abandonadas.
- **Fotos y descripciones.** Es el trabajo que más se subestima y el que más influye en la conversión. Fotos consistentes, mismo fondo, mismo encuadre.
- **Documento tributario.** Emitir boleta o factura por las ventas online es obligación, no opción. Conviene resolverlo desde el primer pedido.
- **Mantención.** Desde $129.990 + IVA al mes en ecommerce, para actualizaciones, respaldos y seguridad.

## Cómo partir sin sobreinvertir

La secuencia que mejor resultado da en pymes chilenas es incremental:

1. Ordena categorías, nombres, precios y condiciones de despacho en una planilla.
2. Publica un catálogo con pedido por WhatsApp y mide durante uno o dos meses: cuántas consultas llegan, qué productos se piden, qué preguntan siempre.
3. Con esos datos, decide si el carrito y el pago en línea se justifican.
4. Suma stock, cupones y automatizaciones solo cuando el volumen los haga necesarios.

Cada etapa se financia con la anterior y ninguna obliga a botar lo ya invertido.

## Preguntas frecuentes

### ¿Puedo partir sin pago online?

Sí, y es lo más común en Chile. Muchas pymes parten con catálogo y WhatsApp, coordinan transferencia o pago contra entrega, y suman la pasarela cuando el volumen de pedidos lo justifica.

### ¿Una tienda a medida es más cara que Shopify?

Tiene mayor inversión inicial y no tiene mensualidad de plataforma. En un horizonte de dos o tres años la comparación suele acercarse bastante, y a cambio obtienes control total sobre diseño, estructura y datos.

### ¿Se puede migrar después?

Sí, siempre que conserves el control de tu dominio y puedas exportar productos y clientes. Al migrar, lo crítico es mantener las direcciones o redirigir con 301 las que cambien, para no perder el posicionamiento ganado.

### ¿Qué pasa con el SEO de mi tienda?

Cada producto y categoría debe tener contenido propio: título, descripción y fotos. Una tienda con fichas copiadas del proveedor casi no posiciona, sea cual sea la plataforma.

## Sigue aprendiendo

- Compara alternativas y precios en [tiendas online](/tiendas-online).
- Cómo funciona el modelo de [catálogo con venta por WhatsApp](/blog/tienda-online-sin-inventario-catalogo-whatsapp).
- Si aún no sabes qué necesitas, revisa [página web, tienda online o sistema web](/blog/diferencia-pagina-web-tienda-online-sistema-web).
- Estima tu proyecto en el [cotizador](/cotizador).$md$,
  'Ecommerce',
  '{"ecommerce","tienda online","pymes","shopify","chile"}',
  9,
  'Eduardo Ávila',
  'published',
  'Vender online en Chile sin Shopify: alternativas',
  'Cuatro alternativas a Shopify en Chile: catálogo por WhatsApp, tienda a medida, WooCommerce y SaaS local, con costos, ventajas y limitaciones.',
  '2026-05-30T12:00:00-04:00'::timestamptz,
  now(),
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- 5) BLOG · Panel administrativo vs Excel
-- slug: panel-administrativo-vs-excel-salto-digital
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'panel-administrativo-vs-excel-salto-digital',
  'Panel administrativo vs Excel: cuándo dar el salto digital',
  'Excel deja de alcanzar cuando aparecen versiones contradictorias, falta historial y los reportes se arman a mano. Siete señales concretas, comparación honesta y cómo calcular si el salto se paga.',
  $md$Excel deja de alcanzar cuando aparecen versiones contradictorias del mismo archivo, cuando nadie puede decir quién modificó un dato ni cuándo, cuando los permisos son todo o nada, y cuando los reportes se arman copiando y pegando cada mes. Un panel administrativo resuelve exactamente esas cuatro cosas: centraliza el dato, registra la historia, asigna permisos por rol y genera reportes solos. El salto conviene cuando el costo del desorden (horas perdidas, errores, decisiones con información vieja) supera el costo de construir una primera versión acotada, que parte desde $349.990 + IVA en un mini panel y desde $1.290.000 + IVA en un sistema completo.

## Excel es mejor de lo que dicen (y ese es el problema)

Conviene partir reconociéndolo: Excel y Google Sheets son herramientas extraordinarias. Son baratas, todo el mundo las sabe usar, se adaptan a cualquier necesidad en minutos y no requieren pedirle nada a nadie. Muchísimas pymes chilenas operan años con planillas y les funciona bien.

Justamente por eso el problema aparece tarde y de golpe. La planilla que en su momento fue la solución se convierte, sin que nadie lo note, en el punto único de falla del negocio. No hay un día en que Excel "deje de servir": hay un momento en que el costo de mantenerlo ordenado se vuelve mayor que el de reemplazarlo.

## Siete señales de que ya te quedó chico

1. **Existen versiones contradictorias.** "Pedidos_final_v3_ESTE.xlsx" es una señal, no un nombre de archivo.
2. **Nadie sabe quién modificó un dato.** Un precio cambió, un stock no cuadra, y no hay forma de reconstruir qué pasó.
3. **Los permisos son todo o nada.** Para que alguien consulte un dato, hay que darle acceso a toda la información de la empresa, incluidos sueldos o márgenes.
4. **Los reportes se arman a mano.** Si el cierre mensual toma un día completo de copiar, pegar y cuadrar, ese día se está pagando todos los meses.
5. **La información vive repartida.** Una parte en la planilla, otra en correos, otra en un grupo de WhatsApp y otra en la cabeza de una persona.
6. **La planilla se rompe sola.** Fórmulas que se arrastran mal, filas ocultas, archivos que demoran en abrir.
7. **Hay una persona insustituible.** Si alguien se va de vacaciones y un proceso se detiene, la dependencia ya es un riesgo operativo.

Con dos o tres de estas señales todavía se puede ordenar la planilla. Con cinco o más, ordenar es postergar.

## Qué hace distinto un panel administrativo

- **Un solo lugar para el dato.** Todos ven la misma información al mismo tiempo, sin archivos duplicados ni copias por correo.
- **Historial de cambios.** Cada modificación queda con autor y fecha. Esto no es para vigilar a nadie: es para poder reconstruir qué pasó cuando algo sale mal.
- **Permisos por rol.** Ventas ve sus clientes, operaciones ve las órdenes, la gerencia ve todo y el contador ve solo lo que necesita.
- **Validaciones en el ingreso.** El sistema no acepta un RUT mal formado ni un campo obligatorio vacío. Esto evita el 90% de los errores que después cuesta días detectar.
- **Estados y responsables.** Cada registro sabe en qué etapa está y quién lo tiene. Se acaba la pregunta "¿en qué va esto?".
- **Reportes automáticos.** Las preguntas frecuentes del negocio se responden con un filtro, no con una tarde de trabajo.
- **Acceso desde cualquier parte.** Desde el celular, en terreno, sin mandar el archivo por correo.

## Comparación honesta, punto por punto

- **Costo inicial** — Excel: prácticamente cero. Panel: inversión de proyecto, desde $349.990 + IVA en versiones acotadas.
- **Tiempo de puesta en marcha** — Excel: inmediato. Panel: semanas, según alcance.
- **Flexibilidad para cambiar algo** — Excel: total e instantánea. Panel: requiere ajuste del desarrollo.
- **Permisos** — Excel: limitados, en la práctica todo o nada. Panel: por rol y por sección.
- **Historial y trazabilidad** — Excel: difícil de sostener. Panel: registrado por diseño.
- **Trabajo simultáneo** — Excel: conflictivo, con copias y versiones. Panel: natural, varios usuarios a la vez.
- **Reportes** — Excel: manuales o con tablas dinámicas que alguien debe mantener. Panel: automáticos y siempre al día.
- **Riesgo de error humano** — Excel: alto, porque nada valida lo que se escribe. Panel: bajo, con validaciones en el ingreso.
- **Escalabilidad** — Excel: se degrada con el volumen. Panel: crece con módulos.

La conclusión no es que Excel sea malo, sino que resuelve un problema distinto. Excel es excelente para análisis puntual, simulaciones y trabajo exploratorio. Es frágil como sistema operativo de un negocio con varias personas.

## Cómo calcular si el salto se paga

No hace falta un estudio, basta una estimación honesta en tres pasos:

1. **Cuenta las horas mensuales que hoy se pierden** en tareas que el panel elimina: consolidar planillas, buscar información, armar reportes, corregir errores, responder "¿en qué va lo mío?".
2. **Multiplícalas por el costo por hora** de las personas que las hacen.
3. **Súmale el costo de los errores** que ya ocurrieron este año: un despacho equivocado, una cotización mal calculada, un vencimiento que se pasó, un cliente perdido por demora.

Si el resultado anual se acerca o supera la inversión de una primera etapa, el salto se justifica. Y hay un beneficio que no aparece en el cálculo pero es real: tomar decisiones con información al día en vez de con la planilla de la semana pasada.

## El error más caro: replicar la planilla tal cual

La tentación es pedirle al desarrollador que haga "lo mismo que la planilla, pero en sistema". Es un error, porque la planilla ya arrastra los vicios de haber crecido sin diseño: columnas que nadie usa, campos que significan tres cosas distintas según quién los llene, procesos que existen solo porque Excel no permitía otra cosa.

Antes de programar conviene tomarse una semana para escribir el flujo real: qué información entra, quién la ingresa, por qué estados pasa, quién decide qué en cada punto y qué se necesita saber al final. Ese ejercicio suele revelar que la mitad de las columnas de la planilla sobra.

## Cómo dar el salto por etapas

- **Etapa 1**: el proceso que más duele. Un módulo completo, funcionando de punta a punta, con las personas que lo usan a diario capacitadas.
- **Etapa 2**: los reportes que hoy se arman a mano, ahora automáticos.
- **Etapa 3**: documentos automáticos (cotizaciones, órdenes, certificados en PDF) y notificaciones.
- **Etapa 4**: integraciones con lo que ya usas, incluida la exportación a Excel para lo que siga necesitándola.

Sí: un buen panel administrativo mantiene la exportación a Excel. No se trata de eliminar la planilla, sino de que deje de ser la fuente de la verdad.

Los valores de referencia: mini panel administrativo desde $349.990 + IVA, panel administrativo completo desde $990.000 + IVA, sistema web administrativo desde $1.290.000 + IVA y dashboard con reportes desde $399.990 + IVA. El detalle actualizado está en [planes](/planes) y puedes estimar tu caso en el [cotizador](/cotizador).

## Preguntas frecuentes

### ¿Un panel elimina Excel?

No, y no debería. Elimina las planillas críticas, esas de las que depende la operación. Para análisis puntual Excel sigue siendo la mejor herramienta, por eso el panel debe permitir exportar sin fricción.

### ¿Cuál es el primer módulo recomendado?

El que concentre más tiempo manual, más errores o más impacto en el cliente. Casi siempre es el registro central del negocio: pedidos, órdenes de trabajo, solicitudes o clientes.

### ¿Qué pasa con los datos que ya tengo en la planilla?

Se migran. Conviene decidir antes qué se migra completo, qué se migra resumido y qué se archiva. La migración es parte del proyecto y hay que presupuestarla.

### ¿Y si el equipo se resiste al cambio?

Es lo más común y se resuelve con dos cosas: que quienes usan el proceso participen en el diseño, y que la primera versión les ahorre trabajo desde la primera semana. Si el sistema les agrega pasos sin quitarles ninguno, volverán a la planilla.

## Sigue aprendiendo

- Qué módulos necesita un [sistema de gestión interno para pymes](/blog/que-debe-incluir-sistema-gestion-interno-pymes).
- Qué es y cuándo conviene [un sistema web a medida](/blog/que-es-sistema-web-a-medida).
- Cómo desarrollamos estas herramientas en [sistemas web](/sistemas-web).$md$,
  'Sistemas y automatización',
  '{"panel administrativo","excel","pymes","trazabilidad","software a medida"}',
  9,
  'Eduardo Ávila',
  'published',
  'Panel administrativo vs Excel: cuándo cambiar',
  'Siete señales de que Excel ya te quedó chico, comparación honesta con un panel administrativo y cómo calcular si el salto digital se paga solo.',
  '2026-05-31T12:00:00-04:00'::timestamptz,
  now(),
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- 6) BLOG · Landing page vs sitio web completo
-- slug: landing-page-vs-sitio-web-completo-negocio
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'landing-page-vs-sitio-web-completo-negocio',
  'Landing page vs sitio web completo: cuál necesita tu negocio',
  'Una landing convierte tráfico pagado en contactos; un sitio completo construye posicionamiento y confianza en el tiempo. Cinco preguntas para decidir, precios de referencia y errores frecuentes.',
  $md$La regla práctica es simple: necesitas una **landing page** si vas a invertir en publicidad para un servicio puntual y quieres convertir ese tráfico en contactos; necesitas un **sitio web completo** si quieres que Google te traiga clientes de forma constante para varios servicios y construir confianza comercial en el tiempo. Una landing es una página única, sin distracciones, enfocada en una sola acción. Un sitio completo es una estructura de varias páginas donde cada una responde una búsqueda distinta. No compiten entre sí: muchas empresas tienen sitio completo y además landings específicas para sus campañas. Lo que sí conviene evitar es pagar un sitio de diez páginas cuando lo que necesitas es una campaña de dos meses, o intentar posicionar cinco servicios distintos desde una sola página.

## Qué es realmente una landing page

Una landing page es una página construida para una campaña y una acción. Alguien hace clic en un anuncio, llega, entiende la oferta en cinco segundos y deja sus datos o escribe por WhatsApp. Nada más.

Sus características definitorias:

- **Una sola acción.** Si compite con cinco botones distintos, la conversión cae.
- **Menú reducido o inexistente.** Cada enlace hacia otra parte es una salida.
- **Mensaje alineado con el anuncio.** Si el aviso ofrece "instalación de aire acondicionado en 48 horas", eso debe estar en el titular de la landing. La incoherencia entre anuncio y página es la principal causa de campañas caras.
- **Estructura pensada para decidir**: propuesta de valor, beneficios concretos, objeciones respondidas, señales de confianza reales y formulario simple.
- **Medición obligatoria.** Sin eventos de conversión configurados, la inversión publicitaria se optimiza a ciegas.

**Cuándo es la respuesta correcta**: campañas en Google Ads o redes, lanzamiento de un servicio nuevo, promoción de temporada, evento con fecha límite, o validar demanda antes de invertir en un sitio grande.

## Qué es un sitio web completo

Un sitio completo es una estructura: inicio, una página por servicio, quiénes somos, preguntas frecuentes, blog o recursos y contacto. Cada página responde una búsqueda distinta y todas se enlazan entre sí.

Sus características definitorias:

- **Varias intenciones cubiertas.** Una URL por servicio permite competir en varias búsquedas a la vez.
- **Crecimiento acumulativo.** El contenido publicado hace un año sigue trayendo visitas hoy. La publicidad, en cambio, deja de traer tráfico el día que dejas de pagar.
- **Confianza comercial.** Los clientes grandes, las licitaciones y los proveedores revisan tu sitio antes de responderte. Una landing suelta no da esa señal.
- **Base para escalar.** Sobre un sitio bien hecho se suma después un catálogo, una tienda o un sistema.

**Cuándo es la respuesta correcta**: tienes más de un servicio, quieres depender menos de la publicidad pagada, vendes a empresas que investigan antes de contactar, o tu sitio será un activo comercial de largo plazo.

## Comparación punto por punto

- **Objetivo** — Landing: una conversión puntual. Sitio completo: presencia, posicionamiento y crecimiento.
- **Cantidad de páginas** — Landing: una. Sitio completo: varias, una por intención de búsqueda.
- **Fuente de tráfico** — Landing: principalmente publicidad pagada. Sitio completo: búsqueda orgánica, marca, referidos y también campañas.
- **Horizonte de resultados** — Landing: inmediato mientras dure la inversión. Sitio completo: creciente en el tiempo, con maduración de meses.
- **SEO** — Landing: una intención, cobertura muy acotada. Sitio completo: varias URLs compitiendo en paralelo.
- **Inversión** — Landing: menor. Sitio completo: mayor, proporcional al alcance.
- **Qué pasa si dejas de pagar publicidad** — Landing: el tráfico se detiene. Sitio completo: el tráfico orgánico continúa.
- **Escalabilidad** — Landing: se replica por campaña. Sitio completo: crece con servicios, casos y contenidos.

## Cinco preguntas para decidir en diez minutos

1. **¿Tienes uno o varios servicios que vender?** Uno solo y muy definido admite landing. Tres o más piden sitio completo, porque cada servicio necesita su propia página para posicionar.
2. **¿De dónde va a venir el tráfico?** Si vas a pagar por anuncios, la landing rinde más por peso invertido. Si esperas que Google te traiga gente sin pagar, necesitas estructura.
3. **¿Tu cliente compara antes de contactar?** En B2B y en servicios de ticket alto, la respuesta casi siempre es sí, y una página sola no alcanza para responder todas sus dudas.
4. **¿Necesitas mostrar respaldo institucional?** Licitaciones, clientes corporativos y alianzas revisan quiénes somos, casos, políticas y datos de la empresa.
5. **¿Esto es una prueba o un activo permanente?** Una campaña de temporada justifica una landing. Un canal comercial estable justifica un sitio.

Si respondiste "sitio completo" en tres o más preguntas, ya tienes la decisión tomada.

## Precios de referencia

Los valores dependen del alcance y se expresan "desde":

- **Web Básica**: $79.990 + IVA, pago único. Una página profesional con tu oferta, contacto y WhatsApp. Es el punto de entrada más cercano a una landing.
- **Plan Emprendedor**: desde $129.990 + IVA. Sitio de varias secciones para partir con presencia seria.
- **Plan Pyme**: desde $219.990 + IVA. Sitio corporativo con páginas de servicios, formulario y SEO local básico.
- **Plan Empresa**: desde $399.990 + IVA. Sitio corporativo completo, con más páginas, más contenido y estructura SEO más profunda.
- **Página adicional**: desde $59.990 + IVA, cuando quieres crecer sobre un sitio existente.

El detalle actualizado está en [la página de planes](/planes) y puedes obtener un valor referencial para tu caso en el [cotizador](/cotizador). Cómo trabajamos las páginas de campaña está en [landing pages para empresas](/servicios/landing-pages-para-empresas).

## La combinación que mejor funciona

En la práctica, la mayoría de las empresas que crecen no elige: usa las dos cosas.

El sitio completo trabaja de base y capta la demanda que ya existe en Google, la que llega buscando tu servicio. Encima de esa base se lanzan landings específicas para cada campaña: una para el servicio que quieres empujar este trimestre, otra para una promoción de temporada, otra para un segmento particular.

La ventaja de tenerlas sobre el mismo dominio es doble: aprovechan la autoridad que ya construyó el sitio, y la persona que llega desde el anuncio puede, si quiere, revisar el resto de la empresa antes de decidir.

## Errores frecuentes

- **Intentar posicionar cinco servicios desde una landing.** Google necesita una página por intención. Amontonar todo en una sola diluye el mensaje y no posiciona ninguno.
- **Hacer un sitio de quince páginas cuando aún no validas la oferta.** Es más caro y más lento que probar con una landing y una campaña acotada.
- **Landing sin medición.** Sin eventos de conversión configurados, estás pagando anuncios sin saber cuáles funcionan.
- **Formulario largo.** Cada campo adicional reduce el porcentaje de personas que lo completa. Para calificar bastan nombre, teléfono, correo y una línea de contexto.
- **Landing con menú completo.** Cada enlace del menú es una puerta de salida antes de convertir.
- **No responder rápido.** La mejor landing del mundo no sirve si el contacto se responde tres días después.

## Preguntas frecuentes

### ¿Puedo partir con una landing y crecer después?

Sí, y es una ruta razonable, siempre que se construya sobre una base técnica preparada para escalar: dominio propio, estructura de URLs limpia y control de metadatos. Así el crecimiento suma páginas en vez de obligar a rehacer todo.

### ¿Una landing posiciona en Google?

Puede posicionar una intención muy concreta si el contenido es sólido, pero su fuerte es la conversión de tráfico pagado. Para cobertura orgánica amplia se necesitan varias URLs trabajando en paralelo.

### ¿Cuántos campos debería tener el formulario?

Los mínimos para calificar la oportunidad: nombre, teléfono o correo, empresa cuando corresponda y una línea sobre lo que necesita. Los datos que faltan se piden en la conversación.

### ¿Conviene tener menú completo en una landing?

En campañas de alto foco, no. Reducir distracciones y mantener una sola ruta de conversión suele rendir mejor.

## Sigue aprendiendo

- Cómo trabajamos las páginas de campaña en [landing pages para empresas](/servicios/landing-pages-para-empresas).
- Qué estructura necesita un sitio corporativo en [páginas web para empresas](/paginas-web-para-empresas).
- Cuánto cuesta cada alternativa en [precios de una página web en Chile](/blog/cuanto-cuesta-pagina-web-empresa-chile).
- Cómo trabajamos cada tipo de proyecto en [desarrollo web](/desarrollo-web).$md$,
  'Guías de decisión',
  '{"landing page","sitio web","comparativa","campañas","conversión"}',
  9,
  'Eduardo Ávila',
  'published',
  'Landing page vs sitio web completo: cuál elegir',
  'Cuándo conviene una landing y cuándo un sitio web completo: comparación punto por punto, cinco preguntas para decidir y precios de referencia.',
  '2026-06-01T12:00:00-04:00'::timestamptz,
  now(),
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- 7) BLOG · Checklist de seguridad digital para pymes chilenas 2026
-- slug: checklist-seguridad-digital-pymes-chilenas-2026
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'checklist-seguridad-digital-pymes-chilenas-2026',
  'Checklist de seguridad digital para pymes chilenas en 2026',
  'Checklist trimestral de seguridad digital para pymes: contraseñas y doble factor, titularidad del dominio, respaldos que se prueban, correos, accesos y actualizaciones. Con las 24 horas críticas de un incidente.',
  $md$La seguridad digital de una pyme chilena se sostiene sobre seis controles básicos, no sobre herramientas caras: contraseñas únicas con verificación en dos pasos, titularidad del dominio y los accesos a nombre de la empresa, respaldos que alguien probó restaurar, correos corporativos bien configurados, usuarios antiguos desactivados y actualizaciones al día. Revisarlos una vez por trimestre toma un par de horas y previene la enorme mayoría de los incidentes que afectan a las pymes: cuentas de correo comprometidas, pérdida de acceso a la web, sitios infectados y datos que no se pueden recuperar. Este checklist está pensado para hacerse con lápiz y papel, sin necesidad de un departamento de tecnología.

## Por qué una pyme es un objetivo atractivo

Existe una idea instalada de que los ataques van dirigidos a las grandes empresas. En la práctica ocurre lo contrario: la mayoría de los incidentes que afectan a pymes no son ataques dirigidos, son campañas automatizadas que barren miles de sitios y correos buscando el que tenga la puerta abierta. No te eligen: te encuentran.

Y el daño en una pyme es proporcionalmente mayor, porque no hay equipo interno que responda, no hay respaldos alternativos y cada día sin operar duele en caja. A eso se suma el contexto regulatorio: Chile cuenta con la Ley 19.628 sobre protección de la vida privada y, desde 2024, con la Ley 21.663 Marco de Ciberseguridad, que creó la Agencia Nacional de Ciberseguridad. Aunque las obligaciones más exigentes recaen sobre servicios esenciales, la dirección es clara: el estándar mínimo de cuidado de los datos está subiendo para todos.

## Los seis controles esenciales

### 1. Contraseñas únicas y verificación en dos pasos

Es, con diferencia, el control que más incidentes evita.

- **Una contraseña distinta por servicio.** Reutilizar la misma clave significa que una filtración en cualquier sitio abre todas tus cuentas.
- **Verificación en dos pasos activada** en correo, hosting, dominio, redes sociales, banco y panel del sitio. Es gratis y detiene la mayoría de los accesos no autorizados aunque la contraseña se haya filtrado.
- **Gestor de contraseñas** en vez de la planilla compartida o el papel pegado en el monitor.
- **Nada de contraseñas por WhatsApp.** Quedan en el historial de todos los teléfonos del grupo para siempre.

### 2. Dominio, hosting y correos a nombre de tu empresa

Este es el punto donde más pymes chilenas se llevan una sorpresa desagradable.

- El **dominio .cl** debe estar registrado en NIC Chile a nombre de tu empresa o del dueño, nunca del proveedor que hizo el sitio. Verifícalo hoy mismo, no cuando lo necesites.
- El **hosting** debe estar contratado con una cuenta cuyo correo administres tú.
- La **fecha de vencimiento del dominio** debe estar en el calendario. Un dominio vencido saca el sitio y los correos de línea, y recuperarlo puede ser lento y caro.
- Los **correos corporativos** deben depender de tu dominio, no de cuentas personales. Lo desarrollamos en [correo corporativo con dominio propio](/blog/correo-corporativo-dominio-propio-confianza).

### 3. Respaldos que alguien probó restaurar

Un respaldo que nunca se restauró no es un respaldo, es una esperanza.

- **Respaldo automático** del sitio, la base de datos y los documentos críticos.
- **Al menos una copia fuera del mismo servidor.** Si el respaldo vive junto al sitio, un problema se lleva ambos.
- **Prueba de restauración trimestral.** Restaura en un ambiente de prueba y confirma que el archivo sirve.
- **Define cuánta información puedes permitirte perder.** Si la respuesta es "un día", el respaldo diario alcanza; si es "una hora", necesitas otra frecuencia.

### 4. Correo: el punto de entrada favorito

La mayoría de los incidentes en pymes empieza con un correo.

- **Registros SPF, DKIM y DMARC configurados** en tu dominio. Sin ellos, cualquiera puede enviar correos haciéndose pasar por tu empresa, y tus mensajes legítimos tienen más probabilidad de caer en spam.
- **Regla interna para pagos.** Ningún cambio de datos bancarios de un proveedor se ejecuta solo por correo: siempre se confirma por teléfono a un número conocido. Es el fraude más común y el más caro.
- **Capacitación breve al equipo.** Diez minutos explicando cómo se ve un correo de phishing rinden más que cualquier software.

### 5. Accesos documentados y usuarios al día

- **Una lista de quién tiene acceso a qué**: sitio, hosting, correos, redes sociales, sistemas internos, herramientas de terceros.
- **Desactivar usuarios de gente que ya no trabaja contigo.** Es sorprendentemente común encontrar cuentas activas de personas que salieron hace un año.
- **Principio de acceso mínimo**: cada persona con los permisos que necesita, ni más.
- **Un procedimiento de salida**: cuando alguien deja la empresa, hay una lista de accesos que se revocan el mismo día.

### 6. Actualizaciones y mantención

- **Sitio, plugins, temas y dependencias actualizados.** Los sitios en WordPress sin actualizar son el caso más frecuente de infección en pymes.
- **Certificado SSL vigente**, con el sitio cargando siempre en https.
- **Equipos con sistema operativo y antivirus al día.**
- **Un responsable definido.** Sea interno o externo, alguien tiene que estar a cargo. Esto es parte del alcance de la [mantención web](/servicios/mantencion-web-chile) y del [soporte TI](/soporte-ti).

## El checklist trimestral, para imprimir

1. Todas las cuentas críticas tienen contraseña única.
2. Verificación en dos pasos activa en correo, dominio, hosting y banco.
3. Dominio registrado a nombre de la empresa, con vencimiento en el calendario.
4. Respaldo automático funcionando y restauración probada este trimestre.
5. Una copia del respaldo fuera del servidor principal.
6. SPF, DKIM y DMARC configurados en el dominio.
7. Lista de accesos actualizada, con responsables.
8. Usuarios de personas que ya no están, desactivados.
9. Sitio, plugins y equipos actualizados.
10. SSL vigente y sitio cargando en https.
11. Regla de doble confirmación para cambios de datos bancarios.
12. Alguien claramente a cargo de la mantención.

Diez o más marcados es un estándar razonable para una pyme. Menos de siete significa que un incidente común te va a doler.

## Las primeras 24 horas de un incidente

Tener esto escrito antes de necesitarlo hace toda la diferencia:

1. **Contener.** Cambia las contraseñas de las cuentas afectadas y de las que compartían clave. Si es el sitio, sácalo de línea antes que siga propagando.
2. **Avisar.** Al responsable técnico, a la gerencia y, si hay datos de clientes involucrados, prepara la comunicación con ellos.
3. **Preservar evidencia.** No borres registros ni correos sospechosos: sirven para entender qué pasó.
4. **Restaurar desde respaldo limpio**, no desde la copia más reciente sin revisar, que puede estar comprometida.
5. **Cerrar la puerta.** Identificar cómo entraron y corregirlo. Restaurar sin corregir garantiza que vuelva a pasar.
6. **Documentar.** Qué pasó, qué se hizo, qué se cambió. Ese registro es el que evita la repetición.

## Errores frecuentes

- **Comprar herramientas antes de ordenar lo básico.** Un antivirus caro no compensa contraseñas compartidas.
- **Dejar la seguridad "para cuando haya tiempo".** El trimestre en que hay tiempo suele ser el siguiente al incidente.
- **Confiar en que el proveedor "lo tiene cubierto"** sin haberlo preguntado ni escrito.
- **Un solo administrador de todo.** Si esa persona no está disponible, la empresa queda bloqueada.
- **No revisar nunca los accesos de terceros.** Agencias, contadores y ex proveedores acumulan permisos que nadie retira.

## Preguntas frecuentes

### ¿Una pyme necesita seguridad avanzada?

No necesariamente, pero toda pyme necesita los controles básicos de acceso, respaldo y actualización. La mayoría de los incidentes que afectan a empresas pequeñas se previene con medidas gratuitas o de bajo costo.

### ¿Cada cuánto revisar los respaldos?

Al menos una vez por trimestre, y siempre antes de un cambio importante: migración, rediseño, actualización mayor o cambio de proveedor.

### ¿Qué hago si sospecho que una cuenta fue comprometida?

Cambia la contraseña de inmediato, activa la verificación en dos pasos, cierra todas las sesiones abiertas, revisa las reglas de reenvío del correo (los atacantes suelen dejar una) y avisa a tu proveedor de soporte.

### ¿Sirve un seguro de ciberseguridad?

Puede ser un complemento razonable en empresas con datos sensibles o alta dependencia digital, pero nunca reemplaza los controles básicos. Ninguna póliza te devuelve el tiempo de operación detenida.

## Sigue aprendiendo

- Qué buscar y qué evitar al contratar [soporte TI para pymes en Santiago](/blog/soporte-ti-pymes-santiago-que-buscar-evitar).
- Qué incluye la [mantención web](/servicios/mantencion-web-chile) en materia de seguridad y respaldos.
- Los planes de mantención vigentes están en [la página de planes](/planes).$md$,
  'Seguridad y continuidad',
  '{"seguridad digital","pymes","respaldos","accesos","chile"}',
  10,
  'Eduardo Ávila',
  'published',
  'Checklist seguridad digital pymes Chile 2026',
  'Checklist trimestral para pymes chilenas: contraseñas y doble factor, dominio a tu nombre, respaldos probados, correos, accesos y actualizaciones.',
  '2026-05-29T12:00:00-04:00'::timestamptz,
  now(),
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- 8) BLOG · Tienda online sin inventario: catálogo + WhatsApp
-- slug: tienda-online-sin-inventario-catalogo-whatsapp
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'tienda-online-sin-inventario-catalogo-whatsapp',
  'Tienda online sin inventario: catálogo + venta por WhatsApp',
  'Cómo vender sin administrar stock: catálogo digital con pedido por WhatsApp, para productos personalizados, bajo pedido o con stock variable. Qué debe tener cada ficha y cuándo dar el paso al carrito.',
  $md$Una tienda online sin inventario es un catálogo digital donde el cliente ve los productos con fotos, precios y condiciones, y el pedido se cierra por WhatsApp en vez de un carrito con pago automático. Funciona especialmente bien en negocios chilenos que venden productos personalizados, bajo pedido, con stock variable o con ticket alto que requiere asesoría. Cuesta desde $299.990 + IVA, se lanza en semanas y evita el trabajo permanente de mantener un inventario en línea al día. Es, además, la mejor forma de validar demanda antes de invertir en un ecommerce completo desde $599.990 + IVA.

## El problema de montar la tienda completa demasiado temprano

Una tienda con carrito, pagos y stock exige una operación que muchos negocios todavía no tienen: fotos de todos los productos, descripciones escritas, precios definidos, stock actualizado a diario, costos de despacho por zona y un procedimiento de devoluciones.

Cuando esa base no existe, pasa lo previsible: el stock queda desactualizado y se venden productos que no hay, los costos de envío se calculan mal y se pierde margen, o el catálogo queda a medio cargar y transmite abandono. La plataforma no era el problema; la operación no estaba lista.

El catálogo con WhatsApp resuelve esto invirtiendo el orden: primero muestras y vendes, después automatizas lo que el volumen justifique.

## Cuándo el catálogo es mejor que el carrito

Este modelo es la opción correcta cuando se cumple alguna de estas condiciones:

- **Productos personalizados o a pedido.** Muebles a medida, confección, letreros, torta por encargo, servicios con configuración. El precio final depende de decisiones que se conversan.
- **Stock variable o artesanal.** Si lo que tienes hoy no es lo que tendrás mañana, mantener un inventario en línea es una carga permanente.
- **Ticket alto con asesoría.** Maquinaria, insumos técnicos, equipamiento profesional: el cliente quiere hablar antes de pagar.
- **Precios que dependen de la cantidad.** Venta mayorista, insumos, materiales.
- **Catálogo amplio con rotación baja.** Cargar y mantener trescientos productos en un ecommerce completo es trabajo que solo se justifica con volumen.
- **Estás validando.** Todavía no sabes qué se va a vender ni cuánto.

Y cuándo **no** conviene: si vendes productos de precio fijo, con stock estable y recibes decenas de pedidos al día, el WhatsApp se convierte en cuello de botella y el carrito se paga solo.

## Qué debe tener cada ficha de producto

Aquí se define si el catálogo vende o solo se ve bonito. Cada ficha necesita:

- **Fotos consistentes**: mismo fondo, mismo encuadre, buena luz. No hace falta un estudio, pero sí un criterio único. Un catálogo con fotos dispares transmite desorden.
- **Nombre claro y descriptivo**, del tipo que la gente escribiría en Google, no el código interno del producto.
- **Precio o rango de precio.** Publicar "desde" filtra curiosos y atrae a quien está listo para comprar. Un catálogo sin precios genera muchas consultas de baja calidad.
- **Condiciones explícitas**: plazo de entrega, mínimo de compra, opciones de personalización, cobertura de despacho.
- **Botón de consulta por producto**, con el mensaje precargado incluyendo el nombre del producto. Que el cliente no tenga que explicar qué le interesa es la diferencia entre una consulta y una venta.
- **Preguntas frecuentes de esa categoría**, respondidas ahí mismo. Cada duda resuelta en la ficha es una consulta menos que responder a mano.

## El mensaje precargado: el detalle que más rinde

El enlace de WhatsApp de cada producto debe abrir la conversación con un texto ya escrito, del estilo "Hola, quiero cotizar el modelo Aurora en 1,60 m". Tres razones por las que esto importa tanto:

1. **Elimina la fricción inicial.** La persona no tiene que redactar nada, solo apretar enviar.
2. **Te dice qué producto le interesa** antes de la primera respuesta, lo que acorta la conversación a la mitad.
3. **Te da datos.** Sabes qué productos generan consultas y cuáles no, información que después define qué cargas primero en la tienda completa.

Conviene además tener respuestas guardadas para las tres o cuatro preguntas que siempre llegan, y un mensaje automático fuera de horario que comprometa cuándo respondes. La automatización de este flujo está explicada en [automatización](/automatizacion) y parte desde $249.990 + IVA.

## Sí, Google indexa un catálogo sin carrito

Es la duda más frecuente y la respuesta es que sí, siempre que cada producto o categoría tenga su propia dirección y contenido propio. De hecho, un catálogo bien estructurado suele posicionar mejor que una tienda con fichas copiadas del proveedor.

Para que funcione:

- Una URL por producto o al menos por categoría, con título único.
- Descripciones escritas por ti, no pegadas del catálogo del fabricante.
- Nombres y textos con el vocabulario que usa la gente al buscar.
- Fotos con texto alternativo descriptivo y peso optimizado.
- Datos estructurados de producto cuando corresponda, para que Google entienda qué es y cuánto cuesta.

## Cómo medir si está funcionando

Antes de decidir si das el paso al ecommerce completo, mide durante uno o dos meses:

- **Consultas por producto.** Qué se pregunta y qué nunca.
- **Tasa de cierre.** De cada diez consultas, cuántas terminan en venta.
- **Tiempo de respuesta.** Es la variable que más mueve la aguja: responder en minutos versus en horas cambia el resultado por completo.
- **Ticket promedio.** Determina si el costo de automatizar el cobro se justifica.
- **Preguntas repetidas.** Cada una es contenido que falta en la ficha.

Con esos números la decisión deja de ser una corazonada.

## Cuándo dar el paso al carrito y al pago en línea

Las señales de que el catálogo se te quedó chico:

- Respondes tantos mensajes que la venta se frena por capacidad de atención.
- Los productos y precios ya están estables.
- Los clientes preguntan si pueden pagar en línea.
- Pierdes ventas fuera del horario de atención.
- Necesitas control de stock porque estás vendiendo lo que no tienes.

En ese punto conviene sumar carrito, pasarela de pagos (integración desde $149.990 + IVA) y gestión de stock (desde $249.990 + IVA), o pasar directo a un ecommerce completo desde $599.990 + IVA. Las alternativas están comparadas en [tiendas online](/tiendas-online) y en [cómo vender online sin Shopify](/blog/vender-online-chile-sin-shopify-alternativas-pymes).

Lo importante es que ese paso se dé **sobre la misma base**: si el catálogo se construyó con estructura de URLs limpia y control de metadatos, sumar el carrito no obliga a rehacer el sitio ni a perder el posicionamiento ganado.

## Errores frecuentes en catálogos con WhatsApp

- **Un solo número de WhatsApp para todo**, sin definir quién responde ni en qué horario.
- **Catálogo sin precios ni rangos.** Genera volumen de consultas, pero de baja calidad.
- **Fotos tomadas con criterios distintos**, cada una con un fondo diferente.
- **No actualizar productos descontinuados.** Cotizar algo que ya no existe cuesta credibilidad.
- **No dejar registro de las consultas.** Si todo vive en el chat, no hay seguimiento posible ni forma de saber qué se perdió.
- **Responder tarde.** Es la causa número uno de venta perdida, y está desarrollada en [responder cotizaciones rápido](/blog/responder-cotizaciones-rapido-ganar-clientes).

## Preguntas frecuentes

### ¿Google puede indexar un catálogo sin carrito?

Sí. Lo que Google indexa es contenido, no botones de compra. Si cada producto o categoría tiene su URL, su título y una descripción propia, se posiciona igual que cualquier otra página.

### ¿Después puedo agregar pago en línea?

Sí, y es la ruta natural. Lo importante es partir con una base preparada para crecer, para no tener que rehacer el sitio ni cambiar las direcciones de las páginas.

### ¿Sirve para servicios y no solo para productos?

Sí. El mismo modelo funciona para planes, paquetes de servicio o arriendos: se muestran las opciones con sus condiciones y el cierre se hace conversando.

### ¿Cuánto demora tenerlo funcionando?

Depende sobre todo de ti: la parte técnica es rápida, pero cargar fotos, precios y descripciones consistentes es el trabajo que define el plazo real.

## Sigue aprendiendo

- Compara modelos y precios en [tiendas online](/tiendas-online).
- Las cuatro alternativas para [vender online en Chile sin Shopify](/blog/vender-online-chile-sin-shopify-alternativas-pymes).
- Estima tu proyecto en el [cotizador](/cotizador).$md$,
  'Ecommerce',
  '{"catálogo digital","whatsapp","tienda online","pymes","validación"}',
  9,
  'Eduardo Ávila',
  'published',
  'Tienda online sin inventario: catálogo y WhatsApp',
  'Vende sin administrar stock: catálogo digital con pedido por WhatsApp, qué debe tener cada ficha y cuándo dar el paso al carrito con pagos online.',
  '2026-06-05T12:00:00-04:00'::timestamptz,
  now(),
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- 9) BLOG · Cómo medir el ROI de tu página web como empresa B2B
-- slug: medir-roi-pagina-web-empresa-b2b
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'medir-roi-pagina-web-empresa-b2b',
  'Cómo medir el ROI de tu página web como empresa B2B',
  'En B2B el ROI de la web no se mide en visitas sino en oportunidades calificadas. La fórmula, los cinco datos que necesitas, un ejemplo paso a paso y los errores de atribución más comunes.',
  $md$El ROI de una página web B2B se calcula con una fórmula simple: (ingresos atribuibles a la web menos la inversión) dividido por la inversión, expresado en porcentaje. Lo difícil no es la fórmula, es conseguir el numerador, porque en B2B el camino entre la primera visita y la venta cerrada pasa por reuniones, cotizaciones y semanas de decisión. Por eso medir visitas no dice nada: una empresa B2B puede recibir doscientas visitas al mes y generar más retorno que un sitio con veinte mil. Lo que hay que medir es la cadena completa: visitas, conversiones, oportunidades calificadas, cotizaciones y ventas cerradas, más el valor del cliente en el tiempo.

## Por qué el tráfico es una métrica engañosa en B2B

En B2C, más visitas suele significar más ventas. En B2B esa relación se rompe por tres razones:

- **El universo de compradores es pequeño.** Si vendes equipamiento industrial, tus clientes potenciales en Chile pueden ser doscientas empresas. Nunca vas a tener tráfico masivo, y no lo necesitas.
- **El ciclo es largo.** Entre la primera visita y la orden de compra pueden pasar semanas o meses, con varias personas involucradas en la decisión.
- **La conversión ocurre fuera de la web.** El sitio genera la consulta; la venta se cierra en una reunión, una llamada o una licitación.

Un aumento de tráfico puede incluso ser mala señal, si viene de búsquedas informativas que no tienen intención de compra.

## Los cinco datos que necesitas para calcular el ROI

### 1. La inversión total, no solo el desarrollo

Suma todo lo que la web te costó en el período que estás midiendo:

- Desarrollo del sitio, prorrateado según su vida útil. Si el sitio costó $399.990 + IVA y esperas que sirva tres años, son unos $11.100 mensuales.
- Dominio y hosting anuales.
- Mantención mensual, si la tienes contratada.
- Contenido, SEO y publicidad del período.
- Horas internas dedicadas a responder consultas y actualizar información.

Ese último punto se olvida siempre y suele ser significativo.

### 2. Las conversiones, medidas como eventos

Sin esto no hay ROI posible. Los eventos mínimos a configurar:

- Formulario de contacto enviado.
- Clic en el botón de WhatsApp.
- Solicitud de cotización o uso del [cotizador](/cotizador).
- Descarga de material (ficha técnica, propuesta, catálogo).
- Clic en el teléfono desde el celular.

Cada evento debe registrar de qué página vino y por qué canal llegó la persona. Sin esa dimensión, sabes cuántos contactos llegaron pero no qué los produjo.

### 3. La calificación de esas oportunidades

No todas las consultas valen lo mismo. Una empresa que pide una cotización formal vale mucho más que alguien pidiendo información general. Clasifica cada contacto en tres niveles: calificado (encaja con lo que vendes y tiene intención real), tibio (encaja pero está explorando) y descartado.

Este paso es el que separa una medición útil de un número decorativo, y no lo hace la analítica: lo hace la persona de ventas al revisar cada contacto.

### 4. El avance comercial

Aquí es donde entra el CRM o, si aún no lo tienes, una planilla con cinco columnas: fecha, origen, empresa, estado y monto. Los estados mínimos: contacto, reunión, cotización enviada, ganada o perdida.

Sin este seguimiento no puedes conectar la web con los ingresos, y todo el ejercicio se queda en la mitad.

### 5. El valor real del cliente

En B2B, medir solo la primera venta subestima el retorno de forma grosera. Si un cliente que llegó por la web factura durante tres años, el valor a considerar es ese, no el de la primera orden. Un contrato de mantención recurrente puede valer diez veces la venta inicial.

## Un ejemplo paso a paso

Los números que siguen son un **ejercicio ilustrativo con cifras inventadas a propósito**, para mostrar el método. Reemplázalos por los tuyos.

Supongamos una empresa de servicios industriales que mide un trimestre:

- Inversión del período: $200.000 (desarrollo prorrateado, hosting, mantención y contenido).
- Conversiones de la web: 30 contactos.
- Calificados por el equipo comercial: 12.
- Cotizaciones enviadas: 8.
- Ventas cerradas: 2.
- Ticket promedio de esas ventas: $450.000.

Ingresos atribuibles: 2 × $450.000 = $900.000.
ROI = (900.000 − 200.000) / 200.000 = 3,5, es decir **350%**.

De ese mismo ejercicio salen indicadores más accionables que el ROI global:

- **Costo por contacto**: $200.000 / 30 = $6.667.
- **Costo por oportunidad calificada**: $200.000 / 12 = $16.667.
- **Costo de adquisición de cliente**: $200.000 / 2 = $100.000.
- **Tasa de calificación**: 12 / 30 = 40%.
- **Tasa de cierre sobre cotizaciones**: 2 / 8 = 25%.

Estos son los números que permiten decidir dónde intervenir. Si la tasa de calificación es baja, el problema está en el contenido: estás atrayendo a la gente equivocada. Si es la tasa de cierre la que falla, el problema no es la web, es la propuesta comercial o el tiempo de respuesta.

## Los errores de atribución más comunes

- **Atribuir todo al último clic.** Alguien te encontró en Google hace dos meses, volvió por marca y cerró tras una llamada. La analítica dirá "directo", pero el mérito fue orgánico.
- **Ignorar las ventas asistidas.** Muchos clientes que llegan por recomendación revisan tu web antes de responder. Esa venta no aparece en ningún reporte, pero la web influyó.
- **No preguntar.** El dato más barato de todos: agrega "¿cómo nos conociste?" al formulario o pregúntalo en la primera llamada. Es impreciso, pero atrapa lo que la analítica pierde.
- **Medir períodos demasiado cortos.** Con ciclos de venta de tres meses, evaluar el ROI a los 30 días da un resultado negativo garantizado y lleva a cancelar algo que estaba funcionando.
- **Mezclar canales en un solo número.** Orgánico, campañas, referidos y directo tienen costos y comportamientos distintos. Sepáralos.

## Qué hacer si el ROI da negativo

No es motivo de pánico, es un diagnóstico. Revisa en este orden:

1. **¿Está bien medido?** El caso más frecuente de "ROI negativo" es medición incompleta, no falta de resultados.
2. **¿Llega tráfico calificado?** Si las visitas vienen de búsquedas informativas, el problema es de contenido: faltan páginas comerciales por servicio. Es lo que resuelve un plan como el de [SEO para empresas](/servicios/seo-para-empresas-chile).
3. **¿La web convierte?** Si hay visitas pero no contactos, revisa claridad del mensaje, rutas de conversión, velocidad y experiencia móvil.
4. **¿Se responde a tiempo?** Es la fuga más silenciosa y la más cara.
5. **¿Cuánto tiempo lleva?** Un sitio nuevo con SEO en marcha necesita entre seis y doce meses para mostrar su rendimiento real.

## Un tablero mínimo que sí se mantiene

Un reporte mensual de una página, con seis líneas, se sostiene en el tiempo. Un dashboard de treinta indicadores se abandona en dos meses. Lo mínimo:

- Visitas por canal.
- Conversiones totales y por página.
- Oportunidades calificadas.
- Cotizaciones enviadas y monto.
- Ventas cerradas atribuibles.
- Inversión del mes.

Con esas seis líneas se calcula el ROI, el costo por oportunidad y las tasas de conversión de cada etapa. Todo lo demás es detalle.

## Preguntas frecuentes

### ¿Basta con la analítica para medir el ROI?

No. La analítica muestra qué pasó hasta el contacto; lo que ocurre después vive en el CRM o en la planilla comercial. El ROI se calcula uniendo ambos mundos.

### ¿Qué conversión conviene medir primero?

Formulario enviado, clic en WhatsApp y clic hacia cotizar. Con esos tres eventos ya puedes calcular costo por contacto y comparar el rendimiento de cada página.

### ¿Cada cuánto revisar el ROI?

Mensualmente para tendencias operativas y trimestralmente para decisiones de inversión. Con ciclos de venta largos, los cierres mensuales aislados dicen poco.

### ¿Cómo mido el aporte de la web cuando el cliente llegó por recomendación?

Con la pregunta directa en el primer contacto y con las visitas de marca (búsquedas de tu nombre). Si suben, tu presencia digital está sosteniendo la recomendación.

## Sigue aprendiendo

- Qué estructura necesita un sitio que genera oportunidades en [páginas web para empresas](/paginas-web-para-empresas).
- Cómo trabajamos el posicionamiento en [SEO para empresas en Chile](/servicios/seo-para-empresas-chile).
- Por qué [responder rápido las cotizaciones](/blog/responder-cotizaciones-rapido-ganar-clientes) es la variable que más mueve el cierre.
- Cómo la [velocidad en móviles afecta la conversión](/blog/velocidad-web-mobile-conversion-pymes).$md$,
  'Analítica y conversión',
  '{"roi","b2b","analítica","conversiones","leads"}',
  10,
  'Eduardo Ávila',
  'published',
  'Cómo medir el ROI de tu página web B2B',
  'La fórmula del ROI web en B2B, los cinco datos que necesitas, un ejemplo paso a paso y los errores de atribución que distorsionan el cálculo.',
  '2026-05-28T12:00:00-04:00'::timestamptz,
  now(),
  now()
)
on conflict (slug) do nothing;

-- Fuerza recarga del schema cache de PostgREST.
notify pgrst, 'reload schema';
