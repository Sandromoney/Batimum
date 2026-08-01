"use client";

import { cn, dateFRToISO, isoDateToDateFR } from "@/lib/utils";
import { formatPhoneInput, type PhoneFormatMode } from "@/lib/phone";
import { forwardRef, useEffect, useState, type InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-border/80 bg-card/90 px-4 py-3 text-sm text-foreground shadow-[var(--shadow-input)]",
        "placeholder:text-muted-foreground/70",
        "transition-all duration-200",
        "hover:border-border hover:bg-card-elevated/70",
        "focus:border-[rgb(var(--color-accent)/0.55)] focus:bg-card focus:outline-none focus:ring-4 focus:ring-[rgb(var(--color-accent)/0.12)]",
        props.type === "number" &&
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
      {...props}
    />
  );
}

export function DateInput({
  value,
  onChangeValue,
  className,
  required,
  readOnly,
  disabled,
}: {
  value: string;
  onChangeValue: (value: string) => void;
  className?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(isoDateToDateFR(value));
  const locked = Boolean(readOnly || disabled);

  function formatDateInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    return [day, month, year].filter(Boolean).join("/");
  }

  useEffect(() => {
    setDisplayValue(isoDateToDateFR(value));
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="JJ/MM/AAAA"
      value={displayValue}
      required={required}
      readOnly={locked}
      disabled={disabled}
      aria-readonly={locked || undefined}
      className={cn(
        className,
        locked && "cursor-default bg-card-elevated/60 text-muted-foreground",
      )}
      onChange={(event) => {
        if (locked) return;
        const nextValue = formatDateInput(event.target.value);
        setDisplayValue(nextValue);

        if (!nextValue.trim()) {
          onChangeValue("");
          return;
        }

        const isoDate = dateFRToISO(nextValue);
        if (isoDate) onChangeValue(isoDate);
      }}
      onBlur={() => setDisplayValue(isoDateToDateFR(value))}
    />
  );
}

export function Label({
  children,
  className,
  htmlFor,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </label>
  );
}

export function PhoneInput({
  value,
  onChangeValue,
  className,
  mode = "auto",
  placeholder,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onChangeValue: (value: string) => void;
  mode?: PhoneFormatMode;
}) {
  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder}
      value={value}
      className={className}
      onChange={(event) => {
        onChangeValue(formatPhoneInput(event.target.value, mode));
      }}
      {...props}
    />
  );
}

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[88px] w-full rounded-2xl border border-border/80 bg-card/90 px-4 py-3 text-sm text-foreground shadow-[var(--shadow-input)]",
        "placeholder:text-muted-foreground/70",
        "transition-all duration-200",
        "hover:border-border hover:bg-card-elevated/70",
        "focus:border-[rgb(var(--color-accent)/0.55)] focus:bg-card focus:outline-none focus:ring-4 focus:ring-[rgb(var(--color-accent)/0.12)]",
        className,
      )}
      {...props}
    />
  );
});

export { Select } from "@/components/ui/select";
