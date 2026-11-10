"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const BLOCK_SELECTOR = "main section > .site-container > *";
const STAGGER_MS = 80;
const MAX_STAGGER_STEPS = 4;

/**
 * Revela con fade + desplazamiento corto los bloques de cada sección cuando
 * entran al viewport, en todas las páginas públicas y sin tocar su marcado.
 *
 * El contenido permanece visible hasta que comienza la animación. Un salto
 * de scroll o la falta de IntersectionObserver no puede ocultar un bloque.
 * Las grillas escalonan a sus hijos por columna.
 */
export function MotionObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fold = window.innerHeight * 0.92;
    const targets: HTMLElement[] = [];

    const collect = (node: HTMLElement, delay: number) => {
      if (node.closest("[data-no-motion], form, .split-head")) return;
      if (node.getBoundingClientRect().top < fold) return;
      if (delay) node.style.setProperty("--mo-delay", `${delay}ms`);
      targets.push(node);
    };

    const visit = (block: HTMLElement) => {
      const children = Array.from(block.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      );
      const isGrid = getComputedStyle(block).display === "grid" && children.length > 1;
      if (!isGrid) return collect(block, 0);
      children.forEach((child) => {
        const column = children
          .filter((other) => other.offsetTop === child.offsetTop)
          .indexOf(child);
        collect(child, Math.min(column, MAX_STAGGER_STEPS) * STAGGER_MS);
      });
    };

    for (const block of document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
      // Listas largas marcadas con data-reveal-items: cada ítem entra solo.
      if (block.hasAttribute("data-reveal-items")) {
        for (const item of block.children) {
          if (item instanceof HTMLElement) collect(item, 0);
        }
        continue;
      }
      // Columnas de un contenedor en grilla (p. ej. .split) entran completas.
      if (getComputedStyle(block.parentElement!).display === "grid") {
        collect(block, 0);
        continue;
      }
      visit(block);
    }

    if (!targets.length) return;

    const finish = (event: AnimationEvent) => {
      if (event.animationName !== "content-reveal") return;
      const node = event.currentTarget as HTMLElement;
      node.classList.remove("mo-in");
      node.style.removeProperty("--mo-delay");
      node.removeEventListener("animationend", finish);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const node = entry.target as HTMLElement;
          node.addEventListener("animationend", finish);
          // Respaldo por si el navegador no emite animationend.
          window.setTimeout(() => {
            node.classList.remove("mo-in");
            node.style.removeProperty("--mo-delay");
          }, 1600);
          node.classList.add("mo-in");
          observer.unobserve(node);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );

    targets.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      for (const node of targets) {
        node.classList.remove("mo-in");
        node.style.removeProperty("--mo-delay");
        node.removeEventListener("animationend", finish);
      }
    };
  }, [pathname]);

  return null;
}
