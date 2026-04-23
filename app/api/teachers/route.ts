import { MongoServerError, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

type SaveTeacherBody = {
  teacherId?: string;
  name?: string;
  unavailability?: Record<string, number[]>;
  preference?: Record<string, number[]>;
  /** Inteiro 1–20 ou null para remover e usar o padrão das Regras. */
  max_lessons_per_day?: number | null;
};

function parseOptionalMaxLessonsPerDay(
  value: unknown
): { ok: true; value: number | null | undefined } | { ok: false } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 20) {
    return { ok: true, value };
  }
  return { ok: false };
}

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
    const collection = db.collection("teachers");

    if (id) {
      const objectId = parseObjectId(id);
      if (!objectId) {
        return NextResponse.json({ error: "ID inválido." }, { status: 400 });
      }

      const doc = await collection.findOne({ _id: objectId, user_id: session.user.id });
      if (!doc) {
        return NextResponse.json({ error: "Professor não encontrado." }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        teacher: {
          id: doc._id.toString(),
          name: doc.name,
          unavailability: doc.unavailability ?? {},
          preference: doc.preference ?? {},
          max_lessons_per_day:
            typeof doc.max_lessons_per_day === "number" && Number.isInteger(doc.max_lessons_per_day)
              ? doc.max_lessons_per_day
              : null,
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
      teachers: docs.map((doc) => ({
        id: doc._id.toString(),
        name: doc.name,
        unavailability: doc.unavailability ?? {},
        preference: doc.preference ?? {},
        max_lessons_per_day:
          typeof doc.max_lessons_per_day === "number" && Number.isInteger(doc.max_lessons_per_day)
            ? doc.max_lessons_per_day
            : null,
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
      { error: error instanceof Error ? error.message : "Falha ao listar professores." },
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

    const body = (await request.json()) as SaveTeacherBody;
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const collection = db.collection("teachers");
    const now = new Date();

    if (body.teacherId) {
      const objectId = parseObjectId(body.teacherId);
      if (!objectId) {
        return NextResponse.json({ error: "ID inválido para atualização." }, { status: 400 });
      }

      const updateFields: Record<string, unknown> = { name, updated_at: now };
      if (body.unavailability !== undefined) {
        updateFields.unavailability = body.unavailability;
      }
      if (body.preference !== undefined) {
        updateFields.preference = body.preference;
      }
      if (body.max_lessons_per_day !== undefined) {
        const parsed = parseOptionalMaxLessonsPerDay(body.max_lessons_per_day);
        if (!parsed.ok) {
          return NextResponse.json(
            { error: "Limite diário inválido: use um inteiro entre 1 e 20, ou null para o padrão geral." },
            { status: 400 }
          );
        }
        if (parsed.value === null) {
          updateFields.max_lessons_per_day = null;
        } else if (typeof parsed.value === "number") {
          updateFields.max_lessons_per_day = parsed.value;
        }
      }

      const updateResult = await collection.findOneAndUpdate(
        { _id: objectId, user_id: session.user.id },
        { $set: updateFields },
        { returnDocument: "after", includeResultMetadata: false }
      );

      if (!updateResult) {
        return NextResponse.json({ error: "Professor não encontrado." }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        teacher: {
          id: updateResult._id.toString(),
          name: updateResult.name,
          unavailability: updateResult.unavailability ?? {},
          preference: updateResult.preference ?? {},
          max_lessons_per_day:
            typeof updateResult.max_lessons_per_day === "number" &&
            Number.isInteger(updateResult.max_lessons_per_day)
              ? updateResult.max_lessons_per_day
              : null,
          created_at: updateResult.created_at,
          updated_at: updateResult.updated_at
        }
      });
    }

    let insertMax: number | null = null;
    if (body.max_lessons_per_day !== undefined) {
      const parsed = parseOptionalMaxLessonsPerDay(body.max_lessons_per_day);
      if (!parsed.ok) {
        return NextResponse.json(
          { error: "Limite diário inválido: use um inteiro entre 1 e 20, ou null para o padrão geral." },
          { status: 400 }
        );
      }
      if (typeof parsed.value === "number") insertMax = parsed.value;
    }

    const result = await collection.insertOne({
      user_id: session.user.id,
      name,
      unavailability: body.unavailability ?? {},
      preference: body.preference ?? {},
      ...(insertMax !== null ? { max_lessons_per_day: insertMax } : {}),
      created_at: now,
      updated_at: now
    });

    return NextResponse.json({
      ok: true,
      teacher: {
        id: result.insertedId.toString(),
        name,
        unavailability: body.unavailability ?? {},
        preference: body.preference ?? {},
        max_lessons_per_day: insertMax,
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
      { error: error instanceof Error ? error.message : "Falha ao salvar professor." },
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
    const result = await db.collection("teachers").deleteOne({
      _id: objectId,
      user_id: session.user.id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Professor não encontrado." }, { status: 404 });
    }

    const teacherIdStr = objectId.toString();
    await db.collection("teacher_schedule_groups").updateMany(
      { user_id: session.user.id, teacher_ids: teacherIdStr },
      { $pull: { teacher_ids: teacherIdStr }, $set: { updated_at: new Date() } } as Record<string, unknown>
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao excluir professor." },
      { status: 500 }
    );
  }
}
