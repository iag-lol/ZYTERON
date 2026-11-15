"use client";

import { isExcludedWebVisitPath } from "@/lib/analytics/visit-privacy";
import { analyticsConfig } from "@/config/analytics";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { serviceLineFor, solutionFamilyFor } from "@/lib/commercial/request-context";
import { trackAnalyticsEvent } from "@/lib/analytics/google-ads";
import { buildCtaClickEvent } from "@/lib/analytics/cta-click";

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

      const cta = buildCtaClickEvent(target.href, window.location.href, target.dataset.serviceLine);
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
      if (cta) trackAnalyticsEvent(cta.eventName, cta.params);
    }

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => document.removeEventListener("click", handleDocumentClick, { capture: true });
  }, []);

  return null;
}
