"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarClock, Info, Plus, Trash2, UsersRound } from "lucide-react";

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
          <p className="mt-1 text-xs text-slate-500">Restrições aplicadas ao gerar horários.</p>
        </div>

        <div className="px-5 py-5">
          {selectedRule === null ? (
            <ul className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              <li>
                <div
                  className={cn(
                    "flex min-h-[4.5rem] items-stretch overflow-hidden rounded-xl transition-[background-color,box-shadow,border-color] duration-200",
                    canUseMutexRule
                      ? "border border-transparent bg-slate-50/60 hover:border-slate-200/85 hover:bg-white hover:shadow-[0_1px_2px_rgba(67,56,202,0.09),0_1px_2px_rgba(15,23,42,0.04)]"
                      : "border border-slate-100 bg-slate-50/40"
                  )}
                >
                  <button
                    type="button"
                    disabled={!canUseMutexRule}
                    onClick={() => setSelectedRule("teacher_mutex")}
                    aria-label={
                      canUseMutexRule ? "Configurar sem aula simultânea" : "Sem aula simultânea, indisponível"
                    }
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left outline-none sm:px-[1.125rem] sm:py-4",
                      "focus-visible:z-[1] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/25",
                      canUseMutexRule ? "cursor-pointer" : "cursor-not-allowed"
                    )}
                  >
                    <UsersRound
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        canUseMutexRule ? "text-slate-400" : "text-slate-300"
                      )}
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 py-0.5">
                      <span
                        className={cn(
                          "block text-sm font-semibold tracking-tight",
                          canUseMutexRule ? "text-slate-900" : "text-slate-500"
                        )}
                      >
                        Sem aula simultânea
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                        {canUseMutexRule
                          ? "Professores da mesma lista não podem ter aula no mesmo horário."
                          : "É preciso cadastrar pelo menos dois professores."}
                      </span>
                    </span>
                  </button>
                  {canUseMutexRule ? (
                    <>
                      <div className="w-px shrink-0 self-stretch bg-slate-200/70" aria-hidden />
                      <button
                        type="button"
                        onClick={() => setIntroRule("teacher_mutex")}
                        aria-label="Informações sobre sem aula simultânea"
                        className="grid w-11 shrink-0 place-items-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/25"
                      >
                        <Info className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
              <li>
                <div
                  className="flex min-h-[4.5rem] items-center gap-3 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/30 px-4 py-3.5 sm:px-[1.125rem] sm:py-4"
                  aria-disabled
                >
                  <CalendarClock className="h-[18px] w-[18px] shrink-0 text-slate-300" strokeWidth={1.5} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tracking-tight text-slate-500">Outras regras</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">Em breve nesta etapa.</p>
                  </div>
                </div>
              </li>
            </ul>
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
                          aria-label="Professores da lista sem aula simultânea"
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

              <div
                className={cn(
                  "gap-2 border-t border-slate-100/90 pt-4",
                  "max-[429px]:grid max-[429px]:w-full",
                  "max-[371px]:grid-cols-1",
                  "[@media(min-width:372px)_and_(max-width:429px)]:grid-cols-2",
                  "min-[430px]:flex min-[430px]:w-auto min-[430px]:flex-wrap min-[430px]:items-center"
                )}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 min-w-0 gap-1.5"
                  onClick={() => c.addGroupRow()}
                  disabled={!canUseMutexRule}
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Adicionar lista
                </Button>
                <Button
                  type="button"
                  className="h-9 min-w-0 gap-1.5"
                  onClick={() => void c.saveConstraints()}
                  disabled={c.isSaving}
                >
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
