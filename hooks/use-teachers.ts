import { useCallback, useMemo, useState } from "react";
import { readJsonSafe, slotsFromProfile, type SchoolProfile, type SlotRow, type Teacher } from "@/lib/types";

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

  const isTeacherUnavailable = useCallback(
    (dayIndex: number, slotIndex: number) => {
      if (!selectedTeacher) return false;
      return (selectedTeacher.unavailability[String(dayIndex)] ?? []).includes(slotIndex);
    },
    [selectedTeacher]
  );

  const loadTeachers = useCallback(async () => {
    const r = await fetch("/api/teachers");
    const d = await readJsonSafe<{ ok?: boolean; teachers?: Teacher[] }>(r);
    if (r.ok && d?.ok) setTeachers(d.teachers ?? []);
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
        body: JSON.stringify({ name })
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

  const handleLoadStructureForTeacher = useCallback(async (id: string) => {
    setTeacherStructureId(id);
    if (!id) {
      setTeacherSlots([]);
      return;
    }
    const r = await fetch(`/api/schedule-structures?id=${id}`);
    const d = await readJsonSafe<{ ok?: boolean; structure?: { school_profile: SchoolProfile }; error?: string }>(r);
    if (!r.ok || !d?.ok || !d.structure) {
      showToast(d?.error ?? "Falha ao carregar estrutura.", "error");
      setTeacherSlots([]);
      return;
    }
    setTeacherSlots(slotsFromProfile(d.structure.school_profile));
  }, [showToast]);

  const toggleTeacherAvailability = useCallback(async (dayIndex: number, slotIndex: number) => {
    if (!selectedTeacher) return;
    const key = String(dayIndex);
    const current = selectedTeacher.unavailability[key] ?? [];
    const next = current.includes(slotIndex)
      ? current.filter((s) => s !== slotIndex)
      : [...current, slotIndex];
    const newUnavailability = { ...selectedTeacher.unavailability, [key]: next };

    setTeachers((prev) =>
      prev.map((t) => (t.id === selectedTeacher.id ? { ...t, unavailability: newUnavailability } : t))
    );

    try {
      const r = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: selectedTeacher.id, name: selectedTeacher.name, unavailability: newUnavailability })
      });
      const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
      if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao salvar disponibilidade.");
    } catch (e) {
      await loadTeachers();
      showToast(e instanceof Error ? e.message : "Falha ao salvar disponibilidade.", "error");
    }
  }, [selectedTeacher, loadTeachers, showToast]);

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
    isTeacherUnavailable,
    loadTeachers,
    handleAddTeacher,
    runDeleteTeacher,
    handleLoadStructureForTeacher,
    toggleTeacherAvailability,
  };
}
