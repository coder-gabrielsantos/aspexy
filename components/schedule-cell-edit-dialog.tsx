"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import ScheduleSelect from "@/components/schedule-select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScheduleSelectOption } from "@/components/schedule-select";

type ScheduleCellEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  teacherOptions: ScheduleSelectOption[];
  subjectOptions: ScheduleSelectOption[];
  initialTeacher: string;
  initialSubject: string;
  isPending?: boolean;
  onSave: (payload: { teacher: string; subject: string } | null) => void | Promise<void>;
};

function parseTeacherCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ScheduleCellEditDialog({
  open,
  onOpenChange,
  title,
  teacherOptions,
  subjectOptions,
  initialTeacher,
  initialSubject,
  isPending = false,
  onSave
}: ScheduleCellEditDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [subjectValue, setSubjectValue] = useState("");

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const labels = parseTeacherCsv(initialTeacher);
    const nextIds = labels
      .map((label) => teacherOptions.find((o) => o.label === label)?.value)
      .filter((v): v is string => Boolean(v));
    setTeacherIds(nextIds);
    const s = subjectOptions.find((o) => o.label === initialSubject);
    setSubjectValue(s?.value ?? "");
  }, [open, initialTeacher, initialSubject, teacherOptions, subjectOptions]);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  const close = () => {
    if (!isPending) onOpenChange(false);
  };

  if (!open || !mounted) return null;

  const teacherNames = teacherIds
    .map((id) => teacherOptions.find((o) => o.value === id)?.label)
    .filter((t): t is string => Boolean(t && t.trim()))
    .map((t) => t.trim());
  const subjectName = subjectOptions.find((o) => o.value === subjectValue)?.label ?? "";

  const handleSave = () => {
    if (teacherNames.length === 0 || !subjectName.trim()) return;
    void onSave({ teacher: teacherNames.join(", "), subject: subjectName.trim() });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0"
        onClick={close}
        disabled={isPending}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cell-edit-title"
        className={cn(
          "relative z-[101] w-full max-w-md rounded-xl border border-slate-200/90 bg-white p-5 shadow-premium-lg",
          isPending && "pointer-events-none opacity-90"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="cell-edit-title" className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={close}
            disabled={isPending}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Ajuste disciplina e professores.</p>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">Disciplina</p>
            <ScheduleSelect
              aria-label="Disciplina"
              options={subjectOptions}
              value={subjectValue}
              onChange={setSubjectValue}
              placeholder="Selecione a disciplina"
              maxVisibleMenuItems={4}
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">Professores</p>
            <ScheduleSelect
              aria-label="Professor"
              options={teacherOptions}
              isMulti
              value={teacherIds}
              onChange={setTeacherIds}
              placeholder="Selecione um ou mais professores"
              maxVisibleMenuItems={4}
              maxVisibleSelectedValues={2}
              maxVisibleSelectedValuesSm={4}
              multiValueSeparator="comma"
              multiValueDisplay="text"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            className="text-rose-600 hover:border-rose-200 hover:bg-rose-50"
            disabled={isPending}
            onClick={() => void onSave(null)}
          >
            Remover aula
          </Button>
          <Button type="button" disabled={isPending || teacherIds.length === 0 || !subjectValue} onClick={handleSave}>
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
