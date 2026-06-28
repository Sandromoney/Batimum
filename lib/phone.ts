export type PhoneFormatMode = "local" | "auto";

function joinGroups(parts: string[]) {
  return parts.filter((part) => part.length > 0).join(" ");
}

function formatFrenchLocalDigits(digits: string) {
  const limited = digits.slice(0, 10);
  if (!limited) return "";

  if (limited.startsWith("0")) {
    return joinGroups([
      limited.slice(0, 2),
      limited.slice(2, 4),
      limited.slice(4, 6),
      limited.slice(6, 8),
      limited.slice(8, 10),
    ]);
  }

  const mobile = limited.slice(0, 9);
  return joinGroups([
    mobile.slice(0, 1),
    mobile.slice(1, 3),
    mobile.slice(3, 5),
    mobile.slice(5, 7),
    mobile.slice(7, 9),
  ]);
}

function formatInternationalDigits(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits || digits === "+") return "+";

  const normalized = digits.startsWith("+") ? digits : `+${digits}`;
  const numbers = normalized.slice(1).replace(/\D/g, "");
  if (!numbers) return "+";

  if (numbers.startsWith("33")) {
    const national = numbers.slice(2).slice(0, 9);
    return joinGroups([
      "+33",
      national.slice(0, 1),
      national.slice(1, 3),
      national.slice(3, 5),
      national.slice(5, 7),
      national.slice(7, 9),
    ]);
  }

  if (numbers.length <= 2) {
    return `+${numbers}`;
  }

  const countryCode = numbers.slice(0, 2);
  const rest = numbers.slice(2).slice(0, 12);
  const restFormatted = formatFrenchLocalDigits(
    rest.startsWith("0") ? rest : `0${rest}`,
  );

  return joinGroups([`+${countryCode}`, restFormatted.replace(/^0\d\s/, "")]);
}

/** Garde uniquement chiffres, espaces et + en tête. */
export function sanitizePhoneInput(raw: string): string {
  const trimmed = raw.trimStart();
  const withoutInvalid = trimmed.replace(/[^\d\s+]/g, "");
  if (!withoutInvalid.startsWith("+")) {
    return withoutInvalid.replace(/\+/g, "");
  }
  return `+${withoutInvalid.slice(1).replace(/\+/g, "")}`;
}

/** Formate un numéro pendant la saisie (espaces automatiques). */
export function formatPhoneInput(
  raw: string,
  mode: PhoneFormatMode = "auto",
): string {
  const sanitized = sanitizePhoneInput(raw);
  if (!sanitized) return "";

  const trimmed = sanitized.trimStart();
  const useInternational =
    mode === "auto" ? trimmed.startsWith("+") || raw.includes("+") : false;

  if (useInternational) {
    return formatInternationalDigits(raw);
  }

  return formatFrenchLocalDigits(raw.replace(/\D/g, ""));
}
