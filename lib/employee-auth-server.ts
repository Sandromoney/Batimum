import { getEmployeeSessionFromRequest } from "@/lib/employee-session";
import { loadValidatedEmployeeAccount } from "@/lib/employee-auth-bootstrap";
import type { EmployeeAccountRow } from "@/lib/employee-accounts-store";
import type { EmployeeSessionPayload } from "@/lib/employee-session";

export async function requireEmployeeSession(
  request: Request,
): Promise<{
  session: EmployeeSessionPayload;
  account: EmployeeAccountRow;
} | null> {
  const session = getEmployeeSessionFromRequest(request);
  if (!session) return null;

  const account = await loadValidatedEmployeeAccount(
    session.companyId,
    session.employeId,
    session.login,
  );
  if (!account) return null;

  return { session, account };
}
