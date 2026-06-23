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
