import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    schoolProfile?: unknown;
  };

  if (!body.schoolProfile || typeof body.schoolProfile !== "object") {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB ?? "aspexy");

  const result = await db.collection("school_profiles").insertOne({
    user_id: session.user.id,
    user_email: session.user.email,
    school_profile: body.schoolProfile,
    created_at: new Date(),
    updated_at: new Date()
  });

  return NextResponse.json({ ok: true, id: result.insertedId.toString() });
}
