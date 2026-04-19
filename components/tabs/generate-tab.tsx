"use client";

import { useMemo, useState } from "react";
import { CalendarDays, GraduationCap, Trash2, WandSparkles } from "lucide-react";

import ScheduleCellEditDialog from "@/components/schedule-cell-edit-dialog";
import ScheduleSelect from "@/components/schedule-select";
import { Button } from "@/components/ui/button";
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
    if (!canEditCells) {
      return;
    }
    setEditCell({ dayIndex, rowIndex, classId });
  };

  const editTitle = editCell
    ? `Editar · ${DAY_FULL_LABEL[(DAYS[editCell.dayIndex] ?? "SEG")]} · Turma ${editCell.classId}`
    : "";

  const currentAlloc = editCell ? allocationAt(editCell.dayIndex, editCell.rowIndex, editCell.classId) : undefined;

  return (
    <div className="min-w-0 animate-fade-in space-y-6">
      <section className="app-panel overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-[min(100%,580px)]">
            <div className="min-w-0">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Estrutura base</p>
              <ScheduleSelect
                aria-label="Estrutura base para geração"
                options={structureSelectOptions}
                value={g.generationStructureId}
                onChange={(id) => void g.handleLoadStructureForGeneration(id)}
                placeholder="Selecione a estrutura"
              />
            </div>
            <div className="min-w-0">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Horários gerados</p>
              <ScheduleSelect
                aria-label="Horário salvo para visualizar ou editar"
                options={g.generatedSelectOptions}
                value={g.selectedGeneratedScheduleId}
                onChange={(id) => void g.handleLoadGeneratedSchedule(id)}
                placeholder="Visualizar horário salvo"
              />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {g.selectedGeneratedScheduleId && (
              <Button
                type="button"
                onClick={onRequestDeleteGenerated}
                variant="outline"
                className="h-9 gap-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </Button>
            )}
            <Button onClick={() => void g.handleGenerateSchedule()} disabled={g.isSolving || !g.generationProfile} className="h-9 gap-1.5">
              <WandSparkles className="h-3.5 w-3.5" />
              {g.isSolving ? "Gerando..." : "Gerar e Salvar"}
            </Button>
          </div>
        </div>
      </section>

      {hasResult ? (
        <div className="min-w-0 space-y-5">
          {!canEditCells && (
            <p className="text-xs text-amber-700/90">
              Para editar células, selecione um horário salvo em &quot;Horários gerados&quot; (ou gere e salve um novo).
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200/90 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("by-day")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "by-day"
                    ? "bg-gradient-to-r from-indigo-700 to-indigo-800 text-white shadow-sm shadow-indigo-950/10"
                    : "text-slate-500 hover:text-indigo-800"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Por dia
              </button>
              <button
                type="button"
                onClick={() => setViewMode("by-class")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "by-class"
                    ? "bg-gradient-to-r from-indigo-700 to-indigo-800 text-white shadow-sm shadow-indigo-950/10"
                    : "text-slate-500 hover:text-indigo-800"
                )}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Por turma
              </button>
            </div>

            {viewMode === "by-class" && (
              <div className="w-full max-w-[14rem]">
                <ScheduleSelect
                  aria-label="Selecionar turma para visualização"
                  options={classOptions}
                  value={selectedClassId || g.classIds[0] || ""}
                  onChange={setSelectedClassId}
                  placeholder="Selecione a turma"
                  isClearable={false}
                />
              </div>
            )}
          </div>

          {viewMode === "by-day" ? (
            <ByDayView
              g={g}
              allocationAt={allocationAt}
              canEditCells={canEditCells}
              onCellClick={openEdit}
            />
          ) : (
            <ByClassView
              g={g}
              classId={selectedClassId || g.classIds[0] || ""}
              allocationAt={allocationAt}
              canEditCells={canEditCells}
              onCellClick={openEdit}
            />
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200/90 bg-white/80 p-12 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-slate-200/80 bg-slate-50">
            <WandSparkles className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">
            Selecione uma estrutura e clique em Gerar e Salvar
          </p>
          <p className="mt-0.5 text-xs text-slate-400">A grade será exibida aqui; depois pode editar células ao clicar.</p>
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
    </div>
  );
}

type CellHelpers = {
  allocationAt: (dayIndex: number, rowIndex: number, classId: string) => SolverAllocation | undefined;
  canEditCells: boolean;
  onCellClick: (dayIndex: number, rowIndex: number, classId: string) => void;
};

function ScheduleCellContent({
  a,
  canEdit,
  onClick
}: {
  a?: SolverAllocation;
  canEdit: boolean;
  onClick: () => void;
}) {
  const body = a ? (
    <>
      <p className="w-full truncate text-xs font-semibold leading-tight text-slate-800" title={a.subject}>
        {a.subject}
      </p>
      <p className="w-full truncate text-[10px] leading-tight text-slate-500" title={a.teacher}>
        {a.teacher}
      </p>
    </>
  ) : (
    <span className="text-slate-200">—</span>
  );

  if (!canEdit) {
    return (
      <div className="flex min-h-[2.25rem] w-full flex-col items-center justify-center gap-0.5 px-2 py-2 text-center">{body}</div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-0 box-border flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-center transition-colors hover:bg-indigo-50/90 focus-visible:z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-500"
    >
      {a ? body : <span className="text-slate-300">—</span>}
    </button>
  );
}

function ByDayView({
  g,
  allocationAt,
  canEditCells,
  onCellClick
}: {
  g: ReturnType<typeof useScheduleGeneration>;
} & CellHelpers) {
  return (
    <div className="app-panel-flat overflow-hidden">
      <div className="max-h-[min(85vh,880px)] overflow-auto">
        {DAYS.map((dayName, dayIndex) => (
          <section key={dayName} className={cn(dayIndex > 0 && "border-t border-slate-200/90")}>
            <div className="bg-slate-50/90 px-5 py-2.5">
              <h3 className="text-sm font-semibold tracking-tight text-slate-800">{DAY_FULL_LABEL[dayName]}</h3>
            </div>
            <table
              className="table-fixed border-collapse text-xs"
              style={{ width: `${140 + g.classIds.length * 140}px` }}
            >
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-[30] w-[140px] min-w-[140px] max-w-[140px] whitespace-nowrap border-b border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-800 shadow-[2px_2px_0_0_rgba(15,23,42,0.06)]">
                    Horário
                  </th>
                  {g.classIds.map((cid) => (
                    <th
                      key={`${dayName}-${cid}`}
                      className="sticky top-0 z-[20] w-[140px] min-w-[140px] max-w-[140px] overflow-hidden border-b border-l border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-800 shadow-[0_2px_0_0_rgba(15,23,42,0.06)]"
                    >
                      <span className="block truncate" title={`Turma ${cid}`}>
                        Turma {cid}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.viewSlots.map((slot, si) => {
                  const cellState = slot.cells[dayIndex];
                  const isBreak = cellState === "break";
                  const isLessonSlot = cellState === "lesson";
                  const slotOrdinal = g.viewSlots
                    .slice(0, si + 1)
                    .filter((vs) => vs.cells[dayIndex] !== "break").length;
                  const startM = parseTime24ToMinutes(slot.start);
                  const endM = parseTime24ToMinutes(slot.end);
                  const dur = startM !== null && endM !== null ? endM - startM : 0;
                  const brk = dur >= 60 ? "Almoço" : "Intervalo";
                  return (
                    <tr key={`${dayName}-${slot.id}`} className={cn(isBreak && "break-stripes bg-slate-50/40")}>
                      <td
                        className={cn(
                          "sticky left-0 z-[10] w-[140px] min-w-[140px] max-w-[140px] whitespace-nowrap border-b border-slate-100/80 px-3 align-middle text-xs font-semibold tabular-nums shadow-[2px_0_0_0_rgba(15,23,42,0.04)]",
                          isBreak ? "bg-slate-100/90 py-2 text-center text-slate-500" : "bg-slate-50/95 py-2 text-center text-slate-800"
                        )}
                      >
                        {isBreak ? (
                          <span className="inline-flex min-h-[2.25rem] w-full items-center justify-center">
                            {`${slot.start} – ${slot.end}`}
                          </span>
                        ) : (
                          <span className="inline-flex min-h-[2.25rem] w-full items-center justify-center text-center leading-snug">
                            {`${slotOrdinal}º — ${slot.start} – ${slot.end}`}
                          </span>
                        )}
                      </td>
                      {g.classIds.map((cid) => {
                        const a = allocationAt(dayIndex, si, cid);
                        return (
                          <td
                            key={`${dayName}-${slot.id}-${cid}`}
                            className={cn(
                              "w-[140px] min-w-[140px] max-w-[140px] overflow-hidden border-b border-l border-slate-100/80 align-middle text-slate-700",
                              isBreak
                                ? "bg-slate-50/50 px-2 py-2"
                                : "relative min-h-[2.75rem] bg-white p-0"
                            )}
                          >
                            {isBreak ? (
                              <span className="flex min-h-[2.25rem] w-full items-center justify-center truncate text-xs text-slate-400">
                                {brk}
                              </span>
                            ) : (
                              <ScheduleCellContent
                                a={a}
                                canEdit={canEditCells && isLessonSlot}
                                onClick={() => onCellClick(dayIndex, si, cid)}
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

function ByClassView({
  g,
  classId,
  allocationAt,
  canEditCells,
  onCellClick
}: {
  g: ReturnType<typeof useScheduleGeneration>;
  classId: string;
} & CellHelpers) {
  if (!classId) return null;

  return (
    <div className="app-panel-flat overflow-hidden">
      <div className="border-b border-slate-100/80 px-5 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-slate-800">Turma {classId}</h3>
      </div>
      <div className="max-h-[min(70vh,560px)] overflow-auto">
        <table className="w-full min-w-[700px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[140px]" />
            {DAYS.map((d) => (
              <col key={d} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-[30] border-b border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-800 shadow-[2px_2px_0_0_rgba(15,23,42,0.06)]">
                Horário
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="sticky top-0 z-[20] border-b border-l border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-800 shadow-[0_2px_0_0_rgba(15,23,42,0.06)]"
                >
                  {DAY_FULL_LABEL[day]}
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
                <tr key={slot.id} className={cn(isBreak && "break-stripes bg-slate-50/40")}>
                  <td
                    className={cn(
                      "sticky left-0 z-[10] whitespace-nowrap border-b border-slate-100/80 px-3 align-middle text-xs font-semibold tabular-nums shadow-[2px_0_0_0_rgba(15,23,42,0.04)]",
                      isBreak ? "bg-slate-100/90 py-2 text-center text-slate-500" : "bg-slate-50/95 py-2 text-center text-slate-800"
                    )}
                  >
                    {isBreak ? (
                      <span className="inline-flex min-h-[2.25rem] w-full items-center justify-center">
                        {`${slot.start} – ${slot.end}`}
                      </span>
                    ) : (
                      <span className="inline-flex min-h-[2.25rem] w-full items-center justify-center text-center leading-snug">
                        {`${slotOrdinal}º — ${slot.start} – ${slot.end}`}
                      </span>
                    )}
                  </td>
                  {DAYS.map((_, di) => {
                    const a = allocationAt(di, si, classId);
                    const dayBreak = slot.cells[di] === "break";
                    const lessonHere = slot.cells[di] === "lesson";
                    return (
                      <td
                        key={`${slot.id}-${di}`}
                        className={cn(
                          "overflow-hidden border-b border-l border-slate-100/80 align-middle text-slate-700",
                          dayBreak
                            ? "bg-slate-50/50 px-2 py-2"
                            : "relative min-h-[2.75rem] bg-white p-0"
                        )}
                      >
                        {dayBreak ? (
                          <span className="flex min-h-[2.25rem] w-full items-center justify-center truncate text-xs text-slate-400">
                            {brk}
                          </span>
                        ) : (
                          <ScheduleCellContent
                            a={a}
                            canEdit={canEditCells && lessonHere}
                            onClick={() => onCellClick(di, si, classId)}
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
