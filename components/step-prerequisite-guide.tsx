"use client";

import Image from "next/image";
import { MoveRight } from "lucide-react";

import platformLogo from "@/app/util/logo.png";
import { Button } from "@/components/ui/button";
import type { TabMode } from "@/lib/types";
import type { StepPrerequisiteGuideModel } from "@/lib/step-prerequisites";

type StepPrerequisiteGuideProps = StepPrerequisiteGuideModel & {
  onNavigate: (tab: TabMode) => void;
};

export default function StepPrerequisiteGuide({
  title,
  lead,
  bullets,
  actions,
  onNavigate
}: StepPrerequisiteGuideProps) {
  return (
    <div
      className="animate-fade-in motion-reduce:animate-none mx-auto max-w-md"
      role="region"
      aria-labelledby="step-guide-title"
    >
      <div className="app-panel overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
        <div className="mb-6 flex justify-center sm:justify-start">
          <Image
            src={platformLogo}
            alt="Aspexy"
            width={200}
            height={48}
            draggable={false}
            className="h-9 w-auto max-w-[11rem] object-contain object-left sm:max-w-none"
            priority={false}
          />
        </div>

        <p className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 sm:text-left">
          Próximo passo
        </p>
        <h2
          id="step-guide-title"
          className="mt-2 text-center text-lg font-semibold tracking-tight text-slate-900 sm:text-left"
        >
          {title}
        </h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-600 sm:text-left">{lead}</p>

        {bullets.length > 0 ? (
          <ul className="mx-auto mt-5 max-w-sm space-y-2.5 text-left sm:mx-0">
            {bullets.map((b) => (
              <li key={b} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {actions.map((a) => (
            <Button
              key={`${a.tab}-${a.label}`}
              type="button"
              className="h-9 gap-2"
              onClick={() => onNavigate(a.tab)}
            >
              {a.label}
              <MoveRight className="h-4 w-4 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
            </Button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400 sm:text-left">
          Depois volte aqui pela barra lateral.
        </p>
      </div>
    </div>
  );
}
