import { useCallback, useMemo, useState } from "react";
import {
  readJsonSafe,
  slotsFromProfile,
  cycleTeacherSlotMaps,
  getTeacherSlotState,
  setTeacherSlotsBulkToState,
  type SchoolProfile,
  type SlotRow,
  type Teacher,
  type TeacherSlotState,
} from "@/lib/types";

function normalizeTeacherFromApi(t: {
  id: string;
  name: string;
  unavailability?: Record<string, number[]>;
  preference?: Record<string, number[]>;
  max_lessons_per_day?: number | null;
}): Teacher {
  const cap = t.max_lessons_per_day;
  return {
    id: t.id,
    name: t.name,
    unavailability: t.unavailability ?? {},
    preference: t.preference ?? {},
    max_lessons_per_day:
      typeof cap === "number" && Number.isInteger(cap) && cap >= 1 && cap <= 20 ? cap : null
  };
}

export function useTeachers(showToast: (msg: string, v?: "success" | "error") => void) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [teacherStructureId, setTeacherStructureId] = useState("");
  const [teacherSlots, setTeacherSlots] = useState<SlotRow[]>([]);
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const teacherSelectOptions = useMemo(
    () => teachers.map((t) => ({ value: t.id, label: t.name })),
    [teachers]
  );

  const teacherNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of teachers) m[t.id] = t.name;
    return m;
  }, [teachers]);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) ?? null,
    [teachers, selectedTeacherId]
  );

  const teacherSlotState = useCallback(
    (dayIndex: number, slotIndex: number): TeacherSlotState => {
      if (!selectedTeacher) return "available";
      return getTeacherSlotState(selectedTeacher, dayIndex, slotIndex);
    },
    [selectedTeacher]
  );

  const loadTeachers = useCallback(async () => {
    const r = await fetch("/api/teachers");
    const d = await readJsonSafe<{ ok?: boolean; teachers?: Teacher[] }>(r);
    if (r.ok && d?.ok) setTeachers((d.teachers ?? []).map(normalizeTeacherFromApi));
    setIsLoading(false);
  }, []);

  const handleAddTeacher = useCallback(async () => {
    const name = newTeacherName.trim();
    if (!name) return;
    setIsSavingTeacher(true);
    try {
      const r = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await readJsonSafe<{ ok?: boolean; teacher?: Teacher; error?: string }>(r);
      if (!r.ok || !d?.ok || !d.teacher) throw new Error(d?.error ?? "Falha ao adicionar professor.");
      setNewTeacherName("");
      await loadTeachers();
      setSelectedTeacherId(d.teacher.id);
      showToast("Professor adicionado.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao adicionar professor.", "error");
    } finally {
      setIsSavingTeacher(false);
    }
  }, [newTeacherName, loadTeachers, showToast]);

  const runDeleteTeacher = useCallback(async () => {
    if (!selectedTeacherId) return;
    const r = await fetch(`/api/teachers?id=${selectedTeacherId}`, { method: "DELETE" });
    const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
    if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
    setSelectedTeacherId("");
    await loadTeachers();
    showToast("Professor excluído.");
  }, [selectedTeacherId, loadTeachers, showToast]);

  const handleLoadStructureForTeacher = useCallback(
    async (id: string) => {
      setTeacherStructureId(id);
      if (!id) {
        setTeacherSlots([]);
        return;
      }
      const r = await fetch(`/api/schedule-structures?id=${id}`);
      const d = await readJsonSafe<{
        ok?: boolean;
        structure?: { school_profile: SchoolProfile };
        error?: string;
      }>(r);
      if (!r.ok || !d?.ok || !d.structure) {
        showToast(d?.error ?? "Falha ao carregar estrutura.", "error");
        setTeacherSlots([]);
        return;
      }
      setTeacherSlots(slotsFromProfile(d.structure.school_profile));
    },
    [showToast]
  );

  const saveTeacherMaxLessonsPerDay = useCallback(
    async (teacherId: string, maxLessonsPerDay: number | null) => {
      const teacher = teachers.find((x) => x.id === teacherId);
      if (!teacher) return;
      setIsSavingTeacher(true);
      try {
        const r = await fetch("/api/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: teacher.id,
            name: teacher.name,
            unavailability: teacher.unavailability,
            preference: teacher.preference,
            max_lessons_per_day: maxLessonsPerDay
          })
        });
        const d = await readJsonSafe<{ ok?: boolean; teacher?: Teacher; error?: string }>(r);
        if (!r.ok || !d?.ok || !d.teacher) throw new Error(d?.error ?? "Falha ao salvar limite.");
        setTeachers((prev) => prev.map((t) => (t.id === d.teacher!.id ? normalizeTeacherFromApi(d.teacher!) : t)));
        showToast("Limite diário atualizado.");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Falha ao salvar limite.", "error");
        await loadTeachers();
      } finally {
        setIsSavingTeacher(false);
      }
    },
    [teachers, loadTeachers, showToast]
  );

  const toggleTeacherSlotState = useCallback(
    async (dayIndex: number, slotIndex: number) => {
      if (!selectedTeacher) return;
      const { unavailability, preference } = cycleTeacherSlotMaps(selectedTeacher, dayIndex, slotIndex);

      setTeachers((prev) =>
        prev.map((te) =>
          te.id === selectedTeacher.id ? { ...te, unavailability, preference } : te
        )
      );

      try {
        const r = await fetch("/api/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: selectedTeacher.id,
            name: selectedTeacher.name,
            unavailability,
            preference,
          }),
        });
        const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
        if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao salvar grade do professor.");
      } catch (e) {
        await loadTeachers();
        showToast(e instanceof Error ? e.message : "Falha ao salvar grade do professor.", "error");
      }
    },
    [selectedTeacher, loadTeachers, showToast]
  );

  const applyTeacherSlotsBulk = useCallback(
    async (cells: Array<{ dayIndex: number; slotIndex: number }>, target: TeacherSlotState) => {
      if (!selectedTeacher || cells.length === 0) return;
      const { unavailability, preference } = setTeacherSlotsBulkToState(selectedTeacher, cells, target);

      setTeachers((prev) =>
        prev.map((te) =>
          te.id === selectedTeacher.id ? { ...te, unavailability, preference } : te
        )
      );

      try {
        const r = await fetch("/api/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: selectedTeacher.id,
            name: selectedTeacher.name,
            unavailability,
            preference,
          }),
        });
        const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
        if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao salvar grade do professor.");
      } catch (e) {
        await loadTeachers();
        showToast(e instanceof Error ? e.message : "Falha ao salvar grade do professor.", "error");
      }
    },
    [selectedTeacher, loadTeachers, showToast]
  );

  return {
    teachers,
    newTeacherName,
    setNewTeacherName,
    selectedTeacherId,
    setSelectedTeacherId,
    teacherStructureId,
    teacherSlots,
    isSavingTeacher,
    isLoading,
    teacherSelectOptions,
    teacherNameById,
    selectedTeacher,
    teacherSlotState,
    loadTeachers,
    handleAddTeacher,
    runDeleteTeacher,
    handleLoadStructureForTeacher,
    toggleTeacherSlotState,
    applyTeacherSlotsBulk,
    saveTeacherMaxLessonsPerDay,
  };
}
