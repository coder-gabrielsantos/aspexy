import type { Collection } from "mongodb";

/** Índice único composto: mesmo e-mail pode existir em `email` e em `oauth`. */
export async function ensureCredentialsUsersIndexes(coll: Collection): Promise<void> {
  try {
    await coll.dropIndex("email_1_unique");
  } catch {
    /* índice legado { email: 1 } único */
  }
  await coll.createIndex(
    { email: 1, auth_method: 1 },
    { unique: true, name: "email_1_auth_method_1_unique" }
  );
}
