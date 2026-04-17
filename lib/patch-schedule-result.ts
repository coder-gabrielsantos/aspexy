import { DAYS, DAY_FULL_LABEL, type SchoolProfile, type SolverAllocation, type SolverResult } from "@/lib/types";

/** Índice de slot no schema (não o índice da linha na UI) para a linha `rowIndex`. */
export function slotIndexForViewRow(profile: SchoolProfile | null, rowIndex: number): number {
  if (!profile) return rowIndex;
  const sorted = [...profile.config.time_schema].sort((a, b) => a.slot_index - b.slot_index);
  return sorted[rowIndex]?.slot_index ?? rowIndex;
}

function dayNameForIndex(dayIndex: number): string {
  const short = DAYS[dayIndex];
  return short ? DAY_FULL_LABEL[short] : String(dayIndex);
}

/** Reconstrói a lista plana `allocations` a partir de `days` (alinhado ao motor OR). */
function rebuildAllocations(result: SolverResult): void {
  const flat: SolverAllocation[] = [];
  for (const day of result.days ?? []) {
    for (const slot of day.slots ?? []) {
      for (const a of slot.assignments ?? []) flat.push(a);
    }
  }
  (result as SolverResult & { allocations?: SolverAllocation[] }).allocations = flat;
}

/**
 * Atualiza uma célula (dia + slot + turma). Remove conflitos: mesmo professor não pode estar em duas turmas no mesmo slot.
 */
export function patchSolverResultCell(
  result: SolverResult,
  dayIndex: number,
  slotIndex: number,
  classId: string,
  next: { teacher: string; subject: string } | null
): SolverResult {
  const out = JSON.parse(JSON.stringify(result)) as SolverResult;
  if (!out.days?.length) return out;

  const day = out.days.find((d) => d.day_index === dayIndex);
  if (!day) return out;
  const slot = day.slots?.find((s) => s.slot_index === slotIndex);
  if (!slot) return out;

  const list = [...(slot.assignments ?? [])];
  const filtered = list.filter((a) => a.class_id !== classId);

  if (!next) {
    slot.assignments = filtered.length ? filtered : undefined;
    if (slot.assignments?.length === 0) delete slot.assignments;
    rebuildAllocations(out);
    return out;
  }

  const withoutTeacherConflict = filtered.filter((a) => a.teacher !== next.teacher);
  const dayName = dayNameForIndex(dayIndex);
  const newAlloc: SolverAllocation = {
    teacher: next.teacher.trim(),
    subject: next.subject.trim(),
    class_id: classId,
    day_index: dayIndex,
    day_name: dayName,
    slot_index: slotIndex
  };
  slot.assignments = [...withoutTeacherConflict, newAlloc];
  rebuildAllocations(out);
  return out;
}
