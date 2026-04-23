import { MongoServerError, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

type SaveGroupBody = {
  groupId?: string;
  name?: string;
  teacherIds?: string[];
  unavailability?: Record<string, number[]>;
  preference?: Record<string, number[]>;
  /** Inteiro 1–20 ou null para remover e usar o padrão das Regras. */
  max_lessons_per_day?: number | null;
};

type GroupDocLike = {
  _id: ObjectId;
  name: string;
  teacher_ids?: unknown;
  unavailability?: Record<string, number[]>;
  preference?: Record<string, number[]>;
  max_lessons_per_day?: number | null;
  created_at?: Date;
  updated_at?: Date;
};

function parseObjectId(value?: string) {
  if (!value) return null;
  if (!ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

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

function sanitizeTeacherIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (typeof v !== "string") continue;
    const id = v.trim();
    if (!id || seen.has(id)) continue;
    if (!ObjectId.isValid(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function sanitizeDayMap(raw: unknown): Record<string, number[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d+$/.test(k)) continue;
    if (!Array.isArray(v)) continue;
    const nums = [...new Set(v.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0))].sort(
      (a, b) => a - b
    );
    if (nums.length > 0) out[k] = nums;
  }
  return out;
}

function groupJsonFromDoc(doc: GroupDocLike) {
  const teacher_ids = Array.isArray(doc.teacher_ids)
    ? doc.teacher_ids.filter((x): x is string => typeof x === "string")
    : [];
  const cap = doc.max_lessons_per_day;
  return {
    id: doc._id.toString(),
    name: doc.name,
    teacher_ids,
    unavailability: doc.unavailability ?? {},
    preference: doc.preference ?? {},
    max_lessons_per_day:
      typeof cap === "number" && Number.isInteger(cap) && cap >= 1 && cap <= 20 ? cap : null,
    created_at: doc.created_at,
    updated_at: doc.updated_at
  };
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
    const collection = db.collection("teacher_schedule_groups");

    if (id) {
      const objectId = parseObjectId(id);
      if (!objectId) {
        return NextResponse.json({ error: "ID inválido." }, { status: 400 });
      }
      const doc = await collection.findOne({ _id: objectId, user_id: session.user.id });
      if (!doc) {
        return NextResponse.json({ error: "Agrupamento não encontrado." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, group: groupJsonFromDoc(doc as GroupDocLike) });
    }

    const docs = await collection.find({ user_id: session.user.id }).sort({ name: 1 }).toArray();
    return NextResponse.json({
      ok: true,
      groups: docs.map((d) => groupJsonFromDoc(d as GroupDocLike))
    });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao listar agrupamentos." },
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

    const body = (await request.json()) as SaveGroupBody;
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const collection = db.collection("teacher_schedule_groups");
    const teachersCollection = db.collection("teachers");
    const now = new Date();

    const mirrorGroupAvailabilityToTeachers = async (
      teacherIdsRaw: unknown,
      groupUnavailability: unknown,
      groupPreference: unknown
    ) => {
      const teacherIds = Array.isArray(teacherIdsRaw)
        ? teacherIdsRaw.filter((id): id is string => typeof id === "string" && ObjectId.isValid(id))
        : [];
      if (teacherIds.length === 0) return;

      const teacherObjectIds = teacherIds.map((id) => new ObjectId(id));
      await teachersCollection.updateMany(
        { user_id: session.user.id, _id: { $in: teacherObjectIds } },
        {
          $set: {
            unavailability: sanitizeDayMap(groupUnavailability),
            preference: sanitizeDayMap(groupPreference),
            updated_at: now
          }
        }
      );
    };

    const teacherIdsProvided = body.teacherIds !== undefined;
    const teacherIds = teacherIdsProvided ? sanitizeTeacherIds(body.teacherIds) : [];

    const unavailabilityProvided = body.unavailability !== undefined;
    const unavailability = unavailabilityProvided ? sanitizeDayMap(body.unavailability) : undefined;

    const preferenceProvided = body.preference !== undefined;
    const preference = preferenceProvided ? sanitizeDayMap(body.preference) : undefined;

    let maxProvided = false;
    let maxValue: number | null = null;
    if (body.max_lessons_per_day !== undefined) {
      const parsed = parseOptionalMaxLessonsPerDay(body.max_lessons_per_day);
      if (!parsed.ok) {
        return NextResponse.json(
          { error: "Limite diário inválido: use um inteiro entre 1 e 20, ou null para o padrão geral." },
          { status: 400 }
        );
      }
      maxProvided = true;
      maxValue = parsed.value === undefined ? null : parsed.value;
    }

    if (body.groupId) {
      const objectId = parseObjectId(body.groupId);
      if (!objectId) {
        return NextResponse.json({ error: "ID inválido para atualização." }, { status: 400 });
      }

      const setFields: Record<string, unknown> = { name, updated_at: now };
      const unsetFields: Record<string, ""> = {};
      if (teacherIdsProvided) setFields.teacher_ids = teacherIds;
      if (unavailabilityProvided) setFields.unavailability = unavailability;
      if (preferenceProvided) setFields.preference = preference;
      if (maxProvided) {
        if (maxValue === null) unsetFields.max_lessons_per_day = "";
        else setFields.max_lessons_per_day = maxValue;
      }

      if (teacherIdsProvided && teacherIds.length > 0) {
        await collection.updateMany(
          { user_id: session.user.id, _id: { $ne: objectId }, teacher_ids: { $in: teacherIds } },
          { $pull: { teacher_ids: { $in: teacherIds } }, $set: { updated_at: now } } as Record<string, unknown>
        );
      }

      const update: Record<string, unknown> = { $set: setFields };
      if (Object.keys(unsetFields).length > 0) update.$unset = unsetFields;

      const updateResult = await collection.findOneAndUpdate(
        { _id: objectId, user_id: session.user.id },
        update,
        { returnDocument: "after", includeResultMetadata: false }
      );

      if (!updateResult) {
        return NextResponse.json({ error: "Agrupamento não encontrado." }, { status: 404 });
      }

      const shouldMirrorAvailability = unavailabilityProvided || preferenceProvided || teacherIdsProvided;
      if (shouldMirrorAvailability) {
        await mirrorGroupAvailabilityToTeachers(
          updateResult.teacher_ids,
          updateResult.unavailability,
          updateResult.preference
        );
      }

      return NextResponse.json({ ok: true, group: groupJsonFromDoc(updateResult as GroupDocLike) });
    }

    if (teacherIdsProvided && teacherIds.length > 0) {
      await collection.updateMany(
        { user_id: session.user.id, teacher_ids: { $in: teacherIds } },
        { $pull: { teacher_ids: { $in: teacherIds } }, $set: { updated_at: now } } as Record<string, unknown>
      );
    }

    const insertDoc: Record<string, unknown> = {
      user_id: session.user.id,
      name,
      teacher_ids: teacherIdsProvided ? teacherIds : [],
      unavailability: unavailabilityProvided ? (unavailability ?? {}) : {},
      preference: preferenceProvided ? (preference ?? {}) : {},
      created_at: now,
      updated_at: now
    };
    if (maxProvided && maxValue !== null) insertDoc.max_lessons_per_day = maxValue;

    const result = await collection.insertOne(insertDoc);

    if ((unavailabilityProvided || preferenceProvided) && teacherIds.length > 0) {
      await mirrorGroupAvailabilityToTeachers(
        insertDoc.teacher_ids,
        insertDoc.unavailability,
        insertDoc.preference
      );
    }

    return NextResponse.json({
      ok: true,
      group: groupJsonFromDoc({
        _id: result.insertedId,
        name,
        teacher_ids: insertDoc.teacher_ids as string[],
        unavailability: insertDoc.unavailability as Record<string, number[]>,
        preference: insertDoc.preference as Record<string, number[]>,
        max_lessons_per_day: maxProvided ? maxValue : null,
        created_at: now,
        updated_at: now
      })
    });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar agrupamento." },
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
    const result = await db.collection("teacher_schedule_groups").deleteOne({
      _id: objectId,
      user_id: session.user.id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Agrupamento não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MongoServerError) {
      const status = error.code === 18 ? 401 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao excluir agrupamento." },
      { status: 500 }
    );
  }
}
