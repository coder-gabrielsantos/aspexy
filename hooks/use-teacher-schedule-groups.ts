import { useCallback, useMemo, useState } from "react";
import {
  readJsonSafe,
  slotsFromProfile,
  cycleTeacherSlotMaps,
  getTeacherSlotState,
  setTeacherSlotsBulkToState,
  type SchoolProfile,
  type SlotRow,
  type TeacherScheduleGroup,
  type TeacherSlotState,
} from "@/lib/types";

function normalizeGroupFromApi(g: {
  id: string;
  name: string;
  teacher_ids?: unknown;
  unavailability?: Record<string, number[]>;
  preference?: Record<string, number[]>;
  max_lessons_per_day?: number | null;
}): TeacherScheduleGroup {
  const cap = g.max_lessons_per_day;
  const teacher_ids = Array.isArray(g.teacher_ids)
    ? g.teacher_ids.filter((x): x is string => typeof x === "string")
    : [];
  return {
    id: g.id,
    name: g.name,
    teacher_ids,
    unavailability: g.unavailability ?? {},
    preference: g.preference ?? {},
    max_lessons_per_day:
      typeof cap === "number" && Number.isInteger(cap) && cap >= 1 && cap <= 20 ? cap : null
  };
}

export function useTeacherScheduleGroups(
  showToast: (msg: string, v?: "success" | "error") => void
) {
  const [groups, setGroups] = useState<TeacherScheduleGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTeacherIds, setNewGroupTeacherIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupStructureId, setGroupStructureId] = useState("");
  const [groupSlots, setGroupSlots] = useState<SlotRow[]>([]);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const groupByTeacherId = useMemo(() => {
    const m: Record<string, TeacherScheduleGroup> = {};
    for (const g of groups) {
      for (const tid of g.teacher_ids) {
        if (!m[tid]) m[tid] = g;
      }
    }
    return m;
  }, [groups]);

  const groupSlotState = useCallback(
    (dayIndex: number, slotIndex: number): TeacherSlotState => {
      if (!selectedGroup) return "available";
      return getTeacherSlotState(selectedGroup, dayIndex, slotIndex);
    },
    [selectedGroup]
  );

  const loadGroups = useCallback(async () => {
    const r = await fetch("/api/teacher-schedule-groups");
    const d = await readJsonSafe<{ ok?: boolean; groups?: TeacherScheduleGroup[] }>(r);
    if (r.ok && d?.ok) setGroups((d.groups ?? []).map(normalizeGroupFromApi));
    setIsLoading(false);
  }, []);

  const handleAddGroup = useCallback(async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setIsSavingGroup(true);
    try {
      const r = await fetch("/api/teacher-schedule-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, teacherIds: newGroupTeacherIds })
      });
      const d = await readJsonSafe<{ ok?: boolean; group?: TeacherScheduleGroup; error?: string }>(r);
      if (!r.ok || !d?.ok || !d.group) throw new Error(d?.error ?? "Falha ao criar agrupamento.");
      setNewGroupName("");
      setNewGroupTeacherIds([]);
      await loadGroups();
      setSelectedGroupId(d.group.id);
      showToast("Agrupamento criado.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao criar agrupamento.", "error");
    } finally {
      setIsSavingGroup(false);
    }
  }, [newGroupName, newGroupTeacherIds, loadGroups, showToast]);

  const runDeleteGroup = useCallback(async () => {
    if (!selectedGroupId) return;
    const r = await fetch(`/api/teacher-schedule-groups?id=${selectedGroupId}`, { method: "DELETE" });
    const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
    if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
    setSelectedGroupId("");
    await loadGroups();
    showToast("Agrupamento excluído.");
  }, [selectedGroupId, loadGroups, showToast]);

  const renameGroup = useCallback(
    async (groupId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed || !groupId) return false;
      try {
        const r = await fetch("/api/teacher-schedule-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId, name: trimmed })
        });
        const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
        if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao renomear agrupamento.");
        await loadGroups();
        return true;
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Falha ao renomear agrupamento.", "error");
        return false;
      }
    },
    [loadGroups, showToast]
  );

  const saveGroupMembers = useCallback(
    async (groupId: string, teacherIds: string[]) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;
      setIsSavingGroup(true);
      try {
        const uniqueIds = [...new Set(teacherIds.map((id) => id.trim()).filter(Boolean))];
        const r = await fetch("/api/teacher-schedule-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            name: group.name,
            teacherIds: uniqueIds
          })
        });
        const d = await readJsonSafe<{ ok?: boolean; group?: TeacherScheduleGroup; error?: string }>(r);
        if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao atualizar membros.");
        await loadGroups();
        showToast("Membros atualizados.");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Falha ao atualizar membros.", "error");
      } finally {
        setIsSavingGroup(false);
      }
    },
    [groups, loadGroups, showToast]
  );

  const handleLoadStructureForGroup = useCallback(
    async (id: string) => {
      setGroupStructureId(id);
      if (!id) {
        setGroupSlots([]);
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
        setGroupSlots([]);
        return;
      }
      setGroupSlots(slotsFromProfile(d.structure.school_profile));
    },
    [showToast]
  );

  const saveGroupMaxLessonsPerDay = useCallback(
    async (groupId: string, maxLessonsPerDay: number | null) => {
      const group = groups.find((x) => x.id === groupId);
      if (!group) return;
      setIsSavingGroup(true);
      try {
        const r = await fetch("/api/teacher-schedule-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: group.id,
            name: group.name,
            max_lessons_per_day: maxLessonsPerDay
          })
        });
        const d = await readJsonSafe<{ ok?: boolean; group?: TeacherScheduleGroup; error?: string }>(r);
        if (!r.ok || !d?.ok || !d.group) throw new Error(d?.error ?? "Falha ao salvar limite.");
        setGroups((prev) => prev.map((g) => (g.id === d.group!.id ? normalizeGroupFromApi(d.group!) : g)));
        showToast("Limite diário do agrupamento atualizado.");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Falha ao salvar limite.", "error");
        await loadGroups();
      } finally {
        setIsSavingGroup(false);
      }
    },
    [groups, loadGroups, showToast]
  );

  const toggleGroupSlotState = useCallback(
    async (dayIndex: number, slotIndex: number) => {
      if (!selectedGroup) return;
      const { unavailability, preference } = cycleTeacherSlotMaps(selectedGroup, dayIndex, slotIndex);

      setGroups((prev) =>
        prev.map((g) => (g.id === selectedGroup.id ? { ...g, unavailability, preference } : g))
      );

      try {
        const r = await fetch("/api/teacher-schedule-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: selectedGroup.id,
            name: selectedGroup.name,
            unavailability,
            preference
          })
        });
        const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
        if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao salvar grade do agrupamento.");
      } catch (e) {
        await loadGroups();
        showToast(e instanceof Error ? e.message : "Falha ao salvar grade do agrupamento.", "error");
      }
    },
    [selectedGroup, loadGroups, showToast]
  );

  const applyGroupSlotsBulk = useCallback(
    async (cells: Array<{ dayIndex: number; slotIndex: number }>, target: TeacherSlotState) => {
      if (!selectedGroup || cells.length === 0) return;
      const { unavailability, preference } = setTeacherSlotsBulkToState(selectedGroup, cells, target);

      setGroups((prev) =>
        prev.map((g) => (g.id === selectedGroup.id ? { ...g, unavailability, preference } : g))
      );

      try {
        const r = await fetch("/api/teacher-schedule-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: selectedGroup.id,
            name: selectedGroup.name,
            unavailability,
            preference
          })
        });
        const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
        if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao salvar grade do agrupamento.");
      } catch (e) {
        await loadGroups();
        showToast(e instanceof Error ? e.message : "Falha ao salvar grade do agrupamento.", "error");
      }
    },
    [selectedGroup, loadGroups, showToast]
  );

  return {
    groups,
    newGroupName,
    setNewGroupName,
    newGroupTeacherIds,
    setNewGroupTeacherIds,
    selectedGroupId,
    setSelectedGroupId,
    groupStructureId,
    groupSlots,
    isSavingGroup,
    isLoading,
    selectedGroup,
    groupByTeacherId,
    groupSlotState,
    loadGroups,
    handleAddGroup,
    runDeleteGroup,
    renameGroup,
    saveGroupMembers,
    handleLoadStructureForGroup,
    toggleGroupSlotState,
    applyGroupSlotsBulk,
    saveGroupMaxLessonsPerDay
  };
}
