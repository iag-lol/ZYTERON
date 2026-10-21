# Preparación del certificado digital — 21-10-2026

Certificado Acepta adquirido, activado y descargado. Apertura del PFX real y validación de su llave pendientes de ingreso privado de clave en Terminal. No hay instalación del certificado en Render, registro de metadatos reales ni trámites o emisiones ante el SII en esta revisión.

## Cambios locales

- Herramienta `scripts/prepare-dte-certificate.mjs`: selección inequívoca de descarga, entrada oculta en TTY, contraseña por stdin a OpenSSL, validación de llave/certificado/vigencia y exportación cifrada con clave aleatoria.
- Salida privada fuera de Git, directorios 0700 y archivos 0600. El original no se modifica. No hay conexiones de red.
- Exclusiones Git para PFX, P12 y llaves; los PEM y archivos de entorno ya estaban excluidos.
- Procedimiento y límites documentados en `docs/FACTURACION-ELECTRONICA.md`.

## Evidencia

- 9 pruebas nuevas con certificados sintéticos: exportación cifrada y coincidencia de llave, permisos y original intacto; clave incorrecta; entrada inválida y enlaces; certificados fuera de vigencia; llaves incompatibles; destinos Git; selección ambigua; UTF-8 y ausencia de eco; cancelación y restauración de TTY.
- 382 pruebas existentes aprobadas.
- Typecheck aprobado.
- Lint de los scripts: sin errores ni avisos.
- Lint general, excluyendo artefactos `output/**`: sin errores, cinco avisos existentes en login, botón de impresión, asistente administrativo y almacenamiento DTE.
- `git diff --check`: aprobado.
- Sin cambios de aplicación o backend que requieran repetir el build ya aprobado en la revisión anterior.

## Pendientes

1. Ejecutar la preparación local mediante ingreso privado de la clave original. El control automático de aplicaciones no permite acceder a Terminal.
2. Verificar solo metadatos y permisos de la exportación real, sin copiar secretos al chat o logs.
3. Aprobar expresamente la transferencia del secreto al servicio existente y cualquier reinicio/despliegue. La compra del certificado no autoriza estas acciones por sí sola.
4. Verificar facultades del firmante, cadena de confianza y proceso de certificación SII. La herramienta local no realiza esas verificaciones.
5. Completar y validar PDF417, representación tributaria e intercambio electrónico antes de anunciar emisión operativa desde la web.

Los cambios previos de finanzas, RRHH, multimedia WhatsApp y leads permanecen en la rama local, sin publicación.
