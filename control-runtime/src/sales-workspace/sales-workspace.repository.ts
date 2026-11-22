import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createServerSupabase } from "../domain/server-supabase.js";
import type { Row, WorkActor } from "./sales-workspace.types.js";

@Injectable()
export class SalesWorkspaceRepository {
  private readonly client = createServerSupabase();
  private db() {
    if (!this.client)
      throw new ServiceUnavailableException(
        "La gestión comercial requiere la base de datos persistente.",
      );
    return this.client;
  }
  async rows<T = Row>(
    table: string,
    columns: string,
    filters: Record<string, string | string[]> = {},
    order = "created_at",
  ): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; from < 10000; from += 500) {
      let query = this.db()
        .from(table)
        .select(columns)
        .order(order, { ascending: false })
        .range(from, from + 499);
      for (const [key, value] of Object.entries(filters))
        query = Array.isArray(value) ? query.in(key, value) : query.eq(key, value);
      const { data, error } = await query;
      if (error)
        throw new ServiceUnavailableException(
          "No fue posible leer la cartera comercial de forma segura.",
        );
      out.push(...((data ?? []) as unknown as T[]));
      if ((data?.length ?? 0) < 500) return out;
    }
    throw new ServiceUnavailableException(
      "La consulta supera 10.000 registros. Acota el período antes de generar el informe.",
    );
  }
  async record(id: string, actor: WorkActor) {
    let query = this.db().from("sales_work_records").select("*").eq("id", id);
    if (actor.role === "EJECUTIVA_VENTAS")
      query = query.eq("owner_id", actor.userId).eq("owner_type", "EXECUTIVE");
    const { data, error } = await query.maybeSingle();
    if (error) throw new ServiceUnavailableException("No fue posible consultar el registro.");
    if (!data) throw new NotFoundException("Registro no encontrado.");
    return data as Row;
  }
  async quote(id: string, actor: WorkActor) {
    let query = this.db().from("sales_work_proposal_view").select("*").eq("quote_id", id);
    if (actor.role === "EJECUTIVA_VENTAS") query = query.eq("owner_id", actor.userId);
    const { data, error } = await query.maybeSingle();
    if (error) throw new ServiceUnavailableException("No fue posible consultar la propuesta.");
    if (!data) throw new NotFoundException("Propuesta no encontrada.");
    if (actor.role === "EJECUTIVA_VENTAS") await this.record(String(data.record_id), actor);
    return data as Row;
  }
  async write(actor: WorkActor, action: string, target: string | null, payload: Row) {
    const { data, error } = await this.db().rpc("sales_workspace_write", {
      p_actor: actor.userId,
      p_role: actor.role,
      p_action: action,
      p_target: target,
      p_payload: payload,
    });
    if (error) {
      const messages: Record<string, string> = {
        SALES_FORBIDDEN: "Esta operación requiere autorización de administración.",
        SALES_NOT_FOUND: "Registro no encontrado.",
        SALES_STALE: "El registro cambió o ya fue revisado. Actualiza la pantalla.",
        SALES_RUT_REQUIRED: "Completa el RUT válido del contacto antes de preparar su facturación.",
        SALES_CLIENT_ALREADY_EXISTS:
          "El RUT ya pertenece a una ficha de cliente. Revisa su asignación desde Clientes.",
        SALES_CONTACT_REVIEW_REQUIRED:
          "Aprueba los datos del cliente antes de autorizar su propuesta.",
        SALES_APPROVED_PROPOSAL_REQUIRED:
          "Se requiere una propuesta aprobada y compartida antes de registrar aceptación.",
        SALES_NO_EXECUTIVE_COMMISSION:
          "Los contactos de administración no generan comisión de ejecutivo.",
        SALES_CLIENT_REQUIRED:
          "Completa y valida los datos del contacto antes de confirmar su compra.",
        SALES_VERIFIED_PAYMENT_REQUIRED:
          "No existe un cobro completo confirmado que permita generar la comisión.",
        SALES_SETTLEMENT_LOCKED:
          "La utilidad ya fue validada para ese cobro. Su registro se conserva.",
        SALES_PROPOSAL_BLOCKED: "Revisa el cliente y su estado antes de crear otra propuesta.",
        SALES_CLOSED: "La gestión está cerrada; administración debe revisar cualquier corrección.",
      };
      const code = Object.keys(messages).find((key) => error.message.includes(key));
      if (code === "SALES_NOT_FOUND") throw new NotFoundException(messages[code]);
      throw new ConflictException(
        code
          ? messages[code]
          : error.code === "23505"
            ? "Ya existe un registro con esa identidad. Revisa la cartera antes de repetirlo."
            : "No se pudo guardar la gestión. Revisa los datos y actualiza la pantalla.",
      );
    }
    return String(data);
  }
  async owners() {
    const owners: Array<{ id: string; name: string }> = [];
    for (let page = 1; page <= 100; page++) {
      const { data, error } = await this.db().auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw new ServiceUnavailableException("No fue posible leer los ejecutivos.");
      owners.push(
        ...data.users
          .filter((u) => u.app_metadata.role === "EJECUTIVA_VENTAS")
          .map((u) => ({
            id: u.id,
            name: String(
              u.user_metadata.full_name ?? u.user_metadata.name ?? "Ejecutivo de ventas",
            ),
          })),
      );
      if (data.users.length < 100) return owners;
    }
    throw new ServiceUnavailableException("El directorio comercial requiere paginación adicional.");
  }
}
