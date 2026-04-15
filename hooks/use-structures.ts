import { useCallback, useMemo, useState } from "react";
import {
  DAYS,
  DEFAULT_START,
  DEFAULT_END,
  DEFAULT_SLOT_MINUTES,
  STATE_CYCLE,
  createInitialSlot,
  slotsFromProfile,
  readJsonSafe,
  addMinutesToTime24,
  parseTime24ToMinutes,
  type SchoolProfile,
  type SlotRow,
  type StructureSummary,
} from "@/lib/types";

export function useStructures(showToast: (msg: string, v?: "success" | "error") => void) {
  const [schoolId, setSchoolId] = useState(() => crypto.randomUUID());
  const [slots, setSlots] = useState<SlotRow[]>([createInitialSlot(0), createInitialSlot(1)]);
  const [structureName, setStructureName] = useState("Estrutura Principal");
  const [structures, setStructures] = useState<StructureSummary[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState("");
  const [isSavingStructure, setIsSavingStructure] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const activeSlotsCount = useMemo(
    () => slots.reduce((acc, row) => acc + row.cells.filter((c) => c === "lesson").length, 0),
    [slots]
  );

  const structureSelectOptions = useMemo(
    () => structures.map((s) => ({ value: s.id, label: s.name })),
    [structures]
  );

  const generateSchoolProfile = useCallback((): SchoolProfile => {
    const timeSchema = slots.map((slot, i) => ({
      slot_index: i,
      start: slot.start,
      end: slot.end,
      type: slot.cells.every((c) => c === "break") ? ("break" as const) : ("lesson" as const)
    }));
    const gridMatrix = DAYS.reduce<Record<string, number[]>>((acc, _, di) => {
      acc[String(di)] = slots
        .map((s, si) => ({ state: s.cells[di], si }))
        .filter((e) => e.state === "lesson")
        .map((e) => e.si);
      return acc;
    }, {});
    return {
      school_id: schoolId,
      config: { total_slots: slots.length, active_slots_count: activeSlotsCount, days: [...DAYS], time_schema: timeSchema },
      grid_matrix: gridMatrix
    };
  }, [slots, schoolId, activeSlotsCount]);

  const applyProfileToEditor = useCallback((profile: SchoolProfile) => {
    setSchoolId(profile.school_id || crypto.randomUUID());
    setSlots(slotsFromProfile(profile));
  }, []);

  const loadStructures = useCallback(async () => {
    const r = await fetch("/api/schedule-structures");
    const d = await readJsonSafe<{ ok?: boolean; structures?: StructureSummary[] }>(r);
    if (r.ok && d?.ok) setStructures(d.structures ?? []);
    setIsLoading(false);
  }, []);

  const handleLoadStructureInGrade = useCallback(async (id: string) => {
    setSelectedStructureId(id);
    if (!id) return;
    const r = await fetch(`/api/schedule-structures?id=${id}`);
    const d = await readJsonSafe<{ ok?: boolean; structure?: { name: string; school_profile: SchoolProfile }; error?: string }>(r);
    if (!r.ok || !d?.ok || !d.structure) {
      showToast(d?.error ?? "Falha ao carregar estrutura.", "error");
      return;
    }
    setStructureName(d.structure.name);
    applyProfileToEditor(d.structure.school_profile);
  }, [showToast, applyProfileToEditor]);

  const handleSaveStructure = useCallback(async (onSaved?: (id: string) => void) => {
    const profile = generateSchoolProfile();
    setIsSavingStructure(true);
    try {
      const r = await fetch("/api/schedule-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structureId: selectedStructureId || undefined, name: structureName, schoolProfile: profile })
      });
      const d = await readJsonSafe<{ ok?: boolean; structure?: { id: string; name: string }; error?: string }>(r);
      if (!r.ok || !d?.ok || !d.structure) throw new Error(d?.error ?? "Falha ao salvar estrutura.");
      const saved = d.structure;
      await loadStructures();
      setSelectedStructureId(saved.id);
      setStructureName(saved.name);
      onSaved?.(saved.id);
      showToast("Estrutura salva com sucesso.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao salvar estrutura.", "error");
    } finally {
      setIsSavingStructure(false);
    }
  }, [generateSchoolProfile, selectedStructureId, structureName, loadStructures, showToast]);

  const runDeleteStructure = useCallback(async () => {
    if (!selectedStructureId) return;
    const r = await fetch(`/api/schedule-structures?id=${selectedStructureId}`, { method: "DELETE" });
    const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
    if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
    setSelectedStructureId("");
    setStructureName("Estrutura Principal");
    setSlots([createInitialSlot(0), createInitialSlot(1)]);
    await loadStructures();
    showToast("Estrutura excluída com sucesso.");
  }, [selectedStructureId, loadStructures, showToast]);

  const toggleCellState = useCallback((slotIndex: number, dayIndex: number) => {
    setSlots((prev) =>
      prev.map((slot, ri) => {
        if (ri !== slotIndex) return slot;
        const nextCells = [...slot.cells];
        nextCells[dayIndex] = STATE_CYCLE[(STATE_CYCLE.indexOf(nextCells[dayIndex]) + 1) % STATE_CYCLE.length];
        return { ...slot, cells: nextCells };
      })
    );
  }, []);

  const updateSlotTime = useCallback((slotIndex: number, field: "start" | "end", value: string) => {
    setSlots((prev) => prev.map((slot, ri) => (ri !== slotIndex ? slot : { ...slot, [field]: value })));
  }, []);

  const addSlotRow = useCallback(() => {
    setSlots((prev) => {
      const last = prev[prev.length - 1];
      const start = last?.end && parseTime24ToMinutes(last.end) !== null ? last.end : DEFAULT_START;
      return [...prev, { id: `slot-${Date.now()}`, start, end: addMinutesToTime24(start, DEFAULT_SLOT_MINUTES), cells: DAYS.map(() => "lesson" as const) }];
    });
  }, []);

  const removeSlotRow = useCallback((slotIndex: number) => {
    setSlots((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== slotIndex);
    });
  }, []);

  return {
    slots,
    structureName,
    setStructureName,
    structures,
    selectedStructureId,
    isSavingStructure,
    isLoading,
    activeSlotsCount,
    structureSelectOptions,
    loadStructures,
    handleLoadStructureInGrade,
    handleSaveStructure,
    runDeleteStructure,
    toggleCellState,
    updateSlotTime,
    addSlotRow,
    removeSlotRow,
  };
}
