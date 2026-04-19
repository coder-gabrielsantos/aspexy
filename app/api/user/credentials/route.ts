import { MongoServerError, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  CREDENTIALS_AUTH_METHOD_EMAIL,
  CREDENTIALS_USERS_COLLECTION,
  isValidSignupEmail,
  normalizeEmail,
  validateNewPassword
} from "@/lib/credentials-user";
import { ensureCredentialsUsersIndexes } from "@/lib/credentials-users-index";
import { verifyEmailChangeToken } from "@/lib/email-change-token";
import clientPromise from "@/lib/mongodb";
import { hashPassword, verifyPassword } from "@/lib/password";

type Body = {
  action?: unknown;
  currentPassword?: unknown;
  newEmail?: unknown;
  newPassword?: unknown;
  emailChangeToken?: unknown;
};

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }

    const action = body.action === "email" || body.action === "password" ? body.action : null;
    if (!action) {
      return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    }

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    if (!currentPassword) {
      return NextResponse.json({ error: "Informe a senha atual." }, { status: 400 });
    }

    let oid: ObjectId;
    try {
      oid = new ObjectId(session.user.id);
    } catch {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const coll = db.collection(CREDENTIALS_USERS_COLLECTION);

    const doc = await coll.findOne<{
      _id: ObjectId;
      email: string;
      auth_method: string;
      password_hash?: string;
    }>({ _id: oid });

    if (!doc) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    if (doc.auth_method !== CREDENTIALS_AUTH_METHOD_EMAIL || !doc.password_hash) {
      return NextResponse.json(
        { error: "E-mail e senha só podem ser alterados em contas com login por e-mail." },
        { status: 403 }
      );
    }

    const match = await verifyPassword(currentPassword, doc.password_hash);
    if (!match) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
    }

    const now = new Date();

    if (action === "password") {
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
      const pwCheck = validateNewPassword(newPassword);
      if (!pwCheck.ok) {
        return NextResponse.json({ error: pwCheck.error }, { status: 400 });
      }
      const password_hash = await hashPassword(newPassword);
      await coll.updateOne({ _id: oid }, { $set: { password_hash, updated_at: now } });
      return NextResponse.json({ ok: true });
    }

    const newEmailRaw = typeof body.newEmail === "string" ? body.newEmail : "";
    if (!isValidSignupEmail(newEmailRaw)) {
      return NextResponse.json({ error: "Novo e-mail inválido." }, { status: 400 });
    }
    const newEmail = normalizeEmail(newEmailRaw);
    const currentEmail = normalizeEmail(doc.email);
    if (newEmail === currentEmail) {
      return NextResponse.json({ error: "O novo e-mail é igual ao atual." }, { status: 400 });
    }

    const emailChangeTokenRaw = typeof body.emailChangeToken === "string" ? body.emailChangeToken.trim() : "";
    if (!emailChangeTokenRaw) {
      return NextResponse.json(
        { error: "Valide o código enviado ao novo e-mail antes de concluir a alteração." },
        { status: 400 }
      );
    }
    const verified = await verifyEmailChangeToken(emailChangeTokenRaw);
    if (!verified || verified.userId !== session.user.id || verified.newEmail !== newEmail) {
      return NextResponse.json(
        { error: "Confirmação de e-mail inválida ou expirada. Solicite e informe o código novamente." },
        { status: 401 }
      );
    }

    const taken = await coll.findOne({
      email: newEmail,
      auth_method: CREDENTIALS_AUTH_METHOD_EMAIL,
      _id: { $ne: oid }
    });
    if (taken) {
      return NextResponse.json({ error: "Este e-mail já está em uso." }, { status: 409 });
    }

    await ensureCredentialsUsersIndexes(coll);

    try {
      await coll.updateOne({ _id: oid }, { $set: { email: newEmail, updated_at: now } });
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000) {
        return NextResponse.json({ error: "Este e-mail já está em uso." }, { status: 409 });
      }
      throw e;
    }

    return NextResponse.json({ ok: true, email: newEmail });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Não foi possível atualizar." },
      { status: 500 }
    );
  }
}
