import { MongoServerError, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

type SaveGeneratedScheduleBody = {
  name?: string;
  structureId?: string;
  schoolProfile?: unknown;
  resultJson?: unknown;
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
    const collection = db.collection("generated_schedules");

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
        return NextResponse.json({ error: "Horário não encontrado." }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        generatedSchedule: {
          id: doc._id.toString(),
          name: doc.name,
          structure_id: doc.structure_id?.toString?.() ?? doc.structure_id ?? null,
          school_profile: doc.school_profile,
          result_json: doc.result_json,
          created_at: doc.created_at,
          updated_at: doc.updated_at
        }
      });
    }

    const docs = await collection
      .find({ user_id: session.user.id })
      .sort({ updated_at: -1 })
      .project({ name: 1, structure_id: 1, created_at: 1, updated_at: 1 })
      .toArray();

    return NextResponse.json({
      ok: true,
      generatedSchedules: docs.map((doc) => ({
        id: doc._id.toString(),
        name: doc.name,
        structure_id: doc.structure_id?.toString?.() ?? doc.structure_id ?? null,
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
      { error: error instanceof Error ? error.message : "Falha ao listar horários." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as SaveGeneratedScheduleBody;
    if (!body.schoolProfile || typeof body.schoolProfile !== "object") {
      return NextResponse.json({ error: "Campo schoolProfile é obrigatório." }, { status: 400 });
    }
    if (!body.resultJson || typeof body.resultJson !== "object") {
      return NextResponse.json({ error: "Campo resultJson é obrigatório." }, { status: 400 });
    }

    const structureObjectId = parseObjectId(body.structureId);
    const now = new Date();
    const normalizedName =
      body.name?.trim() || `Horário ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR")}`;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const collection = db.collection("generated_schedules");

    const result = await collection.insertOne({
      user_id: session.user.id,
      user_email: session.user.email,
      name: normalizedName,
      structure_id: structureObjectId ?? body.structureId ?? null,
      school_profile: body.schoolProfile,
      result_json: body.resultJson,
      created_at: now,
      updated_at: now
    });

    return NextResponse.json({
      ok: true,
      generatedSchedule: {
        id: result.insertedId.toString(),
        name: normalizedName,
        structure_id: (structureObjectId ?? body.structureId ?? null)?.toString?.() ?? null,
        school_profile: body.schoolProfile,
        result_json: body.resultJson,
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
      { error: error instanceof Error ? error.message : "Falha ao salvar horário." },
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
    const result = await db.collection("generated_schedules").deleteOne({
      _id: objectId,
      user_id: session.user.id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Horário não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao excluir horário." },
      { status: 500 }
    );
  }
}
