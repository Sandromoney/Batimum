import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDateFR(date: string): string {
  if (!date) return "—";

  const isoDate = date.slice(0, 10);
  const [rawYear, rawMonth, rawDay] = isoDate.split("-");
  if (
    /^\d{4}$/.test(rawYear ?? "") &&
    /^\d{2}$/.test(rawMonth ?? "") &&
    /^\d{2}$/.test(rawDay ?? "")
  ) {
    return `${rawDay.padStart(2, "0")}/${rawMonth.padStart(2, "0")}/${rawYear}`;
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear());

  return `${day}/${month}/${year}`;
}

export function formatDate(date: string): string {
  return formatDateFR(date);
}

export function formatTime24h(time: string): string {
  const [hours = "00", minutes = "00"] = time.split(":");
  return `${hours.padStart(2, "0").slice(-2)}:${minutes.padStart(2, "0").slice(0, 2)}`;
}

export function formatDateTimeFR(date: string, time?: string): string {
  if (!date) return "—";

  if (time) {
    return `${formatDateFR(date)} à ${formatTime24h(time)}`;
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return formatDateFR(date);

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear());
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} à ${hours}:${minutes}`;
}

export function isoDateToDateFR(date: string): string {
  return date ? formatDateFR(date) : "";
}

export function dateFRToISO(value: string): string {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";

  const [, day, month, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return "";
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
