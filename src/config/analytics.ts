export const analyticsConfig = {
  googleAdsTagId: process.env.NEXT_PUBLIC_GOOGLE_ADS_TAG_ID || "AW-18189909508",
  googleAdsQuoteRequestSendTo:
    process.env.NEXT_PUBLIC_GOOGLE_ADS_QUOTE_REQUEST_SEND_TO || "AW-18189909508/FOSBCLuP1bUcEIT8z-FD",
  googleTagManagerId: process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || "GTM-T46H3ZCS",
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
} as const;
