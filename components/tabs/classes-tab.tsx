"use client";

import { useState } from "react";
import { GraduationCap, Pencil, Plus, Trash2, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { useClasses } from "@/hooks/use-classes";

type ClassesTabProps = {
  classesHook: ReturnType<typeof useClasses>;
  onRequestDelete: (classId: string) => void;
};

export default function ClassesTab({ classesHook: c, onRequestDelete }: ClassesTabProps) {
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditingName("");
  };

  const saveEdit = async () => {
    const name = editingName.trim();
    if (!name || !editingId) return;
    try {
      const r = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: editingId, name })
      });
      const d = await r.json();
      if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao renomear turma.");
      await c.loadClasses();
      cancelEdit();
    } catch {
      /* keep editing state open on error */
    }
  };

  return (
    <div className="animate-fade-in grid grid-cols-1 gap-6 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] lg:items-start">
      <section className="app-panel overflow-hidden">
        <div className="p-5">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Nova turma</p>
          <div className="flex items-center gap-2">
            <Input
              value={c.newClassName}
              onChange={(e) => c.setNewClassName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void c.handleAddClass();
              }}
              placeholder="Ex.: 6ºA, 7ºB"
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              onClick={() => void c.handleAddClass()}
              disabled={!c.newClassName.trim() || c.isSavingClass}
              aria-label="Adicionar turma"
              className="h-9 shrink-0 px-3"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>

      <section className="app-panel overflow-hidden">
        {c.classes.length === 0 ? (
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
              {c.classes.map((cls) => (
                <div
                  key={cls.id}
                  className="group flex items-center gap-3 bg-white px-4 py-3 transition-all duration-200 hover:bg-slate-50/80"
                >
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-600">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </div>

                  {editingId === cls.id ? (
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-7 min-w-0 flex-1 text-sm"
                        autoFocus
                      />
                      <button type="button" onClick={() => void saveEdit()} aria-label="Confirmar" className="rounded-lg p-1 text-emerald-500 hover:bg-emerald-50">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={cancelEdit} aria-label="Cancelar edição" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800" title={cls.name}>
                        {cls.name}
                      </p>
                      <button
                        type="button"
                        aria-label="Renomear turma"
                        onClick={() => startEdit(cls.id, cls.name)}
                        className="rounded-lg p-1.5 text-slate-300 opacity-100 transition-all duration-200 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Excluir turma"
                        onClick={() => onRequestDelete(cls.id)}
                        className="rounded-lg p-1.5 text-slate-300 opacity-100 transition-all duration-200 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
