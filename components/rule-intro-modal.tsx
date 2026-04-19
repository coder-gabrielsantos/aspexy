"use client";

import { useCallback, useEffect, useRef } from "react";
import { MoveRight, UsersRound } from "lucide-react";

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
    "Escolha os nomes em cada lista do mesmo jeito que na aba Disciplinas.",
    "Se precisar, crie mais de uma lista para situações diferentes."
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        aria-labelledby="rule-intro-title"
        aria-describedby="rule-intro-desc"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 w-full max-w-md motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:scale-100 animate-dialog-in",
          "app-panel overflow-hidden px-6 py-7 sm:px-8 sm:py-8"
        )}
      >
        <div className="mb-6 flex justify-center">
          <span
            className="grid h-11 w-11 place-items-center rounded-lg border border-indigo-200/80 bg-indigo-50 text-indigo-700"
            aria-hidden
          >
            <UsersRound className="h-5 w-5" strokeWidth={1.75} />
          </span>
        </div>

        <p className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Antes de configurar</p>
        <h2 id="rule-intro-title" className="mt-2 text-center text-lg font-semibold tracking-tight text-slate-900">
          Professores no mesmo horário
        </h2>
        <p id="rule-intro-desc" className="mt-3 text-center text-sm leading-relaxed text-slate-600">
          Use quando só um deles pode estar dando aula naquele momento — por exemplo, mesma sala ou recurso que não
          dá para dividir.
        </p>

        <ul className="mx-auto mt-5 max-w-sm space-y-2.5 text-left">
          {bullets.map((b) => (
            <li key={b} className="flex gap-3 text-sm leading-relaxed text-slate-600">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
          <Button type="button" size="sm" className="gap-2" onClick={acknowledge}>
            Entendi
            <MoveRight className="h-4 w-4 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={close}>
            Agora não
          </Button>
        </div>
      </div>
    </div>
  );
}
