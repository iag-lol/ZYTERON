"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UserCircle,
  Link as LinkIcon,
  Key,
  FileText,
  LifeBuoy,
  Bell,
  Trash2,
  AlertTriangle,
} from "lucide-react";

type AccountStatus = "ACTIVE" | "PENDING" | "DISABLED";

const accountStatuses: AccountStatus[] = ["ACTIVE", "PENDING", "DISABLED"];

function isAccountStatus(value: string): value is AccountStatus {
  return accountStatuses.includes(value as AccountStatus);
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
    accountStatus: AccountStatus;
  };
}) {
  const router = useRouter();
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  async function callApi(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setFeedback("");
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback(payload?.error || "No se pudo completar la acción.");
      return false;
    }
    setFeedback("Acción ejecutada correctamente.");
    return true;
  }

  async function handleDelete() {
    startTransition(async () => {
      const ok = await callApi(`/api/portal/admin/users/${userId}`, "DELETE");
      if (ok) {
        setIsDeleteDialogOpen(false);
        router.push("/admin/portal-clientes");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 shadow-sm animate-in fade-in zoom-in-95">
          {feedback}
        </div>
      )}

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto gap-2 bg-transparent justify-start">
          <TabsTrigger value="perfil" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl px-4 py-2 text-slate-600">
            <UserCircle className="mr-2 h-4 w-4" />
            Perfil & Estado
          </TabsTrigger>
          <TabsTrigger value="vincular" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl px-4 py-2 text-slate-600">
            <LinkIcon className="mr-2 h-4 w-4" />
            Vincular
          </TabsTrigger>
          <TabsTrigger value="credenciales" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl px-4 py-2 text-slate-600">
            <Key className="mr-2 h-4 w-4" />
            Credenciales
          </TabsTrigger>
          <TabsTrigger value="documentos" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl px-4 py-2 text-slate-600">
            <FileText className="mr-2 h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="tickets" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl px-4 py-2 text-slate-600">
            <LifeBuoy className="mr-2 h-4 w-4" />
            Soporte
          </TabsTrigger>
          <TabsTrigger value="notificaciones" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-xl px-4 py-2 text-slate-600">
            <Bell className="mr-2 h-4 w-4" />
            Avisos
          </TabsTrigger>
        </TabsList>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <TabsContent value="perfil" className="m-0 space-y-6 outline-none focus:ring-0">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Configuración Base</h3>
              <p className="text-sm text-slate-500 mb-4">Actualiza los datos corporativos y el estado de acceso del cliente al portal.</p>
              
              <form
                className="grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  startTransition(async () => {
                    await callApi(`/api/portal/admin/users/${userId}`, "PATCH", profile);
                  });
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Nombre</label>
                    <Input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Apellido</label>
                    <Input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Empresa</label>
                    <Input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Teléfono</label>
                    <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Notas u Observaciones Internas</label>
                  <Textarea value={profile.notes} onChange={(e) => setProfile({ ...profile, notes: e.target.value })} rows={4} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Estado de Cuenta</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={profile.accountStatus} 
                    onChange={(e) => {
                      if (isAccountStatus(e.target.value)) {
                        setProfile({ ...profile, accountStatus: e.target.value });
                      }
                    }}
                  >
                    <option value="ACTIVE">Activa (Acceso Permitido)</option>
                    <option value="PENDING">Pendiente (Verificación)</option>
                    <option value="DISABLED">Deshabilitada (Acceso Bloqueado)</option>
                  </select>
                </div>

                <Button type="submit" className="w-fit bg-blue-700 hover:bg-blue-800 mt-2" disabled={pending}>
                  Guardar Cambios
                </Button>
              </form>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="text-lg font-bold text-red-600">Zona de Peligro</h3>
              <p className="text-sm text-slate-500 mb-4">La eliminación del cliente es irreversible. Las cotizaciones y proyectos asociados se mantendrán pero se desvincularán de este usuario.</p>
              
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      ¿Eliminar cliente definitivamente?
                    </DialogTitle>
                    <DialogDescription>
                      Estás a punto de borrar a este cliente y todo su acceso al portal.
                      Sus compras y proyectos se mantendrán en el sistema como huérfanos para no afectar tu contabilidad, pero se borrarán sus credenciales y mensajes.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="sm:justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={pending}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={pending}>
                      {pending ? "Eliminando..." : "Sí, eliminar cliente"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="vincular" className="m-0 space-y-6 outline-none focus:ring-0">
            <h3 className="text-lg font-bold text-slate-900">Vincular Registros Existentes</h3>
            <p className="text-sm text-slate-500 mb-4">Asocia manualmente cotizaciones, proyectos, o ventas huérfanas introduciendo su ID interno.</p>
            <form
              className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] items-end"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  await callApi(`/api/portal/admin/users/${userId}/assign`, "POST", assign);
                });
              }}
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Tipo de Registro</label>
                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500" value={assign.entityType} onChange={(e) => setAssign({ ...assign, entityType: e.target.value })}>
                  <option value="QUOTE">Cotización</option>
                  <option value="PROJECT">Proyecto</option>
                  <option value="SALE">Compra/Venta</option>
                  <option value="TAX_DOCUMENT">Documento Tributario</option>
                  <option value="CLIENT_REQUEST">Solicitud</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">ID del Registro</label>
                <Input value={assign.entityId} onChange={(e) => setAssign({ ...assign, entityId: e.target.value })} placeholder="Ej: cm02j3n8m0000..." />
              </div>
              <Button type="submit" variant="secondary" className="h-10" disabled={pending}>Vincular</Button>
            </form>
          </TabsContent>

          <TabsContent value="credenciales" className="m-0 space-y-6 outline-none focus:ring-0">
            <h3 className="text-lg font-bold text-slate-900">Registrar Nueva Credencial</h3>
            <p className="text-sm text-slate-500 mb-4">Crea accesos seguros para que el cliente pueda ver sus claves de Hosting, Cpanel, WordPress, etc.</p>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const ok = await callApi(`/api/portal/admin/users/${userId}/credentials`, "POST", credential);
                  if (ok) setCredential({ serviceName: "", username: "", secret: "", url: "", notes: "" });
                });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nombre del Servicio</label>
                  <Input value={credential.serviceName} onChange={(e) => setCredential({ ...credential, serviceName: e.target.value })} placeholder="Ej: WordPress" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Usuario (Opcional)</label>
                  <Input value={credential.username} onChange={(e) => setCredential({ ...credential, username: e.target.value })} placeholder="admin" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Contraseña / Secreto</label>
                  <Input value={credential.secret} onChange={(e) => setCredential({ ...credential, secret: e.target.value })} placeholder="••••••••" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">URL de Acceso (Opcional)</label>
                  <Input value={credential.url} onChange={(e) => setCredential({ ...credential, url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Instrucciones o Notas (Opcional)</label>
                <Textarea value={credential.notes} onChange={(e) => setCredential({ ...credential, notes: e.target.value })} rows={3} placeholder="No compartir esta clave..." />
              </div>
              <Button type="submit" variant="secondary" className="w-fit" disabled={pending}>Guardar Credencial Segura</Button>
            </form>
          </TabsContent>

          <TabsContent value="documentos" className="m-0 space-y-6 outline-none focus:ring-0">
            <h3 className="text-lg font-bold text-slate-900">Publicar Documento</h3>
            <p className="text-sm text-slate-500 mb-4">Enlaza URLs de contratos, respaldos o actas técnicas para que el cliente pueda descargarlas.</p>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const ok = await callApi(`/api/portal/admin/users/${userId}/documents`, "POST", doc);
                  if (ok) setDoc({ title: "", category: "CONTRATO", fileUrl: "", fileName: "", description: "" });
                });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Título del Documento</label>
                  <Input value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} placeholder="Contrato de Mantención" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Categoría</label>
                  <Input value={doc.category} onChange={(e) => setDoc({ ...doc, category: e.target.value })} placeholder="CONTRATO, REPORTE, FACTURA..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">URL del Archivo</label>
                <Input value={doc.fileUrl} onChange={(e) => setDoc({ ...doc, fileUrl: e.target.value })} placeholder="https://docs.google.com/..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Descripción Breve (Opcional)</label>
                <Textarea value={doc.description} onChange={(e) => setDoc({ ...doc, description: e.target.value })} rows={2} />
              </div>
              <Button type="submit" variant="secondary" className="w-fit" disabled={pending}>Registrar Enlace</Button>
            </form>
          </TabsContent>

          <TabsContent value="tickets" className="m-0 space-y-6 outline-none focus:ring-0">
            <h3 className="text-lg font-bold text-slate-900">Apertura Manual de Ticket</h3>
            <p className="text-sm text-slate-500 mb-4">Crea un caso de soporte en nombre del cliente si te contactó por teléfono o en persona.</p>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const ok = await callApi(`/api/portal/admin/users/${userId}/tickets`, "POST", ticket);
                  if (ok) setTicket({ title: "", description: "", category: "SOPORTE", priority: "NORMAL" });
                });
              }}
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Asunto del Ticket</label>
                <Input value={ticket.title} onChange={(e) => setTicket({ ...ticket, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Detalle del Problema</label>
                <Textarea value={ticket.description} onChange={(e) => setTicket({ ...ticket, description: e.target.value })} rows={4} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Categoría</label>
                  <Input value={ticket.category} onChange={(e) => setTicket({ ...ticket, category: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Prioridad</label>
                  <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500" value={ticket.priority} onChange={(e) => setTicket({ ...ticket, priority: e.target.value })}>
                    <option value="BAJA">Baja</option>
                    <option value="NORMAL">Normal</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica</option>
                  </select>
                </div>
              </div>
              <Button type="submit" variant="secondary" className="w-fit" disabled={pending}>Crear Ticket a nombre del Cliente</Button>
            </form>
          </TabsContent>

          <TabsContent value="notificaciones" className="m-0 space-y-6 outline-none focus:ring-0">
            <h3 className="text-lg font-bold text-slate-900">Enviar Alerta al Portal</h3>
            <p className="text-sm text-slate-500 mb-4">El cliente verá esta notificación en la campana de su portal apenas inicie sesión.</p>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const ok = await callApi(`/api/portal/admin/users/${userId}/notifications`, "POST", notification);
                  if (ok) setNotification({ title: "", body: "", type: "INFO", link: "" });
                });
              }}
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Título Corto</label>
                <Input value={notification.title} onChange={(e) => setNotification({ ...notification, title: e.target.value })} placeholder="Ej: Mantención programada" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Cuerpo del Mensaje</label>
                <Textarea value={notification.body} onChange={(e) => setNotification({ ...notification, body: e.target.value })} rows={3} placeholder="Estimado cliente, su sitio estará en mantenimiento..." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nivel de Alerta</label>
                  <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500" value={notification.type} onChange={(e) => setNotification({ ...notification, type: e.target.value })}>
                    <option value="INFO">Informativa (Azul)</option>
                    <option value="SUCCESS">Éxito (Verde)</option>
                    <option value="WARNING">Advertencia (Amarillo)</option>
                    <option value="ERROR">Importante (Rojo)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Enlace de Acción (Opcional)</label>
                  <Input value={notification.link} onChange={(e) => setNotification({ ...notification, link: e.target.value })} placeholder="/mis-proyectos/123" />
                </div>
              </div>
              <Button type="submit" variant="secondary" className="w-fit" disabled={pending}>Emitir Notificación Directa</Button>
            </form>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
