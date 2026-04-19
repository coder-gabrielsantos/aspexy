"use client";

import { useCallback, useEffect, useRef } from "react";
import { UsersRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RuleIntroRuleKey = "teacher_mutex";

type RuleIntroModalProps = {
  open: boolean;
  rule: RuleIntroRuleKey | null;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
};

export default function RuleIntroModal({ open, rule, onOpenChange, onAcknowledge }: RuleIntroModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const acknowledge = useCallback(() => {
    onAcknowledge();
    onOpenChange(false);
  }, [onAcknowledge, onOpenChange]);

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

  if (!open || rule !== "teacher_mutex") return null;

  const bullets = [
    "Cada lista reúne professores que não podem ter aula ao mesmo tempo.",
    "Se precisar, crie mais de uma lista para situações diferentes."
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-[6px] motion-reduce:animate-none motion-reduce:opacity-100 animate-dialog-overlay-in"
        aria-label="Fechar"
        onClick={close}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rule-intro-title"
        aria-describedby="rule-intro-desc"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 flex max-h-[min(88vh,620px)] w-full max-w-lg flex-col motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:scale-100 animate-dialog-in",
          "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18)]"
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="flex min-w-0 flex-1 gap-4">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"
              aria-hidden
            >
              <UsersRound className="h-5 w-5" strokeWidth={1.65} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-xs font-medium text-slate-500">Regra de geração</p>
              <h2 id="rule-intro-title" className="mt-1 text-base font-semibold leading-snug tracking-tight text-slate-900 sm:text-[17px]">
                Professores no mesmo horário
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <p id="rule-intro-desc" className="text-sm leading-relaxed text-slate-600">
            Use quando só um deles pode estar dando aula naquele momento — por exemplo, mesma sala ou recurso que não
            dá para dividir.
          </p>

          <ul className="mt-6 space-y-0 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50">
            {bullets.map((b) => (
              <li key={b} className="flex gap-3 px-4 py-3.5 text-sm leading-relaxed text-slate-600 first:rounded-t-xl last:rounded-b-xl">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
          <Button type="button" variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900" onClick={close}>
            Agora não
          </Button>
          <Button type="button" size="sm" className="min-w-[7.5rem]" onClick={acknowledge}>
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}
