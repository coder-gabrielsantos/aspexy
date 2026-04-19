import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { CREDENTIALS_DISPLAY_NAME_MAX, CREDENTIALS_USERS_COLLECTION } from "@/lib/credentials-user";
import clientPromise from "@/lib/mongodb";
import { validateProfileDataUrl } from "@/lib/profile-image";

type Body = {
  name?: unknown;
  image?: unknown;
};

function trimName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

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

    const nameRaw = typeof body.name === "string" ? body.name : "";
    const name = trimName(nameRaw).slice(0, CREDENTIALS_DISPLAY_NAME_MAX);
    if (!name) {
      return NextResponse.json({ error: "Digite um nome de exibição." }, { status: 400 });
    }

    let image: string | null | undefined;
    if ("image" in body) {
      if (body.image === null) {
        image = null;
      } else if (typeof body.image === "string") {
        const t = body.image.trim();
        if (!t) {
          image = null;
        } else {
          const check = validateProfileDataUrl(t);
          if (!check.ok) {
            return NextResponse.json({ error: check.error }, { status: 400 });
          }
          image = t;
        }
      } else {
        return NextResponse.json({ error: "Campo de imagem inválido." }, { status: 400 });
      }
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

    const existing = await coll.findOne<{ _id: ObjectId; email?: string }>({ _id: oid });
    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const $set: Record<string, unknown> = {
      name,
      updated_at: new Date()
    };
    if (image !== undefined) {
      $set.image = image;
    }

    await coll.updateOne({ _id: oid }, { $set });

    const doc = await coll.findOne<{ name?: string; image?: string | null }>({ _id: oid });

    return NextResponse.json({
      ok: true,
      name: typeof doc?.name === "string" ? doc.name : name,
      image: typeof doc?.image === "string" ? doc.image : null
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Não foi possível atualizar o perfil." },
      { status: 500 }
    );
  }
}
