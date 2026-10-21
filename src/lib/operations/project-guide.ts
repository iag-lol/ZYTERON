import type { OperationsProject, OperationsTask, ProjectMilestone } from "@zyteron/contracts";
export const taskLabels: Record<OperationsTask["status"], string> = {
  BACKLOG: "Por planificar",
  TODO: "Pendiente",
  IN_PROGRESS: "En curso",
  BLOCKED: "Bloqueada",
  REVIEW: "En revisión",
  QA: "En pruebas",
  DONE: "Terminada",
  CANCELLED: "Anulada",
};
// Las opciones respetan las transiciones que permite OperationsService.
export const nextTaskStates: Record<OperationsTask["status"], OperationsTask["status"][]> = {
  BACKLOG: ["TODO", "CANCELLED"],
  TODO: ["BACKLOG", "IN_PROGRESS", "BLOCKED", "CANCELLED"],
  IN_PROGRESS: ["TODO", "BLOCKED", "REVIEW", "QA", "DONE", "CANCELLED"],
  BLOCKED: ["TODO", "IN_PROGRESS", "CANCELLED"],
  REVIEW: ["IN_PROGRESS", "QA", "DONE"],
  QA: ["IN_PROGRESS", "REVIEW", "DONE"],
  DONE: ["IN_PROGRESS"],
  CANCELLED: [],
};
export const milestoneLabels: Record<ProjectMilestone["status"], string> = {
  PLANNED: "Planificado",
  IN_PROGRESS: "En curso",
  AT_RISK: "En riesgo",
  BLOCKED: "Bloqueado",
  COMPLETED: "Completado",
  CANCELLED: "Anulado",
};
export const projectLabels: Record<OperationsProject["status"], string> = {
  PLANNING: "Planificación",
  READY: "Listo para iniciar",
  IN_PROGRESS: "En desarrollo",
  BLOCKED: "Bloqueado",
  INTERNAL_REVIEW: "Revisión interna",
  QA: "Pruebas",
  WAITING_CLIENT: "Esperando al cliente",
  READY_FOR_PRODUCTION: "Listo para publicar",
  PRODUCTION: "En producción",
  MAINTENANCE: "Mantenimiento",
  COMPLETED: "Completado",
  ON_HOLD: "En pausa",
  CANCELLED: "Anulado",
  ARCHIVED: "Archivado",
};
export const nextProjectStates: Record<OperationsProject["status"], OperationsProject["status"][]> =
  {
    PLANNING: ["READY", "ON_HOLD"],
    READY: ["IN_PROGRESS", "ON_HOLD"],
    IN_PROGRESS: ["BLOCKED", "INTERNAL_REVIEW", "QA", "WAITING_CLIENT", "ON_HOLD"],
    BLOCKED: ["IN_PROGRESS", "ON_HOLD"],
    INTERNAL_REVIEW: ["IN_PROGRESS", "QA", "WAITING_CLIENT"],
    QA: ["IN_PROGRESS", "READY_FOR_PRODUCTION", "WAITING_CLIENT"],
    WAITING_CLIENT: ["IN_PROGRESS", "INTERNAL_REVIEW", "QA", "ON_HOLD"],
    READY_FOR_PRODUCTION: ["PRODUCTION", "QA", "ON_HOLD"],
    PRODUCTION: ["MAINTENANCE", "COMPLETED", "IN_PROGRESS"],
    MAINTENANCE: ["COMPLETED", "IN_PROGRESS"],
    COMPLETED: ["MAINTENANCE"],
    ON_HOLD: ["PLANNING", "READY", "IN_PROGRESS"],
    CANCELLED: [],
    ARCHIVED: [],
  };

export const projectSteps = ["Preparar", "Trabajar", "Revisar", "Entregar"];
export function currentProjectStep(status: OperationsProject["status"]): number | null {
  if (["PLANNING", "READY"].includes(status)) return 0;
  if (["IN_PROGRESS", "BLOCKED"].includes(status)) return 1;
  if (["INTERNAL_REVIEW", "QA", "WAITING_CLIENT", "READY_FOR_PRODUCTION"].includes(status))
    return 2;
  if (["PRODUCTION", "MAINTENANCE", "COMPLETED"].includes(status)) return 3;
  return null;
}
type Guide = {
  title: string;
  text: string;
  button?: string;
  next?: OperationsProject["status"];
  confirm?: boolean;
};
export function projectGuide(status: OperationsProject["status"], pending: number): Guide {
  const guides: Record<OperationsProject["status"], Guide> = {
    PLANNING: {
      title: "Prepara lo que vas a hacer",
      text: "Agrega tareas concretas y revisa el alcance. Cuando esté definido, deja el proyecto listo para comenzar.",
      button: "Dejar listo para comenzar",
      next: "READY",
    },
    READY: {
      title: "Comienza el proyecto",
      text: "Inicia el trabajo y usa Empezar y Terminar en cada tarea. El avance se guarda en este mismo lugar.",
      button: "Comenzar proyecto",
      next: "IN_PROGRESS",
    },
    IN_PROGRESS: {
      title: pending ? "Completa el trabajo pendiente" : "Revisa el trabajo realizado",
      text: pending
        ? `Quedan ${pending} tareas o etapas por terminar. Puedes seguir trabajando o pasar a revisión cuando corresponda.`
        : "El trabajo registrado está completo. Comprueba el resultado antes de pasar a revisión.",
      button: "Pasar a revisión",
      next: "INTERNAL_REVIEW",
    },
    INTERNAL_REVIEW: {
      title: "Revisa que todo esté correcto",
      text: "Comprueba el resultado y anota los ajustes como tareas. Después, pasa a las pruebas finales.",
      button: "Comenzar pruebas",
      next: "QA",
    },
    QA: {
      title: "Comprueba el funcionamiento",
      text: "Prueba las funciones acordadas. Si algo falla, agrega una tarea para corregirlo antes de publicar.",
      button: "Marcar listo para publicar",
      next: "READY_FOR_PRODUCTION",
    },
    READY_FOR_PRODUCTION: {
      title: "Publica y confirma la entrega",
      text: "Cuando la web o el sistema ya esté publicado y verificado, registra aquí la publicación.",
      button: "Confirmar que ya está publicado",
      next: "PRODUCTION",
      confirm: true,
    },
    PRODUCTION: {
      title: "Confirma la entrega final",
      text: "El proyecto está registrado en producción. Revisa la entrega con el cliente antes de finalizarlo.",
      button: "Finalizar proyecto",
      next: "COMPLETED",
      confirm: true,
    },
    MAINTENANCE: {
      title: "Atiende el mantenimiento",
      text: "Agrega y termina las tareas de soporte. Finaliza el proyecto cuando termine el servicio acordado.",
      button: "Finalizar proyecto",
      next: "COMPLETED",
      confirm: true,
    },
    BLOCKED: {
      title: "Resuelve lo que impide avanzar",
      text: "Revisa las tareas bloqueadas y anota qué falta. Retoma el proyecto cuando se resuelva el impedimento.",
      button: "Retomar trabajo",
      next: "IN_PROGRESS",
    },
    WAITING_CLIENT: {
      title: "Espera la respuesta del cliente",
      text: "Cuando recibas la información o aprobación pendiente, retoma el trabajo. Este cambio no envía mensajes al cliente.",
      button: "Ya puedo continuar",
      next: "IN_PROGRESS",
    },
    ON_HOLD: {
      title: "Proyecto en pausa",
      text: "El avance registrado se conserva. Retoma el trabajo cuando corresponda.",
      button: "Retomar trabajo",
      next: "IN_PROGRESS",
    },
    COMPLETED: {
      title: "Proyecto finalizado",
      text: "El trabajo y su historial siguen disponibles. Si comienza una nueva etapa de soporte, puedes abrir mantenimiento.",
      button: "Abrir mantenimiento",
      next: "MAINTENANCE",
    },
    CANCELLED: { title: "Proyecto anulado", text: "El historial se conserva para consulta." },
    ARCHIVED: { title: "Proyecto archivado", text: "El historial se conserva para consulta." },
  };
  return guides[status];
}
export async function startTask(
  status: OperationsTask["status"],
  move: (status: OperationsTask["status"]) => Promise<void>,
) {
  if (status === "BACKLOG") {
    await move("TODO");
    await move("IN_PROGRESS");
    return;
  }
  if (["TODO", "BLOCKED", "DONE"].includes(status)) {
    await move("IN_PROGRESS");
    return;
  }
  throw Error("Esta tarea ya está en curso o no se puede reabrir.");
}
