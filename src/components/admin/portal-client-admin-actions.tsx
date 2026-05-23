"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function ActionBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function PortalClientAdminActions({
  userId,
  initial,
}: {
  userId: string;
  initial: {
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
    notes: string;
    accountStatus: "ACTIVE" | "PENDING" | "DISABLED";
  };
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [profile, setProfile] = useState(initial);
  const [assign, setAssign] = useState({ entityType: "QUOTE", entityId: "" });
  const [doc, setDoc] = useState({
    title: "",
    category: "CONTRATO",
    fileUrl: "",
    fileName: "",
    description: "",
  });
  const [credential, setCredential] = useState({
    serviceName: "",
    username: "",
    secret: "",
    url: "",
    notes: "",
  });
  const [ticket, setTicket] = useState({
    title: "",
    description: "",
    category: "SOPORTE",
    priority: "NORMAL",
  });
  const [notification, setNotification] = useState({
    title: "",
    body: "",
    type: "INFO",
    link: "",
  });
  const [communication, setCommunication] = useState({
    subject: "",
    message: "",
    direction: "OUTBOUND",
    channel: "PORTAL",
  });

  async function callApi(path: string, method: "POST" | "PATCH", body: unknown) {
    setFeedback("");
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback(payload?.error || "No se pudo completar la acción.");
      return false;
    }
    setFeedback("Acción ejecutada correctamente.");
    return true;
  }

  return (
    <div className="space-y-4">
      {feedback ? <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{feedback}</p> : null}

      <ActionBox title="Actualizar perfil y estado">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await callApi(`/api/portal/admin/users/${userId}`, "PATCH", profile);
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={profile.firstName} onChange={(event) => setProfile((prev) => ({ ...prev, firstName: event.target.value }))} placeholder="Nombre" />
            <Input value={profile.lastName} onChange={(event) => setProfile((prev) => ({ ...prev, lastName: event.target.value }))} placeholder="Apellido" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={profile.company} onChange={(event) => setProfile((prev) => ({ ...prev, company: event.target.value }))} placeholder="Empresa" />
            <Input value={profile.phone} onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Teléfono" />
          </div>
          <Textarea value={profile.notes} onChange={(event) => setProfile((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Observaciones internas..." rows={4} />
          <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={profile.accountStatus} onChange={(event) => setProfile((prev) => ({ ...prev, accountStatus: event.target.value as "ACTIVE" | "PENDING" | "DISABLED" }))}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="DISABLED">DISABLED</option>
          </select>
          <Button type="submit" className="h-10 w-fit bg-blue-700 hover:bg-blue-800" disabled={pending}>
            Guardar cambios
          </Button>
        </form>
      </ActionBox>

      <ActionBox title="Vincular registros existentes">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await callApi(`/api/portal/admin/users/${userId}/assign`, "POST", assign);
            });
          }}
        >
          <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={assign.entityType} onChange={(event) => setAssign((prev) => ({ ...prev, entityType: event.target.value }))}>
            <option value="QUOTE">Cotización</option>
            <option value="PROJECT">Proyecto</option>
            <option value="SALE">Compra/Venta</option>
            <option value="TAX_DOCUMENT">Boleta/Documento tributario</option>
            <option value="CLIENT_REQUEST">Solicitud</option>
          </select>
          <Input value={assign.entityId} onChange={(event) => setAssign((prev) => ({ ...prev, entityId: event.target.value }))} placeholder="ID del registro" />
          <Button type="submit" variant="secondary" disabled={pending}>Vincular</Button>
        </form>
      </ActionBox>

      <ActionBox title="Subir documento (URL)">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const ok = await callApi(`/api/portal/admin/users/${userId}/documents`, "POST", doc);
              if (ok) setDoc({ title: "", category: "CONTRATO", fileUrl: "", fileName: "", description: "" });
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={doc.title} onChange={(event) => setDoc((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título documento" />
            <Input value={doc.category} onChange={(event) => setDoc((prev) => ({ ...prev, category: event.target.value }))} placeholder="Categoría" />
          </div>
          <Input value={doc.fileUrl} onChange={(event) => setDoc((prev) => ({ ...prev, fileUrl: event.target.value }))} placeholder="https://archivo..." />
          <Input value={doc.fileName} onChange={(event) => setDoc((prev) => ({ ...prev, fileName: event.target.value }))} placeholder="Nombre archivo (opcional)" />
          <Textarea value={doc.description} onChange={(event) => setDoc((prev) => ({ ...prev, description: event.target.value }))} placeholder="Descripción breve" rows={3} />
          <Button type="submit" variant="secondary" className="w-fit" disabled={pending}>Registrar documento</Button>
        </form>
      </ActionBox>

      <ActionBox title="Registrar credencial / acceso">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const ok = await callApi(`/api/portal/admin/users/${userId}/credentials`, "POST", credential);
              if (ok) setCredential({ serviceName: "", username: "", secret: "", url: "", notes: "" });
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={credential.serviceName} onChange={(event) => setCredential((prev) => ({ ...prev, serviceName: event.target.value }))} placeholder="Servicio (ej: Hosting)" />
            <Input value={credential.username} onChange={(event) => setCredential((prev) => ({ ...prev, username: event.target.value }))} placeholder="Usuario" />
          </div>
          <Input value={credential.secret} onChange={(event) => setCredential((prev) => ({ ...prev, secret: event.target.value }))} placeholder="Secreto / contraseña" />
          <Input value={credential.url} onChange={(event) => setCredential((prev) => ({ ...prev, url: event.target.value }))} placeholder="URL de acceso" />
          <Textarea value={credential.notes} onChange={(event) => setCredential((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notas internas" rows={3} />
          <Button type="submit" variant="secondary" className="w-fit" disabled={pending}>Guardar credencial</Button>
        </form>
      </ActionBox>

      <ActionBox title="Crear ticket de soporte para cliente">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const ok = await callApi(`/api/portal/admin/users/${userId}/tickets`, "POST", ticket);
              if (ok) setTicket({ title: "", description: "", category: "SOPORTE", priority: "NORMAL" });
            });
          }}
        >
          <Input value={ticket.title} onChange={(event) => setTicket((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título ticket" />
          <Textarea value={ticket.description} onChange={(event) => setTicket((prev) => ({ ...prev, description: event.target.value }))} rows={3} placeholder="Descripción del ticket" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={ticket.category} onChange={(event) => setTicket((prev) => ({ ...prev, category: event.target.value }))} placeholder="Categoría" />
            <Input value={ticket.priority} onChange={(event) => setTicket((prev) => ({ ...prev, priority: event.target.value }))} placeholder="Prioridad" />
          </div>
          <Button type="submit" variant="secondary" className="w-fit" disabled={pending}>Crear ticket</Button>
        </form>
      </ActionBox>

      <ActionBox title="Notificación al cliente">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const ok = await callApi(`/api/portal/admin/users/${userId}/notifications`, "POST", notification);
              if (ok) setNotification({ title: "", body: "", type: "INFO", link: "" });
            });
          }}
        >
          <Input value={notification.title} onChange={(event) => setNotification((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título notificación" />
          <Textarea value={notification.body} onChange={(event) => setNotification((prev) => ({ ...prev, body: event.target.value }))} rows={3} placeholder="Mensaje" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={notification.type} onChange={(event) => setNotification((prev) => ({ ...prev, type: event.target.value }))} placeholder="Tipo (INFO, ALERT...)" />
            <Input value={notification.link} onChange={(event) => setNotification((prev) => ({ ...prev, link: event.target.value }))} placeholder="Link opcional" />
          </div>
          <Button type="submit" variant="secondary" className="w-fit" disabled={pending}>Enviar notificación</Button>
        </form>
      </ActionBox>

      <ActionBox title="Registrar comunicación">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const ok = await callApi(`/api/portal/admin/users/${userId}/communications`, "POST", communication);
              if (ok) setCommunication({ subject: "", message: "", direction: "OUTBOUND", channel: "PORTAL" });
            });
          }}
        >
          <Input value={communication.subject} onChange={(event) => setCommunication((prev) => ({ ...prev, subject: event.target.value }))} placeholder="Asunto" />
          <Textarea value={communication.message} onChange={(event) => setCommunication((prev) => ({ ...prev, message: event.target.value }))} rows={3} placeholder="Mensaje" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={communication.direction} onChange={(event) => setCommunication((prev) => ({ ...prev, direction: event.target.value }))}>
              <option value="OUTBOUND">OUTBOUND</option>
              <option value="INBOUND">INBOUND</option>
            </select>
            <Input value={communication.channel} onChange={(event) => setCommunication((prev) => ({ ...prev, channel: event.target.value }))} placeholder="Canal" />
          </div>
          <Button type="submit" variant="secondary" className="w-fit" disabled={pending}>Guardar comunicación</Button>
        </form>
      </ActionBox>
    </div>
  );
}
