"use client";

import { Info, Plus, Save, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

import StructureIntroModal from "@/components/structure-intro-modal";
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

function FixedLabelDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (label: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[8px] motion-reduce:animate-none motion-reduce:opacity-100 animate-dialog-overlay-in"
        aria-label="Fechar"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fixed-label-dialog-title"
        aria-describedby="fixed-label-dialog-desc"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 w-full max-w-[420px] motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:scale-100 animate-dialog-in",
          "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_24px_48px_-12px_rgba(15,23,42,0.18)]",
          "outline-none ring-1 ring-slate-900/[0.03]"
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-200/80 to-transparent"
          aria-hidden
        />

        <div className="relative px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-1 pt-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Horário reservado</p>
              <h2 id="fixed-label-dialog-title" className="mt-1.5 text-base font-semibold leading-snug tracking-tight text-slate-900">
                Adicionar nome ao horário fixo
              </h2>
              <p id="fixed-label-dialog-desc" className="mt-2.5 text-sm leading-relaxed text-slate-600">
                Dê um nome para este horário reservado. Ele não será usado na geração automática.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Fechar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="mt-4">
            <Input
              ref={inputRef}
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex: Avaliação Semanal"
              className="h-11 w-full text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") onConfirm(value);
                if (e.key === "Escape") onCancel();
              }}
            />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <Button type="button" variant="ghost" onClick={onCancel} className="h-10 px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:h-9">
              Cancelar
            </Button>
            <Button type="button" className="h-10 min-w-[8.5rem] gap-2 text-sm font-semibold shadow-sm sm:h-9" onClick={() => onConfirm(value)}>
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StructureTab({ structures: s, onRequestDelete, onStructureSaved }: StructureTabProps) {
  const [introOpen, setIntroOpen] = useState(false);

  return (
    <div className="animate-fade-in space-y-6">
      <StructureIntroModal open={introOpen} onOpenChange={setIntroOpen} />

      {s.pendingFixedCell && (
        <FixedLabelDialog
          onConfirm={(label) => s.setFixedLabel(s.pendingFixedCell!.si, s.pendingFixedCell!.di, label)}
          onCancel={s.cancelPendingFixed}
        />
      )}

      <section className="app-panel overflow-hidden">
        <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
          <div className="grid min-w-0 w-full max-w-xl flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
            <div className="min-w-0">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Nome</p>
              <Input
                value={s.structureName}
                onChange={(e) => s.setStructureName(e.target.value)}
                placeholder="Nome da estrutura"
                className="h-11 min-h-11 w-full"
              />
            </div>
            <div className="min-w-0">
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
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 w-11 min-w-11 px-0 text-slate-600"
              onClick={() => setIntroOpen(true)}
              aria-label="Como montar o horário"
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
            {s.selectedStructureId && (
              <Button
                type="button"
                onClick={onRequestDelete}
                variant="outline"
                className="h-11 min-h-11 gap-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </Button>
            )}
            <Button
              onClick={() => void s.handleSaveStructure(onStructureSaved)}
              disabled={s.isSavingStructure || (Boolean(s.selectedStructureId) && !s.isStructureDirty)}
              className="h-11 min-h-11 gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {s.saveButtonLabel}
            </Button>
          </div>
        </div>
      </section>

      <section className="app-panel-flat overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] table-fixed border-collapse">
            <colgroup>
              <col className="w-[200px]" />
              {DAYS.map((day) => (
                <col key={day} />
              ))}
              <col className="w-14 min-w-14" />
            </colgroup>
            <thead>
              <tr>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                  Horário
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className={cn(
                      "border-b border-slate-200 bg-slate-100 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-slate-500",
                      day === DAYS[DAYS.length - 1] ? "pl-2 pr-1" : "px-2"
                    )}
                  >
                    {day}
                  </th>
                ))}
                <th className="w-14 min-w-14 border-b border-slate-200 bg-slate-100 pl-1 pr-2 py-2.5" aria-hidden />
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
                  {slot.cells.map((state, di) => {
                    const fixedLabel = slot.fixedLabels[di];
                    return (
                      <td
                        key={`${slot.id}-${DAYS[di]}`}
                        className={cn(
                          "border-b border-slate-100 py-2",
                          di === DAYS.length - 1 ? "pl-1.5 pr-1" : "px-1.5"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => s.toggleCellState(si, di)}
                          aria-label={
                            state === "fixed" && fixedLabel
                              ? `${fixedLabel} — clique para remover`
                              : `${stateLabelMap[state]} — clique para alternar`
                          }
                          title={state === "fixed" && fixedLabel ? fixedLabel : undefined}
                          className={cn(
                            "box-border flex h-11 w-full items-center justify-center gap-1 overflow-hidden rounded-none px-1 text-[10px] font-semibold tracking-wide transition-colors duration-150",
                            state === "lesson" && "bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200/80",
                            state === "free" && "bg-white text-slate-400 ring-1 ring-slate-200 hover:bg-slate-50",
                            state === "break" && "break-stripes bg-amber-50/90 text-amber-800 ring-1 ring-amber-200/70 hover:bg-amber-100/80",
                            state === "fixed" && "bg-violet-100 text-violet-800 ring-1 ring-violet-300 hover:bg-violet-200/80"
                          )}
                        >
                          {state === "fixed" ? (
                            <>
                              <span className="truncate leading-none uppercase">
                                {fixedLabel ?? stateLabelMap.fixed}
                              </span>
                            </>
                          ) : (
                            stateLabelMap[state]
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className="w-14 min-w-14 border-b border-slate-100 py-2 pl-1 pr-2 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => s.removeSlotRow(si)}
                      disabled={s.slots.length <= 1}
                      aria-label="Remover slot"
                      className="mx-auto grid h-11 min-h-11 w-11 min-w-11 shrink-0 place-items-center rounded-none text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      <X className="h-4 w-4" />
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
            className="h-10 min-h-10 w-[calc(2*4.75rem+2*0.375rem+0.4rem)] shrink-0 justify-center gap-1.5 rounded-none border-dashed px-2 text-[11px] font-medium text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 sm:text-xs"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Adicionar slot
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
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-100 ring-1 ring-violet-300" />
              Fixo
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
