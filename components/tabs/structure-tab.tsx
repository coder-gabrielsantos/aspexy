"use client";

import { ChevronLeft, Info, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import StructureIntroModal from "@/components/structure-intro-modal";
import ScheduleSelect from "@/components/schedule-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DAYS,
  DEFAULT_START,
  DEFAULT_END,
  STATE_CYCLE,
  stateLabelMap,
  formatTimeTyping,
  addMinutesToTime24,
  normalizeTime24OrFallback,
  type SlotState,
} from "@/lib/types";
import type { useStructures } from "@/hooks/use-structures";

type StructureTabProps = {
  structures: ReturnType<typeof useStructures>;
  onRequestDelete: () => void;
  onStructureSaved?: (id: string) => void;
};

type ActivePicker = { si: number; di: number; rect: DOMRect };

function CellStatePicker({
  open,
  anchor,
  currentState,
  onSelectState,
  onRequestClose,
  onExited,
}: {
  open: boolean;
  anchor: ActivePicker;
  currentState: SlotState;
  onSelectState: (state: SlotState, label?: string) => void;
  onRequestClose: () => void;
  onExited: () => void;
}) {
  const [view, setView] = useState<"states" | "fixed-name">("states");
  const [label, setLabel] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [panelWidth, setPanelWidth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { rect } = anchor;

  const spaceBelow = (typeof window !== "undefined" ? window.innerHeight : 800) - rect.bottom;
  const showAbove = spaceBelow < 160 && rect.top > 160;

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const safeMargin = 8;
  const anchorCenterX = rect.left + rect.width / 2;
  const minCenterX = safeMargin + panelWidth / 2;
  const maxCenterX = viewportW - safeMargin - panelWidth / 2;
  const clampedCenterX = panelWidth > 0 ? Math.min(Math.max(anchorCenterX, minCenterX), maxCenterX) : anchorCenterX;

  const style: React.CSSProperties = {
    position: "fixed",
    left: clampedCenterX,
    top: showAbove ? rect.top - 8 : rect.bottom + 8,
    transform: showAbove ? "translate(-50%, -100%)" : "translateX(-50%)",
    zIndex: 200,
  };

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsVisible(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onRequestClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onRequestClose();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onRequestClose]);

  useEffect(() => {
    if (view === "fixed-name") {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [view]);

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => setPanelWidth(panelRef.current?.offsetWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, view]);

  if (view === "states") {
    return (
      <div
        ref={panelRef}
        style={style}
        role="dialog"
        aria-label="Escolher estado da célula"
        onTransitionEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          if (!open) onExited();
        }}
        className={cn(
          "flex overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-[0_8px_24px_-4px_rgba(15,23,42,0.14),0_1px_2px_rgba(15,23,42,0.06)] divide-x divide-slate-200/70",
          "origin-top transition-all duration-200 ease-out",
          isVisible ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        )}
      >
        {STATE_CYCLE.map((state) => (
          <button
            key={state}
            type="button"
            aria-pressed={state === currentState}
            onClick={() => {
              if (state === "fixed") {
                setView("fixed-name");
              } else {
                onSelectState(state);
              }
            }}
            className={cn(
              "h-10 w-24 shrink-0 rounded-none px-3 text-[10px] font-semibold tracking-wide transition-colors duration-100",
              state === currentState && "bg-indigo-100 text-indigo-800",
              state === "lesson" && "bg-slate-100 text-slate-800 hover:bg-slate-200/80",
              state === "free" && "bg-white text-slate-500 hover:bg-slate-50",
              state === "break" && "break-stripes bg-amber-50 text-amber-800 hover:bg-amber-100",
              state === "fixed" && "bg-violet-100 text-violet-800 hover:bg-violet-200/80",
            )}
          >
            {stateLabelMap[state]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      style={style}
      role="dialog"
      aria-label="Nome do horário fixo"
      onTransitionEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        if (!open) onExited();
      }}
      className={cn(
        "w-72 overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-[0_8px_24px_-4px_rgba(15,23,42,0.14),0_1px_2px_rgba(15,23,42,0.06)]",
        "origin-top transition-all duration-200 ease-out",
        isVisible ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
      )}
    >
      <div className="border-b border-slate-100 px-3 py-2.5">
        <button
          type="button"
          onClick={() => { setLabel(""); setView("states"); }}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ChevronLeft className="h-3 w-3" aria-hidden />
          Voltar
        </button>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-600">
          Horário fixo
        </p>
      </div>
      <div className="px-3 pb-3 pt-2.5">
        <label className="mb-1.5 block text-xs font-medium text-slate-700">
          Nome{" "}
          <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <Input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex: Avaliação"
          className="h-9 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") onSelectState("fixed", label);
            if (e.key === "Escape") onRequestClose();
          }}
        />
        <Button
          type="button"
          className="mt-2.5 h-9 w-full gap-1.5 text-sm font-semibold"
          onClick={() => onSelectState("fixed", label)}
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
}

export default function StructureTab({ structures: s, onRequestDelete, onStructureSaved }: StructureTabProps) {
  const [introOpen, setIntroOpen] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePicker | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [applyScope, setApplyScope] = useState<"cell" | "row">("cell");

  const openPicker = (si: number, di: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (activePicker && activePicker.si === si && activePicker.di === di && isPickerOpen) {
      setIsPickerOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setActivePicker({ si, di, rect });
    setIsPickerOpen(true);
  };

  const closePicker = () => setIsPickerOpen(false);
  const handlePickerExited = () => {
    if (!isPickerOpen) setActivePicker(null);
  };

  const handleSelectState = (state: SlotState, label?: string) => {
    if (!activePicker) return;
    const clickedDay = DAYS[activePicker.di];
    if (clickedDay === "SAB") {
      s.setCellState(activePicker.si, activePicker.di, state, label);
      closePicker();
      return;
    }
    if (applyScope === "row") {
      for (let di = 0; di < DAYS.length; di++) {
        if (DAYS[di] === "SAB") continue;
        s.setCellState(activePicker.si, di, state, label);
      }
    } else {
      s.setCellState(activePicker.si, activePicker.di, state, label);
    }
    closePicker();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <StructureIntroModal open={introOpen} onOpenChange={setIntroOpen} />

      {activePicker && (
        <CellStatePicker
          open={isPickerOpen}
          anchor={activePicker}
          currentState={s.slots[activePicker.si]?.cells[activePicker.di] ?? "lesson"}
          onSelectState={handleSelectState}
          onRequestClose={closePicker}
          onExited={handlePickerExited}
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
          <div className="flex w-full shrink-0 flex-nowrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
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
                className="h-11 min-h-11 gap-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 max-[460px]:w-11 max-[460px]:min-w-11 max-[460px]:px-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="max-[460px]:hidden">Excluir</span>
              </Button>
            )}
            <Button
              onClick={() => void s.handleSaveStructure(onStructureSaved)}
              disabled={s.isSavingStructure || (Boolean(s.selectedStructureId) && !s.isStructureDirty)}
              className="h-11 min-h-11 w-full min-w-0 flex-1 gap-1.5 sm:w-auto sm:flex-none"
            >
              <Save className="h-3.5 w-3.5" />
              {s.saveButtonLabel}
            </Button>
          </div>
        </div>
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Aplicar status em
            </p>
            <div
              role="tablist"
              aria-label="Aplicação de status"
              className="relative inline-grid h-8 w-max grid-cols-2 items-stretch rounded-full bg-slate-100/95 p-0.5"
            >
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 w-[calc(50%-2px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none",
                  applyScope === "row" ? "translate-x-full" : "translate-x-0"
                )}
              />
              <button
                type="button"
                role="tab"
                aria-selected={applyScope === "cell"}
                onClick={() => setApplyScope("cell")}
                className={cn(
                  "relative z-10 flex min-w-0 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 focus-visible:ring-offset-2",
                  applyScope === "cell" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Célula
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={applyScope === "row"}
                onClick={() => setApplyScope("row")}
                className={cn(
                  "relative z-10 flex min-w-0 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/35 focus-visible:ring-offset-2",
                  applyScope === "row" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Linha inteira
              </button>
            </div>
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
                  {DAYS.map((_, di) => {
                    const state = slot.cells[di] ?? "free";
                    const fixedLabel = slot.fixedLabels[di];
                    const isActive = activePicker?.si === si && activePicker?.di === di;
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
                          onClick={(e) => openPicker(si, di, e)}
                          aria-haspopup="dialog"
                          aria-expanded={isActive}
                          aria-label={
                            state === "fixed" && fixedLabel
                              ? `${fixedLabel} — clique para alterar`
                              : `${stateLabelMap[state]} — clique para alterar`
                          }
                          title={state === "fixed" && fixedLabel ? fixedLabel : undefined}
                          className={cn(
                            "box-border flex h-11 w-full items-center justify-center gap-1 overflow-hidden rounded-none px-1 text-[10px] font-semibold tracking-wide transition-colors duration-150",
                            isActive && "ring-2 ring-inset ring-indigo-400/70",
                            state === "lesson" && "bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200/80",
                            state === "free" && "bg-white text-slate-400 ring-1 ring-slate-200 hover:bg-slate-50",
                            state === "break" && "break-stripes bg-amber-50/90 text-amber-800 ring-1 ring-amber-200/70 hover:bg-amber-100/80",
                            state === "fixed" && "bg-violet-100 text-violet-800 ring-1 ring-violet-300 hover:bg-violet-200/80"
                          )}
                        >
                          {state === "fixed" ? (
                            <span className="truncate leading-none uppercase">
                              {fixedLabel ?? stateLabelMap.fixed}
                            </span>
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
              <span className="leading-none">clique para alterar</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
