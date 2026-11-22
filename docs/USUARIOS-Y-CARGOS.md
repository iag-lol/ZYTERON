# Usuarios y cargos de Zyteron Control

## Administración

- Usuarios: `/administracion/security/users` → **Crear usuario**.
- Cargos: `/administracion/hr/positions` → **Nuevo cargo**.
- Acceso individual del equipo: `/equipo`, con RUT y contraseña.

Gerencia General y Administración de Seguridad pueden crear cuentas internas con roles sin privilegios administrativos. El formulario exige **RUT chileno con dígito verificador** y propone **Ejecutiva de ventas**. El correo se conserva como contacto y destino de recuperación, pero no se acepta como identificador de ingreso. El rol determina los permisos; el cargo laboral identifica la función y no modifica esos permisos.

Gerencia General y RR.HH. pueden crear cargos, departamentos y equipos. La creación de una cuenta no genera un expediente laboral ni modifica remuneraciones o contratos.

## Modalidades de alta

**Contraseña inicial:** la administración ingresa una contraseña de 12 a 128 caracteres con mayúsculas, minúsculas y números. Supabase Auth crea la cuenta con el rol en `app_metadata`. El correo se habilita administrativamente (`email_confirm: true`); esta modalidad no comprueba la propiedad del buzón ni envía un correo. La contraseña no se devuelve ni se incluye en la auditoría.

**Invitación:** Supabase Auth envía un enlace a `/equipo`. La persona define su contraseña después de abrirlo. Esta modalidad requiere correo de Auth y URL de redirección configurados en Supabase. La recepción del mensaje y el ingreso efectivo de la persona son verificaciones separadas del envío de la invitación.

Los correos ya registrados se rechazan antes de crear o invitar. El RUT se normaliza sin puntos y con guion, se valida mediante módulo 11 y se reserva en `control_user_login_ruts` antes del alta. Una restricción única en la base impide duplicados simultáneos y otra impide asociar dos RUT a la misma identidad. Las reservas se liberan cuando falla el alta antes de vincular la cuenta. Los cargos deben existir y estar activos. La edición permite registrar el RUT que falte en una cuenta existente y modificar nombre y cargo; el RUT ya vinculado no se reemplaza desde esta edición. los cambios de rol conservan la verificación MFA y la aprobación adicional para roles privilegiados.

## Acceso y fuentes

La sesión administrativa existente conserva su autenticación por cookie. Las cuentas del equipo utilizan Supabase Auth y se verifican con su identidad individual. El ingreso resuelve el RUT exclusivamente en el servidor, verifica la contraseña de la cuenta vinculada y entrega la sesión autenticada sin publicar el directorio de correos. El login habitual de `/administracion/login` admite ese mismo flujo de equipo con RUT. La clave administrativa conserva su sesión propia. Las solicitudes del equipo no pasan por los adaptadores históricos administrativos ni reciben el rol de Gerencia General. El servidor conserva los controles de permisos y alcance de cada módulo y exige un RUT vinculado para las solicitudes del equipo.

La cuenta individual accede a los registros nativos autorizados para su rol. Los registros históricos expuestos exclusivamente mediante adaptadores administrativos no se incorporan a esa sesión.

La tabla de RUT tiene RLS y acceso exclusivo de `service_role`; no admite lecturas de clientes anónimos o autenticados. El endpoint `/api/equipo/auth` limita los intentos, valida el origen y devuelve el mismo rechazo para RUT desconocido, cuenta bloqueada y contraseña incorrecta. La recuperación tampoco confirma si un RUT existe.

`/equipo` se excluye de analítica pública y de la caché del service worker, y responde con instrucciones de no indexación. La configuración del navegador admite únicamente claves públicas `anon` o `sb_publishable_`; las claves privadas permanecen en el servidor.

## Validación

Las pruebas cubren altas con contraseña e invitación, duplicados, cargos inválidos, rechazo de roles privilegiados, conservación de identidad individual, rechazo de cuentas bloqueadas o con permisos antiguos, origen de las solicitudes y exclusión de la analítica pública. La publicación, la creación de una cuenta real y su primer ingreso deben verificarse por separado.
