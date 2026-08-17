# ZARA — Ejecutiva Comercial de Zyteron

Módulo comercial dentro del panel administrativo.

---

## 1. Identidad de Zara (regla de producto)

Zara se presenta ante clientes como **Zara · Ejecutiva Comercial · Zyteron SpA**.

**Nunca** aparecen en correos hacia clientes: "IA", "inteligencia artificial", "AI", "bot", "robot", "asistente IA", "generado automáticamente". Esto se aplica con una barrera en código (`findForbiddenClientTerms` en `rules.ts`): si el texto contiene alguno de esos términos, **el envío se bloquea** antes de salir.

**Pero no se miente.** Si un cliente pregunta directamente si habla con una persona, Zara responde con honestidad, de forma breve, y continúa con la atención comercial. Esa instrucción (`HONESTY_RULE`) está en todos los prompts de redacción.

La firma, el nombre y el cargo son configurables (`zara_name`, `zara_role`, `zara_signature`, `mailbox_address`) — nada está fijo en el código.

---

## 2. Estado del sistema

| Módulo | Estado |
|---|---|
| CRM comercial | Operativo |
| Importador XLSX/CSV | Operativo |
| Deduplicación | Operativo · 15 pruebas |
| Historial append-only | Operativo |
| Cerebro con Zod | Operativo |
| Control de presupuesto | Operativo · 3 pruebas |
| Auditoría de consumo | Operativo |
| Pausar Zara | Operativo |
| Do Not Contact | Operativo · 7 pruebas |
| OAuth Microsoft | Implementado · **requiere credenciales** |
| Correo saliente | Implementado · **requiere credenciales** |
| Correo entrante | Implementado · **requiere credenciales** |
| Hilos de Outlook | Implementado · **requiere credenciales** |
| Webhook | Implementado y probado (handshake + clientState) |
| Renovación de webhook | Implementado en el cron |
| Seguimientos | Operativo · 7 pruebas |
| Oportunidades dormidas | Operativo |
| Ganado → Clientes | Operativo |
| Formularios web → CRM | Operativo (contacto y cotizador) |
| Notificaciones | Operativo |
| Dashboard | Operativo |
| Campañas | Tablas y filtros listos; **falta la UI** |

---

## 3. NECESITO TU INTERVENCIÓN

### 3.1 Migraciones de base de datos

**Servicio:** Supabase
**Ruta:** Editor SQL de tu proyecto
**Acción:** ejecutar en este orden, una sola vez cada uno:

1. `supabase/sales_ai_zara.sql` (si aún no lo corriste)
2. `supabase/sales_ai_zara_fase2.sql`

**Resultado esperado:** 16 tablas con prefijo `sales_`. Ambos scripts son idempotentes y no tocan tus tablas existentes.

---

### 3.2 Credenciales de Microsoft Graph

**Servicio:** Azure / Microsoft Entra ID
**Ruta:** <https://portal.azure.com> → Microsoft Entra ID → Registros de aplicaciones → Nuevo registro

**Acción:**
1. Nombre: `Zyteron Zara`. Cuentas: *solo este directorio organizativo*.
2. URI de redirección (Web): `https://www.zyteron.cl/api/admin/sales-ai/mail/callback`
3. Anota **Id. de aplicación (cliente)** y **Id. de directorio (inquilino)**.
4. **Certificados y secretos → Nuevo secreto de cliente** → copia el *Valor* (se muestra una sola vez).
5. **Permisos de API → Microsoft Graph → Permisos delegados**: `Mail.Read`, `Mail.Send`, `Mail.ReadWrite`, `offline_access`, `User.Read` → **Conceder consentimiento del administrador**.

**Valor:** en Render → Environment (nunca por chat):

```
MS_GRAPH_CLIENT_ID=<Id. de aplicación>
MS_GRAPH_TENANT_ID=<Id. de directorio>
MS_GRAPH_CLIENT_SECRET=<Valor del secreto>
MS_GRAPH_REDIRECT_URI=https://www.zyteron.cl/api/admin/sales-ai/mail/callback
SALES_AI_ENCRYPTION_KEY=<genera con: openssl rand -base64 32>
SALES_AI_CRON_SECRET=<genera con: openssl rand -base64 32>
```

**Resultado esperado:** en Zara → Configuración aparece el botón "Conectar correo". Al pulsarlo vas a Microsoft, autorizas, y vuelves con el buzón conectado.

> El secreto de Azure **caduca** (12 o 24 meses). Anota la fecha: cuando venza, el correo deja de funcionar hasta renovarlo en el mismo lugar.

---

### 3.3 Cron de tareas programadas

**Servicio:** Render
**Ruta:** New → Cron Job (o el scheduler que uses)
**Acción:** programar cada 30 minutos:

```
curl -X POST https://www.zyteron.cl/api/sales-ai/cron \
  -H "Authorization: Bearer $SALES_AI_CRON_SECRET"
```

**Resultado esperado:** renovación del webhook antes de vencer, envío de seguimientos que corresponda y detección de oportunidades dormidas.

---

### 3.4 Buzón de correo

**Servicio:** Microsoft 365
**Acción:** crear o habilitar el buzón `zara@zyteron.cl` y usar esa cuenta al autorizar en el paso 3.2.
**Resultado esperado:** la dirección queda guardada sola en `mailbox_address` tras conectar.

---

## 4. Arquitectura

```
Admin Zyteron
  └─ /admin/ventas-ia/*          (6 páginas, protegidas por sesión admin)
       ↓
  /api/admin/sales-ai/*          (import, settings, mail · exigen sesión)
  /api/sales-ai/webhook          (público, valida clientState de Microsoft)
  /api/sales-ai/cron             (público, valida Bearer secreto)
       ↓
  src/lib/sales-ai/
    rules.ts          reglas puras y testeables (sin IO)
    repository.ts     CRM, historial, deduplicación
    importer.ts       XLSX/CSV
    settings.ts       configuración cacheada
    budget.ts         control de gasto
    crypto.ts         cifrado AES-256-GCM de tokens
    graph-client.ts   OAuth, envío, hilos, suscripciones
    mailer.ts         barreras de envío + rebotes
    inbound.ts        procesamiento de correo entrante
    followups.ts      seguimientos y oportunidades dormidas
    conversion.ts     Ganado → Clientes
    web-leads.ts      formularios públicos → CRM
    zara-brain.ts     análisis y redacción (Zod)
    zara-identity.ts  identidad comercial y honestidad
       ↓
  Supabase (16 tablas sales_*) · Microsoft Graph · OpenAI (runtime existente)
```

---

## 5. Flujo de correo entrante

```
Microsoft Graph → webhook → valida clientState → toma solo el messageId
   → consulta el mensaje REAL a Graph (nunca confía en el payload)
   → ¿es nuestro propio envío? se ignora
   → ¿es rebote? marca el correo inválido y cancela seguimientos
   → guarda el mensaje SIEMPRE (antes de analizar)
   → ¿pide no contactar? do_not_contact + cancela todo  [sin IA]
   → ¿fuera de oficina? no es interés comercial          [sin IA]
   → cancela seguimientos pendientes                     [sin IA]
   → analiza intención con Zara                          [IA]
   → actualiza estado si confianza ≥ 0.80
   → prepara borrador para aprobación
   → notifica al administrador
```

Guardar antes de analizar es deliberado: aunque falle la IA o se acabe el presupuesto, **ningún correo se pierde**.

---

## 6. Estrategia de bajo costo

Orden de decisión aplicado en el código:

1. ¿Se puede resolver con código? → **no se usa OpenAI**. Así funcionan: deduplicación, opt-out, fuera de oficina, rebotes, cancelación de seguimientos, límites de envío, estadísticas y detección de dormidas.
2. ¿El dato ya está en Supabase? → no se vuelve a investigar.
3. ¿Ya venía en el Excel? → no se reanaliza.
4. ¿Hace falta comprender lenguaje natural? → recién ahí se llama a OpenAI.

Además, al redactar se envía **solo contexto relevante**: ficha de la empresa, 15 eventos del historial, 5 mensajes del hilo recortados y precios reales. Nunca la base completa. Las citas del mensaje anterior se recortan antes de enviar (`stripQuotedReply`).

**Umbrales:** 80% avisa · 90% suspende tareas masivas (incluida la personalización de seguimientos, que cae al texto base) · 100% solo tareas esenciales. Recepción, CRM, historial y acciones manuales siguen funcionando siempre.

Los precios por modelo viven en `sales_settings.ai_model_prices`, **no en el código**.

---

## 7. Seguridad

- Tokens de Microsoft cifrados con **AES-256-GCM** antes de guardarse. Nunca en texto plano ni en el navegador.
- Webhook: responde el `validationToken`, valida `clientState` en **tiempo constante** y descarta lo que no calce. No ejecuta nada con el payload; siempre reconsulta a Graph.
- Cron protegido por secreto compartido, comparado en tiempo constante.
- Todas las rutas `/admin/ventas-ia/*` → 307 al login sin sesión. Todas las APIs de admin → 401.
- RLS activo en las 16 tablas, sin políticas públicas.
- Verificado: **cero secretos** en el HTML público y en los bundles JS servidos.

---

## 8. Pruebas

```
npm test
```

**30 pruebas, 30 pasan** (`src/lib/sales-ai/rules.test.ts`), sin dependencias nuevas: usan el runner de Node.

Cubren: deduplicación (email, dominio, nombre, RUT, teléfono), opt-out, respuestas automáticas, rebotes, terminología prohibida, política de escalamiento, las 7 condiciones de cancelación de seguimientos, umbrales de presupuesto y mapeo de columnas del importador.

### Probado end-to-end contra servidor real

| Escenario | Resultado |
|---|---|
| Webhook: handshake de validación | Devuelve el token en texto plano |
| Webhook: `clientState` inválido | `accepted: 0`, se descarta |
| Cron sin secreto / con secreto erróneo | Rechazado |
| APIs de correo sin sesión | 401 |
| Rutas de Zara sin sesión | 307 al login |
| Sitio público y portales | 200, sin cambios |
| Fuga de secretos | 0 coincidencias |

### No probado todavía (requiere credenciales)

Envío real, recepción real, hilos de Outlook y renovación real de la suscripción. **No los declaro OK porque no los he ejecutado contra Microsoft.**

---

## 9. Go-live gradual

Arranca en la etapa más conservadora y así se queda hasta que tú decidas:

- `test_mode = true` → los correos se redirigen al destinatario de pruebas, nunca a un prospecto real.
- `auto_reply_enabled = false` → todo borrador espera aprobación humana.
- Límites de envío: 30 al día, 10 por hora.

Siempre exigen aprobación, aunque actives la automatización: descuentos, negociación, reclamos, contratos, temas legales, proyectos fuera de catálogo y baja confianza.

---

## 10. Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| "El buzón no está conectado" | No se completó el OAuth | Zara → Configuración → Conectar correo |
| Dejan de llegar correos | Suscripción vencida | Verifica el cron; renueva manualmente desde Configuración |
| "Microsoft rechazó la solicitud de token" | Secreto de Azure caducado | Genera uno nuevo y actualiza `MS_GRAPH_CLIENT_SECRET` |
| Los envíos no salen | `test_mode` activo sin destinatario | Define `test_mode_recipient` o desactiva el modo prueba |
| "Presupuesto de IA agotado" | Límite mensual alcanzado | Sube el límite en Configuración o espera al mes siguiente |
| Borradores sin generarse | Zara pausada | Reanuda desde Configuración |
| Tablas inexistentes | Falta la migración | Ejecuta los dos SQL del punto 3.1 |

---

## 11. Rollback

1. **Solo la interfaz:** quita el grupo "ZARA" de `src/components/admin/admin-sidebar.tsx`.
2. **Desconectar el correo:** Configuración → eliminar suscripción; o borra la fila de `sales_mail_account`.
3. **Desenganchar los formularios:** quita las llamadas a `registerWebLeadSafe` en `src/app/api/contacto/route.ts` y `src/app/api/cotizador/route.ts`. Los formularios siguen funcionando igual: esa llamada nunca lanza ni altera su respuesta.
4. **Módulo completo:** borra `src/lib/sales-ai/`, `src/app/admin/(protected)/ventas-ia/`, `src/app/api/admin/sales-ai/`, `src/app/api/sales-ai/` y `src/components/admin/sales-ai/`.
5. **Base de datos:** bloques `DROP` comentados al final de cada migración (primero fase 2, después la base).

Nada de esto afecta a `Lead`, `User`, `Cotizacion`, órdenes de trabajo ni al resto del admin.

---

## 12. Pendiente

1. UI de campañas (tablas, filtros y limitador ya existen).
2. Pruebas reales contra Microsoft, cuando estén las credenciales.
3. Panel de presupuestos comerciales (`sales_proposals` ya está creada).
4. Estadísticas históricas por rubro y motivo de pérdida.
