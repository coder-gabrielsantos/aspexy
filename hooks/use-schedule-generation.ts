import { useCallback, useMemo, useState } from "react";
import {
  readJsonSafe,
  slotsFromProfile,
  type GeneratedSummary,
  type SchoolClass,
  type SchoolProfile,
  type SolverAllocation,
  type SolverResult,
} from "@/lib/types";

export function useScheduleGeneration(
  showToast: (msg: string, v?: "success" | "error") => void,
  classes: SchoolClass[]
) {
  const [generationStructureId, setGenerationStructureId] = useState("");
  const [generationProfile, setGenerationProfile] = useState<SchoolProfile | null>(null);
  const [generatedSchedules, setGeneratedSchedules] = useState<GeneratedSummary[]>([]);
  const [selectedGeneratedScheduleId, setSelectedGeneratedScheduleId] = useState("");
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null);
  const [viewerProfile, setViewerProfile] = useState<SchoolProfile | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const classIds = useMemo(() => {
    if (!solverResult) return [];
    const ids = new Set<string>();
    for (const c of classes) ids.add(c.name);
    for (const day of solverResult.days ?? [])
      for (const slot of day.slots ?? [])
        for (const e of slot.assignments ?? []) ids.add(e.class_id);
    return Array.from(ids).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [solverResult, classes]);

  const scheduleByDaySlotClass = useMemo(() => {
    const m: Record<string, SolverAllocation> = {};
    if (!solverResult) return m;
    for (const day of solverResult.days ?? [])
      for (const slot of day.slots ?? [])
        for (const e of slot.assignments ?? [])
          m[`${day.day_index}-${slot.slot_index}-${e.class_id}`] = e;
    return m;
  }, [solverResult]);

  const viewSlots = useMemo(() => (viewerProfile ? slotsFromProfile(viewerProfile) : []), [viewerProfile]);

  const generatedSelectOptions = useMemo(
    () => generatedSchedules.map((s) => ({ value: s.id, label: s.name })),
    [generatedSchedules]
  );

  const loadGeneratedSchedules = useCallback(async () => {
    const r = await fetch("/api/generated-schedules");
    const d = await readJsonSafe<{ ok?: boolean; generatedSchedules?: GeneratedSummary[] }>(r);
    if (r.ok && d?.ok) setGeneratedSchedules(d.generatedSchedules ?? []);
    setIsLoading(false);
  }, []);

  const handleLoadStructureForGeneration = useCallback(async (id: string) => {
    setGenerationStructureId(id);
    setSelectedGeneratedScheduleId("");
    setSolverResult(null);
    setViewerProfile(null);
    if (!id) {
      setGenerationProfile(null);
      return;
    }
    const r = await fetch(`/api/schedule-structures?id=${id}`);
    const d = await readJsonSafe<{ ok?: boolean; structure?: { school_profile: SchoolProfile }; error?: string }>(r);
    if (!r.ok || !d?.ok || !d.structure) {
      showToast(d?.error ?? "Falha ao carregar estrutura.", "error");
      setGenerationProfile(null);
      return;
    }
    setGenerationProfile(d.structure.school_profile);
  }, [showToast]);

  const handleLoadGeneratedSchedule = useCallback(async (id: string) => {
    setSelectedGeneratedScheduleId(id);
    if (!id) {
      setSolverResult(null);
      setViewerProfile(null);
      return;
    }
    const r = await fetch(`/api/generated-schedules?id=${id}`);
    const d = await readJsonSafe<{ ok?: boolean; generatedSchedule?: { school_profile: SchoolProfile; result_json: SolverResult }; error?: string }>(r);
    if (!r.ok || !d?.ok || !d.generatedSchedule) {
      showToast(d?.error ?? "Falha ao carregar horário.", "error");
      return;
    }
    setSolverResult(d.generatedSchedule.result_json);
    setViewerProfile(d.generatedSchedule.school_profile);
    showToast("Horário carregado com sucesso.");
  }, [showToast]);

  const handleGenerateSchedule = useCallback(async () => {
    if (!generationProfile) {
      showToast("Selecione uma estrutura salva.", "error");
      return;
    }
    setIsSolving(true);
    try {
      const sr = await fetch("/api/schedule/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolProfile: generationProfile })
      });
      const sd = await readJsonSafe<{ ok?: boolean; result?: SolverResult; error?: string }>(sr);
      if (!sr.ok || !sd?.ok || !sd.result) throw new Error(sd?.error ?? "Falha ao gerar horário.");

      setSolverResult(sd.result);
      setViewerProfile(generationProfile);

      const saveR = await fetch("/api/generated-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structureId: generationStructureId || undefined, schoolProfile: generationProfile, resultJson: sd.result })
      });
      const saveD = await readJsonSafe<{ ok?: boolean; generatedSchedule?: { id: string }; error?: string }>(saveR);
      if (!saveR.ok || !saveD?.ok || !saveD.generatedSchedule) {
        showToast(`Horário gerado (${sd.result.status}), mas não foi salvo.`, "error");
      } else {
        await loadGeneratedSchedules();
        setSelectedGeneratedScheduleId(saveD.generatedSchedule.id);
        showToast(`Horário gerado e salvo (${sd.result.status}).`);
      }
    } catch (e) {
      setSolverResult(null);
      setViewerProfile(null);
      showToast(e instanceof Error ? e.message : "Falha ao gerar horário.", "error");
    } finally {
      setIsSolving(false);
    }
  }, [generationProfile, generationStructureId, loadGeneratedSchedules, showToast]);

  const runDeleteGeneratedSchedule = useCallback(async () => {
    if (!selectedGeneratedScheduleId) return;
    const r = await fetch(`/api/generated-schedules?id=${selectedGeneratedScheduleId}`, { method: "DELETE" });
    const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
    if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
    setSelectedGeneratedScheduleId("");
    setSolverResult(null);
    setViewerProfile(null);
    await loadGeneratedSchedules();
    showToast("Horário excluído com sucesso.");
  }, [selectedGeneratedScheduleId, loadGeneratedSchedules, showToast]);

  const setDefaultGenerationStructure = useCallback((id: string) => {
    setGenerationStructureId((prev) => prev || id);
  }, []);

  return {
    generationStructureId,
    generationProfile,
    generatedSchedules,
    selectedGeneratedScheduleId,
    solverResult,
    viewerProfile,
    isSolving,
    isLoading,
    classIds,
    scheduleByDaySlotClass,
    viewSlots,
    generatedSelectOptions,
    loadGeneratedSchedules,
    handleLoadStructureForGeneration,
    handleLoadGeneratedSchedule,
    handleGenerateSchedule,
    runDeleteGeneratedSchedule,
    setDefaultGenerationStructure,
  };
}
