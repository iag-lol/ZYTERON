# RRHH: SII y documentación tributaria

## Acceso y alcance

Ruta: `/administracion/hr/sii`. Disponible desde «Remuneraciones y cumplimiento» en el menú de RRHH.

El centro utiliza el motor financiero existente. No duplica el certificado, los folios, los documentos ni sus archivos. La integración conserva las doce opciones seleccionadas en la postulación: 33, 34, 39, 41, 43, 46, 52, 56, 61, 110, 111 y 112.

La presencia de una opción no acredita implementación, certificación ni autorización de producción. Los tres estados aparecen por separado. Los registros ausentes del catálogo persistente permanecen visibles como pendientes.

## Funciones

- Búsqueda por nombre o código y filtros por familia.
- Dirección propia por tipo, por ejemplo `/administracion/hr/sii/52`; permite enlaces directos y navegación Atrás/Adelante.
- Guía de antecedentes específica para cada circuito: ventas, boletas, liquidaciones, compras, despachos, ajustes y exportación. No sustituye el formato oficial ni valida por sí sola una operación.
- Consulta de requisitos del tipo seleccionado, incluidos formato implementado, certificado, resolución, habilitación, autorización de producción y folios CAF de ese tipo y ambiente.
- Prueba técnica de conexión con permiso `dte.manage`, diferenciada de la autorización para emitir. Su resultado no acredita folios, aceptación de documentos ni cumplimiento laboral.
- Registro paginado de documentos del tipo seleccionado, con ambiente, estado, Track ID y descargas XML/PDF por ID autenticado.
- Acceso al borrador existente de factura o exenta con el tipo 33 o 34 preseleccionado. Abrir el formulario no guarda ni emite documentos.
- Notas de crédito/débito vinculadas al circuito del documento original. No se generan notas sin referencia.
- Accesos a remuneraciones, LRE/DT, contratos y configuración laboral.

## Permisos y datos

Las operaciones financieras conservan su matriz de permisos. El perfil RRHH actual no tiene `dte.view`: muestra el catálogo de referencia y un estado de acceso restringido, sin consultar datos financieros. Gerencia, Finanzas y los perfiles financieros autorizados conservan sus permisos actuales. No se amplían roles ni se transfieren secretos al navegador.

Las consultas de preparación y catálogo comprueban `dte.view` en el servidor. Las descargas utilizan el endpoint financiero por ID; el navegador no recibe ni acepta rutas arbitrarias de Storage. La identidad continúa derivándose de la sesión validada por el servidor, no del rol indicado por el cliente.

No se consultan directorios amplios de colaboradores para completar el centro tributario. Navegar entre tipos no cambia estados laborales, contratos, sueldos, vacaciones ni pagos.

Las respuestas tardías se descartan al cambiar de tipo, página o perfil. Un rechazo 401/403 invalida los resultados parciales. Los errores de catálogo, requisitos y registro se muestran por separado; una fuente inaccesible no se interpreta como ausencia de datos.

Cuando falta persistencia, la preparación bloquea la emisión y el centro no presenta registros temporales como evidencia de ausencia de documentos productivos. La consulta del registro de Zyteron no equivale a una extracción completa de documentos externos del SII.

## Estado de implementación

La integración directa dispone de los formatos 33, 34, 56 y 61, pendientes de completar certificación real. Boletas, guías, factura de compra, liquidaciones y exportación conservan sus opciones y requieren sus flujos específicos antes de habilitar emisión. No se conceden autorizaciones por seleccionar un tipo en pantalla.

La postulación aceptada el 21-10-2026 permite continuar en certificación. El set oficial, CAF del ambiente de pruebas, intercambio, muestras y autorización final siguen pendientes. Esta integración no emite documentos ni solicita folios durante la navegación.

Las liquidaciones de remuneraciones son documentos laborales distintos de la liquidación factura del código 43. El LRE corresponde a la Dirección del Trabajo. El certificado y la postulación DTE no sustituyen las obligaciones laborales ni habilitan automáticamente su presentación.

El motor de remuneraciones actual constituye una preparación básica. No acredita cálculo integral de cotizaciones previsionales e impuestos ni presentación oficial. La limitación permanece visible en Remuneraciones y LRE.

## Validación y publicación

Pruebas con datos sintéticos: catálogo íntegro, permisos incorrectos, códigos inválidos, fuentes parciales, respuestas tardías, persistencia ausente, navegación, paginación y descargas por ID. La prueba visual utiliza servicios locales sin conexiones al SII ni datos de clientes o trabajadores.

Los cambios de código no implican despliegue, emisión, migración de datos ni autorización tributaria. Cualquier publicación debe identificar exactamente los commits y conservar las correcciones previas pendientes. La asignación de permisos financieros a nuevos perfiles requiere autorización expresa y revisión de su alcance.

## Referencias oficiales

- [Documentos tributarios electrónicos autorizables](https://www.sii.cl/preguntas_frecuentes/factura_electronica/001_003_6625.htm)
- [Proceso de postulación con sistema propio](https://www.sii.cl/factura_electronica/factura_mercado/proc_postulacion.htm)
- [Libro de Remuneraciones Electrónico](https://www.dt.gob.cl/portal/1628/w3-article-119846.html)
- [Etapas de certificación SII](https://www.sii.cl/servicios_online/1039-proceso_certificacion-1184.html)
