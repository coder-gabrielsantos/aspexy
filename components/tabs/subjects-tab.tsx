"use client";

import { BookOpen, Plus, Trash2 } from "lucide-react";

import ScheduleSelect from "@/components/schedule-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { useSubjects } from "@/hooks/use-subjects";

type SubjectsTabProps = {
  subjectsHook: ReturnType<typeof useSubjects>;
  teacherSelectOptions: Array<{ value: string; label: string }>;
  classSelectOptions: Array<{ value: string; label: string }>;
  teacherNameById: Record<string, string>;
  classNameById: Record<string, string>;
  onRequestDelete: (subjectId: string) => void;
};

function teacherLabelsCsv(teacherIds: string[], teacherNameById: Record<string, string>) {
  return teacherIds.map((id) => teacherNameById[id]).filter(Boolean);
}

export default function SubjectsTab({
  subjectsHook: s,
  teacherSelectOptions,
  classSelectOptions,
  teacherNameById,
  classNameById,
  onRequestDelete,
}: SubjectsTabProps) {
  return (
    <div className="animate-fade-in space-y-6">
      <section className="app-panel overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Nova disciplina</h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 sm:min-w-[12rem]">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Disciplina</p>
              <Input
                value={s.newSubjectName}
                onChange={(e) => s.setNewSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void s.handleAddSubject();
                }}
                placeholder="Nome da disciplina"
              />
            </div>
            <div className="w-full sm:w-[4.5rem]">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Aulas/sem.</p>
              <Input
                type="number"
                min={1}
                max={20}
                value={s.newSubjectLessons}
                onChange={(e) => s.setNewSubjectLessons(e.target.value)}
                className="tabular-nums"
              />
            </div>
            <div className="min-w-0 sm:min-w-[9rem] sm:flex-1">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Turma</p>
              <ScheduleSelect
                options={classSelectOptions}
                value={s.newSubjectClassId}
                onChange={s.setNewSubjectClassId}
                placeholder="Selecione a turma"
              />
            </div>
            <div className="flex items-end sm:shrink-0">
              <Button
                onClick={() => void s.handleAddSubject()}
                disabled={
                  !s.newSubjectName.trim() ||
                  s.newSubjectTeacherIds.length === 0 ||
                  !s.newSubjectClassId ||
                  s.isSavingSubject
                }
                className="h-9 w-full shrink-0 gap-1.5 sm:w-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-medium text-slate-500">Professores</p>
            <ScheduleSelect
              isMulti
              aria-label="Professores da disciplina"
              options={teacherSelectOptions}
              value={s.newSubjectTeacherIds}
              onChange={s.setNewSubjectTeacherIds}
              placeholder="Selecione os professores"
            />
          </div>
        </div>
      </section>

      {s.subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200/90 bg-white/80 p-12 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-slate-50">
            <BookOpen className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Nenhuma disciplina cadastrada</p>
          <p className="mt-0.5 text-xs text-slate-400">Adicione acima para começar.</p>
        </div>
      ) : (
        <section className="app-panel overflow-hidden">
          <div className="max-h-[min(32rem,60vh)] overflow-auto">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[40%] min-w-[14rem]" />
                <col className="w-12" />
                <col className="w-[32%]" />
                <col className="w-[18%]" />
                <col className="w-10" />
              </colgroup>
              <thead>
                <tr>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Disciplina
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Aulas
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Professores
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Turma
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-1 py-2.5" aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {s.subjects.map((sub) => {
                  const profLabels = teacherLabelsCsv(sub.teacher_ids, teacherNameById);
                  const profTitle = profLabels.join(", ");
                  const profDisplay =
                    profLabels.length > 0 ? (
                      <span className="line-clamp-2" title={profTitle}>
                        {profLabels.join(", ")}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    );
                  return (
                    <tr key={sub.id} className="group transition-colors duration-150 hover:bg-slate-50/50">
                      <td className="border-b border-slate-100/80 px-4 py-2.5 font-medium text-slate-800">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
                            <BookOpen className="h-3 w-3" />
                          </div>
                          <span className="min-w-0 truncate" title={sub.name}>
                            {sub.name}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-slate-100/80 px-2 py-2.5 text-center tabular-nums text-slate-600">
                        {sub.lessons_per_week}
                      </td>
                      <td className="border-b border-slate-100/80 px-4 py-2.5 text-slate-600">{profDisplay}</td>
                      <td className="border-b border-slate-100/80 px-4 py-2.5 text-slate-600">
                        <span className="block truncate" title={classNameById[sub.class_id] ?? ""}>
                          {classNameById[sub.class_id] || <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      <td className="border-b border-slate-100/80 px-1 py-2.5 text-center">
                        <button
                          type="button"
                          aria-label="Excluir disciplina"
                          onClick={() => onRequestDelete(sub.id)}
                          className="rounded-lg p-1.5 text-slate-300 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
