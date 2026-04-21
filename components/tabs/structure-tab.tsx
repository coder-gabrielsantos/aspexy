"use client";

import { Plus, Save, Trash2, X } from "lucide-react";

import ScheduleSelect from "@/components/schedule-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DAYS,
  DEFAULT_START,
  DEFAULT_END,
  stateLabelMap,
  formatTimeTyping,
  addMinutesToTime24,
  normalizeTime24OrFallback,
} from "@/lib/types";
import type { useStructures } from "@/hooks/use-structures";

type StructureTabProps = {
  structures: ReturnType<typeof useStructures>;
  onRequestDelete: () => void;
  onStructureSaved?: (id: string) => void;
};

export default function StructureTab({ structures: s, onRequestDelete, onStructureSaved }: StructureTabProps) {
  return (
    <div className="animate-fade-in space-y-6">
      <section className="app-panel overflow-hidden">
        <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
          <div className="flex min-w-0 w-full flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full min-w-0 sm:w-auto sm:min-w-[180px]">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Nome</p>
              <Input
                value={s.structureName}
                onChange={(e) => s.setStructureName(e.target.value)}
                placeholder="Nome da estrutura"
                className="w-full sm:w-52"
              />
            </div>
            <div className="w-full min-w-0 sm:max-w-[280px] sm:shrink-0">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Estruturas salvas</p>
              <ScheduleSelect
                aria-label="Estruturas salvas — selecionar para carregar"
                options={s.structureSelectOptions}
                value={s.selectedStructureId}
                onChange={(id) => void s.handleLoadStructureInGrade(id)}
                placeholder="Selecionar…"
              />
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
            {s.selectedStructureId && (
              <Button
                type="button"
                onClick={onRequestDelete}
                variant="outline"
                className="gap-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </Button>
            )}
            <Button
              onClick={() => void s.handleSaveStructure(onStructureSaved)}
              disabled={s.isSavingStructure || (Boolean(s.selectedStructureId) && !s.isStructureDirty)}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {s.saveButtonLabel}
            </Button>
          </div>
        </div>
      </section>

      <section className="app-panel-flat overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[984px] table-fixed border-collapse">
            <colgroup>
              <col className="w-[200px]" />
              {DAYS.map((day) => (
                <col key={day} />
              ))}
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                  Horário
                </th>
                {DAYS.map((day) => (
                  <th key={day} className="border-b border-slate-200 bg-slate-100 px-2 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                    {day}
                  </th>
                ))}
                <th className="border-b border-slate-200 bg-slate-100 px-1 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {s.slots.map((slot, si) => (
                <tr
                  key={slot.id}
                  className="transition-colors duration-150 hover:bg-slate-50/60"
                >
                  <td className="border-b border-slate-100 px-2.5 py-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <Input inputMode="numeric" placeholder="HH:MM" value={slot.start} maxLength={5} className="h-11 w-[4.75rem] shrink-0 rounded-none px-2 text-center text-xs tabular-nums"
                        onChange={(e) => s.updateSlotTime(si, "start", formatTimeTyping(e.target.value))}
                        onFocus={(e) => e.currentTarget.select()}
                        onKeyDown={(e) => { if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return; e.preventDefault(); s.updateSlotTime(si, "start", addMinutesToTime24(slot.start, e.key === "ArrowUp" ? 5 : -5)); }}
                        onBlur={() => s.updateSlotTime(si, "start", normalizeTime24OrFallback(slot.start, DEFAULT_START))}
                      />
                      <span className="shrink-0 text-[10px] text-slate-300">–</span>
                      <Input inputMode="numeric" placeholder="HH:MM" value={slot.end} maxLength={5} className="h-11 w-[4.75rem] shrink-0 rounded-none px-2 text-center text-xs tabular-nums"
                        onChange={(e) => s.updateSlotTime(si, "end", formatTimeTyping(e.target.value))}
                        onFocus={(e) => e.currentTarget.select()}
                        onKeyDown={(e) => { if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return; e.preventDefault(); s.updateSlotTime(si, "end", addMinutesToTime24(slot.end, e.key === "ArrowUp" ? 5 : -5)); }}
                        onBlur={() => s.updateSlotTime(si, "end", normalizeTime24OrFallback(slot.end, DEFAULT_END))}
                      />
                    </div>
                  </td>
                  {slot.cells.map((state, di) => (
                    <td key={`${slot.id}-${DAYS[di]}`} className="border-b border-slate-100 px-1.5 py-2">
                      <button
                        type="button"
                        onClick={() => s.toggleCellState(si, di)}
                        aria-label={`${stateLabelMap[state]} — clique para alternar`}
                        className={cn(
                          "box-border flex h-11 w-full items-center justify-center overflow-hidden rounded-none text-[10px] font-semibold tracking-wide transition-colors duration-150",
                          state === "lesson" && "bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200/80",
                          state === "free" && "bg-white text-slate-400 ring-1 ring-slate-200 hover:bg-slate-50",
                          state === "break" && "break-stripes bg-amber-50/90 text-amber-800 ring-1 ring-amber-200/70 hover:bg-amber-100/80"
                        )}
                      >
                        {stateLabelMap[state]}
                      </button>
                    </td>
                  ))}
                  <td className="border-b border-slate-100 px-1 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => s.removeSlotRow(si)}
                      disabled={s.slots.length <= 1}
                      aria-label="Remover slot"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-none text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            onClick={s.addSlotRow}
            variant="outline"
            aria-label="Adicionar slot"
            className="gap-1.5 border-dashed px-3 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500" aria-label="Legenda">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-100 ring-1 ring-slate-200" />
              Aula
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-white ring-1 ring-slate-200" />
              Livre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 break-stripes rounded-sm bg-amber-50 ring-1 ring-amber-200/80" />
              Intervalo
            </span>
            <span className="hidden items-center gap-1.5 text-slate-400 sm:ml-4 sm:flex">
              <span
                className="inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center"
                aria-hidden
              >
                <span className="h-1.5 w-1.5 translate-y-px rounded-full bg-slate-400" />
              </span>
              <span className="leading-none">clique para alternar</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
