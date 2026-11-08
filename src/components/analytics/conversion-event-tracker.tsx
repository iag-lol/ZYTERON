"use client";

import { isExcludedWebVisitPath } from "@/lib/analytics/visit-privacy";
import { analyticsConfig } from "@/config/analytics";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { serviceLineFor, solutionFamilyFor } from "@/lib/commercial/request-context";
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
  const pathname = usePathname();
  useEffect(() => {
    if (isExcludedWebVisitPath(pathname)) return;
    const serviceLine = serviceLineFor(pathname);
    const solutionFamily = solutionFamilyFor(pathname);
    if (analyticsConfig.googleAnalyticsId)
      trackAnalyticsEvent("page_view", {
        page_path: pathname,
        service_line: serviceLine,
        solution_family: solutionFamily,
      });
    if (
      serviceLine !== "sin_definir" &&
      /^\/(desarrollo-web|paginas-web|tiendas-online|catalogos-digitales|sistemas-web|automatizacion|soporte-ti|servicios)([/-]|$)/.test(
        pathname,
      )
    )
      trackAnalyticsEvent("service_view", {
        page_path: pathname,
        service_line: serviceLine,
        solution_family: solutionFamily,
      });
    if (pathname.startsWith("/casos-exito/") || pathname === "/soluciones/denurvia")
      trackAnalyticsEvent("project_view", {
        page_path: pathname,
        service_line: serviceLine,
        solution_family: solutionFamily,
      });
    if (pathname.startsWith("/demos/"))
      trackAnalyticsEvent("demo_open", {
        page_path: pathname,
        service_line: serviceLine,
        solution_family: solutionFamily,
      });
  }, [pathname]);
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;

      const eventName = classifyTrackedHref(target.href);
      if (target.dataset.solutionFamily)
        trackAnalyticsEvent("solution_explore", {
          page_path: window.location.pathname,
          solution_family: target.dataset.solutionFamily.replaceAll("-", "_"),
        });
      if (target.dataset.projectId)
        trackAnalyticsEvent("project_open", {
          page_path: window.location.pathname,
          destination_path: target.pathname,
          project_id: target.dataset.projectId,
          solution_family: solutionFamilyFor(target.pathname),
        });
      if (!eventName) return;

      trackAnalyticsEvent(eventName, {
        page_path: window.location.pathname,
        solution_family: solutionFamilyFor(
          target.origin === window.location.origin
            ? new URL(target.href).searchParams.get("servicio") ||
                new URL(target.href).searchParams.get("tipo") ||
                window.location.pathname
            : window.location.pathname,
        ),
        destination_path: target.origin === window.location.origin ? target.pathname : undefined,
        service_line: serviceLineFor(
          window.location.pathname +
            " " +
            (target.dataset.serviceLine || "") +
            " " +
            (target.origin === window.location.origin
              ? new URL(target.href).searchParams.get("tipo") ||
                new URL(target.href).searchParams.get("servicio") ||
                ""
              : ""),
        ),
      });
    }

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => document.removeEventListener("click", handleDocumentClick, { capture: true });
  }, []);

  return null;
}
