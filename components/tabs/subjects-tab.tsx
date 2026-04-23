"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

import type { Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

import SubjectGroupTurmasDialog from "@/components/subject-group-turmas-dialog";
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
  onRequestDelete: (subjectIds: string[]) => void;
};

function teacherLabelsCsv(teacherIds: string[], teacherNameById: Record<string, string>) {
  return teacherIds.map((id) => teacherNameById[id]).filter(Boolean);
}

function subjectGroupKey(sub: Subject): string {
  const teachers = [...sub.teacher_ids].sort().join("\u0001");
  return `${sub.name.trim().toLowerCase()}\u0000${sub.lessons_per_week}\u0000${teachers}`;
}

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function softMatch(haystack: string, needle: string): boolean {
  const h = normalizeForSearch(haystack);
  const q = normalizeForSearch(needle);
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => h.includes(t));
}

/** Agrupa por nome + aulas/sem. + mesmo conjunto de professores (só turma pode variar). */
function groupSubjectsForDisplay(subjects: Subject[]): Subject[][] {
  const map = new Map<string, Subject[]>();
  const order: string[] = [];
  for (const sub of subjects) {
    const k = subjectGroupKey(sub);
    if (!map.has(k)) {
      map.set(k, []);
      order.push(k);
    }
    map.get(k)!.push(sub);
  }
  return order.map((k) => {
    const members = [...(map.get(k) ?? [])];
    members.sort((a, b) => a.class_id.localeCompare(b.class_id));
    return members;
  });
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const PAGE_SIZE_SELECT_OPTIONS = PAGE_SIZE_OPTIONS.map((n) => ({
  value: String(n),
  label: String(n),
}));

function TurmasDetailTrigger({
  onClick,
  compact,
  ariaLabel = "Ver detalhes",
  className
}: {
  onClick: () => void;
  compact?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        compact
          ? [
              "inline-flex items-center gap-0.5 font-medium text-indigo-700 underline-offset-2 transition-colors",
              "hover:text-indigo-900 hover:underline",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-0",
              "px-0.5 py-0.5 text-sm"
            ]
          : [
              "inline-flex items-center gap-0.5 font-semibold text-indigo-700 underline-offset-2 transition-colors",
              "hover:text-indigo-900 hover:underline",
              "active:text-indigo-950",
              "min-h-11 px-2 py-2 text-sm touch-manipulation",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-0"
            ],
        className
      )}
    >
      Ver detalhes
      <ChevronRight className={cn("shrink-0 opacity-70", compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
    </button>
  );
}

export default function SubjectsTab({
  subjectsHook: s,
  teacherSelectOptions,
  classSelectOptions,
  teacherNameById,
  classNameById,
  onRequestDelete,
}: SubjectsTabProps) {
  const subjectGroups = useMemo(() => groupSubjectsForDisplay(s.subjects), [s.subjects]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page, setPage] = useState(0);
  const [turmasDetailMembers, setTurmasDetailMembers] = useState<Subject[] | null>(null);

  // Se o usuário confirmar a exclusão (e a lista atualizar), mantém o modal aberto
  // apenas enquanto ainda existirem associações desse grupo; fecha quando zera.
  useEffect(() => {
    if (!turmasDetailMembers) return;
    const existing = new Set(s.subjects.map((sub) => sub.id));
    const next = turmasDetailMembers.filter((m) => existing.has(m.id));
    if (next.length === 0) setTurmasDetailMembers(null);
    else if (next.length !== turmasDetailMembers.length) setTurmasDetailMembers(next);
  }, [s.subjects, turmasDetailMembers]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return subjectGroups;
    return subjectGroups.filter((members) => softMatch(members[0]?.name ?? "", search));
  }, [subjectGroups, search]);

  const totalGroups = filteredGroups.length;
  const pageCount = Math.max(1, Math.ceil(totalGroups / pageSize));

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(totalGroups / pageSize) - 1);
    setPage((p) => Math.min(Math.max(0, p), maxPage));
  }, [totalGroups, pageSize]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const pageGroups = useMemo(() => {
    const start = page * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, page, pageSize]);

  const rangeFrom = totalGroups === 0 ? 0 : page * pageSize + 1;
  const rangeTo = totalGroups === 0 ? 0 : page * pageSize + pageGroups.length;

  return (
    <>
    <div className="animate-fade-in space-y-6">
      <section className="app-panel overflow-hidden">
        <div className="space-y-3 px-3 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
            <div className="min-w-0 flex-1 sm:min-w-[10rem]">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Disciplina</p>
              <Input
                value={s.newSubjectName}
                onChange={(e) => s.setNewSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void s.handleAddSubject();
                }}
                placeholder="Nome da disciplina"
                className="h-11"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Turmas</p>
              <ScheduleSelect
                isMulti
                aria-label="Turmas da disciplina"
                options={classSelectOptions}
                value={s.newSubjectClassIds}
                onChange={s.setNewSubjectClassIds}
                placeholder="Selecione uma ou mais turmas"
                isSearchable={false}
                maxVisibleMenuItems={5}
                maxVisibleSelectedValues={4}
                multiValueSeparator="comma"
                multiValueDisplay="text"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Professores</p>
              <ScheduleSelect
                isMulti
                aria-label="Professores da disciplina"
                options={teacherSelectOptions}
                value={s.newSubjectTeacherIds}
                onChange={s.setNewSubjectTeacherIds}
                placeholder="Selecione os professores"
                isSearchable={false}
                maxVisibleMenuItems={5}
                maxVisibleSelectedValues={4}
                multiValueSeparator="comma"
                multiValueDisplay="text"
              />
            </div>
            <div className="w-full shrink-0 sm:w-[4.5rem]">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Aulas/sem.</p>
              <Input
                type="number"
                min={1}
                max={20}
                value={s.newSubjectLessons}
                onChange={(e) => s.setNewSubjectLessons(e.target.value)}
                className="h-11 tabular-nums"
              />
            </div>
            <div className="flex shrink-0">
              <Button
                type="button"
                onClick={() => void s.handleAddSubject()}
                disabled={
                  !s.newSubjectName.trim() ||
                  s.newSubjectTeacherIds.length === 0 ||
                  s.newSubjectClassIds.length === 0 ||
                  s.isSavingSubject
                }
                className="h-11 min-h-11 w-full min-w-[7.5rem] px-4 py-0 sm:w-auto"
              >
                Adicionar
              </Button>
            </div>
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
        <section className="app-panel-flat overflow-hidden">
          <div className="border-b border-slate-100/90 bg-white px-3 py-3 sm:px-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Buscar</p>
                <p className="mt-0.5 text-xs text-slate-400">Filtra por nome da disciplina</p>
              </div>
              <div className="w-full sm:w-[18rem]">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ex.: Matemática"
                  className="h-11"
                  aria-label="Buscar disciplina"
                />
              </div>
            </div>
          </div>
          {/* Mobile / tablet: cartões em largura total (evita tabela larga cortada) */}
          <div className="divide-y divide-slate-100 md:hidden">
            {pageGroups.map((members) => {
              const sub = members[0]!;
              const multi = members.length > 1;
              const profLabels = teacherLabelsCsv(sub.teacher_ids, teacherNameById);
              const profTitle = profLabels.join(", ");
              const rowKey = members.map((m) => m.id).join("|");
              return (
                <div
                  key={rowKey}
                  className={cn("group bg-white px-3 py-4 transition-colors sm:px-4", "hover:bg-slate-50/60")}
                >
                  <div className="min-w-0 space-y-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-baseline justify-between gap-3">
                      <p
                        className="min-w-0 flex-1 truncate text-base font-medium leading-snug tracking-tight text-slate-900"
                        title={sub.name}
                      >
                        {sub.name}
                      </p>
                        <TurmasDetailTrigger
                          compact
                          className="shrink-0 text-xs"
                          ariaLabel={`Ver detalhes de ${sub.name}`}
                          onClick={() => setTurmasDetailMembers(members)}
                        />
                      </div>
                      <div className="mt-2 flex items-start justify-between gap-3">
                        <p className="pt-0.5 text-sm tabular-nums text-slate-500">
                          <span className="font-semibold text-slate-800">{sub.lessons_per_week}</span> aulas/sem.
                        </p>
                      </div>
                    </div>

                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-600" title={profTitle}>
                      <span className="font-medium text-slate-400">Prof. </span>
                      {profLabels.length > 0 ? profLabels.join(", ") : "—"}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {multi ? "Turmas" : "Turma"}
                        </p>
                        {multi ? (
                          <span className="text-sm tabular-nums text-slate-600">
                            <span className="font-semibold text-slate-800">{members.length}</span> turmas
                          </span>
                        ) : (
                          <span className="block min-w-0 truncate text-sm font-medium tabular-nums text-slate-800">
                            {classNameById[sub.class_id] || "—"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-sm leading-normal xl:min-w-[760px]">
              <colgroup>
                <col className="min-w-[11rem] sm:w-[32%]" />
                <col className="w-[4.25rem]" />
                <col className="min-w-[8rem] sm:w-[28%]" />
                <col className="min-w-[9rem] sm:w-[24%]" />
                <col className="min-w-[6.75rem] w-[7.25rem] sm:w-[7.75rem]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200/90 bg-white">
                  <th className="sticky top-0 z-10 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Disciplina
                  </th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Aulas
                  </th>
                  <th className="sticky top-0 z-10 bg-white px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Professores
                  </th>
                  <th className="sticky top-0 z-10 bg-white px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Turma
                  </th>
                  <th className="sticky top-0 z-10 bg-white px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Detalhes
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageGroups.map((members) => {
                  const sub = members[0]!;
                  const multi = members.length > 1;
                  const profLabels = teacherLabelsCsv(sub.teacher_ids, teacherNameById);
                  const profTitle = profLabels.join(", ");
                  const profDisplay =
                    profLabels.length > 0 ? (
                      <span className="line-clamp-1 text-slate-600" title={profTitle}>
                        {profLabels.join(", ")}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    );
                  const rowKey = members.map((m) => m.id).join("|");
                  return (
                    <tr
                      key={rowKey}
                      className={cn(
                        "group border-b border-slate-100/80 bg-white transition-colors duration-150 last:border-b-0",
                        "hover:bg-slate-50/70"
                      )}
                    >
                      <td className="px-4 py-3 align-middle">
                        <span className="line-clamp-1 min-w-0 text-sm font-medium leading-snug tracking-tight text-slate-900" title={sub.name}>
                          {sub.name}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center align-middle text-sm tabular-nums text-slate-600">
                        {sub.lessons_per_week}
                      </td>
                      <td className="px-3 py-3 align-middle text-sm text-slate-600">{profDisplay}</td>
                      <td className="px-3 py-3 align-middle text-sm text-slate-700">
                        {multi ? (
                          <span className="tabular-nums text-slate-600">
                            <span className="font-semibold text-slate-800">{members.length}</span> turmas
                          </span>
                        ) : (
                          <span className="block truncate font-medium tabular-nums" title={classNameById[sub.class_id] ?? ""}>
                            {classNameById[sub.class_id] || <span className="font-normal text-slate-300">—</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right align-middle">
                        <TurmasDetailTrigger
                          compact
                          ariaLabel={`Ver detalhes de ${sub.name}`}
                          onClick={() => setTurmasDetailMembers(members)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100/90 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4">
            <p className="text-xs text-slate-500">
              {totalGroups > 0 ? (
                <>
                  Mostrando{" "}
                  <span className="font-medium tabular-nums text-slate-700">{rangeFrom}</span>
                  {" — "}
                  <span className="font-medium tabular-nums text-slate-700">{rangeTo}</span> de{" "}
                  <span className="font-medium tabular-nums text-slate-700">{totalGroups}</span>
                </>
              ) : null}
            </p>
            <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
              <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-2">
                <span className="shrink-0 text-xs font-medium text-slate-500">Por página</span>
                <div className="w-[5rem] shrink-0 sm:w-[5.25rem]">
                  <ScheduleSelect
                    aria-label="Itens por página"
                    options={PAGE_SIZE_SELECT_OPTIONS}
                    value={String(pageSize)}
                    onChange={(id) => {
                      const v = Number(id);
                      if (v === 10 || v === 25 || v === 50) {
                        setPageSize(v);
                        setPage(0);
                      }
                    }}
                    isClearable={false}
                    isSearchable={false}
                    placeholder="10"
                    maxVisibleMenuItems={5}
                  />
                </div>
              </div>
              <div className="flex w-full items-center justify-center gap-1 sm:w-auto sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11 min-w-0 flex-1 gap-1 px-2 text-xs sm:flex-initial sm:px-2.5"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">Anterior</span>
                </Button>
                <span className="min-w-[3.25rem] shrink-0 px-1 text-center text-xs tabular-nums text-slate-600 sm:min-w-[4.5rem]">
                  {page + 1} / {pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11 min-w-0 flex-1 gap-1 px-2 text-xs sm:flex-initial sm:px-2.5"
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  aria-label="Próxima página"
                >
                  <span className="truncate">Próxima</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>

      {turmasDetailMembers && turmasDetailMembers[0] ? (
        <SubjectGroupTurmasDialog
          open
          onOpenChange={(next) => {
            if (!next) setTurmasDetailMembers(null);
          }}
          subjectName={turmasDetailMembers[0].name}
          lessonsPerWeek={turmasDetailMembers[0].lessons_per_week}
          professorLine={teacherLabelsCsv(turmasDetailMembers[0].teacher_ids, teacherNameById).join(", ") || "—"}
          members={turmasDetailMembers}
          classNameById={classNameById}
          onRequestDelete={onRequestDelete}
        />
      ) : null}
    </>
  );
}
