"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { siteConfig } from "@/config/site";

const MAP_QUERY = encodeURIComponent(
  `${siteConfig.address.streetAddress}, ${siteConfig.address.commune}, ${siteConfig.address.city}, Chile`,
);
const MAP_EMBED_URL = `https://www.google.com/maps?q=${MAP_QUERY}&hl=es&z=16&output=embed`;
const MAP_LINK_URL = `https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`;

// El iframe de Google Maps pesa ~1MB; solo se monta cuando el footer entra al
// viewport para no afectar LCP/INP de la página.
export function LocationMap({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setShouldLoad(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900">
        {shouldLoad ? (
          <iframe
            src={MAP_EMBED_URL}
            title={`Mapa de ubicación: ${siteConfig.address.display}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
            <MapPin className="h-6 w-6" aria-hidden />
            <span className="px-6 text-center text-xs">{siteConfig.address.display}</span>
          </div>
        )}
      </div>
      <a
        href={MAP_LINK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-white"
      >
        <MapPin className="h-3.5 w-3.5" aria-hidden />
        Ver en Google Maps
      </a>
    </div>
  );
}
