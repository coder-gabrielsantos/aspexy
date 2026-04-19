export const SIGNUP_OTP_LENGTH = 6;

export function isCompleteOtp(value: string): boolean {
  return new RegExp(`^\\d{${SIGNUP_OTP_LENGTH}}$`).test(value.trim());
}
