import { useCallback, useState } from "react";
import { readJsonSafe, type Subject } from "@/lib/types";

export function useSubjects(showToast: (msg: string, v?: "success" | "error") => void) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectLessons, setNewSubjectLessons] = useState("4");
  const [newSubjectTeacherId, setNewSubjectTeacherId] = useState("");
  const [newSubjectClassId, setNewSubjectClassId] = useState("");
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
    const lessons = Math.max(1, Math.min(20, Number(newSubjectLessons) || 1));
    setIsSavingSubject(true);
    try {
      const r = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          lessonsPerWeek: lessons,
          teacherId: newSubjectTeacherId || undefined,
          classId: newSubjectClassId || undefined
        })
      });
      const d = await readJsonSafe<{ ok?: boolean; subject?: Subject; error?: string }>(r);
      if (!r.ok || !d?.ok || !d.subject) throw new Error(d?.error ?? "Falha ao adicionar disciplina.");
      setNewSubjectName("");
      setNewSubjectLessons("4");
      setNewSubjectTeacherId("");
      setNewSubjectClassId("");
      await loadSubjects();
      showToast("Disciplina adicionada.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao adicionar disciplina.", "error");
    } finally {
      setIsSavingSubject(false);
    }
  }, [newSubjectName, newSubjectLessons, newSubjectTeacherId, newSubjectClassId, loadSubjects, showToast]);

  const runDeleteSubject = useCallback(async (subjectId: string) => {
    const r = await fetch(`/api/subjects?id=${subjectId}`, { method: "DELETE" });
    const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
    if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
    await loadSubjects();
    showToast("Disciplina excluída.");
  }, [loadSubjects, showToast]);

  return {
    subjects,
    newSubjectName,
    setNewSubjectName,
    newSubjectLessons,
    setNewSubjectLessons,
    newSubjectTeacherId,
    setNewSubjectTeacherId,
    newSubjectClassId,
    setNewSubjectClassId,
    isSavingSubject,
    isLoading,
    loadSubjects,
    handleAddSubject,
    runDeleteSubject,
  };
}
