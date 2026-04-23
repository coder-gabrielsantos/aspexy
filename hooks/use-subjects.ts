import { useCallback, useState } from "react";
import { readJsonSafe, type Subject } from "@/lib/types";

export function useSubjects(showToast: (msg: string, v?: "success" | "error") => void) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectLessons, setNewSubjectLessons] = useState("4");
  const [newSubjectTeacherIds, setNewSubjectTeacherIds] = useState<string[]>([]);
  const [newSubjectClassIds, setNewSubjectClassIds] = useState<string[]>([]);
  const [isSavingSubject, setIsSavingSubject] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubjects = useCallback(async () => {
    const r = await fetch("/api/subjects");
    const d = await readJsonSafe<{ ok?: boolean; subjects?: Subject[] }>(r);
    if (r.ok && d?.ok) setSubjects(d.subjects ?? []);
    setIsLoading(false);
  }, []);

  const handleAddSubject = useCallback(async () => {
    const name = newSubjectName.trim();
    if (!name) return;
    const classIds = [...new Set(newSubjectClassIds.map((id) => id.trim()).filter(Boolean))];
    if (newSubjectTeacherIds.length === 0 || classIds.length === 0) {
      showToast("Selecione ao menos um professor e uma turma.", "error");
      return;
    }
    const lessons = Math.max(1, Math.min(20, Number(newSubjectLessons) || 1));
    setIsSavingSubject(true);
    try {
      for (const classId of classIds) {
        const r = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            lessonsPerWeek: lessons,
            teacherIds: newSubjectTeacherIds,
            classId
          })
        });
        const d = await readJsonSafe<{ ok?: boolean; subject?: Subject; error?: string }>(r);
        if (!r.ok || !d?.ok || !d.subject) throw new Error(d?.error ?? "Falha ao adicionar disciplina.");
      }
      setNewSubjectName("");
      setNewSubjectLessons("4");
      setNewSubjectTeacherIds([]);
      setNewSubjectClassIds([]);
      await loadSubjects();
      showToast(
        classIds.length > 1
          ? `${classIds.length} disciplinas adicionadas.`
          : "Disciplina adicionada."
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao adicionar disciplina.", "error");
    } finally {
      setIsSavingSubject(false);
    }
  }, [newSubjectName, newSubjectLessons, newSubjectTeacherIds, newSubjectClassIds, loadSubjects, showToast]);

  const runDeleteSubjects = useCallback(
    async (subjectIds: string[]) => {
      const ids = [...new Set(subjectIds.map((id) => id.trim()).filter(Boolean))];
      if (ids.length === 0) return;
      for (const subjectId of ids) {
        const r = await fetch(`/api/subjects?id=${subjectId}`, { method: "DELETE" });
        const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
        if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
      }
      await loadSubjects();
      showToast(
        ids.length > 1 ? `${ids.length} cadastros da disciplina excluídos.` : "Disciplina excluída."
      );
    },
    [loadSubjects, showToast]
  );

  const runDeleteSubject = useCallback(
    async (subjectId: string) => {
      await runDeleteSubjects([subjectId]);
    },
    [runDeleteSubjects]
  );

  const runRenameSubjects = useCallback(
    async (subjectIds: string[], nextNameRaw: string) => {
      const ids = [...new Set(subjectIds.map((id) => id.trim()).filter(Boolean))];
      const nextName = nextNameRaw.trim();
      if (ids.length === 0) return;
      if (!nextName) {
        showToast("Informe um nome válido para a disciplina.", "error");
        return;
      }

      const byId = new Map(subjects.map((sub) => [sub.id, sub]));
      setIsSavingSubject(true);
      try {
        for (const subjectId of ids) {
          const current = byId.get(subjectId);
          if (!current) continue;
          const r = await fetch("/api/subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subjectId: current.id,
              name: nextName,
              lessonsPerWeek: current.lessons_per_week,
              teacherIds: current.teacher_ids,
              classId: current.class_id
            })
          });
          const d = await readJsonSafe<{ ok?: boolean; subject?: Subject; error?: string }>(r);
          if (!r.ok || !d?.ok || !d.subject) throw new Error(d?.error ?? "Falha ao editar disciplina.");
        }
        await loadSubjects();
        showToast(ids.length > 1 ? "Disciplinas renomeadas." : "Disciplina renomeada.");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Falha ao editar disciplina.", "error");
      } finally {
        setIsSavingSubject(false);
      }
    },
    [subjects, loadSubjects, showToast]
  );

  return {
    subjects,
    newSubjectName,
    setNewSubjectName,
    newSubjectLessons,
    setNewSubjectLessons,
    newSubjectTeacherIds,
    setNewSubjectTeacherIds,
    newSubjectClassIds,
    setNewSubjectClassIds,
    isSavingSubject,
    isLoading,
    loadSubjects,
    handleAddSubject,
    runDeleteSubject,
    runDeleteSubjects,
    runRenameSubjects,
  };
}
