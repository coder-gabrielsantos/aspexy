"use client";

import { useCallback, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UnsavedChangesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  isPending?: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void | Promise<void>;
};

export default function UnsavedChangesDialog({
  open,
  onOpenChange,
  title = "Salvar alterações?",
  description = "Existem alterações que ainda não foram salvas. O que deseja fazer?",
  isPending = false,
  onSave,
  onDiscard
}: UnsavedChangesDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    if (!isPending) onOpenChange(false);
  }, [isPending, onOpenChange]);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[8px] motion-reduce:animate-none motion-reduce:opacity-100 animate-dialog-overlay-in"
        aria-label="Fechar (permanece nesta tela)"
        onClick={close}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-dialog-title"
        aria-describedby="unsaved-dialog-desc"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 w-full max-w-[420px] motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:scale-100 animate-dialog-in",
          "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_24px_48px_-12px_rgba(15,23,42,0.18)]",
          "outline-none ring-1 ring-slate-900/[0.03]"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-200/80 to-transparent" aria-hidden />

        <div className="relative px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-1 pt-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Alterações pendentes</p>
              <h2 id="unsaved-dialog-title" className="mt-1.5 text-base font-semibold leading-snug tracking-tight text-slate-900">
                {title}
              </h2>
              <p id="unsaved-dialog-desc" className="mt-2.5 text-sm leading-relaxed text-slate-600">
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={isPending}
              aria-label="Fechar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:pointer-events-none disabled:opacity-40"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => void onDiscard()}
              className="h-10 px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:h-9"
            >
              Descartar
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => void onSave()}
              className="h-10 min-w-[8.5rem] gap-2 text-sm font-semibold shadow-sm sm:h-9"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  Aguarde…
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
