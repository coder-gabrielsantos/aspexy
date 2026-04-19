"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Menu, X } from "lucide-react";

import platformLogo from "@/app/util/logo.png";
import type { StepDef } from "@/lib/types";
import { cn } from "@/lib/utils";

const HEADER_ROW =
  "flex h-[var(--app-header-h)] min-h-[4rem] shrink-0 items-center justify-center border-b border-slate-200 bg-white px-4 shadow-[0_1px_0_rgba(15,23,42,0.06),0_4px_12px_-2px_rgba(15,23,42,0.06)]";

function UserAvatar({
  imageUrl,
  initials,
  nameLabel,
  size = "sm"
}: {
  imageUrl?: string | null;
  initials: string;
  nameLabel?: string | null;
  size?: "sm" | "md";
}) {
  const box = size === "md" ? "h-10 w-10 text-xs" : "h-8 w-8 text-[10px]";
  const imgPx = size === "md" ? 40 : 32;

  if (imageUrl) {
    return (
      // Avatar externo (Google); <img> evita depender de hostname fixo no next.config
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={nameLabel ? `Foto de ${nameLabel}` : "Foto do perfil"}
        width={imgPx}
        height={imgPx}
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-indigo-200/90", box)}
      />
    );
  }
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-600 font-semibold text-white shadow-sm shadow-indigo-950/20",
        box
      )}
    >
      {initials}
    </div>
  );
}

type AppSidebarProps = {
  steps: StepDef[];
  activeStep: string;
  onStepChange: (id: string) => void;
  userName?: string | null;
  userImage?: string | null;
  userInitials: string;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

const GROUP_LABEL = "mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400";

function ProfileAccountLink({
  userName,
  userImage,
  userInitials,
  onNavigate
}: {
  userName?: string | null;
  userImage?: string | null;
  userInitials: string;
  onNavigate: () => void;
}) {
  const displayName = userName?.trim() || "Usuário";

  return (
    <Link
      href="/settings/profile"
      onClick={onNavigate}
      aria-label={`Abrir página de perfil e conta de ${displayName}`}
      className={cn(
        "group flex w-full min-w-0 items-center gap-3 border-t border-slate-200/80 bg-white px-3 py-2.5 outline-none transition-colors sm:px-3.5 sm:py-3",
        "hover:bg-indigo-50/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/35"
      )}
    >
      <UserAvatar imageUrl={userImage} initials={userInitials} nameLabel={userName} size="md" />
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold text-slate-800 sm:text-[15px]">{displayName}</p>
        <p className="mt-0.5 truncate text-xs font-medium text-indigo-700 sm:text-[13px]">Perfil e conta</p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600 sm:h-[18px] sm:w-[18px]"
        aria-hidden
      />
    </Link>
  );
}

export default function AppSidebar({
  steps,
  activeStep,
  onStepChange,
  userName,
  userImage,
  userInitials,
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
    const Icon = step.icon;

    return (
      <button
        key={step.id}
        type="button"
        onClick={() => onStepChange(step.id)}
        title={step.label}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
          isActive && "bg-indigo-600 text-white shadow-sm shadow-indigo-950/10",
          !isActive && "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full transition-colors",
            isActive ? "bg-white/85" : "bg-transparent"
          )}
        />
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center transition-colors",
            isActive && "text-white",
            !isActive && "text-indigo-600 group-hover:text-indigo-700"
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.65} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{step.label}</span>
      </button>
    );
  };

  const cadastroTabIds = new Set(["grade", "classes", "teachers", "subjects"]);
  const cadastroSteps = steps.filter((s) => cadastroTabIds.has(s.id));
  const geracaoSteps = steps.filter((s) => !cadastroTabIds.has(s.id));

  const mobileNavContent = (
    <nav className="flex flex-1 flex-col gap-1 px-3 pb-4 pt-4" aria-label="Navegação principal">
      <p className={GROUP_LABEL}>Cadastro</p>
      {cadastroSteps.map((step) => {
        const isActive = step.id === activeStep;
        const Icon = step.icon;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => {
              onStepChange(step.id);
              onMobileOpenChange(false);
            }}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
              isActive && "bg-indigo-600 text-white shadow-sm shadow-indigo-950/10",
              !isActive && "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full transition-colors",
                isActive ? "bg-white/85" : "bg-transparent"
              )}
            />
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center transition-colors",
                isActive && "text-white",
                !isActive && "text-indigo-600 group-hover:text-indigo-700"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.65} />
            </span>
            <span className="truncate">{step.label}</span>
          </button>
        );
      })}
      <p className={cn(GROUP_LABEL, "mt-4")}>Geração</p>
      {geracaoSteps.map((step) => {
        const isActive = step.id === activeStep;
        const Icon = step.icon;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => {
              onStepChange(step.id);
              onMobileOpenChange(false);
            }}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
              isActive && "bg-indigo-600 text-white shadow-sm shadow-indigo-950/10",
              !isActive && "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full transition-colors",
                isActive ? "bg-white/85" : "bg-transparent"
              )}
            />
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center transition-colors",
                isActive && "text-white",
                !isActive && "text-indigo-600 group-hover:text-indigo-700"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.65} />
            </span>
            <span className="truncate">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-[260px] flex-col border-r border-indigo-200/80 bg-white lg:flex">
        <div className={HEADER_ROW}>
          <button
            type="button"
            onClick={() => onStepChange("grade")}
            aria-label="Ir para Estrutura"
            className="rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-indigo-500/35"
          >
            <Image
              src={platformLogo}
              alt="Aspexy"
              width={220}
              height={64}
              draggable={false}
              className="h-10 w-auto object-contain"
              priority
            />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 px-3 py-4" aria-label="Navegação principal">
          <p className={GROUP_LABEL}>Cadastro</p>
          {cadastroSteps.map(renderDesktopNavItem)}
          <p className={cn(GROUP_LABEL, "mt-4")}>Geração</p>
          {geracaoSteps.map(renderDesktopNavItem)}
        </nav>

        <ProfileAccountLink
          userName={userName}
          userImage={userImage}
          userInitials={userInitials}
          onNavigate={() => onMobileOpenChange(false)}
        />
      </aside>

      <header className="sticky top-0 z-[60] flex h-[var(--app-header-h)] min-h-[4rem] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 shadow-[0_1px_0_rgba(15,23,42,0.06),0_4px_12px_-2px_rgba(15,23,42,0.08)] lg:hidden">
        <button
          type="button"
          onClick={() => {
            onStepChange("grade");
            onMobileOpenChange(false);
          }}
          aria-label="Ir para Estrutura"
          className="shrink-0 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-indigo-500/35"
        >
          <Image
            src={platformLogo}
            alt="Aspexy"
            width={120}
            height={36}
            draggable={false}
            className="h-8 w-auto object-contain"
            priority
          />
        </button>
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

      <button
        type="button"
        aria-label="Fechar menu"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 top-[var(--app-header-h)] z-50 bg-slate-950/40 backdrop-blur-[2px] lg:hidden",
          "transition-opacity duration-700 ease-out motion-reduce:transition-none",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => {
          if (mobileOpen) onMobileOpenChange(false);
        }}
      />

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
        <ProfileAccountLink
          userName={userName}
          userImage={userImage}
          userInitials={userInitials}
          onNavigate={() => onMobileOpenChange(false)}
        />
      </aside>
    </>
  );
}
