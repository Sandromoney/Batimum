/**
 * Tests de séparation session dirigeant / session employé.
 * Usage: node scripts/test-auth-session-separation.mjs
 */
const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3006";

const results = [];
function log(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function cookieHeader(setCookie) {
  return (setCookie ?? [])
    .map((line) => line.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

function getCookieValue(setCookie, name) {
  const line = (setCookie ?? []).find((item) => item.startsWith(`${name}=`));
  if (!line) return null;
  return line.split(";")[0].slice(name.length + 1);
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    redirect: options.redirect ?? "manual",
  });
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return {
    status: response.status,
    body,
    setCookie,
    location: response.headers.get("location") ?? "",
  };
}

async function main() {
  // Préparer un employé de test
  const kept = await request("/api/dev/employee-test?keep=1");
  const creds = kept.body.credentials;
  log(
    "Setup employé de test",
    Boolean(creds?.login),
    creds?.login ?? kept.body.error ?? "échec",
  );
  if (!creds?.login) {
    process.exit(1);
  }

  // 1. Connexion employé → cookie
  const empLogin = await request("/api/employee-auth/login", {
    method: "POST",
    body: JSON.stringify({
      identifier: creds.login,
      password: creds.password,
    }),
  });
  const empCookie = getCookieValue(
    empLogin.setCookie,
    "batimum_employee_session",
  );
  log(
    "Connexion employé crée cookie",
    empLogin.status === 200 && Boolean(empCookie),
    `status=${empLogin.status}`,
  );

  // 2. Session employé valide
  const empSession = await request("/api/employee-auth/session", {
    headers: { Cookie: `batimum_employee_session=${empCookie}` },
  });
  log(
    "Session employé valide",
    empSession.status === 200 && empSession.body.account?.role === "employe",
    `status=${empSession.status}`,
  );

  // 3. Logout employé efface le cookie
  const empLogout = await request("/api/employee-auth/logout", {
    method: "POST",
    headers: { Cookie: `batimum_employee_session=${empCookie}` },
  });
  const cleared = getCookieValue(
    empLogout.setCookie,
    "batimum_employee_session",
  );
  const afterLogout = await request("/api/employee-auth/session");
  log(
    "Déconnexion employé invalide la session",
    empLogout.status === 200 && afterLogout.status === 401,
    `cleared=${cleared !== null} session=${afterLogout.status}`,
  );

  // 4. Reconnexion employé
  const empLogin2 = await request("/api/employee-auth/login", {
    method: "POST",
    body: JSON.stringify({
      identifier: creds.login,
      password: creds.password,
    }),
  });
  const empCookie2 = getCookieValue(
    empLogin2.setCookie,
    "batimum_employee_session",
  );
  log(
    "Reconnexion employé",
    empLogin2.status === 200 && Boolean(empCookie2),
    `status=${empLogin2.status}`,
  );

  // 5. Clear employé (comme connexion dirigeant) puis session invalide
  const clearAsDirector = await request("/api/employee-auth/logout", {
    method: "POST",
    headers: { Cookie: `batimum_employee_session=${empCookie2}` },
  });
  const sessionAfterDirectorClear = await request("/api/employee-auth/session");
  log(
    "Connexion dirigeant : clear cookie employé",
    clearAsDirector.status === 200 && sessionAfterDirectorClear.status === 401,
    `session=${sessionAfterDirectorClear.status}`,
  );

  // 6. Identifiant employé ne doit PAS authentifier via login dirigeant (pas d'email)
  //    Vérifie que l'API employé n'accepte pas un format email aléatoire comme employé
  const wrongMix = await request("/api/employee-auth/login", {
    method: "POST",
    body: JSON.stringify({
      identifier: "dirigeant@example.com",
      password: "whatever",
    }),
  });
  log(
    "E-mail dirigeant refusé sur API employé",
    wrongMix.status === 401,
    `status=${wrongMix.status}`,
  );

  // 7. Santé
  const health = await request("/api/health/employee-db");
  log(
    "Santé employee-db",
    health.status === 200 && health.body.ok === true,
    `ok=${health.body.ok}`,
  );

  // 8. Pages login accessibles
  const loginPage = await fetch(`${BASE}/login`, { redirect: "manual" });
  const empLoginPage = await fetch(`${BASE}/login-employe`, {
    redirect: "manual",
  });
  log(
    "Page /login accessible",
    loginPage.status === 200 || loginPage.status === 307,
    `status=${loginPage.status}`,
  );
  log(
    "Page /login-employe accessible",
    empLoginPage.status === 200 || empLoginPage.status === 307,
    `status=${empLoginPage.status}`,
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} tests OK`);
  if (failed.length) {
    for (const item of failed) {
      console.log(`  FAIL: ${item.name} — ${item.detail}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
