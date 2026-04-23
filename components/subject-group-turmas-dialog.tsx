"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, X } from "lucide-react";

import type { Subject } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SubjectGroupTurmasDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectName: string;
  lessonsPerWeek: number;
  professorLine: string;
  members: Subject[];
  classNameById: Record<string, string>;
  onRequestDelete: (subjectIds: string[]) => void;
  onRequestRename: (subjectIds: string[], nextName: string) => void | Promise<void>;
  isSaving?: boolean;
};

export default function SubjectGroupTurmasDialog({
  open,
  onOpenChange,
  subjectName,
  lessonsPerWeek,
  professorLine,
  members,
  classNameById,
  onRequestDelete,
  onRequestRename,
  isSaving = false
}: SubjectGroupTurmasDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [nameDraft, setNameDraft] = useState(subjectName);
  const [isEditingName, setIsEditingName] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    setNameDraft(subjectName);
    setIsEditingName(false);
  }, [open, subjectName]);

  useEffect(() => {
    if (!isEditingName) return;
    const t = requestAnimationFrame(() => editNameInputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [isEditingName]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const t = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      cancelAnimationFrame(t);
      previousFocusRef.current?.focus();
    };
  }, [open]);

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

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !panel.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last || !panel.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  const requestDelete = (ids: string[]) => {
    onRequestDelete(ids);
  };
  const canSaveName = nameDraft.trim().length > 0 && nameDraft.trim() !== subjectName.trim() && !isSaving;

  if (!open || !mounted) return null;

  const turmaCount = members.length;
  const deleteAllLabel =
    turmaCount > 1
      ? `Excluir em todas as turmas (${turmaCount})`
      : "Excluir esta disciplina";

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center overscroll-contain p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#03050a]/40 backdrop-blur-[10px] motion-reduce:animate-none motion-reduce:opacity-100 animate-dialog-overlay-in"
        aria-label="Fechar"
        onClick={close}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subject-turmas-title"
        aria-describedby="subject-turmas-desc"
        tabIndex={-1}
        className="relative z-10 flex max-h-[min(36rem,88vh)] w-full max-w-lg flex-col motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:scale-100 animate-dialog-in rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04),0_24px_64px_rgba(15,23,42,0.12)] outline-none ring-1 ring-slate-900/[0.04]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-slate-100 px-5 pb-4 pt-5">
          <button
            type="button"
            aria-label="Fechar"
            onClick={close}
            className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Disciplina</p>
          <h2 id="subject-turmas-title" className="mt-1 text-lg font-medium leading-snug tracking-tight text-slate-900">
            {subjectName}
          </h2>
          {!isEditingName ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                disabled={isSaving}
                aria-label="Editar nome da disciplina"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Editar nome
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <label htmlFor="subject-name-edit" className="mb-1 block text-xs font-medium text-slate-500">
                Nome da disciplina
              </label>
              <div className="flex w-full items-center gap-2">
                <Input
                  ref={editNameInputRef}
                  id="subject-name-edit"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="h-10 w-full flex-1"
                  maxLength={120}
                  disabled={isSaving}
                />
                <Button
                  type="button"
                  className="h-10 shrink-0"
                  disabled={!canSaveName}
                  onClick={() => void onRequestRename(members.map((m) => m.id), nameDraft)}
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <p>
              <span className="text-slate-400">Aulas/sem.</span>{" "}
              <span className="font-semibold tabular-nums text-slate-800">{lessonsPerWeek}</span>
            </p>
            {professorLine ? (
              <p className="min-w-0">
                <span className="text-slate-400">Professores</span>{" "}
                <span className="font-medium text-slate-800">{professorLine}</span>
              </p>
            ) : null}
          </div>
          <p id="subject-turmas-desc" className="mt-3 text-sm leading-relaxed text-slate-500">
            Remova a disciplina de uma turma ou exclua todas as associações de uma vez.
          </p>
        </div>

        <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Turmas vinculadas
            <span className="ml-2 inline-block tabular-nums font-semibold text-slate-600">({turmaCount})</span>
          </p>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto px-5" role="list">
          {members.map((m) => {
            const label = classNameById[m.class_id] ?? m.class_id;
            return (
              <li key={m.id} className="flex items-center justify-between gap-4 py-3.5">
                <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900" title={label}>
                  {label || "—"}
                </span>
                <button
                  type="button"
                  aria-label={`Remover ${subjectName} da turma ${label}`}
                  onClick={() => requestDelete([m.id])}
                  disabled={isSaving}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors",
                    "hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <Trash2 className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
                  <span className="hidden sm:inline">Remover</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/40 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="outline" className="w-full sm:w-auto sm:min-w-[7rem]" onClick={close}>
              Fechar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              className="w-full border-slate-200 text-rose-700 hover:border-slate-200 hover:bg-rose-50 hover:text-rose-900 sm:w-auto sm:min-w-[12rem]"
              onClick={() => requestDelete(members.map((m) => m.id))}
            >
              {deleteAllLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
