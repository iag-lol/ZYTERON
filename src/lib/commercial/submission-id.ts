type Receipt = { id: string; digest: string };
const keys = new Map<string, Receipt>();

/** Reintentar el mismo contenido conserva la referencia; editarlo inicia otra solicitud. */
export async function submissionIdFor(form: string, payload: unknown) {
  const key = `zyteron:submission:${form}`;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const digest = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  let receipt = keys.get(key);
  try {
    const stored = JSON.parse(sessionStorage.getItem(key) || "null") as Receipt | null;
    if (stored && /^[a-f0-9-]{36}$/.test(stored.id)) receipt = stored;
  } catch {
    /* El formulario funciona sin almacenamiento del navegador. */
  }
  if (receipt?.digest !== digest) receipt = { id: crypto.randomUUID(), digest };
  keys.set(key, receipt);
  try {
    sessionStorage.setItem(key, JSON.stringify(receipt));
  } catch {
    /* Acceso opcional. */
  }
  return receipt.id;
}

export function finishSubmission(form: string) {
  const key = `zyteron:submission:${form}`;
  keys.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Acceso opcional. */
  }
}
