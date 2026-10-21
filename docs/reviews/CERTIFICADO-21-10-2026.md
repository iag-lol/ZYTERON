# Preparación del certificado digital — 21-10-2026

Certificado Acepta adquirido, activado y descargado. PFX abierto por el titular mediante ingreso privado de su clave en Terminal. Exportación cifrada real verificada localmente: llave RSA de 2048 bits coincidente, huella coincidente y vigencia hasta el 21-10-2029 a las 01:31 (America/Santiago). Directorio 0700 y archivos regulares 0600 del propietario local. No hay instalación del certificado en Render, registro de metadatos reales ni trámites o emisiones ante el SII en esta revisión.

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

1. Aprobar expresamente la transferencia del certificado cifrado, su clave de exportación y el RUT del titular al servicio ZYTERON existente en Render (`srv-d7emn6dckfvc73ekrh70`), junto con cualquier reinicio/despliegue. Las cuatro variables DTE previstas no están presentes en la configuración individual inspeccionada; no hay grupos enlazados. La versión activa sigue siendo `ecf8a5e`.
2. Instalar únicamente `DTE_CERTIFICATE_PEM`, `DTE_CERTIFICATE_PEM_PASSPHRASE`, `DTE_CERTIFICATE_SECRET_REF` y `DTE_SENDER_RUT`, preservando las demás variables. La clave original del PFX no se transfiere. Guardar o activar configuración requiere la autorización del punto anterior.
3. Verificar facultades del firmante, cadena de confianza y proceso de certificación SII. El RUT se obtuvo del campo serialNumber del titular y pasó validación de dígito verificador; eso no acredita facultades ante el SII. La exportación contiene un certificado, sin cadena intermedia adjunta.
4. Completar y validar PDF417, representación tributaria e intercambio electrónico antes de anunciar emisión operativa desde la web.

Los cambios previos de finanzas, RRHH, multimedia WhatsApp y leads permanecen en la rama local, sin publicación.
