"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Retardo de entrada en ms, útil para escalonar tarjetas de una grilla. */
  delay?: number;
  as?: "div" | "article" | "section" | "li";
};

/**
 * Revela su contenido con fade + translate cuando entra al viewport.
 *
 * A prueba de fallos: el contenido NUNCA se oculta por CSS estático. El
 * ocultamiento (`reveal-hidden`) lo aplica este efecto justo al crear el
 * IntersectionObserver, y sólo para elementos bajo el pliegue. Si el JS no
 * carga, falla la hidratación o el navegador no soporta IO, la página queda
 * completa y visible — sólo se pierde la animación.
 */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Los elementos ya visibles en el primer viewport quedan intactos para
    // evitar parpadeos; sólo se anima lo que entra después con scroll.
    const initiallyVisible = node.getBoundingClientRect().top < window.innerHeight * 0.96;
    if (initiallyVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.remove("reveal-hidden");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    node.classList.add("reveal-hidden");
    observer.observe(node);

    return () => {
      observer.disconnect();
      node.classList.remove("reveal-hidden");
    };
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn("reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
