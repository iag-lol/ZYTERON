"use client";
import { usePathname } from "next/navigation";
import { isExcludedWebVisitPath } from "@/lib/analytics/visit-privacy";
import { GoogleAdsTag } from "./google-ads-tag";
import { WebVisitTracker } from "./web-visit-tracker";
import { ConversionEventTracker } from "./conversion-event-tracker";
import { PublicWebVitals } from "./public-web-vitals";
export function PublicAnalytics() {
  const pathname = usePathname();
  if (isExcludedWebVisitPath(pathname)) return null;
  return (
    <>
      <GoogleAdsTag />
      <WebVisitTracker />
      <ConversionEventTracker />
      <PublicWebVitals />
    </>
  );
}
