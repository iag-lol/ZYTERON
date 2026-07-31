# Widget de escritorio de Zyteron para macOS

## Resumen técnico auditado

La aplicación descargable existente es una PWA de Next.js 16 (App Router),
React 19 y TypeScript. La instalación se habilita mediante
`public/manifest.webmanifest`, `public/sw.js` y `src/components/pwa-register.tsx`.
No existe Electron, Tauri ni una aplicación Swift previa que pueda alojar una
extensión WidgetKit. Por eso se conserva la PWA y se agrega únicamente un
compañero nativo mínimo en `macos/ZyteronWidget`.

El backend combina PostgreSQL/Prisma con Supabase. Las consultas privilegiadas
se realizan en el servidor con `SUPABASE_SERVICE_ROLE_KEY`; la app de macOS no
recibe esa clave ni una anon key. La sesión del widget se obtiene validando la
misma contraseña del acceso administrativo actual (`ADMIN_PASSWORD`) y se
representa con un token HMAC limitado al rol `ADMIN`. El token y la URL quedan
en el Keychain compartido de macOS. La app y la extensión mantienen su propio
snapshot dentro de sus contenedores App Sandbox, por lo que la compilación para
uso personal no depende de App Groups de pago.

### Fuentes reales utilizadas

| Información | Tabla y campos reales |
| --- | --- |
| Contactos/formulario/chat web | `Lead`: `id`, `name`, `email`, `phone`, `source`, `message`, `type`, `createdAt` |
| Cotizaciones | `Quote`: `id`, `name`, `company`, `status`, `createdAt` |
| WhatsApp | `whatsapp_conversations`: `id`, `customer_name`, `profile_name`, `phone`, `unread_count`, `lead_status`, `priority`, `last_message_at`; `whatsapp_messages`: `conversation_id`, `direction`, `content`, `message_type`, `created_at` |
| Referidos de partners/ejecutivos | `commercial_leads`: `owner_id`, `validation_status`, `commercial_status`, `next_follow_up_at`, `created_at`; `commercial_users`: `id`, `name`, `role` |
| Clientes del portal | `User`: `id`, `name`, `email`, `role`, `accountStatus`, `createdAt` (auditado, no se usa para atribuir referidos) |

Los roles comerciales reales son `executive`, `portfolio` y `partner`.
“Cliente potencial” usa `commercial_leads.validation_status = potential` y
“ganado” usa `commercial_leads.commercial_status = won`. Los pendientes de
WhatsApp provienen de `whatsapp_conversations.unread_count`.

Las rutas de interacción son `/admin/whatsapp`, `/admin/contactos`,
`/admin/cotizaciones` y `/admin/comercial?tab=leads`. Se agregó la ficha
`/admin/contactos/[id]`; WhatsApp acepta `?conversation=<id>` para abrir la
conversación indicada.

## Arquitectura implementada

- `POST /api/admin/widget/session`: valida `ADMIN_PASSWORD`, aplica límite de
  intentos y entrega una sesión firmada con rol `ADMIN`.
- `GET /api/admin/widget/session`: permite comprobar vigencia del token.
- `GET /api/admin/widget/dashboard`: vuelve a validar el token y genera un DTO
  mínimo con métricas, alertas y listas recientes. No cachea respuestas HTTP.
- La extensión WidgetKit solicita un snapshot aproximadamente cada 15 minutos.
  macOS puede espaciar ese intervalo según batería y uso.
- El botón de recarga usa un `AppIntent`. Cada target guarda de forma atómica
  su último snapshot válido para estados sin conexión.
- La app compañera revisa cada cinco minutos mientras está abierta y emite
  avisos locales por aumentos de contactos, cotizaciones, WhatsApp, web,
  partners y ejecutivos. Avisos garantizados con la app cerrada requerirían
  APNs y un proveedor push, que el proyecto actual no tiene.
- Los widgets pequeño, mediano y grande usan colores del logo real de Zyteron,
  colores semánticos de macOS y se adaptan a modo claro/oscuro.

## Variables de entorno

Obligatorias en el servidor desplegado:

```dotenv
ADMIN_PASSWORD=una-clave-administrativa-fuerte
SUPABASE_URL=https://proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=clave-solo-servidor
```

Para firmar el token se necesita una de estas dos opciones:

```dotenv
WIDGET_SESSION_SECRET=secreto-aleatorio-de-al-menos-32-bytes
# o reutilizar el NEXTAUTH_SECRET ya configurado
NEXTAUTH_SECRET=secreto-existente
```

Opcional:

```dotenv
# 1 a 720 horas; por defecto 168 (7 días)
WIDGET_SESSION_TTL_HOURS=168
```

`WIDGET_SESSION_SECRET` y `WIDGET_SESSION_TTL_HOURS` son variables nuevas. No
se deben prefijar con `NEXT_PUBLIC_`. La URL pública se ingresa en la app del
Mac y debe ser HTTPS, salvo `localhost` durante desarrollo.

## Compilar e instalar

Requisitos: macOS 14 o posterior y Xcode 16 o posterior.

1. Despliega primero el backend Next.js con las variables anteriores.
2. Abre `macos/ZyteronWidget/ZyteronWidget.xcodeproj` en Xcode.
3. En **Signing & Capabilities**, selecciona tu Apple Development Team para
   los targets `ZyteronWidget` y `ZyteronWidgetExtension`.
4. Verifica que ambos targets tengan App Sandbox, acceso de red saliente y
   Keychain Sharing (`cl.zyteron.widget.shared`). Xcode agregará el prefijo de
   tu Team. No agregues App Groups: un Personal Team gratuito no los incluye y
   esta implementación no los necesita.
5. Si los bundle IDs ya pertenecen a otro equipo, cámbialos en `project.yml` y
   vuelve a generar el proyecto con:

   ```bash
   brew install xcodegen
   cd macos/ZyteronWidget
   xcodegen generate
   ```

6. Selecciona el esquema **ZyteronWidget** y **My Mac**, luego ejecuta con
   **Product > Run**. Para una copia permanente usa **Product > Archive >
   Distribute App > Copy App** y mueve `Zyteron Widget.app` a `/Applications`.
7. Abre la app, ingresa la URL pública de Zyteron y la contraseña
   administrativa. Acepta las notificaciones si quieres avisos locales.

La compilación reproducible sin firma usada durante el desarrollo es:

```bash
cd macos/ZyteronWidget
xcodegen generate
xcodebuild -project ZyteronWidget.xcodeproj \
  -scheme ZyteronWidget -configuration Debug \
  -derivedDataPath .derived CODE_SIGNING_ALLOWED=NO build
```

## Agregar al escritorio

1. Ejecuta al menos una vez `Zyteron Widget.app` e inicia sesión.
2. Haz Control-clic sobre el escritorio y elige **Editar widgets**.
3. Busca **Panel Zyteron**.
4. Arrastra al escritorio el tamaño pequeño, mediano o grande.

Si macOS todavía no muestra la extensión, cierra y vuelve a abrir la app. En
desarrollo también puede ser necesario terminar la ejecución en Xcode y
abrir la app compilada una vez desde Finder.

## Archivos creados o modificados

- `src/lib/widget/auth.ts`: emisión y validación del token administrativo.
- `src/lib/widget/dashboard.ts`: agregación server-only sobre tablas reales.
- `src/app/api/admin/widget/*`: endpoints de sesión y snapshot.
- `src/app/admin/(protected)/contactos/[id]/page.tsx`: ficha navegable del
  contacto.
- `src/app/admin/(protected)/whatsapp/page.tsx` y
  `src/components/admin/whatsapp/whatsapp-inbox.tsx`: apertura directa de una
  conversación.
- `src/app/admin/(protected)/comercial/page.tsx` y
  `src/components/admin/commercial-hub.tsx`: apertura directa de registros.
- `macos/ZyteronWidget/Shared`: modelos, API, Keychain, caché y configuración.
- `macos/ZyteronWidget/App`: app SwiftUI de sesión, estado y notificaciones.
- `macos/ZyteronWidget/Widget`: extensión WidgetKit y sus tres presentaciones.
- `macos/ZyteronWidget/project.yml` y `ZyteronWidget.xcodeproj`: proyecto
  regenerable y listo para seleccionar el Team de firma.

## Pasos manuales pendientes

- Configurar las variables nuevas en el proveedor donde está desplegado
  Next.js y volver a desplegar.
- Seleccionar el Apple Development Team y firmar App Sandbox y Keychain
  Sharing; esos recursos dependen de la cuenta Apple del dueño.
- Instalar la app y agregar el widget desde la galería de macOS.

No hay migraciones SQL nuevas: el widget usa las tablas ya presentes en el
proyecto y tolera fuentes temporalmente no disponibles mostrando el snapshot
guardado como desactualizado.
