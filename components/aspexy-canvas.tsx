"use client";

import { useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Download, LogOut, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DAYS = ["SEG", "TER", "QUA", "QUI", "SEX"] as const;
const DEFAULT_START = "07:30";
const DEFAULT_END = "08:20";
const DEFAULT_SLOT_MINUTES = 50;

type SlotState = "lesson" | "free";

type SlotRow = {
  id: string;
  start: string;
  end: string;
  cells: SlotState[];
};

type SchoolProfile = {
  school_id: string;
  config: {
    total_slots: number;
    active_slots_count: number;
    days: string[];
    time_schema: Array<{
      slot_index: number;
      start: string;
      end: string;
      type: "lesson" | "break";
    }>;
  };
  grid_matrix: Record<string, number[]>;
};

const STATE_CYCLE: SlotState[] = ["lesson", "free"];

const stateClassMap: Record<SlotState, string> = {
  lesson:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  free: "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
};

const stateLabelMap: Record<SlotState, string> = {
  lesson: "AULA",
  free: "LIVRE"
};

function createInitialSlot(index = 0): SlotRow {
  return {
    id: `slot-${index + 1}`,
    start: DEFAULT_START,
    end: DEFAULT_END,
    cells: DAYS.map(() => "lesson")
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseTime24ToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTime24(totalMinutes: number) {
  const clamped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addMinutesToTime24(value: string, deltaMinutes: number) {
  const base = parseTime24ToMinutes(value);
  if (base === null) return value;
  return minutesToTime24(base + deltaMinutes);
}

function normalizeTime24(input: string) {
  const digits = input.replace(/[^\d]/g, "").slice(0, 4);
  const h = digits.slice(0, 2);
  const m = digits.slice(2, 4);

  let hours = h ? Number(h) : 0;
  let minutes = m ? Number(m) : 0;

  if (Number.isNaN(hours)) hours = 0;
  if (Number.isNaN(minutes)) minutes = 0;

  hours = clamp(hours, 0, 23);
  minutes = clamp(minutes, 0, 59);

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizeTime24OrFallback(input: string, fallback: string) {
  const normalized = normalizeTime24(input);
  // Se o usuário saiu com algo muito incompleto (ex.: "1"), mantém o valor anterior.
  const digits = input.replace(/[^\d]/g, "");
  if (digits.length < 3) return fallback;
  return normalized;
}

function formatTimeTyping(input: string) {
  const digits = input.replace(/[^\d]/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export default function AspexyCanvas() {
  const { data: session, status } = useSession();
  const [schoolId] = useState<string>(() => crypto.randomUUID());
  const [slots, setSlots] = useState<SlotRow[]>([createInitialSlot(0), createInitialSlot(1)]);
  const [exportedJson, setExportedJson] = useState<string>("");

  const activeSlotsCount = useMemo(
    () => slots.reduce((acc, row) => acc + row.cells.filter((cell) => cell === "lesson").length, 0),
    [slots]
  );

  const toggleCellState = (slotIndex: number, dayIndex: number) => {
    setSlots((prev) =>
      prev.map((slot, rowIdx) => {
        if (rowIdx !== slotIndex) return slot;
        const nextCells = [...slot.cells];
        const currentState = nextCells[dayIndex];
        const nextState = STATE_CYCLE[(STATE_CYCLE.indexOf(currentState) + 1) % STATE_CYCLE.length];
        nextCells[dayIndex] = nextState;
        return { ...slot, cells: nextCells };
      })
    );
  };

  const updateSlotTime = (slotIndex: number, field: "start" | "end", value: string) => {
    setSlots((prev) =>
      prev.map((slot, rowIdx) => {
        if (rowIdx !== slotIndex) return slot;
        return { ...slot, [field]: value };
      })
    );
  };

  const addSlotRow = () => {
    setSlots((prev) => {
      const last = prev[prev.length - 1];
      const start = last?.end && parseTime24ToMinutes(last.end) !== null ? last.end : DEFAULT_START;
      const end = addMinutesToTime24(start, DEFAULT_SLOT_MINUTES);
      const next: SlotRow = {
        id: `slot-${prev.length + 1}`,
        start,
        end,
        cells: DAYS.map(() => "lesson")
      };
      return [...prev, next];
    });
  };

  const generateSchoolProfile = (): SchoolProfile => {
    const timeSchema = slots.map((slot, slotIndex) => {
      const hasLesson = slot.cells.some((cell) => cell === "lesson");
      return {
        slot_index: slotIndex,
        start: slot.start,
        end: slot.end,
        type: hasLesson ? ("lesson" as const) : ("break" as const)
      };
    });

    const gridMatrix = DAYS.reduce<Record<string, number[]>>((acc, _day, dayIndex) => {
      acc[String(dayIndex)] = slots
        .map((slot, slotIndex) => ({ state: slot.cells[dayIndex], slotIndex }))
        .filter((entry) => entry.state === "lesson")
        .map((entry) => entry.slotIndex);
      return acc;
    }, {});

    return {
      school_id: schoolId,
      config: {
        total_slots: slots.length,
        active_slots_count: activeSlotsCount,
        days: [...DAYS],
        time_schema: timeSchema
      },
      grid_matrix: gridMatrix
    };
  };

  const handleFinalize = () => {
    const profile = generateSchoolProfile();
    setExportedJson(JSON.stringify(profile, null, 2));
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto w-full max-w-[1650px]">
        <nav className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">Aspexy</h1>
              <p className="mt-1 text-sm text-slate-500">
                Configure a estrutura de horarios da escola e exporte o JSON para o motor.
              </p>
            </div>
              <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-slate-700">
                {status === "loading" ? "Carregando..." : session?.user?.name ?? "Usuario"}
              </span>
              <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })} className="h-9 gap-2">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 md:grid-cols-4">
            <button className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm">Grade</button>
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-white">Conflitos</button>
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-white">Analises</button>
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-white">Visao do aluno</button>
          </div>
        </nav>

        <Card className="mt-4 border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-2 border-b border-slate-200 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900">Grade de horarios</CardTitle>
                <CardDescription className="mt-1">
                  Defina horarios, clique nos blocos para alternar entre AULA e LIVRE e finalize a estrutura.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={addSlotRow} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                  Adicionar Slot
                </Button>
                <Button variant="secondary" onClick={handleFinalize} className="gap-2">
                  <Download className="h-4 w-4" />
                  Finalizar Estrutura
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[980px] border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Horario
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        className="border-b border-l border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, slotIndex) => (
                    <tr key={slot.id} className="odd:bg-slate-50/30">
                      <td className="w-[220px] border-b border-slate-200 px-4 py-3">
                        <div className="grid grid-cols-2 justify-items-center gap-2">
                          <Input
                            inputMode="numeric"
                            placeholder="HH:MM"
                            value={slot.start}
                            maxLength={5}
                            className="text-center tabular-nums"
                            onChange={(event) =>
                              updateSlotTime(slotIndex, "start", formatTimeTyping(event.target.value))
                            }
                            onFocus={(event) => event.currentTarget.select()}
                            onKeyDown={(event) => {
                              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                              event.preventDefault();
                              const delta = event.key === "ArrowUp" ? 5 : -5;
                              updateSlotTime(slotIndex, "start", addMinutesToTime24(slot.start, delta));
                            }}
                            onBlur={() =>
                              updateSlotTime(slotIndex, "start", normalizeTime24OrFallback(slot.start, DEFAULT_START))
                            }
                          />
                          <Input
                            inputMode="numeric"
                            placeholder="HH:MM"
                            value={slot.end}
                            maxLength={5}
                            className="text-center tabular-nums"
                            onChange={(event) =>
                              updateSlotTime(slotIndex, "end", formatTimeTyping(event.target.value))
                            }
                            onFocus={(event) => event.currentTarget.select()}
                            onKeyDown={(event) => {
                              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                              event.preventDefault();
                              const delta = event.key === "ArrowUp" ? 5 : -5;
                              updateSlotTime(slotIndex, "end", addMinutesToTime24(slot.end, delta));
                            }}
                            onBlur={() =>
                              updateSlotTime(slotIndex, "end", normalizeTime24OrFallback(slot.end, DEFAULT_END))
                            }
                          />
                        </div>
                      </td>
                      {slot.cells.map((state, dayIndex) => (
                        <td
                          key={`${slot.id}-${DAYS[dayIndex]}`}
                          className="border-b border-l border-slate-200 px-3 py-3"
                        >
                          <button
                            type="button"
                            onClick={() => toggleCellState(slotIndex, dayIndex)}
                            className={cn(
                              "h-11 w-full rounded-lg border text-[11px] font-semibold tracking-wide transition-all duration-200 hover:-translate-y-[1px]",
                              stateClassMap[state]
                            )}
                          >
                            {stateLabelMap[state]}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">JSON gerado</p>
              </div>
              <pre className="max-h-[280px] overflow-auto rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700">
                {exportedJson || "Clique em \"Finalizar Estrutura\" para gerar o JSON."}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
