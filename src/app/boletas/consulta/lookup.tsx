"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

export default function BoletaLookup() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pdf, setPdf] = useState("");
  const pending = useRef(false);
  const requestState = useRef({ id: 0, active: true });
  useEffect(() => {
    const state = requestState.current;
    state.active = true;
    function consumeCode() {
      const code = window.location.hash.slice(1);
      if (!code) return;
      state.id++;
      setToken(code);
      setError("");
      setPdf("");
      window.history.replaceState(null, "", window.location.pathname);
    }
    window.addEventListener("hashchange", consumeCode);
    consumeCode();
    return () => {
      window.removeEventListener("hashchange", consumeCode);
      state.id++;
      state.active = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (pdf) URL.revokeObjectURL(pdf);
    },
    [pdf],
  );
  function changeToken(value: string) {
    requestState.current.id++;
    setToken(value);
    setError("");
    setPdf("");
  }
  async function consult(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const id = ++requestState.current.id;
    try {
      const response = await fetch("/api/boletas/consulta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
        cache: "no-store",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw Error(data.error || "No fue posible consultar el documento.");
      }
      const blob = await response.blob();
      if (id !== requestState.current.id || !requestState.current.active) return;
      setPdf(URL.createObjectURL(blob));
    } catch (reason) {
      if (id === requestState.current.id && requestState.current.active)
        setError(
          reason instanceof Error ? reason.message : "No fue posible consultar el documento.",
        );
    } finally {
      pending.current = false;
      if (requestState.current.active) setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-[#f3f6f2] px-5 py-10 text-[#173c2e] sm:py-16">
      <div className="mx-auto max-w-xl">
        <Link className="text-xl font-bold tracking-[0.22em]" href="/">
          ZYTERON
        </Link>
        <section className="mt-10 overflow-hidden rounded-3xl border border-[#dce5dd] bg-white shadow-sm">
          <div className="bg-[#163d30] px-7 py-9 text-white sm:px-10">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#c9e1d3]">
              CONSULTA DE DOCUMENTOS
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Tu boleta, siempre a mano.
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#deebe3]">
              Escanea el QR de la representación impresa o ingresa su código de consulta para ver el
              documento.
            </p>
          </div>
          <div className="px-7 py-8 sm:px-10">
            <div className="mb-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
              Los documentos de certificación llevan una marca de prueba y no tienen validez tributaria.
            </div>
            <form onSubmit={consult}>
              <label htmlFor="boleta-code" className="block text-sm font-semibold">
                Código de consulta
              </label>
              <textarea
                id="boleta-code"
                value={token}
                onChange={(e) => changeToken(e.target.value)}
                rows={3}
                maxLength={220}
                autoComplete="off"
                spellCheck={false}
                required
                className="mt-2 w-full resize-none rounded-xl border border-[#cddbd1] p-3 font-mono text-xs leading-5 outline-none focus:border-[#1c684c] focus:ring-2 focus:ring-[#1c684c]/15"
                aria-describedby="boleta-help"
              />
              <p id="boleta-help" className="mt-2 text-xs leading-5 text-[#66776b]">
                El código permite consultar únicamente esta boleta.
              </p>
              <button
                disabled={busy || !token.trim()}
                className="mt-6 w-full rounded-xl bg-[#11583e] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Consultando…" : "Consultar documento"}
              </button>
            </form>
            {error ? (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-900"
              >
                {error}
              </p>
            ) : null}
            {pdf ? (
              <div
                role="status"
                className="mt-6 rounded-xl border border-[#c9dfd1] bg-[#f0f7f2] p-5"
              >
                <p className="font-semibold">Documento disponible</p>
                <a
                  href={pdf}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-semibold underline"
                >
                  Ver boleta PDF
                </a>
                <a
                  href={pdf}
                  download="boleta.pdf"
                  className="ml-5 text-sm font-semibold underline"
                >
                  Descargar
                </a>
              </div>
            ) : null}
          </div>
        </section>
        <p className="mt-6 text-center text-xs leading-6 text-[#66776b]">
          Zyteron SpA · Consulta segura de documentos
        </p>
      </div>
    </main>
  );
}
