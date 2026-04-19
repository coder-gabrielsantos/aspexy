import { MongoServerError } from "mongodb";
import { NextResponse } from "next/server";

import {
  CREDENTIALS_AUTH_METHOD_EMAIL,
  CREDENTIALS_USERS_COLLECTION,
  isValidSignupEmail,
  normalizeEmail
} from "@/lib/credentials-user";
import { sendSignupVerificationEmail } from "@/lib/email/send-signup-code";
import clientPromise from "@/lib/mongodb";
import { ensureSignupVerificationIndexes } from "@/lib/signup-verification-indexes";
import {
  SIGNUP_CODE_TTL_MS,
  SIGNUP_MAX_SENDS_PER_HOUR,
  SIGNUP_VERIFICATION_COLLECTION,
  currentSignupRateHourBucket,
  generateSignupOtp,
  hashSignupOtp
} from "@/lib/signup-verification";

type Body = { email?: unknown };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const emailRaw = typeof body.email === "string" ? body.email : "";

    if (!isValidSignupEmail(emailRaw)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    const email = normalizeEmail(emailRaw);
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const users = db.collection(CREDENTIALS_USERS_COLLECTION);
    const existing = await users.findOne({ email, auth_method: CREDENTIALS_AUTH_METHOD_EMAIL });
    if (existing) {
      return NextResponse.json({ error: "Este e-mail já possui conta." }, { status: 409 });
    }

    const coll = db.collection(SIGNUP_VERIFICATION_COLLECTION);
    await ensureSignupVerificationIndexes(coll);

    const hourBucket = currentSignupRateHourBucket();
    const prev = await coll.findOne<{ hour_bucket: number; sends_this_hour: number }>({ email });

    let sendsThisHour = 1;
    if (prev && prev.hour_bucket === hourBucket) {
      if (prev.sends_this_hour >= SIGNUP_MAX_SENDS_PER_HOUR) {
        return NextResponse.json(
          { error: "Muitos envios para este e-mail. Aguarde cerca de uma hora ou tente outro endereço." },
          { status: 429 }
        );
      }
      sendsThisHour = prev.sends_this_hour + 1;
    }

    const code = generateSignupOtp();
    const code_hash = hashSignupOtp(email, code);
    const now = new Date();
    const expires_at = new Date(Date.now() + SIGNUP_CODE_TTL_MS);

    try {
      await coll.updateOne(
        { email },
        {
          $set: {
            code_hash,
            expires_at,
            attempts: 0,
            hour_bucket: hourBucket,
            sends_this_hour: sendsThisHour,
            updated_at: now
          },
          $setOnInsert: { email, created_at: now }
        },
        { upsert: true }
      );
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000) {
        return NextResponse.json({ error: "Conflito ao salvar verificação. Tente novamente." }, { status: 409 });
      }
      throw e;
    }

    const sent = await sendSignupVerificationEmail(email, code);
    if (!sent.ok) {
      await coll.deleteOne({ email });
      return NextResponse.json({ error: sent.error }, { status: sent.status });
    }

    return NextResponse.json({ ok: true, delivery: sent.delivery });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao enviar o código." },
      { status: 500 }
    );
  }
}
