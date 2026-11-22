"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  IdCard,
  ShieldCheck,
} from "lucide-react";
import { browserSupabase,signInWithRut } from "@control/lib/auth-client";
import {normalizeUserRut} from "@control/lib/user-rut";
import { validateNewPassword } from "@control/lib/password-policy";

function AuthIdentity({ recovery = false }: { recovery?: boolean }) {
  return (
    <aside className="authIdentity">
      <div className="authGlow" aria-hidden="true" />
      <div className="authBrand">
        <span>Z</span>
        <div>
          <strong>ZYTERON</strong>
          <small>CONTROL</small>
        </div>
      </div>

      <div className="authIdentityContent">
        <div className="authIdentityIcon"><Building2 aria-hidden="true" /></div>
        <p className="authKicker">GESTIÓN EMPRESARIAL</p>
        <h1>{recovery ? "Recupera el acceso a tu espacio de trabajo." : "Decisiones claras. Operación bajo control."}</h1>
        <p className="authIdentityCopy">
          {recovery
            ? "Define una nueva contraseña para continuar en Zyteron Control."
            : "Un entorno central para coordinar clientes, equipos y resultados."}
        </p>
      </div>

      <div className="authIdentityFooter">
        <span><CheckCircle2 aria-hidden="true" /> Acceso corporativo</span>
        <span><CheckCircle2 aria-hidden="true" /> Información centralizada</span>
        <span><CheckCircle2 aria-hidden="true" /> Continuidad operacional</span>
      </div>
    </aside>
  );
}

export function AuthScreen({ configurationError }: { configurationError?: string }) {
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(configurationError ?? "");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    const client = browserSupabase();
    if (!client) {
      setError("El acceso empresarial no está disponible en este momento.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setNotice("");
      if(!normalizeUserRut(rut))throw new Error("Ingresa un RUT válido, incluido su dígito verificador.");
      await signInWithRut(rut,password);
    } catch(reason) {
      setError(reason instanceof Error?reason.message:"RUT o contraseña incorrectos.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    const client = browserSupabase();
    if (!normalizeUserRut(rut)) {
      setError("Ingresa tu RUT para continuar.");
      return;
    }
    if (!client) {
      setError("El acceso empresarial no está disponible en este momento.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const response=await fetch("/api/equipo/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rut,action:"recover"}),cache:"no-store"});
      if(!response.ok)throw new Error("RECOVERY_UNAVAILABLE");
      setNotice("Si el RUT está registrado, recibirás instrucciones en el correo de esa cuenta.");
    } catch {
      setError("No fue posible procesar la solicitud. Inténtalo nuevamente en unos minutos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authScreen">
      <section className="authPanel" aria-label="Acceso a Zyteron Control">
        <AuthIdentity />
        <form className="authForm" onSubmit={login}>
          <div className="authFormHeader">
            <span className="authFormIcon"><LockKeyhole aria-hidden="true" /></span>
            <p className="authKicker">PORTAL INTERNO</p>
            <h2>Bienvenido de nuevo</h2>
            <p>Ingresa con tus credenciales corporativas para continuar.</p>
          </div>

          <label>
            RUT
            <span className="authInput">
              <IdCard aria-hidden="true" />
              <input
                type="text"
                autoComplete="username"
                placeholder="12.345.678-5"
                required
                value={rut}
                maxLength={20}
                onChange={(event) => setRut(event.target.value)}
              />
            </span>
          </label>

          <label>
            Contraseña
            <span className="authInput">
              <KeyRound aria-hidden="true" />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </span>
          </label>

          {error ? <div className="authError" role="alert"><AlertTriangle aria-hidden="true" />{error}</div> : null}
          {notice ? <div className="authNotice" role="status"><CheckCircle2 aria-hidden="true" />{notice}</div> : null}

          <button className="authPrimaryButton" disabled={busy}>
            {busy ? <LoaderCircle className="authSpin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
            {busy ? "Verificando…" : "Ingresar"}
            {!busy ? <ArrowRight className="authButtonArrow" aria-hidden="true" /> : null}
          </button>
          <button type="button" className="authReset" onClick={() => void reset()} disabled={busy}>
            ¿Olvidaste tu contraseña?
          </button>

          <div className="authFormFooter">
            <ShieldCheck aria-hidden="true" />
            <span>Acceso exclusivo para usuarios autorizados.</span>
          </div>
        </form>
      </section>
      <p className="authLegal">© 2026 Zyteron SpA · Plataforma de gestión empresarial</p>
    </main>
  );
}

export function PasswordRecoveryScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  async function update(event: React.FormEvent) {
    event.preventDefault();
    const issue = validateNewPassword(password, confirmation);
    if (issue) {
      setError(issue);
      return;
    }

    const client = browserSupabase();
    if (!client) {
      setError("El acceso empresarial no está disponible en este momento.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) throw updateError;
      await client.auth.refreshSession();
      window.history.replaceState({}, "", new URL(window.location.pathname.startsWith("/equipo")?"/equipo":"/dashboard", window.location.origin));
      setNotice("Tu contraseña fue actualizada correctamente.");
      setComplete(true);
    } catch {
      setError("No fue posible actualizar la contraseña. Solicita un nuevo enlace e inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authScreen">
      <section className="authPanel" aria-label="Recuperación de acceso">
        <AuthIdentity recovery />
        <form className="authForm" onSubmit={update}>
          <div className="authFormHeader">
            <span className="authFormIcon"><KeyRound aria-hidden="true" /></span>
            <p className="authKicker">RECUPERACIÓN DE ACCESO</p>
            <h2>Nueva contraseña</h2>
            <p>Crea una contraseña robusta y fácil de recordar para ti.</p>
          </div>

          <label>
            Nueva contraseña
            <span className="authInput">
              <LockKeyhole aria-hidden="true" />
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                placeholder="Mínimo 12 caracteres"
                required
                disabled={complete}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </span>
          </label>

          <label>
            Confirmar contraseña
            <span className="authInput">
              <LockKeyhole aria-hidden="true" />
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                placeholder="Repite tu nueva contraseña"
                required
                disabled={complete}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </span>
          </label>

          <div className="authPasswordRules">Usa 12 o más caracteres e incluye mayúsculas, minúsculas y números.</div>
          {error ? <div className="authError" role="alert"><AlertTriangle aria-hidden="true" />{error}</div> : null}
          {notice ? <div className="authNotice" role="status"><CheckCircle2 aria-hidden="true" />{notice}</div> : null}

          {complete ? (
            <button className="authPrimaryButton" type="button" onClick={onComplete}>
              <ShieldCheck aria-hidden="true" /> Continuar <ArrowRight className="authButtonArrow" aria-hidden="true" />
            </button>
          ) : (
            <button className="authPrimaryButton" disabled={busy}>
              {busy ? <LoaderCircle className="authSpin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
              {busy ? "Actualizando…" : "Actualizar contraseña"}
            </button>
          )}

          <div className="authFormFooter">
            <ShieldCheck aria-hidden="true" />
            <span>Si no solicitaste este cambio, cierra esta ventana.</span>
          </div>
        </form>
      </section>
      <p className="authLegal">© 2026 Zyteron SpA · Plataforma de gestión empresarial</p>
    </main>
  );
}
