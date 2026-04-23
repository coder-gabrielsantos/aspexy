"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Info, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import AuthSplitShell from "@/components/auth-split-shell";
import { PasswordToggleField } from "@/components/password-toggle-field";
import { SignupOtpField } from "@/components/signup-otp-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isCompleteOtp } from "@/lib/signup-verification-shared";
import { readJsonSafe } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Logo Google oficial (multicolor). */
function GoogleGIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.652 32.657 29.195 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.96 3.04l5.657-5.657C34.047 6.053 29.248 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 12.88 19.51C14.657 15.108 18.965 12 24 12c3.059 0 5.842 1.154 7.96 3.04l5.657-5.657C34.047 6.053 29.248 4 24 4 16.318 4 9.656 8.326 6.306 14.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.094 0 9.809-1.959 13.352-5.147l-6.169-5.223C29.149 35.155 26.715 36 24 36c-5.173 0-9.615-3.317-11.283-7.946l-6.52 5.025C9.51 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a11.96 11.96 0 0 1-4.12 5.63l.003-.002 6.169 5.223C36.919 39.09 44 34 44 24c0-1.341-.138-2.651-.389-3.917Z"
      />
    </svg>
  );
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "E-mail ou senha incorretos.",
  OAuthSignin: "Erro ao iniciar login com Google. Verifique Client ID/Secret e URLs no Google Cloud.",
  OAuthCallback:
    "Erro no retorno do Google. Confira redirect URI (http://localhost:3000/api/auth/callback/google), NEXTAUTH_URL e se o Client Secret está correto.",
  Callback:
    "Falha no callback OAuth (troca do código por sessão). Verifique NEXTAUTH_SECRET, redirect URI no Google Cloud e tente em aba anônima.",
  OAuthAccountNotLinked: "Esta conta já está vinculada a outro método de login.",
  AccessDenied: "Acesso negado. Se o app está em modo teste, adicione seu e-mail em Test users.",
  Configuration: "Configuração do servidor de autenticação inválida (NEXTAUTH_SECRET, URLs, etc.).",
  Default: "Não foi possível concluir o login. Tente novamente."
};

function fieldClass(dark?: boolean) {
  return cn(
    "h-11 rounded-lg border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2",
    dark
      ? "border-slate-600/80 bg-slate-900/50 text-white shadow-none placeholder:text-slate-500 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/25"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20"
  );
}

function SignupStepIndicator({
  step,
  dark
}: {
  step: "email" | "code" | "password";
  dark?: boolean;
}) {
  const steps: ("email" | "code" | "password")[] = ["email", "code", "password"];
  const active = steps.indexOf(step);
  return (
    <div className="flex gap-1.5" aria-hidden>
      {steps.map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-300",
            i <= active ? "bg-indigo-500" : dark ? "bg-slate-700" : "bg-slate-200"
          )}
        />
      ))}
    </div>
  );
}

function LoginForm({
  oauthErrorMessage,
  googleConfigured,
  dark
}: {
  oauthErrorMessage: string | null;
  googleConfigured: boolean;
  dark?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [signupStep, setSignupStep] = useState<"email" | "code" | "password">("email");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [signupCodeDelivery, setSignupCodeDelivery] = useState<"email" | "console" | null>(null);
  const [otpFocusTick, setOtpFocusTick] = useState(0);
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const t = window.setInterval(() => {
      setForgotCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [forgotCooldown]);

  const bannerError = localError ?? oauthErrorMessage;

  const resetSignupWizard = () => {
    setSignupStep("email");
    setSignupOtp("");
    setSignupCodeDelivery(null);
    setRegistrationToken(null);
    setResendCooldown(0);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const goHomeAfterSignIn = async () => {
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl: "/"
    });
    if (res?.error) {
      setLocalError("E-mail ou senha incorretos.");
      return;
    }
    if (res?.ok) {
      router.push("/");
      router.refresh();
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setBusy(true);
    try {
      await goHomeAfterSignIn();
    } finally {
      setBusy(false);
    }
  };

  const postSendCode = async () => {
    const r = await fetch("/api/auth/signup/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() })
    });
    const d = await readJsonSafe<{ ok?: boolean; error?: string; delivery?: string }>(r);
    if (!r.ok || !d?.ok) {
      setLocalError(d?.error ?? "Não foi possível enviar o código.");
      return false;
    }
    setSignupCodeDelivery(d.delivery === "console" ? "console" : "email");
    setSignupOtp("");
    setSignupStep("code");
    setOtpFocusTick((n) => n + 1);
    setResendCooldown(60);
    return true;
  };

  const handleSignupEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setBusy(true);
    try {
      await postSendCode();
    } finally {
      setBusy(false);
    }
  };

  const handleSignupResend = async () => {
    if (resendCooldown > 0 || busy) return;
    setLocalError(null);
    setBusy(true);
    try {
      await postSendCode();
    } finally {
      setBusy(false);
    }
  };

  const handleSignupVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!isCompleteOtp(signupOtp)) {
      setLocalError("Digite os 6 dígitos do código.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/signup/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: signupOtp })
      });
      const d = await readJsonSafe<{ ok?: boolean; error?: string; registrationToken?: string }>(r);
      if (!r.ok || !d?.ok || !d.registrationToken) {
        setLocalError(d?.error ?? "Código inválido.");
        return;
      }
      setRegistrationToken(d.registrationToken);
      setSignupStep("password");
    } finally {
      setBusy(false);
    }
  };

  const handleSignupRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!registrationToken) {
      setLocalError("Sessão de verificação expirada. Confirme o código novamente.");
      setSignupStep("code");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          registrationToken
        })
      });
      const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
      if (!r.ok || !d?.ok) {
        setLocalError(d?.error ?? "Não foi possível criar a conta.");
        return;
      }
      await goHomeAfterSignIn();
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: "signin" | "signup" | "forgot") => {
    setMode(next);
    setLocalError(null);
    setForgotSent(false);
    setForgotCooldown(0);
    if (next === "signup") {
      setEmail("");
      resetSignupWizard();
    } else if (next === "signin") {
      resetSignupWizard();
      setEmail("");
    }
    setPassword("");
    setShowPassword(false);
  };

  const submitForgotPassword = async () => {
    setLocalError(null);
    if (forgotCooldown > 0 || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      const d = await readJsonSafe<{ ok?: boolean; error?: string; message?: string }>(r);
      if (!r.ok || !d?.ok) {
        setLocalError(d?.error ?? "Não foi possível enviar o e-mail.");
        return;
      }
      setForgotSent(true);
      setForgotCooldown(60);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForgotPassword();
  };

  const headline =
    mode === "forgot"
      ? { title: "Esqueceu a senha?", subtitle: "Informe seu e-mail e enviaremos um link para criar uma nova senha" }
      : mode === "signin"
      ? { title: "Bem-vindo", subtitle: "Entre com e-mail e senha ou use o Google" }
      : signupStep === "email"
        ? { title: "Criar conta", subtitle: "Enviaremos um código para seu e-mail" }
        : signupStep === "code"
          ? signupCodeDelivery === "console"
            ? {
                title: "Código gerado",
                subtitle: `Em ambiente local o e-mail não é enviado — o código para ${email.trim()} aparece no terminal do servidor`
              }
            : { title: "Verifique seu e-mail", subtitle: `Enviamos um código de 6 dígitos para ${email.trim()}` }
          : { title: "Defina sua senha", subtitle: "Último passo: escolha uma senha segura para sua conta" };

  return (
    <>
      <div className="space-y-1.5 text-center">
        <h1
          className={cn(
            "text-2xl font-semibold tracking-tight",
            dark ? "text-white" : "text-slate-900"
          )}
        >
          {headline.title}
        </h1>
        <p className={cn("text-sm leading-relaxed", dark ? "text-slate-400" : "text-slate-500")}>{headline.subtitle}</p>
        {mode === "signup" ? (
          <div className="mx-auto max-w-[280px] pt-1">
            <SignupStepIndicator step={signupStep} dark={dark} />
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {bannerError ? (
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
              <div className="leading-relaxed">{bannerError}</div>
            </div>
          </div>
        ) : null}

        {mode === "forgot" && forgotSent ? (
          <div
            className={cn(
              "rounded-xl border p-3 text-left text-sm",
              dark
                ? "border-sky-500/35 bg-sky-950/35 text-sky-100"
                : "border-sky-200/90 bg-sky-50/90 text-sky-950"
            )}
          >
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400" aria-hidden />
              <div className="leading-relaxed">
                Se houver conta neste e-mail, você receberá um link em instantes. Expira em 1 hora.
              </div>
            </div>
          </div>
        ) : null}

        {!googleConfigured && mode !== "forgot" ? (
          <div
            className={cn(
              "rounded-xl border p-3 text-left text-sm",
              dark
                ? "border-amber-500/30 bg-amber-950/40 text-amber-300"
                : "border-amber-200/80 bg-amber-50/80 text-amber-800"
            )}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="leading-relaxed">
                Login com Google opcional: defina <code className="rounded bg-black/20 px-1">GOOGLE_CLIENT_ID</code> e{" "}
                <code className="rounded bg-black/20 px-1">GOOGLE_CLIENT_SECRET</code> no ambiente
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {mode === "forgot" ? (
        <form className="mt-6 space-y-3.5" onSubmit={handleForgotPasswordSubmit}>
          <div>
            <label
              htmlFor={dark ? "email-m" : "email"}
              className={cn("mb-1.5 block text-xs font-medium", dark ? "text-slate-300" : "text-slate-600")}
            >
              E-mail
            </label>
            <div className="relative">
              <Mail
                className={cn(
                  "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                  dark ? "text-slate-500" : "text-slate-400"
                )}
                aria-hidden
              />
              <Input
                id={dark ? "email-m" : "email"}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(fieldClass(dark), "pl-10")}
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <button
            type="button"
            className={cn(
              "mb-1 flex w-full items-center justify-start gap-1.5 text-sm font-medium transition-colors",
              dark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => switchMode("signin")}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Voltar ao login
          </button>

          <Button
            type="submit"
            disabled={busy || forgotCooldown > 0}
            className={cn(
              "h-11 w-full rounded-full text-sm font-semibold shadow-sm transition-transform active:scale-[0.99]",
              dark ? "bg-[#4F46E5] text-white hover:bg-[#4338CA]" : ""
            )}
          >
            {busy
              ? "Enviando…"
              : forgotCooldown > 0
                ? `Aguarde ${forgotCooldown}s para reenviar`
                : forgotSent
                  ? "Enviar novamente"
                  : "Enviar link por e-mail"}
          </Button>
        </form>
      ) : mode === "signin" ? (
        <form className="mt-6 space-y-3.5" onSubmit={handleSignIn}>
          <div>
            <label
              htmlFor={dark ? "email-m" : "email"}
              className={cn("mb-1.5 block text-xs font-medium", dark ? "text-slate-300" : "text-slate-600")}
            >
              E-mail
            </label>
            <Input
              id={dark ? "email-m" : "email"}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass(dark)}
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label
              htmlFor={dark ? "pw-m" : "pw"}
              className={cn("mb-1.5 block text-xs font-medium", dark ? "text-slate-300" : "text-slate-600")}
            >
              Senha
            </label>
            <PasswordToggleField
              id={dark ? "pw-m" : "pw"}
              dark={dark}
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggleVisible={() => setShowPassword((v) => !v)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className={cn(
                "text-sm font-medium underline-offset-2 transition-colors hover:underline",
                dark ? "text-indigo-300 hover:text-indigo-200" : "text-indigo-700 hover:text-indigo-800"
              )}
              onClick={() => {
                setMode("forgot");
                setLocalError(null);
                setForgotSent(false);
                setForgotCooldown(0);
              }}
            >
              Esqueceu a senha?
            </button>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className={cn(
              "h-11 w-full rounded-full text-sm font-semibold shadow-sm transition-transform active:scale-[0.99]",
              dark ? "bg-[#4F46E5] text-white hover:bg-[#4338CA]" : ""
            )}
          >
            {busy ? "Aguarde…" : "Entrar"}
          </Button>
        </form>
      ) : signupStep === "email" ? (
        <form className="mt-6 space-y-3.5" onSubmit={handleSignupEmailSubmit}>
          <div>
            <label
              htmlFor={dark ? "email-m" : "email"}
              className={cn("mb-1.5 block text-xs font-medium", dark ? "text-slate-300" : "text-slate-600")}
            >
              E-mail
            </label>
            <div className="relative">
              <Mail
                className={cn(
                  "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                  dark ? "text-slate-500" : "text-slate-400"
                )}
                aria-hidden
              />
              <Input
                id={dark ? "email-m" : "email"}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(fieldClass(dark), "pl-10")}
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className={cn(
              "h-11 w-full rounded-full text-sm font-semibold shadow-sm transition-transform active:scale-[0.99]",
              dark ? "bg-[#4F46E5] text-white hover:bg-[#4338CA]" : ""
            )}
          >
            {busy ? "Enviando…" : "Continuar"}
          </Button>
        </form>
      ) : signupStep === "code" ? (
        <form className="mt-6 space-y-4" onSubmit={handleSignupVerifySubmit}>
          {signupCodeDelivery === "console" ? (
            <div
              className={cn(
                "flex gap-2.5 rounded-xl border p-3 text-left text-sm",
                dark
                  ? "border-sky-500/35 bg-sky-950/35 text-sky-100"
                  : "border-sky-200/90 bg-sky-50/90 text-sky-950"
              )}
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400" aria-hidden />
              <div className="leading-relaxed">
                Abra o terminal onde está rodando <code className="rounded bg-black/10 px-1 dark:bg-white/10">npm run dev</code> e
                procure a linha{" "}
                <code className="rounded bg-black/10 px-1 text-xs dark:bg-white/10">[signup] código para…</code> — para receber
                e-mail de verdade, configure <code className="rounded bg-black/10 px-1 dark:bg-white/10">RESEND_API_KEY</code>
              </div>
            </div>
          ) : null}
          <div>
            <p className={cn("mb-2 text-xs font-medium", dark ? "text-slate-400" : "text-slate-600")}>Código</p>
            <SignupOtpField
              value={signupOtp}
              onChange={setSignupOtp}
              dark={dark}
              disabled={busy}
              focusTrigger={otpFocusTick}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 font-medium transition-colors",
                dark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
              onClick={() => {
                setSignupStep("email");
                setSignupOtp("");
                setLocalError(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Alterar e-mail
            </button>
            <button
              type="button"
              disabled={resendCooldown > 0 || busy}
              className={cn(
                "font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                dark ? "text-indigo-300 hover:text-indigo-200" : "text-indigo-700 hover:text-indigo-800"
              )}
              onClick={handleSignupResend}
            >
              {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
            </button>
          </div>

          <Button
            type="submit"
            disabled={busy || !isCompleteOtp(signupOtp)}
            className={cn(
              "h-11 w-full rounded-full text-sm font-semibold shadow-sm transition-transform active:scale-[0.99]",
              dark ? "bg-[#4F46E5] text-white hover:bg-[#4338CA]" : ""
            )}
          >
            {busy ? "Verificando…" : "Confirmar código"}
          </Button>
        </form>
      ) : (
        <form className="mt-6 space-y-3.5" onSubmit={handleSignupRegisterSubmit}>
          <div
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm",
              dark ? "border-slate-600/80 bg-slate-900/40 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"
            )}
          >
            <span className="text-xs font-medium opacity-80">E-mail</span>
            <p className="truncate font-medium">{email.trim()}</p>
          </div>

          <div>
            <label
              htmlFor={dark ? "pw-m" : "pw"}
              className={cn("mb-1.5 block text-xs font-medium", dark ? "text-slate-300" : "text-slate-600")}
            >
              Senha
            </label>
            <PasswordToggleField
              id={dark ? "pw-m" : "pw"}
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
              htmlFor={dark ? "pw2-m" : "pw2"}
              className={cn("mb-1.5 block text-xs font-medium", dark ? "text-slate-300" : "text-slate-600")}
            >
              Confirmar senha
            </label>
            <PasswordToggleField
              id={dark ? "pw2-m" : "pw2"}
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

          <button
            type="button"
            className={cn(
              "mb-1 flex w-full items-center justify-center gap-1.5 text-sm font-medium transition-colors",
              dark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => {
              resetSignupWizard();
              setLocalError(null);
            }}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Recomeçar verificação
          </button>

          <Button
            type="submit"
            disabled={busy}
            className={cn(
              "h-11 w-full rounded-full text-sm font-semibold shadow-sm transition-transform active:scale-[0.99]",
              dark ? "bg-[#4F46E5] text-white hover:bg-[#4338CA]" : ""
            )}
          >
            {busy ? "Aguarde…" : "Criar conta"}
          </Button>
        </form>
      )}

      <p className={cn("mt-4 text-center text-sm", dark ? "text-slate-400" : "text-slate-500")}>
        {mode === "forgot" ? (
          <>
            Lembrou a senha?{" "}
            <button
              type="button"
              className={cn("font-semibold underline-offset-2 hover:underline", dark ? "text-indigo-300" : "text-indigo-700")}
              onClick={() => switchMode("signin")}
            >
              Entrar
            </button>
          </>
        ) : mode === "signin" ? (
          <>
            Não tem conta?{" "}
            <button
              type="button"
              className={cn("font-semibold underline-offset-2 hover:underline", dark ? "text-indigo-300" : "text-indigo-700")}
              onClick={() => switchMode("signup")}
            >
              Criar uma
            </button>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <button
              type="button"
              className={cn("font-semibold underline-offset-2 hover:underline", dark ? "text-indigo-300" : "text-indigo-700")}
              onClick={() => switchMode("signin")}
            >
              Entrar
            </button>
          </>
        )}
      </p>

      {googleConfigured && mode !== "forgot" ? (
        <>
          <div className="my-6 flex items-center gap-3">
            <div className={cn("h-px flex-1", dark ? "bg-slate-700" : "bg-slate-200")} />
            <span className={cn("shrink-0 text-xs font-medium uppercase tracking-wide", dark ? "text-slate-500" : "text-slate-400")}>
              ou
            </span>
            <div className={cn("h-px flex-1", dark ? "bg-slate-700" : "bg-slate-200")} />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className={cn(
              "h-12 w-full rounded-full text-sm font-semibold shadow-none transition-transform active:scale-[0.98]",
              dark
                ? "border-slate-600 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900"
                : "border-slate-700/90 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-800"
            )}
          >
            <span className="inline-flex min-w-0 items-center justify-center gap-3">
              <GoogleGIcon className="h-5 w-5 shrink-0" />
              Entrar com Google
            </span>
          </Button>
        </>
      ) : null}

      <p className={cn("mt-8 text-center text-xs leading-relaxed", dark ? "text-slate-500" : "text-slate-400")}>
        Ao entrar, você aceita os termos e a política de privacidade
      </p>
    </>
  );
}

type LoginScreenProps = {
  googleConfigured: boolean;
  oauthError?: string;
};

export default function LoginScreen({ googleConfigured, oauthError }: LoginScreenProps) {
  const oauthErrorMessage = oauthError
    ? AUTH_ERROR_MESSAGES[oauthError] ?? `${AUTH_ERROR_MESSAGES.Default} (código: ${oauthError})`
    : null;

  return (
    <AuthSplitShell
      mobileSlot={
        <LoginForm oauthErrorMessage={oauthErrorMessage} googleConfigured={googleConfigured} dark />
      }
      desktopSlot={<LoginForm oauthErrorMessage={oauthErrorMessage} googleConfigured={googleConfigured} />}
    />
  );
}
