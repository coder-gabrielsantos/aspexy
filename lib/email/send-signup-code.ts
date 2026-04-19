import { Resend } from "resend";

const APP_NAME = "Aspexy";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(code: string): string {
  const safe = escapeHtml(code);
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
              <h1 style="margin:12px 0 0;font-size:20px;font-weight:600;letter-spacing:-0.02em;">Confirme seu e-mail</h1>
              <p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:#64748b;">Use o código abaixo para continuar o cadastro. Ele expira em 10 minutos.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <div style="border-radius:12px;background:linear-gradient(135deg,#eef2ff,#f0f9ff);border:1px solid #c7d2fe;padding:20px;text-align:center;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6366f1;">Código</p>
                <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.35em;font-variant-numeric:tabular-nums;color:#0f172a;">${safe}</p>
              </div>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;">Se você não solicitou este código, ignore este e-mail.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailChangeHtml(code: string): string {
  const safe = escapeHtml(code);
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
              <h1 style="margin:12px 0 0;font-size:20px;font-weight:600;letter-spacing:-0.02em;">Confirme a alteração de e-mail</h1>
              <p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:#64748b;">Use o código abaixo para concluir a troca do e-mail da sua conta. Ele expira em 10 minutos.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <div style="border-radius:12px;background:linear-gradient(135deg,#eef2ff,#f0f9ff);border:1px solid #c7d2fe;padding:20px;text-align:center;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6366f1;">Código</p>
                <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.35em;font-variant-numeric:tabular-nums;color:#0f172a;">${safe}</p>
              </div>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;">Se você não solicitou esta alteração, ignore este e-mail.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type SendSignupCodeResult =
  | { ok: true; delivery: "email" | "console" }
  | { ok: false; error: string; status: number };

const isNonProduction = () => process.env.NODE_ENV !== "production";

/**
 * Envia o código por e-mail (Resend). Sem `RESEND_API_KEY`, fora de produção apenas registra no console do servidor.
 */
export async function sendSignupVerificationEmail(to: string, code: string): Promise<SendSignupCodeResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `${APP_NAME} <onboarding@resend.dev>`;

  if (!apiKey) {
    if (isNonProduction()) {
      console.info(`[signup] código para ${to}: ${code} (defina RESEND_API_KEY para enviar e-mail de verdade)`);
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
      subject: `${APP_NAME} — seu código de verificação`,
      html: buildHtml(code)
    });
    if (error) {
      console.error("[Resend]", error);
      return { ok: false, error: "Não foi possível enviar o e-mail. Tente novamente em instantes.", status: 502 };
    }
    return { ok: true, delivery: "email" };
  } catch (e) {
    console.error("[sendSignupVerificationEmail]", e);
    return { ok: false, error: "Falha ao enviar o e-mail.", status: 502 };
  }
}

/** Mesmo transporte do cadastro (Resend / console em dev), texto específico para troca de e-mail. */
export async function sendEmailChangeVerificationEmail(to: string, code: string): Promise<SendSignupCodeResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `${APP_NAME} <onboarding@resend.dev>`;

  if (!apiKey) {
    if (isNonProduction()) {
      console.info(`[email-change] código para ${to}: ${code} (defina RESEND_API_KEY para enviar e-mail de verdade)`);
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
      subject: `${APP_NAME} — código para alterar seu e-mail`,
      html: buildEmailChangeHtml(code)
    });
    if (error) {
      console.error("[Resend]", error);
      return { ok: false, error: "Não foi possível enviar o e-mail. Tente novamente em instantes.", status: 502 };
    }
    return { ok: true, delivery: "email" };
  } catch (e) {
    console.error("[sendEmailChangeVerificationEmail]", e);
    return { ok: false, error: "Falha ao enviar o e-mail.", status: 502 };
  }
}
