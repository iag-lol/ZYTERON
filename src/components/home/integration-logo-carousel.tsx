import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./integration-logo-carousel.module.css";

type PlatformLogo = { id: string; name: string; logo: string };

export function IntegrationLogoCarousel({ platforms }: { platforms: PlatformLogo[] }) {
  return (
    <div
      className={styles.carousel}
      role="region"
      aria-label="Logos de las plataformas de integración"
      data-logo-carousel
    >
      <div
        className={styles.track}
        style={{ "--logo-duration": `${platforms.length * 2.5}s` } as CSSProperties}
        data-logo-track
      >
        {[false, true].map((duplicate) => (
          <ul
            key={String(duplicate)}
            className={styles.group}
            aria-label={duplicate ? undefined : "Las 105 plataformas de integración"}
            aria-hidden={duplicate || undefined}
            inert={duplicate || undefined}
            data-logo-copy={duplicate ? "duplicate" : "original"}
          >
            {platforms.map((platform) => (
              <li key={platform.id} className={styles.slide}>
                <Link
                  href={`/integraciones#plataforma-${platform.id}`}
                  className={styles.brand}
                  data-integration-preview={duplicate ? undefined : platform.id}
                  tabIndex={duplicate ? -1 : undefined}
                >
                  <Image
                    src={`/home/integraciones/${platform.logo}`}
                    alt={duplicate ? "" : `Logo de ${platform.name}`}
                    width={160}
                    height={56}
                    unoptimized
                  />
                  <span>{platform.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
