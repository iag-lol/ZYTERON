# Monitoreo de sitios en el portal cliente

Revisión: 28-10-2026.

## Alcance y asignación

La vista incluye los monitores publicados para el cliente autenticado, habilitados y asociados a un endpoint activo de producción, de tipo WEB o CLIENT_PORTAL. La pertenencia se resuelve mediante la relación empresarial de la sesión y RLS; la API no admite seleccionar otro cliente mediante parámetros.

La vigencia técnica corresponde a monitor.enabled y project_endpoints.active. La publicación corresponde a client_visibility=CLIENT_VISIBLE. Los endpoints internos, deshabilitados, de otros clientes o de otros ambientes no forman parte del historial compartido. El estado técnico no depende de la cobranza ni implica una autorización para consultar credenciales.

Fenice tiene dos sitios asignados: Fenice.cl, https://www.fenice.cl/, y Web GPS, https://fleet.fenice.cl/. Ambos monitores ya estaban habilitados con intervalo de cinco minutos; su visibilidad era INTERNAL. Su publicación mediante la API administrativa respondió 200 en ambos casos. No se crearon monitores duplicados ni se modificaron intervalos, umbrales o destinos.

## Dos semanas de historial

El período comienza el lunes de la semana pasada y termina al finalizar el domingo de la semana actual, usando America/Santiago. Las fechas se presentan como dd-mm-aaaa y las horas como hh:mm, en formato de 24 horas. Los cambios de hora se resuelven como días reales de 23 o 25 horas.

El calendario mantiene 14 fechas. Los días futuros aparecen por transcurrir y los períodos sin muestras permanecen sin datos. Seleccionar un día muestra comprobaciones, fallos, mantenciones, respuesta media, cobertura y el detalle por hora. El gráfico diario compara respuesta media y P95 sin unir períodos sin mediciones.

Las tarjetas comparan disponibilidad de la semana pasada y la actual, con sus muestras evaluadas. También presentan respuesta media, P95, última comprobación, HTTP, certificado TLS y vencimiento. El resumen general pondera las muestras de cada sitio; no promedia porcentajes entre sitios.

El historial incorpora hasta 20 comprobaciones fallidas recientes por sitio, con fecha, respuesta HTTP y tiempo observado. Las incidencias muestran sólo el resumen expresamente publicado para el cliente; se excluyen descripciones, causas y notas internas.

## Cálculos y actualización

- Disponibilidad medida: comprobaciones exitosas divididas por comprobaciones evaluadas. Sin muestras evaluadas, el porcentaje es nulo.
- Mantenciones: se aplica uptime_maintenance_policy. La configuración comprobada en producción es EXCLUDE.
- Latencia: sólo respuestas exitosas evaluadas con tiempo medido. El P95 requiere al menos 20 muestras y se calcula sobre muestras originales mediante percentile_cont.
- Cobertura: comprobaciones programadas registradas frente a las esperadas por intervalo y tiempo transcurrido desde la activación. Las comprobaciones manuales no aumentan la cobertura; no supera el 100 %.
- Estado actual: una última medición con antigüedad superior a tres intervalos, con mínimo de tres minutos, se presenta sin datos recientes.
- Actualización: lectura automática cada minuto mientras la pestaña está visible, al volver a ella y mediante Actualizar datos. La lectura no ejecuta comprobaciones HTTP nuevas. Las peticiones tienen límite de 20 segundos y se cancelan al abandonar la vista.

La página de monitoreo obtiene un historial inicial en servidor. La API /api/portal/monitoring/status consulta únicamente monitoreo y devuelve una respuesta privada sin caché. Un fallo temporal conserva los datos con su fecha de consulta; una respuesta 401 o 403 retira el historial de la vista.

Los datos originales se conservan actualmente durante 30 días, suficientes para las dos semanas calendario. Si se cambia la retención, debe mantenerse al menos el intervalo que se desea visualizar. La existencia de un calendario no reconstruye mediciones eliminadas.

## Seguridad y comprobaciones

La migración 20261028073000_client_monitoring_history.sql se aplicó después de validar su ejecución transaccional. Concede al rol del portal únicamente las columnas necesarias. Las políticas verifican cliente, publicación, vigencia y módulo habilitado. Los mensajes de error internos y root_cause permanecen sin permiso de lectura, y el cliente no recibe permisos de escritura.

La prueba transaccional en PostgreSQL comprobó lectura propia, rechazo de otro cliente, bloqueo de escritura, ocultamiento al despublicar el monitor o desactivar el endpoint y respeto del interruptor del módulo. Todos sus cambios se revirtieron.

Las pruebas dirigidas cubren semanas de Chile, cambio de hora, huecos, períodos futuros, mantenciones, ponderación, estado vencido, cobertura, incidencias y fallos del sitio correcto, junto con regresiones de presentación del portal. La lectura real con el rol de Fenice devuelve ambos sitios y 14 días por sitio. El render HTML con datos reales pasó sin advertencias.

## Publicación

Repositorio publicado: iag-lol/ZYTERON. Servicio Render: srv-d7emn6dckfvc73ekrh70. La versión Live comprobada al inicio es 6bd38df6da8522ef77531589d8318c70669a57eb. La migración y la publicación de los dos monitores están aplicadas. El nuevo componente continúa pendiente de revisión visual y despliegue; el acceso a las ventanas del Mac devuelve cgWindowNotFound.
