import { NextResponse } from "next/server";

import { isValidSignupEmail, normalizeEmail } from "@/lib/credentials-user";
import clientPromise from "@/lib/mongodb";
import { ensureSignupVerificationIndexes } from "@/lib/signup-verification-indexes";
import { signSignupRegistrationToken } from "@/lib/signup-registration-jwt";
import {
  SIGNUP_MAX_VERIFY_ATTEMPTS,
  SIGNUP_OTP_LENGTH,
  SIGNUP_VERIFICATION_COLLECTION,
  verifySignupOtpConstantTime
} from "@/lib/signup-verification";

type Body = { email?: unknown; code?: unknown };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const emailRaw = typeof body.email === "string" ? body.email : "";
    const codeRaw = typeof body.code === "string" ? body.code : "";

    if (!isValidSignupEmail(emailRaw)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }
    const digits = codeRaw.replace(/\D/g, "");
    if (digits.length !== SIGNUP_OTP_LENGTH) {
      return NextResponse.json({ error: `Informe o código de ${SIGNUP_OTP_LENGTH} dígitos.` }, { status: 400 });
    }

    const email = normalizeEmail(emailRaw);
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const coll = db.collection(SIGNUP_VERIFICATION_COLLECTION);
    await ensureSignupVerificationIndexes(coll);

    const doc = await coll.findOne<{
      code_hash: string;
      expires_at: Date;
      attempts: number;
    }>({ email });

    if (!doc) {
      return NextResponse.json({ error: "Nenhum código pendente para este e-mail. Solicite um novo." }, { status: 400 });
    }

    if (doc.expires_at.getTime() < Date.now()) {
      await coll.deleteOne({ email });
      return NextResponse.json({ error: "Código expirado. Solicite um novo." }, { status: 400 });
    }

    if (doc.attempts >= SIGNUP_MAX_VERIFY_ATTEMPTS) {
      await coll.deleteOne({ email });
      return NextResponse.json({ error: "Muitas tentativas incorretas. Solicite um novo código." }, { status: 429 });
    }

    const ok = verifySignupOtpConstantTime(email, digits, doc.code_hash);
    if (!ok) {
      await coll.updateOne({ email }, { $inc: { attempts: 1 }, $set: { updated_at: new Date() } });
      const remaining = Math.max(0, SIGNUP_MAX_VERIFY_ATTEMPTS - doc.attempts - 1);
      return NextResponse.json(
        { error: "Código incorreto.", attemptsLeft: remaining },
        { status: 400 }
      );
    }

    await coll.deleteOne({ email });
    const registrationToken = await signSignupRegistrationToken(email);
    return NextResponse.json({ ok: true, registrationToken });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao validar o código." },
      { status: 500 }
    );
  }
}
