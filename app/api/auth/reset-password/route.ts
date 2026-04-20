import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import {
  CREDENTIALS_AUTH_METHOD_EMAIL,
  CREDENTIALS_USERS_COLLECTION,
  validateNewPassword
} from "@/lib/credentials-user";
import { ensureCredentialsUsersIndexes } from "@/lib/credentials-users-index";
import clientPromise from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import { verifyPasswordResetToken } from "@/lib/password-reset-jwt";
import { PASSWORD_RESET_TOKENS_COLLECTION, ensurePasswordResetTokensIndexes } from "@/lib/password-reset-tokens";

type Body = { token?: unknown; password?: unknown };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token) {
      return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
    }

    const claims = await verifyPasswordResetToken(token);
    if (!claims || !ObjectId.isValid(claims.userId)) {
      return NextResponse.json({ error: "Link inválido ou expirado. Solicite um novo e-mail em “Esqueci a senha”." }, { status: 401 });
    }

    const pwCheck = validateNewPassword(password);
    if (!pwCheck.ok) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const tokensColl = db.collection(PASSWORD_RESET_TOKENS_COLLECTION);
    await ensurePasswordResetTokensIndexes(tokensColl);

    const now = new Date();
    const consume = await tokensColl.deleteOne({
      jti: claims.jti,
      user_id: claims.userId,
      expires_at: { $gt: now }
    });

    if (consume.deletedCount === 0) {
      return NextResponse.json(
        { error: "Link inválido, expirado ou já utilizado. Solicite um novo e-mail em “Esqueci a senha”." },
        { status: 401 }
      );
    }

    const coll = db.collection(CREDENTIALS_USERS_COLLECTION);
    await ensureCredentialsUsersIndexes(coll);

    const password_hash = await hashPassword(password);

    const result = await coll.updateOne(
      {
        _id: new ObjectId(claims.userId),
        auth_method: CREDENTIALS_AUTH_METHOD_EMAIL,
        password_hash: { $exists: true, $type: "string", $ne: "" }
      },
      { $set: { password_hash, updated_at: now } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Não foi possível atualizar a senha. Conta não encontrada ou login só por Google." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao redefinir a senha." },
      { status: 500 }
    );
  }
}
