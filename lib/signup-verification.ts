import { createHmac, randomInt, timingSafeEqual } from "crypto";

import { SIGNUP_OTP_LENGTH } from "@/lib/signup-verification-shared";

export { SIGNUP_OTP_LENGTH, isCompleteOtp } from "@/lib/signup-verification-shared";

export const SIGNUP_VERIFICATION_COLLECTION = "signup_verifications";

/** Validade do código após o envio. */
export const SIGNUP_CODE_TTL_MS = 10 * 60 * 1000;

/** Máximo de envios por e-mail por janela de 1 hora. */
export const SIGNUP_MAX_SENDS_PER_HOUR = 4;

/** Tentativas de validação antes de invalidar o código. */
export const SIGNUP_MAX_VERIFY_ATTEMPTS = 6;

export function generateSignupOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(SIGNUP_OTP_LENGTH, "0");
}

function otpSecret(): string {
  const s = process.env.SIGNUP_CODE_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("Defina NEXTAUTH_SECRET ou SIGNUP_CODE_SECRET.");
  return s;
}

export function hashSignupOtp(emailNormalized: string, code: string): string {
  return createHmac("sha256", otpSecret())
    .update(`${emailNormalized}:${code}`)
    .digest("hex");
}

export function verifySignupOtpConstantTime(
  emailNormalized: string,
  code: string,
  storedHash: string
): boolean {
  const computed = hashSignupOtp(emailNormalized, code);
  if (computed.length !== storedHash.length) return false;
  try {
    return timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(storedHash, "utf8"));
  } catch {
    return false;
  }
}

export function currentSignupRateHourBucket(): number {
  return Math.floor(Date.now() / (60 * 60 * 1000));
}

export type SignupVerificationDoc = {
  email: string;
  code_hash: string;
  expires_at: Date;
  attempts: number;
  hour_bucket: number;
  sends_this_hour: number;
  created_at: Date;
  updated_at: Date;
};
