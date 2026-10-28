# Calendario mensual del portal cliente

Revisión: 28-10-2026.

## Fechas y continuidad

Pagos y facturas → Calendario incorpora las mensualidades asignadas y las programaciones comerciales y de Finanzas. Las mensualidades con fecha guardada en administración se proyectan en ese día de cada mes, aunque todavía no exista un cobro o una factura. No hay un número de cuotas implícito: los acuerdos indefinidos se calculan para el año consultado. Una pausa, cancelación o archivo administrativo detiene las previsiones; los planes de Finanzas con un número explícito de cuotas terminan en la última.

En el calendario comercial, guardar el primer vencimiento y el día mensual comparte la previsión con el cliente. La activación de emisión de cobros sigue siendo una operación separada. La previsión no autoriza cargos en tarjeta ni sustituye el calendario del proveedor de una suscripción Flow activa. Las fechas de los días 29, 30 y 31 se ajustan a febrero o al último día de un mes corto, conservando el día original para los meses siguientes.

Los planes de Finanzas aportan fecha inicial, día de pago, importe, moneda, duración y estado. Las cuotas pagadas y canceladas no vuelven a proyectarse. Se respetan los cambios de fecha e importe de las cuotas existentes. Un cobro emitido vinculado a la misma mensualidad y mes sustituye la previsión, incluso cuando su saldo ya está pagado.

Las mensualidades asignadas que aún no tengan una fecha válida aparecen dentro del mes actual y los siguientes como «Mensualidades previstas este mes», con fecha de pago por confirmar. Su importe participa en el resumen de previsiones, conservando su moneda. No se les asigna un día ficticio ni se incluyen como saldo pendiente emitido. Los meses anteriores a la consulta no reciben nuevas previsiones sin fecha.

La sesión utiliza el cliente autenticado. La actualización del portal se ejecuta cada 30 segundos con la pestaña visible, al recuperar foco y mediante Actualizar. El cambio de mes y año calcula las previsiones a partir de la configuración recibida; no depende de un horizonte corto de facturas ya materializadas.

## Fenice

Las cotizaciones vigentes COT-2026-06963 ($133.242) y COT-C9DF0F84 ($280.514) tienen primer vencimiento previsto el 18-11-2026 y día mensual 18. Total mensual previsto: $413.756 CLP. La configuración se guardó mediante la API administrativa, respuesta 200 para ambas, sin crear planes de cobranza ni cargos automáticos. Se conservaron las reglas previas de recordatorios, suspensión y autorización de Flow.

Los pagos de octubre permanecen registrados. La lectura real completa conserva cuatro proyectos, 14 documentos, 13 pagos y el saldo pendiente de $1.368.100. Las dos previsiones de noviembre aparecen el 18-11-2026.

## Acceso y verificación

La migración 20261028090000_client_recurring_calendars.sql concede lectura de las columnas de calendario necesarias al rol aislado del portal. RLS comprueba pertenencia empresarial, sesión activa y módulo de facturas habilitado. Las configuraciones de cotizaciones nativas respetan sus identificadores de vista. Las cuotas de Finanzas deben pertenecer al mismo cliente, cotización y plan. No se conceden escritura ni lectura de notas, razones internas o archivos privados.

La migración se comprobó primero dentro de una transacción revertida: lectura propia de fecha y plan, rechazo de otro cliente, bloqueo al desactivar el módulo, notas sin permiso y escritura rechazada. Después se aplicó en producción. La lectura mediante el código real y el rol de Fenice confirmó ambas previsiones y el resto de su información.

Pasaron 29 pruebas dirigidas y TypeScript. Incluyen navegación entre años, planes indefinidos y finitos, cancelación, días 29/30/31, cuotas modificadas, reemplazo de previsiones por cobros y monedas con decimales. ESLint conserva los mismos ocho errores y tres advertencias preexistentes de los componentes revisados; no se agregaron diagnósticos.

La compilación local de Next.js en modo `compile` también pasó mediante `next build --experimental-build-mode compile`, con una URL ficticia local y sin conexión a la base de datos de producción.

## Publicación

Repositorio iag-lol/ZYTERON. Commit publicado: 14fd51e56e8d0a6b8347cc15855a516a6f9fdaa1. Render confirmó Deploy succeeded | Live en el despliegue dep-dbgquuec6qcc73cdrutg el 28-10-2026 a las 05:20, hora de Chile. La compilación completa de backend y Next.js pasó.

La sesión real de Rubén mostró las dos previsiones de noviembre de 2026 el 18-11-2026, por $133.242 y $280.514, con total de $413.756 CLP. La revisión visual confirmó la presentación del calendario. Al seleccionar el día 18, Detalle mostró ambas mensualidades y la acción «Ver mensualidad». La navegación a diciembre de 2026 y enero de 2027 confirmó las dos previsiones el día 18 de cada mes, con los mismos importes.
