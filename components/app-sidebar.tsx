"use client";

import { Fragment, useEffect } from "react";
import { Lock, LogOut, Menu, X } from "lucide-react";

import { PlatformLogo } from "@/components/platform-logo";
import type { StepDef } from "@/lib/types";
import { cn } from "@/lib/utils";

const HEADER_ROW =
  "flex h-[var(--app-header-h)] min-h-[3.5rem] shrink-0 items-center border-b border-indigo-200/70 bg-white px-4 shadow-[0_1px_0_rgba(67,56,202,0.08)]";

function UserAvatar({
  imageUrl,
  initials,
  nameLabel
}: {
  imageUrl?: string | null;
  initials: string;
  nameLabel?: string | null;
}) {
  if (imageUrl) {
    return (
      // Avatar externo (Google); <img> evita depender de hostname fixo no next.config
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={nameLabel ? `Foto de ${nameLabel}` : "Foto do perfil"}
        width={32}
        height={32}
        referrerPolicy="no-referrer"
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-indigo-200/90"
      />
    );
  }
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-600 text-[10px] font-semibold text-white shadow-sm shadow-indigo-950/20">
      {initials}
    </div>
  );
}

type AppSidebarProps = {
  steps: StepDef[];
  activeStep: string;
  completedSteps: Set<string>;
  lockedSteps: Set<string>;
  onStepChange: (id: string) => void;
  userName?: string | null;
  userImage?: string | null;
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
  userImage,
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

  const renderDesktopNavItem = (step: StepDef) => {
    const isActive = step.id === activeStep;
    const isCompleted = completedSteps.has(step.id);
    const isLocked = lockedSteps.has(step.id);
    const isClickable = !isLocked || isActive;
    const Icon = step.icon;

    return (
      <button
        key={step.id}
        type="button"
        onClick={() => isClickable && onStepChange(step.id)}
        disabled={isLocked && !isActive}
        title={isLocked ? "Complete as etapas anteriores" : step.label}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150",
          isActive &&
            "bg-gradient-to-r from-indigo-700 to-indigo-800 text-white shadow-sm shadow-indigo-950/15",
          !isActive && !isLocked && "text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-950",
          !isActive && isLocked && "cursor-not-allowed text-slate-300"
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
            isActive && "bg-white/15 text-white",
            !isActive && !isLocked && isCompleted && "bg-indigo-100/80 text-indigo-800",
            !isActive && !isCompleted && !isLocked && "bg-slate-50 text-slate-500 group-hover:bg-indigo-50/80 group-hover:text-indigo-700",
            !isActive && isLocked && "bg-slate-50 text-slate-300"
          )}
        >
          {isLocked && !isActive ? (
            <Lock className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{step.label}</span>
      </button>
    );
  };

  const mobileNavContent = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 pb-4 pt-3" aria-label="Navegação principal">
      <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Etapas
      </p>
      {steps.map((step) => {
        const isActive = step.id === activeStep;
        const isLocked = lockedSteps.has(step.id);
        const isClickable = !isLocked || isActive;
        const Icon = step.icon;
        const isGenerate = step.id === "generate";
        const isCompleted = completedSteps.has(step.id);

        return (
          <Fragment key={step.id}>
            {isGenerate && (
              <div className="mx-2 my-2 border-t border-slate-200 pt-2" role="presentation" aria-hidden />
            )}
            <button
              type="button"
              onClick={() => {
                if (isClickable) {
                  onStepChange(step.id);
                  onMobileOpenChange(false);
                }
              }}
              disabled={isLocked && !isActive}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors duration-150",
                isActive && "bg-gradient-to-r from-indigo-700 to-indigo-800 text-white shadow-sm shadow-indigo-950/15",
                !isActive && !isLocked && "text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-950",
                !isActive && isLocked && "cursor-not-allowed text-slate-300"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                  isActive && "bg-white/15 text-white",
                  !isActive && !isLocked && isCompleted && "bg-indigo-100/80 text-indigo-800",
                  !isActive && !isLocked && !isCompleted && "bg-slate-50 text-slate-500 group-hover:bg-indigo-50/80 group-hover:text-indigo-700",
                  !isActive && isLocked && "bg-slate-50 text-slate-300"
                )}
              >
                {isLocked && !isActive ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
              </span>
              <span className="truncate">{step.label}</span>
            </button>
          </Fragment>
        );
      })}
    </nav>
  );

  const mainSteps = steps.filter((s) => s.id !== "generate");
  const generateStep = steps.filter((s) => s.id === "generate");

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-[260px] flex-col border-r border-indigo-200/80 bg-white lg:flex">
        <div className={HEADER_ROW}>
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-indigo-300/55 bg-gradient-to-br from-indigo-100/95 to-sky-100/80 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <PlatformLogo size={32} className="h-7 w-7" priority />
          </div>
          <div className="min-w-0 pl-1">
            <p className="truncate bg-gradient-to-r from-indigo-950 via-indigo-900 to-sky-800 bg-clip-text text-sm font-semibold tracking-tight text-transparent">
              Aspexy
            </p>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 px-3 py-4" aria-label="Navegação principal">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Etapas
          </p>
          {mainSteps.map(renderDesktopNavItem)}
          <div className="mx-2 my-2 border-t border-slate-200 pt-2" aria-hidden />
          {generateStep.map(renderDesktopNavItem)}
        </nav>

        <div className="border-t border-slate-200/80 p-3">
          <div className="flex items-center gap-3 px-1 py-0.5">
            <UserAvatar imageUrl={userImage} initials={userInitials} nameLabel={userName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{userName ?? "Usuário"}</p>
              <p className="text-xs text-slate-500">Google</p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sair da conta"
              className="shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-800"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-[60] flex h-[var(--app-header-h)] min-h-[3.5rem] shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-indigo-300/55 bg-gradient-to-br from-indigo-100/95 to-sky-100/80 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <PlatformLogo size={28} className="h-7 w-7" priority />
          </div>
          <span className="truncate bg-gradient-to-r from-indigo-950 via-indigo-900 to-sky-800 bg-clip-text text-sm font-semibold text-transparent">
            Aspexy
          </span>
        </div>
        <button
          type="button"
          onClick={() => onMobileOpenChange(!mobileOpen)}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 top-[var(--app-header-h)] z-50 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => onMobileOpenChange(false)}
        />
      )}

      <aside
        className={cn(
          "fixed bottom-0 left-0 z-[55] flex w-[min(18rem,100vw)] flex-col border-r border-slate-200 bg-white shadow-[4px_0_24px_rgba(15,23,42,0.06)] transition-transform duration-300 ease-out lg:hidden",
          "top-[var(--app-header-h)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {mobileNavContent}
        </div>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-1 py-0.5">
            <UserAvatar imageUrl={userImage} initials={userInitials} nameLabel={userName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{userName ?? "Usuário"}</p>
              <p className="text-xs text-slate-500">Google</p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sair da conta"
              className="shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-800"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
