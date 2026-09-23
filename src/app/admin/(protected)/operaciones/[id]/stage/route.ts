import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { configuredRequestOrigins, isAllowedMutationOrigin } from "@/lib/security/request-origin";
import {
  OperationInputError,
  PROCESS_OUTCOMES,
  PROCESS_PRIORITIES,
  PROCESS_STATUSES,
  ensureClientProcess,
  isOperationsSchemaMissingError,
  transitionClientProcess,
  type ProcessOutcome,
  type ProcessPriority,
  type ProcessStatus,
} from "@/lib/admin/operations";
import { isOperationStage, type OperationStage } from "@/lib/admin/operations-workflow";

type Context = {
  params: Promise<{ id: string }>;
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function checked(formData: FormData, key: string) {
  return ["1", "true", "yes", "on"].includes(value(formData, key).toLowerCase());
}

function parseStatus(raw: string): ProcessStatus | null {
  const normalized = raw.toUpperCase();
  return PROCESS_STATUSES.includes(normalized as ProcessStatus)
    ? (normalized as ProcessStatus)
    : null;
}

function parseOutcome(raw: string): ProcessOutcome | undefined {
  const normalized = raw.toUpperCase();
  if (!normalized || normalized === "NONE" || normalized === "NULL") return null;
  return PROCESS_OUTCOMES.includes(normalized as Exclude<ProcessOutcome, null>)
    ? (normalized as Exclude<ProcessOutcome, null>)
    : undefined;
}

function parsePriority(raw: string): ProcessPriority | undefined {
  const normalized = raw.toUpperCase();
  return PROCESS_PRIORITIES.includes(normalized as ProcessPriority)
    ? (normalized as ProcessPriority)
    : undefined;
}

function parseDate(raw: string) {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new OperationInputError("INVALID_DATE", "La fecha de próxima acción no es válida.");
  }
  return parsed;
}

function parseVersion(raw: string) {
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function redirectUrl(request: Request) {
  return new URL("/admin/operaciones", request.url);
}

function redirectWith(request: Request, key: string, value: string) {
  const target = redirectUrl(request);
  target.searchParams.set(key, value);
  return NextResponse.redirect(target, { status: 303 });
}

function mutationOriginIsAllowed(request: Request) {
  const url = new URL(request.url);
  return isAllowedMutationOrigin({
    requestOrigin: url.origin,
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    allowedOrigins: configuredRequestOrigins(),
    hasBearerAuthorization: request.headers
      .get("authorization")
      ?.toLowerCase()
      .startsWith("bearer "),
  });
}

function publicErrorCode(error: unknown) {
  if (isOperationsSchemaMissingError(error)) return "schema_missing";
  if (error instanceof OperationInputError) return error.code.toLowerCase();
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
  if (code === "P2025") return "not_found";
  return "unexpected";
}

export async function POST(request: Request, context: Context) {
  if (!mutationOriginIsAllowed(request)) {
    return redirectWith(request, "operation_error", "origin");
  }

  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  const actorId = auth.legacy ? null : auth.session.user.id;
  const { id } = await context.params;

  try {
    const formData = await request.formData();
    const action = value(formData, "action") || "transition";

    if (action === "ensure") {
      const result = await ensureClientProcess({
        quoteId: value(formData, "quoteId") || null,
        clientId: value(formData, "clientId") || null,
        actorId,
      });
      revalidatePath("/admin/operaciones");
      const target = redirectUrl(request);
      target.searchParams.set(result.created ? "process_created" : "process_reused", "1");
      target.searchParams.set("focus", result.id);
      return NextResponse.redirect(target, { status: 303 });
    }

    if (action !== "transition") {
      throw new OperationInputError("INVALID_ACTION", "Acción operativa no válida.");
    }

    const toStageRaw = value(formData, "stage").toUpperCase();
    const status = parseStatus(value(formData, "status"));
    const outcome = parseOutcome(value(formData, "outcome"));
    const priority = parsePriority(value(formData, "priority"));

    if (!isOperationStage(toStageRaw)) {
      throw new OperationInputError("INVALID_STAGE", "La etapa seleccionada no es válida.");
    }
    if (!status) {
      throw new OperationInputError("INVALID_STATUS", "El estado seleccionado no es válido.");
    }
    if (outcome === undefined) {
      throw new OperationInputError("INVALID_OUTCOME", "El resultado comercial no es válido.");
    }

    await transitionClientProcess({
      processId: id,
      toStage: toStageRaw as OperationStage,
      status,
      outcome,
      priority,
      owner: value(formData, "owner") || null,
      nextAction: value(formData, "nextAction") || null,
      nextActionAt: parseDate(value(formData, "nextActionAt")),
      requiresInitialPayment: checked(formData, "requiresInitialPayment"),
      allowOverride: checked(formData, "allowOverride"),
      reason: value(formData, "reason") || null,
      actorId,
      expectedVersion: parseVersion(value(formData, "version")),
    });

    revalidatePath("/admin/operaciones");
    const target = redirectUrl(request);
    target.searchParams.set("process_updated", "1");
    target.searchParams.set("focus", id);
    return NextResponse.redirect(target, { status: 303 });
  } catch (error) {
    console.error("[admin/operations] mutation failed", error);
    return redirectWith(request, "operation_error", publicErrorCode(error));
  }
}
