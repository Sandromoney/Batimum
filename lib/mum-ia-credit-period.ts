const PARIS_TZ = "Europe/Paris";

export type ParisYmd = { year: number; month: number; day: number };

export function getParisYmd(date: Date): ParisYmd {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function clampAnchorDay(year: number, month: number, anchorDay: number): number {
  return Math.min(anchorDay, daysInMonth(year, month));
}

/** Instant UTC correspondant à minuit civil à Paris pour la date donnée. */
export function parisMidnightUtc(year: number, month: number, day: number): Date {
  const utcMidnightGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offsetMinutes = getParisOffsetMinutesAtUtc(new Date(utcMidnightGuess + 12 * 60 * 60 * 1000));
  return new Date(utcMidnightGuess - offsetMinutes * 60 * 1000);
}

function getParisOffsetMinutesAtUtc(utcDate: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TZ,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(utcDate);

  const tz = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = tz.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 60;
  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

export function addParisMonths(
  year: number,
  month: number,
  anchorDay: number,
  monthsToAdd: number,
): ParisYmd {
  const totalMonths = year * 12 + (month - 1) + monthsToAdd;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  return {
    year: nextYear,
    month: nextMonth,
    day: clampAnchorDay(nextYear, nextMonth, anchorDay),
  };
}

export function formatParisDateLabel(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Ex. « 18 août 2026 » — affichage utilisateur (renouvellement quota). */
export function formatParisDateLongLabel(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export type MumIaCreditPeriod = {
  periodStart: Date;
  periodEnd: Date;
  renewalDate: Date;
};

export function computeCreditPeriodForSubscription(
  subscriptionStart: Date,
  now = new Date(),
): MumIaCreditPeriod {
  const anchorDay = getParisYmd(subscriptionStart).day;
  let { year, month } = getParisYmd(now);
  let day = clampAnchorDay(year, month, anchorDay);
  let periodStart = parisMidnightUtc(year, month, day);

  while (now.getTime() < periodStart.getTime()) {
    const previous = addParisMonths(year, month, anchorDay, -1);
    year = previous.year;
    month = previous.month;
    day = previous.day;
    periodStart = parisMidnightUtc(year, month, day);
  }

  const next = addParisMonths(year, month, anchorDay, 1);
  const periodEnd = parisMidnightUtc(next.year, next.month, next.day);

  return {
    periodStart,
    periodEnd,
    renewalDate: periodEnd,
  };
}

export function advanceCreditPeriod(
  currentPeriodStart: Date,
  subscriptionStart: Date,
): MumIaCreditPeriod {
  const anchorDay = getParisYmd(subscriptionStart).day;
  const { year, month, day } = getParisYmd(currentPeriodStart);
  const periodStart = parisMidnightUtc(year, month, day);
  const next = addParisMonths(year, month, anchorDay, 1);
  const periodEnd = parisMidnightUtc(next.year, next.month, next.day);

  return {
    periodStart,
    periodEnd,
    renewalDate: periodEnd,
  };
}

export function nextCreditPeriodAfter(
  currentPeriodEnd: Date,
  subscriptionStart: Date,
): MumIaCreditPeriod {
  const anchorDay = getParisYmd(subscriptionStart).day;
  const { year, month, day } = getParisYmd(currentPeriodEnd);
  const periodStart = parisMidnightUtc(year, month, day);
  const next = addParisMonths(year, month, anchorDay, 1);
  const periodEnd = parisMidnightUtc(next.year, next.month, next.day);

  return {
    periodStart,
    periodEnd,
    renewalDate: periodEnd,
  };
}
