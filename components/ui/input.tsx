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
        "focus:border-primary/60 focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10",
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
}: {
  value: string;
  onChangeValue: (value: string) => void;
  className?: string;
  required?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(isoDateToDateFR(value));

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
      className={className}
      onChange={(event) => {
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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
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
        "focus:border-primary/60 focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10",
        className,
      )}
      {...props}
    />
  );
});

export { Select } from "@/components/ui/select";
