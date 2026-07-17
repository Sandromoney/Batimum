import { NextResponse } from "next/server";

import {
  EMPLOYEE_SESSION_COOKIE,
  getEmployeeSessionCookieOptions,
} from "@/lib/employee-session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(EMPLOYEE_SESSION_COOKIE, "", {
    ...getEmployeeSessionCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
