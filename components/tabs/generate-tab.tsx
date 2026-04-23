"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, GraduationCap, Search, Trash2 } from "lucide-react";

import ConfirmDialog from "@/components/confirm-dialog";
import ScheduleCellEditDialog from "@/components/schedule-cell-edit-dialog";
import ScheduleSelect from "@/components/schedule-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DAYS, DAY_FULL_LABEL, parseTime24ToMinutes, type SolverAllocation, type Subject } from "@/lib/types";
import type { useScheduleGeneration } from "@/hooks/use-schedule-generation";
import type { ScheduleSelectOption } from "@/components/schedule-select";

type GenerateTabProps = {
  generationHook: ReturnType<typeof useScheduleGeneration>;
  structureSelectOptions: Array<{ value: string; label: string }>;
  onRequestDeleteGenerated: () => void;
  teacherSelectOptions: ScheduleSelectOption[];
  subjects: Subject[];
  classNameById: Record<string, string>;
};

type ViewMode = "by-day" | "by-class";

type EditCellState = {
  dayIndex: number;
  rowIndex: number;
  classId: string;
};

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function softMatch(haystack: string, needle: string): boolean {
  const h = normalizeForSearch(haystack);
  const q = normalizeForSearch(needle);
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => h.includes(t));
}

function dayLabelCompact(full: string): string {
  return full.replace(/\s*-\s*feira\b/iu, "").trim();
}

function subjectOptionsForClassName(
  className: string,
  subjects: Subject[],
  classNameById: Record<string, string>
): ScheduleSelectOption[] {
  const seen = new Set<string>();
  const out: ScheduleSelectOption[] = [];
  for (const s of subjects) {
    if (classNameById[s.class_id] !== className) continue;
    if (seen.has(s.name)) continue;
    seen.add(s.name);
    out.push({ value: s.name, label: s.name });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { numeric: true }));
}

export default function GenerateTab({
  generationHook: g,
  structureSelectOptions,
  onRequestDeleteGenerated,
  teacherSelectOptions,
  subjects,
  classNameById
}: GenerateTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("by-day");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [editCell, setEditCell] = useState<EditCellState | null>(null);
  const [search, setSearch] = useState("");
  const [newScheduleName, setNewScheduleName] = useState("");

  const classOptions = g.classIds.map((cid) => ({ value: cid, label: `Turma ${cid}` }));

  const hasResult = g.solverResult && g.classIds.length > 0 && g.viewSlots.length > 0;
  const canEditCells = Boolean(g.selectedGeneratedScheduleId);

  const subjectOptionsEdit = useMemo(
    () => (editCell ? subjectOptionsForClassName(editCell.classId, subjects, classNameById) : []),
    [editCell, subjects, classNameById]
  );

  const allocationAt = (dayIndex: number, rowIndex: number, classId: string) => {
    const slotIndex = g.resolveSlotIndex(rowIndex);
    return g.scheduleByDaySlotClass[`${dayIndex}-${slotIndex}-${classId}`];
  };

  const openEdit = (dayIndex: number, rowIndex: number, classId: string) => {
    if (!canEditCells) return;
    setEditCell({ dayIndex, rowIndex, classId });
  };

  const editTitle = editCell
    ? `${DAY_FULL_LABEL[(DAYS[editCell.dayIndex] ?? "SEG")]} · Turma ${editCell.classId}`
    : "";

  const currentAlloc = editCell ? allocationAt(editCell.dayIndex, editCell.rowIndex, editCell.classId) : undefined;

  return (
    <div className="min-w-0 animate-fade-in space-y-6">
      {/* ── Controls panel ── */}
      <section className="app-panel overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-3.5">
          {/* ── Criar novo horário ── */}
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Criar novo horário
          </p>
          <div className="grid w-full min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-12 sm:gap-3">
            {/* Estrutura base */}
            <div className="min-w-0 sm:col-span-5">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Estrutura base <span className="text-rose-400">*</span>
              </label>
              <ScheduleSelect
                aria-label="Estrutura base para geração"
                options={structureSelectOptions}
                value={g.generationStructureId}
                onChange={(id) => void g.handleLoadStructureForGeneration(id)}
                placeholder="Selecione a estrutura"
              />
            </div>

            {/* Nome do horário */}
            <div className="min-w-0 sm:col-span-5">
              <label htmlFor="new-schedule-name" className="mb-1 block text-xs font-medium text-slate-600">
                Nome do horário <span className="text-rose-400">*</span>
              </label>
              <Input
                id="new-schedule-name"
                value={newScheduleName}
                onChange={(e) => setNewScheduleName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && g.generationProfile && newScheduleName.trim() && !g.isSolving) {
                    e.preventDefault();
                    const ok = await g.handleGenerateSchedule(newScheduleName);
                    if (ok) setNewScheduleName("");
                  }
                }}
                placeholder="Ex.: Integral 2025, manhã"
                className="w-full"
                maxLength={120}
                autoComplete="off"
              />
            </div>

            {/* Ação: coluna mais estreita (2/12) que os campos (5+5) */}
            <div className="min-w-0 sm:col-span-2">
              <div className="mb-1" aria-hidden>
                <span className="invisible block text-xs font-medium">Nome do horário *</span>
              </div>
              <Button
                onClick={async () => {
                  const ok = await g.handleGenerateSchedule(newScheduleName);
                  if (ok) setNewScheduleName("");
                }}
                disabled={g.isSolving || !g.generationProfile || !newScheduleName.trim()}
                className="h-11 w-full gap-1.5 whitespace-nowrap px-2 text-sm sm:px-2.5"
              >
                <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden />
                {g.isSolving ? "Montando horário…" : "Montar horário"}
              </Button>
            </div>
          </div>

          {/* ── Horários salvos ── */}
          <div className="mt-3 border-t border-slate-100/90 pt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Horários salvos
            </p>
            {/* Largura da coluna «Estrutura base» (5/12); excluir colado ao select */}
            <div className="grid w-full min-w-0 sm:grid-cols-12 sm:gap-3">
              <div className="min-w-0 sm:col-span-5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <ScheduleSelect
                      aria-label="Abrir horário salvo"
                      options={g.generatedSelectOptions}
                      value={g.selectedGeneratedScheduleId}
                      onChange={(id) => void g.handleLoadGeneratedSchedule(id)}
                      placeholder="Selecione um horário"
                    />
                  </div>
                  {g.selectedGeneratedScheduleId ? (
                    <Button
                      type="button"
                      onClick={onRequestDeleteGenerated}
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Excluir horário selecionado"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {hasResult ? (
        <div className="min-w-0 space-y-4">
          {/* ── Toolbar: view toggle + class picker + search ── */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View mode: segmented control com indicador deslizante */}
            <div
              className="relative inline-grid h-8 w-max max-w-full grid-cols-2 items-stretch rounded-full bg-slate-100/95 p-0.5 sm:h-9"
              role="group"
              aria-label="Modo de visualização do horário"
            >
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 w-[calc(50%-2px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none",
                  viewMode === "by-class" ? "translate-x-full" : "translate-x-0"
                )}
              />
              <button
                type="button"
                onClick={() => setViewMode("by-day")}
                className={cn(
                  "relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors duration-200 sm:px-3.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 focus-visible:ring-offset-2",
                  viewMode === "by-day" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <CalendarDays
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    viewMode === "by-day" ? "text-indigo-500" : "text-slate-400"
                  )}
                />
                <span className="hidden xs:inline">Por dia</span>
                <span className="xs:hidden">Dia</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("by-class")}
                className={cn(
                  "relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors duration-200 sm:px-3.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 focus-visible:ring-offset-2",
                  viewMode === "by-class" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <GraduationCap
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    viewMode === "by-class" ? "text-indigo-500" : "text-slate-400"
                  )}
                />
                <span className="hidden xs:inline">Por turma</span>
                <span className="xs:hidden">Turma</span>
              </button>
            </div>

            {/* Espaço fixo (h-11 = altura do ScheduleSelect) para não empurrar o conteúdo ao trocar modo */}
            <div className="w-full max-w-[13rem] shrink-0">
              {viewMode === "by-class" ? (
                <div className="animate-fade-in motion-reduce:animate-none">
                  <ScheduleSelect
                    aria-label="Selecionar turma para visualização"
                    options={classOptions}
                    value={selectedClassId || g.classIds[0] || ""}
                    onChange={setSelectedClassId}
                    placeholder="Selecione a turma"
                    isClearable={false}
                    isSearchable={false}
                    maxVisibleMenuItems={5}
                  />
                </div>
              ) : (
                <div className="h-11 w-full max-w-[13rem]" aria-hidden />
              )}
            </div>

            <div className="relative w-full sm:ml-auto sm:max-w-[17rem]">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:left-3 sm:h-4 sm:w-4"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar disciplina ou professor"
                className="h-9 pl-8 text-sm sm:h-10 sm:pl-9"
                aria-label="Buscar disciplina ou professor no horário"
              />
            </div>
          </div>

          {/* ── Table views (key + animação na troca dia/turma) ── */}
          {viewMode === "by-day" ? (
            <div
              key="by-day"
              className="min-w-0 motion-reduce:animate-none animate-fade-in"
            >
              <ByDayView
                g={g}
                allocationAt={allocationAt}
                canEditCells={canEditCells}
                onCellClick={openEdit}
                search={search}
              />
            </div>
          ) : (
            <div
              key="by-class"
              className="min-w-0 motion-reduce:animate-none animate-fade-in"
            >
            <ByClassView
              g={g}
              classId={selectedClassId || g.classIds[0] || ""}
              allocationAt={allocationAt}
              canEditCells={canEditCells}
              onCellClick={openEdit}
              search={search}
            />
            </div>
          )}
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="rounded-xl border border-dashed border-slate-200/90 bg-white/80 p-10 text-center sm:p-12">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-slate-200/80 bg-slate-50">
            <CalendarDays className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">
            Escolha a estrutura, dê um nome ao horário e clique em Montar horário
          </p>
          <p className="mt-1 text-xs text-slate-400">
            A grade aparece aqui após a geração. Para editar, use um horário salvo e clique nas células.
          </p>
        </div>
      )}

      <ScheduleCellEditDialog
        open={editCell !== null}
        onOpenChange={(open) => {
          if (!open) setEditCell(null);
        }}
        title={editTitle}
        teacherOptions={teacherSelectOptions}
        subjectOptions={subjectOptionsEdit}
        initialTeacher={currentAlloc?.teacher ?? ""}
        initialSubject={currentAlloc?.subject ?? ""}
        isPending={g.isSavingCellEdit}
        onSave={async (payload) => {
          if (!editCell) return;
          await g.patchCellAndPersist(editCell.dayIndex, editCell.rowIndex, editCell.classId, payload);
          setEditCell(null);
        }}
      />

      <ConfirmDialog
        alert
        open={g.infeasibleModalOpen}
        onOpenChange={(open) => {
          if (!open) g.dismissInfeasibleModal();
        }}
        title="Não conseguimos montar esse horário"
        description="Nada foi salvo. Vale dar uma olhada em regras, turmas ou disponibilidade dos professores e tentar de novo."
        confirmText="Ok, entendi"
        onConfirm={() => {}}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

type CellHelpers = {
  allocationAt: (dayIndex: number, rowIndex: number, classId: string) => SolverAllocation | undefined;
  canEditCells: boolean;
  onCellClick: (dayIndex: number, rowIndex: number, classId: string) => void;
  search: string;
};

/**
 * Time column widths:
 *  - mobile  : 88px  (compact: "07:00 — 07:50")
 *  - desktop : 136px (full:    "1º" + "07:00 — 07:50")
 *
 * Cell widths:
 *  - mobile  : 108px
 *  - desktop : 140px
 */
const TIME_COL_W = "w-[88px] min-w-[88px] max-w-[88px] sm:w-[136px] sm:min-w-[136px] sm:max-w-[136px]";
const CELL_W = "w-[108px] min-w-[108px] max-w-[108px] sm:w-[140px] sm:min-w-[140px] sm:max-w-[140px]";

// ─────────────────────────────────────────────
// ByDayView
// ─────────────────────────────────────────────

function ByDayView({
  g,
  allocationAt,
  canEditCells,
  onCellClick,
  search
}: {
  g: ReturnType<typeof useScheduleGeneration>;
} & CellHelpers) {
  return (
    <div className="app-panel-flat overflow-hidden rounded-xl border border-slate-200/80 shadow-sm">
      <div className="max-h-[min(72vh,680px)] overflow-auto">
        {DAYS.map((dayName, dayIndex) => (
          <section
            key={dayName}
            className={cn(dayIndex > 0 && "border-t border-slate-200/90")}
          >
            <table
              className="table-fixed border-separate border-spacing-0 text-xs"
              style={{ width: `${88 + g.classIds.length * 108}px` }}
            >
              <thead>
                <tr>
                  <th
                    className={cn(
                      "sticky left-0 top-0 z-[40] border-b border-slate-200 p-0 align-top",
                      TIME_COL_W
                    )}
                  >
                    <div className="box-border flex min-h-[2.25rem] w-full items-center justify-center bg-slate-100 px-2 py-1.5 text-center shadow-[2px_2px_0_0_rgb(226_232_240)] sm:min-h-[2.5rem] sm:px-3">
                      <span
                        className="block min-w-0 max-w-full truncate text-xs font-semibold leading-tight text-slate-600 sm:text-sm"
                        title={DAY_FULL_LABEL[dayName]}
                      >
                        <span className="sm:hidden">{dayLabelCompact(DAY_FULL_LABEL[dayName])}</span>
                        <span className="hidden sm:inline">{DAY_FULL_LABEL[dayName]}</span>
                      </span>
                    </div>
                  </th>
                  {g.classIds.map((cid) => (
                    <th
                      key={`${dayName}-${cid}`}
                      className={cn(
                        "sticky top-0 z-[20] overflow-hidden border-b border-l border-slate-200 p-0 align-top",
                        CELL_W
                      )}
                    >
                      <div className="box-border flex min-h-[2.25rem] w-full items-center justify-center bg-slate-100 px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-[0_2px_0_0_rgb(226_232_240)] sm:min-h-[2.5rem] sm:px-3 sm:text-xs">
                        <span className="block truncate" title={`Turma ${cid}`}>
                          <span className="sm:hidden">{cid}</span>
                          <span className="hidden sm:inline">Turma {cid}</span>
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {g.viewSlots.map((slot, si) => {
                  const cellState = slot.cells[dayIndex];
                  const isBreak = cellState === "break";
                  const fixedLabel = slot.fixedLabels[dayIndex] ?? "RESERVADO";
                  const isLessonSlot = cellState === "lesson";
                  const slotOrdinal = g.viewSlots
                    .slice(0, si + 1)
                    .filter((vs) => vs.cells[dayIndex] !== "break").length;
                  const startM = parseTime24ToMinutes(slot.start);
                  const endM = parseTime24ToMinutes(slot.end);
                  const dur = startM !== null && endM !== null ? endM - startM : 0;
                  const brk = dur >= 60 ? "Almoço" : "Intervalo";

                  return (
                    <tr
                      key={`${dayName}-${slot.id}`}
                      className={cn(
                        isBreak
                          ? "break-stripes bg-slate-50/60"
                          : "hover:bg-indigo-50/20 transition-colors"
                      )}
                    >
                      {/* Time cell */}
                      <td
                        className={cn(
                          "sticky left-0 z-[10] whitespace-nowrap border-b border-slate-100/90 px-1.5 align-middle tabular-nums shadow-[2px_0_0_0_rgba(15,23,42,0.05)] sm:px-2",
                          TIME_COL_W,
                          isBreak
                            ? "bg-slate-100/80 py-1.5 text-center text-slate-400"
                            : "bg-slate-50 py-1.5 text-center text-slate-700"
                        )}
                      >
                        {isBreak ? (
                          <span className="inline-flex min-h-[2rem] w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium leading-tight sm:min-h-[2.25rem] sm:text-xs">
                            <span className="text-slate-400">{brk}</span>
                            <span className="text-slate-300 text-[9px] sm:text-[10px]">
                              {slot.start}
                              {" \u2014 "}
                              {slot.end}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex min-h-[2.75rem] w-full flex-col items-center justify-center gap-1.5 text-center leading-snug sm:min-h-[3rem]">
                            <span className="text-[11px] font-bold text-indigo-600 sm:text-xs">
                              {slotOrdinal}º
                            </span>
                            <span className="text-[9px] tabular-nums text-slate-500 sm:text-[10px]">
                              {slot.start}
                              {" \u2014 "}
                              {slot.end}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* Class cells */}
                      {g.classIds.map((cid) => {
                        const a = allocationAt(dayIndex, si, cid);
                        return (
                          <td
                            key={`${dayName}-${slot.id}-${cid}`}
                            className={cn(
                              "overflow-hidden border-b border-l border-slate-100/90 align-middle text-slate-700",
                              CELL_W,
                              isBreak
                                ? "bg-slate-50/40 px-1.5 py-1.5"
                                : "relative min-h-[2.75rem] bg-white p-0 sm:min-h-[3rem]"
                            )}
                          >
                            {isBreak ? (
                              <span className="flex min-h-[2rem] w-full items-center justify-center truncate text-[10px] text-slate-300 sm:min-h-[2.25rem] sm:text-xs">
                                —
                              </span>
                            ) : (
                              <ScheduleCellContent
                                a={a}
                                canEdit={canEditCells && isLessonSlot}
                                onClick={() => onCellClick(dayIndex, si, cid)}
                                search={search}
                                fixedLabel={cellState === "fixed" ? fixedLabel : undefined}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ByClassView
// ─────────────────────────────────────────────

function ByClassView({
  g,
  classId,
  allocationAt,
  canEditCells,
  onCellClick,
  search
}: {
  g: ReturnType<typeof useScheduleGeneration>;
  classId: string;
} & CellHelpers) {
  if (!classId) return null;

  return (
    <div className="app-panel-flat overflow-hidden rounded-xl border border-slate-200/80 shadow-sm">
      <div className="max-h-[min(72vh,680px)] overflow-auto">
        <table className="w-full table-fixed border-separate border-spacing-0 text-xs" style={{ minWidth: "560px" }}>
          <colgroup>
            {/* Time col */}
            <col className="w-[88px] sm:w-[136px]" />
            {DAYS.map((d) => (
              <col key={d} />
            ))}
          </colgroup>

          <thead>
            <tr>
              <th
                className={cn(
                  "sticky left-0 top-0 z-[40] border-b border-slate-200 p-0 align-top",
                  TIME_COL_W
                )}
              >
                <div className="box-border flex min-h-[2.25rem] w-full items-center justify-center bg-slate-100 px-1.5 py-1.5 text-center shadow-[2px_2px_0_0_rgb(226_232_240)] sm:min-h-[2.5rem] sm:px-3">
                  <span
                    className="block min-w-0 max-w-full truncate text-xs font-semibold leading-tight text-slate-600 sm:text-sm"
                    title={`Turma ${classId}`}
                  >
                    <span className="sm:hidden">{classId}</span>
                    <span className="hidden sm:inline">Turma {classId}</span>
                  </span>
                </div>
              </th>
              {DAYS.map((day) => (
                <th key={day} className="sticky top-0 z-[20] border-b border-l border-slate-200 p-0 align-top">
                  <div className="box-border flex min-h-[2.25rem] w-full items-center justify-center bg-slate-100 px-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-[0_2px_0_0_rgb(226_232_240)] sm:min-h-[2.5rem] sm:px-3 sm:text-xs">
                    {dayLabelCompact(DAY_FULL_LABEL[day])}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {g.viewSlots.map((slot, si) => {
              const isBreak = slot.cells.some((c) => c === "break");
              const slotOrdinal = g.viewSlots
                .slice(0, si + 1)
                .filter((vs) => !vs.cells.some((c) => c === "break")).length;
              const startM = parseTime24ToMinutes(slot.start);
              const endM = parseTime24ToMinutes(slot.end);
              const dur = startM !== null && endM !== null ? endM - startM : 0;
              const brk = dur >= 60 ? "Almoço" : "Intervalo";

              return (
                <tr
                  key={slot.id}
                  className={cn(
                    isBreak
                      ? "break-stripes bg-slate-50/60"
                      : "hover:bg-indigo-50/20 transition-colors"
                  )}
                >
                  {/* Time cell */}
                  <td
                    className={cn(
                      "sticky left-0 z-[10] whitespace-nowrap border-b border-slate-100/90 px-1.5 align-middle tabular-nums shadow-[2px_0_0_0_rgba(15,23,42,0.05)] sm:px-2",
                      TIME_COL_W,
                      isBreak
                        ? "bg-slate-100/80 py-1.5 text-center text-slate-400"
                        : "bg-slate-50 py-1.5 text-center text-slate-700"
                    )}
                  >
                    {isBreak ? (
                      <span className="inline-flex min-h-[2rem] w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium leading-tight sm:min-h-[2.25rem] sm:text-xs">
                        <span className="text-slate-400">{brk}</span>
                        <span className="text-[9px] text-slate-300 sm:text-[10px]">
                          {slot.start}
                          {" \u2014 "}
                          {slot.end}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex min-h-[2.75rem] w-full flex-col items-center justify-center gap-1.5 text-center leading-snug sm:min-h-[3rem]">
                        <span className="text-[11px] font-bold text-indigo-600 sm:text-xs">
                          {slotOrdinal}º
                        </span>
                        <span className="text-[9px] tabular-nums text-slate-500 sm:text-[10px]">
                          {slot.start}
                          {" \u2014 "}
                          {slot.end}
                        </span>
                      </span>
                    )}
                  </td>

                  {/* Day cells */}
                  {DAYS.map((_, di) => {
                    const a = allocationAt(di, si, classId);
                    const dayBreak = slot.cells[di] === "break";
                    const dayFixed = slot.cells[di] === "fixed";
                    const lessonHere = slot.cells[di] === "lesson";
                    const fixedLabel = slot.fixedLabels[di] ?? "RESERVADO";
                    return (
                      <td
                        key={`${slot.id}-${di}`}
                        className={cn(
                          "overflow-hidden border-b border-l border-slate-100/90 align-middle text-slate-700",
                          dayBreak
                            ? "bg-slate-50/40 px-1.5 py-1.5"
                            : "relative min-h-[2.75rem] bg-white p-0 sm:min-h-[3rem]"
                        )}
                      >
                        {dayBreak ? (
                          <span className="flex min-h-[2rem] w-full items-center justify-center truncate text-[10px] text-slate-300 sm:min-h-[2.25rem] sm:text-xs">
                            —
                          </span>
                        ) : (
                          <ScheduleCellContent
                            a={a}
                            canEdit={canEditCells && lessonHere}
                            onClick={() => onCellClick(di, si, classId)}
                            search={search}
                            fixedLabel={dayFixed ? fixedLabel : undefined}
                          />
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
  );
}

// ─────────────────────────────────────────────
// ScheduleCellContent
// ─────────────────────────────────────────────

function ScheduleCellContent({
  a,
  canEdit,
  onClick,
  search,
  fixedLabel
}: {
  a?: SolverAllocation;
  canEdit: boolean;
  onClick: () => void;
  search: string;
  fixedLabel?: string;
}) {
  const hasSearch = Boolean(search.trim());
  const subjectHit = hasSearch && a?.subject ? softMatch(a.subject, search) : false;
  const teacherHit = hasSearch && a?.teacher ? softMatch(a.teacher, search) : false;
  const anyHit = subjectHit || teacherHit;

  const body = fixedLabel ? (
    <p
      className="w-full truncate px-1 text-[11px] font-semibold leading-tight text-slate-800 sm:text-xs"
      title={fixedLabel}
    >
      {fixedLabel}
    </p>
  ) : a ? (
    <>
      <p
        className={cn(
          "w-full truncate text-[11px] font-semibold leading-tight text-slate-800 sm:text-xs",
          subjectHit && "rounded-[3px] bg-amber-200/60 px-1"
        )}
        title={a.subject}
      >
        {a.subject}
      </p>
      <p
        className={cn(
          "w-full truncate text-[9px] leading-tight text-slate-400 sm:text-[10px]",
          teacherHit && "rounded-[3px] bg-amber-200/45 px-1 text-slate-600"
        )}
        title={a.teacher}
      >
        {a.teacher}
      </p>
    </>
  ) : (
    <span className="text-slate-200">—</span>
  );

  if (!canEdit) {
    return (
      <div
        className={cn(
          "flex min-h-[2.75rem] w-full flex-col items-center justify-center gap-0.5 px-1.5 py-2 text-center sm:min-h-[3rem] sm:px-2",
          anyHit && "bg-amber-50"
        )}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute inset-0 box-border flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 text-center transition-colors hover:bg-indigo-50 sm:px-2",
        anyHit && "bg-amber-50 hover:bg-amber-100/70",
        "focus-visible:z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-500"
      )}
    >
      {a ? body : <span className="text-slate-300">—</span>}
    </button>
  );
}
