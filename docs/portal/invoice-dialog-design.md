# Modal financiero: márgenes y bordes — 13 octubre 2026

Se corrige el selector erróneo fx-drawer-.zy-full-control por fx-drawer-body. El modal recupera padding de 24px y separación de 22px, marco de 1px, radio de 18px, margen exterior y altura ajustada al contenido. La cabecera y el pie tienen separadores suaves; el cuerpo conserva desplazamiento interior para contenidos largos.

El editor de líneas de facturas y notas de crédito usa un contenedor propio para el desplazamiento horizontal. Descripción tiene más espacio que cantidad; los anchos específicos no afectan el editor contable. En móvil: marco exterior de 10px, padding interior de 18px/16px, totales apilados y acciones accesibles.

Validación local: build Next/Nest correcto y diff sin errores de espacio; modal real inspeccionado en escritorio y móvil. Escritorio: 880px de ancho, borde de 1px, radio de 18px y padding de 24px; añadir una segunda línea conserva alineación sin desborde. Móvil: ventana de 364px en viewport de 384px, tabla de 640px desplazable dentro de 330px; totales ocupan 330px y no amplían el documento. No se guardan facturas ni se tocan cuentas/datos/pagos como prueba.

Código bee2be7a3ec58ca0631cdbd01c49c713b9498063 publicado: Render dep-db6vjk0u01pc73boureg Live (2m51s). Modal real verificado en www.zyteron.cl: ancho 880px, altura 636px ajustada al contenido, borde 1px, radio18px, padding24px y contenedor de scroll de la tabla presente. Captura local docs/portal/screenshots/invoice-dialog-framed-live.png del workspace raíz; no se sube la imagen financiera al repositorio remoto. Se deja el modal vacío abierto para revisión, sin guardar documentos.
