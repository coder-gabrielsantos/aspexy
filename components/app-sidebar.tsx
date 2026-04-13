"use client";

import { Fragment, useEffect } from "react";
import { Lock, LogOut, Menu, X } from "lucide-react";

import { PlatformLogo } from "@/components/platform-logo";
import type { StepDef } from "@/components/step-nav";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  steps: StepDef[];
  activeStep: string;
  completedSteps: Set<string>;
  lockedSteps: Set<string>;
  onStepChange: (id: string) => void;
  userName?: string | null;
  userInitials: string;
  onSignOut: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

export default function AppSidebar({
  steps,
  activeStep,
  completedSteps,
  lockedSteps,
  onStepChange,
  userName,
  userInitials,
  onSignOut,
  mobileOpen,
  onMobileOpenChange
}: AppSidebarProps) {
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 pb-4 pt-2.5" aria-label="Navegação principal">
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        Etapas
      </p>
      {steps.map((step) => {
        const isActive = step.id === activeStep;
        const isCompleted = completedSteps.has(step.id);
        const isLocked = lockedSteps.has(step.id);
        const isClickable = !isLocked || isActive;
        const Icon = step.icon;
        const isGenerate = step.id === "generate";

        return (
          <Fragment key={step.id}>
            {isGenerate ? (
              <div
                className="mx-2 mt-3 border-t border-slate-200 pt-3"
                role="presentation"
                aria-hidden
              />
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (isClickable) {
                  onStepChange(step.id);
                  onMobileOpenChange(false);
                }
              }}
              disabled={isLocked && !isActive}
              title={isLocked ? "Complete as etapas anteriores" : step.label}
              className={cn(
                "group relative flex w-full items-center gap-3.5 rounded-lg border border-transparent px-3 text-left text-[13px] transition-colors duration-150",
                isGenerate ? "py-2.5 font-semibold tracking-tight" : "py-2.5 font-medium",
                isActive && "border-slate-300 text-slate-900",
                !isActive && !isLocked && isCompleted && "text-slate-700 hover:text-slate-900",
                !isActive && !isCompleted && !isLocked && "text-slate-600 hover:text-slate-900",
                !isActive && isLocked && "cursor-not-allowed text-slate-300"
              )}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center transition-colors duration-200",
                  isGenerate ? "h-10 w-10" : "h-9 w-9",
                  isActive && "text-slate-900",
                  !isActive && !isLocked && "text-slate-500 group-hover:text-slate-700",
                  !isActive && isLocked && "text-slate-300"
                )}
              >
                {isLocked && !isActive ? (
                  <Lock className="h-4.5 w-4.5" aria-hidden />
                ) : (
                  <Icon className={cn("h-5 w-5", isGenerate && "h-[22px] w-[22px]")} strokeWidth={2} aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{step.label}</span>
            </button>
          </Fragment>
        );
      })}
    </nav>
  );

  const userBlock = (
    <div className="border-t border-slate-200 p-3.5">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-900 text-[11px] font-semibold text-white">
          {userInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-slate-800">{userName ?? "Usuário"}</p>
          <p className="text-[11px] text-slate-500">Conta Google</p>
        </div>
        <button
          type="button"
          onClick={() => onSignOut()}
          title="Sair"
          className="shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const brand = (
    <div className="flex items-center gap-3.5 border-b border-slate-200 px-4 py-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100 p-1 ring-1 ring-slate-200">
        <PlatformLogo size={44} className="h-9 w-9" priority />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold tracking-tight text-slate-900">Aspexy</p>
        <p className="text-[11px] tracking-wide text-slate-500">Horários escolares</p>
      </div>
    </div>
  );

  const sidebarInner = (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {brand}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">{nav}</div>
      {userBlock}
    </div>
  );

  return (
    <div className="flex min-h-0 shrink-0 flex-col lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-[260px] lg:self-start">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-[60] flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100 p-0.5 ring-1 ring-slate-200">
            <PlatformLogo size={36} className="h-7 w-7" priority />
          </div>
          <span className="truncate text-[15px] font-semibold text-slate-900">Aspexy</span>
        </div>
        <button
          type="button"
          onClick={() => onMobileOpenChange(!mobileOpen)}
          className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 top-14 z-50 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => onMobileOpenChange(false)}
        />
      ) : null}

      {/* Sidebar panel — abaixo da barra mobile; desktop ocupa a coluna */}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-14 z-[55] flex w-[min(18rem,100vw)] flex-col border-r border-slate-200 shadow-[8px_0_28px_rgba(15,23,42,0.14)] transition-transform duration-300 ease-out lg:static lg:top-auto lg:z-0 lg:flex-1 lg:min-h-0 lg:w-full lg:max-w-none lg:translate-x-0 lg:shadow-[2px_0_16px_rgba(15,23,42,0.08)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarInner}
      </aside>
    </div>
  );
}
