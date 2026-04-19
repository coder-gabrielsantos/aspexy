import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

type SolverInputPayload = {
  schoolProfile?: unknown;
  maxDailySameSubject?: number;
  timeLimitSeconds?: number;
};

async function runRemoteSolver(payload: object): Promise<unknown> {
  const base = process.env.ASPEXY_OR_SOLVER_URL?.trim();
  if (!base) {
    throw new Error(
      "Serviço de otimização não configurado. Defina ASPEXY_OR_SOLVER_URL (URL do aspexy-or, ex.: https://seu-app.up.railway.app)."
    );
  }

  const url = `${base.replace(/\/$/, "")}/solve`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await r.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error("Resposta inválida do serviço de otimização.");
    }

    if (!r.ok) {
      const detail =
        typeof data === "object" && data !== null && "detail" in data
          ? String((data as { detail?: unknown }).detail)
          : text || r.statusText;
      throw new Error(detail || `Serviço retornou ${r.status}.`);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

type SubjectDoc = {
  name: string;
  lessons_per_week: number;
  teacher_id?: string;
  teacher_ids?: unknown;
  class_id: string;
};

function teacherIdsFromSubjectDoc(sub: SubjectDoc): string[] {
  if (Array.isArray(sub.teacher_ids)) {
    const ids = sub.teacher_ids
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
    if (ids.length > 0) return [...new Set(ids)];
  }
  const legacy = typeof sub.teacher_id === "string" ? sub.teacher_id.trim() : "";
  return legacy ? [legacy] : [];
}

/** Reparte aulas/semana entre professores (soma = total); necessário porque o solver trata cada professor como linha com carga própria. */
function splitWeeklyLoadAcrossTeachers(weekly: number, teacherIds: string[]): { teacherId: string; load: number }[] {
  const n = teacherIds.length;
  if (n === 0 || weekly < 1) return [];
  const base = Math.floor(weekly / n);
  const remainder = weekly % n;
  return teacherIds
    .map((teacherId, i) => ({
      teacherId,
      load: base + (i < remainder ? 1 : 0)
    }))
    .filter((x) => x.load > 0);
}

type TeacherDoc = {
  _id: { toString(): string };
  name: string;
  unavailability?: Record<string, number[]>;
  preference?: Record<string, number[]>;
};

type ClassDoc = {
  _id: { toString(): string };
  name: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as SolverInputPayload;
  if (!body.schoolProfile || typeof body.schoolProfile !== "object") {
    return NextResponse.json({ error: "Campo schoolProfile é obrigatório." }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "aspexy");
    const userId = session.user.id;

    const [subjectDocs, teacherDocs, classDocs, constraintsDoc] = await Promise.all([
      db.collection("subjects").find({ user_id: userId }).toArray() as unknown as Promise<SubjectDoc[]>,
      db.collection("teachers").find({ user_id: userId }).toArray() as unknown as Promise<TeacherDoc[]>,
      db.collection("classes").find({ user_id: userId }).toArray() as unknown as Promise<ClassDoc[]>,
      db.collection("schedule_constraints").findOne({ user_id: userId })
    ]);

    if (subjectDocs.length === 0) {
      return NextResponse.json({ error: "Nenhuma disciplina cadastrada. Cadastre ao menos uma na aba Disciplinas." }, { status: 400 });
    }

    const teacherNameById: Record<string, string> = {};
    const teacherUnavailability: Record<string, Record<string, number[]>> = {};
    const teacherPreference: Record<string, Record<string, number[]>> = {};
    for (const t of teacherDocs) {
      const id = t._id.toString();
      teacherNameById[id] = t.name;
      if (t.unavailability && Object.keys(t.unavailability).length > 0) {
        teacherUnavailability[t.name] = t.unavailability;
      }
      if (t.preference && Object.keys(t.preference).length > 0) {
        teacherPreference[t.name] = t.preference;
      }
    }

    const classNameById: Record<string, string> = {};
    for (const c of classDocs) {
      classNameById[c._id.toString()] = c.name;
    }

    type MutexStored = { teacher_id_a?: string; teacher_id_b?: string };
    type GroupStored = { teacher_ids?: string[] };

    const teacherMutexGroups: Array<{ teachers: string[] }> = [];
    const groupSeen = new Set<string>();

    const rawGroups = (constraintsDoc?.teacher_mutex_groups ?? []) as GroupStored[];
    for (const raw of rawGroups) {
      const ids = Array.isArray(raw.teacher_ids) ? raw.teacher_ids.filter((x): x is string => typeof x === "string") : [];
      const names: string[] = [];
      const nSeen = new Set<string>();
      for (const id of ids) {
        const tid = id.trim();
        if (!tid) continue;
        const nm = teacherNameById[tid];
        if (nm && !nSeen.has(nm)) {
          nSeen.add(nm);
          names.push(nm);
        }
      }
      if (names.length < 2) continue;
      const key = [...names].sort().join("\0");
      if (groupSeen.has(key)) continue;
      groupSeen.add(key);
      teacherMutexGroups.push({ teachers: names });
    }

    if (teacherMutexGroups.length === 0 && Array.isArray(constraintsDoc?.teacher_mutex_pairs)) {
      for (const raw of constraintsDoc.teacher_mutex_pairs as MutexStored[]) {
        const idA = typeof raw.teacher_id_a === "string" ? raw.teacher_id_a.trim() : "";
        const idB = typeof raw.teacher_id_b === "string" ? raw.teacher_id_b.trim() : "";
        if (!idA || !idB || idA === idB) continue;
        const na = teacherNameById[idA];
        const nb = teacherNameById[idB];
        if (na && nb && na !== nb) {
          const key = [na, nb].sort().join("\0");
          if (groupSeen.has(key)) continue;
          groupSeen.add(key);
          teacherMutexGroups.push({ teachers: [na, nb] });
        }
      }
    }

    const assignments = subjectDocs.flatMap((sub) => {
      const teacherIds = teacherIdsFromSubjectDoc(sub);
      if (teacherIds.length === 0) {
        throw new Error(`Disciplina "${sub.name}" sem professor cadastrado.`);
      }
      const loads = splitWeeklyLoadAcrossTeachers(sub.lessons_per_week ?? 1, teacherIds);
      return loads.map(({ teacherId, load }) => ({
        teacher: teacherNameById[teacherId] || "Professor não atribuído",
        subject: sub.name,
        class_id: classNameById[sub.class_id] || sub.class_id || "Turma não atribuída",
        weekly_load: load
      }));
    });

    const result = await runRemoteSolver({
      schoolProfile: body.schoolProfile,
      assignments,
      teacherUnavailability,
      teacherPreference,
      teacherMutexGroups,
      maxDailySameSubject: body.maxDailySameSubject ?? 2,
      timeLimitSeconds: body.timeLimitSeconds ?? 10
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao gerar horário." },
      { status: 500 }
    );
  }
}
