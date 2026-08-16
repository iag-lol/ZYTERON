import { siteConfig } from "@/config/site";

const ogImageByPath: Record<string, string> = {
  "/": "/og/home.png",
  "/automatizacion": "/og/automatizacion.png",
  "/automatizacion-whatsapp-empresas": "/og/automatizacion.png",
  "/blog": "/og/blog.png",
  "/casos-exito": "/og/casos-exito.png",
  "/contacto": "/og/contacto.png",
  "/cotizador": "/og/planes.png",
  "/demos": "/og/demos.png",
  "/desarrollo-web": "/og/desarrollo-web.png",
  "/desarrollo-web-santiago": "/og/desarrollo-web.png",
  "/diseno-web-empresas": "/og/desarrollo-web.png",
  "/faq": "/og/faq.png",
  "/quienes-somos": "/og/quienes-somos.png",
  "/paginas-web-para-pymes": "/og/desarrollo-web.png",
  "/paginas-web-santiago": "/og/desarrollo-web.png",
  "/planes": "/og/planes.png",
  "/productos": "/og/productos.png",
  "/servicios": "/og/servicios.png",
  "/sistemas-web": "/og/sistemas-web.png",
  "/soporte-ti": "/og/soporte-ti.png",
  "/soporte-ti-pymes-santiago": "/og/soporte-ti.png",
  "/tiendas-online": "/og/tiendas-online.png",
};

function normalizePath(path: string) {
  if (!path || path === "/") return "/";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return new URL(path).pathname || "/";
  }
  return path.startsWith("/") ? path.split("?")[0] : `/${path.split("?")[0]}`;
}

export function getOgImagePath(path: string) {
  const normalized = normalizePath(path);

  if (ogImageByPath[normalized]) {
    return ogImageByPath[normalized];
  }

  if (normalized.startsWith("/blog/")) return "/og/blog.png";
  if (normalized.startsWith("/casos-exito/")) return "/og/casos-exito.png";
  if (normalized.startsWith("/servicios/")) return "/og/servicios.png";

  return "/og/home.png";
}

export function getAbsoluteOgImageUrl(path: string) {
  return `${siteConfig.url}${getOgImagePath(path)}`;
}
