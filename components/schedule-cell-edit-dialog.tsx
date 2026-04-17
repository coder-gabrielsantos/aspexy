"use client";

import { useEffect, useState } from "react";

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
  const [teacherId, setTeacherId] = useState("");
  const [subjectValue, setSubjectValue] = useState("");

  useEffect(() => {
    if (!open) return;
    const t = teacherOptions.find((o) => o.label === initialTeacher);
    setTeacherId(t?.value ?? "");
    const s = subjectOptions.find((o) => o.label === initialSubject);
    setSubjectValue(s?.value ?? "");
  }, [open, initialTeacher, initialSubject, teacherOptions, subjectOptions]);

  const close = () => {
    if (!isPending) onOpenChange(false);
  };

  if (!open) return null;

  const teacherName = teacherOptions.find((o) => o.value === teacherId)?.label ?? "";
  const subjectName = subjectOptions.find((o) => o.value === subjectValue)?.label ?? "";

  const handleSave = () => {
    if (!teacherName.trim() || !subjectName.trim()) return;
    void onSave({ teacher: teacherName.trim(), subject: subjectName.trim() });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
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
        <h2 id="cell-edit-title" className="text-sm font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Ajuste disciplina e professor (um professor por horário).
        </p>

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
            <p className="mb-1.5 text-xs font-medium text-slate-500">Professor</p>
            <ScheduleSelect
              aria-label="Professor"
              options={teacherOptions}
              value={teacherId}
              onChange={setTeacherId}
              placeholder="Selecione o professor"
              maxVisibleMenuItems={4}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            className="text-rose-600 hover:border-rose-200 hover:bg-rose-50"
            disabled={isPending}
            onClick={() => void onSave(null)}
          >
            Remover aula
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isPending || !teacherId || !subjectValue}
              onClick={handleSave}
            >
              {isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
