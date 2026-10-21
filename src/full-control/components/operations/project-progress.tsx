"use client";
import { useRef, useState } from "react";
import type {
  OperationsProject,
  OperationsTask,
  ProjectMilestone,
  WorkLog,
} from "@zyteron/contracts";
import { ArrowRight, Check, Clock3, Flag, Plus, Play } from "lucide-react";
import { useAccess } from "@control/components/access-context";
import { formatDate } from "@control/lib/date-time";
import type { OperationsCreateKind } from "@control/lib/operations-form";
import {
  currentProjectStep,
  projectSteps,
  projectGuide,
  projectLabels,
  taskLabels,
  milestoneLabels,
  nextProjectStates,
  nextTaskStates,
  startTask,
} from "@/lib/operations/project-guide";
export { nextTaskStates } from "@/lib/operations/project-guide";

interface Props {
  project: OperationsProject;
  tasks: OperationsTask[];
  milestones: ProjectMilestone[];
  worklogs: WorkLog[];
  create: (kind: OperationsCreateKind) => void;
  complete: (id: string) => Promise<void>;
  moveTask: (id: string, status: OperationsTask["status"], reason?: string) => Promise<void>;
  moveProject: (status: OperationsProject["status"]) => Promise<void>;
  addTask: (title: string) => Promise<void>;
}
export function ProjectProgress({
  project,
  tasks,
  milestones,
  worklogs,
  create,
  complete,
  moveTask,
  moveProject,
  addTask,
}: Props) {
  const { role } = useAccess();
  const [busy, setBusy] = useState(false),
    locked = useRef(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [title, setTitle] = useState(""),
    [blockTask, setBlockTask] = useState<OperationsTask | null>(null),
    [reason, setReason] = useState(""),
    [confirmStage, setConfirmStage] = useState<OperationsProject["status"] | null>(null);
  const canManage = ["GERENTE_GENERAL", "JEFE_DESARROLLO", "OPERACIONES"].includes(role);
  const canReport = [
    "GERENTE_GENERAL",
    "JEFE_DESARROLLO",
    "OPERACIONES",
    "TECH_LEAD",
    "PROGRAMADOR",
    "QA",
    "SOPORTE_TECNICO",
    "DESARROLLO",
  ].includes(role);
  const closed = ["COMPLETED", "CANCELLED", "ARCHIVED"].includes(project.status);
  const activeMilestones = milestones.filter((m) => m.status !== "CANCELLED"),
    activeTasks = tasks.filter((t) => t.status !== "CANCELLED");
  const pendingTasks = activeTasks.filter((t) => t.status !== "DONE"),
    doneTasks = activeTasks.filter((t) => t.status === "DONE");
  const pendingMilestones = activeMilestones.filter((m) => m.status !== "COMPLETED");
  const next = projectGuide(project.status, pendingTasks.length + pendingMilestones.length),
    step = currentProjectStep(project.status);
  const recentLogs = [...worklogs]
    .sort((a, b) => b.workDate.localeCompare(a.workDate) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const run = async (action: () => Promise<void>, message: string) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Inténtalo nuevamente.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const advance = (status: OperationsProject["status"]) =>
    void run(async () => {
      await moveProject(status);
      setConfirmStage(null);
    }, `Etapa actualizada: ${projectLabels[status]}.`);
  const taskRow = (task: OperationsTask) => (
    <li key={task.id}>
      <div>
        <strong>{task.title}</strong>
        <small>
          {taskLabels[task.status]}
          {task.dueDate ? ` · Vence ${formatDate(task.dueDate)}` : ""}
        </small>
        {task.blockedReason && task.status === "BLOCKED" ? (
          <small className="projectBlockedReason">Falta resolver: {task.blockedReason}</small>
        ) : null}
      </div>
      {canReport && !closed ? (
        <div className="projectTaskButtons">
          {["BACKLOG", "TODO", "BLOCKED", "DONE"].includes(task.status) ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(
                  () => startTask(task.status, (s) => moveTask(task.id, s)),
                  task.status === "DONE" ? "Tarea reabierta." : "Tarea en curso.",
                )
              }
            >
              <Play size={13} />
              {task.status === "DONE"
                ? "Reabrir"
                : task.status === "BLOCKED"
                  ? "Retomar"
                  : "Empezar"}
            </button>
          ) : null}
          {["IN_PROGRESS", "REVIEW", "QA"].includes(task.status) ? (
            <button
              type="button"
              className="projectActionPrimary"
              disabled={busy}
              onClick={() =>
                void run(() => moveTask(task.id, "DONE"), "Tarea terminada. Avance actualizado.")
              }
            >
              <Check size={14} />
              Terminar
            </button>
          ) : null}
          {nextTaskStates[task.status].includes("BLOCKED") ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBlockTask(task);
                setReason("");
              }}
            >
              No puedo avanzar
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
  return (
    <section className="projectProgressPanel projectSimpleFlow" aria-label="Avanzar el proyecto">
      <header>
        <div>
          <small>AVANCE DEL PROYECTO</small>
          <h3>¿Qué sigue ahora?</h3>
          <p>
            Etapa actual: <b>{projectLabels[project.status]}</b>
          </p>
        </div>
        <div className="projectProgressMetric">
          <strong className="projectProgressValue">
            {project.progress == null ? "Sin medir" : `${project.progress}%`}
          </strong>
          <small>trabajo completado</small>
        </div>
      </header>
      <ol className="projectStepRail" aria-label="Pasos del proyecto">
        {projectSteps.map((s, i) => (
          <li key={s} aria-current={step === i ? "step" : undefined}>
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      {error ? (
        <p className="opsAlert error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="opsAlert" role="status">
          {notice}
        </p>
      ) : null}
      <div className="projectNextStep">
        <div>
          <h4>{next.title}</h4>
          <p>{next.text}</p>
          {project.progress === 100 &&
          !["PRODUCTION", "COMPLETED", "MAINTENANCE"].includes(project.status) ? (
            <small>
              El 100% corresponde al trabajo registrado. La revisión y entrega se confirman por
              separado.
            </small>
          ) : null}
        </div>
        {canManage && next.next ? (
          <button
            type="button"
            className="projectActionPrimary"
            disabled={busy}
            onClick={() => (next.confirm ? setConfirmStage(next.next!) : advance(next.next!))}
          >
            {next.button}
            <ArrowRight size={15} />
          </button>
        ) : null}
      </div>
      {confirmStage ? (
        <div className="projectInlineConfirm" role="group" aria-label="Confirmar cambio de etapa">
          <strong>
            {confirmStage === "PRODUCTION"
              ? "¿La web o el sistema ya está publicado y verificado?"
              : "¿La entrega acordada está completada?"}
          </strong>
          <p>
            {confirmStage === "PRODUCTION"
              ? "Esta acción registra la publicación en el proyecto. La publicación del sitio se realiza desde su hosting."
              : "Confirma la revisión final antes de registrar el proyecto como completado."}
            {pendingTasks.length + pendingMilestones.length > 0
              ? ` Aún hay ${pendingTasks.length + pendingMilestones.length} tareas o etapas pendientes; revisa si corresponde finalizarlas.`
              : ""}
          </p>
          <div>
            <button type="button" disabled={busy} onClick={() => setConfirmStage(null)}>
              Volver
            </button>
            <button
              type="button"
              disabled={busy}
              className="projectActionPrimary"
              onClick={() => advance(confirmStage)}
            >
              Sí, confirmar
            </button>
          </div>
        </div>
      ) : null}
      <div className="projectSimpleWork">
        <article id="project-pending-work">
          <h4>
            {closed ? "Trabajo registrado" : "Trabajo pendiente"}{" "}
            <span>{pendingTasks.length} tareas pendientes</span>
          </h4>
          <p className="projectProgressEmpty">
            {closed
              ? "Consulta las tareas del proyecto y su estado registrado."
              : "Escribe algo concreto por hacer. Pulsa Empezar y, cuando esté listo, Terminar."}
          </p>
          {canReport && !closed ? (
            <form
              className="projectQuickAdd"
              onSubmit={(e) => {
                e.preventDefault();
                if (title.trim())
                  void run(async () => {
                    await addTask(title.trim());
                    setTitle("");
                  }, "Tarea agregada. Ya puedes empezarla.");
              }}
            >
              <label htmlFor={`quick-task-${project.id}`}>¿Qué hay que hacer?</label>
              <div>
                <input
                  id={`quick-task-${project.id}`}
                  required
                  maxLength={500}
                  value={title}
                  disabled={busy}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej.: revisar formulario de contacto"
                />
                <button type="submit" disabled={busy || !title.trim()}>
                  <Plus size={14} />
                  Agregar tarea
                </button>
              </div>
            </form>
          ) : null}
          {pendingTasks.length ? (
            <ul>{pendingTasks.map(taskRow)}</ul>
          ) : (
            <p className="projectProgressEmpty">No hay tareas pendientes.</p>
          )}
          {blockTask ? (
            <form
              className="projectInlineConfirm"
              aria-label="Registrar impedimento"
              onSubmit={(e) => {
                e.preventDefault();
                if (reason.trim())
                  void run(async () => {
                    await moveTask(blockTask.id, "BLOCKED", reason.trim());
                    setBlockTask(null);
                  }, "Impedimento registrado. Puedes retomar la tarea cuando se resuelva.");
              }}
            >
              <label>
                ¿Qué falta para continuar con «{blockTask.title}»?
                <textarea
                  required
                  rows={2}
                  value={reason}
                  disabled={busy}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej.: falta que el cliente envíe su logo"
                />
              </label>
              <div>
                <button type="button" disabled={busy} onClick={() => setBlockTask(null)}>
                  Volver
                </button>
                <button disabled={busy || !reason.trim()}>Guardar impedimento</button>
              </div>
            </form>
          ) : null}
          {doneTasks.length ? (
            <details className="projectExtraOptions">
              <summary>Tareas terminadas ({doneTasks.length})</summary>
              <ul>{doneTasks.map(taskRow)}</ul>
            </details>
          ) : null}
        </article>
        <article className="projectMilestoneChecklist">
          <h4>
            Etapas del trabajo{" "}
            <span>
              {activeMilestones.length - pendingMilestones.length} de {activeMilestones.length}{" "}
              completas
            </span>
          </h4>
          <p className="projectProgressEmpty">
            Marca una etapa sólo cuando su trabajo esté terminado.
          </p>
          {activeMilestones.length ? (
            <ul>
              {activeMilestones.map((m) => (
                <li key={m.id}>
                  <div>
                    <strong>{m.name}</strong>
                    <small>
                      {milestoneLabels[m.status]}
                      {m.dueDate ? ` · Vence ${formatDate(m.dueDate)}` : ""}
                    </small>
                  </div>
                  {m.status === "COMPLETED" ? (
                    <span className="projectProgressDone">
                      <Check size={14} />
                      Lista
                    </span>
                  ) : canReport && !closed ? (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Completar etapa ${m.name}`}
                      onClick={() =>
                        void run(() => complete(m.id), "Etapa completada. Avance actualizado.")
                      }
                    >
                      <Check size={14} />
                      Marcar lista
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="projectProgressEmpty">
              Puedes avanzar usando tareas. Agrega etapas si necesitas agrupar entregas más grandes.
            </p>
          )}
          {canManage && !closed ? (
            <button type="button" disabled={busy} onClick={() => create("milestone")}>
              <Flag size={14} />
              Agregar etapa
            </button>
          ) : null}
        </article>
      </div>
      <details className="projectExtraOptions">
        <summary>Notas, horas y opciones de la etapa</summary>
        <div className="projectProgressActions">
          {canReport && !closed ? (
            <>
              <button type="button" disabled={busy} onClick={() => create("worklog")}>
                <Clock3 size={14} />
                Anotar lo realizado
              </button>
              <button type="button" disabled={busy} onClick={() => create("task")}>
                Tarea con más detalles
              </button>
            </>
          ) : null}
          {canManage && nextProjectStates[project.status].length ? (
            <label>
              Cambiar etapa
              <select
                aria-label="Cambiar etapa del proyecto"
                disabled={busy}
                value={project.status}
                onChange={(e) => {
                  const s = e.target.value as OperationsProject["status"];
                  if (["PRODUCTION", "COMPLETED"].includes(s)) setConfirmStage(s);
                  else advance(s);
                }}
              >
                {[project.status, ...nextProjectStates[project.status]].map((s) => (
                  <option key={s} value={s}>
                    {projectLabels[s]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <p className="projectProgressEmpty">
          Las notas y horas describen el trabajo. El porcentaje cambia al terminar tareas o etapas;
          cambiar de etapa no modifica ese porcentaje.
        </p>
        <h4>Últimas notas de trabajo</h4>
        {recentLogs.length ? (
          <ul>
            {recentLogs.map((l) => (
              <li key={l.id}>
                <div>
                  <strong>{l.description}</strong>
                  <small>{formatDate(l.workDate)}</small>
                </div>
                <span>
                  {Math.floor(l.durationMinutes / 60)}h {l.durationMinutes % 60}m
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="projectProgressEmpty">Todavía no hay notas de trabajo.</p>
        )}
      </details>
      <details className="projectExtraOptions">
        <summary>¿Cómo se calcula el avance?</summary>
        <p>
          {activeMilestones.length && activeTasks.length
            ? "El plan de etapas aporta el 70% y las tareas el 30%. Cada parte aumenta al completar su trabajo."
            : activeMilestones.length
              ? "El porcentaje depende de las etapas completadas y del peso definido para cada una."
              : activeTasks.length
                ? "El porcentaje corresponde a las tareas terminadas del total de tareas."
                : "Todavía no hay tareas ni etapas para calcularlo. Agrega el trabajo que falta antes de marcar avances."}{" "}
          El resumen del proyecto muestra si es visible para el cliente; las tareas y notas internas
          conservan su privacidad.
        </p>
      </details>
    </section>
  );
}
