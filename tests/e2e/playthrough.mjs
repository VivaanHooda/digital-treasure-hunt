/**
 * End-to-end game-logic verification. Drives the live server over HTTP exactly
 * like a browser (cookies, CSRF, Origin headers) and only touches the DB to read
 * the secret target coordinates (to simulate "standing at the right place") and
 * to fast-forward time/cooldown where a real wait isn't practical.
 *
 * Run:  node --env-file=.env tests/e2e/playthrough.mjs   (server + docker must be up)
 */
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

const BASE = "http://localhost:3000";
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL);

let pass = 0,
  fail = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log("  ✅", name);
  } else {
    fail++;
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.log("  ❌", name, detail ? `— ${detail}` : "");
  }
}
function section(t) {
  console.log(`\n=== ${t} ===`);
}

// --- minimal cookie jar over fetch -----------------------------------------
class Jar {
  constructor() {
    this.c = new Map();
  }
  update(res) {
    const sc = res.headers.getSetCookie?.() ?? [];
    for (const s of sc) {
      const kv = s.split(";")[0];
      const i = kv.indexOf("=");
      if (i > 0) this.c.set(kv.slice(0, i).trim(), kv.slice(i + 1));
    }
  }
  header() {
    return [...this.c].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  hasSession() {
    return [...this.c.keys()].some((k) => k.includes("session-token"));
  }
}

async function login(email, password, xff) {
  const jar = new Jar();
  let r = await fetch(`${BASE}/api/auth/csrf`, { headers: { "x-forwarded-for": xff } });
  jar.update(r);
  const { csrfToken } = await r.json();
  const body = new URLSearchParams({ csrfToken, email, password, callbackUrl: `${BASE}/dashboard` });
  r = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-forwarded-for": xff,
      cookie: jar.header(),
    },
    body,
  });
  jar.update(r);
  return jar;
}

async function api(jar, method, path, { body, xff, origin } = {}) {
  const headers = { cookie: jar ? jar.header() : "" };
  if (xff) headers["x-forwarded-for"] = xff;
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    headers["origin"] = origin ?? BASE;
  } else if (origin) headers["origin"] = origin;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (jar) jar.update(r);
  const txt = await r.text();
  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    data = txt;
  }
  return { status: r.status, data };
}

async function register(payload, xff) {
  const r = await fetch(`${BASE}/api/register`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": xff, origin: BASE },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

const team = (over = {}) => ({
  email: `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.com`,
  password: "password123",
  teamName: "E2E Team",
  leaderName: "Leader",
  leaderMobile: "9990001111",
  leaderDepartment: "CSE",
  members: [
    { name: "M1", mobile: "9990001112", department: "ISE" },
    { name: "M2", mobile: "9990001113", department: "ECE" },
    { name: "M3", mobile: "9990001114", department: "EEE" },
  ],
  ...over,
});

const target = async (userId) => {
  const gs = await prisma.gameState.findUnique({ where: { userId } });
  const c = await prisma.challenge.findUnique({ where: { id: gs.challengeIds[gs.currentIndex] } });
  return { c, gs };
};
const clearCooldown = (userId) =>
  prisma.gameState.update({ where: { userId }, data: { cooldownEndsAt: null } });
const clearVerifyLimit = (userId) => redis.del(`rl:verify:${userId}`);
const userIdByEmail = async (email) =>
  (await prisma.user.findUnique({ where: { email } }))?.id;

const setSettings = (data) => prisma.gameSettings.update({ where: { id: "global" }, data });

async function main() {
  // Clean slate for limiters/locks; normal, started game.
  for (const pattern of ["rl:*", "lock:*"]) {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  }
  const setA = await prisma.dataset.findUnique({ where: { name: "Set A" } });
  if (!setA) throw new Error("Seed missing: dataset 'Set A' not found");
  await setSettings({
    startTime: new Date(Date.now() - 5000),
    durationMs: 7_200_000,
    isPaused: false,
    pausedAt: null,
    totalPauseMs: 0,
    isActive: true,
    selectedDatasetId: setA.id,
  });

  // ---------------------------------------------------------------- REGISTER
  section("Registration & validation");
  const winner = team({ teamName: "Winners" });
  let r = await register(winner, "reg-winner");
  check("valid registration → 201", r.status === 201, `got ${r.status}`);
  const winnerId = r.data.userId;

  r = await register(winner, "reg-winner");
  check("duplicate email → 409", r.status === 409 && r.data.code === "EMAIL_TAKEN", `got ${r.status}`);

  r = await register(team({ members: [{ name: "x", mobile: "9990001112", department: "X" }] }), "reg-bad");
  check("wrong member count → 400", r.status === 400, `got ${r.status}`);

  r = await register(team({ password: "short" }), "reg-bad2");
  check("short password → 400", r.status === 400, `got ${r.status}`);

  r = await register(team({ email: "not-an-email" }), "reg-bad3");
  check("invalid email → 400", r.status === 400, `got ${r.status}`);

  // rate limit: register policy is 3 / 5min per IP
  const rlXff = "reg-rl";
  for (let i = 0; i < 3; i++) await register(team({ password: "x" }), rlXff); // consume (validation 400 still counts)
  r = await register(team({ password: "x" }), rlXff);
  check("register rate limit → 429", r.status === 429 && r.data.code === "RATE_LIMITED", `got ${r.status}`);

  const skipper = team({ teamName: "Skippers" });
  r = await register(skipper, "reg-skipper");
  check("second team registers → 201", r.status === 201, `got ${r.status}`);
  const skipperId = r.data.userId;

  // ------------------------------------------------------------------- LOGIN
  section("Login & single-device");
  let badJar = await login(winner.email, "wrongpass", "login-bad");
  check("wrong password → no session", !badJar.hasSession());

  let wJar = await login(winner.email, winner.password, "login-w");
  check("valid login → session", wJar.hasSession());
  let st = await api(wJar, "GET", "/api/game/state");
  check("logged-in user can read state → 200", st.status === 200, `got ${st.status}`);

  // single device: a second login invalidates the first session
  const wJar2 = await login(winner.email, winner.password, "login-w2");
  const oldSession = await api(wJar, "GET", "/api/game/state");
  check("old session revoked after new login → 401", oldSession.status === 401 && oldSession.data.code === "SESSION_REVOKED", `got ${oldSession.status}`);
  wJar = wJar2; // use the live session henceforth

  // admin
  const adminJar = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD, "login-admin");
  const adminSettings = await api(adminJar, "GET", "/api/admin/settings");
  check("admin can read admin settings → 200", adminSettings.status === 200, `got ${adminSettings.status}`);
  const adminGame = await api(adminJar, "GET", "/api/game/state");
  check("admin has no game state → 404", adminGame.status === 404, `got ${adminGame.status}`);

  // --------------------------------------------------------- STATE & PRIVACY
  section("State privacy & not-started gate");
  st = await api(wJar, "GET", "/api/game/state");
  const chKeys = st.data.challenge ? Object.keys(st.data.challenge) : [];
  check("challenge exposes NO coordinates", !chKeys.includes("latitude") && !chKeys.includes("longitude"), chKeys.join(","));

  await setSettings({ startTime: new Date(Date.now() + 3_600_000) }); // 1h in future
  st = await api(wJar, "GET", "/api/game/state");
  check("before start: hasStarted=false", st.data.settings.hasStarted === false);
  let v = await api(wJar, "POST", "/api/game/verify", { body: { latitude: 12.9, longitude: 77.5, accuracy: 5 } });
  check("verify before start → 403 NOT_STARTED", v.status === 403 && v.data.code === "NOT_STARTED", `got ${v.status}/${v.data.code}`);
  await setSettings({ startTime: new Date(Date.now() - 5000) }); // restore

  // ------------------------------------------------------------- VERIFY EDGE
  section("Verify edge cases");
  v = await api(wJar, "POST", "/api/game/verify", { body: { latitude: 999, longitude: 77.5, accuracy: 5 } });
  check("invalid coordinates → 400", v.status === 400, `got ${v.status}`);

  v = await api(wJar, "POST", "/api/game/verify", { body: { latitude: 12.9, longitude: 77.5, accuracy: 99999 } });
  check("low GPS accuracy → 422 LOW_ACCURACY", v.status === 422 && v.data.code === "LOW_ACCURACY", `got ${v.status}/${v.data.code}`);
  st = await api(wJar, "GET", "/api/game/state");
  check("low-accuracy did NOT burn a cooldown", st.data.game.cooldownRemaining === 0, `cd=${st.data.game.cooldownRemaining}`);

  v = await api(wJar, "POST", "/api/game/verify", { body: { latitude: 1, longitude: 1, accuracy: 5 } });
  check("wrong location → correct:false + cooldown", v.status === 200 && v.data.correct === false && v.data.cooldownRemaining > 0, JSON.stringify(v.data));

  v = await api(wJar, "POST", "/api/game/verify", { body: { latitude: 1, longitude: 1, accuracy: 5 } });
  check("verify during cooldown → 429 COOLDOWN", v.status === 429 && v.data.code === "COOLDOWN", `got ${v.status}/${v.data.code}`);

  v = await api(wJar, "POST", "/api/game/verify", { body: { latitude: 12.9, longitude: 77.5, accuracy: 5 }, origin: "http://evil.com" });
  check("cross-origin verify → 403 BAD_ORIGIN", v.status === 403 && v.data.code === "BAD_ORIGIN", `got ${v.status}/${v.data.code}`);

  // pause blocks play
  await api(adminJar, "POST", "/api/admin/pause", { body: { paused: true } });
  v = await api(wJar, "POST", "/api/game/verify", { body: { latitude: 12.9, longitude: 77.5, accuracy: 5 } });
  check("verify while paused → 403 PAUSED", v.status === 403 && v.data.code === "PAUSED", `got ${v.status}/${v.data.code}`);
  await api(adminJar, "POST", "/api/admin/pause", { body: { paused: false } });

  // correct submission
  await clearCooldown(winnerId);
  await clearVerifyLimit(winnerId);
  let before = await api(wJar, "GET", "/api/game/state");
  let { c } = await target(winnerId);
  v = await api(wJar, "POST", "/api/game/verify", { body: { latitude: c.latitude, longitude: c.longitude, accuracy: 5 } });
  let after = await api(wJar, "GET", "/api/game/state");
  check("correct location → correct:true + points", v.status === 200 && v.data.correct === true && v.data.points > 0, JSON.stringify(v.data));
  check("score increased by challenge points", after.data.game.score === before.data.game.score + (v.data.points ?? 0), `${before.data.game.score}->${after.data.game.score}`);
  check("completion count incremented", after.data.game.completedCount === before.data.game.completedCount + 1);

  // -------------------------------------------------------- VERIFY RATE LIMIT
  section("Verify rate limit (10/min)");
  await clearVerifyLimit(skipperId);
  let sJar = await login(skipper.email, skipper.password, "login-s");
  let sawRl = false;
  for (let i = 0; i < 13; i++) {
    await clearCooldown(skipperId); // isolate the limiter from the cooldown gate
    const rr = await api(sJar, "POST", "/api/game/verify", { body: { latitude: 1, longitude: 1, accuracy: 5 } });
    if (rr.status === 429 && rr.data.code === "RATE_LIMITED") { sawRl = true; break; }
  }
  check("verify limiter trips after ~10 rapid attempts", sawRl);
  await clearVerifyLimit(skipperId);
  await clearCooldown(skipperId);

  // --------------------------------------------------------------- SKIP EDGE
  section("Skip edge cases");
  let s0 = await api(sJar, "GET", "/api/game/state");
  let sk = await api(sJar, "POST", "/api/game/skip");
  let s1 = await api(sJar, "GET", "/api/game/state");
  check("skip → skipped:true", sk.status === 200 && sk.data.skipped === true, JSON.stringify(sk.data));
  check("skip does NOT increment completedCount (H3)", s1.data.game.completedCount === s0.data.game.completedCount, `${s0.data.game.completedCount}->${s1.data.game.completedCount}`);
  check("skip increments skippedCount", s1.data.game.skippedCount === s0.data.game.skippedCount + 1);
  check("score floored at 0 (no negative)", s1.data.game.score === 0, `score=${s1.data.game.score}`);

  // exhaust skips (already used 1; max 3)
  await api(sJar, "POST", "/api/game/skip");
  await api(sJar, "POST", "/api/game/skip");
  sk = await api(sJar, "POST", "/api/game/skip");
  check("4th skip → 403 NO_SKIPS", sk.status === 403 && sk.data.code === "NO_SKIPS", `got ${sk.status}/${sk.data.code}`);

  // --------------------------------------------------------------- TIME UP
  section("Time-up gate");
  await setSettings({ startTime: new Date(Date.now() - 10_000_000), durationMs: 1000 });
  await clearVerifyLimit(skipperId);
  v = await api(sJar, "POST", "/api/game/verify", { body: { latitude: 1, longitude: 1, accuracy: 5 } });
  check("verify after time up → 403 TIME_UP", v.status === 403 && v.data.code === "TIME_UP", `got ${v.status}/${v.data.code}`);
  await setSettings({ startTime: new Date(Date.now() - 5000), durationMs: 7_200_000 }); // restore

  // -------------------------------------------------- CONCURRENCY (no double-score)
  section("Concurrency: parallel submits cannot double-score (H4)");
  const racer = team({ teamName: "Racers" });
  const rr0 = await register(racer, "reg-race");
  const racerId = rr0.data.userId;
  const raceJar = await login(racer.email, racer.password, "login-race");
  await clearVerifyLimit(racerId);
  await clearCooldown(racerId);
  const { c: rc } = await target(racerId);
  // Fire 5 identical correct submissions at once.
  const parallel = await Promise.all(
    Array.from({ length: 5 }, () =>
      api(raceJar, "POST", "/api/game/verify", { body: { latitude: rc.latitude, longitude: rc.longitude, accuracy: 5 } }),
    ),
  );
  const correctCount = parallel.filter((p) => p.status === 200 && p.data.correct === true).length;
  const raceState = await api(raceJar, "GET", "/api/game/state");
  check("exactly one parallel submit succeeded", correctCount === 1, `correct=${correctCount} statuses=${parallel.map((p) => p.status).join(",")}`);
  check("score reflects exactly one completion (no double-score)", raceState.data.game.score === rc.points, `score=${raceState.data.game.score} expected=${rc.points}`);
  check("completedCount is exactly 1 after race", raceState.data.game.completedCount === 1, `count=${raceState.data.game.completedCount}`);

  // ----------------------------------------------------- FULL PLAYTHROUGH
  section("Full playthrough to completion (Winners)");
  let iter = 0;
  let state = await api(wJar, "GET", "/api/game/state");
  while (!state.data.game.isComplete && iter < 60) {
    iter++;
    await clearVerifyLimit(winnerId);
    await clearCooldown(winnerId);
    const { c: tc } = await target(winnerId);
    const res = await api(wJar, "POST", "/api/game/verify", {
      body: { latitude: tc.latitude, longitude: tc.longitude, accuracy: 5 },
    });
    if (res.status !== 200 || res.data.correct !== true) {
      check(`playthrough step ${iter} correct`, false, JSON.stringify(res.data));
      break;
    }
    state = await api(wJar, "GET", "/api/game/state");
  }
  check("game reaches completion", state.data.game.isComplete === true, `iters=${iter}`);
  check("completed + skipped == 40", state.data.game.completedCount + state.data.game.skippedCount === 40, `${state.data.game.completedCount}+${state.data.game.skippedCount}`);

  // post-completion guards
  await clearVerifyLimit(winnerId);
  v = await api(wJar, "POST", "/api/game/verify", { body: { latitude: 1, longitude: 1, accuracy: 5 } });
  check("verify after complete → 409 COMPLETE", v.status === 409 && v.data.code === "COMPLETE", `got ${v.status}/${v.data.code}`);
  sk = await api(wJar, "POST", "/api/game/skip");
  check("skip after complete → 409 COMPLETE", sk.status === 409 && sk.data.code === "COMPLETE", `got ${sk.status}/${sk.data.code}`);

  // ----------------------------------------------------------- LEADERBOARD
  section("Leaderboard");
  const lb = await api(wJar, "GET", "/api/leaderboard");
  const winnerRow = lb.data.entries.find((e) => e.teamName === "Winners");
  check("winner appears on leaderboard", !!winnerRow, JSON.stringify(lb.data.entries.slice(0, 3)));
  const lbKeys = winnerRow ? Object.keys(winnerRow) : [];
  check("leaderboard exposes NO PII", !lbKeys.some((k) => /email|mobile|member/i.test(k)), lbKeys.join(","));
  const scores = lb.data.entries.map((e) => e.score);
  check("leaderboard sorted by score desc", scores.every((s, i) => i === 0 || scores[i - 1] >= s));

  // -------------------------------------------------------------- RBAC/AUTH
  section("AuthZ / RBAC");
  let u = await api(null, "GET", "/api/game/state");
  check("unauthenticated state → 401", u.status === 401, `got ${u.status}`);
  u = await api(null, "POST", "/api/admin/reset");
  check("unauthenticated admin reset → 401", u.status === 401, `got ${u.status}`);
  u = await api(wJar, "GET", "/api/admin/teams");
  check("user hitting admin endpoint → 403", u.status === 403, `got ${u.status}`);
  u = await api(adminJar, "GET", "/api/admin/teams");
  check("admin hitting admin endpoint → 200", u.status === 200, `got ${u.status}`);

  // ---------------------------------------------------------------- SUMMARY
  console.log(`\n========================================`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  if (fail) console.log("FAILURES:\n - " + failures.join("\n - "));
  console.log(`========================================`);

  await prisma.$disconnect();
  redis.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error("Harness crashed:", e);
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(2);
});
