"use client";

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
  isPending = false
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
        aria-label="Fechar dialogo"
        onClick={() => !isPending && onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm animate-scale-in rounded-2xl border border-slate-200/60 bg-white p-6 shadow-premium-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{description}</p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="h-9 text-[13px]"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => void onConfirm()}
            className={cn(
              "h-9 text-[13px]",
              variant === "danger"
                ? "bg-rose-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(225,29,72,0.25)] hover:bg-rose-700 hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_6px_20px_rgba(225,29,72,0.3)]"
                : ""
            )}
          >
            {isPending ? "Aguarde..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
