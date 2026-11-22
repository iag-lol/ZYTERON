import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { isValidChileanRut, normalizeRut } from "../clients/rut.js";
import type { Row, WorkActor } from "./sales-workspace.types.js";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function actor(headers: Record<string, string | undefined>): WorkActor {
  const userId = headers["x-zyteron-user-id"],
    role = headers["x-zyteron-role"];
  if (!userId || !uuid.test(userId) || (role !== "GERENTE_GENERAL" && role !== "EJECUTIVA_VENTAS"))
    throw new ForbiddenException("Identidad comercial no autorizada.");
  return { userId, role };
}
export function admin(a: WorkActor) {
  if (a.role !== "GERENTE_GENERAL")
    throw new ForbiddenException("Esta operación requiere validación de administración.");
}
export function id(v: unknown) {
  if (typeof v !== "string" || !uuid.test(v))
    throw new BadRequestException("Identificador inválido.");
  return v;
}
export function text(v: unknown, label: string, max: number, required = false) {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string" || v.length > max || (required && !v.trim()))
    throw new BadRequestException(
      `${label}: ${required ? "completa el dato y usa" : "usa"} máximo ${max} caracteres.`,
    );
  return v.trim();
}
export function amount(v: unknown, label: string, min = 0, max = 1e12) {
  if (
    typeof v !== "number" ||
    !Number.isFinite(v) ||
    v < min ||
    v > max ||
    Math.abs(Math.round(v * 100) - v * 100) > 0.00001
  )
    throw new BadRequestException(`${label} inválido.`);
  return v;
}
export function stamp(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  if (
    typeof v !== "string" ||
    v.length > 35 ||
    !/^\d{4}-\d{2}-\d{2}T/.test(v) ||
    !Number.isFinite(Date.parse(v))
  )
    throw new BadRequestException("Fecha de seguimiento inválida.");
  return new Date(v).toISOString();
}
export function date(v: unknown) {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    !Number.isFinite(Date.parse(v + "T12:00:00Z")) ||
    new Date(v + "T12:00:00Z").toISOString().slice(0, 10) !== v
  )
    throw new BadRequestException("Fecha inválida.");
  return v;
}
export function recordInput(b: Row) {
  const rut = text(b.rut, "RUT", 20);
  if (rut && !isValidChileanRut(rut))
    throw new BadRequestException("El RUT no tiene un dígito verificador válido.");
  const email = text(b.email, "Correo", 180),
    phone = text(b.phone, "Teléfono", 40);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new BadRequestException("Correo inválido.");
  if (!email && !phone)
    throw new BadRequestException("Ingresa un correo o teléfono para contactar al cliente.");
  const website = text(b.website, "Sitio web", 250);
  if (website && !/^https?:\/\/[^\s]+$/i.test(website))
    throw new BadRequestException("El sitio web debe comenzar con https:// o http://.");
  return {
    company_name: text(b.company_name, "Empresa", 180, true),
    contact_name: text(b.contact_name, "Contacto", 120, true),
    rut: rut ? normalizeRut(rut) : null,
    email,
    phone,
    website,
    business_activity: text(b.business_activity, "Giro", 160),
    address: text(b.address, "Dirección", 200),
    commune: text(b.commune, "Comuna", 80),
    city: text(b.city, "Ciudad", 80),
    interest: text(b.interest, "Necesidad", 1500, true),
    notes: text(b.notes, "Detalle", 4000),
    next_action_at: stamp(b.next_action_at),
  };
}
export function review(b: Row) {
  if (b.decision !== "APPROVED" && b.decision !== "REJECTED")
    throw new BadRequestException("Selecciona aprobar o solicitar corrección.");
  return {
    decision: b.decision,
    reason: text(b.reason, "Observación de revisión", 2000, b.decision === "REJECTED"),
  };
}
export function csvCell(v: unknown) {
  const s = String(v ?? "");
  return '"' + (/^(?:\s*[=+\-@]|[\t\r])/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"';
}
