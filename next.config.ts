import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com https://www.google.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDevelopment ? " http://localhost:* ws://localhost:* ws://127.0.0.1:*" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googleadservices.com https://www.google.com https://pagead2.googlesyndication.com https://*.doubleclick.net https://*.supabase.co wss://*.supabase.co https://api.resend.com https://sandbox.flow.cl https://www.flow.cl`,
  // 'self' y blob: habilitan el visor de PDF embebido y la impresión de
  // documentos propios (contratos, cotizaciones) desde un iframe del mismo
  // origen. Sin ellos el navegador bloquea el marco y no se ve nada.
  // www.google.com permite el mapa embebido de la oficina (footer).
  "frame-src 'self' blob: https://www.googletagmanager.com https://www.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "media-src 'self' data: https:",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  typescript: {
    // Prisma client types require a generated client — skip build-time TS check for DB layer
    ignoreBuildErrors: true,
  },
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    deviceSizes: [320, 384, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 200, 256, 300, 384, 512, 640, 800],
    qualities: [75, 80, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.falabella.com",
      },
      {
        protocol: "https",
        hostname: "cdnx.jumpseller.com",
      },
      {
        // Imágenes subidas al Storage de Supabase (portadas de blog e imágenes de casos)
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      // Consolidación SEO: estas URLs antiguas o duplicadas ya compiten con
      // páginas principales. Los redirects permanentes concentran sus señales
      // y evitan que Google siga rastreando versiones equivalentes.
      {
        source: "/blog/diferencia-pagina-web-tienda-online-sistema-web",
        destination: "/blog/pagina-web-tienda-online-o-sistema-web-cual-necesita-tu-empresa",
        permanent: true,
      },
      {
        source: "/blog/seo-para-pymes-chile",
        destination: "/servicios/seo-para-empresas-chile",
        permanent: true,
      },
      {
        source: "/servicios/desarrollo-web-chile",
        destination: "/desarrollo-web",
        permanent: true,
      },
      {
        source: "/servicios/paginas-web-para-empresas",
        destination: "/desarrollo-web",
        permanent: true,
      },
      {
        source: "/servicios/creacion-de-sitios-web-para-empresas",
        destination: "/desarrollo-web",
        permanent: true,
      },
      {
        source: "/servicios/paginas-web-para-pymes",
        destination: "/paginas-web-para-pymes",
        permanent: true,
      },
      {
        source: "/servicios/diseno-web-chile",
        destination: "/diseno-web-empresas",
        permanent: true,
      },
      {
        source: "/servicios/agencia-diseno-web-chile",
        destination: "/diseno-web-empresas",
        permanent: true,
      },
      {
        // "Diseño web Santiago" se consolida en la página pilar de Santiago.
        source: "/servicios/diseno-web-santiago",
        destination: "/paginas-web-santiago",
        permanent: true,
      },
      {
        // Duplicaba la intención de /tiendas-online con contenido casi igual.
        source: "/tiendas-online-chile",
        destination: "/tiendas-online",
        permanent: true,
      },
      {
        // Duplicaba la intención de /sistemas-web (mismo metaTitle objetivo).
        source: "/sistemas-web-a-medida",
        destination: "/sistemas-web",
        permanent: true,
      },
      // Landings locales generadas por plantilla (5 servicios × 35 comunas):
      // contenido casi duplicado sin valor individual. Se consolidan en la
      // página del servicio; las variantes "santiago" van a la página local real.
      {
        source: "/desarrollo-web/santiago",
        destination: "/desarrollo-web-santiago",
        permanent: true,
      },
      {
        source: "/desarrollo-web/:ubicacion",
        destination: "/desarrollo-web",
        permanent: true,
      },
      {
        source: "/diseno-web/santiago",
        destination: "/paginas-web-santiago",
        permanent: true,
      },
      {
        source: "/diseno-web/:ubicacion",
        destination: "/diseno-web-empresas",
        permanent: true,
      },
      {
        source: "/diseno-web",
        destination: "/diseno-web-empresas",
        permanent: true,
      },
      {
        source: "/paginas-web-para-pymes/santiago",
        destination: "/paginas-web-santiago",
        permanent: true,
      },
      {
        source: "/paginas-web-para-pymes/:ubicacion",
        destination: "/paginas-web-para-pymes",
        permanent: true,
      },
      {
        source: "/sistemas-web/:ubicacion",
        destination: "/sistemas-web",
        permanent: true,
      },
      {
        source: "/soporte-ti/santiago",
        destination: "/soporte-ti-pymes-santiago",
        permanent: true,
      },
      {
        source: "/soporte-ti/:ubicacion",
        destination: "/soporte-ti",
        permanent: true,
      },
      {
        // Hub local noindex y huérfano: se consolida en el servicio principal.
        source: "/ciudades",
        destination: "/desarrollo-web",
        permanent: true,
      },
      {
        source: "/ciudades/:slug",
        destination: "/desarrollo-web",
        permanent: true,
      },
      {
        source: "/nosotros",
        destination: "/quienes-somos",
        permanent: true,
      },
      {
        source: "/nosotros/:path*",
        destination: "/quienes-somos",
        permanent: true,
      },
      {
        // /paquetes ya no existe: se unifica en /cotizador para no competir.
        source: "/paquetes",
        destination: "/cotizador",
        permanent: true,
      },
      {
        source: "/paquetes/:path*",
        destination: "/cotizador",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.zyteron.cl",
          },
          {
            type: "header",
            key: "x-forwarded-proto",
            value: "http",
          },
        ],
        destination: "https://www.zyteron.cl/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "zyteron.cl",
          },
        ],
        destination: "https://www.zyteron.cl/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|gif|ico|avif|woff|woff2|ttf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
