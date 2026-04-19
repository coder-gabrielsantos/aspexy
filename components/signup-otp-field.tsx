"use client";

import { useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import { SIGNUP_OTP_LENGTH } from "@/lib/signup-verification-shared";
import { cn } from "@/lib/utils";

type SignupOtpFieldProps = {
  value: string;
  onChange: (next: string) => void;
  dark?: boolean;
  disabled?: boolean;
  /** Quando passa a true, foca o primeiro dígito uma vez (ex.: ao entrar no passo do código). */
  focusTrigger?: number;
};

function cellClass(dark?: boolean) {
  return cn(
    "h-12 w-full min-w-0 rounded-lg border text-center text-lg font-semibold tabular-nums tracking-tight transition-colors",
    "focus-visible:outline-none focus-visible:ring-2",
    dark
      ? "border-slate-600/80 bg-slate-900/50 text-white focus-visible:border-indigo-400 focus-visible:ring-indigo-500/25"
      : "border-slate-200 bg-white text-slate-900 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20"
  );
}

export function SignupOtpField({ value, onChange, dark, disabled, focusTrigger }: SignupOtpFieldProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(SIGNUP_OTP_LENGTH - 1, i))];
    el?.focus();
    el?.select();
  };

  useEffect(() => {
    if (focusTrigger === undefined) return;
    if (disabled) return;
    const t = requestAnimationFrame(() => focusAt(0));
    return () => cancelAnimationFrame(t);
    // focusAt refs estáveis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTrigger, disabled]);

  const digitAt = (i: number) => value[i] ?? "";

  const applyDigits = (digits: string) => {
    onChange(digits.replace(/\D/g, "").slice(0, SIGNUP_OTP_LENGTH));
  };

  const handleChange = (index: number, raw: string) => {
    const last = raw.replace(/\D/g, "").slice(-1);
    if (raw === "") {
      onChange(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    if (!last) return;
    const next = (value.slice(0, index) + last + value.slice(index + 1)).slice(0, SIGNUP_OTP_LENGTH);
    onChange(next);
    if (index < SIGNUP_OTP_LENGTH - 1) focusAt(index + 1);
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digitAt(index) && index > 0) {
      e.preventDefault();
      focusAt(index - 1);
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusAt(index - 1);
    }
    if (e.key === "ArrowRight" && index < SIGNUP_OTP_LENGTH - 1) {
      e.preventDefault();
      focusAt(index + 1);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    applyDigits(text);
    const len = Math.min(SIGNUP_OTP_LENGTH, text.replace(/\D/g, "").length);
    focusAt(Math.min(len, SIGNUP_OTP_LENGTH - 1));
  };

  return (
    <div
      role="group"
      aria-label="Código de verificação de 6 dígitos"
      className="grid grid-cols-6 gap-2 sm:gap-2.5"
      onPaste={onPaste}
    >
      {Array.from({ length: SIGNUP_OTP_LENGTH }, (_, i) => (
        <Input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          type="text"
          maxLength={1}
          disabled={disabled}
          value={digitAt(i)}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={cn(cellClass(dark), "px-0 shadow-none ring-offset-0", dark ? "ring-offset-[#03050a]" : "ring-offset-white")}
          aria-label={`Dígito ${i + 1} de ${SIGNUP_OTP_LENGTH}`}
        />
      ))}
    </div>
  );
}
