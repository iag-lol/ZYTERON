"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, RotateCcw, RotateCw } from "lucide-react";
import type { IntegrationCatalogEntry } from "@/content/integration-catalog";
import styles from "./integration-catalog.module.css";

export function IntegrationFlipCard({ platform }: { platform: IntegrationCatalogEntry }) {
  const [flipped, setFlipped] = useState(false);
  const front = useRef<HTMLButtonElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const interacted = useRef(false);

  useLayoutEffect(() => {
    if (interacted.current) (flipped ? back : front).current?.focus({ preventScroll: true });
  }, [flipped]);

  function turn(open: boolean) {
    interacted.current = true;
    setFlipped(open);
  }

  const contact = `/contacto?${new URLSearchParams({ tipo: "automatizacion", origen: `integracion-${platform.id}` })}`;

  return (
    <article
      className={styles.card}
      data-platform={platform.id}
      data-flipped={flipped}
      aria-label={platform.name}
      onKeyDown={(event) => {
        if (event.key === "Escape" && flipped) {
          event.preventDefault();
          turn(false);
        }
      }}
    >
      <div className={styles.inner}>
        <button
          ref={front}
          type="button"
          className={styles.front}
          data-brand={platform.id}
          aria-label={`Ver posibilidades de integración con ${platform.name}`}
          aria-expanded={flipped}
          aria-controls={`integracion-${platform.id}`}
          aria-hidden={flipped}
          tabIndex={flipped ? -1 : 0}
          onClick={() => turn(true)}
        >
          <span className={styles.category}>{platform.category}</span>
          <span className={styles.logoFrame}>
            <Image
              src={`/home/integraciones/${platform.logo}`}
              alt={`Logo de ${platform.name}`}
              width={180}
              height={76}
              unoptimized
              className={styles.logo}
            />
          </span>
          <span className={styles.name}>{platform.name}</span>
          <span className={styles.preview}>{platform.use}</span>
          <span className={styles.turn}>
            Ver posibilidades <RotateCw size={16} aria-hidden="true" />
          </span>
        </button>
        <div
          id={`integracion-${platform.id}`}
          className={styles.back}
          inert={!flipped}
          aria-hidden={!flipped}
        >
          <div className={styles.backTop}>
            <span>Integración a medida</span>
            <button
              ref={back}
              type="button"
              aria-label={`Volver al logo de ${platform.name}`}
              onClick={() => turn(false)}
            >
              <RotateCcw size={17} aria-hidden="true" />
            </button>
          </div>
          <h3>{platform.name}</h3>
          <p className={styles.use}>{platform.use}</p>
          <div className={styles.access}>
            <span>Alcance y acceso</span>
            <p>{platform.requirement}</p>
          </div>
          <div className={styles.cardActions}>
            <a
              href={platform.docs}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Información oficial de ${platform.name} (abre en otra pestaña)`}
            >
              Fuente oficial <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <Link href={contact}>
              Evaluar esta integración <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
