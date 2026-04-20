import type { Collection } from "mongodb";

export const PASSWORD_RESET_TOKENS_COLLECTION = "password_reset_tokens";

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function ensurePasswordResetTokensIndexes(coll: Collection) {
  await coll.createIndex({ jti: 1 }, { unique: true });
  await coll.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
  await coll.createIndex({ user_id: 1 });
}
