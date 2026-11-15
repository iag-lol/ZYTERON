import { safeEventParams } from "./event-privacy";
import { isExcludedWebVisitPath } from "./visit-privacy";
import {
  resolveRequestContext,
  serviceLineFor,
  solutionFamilyFor,
} from "@/lib/commercial/request-context";

type CtaClickEventName =
  | "whatsapp_click"
  | "email_click"
  | "phone_click"
  | "contact_cta_click"
  | "quote_cta_click";

export function buildCtaClickEvent(href: string, currentUrl: string, serviceHint = "") {
  try {
    const current = new URL(currentUrl);
    if (isExcludedWebVisitPath(current.pathname)) return null;
    const destination = new URL(href, current);
    const internal = destination.origin === current.origin;
    const route = destination.pathname.replace(/\/+$/, "") || "/";
    let eventName: CtaClickEventName;
    let formType: string | undefined;

    if (destination.protocol === "https:" && destination.host === "wa.me")
      eventName = "whatsapp_click";
    else if (destination.protocol === "mailto:") eventName = "email_click";
    else if (destination.protocol === "tel:") eventName = "phone_click";
    else if (internal && route === "/contacto") {
      eventName = "contact_cta_click";
      formType = "contact";
    } else if (
      internal &&
      (route === "/cotizar" || route === "/cotizador" || route.startsWith("/cotizador/"))
    ) {
      // Abrir o configurar una cotización no equivale a comenzar un pago.
      eventName = "quote_cta_click";
      formType =
        route === "/cotizador/manual" || route.startsWith("/cotizador/manual/")
          ? "manual_quote"
          : "quote_request";
    } else return null;

    const context = internal ? resolveRequestContext(destination.searchParams) : null;
    return {
      eventName,
      params: safeEventParams({
        page_path: current.pathname,
        destination_path: internal ? destination.pathname : undefined,
        form_type: formType,
        plan_id: context?.planId,
        solution_family: context?.projectType
          ? context.solutionFamily
          : solutionFamilyFor(current.pathname),
        service_line: context?.projectType
          ? context.serviceLine
          : serviceLineFor(`${current.pathname} ${serviceHint}`),
      }),
    };
  } catch {
    return null;
  }
}
