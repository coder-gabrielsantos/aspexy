import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const doc = await db.collection("schedule_constraints").findOne({ user_id: session.user.id });

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

    return NextResponse.json({
      ok: true,
      teacherMutexGroups
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as { teacherMutexGroups?: unknown };
    if (!Array.isArray(body.teacherMutexGroups)) {
      return NextResponse.json({ error: "Campo teacherMutexGroups deve ser um array." }, { status: 400 });
    }

    const parsed: Array<{ teacherIds: string[] }> = [];
    for (const item of body.teacherMutexGroups) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const ids = validTeacherIds(o.teacherIds);
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
      { user_id: session.user.id },
      {
        $set: {
          user_id: session.user.id,
          teacher_mutex_groups,
          updated_at: now
        },
        $unset: { teacher_mutex_pairs: "" }
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, teacherMutexGroups });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao salvar regras." },
      { status: 500 }
    );
  }
}
