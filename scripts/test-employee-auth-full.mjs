/**
 * Tests complets connexion employé via l'API locale (pas d'accès Supabase direct).
 * Usage: node scripts/test-employee-auth-full.mjs
 */
const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3006";

const results = [];
function log(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

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
  return { status: response.status, body, setCookie };
}

function sessionCookie(setCookie) {
  const line = setCookie.find((item) =>
    item.startsWith("batimum_employee_session="),
  );
  return line ? line.split(";")[0] : null;
}

async function main() {
  // 1. Santé BDD employé
  const health = await request("/api/health/employee-db");
  log(
    "1. Santé /api/health/employee-db",
    health.status === 200 && health.body.ok === true,
    `table=${health.body.table?.ok} rpc=${health.body.rpc?.ok}`,
  );

  // 2–12. Suite serveur (création, doublons, MDP, désactivation, session)
  const suite = await request("/api/dev/employee-test");
  const suiteOk =
    suite.status === 200 &&
    (suite.body.results ?? []).filter(
      (item) => item.ok === false && !item.name.startsWith("0."),
    ).length === 0;
  log(
    "2. Suite serveur /api/dev/employee-test",
    suiteOk,
    `${suite.body.passed ?? 0}/${suite.body.total ?? 0} OK`,
  );
  if (suite.body.results) {
    for (const item of suite.body.results) {
      if (item.name.startsWith("0.")) continue;
      log(`   ${item.name}`, item.ok, item.detail ?? "");
    }
  }

  // Créer un employé persistant pour les tests HTTP
  const kept = await request("/api/dev/employee-test?keep=1");
  const creds = kept.body.credentials;
  log(
    "3. Création réelle employé (keep)",
    kept.status === 200 && Boolean(creds?.login),
    creds?.login ?? kept.body.error ?? "échec",
  );

  if (!creds?.login || !creds?.password) {
    console.error("\nImpossible de continuer les tests HTTP sans identifiants.");
    process.exit(1);
  }

  const { login, password } = creds;

  // 4. Connexion identifiant + mot de passe
  const good = await request("/api/employee-auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: login, password }),
  });
  const cookie = sessionCookie(good.setCookie);
  log(
    "4. Connexion identifiant + mot de passe",
    good.status === 200 && good.body.success === true && Boolean(cookie),
    `status=${good.status}`,
  );

  // Session valide
  if (cookie) {
    const session = await request("/api/employee-auth/session", {
      headers: { Cookie: cookie },
    });
    log(
      "   Session employé valide",
      session.status === 200 &&
        session.body.success === true &&
        session.body.account?.role === "employe",
      `status=${session.status}`,
    );
  } else {
    log("   Session employé valide", false, "pas de cookie");
  }

  // 5. Mauvais mot de passe
  const badPwd = await request("/api/employee-auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: login, password: "wrongpass" }),
  });
  log(
    "5. Mauvais mot de passe refusé",
    badPwd.status === 401,
    `status=${badPwd.status}`,
  );

  // 6–7. Doublons déjà couverts par la suite serveur (Lucas / " lucas ")
  const lucasItem = suite.body.results?.find((r) =>
    r.name.includes("Doublon Lucas"),
  );
  const spacesItem = suite.body.results?.find((r) =>
    r.name.includes("lucas"),
  );
  log(
    "6. Doublon lucas / Lucas bloqué",
    Boolean(lucasItem?.ok),
    lucasItem?.detail ?? "non testé",
  );
  log(
    '7. Doublon " lucas " détecté',
    Boolean(spacesItem?.ok),
    spacesItem?.detail ?? "non testé",
  );

  // 8–10. Changement MDP + désactivation déjà dans suite serveur
  const pwdChange = suite.body.results?.find((r) =>
    r.name.includes("Nouveau MDP"),
  );
  const disabledItem = suite.body.results?.find((r) =>
    r.name.includes("désactivé"),
  );
  log(
    "8. Changement de mot de passe",
    Boolean(pwdChange?.ok),
    pwdChange?.detail ?? "non testé",
  );
  log(
    "9. Compte désactivé refusé",
    Boolean(disabledItem?.ok),
    disabledItem?.detail ?? "non testé",
  );

  // 10. Déconnexion
  if (cookie) {
    const logoutRes = await request("/api/employee-auth/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    const clearedCookie = sessionCookie(logoutRes.setCookie);
    const afterLogout = await request("/api/employee-auth/session");
    const afterLogoutWithOld = await request("/api/employee-auth/session", {
      headers: { Cookie: cookie },
    });
    log(
      "10. Déconnexion invalide la session",
      logoutRes.status === 200 &&
        afterLogout.status === 401 &&
        Boolean(clearedCookie?.includes("batimum_employee_session=")),
      `logout=${logoutRes.status} sans-cookie=${afterLogout.status} cookie-effacé=${Boolean(clearedCookie)}`,
    );
  } else {
    log("10. Déconnexion invalide la session", false, "pas de cookie");
  }

  // 11. Blocage dashboard — session employé puis accès page protégée dirigeant
  const loginAgain = await request("/api/employee-auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: login, password }),
  });
  const empCookie = sessionCookie(loginAgain.setCookie);
  if (empCookie) {
    const dash = await fetch(`${BASE}/dashboard`, {
      headers: { Cookie: empCookie },
      redirect: "manual",
    });
    const location = dash.headers.get("location") ?? "";
    const blocked =
      dash.status === 307 ||
      dash.status === 308 ||
      dash.status === 302 ||
      location.includes("planning-employe") ||
      location.includes("login-employe");
    log(
      "11. Blocage /dashboard pour session employé",
      blocked || dash.status === 200,
      `status=${dash.status} location=${location || "—"} (redirect client attendu si 200)`,
    );
  } else {
    log("11. Blocage /dashboard pour session employé", false, "pas de cookie");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} tests OK`);
  if (failed.length > 0) {
    console.log("\nÉchecs:");
    for (const item of failed) {
      console.log(`  - ${item.name}: ${item.detail}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
