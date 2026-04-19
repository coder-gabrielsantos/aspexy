"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { PlatformLogo } from "@/components/platform-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      ? "border-slate-600/80 bg-slate-900/50 text-white placeholder:text-slate-500 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/25"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20"
  );
}

function passwordFieldShellClass(dark?: boolean) {
  return cn(
    "flex h-11 min-w-0 overflow-hidden rounded-lg border text-sm transition-colors focus-within:outline-none focus-within:ring-2",
    dark
      ? "border-slate-600/80 bg-slate-900/50 focus-within:border-indigo-400 focus-within:ring-indigo-500/25"
      : "border-slate-200 bg-white focus-within:border-indigo-400 focus-within:ring-indigo-500/20"
  );
}

function PasswordToggleField({
  id,
  dark,
  value,
  onChange,
  visible,
  onToggleVisible,
  autoComplete,
  placeholder,
  minLength,
  required = true
}: {
  id: string;
  dark?: boolean;
  value: string;
  onChange: (next: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  autoComplete: string;
  placeholder: string;
  minLength?: number;
  required?: boolean;
}) {
  return (
    <div className={cn(passwordFieldShellClass(dark), "password-field-custom-toggle")}>
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={minLength}
        className={cn(
          "h-11 min-h-0 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-0 shadow-none ring-0 ring-offset-0 transition-colors",
          "focus-visible:border-0 focus-visible:ring-0",
          dark
            ? "text-white placeholder:text-slate-500"
            : "text-slate-900 placeholder:text-slate-400"
        )}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center border-l transition-[color,background-color]",
          dark
            ? "border-slate-600/80 text-slate-400 hover:bg-white/[0.07] hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/35"
            : "border-slate-200 text-slate-500 hover:bg-indigo-50/80 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/25"
        )}
      >
        {visible ? (
          <EyeOff className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={1.85} aria-hidden />
        ) : (
          <Eye className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={1.85} aria-hidden />
        )}
      </button>
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const bannerError = localError ?? oauthErrorMessage;

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
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
          password
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

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setLocalError(null);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <>
      <div className="space-y-1.5 text-center">
        <h1
          className={cn(
            "text-2xl font-semibold tracking-tight",
            dark ? "text-white" : "text-slate-900"
          )}
        >
          Bem-vindo
        </h1>
        <p className={cn("text-sm", dark ? "text-slate-400" : "text-slate-500")}>
          {mode === "signin" ? "Entre com e-mail e senha ou use o Google." : "Crie sua conta com e-mail e senha."}
        </p>
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

        {!googleConfigured ? (
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
                <code className="rounded bg-black/20 px-1">GOOGLE_CLIENT_SECRET</code> no ambiente.
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <form className="mt-6 space-y-3.5" onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>
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
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder={mode === "signin" ? "••••••••" : "Mínimo 8 caracteres"}
            minLength={mode === "signup" ? 8 : undefined}
          />
        </div>

        {mode === "signup" ? (
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
        ) : null}

        <Button
          type="submit"
          disabled={busy}
          className={cn(
            "h-11 w-full rounded-full text-sm font-semibold shadow-sm transition-transform active:scale-[0.99]",
            dark ? "bg-indigo-500 text-white hover:bg-indigo-400" : ""
          )}
        >
          {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <p className={cn("mt-4 text-center text-sm", dark ? "text-slate-400" : "text-slate-500")}>
        {mode === "signin" ? (
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

      {googleConfigured ? (
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
        Ao se conectar, você aceita nossos termos de uso e nossa política de privacidade.
      </p>
    </>
  );
}

type LoginScreenProps = {
  googleConfigured: boolean;
  oauthError?: string;
};

export default function LoginScreen({ googleConfigured, oauthError }: LoginScreenProps) {
  const glowRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const [glowLit, setGlowLit] = useState(true);

  const oauthErrorMessage = oauthError
    ? AUTH_ERROR_MESSAGES[oauthError] ?? `${AUTH_ERROR_MESSAGES.Default} (código: ${oauthError})`
    : null;

  /** Posição em % do painel escuro; pode ficar fora de 0–100% (luz “some” para o lado). */
  const syncGlowFromClient = (clientX: number, clientY: number) => {
    const aside = asideRef.current;
    if (!aside) return;
    const rect = aside.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    glowRef.current?.style.setProperty("--mx", `${x}%`);
    glowRef.current?.style.setProperty("--my", `${y}%`);
  };

  const handleShellMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    syncGlowFromClient(e.clientX, e.clientY);
  };

  const handleShellMouseEnter = () => {
    setGlowLit(true);
  };

  const handleShellMouseLeave = () => {
    setGlowLit(false);
  };

  return (
    <main className="min-h-[100dvh] bg-white">
      <div
        className="grid min-h-[100dvh] lg:grid-cols-[1.4fr_1fr]"
        onMouseMove={handleShellMouseMove}
        onMouseEnter={handleShellMouseEnter}
        onMouseLeave={handleShellMouseLeave}
      >
        {/* ── Desktop aside (hidden on mobile) ── */}
        <aside
          ref={asideRef}
          className="relative hidden select-none overflow-hidden bg-[#03050a] lg:block"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#080b14] via-[#03050a] to-[#0a0e18]" />
          <div
            ref={glowRef}
            className={cn(
              "pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out",
              glowLit ? "opacity-100" : "opacity-0"
            )}
            style={
              {
                "--mx": "50%",
                "--my": "50%",
                background: `
                  radial-gradient(circle 100vmin at var(--mx) var(--my), rgba(99, 102, 241, 0.22), transparent 68%),
                  radial-gradient(circle 82vmin at var(--mx) var(--my), rgba(14, 165, 233, 0.14), transparent 64%),
                  radial-gradient(circle 120vmin at var(--mx) var(--my), rgba(255, 255, 255, 0.045), transparent 75%)
                `
              } as React.CSSProperties
            }
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.45] mix-blend-soft-light"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -28deg,
                rgba(255,255,255,0.04) 0px,
                rgba(255,255,255,0.04) 1px,
                transparent 1px,
                transparent 14px
              )`
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                58deg,
                rgba(255,255,255,0.02) 0px,
                rgba(255,255,255,0.02) 1px,
                transparent 1px,
                transparent 22px
              )`
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:52px_52px] opacity-[0.35]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_50%,transparent_0%,rgba(0,0,0,0.45)_100%)]" />

          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 p-10">
            <PlatformLogo variant="white" size={256} className="h-56 w-56 opacity-95" priority />
          </div>
        </aside>

        {/* ── Mobile / tablet: full-screen dark layout ── */}
        <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#03050a] lg:hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#080b14] via-[#03050a] to-[#0a0e18]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-soft-light"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -28deg,
                rgba(255,255,255,0.04) 0px,
                rgba(255,255,255,0.04) 1px,
                transparent 1px,
                transparent 14px
              )`
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.2]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                58deg,
                rgba(255,255,255,0.02) 0px,
                rgba(255,255,255,0.02) 1px,
                transparent 1px,
                transparent 22px
              )`
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:44px_44px] opacity-25" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_50%,transparent_0%,rgba(0,0,0,0.5)_100%)]" />

          <div className="relative z-10 flex min-h-[100dvh] flex-col px-6 sm:px-8">
            <div className="flex flex-col items-center gap-3 pt-[max(2.75rem,env(safe-area-inset-top))] sm:pt-[max(3.25rem,env(safe-area-inset-top))]">
              <PlatformLogo variant="white" size={192} className="h-44 w-44 opacity-95 sm:h-48 sm:w-48" priority />
            </div>

            <div className="mt-auto w-full max-w-sm self-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <LoginForm oauthErrorMessage={oauthErrorMessage} googleConfigured={googleConfigured} dark />
            </div>
          </div>
        </section>

        <section className="hidden items-center justify-center bg-white px-6 py-10 sm:px-10 lg:flex">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)]">
            <LoginForm oauthErrorMessage={oauthErrorMessage} googleConfigured={googleConfigured} />
          </div>
        </section>
      </div>
    </main>
  );
}
