import { useCallback, useMemo, useRef, useState } from "react";
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

type PendingFixedCell = { si: number; di: number } | null;

function buildProfileFingerprint(slots: SlotRow[]): string {
  return JSON.stringify(
    slots.map((row, idx) => ({
      idx,
      start: row.start,
      end: row.end,
      cells: [...row.cells],
      fixedLabels: [...row.fixedLabels],
    }))
  );
}

export function useStructures(showToast: (msg: string, v?: "success" | "error") => void) {
  const lastLoadedStructureIdRef = useRef("");
  const [schoolId, setSchoolId] = useState(() => crypto.randomUUID());
  const [slots, setSlots] = useState<SlotRow[]>([createInitialSlot(0), createInitialSlot(1)]);
  const [structureName, setStructureName] = useState("Estrutura Principal");
  const [structures, setStructures] = useState<StructureSummary[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState("");
  /** Nome da estrutura no último carregamento bem-sucedido (para decidir atualizar vs. criar nova). */
  const [committedName, setCommittedName] = useState("");
  /** Impressão digital da grade após o último carregar/salvar com seleção. */
  const [committedProfileFingerprint, setCommittedProfileFingerprint] = useState("");
  const [isSavingStructure, setIsSavingStructure] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingFixedCell, setPendingFixedCell] = useState<PendingFixedCell>(null);

  const activeSlotsCount = useMemo(
    () => slots.reduce((acc, row) => acc + row.cells.filter((c) => c === "lesson").length, 0),
    [slots]
  );

  const structureSelectOptions = useMemo(
    () => structures.map((s) => ({ value: s.id, label: s.name })),
    [structures]
  );

  const currentProfileFingerprint = useMemo(() => buildProfileFingerprint(slots), [slots]);

  const isStructureDirty = useMemo(() => {
    if (!selectedStructureId) return true;
    const nameChanged = structureName.trim() !== committedName.trim();
    const profileChanged = currentProfileFingerprint !== committedProfileFingerprint;
    return nameChanged || profileChanged;
  }, [selectedStructureId, structureName, committedName, currentProfileFingerprint, committedProfileFingerprint]);

  const saveCreatesNewStructure = useMemo(() => {
    if (!selectedStructureId) return true;
    return structureName.trim() !== committedName.trim();
  }, [selectedStructureId, structureName, committedName]);

  const saveButtonLabel = useMemo(() => {
    if (isSavingStructure) return "Salvando…";
    if (!selectedStructureId) return "Salvar estrutura";
    if (!isStructureDirty) return "Sem alterações";
    if (saveCreatesNewStructure) return "Salvar como nova estrutura";
    return "Salvar modificações";
  }, [isSavingStructure, selectedStructureId, isStructureDirty, saveCreatesNewStructure]);

  const generateSchoolProfile = useCallback((): SchoolProfile => {
    const timeSchema = slots.map((slot, i) => ({
      slot_index: i,
      start: slot.start,
      end: slot.end,
      type: slot.cells.every((c) => c === "break" || c === "fixed") ? ("break" as const) : ("lesson" as const),
    }));
    const gridMatrix = DAYS.reduce<Record<string, number[]>>((acc, _, di) => {
      acc[String(di)] = slots
        .map((s, si) => ({ state: s.cells[di], si }))
        .filter((e) => e.state === "lesson")
        .map((e) => e.si);
      return acc;
    }, {});
    const fixedSlots: SchoolProfile["config"]["fixed_slots"] = [];
    slots.forEach((slot, si) => {
      slot.cells.forEach((state, di) => {
        if (state === "fixed") {
          fixedSlots.push({ day_index: di, slot_index: si, label: slot.fixedLabels[di] ?? "RESERVADO" });
        }
      });
    });
    return {
      school_id: schoolId,
      config: {
        total_slots: slots.length,
        active_slots_count: activeSlotsCount,
        days: [...DAYS],
        time_schema: timeSchema,
        fixed_slots: fixedSlots,
      },
      grid_matrix: gridMatrix,
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
    if (!id) {
      setSelectedStructureId("");
      setCommittedName("");
      setCommittedProfileFingerprint("");
      lastLoadedStructureIdRef.current = "";
      return;
    }
    setSelectedStructureId(id);
    const r = await fetch(`/api/schedule-structures?id=${id}`);
    const d = await readJsonSafe<{ ok?: boolean; structure?: { name: string; school_profile: SchoolProfile }; error?: string }>(r);
    if (!r.ok || !d?.ok || !d.structure) {
      showToast(d?.error ?? "Falha ao carregar estrutura.", "error");
      setSelectedStructureId(lastLoadedStructureIdRef.current);
      return;
    }
    const loadedRows = slotsFromProfile(d.structure.school_profile);
    const fp = buildProfileFingerprint(loadedRows);
    setCommittedName(d.structure.name.trim());
    setCommittedProfileFingerprint(fp);
    setStructureName(d.structure.name);
    applyProfileToEditor(d.structure.school_profile);
    lastLoadedStructureIdRef.current = id;
  }, [showToast, applyProfileToEditor]);

  const handleSaveStructure = useCallback(async (onSaved?: (id: string) => void) => {
    const profile = generateSchoolProfile();
    const fpAfterSave = buildProfileFingerprint(slots);
    setIsSavingStructure(true);
    try {
      const hasSelection = Boolean(selectedStructureId);
      const renamedFromLoaded = hasSelection && structureName.trim() !== committedName.trim();
      const structureIdForRequest = hasSelection && !renamedFromLoaded ? selectedStructureId : undefined;

      const r = await fetch("/api/schedule-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structureId: structureIdForRequest,
          name: structureName,
          schoolProfile: profile
        })
      });
      const d = await readJsonSafe<{ ok?: boolean; structure?: { id: string; name: string }; error?: string }>(r);
      if (!r.ok || !d?.ok || !d.structure) throw new Error(d?.error ?? "Falha ao salvar estrutura.");
      const saved = d.structure;
      await loadStructures();
      setSelectedStructureId(saved.id);
      lastLoadedStructureIdRef.current = saved.id;
      setStructureName(saved.name);
      setCommittedName(saved.name.trim());
      setCommittedProfileFingerprint(fpAfterSave);
      onSaved?.(saved.id);
      if (renamedFromLoaded) {
        showToast("Nova estrutura salva com sucesso.");
      } else if (!hasSelection) {
        showToast("Estrutura salva com sucesso.");
      } else {
        showToast("Estrutura atualizada com sucesso.");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao salvar estrutura.", "error");
    } finally {
      setIsSavingStructure(false);
    }
  }, [
    generateSchoolProfile,
    selectedStructureId,
    structureName,
    committedName,
    slots,
    loadStructures,
    showToast
  ]);

  const runDeleteStructure = useCallback(async () => {
    if (!selectedStructureId) return;
    const r = await fetch(`/api/schedule-structures?id=${selectedStructureId}`, { method: "DELETE" });
    const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
    if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
    setSelectedStructureId("");
    lastLoadedStructureIdRef.current = "";
    setStructureName("Estrutura Principal");
    setCommittedName("");
    setCommittedProfileFingerprint("");
    setSlots([createInitialSlot(0), createInitialSlot(1)]);
    await loadStructures();
    showToast("Estrutura excluída com sucesso.");
  }, [selectedStructureId, loadStructures, showToast]);

  const toggleCellState = useCallback((slotIndex: number, dayIndex: number) => {
    setSlots((prev) => {
      const slot = prev[slotIndex];
      if (!slot) return prev;
      const current = slot.cells[dayIndex];
      // Clicking a fixed cell returns it directly to "lesson"
      if (current === "fixed") {
        return prev.map((s, ri) => {
          if (ri !== slotIndex) return s;
          const nextCells = [...s.cells];
          nextCells[dayIndex] = "lesson";
          const nextFixedLabels = [...s.fixedLabels];
          nextFixedLabels[dayIndex] = null;
          return { ...s, cells: nextCells, fixedLabels: nextFixedLabels };
        });
      }
      const nextState = STATE_CYCLE[(STATE_CYCLE.indexOf(current) + 1) % STATE_CYCLE.length];
      // When the next state would be "fixed", open the label popover instead
      if (nextState === "fixed") {
        setPendingFixedCell({ si: slotIndex, di: dayIndex });
        return prev;
      }
      return prev.map((s, ri) => {
        if (ri !== slotIndex) return s;
        const nextCells = [...s.cells];
        nextCells[dayIndex] = nextState;
        return { ...s, cells: nextCells };
      });
    });
  }, []);

  const setFixedLabel = useCallback((slotIndex: number, dayIndex: number, label: string) => {
    const trimmed = label.trim() || "RESERVADO";
    setSlots((prev) =>
      prev.map((s, ri) => {
        if (ri !== slotIndex) return s;
        const nextCells = [...s.cells];
        nextCells[dayIndex] = "fixed";
        const nextFixedLabels = [...s.fixedLabels];
        nextFixedLabels[dayIndex] = trimmed;
        return { ...s, cells: nextCells, fixedLabels: nextFixedLabels };
      })
    );
    setPendingFixedCell(null);
  }, []);

  const cancelPendingFixed = useCallback(() => {
    setPendingFixedCell(null);
  }, []);

  const updateSlotTime = useCallback((slotIndex: number, field: "start" | "end", value: string) => {
    setSlots((prev) => prev.map((slot, ri) => (ri !== slotIndex ? slot : { ...slot, [field]: value })));
  }, []);

  const addSlotRow = useCallback(() => {
    setSlots((prev) => {
      const last = prev[prev.length - 1];
      const start = last?.end && parseTime24ToMinutes(last.end) !== null ? last.end : DEFAULT_START;
      return [
        ...prev,
        {
          id: `slot-${Date.now()}`,
          start,
          end: addMinutesToTime24(start, DEFAULT_SLOT_MINUTES),
          cells: DAYS.map(() => "lesson" as const),
          fixedLabels: DAYS.map(() => null),
        },
      ];
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
    isStructureDirty,
    saveButtonLabel,
    runDeleteStructure,
    toggleCellState,
    updateSlotTime,
    addSlotRow,
    removeSlotRow,
    pendingFixedCell,
    setFixedLabel,
    cancelPendingFixed,
  };
}
