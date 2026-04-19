import { createHmac, randomInt, timingSafeEqual } from "crypto";

import { SIGNUP_OTP_LENGTH } from "@/lib/signup-verification-shared";

export { SIGNUP_OTP_LENGTH } from "@/lib/signup-verification-shared";

export const EMAIL_CHANGE_VERIFICATION_COLLECTION = "email_change_verifications";

function otpSecret(): string {
  const s = process.env.SIGNUP_CODE_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("Defina NEXTAUTH_SECRET ou SIGNUP_CODE_SECRET.");
  return s;
}

export function generateEmailChangeOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(SIGNUP_OTP_LENGTH, "0");
}

export function hashEmailChangeOtp(userId: string, newEmailNormalized: string, code: string): string {
  return createHmac("sha256", otpSecret())
    .update(`email-change:${userId}:${newEmailNormalized}:${code}`)
    .digest("hex");
}

export function verifyEmailChangeOtpConstantTime(
  userId: string,
  newEmailNormalized: string,
  code: string,
  storedHash: string
): boolean {
  const computed = hashEmailChangeOtp(userId, newEmailNormalized, code);
  if (computed.length !== storedHash.length) return false;
  try {
    return timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(storedHash, "utf8"));
  } catch {
    return false;
  }
}
