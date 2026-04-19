"use client";

import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "danger";
  isPending?: boolean;
  /** Só um botão (confirmText); para avisos sem ação secundária. */
  alert?: boolean;
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  variant = "default",
  isPending = false,
  alert = false
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    if (!isPending) onOpenChange(false);
  }, [isPending, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const timer = requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(timer);
      previousFocusRef.current?.focus();
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
        } else {
          if (document.activeElement === last || !panel.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#03050a]/40 backdrop-blur-[10px] motion-reduce:animate-none motion-reduce:opacity-100 animate-dialog-overlay-in"
        aria-label="Fechar diálogo"
        onClick={close}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:scale-100 animate-dialog-in rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_2px_8px_rgba(15,23,42,0.04),0_24px_64px_rgba(15,23,42,0.12)] backdrop-blur-xl outline-none ring-1 ring-slate-900/[0.04]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
        <p id="confirm-dialog-desc" className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        {alert ? (
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              disabled={isPending}
              onClick={() => {
                void onConfirm();
                close();
              }}
              className={cn(
                "h-9 text-sm",
                variant === "danger"
                  ? "bg-rose-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(225,29,72,0.25)] hover:bg-rose-700 hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_6px_20px_rgba(225,29,72,0.3)]"
                  : ""
              )}
            >
              {isPending ? "Aguarde..." : confirmText}
            </Button>
          </div>
        ) : (
          <div className="mt-6 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={close}
              className="h-9 text-sm"
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => void onConfirm()}
              className={cn(
                "h-9 text-sm",
                variant === "danger"
                  ? "bg-rose-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(225,29,72,0.25)] hover:bg-rose-700 hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_6px_20px_rgba(225,29,72,0.3)]"
                  : ""
              )}
            >
              {isPending ? "Aguarde..." : confirmText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
