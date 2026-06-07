import Script from "next/script";
import { analyticsConfig } from "@/config/analytics";

export function GoogleAdsTag() {
  return (
    <>
      <Script
        id="google-ads-tag-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.googleAdsTagId}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-tag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};
          window.gtag('js', new Date());
          window.gtag('config', '${analyticsConfig.googleAdsTagId}');
        `}
      </Script>
    </>
  );
}
