"use client";

import { useState } from "react";
import { ArrowDown, Search, X } from "lucide-react";
import {
  featuredIntegrationIds,
  integrationGroups,
  integrationPlatforms,
} from "@/content/integration-catalog";
import { IntegrationFlipCard } from "./integration-flip-card";
import styles from "./integration-catalog.module.css";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const ordered = [
  ...featuredIntegrationIds
    .map((id) => integrationPlatforms.find((platform) => platform.id === id)!)
    .filter(Boolean),
  ...integrationPlatforms.filter((platform) => !featuredIntegrationIds.includes(platform.id)),
];

export function IntegrationCatalog({ initialLimit = 8 }: { initialLimit?: number }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState(initialLimit);
  const term = normalize(query.trim());
  const filtered = ordered.filter(
    (platform) =>
      (!category || platform.categoryId === category) &&
      (!term || normalize(`${platform.name} ${platform.use} ${platform.category}`).includes(term)),
  );
  const visible = filtered.slice(0, limit);

  function reset() {
    setQuery("");
    setCategory("");
    setLimit(initialLimit);
  }

  return (
    <div className={styles.catalog}>
      <div className={styles.controls}>
        <div className={styles.searchField}>
          <label htmlFor="integration-search">¿Qué herramienta necesitas conectar?</label>
          <div>
            <Search size={18} aria-hidden="true" />
            <input
              id="integration-search"
              type="search"
              placeholder="SII, firma, Meta, Mercado Libre…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(initialLimit);
              }}
              autoComplete="off"
            />
          </div>
        </div>
        <div className={styles.categoryField}>
          <label htmlFor="integration-category">Área de trabajo</label>
          <select
            id="integration-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setLimit(initialLimit);
            }}
          >
            <option value="">Todas las áreas ({integrationPlatforms.length})</option>
            {integrationGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.platforms.length})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.quickFilters} aria-label="Áreas destacadas">
        {[
          { id: "", name: "Todas" },
          { id: "publico", name: "SII y servicios públicos" },
          { id: "firmas", name: "Firmas electrónicas" },
          { id: "redes", name: "Meta y redes" },
          { id: "pagos", name: "Pagos" },
          { id: "ia", name: "Inteligencia artificial" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={category === item.id}
            onClick={() => {
              setCategory(item.id);
              setLimit(initialLimit);
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className={styles.results}>
        <p role="status" aria-live="polite">
          {filtered.length
            ? `Mostrando ${visible.length} de ${filtered.length} plataformas y servicios`
            : "No encontramos coincidencias con esa búsqueda"}
        </p>
        {(query || category) && (
          <button type="button" onClick={reset}>
            Limpiar filtros <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className={styles.grid} id="integration-results">
        {visible.map((platform) => (
          <IntegrationFlipCard key={platform.id} platform={platform} />
        ))}
      </div>
      {!filtered.length && (
        <div className={styles.empty}>
          <p>
            Prueba con el nombre de una plataforma o con lo que necesitas resolver: facturas, firma,
            inventario, mensajes o reportes.
          </p>
          <button type="button" onClick={reset}>
            Ver todas las herramientas
          </button>
        </div>
      )}
      {visible.length < filtered.length && (
        <div className={styles.more}>
          <button
            type="button"
            aria-controls="integration-results"
            onClick={() => setLimit((current) => current + 16)}
          >
            Ver {Math.min(16, filtered.length - visible.length)} herramientas más{" "}
            <ArrowDown size={17} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setLimit(filtered.length)}>
            Mostrar todas las coincidencias
          </button>
        </div>
      )}
      <noscript>
        <p>
          El directorio de esta página incluye todas las plataformas, sus usos y las fuentes
          oficiales. La búsqueda y el giro de tarjetas requieren JavaScript.
        </p>
      </noscript>
    </div>
  );
}
