"use client";

import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function passwordFieldShellClass(dark?: boolean) {
  return cn(
    "flex h-11 min-w-0 overflow-hidden rounded-lg border text-sm transition-colors focus-within:outline-none focus-within:ring-2",
    dark
      ? "border-slate-600/80 bg-slate-900/50 focus-within:border-indigo-400 focus-within:ring-indigo-500/25"
      : "border-slate-200 bg-white focus-within:border-indigo-400 focus-within:ring-indigo-500/20"
  );
}

export function PasswordToggleField({
  id,
  dark,
  value,
  onChange,
  visible,
  onToggleVisible,
  autoComplete,
  placeholder,
  minLength,
  required = true
}: {
  id: string;
  dark?: boolean;
  value: string;
  onChange: (next: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  autoComplete: string;
  placeholder: string;
  minLength?: number;
  required?: boolean;
}) {
  return (
    <div className={cn(passwordFieldShellClass(dark), "password-field-custom-toggle")}>
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={minLength}
        className={cn(
          "h-11 min-h-0 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-0 shadow-none ring-0 ring-offset-0 transition-colors",
          "focus-visible:border-0 focus-visible:ring-0",
          dark
            ? "text-white placeholder:text-slate-500"
            : "text-slate-900 placeholder:text-slate-400"
        )}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center border-l transition-[color,background-color]",
          dark
            ? "border-slate-600/80 text-slate-400 hover:bg-white/[0.07] hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/35"
            : "border-slate-200 text-slate-500 hover:bg-indigo-50/80 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/25"
        )}
      >
        {visible ? (
          <EyeOff className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={1.85} aria-hidden />
        ) : (
          <Eye className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={1.85} aria-hidden />
        )}
      </button>
    </div>
  );
}
