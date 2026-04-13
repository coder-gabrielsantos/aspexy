"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { BookOpen, Check, GraduationCap, LayoutGrid, Plus, Save, Trash2, UserPlus, Users, WandSparkles, X } from "lucide-react";

import AppSidebar from "@/components/app-sidebar";
import ConfirmDialog from "@/components/confirm-dialog";
import type { StepDef } from "@/components/step-nav";
import ScheduleSelect from "@/components/schedule-select";
import ToastStack, { type ToastItem } from "@/components/toast-stack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DAYS = ["SEG", "TER", "QUA", "QUI", "SEX"] as const;
const DAY_FULL_LABEL: Record<(typeof DAYS)[number], string> = {
  SEG: "Segunda-feira",
  TER: "Terça-feira",
  QUA: "Quarta-feira",
  QUI: "Quinta-feira",
  SEX: "Sexta-feira"
};
const STEPS: StepDef[] = [
  { id: "grade", label: "Estrutura", icon: LayoutGrid },
  { id: "classes", label: "Turmas", icon: GraduationCap },
  { id: "teachers", label: "Professores", icon: Users },
  { id: "subjects", label: "Disciplinas", icon: BookOpen },
  { id: "generate", label: "Gerar", icon: WandSparkles }
];

const DEFAULT_START = "07:30";
const DEFAULT_END = "08:20";
const DEFAULT_SLOT_MINUTES = 50;

type SlotState = "lesson" | "free" | "break";
type TabMode = "grade" | "classes" | "teachers" | "subjects" | "generate";

type SlotRow = {
  id: string;
  start: string;
  end: string;
  cells: SlotState[];
};

type SchoolProfile = {
  school_id: string;
  config: {
    total_slots: number;
    active_slots_count: number;
    days: string[];
    time_schema: Array<{
      slot_index: number;
      start: string;
      end: string;
      type: "lesson" | "break";
    }>;
  };
  grid_matrix: Record<string, number[]>;
};

type SolverAllocation = {
  teacher: string;
  subject: string;
  class_id: string;
  day_index: number;
  day_name: string;
  slot_index: number;
};

type SolverResult = {
  status: string;
  days: Array<{
    day_index: number;
    slots: Array<{
      slot_index: number;
      assignments?: SolverAllocation[];
    }>;
  }>;
};

type Teacher = {
  id: string;
  name: string;
  unavailability: Record<string, number[]>;
};

type SchoolClass = {
  id: string;
  name: string;
};

type Subject = {
  id: string;
  name: string;
  lessons_per_week: number;
  teacher_id: string;
  class_id: string;
};

type StructureSummary = { id: string; name: string; updated_at: string };
type GeneratedSummary = { id: string; name: string; structure_id?: string | null; updated_at: string };

const STATE_CYCLE: SlotState[] = ["lesson", "free", "break"];


const stateLabelMap: Record<SlotState, string> = {
  lesson: "AULA",
  free: "LIVRE",
  break: "INTERVALO"
};

function createInitialSlot(index = 0): SlotRow {
  return { id: `slot-${index + 1}`, start: DEFAULT_START, end: DEFAULT_END, cells: DAYS.map(() => "lesson") };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseTime24ToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function minutesToTime24(total: number) {
  const c = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
}

function addMinutesToTime24(value: string, delta: number) {
  const base = parseTime24ToMinutes(value);
  return base === null ? value : minutesToTime24(base + delta);
}

function normalizeTime24(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 4);
  let h = Number(digits.slice(0, 2) || "0");
  let m = Number(digits.slice(2, 4) || "0");
  if (Number.isNaN(h)) h = 0;
  if (Number.isNaN(m)) m = 0;
  return `${String(clamp(h, 0, 23)).padStart(2, "0")}:${String(clamp(m, 0, 59)).padStart(2, "0")}`;
}

function normalizeTime24OrFallback(input: string, fallback: string) {
  return input.replace(/\D/g, "").length < 3 ? fallback : normalizeTime24(input);
}

function formatTimeTyping(input: string) {
  const d = input.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

function slotsFromProfile(profile: SchoolProfile): SlotRow[] {
  const sorted = [...profile.config.time_schema].sort((a, b) => a.slot_index - b.slot_index);
  return sorted.map((schema, idx) => ({
    id: `slot-${idx + 1}`,
    start: schema.start ?? DEFAULT_START,
    end: schema.end ?? DEFAULT_END,
    cells: DAYS.map((_, dayIndex) => {
      if (schema.type === "break") return "break" as SlotState;
      const valid = profile.grid_matrix[String(dayIndex)] ?? [];
      return valid.includes(schema.slot_index) ? "lesson" : "free";
    })
  }));
}

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function AspexyCanvas() {
  const [activeTab, setActiveTab] = useState<TabMode>("grade");
  const [schoolId, setSchoolId] = useState(() => crypto.randomUUID());
  const [slots, setSlots] = useState<SlotRow[]>([createInitialSlot(0), createInitialSlot(1)]);

  const [structureName, setStructureName] = useState("Estrutura Principal");
  const [structures, setStructures] = useState<StructureSummary[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState("");
  const [isSavingStructure, setIsSavingStructure] = useState(false);

  const [generationStructureId, setGenerationStructureId] = useState("");
  const [generationProfile, setGenerationProfile] = useState<SchoolProfile | null>(null);
  const [generatedSchedules, setGeneratedSchedules] = useState<GeneratedSummary[]>([]);
  const [selectedGeneratedScheduleId, setSelectedGeneratedScheduleId] = useState("");

  const [solverResult, setSolverResult] = useState<SolverResult | null>(null);
  const [viewerProfile, setViewerProfile] = useState<SchoolProfile | null>(null);
  const [isSolving, setIsSolving] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [isSavingClass, setIsSavingClass] = useState(false);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [teacherStructureId, setTeacherStructureId] = useState("");
  const [teacherSlots, setTeacherSlots] = useState<SlotRow[]>([]);
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectLessons, setNewSubjectLessons] = useState("4");
  const [newSubjectTeacherId, setNewSubjectTeacherId] = useState("");
  const [newSubjectClassId, setNewSubjectClassId] = useState("");
  const [isSavingSubject, setIsSavingSubject] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<"structure" | "generated" | "teacher" | "class" | "subject" | null>(null);
  const [confirmClassId, setConfirmClassId] = useState("");
  const [confirmSubjectId, setConfirmSubjectId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeSlotsCount = useMemo(
    () => slots.reduce((acc, row) => acc + row.cells.filter((c) => c === "lesson").length, 0),
    [slots]
  );

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

  const structureSelectOptions = useMemo(
    () => structures.map((s) => ({ value: s.id, label: s.name })),
    [structures]
  );

  const generatedSelectOptions = useMemo(
    () => generatedSchedules.map((s) => ({ value: s.id, label: s.name })),
    [generatedSchedules]
  );

  const canOpenGenerateTab = useMemo(() => {
    if (structures.length === 0) return false;
    if (classes.length === 0) return false;
    if (teachers.length === 0) return false;
    if (subjects.length === 0) return false;
    const teacherIds = new Set(teachers.map((t) => t.id));
    const classIds = new Set(classes.map((c) => c.id));
    return subjects.every(
      (s) =>
        Boolean(s.teacher_id) &&
        Boolean(s.class_id) &&
        teacherIds.has(s.teacher_id) &&
        classIds.has(s.class_id)
    );
  }, [structures, classes, teachers, subjects]);

  const completedSteps = useMemo(() => {
    const set = new Set<string>();
    if (structures.length > 0) set.add("grade");
    if (classes.length > 0) set.add("classes");
    if (teachers.length > 0) set.add("teachers");
    if (subjects.length > 0 && subjects.every((s) => Boolean(s.teacher_id) && Boolean(s.class_id)))
      set.add("subjects");
    return set;
  }, [structures, classes, teachers, subjects]);

  const lockedSteps = useMemo(() => {
    const set = new Set<string>();
    if (structures.length === 0) set.add("classes");
    if (classes.length === 0) set.add("teachers");
    if (teachers.length === 0) set.add("subjects");
    if (!canOpenGenerateTab) set.add("generate");
    return set;
  }, [structures, classes, teachers, canOpenGenerateTab]);

  const handleTabChange = useCallback(
    (tab: TabMode | string) => {
      if (lockedSteps.has(tab)) {
        showToast("Complete as etapas anteriores para desbloquear esta aba.", "error");
        return;
      }
      setActiveTab(tab as TabMode);
    },
    [lockedSteps, showToast]
  );

  const generateSchoolProfile = (): SchoolProfile => {
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
  };

  const applyProfileToEditor = (profile: SchoolProfile) => {
    setSchoolId(profile.school_id || crypto.randomUUID());
    setSlots(slotsFromProfile(profile));
  };

  const loadStructures = async () => {
    const r = await fetch("/api/schedule-structures");
    const d = await readJsonSafe<{ ok?: boolean; structures?: StructureSummary[] }>(r);
    if (r.ok && d?.ok) setStructures(d.structures ?? []);
  };

  const loadGeneratedSchedules = async () => {
    const r = await fetch("/api/generated-schedules");
    const d = await readJsonSafe<{ ok?: boolean; generatedSchedules?: GeneratedSummary[] }>(r);
    if (r.ok && d?.ok) setGeneratedSchedules(d.generatedSchedules ?? []);
  };

  const loadClasses = async () => {
    const r = await fetch("/api/classes");
    const d = await readJsonSafe<{ ok?: boolean; classes?: SchoolClass[] }>(r);
    if (r.ok && d?.ok) setClasses(d.classes ?? []);
  };

  const handleAddClass = async () => {
    const name = newClassName.trim();
    if (!name) return;
    setIsSavingClass(true);
    try {
      const r = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const d = await readJsonSafe<{ ok?: boolean; schoolClass?: SchoolClass; error?: string }>(r);
      if (!r.ok || !d?.ok || !d.schoolClass) throw new Error(d?.error ?? "Falha ao adicionar turma.");
      setNewClassName("");
      await loadClasses();
      showToast("Turma adicionada.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao adicionar turma.", "error");
    } finally {
      setIsSavingClass(false);
    }
  };

  const runDeleteClass = async () => {
    if (!confirmClassId) return;
    setIsDeleting(true);
    try {
      const r = await fetch(`/api/classes?id=${confirmClassId}`, { method: "DELETE" });
      const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
      if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
      await loadClasses();
      showToast("Turma excluída.");
      setConfirmTarget(null);
      setConfirmClassId("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao excluir turma.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const loadSubjects = async () => {
    const r = await fetch("/api/subjects");
    const d = await readJsonSafe<{ ok?: boolean; subjects?: Subject[] }>(r);
    if (r.ok && d?.ok) setSubjects(d.subjects ?? []);
  };

  const handleAddSubject = async () => {
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
  };

  const runDeleteSubject = async () => {
    if (!confirmSubjectId) return;
    setIsDeleting(true);
    try {
      const r = await fetch(`/api/subjects?id=${confirmSubjectId}`, { method: "DELETE" });
      const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
      if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
      await loadSubjects();
      showToast("Disciplina excluída.");
      setConfirmTarget(null);
      setConfirmSubjectId("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao excluir disciplina.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const teacherSelectOptions = useMemo(
    () => teachers.map((t) => ({ value: t.id, label: t.name })),
    [teachers]
  );

  const classSelectOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: c.name })),
    [classes]
  );

  const teacherNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of teachers) m[t.id] = t.name;
    return m;
  }, [teachers]);

  const classNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of classes) m[c.id] = c.name;
    return m;
  }, [classes]);

  useEffect(() => {
    void loadStructures();
    void loadGeneratedSchedules();
    void loadClasses();
    void loadTeachers();
    void loadSubjects();
  }, []);

  const handleLoadStructureInGrade = async (id: string) => {
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
  };

  const runDeleteStructure = async () => {
    if (!selectedStructureId) return;
    setIsDeleting(true);
    try {
      const r = await fetch(`/api/schedule-structures?id=${selectedStructureId}`, { method: "DELETE" });
      const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
      if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
      setSelectedStructureId("");
      setStructureName("Estrutura Principal");
      setSlots([createInitialSlot(0), createInitialSlot(1)]);
      await loadStructures();
      showToast("Estrutura excluída com sucesso.");
      setConfirmTarget(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao excluir estrutura.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const runDeleteGeneratedSchedule = async () => {
    if (!selectedGeneratedScheduleId) return;
    setIsDeleting(true);
    try {
      const r = await fetch(`/api/generated-schedules?id=${selectedGeneratedScheduleId}`, { method: "DELETE" });
      const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
      if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
      setSelectedGeneratedScheduleId("");
      setSolverResult(null);
      setViewerProfile(null);
      await loadGeneratedSchedules();
      showToast("Horário excluído com sucesso.");
      setConfirmTarget(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao excluir horário.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLoadStructureForGeneration = async (id: string) => {
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
  };

  const handleSaveStructure = async () => {
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
      setGenerationStructureId((prev) => prev || saved.id);
      setStructureName(saved.name);
      showToast("Estrutura salva com sucesso.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao salvar estrutura.", "error");
    } finally {
      setIsSavingStructure(false);
    }
  };

  const handleLoadGeneratedSchedule = async (id: string) => {
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
  };

  const handleGenerateSchedule = async () => {
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
  };

  const loadTeachers = async () => {
    const r = await fetch("/api/teachers");
    const d = await readJsonSafe<{ ok?: boolean; teachers?: Teacher[] }>(r);
    if (r.ok && d?.ok) setTeachers(d.teachers ?? []);
  };

  const handleAddTeacher = async () => {
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
  };

  const runDeleteTeacher = async () => {
    if (!selectedTeacherId) return;
    setIsDeleting(true);
    try {
      const r = await fetch(`/api/teachers?id=${selectedTeacherId}`, { method: "DELETE" });
      const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
      if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
      setSelectedTeacherId("");
      await loadTeachers();
      showToast("Professor excluído.");
      setConfirmTarget(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao excluir professor.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLoadStructureForTeacher = async (id: string) => {
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
  };

  const selectedTeacher = useMemo(() => teachers.find((t) => t.id === selectedTeacherId) ?? null, [teachers, selectedTeacherId]);

  const isTeacherUnavailable = useCallback(
    (dayIndex: number, slotIndex: number) => {
      if (!selectedTeacher) return false;
      return (selectedTeacher.unavailability[String(dayIndex)] ?? []).includes(slotIndex);
    },
    [selectedTeacher]
  );

  const toggleTeacherAvailability = async (dayIndex: number, slotIndex: number) => {
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
  };

  const toggleCellState = (slotIndex: number, dayIndex: number) => {
    setSlots((prev) =>
      prev.map((slot, ri) => {
        if (ri !== slotIndex) return slot;
        const nextCells = [...slot.cells];
        nextCells[dayIndex] = STATE_CYCLE[(STATE_CYCLE.indexOf(nextCells[dayIndex]) + 1) % STATE_CYCLE.length];
        return { ...slot, cells: nextCells };
      })
    );
  };

  const updateSlotTime = (slotIndex: number, field: "start" | "end", value: string) => {
    setSlots((prev) => prev.map((slot, ri) => (ri !== slotIndex ? slot : { ...slot, [field]: value })));
  };

  const addSlotRow = () => {
    setSlots((prev) => {
      const last = prev[prev.length - 1];
      const start = last?.end && parseTime24ToMinutes(last.end) !== null ? last.end : DEFAULT_START;
      return [...prev, { id: `slot-${Date.now()}`, start, end: addMinutesToTime24(start, DEFAULT_SLOT_MINUTES), cells: DAYS.map(() => "lesson") }];
    });
  };

  const removeSlotRow = (slotIndex: number) => {
    setSlots((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== slotIndex);
    });
  };

  const { data: session } = useSession();

  const userInitials = (session?.user?.name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pageMeta: Record<TabMode, { title: string; desc: string }> = {
    grade: { title: "Estruturas de horário", desc: "Crie e gerencie estruturas de horário da escola." },
    classes: { title: "Turmas", desc: "Cadastre e gerencie as turmas da escola." },
    teachers: { title: "Professores", desc: "Cadastre professores e defina a disponibilidade de horários." },
    subjects: { title: "Disciplinas", desc: "Cadastre disciplinas, atribua professores e turmas." },
    generate: { title: "Gerar horário", desc: "Gere horários oficiais a partir de uma estrutura salva." }
  };
  const panelTitleClass = "text-sm font-semibold text-slate-800";
  const panelDescClass = "text-xs text-slate-500";
  const { title: pageTitle, desc: pageDesc } = pageMeta[activeTab];

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f5] lg:flex-row">
      <AppSidebar
        steps={STEPS}
        activeStep={activeTab}
        completedSteps={completedSteps}
        lockedSteps={lockedSteps}
        onStepChange={handleTabChange}
        userName={session?.user?.name}
        userInitials={userInitials}
        onSignOut={() => void signOut({ callbackUrl: "/login" })}
        mobileOpen={sidebarOpen}
        onMobileOpenChange={setSidebarOpen}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-6 animate-fade-in">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
            <p className="mt-1 text-sm text-slate-500">{pageDesc}</p>
          </div>

          {activeTab === "grade" && (
            <div className="animate-fade-in space-y-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-premium">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100/80 px-5 py-4">
                  <div>
                    <div>
                      <p className={panelTitleClass}>Configuração da estrutura</p>
                      <p className={panelDescClass}>Defina os horários e dias letivos da escola</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-slate-100/80 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-600">
                      {slots.length} slots
                    </span>
                    <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium tabular-nums text-violet-600">
                      {activeSlotsCount} aulas
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-3 px-5 py-4">
                  <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
                    <div className="min-w-[180px]">
                      <p className="mb-1.5 text-xs font-medium text-slate-500">Nome</p>
                      <Input
                        value={structureName}
                        onChange={(e) => setStructureName(e.target.value)}
                        placeholder="Nome da estrutura"
                        className="w-52"
                      />
                    </div>
                    <div className="w-full max-w-[280px] shrink-0">
                      <p className="mb-1.5 text-xs font-medium text-slate-500">Estruturas salvas</p>
                      <ScheduleSelect
                        aria-label="Carregar estrutura salva"
                        options={structureSelectOptions}
                        value={selectedStructureId}
                        onChange={(id) => void handleLoadStructureInGrade(id)}
                        placeholder="Carregar estrutura salva"
                      />
                    </div>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {selectedStructureId && (
                      <Button
                        type="button"
                        onClick={() => setConfirmTarget("structure")}
                        variant="outline"
                        className="h-9 gap-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    )}
                    <Button
                      onClick={handleSaveStructure}
                      disabled={isSavingStructure}
                      className="h-9 gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isSavingStructure ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-premium">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[984px] table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[200px]" />
                      {DAYS.map((day) => (
                        <col key={day} />
                      ))}
                      <col className="w-10" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="border-b border-slate-200/80 bg-slate-50/60 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Horário
                        </th>
                        {DAYS.map((day) => (
                          <th key={day} className="border-b border-slate-200/80 bg-slate-50/60 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            {day}
                          </th>
                        ))}
                        <th className="border-b border-slate-200/80 bg-slate-50/60 px-1 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot, si) => (
                        <tr
                          key={slot.id}
                          className="transition-colors duration-150 hover:bg-slate-50/50"
                        >
                          <td className="border-b border-slate-100/80 px-2.5 py-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <Input inputMode="numeric" placeholder="HH:MM" value={slot.start} maxLength={5} className="h-8 w-[4.75rem] shrink-0 px-2 text-center text-xs tabular-nums"
                                onChange={(e) => updateSlotTime(si, "start", formatTimeTyping(e.target.value))}
                                onFocus={(e) => e.currentTarget.select()}
                                onKeyDown={(e) => { if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return; e.preventDefault(); updateSlotTime(si, "start", addMinutesToTime24(slot.start, e.key === "ArrowUp" ? 5 : -5)); }}
                                onBlur={() => updateSlotTime(si, "start", normalizeTime24OrFallback(slot.start, DEFAULT_START))}
                              />
                              <span className="shrink-0 text-[10px] text-slate-300">–</span>
                              <Input inputMode="numeric" placeholder="HH:MM" value={slot.end} maxLength={5} className="h-8 w-[4.75rem] shrink-0 px-2 text-center text-xs tabular-nums"
                                onChange={(e) => updateSlotTime(si, "end", formatTimeTyping(e.target.value))}
                                onFocus={(e) => e.currentTarget.select()}
                                onKeyDown={(e) => { if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return; e.preventDefault(); updateSlotTime(si, "end", addMinutesToTime24(slot.end, e.key === "ArrowUp" ? 5 : -5)); }}
                                onBlur={() => updateSlotTime(si, "end", normalizeTime24OrFallback(slot.end, DEFAULT_END))}
                              />
                            </div>
                          </td>
                          {slot.cells.map((state, di) => (
                            <td key={`${slot.id}-${DAYS[di]}`} className="border-b border-slate-100/80 px-1.5 py-2">
                              <button
                                type="button"
                                onClick={() => toggleCellState(si, di)}
                                title={stateLabelMap[state]}
                                className={cn(
                                  "box-border flex h-9 w-full items-center justify-center overflow-hidden rounded-lg text-[10px] font-semibold tracking-wide transition-all duration-200",
                                  state === "lesson" && "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80 hover:bg-emerald-100 hover:shadow-sm",
                                  state === "free" && "bg-white text-slate-400 ring-1 ring-slate-200/80 hover:bg-slate-50 hover:ring-slate-300",
                                  state === "break" && "break-stripes bg-amber-50/80 text-amber-600 ring-1 ring-amber-200/80 hover:bg-amber-100/80"
                                )}
                              >
                                {stateLabelMap[state]}
                              </button>
                            </td>
                          ))}
                          <td className="border-b border-slate-100/80 px-1 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeSlotRow(si)}
                              disabled={slots.length <= 1}
                              title="Remover slot"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-25"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-100/80 px-4 py-3">
                  <Button onClick={addSlotRow} variant="outline" className="h-9 gap-1.5 border-dashed text-xs text-slate-500 hover:border-violet-300 hover:text-violet-600">
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Slot
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "classes" && (
            <div className="animate-fade-in grid grid-cols-1 gap-5 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] lg:items-start">
              <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-premium">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100/80 px-5 py-4">
                  <div>
                    <p className={panelTitleClass}>Nova turma</p>
                    <p className={panelDescClass}>Cadastre uma turma para usar na distribuição das disciplinas.</p>
                  </div>
                  <span className="rounded-lg bg-slate-100/80 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500">
                    {classes.length}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleAddClass();
                      }}
                      placeholder="Ex.: 6ºA, 7ºB"
                      className="min-w-0 flex-1"
                    />
                    <Button
                      onClick={() => void handleAddClass()}
                      disabled={!newClassName.trim() || isSavingClass}
                      className="h-9 shrink-0 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>
                  <p className="mt-2.5 text-xs text-slate-400">
                    Use um padrão consistente (ex.: série + letra).
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-premium">
                <div className="border-b border-slate-100/80 px-5 py-4">
                  <p className="text-sm font-semibold text-slate-800">Turmas cadastradas</p>
                </div>

                {classes.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100/80">
                      <GraduationCap className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-600">Nenhuma turma</p>
                    <p className="mt-0.5 text-xs text-slate-400">Adicione ao lado para começar.</p>
                  </div>
                ) : (
                  <div className="max-h-[min(32rem,65vh)] overflow-y-auto">
                    <div className="grid grid-cols-1 gap-px bg-slate-100/40 sm:grid-cols-2 xl:grid-cols-3">
                      {classes.map((c) => (
                        <div
                          key={c.id}
                          className="group flex items-center gap-3 bg-white px-4 py-3 transition-all duration-200 hover:bg-slate-50/80"
                        >
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                            <GraduationCap className="h-3.5 w-3.5" />
                          </div>
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800" title={c.name}>
                            {c.name}
                          </p>
                          <button
                            type="button"
                            title="Excluir turma"
                            onClick={() => {
                              setConfirmClassId(c.id);
                              setConfirmTarget("class");
                            }}
                            className="rounded-lg p-1.5 text-slate-300 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "teachers" && (
            <div className="animate-fade-in space-y-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-premium">
                <div className="border-b border-slate-100/80 px-5 py-4">
                  <p className={panelTitleClass}>Configuração de professores</p>
                  <p className={panelDescClass}>Cadastre os professores e selecione uma estrutura para definir disponibilidade.</p>
                </div>
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1.5 text-xs font-medium text-slate-500">Novo professor</p>
                    <div className="flex gap-2">
                      <Input
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void handleAddTeacher(); }}
                        placeholder="Nome do professor"
                        className="min-w-0 flex-1"
                      />
                      <Button
                        onClick={() => void handleAddTeacher()}
                        disabled={!newTeacherName.trim() || isSavingTeacher}
                        className="h-9 shrink-0 gap-1.5"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  <div className="w-full shrink-0 sm:w-[min(100%,18rem)] sm:self-end">
                    <p className="mb-1.5 text-xs font-medium text-slate-500">Estrutura de horário</p>
                    <ScheduleSelect
                      aria-label="Selecionar estrutura para disponibilidade"
                      options={structureSelectOptions}
                      value={teacherStructureId}
                      onChange={(id) => void handleLoadStructureForTeacher(id)}
                      placeholder="Selecione uma estrutura"
                    />
                  </div>
                </div>
              </div>

              {teachers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100/80">
                    <Users className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-600">Nenhum professor cadastrado</p>
                  <p className="mt-0.5 text-xs text-slate-400">Adicione acima para começar.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-premium">
                  <div className="grid max-h-[min(32rem,60vh)] grid-cols-1 overflow-y-auto lg:h-[min(32rem,60vh)] lg:max-h-none lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] lg:overflow-hidden">
                    <aside className="flex min-h-0 flex-col border-b border-slate-200/80 lg:h-full lg:border-b-0 lg:border-r">
                      <div className="shrink-0 border-b border-slate-100/80 px-4 py-3">
                        <p className="text-xs font-semibold text-slate-500">
                          Professores ({teachers.length})
                        </p>
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
                        {teachers.map((t) => (
                          <div
                            key={t.id}
                            className={cn(
                              "group flex items-center gap-1 rounded-xl px-2 py-2 transition-all duration-200",
                              t.id === selectedTeacherId ? "bg-violet-50/80" : "hover:bg-slate-50"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedTeacherId(t.id === selectedTeacherId ? "" : t.id)}
                              className={cn(
                                "flex min-w-0 flex-1 items-center gap-2.5 text-left text-sm font-medium transition-colors duration-200",
                                t.id === selectedTeacherId ? "text-violet-700" : "text-slate-700"
                              )}
                            >
                              <div className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1 transition-all duration-200",
                                t.id === selectedTeacherId
                                  ? "gradient-primary text-white shadow-sm ring-violet-300"
                                  : "bg-slate-100 text-slate-500 ring-slate-200"
                              )}>
                                <Users className="h-3.5 w-3.5" />
                              </div>
                              <span className="min-w-0 flex-1 truncate" title={t.name}>
                                {t.name}
                              </span>
                              {t.id === selectedTeacherId && (
                                <Check className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Excluir professor"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTeacherId(t.id);
                                setConfirmTarget("teacher");
                              }}
                              className="rounded-lg p-1.5 text-slate-300 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </aside>

                    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
                      {!selectedTeacher ? (
                        <div className="flex min-h-[10rem] flex-1 items-center justify-center p-6 text-center lg:min-h-0">
                          <p className="text-sm text-slate-400">Selecione um professor para editar a disponibilidade.</p>
                        </div>
                      ) : !teacherStructureId || teacherSlots.length === 0 ? (
                        <div className="flex min-h-[10rem] flex-1 items-center justify-center p-6 text-center lg:min-h-0">
                          <p className="text-sm text-slate-400">Selecione uma estrutura de horário acima para visualizar os slots.</p>
                        </div>
                      ) : (
                        <>
                          <div className="shrink-0 border-b border-slate-100/80 px-5 py-3">
                            <p className="text-sm font-semibold text-slate-800">
                              {selectedTeacher.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              Clique onde o professor <span className="font-medium text-rose-500">não pode</span> dar aula.
                            </p>
                          </div>
                          <div className="min-h-0 min-w-0 flex-1 overflow-auto">
                            <table className="w-full min-w-[600px] table-fixed border-collapse text-xs">
                              <colgroup>
                                <col className="w-[120px]" />
                                {DAYS.map((d) => (
                                  <col key={d} />
                                ))}
                              </colgroup>
                              <thead>
                                <tr>
                                  <th className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/90 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    Horário
                                  </th>
                                  {DAYS.map((day) => (
                                    <th
                                      key={day}
                                      className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/90 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                                    >
                                      {day}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {teacherSlots.map((slot, si) => {
                                  const allBreak = slot.cells.every((c) => c === "break");
                                  if (allBreak) {
                                    return (
                                      <tr key={slot.id}>
                                        <td className="border-b border-slate-100/80 px-3 py-2 text-center text-xs text-slate-400">
                                          {slot.start} – {slot.end}
                                        </td>
                                        {DAYS.map((day) => (
                                          <td key={`${slot.id}-${day}`} className="break-stripes border-b border-slate-100/80 px-2 py-2 text-center text-slate-300">
                                            —
                                          </td>
                                        ))}
                                      </tr>
                                    );
                                  }
                                  return (
                                    <tr key={slot.id} className="transition-colors duration-150 hover:bg-slate-50/50">
                                      <td className="border-b border-slate-100/80 px-3 py-2 text-center text-xs font-medium tabular-nums text-slate-600">
                                        {slot.start} – {slot.end}
                                      </td>
                                      {DAYS.map((_, di) => {
                                        const unavailable = isTeacherUnavailable(di, si);
                                        return (
                                          <td key={`${slot.id}-${DAYS[di]}`} className="border-b border-slate-100/80 px-1.5 py-2 align-middle">
                                            <button
                                              type="button"
                                              onClick={() => void toggleTeacherAvailability(di, si)}
                                              className={cn(
                                                "box-border h-9 w-full rounded-lg text-[10px] font-semibold tracking-wide transition-all duration-200",
                                                unavailable
                                                  ? "bg-rose-50 text-rose-500 ring-1 ring-rose-200/80 hover:bg-rose-100 hover:shadow-sm"
                                                  : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80 hover:bg-emerald-100 hover:shadow-sm"
                                              )}
                                            >
                                              {unavailable ? "INDISPONÍVEL" : "DISPONÍVEL"}
                                            </button>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </section>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "subjects" && (
            <div className="animate-fade-in space-y-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-premium">
                <div className="border-b border-slate-100/80 px-5 py-4">
                  <p className={panelTitleClass}>Configuração de disciplinas</p>
                  <p className={panelDescClass}>Associe cada disciplina ao professor e à turma correspondente.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,12rem)_4rem_minmax(10rem,1fr)_minmax(7rem,9rem)_auto] lg:items-end">
                  <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                    <p className="mb-1.5 text-xs font-medium text-slate-500">Disciplina</p>
                    <Input
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleAddSubject(); }}
                      placeholder="Nome da disciplina"
                    />
                  </div>
                  <div className="w-full max-w-[4rem] sm:max-w-none">
                    <p className="mb-1.5 text-xs font-medium text-slate-500">Aulas</p>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={newSubjectLessons}
                      onChange={(e) => setNewSubjectLessons(e.target.value)}
                      className="tabular-nums"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1.5 text-xs font-medium text-slate-500">Professor</p>
                    <ScheduleSelect
                      options={teacherSelectOptions}
                      value={newSubjectTeacherId}
                      onChange={setNewSubjectTeacherId}
                      placeholder="Selecione"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1.5 text-xs font-medium text-slate-500">Turma</p>
                    <ScheduleSelect
                      options={classSelectOptions}
                      value={newSubjectClassId}
                      onChange={setNewSubjectClassId}
                      placeholder="Selecione"
                    />
                  </div>
                  <div className="flex items-end sm:col-span-2 lg:col-span-1">
                    <Button
                      onClick={() => void handleAddSubject()}
                      disabled={!newSubjectName.trim() || isSavingSubject}
                      className="h-9 w-full shrink-0 gap-1.5 sm:w-auto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              {subjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100/80">
                    <BookOpen className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-600">Nenhuma disciplina cadastrada</p>
                  <p className="mt-0.5 text-xs text-slate-400">Adicione acima para começar.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-premium">
                  <div className="max-h-[min(32rem,60vh)] overflow-auto">
                    <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
                      <colgroup>
                        <col className="w-[32%]" />
                        <col className="w-12" />
                        <col className="w-[30%]" />
                        <col className="w-[6rem]" />
                        <col className="w-9" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/90 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Disciplina
                          </th>
                          <th className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/90 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Aulas
                          </th>
                          <th className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/90 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Professor
                          </th>
                          <th className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/90 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Turma
                          </th>
                          <th className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/90 px-1 py-2.5" aria-label="Ações" />
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((sub) => (
                          <tr key={sub.id} className="group transition-colors duration-150 hover:bg-slate-50/50">
                            <td className="border-b border-slate-100/80 px-4 py-2.5 font-medium text-slate-800">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-violet-50 text-violet-500">
                                  <BookOpen className="h-3 w-3" />
                                </div>
                                <span className="min-w-0 truncate" title={sub.name}>
                                  {sub.name}
                                </span>
                              </div>
                            </td>
                            <td className="border-b border-slate-100/80 px-2 py-2.5 text-center tabular-nums text-slate-600">
                              {sub.lessons_per_week}
                            </td>
                            <td className="border-b border-slate-100/80 px-4 py-2.5 text-slate-600">
                              <span className="block truncate" title={teacherNameById[sub.teacher_id] ?? ""}>
                                {teacherNameById[sub.teacher_id] || <span className="text-slate-300">—</span>}
                              </span>
                            </td>
                            <td className="border-b border-slate-100/80 px-4 py-2.5 text-slate-600">
                              <span className="block truncate" title={classNameById[sub.class_id] ?? ""}>
                                {classNameById[sub.class_id] || <span className="text-slate-300">—</span>}
                              </span>
                            </td>
                            <td className="border-b border-slate-100/80 px-1 py-2.5 text-center">
                              <button
                                type="button"
                                title="Excluir disciplina"
                                onClick={() => {
                                  setConfirmSubjectId(sub.id);
                                  setConfirmTarget("subject");
                                }}
                                className="rounded-lg p-1.5 text-slate-300 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "generate" && (
            <div className="min-w-0 animate-fade-in space-y-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-premium">
                <div className="border-b border-slate-100/80 px-5 py-4">
                  <p className={panelTitleClass}>Configuração da geração</p>
                  <p className={panelDescClass}>Selecione a estrutura base e visualize horários já gerados.</p>
                </div>
                <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-[min(100%,580px)]">
                    <div className="min-w-0">
                      <p className="mb-1.5 text-xs font-medium text-slate-500">Estrutura base</p>
                      <ScheduleSelect
                        aria-label="Estrutura base para geração"
                        options={structureSelectOptions}
                        value={generationStructureId}
                        onChange={(id) => void handleLoadStructureForGeneration(id)}
                        placeholder="Selecione a estrutura"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1.5 text-xs font-medium text-slate-500">Horários gerados</p>
                      <ScheduleSelect
                        aria-label="Visualizar horário salvo"
                        options={generatedSelectOptions}
                        value={selectedGeneratedScheduleId}
                        onChange={(id) => void handleLoadGeneratedSchedule(id)}
                        placeholder="Visualizar horário salvo"
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {selectedGeneratedScheduleId && (
                      <Button
                        type="button"
                        onClick={() => setConfirmTarget("generated")}
                        variant="outline"
                        className="h-9 gap-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    )}
                    <Button onClick={handleGenerateSchedule} disabled={isSolving || !generationProfile} className="h-9 gap-1.5">
                      <WandSparkles className="h-3.5 w-3.5" />
                      {isSolving ? "Gerando..." : "Gerar e Salvar"}
                    </Button>
                  </div>
                </div>
              </div>

              {solverResult && classIds.length > 0 && viewSlots.length > 0 ? (
                <div className="min-w-0 space-y-5">
                  {DAYS.map((dayName, dayIndex) => (
                    <div key={dayName} className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-premium">
                      <div className="border-b border-slate-100/80 px-5 py-3">
                        <h3 className="text-sm font-semibold tracking-tight text-slate-800">
                          {DAY_FULL_LABEL[dayName]}
                        </h3>
                      </div>
                      <div className="max-h-[min(70vh,560px)] overflow-auto">
                        <table
                          className="table-fixed border-collapse text-xs"
                          style={{ width: `${140 + classIds.length * 140}px` }}
                        >
                          <thead>
                            <tr>
                              <th className="sticky left-0 top-0 z-[30] w-[140px] min-w-[140px] max-w-[140px] whitespace-nowrap border-b border-slate-200/90 bg-slate-100 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-800 shadow-[2px_2px_0_0_rgba(15,23,42,0.06)]">
                                Horário
                              </th>
                              {classIds.map((cid) => (
                                <th
                                  key={`${dayName}-${cid}`}
                                  className="sticky top-0 z-[20] w-[140px] min-w-[140px] max-w-[140px] overflow-hidden border-b border-l border-slate-200/90 bg-slate-100 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-800 shadow-[0_2px_0_0_rgba(15,23,42,0.06)]"
                                >
                                  <span className="block truncate" title={`Turma ${cid}`}>
                                    Turma {cid}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {viewSlots.map((slot, si) => {
                              const cellState = slot.cells[dayIndex];
                              const isBreak = cellState === "break";
                              const slotOrdinal = viewSlots
                                .slice(0, si + 1)
                                .filter((s) => s.cells[dayIndex] !== "break").length;
                              const startM = parseTime24ToMinutes(slot.start);
                              const endM = parseTime24ToMinutes(slot.end);
                              const dur = startM !== null && endM !== null ? endM - startM : 0;
                              const brk = dur >= 60 ? "Almoço" : "Intervalo";
                              return (
                                <tr
                                  key={`${dayName}-${slot.id}`}
                                  className={cn(isBreak && "break-stripes bg-slate-50/40")}
                                >
                                  <td
                                    className={cn(
                                      "sticky left-0 z-[10] w-[140px] min-w-[140px] max-w-[140px] whitespace-nowrap border-b border-slate-100/80 px-3 align-middle text-xs font-semibold tabular-nums shadow-[2px_0_0_0_rgba(15,23,42,0.04)]",
                                      isBreak
                                        ? "bg-slate-100/90 py-2 text-center text-slate-500"
                                        : "bg-slate-50/95 py-2 text-center text-slate-800"
                                    )}
                                  >
                                    {isBreak ? (
                                      <span className="inline-flex min-h-[2.25rem] w-full items-center justify-center">
                                        {`${slot.start} – ${slot.end}`}
                                      </span>
                                    ) : (
                                      <span className="inline-flex min-h-[2.25rem] w-full items-center justify-center text-center leading-snug">
                                        {`${slotOrdinal}º — ${slot.start} – ${slot.end}`}
                                      </span>
                                    )}
                                  </td>
                                  {classIds.map((cid) => {
                                    const a = scheduleByDaySlotClass[`${dayIndex}-${si}-${cid}`];
                                    return (
                                      <td
                                        key={`${dayName}-${slot.id}-${cid}`}
                                        className={cn(
                                          "w-[140px] min-w-[140px] max-w-[140px] overflow-hidden border-b border-l border-slate-100/80 px-2 align-middle text-slate-700",
                                          isBreak ? "bg-slate-50/50 py-2" : "bg-white py-2"
                                        )}
                                      >
                                        {isBreak ? (
                                          <span className="flex min-h-[2.25rem] w-full items-center justify-center truncate text-xs text-slate-400">
                                            {brk}
                                          </span>
                                        ) : a ? (
                                          <div className="flex min-h-[2.25rem] w-full flex-col items-center justify-center gap-0.5 px-1 text-center">
                                            <p className="w-full truncate text-xs font-semibold leading-tight text-slate-800" title={a.subject}>
                                              {a.subject}
                                            </p>
                                            <p className="w-full truncate text-[10px] leading-tight text-slate-500" title={a.teacher}>
                                              {a.teacher}
                                            </p>
                                          </div>
                                        ) : (
                                          <div className="flex min-h-[2.25rem] w-full items-center justify-center">
                                            <span className="text-slate-200">—</span>
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50">
                    <WandSparkles className="h-5 w-5 text-violet-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Selecione uma estrutura e clique em Gerar e Salvar
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">A grade oficial será exibida aqui.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setConfirmTarget(null);
        }}
        title={
          confirmTarget === "generated" ? "Excluir horário gerado?"
            : confirmTarget === "teacher" ? "Excluir professor?"
            : confirmTarget === "class" ? "Excluir turma?"
            : confirmTarget === "subject" ? "Excluir disciplina?"
            : "Excluir estrutura?"
        }
        description={
          confirmTarget === "generated" ? "O horário será removido permanentemente do banco. Esta ação não pode ser desfeita."
            : confirmTarget === "teacher" ? "O professor será removido permanentemente. Esta ação não pode ser desfeita."
            : confirmTarget === "class" ? "A turma será removida permanentemente. Esta ação não pode ser desfeita."
            : confirmTarget === "subject" ? "A disciplina será removida permanentemente. Esta ação não pode ser desfeita."
            : "A estrutura será removida permanentemente. Esta ação não pode ser desfeita."
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isPending={isDeleting}
        onConfirm={async () => {
          if (confirmTarget === "structure") await runDeleteStructure();
          else if (confirmTarget === "generated") await runDeleteGeneratedSchedule();
          else if (confirmTarget === "teacher") await runDeleteTeacher();
          else if (confirmTarget === "class") await runDeleteClass();
          else if (confirmTarget === "subject") await runDeleteSubject();
        }}
      />
    </div>
  );
}
