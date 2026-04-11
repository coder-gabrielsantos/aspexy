"use client";

import { ArrowRight, AlertTriangle } from "lucide-react";
import { signIn } from "next-auth/react";

import { PlatformLogo } from "@/components/platform-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
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
  const errorMessage = oauthError
    ? OAUTH_ERROR_MESSAGES[oauthError] ?? `${OAUTH_ERROR_MESSAGES.Default} (código: ${oauthError})`
    : null;
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(245,82%,63%,0.12),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,hsl(270,80%,60%,0.06),transparent_50%)]" />

      <div className="relative grid min-h-screen lg:grid-cols-[440px_1fr]">
        <aside className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0b3e] via-[#1e1566] to-[#0d1033]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,hsl(270,80%,50%,0.25),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_70%,hsl(245,82%,63%,0.2),transparent_45%)]" />
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:20px_20px]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10">
            <div className="inline-flex items-center gap-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10 p-1 ring-1 ring-white/20 backdrop-blur-sm">
                <PlatformLogo size={40} className="h-8 w-8" priority />
              </div>
              <div>
                <p className="text-base font-semibold tracking-wide text-white">Aspexy</p>
                <p className="text-[13px] text-white/60">School Scheduling Platform</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="h-px w-12 bg-gradient-to-r from-white/30 to-transparent" />
              <div className="max-w-sm space-y-3">
                <p className="text-xl font-semibold leading-snug text-white/95">
                  Automatize a criação de horários escolares com inteligência.
                </p>
                <p className="text-sm leading-relaxed text-white/50">
                  Acesse com sua conta para configurar a estrutura de horários da escola.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <p className="text-xs text-white/40">Todos os dados protegidos com criptografia</p>
            </div>
          </div>
        </aside>

        <section className="flex items-center justify-center p-6 md:p-10">
          <Card className="w-full max-w-lg animate-fade-in-up border-0 shadow-premium-lg">
            <CardHeader className="space-y-3 pb-3">
              <div className="mb-2 lg:hidden">
                <div className="inline-flex items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-0.5 shadow-sm ring-1 ring-slate-200/80">
                    <PlatformLogo size={36} className="h-8 w-8" priority />
                  </div>
                  <span className="text-lg font-semibold tracking-tight text-slate-900">Aspexy</span>
                </div>
              </div>
              <CardTitle className="font-display text-2xl font-semibold tracking-tight text-slate-900">
                Entrar no Aspexy
              </CardTitle>
              <p className="text-sm text-slate-500">
                Use sua conta Google institucional para acessar o painel de horários.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage ? (
                <div className="animate-fade-in rounded-xl border border-rose-200/80 bg-rose-50/80 p-3.5 text-sm text-rose-800">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="leading-relaxed">{errorMessage}</div>
                  </div>
                </div>
              ) : null}
              {!googleConfigured ? (
                <div className="animate-fade-in rounded-xl border border-amber-200/80 bg-amber-50/80 p-3.5 text-sm text-amber-800">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <div className="leading-relaxed">
                      Google OAuth ainda não configurado. Preencha `GOOGLE_CLIENT_ID` e
                      `GOOGLE_CLIENT_SECRET` no `.env.local`.
                    </div>
                  </div>
                </div>
              ) : null}

              <Button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                disabled={!googleConfigured}
                className="group h-12 w-full justify-between rounded-xl border border-slate-200/80 bg-white px-4 text-slate-800 shadow-sm transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
                    <GoogleIcon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">Continuar com Google</span>
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-slate-600" />
              </Button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
              </div>

              <p className="text-center text-xs leading-relaxed text-slate-400">
                Ao continuar, você concorda com os termos internos de uso da plataforma Aspexy.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
