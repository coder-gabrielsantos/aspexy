import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { CREDENTIALS_USERS_COLLECTION, normalizeEmail } from "@/lib/credentials-user";
import { EMAIL_CHANGE_VERIFICATION_COLLECTION } from "@/lib/email-change-otp";
import clientPromise from "@/lib/mongodb";
import { SIGNUP_VERIFICATION_COLLECTION } from "@/lib/signup-verification";

const USER_DATA_COLLECTIONS = [
  "generated_schedules",
  "subjects",
  "teachers",
  "classes",
  "schedule_structures",
  "schedule_constraints",
  "school_profiles"
] as const;

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const userId = session.user.id;
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");

    await Promise.all(
      USER_DATA_COLLECTIONS.map((name) => db.collection(name).deleteMany({ user_id: userId }))
    );

    const email =
      typeof session.user.email === "string" && session.user.email
        ? normalizeEmail(session.user.email)
        : "";
    if (email) {
      await db.collection(SIGNUP_VERIFICATION_COLLECTION).deleteMany({ email });
    }

    await db.collection(EMAIL_CHANGE_VERIFICATION_COLLECTION).deleteMany({ user_id: userId });

    const del = await db.collection(CREDENTIALS_USERS_COLLECTION).deleteOne({ _id: new ObjectId(userId) });
    if (del.deletedCount === 0) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Não foi possível excluir a conta." },
      { status: 500 }
    );
  }
}
