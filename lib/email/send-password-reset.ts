import { Resend } from "resend";

import { getAppOrigin } from "@/lib/app-origin";

const APP_NAME = "Aspexy";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(resetUrl: string): string {
  const safeUrl = escapeHtml(resetUrl);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;background:#f8fafc;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:420px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 12px 40px -12px rgba(15,23,42,0.12);">
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0;font-size:14px;font-weight:600;color:#4f46e5;letter-spacing:0.02em;">${APP_NAME}</p>
              <h1 style="margin:12px 0 0;font-size:20px;font-weight:600;letter-spacing:-0.02em;">Redefinir senha</h1>
              <p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:#64748b;">Recebemos um pedido para alterar a senha da sua conta. O link abaixo expira em <strong>1 hora</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <a href="${safeUrl}" style="display:inline-block;border-radius:9999px;background:linear-gradient(to bottom,#4f46e5,#4338ca);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;">Definir nova senha</a>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.55;color:#94a3b8;">Se o botão não funcionar, copie e cole no navegador:<br/><span style="word-break:break-all;color:#64748b;">${safeUrl}</span></p>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;">Se você não pediu isso, ignore este e-mail — sua senha permanece a mesma.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type SendPasswordResetResult =
  | { ok: true; delivery: "email" | "console" }
  | { ok: false; error: string; status: number };

const isNonProduction = () => process.env.NODE_ENV !== "production";

export async function sendPasswordResetEmail(to: string, resetPathWithToken: string): Promise<SendPasswordResetResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `${APP_NAME} <onboarding@resend.dev>`;
  const origin = getAppOrigin();
  const resetUrl = `${origin}${resetPathWithToken.startsWith("/") ? "" : "/"}${resetPathWithToken}`;

  if (!apiKey) {
    if (isNonProduction()) {
      console.info(`[password-reset] link para ${to}: ${resetUrl} (defina RESEND_API_KEY para enviar e-mail de verdade)`);
      return { ok: true, delivery: "console" };
    }
    return {
      ok: false,
      error: "Envio de e-mail não configurado. Defina RESEND_API_KEY no servidor.",
      status: 503
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `${APP_NAME} — redefinir sua senha`,
      html: buildHtml(resetUrl)
    });
    if (error) {
      console.error("[Resend]", error);
      return { ok: false, error: "Não foi possível enviar o e-mail. Tente novamente em instantes.", status: 502 };
    }
    return { ok: true, delivery: "email" };
  } catch (e) {
    console.error("[sendPasswordResetEmail]", e);
    return { ok: false, error: "Falha ao enviar o e-mail.", status: 502 };
  }
}
