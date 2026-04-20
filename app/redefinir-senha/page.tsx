import { Suspense } from "react";

import ResetPasswordForm from "./reset-password-form";

export const metadata = {
  title: "Redefinir senha — Aspexy"
};

function ResetFallback() {
  return (
    <div className="mx-auto flex min-h-[50dvh] max-w-md items-center justify-center px-6">
      <p className="text-sm text-slate-500">Carregando…</p>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <main className="min-h-[100dvh] bg-slate-50">
      <Suspense fallback={<ResetFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
