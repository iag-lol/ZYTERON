import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { leadStatuses, type SalesLead } from "@zyteron/contracts";
import { CommercialRepository } from "./commercial.repository.js";
import { optionalUuid, required } from "./commercial.validation.js";

@Injectable()
export class LeadsService {
  constructor(private readonly repository: CommercialRepository) {}
  list(query: any) {
    return this.repository.listLeads(query);
  }
  async get(id: string) {
    const item = await this.repository.getLead(id);
    if (!item) throw new NotFoundException("Lead no encontrado.");
    return item;
  }
  async create(body: Partial<SalesLead>, actorId: string | null) {
    required(body.companyName, "La empresa");
    required(body.contactName, "El contacto");
    if (!body.email && !body.phone && !body.whatsapp)
      throw new BadRequestException("Ingresa email, teléfono o WhatsApp.");
    optionalUuid(body.assignedTo, "La ejecutiva responsable");
    const duplicateIds = await this.repository.duplicateLeads(body);
    const client = await this.repository.clientDuplicate(body);
    const item = await this.repository.createLead({
      ...body,
      createdBy: actorId,
      assignedBy: body.assignedTo ? actorId : null,
    });
    await this.repository.publish("LEAD", item.id, "LEAD_CREATED", actorId, {
      companyName: item.companyName,
      duplicateIds,
      clientId: client?.id ?? null,
    });
    return {
      item,
      warnings: [
        ...duplicateIds.map(() => "Existe un lead potencialmente duplicado."),
        ...(client ? [`Esta empresa ya existe como cliente: ${client.legal_name}.`] : []),
      ],
    };
  }
  async update(id: string, body: Partial<SalesLead>, actorId: string | null) {
    if (body.status && !leadStatuses.includes(body.status))
      throw new BadRequestException("Estado de lead inválido.");
    const item = await this.repository.updateLead(id, body);
    await this.repository.publish("LEAD", id, "LEAD_UPDATED", actorId, {
      fields: Object.keys(body),
    });
    return item;
  }
  async assign(id: string, assignedTo: string, actorId: string | null) {
    optionalUuid(assignedTo, "La ejecutiva responsable");
    const item = await this.repository.updateLead(id, {
      assignedTo,
      status: "ASSIGNED",
      assignedBy: actorId,
      assignedAt: new Date().toISOString(),
    });
    await this.repository.publish("LEAD", id, "LEAD_ASSIGNED", actorId, { assignedTo });
    return item;
  }
  async qualify(id: string, actorId: string | null) {
    const item = await this.get(id);
    if (["DISQUALIFIED", "CONVERTED"].includes(item.status))
      throw new BadRequestException("Este lead ya está cerrado.");
    const updated = await this.repository.updateLead(id, { status: "QUALIFIED" });
    await this.repository.publish("LEAD", id, "LEAD_QUALIFIED", actorId);
    return updated;
  }
  async disqualify(id: string, reason: string, actorId: string | null) {
    required(reason, "El motivo");
    const updated = await this.repository.updateLead(id, {
      status: "DISQUALIFIED",
      notes: [(await this.get(id)).notes, `Motivo descarte: ${reason}`].filter(Boolean).join("\n"),
    });
    await this.repository.publish("LEAD", id, "LEAD_DISQUALIFIED", actorId, { reason });
    return updated;
  }
  async convert(
    id: string,
    body: { name?: string; estimatedValue?: number; stageId?: string; expectedCloseDate?: string },
    actorId: string | null,
  ) {
    optionalUuid(body.stageId, "La etapa");
    if (
      body.estimatedValue !== undefined &&
      (!Number.isFinite(Number(body.estimatedValue)) || Number(body.estimatedValue) < 0)
    )
      throw new BadRequestException("Importe estimado inválido.");
    if (body.expectedCloseDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.expectedCloseDate))
      throw new BadRequestException("Fecha de cierre inválida.");
    return this.repository.convertLead(id, body, actorId);
  }
}
