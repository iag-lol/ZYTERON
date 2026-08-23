-- =========================================================
-- SEED SEO parte 1: 3 artículos de intención de compra
-- (slugs priorizados en RECOMMENDED_SLUG_PRIORITY de
--  src/lib/content/blog-merge.ts que aún no existían en BD).
--
-- Ejecutar en Supabase SQL Editor DESPUÉS de blog_cases_bootstrap.sql
-- (la tabla "BlogPost" debe existir). El artículo 2 enlaza a
-- /blog/perfil-empresa-google-pymes-chile: ejecutar también
-- seed_blog_casos_julio2026.sql para que ese enlace no quede en 404.
--
-- Idempotente: usa ON CONFLICT (slug) DO NOTHING, se puede
-- re-ejecutar sin duplicar ni pisar ediciones hechas en /admin/blog.
--
-- Precios copiados desde src/config/pricing.ts (fuente única).
-- Precios actualizados a la escalera comercial 2026 (src/config/pricing.ts).
-- OJO: si estos artículos ya están publicados en producción, este seed NO los
-- corrige (ON CONFLICT DO NOTHING). Para eso está blog_actualizacion_precios_2026.sql.
-- El contenido es Markdown compatible con src/lib/markdown.ts:
-- sólo ##/###, listas, negrita, enlaces y citas (sin tablas pipe,
-- que ese renderizador no soporta).
-- =========================================================

-- =========================================================
-- BLOG · ¿Cuánto cuesta una página web para una empresa en Chile?
-- slug: cuanto-cuesta-pagina-web-empresa-chile
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'cuanto-cuesta-pagina-web-empresa-chile',
  '¿Cuánto cuesta una página web para una empresa en Chile? Precios 2026',
  'Guía de precios 2026 con valores reales: cuánto cuesta una web básica, un sitio corporativo, una tienda online y un sistema a medida en Chile, más los costos anexos que conviene presupuestar.',
  $md$En 2026, una página web para una empresa en Chile cuesta desde $99.990 + IVA en su versión más simple (una web profesional de una página), entre $179.990 y $299.990 + IVA para sitios de emprendedores y pymes, desde $549.990 + IVA para un sitio corporativo completo, desde $749.990 + IVA si necesitas una tienda online con carrito y pagos, y desde $1.990.000 + IVA cuando el proyecto es un sistema web a medida. El precio final depende del alcance: cantidad de páginas, funcionalidades, integraciones y nivel de personalización. En esta guía revisamos qué incluye cada nivel, los rangos que se manejan en el mercado chileno y los costos anexos que conviene tener en el presupuesto desde el día uno.

## Los rangos que se manejan en el mercado chileno

Cuando cotizas una página web en Chile, las propuestas pueden variar muchísimo para "lo mismo". La razón es que detrás de la palabra "página web" hay productos muy distintos:

- **Plantillas autoadministradas** (constructores tipo arrastrar y soltar): pagas una mensualidad y armas el sitio tú mismo. Parece barato al inicio, pero el costo es tu tiempo, el resultado suele verse genérico y el SEO parte en desventaja.
- **Freelancers**: como referencia general del mercado, los sitios simples suelen moverse entre $100.000 y $400.000. Funciona bien cuando el proyecto es acotado y el profesional es serio; el riesgo habitual es la continuidad del soporte después de la entrega.
- **Agencias y estudios de desarrollo**: como referencia general, sitios corporativos entre $400.000 y $2.000.000 según alcance, y proyectos a medida (tiendas complejas, sistemas, integraciones) desde $1.500.000 hacia arriba. Aquí pagas por proceso, diseño propio, SEO desde la base y soporte real.

Con esos rangos en mente, veamos precios concretos por tipo de proyecto.

## Precios de referencia 2026 por tipo de proyecto

Estos son los valores vigentes de Zyteron, útiles como referencia del mercado formal chileno. Se expresan "desde", no incluyen IVA, y el detalle siempre actualizado de cada plan está en [la página de planes](/planes):

- **Web Básica**: desde $99.990 + IVA. Una página profesional con tu oferta, datos de contacto y botón de WhatsApp.
- **Plan Emprendedor**: Desde $179.990 + IVA. Sitio de varias secciones para partir con presencia seria.
- **Plan Pyme**: Desde $299.990 + IVA. Sitio corporativo con páginas de servicios, formulario y SEO local básico.
- **Plan Empresa**: Desde $549.990 + IVA. Sitio corporativo completo, más páginas, más contenido y estructura SEO más profunda.
- **Catálogo por WhatsApp**: Desde $349.990 + IVA. Catálogo de productos donde el pedido llega directo a tu WhatsApp.
- **Ecommerce con carrito y pagos**: Desde $749.990 + IVA. Tienda online con carrito, pagos en línea y gestión de productos.
- **Sistema web administrativo**: Desde $1.990.000 + IVA. Software a medida para operar tu negocio (pedidos, clientes, reservas, reportes).
- **Sistema avanzado a medida**: Desde $3.490.000 + IVA. Proyectos con múltiples módulos, roles e integraciones.

## Qué incluye cada nivel (y cuándo conviene)

### Web básica: para existir bien en Google y WhatsApp

Es la puerta de entrada: una página única con tu propuesta, fotos reales, datos de contacto y botón de WhatsApp. Conviene cuando recién estás partiendo o cuando hoy dependes solo de redes sociales y necesitas un lugar propio donde recibir a los clientes que te buscan. Desde $99.990 + IVA resuelves presencia, seriedad y contacto directo.

### Sitio corporativo: para empresas que cotizan y venden servicios

Entre $179.990 y $549.990 + IVA según alcance. Aquí ya hablamos de varias páginas (inicio, servicios, quiénes somos, contacto), formulario de cotización, SEO local para aparecer en búsquedas de tu rubro y comuna, y un diseño alineado con tu marca. Es el nivel que más contratan las pymes chilenas que viven de cotizaciones: constructoras, servicios profesionales, clínicas, empresas de mantención.

### Tienda online: para vender con carrito y pago en línea

Desde $749.990 + IVA. Incluye catálogo de productos, carrito, integración de pagos chilenos (Webpay, Flow, Mercado Pago), cálculo de despacho y panel para administrar productos y pedidos. Si tu volumen aún es bajo, el [catálogo por WhatsApp](/tiendas-online) desde $349.990 + IVA es un excelente paso intermedio: el cliente arma su pedido y te llega directo al teléfono.

### Sistema web a medida: para ordenar la operación del negocio

Desde $1.990.000 + IVA (y desde $3.490.000 + IVA en proyectos avanzados). Aquí el sitio deja de ser una vitrina y pasa a ser una herramienta de trabajo: reservas de horas, seguimiento de pedidos, portal de clientes, control de stock, reportes. Se cotiza por alcance, y por eso el "desde" es más relevante que nunca: dos sistemas pueden costar el doble o el triple uno del otro según módulos y usuarios. Puedes ver ejemplos concretos en [sistemas web](/sistemas-web).

## Los costos anexos que casi nadie te cuenta al cotizar

El desarrollo es el costo principal, pero un presupuesto honesto incluye estos ítems anuales o mensuales:

- **Dominio .cl**: se contrata en NIC Chile y cuesta alrededor de $15.000 al año (tarifa anual + IVA). Es tuyo, a tu nombre, y es la base de tu marca en internet. Exige siempre que quede registrado a nombre de tu empresa.
- **Hosting**: el servidor donde vive tu sitio. Según el proveedor y el tipo de proyecto, va desde unos $30.000 al año en sitios simples hasta valores mensuales en tiendas y sistemas con más tráfico.
- **Certificado SSL (el candado)**: hoy debería venir incluido con el hosting sin costo adicional. Si te lo cobran aparte como ítem caro, pregunta por qué.
- **Correo corporativo** (contacto@tuempresa.cl): algunos hostings lo incluyen; los servicios profesionales tipo Google Workspace o Microsoft 365 se pagan por usuario al mes.
- **Comisiones de la pasarela de pagos**: si vendes online, Webpay, Flow o Mercado Pago cobran un porcentaje por venta. No es un costo del sitio, pero sí de tu operación.
- **Mantención**: actualizaciones, respaldos, seguridad y cambios menores. En Zyteron va desde $49.990 + IVA al mes en sitios simples, desde $99.990 + IVA la mantención profesional, desde $169.990 + IVA en ecommerce y desde $299.990 + IVA en sistemas o proyectos con IA.

## Por qué dos cotizaciones "iguales" pueden diferir tanto

Al comparar propuestas, revisa qué explica la diferencia de precio. Los factores que más mueven el valor final son:

1. **Cantidad de páginas y secciones**: cada página adicional implica diseño, contenido y SEO.
2. **Funcionalidades**: un formulario simple no cuesta lo mismo que reservas de hora, login de usuarios o generación de PDF.
3. **Integraciones**: pagos, facturación, WhatsApp, APIs de terceros.
4. **Contenido**: si la agencia redacta los textos pensando en Google y en ventas, o si tú debes entregarlos listos.
5. **SEO real**: estructura técnica, velocidad, datos estructurados y textos optimizados desde el lanzamiento, no "SEO" como palabra decorativa.
6. **Soporte posterior**: quién responde cuando necesitas un cambio el mes tres.

Una cotización notoriamente más barata suele recortar en los puntos 4, 5 y 6, que son justamente los que hacen que el sitio genere clientes.

## Cómo estimar el precio de tu proyecto en minutos

Si quieres un número concreto para tu caso, tienes dos caminos rápidos:

- Usa el [cotizador online](/cotizador): eliges tipo de proyecto y funcionalidades, y obtienes un valor referencial al instante.
- Revisa los planes actualizados en [/planes](/planes), que es la fuente oficial de precios, y [conversemos por el formulario de contacto](/contacto) para ajustar el alcance a tu presupuesto.

## Preguntas frecuentes sobre el precio de una página web

### ¿Se paga una vez o todos los meses?

El desarrollo del sitio se paga una vez (con opciones de pago por etapas en proyectos grandes). Los costos recurrentes son otros: dominio anual, hosting y, si la contratas, la mantención mensual. Desconfía de los modelos donde "arriendas" el sitio para siempre: si dejas de pagar, te quedas sin nada, ni siquiera con tu contenido.

### ¿El precio incluye dominio y hosting?

Depende del proveedor y del plan; por eso conviene preguntarlo explícitamente al comparar cotizaciones. Lo importante es que el dominio quede a tu nombre y que sepas exactamente qué pagarás cada año una vez lanzado el sitio.

### ¿Por qué todos los precios dicen "desde"?

Porque el valor final depende del alcance: cantidad de páginas, funcionalidades, integraciones y personalización. El "desde" es el punto de partida real del plan; una cotización seria siempre detalla qué incluye ese valor y cuánto suma cada extra.

La conclusión práctica: en Chile puedes tener una web profesional desde $99.990 + IVA, un sitio corporativo serio en torno a los $299.990 + IVA, y proyectos de venta u operación desde $749.990 + IVA hacia arriba. Lo importante es partir por el objetivo comercial (que te encuentren, que te coticen, que te compren) y dimensionar el sitio para eso, ni más ni menos.

## Sigue aprendiendo

- [Qué debe tener una página web profesional para una pyme chilena](/blog/que-debe-tener-pagina-web-profesional-pyme)
- [Página web, tienda online o sistema web: cuál necesita tu negocio](/blog/diferencia-pagina-web-tienda-online-sistema-web)
- Todos los precios vigentes, siempre actualizados, están en [la página de planes](/planes).$md$,
  'Precios y presupuesto',
  '{"precios","página web","pymes","cotización","chile"}',
  9,
  'Eduardo Ávila',
  'published',
  'Cuánto cuesta una página web en Chile 2026 | Precios reales',
  'Precios reales 2026: una web básica parte en $99.990 + IVA, un sitio pyme desde $299.990, uno corporativo desde $549.990 y una tienda online desde $749.990.',
  now(),
  now(),
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- BLOG · Qué debe tener una página web profesional para una pyme
-- slug: que-debe-tener-pagina-web-profesional-pyme
-- (enlazado desde src/content/seo-service-pages.ts — debe existir)
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'que-debe-tener-pagina-web-profesional-pyme',
  'Qué debe tener una página web profesional para una pyme chilena',
  'Checklist accionable para pymes: dominio .cl, SSL, diseño responsive, velocidad, WhatsApp, SEO local, formulario simple, Webpay si vendes y textos que venden. Revisa tu sitio punto por punto.',
  $md$Una página web profesional para una pyme chilena necesita nueve elementos: dominio .cl propio, certificado SSL, diseño responsive que funcione perfecto en celulares, velocidad de carga real, botón de WhatsApp visible, SEO local básico, un formulario de contacto simple, textos orientados a vender y, si vendes productos, pago en línea con Webpay u otra pasarela chilena. Si tu sitio cumple estos nueve puntos, deja de ser una tarjeta de presentación y se convierte en un canal que genera cotizaciones todos los días. Revisémoslos uno por uno, con lo mínimo aceptable en cada caso.

## 1. Dominio .cl a nombre de tu empresa

El dominio .cl se contrata en NIC Chile, cuesta alrededor de $15.000 al año (tarifa anual + IVA) y le dice a tus clientes (y a Google) que eres un negocio chileno real. Dos reglas de oro:

- El dominio debe quedar registrado **a nombre de tu empresa o del dueño**, nunca a nombre del proveedor que te hizo el sitio. Es un activo tuyo.
- Elige un nombre corto y fácil de dictar por teléfono: si tienes que deletrearlo dos veces, hay uno mejor.

Un sitio alojado en subdominios gratuitos (tunegocio.wixsite.com, por ejemplo) transmite lo contrario de profesionalismo, y además regala tu marca a otra plataforma.

## 2. Certificado SSL: el candado en la barra del navegador

El SSL cifra la comunicación entre tu sitio y el visitante. Sin él, Chrome muestra "No seguro" junto a tu dirección, y esa advertencia espanta clientes antes de que lean una sola línea. Hoy todo hosting serio lo incluye sin costo, así que el estándar es simple: tu sitio debe cargar siempre con https y candado. Es, además, un requisito para aparecer bien posicionado en Google.

## 3. Diseño responsive: tu sitio se usa desde el celular

En Chile, la gran mayoría de las visitas a sitios de pymes llega desde el teléfono, muchas veces directo desde Instagram o desde una búsqueda en Google. Responsive significa que el sitio se adapta a la pantalla: textos legibles sin hacer zoom, botones que se pueden tocar con el pulgar, menú que funciona con una mano.

La prueba práctica: abre tu sitio en tu propio celular y trata de cotizar como si fueras cliente. Si te cuesta encontrar el teléfono, leer los precios o enviar el formulario, a tus clientes les pasa lo mismo, y se van.

## 4. Velocidad: tres segundos o te cambian por la competencia

Un sitio lento pierde visitas antes de mostrarse. Las causas más comunes en sitios de pymes son fotos gigantes sin optimizar, plantillas sobrecargadas y hosting de mala calidad. Lo mínimo aceptable:

- Cargar en menos de 3 segundos en un celular con datos móviles, no solo con el wifi de la oficina.
- Imágenes comprimidas y en formatos modernos.
- Medirlo con PageSpeed Insights de Google, que es gratis, y pedirle a tu proveedor las correcciones cuando el puntaje móvil es bajo.

La velocidad no es un tema técnico decorativo: Google la considera para posicionar y tus clientes la sienten en cada visita.

## 5. WhatsApp visible y con mensaje inicial

En Chile se cotiza por WhatsApp. Tu sitio debe tener un botón flotante o muy visible que abra una conversación con un mensaje precargado tipo "Hola, vengo del sitio web y quiero cotizar". Eso baja la barrera de contacto al mínimo: un toque y el cliente ya está hablando contigo.

Dos detalles que marcan diferencia:

- Usa un número comercial que alguien realmente conteste en horario hábil.
- Define una respuesta de bienvenida para las consultas que llegan fuera de horario, con el compromiso de cuándo respondes.

## 6. SEO local: que te encuentren en tu rubro y tu comuna

De poco sirve un sitio precioso si nadie lo encuentra. El SEO local básico para una pyme incluye:

- Títulos y textos que mencionen tu servicio y tu zona con lenguaje natural: "mantención de aire acondicionado en Maipú", no una lista robótica de comunas.
- Una página (o sección) por servicio principal, en lugar de amontonar todo en el inicio.
- Datos de contacto consistentes con tu Perfil de Empresa en Google: mismo nombre, misma dirección, mismo teléfono.
- Datos estructurados de negocio local, para que Google entienda quién eres y dónde atiendes.

El sitio y el Perfil de Empresa en Google trabajan en equipo: el perfil te pone en el mapa y el sitio convierte esa visita en cotización.

## 7. Formulario de contacto simple (de verdad simple)

Cada campo extra en un formulario reduce la cantidad de personas que lo completan. Para la mayoría de las pymes bastan cuatro campos: nombre, teléfono, correo y "cuéntanos qué necesitas". Y tres condiciones no negociables:

- Que llegue a un correo que alguien revisa a diario (idealmente también con aviso inmediato).
- Que muestre un mensaje de confirmación claro después de enviar.
- Que alguien responda dentro del mismo día hábil. La velocidad de respuesta cierra más ventas que cualquier rediseño.

## 8. Textos que venden, no que describen

El error más común en sitios de pymes son textos escritos desde adentro ("Somos una empresa con amplia trayectoria...") en vez de escritos para el cliente. Los textos que generan cotizaciones responden rápido tres preguntas: qué haces, para quién y por qué elegirte.

- Titulares con el beneficio concreto: "Instalamos tu cámara de seguridad en 48 horas" vende más que "Soluciones integrales de seguridad".
- Precios de referencia cuando sea posible: publicar "desde" filtra curiosos y atrae clientes listos para comprar.
- Fotos reales de tu equipo y tus trabajos: las fotos de banco de imágenes se reconocen a la primera.
- Un llamado a la acción visible en cada página: cotiza, agenda, escríbenos.

## 9. Webpay o pasarela de pagos, si vendes productos

Si tu negocio vende productos, el pago en línea con Webpay, Flow o Mercado Pago convierte tu sitio en un canal de venta que trabaja 24/7. Si aún no quieres una tienda completa, un catálogo donde el pedido llega directo a tu WhatsApp es un paso intermedio muy usado por pymes chilenas. Puedes comparar ambas opciones en [tiendas online](/tiendas-online).

## Checklist resumen para revisar tu sitio hoy

1. Dominio .cl a nombre de tu empresa.
2. Candado SSL activo (https) en todo el sitio.
3. Se usa perfecto desde un celular.
4. Carga en menos de 3 segundos con datos móviles.
5. Botón de WhatsApp con mensaje precargado.
6. Una página por servicio, con textos locales naturales.
7. Formulario de 4 campos que alguien responde el mismo día.
8. Textos con beneficios, precios de referencia y fotos reales.
9. Pago online o pedido por WhatsApp, si vendes productos.

Si marcaste 7 o más, tu sitio está trabajando para ti. Si marcaste menos, cada punto pendiente es una fuga de clientes que se puede cerrar.

## Los extras que suman cuando el negocio crece

El checklist anterior es la base. Cuando el sitio ya genera contactos de forma constante, estos complementos multiplican el resultado:

- **Correo corporativo** (contacto@tuempresa.cl): responder cotizaciones desde un Gmail personal resta seriedad justo en el momento de la decisión. Con dominio propio, cada correo refuerza tu marca.
- **Blog con guías de tu rubro**: responder por escrito las preguntas que tus clientes hacen antes de comprar te posiciona en Google y te ahorra repetir lo mismo en cada llamada.
- **Agenda o reservas online**: si trabajas con horas (salud, belleza, servicios técnicos), que el cliente reserve solo desde el sitio reduce llamadas e inasistencias.
- **Automatización de WhatsApp**: respuestas automáticas fuera de horario, confirmaciones de pedido y seguimiento de cotizaciones sin depender de que alguien esté frente al teléfono. Puedes ver cómo funciona en [automatización](/automatizacion).

Ninguno de estos extras reemplaza la base: primero el checklist, después las capas.

## Cuánto cuesta tener todo esto bien hecho

Un sitio que cumple este checklist completo está al alcance de cualquier pyme: en Zyteron el Plan Pyme parte desde $299.990 + IVA e incluye la base de este checklist, y puedes ver todas las alternativas en [la página de planes](/planes). Si quieres un número para tu caso específico, el [cotizador online](/cotizador) te entrega un valor referencial en minutos, y en [páginas web para pymes](/paginas-web-para-pymes) encuentras cómo trabajamos este segmento.

## Sigue aprendiendo

- [¿Cuánto cuesta una página web para una empresa en Chile? Precios 2026](/blog/cuanto-cuesta-pagina-web-empresa-chile)
- [Página web, tienda online o sistema web: cuál necesita tu negocio](/blog/diferencia-pagina-web-tienda-online-sistema-web)
- [Perfil de Empresa en Google: cómo lograr que tu pyme aparezca en el mapa](/blog/perfil-empresa-google-pymes-chile)$md$,
  'Guías para pymes',
  '{"pymes","página web profesional","checklist","seo local","whatsapp"}',
  8,
  'Eduardo Ávila',
  'published',
  'Qué debe tener una página web profesional para tu pyme',
  'Checklist para pymes chilenas: dominio .cl, SSL, responsive, velocidad, WhatsApp, SEO local, Webpay y textos que venden. Revisa tu sitio punto por punto.',
  now(),
  now(),
  now()
)
on conflict (slug) do nothing;

-- =========================================================
-- BLOG · Página web, tienda online o sistema web
-- slug: diferencia-pagina-web-tienda-online-sistema-web
-- =========================================================
insert into public."BlogPost"
  (id, slug, title, excerpt, content, category, tags, "readMinutes", author, status,
   "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  'diferencia-pagina-web-tienda-online-sistema-web',
  'Página web, tienda online o sistema web: cuál necesita tu negocio',
  'Las tres opciones resuelven problemas distintos: la página web genera contactos, la tienda online vende y cobra, y el sistema web ordena tu operación. Comparativa con precios reales y casos chilenos.',
  $md$La diferencia está en el objetivo: una **página web** informa y genera contactos (desde $99.990 + IVA), una **tienda online** vende productos y cobra en línea (desde $749.990 + IVA), y un **sistema web** ordena la operación interna de tu negocio: pedidos, reservas, clientes, stock (desde $1.990.000 + IVA). La mayoría de los negocios chilenos parte con una página web y va sumando capas a medida que crece. En esta guía comparamos las tres opciones con precios reales, casos de uso típicos y tres preguntas para decidir sin equivocarte.

## Página web: que te encuentren y te coticen

Una página web (o sitio corporativo) es tu presencia oficial en internet: quién eres, qué haces, dónde atiendes y cómo contactarte. Su trabajo es aparecer cuando alguien busca tu servicio en Google y convertir esa visita en una cotización por formulario o WhatsApp.

**Precio de referencia**: desde $99.990 + IVA una web básica de una página, desde $179.990 a $299.990 + IVA un sitio para emprendedores y pymes, y desde $549.990 + IVA un sitio corporativo completo, según alcance. El detalle por plan está en [/planes](/planes).

**Es tu opción si**:

- Vives de cotizaciones y proyectos, no de venta directa de productos: servicios profesionales, construcción, mantención, salud, educación.
- Hoy dependes de Instagram o del boca a boca y quieres captar a quienes te buscan en Google.
- Necesitas seriedad comercial: los clientes grandes y las licitaciones revisan tu sitio antes de responderte.

**Casos típicos chilenos**: un gásfiter en La Florida que quiere aparecer en "gásfiter cerca de mí", una consultora contable que recibe clientes por recomendación y necesita respaldo profesional, una clínica dental en Ñuñoa que quiere que le escriban por WhatsApp.

## Tienda online: vender y cobrar sin intervención tuya

Una tienda online agrega catálogo, carrito de compras, pago en línea (Webpay, Flow, Mercado Pago) y gestión de despacho. Su trabajo es cerrar la venta completa: el cliente elige, paga y tú despachas. Vende a cualquier hora, incluso mientras atiendes el local.

**Precio de referencia**: desde $749.990 + IVA con carrito y pagos integrados. Y hay un paso intermedio muy usado en Chile: el **catálogo por WhatsApp**, desde $349.990 + IVA, donde el cliente arma su pedido en el sitio y te llega directo al teléfono para coordinar pago y entrega. Ambas opciones están explicadas en [tiendas online](/tiendas-online).

**Es tu opción si**:

- Vendes productos con precio definido que no requieren cotización caso a caso.
- Ya vendes por Instagram o WhatsApp y el volumen de pedidos te tiene copado respondiendo mensajes.
- Quieres cobrar online para confirmar pedidos sin perseguir transferencias.

**Casos típicos chilenos**: una tienda de ropa que vende por Instagram y pierde ventas por demorar en responder, una botillería con reparto en la comuna, una pyme de alimentos congelados que recibe pedidos semanales, una librería de barrio que quiere despachar a regiones.

## Sistema web: ordenar la operación del negocio

Un sistema web es software a tu medida: agenda de horas con confirmación automática, seguimiento de pedidos u órdenes de trabajo, portal donde tus clientes revisan su estado, control de stock, reportes para decidir con datos. Su trabajo no es atraer clientes, sino que la operación deje de depender de planillas, cuadernos y memoria.

**Precio de referencia**: desde $1.990.000 + IVA un sistema administrativo, y desde $3.490.000 + IVA proyectos avanzados con múltiples módulos, roles e integraciones. Se cotiza por alcance: módulos, usuarios e integraciones definen el valor final. Ejemplos concretos en [sistemas web](/sistemas-web).

**Es tu opción si**:

- Tu operación vive en planillas Excel que solo una persona entiende.
- Pierdes horas coordinando reservas, pedidos o despachos por teléfono.
- Necesitas que varias personas trabajen sobre la misma información al día.
- Tus clientes te preguntan a cada rato "¿en qué va lo mío?".

**Casos típicos chilenos**: un centro médico que agenda por teléfono y sufre inasistencias, una distribuidora que toma pedidos por WhatsApp y los traspasa a mano a una planilla, un taller mecánico que quiere que el cliente vea el estado de su vehículo en línea, una empresa de aseo industrial que coordina cuadrillas con papel.

## Comparativa rápida

- **Objetivo** — Página web: que te encuentren y te coticen. Tienda online: vender y cobrar en línea. Sistema web: operar el negocio con orden.
- **Precio desde** — Página web: desde $99.990 + IVA (pyme desde $299.990, corporativo desde $549.990 + IVA). Tienda online: desde $749.990 + IVA (catálogo WhatsApp desde $349.990 + IVA). Sistema web: desde $1.990.000 + IVA.
- **Quién lo necesita** — Página web: todo negocio que quiera clientes nuevos. Tienda online: negocios con productos de precio definido. Sistema web: negocios cuya operación desborda las planillas.
- **Resultado esperable** — Página web: cotizaciones por Google y WhatsApp. Tienda online: ventas cerradas y cobradas 24/7. Sistema web: horas ahorradas, menos errores, información al día.
- **Se combinan**: sí. Un mismo proyecto puede partir como sitio corporativo y crecer a tienda o sistema sobre la misma base.

Los plazos también cambian con el tipo de proyecto: una página web se lanza en días o pocas semanas, una tienda online requiere algunas semanas adicionales para cargar productos e integrar pagos, y un sistema web se desarrolla por etapas durante uno o más meses según los módulos. Si tienes una fecha comercial en mente (temporada alta, lanzamiento, feria), conviene partir la conversación con esa fecha sobre la mesa.

## Tres preguntas para decidir sin equivocarte

1. **¿Qué te falta hoy: clientes, ventas cerradas u orden interno?** Si te faltan clientes, página web. Si tienes demanda pero pierdes ventas por fricción de pago o demora en responder, tienda online (o catálogo por WhatsApp). Si la demanda existe pero la operación se te escapa, sistema web.
2. **¿Tus productos tienen precio fijo o todo se cotiza?** Precio fijo apunta a tienda; cotización caso a caso apunta a página web con un buen formulario.
3. **¿Cuánto tiempo pierde tu equipo cada semana en tareas repetitivas?** Si la respuesta se mide en horas (copiar pedidos, coordinar horas, responder "¿en qué va lo mío?"), un sistema web se paga solo con ese tiempo recuperado.

## Errores comunes al elegir (y cómo evitarlos)

- **Partir por la tienda online sin demanda validada.** Una tienda con carrito y pagos exige fotos, descripciones, stock al día y despacho resuelto. Si aún vendes pocas unidades a la semana, un catálogo por WhatsApp entrega el 80% del beneficio con la mitad de la inversión, y validas la demanda antes de dar el paso completo.
- **Pedir un sistema cuando el problema es comercial.** Un software a medida ordena la operación, pero si el problema es que llegan pocas cotizaciones, la inversión rinde más en una página web bien posicionada. Primero llenar el embudo, después automatizar lo que corre por dentro.
- **Comprar "todo junto" el día uno.** Los proyectos gigantes de una sola vez demoran más, cuestan más y llegan con funcionalidades que nadie usa. Definir una primera etapa que resuelva el dolor principal permite lanzar antes y decidir las siguientes etapas con datos reales.
- **Elegir por precio sin comparar alcance.** Una tienda "más barata" sin integración de pagos chilenos, o un sistema sin capacitación ni soporte, termina costando más caro cuando hay que rehacerlo.

## Cómo evoluciona un proyecto típico en la práctica

El patrón que más se repite entre negocios chilenos es gradual. Primera etapa: un sitio corporativo con SEO local y WhatsApp que empieza a captar cotizaciones de Google. Segunda etapa: cuando los pedidos se vuelven repetitivos, se suma un catálogo o una tienda con Webpay para cerrar la venta sin fricción. Tercera etapa: con la demanda funcionando, un sistema toma la posta puertas adentro: pedidos que dejan de copiarse a mano, agenda que se administra sola, reportes que muestran qué producto o servicio deja margen.

Cada etapa se financia con los resultados de la anterior, y como todo se construye sobre la misma base, el negocio avanza sin botar lo ya invertido.

## Si estás partiendo, parte simple

La ruta que mejor les resulta a los negocios chilenos es incremental: primero una página web que capte clientes (desde $99.990 + IVA), luego un catálogo o tienda cuando el volumen lo justifique, y un sistema cuando la operación lo pida a gritos. Construir sobre una base bien hecha evita pagar dos veces.

Si quieres un valor referencial para tu caso, el [cotizador online](/cotizador) te lo entrega en minutos; y si prefieres conversarlo, en [desarrollo web](/desarrollo-web) está el detalle de cómo trabajamos cada tipo de proyecto.

## Sigue aprendiendo

- [¿Cuánto cuesta una página web para una empresa en Chile? Precios 2026](/blog/cuanto-cuesta-pagina-web-empresa-chile)
- [Qué debe tener una página web profesional para una pyme chilena](/blog/que-debe-tener-pagina-web-profesional-pyme)
- Todos los precios vigentes están siempre actualizados en [la página de planes](/planes).$md$,
  'Guías de decisión',
  '{"tienda online","sistema web","página web","comparativa","ecommerce"}',
  8,
  'Eduardo Ávila',
  'published',
  'Página web, tienda online o sistema web: cuál elegir',
  'Compara página web, tienda online y sistema web con precios reales en Chile, casos de uso típicos y tres preguntas simples para elegir según tu negocio.',
  now(),
  now(),
  now()
)
on conflict (slug) do nothing;

-- Fuerza recarga del schema cache de PostgREST.
notify pgrst, 'reload schema';
