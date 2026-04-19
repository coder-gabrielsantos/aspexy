export type StepDef = {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>;
};

export const DAYS = ["SEG", "TER", "QUA", "QUI", "SEX"] as const;

export const DAY_FULL_LABEL: Record<(typeof DAYS)[number], string> = {
  SEG: "Segunda-feira",
  TER: "Terça-feira",
  QUA: "Quarta-feira",
  QUI: "Quinta-feira",
  SEX: "Sexta-feira"
};

export const DEFAULT_START = "07:30";
export const DEFAULT_END = "08:20";
export const DEFAULT_SLOT_MINUTES = 50;

export type SlotState = "lesson" | "free" | "break";
export type TabMode = "grade" | "classes" | "teachers" | "subjects" | "constraints" | "generate";

/** Lista de IDs de professores que não podem coincidir no mesmo dia/slot (no máximo um leciona por slot). */
export type TeacherMutexGroupRow = {
  id: string;
  teacherIds: string[];
};

export type SlotRow = {
  id: string;
  start: string;
  end: string;
  cells: SlotState[];
};

export type SchoolProfile = {
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

export type SolverAllocation = {
  teacher: string;
  subject: string;
  class_id: string;
  day_index: number;
  day_name: string;
  slot_index: number;
};

export type SolverResult = {
  status: string;
  days: Array<{
    day_index: number;
    slots: Array<{
      slot_index: number;
      assignments?: SolverAllocation[];
    }>;
  }>;
};

export type Teacher = {
  id: string;
  name: string;
  unavailability: Record<string, number[]>;
  /** Índices de slot por dia em que o professor prefere ministrar (objetivo mole no solver). */
  preference: Record<string, number[]>;
  /**
   * Limite diário de aulas na geração; quando null, usa o padrão em Regras.
   * Número inteiro entre 1 e 20.
   */
  max_lessons_per_day: number | null;
};

export type SchoolClass = {
  id: string;
  name: string;
};

export type Subject = {
  id: string;
  name: string;
  lessons_per_week: number;
  /** IDs de professores atribuídos à disciplina (pode haver mais de um). */
  teacher_ids: string[];
  class_id: string;
};

export type StructureSummary = { id: string; name: string; updated_at: string };
export type GeneratedSummary = { id: string; name: string; structure_id?: string | null; updated_at: string };

export const STATE_CYCLE: SlotState[] = ["lesson", "free", "break"];

export const stateLabelMap: Record<SlotState, string> = {
  lesson: "AULA",
  free: "LIVRE",
  break: "INTERVALO"
};

/** Ciclo na grade de professores: disponível → preferência → indisponível (como na estrutura). */
export type TeacherSlotState = "available" | "preference" | "unavailable";

export const TEACHER_SLOT_CYCLE: TeacherSlotState[] = ["available", "preference", "unavailable"];

export const teacherSlotLabelMap: Record<TeacherSlotState, string> = {
  available: "DISPONÍVEL",
  preference: "PREFERÊNCIA",
  unavailable: "INDISPONÍVEL"
};

export function getTeacherSlotState(teacher: Teacher, dayIndex: number, slotIndex: number): TeacherSlotState {
  const key = String(dayIndex);
  if ((teacher.unavailability[key] ?? []).includes(slotIndex)) return "unavailable";
  if ((teacher.preference[key] ?? []).includes(slotIndex)) return "preference";
  return "available";
}

/** Avança no ciclo disponível → preferência → indisponível e devolve os mapas atualizados. */
export function cycleTeacherSlotMaps(
  teacher: Teacher,
  dayIndex: number,
  slotIndex: number
): { unavailability: Record<string, number[]>; preference: Record<string, number[]> } {
  const current = getTeacherSlotState(teacher, dayIndex, slotIndex);
  const next = TEACHER_SLOT_CYCLE[(TEACHER_SLOT_CYCLE.indexOf(current) + 1) % TEACHER_SLOT_CYCLE.length];
  const key = String(dayIndex);

  const un = { ...teacher.unavailability };
  const pref = { ...teacher.preference };
  un[key] = (un[key] ?? []).filter((s) => s !== slotIndex);
  pref[key] = (pref[key] ?? []).filter((s) => s !== slotIndex);
  if ((un[key]?.length ?? 0) === 0) delete un[key];
  if ((pref[key]?.length ?? 0) === 0) delete pref[key];

  if (next === "unavailable") {
    un[key] = [...(un[key] ?? []), slotIndex].sort((a, b) => a - b);
  } else if (next === "preference") {
    pref[key] = [...(pref[key] ?? []), slotIndex].sort((a, b) => a - b);
  }

  return { unavailability: un, preference: pref };
}

export function createInitialSlot(index = 0): SlotRow {
  return { id: `slot-${index + 1}`, start: DEFAULT_START, end: DEFAULT_END, cells: DAYS.map(() => "lesson" as SlotState) };
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function parseTime24ToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function minutesToTime24(total: number) {
  const c = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
}

export function addMinutesToTime24(value: string, delta: number) {
  const base = parseTime24ToMinutes(value);
  return base === null ? value : minutesToTime24(base + delta);
}

export function normalizeTime24(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 4);
  let h = Number(digits.slice(0, 2) || "0");
  let m = Number(digits.slice(2, 4) || "0");
  if (Number.isNaN(h)) h = 0;
  if (Number.isNaN(m)) m = 0;
  return `${String(clamp(h, 0, 23)).padStart(2, "0")}:${String(clamp(m, 0, 59)).padStart(2, "0")}`;
}

export function normalizeTime24OrFallback(input: string, fallback: string) {
  return input.replace(/\D/g, "").length < 3 ? fallback : normalizeTime24(input);
}

export function formatTimeTyping(input: string) {
  const d = input.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

export function slotsFromProfile(profile: SchoolProfile): SlotRow[] {
  const sorted = [...profile.config.time_schema].sort((a, b) => a.slot_index - b.slot_index);
  return sorted.map((schema, idx) => ({
    id: `slot-${idx + 1}`,
    start: schema.start ?? DEFAULT_START,
    end: schema.end ?? DEFAULT_END,
    cells: DAYS.map((_, dayIndex) => {
      if (schema.type === "break") return "break" as SlotState;
      const valid = profile.grid_matrix[String(dayIndex)] ?? [];
      return valid.includes(schema.slot_index) ? "lesson" : ("free" as SlotState);
    })
  }));
}

export async function readJsonSafe<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
