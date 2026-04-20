"use client";

import { Suspense } from "react";

import AuthSplitShell from "@/components/auth-split-shell";

import ResetPasswordForm from "./reset-password-form";

function ShellLoading() {
  return (
    <AuthSplitShell
      mobileSlot={<p className="text-center text-sm text-slate-400">Carregando…</p>}
      desktopSlot={<p className="text-center text-sm text-slate-500">Carregando…</p>}
    />
  );
}

export default function RedefinirSenhaClient() {
  return (
    <Suspense fallback={<ShellLoading />}>
      <AuthSplitShell
        mobileSlot={<ResetPasswordForm dark />}
        desktopSlot={<ResetPasswordForm />}
      />
    </Suspense>
  );
}
