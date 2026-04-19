"use client";

import { useEffect, useState } from "react";
import { Check, LayoutGrid, Pencil, Trash2, UserPlus, Users, X } from "lucide-react";

import ScheduleSelect from "@/components/schedule-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DAYS, teacherSlotLabelMap, type TeacherSlotState } from "@/lib/types";
import type { useTeachers } from "@/hooks/use-teachers";

type TeachersTabProps = {
  teachersHook: ReturnType<typeof useTeachers>;
  structureSelectOptions: Array<{ value: string; label: string }>;
  onRequestDelete: () => void;
  showToast: (msg: string, v?: "success" | "error") => void;
};

export default function TeachersTab({ teachersHook: t, structureSelectOptions, onRequestDelete, showToast }: TeachersTabProps) {
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [maxDayDraft, setMaxDayDraft] = useState("");

  useEffect(() => {
    const st = t.selectedTeacher;
    if (!st) {
      setMaxDayDraft("");
      return;
    }
    setMaxDayDraft(st.max_lessons_per_day != null ? String(st.max_lessons_per_day) : "");
  }, [t.selectedTeacher]);

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
      const r = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: editingId, name })
      });
      const d = await r.json();
      if (!r.ok || !d?.ok) throw new Error(d?.error ?? "Falha ao renomear professor.");
      await t.loadTeachers();
      cancelEdit();
    } catch {
      /* keep editing state open on error */
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <section className="app-panel overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-xs font-medium text-slate-500">Novo professor</p>
            <div className="flex gap-2">
              <Input
                value={t.newTeacherName}
                onChange={(e) => t.setNewTeacherName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void t.handleAddTeacher(); }}
                placeholder="Nome do professor"
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                onClick={() => void t.handleAddTeacher()}
                disabled={!t.newTeacherName.trim() || t.isSavingTeacher}
                aria-label="Adicionar professor"
                className="h-9 shrink-0 px-3"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="w-full shrink-0 sm:w-[min(100%,18rem)] sm:self-end">
            <p className="mb-1.5 text-xs font-medium text-slate-500">Estrutura de horário</p>
            <ScheduleSelect
              aria-label="Selecionar estrutura para disponibilidade"
              options={structureSelectOptions}
              value={t.teacherStructureId}
              onChange={(id) => void t.handleLoadStructureForTeacher(id)}
              placeholder="Selecione uma estrutura"
            />
          </div>
        </div>
      </section>

      {t.teachers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200/90 bg-white/80 p-12 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-slate-200/80 bg-slate-50">
            <Users className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Nenhum professor cadastrado</p>
          <p className="mt-0.5 text-xs text-slate-400">Adicione acima para começar.</p>
        </div>
      ) : (
        <div className="app-panel-flat overflow-hidden">
          <div className="grid max-h-[min(32rem,60vh)] grid-cols-1 overflow-y-auto lg:h-[min(32rem,60vh)] lg:max-h-none lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] lg:overflow-hidden">
            <aside className="flex min-h-0 flex-col border-b border-slate-200/80 lg:h-full lg:border-b-0 lg:border-r">
              <div className="shrink-0 border-b border-slate-100/80 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500">
                  Professores ({t.teachers.length})
                </p>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
                {t.teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-none px-2 py-2 transition-colors duration-150",
                      teacher.id === t.selectedTeacherId ? "bg-slate-100" : "hover:bg-slate-50/80"
                    )}
                  >
                    {editingId === teacher.id ? (
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="h-7 min-w-0 flex-1 rounded-none text-sm"
                          autoFocus
                        />
                        <button type="button" onClick={() => void saveEdit()} aria-label="Confirmar" className="rounded-none p-1 text-slate-700 hover:bg-slate-100">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={cancelEdit} aria-label="Cancelar edição" className="rounded-none p-1 text-slate-400 hover:bg-slate-100">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => t.setSelectedTeacherId(teacher.id === t.selectedTeacherId ? "" : teacher.id)}
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-2.5 text-left text-sm font-medium transition-colors duration-200",
                            teacher.id === t.selectedTeacherId ? "text-slate-900" : "text-slate-700"
                          )}
                        >
                              <div className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-none border transition-colors duration-150",
                                teacher.id === t.selectedTeacherId
                                  ? "border-indigo-600 bg-gradient-to-br from-indigo-700 to-indigo-800 text-white shadow-sm shadow-indigo-950/10"
                                  : "border-slate-200 bg-slate-50 text-slate-500"
                              )}>
                            <Users className="h-3.5 w-3.5" />
                          </div>
                          <span className="min-w-0 flex-1 truncate" title={teacher.name}>
                            {teacher.name}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label="Renomear professor"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(teacher.id, teacher.name);
                          }}
                          className="rounded-none p-1.5 text-slate-300 opacity-100 transition-all duration-200 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Excluir professor"
                          onClick={(e) => {
                            e.stopPropagation();
                            t.setSelectedTeacherId(teacher.id);
                            onRequestDelete();
                          }}
                          className="rounded-none p-1.5 text-slate-300 opacity-100 transition-all duration-200 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </aside>

            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
              {!t.selectedTeacher ? (
                <div className="flex min-h-[10rem] flex-1 items-center justify-center p-6 text-center lg:min-h-0">
                  <p className="text-sm text-slate-400">Selecione um professor para editar a disponibilidade.</p>
                </div>
              ) : !t.teacherStructureId || t.teacherSlots.length === 0 ? (
                <div className="flex min-h-[10rem] flex-1 flex-col items-center justify-center gap-3 p-6 text-center lg:min-h-0">
                  <div className="grid h-10 w-10 place-items-center rounded-none border border-slate-200/80 bg-slate-50">
                    <LayoutGrid className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Estrutura não selecionada</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Selecione uma estrutura de horário acima para definir a disponibilidade de <span className="font-medium text-slate-600">{t.selectedTeacher.name}</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="shrink-0 border-b border-slate-200 bg-slate-100 px-3 py-2 sm:px-4">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <p className="min-w-0 truncate text-sm font-semibold tracking-tight text-slate-800">
                        {t.selectedTeacher.name}
                      </p>
                      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                        <label
                          htmlFor="teacher-max-day"
                          className="flex shrink-0 flex-wrap items-baseline gap-x-1 gap-y-0 text-[11px] font-medium uppercase tracking-wide text-slate-500"
                        >
                          <span>Máx. aulas/dia</span>
                          <span className="font-semibold normal-case tracking-normal text-slate-400">(opcional)</span>
                        </label>
                        <Input
                          id="teacher-max-day"
                          type="number"
                          min={1}
                          max={20}
                          inputMode="numeric"
                          title="Opcional. Vazio = limite da aba Regras. Número de 1 a 20 só para este professor."
                          className="h-8 w-[3.25rem] shrink-0 rounded-md border-slate-200/90 bg-white px-1.5 text-center text-xs tabular-nums shadow-none focus-visible:ring-1 sm:w-12"
                          placeholder=""
                          value={maxDayDraft}
                          onChange={(e) => setMaxDayDraft(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 shrink-0 gap-1 px-3 text-xs font-semibold text-indigo-950",
                            "border border-indigo-400/70 bg-white",
                            "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_1px_2px_rgba(67,56,202,0.12)]",
                            "transition-[border-color,box-shadow,background-color,color] duration-200",
                            "hover:border-indigo-500 hover:bg-indigo-50/95 hover:shadow-[0_2px_12px_rgba(79,70,229,0.18)]",
                            "focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100",
                            "disabled:border-slate-200 disabled:bg-slate-50/80 disabled:text-slate-400 disabled:shadow-none"
                          )}
                          title="Aplicar limite"
                          disabled={t.isSavingTeacher || !t.selectedTeacher}
                          onClick={() => {
                            if (!t.selectedTeacher) return;
                            const trimmed = maxDayDraft.trim();
                            if (trimmed === "") {
                              void t.saveTeacherMaxLessonsPerDay(t.selectedTeacher.id, null);
                              return;
                            }
                            const n = Number.parseInt(trimmed, 10);
                            if (Number.isNaN(n) || n < 1 || n > 20) {
                              showToast("Use um número entre 1 e 20, ou deixe vazio para o padrão.", "error");
                              return;
                            }
                            void t.saveTeacherMaxLessonsPerDay(t.selectedTeacher.id, n);
                          }}
                        >
                          <Check className="h-3.5 w-3.5 opacity-90" strokeWidth={2.5} aria-hidden />
                          Aplicar
                        </Button>
                      </div>
                    </div>
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
                          <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Horário
                          </th>
                          {DAYS.map((day) => (
                            <th
                              key={day}
                              className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
                            >
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {t.teacherSlots.map((slot, si) => {
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
                                const slotState: TeacherSlotState = t.teacherSlotState(di, si);
                                return (
                                  <td key={`${slot.id}-${DAYS[di]}`} className="border-b border-slate-100/80 px-1.5 py-2 align-middle">
                                    <button
                                      type="button"
                                      onClick={() => void t.toggleTeacherSlotState(di, si)}
                                      aria-label={`${teacherSlotLabelMap[slotState]} — clique para alternar`}
                                      className={cn(
                                        "box-border flex h-9 w-full items-center justify-center rounded-none text-[10px] font-semibold tracking-wide transition-colors duration-200",
                                        slotState === "available" &&
                                          "bg-slate-50 text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-100",
                                        slotState === "preference" &&
                                          "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80 hover:bg-emerald-100/90",
                                        slotState === "unavailable" &&
                                          "bg-rose-50 text-rose-600 ring-1 ring-rose-200/80 hover:bg-rose-100"
                                      )}
                                    >
                                      {teacherSlotLabelMap[slotState]}
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
                  <div
                    className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-500"
                    aria-label="Legenda"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-50 ring-1 ring-slate-200" />
                      Disponível
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-50 ring-1 ring-emerald-200/80" />
                      Preferência
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-50 ring-1 ring-rose-200/80" />
                      Indisponível
                    </span>
                    <span className="hidden items-center gap-1.5 text-slate-400 sm:ml-2 sm:flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                      clique para alternar
                    </span>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
