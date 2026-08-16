import { analyticsConfig } from "@/config/analytics";

type GoogleAdsEventParams = Record<string, string | number | boolean | null | undefined>;

export function trackAnalyticsEvent(eventName: string, eventParams?: GoogleAdsEventParams) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  try {
    window.gtag("event", eventName, eventParams ?? {});
  } catch {
    // La medicion nunca debe interrumpir el flujo principal del formulario.
  }
}

export function trackGoogleAdsEvent(eventName: string, eventParams?: GoogleAdsEventParams) {
  trackAnalyticsEvent(eventName, eventParams);
}

export function trackGenerateLead(params?: GoogleAdsEventParams) {
  trackAnalyticsEvent("generate_lead", params);
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
  trackAnalyticsEvent("conversion", {
    send_to: analyticsConfig.googleAdsQuoteRequestSendTo,
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
  trackGenerateLead({ form_type: "chat_ia", ...params });
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
