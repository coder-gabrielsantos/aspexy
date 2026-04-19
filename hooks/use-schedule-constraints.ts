import { useCallback, useMemo, useState } from "react";

import {
  DEFAULT_MAX_CONSECUTIVE_LESSONS_PER_CLASS,
  DEFAULT_MAX_LESSONS_PER_DAY_PER_TEACHER,
  MAX_CONSECUTIVE_LESSONS_PER_CLASS_MAX,
  MAX_CONSECUTIVE_LESSONS_PER_CLASS_MIN,
  MAX_LESSONS_PER_DAY_PER_TEACHER_MAX,
  MAX_LESSONS_PER_DAY_PER_TEACHER_MIN
} from "@/lib/schedule-constraint-defaults";
import { readJsonSafe, type TeacherMutexGroupRow } from "@/lib/types";

function newRowId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function groupsToRows(groups: Array<{ teacherIds: string[] }>): TeacherMutexGroupRow[] {
  return groups.map((g) => ({
    id: newRowId(),
    teacherIds: [...g.teacherIds]
  }));
}

/** Inclui id da linha para detectar listas vazias novas ou remoções antes de salvar. */
function mutexEditorSignature(rows: TeacherMutexGroupRow[]): string {
  return rows.map((r) => `${r.id}:${[...r.teacherIds].sort().join("\0")}`).join("|");
}

function buildConstraintsSnapshot(
  rows: TeacherMutexGroupRow[],
  maxLessonsPerDay: number,
  maxConsecutive: number
): string {
  return `${mutexEditorSignature(rows)}#${maxLessonsPerDay}#${maxConsecutive}`;
}

export function useScheduleConstraints(showToast: (msg: string, v?: "success" | "error") => void) {
  const [groupRows, setGroupRows] = useState<TeacherMutexGroupRow[]>([]);
  const [maxLessonsPerDayPerTeacher, setMaxLessonsPerDayPerTeacher] = useState(
    DEFAULT_MAX_LESSONS_PER_DAY_PER_TEACHER
  );
  const [maxConsecutiveLessonsPerClass, setMaxConsecutiveLessonsPerClass] = useState(
    DEFAULT_MAX_CONSECUTIVE_LESSONS_PER_CLASS
  );
  const [committedSnapshot, setCommittedSnapshot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadConstraints = useCallback(async () => {
    let nextRows: TeacherMutexGroupRow[] = [];
    let nextMax = DEFAULT_MAX_LESSONS_PER_DAY_PER_TEACHER;
    let nextConsec = DEFAULT_MAX_CONSECUTIVE_LESSONS_PER_CLASS;

    try {
      const r = await fetch("/api/schedule-constraints", { credentials: "same-origin" });
      const d = await readJsonSafe<{
        ok?: boolean;
        teacherMutexGroups?: Array<{ teacherIds: string[] }>;
        maxLessonsPerDayPerTeacher?: number;
        maxConsecutiveLessonsPerClass?: number;
        error?: string;
      }>(r);

      if (r.ok && d?.ok === true) {
        if (Array.isArray(d.teacherMutexGroups)) {
          nextRows = groupsToRows(d.teacherMutexGroups);
        }
        if (typeof d.maxLessonsPerDayPerTeacher === "number" && Number.isInteger(d.maxLessonsPerDayPerTeacher)) {
          nextMax = d.maxLessonsPerDayPerTeacher;
        }
        if (typeof d.maxConsecutiveLessonsPerClass === "number" && Number.isInteger(d.maxConsecutiveLessonsPerClass)) {
          nextConsec = d.maxConsecutiveLessonsPerClass;
        }
      } else if (!r.ok) {
        showToast(d?.error ?? `Não foi possível carregar as regras (HTTP ${r.status}).`, "error");
      }
    } catch {
      showToast("Falha de rede ao carregar as regras.", "error");
    } finally {
      setGroupRows(nextRows);
      setMaxLessonsPerDayPerTeacher(nextMax);
      setMaxConsecutiveLessonsPerClass(nextConsec);
      setCommittedSnapshot(buildConstraintsSnapshot(nextRows, nextMax, nextConsec));
      setIsLoading(false);
    }
  }, [showToast]);

  const discardConstraintsChanges = useCallback(async () => {
    await loadConstraints();
  }, [loadConstraints]);

  const addGroupRow = useCallback(() => {
    setGroupRows((prev) => [...prev, { id: newRowId(), teacherIds: [] }]);
  }, []);

  const updateGroupTeacherIds = useCallback((id: string, teacherIds: string[]) => {
    setGroupRows((prev) => prev.map((row) => (row.id === id ? { ...row, teacherIds } : row)));
  }, []);

  const removeGroupRow = useCallback((id: string) => {
    setGroupRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const saveConstraints = useCallback(async (): Promise<boolean> => {
    const mutexPayload = groupRows
      .map((r) => ({ teacherIds: r.teacherIds }))
      .filter((g) => g.teacherIds.length >= 2);

    const cap = Math.min(
      MAX_LESSONS_PER_DAY_PER_TEACHER_MAX,
      Math.max(MAX_LESSONS_PER_DAY_PER_TEACHER_MIN, Math.trunc(maxLessonsPerDayPerTeacher))
    );
    const consec = Math.min(
      MAX_CONSECUTIVE_LESSONS_PER_CLASS_MAX,
      Math.max(MAX_CONSECUTIVE_LESSONS_PER_CLASS_MIN, Math.trunc(maxConsecutiveLessonsPerClass))
    );

    setIsSaving(true);
    try {
      const r = await fetch("/api/schedule-constraints", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherMutexGroups: mutexPayload,
          maxLessonsPerDayPerTeacher: cap,
          maxConsecutiveLessonsPerClass: consec
        })
      });
      const d = await readJsonSafe<{
        ok?: boolean;
        teacherMutexGroups?: typeof mutexPayload;
        maxLessonsPerDayPerTeacher?: number;
        maxConsecutiveLessonsPerClass?: number;
        error?: string;
      }>(r);
      if (!r.ok) {
        throw new Error(d?.error ?? `Falha ao salvar regras (HTTP ${r.status}).`);
      }
      if (d == null) {
        throw new Error("Resposta inválida do servidor ao salvar.");
      }
      if (d.ok !== true) {
        throw new Error(typeof d.error === "string" ? d.error : "Falha ao salvar regras.");
      }

      const nextRows = Array.isArray(d.teacherMutexGroups) ? groupsToRows(d.teacherMutexGroups) : groupRows;
      const nextCap = typeof d.maxLessonsPerDayPerTeacher === "number" ? d.maxLessonsPerDayPerTeacher : cap;
      const nextConsec = typeof d.maxConsecutiveLessonsPerClass === "number" ? d.maxConsecutiveLessonsPerClass : consec;

      setGroupRows(nextRows);
      setMaxLessonsPerDayPerTeacher(nextCap);
      setMaxConsecutiveLessonsPerClass(nextConsec);
      setCommittedSnapshot(buildConstraintsSnapshot(nextRows, nextCap, nextConsec));
      showToast("Regras salvas.", "success");
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao salvar.", "error");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [groupRows, maxLessonsPerDayPerTeacher, maxConsecutiveLessonsPerClass, showToast]);

  const isConstraintsDirty = useMemo(() => {
    if (committedSnapshot === null) return false;
    return (
      buildConstraintsSnapshot(groupRows, maxLessonsPerDayPerTeacher, maxConsecutiveLessonsPerClass) !==
      committedSnapshot
    );
  }, [committedSnapshot, groupRows, maxLessonsPerDayPerTeacher, maxConsecutiveLessonsPerClass]);

  return {
    groupRows,
    setGroupRows,
    maxLessonsPerDayPerTeacher,
    setMaxLessonsPerDayPerTeacher,
    maxConsecutiveLessonsPerClass,
    setMaxConsecutiveLessonsPerClass,
    isLoading,
    isSaving,
    isConstraintsDirty,
    loadConstraints,
    discardConstraintsChanges,
    addGroupRow,
    updateGroupTeacherIds,
    removeGroupRow,
    saveConstraints
  };
}
