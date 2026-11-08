# Diseño visual público — 08-11-2026

La web pública utiliza una composición editorial con fondos claros, tipografía de mayor escala, navegación compacta, imágenes de producto y componentes con bordes discretos. El tema se limita a `AppShell.public-site`; los accesos de clientes y administración mantienen su presentación independiente.

## Proyectos

- **Fenice:** captura del sitio público `https://fenice.cl`, obtenida el 08-11-2026. Sustituye la fotografía del camión en el portafolio y la ficha del proyecto.
- **Denurvia:** captura del sitio público `https://denurvia.cl`, obtenida el 08-11-2026. Incluye enlaces a su sitio y a la página del producto dentro de Zyteron.
- **Control de Flota:** captura de una copia local aislada del software, con proveedores de demostración y sin archivos de entorno de producción. Los datos proceden del generador ficticio. No aparecen nombres de personas, patentes ni etiquetas de clientes. La presentación identifica la vista como demostración.
- **Centro de Caja:** vista vectorial ilustrativa con productos y valores ficticios. No contiene la captura anterior ni datos de operación. La identidad pública se sustituye en la ficha, metadatos y referencias comerciales sin alterar el registro administrativo.

## Cobertura

Portada, navegación, pie de página, portafolio, fichas de proyectos, plantillas de servicios, precios, contacto, recursos y demás páginas públicas comparten el sistema visual. Denurvia y Control de Flota incorporan vistas amplias de sus interfaces.

Las rutas, canonical, datos estructurados y estructura de títulos se conservan. La ficha de Centro de Caja mantiene su URL histórica para conservar los enlaces existentes; su nombre y descripción públicos se actualizan. Los precios y condiciones proceden de la configuración comercial existente.

## Validación local

- Compilación de producción y comprobación de TypeScript.
- ESLint y comprobación de espacios del diff.
- 528 pruebas existentes y 2 pruebas de presentación pública: identidad, imágenes y conservación del registro administrativo.
- 32 combinaciones de página y ancho de pantalla, con controles de accesibilidad, errores de JavaScript y desbordamiento horizontal.
- 20 vistas adicionales de proyectos, productos, servicios, empresa, preguntas frecuentes y privacidad.
- Cuatro comprobaciones del formulario con respuestas simuladas y 14 estados del cotizador.
- Menú móvil: apertura, navegación por teclado y cierre con Escape.
- Actualización del grafo mediante `graphify update .`.

Las pruebas locales de formularios usan respuestas simuladas; no crean consultas comerciales. La validación del diseño no modifica el estado documentado de las integraciones, la analítica o la base de datos.

## Evidencia

Capturas, fixtures públicos y resultados locales: `output/visual-redesign-08-11-2026/`, excluido del repositorio. Las únicas imágenes destinadas a publicación están en `public/projects/`.

El servicio de publicación es ZYTERON, en Render, conectado a la rama `main` de `iag-lol/ZYTERON`, con despliegue manual. La revisión publicada anterior al cambio visual es `58249dee2b15c8eceb03cd0edb9baf1f1c31c749`.
