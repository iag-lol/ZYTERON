export function dteConnectionSummary(input: unknown) {
  const value = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const provider =
    value.provider === "SII_DIRECT"
      ? "SII_DIRECT"
      : value.provider === "EXTERNAL"
        ? "EXTERNAL"
        : "UNKNOWN";
  const environment =
    value.environment === "CERTIFICATION"
      ? "CERTIFICATION"
      : value.environment === "PRODUCTION"
        ? "PRODUCTION"
        : "UNKNOWN";
  const connected =
    provider === "SII_DIRECT"
      ? value.seedService === "CONNECTED"
      : provider === "EXTERNAL" && value.status === "CONNECTED";
  const authenticated =
    provider === "SII_DIRECT" &&
    connected &&
    value.certificate === "VALID" &&
    value.authenticated === true;
  const checkedAt =
    typeof value.checkedAt === "string" && Number.isFinite(Date.parse(value.checkedAt))
      ? value.checkedAt
      : null;
  return {
    provider,
    environment,
    connected,
    authenticated,
    checkedAt,
    environmentLabel:
      environment === "CERTIFICATION"
        ? "Certificación: pruebas sin validez tributaria"
        : environment === "PRODUCTION"
          ? "Producción: requiere autorización de emisión"
          : "Ambiente no confirmado",
    serviceLabel: connected ? "Servicio conectado" : "Conexión no confirmada",
    authenticationLabel:
      provider === "SII_DIRECT"
        ? authenticated
          ? "Firma y autenticación verificadas"
          : "Autenticación con certificado pendiente"
        : "La prueba del proveedor externo no acredita autorización del SII",
  };
}
