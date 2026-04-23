"use client";

import { useRef, useState } from "react";

import {
  DAYS,
  teacherAvailabilityCellsInRect,
  teacherSlotLabelMap,
  type SlotRow,
  type TeacherSlotState,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type DragRect = { di0: number; si0: number; di1: number; si1: number };

type AvailabilityGridProps = {
  slots: SlotRow[];
  getState: (dayIndex: number, slotIndex: number) => TeacherSlotState;
  onToggle: (dayIndex: number, slotIndex: number) => void | Promise<void>;
  onApplyBulk: (
    cells: Array<{ dayIndex: number; slotIndex: number }>,
    target: TeacherSlotState
  ) => void | Promise<void>;
};

function readAvailabilityCellFromHit(target: EventTarget | null): { di: number; si: number } | null {
  const el = (target as HTMLElement | null)?.closest?.("[data-availability-cell]");
  if (!el) return null;
  const di = Number((el as HTMLElement).dataset.day);
  const si = Number((el as HTMLElement).dataset.slot);
  if (!Number.isFinite(di) || !Number.isFinite(si)) return null;
  return { di, si };
}

function cellInDragPreview(di: number, si: number, rect: DragRect | null): boolean {
  if (!rect) return false;
  const dMin = Math.min(rect.di0, rect.di1);
  const dMax = Math.max(rect.di0, rect.di1);
  const sMin = Math.min(rect.si0, rect.si1);
  const sMax = Math.max(rect.si0, rect.si1);
  return di >= dMin && di <= dMax && si >= sMin && si <= sMax;
}

export default function AvailabilityGrid({ slots, getState, onToggle, onApplyBulk }: AvailabilityGridProps) {
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const apiRef = useRef({ getState, onToggle, onApplyBulk, slots });
  apiRef.current.getState = getState;
  apiRef.current.onToggle = onToggle;
  apiRef.current.onApplyBulk = onApplyBulk;
  apiRef.current.slots = slots;

  const beginAvailabilityDrag = (e: React.PointerEvent, anchorDi: number, anchorSi: number) => {
    if (e.pointerType !== "mouse") {
      const startX = e.clientX;
      const startY = e.clientY;
      let moved = false;
      const scroller = scrollRef.current;
      const startScrollTop = scroller?.scrollTop ?? 0;
      const startScrollLeft = scroller?.scrollLeft ?? 0;

      const onMove = (ev: PointerEvent) => {
        if (moved) return;
        const dx = Math.abs(ev.clientX - startX);
        const dy = Math.abs(ev.clientY - startY);
        if (dx + dy >= 10) moved = true;
      };

      const finish = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        const endScrollTop = scroller?.scrollTop ?? 0;
        const endScrollLeft = scroller?.scrollLeft ?? 0;
        const scrolled = endScrollTop !== startScrollTop || endScrollLeft !== startScrollLeft;
        if (!moved && !scrolled) void apiRef.current.onToggle(anchorDi, anchorSi);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
      return;
    }

    if (e.button !== 0) return;
    e.preventDefault();
    const brush = apiRef.current.getState(anchorDi, anchorSi);
    setDragRect({ di0: anchorDi, si0: anchorSi, di1: anchorDi, si1: anchorSi });

    const onMove = (ev: PointerEvent) => {
      const hit = readAvailabilityCellFromHit(document.elementFromPoint(ev.clientX, ev.clientY));
      if (hit) {
        setDragRect({ di0: anchorDi, si0: anchorSi, di1: hit.di, si1: hit.si });
      }
    };

    const finish = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);

      const hit = readAvailabilityCellFromHit(document.elementFromPoint(ev.clientX, ev.clientY));
      const endDi = hit?.di ?? anchorDi;
      const endSi = hit?.si ?? anchorSi;
      setDragRect(null);

      const spansMultiple = endDi !== anchorDi || endSi !== anchorSi;
      if (spansMultiple) {
        const cells = teacherAvailabilityCellsInRect(
          apiRef.current.slots,
          anchorDi,
          anchorSi,
          endDi,
          endSi
        );
        if (cells.length > 0) void apiRef.current.onApplyBulk(cells, brush);
      } else {
        void apiRef.current.onToggle(anchorDi, anchorSi);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  return (
    <>
      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 overflow-auto px-3 lg:px-0",
          dragRect && "touch-none select-none"
        )}
        ref={scrollRef}
      >
        <table className="w-full min-w-[600px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[120px]" />
            {DAYS.map((d) => (
              <col key={d} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky top-0 z-10 border-b border-l border-slate-200 bg-slate-100 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Horário
              </th>
              {DAYS.map((day, di) => (
                <th
                  key={day}
                  className={cn(
                    "sticky top-0 z-10 border-b border-l border-slate-200 bg-slate-100 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500",
                    di === DAYS.length - 1 && "border-r",
                    di === 0 ? "pl-0 pr-2" : di === DAYS.length - 1 ? "pl-2 pr-0" : "px-2"
                  )}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, si) => {
              const allBreak = slot.cells.every((c) => c === "break");
              if (allBreak) {
                return (
                  <tr key={slot.id}>
                    <td className="border-b border-l border-slate-100/80 px-3 py-2 text-center text-xs text-slate-400">
                      {slot.start} – {slot.end}
                    </td>
                    {DAYS.map((day, di) => (
                      <td
                        key={`${slot.id}-${day}`}
                        className={cn(
                          "break-stripes border-b border-slate-100/80 py-2 text-center text-slate-300",
                          di === DAYS.length - 1 && "border-r",
                          di === 0 ? "pl-0 pr-2" : di === DAYS.length - 1 ? "pl-2 pr-2" : "px-2"
                        )}
                      >
                        —
                      </td>
                    ))}
                  </tr>
                );
              }
              return (
                <tr key={slot.id} className="transition-colors duration-150 hover:bg-slate-50/50">
                  <td className="border-b border-l border-slate-100/80 px-3 py-2 text-center text-xs font-medium tabular-nums text-slate-600">
                    {slot.start} – {slot.end}
                  </td>
                  {DAYS.map((_, di) => {
                    const slotState: TeacherSlotState = getState(di, si);
                    return (
                      <td
                        key={`${slot.id}-${DAYS[di]}`}
                        className={cn(
                          "border-b border-slate-100/80 py-2 align-middle",
                          di === DAYS.length - 1 && "border-r",
                          di === 0 ? "pl-0 pr-1.5" : di === DAYS.length - 1 ? "pl-1.5 pr-1.5" : "px-1.5"
                        )}
                      >
                        <button
                          type="button"
                          data-availability-cell
                          data-day={di}
                          data-slot={si}
                          onPointerDown={(e) => beginAvailabilityDrag(e, di, si)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              void onToggle(di, si);
                            }
                          }}
                          aria-label={`${teacherSlotLabelMap[slotState]} — clique para alternar ou arraste para preencher uma área`}
                          className={cn(
                            "relative box-border flex h-9 w-full items-center justify-center rounded-none text-[10px] font-semibold tracking-wide transition-colors duration-200",
                            slotState === "available" &&
                              "bg-slate-50 text-slate-700 border border-slate-200/90 hover:bg-slate-100",
                            slotState === "preference" &&
                              "bg-emerald-50 text-emerald-800 border border-emerald-200/90 hover:bg-emerald-100/90",
                            slotState === "unavailable" &&
                              "bg-rose-50 text-rose-600 border border-rose-200/90 hover:bg-rose-100",
                            cellInDragPreview(di, si, dragRect) &&
                              "z-[1] ring-2 ring-indigo-500 ring-offset-1 ring-offset-white"
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
          clique para alternar — arraste para preencher uma área
        </span>
      </div>
    </>
  );
}
