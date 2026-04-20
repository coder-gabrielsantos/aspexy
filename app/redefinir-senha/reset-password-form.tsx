"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { PasswordToggleField } from "@/components/password-toggle-field";
import { PlatformLogo } from "@/components/platform-logo";
import { Button } from "@/components/ui/button";
import { readJsonSafe } from "@/lib/types";

const linkBtnClass =
  "inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-indigo-300/90 hover:bg-indigo-50/50";

export default function ResetPasswordForm() {
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
      <div className="mx-auto w-full max-w-md space-y-6 px-6 py-16 text-center">
        <PlatformLogo size={120} className="mx-auto h-24 w-24" priority />
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 p-4 text-left text-sm text-amber-950">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Este link não contém um token válido. Use o botão no e-mail ou solicite um novo link na página de login.</p>
          </div>
        </div>
        <Link href="/login" className={linkBtnClass}>
          Voltar ao login
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 px-6 py-16 text-center">
        <PlatformLogo size={120} className="mx-auto h-24 w-24" priority />
        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 p-4 text-left text-sm text-emerald-950">
          <div className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Senha alterada com sucesso. Redirecionando para o login…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-6 py-12 sm:py-16">
      <div className="text-center">
        <PlatformLogo size={120} className="mx-auto h-24 w-24" priority />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">Nova senha</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">Escolha uma senha forte para sua conta.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 p-3 text-left text-sm text-rose-800">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="npw" className="mb-1.5 block text-xs font-medium text-slate-600">
            Nova senha
          </label>
          <PasswordToggleField
            id="npw"
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
          <label htmlFor="npw2" className="mb-1.5 block text-xs font-medium text-slate-600">
            Confirmar senha
          </label>
          <PasswordToggleField
            id="npw2"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirmPassword}
            onToggleVisible={() => setShowConfirmPassword((v) => !v)}
            autoComplete="new-password"
            placeholder="Repita a senha"
            minLength={8}
          />
        </div>
        <Button type="submit" disabled={busy} className="h-11 w-full rounded-full text-sm font-semibold">
          {busy ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-indigo-700 underline-offset-2 hover:underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
