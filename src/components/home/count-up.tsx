"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  className?: string;
};

/**
 * Anima un número desde 0 hasta `value` cuando entra al viewport.
 * En SSR (y con reduced motion) muestra directamente el valor final,
 * así el dato siempre está presente en el HTML.
 */
export function CountUp({ value, suffix = "", prefix = "", durationMs = 1400, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / durationMs, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(eased * value));
          if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString("es-CL")}
      {suffix}
    </span>
  );
}
