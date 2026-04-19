"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarClock, ChevronRight, Plus, Trash2, UsersRound } from "lucide-react";

import RuleIntroModal from "@/components/rule-intro-modal";
import ScheduleSelect from "@/components/schedule-select";
import { Button } from "@/components/ui/button";
import { SkeletonPanel } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { useScheduleConstraints } from "@/hooks/use-schedule-constraints";
import type { ScheduleSelectOption } from "@/components/schedule-select";

type ConstraintsTabProps = {
  constraintsHook: ReturnType<typeof useScheduleConstraints>;
  teacherSelectOptions: ScheduleSelectOption[];
};

type RuleKey = "teacher_mutex";

export default function ConstraintsTab({ constraintsHook: c, teacherSelectOptions }: ConstraintsTabProps) {
  const [selectedRule, setSelectedRule] = useState<RuleKey | null>(null);
  const [introRule, setIntroRule] = useState<RuleKey | null>(null);
  const didApplyInitialRule = useRef(false);

  const savedGroupCount = c.groupRows.filter((r) => r.teacherIds.length >= 2).length;
  const hasSavedGroups = savedGroupCount > 0;
  const canUseMutexRule = teacherSelectOptions.length >= 2;

  useEffect(() => {
    if (c.isLoading || didApplyInitialRule.current) return;
    didApplyInitialRule.current = true;
    if (c.groupRows.some((r) => r.teacherIds.length >= 2)) {
      setSelectedRule("teacher_mutex");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.isLoading]);

  if (c.isLoading) {
    return (
      <div className="animate-fade-in space-y-5">
        <SkeletonPanel lines={2} />
      </div>
    );
  }

  return (
    <div className="min-w-0 animate-fade-in space-y-6">
      <RuleIntroModal
        open={introRule !== null}
        rule={introRule}
        onOpenChange={(next) => {
          if (!next) setIntroRule(null);
        }}
        onAcknowledge={() => {
          if (introRule) setSelectedRule(introRule);
          setIntroRule(null);
        }}
      />

      <section className="app-panel overflow-hidden">
        <div className="border-b border-slate-100/90 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">O que restringir na geração</h2>
          <p className="mt-1 text-xs text-slate-500">Escolha um tipo de regra para configurar.</p>
        </div>

        <div className="px-5 py-5">
          {selectedRule === null ? (
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Tipo de regra</p>
              <ul className="grid gap-3 sm:grid-cols-2">
                <li>
                  <button
                    type="button"
                    disabled={!canUseMutexRule}
                    onClick={() => setIntroRule("teacher_mutex")}
                    className={cn(
                      "group flex w-full flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200",
                      canUseMutexRule
                        ? "border-slate-200/90 bg-white shadow-sm hover:border-indigo-300/90 hover:shadow-md hover:shadow-indigo-950/[0.06]"
                        : "cursor-not-allowed border-slate-100 bg-slate-50/80 text-slate-400"
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-200/80 bg-indigo-50 text-indigo-700 transition-colors group-hover:border-indigo-300 group-hover:bg-indigo-100/80">
                        <UsersRound className="h-5 w-5" aria-hidden />
                      </span>
                      {canUseMutexRule ? (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-indigo-100 group-hover:text-indigo-700">
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-900">Professores no mesmo horário</span>
                      <p className="mt-1 text-xs text-slate-500">Vários professores por lista · toque para saber mais</p>
                    </div>
                    {!canUseMutexRule ? (
                      <span className="text-xs text-amber-800/90">Cadastre pelo menos dois professores.</span>
                    ) : hasSavedGroups ? (
                      <span className="text-xs font-medium text-indigo-700">{savedGroupCount} lista(s) salva(s)</span>
                    ) : null}
                  </button>
                </li>
                <li>
                  <div
                    className="flex h-full flex-col gap-2 rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50 p-4 text-left text-slate-400"
                    aria-disabled
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400">
                      <CalendarClock className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-slate-500">Outras regras</span>
                    <span className="text-xs">Em breve.</span>
                  </div>
                </li>
              </ul>
            </div>
          ) : selectedRule === "teacher_mutex" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-1.5 text-slate-600"
                  onClick={() => setSelectedRule(null)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Escolher outra regra
                </Button>
              </div>

              {!canUseMutexRule ? (
                <p className="text-sm text-slate-600">
                  Cadastre pelo menos <span className="font-medium">dois professores</span> para montar listas.
                </p>
              ) : c.groupRows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhuma lista. Use <span className="font-medium">Adicionar lista</span> e selecione dois ou mais
                  professores.
                </p>
              ) : (
                <ul className="space-y-3">
                  {c.groupRows.map((row) => (
                    <li
                      key={row.id}
                      className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200/90 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-4 sm:gap-y-2"
                    >
                      <p className="text-xs font-medium text-slate-500">Professores</p>
                      <p
                        className="hidden text-xs font-medium leading-none text-transparent select-none sm:block"
                        aria-hidden
                      >
                        &nbsp;
                      </p>
                      <div className="min-w-0 sm:col-start-1 sm:row-start-2">
                        <ScheduleSelect
                          isMulti
                          aria-label="Professores que não podem coincidir no mesmo horário"
                          options={teacherSelectOptions}
                          value={row.teacherIds}
                          onChange={(ids) => c.updateGroupTeacherIds(row.id, ids)}
                          placeholder="Selecione os professores"
                        />
                      </div>
                      <div className="flex w-full min-h-10 sm:col-start-2 sm:row-start-2 sm:h-full sm:min-h-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          className="h-full min-h-10 w-full flex-1 gap-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:min-w-[8.75rem]"
                          onClick={() => c.removeGroupRow(row.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          Remover
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100/90 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-1.5"
                  onClick={() => c.addGroupRow()}
                  disabled={!canUseMutexRule}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar lista
                </Button>
                <Button type="button" className="h-9 gap-1.5" onClick={() => void c.saveConstraints()} disabled={c.isSaving}>
                  {c.isSaving ? "Salvando..." : "Salvar esta regra"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
