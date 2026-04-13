"use client";

import { useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { signIn } from "next-auth/react";

import { PlatformLogo } from "@/components/platform-logo";
import { Button } from "@/components/ui/button";

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

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
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

type LoginScreenProps = {
  googleConfigured: boolean;
  oauthError?: string;
};

export default function LoginScreen({ googleConfigured, oauthError }: LoginScreenProps) {
  const glowRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  const errorMessage = oauthError
    ? OAUTH_ERROR_MESSAGES[oauthError] ?? `${OAUTH_ERROR_MESSAGES.Default} (código: ${oauthError})`
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

  const handleShellMouseLeave = () => {
    glowRef.current?.style.setProperty("--mx", "50%");
    glowRef.current?.style.setProperty("--my", "50%");
  };

  return (
    <main className="min-h-screen bg-white">
      <div
        className="grid min-h-screen lg:grid-cols-[1.4fr_1fr]"
        onMouseMove={handleShellMouseMove}
        onMouseLeave={handleShellMouseLeave}
      >
        <aside
          ref={asideRef}
          className="relative hidden select-none overflow-hidden bg-[#03050a] lg:block"
        >
          {/* Base e profundidade */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#080b14] via-[#03050a] to-[#0a0e18]" />
          {/* Luz ambiente que segue o cursor (--mx / --my) */}
          <div
            ref={glowRef}
            className="pointer-events-none absolute inset-0"
            style={
              {
                "--mx": "50%",
                "--my": "50%",
                background: `
                  radial-gradient(circle 120vmin at var(--mx) var(--my), rgba(99, 102, 241, 0.26), transparent 72%),
                  radial-gradient(circle 95vmin at var(--mx) var(--my), rgba(14, 165, 233, 0.15), transparent 68%),
                  radial-gradient(circle 145vmin at var(--mx) var(--my), rgba(255, 255, 255, 0.05), transparent 78%)
                `
              } as React.CSSProperties
            }
          />
          {/* Textura: linhas diagonais finas */}
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
          {/* Grade técnica discreta */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:52px_52px] opacity-[0.35]" />
          {/* Vignette suave nas bordas */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_50%,transparent_0%,rgba(0,0,0,0.45)_100%)]" />

          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 p-10">
            <PlatformLogo size={64} className="h-14 w-14 opacity-90" priority />
            <p className="font-logo text-5xl font-normal leading-tight tracking-normal text-white md:text-6xl">
              Aspexy
            </p>
          </div>
        </aside>

        <section className="flex items-center justify-center bg-slate-50/80 px-6 py-10 sm:px-10">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)]">
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Bem-vindo</h1>
              <p className="text-sm text-slate-500">Faça login para continuar</p>
            </div>

            <div className="mt-8 space-y-3">
              {errorMessage ? (
                <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 p-3 text-left text-sm text-rose-800">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="leading-relaxed">{errorMessage}</div>
                  </div>
                </div>
              ) : null}

              {!googleConfigured ? (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-left text-sm text-amber-800">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="leading-relaxed">
                      Google OAuth ainda não configurado. Preencha `GOOGLE_CLIENT_ID` e
                      `GOOGLE_CLIENT_SECRET` no `.env.local`.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => signIn("google", { callbackUrl: "/" })}
                disabled={!googleConfigured}
                className="h-12 w-full rounded-full border-slate-700/90 bg-white text-sm font-semibold text-slate-800 shadow-none hover:bg-slate-50 hover:text-slate-800 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <span className="inline-flex min-w-0 items-center justify-center gap-3">
                  <GoogleGIcon className="h-5 w-5 shrink-0" />
                  Entrar com Google
                </span>
              </Button>
            </div>

            <p className="mt-8 text-center text-xs leading-relaxed text-slate-400">
              Ao se conectar, você aceita nossos termos de uso e nossa política de privacidade.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
