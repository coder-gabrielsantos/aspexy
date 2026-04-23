"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, FolderTree, LayoutGrid, Pencil, Plus, Trash2, Users, X } from "lucide-react";

import AvailabilityGrid from "@/components/availability-grid";
import ScheduleSelect from "@/components/schedule-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { useTeachers } from "@/hooks/use-teachers";
import type { useTeacherScheduleGroups } from "@/hooks/use-teacher-schedule-groups";

type TeachersTabProps = {
  teachersHook: ReturnType<typeof useTeachers>;
  groupsHook: ReturnType<typeof useTeacherScheduleGroups>;
  structureSelectOptions: Array<{ value: string; label: string }>;
  onRequestDelete: () => void;
  onRequestDeleteGroup: () => void;
  showToast: (msg: string, v?: "success" | "error") => void;
};

type Mode = "teachers" | "groups";

export default function TeachersTab({
  teachersHook: t,
  groupsHook: g,
  structureSelectOptions,
  onRequestDelete,
  onRequestDeleteGroup,
  showToast,
}: TeachersTabProps) {
  const [mode, setMode] = useState<Mode>("teachers");

  // Professor rename state
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [maxDayDraft, setMaxDayDraft] = useState("");

  // Group rename state
  const [editingGroupId, setEditingGroupId] = useState("");
  const [editingGroupName, setEditingGroupName] = useState("");
  const [groupMaxDayDraft, setGroupMaxDayDraft] = useState("");

  useEffect(() => {
    const st = t.selectedTeacher;
    if (!st) {
      setMaxDayDraft("");
      return;
    }
    setMaxDayDraft(st.max_lessons_per_day != null ? String(st.max_lessons_per_day) : "");
  }, [t.selectedTeacher]);

  useEffect(() => {
    const sg = g.selectedGroup;
    if (!sg) {
      setGroupMaxDayDraft("");
      return;
    }
    setGroupMaxDayDraft(sg.max_lessons_per_day != null ? String(sg.max_lessons_per_day) : "");
  }, [g.selectedGroup]);

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

  const startEditGroup = (id: string, name: string) => {
    setEditingGroupId(id);
    setEditingGroupName(name);
  };
  const cancelEditGroup = () => {
    setEditingGroupId("");
    setEditingGroupName("");
  };
  const saveEditGroup = async () => {
    const name = editingGroupName.trim();
    if (!name || !editingGroupId) return;
    const ok = await g.renameGroup(editingGroupId, name);
    if (ok) cancelEditGroup();
  };

  // Opções para o editor de membros de um grupo: marca membros de outros grupos com "(mover de {grupo})".
  const memberOptionsForSelectedGroup = useMemo(() => {
    const current = g.selectedGroup;
    return t.teacherSelectOptions.map((opt) => {
      const group = g.groupByTeacherId[opt.value];
      if (!group || (current && group.id === current.id)) return opt;
      return { value: opt.value, label: `${opt.label} (mover de ${group.name})` };
    });
  }, [t.teacherSelectOptions, g.groupByTeacherId, g.selectedGroup]);

  const selectedTeacherGroup = t.selectedTeacher ? g.groupByTeacherId[t.selectedTeacher.id] ?? null : null;

  return (
    <div className="animate-fade-in space-y-6">
      <div
        role="tablist"
        aria-label="Alternar entre Professores e Agrupamentos"
        className="relative inline-grid h-8 w-max max-w-full grid-cols-2 items-stretch rounded-full bg-slate-100/95 p-0.5 sm:h-9"
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 w-[calc(50%-2px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none",
            mode === "groups" ? "translate-x-full" : "translate-x-0"
          )}
        />
        <button
          type="button"
          role="tab"
          aria-selected={mode === "teachers"}
          onClick={() => setMode("teachers")}
          className={cn(
            "relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors duration-200 sm:px-3.5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 focus-visible:ring-offset-2",
            mode === "teachers"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Users
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              mode === "teachers" ? "text-indigo-500" : "text-slate-400"
            )}
          />
          Professores
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "groups"}
          onClick={() => setMode("groups")}
          className={cn(
            "relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors duration-200 sm:px-3.5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 focus-visible:ring-offset-2",
            mode === "groups"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <FolderTree
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              mode === "groups" ? "text-indigo-500" : "text-slate-400"
            )}
          />
          Agrupamentos
        </button>
      </div>

      {mode === "teachers" ? (
        t.teachers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200/90 bg-white/80 p-12 text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-slate-200/80 bg-slate-50">
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600">Nenhum professor cadastrado</p>
            <p className="mt-0.5 text-xs text-slate-400">Cadastre um professor para começar.</p>
            <div className="mx-auto mt-4 flex w-full max-w-md gap-2">
              <Input
                value={t.newTeacherName}
                onChange={(e) => t.setNewTeacherName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void t.handleAddTeacher(); }}
                placeholder="Nome do professor"
                className="min-w-0 flex-1 bg-white"
              />
              <Button
                type="button"
                onClick={() => void t.handleAddTeacher()}
                disabled={!t.newTeacherName.trim() || t.isSavingTeacher}
                aria-label="Adicionar professor"
                className="h-11 min-h-11 shrink-0 px-3"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="app-panel-flat overflow-hidden">
            <div className="grid max-h-[min(40rem,75vh)] grid-cols-1 overflow-y-auto lg:h-[min(40rem,75vh)] lg:max-h-none lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] lg:overflow-hidden">
              <aside className="flex min-h-0 flex-col border-b border-slate-200/80 lg:h-full lg:border-b-0 lg:border-r">
                <div className="shrink-0 border-b border-slate-100/80 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Professores
                  </p>
                </div>
                <div className="shrink-0 border-b border-slate-100/80 px-3 py-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Novo professor</p>
                  <div className="flex gap-2">
                    <Input
                      value={t.newTeacherName}
                      onChange={(e) => t.setNewTeacherName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void t.handleAddTeacher(); }}
                      placeholder="Nome do professor"
                      className="h-9 min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => void t.handleAddTeacher()}
                      disabled={!t.newTeacherName.trim() || t.isSavingTeacher}
                      aria-label="Adicionar professor"
                      className="h-9 shrink-0 px-3"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
                  {t.teachers.map((teacher) => {
                    const group = g.groupByTeacherId[teacher.id];
                    return (
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
                              {group ? (
                                <span
                                  className="ml-1 hidden shrink-0 items-center gap-1 rounded-md border border-indigo-200/80 bg-indigo-50/80 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 sm:inline-flex"
                                  title={`No agrupamento ${group.name}`}
                                >
                                  <FolderTree className="h-3 w-3" aria-hidden />
                                  <span className="max-w-[6rem] truncate">{group.name}</span>
                                </span>
                              ) : null}
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
                    );
                  })}
                </div>
              </aside>

              <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
                {!t.selectedTeacher ? (
                  <div className="flex min-h-[10rem] flex-1 items-center justify-center p-6 text-center lg:min-h-0">
                    <p className="text-sm text-slate-400">Selecione um professor para editar a disponibilidade.</p>
                  </div>
                ) : (
                  <>
                    <div className="shrink-0 space-y-2.5 border-b border-slate-200 bg-slate-100 px-3 py-2 sm:px-4">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="min-w-0 truncate text-sm font-semibold tracking-tight text-slate-800">
                            {t.selectedTeacher.name}
                          </p>
                          {selectedTeacherGroup ? (
                            <button
                              type="button"
                              onClick={() => {
                                g.setSelectedGroupId(selectedTeacherGroup.id);
                                setMode("groups");
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-indigo-200/80 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                              title="Abrir agrupamento"
                            >
                              <FolderTree className="h-3 w-3" aria-hidden />
                              No agrupamento {selectedTeacherGroup.name}
                            </button>
                          ) : null}
                        </div>
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
                      <div className="w-full sm:w-[min(100%,18rem)]">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Estrutura de horário
                        </p>
                        <ScheduleSelect
                          aria-label="Selecionar estrutura para disponibilidade"
                          options={structureSelectOptions}
                          value={t.teacherStructureId}
                          onChange={(id) => void t.handleLoadStructureForTeacher(id)}
                          placeholder="Selecione uma estrutura"
                        />
                      </div>
                    </div>
                    {!t.teacherStructureId || t.teacherSlots.length === 0 ? (
                      <div className="flex min-h-[8rem] flex-1 flex-col items-center justify-center gap-2 p-6 text-center lg:min-h-0">
                        <LayoutGrid className="h-5 w-5 text-slate-300" />
                        <p className="text-xs text-slate-400">
                          Selecione uma estrutura de horário para definir a disponibilidade.
                        </p>
                      </div>
                    ) : (
                      <AvailabilityGrid
                        slots={t.teacherSlots}
                        getState={t.teacherSlotState}
                        onToggle={t.toggleTeacherSlotState}
                        onApplyBulk={t.applyTeacherSlotsBulk}
                      />
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        )
      ) : g.groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200/90 bg-white/80 p-12 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-slate-200/80 bg-slate-50">
            <FolderTree className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Nenhum agrupamento cadastrado</p>
          <p className="mt-0.5 text-xs text-slate-400">Crie um agrupamento para aplicar restrições em lote.</p>
          <div className="mx-auto mt-4 w-full max-w-md text-left">
            <p className="mb-1.5 text-xs font-medium text-slate-500">Novo agrupamento</p>
            <div className="flex gap-2">
              <Input
                value={g.newGroupName}
                onChange={(e) => g.setNewGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void g.handleAddGroup(); }}
                placeholder="Ex.: Base técnica"
                className="min-w-0 flex-1 bg-white"
              />
              <Button
                type="button"
                onClick={() => void g.handleAddGroup()}
                disabled={!g.newGroupName.trim() || g.isSavingGroup}
                aria-label="Adicionar agrupamento"
                className="h-11 min-h-11 shrink-0 px-3"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="app-panel-flat overflow-hidden">
          <div className="grid max-h-[min(40rem,75vh)] grid-cols-1 overflow-y-auto lg:h-[min(40rem,75vh)] lg:max-h-none lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] lg:overflow-hidden">
            <aside className="flex min-h-0 flex-col border-b border-slate-200/80 lg:h-full lg:border-b-0 lg:border-r">
              <div className="shrink-0 border-b border-slate-100/80 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500">
                  Agrupamentos
                </p>
              </div>
              <div className="shrink-0 space-y-2.5 border-b border-slate-100/80 px-3 py-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Novo agrupamento</p>
                  <div className="flex gap-2">
                    <Input
                      value={g.newGroupName}
                      onChange={(e) => g.setNewGroupName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void g.handleAddGroup(); }}
                      placeholder="Ex.: Base técnica"
                      className="h-9 min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => void g.handleAddGroup()}
                      disabled={!g.newGroupName.trim() || g.isSavingGroup}
                      aria-label="Adicionar agrupamento"
                      className="h-9 shrink-0 px-3"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
                {g.groups.map((group) => (
                  <div
                    key={group.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-none px-2 py-2 transition-colors duration-150",
                      group.id === g.selectedGroupId ? "bg-slate-100" : "hover:bg-slate-50/80"
                    )}
                  >
                    {editingGroupId === group.id ? (
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <Input
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveEditGroup();
                            if (e.key === "Escape") cancelEditGroup();
                          }}
                          className="h-7 min-w-0 flex-1 rounded-none text-sm"
                          autoFocus
                        />
                        <button type="button" onClick={() => void saveEditGroup()} aria-label="Confirmar" className="rounded-none p-1 text-slate-700 hover:bg-slate-100">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={cancelEditGroup} aria-label="Cancelar edição" className="rounded-none p-1 text-slate-400 hover:bg-slate-100">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => g.setSelectedGroupId(group.id === g.selectedGroupId ? "" : group.id)}
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-2.5 text-left text-sm font-medium transition-colors duration-200",
                            group.id === g.selectedGroupId ? "text-slate-900" : "text-slate-700"
                          )}
                        >
                          <div className={cn(
                            "grid h-7 w-7 shrink-0 place-items-center rounded-none border transition-colors duration-150",
                            group.id === g.selectedGroupId
                              ? "border-indigo-600 bg-gradient-to-br from-indigo-700 to-indigo-800 text-white shadow-sm shadow-indigo-950/10"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          )}>
                            <FolderTree className="h-3.5 w-3.5" />
                          </div>
                          <span className="min-w-0 flex-1 truncate" title={group.name}>
                            {group.name}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label="Renomear agrupamento"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditGroup(group.id, group.name);
                          }}
                          className="rounded-none p-1.5 text-slate-300 opacity-100 transition-all duration-200 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Excluir agrupamento"
                          onClick={(e) => {
                            e.stopPropagation();
                            g.setSelectedGroupId(group.id);
                            onRequestDeleteGroup();
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
              {!g.selectedGroup ? (
                <div className="flex min-h-[10rem] flex-1 items-center justify-center p-6 text-center lg:min-h-0">
                  <p className="text-sm text-slate-400">Selecione um agrupamento para editar membros e disponibilidade.</p>
                </div>
              ) : (
                <>
                  <div className="shrink-0 space-y-2.5 border-b border-slate-200 bg-slate-100 px-3 py-2 sm:px-4">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <p className="min-w-0 truncate text-sm font-semibold tracking-tight text-slate-800">
                        {g.selectedGroup.name}
                      </p>
                      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                        <label
                          htmlFor="group-max-day"
                          className="flex shrink-0 flex-wrap items-baseline gap-x-1 gap-y-0 text-[11px] font-medium uppercase tracking-wide text-slate-500"
                        >
                          <span>Máx. aulas/dia</span>
                          <span className="font-semibold normal-case tracking-normal text-slate-400">(opcional)</span>
                        </label>
                        <Input
                          id="group-max-day"
                          type="number"
                          min={1}
                          max={20}
                          inputMode="numeric"
                          title="Opcional. Aplica a todos os professores do agrupamento (a menos que o professor tenha limite próprio)."
                          className="h-8 w-[3.25rem] shrink-0 rounded-md border-slate-200/90 bg-white px-1.5 text-center text-xs tabular-nums shadow-none focus-visible:ring-1 sm:w-12"
                          placeholder=""
                          value={groupMaxDayDraft}
                          onChange={(e) => setGroupMaxDayDraft(e.target.value)}
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
                          disabled={g.isSavingGroup || !g.selectedGroup}
                          onClick={() => {
                            if (!g.selectedGroup) return;
                            const trimmed = groupMaxDayDraft.trim();
                            if (trimmed === "") {
                              void g.saveGroupMaxLessonsPerDay(g.selectedGroup.id, null);
                              return;
                            }
                            const n = Number.parseInt(trimmed, 10);
                            if (Number.isNaN(n) || n < 1 || n > 20) {
                              showToast("Use um número entre 1 e 20, ou deixe vazio para o padrão.", "error");
                              return;
                            }
                            void g.saveGroupMaxLessonsPerDay(g.selectedGroup.id, n);
                          }}
                        >
                          <Check className="h-3.5 w-3.5 opacity-90" strokeWidth={2.5} aria-hidden />
                          Aplicar
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
                      <div className="min-w-0">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Membros
                        </p>
                        <ScheduleSelect
                          isMulti
                          aria-label="Membros do agrupamento"
                          options={memberOptionsForSelectedGroup}
                          value={g.selectedGroup.teacher_ids}
                          onChange={(ids) => {
                            if (!g.selectedGroup) return;
                            void g.saveGroupMembers(g.selectedGroup.id, ids);
                          }}
                          placeholder={t.teachers.length === 0 ? "Cadastre professores primeiro" : "Adicionar professores"}
                          isSearchable={false}
                          maxVisibleMenuItems={6}
                          maxVisibleSelectedValues={4}
                          multiValueSeparator="comma"
                          multiValueDisplay="text"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Estrutura de horário
                        </p>
                        <ScheduleSelect
                          aria-label="Selecionar estrutura para o agrupamento"
                          options={structureSelectOptions}
                          value={g.groupStructureId}
                          onChange={(id) => void g.handleLoadStructureForGroup(id)}
                          placeholder="Selecione uma estrutura"
                        />
                      </div>
                    </div>
                  </div>

                  {!g.groupStructureId || g.groupSlots.length === 0 ? (
                    <div className="flex min-h-[10rem] flex-1 flex-col items-center justify-center gap-3 p-6 text-center lg:min-h-0">
                      <div className="grid h-10 w-10 place-items-center rounded-none border border-slate-200/80 bg-slate-50">
                        <LayoutGrid className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Estrutura não selecionada</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Selecione uma estrutura para editar as restrições de <span className="font-medium text-slate-600">{g.selectedGroup.name}</span>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <AvailabilityGrid
                      slots={g.groupSlots}
                      getState={g.groupSlotState}
                      onToggle={g.toggleGroupSlotState}
                      onApplyBulk={g.applyGroupSlotsBulk}
                    />
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
