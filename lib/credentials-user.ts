/**
 * Coleção MongoDB para contas em `credentials_users`.
 * `auth_method`: `"email"` (e-mail + senha) ou `"oauth"` (ex.: login Google).
 */
export const CREDENTIALS_USERS_COLLECTION = "credentials_users";

export const CREDENTIALS_AUTH_METHOD_EMAIL = "email" as const;
export const CREDENTIALS_AUTH_METHOD_OAUTH = "oauth" as const;

export type CredentialsAuthMethod =
  | typeof CREDENTIALS_AUTH_METHOD_EMAIL
  | typeof CREDENTIALS_AUTH_METHOD_OAUTH;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidSignupEmail(email: string): boolean {
  const n = normalizeEmail(email);
  return n.length <= 254 && EMAIL_RE.test(n);
}

export const CREDENTIALS_DISPLAY_NAME_MAX = 120;

/** Nome exibido padrão a partir do e-mail já normalizado (trecho antes de @). */
export function defaultDisplayNameFromEmail(normalizedEmail: string): string {
  const at = normalizedEmail.indexOf("@");
  const local = at > 0 ? normalizedEmail.slice(0, at) : normalizedEmail;
  const trimmed = local.trim();
  if (!trimmed) return "Usuário";
  return trimmed.slice(0, CREDENTIALS_DISPLAY_NAME_MAX);
}

export function validateNewPassword(password: string): { ok: true } | { ok: false; error: string } {
  if (password.length < 8) {
    return { ok: false, error: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (password.length > 128) {
    return { ok: false, error: "Senha muito longa." };
  }
  return { ok: true };
}
