import { MongoServerError } from "mongodb";
import { NextResponse } from "next/server";

import {
  CREDENTIALS_AUTH_METHOD_EMAIL,
  CREDENTIALS_USERS_COLLECTION,
  isValidSignupEmail,
  normalizeEmail
} from "@/lib/credentials-user";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";
import clientPromise from "@/lib/mongodb";
import { signPasswordResetToken } from "@/lib/password-reset-jwt";
import {
  PASSWORD_RESET_MAX_SENDS_PER_HOUR,
  PASSWORD_RESET_RATE_COLLECTION,
  ensurePasswordResetRateIndexes,
  passwordResetRateHourBucket
} from "@/lib/password-reset-rate";

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

    const user = await users.findOne<{ _id: { toString(): string }; password_hash?: string }>(
      { email, auth_method: CREDENTIALS_AUTH_METHOD_EMAIL },
      { projection: { password_hash: 1 } }
    );

    const rateColl = db.collection(PASSWORD_RESET_RATE_COLLECTION);
    await ensurePasswordResetRateIndexes(rateColl);

    const hourBucket = passwordResetRateHourBucket();
    const prev = await rateColl.findOne<{ hour_bucket: number; sends_this_hour: number }>({ email });

    let sendsThisHour = 1;
    if (prev && prev.hour_bucket === hourBucket) {
      if (prev.sends_this_hour >= PASSWORD_RESET_MAX_SENDS_PER_HOUR) {
        return NextResponse.json(
          { error: "Muitas solicitações para este e-mail. Aguarde cerca de uma hora e tente novamente." },
          { status: 429 }
        );
      }
      sendsThisHour = prev.sends_this_hour + 1;
    }

    const now = new Date();
    try {
      await rateColl.updateOne(
        { email },
        {
          $set: {
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
        return NextResponse.json({ error: "Conflito ao registrar pedido. Tente novamente." }, { status: 409 });
      }
      throw e;
    }

    if (user?.password_hash) {
      const token = await signPasswordResetToken(user._id.toString());
      const path = `/redefinir-senha?token=${encodeURIComponent(token)}`;
      const sent = await sendPasswordResetEmail(email, path);
      if (!sent.ok) {
        await rateColl.updateOne(
          { email },
          {
            $set: {
              hour_bucket: hourBucket,
              sends_this_hour: Math.max(0, sendsThisHour - 1),
              updated_at: now
            }
          }
        );
        return NextResponse.json({ error: sent.error }, { status: sent.status });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Se houver conta neste e-mail, você receberá um link em instantes. Expira em 1 hora."
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao processar o pedido." },
      { status: 500 }
    );
  }
}
