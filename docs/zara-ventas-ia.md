# ZARA — Ejecutivo Comercial IA

Módulo comercial dentro del panel administrativo. Estado: **Fases A, B y parte de D implementadas**.

---

## 1. Qué está funcionando hoy

| Capacidad | Estado |
|---|---|
| CRM de empresas con 40+ campos | Operativo |
| Historial append-only por empresa | Operativo |
| Importador XLSX/CSV con mapeo y deduplicación | Operativo |
| Detección de duplicados (RUT, email, dominio, teléfono, nombre) | Operativo |
| Lista de no contactar / opt-out | Operativo |
| Cerebro de Zara con salida estructurada validada | Operativo (sin correo) |
| Control de presupuesto de IA | Operativo |
| Registro de actividad y costo por acción | Operativo |
| Botón de emergencia PAUSAR ZARA | Operativo |
| Modo prueba | Operativo, **activo por defecto** |
| Bandeja IA | UI lista, **requiere conectar Microsoft 365** |
| Envío y recepción de correo | **Requiere credenciales de Azure** |
| Seguimientos automáticos | Tablas y reglas listas, falta el cron |
| Campañas | Tablas listas, falta la UI |

---

## 2. Paso obligatorio antes de usar: migración

Ejecuta **una sola vez** en el editor SQL de Supabase:

```
supabase/sales_ai_zara.sql
```

Es idempotente (se puede correr varias veces) y **no toca ninguna tabla existente**. Crea 15 tablas nuevas con prefijo `sales_`. Todas quedan con RLS activo y sin políticas públicas: solo el backend con service role puede leerlas.

Para desinstalar por completo, el archivo trae al final un bloque de `DROP` comentado en el orden correcto de dependencias.

---

## 3. Lo que necesito de ti: credenciales de Microsoft Graph

El envío y la recepción de correo no pueden funcionar sin esto. **No me envíes los valores por chat**: colócalos directamente en las variables de entorno de Render.

### Dónde obtenerlos

1. Entra a <https://portal.azure.com> con la cuenta de Microsoft 365 de Zyteron.
2. Ve a **Microsoft Entra ID → Registros de aplicaciones → Nuevo registro**.
   - Nombre: `Zyteron Zara`
   - Tipos de cuenta: *Solo cuentas de este directorio organizativo*
   - URI de redirección (Web): `https://www.zyteron.cl/api/admin/sales-ai/mail/callback`
3. Al crearla anota **Id. de aplicación (cliente)** y **Id. de directorio (inquilino)**.
4. En **Certificados y secretos → Nuevo secreto de cliente**, genera uno y copia el **Valor** (solo se muestra una vez).
5. En **Permisos de API → Microsoft Graph → Permisos delegados**, agrega:
   - `Mail.Read`
   - `Mail.Send`
   - `Mail.ReadWrite`
   - `offline_access`
   - `User.Read`
   Luego pulsa **Conceder consentimiento del administrador**.

### Dónde colocarlos

En Render → tu servicio → **Environment**:

```
MS_GRAPH_CLIENT_ID=<Id. de aplicación>
MS_GRAPH_TENANT_ID=<Id. de directorio>
MS_GRAPH_CLIENT_SECRET=<Valor del secreto>
MS_GRAPH_REDIRECT_URI=https://www.zyteron.cl/api/admin/sales-ai/mail/callback
SALES_AI_ENCRYPTION_KEY=<cadena aleatoria de 32+ caracteres>
```

`SALES_AI_ENCRYPTION_KEY` cifra los tokens de Microsoft antes de guardarlos en Supabase. Genérala tú, por ejemplo con `openssl rand -base64 32`.

> **Importante:** el secreto de cliente de Azure caduca (12 o 24 meses según lo que elijas). Anota la fecha: cuando venza, el correo deja de funcionar hasta renovarlo.

---

## 4. Variables de entorno de IA

Reutilizamos la integración de OpenAI que ya existe en el proyecto. **No se crea ninguna cuenta ni suscripción nueva.**

```
OPENAI_API_KEY=<la que ya tienes configurada>   # ya existe, no la cambies
SALES_AI_MODEL=gpt-4o-mini                      # opcional; si no, usa el de la config
```

Los presupuestos y el modelo también se editan desde la interfaz en **Ventas IA → Configuración**, sin desplegar.

---

## 5. Control de costos

- Los precios por modelo **no están fijos en el código**: viven en `sales_settings.ai_model_prices` y se editan desde Supabase.
- Cada llamada registra el `usage` real que devuelve OpenAI (tokens de entrada y salida).
- Umbrales: **80%** avisa · **90%** suspende tareas masivas · **100%** solo permite tareas esenciales.
- Al 100% **siguen funcionando**: recepción de correo, CRM, historial, notificaciones y acciones manuales. Ninguna de esas consume IA.

Operaciones que **nunca** llaman a OpenAI, por diseño: contar días, detectar vencimientos, cambiar estados, verificar duplicados, importar Excel, consultar la base, calcular estadísticas.

---

## 6. Go-live gradual

El sistema arranca en la etapa más conservadora:

| Etapa | Estado inicial |
|---|---|
| 1. Todo requiere aprobación | **Activa** (`auto_reply_enabled = false`) |
| 2. Clasificación automática | Disponible al conectar el correo |
| 3. Respuestas simples automáticas | Desactivada; se habilita en Configuración |
| 4. Seguimientos automáticos | Pendiente de implementar el cron |
| 5. Mayor autonomía | Solo con datos que la respalden |

Además, **el modo prueba viene activado**: aunque conectes el correo, nada sale a prospectos reales hasta que lo desactives y definas `test_mode_recipient`.

---

## 7. Barreras de seguridad comercial

Estas reglas están en **código**, no en el prompt, así que el modelo no puede saltárselas:

- Siempre exigen aprobación humana: reclamos, negociaciones, proyectos fuera de catálogo y peticiones de no contacto.
- Se detecta por patrón: descuentos, contratos, temas legales, devoluciones y plazos urgentes.
- Zara solo puede citar precios que existan en `src/config/pricing.ts`. Si el cliente pide algo fuera de lista, debe indicar que requiere cotización y escalar.
- Toda respuesta del modelo se valida con Zod antes de ejecutar cualquier acción. Si el esquema no calza, no se hace nada y se registra el error.
- La IA nunca ejecuta SQL. Solo lee contexto ya preparado por el backend.

---

## 8. Archivos del módulo

```
supabase/sales_ai_zara.sql                        migración (15 tablas)
src/lib/sales-ai/types.ts                         estados, potenciales, eventos
src/lib/sales-ai/settings.ts                      configuración cacheada
src/lib/sales-ai/budget.ts                        control de gasto y auditoría
src/lib/sales-ai/repository.ts                    CRM, historial, deduplicación
src/lib/sales-ai/importer.ts                      lectura XLSX/CSV y validación
src/lib/sales-ai/zara-brain.ts                    análisis y redacción con Zod
src/app/api/admin/sales-ai/import/route.ts        API del importador (3 pasos)
src/app/api/admin/sales-ai/settings/route.ts      API de configuración
src/app/admin/(protected)/ventas-ia/**            6 páginas del panel
src/components/admin/sales-ai/**                  importador y controles
```

---

## 9. Pruebas realizadas

- `npm run build`: correcto, 128 rutas.
- `npx tsc --noEmit`: sin errores nuevos.
- `npx eslint`: limpio en todo el módulo.
- Rutas `/admin/ventas-ia/*`: las 6 responden **307 hacia el login** sin sesión.
- APIs `/api/admin/sales-ai/*`: responden **401** sin sesión.
- Sitio público (`/`, `/planes`, `/cotizador`, `/paginas-web-santiago`): 200, sin cambios.

**No probado todavía** (requiere la migración y las credenciales): importación real de un archivo, envío y recepción de correo, análisis de un correo real.

---

## 10. Rollback

1. **Solo la interfaz:** quita el grupo "Ventas IA" de `src/components/admin/admin-sidebar.tsx`. Las tablas quedan intactas.
2. **Módulo completo:** borra `src/lib/sales-ai/`, `src/app/admin/(protected)/ventas-ia/`, `src/app/api/admin/sales-ai/` y `src/components/admin/sales-ai/`.
3. **Base de datos:** ejecuta el bloque de `DROP` comentado al final de la migración.

Nada de esto afecta a `Lead`, `Cliente`, `Cotizacion`, órdenes de trabajo ni al resto del admin: el módulo no modifica ninguna tabla existente.

---

## 11. Lo que sigue

1. Conectar Microsoft Graph (bloqueado por las credenciales del punto 3).
2. Webhooks de correo entrante con renovación de suscripción.
3. Cron de seguimientos y detector de oportunidades dormidas.
4. Conversión de GANADO a cliente en el módulo existente.
5. UI de campañas y limitador de envíos.
6. Enganche de los formularios públicos de zyteron.cl al CRM.
