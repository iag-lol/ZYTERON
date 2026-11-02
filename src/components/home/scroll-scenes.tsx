"use client";

import { useEffect } from "react";

/**
 * Modos de progreso de una escena (`data-scene`), todos normalizados a 0..1:
 * - exit:  0 con el borde superior en el tope del viewport, 1 cuando el
 *          elemento ya salió completo por arriba (ideal para el hero).
 * - pin:   avance dentro de un contenedor alto con hijo sticky.
 * - view:  recorrido completo, desde que asoma abajo hasta que sale arriba.
 * - enter: 0 al asomar por abajo, 1 cuando su tope llega al 25% del viewport.
 * - line:  avance del tope del elemento cruzando el 65% del viewport.
 */
type SceneMode = "exit" | "pin" | "view" | "enter" | "line";

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

function progressFor(mode: SceneMode, rect: DOMRect, vh: number) {
  switch (mode) {
    case "exit":
      return clamp01(-rect.top / Math.max(rect.height, 1));
    case "pin":
      return clamp01(-rect.top / Math.max(rect.height - vh, 1));
    case "view":
      return clamp01((vh - rect.top) / (vh + rect.height));
    case "enter":
      return clamp01((vh - rect.top) / (vh * 0.75));
    case "line":
      return clamp01((vh * 0.65 - rect.top) / Math.max(rect.height, 1));
  }
}

/**
 * Motor de escenas de la portada. Publica en cada `[data-scene]` la variable
 * CSS `--p` con su progreso de scroll; el CSS la usa sólo en transform y
 * opacity, así que no hay reflow. Un único listener pasivo agrupado en rAF.
 *
 * Sin JS o con reduced motion no corre: cada `var(--p, x)` del CSS cae a su
 * valor de reposo y la página queda completa y estática.
 *
 * Las secciones `[data-hscroll]` se fijan con scroll horizontal sólo en
 * escritorio; en móvil quedan como carrusel nativo con scroll-snap.
 */
export function ScrollScenes() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
    if (nodes.length === 0) return;

    const hscrolls = nodes.filter((node) => node.hasAttribute("data-hscroll"));
    const desktop = window.matchMedia("(min-width: 1024px)");
    const lastValues = new WeakMap<HTMLElement, string>();
    let raf = 0;

    const measure = () => {
      for (const section of hscrolls) {
        const viewport = section.querySelector<HTMLElement>("[data-hscroll-viewport]");
        const track = section.querySelector<HTMLElement>("[data-hscroll-track]");
        if (!viewport || !track || !desktop.matches) {
          section.classList.remove("is-pinned");
          section.style.removeProperty("--hs-distance");
          continue;
        }
        section.classList.add("is-pinned");
        const distance = Math.max(0, track.offsetWidth - viewport.clientWidth);
        section.style.setProperty("--hs-distance", `${distance}px`);
      }
    };

    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      // Primero todas las lecturas, después todas las escrituras: sin layout thrashing.
      const values = nodes.map((node) =>
        progressFor(node.dataset.scene as SceneMode, node.getBoundingClientRect(), vh).toFixed(4),
      );
      nodes.forEach((node, index) => {
        if (lastValues.get(node) === values[index]) return;
        lastValues.set(node, values[index]);
        node.style.setProperty("--p", values[index]);
      });
    };

    const requestUpdate = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const handleResize = () => {
      measure();
      requestUpdate();
    };

    measure();
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("load", handleResize);
    desktop.addEventListener("change", handleResize);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("load", handleResize);
      desktop.removeEventListener("change", handleResize);
      if (raf) cancelAnimationFrame(raf);
      for (const node of nodes) node.style.removeProperty("--p");
      for (const section of hscrolls) {
        section.classList.remove("is-pinned");
        section.style.removeProperty("--hs-distance");
      }
    };
  }, []);

  return null;
}
