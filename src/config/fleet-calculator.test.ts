import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FLEET_HARDWARE_AMOUNTS,
  FLEET_HARDWARE_TOTAL,
  FLEET_PLATFORM_MAINTENANCE,
  FLEET_PRICE_AMOUNTS,
  FLEET_TIERS,
  fleetQuote,
  fleetTierFor,
} from "./pricing";

/**
 * La calculadora publica cifras que el cliente va a sumar a mano. Si el tramo o
 * el total se equivocan, la conversación comercial parte mal, así que se fijan
 * aquí los ejemplos publicados y los bordes de cada tramo.
 */

describe("flotas · tramos por cantidad de vehículos", () => {
  it("asigna el tramo correcto en los bordes", () => {
    const casos: Array<[number, string]> = [
      [1, "flota-pequena"],
      [10, "flota-pequena"],
      [11, "flota-mediana"],
      [30, "flota-mediana"],
      [31, "flota-grande"],
      [500, "flota-grande"],
    ];
    for (const [vehiculos, esperado] of casos) {
      assert.equal(fleetTierFor(vehiculos).id, esperado, `${vehiculos} vehículos cayó en el tramo equivocado`);
    }
  });

  it("los tramos cubren toda la recta sin huecos ni solapes", () => {
    for (let index = 1; index < FLEET_TIERS.length; index += 1) {
      const previo = FLEET_TIERS[index - 1];
      const actual = FLEET_TIERS[index];
      assert.equal(previo.max! + 1, actual.min, `hueco o solape entre ${previo.id} y ${actual.id}`);
    }
    assert.equal(FLEET_TIERS[FLEET_TIERS.length - 1].max, null, "el último tramo debe ser abierto");
  });

  it("una cantidad inválida no rompe el cálculo", () => {
    for (const valor of [0, -5, Number.NaN]) {
      const quote = fleetQuote(valor);
      assert.equal(quote.count, 1, `${valor} debería tratarse como un vehículo`);
      assert.ok(quote.monthlyTotal > 0);
    }
  });
});

describe("flotas · los ejemplos publicados cuadran", () => {
  it("10 vehículos: $79.900 + $59.990 = $139.890", () => {
    const q = fleetQuote(10);
    assert.equal(q.tier.perVehicle, 7_990);
    assert.equal(q.infrastructure, 79_900);
    assert.equal(q.monthlyTotal, 139_890);
  });

  it("25 vehículos: $174.750 + $59.990 = $234.740", () => {
    const q = fleetQuote(25);
    assert.equal(q.tier.perVehicle, 6_990);
    assert.equal(q.infrastructure, 174_750);
    assert.equal(q.monthlyTotal, 234_740);
  });

  it("50 vehículos: $299.500 + $59.990 = $359.490", () => {
    const q = fleetQuote(50);
    assert.equal(q.tier.perVehicle, 5_990);
    assert.equal(q.infrastructure, 299_500);
    assert.equal(q.monthlyTotal, 359_490);
  });

  it("el equipamiento de 25 vehículos suma $4.199.500", () => {
    const q = fleetQuote(25);
    assert.equal(q.gps, 2_374_750);
    assert.equal(q.installation, 1_824_750);
    assert.equal(q.hardwareTotal, 4_199_500);
  });

  it("la inversión inicial de 25 vehículos parte en $10.189.500", () => {
    const q = fleetQuote(25);
    assert.equal(q.development, 5_990_000);
    assert.equal(q.initialInvestment, 10_189_500);
  });
});

describe("flotas · estructura del cobro", () => {
  it("la mantención es fija por cliente, no por vehículo", () => {
    for (const vehiculos of [1, 25, 300]) {
      assert.equal(
        fleetQuote(vehiculos).maintenance,
        FLEET_PLATFORM_MAINTENANCE,
        "la mantención no puede multiplicarse por la cantidad de vehículos",
      );
    }
  });

  it("la infraestructura sí escala con los vehículos activos", () => {
    assert.ok(fleetQuote(30).infrastructure > fleetQuote(11).infrastructure);
  });

  it("el equipamiento es la suma de GPS e instalación por vehículo", () => {
    const q = fleetQuote(7);
    assert.equal(q.gps, 7 * FLEET_HARDWARE_AMOUNTS.gps);
    assert.equal(q.installation, 7 * FLEET_HARDWARE_AMOUNTS.installation);
    assert.equal(q.hardwareTotal, 7 * FLEET_HARDWARE_TOTAL);
  });

  it("los precios de desarrollo son los nuevos", () => {
    assert.equal(FLEET_PRICE_AMOUNTS["flota-pequena"], 3_990_000);
    assert.equal(FLEET_PRICE_AMOUNTS["flota-mediana"], 5_990_000);
    assert.equal(FLEET_PRICE_AMOUNTS["flota-grande"], 7_990_000);
  });
});
