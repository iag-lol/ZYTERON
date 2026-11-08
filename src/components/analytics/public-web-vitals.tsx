"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackAnalyticsEvent } from "@/lib/analytics/google-ads";
import { serviceLineFor } from "@/lib/commercial/request-context";

const report: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  if (!["LCP", "INP", "CLS"].includes(metric.name)) return;
  trackAnalyticsEvent("web_vital", {
    metric_name: metric.name.toLowerCase(),
    metric_value: metric.value,
    rating: metric.rating,
    page_path: window.location.pathname,
    service_line: serviceLineFor(window.location.pathname),
    device_category: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
  });
};

export function PublicWebVitals() {
  useReportWebVitals(report);
  return null;
}
