import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  FLEET_COMPARISON,
  FLEET_HARDWARE_AMOUNTS,
  FLEET_HARDWARE_TOTAL,
  FLEET_PLANS,
  FLEET_PLATFORM_MAINTENANCE,
  PLAN_CATALOG,
  clp,
} from "./pricing";

/**
 * Las plataformas de flota se agregaron sin tocar el SEO ni los planes
 * existentes. Estas pruebas fijan justamente eso: que los precios sean
 * coherentes entre tarjeta y comparativa, y que la categoría nueva no se
 * filtre a la escalera principal ni a sus datos estructurados.
 */

describe("flotas · coherencia de precios", () => {
  it("los tres niveles publican un precio con IVA declarado", () => {
    for (const plan of FLEET_PLANS) {
      assert.match(plan.price, /^Desde \$[\d.]+ \+ IVA$/, `precio inesperado en ${plan.id}: ${plan.price}`);
    }
  });

  it("la escalera de flota sube: pequeña < mediana < grande", () => {
    const montos = FLEET_PLANS.map((plan) => plan.amount);
    assert.deepEqual(montos, [...montos].sort((a, b) => a - b));
    assert.equal(new Set(montos).size, 3, "no puede haber dos niveles con el mismo valor");
  });

  it("el mensual por vehículo baja a mayor tamaño de flota", () => {
    const mensuales = FLEET_PLANS.map((plan) => plan.monthlyPerVehicle);
    assert.deepEqual(
      mensuales,
      [...mensuales].sort((a, b) => b - a),
      "una flota más grande no puede pagar más por vehículo que una pequeña",
    );
  });

  it("el total de equipamiento es la suma real de GPS e instalación", () => {
    assert.equal(FLEET_HARDWARE_TOTAL, FLEET_HARDWARE_AMOUNTS.gps + FLEET_HARDWARE_AMOUNTS.installation);
  });

  it("la comparativa cita los mismos montos que las tarjetas", () => {
    const fila = (nombre: string) => FLEET_COMPARISON.find((row) => row.feature === nombre);

    const desarrollo = fila("Valor de desarrollo");
    assert.ok(desarrollo);
    FLEET_PLANS.forEach((plan, index) => {
      assert.equal(desarrollo.values[index], plan.price, `la comparativa contradice a la tarjeta de ${plan.id}`);
    });

    const mensual = fila("Mensual por vehículo");
    assert.ok(mensual);
    FLEET_PLANS.forEach((plan, index) => {
      assert.equal(mensual.values[index], `${clp(plan.monthlyPerVehicle)} + IVA`);
    });

    const mantencion = fila("Mantención de plataforma");
    assert.ok(mantencion);
    for (const value of mantencion.values) {
      assert.equal(value, `${clp(FLEET_PLATFORM_MAINTENANCE)} + IVA / mes`);
    }
  });

  it("cada fila de la comparativa cubre los tres niveles", () => {
    for (const row of FLEET_COMPARISON) {
      assert.equal(row.values.length, FLEET_PLANS.length, `fila incompleta: ${row.feature}`);
    }
  });

  it("todo monto visible declara IVA", () => {
    const textos = [
      ...FLEET_PLANS.map((plan) => plan.price),
      ...FLEET_COMPARISON.flatMap((row) => row.values),
    ].filter((value) => value.includes("$"));

    for (const texto of textos) {
      assert.ok(texto.includes("+ IVA"), `falta declarar IVA en: ${texto}`);
    }
  });
});

describe("flotas · no contaminan la escalera existente", () => {
  it("no entran en el catálogo de planes principal", () => {
    const ids = new Set(PLAN_CATALOG.map((plan) => plan.id as string));
    for (const plan of FLEET_PLANS) {
      assert.ok(
        !ids.has(plan.id),
        `${plan.id} está en PLAN_CATALOG: entraría al catálogo de ofertas estructuradas de /planes`,
      );
    }
  });

  it("no se agregaron al JSON-LD de /planes", () => {
    const page = readFileSync(path.join(process.cwd(), "src", "app", "planes", "page.tsx"), "utf8");
    const schema = page.slice(page.indexOf("planOfferCatalogJsonLd"), page.indexOf("function PlanFeatures"));

    for (const plan of FLEET_PLANS) {
      assert.ok(!schema.includes(plan.id), `${plan.id} aparece en los datos estructurados`);
    }
    assert.ok(!schema.includes("FLEET_"), "el catálogo de ofertas no debe leer datos de flota");
  });

  it("los planes existentes siguen publicados", () => {
    // La tarea era agregar, nunca reemplazar.
    for (const id of ["web-basica", "emprendedor", "pyme", "empresa", "ecommerce"]) {
      assert.ok(
        PLAN_CATALOG.some((plan) => plan.id === id),
        `desapareció el plan ${id}`,
      );
    }
  });
});

describe("flotas · el formulario reconoce el plan", () => {
  const builder = readFileSync(
    path.join(process.cwd(), "src", "components", "forms", "commercial-quote-builder.tsx"),
    "utf8",
  );

  it("las etiquetas de flota llegan al cotizador", () => {
    assert.ok(
      builder.includes("FLEET_PLANS.map((plan) => [plan.id, plan.name])"),
      "sin esto el cotizador recibiría el plan y no sabría cómo nombrarlo",
    );
  });

  it("cada tarjeta enlaza al cotizador con su propio identificador", () => {
    const component = readFileSync(
      path.join(process.cwd(), "src", "components", "planes", "fleet-plans.tsx"),
      "utf8",
    );
    assert.ok(component.includes("plan=${plan.id}"), "el enlace debe llevar el plan seleccionado");
    assert.ok(component.includes("origen=planes-flota"), "debe conservarse el origen comercial");
  });
});
