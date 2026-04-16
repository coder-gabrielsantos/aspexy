import path from "path";
import { spawn } from "child_process";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

type SolverInputPayload = {
  schoolProfile?: unknown;
  maxDailySameSubject?: number;
  timeLimitSeconds?: number;
};

function runPythonSolver(payload: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const pythonBin = process.env.PYTHON_BIN ?? "python";
    const scriptPath = path.join(process.cwd(), "lib", "or", "engine.py");

    const child = spawn(pythonBin, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Tempo limite excedido ao executar solver."));
    }, 60000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        reject(new Error(stderr || `Solver retornou código ${code}.`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch {
        reject(new Error("Resposta inválida do solver Python."));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
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

    const [subjectDocs, teacherDocs, classDocs] = await Promise.all([
      db.collection("subjects").find({ user_id: userId }).toArray() as unknown as Promise<SubjectDoc[]>,
      db.collection("teachers").find({ user_id: userId }).toArray() as unknown as Promise<TeacherDoc[]>,
      db.collection("classes").find({ user_id: userId }).toArray() as unknown as Promise<ClassDoc[]>
    ]);

    if (subjectDocs.length === 0) {
      return NextResponse.json({ error: "Nenhuma disciplina cadastrada. Cadastre ao menos uma na aba Disciplinas." }, { status: 400 });
    }

    const teacherNameById: Record<string, string> = {};
    const teacherUnavailability: Record<string, Record<string, number[]>> = {};
    for (const t of teacherDocs) {
      const id = t._id.toString();
      teacherNameById[id] = t.name;
      if (t.unavailability && Object.keys(t.unavailability).length > 0) {
        teacherUnavailability[t.name] = t.unavailability;
      }
    }

    const classNameById: Record<string, string> = {};
    for (const c of classDocs) {
      classNameById[c._id.toString()] = c.name;
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

    const result = await runPythonSolver({
      schoolProfile: body.schoolProfile,
      assignments,
      teacherUnavailability,
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
