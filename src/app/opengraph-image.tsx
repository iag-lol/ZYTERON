import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "radial-gradient(circle at 20% 20%, rgba(29,78,216,0.22), transparent 45%), radial-gradient(circle at 85% 80%, rgba(6,182,212,0.2), transparent 40%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0f172a 100%)",
          color: "#ffffff",
          padding: "72px",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              height: 74,
              width: 74,
              borderRadius: 16,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.35)",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 38,
            }}
          >
            Z
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: 1 }}>ZYTERON</span>
            <span style={{ fontSize: 19, opacity: 0.95 }}>Web · Sistemas · Soporte TI</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ fontSize: 58, fontWeight: 800, maxWidth: 920, lineHeight: 1.05 }}>
            Webs, sistemas y soporte TI para empresas
          </span>
          <span style={{ fontSize: 30, opacity: 0.95 }}>Santiago, Chile</span>
        </div>

        <div style={{ display: "flex", fontSize: 28, opacity: 0.97 }}>www.zyteron.cl</div>
      </div>
    ),
    size,
  );
}
