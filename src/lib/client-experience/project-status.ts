/** Normalize existing website labels without treating unknown/planned work as in progress. */
export function projectStatus(value: string | null | undefined) {
  const key = (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (["ACTIVE", "IN_PROGRESS", "EN_CURSO", "EN_PROGRESO"].includes(key)) return "IN_PROGRESS";
  if (["COMPLETED", "DONE", "COMPLETADO", "TERMINADO", "FINALIZADO", "ENTREGADO"].includes(key))
    return "DONE";
  if (["PLANNED", "PLANIFICADO"].includes(key)) return "PLANNED";
  if (["CANCELLED", "CANCELED", "CANCELADO"].includes(key)) return "CANCELLED";
  return value || "PENDING";
}
