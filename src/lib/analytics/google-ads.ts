import { isExcludedWebVisitPath } from "@/lib/analytics/visit-privacy";
import { safeEventParams } from "@/lib/analytics/event-privacy";

import { analyticsConfig } from "@/config/analytics";

type GoogleAdsEventParams = Record<string, string | number | boolean | null | undefined>;

export function trackAnalyticsEvent(eventName: string, eventParams?: GoogleAdsEventParams) {
  if (typeof window === "undefined" || isExcludedWebVisitPath(window.location.pathname)) return;
  if (typeof window.gtag !== "function") {
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };
  }

  try {
    window.gtag("set", { page_location: window.location.origin + window.location.pathname });
    const destination =
      /^G-[A-Z0-9]+$/.test(analyticsConfig.googleAnalyticsId) && eventName !== "conversion"
        ? { send_to: analyticsConfig.googleAnalyticsId }
        : {};
    window.gtag("event", eventName, { ...safeEventParams(eventParams), ...destination });
  } catch {
    // La medicion nunca debe interrumpir el flujo principal del formulario.
  }
}

export function trackGoogleAdsEvent(eventName: string, eventParams?: GoogleAdsEventParams) {
  trackAnalyticsEvent(eventName, eventParams);
}

const emittedReceipts = new Set<string>();
function oncePerReceipt(event: string, params?: GoogleAdsEventParams) {
  const id = params?.lead_id;
  if (
    typeof id !== "string" ||
    !/^[a-f0-9-]{36}$/.test(id) ||
    typeof window === "undefined" ||
    typeof window.gtag !== "function"
  )
    return false;
  const key = `zyteron:receipt:${event}:${id}`;
  if (emittedReceipts.has(key)) return false;
  try {
    if (sessionStorage.getItem(key)) return false;
  } catch {
    /* Acceso opcional. */
  }
  emittedReceipts.add(key);
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* Deduplicación en memoria disponible. */
  }
  return true;
}

export function trackGenerateLead(params?: GoogleAdsEventParams) {
  if (oncePerReceipt("generate_lead", params)) trackAnalyticsEvent("generate_lead", params);
}

export function trackContactFormSubmit(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("contact_form_submit", params);
  trackGenerateLead({
    form_type: "contact",
    ...params,
  });
}

export function trackQuoteRequestSubmit(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("quote_request_submit", params);
  trackGenerateLead({
    form_type: "quote_request",
    ...params,
  });
}

export function trackBeginCheckout(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("begin_checkout", params);
}

export function trackQuoteRequestConversion(params?: GoogleAdsEventParams) {
  if (!oncePerReceipt("conversion", params)) return;
  trackAnalyticsEvent("conversion", {
    send_to: analyticsConfig.googleAdsQuoteRequestSendTo,
    transaction_id: params?.lead_id,
    ...params,
  });
}

/**
 * Embudo del cotizador. `quote_step` se emite en cada avance para poder medir
 * en qué paso se cae el usuario, no solo si terminó.
 */
export function trackQuoteStart(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("quote_start", params);
}

export function trackQuoteStep(step: number, params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("quote_step", { step, ...params });
}

export function trackQuoteComplete(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("quote_complete", params);
}

/** Clic en cualquier CTA que lleva al cotizador, desde cualquier página. */
export function trackCtaQuoteClick(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("cta_quote_click", params);
}

/** Chat IA: apertura, calificación del lead y traspaso a un humano. */
export function trackChatOpen(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("chat_open", params);
}

export function trackChatQualified(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("chat_qualified", params);
}

export function trackChatHandoff(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("chat_handoff", params);
}

/** Planes: vista de la vitrina y selección de un plan concreto. */
export function trackPlanView(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("plan_view", params);
}

export function trackPlanSelect(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("plan_select", params);
}

/** Vista de un caso de éxito, usado como señal de prueba social. */
export function trackCaseView(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("case_view", params);
}
