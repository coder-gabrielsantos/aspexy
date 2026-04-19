import { MongoServerError, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

type SaveStructureBody = {
  structureId?: string;
  name?: string;
  schoolProfile?: unknown;
};

function parseObjectId(value?: string) {
  if (!value) return null;
  if (!ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? undefined;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const collection = db.collection("schedule_structures");

    if (id) {
      const objectId = parseObjectId(id);
      if (!objectId) {
        return NextResponse.json({ error: "ID inválido." }, { status: 400 });
      }

      const doc = await collection.findOne({
        _id: objectId,
        user_id: session.user.id
      });

      if (!doc) {
        return NextResponse.json({ error: "Estrutura não encontrada." }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        structure: {
          id: doc._id.toString(),
          name: doc.name,
          school_profile: doc.school_profile,
          created_at: doc.created_at,
          updated_at: doc.updated_at
        }
      });
    }

    const docs = await collection
      .find({ user_id: session.user.id })
      .sort({ updated_at: -1 })
      .project({ name: 1, created_at: 1, updated_at: 1 })
      .toArray();

    return NextResponse.json({
      ok: true,
      structures: docs.map((doc) => ({
        id: doc._id.toString(),
        name: doc.name,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      }))
    });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao listar estruturas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as SaveStructureBody;
    if (!body.schoolProfile || typeof body.schoolProfile !== "object") {
      return NextResponse.json({ error: "Campo schoolProfile é obrigatório." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const collection = db.collection("schedule_structures");
    const now = new Date();

    const normalizedName =
      body.name?.trim() || `Estrutura ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR")}`;

    if (body.structureId) {
      const objectId = parseObjectId(body.structureId);
      if (!objectId) {
        return NextResponse.json({ error: "ID inválido para atualização." }, { status: 400 });
      }

      const updateResult = await collection.findOneAndUpdate(
        { _id: objectId, user_id: session.user.id },
        {
          $set: {
            name: normalizedName,
            school_profile: body.schoolProfile,
            updated_at: now
          }
        },
        { returnDocument: "after", includeResultMetadata: false }
      );

      if (!updateResult) {
        return NextResponse.json({ error: "Estrutura não encontrada." }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        structure: {
          id: updateResult._id.toString(),
          name: updateResult.name,
          school_profile: updateResult.school_profile,
          created_at: updateResult.created_at,
          updated_at: updateResult.updated_at
        }
      });
    }

    const result = await collection.insertOne({
      user_id: session.user.id,
      name: normalizedName,
      school_profile: body.schoolProfile,
      created_at: now,
      updated_at: now
    });

    return NextResponse.json({
      ok: true,
      structure: {
        id: result.insertedId.toString(),
        name: normalizedName,
        school_profile: body.schoolProfile,
        created_at: now,
        updated_at: now
      }
    });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar estrutura." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? undefined;
    const objectId = parseObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const result = await db.collection("schedule_structures").deleteOne({
      _id: objectId,
      user_id: session.user.id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Estrutura não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao excluir estrutura." },
      { status: 500 }
    );
  }
}
