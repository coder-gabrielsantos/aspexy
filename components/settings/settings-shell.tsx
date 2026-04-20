"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CreditCard, KeyRound, LogOut, UserRound } from "lucide-react";

import platformLogo from "@/app/util/logo.png";
import { cn } from "@/lib/utils";

import { buttonVariants } from "@/components/ui/button";

const NAV = [
  { href: "/configuracoes/perfil", label: "Perfil", icon: UserRound },
  { href: "/configuracoes/autenticacao", label: "Autenticação", icon: KeyRound },
  { href: "/configuracoes/faturamento", label: "Faturamento", icon: CreditCard }
] as const;

type SettingsShellProps = {
  children: React.ReactNode;
};

export function SettingsShell({ children }: SettingsShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <header className="border-b border-slate-200/90 bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center rounded-lg outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-indigo-500/35"
          >
            <Image
              src={platformLogo}
              alt="Aspexy"
              width={220}
              height={64}
              className="h-8 w-auto object-contain lg:h-10"
              priority
            />
          </Link>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "no-underline")}
            >
              Ir para o aplicativo
            </Link>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              aria-label="Sair da conta"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "inline-flex gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1100px] flex-col gap-0 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10">
        <nav
          className="mb-8 w-full shrink-0 lg:mb-0 lg:w-[240px]"
          aria-label="Configurações da conta"
        >
          <ul className="space-y-0.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href === "/configuracoes/perfil" && pathname === "/configuracoes") ||
                (href === "/configuracoes/autenticacao" &&
                  (pathname === "/configuracoes/emails" ||
                    pathname === "/configuracoes/password" ||
                    pathname === "/configuracoes/email-senha" ||
                    pathname === "/settings/emails" ||
                    pathname === "/settings/password" ||
                    pathname === "/settings/email-senha"));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-3.5 sm:py-2.5",
                      active
                        ? "bg-slate-200/60 text-slate-900 before:absolute before:left-0 before:top-1/2 before:h-7 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-indigo-600"
                        : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-900"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 rounded-md border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.03]">
          {children}
        </div>
      </div>
    </div>
  );
}
