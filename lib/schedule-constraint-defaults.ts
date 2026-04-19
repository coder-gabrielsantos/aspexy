/** Padrão quando ainda não há documento em `schedule_constraints`. */
export const DEFAULT_MAX_LESSONS_PER_DAY_PER_TEACHER = 6;
/** 0 no solver = desativado; valor inicial na UI quando não há doc. */
export const DEFAULT_MAX_CONSECUTIVE_LESSONS_PER_CLASS = 4;

export const MAX_LESSONS_PER_DAY_PER_TEACHER_MIN = 1;
export const MAX_LESSONS_PER_DAY_PER_TEACHER_MAX = 20;

export const MAX_CONSECUTIVE_LESSONS_PER_CLASS_MIN = 0;
export const MAX_CONSECUTIVE_LESSONS_PER_CLASS_MAX = 16;

export function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function parseMaxLessonsPerDayPerTeacher(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return DEFAULT_MAX_LESSONS_PER_DAY_PER_TEACHER;
  }
  return clampInt(value, MAX_LESSONS_PER_DAY_PER_TEACHER_MIN, MAX_LESSONS_PER_DAY_PER_TEACHER_MAX);
}

/** 0 = sem restrição de seguidas; ausente/null usa o padrão da UI. */
export function parseMaxConsecutiveLessonsPerClass(value: unknown): number {
  if (value === undefined || value === null) {
    return DEFAULT_MAX_CONSECUTIVE_LESSONS_PER_CLASS;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return DEFAULT_MAX_CONSECUTIVE_LESSONS_PER_CLASS;
  }
  return clampInt(value, MAX_CONSECUTIVE_LESSONS_PER_CLASS_MIN, MAX_CONSECUTIVE_LESSONS_PER_CLASS_MAX);
}
