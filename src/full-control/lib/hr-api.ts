import type { EmployeeDetail, HrWorkspace, Role } from "@zyteron/contracts";
import { hrCanReadPerformance } from "./hr-presentation";
import { apiHeaders } from "./api-auth";
export class HrApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HrApiError";
  }
}
export interface HrPerformanceRecord {
  id: string;
  employeeId: string;
  cycleId?: string;
  status: string;
}
export interface HrScheduleRecord {
  id: string;
  name: string;
  weeklyHours: number;
  timezone: string;
  scheduleType: string;
  active: boolean;
}
const base = () => "/api/control-core/api";
async function request<T>(role: Role, path: string, init: RequestInit = {}) {
  const response = await fetch(`${base()}${path}`, {
    ...init,
    headers: await apiHeaders(role, init.headers),
    cache: "no-store",
  });
  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string | string[] };
      message = Array.isArray(data.message) ? data.message.join(" ") : data.message || message;
    } catch {
      /* respuesta no JSON */
    }
    throw new HrApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}
const body = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) });
export const hrApi = {
  performance: (role: Role) =>
    hrCanReadPerformance(role)
      ? request<HrPerformanceRecord[]>(role, "/hr/workforce/performance")
      : Promise.reject(
          new HrApiError("Consulta individual de evaluaciones no disponible en esta vista.", 403),
        ),
  schedules: (role: Role) => request<HrScheduleRecord[]>(role, "/hr/workforce/schedules"),
  workspace: (role: Role) => request<HrWorkspace>(role, "/hr/workspace"),
  employee: (role: Role, id: string) => request<EmployeeDetail>(role, `/hr/employees/${id}`),
  createEmployee: (role: Role, value: unknown) => request(role, "/hr/employees", body(value)),
  createDepartment: (role: Role, value: unknown) =>
    request(role, "/hr/organization/departments", body(value)),
  createTeam: (role: Role, value: unknown) => request(role, "/hr/organization/teams", body(value)),
  createPosition: (role: Role, value: unknown) =>
    request(role, "/hr/organization/positions", body(value)),
  createLeave: (role: Role, value: unknown) => request(role, "/hr/leave", body(value)),
  approveLeave: (role: Role, id: string) => request(role, `/hr/leave/${id}/approve`, body({})),
  rejectLeave: (role: Role, id: string, reason: string) =>
    request(role, `/hr/leave/${id}/reject`, body({ reason })),
  createPayroll: (role: Role, value: unknown) => request(role, "/hr/payroll/periods", body(value)),
  createRequest: (role: Role, value: unknown) =>
    request(role, "/hr/workforce/requests", body(value)),
  reports: (role: Role) => request<Record<string, unknown>>(role, "/hr/reports"),
  orgChart: (role: Role) => request<Record<string, unknown>>(role, "/hr/organization/chart"),
};

// Share the production read path with navigation/race tests. All operations here are GETs.
export async function readHrView(
  role: Role,
  employeeId: string | null,
  onWorkspace: (workspace: HrWorkspace) => void,
  isCurrent: () => boolean,
): Promise<EmployeeDetail | null> {
  const workspace = await hrApi.workspace(role);
  if (!isCurrent()) return null;
  onWorkspace(workspace);
  if (!employeeId || workspace.sourceStatus === "NOT_CONFIGURED") return null;
  if (!workspace.employees.some((employee) => employee.id === employeeId)) {
    throw new HrApiError(
      "Expediente no disponible en el directorio visible para esta cuenta.",
      404,
    );
  }
  const employee = await hrApi.employee(role, employeeId);
  if (!isCurrent()) return null;
  if (employee.employee.id !== employeeId) {
    throw new HrApiError("La respuesta no corresponde al expediente seleccionado.", 502);
  }
  return employee;
}
