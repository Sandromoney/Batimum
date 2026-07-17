"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

type VerificationCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

const CODE_LENGTH = 6;

export function VerificationCodeInput({
  value,
  onChange,
  disabled = false,
  className,
}: VerificationCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? "");

  const updateValue = useCallback(
    (nextDigits: string[]) => {
      onChange(nextDigits.join("").slice(0, CODE_LENGTH));
    },
    [onChange],
  );

  useEffect(() => {
    if (value.length === CODE_LENGTH) return;
    const firstEmpty = value.length;
    inputRefs.current[firstEmpty]?.focus();
  }, [value]);

  function focusIndex(index: number) {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  }

  function handleDigitChange(index: number, digit: string) {
    const sanitized = digit.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = sanitized;
    updateValue(next);
    if (sanitized && index < CODE_LENGTH - 1) {
      focusIndex(index + 1);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      focusIndex(index - 1);
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
    }
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusIndex(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array.from({ length: CODE_LENGTH }, (_, index) => pasted[index] ?? "");
    updateValue(next);
    focusIndex(Math.min(pasted.length, CODE_LENGTH - 1));
  }

  return (
    <div className={cn("flex justify-center gap-2 sm:gap-2.5", className)}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Chiffre ${index + 1} du code`}
          className="h-12 w-10 rounded-xl border border-[rgba(15,23,42,0.1)] bg-white text-center text-lg font-semibold text-[#0f172a] shadow-[0_2px_8px_rgba(15,23,42,0.04)] outline-none transition-colors focus:border-[rgba(16,185,129,0.45)] focus:ring-4 focus:ring-[rgba(16,185,129,0.1)] sm:h-14 sm:w-12"
          onChange={(event) => handleDigitChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.currentTarget.select()}
        />
      ))}
    </div>
  );
}
