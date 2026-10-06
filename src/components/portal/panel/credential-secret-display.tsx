"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Eye, Mail, ShieldAlert, KeyRound } from "lucide-react";

export function CredentialSecretDisplay({
  credentialId,
  secretMasked,
}: {
  credentialId: string;
  secretMasked: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [approvalCode, setApprovalCode] = useState("");
  const [challengeId, setChallengeId] = useState("");

  function changeDialog(open: boolean) {
    setIsOpen(open);
    setPassword("");
    setCode("");
    setApprovalCode("");
    setChallengeId("");
    setMessage(null);
  }
  const [pendingCode, startCodeTransition] = useTransition();
  const [pendingReveal, startRevealTransition] = useTransition();

  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = window.setTimeout(() => {
      setTimeLeft((current) => {
        const next = Math.max(0, current - 1);
        if (next === 0) {
          setIsRevealed(false);
          setRevealedSecret(null);
        }
        return next;
      });
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [timeLeft]);

  async function handleSendCode() {
    startCodeTransition(async () => {
      setChallengeId("");
      setCode("");
      setApprovalCode("");
      try {
        const res = await fetch("/api/portal/credentials/send-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credentialId }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setChallengeId(data.challengeId);
          setMessage({ text: data.message || "Ambos códigos enviados.", type: "success" });
        } else {
          setMessage({ text: data.error || "No se pudo enviar el código.", type: "error" });
        }
      } catch {
        setMessage({ text: "No se pudo conectar. Inténtalo nuevamente.", type: "error" });
      }
    });
  }

  async function handleReveal(e: React.FormEvent) {
    e.preventDefault();
    startRevealTransition(async () => {
      try {
        const res = await fetch(`/api/portal/credentials/${credentialId}/reveal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, code, approvalCode, challengeId }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setRevealedSecret(data.secret);
          setIsRevealed(true);
          setTimeLeft(30);
          setIsOpen(false);
          // Clean form
          setPassword("");
          setCode("");
          setApprovalCode("");
          setChallengeId("");
          setMessage(null);
        } else {
          setMessage({ text: data.error || "Datos incorrectos.", type: "error" });
        }
      } catch {
        setMessage({ text: "No se pudo conectar. Inténtalo nuevamente.", type: "error" });
      }
    });
  }

  function handleCopy() {
    if (!revealedSecret) return;
    const textToCopy = revealedSecret || "";
    navigator.clipboard.writeText(textToCopy);
    alert("Contraseña copiada al portapapeles");
  }

  if (!secretMasked) {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">Secreto</span>
        <span className="font-mono text-slate-600">No registrado</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Fila del secreto */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Secreto</span>
          {isRevealed ? (
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-base font-bold text-slate-900">
              {revealedSecret}
            </span>
          ) : (
            <span className="font-mono text-slate-600">{secretMasked}</span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2">
          {isRevealed ? (
            <>
              <span className="flex animate-pulse items-center gap-1 text-[10px] font-bold text-rose-600">
                <ShieldAlert className="h-3 w-3" />
                Ocultando en {timeLeft}s
              </span>
              <Button
                size="sm"
                variant="default"
                className="h-7 gap-1 bg-blue-600 text-[10px]"
                onClick={handleCopy}
              >
                <Copy className="h-3 w-3" /> Copiar contraseña
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[10px]"
              onClick={() => changeDialog(true)}
            >
              <Eye className="h-3 w-3" /> Mostrar secreto
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!pendingCode && !pendingReveal) changeDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Autenticación Requerida
            </DialogTitle>
            <DialogDescription>
              Para ver esta credencial, ingresa tu contraseña, el código enviado al correo del dueño
              y el código de autorización enviado a contacto@zyteron.cl. Cada solicitud expira en 5
              minutos y permite hasta 5 intentos.
            </DialogDescription>
          </DialogHeader>

          {message && (
            <div
              className={`rounded-md p-3 text-xs ${message.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleReveal} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tu contraseña de Login</Label>
              <div className="relative">
                <KeyRound className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Código del correo del dueño</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 p-0 text-xs text-blue-600 hover:bg-transparent hover:text-blue-700"
                  onClick={handleSendCode}
                  disabled={pendingCode || pendingReveal}
                >
                  {pendingCode ? "Enviando..." : "¿Enviar código de nuevo?"}
                </Button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    required
                    placeholder="123456"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    autoComplete="off"
                    className="pl-9 font-mono tracking-widest"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                {/* Primer envío de código si aún no lo han solicitado */}
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  onClick={handleSendCode}
                  disabled={pendingCode || pendingReveal}
                >
                  {pendingCode ? "..." : "Solicitar Código"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`approval-${credentialId}`}>Código de contacto@zyteron.cl</Label>
              <Input
                id={`approval-${credentialId}`}
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="off"
                placeholder="Código de autorización"
                className="font-mono tracking-widest"
                value={approvalCode}
                onChange={(e) => setApprovalCode(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Solicita ambos códigos y coordina la autorización con Zyteron. Todos los intentos
                quedan registrados y se notifican por correo.
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                disabled={pendingCode || pendingReveal}
                onClick={() => changeDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600"
                disabled={pendingReveal || pendingCode || !challengeId}
              >
                {pendingReveal ? "Verificando..." : "Revelar secreto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
