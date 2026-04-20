import type { Collection } from "mongodb";

export const PASSWORD_RESET_RATE_COLLECTION = "password_reset_rate";
/** Máximo de e-mails de “esqueci a senha” por endereço por janela de 1 hora. */
export const PASSWORD_RESET_MAX_SENDS_PER_HOUR = 4;

export function passwordResetRateHourBucket(): number {
  return Math.floor(Date.now() / 3_600_000);
}

export async function ensurePasswordResetRateIndexes(coll: Collection) {
  await coll.createIndex({ email: 1 }, { unique: true });
}
