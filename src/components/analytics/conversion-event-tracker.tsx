"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/google-ads";

function classifyTrackedHref(href: string) {
  if (href.startsWith("https://wa.me/")) return "whatsapp_click";
  if (href.startsWith("mailto:")) return "email_click";
  if (href.startsWith("tel:")) return "phone_click";

  try {
    const url = new URL(href);
    if (url.origin !== window.location.origin) return "";
    if (url.pathname === "/contacto") return "contact_cta_click";
    if (url.pathname === "/cotizador") return "quote_cta_click";
  } catch {
    return "";
  }

  return "";
}

export function ConversionEventTracker() {
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;

      const eventName = classifyTrackedHref(target.href);
      if (!eventName) return;

      trackAnalyticsEvent(eventName, {
        page_path: window.location.pathname,
        destination_path: `${target.pathname}${target.search}`,
        link_text: target.textContent?.trim().slice(0, 80) || undefined,
      });
    }

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => document.removeEventListener("click", handleDocumentClick, { capture: true });
  }, []);

  return null;
}
