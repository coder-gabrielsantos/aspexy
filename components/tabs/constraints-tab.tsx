"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, CalendarClock, Info, Plus, Trash2, UsersRound } from "lucide-react";

import RuleIntroModal, { type RuleIntroRuleKey } from "@/components/rule-intro-modal";
import ScheduleSelect from "@/components/schedule-select";
import UnsavedChangesDialog from "@/components/unsaved-changes-dialog";
import { Button } from "@/components/ui/button";
import { SkeletonPanel } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  MAX_CONSECUTIVE_LESSONS_PER_CLASS_MAX,
  MAX_LESSONS_PER_DAY_PER_TEACHER_MAX
} from "@/lib/schedule-constraint-defaults";
import type { useScheduleConstraints } from "@/hooks/use-schedule-constraints";
import type { ScheduleSelectOption } from "@/components/schedule-select";

type ConstraintsTabProps = {
  constraintsHook: ReturnType<typeof useScheduleConstraints>;
  teacherSelectOptions: ScheduleSelectOption[];
};

export default function ConstraintsTab({ constraintsHook: c, teacherSelectOptions }: ConstraintsTabProps) {
  const [selectedRule, setSelectedRule] = useState<RuleIntroRuleKey | null>(null);
  const [introRule, setIntroRule] = useState<RuleIntroRuleKey | null>(null);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [leaveFormPending, setLeaveFormPending] = useState(false);

  const canUseMutexRule = teacherSelectOptions.length >= 2;

  const requestBackToRuleList = useCallback(() => {
    if (c.isConstraintsDirty) setLeaveFormOpen(true);
    else setSelectedRule(null);
  }, [c.isConstraintsDirty]);

  const handleLeaveFormSave = useCallback(async () => {
    setLeaveFormPending(true);
    try {
      const ok = await c.saveConstraints();
      if (ok) {
        setLeaveFormOpen(false);
        setSelectedRule(null);
      }
    } finally {
      setLeaveFormPending(false);
    }
  }, [c]);

  const handleLeaveFormDiscard = useCallback(async () => {
    setLeaveFormPending(true);
    try {
      await c.discardConstraintsChanges();
      setLeaveFormOpen(false);
      setSelectedRule(null);
    } finally {
      setLeaveFormPending(false);
    }
  }, [c]);

  if (c.isLoading) {
    return (
      <div className="animate-fade-in space-y-5">
        <SkeletonPanel lines={2} />
      </div>
    );
  }

  return (
    <div className="min-w-0 animate-fade-in space-y-6">
      <UnsavedChangesDialog
        open={leaveFormOpen}
        onOpenChange={(open) => {
          if (!open && !leaveFormPending) setLeaveFormOpen(false);
        }}
        title="Salvar alterações nas regras?"
        description="Você alterou esta regra e ainda não salvou. Deseja salvar antes de voltar à lista?"
        isPending={leaveFormPending || c.isSaving}
        onSave={handleLeaveFormSave}
        onDiscard={handleLeaveFormDiscard}
      />

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
          <h2 className="text-sm font-semibold text-slate-900">Regras de geração</h2>
          <p className="mt-1 text-xs text-slate-500">
            Selecione uma opção e configure como ela entra na montagem automática dos horários.
          </p>
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
                          ? "Só um professor da lista por horário."
                          : "Cadastre ao menos dois professores."}
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
                  className={cn(
                    "flex min-h-[4.5rem] items-stretch overflow-hidden rounded-xl border border-transparent bg-slate-50/60 transition-[background-color,box-shadow,border-color] duration-200",
                    "hover:border-slate-200/85 hover:bg-white hover:shadow-[0_1px_2px_rgba(67,56,202,0.09),0_1px_2px_rgba(15,23,42,0.04)]"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedRule("general_limits")}
                    aria-label="Configurar limites gerais"
                    className={cn(
                      "flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 py-3.5 text-left outline-none sm:px-[1.125rem] sm:py-4",
                      "focus-visible:z-[1] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/25"
                    )}
                  >
                    <CalendarClock className="h-[18px] w-[18px] shrink-0 text-slate-400" strokeWidth={1.5} aria-hidden />
                    <span className="min-w-0 flex-1 py-0.5">
                      <span className="block text-sm font-semibold tracking-tight text-slate-900">Limites gerais</span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                        Aulas por dia e seguidas do mesmo professor na turma.
                      </span>
                    </span>
                  </button>
                  <div className="w-px shrink-0 self-stretch bg-slate-200/70" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setIntroRule("general_limits")}
                    aria-label="Informações sobre limites gerais"
                    className="grid w-11 shrink-0 place-items-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/25"
                  >
                    <Info className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </button>
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
                  onClick={() => requestBackToRuleList()}
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
                  {c.isSaving ? "Salvando..." : "Salvar regras"}
                </Button>
              </div>
            </div>
          ) : selectedRule === "general_limits" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-1.5 text-slate-600"
                  onClick={() => requestBackToRuleList()}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Escolher outra regra
                </Button>
              </div>

              <div className="grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="max-lessons-day-teacher" className="text-xs font-medium text-slate-600">
                    Máx. de aulas por dia por professor
                  </label>
                  <input
                    id="max-lessons-day-teacher"
                    type="number"
                    min={1}
                    max={MAX_LESSONS_PER_DAY_PER_TEACHER_MAX}
                    className="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums outline-none ring-indigo-500/20 focus:border-indigo-300 focus:ring-2"
                    value={c.maxLessonsPerDayPerTeacher}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isNaN(v)) return;
                      c.setMaxLessonsPerDayPerTeacher(v);
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="max-consecutive-class" className="text-xs font-medium text-slate-600">
                    Máx. seguidas por prof. na turma
                  </label>
                  <input
                    id="max-consecutive-class"
                    type="number"
                    min={0}
                    max={MAX_CONSECUTIVE_LESSONS_PER_CLASS_MAX}
                    className="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums outline-none ring-indigo-500/20 focus:border-indigo-300 focus:ring-2"
                    value={c.maxConsecutiveLessonsPerClass}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isNaN(v)) return;
                      c.setMaxConsecutiveLessonsPerClass(v);
                    }}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100/90 pt-4">
                <Button type="button" className="h-9" disabled={c.isSaving} onClick={() => void c.saveConstraints()}>
                  {c.isSaving ? "Salvando..." : "Salvar regras"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
