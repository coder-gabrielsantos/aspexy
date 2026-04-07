"use client";

import { ArrowRight, AlertTriangle } from "lucide-react";
import { signIn } from "next-auth/react";

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
    "Erro no retorno do Google. Confira redirect URI (http://localhost:3000/api/auth/callback/google), NEXTAUTH_URL e se o Client Secret esta correto.",
  Callback:
    "Falha no callback OAuth (troca do codigo por sessao). Verifique NEXTAUTH_SECRET, redirect URI no Google Cloud e tente em aba anonima.",
  OAuthAccountNotLinked: "Esta conta ja esta vinculada a outro metodo de login.",
  AccessDenied: "Acesso negado. Se o app esta em modo teste, adicione seu email em Test users.",
  Configuration: "Configuracao do servidor de autenticacao invalida (NEXTAUTH_SECRET, URLs, etc.).",
  Default: "Nao foi possivel concluir o login. Tente novamente."
};

type LoginScreenProps = {
  googleConfigured: boolean;
  oauthError?: string;
};

export default function LoginScreen({ googleConfigured, oauthError }: LoginScreenProps) {
  const errorMessage = oauthError
    ? OAUTH_ERROR_MESSAGES[oauthError] ?? `${OAUTH_ERROR_MESSAGES.Default} (codigo: ${oauthError})`
    : null;
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_70%_15%,rgba(59,130,246,0.08),transparent_35%),#f8fafc]">
      <div className="grid min-h-screen lg:grid-cols-[420px_1fr]">
        <aside className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.22),transparent_38%),radial-gradient(circle_at_75%_65%,rgba(37,99,235,0.18),transparent_42%),linear-gradient(160deg,#0b1220,#122b6b_55%,#0b1220)] p-10 text-slate-100 lg:block">
          <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="inline-flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/15" />
              <div>
                <p className="text-base font-semibold tracking-wide">Aspexy</p>
                <p className="text-xs text-slate-200/80">School Scheduling Platform</p>
              </div>
            </div>
            <div className="max-w-sm">
              <p className="text-sm text-slate-200/85">
                Acesse com sua conta para configurar a estrutura de horarios da escola.
              </p>
            </div>
          </div>
        </aside>

        <section className="flex items-center justify-center p-6 md:p-10">
          <Card className="w-full max-w-lg border-slate-200/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur">
            <CardHeader className="space-y-3 pb-3">
              <CardTitle className="font-display text-2xl font-semibold tracking-tight text-slate-900">
                Entrar no Aspexy
              </CardTitle>
              <p className="text-sm text-slate-500">
                Use sua conta Google institucional para acessar o painel de horarios.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>{errorMessage}</div>
                  </div>
                </div>
              ) : null}
              {!googleConfigured ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <div>
                      Google OAuth ainda nao configurado. Preencha `GOOGLE_CLIENT_ID` e
                      `GOOGLE_CLIENT_SECRET` no `.env.local`.
                    </div>
                  </div>
                </div>
              ) : null}

              <Button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                disabled={!googleConfigured}
                className="h-10 w-full justify-between rounded-lg border border-slate-200 bg-white px-3 text-slate-800 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded bg-white">
                    <GoogleIcon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">Continuar com Google</span>
                </span>
                <ArrowRight className="h-4 w-4 opacity-60" />
              </Button>

              <p className="text-xs text-slate-500">
                Ao continuar, voce concorda com os termos internos de uso da plataforma Aspexy.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
