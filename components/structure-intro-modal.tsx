"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StructureIntroModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function StructureIntroModal({ open, onOpenChange }: StructureIntroModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

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

  const bullets = [
    "Defina os horários de cada slot na coluna Horário.",
    "Clique em qualquer célula para escolher seu estado: Aula, Livre, Intervalo ou Fixo.",
    "Ao escolher Fixo, você pode dar um nome ao horário.",
    "Use Adicionar slot para criar novas linhas e Salvar para gravar a estrutura."
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
        aria-labelledby="structure-intro-title"
        aria-describedby="structure-intro-desc"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 flex max-h-[min(88vh,620px)] w-full max-w-lg flex-col motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:scale-100 animate-dialog-in",
          "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18)]"
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="min-w-0 flex-1">
            <div className="min-w-0 pt-0.5">
              <p className="text-xs font-medium text-slate-500">Estrutura da grade</p>
              <h2 id="structure-intro-title" className="mt-1 text-base font-semibold leading-snug tracking-tight text-slate-900 sm:text-[17px]">
                Como montar o horário
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
          <p id="structure-intro-desc" className="text-sm leading-relaxed text-slate-600">
            Defina os slots e o estado de cada célula da semana para montar a base do horário. Essa estrutura será
            usada como referência na geração automática.
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
          <Button type="button" size="sm" className="min-w-[7.5rem]" onClick={close}>
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}
