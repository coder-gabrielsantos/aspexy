import { MongoServerError, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

type SaveSubjectBody = {
  subjectId?: string;
  name?: string;
  lessonsPerWeek?: number;
  /** Lista preferida (múltiplos professores). */
  teacherIds?: string[];
  /** Legado: um único professor. */
  teacherId?: string;
  classId?: string;
};

function parseObjectId(value?: string) {
  if (!value) return null;
  if (!ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

type SubjectDocLike = {
  _id: ObjectId;
  name: string;
  lessons_per_week?: number;
  teacher_ids?: unknown;
  teacher_id?: unknown;
  class_id?: unknown;
  created_at?: Date;
  updated_at?: Date;
};

function teacherIdsFromDoc(doc: {
  teacher_ids?: unknown;
  teacher_id?: unknown;
}): string[] {
  if (Array.isArray(doc.teacher_ids)) {
    const ids = doc.teacher_ids
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
    if (ids.length > 0) return [...new Set(ids)];
  }
  if (typeof doc.teacher_id === "string" && doc.teacher_id.trim()) {
    return [doc.teacher_id.trim()];
  }
  return [];
}

function subjectJsonFromDoc(doc: SubjectDocLike) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    lessons_per_week: doc.lessons_per_week ?? 1,
    teacher_ids: teacherIdsFromDoc(doc),
    class_id: typeof doc.class_id === "string" ? doc.class_id : String(doc.class_id ?? ""),
    created_at: doc.created_at,
    updated_at: doc.updated_at
  };
}

function parseTeacherIdsFromBody(body: SaveSubjectBody): string[] | null {
  const fromArray = Array.isArray(body.teacherIds)
    ? body.teacherIds.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean)
    : [];
  const legacy =
    typeof body.teacherId === "string" && body.teacherId.trim() ? [body.teacherId.trim()] : [];
  const merged = [...fromArray, ...legacy];
  const unique = [...new Set(merged)];
  if (unique.length === 0) return null;
  if (!unique.every((id) => parseObjectId(id))) return null;
  return unique;
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
    const collection = db.collection("subjects");

    if (id) {
      const objectId = parseObjectId(id);
      if (!objectId) {
        return NextResponse.json({ error: "ID inválido." }, { status: 400 });
      }

      const doc = await collection.findOne({ _id: objectId, user_id: session.user.id });
      if (!doc) {
        return NextResponse.json({ error: "Disciplina não encontrada." }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        subject: subjectJsonFromDoc(doc as SubjectDocLike)
      });
    }

    const docs = await collection.find({ user_id: session.user.id }).sort({ name: 1 }).toArray();

    return NextResponse.json({
      ok: true,
      subjects: docs.map((doc) => subjectJsonFromDoc(doc as SubjectDocLike))
    });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao listar disciplinas." },
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

    const body = (await request.json()) as SaveSubjectBody;
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const lessonsPerWeek = Math.max(1, Math.min(20, Number(body.lessonsPerWeek) || 1));

    const teacherIdsRaw = parseTeacherIdsFromBody(body);
    const classIdRaw = typeof body.classId === "string" ? body.classId.trim() : "";
    if (!teacherIdsRaw || !classIdRaw || !parseObjectId(classIdRaw)) {
      return NextResponse.json(
        { error: "Selecione ao menos um professor e uma turma válidos." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const collection = db.collection("subjects");
    const now = new Date();

    if (body.subjectId) {
      const objectId = parseObjectId(body.subjectId);
      if (!objectId) {
        return NextResponse.json({ error: "ID inválido para atualização." }, { status: 400 });
      }

      const updateResult = await collection.findOneAndUpdate(
        { _id: objectId, user_id: session.user.id },
        {
          $set: {
            name,
            lessons_per_week: lessonsPerWeek,
            teacher_ids: teacherIdsRaw,
            class_id: classIdRaw,
            updated_at: now
          },
          $unset: { teacher_id: "" }
        },
        { returnDocument: "after", includeResultMetadata: false }
      );

      if (!updateResult) {
        return NextResponse.json({ error: "Disciplina não encontrada." }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        subject: subjectJsonFromDoc(updateResult as SubjectDocLike)
      });
    }

    const result = await collection.insertOne({
      user_id: session.user.id,
      name,
      lessons_per_week: lessonsPerWeek,
      teacher_ids: teacherIdsRaw,
      class_id: classIdRaw,
      created_at: now,
      updated_at: now
    });

    return NextResponse.json({
      ok: true,
      subject: {
        id: result.insertedId.toString(),
        name,
        lessons_per_week: lessonsPerWeek,
        teacher_ids: teacherIdsRaw,
        class_id: classIdRaw,
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
      { error: error instanceof Error ? error.message : "Falha ao salvar disciplina." },
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
    const result = await db.collection("subjects").deleteOne({
      _id: objectId,
      user_id: session.user.id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Disciplina não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao excluir disciplina." },
      { status: 500 }
    );
  }
}
