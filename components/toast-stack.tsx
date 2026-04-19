"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastItem = {
  id: number;
  message: string;
  variant: "success" | "error";
  dismissing?: boolean;
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[110] flex w-max max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6"
      aria-live="polite"
    >
      {toasts.map((t, index) => (
        <div
          key={t.id}
          role={t.variant === "error" ? "alert" : "status"}
          style={
            t.dismissing
              ? undefined
              : { animationDelay: `${Math.min(index, 5) * 52}ms` }
          }
          className={cn(
            "pointer-events-auto relative flex w-max max-w-full items-center gap-3 overflow-hidden rounded-lg border py-3 pl-4 pr-3 text-sm shadow-[0_2px_8px_rgba(15,23,42,0.06),0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl motion-reduce:animate-none motion-reduce:blur-none motion-reduce:opacity-100 motion-reduce:shadow-premium-lg",
            t.dismissing ? "animate-toast-out" : "animate-toast-in",
            t.variant === "success" &&
              "border-emerald-200/40 bg-gradient-to-br from-white/95 to-emerald-50/30 text-slate-800 ring-1 ring-emerald-500/[0.07]",
            t.variant === "error" &&
              "border-rose-200/45 bg-gradient-to-br from-white/95 to-rose-50/35 text-slate-800 ring-1 ring-rose-500/[0.08]"
          )}
        >
          <span
            className={cn(
              "absolute inset-y-2.5 left-0 w-[3px] rounded-sm",
              t.variant === "success" ? "bg-gradient-to-b from-emerald-400 to-teal-500" : "bg-gradient-to-b from-rose-400 to-rose-600"
            )}
            aria-hidden
          />
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md motion-reduce:animate-none",
              t.dismissing ? "" : "animate-toast-icon-in",
              t.variant === "success"
                ? "bg-emerald-500/[0.12] text-emerald-600"
                : "bg-rose-500/[0.12] text-rose-600"
            )}
          >
            {t.variant === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.25} />
            ) : (
              <XCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
            )}
          </div>
          <p className="min-w-0 shrink break-words text-left leading-snug tracking-tight text-slate-700">
            {t.message}
          </p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-[color,transform,background-color] duration-200 ease-out hover:bg-slate-900/[0.05] hover:text-slate-600 active:scale-[0.94]"
            aria-label="Fechar notificação"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
}
