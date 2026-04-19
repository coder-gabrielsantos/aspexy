import type { Collection } from "mongodb";

/** TTL remove linhas após `expires_at`; índice único por e-mail em verificação pendente. */
export async function ensureSignupVerificationIndexes(coll: Collection): Promise<void> {
  await coll.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0, name: "signup_ver_expires_ttl" });
  await coll.createIndex({ email: 1 }, { unique: true, name: "signup_ver_email_unique" });
}
