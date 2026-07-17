import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const EMPLOYEE_SESSION_COOKIE = "batimum_employee_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type EmployeeSessionPayload = {
  companyId: string;
  employeId: string;
  login: string;
  exp: number;
};

export type EmployeeSessionCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

function getSessionSecret(): string {
  return (
    process.env.EMPLOYEE_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "batimum-dev-employee-session-secret"
  );
}

export function signEmployeeSession(
  payload: Omit<EmployeeSessionPayload, "exp">,
): string {
  const body = JSON.stringify({
    ...payload,
    exp: Date.now() + SESSION_TTL_MS,
  });
  const signature = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");
  return `${Buffer.from(body, "utf8").toString("base64url")}.${signature}`;
}

export function verifyEmployeeSessionToken(
  token: string,
): EmployeeSessionPayload | null {
  const [encodedBody, signature] = token.split(".");
  if (!encodedBody || !signature) return null;

  let body: string;
  try {
    body = Buffer.from(encodedBody, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");

  try {
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(body) as EmployeeSessionPayload;
    if (
      !payload.companyId ||
      !payload.employeId ||
      !payload.login ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getEmployeeSessionCookieOptions(
  maxAge = SESSION_TTL_MS / 1000,
): EmployeeSessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function readEmployeeSessionTokenFromRequest(
  request: Request,
): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === EMPLOYEE_SESSION_COOKIE) {
      const value = rest.join("=");
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

export function getEmployeeSessionFromRequest(
  request: Request,
): EmployeeSessionPayload | null {
  const token = readEmployeeSessionTokenFromRequest(request);
  if (!token) return null;
  return verifyEmployeeSessionToken(token);
}

export async function getEmployeeSessionFromCookies(): Promise<EmployeeSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(EMPLOYEE_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyEmployeeSessionToken(token);
}
