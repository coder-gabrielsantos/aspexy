import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  CREDENTIALS_AUTH_METHOD_EMAIL,
  CREDENTIALS_USERS_COLLECTION,
  isValidSignupEmail,
  normalizeEmail
} from "@/lib/credentials-user";
import { sendEmailChangeVerificationEmail } from "@/lib/email/send-signup-code";
import {
  EMAIL_CHANGE_VERIFICATION_COLLECTION,
  generateEmailChangeOtp,
  hashEmailChangeOtp
} from "@/lib/email-change-otp";
import { ensureEmailChangeVerificationIndexes } from "@/lib/email-change-verification-indexes";
import clientPromise from "@/lib/mongodb";
import {
  SIGNUP_CODE_TTL_MS,
  SIGNUP_MAX_SENDS_PER_HOUR,
  currentSignupRateHourBucket
} from "@/lib/signup-verification";

type Body = { newEmail?: unknown };

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
    const userOid = new ObjectId(userId);

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }

    const newEmailRaw = typeof body.newEmail === "string" ? body.newEmail : "";
    if (!isValidSignupEmail(newEmailRaw)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }
    const newEmail = normalizeEmail(newEmailRaw);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const users = db.collection(CREDENTIALS_USERS_COLLECTION);
    const me = await users.findOne<{ email: string; auth_method: string; password_hash?: string }>({
      _id: userOid
    });

    if (!me || me.auth_method !== CREDENTIALS_AUTH_METHOD_EMAIL || !me.password_hash) {
      return NextResponse.json(
        { error: "Só é possível alterar o e-mail em contas com login por e-mail." },
        { status: 403 }
      );
    }

    const currentEmail = normalizeEmail(me.email);
    if (newEmail === currentEmail) {
      return NextResponse.json({ error: "O novo e-mail é igual ao atual." }, { status: 400 });
    }

    const taken = await users.findOne({
      email: newEmail,
      auth_method: CREDENTIALS_AUTH_METHOD_EMAIL
    });
    if (taken) {
      return NextResponse.json({ error: "Este e-mail já está em uso." }, { status: 409 });
    }

    const coll = db.collection(EMAIL_CHANGE_VERIFICATION_COLLECTION);
    await ensureEmailChangeVerificationIndexes(coll);

    const hourBucket = currentSignupRateHourBucket();
    const prev = await coll.findOne<{ hour_bucket: number; sends_this_hour: number }>({ user_id: userId });

    let sendsThisHour = 1;
    if (prev && prev.hour_bucket === hourBucket) {
      if (prev.sends_this_hour >= SIGNUP_MAX_SENDS_PER_HOUR) {
        return NextResponse.json(
          { error: "Muitos envios. Aguarde cerca de uma hora ou tente novamente." },
          { status: 429 }
        );
      }
      sendsThisHour = prev.sends_this_hour + 1;
    }

    const code = generateEmailChangeOtp();
    const code_hash = hashEmailChangeOtp(userId, newEmail, code);
    const now = new Date();
    const expires_at = new Date(Date.now() + SIGNUP_CODE_TTL_MS);

    await coll.replaceOne(
      { user_id: userId },
      {
        user_id: userId,
        new_email: newEmail,
        code_hash,
        expires_at,
        attempts: 0,
        hour_bucket: hourBucket,
        sends_this_hour: sendsThisHour,
        created_at: now,
        updated_at: now
      },
      { upsert: true }
    );

    const sent = await sendEmailChangeVerificationEmail(newEmail, code);
    if (!sent.ok) {
      await coll.deleteOne({ user_id: userId });
      return NextResponse.json({ error: sent.error }, { status: sent.status });
    }

    return NextResponse.json({ ok: true, delivery: sent.delivery });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao enviar o código." },
      { status: 500 }
    );
  }
}
