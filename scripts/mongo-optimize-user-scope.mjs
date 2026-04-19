/**
 * Manutenção MongoDB (executar uma vez por ambiente, com MONGODB_URI definido):
 * 1) Remove o campo user_email de todos os documentos (identidade = user_id).
 * 2) Cria índice { user_id: 1 } nas coleções usadas pelas APIs (idempotente).
 *
 * Uso a partir da pasta aspexy/:
 *   MONGODB_URI="..." MONGODB_DB="aspexy" node scripts/mongo-optimize-user-scope.mjs
 *
 * Windows (PowerShell):
 *   $env:MONGODB_URI="..."; $env:MONGODB_DB="aspexy"; node scripts/mongo-optimize-user-scope.mjs
 */

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Defina MONGODB_URI.");
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || "aspexy";

/** Coleções que gravavam user_email e/ou filtram por user_id. */
const COLLECTIONS = [
  "schedule_structures",
  "classes",
  "teachers",
  "subjects",
  "generated_schedules",
  "school_profiles",
  "schedule_constraints"
];

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  for (const name of COLLECTIONS) {
    const coll = db.collection(name);
    const unsetRes = await coll.updateMany({}, { $unset: { user_email: "" } });
    console.log(`[${name}] user_email removido em ${unsetRes.modifiedCount} documento(s) (matched: ${unsetRes.matchedCount}).`);

    try {
      const idx = await coll.createIndex({ user_id: 1 }, { name: "user_id_1" });
      console.log(`[${name}] índice: ${idx}`);
    } catch (e) {
      console.warn(`[${name}] índice user_id: ${e instanceof Error ? e.message : e}`);
    }
  }

  const credColl = db.collection("credentials_users");
  try {
    await credColl.dropIndex("email_1_unique");
    console.log("[credentials_users] índice legado email_1_unique removido.");
  } catch {
    /* não existia */
  }
  try {
    const idx = await credColl.createIndex(
      { email: 1, auth_method: 1 },
      { unique: true, name: "email_1_auth_method_1_unique" }
    );
    console.log(`[credentials_users] índice: ${idx}`);
  } catch (e) {
    console.warn(`[credentials_users] índice email+auth_method: ${e instanceof Error ? e.message : e}`);
  }

  await client.close();
  console.log("Concluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
