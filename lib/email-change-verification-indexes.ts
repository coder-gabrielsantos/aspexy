import type { Collection } from "mongodb";

export async function ensureEmailChangeVerificationIndexes(coll: Collection): Promise<void> {
  await coll.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0, name: "email_change_expires_ttl" });
  await coll.createIndex({ user_id: 1 }, { unique: true, name: "email_change_user_id_unique" });
}
