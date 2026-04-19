import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { CREDENTIALS_AUTH_METHOD_EMAIL, CREDENTIALS_USERS_COLLECTION, isValidSignupEmail, normalizeEmail } from "@/lib/credentials-user";
import {
  EMAIL_CHANGE_VERIFICATION_COLLECTION,
  SIGNUP_OTP_LENGTH,
  verifyEmailChangeOtpConstantTime
} from "@/lib/email-change-otp";
import { ensureEmailChangeVerificationIndexes } from "@/lib/email-change-verification-indexes";
import { signEmailChangeToken } from "@/lib/email-change-token";
import clientPromise from "@/lib/mongodb";
import { SIGNUP_MAX_VERIFY_ATTEMPTS } from "@/lib/signup-verification";

type Body = { newEmail?: unknown; code?: unknown };

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const userId = session.user.id;
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 400 });
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }

    const newEmailRaw = typeof body.newEmail === "string" ? body.newEmail : "";
    const codeRaw = typeof body.code === "string" ? body.code : "";

    if (!isValidSignupEmail(newEmailRaw)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }
    const newEmail = normalizeEmail(newEmailRaw);
    const digits = codeRaw.replace(/\D/g, "");
    if (digits.length !== SIGNUP_OTP_LENGTH) {
      return NextResponse.json({ error: `Informe o código de ${SIGNUP_OTP_LENGTH} dígitos.` }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const coll = db.collection(EMAIL_CHANGE_VERIFICATION_COLLECTION);
    await ensureEmailChangeVerificationIndexes(coll);

    const doc = await coll.findOne<{
      new_email: string;
      code_hash: string;
      expires_at: Date;
      attempts: number;
    }>({ user_id: userId });

    if (!doc) {
      return NextResponse.json({ error: "Nenhum código pendente. Envie um novo código." }, { status: 400 });
    }

    if (normalizeEmail(doc.new_email) !== newEmail) {
      return NextResponse.json({ error: "O e-mail não confere com o do código enviado." }, { status: 400 });
    }

    if (doc.expires_at.getTime() < Date.now()) {
      await coll.deleteOne({ user_id: userId });
      return NextResponse.json({ error: "Código expirado. Solicite um novo." }, { status: 400 });
    }

    if (doc.attempts >= SIGNUP_MAX_VERIFY_ATTEMPTS) {
      await coll.deleteOne({ user_id: userId });
      return NextResponse.json({ error: "Muitas tentativas incorretas. Solicite um novo código." }, { status: 429 });
    }

    const ok = verifyEmailChangeOtpConstantTime(userId, newEmail, digits, doc.code_hash);
    if (!ok) {
      await coll.updateOne({ user_id: userId }, { $inc: { attempts: 1 }, $set: { updated_at: new Date() } });
      const remaining = Math.max(0, SIGNUP_MAX_VERIFY_ATTEMPTS - doc.attempts - 1);
      return NextResponse.json({ error: "Código incorreto.", attemptsLeft: remaining }, { status: 400 });
    }

    const users = db.collection(CREDENTIALS_USERS_COLLECTION);
    const me = await users.findOne<{ auth_method: string }>({ _id: new ObjectId(userId) });
    if (!me || me.auth_method !== CREDENTIALS_AUTH_METHOD_EMAIL) {
      await coll.deleteOne({ user_id: userId });
      return NextResponse.json({ error: "Conta inválida." }, { status: 403 });
    }

    await coll.deleteOne({ user_id: userId });
    const emailChangeToken = await signEmailChangeToken(userId, newEmail);
    return NextResponse.json({ ok: true, emailChangeToken });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao validar o código." },
      { status: 500 }
    );
  }
}
