"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { analyticsConfig } from "@/config/analytics";
import { isExcludedWebVisitPath } from "@/lib/analytics/visit-privacy";

const subscribeHost = () => () => {};
const isProductionHost = () => /^(www\.)?zyteron\.cl$/.test(window.location.hostname);
const serverHost = () => false;

export function GoogleAdsTag() {
  const pathname = usePathname();
  const publicHost = useSyncExternalStore(subscribeHost, isProductionHost, serverHost);
  if (!publicHost || isExcludedWebVisitPath(pathname)) return null;
  const ga4 = /^G-[A-Z0-9]+$/.test(analyticsConfig.googleAnalyticsId)
    ? analyticsConfig.googleAnalyticsId
    : "";
  return (
    <>
      <Script id="google-ads-tag-init" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};
      window.gtag('js', new Date());
      var cleanReferrer = '';
      try { var r = new URL(document.referrer); if (!/^\\/(admin|api|portal|clientes|auth|login|boletas\\/consulta|checkout|pagos)/.test(r.pathname)) cleanReferrer = r.origin + r.pathname; } catch (_) {}
      window.gtag('set', { page_location: location.origin + location.pathname, page_referrer: cleanReferrer });
      window.gtag('config', '${analyticsConfig.googleAdsTagId}');
      ${ga4 ? `window.gtag('config', '${ga4}', { send_page_view: false });` : ""}
    `}</Script>
      <Script
        id="google-ads-tag-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.googleAdsTagId}`}
        strategy="lazyOnload"
      />
      <Script id="gtm-base" strategy="lazyOnload">{`
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${analyticsConfig.googleTagManagerId}');
    `}</Script>
    </>
  );
}
