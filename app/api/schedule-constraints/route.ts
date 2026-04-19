import { ObjectId } from "mongodb";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import {
  parseMaxConsecutiveLessonsPerClass,
  parseMaxLessonsPerDayPerTeacher
} from "@/lib/schedule-constraint-defaults";

function validTeacherIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids)) return null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of ids) {
    if (typeof x !== "string") continue;
    const id = x.trim();
    if (!id || !ObjectId.isValid(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.length >= 2 ? out.sort() : null;
}

function dedupeGroups(groups: Array<{ teacherIds: string[] }>) {
  const seen = new Set<string>();
  const out: Array<{ teacherIds: string[] }> = [];
  for (const g of groups) {
    const key = g.teacherIds.join("\0");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ teacherIds: [...g.teacherIds] });
  }
  return out;
}

function normalizeStoredGroup(item: unknown): { teacherIds: string[] } | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const raw =
    Array.isArray(o.teacherIds) ? o.teacherIds : Array.isArray(o.teacher_ids) ? o.teacher_ids : null;
  const ids = validTeacherIds(raw);
  if (!ids) return null;
  return { teacherIds: ids };
}

function legacyPairsToGroups(
  pairs: Array<{ teacher_id_a?: string; teacher_id_b?: string } | Record<string, unknown>>
): Array<{ teacherIds: string[] }> {
  const out: Array<{ teacherIds: string[] }> = [];
  for (const p of pairs) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const a = typeof o.teacher_id_a === "string" ? o.teacher_id_a.trim() : "";
    const b = typeof o.teacher_id_b === "string" ? o.teacher_id_b.trim() : "";
    if (!a || !b || a === b) continue;
    if (!ObjectId.isValid(a) || !ObjectId.isValid(b)) continue;
    const ids = a < b ? [a, b] : [b, a];
    out.push({ teacherIds: ids });
  }
  return dedupeGroups(out);
}

/** Sessão via cookies do pedido (JWT); fallback ao token quando `getServerSession` não enxerga o cookie no App Router. */
async function getAuthedUserId(request: Request): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    const sid = session?.user?.id;
    if (typeof sid === "string" && sid) return sid;
  } catch {
    // continua para getToken
  }

  try {
    const secret = authOptions.secret ?? process.env.NEXTAUTH_SECRET;
    if (!secret) return null;
    const token = await getToken({ req: request as NextRequest, secret });
    if (!token) return null;
    const id = typeof token.id === "string" && token.id ? token.id : undefined;
    const sub = typeof token.sub === "string" && token.sub ? token.sub : undefined;
    return id ?? sub ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const doc = await db.collection("schedule_constraints").findOne({ user_id: userId });

    const rawGroups = doc?.teacher_mutex_groups ?? [];
    const parsed: Array<{ teacherIds: string[] }> = [];
    for (const item of rawGroups) {
      const g = normalizeStoredGroup(item);
      if (g) parsed.push(g);
    }

    let teacherMutexGroups = dedupeGroups(parsed);
    if (teacherMutexGroups.length === 0 && Array.isArray(doc?.teacher_mutex_pairs) && doc.teacher_mutex_pairs.length > 0) {
      teacherMutexGroups = legacyPairsToGroups(doc.teacher_mutex_pairs as { teacher_id_a?: string; teacher_id_b?: string }[]);
    }

    const maxLessonsPerDayPerTeacher = parseMaxLessonsPerDayPerTeacher(doc?.max_lessons_per_day_per_teacher);
    const maxConsecutiveLessonsPerClass = parseMaxConsecutiveLessonsPerClass(doc?.max_consecutive_lessons_per_class);

    return NextResponse.json({
      ok: true,
      teacherMutexGroups,
      maxLessonsPerDayPerTeacher,
      maxConsecutiveLessonsPerClass
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar regras." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getAuthedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    let body: {
      teacherMutexGroups?: unknown;
      maxLessonsPerDayPerTeacher?: unknown;
      maxConsecutiveLessonsPerClass?: unknown;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "JSON inválido no corpo da requisição." }, { status: 400 });
    }
    if (!Array.isArray(body.teacherMutexGroups)) {
      return NextResponse.json({ error: "Campo teacherMutexGroups deve ser um array." }, { status: 400 });
    }

    const maxLessonsPerDayPerTeacher = parseMaxLessonsPerDayPerTeacher(body.maxLessonsPerDayPerTeacher);
    const maxConsecutiveLessonsPerClass = parseMaxConsecutiveLessonsPerClass(body.maxConsecutiveLessonsPerClass);

    const parsed: Array<{ teacherIds: string[] }> = [];
    for (const item of body.teacherMutexGroups) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const rawIds = Array.isArray(o.teacherIds) ? o.teacherIds : Array.isArray(o.teacher_ids) ? o.teacher_ids : null;
      const ids = validTeacherIds(rawIds);
      if (ids) parsed.push({ teacherIds: ids });
    }
    const teacherMutexGroups = dedupeGroups(parsed);
    const teacher_mutex_groups = teacherMutexGroups.map((g) => ({
      teacher_ids: g.teacherIds
    }));

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const now = new Date();

    await db.collection("schedule_constraints").updateOne(
      { user_id: userId },
      {
        $set: {
          user_id: userId,
          teacher_mutex_groups,
          max_lessons_per_day_per_teacher: maxLessonsPerDayPerTeacher,
          max_consecutive_lessons_per_class: maxConsecutiveLessonsPerClass,
          updated_at: now
        },
        $unset: { teacher_mutex_pairs: "" }
      },
      { upsert: true }
    );

    return NextResponse.json({
      ok: true,
      teacherMutexGroups,
      maxLessonsPerDayPerTeacher,
      maxConsecutiveLessonsPerClass
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar regras." },
      { status: 500 }
    );
  }
}
