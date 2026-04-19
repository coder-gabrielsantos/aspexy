"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { PasswordToggleField } from "@/components/password-toggle-field";
import { SignupOtpField } from "@/components/signup-otp-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeEmail } from "@/lib/credentials-user";
import { isCompleteOtp } from "@/lib/signup-verification-shared";

const sectionTitle = "mb-3 text-sm font-semibold text-slate-900";

export default function EmailPasswordSettingsForm() {
  const { data: session, status, update } = useSession();
  const loginProvider = session?.user?.loginProvider;
  /** Contas Google não alteram e-mail/senha aqui; demais (e-mail + senha) podem. */
  const isEmailAccount = loginProvider !== "google";

  const [emailNew, setEmailNew] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailChangeToken, setEmailChangeToken] = useState<string | null>(null);
  const [otpFocusTick, setOtpFocusTick] = useState(0);
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailCurrentPw, setEmailCurrentPw] = useState("");
  const [showEmailCurrentPw, setShowEmailCurrentPw] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const prevEmailNew = useRef(emailNew);

  useEffect(() => {
    if (prevEmailNew.current === emailNew) return;
    prevEmailNew.current = emailNew;
    setEmailCodeSent(false);
    setEmailOtp("");
    setEmailChangeToken(null);
    setEmailErr(null);
    setEmailMsg(null);
  }, [emailNew]);

  const onSendEmailCode = useCallback(async () => {
    setEmailErr(null);
    setEmailMsg(null);
    const trimmed = emailNew.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      setEmailErr("Digite o novo e-mail.");
      return;
    }

    setEmailSending(true);
    try {
      const r = await fetch("/api/user/email-change/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: trimmed })
      });
      const data = (await r.json().catch(() => null)) as { error?: string };
      if (!r.ok) {
        setEmailErr(typeof data?.error === "string" ? data.error : "Não foi possível enviar o código.");
        return;
      }
      setEmailCodeSent(true);
      setEmailOtp("");
      setEmailChangeToken(null);
      setEmailMsg("Código enviado. Confira sua caixa de entrada.");
      setOtpFocusTick((n) => n + 1);
    } catch {
      setEmailErr("Não foi possível enviar o código.");
    } finally {
      setEmailSending(false);
    }
  }, [emailNew]);

  const onVerifyEmailCode = useCallback(async () => {
    setEmailErr(null);
    setEmailMsg(null);
    const trimmed = emailNew.replace(/\s+/g, " ").trim();
    if (!isCompleteOtp(emailOtp)) {
      setEmailErr("Informe o código completo.");
      return;
    }

    setEmailVerifying(true);
    try {
      const r = await fetch("/api/user/email-change/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: trimmed, code: emailOtp })
      });
      const data = (await r.json().catch(() => null)) as { error?: string; emailChangeToken?: string };
      if (!r.ok) {
        setEmailErr(typeof data?.error === "string" ? data.error : "Código inválido.");
        return;
      }
      const token = typeof data?.emailChangeToken === "string" ? data.emailChangeToken : "";
      if (!token) {
        setEmailErr("Resposta inválida do servidor.");
        return;
      }
      setEmailChangeToken(token);
      setEmailMsg("Código confirmado. Digite a senha atual para concluir.");
    } catch {
      setEmailErr("Não foi possível validar o código.");
    } finally {
      setEmailVerifying(false);
    }
  }, [emailNew, emailOtp]);

  const onSaveEmail = useCallback(async () => {
    setEmailErr(null);
    setEmailMsg(null);
    const trimmed = emailNew.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      setEmailErr("Digite o novo e-mail.");
      return;
    }
    if (!emailChangeToken) {
      setEmailErr("Envie e confirme o código no novo e-mail antes de concluir.");
      return;
    }
    if (!emailCurrentPw) {
      setEmailErr("Digite a senha atual para concluir.");
      return;
    }

    setEmailSaving(true);
    try {
      const r = await fetch("/api/user/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "email",
          currentPassword: emailCurrentPw,
          newEmail: trimmed,
          emailChangeToken
        })
      });
      const data = (await r.json().catch(() => null)) as { error?: string; email?: string };
      if (!r.ok) {
        setEmailErr(typeof data?.error === "string" ? data.error : "Não foi possível atualizar o e-mail.");
        return;
      }
      const next = typeof data?.email === "string" ? data.email : normalizeEmail(trimmed);
      await update({ email: next });
      setEmailNew("");
      setEmailCurrentPw("");
      setEmailOtp("");
      setEmailCodeSent(false);
      setEmailChangeToken(null);
      setEmailMsg("E-mail atualizado.");
    } catch {
      setEmailErr("Não foi possível atualizar o e-mail.");
    } finally {
      setEmailSaving(false);
    }
  }, [emailChangeToken, emailCurrentPw, emailNew, update]);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const onSavePassword = useCallback(async () => {
    setPwErr(null);
    setPwMsg(null);
    if (!pwCurrent) {
      setPwErr("Digite a senha atual.");
      return;
    }
    if (pwNew.length < 8) {
      setPwErr("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwErr("A confirmação não coincide com a nova senha.");
      return;
    }

    setPwSaving(true);
    try {
      const r = await fetch("/api/user/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "password",
          currentPassword: pwCurrent,
          newPassword: pwNew
        })
      });
      const data = (await r.json().catch(() => null)) as { error?: string };
      if (!r.ok) {
        setPwErr(typeof data?.error === "string" ? data.error : "Não foi possível alterar a senha.");
        return;
      }
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setPwMsg("Senha alterada. Use a nova senha no próximo login.");
    } catch {
      setPwErr("Não foi possível alterar a senha.");
    } finally {
      setPwSaving(false);
    }
  }, [pwConfirm, pwCurrent, pwNew]);

  if (status === "loading") {
    return (
      <div className="p-8">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 h-24 max-w-md animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Autenticação</h1>
      <p className="mt-1 text-sm text-slate-500">Gerencie o e-mail de login e a senha da sua conta.</p>

      <hr className="my-8 border-slate-200" />

      {!isEmailAccount && (
        <div
          className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700"
          role="status"
        >
          Você entrou com a <strong className="font-semibold text-slate-900">Google</strong>. O e-mail e a autenticação
          vêm da sua conta Google e não podem ser alterados aqui.
        </div>
      )}

      {isEmailAccount && (
        <div className="space-y-10">
          <section>
            <h2 className={sectionTitle}>E-mail de login</h2>
            <p className="mb-3 text-sm text-slate-600">
              E-mail atual:{" "}
              <span className="font-medium text-slate-900">{session?.user?.email ?? "—"}</span>
            </p>
            <p className="mb-4 text-sm text-slate-500">
              Enviamos um código ao novo e-mail; confirme-o e use sua senha atual para concluir.
            </p>
            <div className="max-w-md space-y-4">
              <div>
                <label htmlFor="new-email" className="mb-1.5 block text-xs font-medium text-slate-700">
                  Novo e-mail
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="new-email"
                    type="email"
                    autoComplete="email"
                    value={emailNew}
                    onChange={(e) => setEmailNew(e.target.value)}
                    className="sm:min-w-0 sm:flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={emailSending || !emailNew.trim()}
                    onClick={() => void onSendEmailCode()}
                    className="shrink-0"
                  >
                    {emailSending ? "Enviando…" : "Enviar código"}
                  </Button>
                </div>
              </div>

              {emailCodeSent && !emailChangeToken && (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-sm text-slate-700">Digite o código que você recebeu no novo e-mail.</p>
                  <SignupOtpField value={emailOtp} onChange={setEmailOtp} focusTrigger={otpFocusTick} />
                  <Button
                    type="button"
                    disabled={emailVerifying || !isCompleteOtp(emailOtp)}
                    onClick={() => void onVerifyEmailCode()}
                  >
                    {emailVerifying ? "Verificando…" : "Confirmar código"}
                  </Button>
                </div>
              )}

              {emailChangeToken && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="email-current-pw" className="mb-1.5 block text-xs font-medium text-slate-700">
                      Senha atual
                    </label>
                    <PasswordToggleField
                      id="email-current-pw"
                      value={emailCurrentPw}
                      onChange={setEmailCurrentPw}
                      visible={showEmailCurrentPw}
                      onToggleVisible={() => setShowEmailCurrentPw((v) => !v)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required={false}
                    />
                  </div>
                  <Button type="button" disabled={emailSaving} onClick={() => void onSaveEmail()}>
                    {emailSaving ? "Salvando…" : "Atualizar e-mail"}
                  </Button>
                </div>
              )}

              {emailErr && (
                <p className="text-sm text-red-600" role="alert">
                  {emailErr}
                </p>
              )}
              {emailMsg && <p className="text-sm text-emerald-700">{emailMsg}</p>}
            </div>
          </section>

          <hr className="border-slate-100" />

          <section>
            <h2 className={sectionTitle}>Senha</h2>
            <div className="max-w-md space-y-3">
              <div>
                <label htmlFor="pw-current" className="mb-1.5 block text-xs font-medium text-slate-700">
                  Senha atual
                </label>
                <PasswordToggleField
                  id="pw-current"
                  value={pwCurrent}
                  onChange={setPwCurrent}
                  visible={showPwCurrent}
                  onToggleVisible={() => setShowPwCurrent((v) => !v)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required={false}
                />
              </div>
              <div>
                <label htmlFor="pw-new" className="mb-1.5 block text-xs font-medium text-slate-700">
                  Nova senha
                </label>
                <PasswordToggleField
                  id="pw-new"
                  value={pwNew}
                  onChange={setPwNew}
                  visible={showPwNew}
                  onToggleVisible={() => setShowPwNew((v) => !v)}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required={false}
                />
              </div>
              <div>
                <label htmlFor="pw-confirm" className="mb-1.5 block text-xs font-medium text-slate-700">
                  Confirmar nova senha
                </label>
                <PasswordToggleField
                  id="pw-confirm"
                  value={pwConfirm}
                  onChange={setPwConfirm}
                  visible={showPwConfirm}
                  onToggleVisible={() => setShowPwConfirm((v) => !v)}
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  minLength={8}
                  required={false}
                />
              </div>
              {pwErr && (
                <p className="text-sm text-red-600" role="alert">
                  {pwErr}
                </p>
              )}
              {pwMsg && <p className="text-sm text-emerald-700">{pwMsg}</p>}
              <Button type="button" disabled={pwSaving} onClick={() => void onSavePassword()}>
                {pwSaving ? "Salvando…" : "Alterar senha"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
