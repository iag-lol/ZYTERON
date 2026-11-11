"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import styles from "./integration-logo-carousel.module.css";

type PlatformLogo = { id: string; name: string; logo: string };

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function IntegrationLogoCarousel({ platforms }: { platforms: PlatformLogo[] }) {
  const track = useRef<HTMLUListElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [playback, setPlayback] = useState<"auto" | "playing" | "paused">("auto");
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [range, setRange] = useState({ first: 1, last: 5 });
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  const playing = playback === "playing" || (playback === "auto" && !reducedMotion);

  const updateRange = useCallback(() => {
    const element = track.current;
    if (!element?.firstElementChild) return;
    const gap = Number.parseFloat(getComputedStyle(element).columnGap);
    const step = element.firstElementChild.getBoundingClientRect().width + gap;
    const first = Math.round(element.scrollLeft / step) + 1;
    const last = Math.min(
      platforms.length,
      first + Math.round((element.clientWidth + gap) / step) - 1,
    );
    setRange((current) =>
      current.first === first && current.last === last ? current : { first, last },
    );
  }, [platforms.length]);

  const move = useCallback(
    (direction: number) => {
      const element = track.current;
      if (!element) return;
      const maximum = element.scrollWidth - element.clientWidth;
      const gap = Number.parseFloat(getComputedStyle(element).columnGap);
      const wrapping = direction > 0 ? element.scrollLeft >= maximum - 2 : element.scrollLeft <= 2;
      const left = wrapping
        ? direction > 0
          ? 0
          : maximum
        : Math.max(
            0,
            Math.min(maximum, element.scrollLeft + direction * (element.clientWidth + gap)),
          );
      element.scrollTo({ left, behavior: reducedMotion || wrapping ? "instant" : "smooth" });
    },
    [reducedMotion],
  );

  useEffect(() => {
    const resize = new ResizeObserver(updateRange);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (track.current) resize.observe(track.current);
    if (root.current) observer.observe(root.current);
    return () => {
      resize.disconnect();
      observer.disconnect();
    };
  }, [updateRange]);

  useEffect(() => {
    if (!playing || hovered || !visible) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) move(1);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [playing, hovered, visible, move]);

  return (
    <div
      ref={root}
      className={styles.carousel}
      role="region"
      aria-roledescription="carrusel"
      aria-label="Logos de las plataformas de integración"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (!(event.target as HTMLElement).closest("[data-playback-control]"))
          setPlayback("paused");
      }}
    >
      <ul
        ref={track}
        id="integration-logo-track"
        className={styles.track}
        tabIndex={0}
        aria-label="Todas las plataformas; usa las flechas o desliza para recorrerlas"
        onScroll={updateRange}
        onPointerDown={() => setPlayback("paused")}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {platforms.map((platform) => (
          <li key={platform.id} className={styles.slide}>
            <Link
              href={`/integraciones#plataforma-${platform.id}`}
              className={styles.brand}
              data-integration-preview={platform.id}
            >
              <Image
                src={`/home/integraciones/${platform.logo}`}
                alt={`Logo de ${platform.name}`}
                width={160}
                height={56}
                unoptimized
              />
              <span>{platform.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className={styles.controls}>
        <p aria-live={playing ? "off" : "polite"} aria-atomic="true">
          <strong>
            {range.first}–{range.last}
          </strong>{" "}
          de {platforms.length} plataformas
        </p>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.playback}
            data-playback-control
            onClick={() => setPlayback(playing ? "paused" : "playing")}
            aria-label={playing ? "Pausar carrusel de logos" : "Reproducir carrusel de logos"}
            aria-controls="integration-logo-track"
          >
            {playing ? (
              <Pause size={15} aria-hidden="true" />
            ) : (
              <Play size={15} aria-hidden="true" />
            )}
            <span>{playing ? "Pausar" : "Reproducir"}</span>
          </button>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Logos anteriores"
            aria-controls="integration-logo-track"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Logos siguientes"
            aria-controls="integration-logo-track"
          >
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
