import { useCallback, useMemo, useState } from "react";
import { readJsonSafe, type SchoolClass } from "@/lib/types";

export function useClasses(showToast: (msg: string, v?: "success" | "error") => void) {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const classSelectOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: c.name })),
    [classes]
  );

  const classNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of classes) m[c.id] = c.name;
    return m;
  }, [classes]);

  const loadClasses = useCallback(async () => {
    const r = await fetch("/api/classes");
    const d = await readJsonSafe<{ ok?: boolean; classes?: SchoolClass[] }>(r);
    if (r.ok && d?.ok) setClasses(d.classes ?? []);
    setIsLoading(false);
  }, []);

  const handleAddClass = useCallback(async () => {
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
  }, [newClassName, loadClasses, showToast]);

  const runDeleteClass = useCallback(async (classId: string) => {
    const r = await fetch(`/api/classes?id=${classId}`, { method: "DELETE" });
    const d = await readJsonSafe<{ ok?: boolean; error?: string }>(r);
    if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao excluir.");
    await loadClasses();
    showToast("Turma excluída.");
  }, [loadClasses, showToast]);

  return {
    classes,
    newClassName,
    setNewClassName,
    isSavingClass,
    isLoading,
    classSelectOptions,
    classNameById,
    loadClasses,
    handleAddClass,
    runDeleteClass,
  };
}
