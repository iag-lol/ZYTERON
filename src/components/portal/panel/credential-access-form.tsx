"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import type { CredentialPaymentAccess } from "@/lib/security/credential-payment-policy";
import styles from "./credential-access.module.css";

type Revealed = { secret: string | null; username: string; url: string; notes: string };
export function CredentialAccessForm({
  credentialId,
  name,
  project,
  access,
}: {
  credentialId: string;
  name: string;
  project?: string;
  access?: CredentialPaymentAccess;
}) {
  const [password, setPassword] = useState(""),
    [code, setCode] = useState("");
  const [challenge, setChallenge] = useState(""),
    [expiresAt, setExpiresAt] = useState(0);
  const [revealed, setRevealed] = useState<Revealed | null>(null),
    [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const clear = useCallback(() => {
    pending.current?.abort();
    setPassword("");
    setCode("");
    setChallenge("");
    setRevealed(null);
    setSeconds(0);
    setExpiresAt(0);
    setBusy(false);
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pending.current?.abort();
    };
  }, []);
  useEffect(() => {
    const hide = () => {
      // Reading the emailed code in another tab must preserve the pending challenge.
      if (document.hidden && revealed) clear();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", clear);
    hide();
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", clear);
    };
  }, [clear, revealed]);
  useEffect(() => {
    if (!revealed) return;
    const until = Date.now() + 30000;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSeconds(left);
      if (!left) clear();
    }, 250);
    return () => window.clearInterval(timer);
  }, [revealed, clear]);
  useEffect(() => {
    if (!challenge) return;
    const timer = window.setTimeout(
      () => {
        clear();
        setError("El código expiró. Confirma tu contraseña para solicitar uno nuevo.");
      },
      Math.max(0, expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [challenge, expiresAt, clear]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || access?.allowed === false) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    pending.current = controller;
    try {
      const response = await fetch(
        challenge
          ? `/api/portal/credentials/${credentialId}/reveal`
          : "/api/portal/credentials/send-code",
        {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            challenge ? { password, code, challengeId: challenge } : { credentialId, password },
          ),
        },
      );
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "No se pudo completar la verificación.");
      if (!alive.current || controller.signal.aborted) return;
      if (challenge) {
        setRevealed({
          secret: value.secret,
          username: value.username,
          url: value.url,
          notes: value.notes,
        });
        setSeconds(30);
        setPassword("");
        setCode("");
        setChallenge("");
      } else {
        setChallenge(value.challengeId);
        setExpiresAt(Date.parse(value.expiresAt));
      }
    } catch (cause) {
      if (alive.current && !controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "No se pudo conectar.");
    } finally {
      if (alive.current && !controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className={styles.card}>
      <div className={styles.badge}>
        <ShieldCheck size={16} /> ACCESO PROTEGIDO
      </div>
      <h3>{name}</h3>
      {project && <p className={styles.project}>{project}</p>}
      <ol className={styles.steps} aria-label="Verificación de acceso">
        <li className={access?.allowed === true ? styles.done : ""}>
          {access?.allowed === true ? <Check size={14} /> : <LockKeyhole size={14} />}{" "}
          {access?.allowed === true ? "Pago completo" : "Validación de pago"}
        </li>
        <li className={challenge || revealed ? styles.done : ""}>
          <KeyRound size={14} /> Contraseña
        </li>
        <li className={revealed ? styles.done : ""}>
          <Mail size={14} /> Código por correo
        </li>
      </ol>
      {access?.allowed === false ? (
        <div className={styles.notice}>
          <LockKeyhole size={22} />
          <div>
            <strong>Credencial bloqueada</strong>
            <p>{access.reason}</p>
            <p>Si ya pagaste, solicita la revisión del pago a Zyteron.</p>
          </div>
        </div>
      ) : revealed ? (
        <div className={styles.revealed}>
          <strong>Acceso verificado · se oculta en {seconds} s</strong>
          {revealed.username && (
            <p>
              Usuario: <b>{revealed.username}</b>
            </p>
          )}
          {revealed.secret && <output className={styles.secret}>{revealed.secret}</output>}
          {revealed.url && /^https:\/\//i.test(revealed.url) && (
            <a href={revealed.url} target="_blank" rel="noreferrer noopener">
              Abrir plataforma <ArrowUpRight size={16} />
            </a>
          )}
          {revealed.notes && <p>{revealed.notes}</p>}
          <button type="button" onClick={clear}>
            Ocultar ahora
          </button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit}>
          <p>
            {challenge
              ? "Enviamos un código a tu correo verificado. Úsalo aquí para consultar este acceso."
              : "Confirma tu contraseña del portal. Después recibirás un código en tu correo verificado."}
          </p>
          {!challenge ? (
            <label htmlFor={`credential-password-${credentialId}`}>
              Contraseña del portal
              <input
                id={`credential-password-${credentialId}`}
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </label>
          ) : (
            <label htmlFor={`credential-code-${credentialId}`}>
              Código de seguridad
              <input
                className={styles.code}
                id={`credential-code-${credentialId}`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                disabled={busy}
                autoFocus
              />
            </label>
          )}
          <button type="submit" disabled={busy || (!challenge ? !password : code.length !== 6)}>
            <ShieldCheck size={17} />
            {busy
              ? "Verificando…"
              : challenge
                ? "Verificar y mostrar acceso"
                : "Continuar y recibir código"}
          </button>
          {challenge && (
            <button className={styles.secondary} type="button" disabled={busy} onClick={clear}>
              Volver a solicitar un código
            </button>
          )}
          <small>
            Código válido por 5 minutos · un solo uso · hasta 5 intentos. El acceso se oculta a los
            30 segundos o al salir de esta pantalla.
          </small>
        </form>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className={styles.footer}>
        <LockKeyhole size={13} /> Credenciales cifradas · verificación en el servidor
      </p>
    </div>
  );
}
