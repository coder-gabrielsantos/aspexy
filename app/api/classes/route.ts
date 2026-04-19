import { MongoServerError, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

type SaveClassBody = {
  classId?: string;
  name?: string;
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
    const collection = db.collection("classes");

    if (id) {
      const objectId = parseObjectId(id);
      if (!objectId) {
        return NextResponse.json({ error: "ID inválido." }, { status: 400 });
      }

      const doc = await collection.findOne({ _id: objectId, user_id: session.user.id });
      if (!doc) {
        return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        schoolClass: {
          id: doc._id.toString(),
          name: doc.name,
          created_at: doc.created_at,
          updated_at: doc.updated_at
        }
      });
    }

    const docs = await collection
      .find({ user_id: session.user.id })
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({
      ok: true,
      classes: docs.map((doc) => ({
        id: doc._id.toString(),
        name: doc.name,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      }))
    });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao listar turmas." },
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

    const body = (await request.json()) as SaveClassBody;
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const collection = db.collection("classes");
    const now = new Date();

    if (body.classId) {
      const objectId = parseObjectId(body.classId);
      if (!objectId) {
        return NextResponse.json({ error: "ID inválido para atualização." }, { status: 400 });
      }

      const updateResult = await collection.findOneAndUpdate(
        { _id: objectId, user_id: session.user.id },
        { $set: { name, updated_at: now } },
        { returnDocument: "after", includeResultMetadata: false }
      );

      if (!updateResult) {
        return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        schoolClass: {
          id: updateResult._id.toString(),
          name: updateResult.name,
          created_at: updateResult.created_at,
          updated_at: updateResult.updated_at
        }
      });
    }

    const result = await collection.insertOne({
      user_id: session.user.id,
      name,
      created_at: now,
      updated_at: now
    });

    return NextResponse.json({
      ok: true,
      schoolClass: {
        id: result.insertedId.toString(),
        name,
        created_at: now,
        updated_at: now
      }
    });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar turma." },
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
    const result = await db.collection("classes").deleteOne({
      _id: objectId,
      user_id: session.user.id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao excluir turma." },
      { status: 500 }
    );
  }
}
