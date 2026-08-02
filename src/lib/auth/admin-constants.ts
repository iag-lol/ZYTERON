/**
 * El nombre de la cookie se mantiene por compatibilidad. El valor de sesión
 * y la contraseña por defecto se eliminaron: ahora la sesión es un token
 * firmado (ver `admin-session.ts`) y la contraseña vive solo en el entorno.
 */
export const COOKIE_KEY = "zyteron_admin_token";
