import { MediaError } from "./media-policy";

// Una carga o un PDF reserva toda la capacidad; las imágenes comparten hasta tres puestos.
// Los cuerpos esperan sin leerse para acotar la memoria usada por archivos grandes.
export function mediaCapacity() {
  let used = 0;
  const queue: Array<{
    weight: number;
    resolve(release: () => void): void;
    reject(error: Error): void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];
  const drain = () => {
    while (queue.length && used + queue[0].weight <= 3) {
      const next = queue.shift()!;
      clearTimeout(next.timer);
      used += next.weight;
      let released = false;
      next.resolve(() => {
        if (!released) {
          released = true;
          used -= next.weight;
          drain();
        }
      });
    }
  };
  return (weight: 1 | 3): Promise<() => void> =>
    new Promise((resolve, reject) => {
      if (queue.length >= 12) {
        reject(
          new MediaError(
            "Hay varios archivos en proceso. Vuelve a intentarlo en unos segundos.",
            429,
          ),
        );
        return;
      }
      const entry = {
        weight,
        resolve,
        reject,
        timer: setTimeout(() => {
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
          reject(
            new MediaError(
              "Hay varios archivos en proceso. Vuelve a intentarlo en unos segundos.",
              429,
            ),
          );
          drain();
        }, 20_000),
      };
      queue.push(entry);
      drain();
    });
}
