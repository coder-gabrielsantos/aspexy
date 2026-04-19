import { useCallback, useState } from "react";

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

export function useScheduleConstraints(showToast: (msg: string, v?: "success" | "error") => void) {
  const [groupRows, setGroupRows] = useState<TeacherMutexGroupRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadConstraints = useCallback(async () => {
    const r = await fetch("/api/schedule-constraints");
    const d = await readJsonSafe<{
      ok?: boolean;
      teacherMutexGroups?: Array<{ teacherIds: string[] }>;
    }>(r);
    if (r.ok && d?.ok && Array.isArray(d.teacherMutexGroups)) {
      setGroupRows(groupsToRows(d.teacherMutexGroups));
    } else {
      setGroupRows([]);
    }
    setIsLoading(false);
  }, []);

  const addGroupRow = useCallback(() => {
    setGroupRows((prev) => [...prev, { id: newRowId(), teacherIds: [] }]);
  }, []);

  const updateGroupTeacherIds = useCallback((id: string, teacherIds: string[]) => {
    setGroupRows((prev) => prev.map((row) => (row.id === id ? { ...row, teacherIds } : row)));
  }, []);

  const removeGroupRow = useCallback((id: string) => {
    setGroupRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const saveConstraints = useCallback(async () => {
    const payload = groupRows
      .map((r) => ({ teacherIds: r.teacherIds }))
      .filter((g) => g.teacherIds.length >= 2);

    setIsSaving(true);
    try {
      const r = await fetch("/api/schedule-constraints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherMutexGroups: payload })
      });
      const d = await readJsonSafe<{ ok?: boolean; teacherMutexGroups?: typeof payload; error?: string }>(r);
      if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao salvar regras.");
      if (Array.isArray(d.teacherMutexGroups)) {
        setGroupRows(groupsToRows(d.teacherMutexGroups));
      }
      showToast("Regras salvas.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao salvar.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [groupRows, showToast]);

  return {
    groupRows,
    setGroupRows,
    isLoading,
    isSaving,
    loadConstraints,
    addGroupRow,
    updateGroupTeacherIds,
    removeGroupRow,
    saveConstraints
  };
}
