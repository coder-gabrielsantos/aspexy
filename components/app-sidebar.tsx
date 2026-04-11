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
    <nav className="flex flex-1 flex-col gap-1.5 px-3 pb-5 pt-3" aria-label="Navegação principal">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500/90">
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
                className="mx-3 mt-4 border-t border-white/[0.08] pt-4"
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
                "group relative flex w-full items-center gap-3 rounded-md px-3 text-left transition-all duration-200",
                isGenerate ? "py-3" : "py-2.5",
                isGenerate && "text-[13px] font-semibold tracking-tight",
                !isGenerate && "text-[13px] font-medium",
                isActive &&
                  "bg-indigo-500/[0.2] text-white shadow-[inset_3px_0_0_0] shadow-indigo-400/90",
                isGenerate &&
                  !isActive &&
                  !isLocked &&
                  "border border-white/[0.07] bg-gradient-to-br from-white/[0.09] to-white/[0.02] text-white shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] hover:border-white/[0.1] hover:from-white/[0.11]",
                isGenerate && !isActive && isLocked && "border border-white/[0.04] text-slate-500",
                !isGenerate && !isActive && isCompleted && "text-white/90 hover:bg-white/[0.06]",
                !isGenerate && !isActive && !isCompleted && !isLocked && "text-slate-300 hover:bg-white/[0.06] hover:text-white",
                !isGenerate && !isActive && isLocked && "cursor-not-allowed text-slate-600",
                isGenerate && isActive && "border-transparent"
              )}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                  isGenerate ? "h-10 w-10" : "h-9 w-9",
                  isActive && !isGenerate && "bg-indigo-500/30 text-indigo-100",
                  isActive && isGenerate && "bg-indigo-400/30 text-white",
                  isGenerate && !isActive && !isLocked && "bg-white/[0.12] text-white",
                  !isGenerate && !isActive && isCompleted && "bg-white/[0.08] text-white",
                  !isGenerate && !isActive && !isCompleted && !isLocked && "bg-white/[0.06] text-slate-400 group-hover:bg-white/10 group-hover:text-slate-200",
                  !isActive && isLocked && "bg-white/[0.03] text-slate-600"
                )}
              >
                {isLocked && !isActive ? (
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Icon className={cn("h-4 w-4", isGenerate && "h-[18px] w-[18px]")} strokeWidth={2} aria-hidden />
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
    <div className="border-t border-white/[0.06] p-3.5">
      <div className="flex items-center gap-3 rounded-md bg-white/[0.035] p-2.5 ring-1 ring-white/[0.05]">
        <div className="gradient-primary grid h-9 w-9 shrink-0 place-items-center rounded-md text-[11px] font-semibold text-white shadow-sm">
          {userInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white">{userName ?? "Usuário"}</p>
          <p className="text-[11px] text-slate-500">Conta Google</p>
        </div>
        <button
          type="button"
          onClick={() => onSignOut()}
          title="Sair"
          className="shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const brand = (
    <div className="flex items-center gap-3.5 border-b border-white/[0.06] px-5 py-6">
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-white/[0.07] p-1 ring-1 ring-white/[0.09]">
        <PlatformLogo size={44} className="h-9 w-9" priority />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold tracking-tight text-white">Aspexy</p>
        <p className="text-[11px] tracking-wide text-slate-500/95">Horários escolares</p>
      </div>
    </div>
  );

  const sidebarInner = (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-[#11141c] via-[#0d1017] to-[#090b0f]">
      {brand}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">{nav}</div>
      {userBlock}
    </div>
  );

  return (
    <div className="flex min-h-0 shrink-0 flex-col lg:h-screen lg:w-[260px]">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-[60] flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-gradient-to-r from-[#11141c] to-[#0d1017] px-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-white/[0.08] p-0.5 ring-1 ring-white/10">
            <PlatformLogo size={36} className="h-7 w-7" priority />
          </div>
          <span className="truncate text-[15px] font-semibold text-white">Aspexy</span>
        </div>
        <button
          type="button"
          onClick={() => onMobileOpenChange(!mobileOpen)}
          className="rounded-md p-2 text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
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
          "fixed bottom-0 left-0 top-14 z-[55] flex w-[min(18rem,100vw)] flex-col border-r border-white/[0.05] shadow-[4px_0_48px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out lg:static lg:top-auto lg:z-0 lg:flex-1 lg:min-h-0 lg:w-full lg:max-w-none lg:translate-x-0 lg:shadow-[2px_0_32px_rgba(0,0,0,0.25)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarInner}
      </aside>
    </div>
  );
}
