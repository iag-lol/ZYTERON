import { ImageResponse } from "next/og";

export const alt = "Becas Web Pyme — apoyo digital para negocios en Chile | Zyteron";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundImage:
            "linear-gradient(135deg, #0a1230 0%, #10245c 45%, #1d4ed8 100%)",
          color: "#ffffff",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "#1d4ed8",
              color: "#ffffff",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            Z
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 600, letterSpacing: -0.5 }}>
            zyteron.cl
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: -1.5,
              maxWidth: 1000,
            }}
          >
            Becas Web Pyme
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 500,
              color: "#dbeafe",
              maxWidth: 980,
              lineHeight: 1.3,
            }}
          >
            Apoyo digital para negocios en Chile
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 400,
              color: "#bfdbfe",
            }}
          >
            Zyteron — Desarrollo web en Chile
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: "100%",
            height: 6,
            borderRadius: 3,
            backgroundColor: "#3b82f6",
          }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}
