# Notificaciones de la app Zyteron

Esta función pertenece a la aplicación web instalable (PWA), no al widget nativo de macOS.

## Preparación del servidor

No requiere una tabla nueva. Las suscripciones usan el almacén `Setting` que ya
forma parte de Zyteron. Si se definen claves VAPID en producción, el backend las
usa. Si no existen, genera y conserva automáticamente un par estable al abrir la
campana por primera vez. Las claves y suscripciones se cifran con
`NEXTAUTH_SECRET` (o `WIDGET_SESSION_SECRET`) antes de guardarse.

Opcionalmente se puede generar el par de forma manual:

```bash
npx web-push generate-vapid-keys
```

Configurar en el servicio de producción `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` y volver a desplegar. No se debe cambiar
el par después de registrar dispositivos.

## Activación por dispositivo

Abre el panel administrativo, pulsa la campana y selecciona **Activar en este
dispositivo**. El botón **Enviar prueba** confirma que el aviso llega con la app
cerrada.

- macOS y Windows: funciona desde la PWA instalada o un navegador compatible.
- Android: funciona en Chrome y navegadores compatibles.
- iPhone/iPad: primero usa Compartir → Agregar a pantalla de inicio; Apple solo
  permite Web Push para una aplicación web abierta desde su icono instalado.

Cada equipo se registra por separado y puede desactivarse desde la misma campana.
