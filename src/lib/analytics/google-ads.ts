const CONTACT_FORM_CONVERSION_EVENT = "ads_conversion_Contactar_1";

type GoogleAdsEventParams = Record<string, string | number | boolean | null | undefined>;

export function trackGoogleAdsEvent(eventName: string, eventParams?: GoogleAdsEventParams) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  try {
    window.gtag("event", eventName, eventParams ?? {});
  } catch {
    // La medicion nunca debe interrumpir el flujo principal del formulario.
  }
}

export function trackContactFormConversion(params?: GoogleAdsEventParams) {
  trackGoogleAdsEvent(CONTACT_FORM_CONVERSION_EVENT, params);
}
