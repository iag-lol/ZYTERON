import { publicPath } from "@/lib/commercial/request-context";

type EventParams = Record<string, string | number | boolean | null | undefined>;
const codes = new Set([
  "service_line",
  "solution_family",
  "form_type",
  "error_type",
  "plan_id",
  "project_id",
  "project_type",
  "metric_name",
  "rating",
  "device_category",
  "source",
  "form_id",
  "demo_id",
]);
const amounts = new Set(["step", "value", "estimate", "metric_value", "delta", "quantity"]);

/** Solo dimensiones controladas: nunca texto libre, teléfonos, query strings ni correos. */
export function safeEventParams(params: EventParams = {}): EventParams {
  const safe: EventParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (
      (key === "page_path" || key === "destination_path" || key === "entry_path") &&
      typeof value === "string"
    ) {
      const route = publicPath(value);
      if (route) safe[key] = route;
    } else if (codes.has(key) && typeof value === "string" && /^[a-z0-9_-]{1,80}$/.test(value))
      safe[key] = value;
    else if (amounts.has(key) && typeof value === "number" && Number.isFinite(value))
      safe[key] = value;
    else if (
      (key === "lead_id" || key === "transaction_id") &&
      typeof value === "string" &&
      /^[a-f0-9-]{36}$/.test(value)
    )
      safe[key] = value;
    else if (key === "currency" && value === "CLP") safe[key] = value;
    else if (
      key === "send_to" &&
      typeof value === "string" &&
      /^AW-\d+\/[a-zA-Z0-9_-]+$/.test(value)
    )
      safe[key] = value;
  }
  return safe;
}
