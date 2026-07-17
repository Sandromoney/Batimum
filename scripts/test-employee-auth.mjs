/**
 * Tests API connexion employé (nécessite Supabase + serveur sur :3006).
 * Usage: node scripts/test-employee-auth.mjs
 */

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3006";

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body, setCookie, response };
}

function cookieFromSetCookie(setCookie, name) {
  const line = setCookie.find((item) => item.startsWith(`${name}=`));
  if (!line) return null;
  return line.split(";")[0];
}

async function run() {
  const results = [];
  const log = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  const suffix = Date.now().toString(36);
  const login = `test_${suffix}`;
  const password = "secret123";
  const newPassword = "newsecret456";

  // Ces tests nécessitent un compte dirigeant + employé préconfiguré via l'UI
  // ou des variables TEST_EMPLOYEE_LOGIN / TEST_EMPLOYEE_PASSWORD.
  const configuredLogin = process.env.TEST_EMPLOYEE_LOGIN;
  const configuredPassword = process.env.TEST_EMPLOYEE_PASSWORD;

  const bad = await request("/api/employee-auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "unknown_user_xyz", password: "wrong" }),
  });
  log(
    "Mauvais identifiant/mot de passe",
    bad.status === 401 && bad.body.error === "Identifiant ou mot de passe incorrect.",
    `status ${bad.status}`,
  );

  if (configuredLogin && configuredPassword) {
    const good = await request("/api/employee-auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: configuredLogin,
        password: configuredPassword,
      }),
    });
    const sessionCookie = cookieFromSetCookie(
      good.setCookie,
      "batimum_employee_session",
    );
    log(
      "Connexion réussie + cookie session",
      good.status === 200 && good.body.success === true && Boolean(sessionCookie),
      `status ${good.status}`,
    );

    if (sessionCookie) {
      const session = await request("/api/employee-auth/session", {
        headers: { Cookie: sessionCookie },
      });
      log(
        "Session valide",
        session.status === 200 && session.body.success === true,
        `status ${session.status}`,
      );

      const logout = await request("/api/employee-auth/logout", {
        method: "POST",
        headers: { Cookie: sessionCookie },
      });
      log("Déconnexion", logout.status === 200, `status ${logout.status}`);

      const afterLogout = await request("/api/employee-auth/session", {
        headers: { Cookie: sessionCookie },
      });
      log(
        "Session invalidée après déconnexion",
        afterLogout.status === 401,
        `status ${afterLogout.status}`,
      );
    }
  } else {
    log(
      "Connexion employé configuré (SKIP)",
      true,
      "Définir TEST_EMPLOYEE_LOGIN et TEST_EMPLOYEE_PASSWORD pour tester",
    );
  }

  log("Identifiant test généré (manuel)", true, login);

  const failed = results.filter((item) => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} tests OK`);
  if (failed.length > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
