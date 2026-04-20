"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { PasswordToggleField } from "@/components/password-toggle-field";
import { Button } from "@/components/ui/button";
import { readJsonSafe } from "@/lib/types";
import { cn } from "@/lib/utils";

function linkBtnClass(dark?: boolean) {
  return cn(
    "inline-flex h-11 w-full items-center justify-center rounded-full border text-sm font-semibold shadow-sm transition-colors",
    dark
      ? "border-slate-600/80 bg-slate-900/50 text-white hover:border-indigo-400/80 hover:bg-slate-800/60"
      : "border-slate-200 bg-white text-slate-800 hover:border-indigo-300/90 hover:bg-indigo-50/50"
  );
}

type ResetPasswordFormProps = {
  /** Painel escuro (mobile), alinhado ao `LoginForm` com `dark`. */
  dark?: boolean;
};

export default function ResetPasswordForm({ dark }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Link inválido. Abra o endereço completo enviado por e-mail.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
      if (!r.ok || !d?.ok) {
        setError(d?.error ?? "Não foi possível salvar a nova senha.");
        return;
      }
      setDone(true);
      window.setTimeout(() => {
        router.push("/login");
      }, 2200);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full space-y-6">
        <div className="space-y-1.5 text-center">
          <h1
            className={cn("text-2xl font-semibold tracking-tight", dark ? "text-white" : "text-slate-900")}
          >
            Link inválido
          </h1>
          <p className={cn("text-sm leading-relaxed", dark ? "text-slate-400" : "text-slate-500")}>
            Este endereço não contém um token de redefinição. Use o botão no e-mail ou solicite um novo link na página
            de login.
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border p-4 text-left text-sm",
            dark
              ? "border-amber-500/30 bg-amber-950/40 text-amber-300"
              : "border-amber-200/90 bg-amber-50/90 text-amber-950"
          )}
        >
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Abra o link completo enviado para seu e-mail ou peça um novo envio em &quot;Esqueci a senha&quot;.</p>
          </div>
        </div>
        <Link href="/login" className={linkBtnClass(dark)}>
          Voltar ao login
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full space-y-6">
        <div className="space-y-1.5 text-center">
          <h1
            className={cn("text-2xl font-semibold tracking-tight", dark ? "text-white" : "text-slate-900")}
          >
            Senha alterada
          </h1>
          <p className={cn("text-sm leading-relaxed", dark ? "text-slate-400" : "text-slate-500")}>
            Redirecionando para o login…
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border p-4 text-left text-sm",
            dark
              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
              : "border-emerald-200/90 bg-emerald-50/90 text-emerald-950"
          )}
        >
          <div className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Sua nova senha foi salva. Você já pode entrar com ela.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className={cn("text-2xl font-semibold tracking-tight", dark ? "text-white" : "text-slate-900")}>
          Nova senha
        </h1>
        <p className={cn("text-sm leading-relaxed", dark ? "text-slate-400" : "text-slate-500")}>
          Escolha uma senha forte para sua conta
        </p>
      </div>

      {error ? (
        <div
          className={cn(
            "rounded-xl border p-3 text-left text-sm",
            dark
              ? "border-rose-500/30 bg-rose-950/40 text-rose-300"
              : "border-rose-200/80 bg-rose-50/80 text-rose-800"
          )}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor={dark ? "npw-m" : "npw"}
            className={cn("mb-1.5 block text-xs font-medium", dark ? "text-slate-300" : "text-slate-600")}
          >
            Nova senha
          </label>
          <PasswordToggleField
            id={dark ? "npw-m" : "npw"}
            dark={dark}
            value={password}
            onChange={setPassword}
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            minLength={8}
          />
        </div>
        <div>
          <label
            htmlFor={dark ? "npw2-m" : "npw2"}
            className={cn("mb-1.5 block text-xs font-medium", dark ? "text-slate-300" : "text-slate-600")}
          >
            Confirmar senha
          </label>
          <PasswordToggleField
            id={dark ? "npw2-m" : "npw2"}
            dark={dark}
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirmPassword}
            onToggleVisible={() => setShowConfirmPassword((v) => !v)}
            autoComplete="new-password"
            placeholder="Repita a senha"
            minLength={8}
          />
        </div>
        <Button
          type="submit"
          disabled={busy}
          className={cn(
            "h-11 w-full rounded-full text-sm font-semibold shadow-sm transition-transform active:scale-[0.99]",
            dark ? "bg-indigo-500 text-white hover:bg-indigo-400" : ""
          )}
        >
          {busy ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>

      <p className={cn("text-center text-sm", dark ? "text-slate-400" : "text-slate-500")}>
        <Link
          href="/login"
          className={cn("font-semibold underline-offset-2 hover:underline", dark ? "text-indigo-300" : "text-indigo-700")}
        >
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
