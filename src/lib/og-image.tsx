import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const ogImageSize = {
  width: 1200,
  height: 630,
};

type GenerateOgImageInput = {
  title: string;
  subtitle?: string;
  tag?: string;
};

export function generateZyteronOgImage({ title, subtitle, tag }: GenerateOgImageInput) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "radial-gradient(circle at 18% 20%, rgba(96,165,250,0.28), transparent 42%), radial-gradient(circle at 88% 74%, rgba(20,184,166,0.22), transparent 38%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f172a 100%)",
          color: "#ffffff",
          padding: "68px",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                height: 78,
                width: 78,
                borderRadius: 18,
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.34)",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 42,
              }}
            >
              Z
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 42, fontWeight: 900 }}>ZYTERON</span>
              <span style={{ fontSize: 20, opacity: 0.92 }}>Web · Sistemas · Soporte TI</span>
            </div>
          </div>
          <span
            style={{
              border: "1px solid rgba(255,255,255,0.28)",
              borderRadius: 999,
              padding: "10px 18px",
              fontSize: 22,
              fontWeight: 800,
              background: "rgba(255,255,255,0.12)",
            }}
          >
            {tag ?? "Blog para empresas"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 60, fontWeight: 900, maxWidth: 980, lineHeight: 1.04 }}>
            {title}
          </span>
          {subtitle ? (
            <span style={{ fontSize: 28, opacity: 0.94, maxWidth: 980, lineHeight: 1.25 }}>
              {subtitle}
            </span>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, opacity: 0.96 }}>
          <span>{siteConfig.address.display}</span>
          <span>{siteConfig.domain}</span>
        </div>
      </div>
    ),
    ogImageSize,
  );
}
