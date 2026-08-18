import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Prueba de la condición de carrera que originó la ráfaga.
 *
 * Simula el comportamiento de sales_claim_next_send: dos procesos compiten por
 * el mismo registro y solo uno debe quedárselo. Se modela el bloqueo de fila
 * (FOR UPDATE SKIP LOCKED) porque la garantía real la da PostgreSQL; aquí se
 * verifica que la LÓGICA de reserva sea excluyente y que el contador se
 * consulte dentro de la misma sección crítica.
 */

type Row = { id: string; status: string; scheduledAt: number; locked: boolean };

/** Cola en memoria que imita el comportamiento de la función SQL. */
class FakeQueue {
  rows: Row[] = [];
  acceptedToday = 0;
  private mutex = Promise.resolve();

  seed(count: number, scheduledAt = 0) {
    for (let i = 0; i < count; i += 1) {
      this.rows.push({ id: `row-${i}`, status: "PROGRAMADO", scheduledAt, locked: false });
    }
  }

  /** Equivale a la transacción con FOR UPDATE SKIP LOCKED. */
  async claim(dailyLimit: number, now = 1): Promise<Row | null> {
    let result: Row | null = null;

    // La sección crítica serializa el acceso, igual que el bloqueo de fila.
    this.mutex = this.mutex.then(async () => {
      const inProgress = this.rows.some((row) => row.status === "PROCESANDO");
      if (inProgress) return;
      if (this.acceptedToday >= dailyLimit) return;

      const candidate = this.rows.find(
        (row) => row.status === "PROGRAMADO" && !row.locked && row.scheduledAt <= now,
      );
      if (!candidate) return;

      candidate.locked = true;
      candidate.status = "PROCESANDO";
      result = candidate;
    });

    await this.mutex;
    return result;
  }

  complete(row: Row) {
    row.status = "ACEPTADO_POR_MICROSOFT";
    row.locked = false;
    this.acceptedToday += 1;
  }
}

describe("cola · reserva atómica", () => {
  it("dos procesos simultáneos: solo uno obtiene el envío", async () => {
    const queue = new FakeQueue();
    queue.seed(1);

    const [a, b] = await Promise.all([queue.claim(10), queue.claim(10)]);
    const claimed = [a, b].filter(Boolean);

    assert.equal(claimed.length, 1, "solo un proceso debe reservar el envío");
  });

  it("diez procesos simultáneos sobre diez envíos reservan uno solo", async () => {
    const queue = new FakeQueue();
    queue.seed(10);

    // Aunque haya diez disponibles, el tope de "uno en procesamiento" manda.
    const results = await Promise.all(Array.from({ length: 10 }, () => queue.claim(30)));
    const claimed = results.filter(Boolean);

    assert.equal(claimed.length, 1, "nunca debe haber más de un envío en curso");
  });

  it("no reserva nada mientras hay uno en procesamiento", async () => {
    const queue = new FakeQueue();
    queue.seed(5);

    const first = await queue.claim(30);
    assert.ok(first);

    const second = await queue.claim(30);
    assert.equal(second, null, "no debe reservarse un segundo envío en paralelo");
  });

  it("permite el siguiente recién cuando el anterior terminó", async () => {
    const queue = new FakeQueue();
    queue.seed(3);

    const first = await queue.claim(30);
    assert.ok(first);
    queue.complete(first!);

    const second = await queue.claim(30);
    assert.ok(second, "tras completar el primero debe poder tomarse el siguiente");
    assert.notEqual(second!.id, first!.id);
  });

  it("respeta el cupo diario dentro de la misma sección crítica", async () => {
    const queue = new FakeQueue();
    queue.seed(20);
    queue.acceptedToday = 5;

    const claimed = await queue.claim(5);
    assert.equal(claimed, null, "con el cupo agotado no debe reservar");
  });

  it("no toma envíos cuya hora aún no llega", async () => {
    const queue = new FakeQueue();
    queue.seed(3, 1000);

    const claimed = await queue.claim(30, 1);
    assert.equal(claimed, null, "no debe adelantarse a la hora programada");
  });

  it("procesa la cola completa de a uno, nunca en ráfaga", async () => {
    const queue = new FakeQueue();
    queue.seed(6);

    const order: string[] = [];
    for (let cycle = 0; cycle < 6; cycle += 1) {
      // Cada ciclo del cron compite consigo mismo: solo uno debe salir.
      const results = await Promise.all([queue.claim(30), queue.claim(30), queue.claim(30)]);
      const claimed = results.filter(Boolean);
      assert.equal(claimed.length, 1, `ciclo ${cycle}: se reservó más de un envío`);
      order.push(claimed[0]!.id);
      queue.complete(claimed[0]!);
    }

    assert.equal(new Set(order).size, 6, "ningún envío debe procesarse dos veces");
  });
});
