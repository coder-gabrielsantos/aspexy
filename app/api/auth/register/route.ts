import { MongoServerError } from "mongodb";
import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/password";
import {
  CREDENTIALS_AUTH_METHOD_EMAIL,
  CREDENTIALS_USERS_COLLECTION,
  defaultDisplayNameFromEmail,
  isValidSignupEmail,
  normalizeEmail,
  validateNewPassword
} from "@/lib/credentials-user";
import { ensureCredentialsUsersIndexes } from "@/lib/credentials-users-index";
import clientPromise from "@/lib/mongodb";
import { verifySignupRegistrationToken } from "@/lib/signup-registration-jwt";

type Body = {
  email?: unknown;
  password?: unknown;
  registrationToken?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const emailRaw = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const registrationToken =
      typeof body.registrationToken === "string" ? body.registrationToken.trim() : "";

    if (!isValidSignupEmail(emailRaw)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }
    const pwCheck = validateNewPassword(password);
    if (!pwCheck.ok) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    const email = normalizeEmail(emailRaw);
    const tokenEmail = registrationToken ? await verifySignupRegistrationToken(registrationToken) : null;
    if (!tokenEmail || tokenEmail !== email) {
      return NextResponse.json(
        { error: "Valide o código enviado ao seu e-mail antes de criar a conta." },
        { status: 401 }
      );
    }
    const name = defaultDisplayNameFromEmail(email);
    const password_hash = await hashPassword(password);
    const now = new Date();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const coll = db.collection(CREDENTIALS_USERS_COLLECTION);

    await ensureCredentialsUsersIndexes(coll);

    await coll.insertOne({
      email,
      auth_method: CREDENTIALS_AUTH_METHOD_EMAIL,
      password_hash,
      name,
      created_at: now,
      updated_at: now
    });

    return NextResponse.json({ ok: true, email });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar conta." },
      { status: 500 }
    );
  }
}
