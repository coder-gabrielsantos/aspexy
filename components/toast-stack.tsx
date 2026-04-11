"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastItem = {
  id: number;
  message: string;
  variant: "success" | "error";
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[110] flex max-w-xs flex-col gap-2.5 sm:bottom-6 sm:right-6"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex animate-slide-in-right items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] shadow-premium-lg",
            t.variant === "success"
              ? "border-emerald-200/60 bg-white text-slate-800"
              : "border-rose-200/60 bg-white text-slate-800"
          )}
        >
          {t.variant === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          )}
          <p className="leading-snug">{t.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="ml-auto shrink-0 rounded-lg p-0.5 text-slate-400 transition-colors hover:text-slate-600"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
