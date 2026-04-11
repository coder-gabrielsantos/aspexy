"use client";

import { Check, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

export type StepDef = {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>;
};

type StepNavProps = {
  steps: StepDef[];
  activeStep: string;
  completedSteps: Set<string>;
  lockedSteps: Set<string>;
  onStepChange: (id: string) => void;
};

export default function StepNav({ steps, activeStep, completedSteps, lockedSteps, onStepChange }: StepNavProps) {
  return (
    <nav className="flex items-center gap-0" aria-label="Progresso">
      {steps.map((step, i) => {
        const isActive = step.id === activeStep;
        const isCompleted = completedSteps.has(step.id);
        const isLocked = lockedSteps.has(step.id);
        const isClickable = !isLocked || isActive;
        const prevCompleted = i > 0 && completedSteps.has(steps[i - 1].id);

        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "mx-1.5 h-px w-5 transition-all duration-300 sm:mx-2 sm:w-7 lg:mx-2.5 lg:w-9",
                  prevCompleted
                    ? "bg-gradient-to-r from-violet-400 to-indigo-400"
                    : "bg-slate-200"
                )}
              />
            )}

            <button
              type="button"
              onClick={() => isClickable && onStepChange(step.id)}
              disabled={isLocked && !isActive}
              title={isLocked ? "Complete as etapas anteriores" : step.label}
              className={cn(
                "group flex flex-col items-center gap-1.5 outline-none transition-all duration-200",
                isClickable ? "cursor-pointer" : "cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "relative grid h-8 w-8 place-items-center rounded-xl text-xs font-medium transition-all duration-300",
                  isActive && "gradient-primary text-white shadow-glow",
                  isCompleted && !isActive && "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
                  isLocked && !isActive && "bg-slate-50 text-slate-400 ring-1 ring-slate-200",
                  !isActive && !isCompleted && !isLocked && "bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 group-hover:ring-violet-300 group-hover:text-violet-600 group-hover:shadow-md"
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : isLocked && !isActive ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>

              <span
                className={cn(
                  "max-w-[4rem] truncate text-center text-[10px] font-medium leading-tight transition-colors duration-200 sm:max-w-[5rem]",
                  isActive && "gradient-text font-semibold",
                  isCompleted && !isActive && "text-emerald-600",
                  isLocked && !isActive && "text-slate-400",
                  !isActive && !isCompleted && !isLocked && "text-slate-500 group-hover:text-violet-600"
                )}
              >
                {step.label}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
