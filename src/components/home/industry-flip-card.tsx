"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, RotateCw } from "lucide-react";
import type { homeIndustries } from "@/content/home-ecosystem";
import styles from "./home-ecosystem.module.css";

type Industry = (typeof homeIndustries)[number];

export function IndustryFlipCard({ industry, index }: { industry: Industry; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const front = useRef<HTMLButtonElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const interacted = useRef(false);

  useLayoutEffect(() => {
    if (interacted.current) {
      (flipped ? back : front).current?.focus({ preventScroll: true });
    }
  }, [flipped]);

  function turn(open: boolean) {
    interacted.current = true;
    setFlipped(open);
  }

  return (
    <article
      className={styles.flipCard}
      data-flipped={flipped}
      aria-label={industry.name}
      onKeyDown={(event) => {
        if (event.key === "Escape" && flipped) {
          event.preventDefault();
          turn(false);
        }
      }}
    >
      <div className={styles.flipInner}>
        <button
          ref={front}
          type="button"
          className={styles.cardFront}
          onClick={() => turn(true)}
          aria-expanded={flipped}
          aria-controls={`rubro-${industry.id}`}
          tabIndex={flipped ? -1 : 0}
          aria-hidden={flipped}
        >
          <Image
            src={`/home/rubros/${industry.id}.webp`}
            alt={industry.alt}
            fill
            sizes="(max-width: 639px) calc(100vw - 48px), (max-width: 1023px) 44vw, 352px"
            className={styles.industryImage}
          />
          <span className={styles.photoShade} />
          <span className={styles.cardNumber} aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className={styles.cardFrontContent}>
            <span className={styles.cardTag}>{industry.tag}</span>
            <span className={styles.cardTitle}>{industry.name}</span>
            <span className={styles.turnLabel}>
              Explora {industry.features.length} soluciones <RotateCw size={17} aria-hidden="true" />
            </span>
          </span>
        </button>
        <div
          id={`rubro-${industry.id}`}
          className={styles.cardBack}
          aria-hidden={!flipped}
          inert={!flipped}
        >
          <div className={styles.backTop}>
            <p>{industry.name}</p>
            <button
              ref={back}
              type="button"
              onClick={() => turn(false)}
              aria-label={`Volver a la imagen de ${industry.name}`}
            >
              <RotateCcw size={17} aria-hidden="true" />
            </button>
          </div>
          <h3>{industry.title}</h3>
          <p className={styles.backDescription}>{industry.description}</p>
          <p className={styles.featureLabel}>Podemos desarrollar para tu organización</p>
          <ul>
            {industry.features.map((feature) => (
              <li key={feature}>
                <Check size={15} aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
          <Link href={industry.href} className={styles.cardLink}>
            {industry.link}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
