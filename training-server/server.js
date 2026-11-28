import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/admin", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const dbUrl = process.env.TRAINING_DATABASE_URL || "";
const pool = dbUrl ? new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } }) : null;

const GAMES = [
  { id: "teen-patti-2020", name: "Teen Patti 20-20", cat: "Cards", options: ["Player A", "Player B"], payout: 1.95, durationSec: 25 },
  { id: "dragon-tiger", name: "Dragon Tiger", cat: "Cards", options: ["Dragon", "Tiger", "Tie"], payout: 1.95, durationSec: 25 },
  { id: "andar-bahar", name: "Andar Bahar", cat: "Cards", options: ["Andar", "Bahar"], payout: 1.9, durationSec: 25 },
  { id: "baccarat", name: "Baccarat", cat: "Cards", options: ["Player", "Banker", "Tie"], payout: 1.95, durationSec: 25 },
  { id: "roulette", name: "European Roulette", cat: "Wheel", options: ["Red", "Black", "Green 0"], payout: 2.0, durationSec: 25 },
  { id: "seven-up-down", name: "7 Up 7 Down", cat: "Dice", options: ["7 Down", "7 Exact", "7 Up"], payout: 2.0, durationSec: 25 },
  { id: "poker-t20", name: "Poker T20", cat: "Cards", options: ["Player A", "Player B"], payout: 1.95, durationSec: 25 },
  { id: "sic-bo", name: "Sic Bo", cat: "Dice", options: ["Small (4-10)", "Big (11-17)"], payout: 1.95, durationSec: 25 },
  { id: "football-studio", name: "Football Studio", cat: "Cards", options: ["Home", "Away", "Draw"], payout: 1.95, durationSec: 25 },
  { id: "casino-war", name: "Casino War", cat: "Cards", options: ["Player", "Dealer", "War"], payout: 1.95, durationSec: 25 },
  { id: "lightning-roulette", name: "Lightning Roulette", cat: "Wheel", options: ["Red", "Black", "Lightning"], payout: 2.0, durationSec: 25 },
  { id: "crazy-time", name: "Crazy Time Wheel", cat: "Wheel", options: ["1", "2", "5", "Bonus"], payout: 2.0, durationSec: 25 },
  { id: "horse-racing", name: "Virtual Horse Racing", cat: "Track", options: ["Lane 1", "Lane 2", "Lane 3", "Lane 4"], payout: 3.6, durationSec: 25 },
  { id: "lucky-7", name: "Lucky 7", cat: "Cards", options: ["Low", "High"], payout: 1.95, durationSec: 25 },
  { id: "32-cards", name: "32 Cards", cat: "Cards", options: ["Player 8", "Player 9", "Player 10", "Player 11"], payout: 3.6, durationSec: 25 },
  { id: "amar-akbar-anthony", name: "Amar Akbar Anthony", cat: "Cards", options: ["Amar", "Akbar", "Anthony"], payout: 2.85, durationSec: 25 },
  { id: "bollywood-casino", name: "Bollywood Casino", cat: "Cards", options: ["Don", "Amar", "Akbar", "Anthony"], payout: 3.6, durationSec: 25 },
  { id: "muflis-teen-patti", name: "Muflis Teen Patti", cat: "Cards", options: ["Player A", "Player B"], payout: 1.95, durationSec: 25 },
  { id: "race-20", name: "Race 20", cat: "Cards", options: ["Spade", "Heart", "Club", "Diamond"], payout: 3.6, durationSec: 25 },
  { id: "queen", name: "Queen", cat: "Cards", options: ["Total 0", "Total 1", "Total 2", "Total 3"], payout: 3.6, durationSec: 25 },
  { id: "worli-matka", name: "Instant Worli", cat: "Numbers", options: ["Single Odd", "Single Even"], payout: 1.9, durationSec: 25 },
  { id: "dt-lion", name: "Dragon Tiger Lion", cat: "Cards", options: ["Dragon", "Tiger", "Lion"], payout: 2.85, durationSec: 25 },
  { id: "one-day-teen-patti", name: "1-Day Teen Patti", cat: "Cards", options: ["Player A", "Player B"], payout: 1.95, durationSec: 25 },
  { id: "super-over", name: "Super Over Cricket", cat: "Sports", options: ["Batting", "Bowling"], payout: 1.95, durationSec: 25 }
];

const ROLES = ["SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "AGENT", "USER"];
const accounts = new Map([
  ["superadmin", { id: "superadmin", name: "Super Master", role: "SUPER_ADMIN", parentId: null, balance: 5000000, limit: 5000000, active: true, pass: "admin123", demo: false }],
  ["admin01", { id: "admin01", name: "Master Admin", role: "ADMIN", parentId: "superadmin", balance: 1000000, limit: 1000000, active: true, pass: "admin123", demo: false }],
  ["subadmin01", { id: "subadmin01", name: "Sub Admin West", role: "SUB_ADMIN", parentId: "admin01", balance: 250000, limit: 250000, active: true, pass: "admin123", demo: false }],
  ["agent01", { id: "agent01", name: "Agent Desk 1", role: "AGENT", parentId: "subadmin01", balance: 50000, limit: 50000, active: true, pass: "admin123", demo: false }],
  ["player01", { id: "player01", name: "Demo Player 01", role: "USER", parentId: "agent01", balance: 10000, limit: 25000, active: true, pass: "player123", demo: false }],
  ["mgmt_demo", { id: "mgmt_demo", name: "Management Demo (Read-Only)", role: "ADMIN", parentId: "superadmin", balance: 1000000, limit: 1000000, active: true, pass: "", demo: true }]
]);

const memSessions = new Map(), roundsByGame = new Map(), recentByGame = new Map(), idempotency = new Map();
const houseConfig = { globalHouseProfitPct: 15, perGamePct: {}, forcedNextWinner: {} };
const adminStats = { totalVolume: 0, totalPayout: 0, roundsSettled: 0 };
const r2 = (n) => Math.round(Number(n) * 100) / 100;
const getEffectiveHouseProfitPct = (gid) => typeof houseConfig.perGamePct[gid] === "number" ? houseConfig.perGamePct[gid] : houseConfig.globalHouseProfitPct;
const getMult = (g, win) => (["Tie", "Draw", "Green 0"].includes(win) ? 8.0 : g.payout);

function isDescendant(ancestorId, targetId) {
  if (ancestorId === "superadmin" || ancestorId === targetId) return true;
  let cur = accounts.get(targetId);
  while (cur && cur.parentId) { if (cur.parentId === ancestorId) return true; cur = accounts.get(cur.parentId); }
  return false;
}

function selectOutcomeByHouseProfit(g, r) {
  if (houseConfig.forcedNextWinner[g.id] && g.options.includes(houseConfig.forcedNextWinner[g.id])) {
    const w = houseConfig.forcedNextWinner[g.id]; delete houseConfig.forcedNextWinner[g.id]; return w;
  }
  const pct = Math.max(0, Math.min(100, Number(getEffectiveHouseProfitPct(g.id)) || 0));
  if (!r.entries.length || pct === 0) return g.options[crypto.randomInt(0, g.options.length)];
  const totalStake = r.entries.reduce((a, e) => a + Number(e.amount || 0), 0);
  const maxPay = totalStake * (1 - pct / 100);
  const scored = g.options.map((op) => {
    const est = r.entries.filter((e) => e.selection === op).reduce((a, e) => a + r2(e.amount * getMult(g, op)), 0);
    return { op, est, ok: est <= maxPay };
  });
  if (pct >= 100) return [...scored].sort((a, b) => a.est - b.est)[0].op;
  const safe = scored.filter((x) => x.ok);
  const poolList = safe.length ? safe : scored;
  return poolList[crypto.randomInt(0, poolList.length)].op;
}
async function logStmt(db, sid, type, ref, desc, debit, credit, balAfter) {
  const stmtId = `STM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  if (db) {
    await db.query(`insert into training_app.account_statement (statement_id, session_id, entry_type, reference_id, description, debit, credit, balance_after) values ($1,$2,$3,$4,$5,$6,$7,$8)`, [stmtId, sid, type, ref, desc, debit, credit, balAfter]);
  } else {
    const s = memSessions.get(sid);
    if (s) { s.statements.unshift({ statement_id: stmtId, entry_type: type, reference_id: ref, description: desc, debit, credit, balance_after: balAfter, created_at: new Date().toISOString() }); s.statements = s.statements.slice(0, 150); }
  }
}

const newRound = (g) => {
  const now = Date.now();
  const r = { roundId: `${g.id.toUpperCase()}-${now}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`, gameId: g.id, gameName: g.name, status: "OPEN", bettingEndsAt: now + 25000, settlesAt: now + 29500, entries: [], dealStep: 0 };
  roundsByGame.set(g.id, r); return r;
};

const settle = async (g, r) => {
  if (r.status === "SETTLED") return;
  const win = selectOutcomeByHouseProfit(g, r);
  r.winningOption = win; r.status = "SETTLED";
  const mult = getMult(g, win);
  let stakeSum = 0, paySum = 0;
  for (const e of r.entries) {
    if (e.settled) continue;
    e.settled = true; stakeSum = r2(stakeSum + Number(e.amount || 0));
    const payout = e.selection === win ? r2(e.amount * mult) : 0;
    paySum = r2(paySum + payout);
    e.payout = payout; e.result = payout > 0 ? "WON" : "LOST"; e.winningOption = win;
    const acc = accounts.get(e.sessionId);
    if (acc && payout > 0) acc.balance = r2(acc.balance + payout);
    if (pool && e.sessionId.startsWith("TRAIN-")) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query(`update training_app.training_entries set result=$1, payout=$2, winning_option=$3, settled=true where entry_id=$4`, [e.result, payout, win, e.entryId]);
        if (payout > 0) {
          const u = await client.query(`update training_app.training_sessions set balance = balance + $1, display_points = balance + $1, updated_at = now() where session_id=$2 returning balance`, [payout, e.sessionId]);
          if (u.rows[0]) await logStmt(client, e.sessionId, "WIN_SETTLEMENT", e.entryId, `${g.name} (${e.selection}) won on ${win}`, 0, payout, Number(u.rows[0].balance));
        }
        await client.query("commit");
      } catch (err) { await client.query("rollback"); } finally { client.release(); }
    } else {
      const s = memSessions.get(e.sessionId);
      if (s && payout > 0) { s.balance = r2(s.balance + payout); await logStmt(null, e.sessionId, "WIN_SETTLEMENT", e.entryId, `${g.name} (${e.selection}) won on ${win}`, 0, payout, s.balance); }
    }
  }
  adminStats.totalVolume = r2(adminStats.totalVolume + stakeSum);
  adminStats.totalPayout = r2(adminStats.totalPayout + paySum);
  adminStats.roundsSettled += 1;
  const list = recentByGame.get(g.id) || [];
  list.unshift({ roundId: r.roundId, winningOption: win, houseProfitPct: getEffectiveHouseProfitPct(g.id) });
  recentByGame.set(g.id, list.slice(0, 12));
};

const tick = () => {
  const now = Date.now();
  for (const g of GAMES) {
    const r = roundsByGame.get(g.id) || newRound(g);
    if (r.status === "OPEN" && now >= r.bettingEndsAt) r.status = "LOCKED";
    if (r.status === "LOCKED") {
      r.dealStep = Math.min(3, Math.floor((now - r.bettingEndsAt) / 1500) + 1);
      if (now >= r.settlesAt) { settle(g, r); newRound(g); }
    }
  }
};
GAMES.forEach(newRound);
setInterval(tick, 500);

app.get("/api/health", (_req, res) => res.json({ ok: true, db: Boolean(pool), games: GAMES.length, roles: ROLES.length, houseProfitPct: houseConfig.globalHouseProfitPct }));

app.post("/api/auth/login", (req, res) => {
  const { accountId, password, mode } = req.body || {};
  if (mode === "PLAYER_DEMO_5M") {
    const id = `DEMO5M-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const acc = { id, name: "5-Min Player Demo", role: "USER", parentId: "agent01", balance: 10000, limit: 10000, active: true, pass: "", demo: true, expiresAt: Date.now() + 300000 };
    accounts.set(id, acc); memSessions.set(id, { sessionId: id, balance: 10000, history: [], statements: [] });
    return res.json({ ok: true, account: acc });
  }
  if (mode === "MGMT_DEMO_RO") return res.json({ ok: true, account: accounts.get("mgmt_demo") });
  const acc = accounts.get(String(accountId || "").trim());
  if (!acc || !acc.active) return res.status(403).json({ error: "ACCOUNT_INACTIVE_OR_NOT_FOUND" });
  if (acc.pass && password && acc.pass !== password) return res.status(401).json({ error: "INVALID_PASSWORD" });
  res.json({ ok: true, account: { id: acc.id, name: acc.name, role: acc.role, parentId: acc.parentId, balance: acc.balance, limit: acc.limit, active: acc.active, demo: acc.demo } });
});
app.post("/api/admin/config", (req, res) => {
  const { actorId, globalHouseProfitPct, gameId, gameHouseProfitPct, clearGameOverride, forcedWinner } = req.body || {};
  const actor = accounts.get(actorId || "superadmin");
  if (actor && actor.demo) return res.status(403).json({ error: "READ_ONLY_DEMO" });
  if (typeof globalHouseProfitPct !== "undefined") houseConfig.globalHouseProfitPct = Math.max(0, Math.min(100, Number(globalHouseProfitPct) || 0));
  if (gameId && GAMES.some((x) => x.id === gameId)) {
    if (clearGameOverride) delete houseConfig.perGamePct[gameId];
    else if (typeof gameHouseProfitPct !== "undefined") houseConfig.perGamePct[gameId] = Math.max(0, Math.min(100, Number(gameHouseProfitPct) || 0));
    if (typeof forcedWinner === "string") { if (!forcedWinner) delete houseConfig.forcedNextWinner[gameId]; else houseConfig.forcedNextWinner[gameId] = forcedWinner; }
  }
  res.json({ ok: true, globalHouseProfitPct: houseConfig.globalHouseProfitPct, perGamePct: houseConfig.perGamePct });
});
app.post("/api/admin/round-action", async (req, res) => {
  const { actorId, gameId, action } = req.body || {};
  const actor = accounts.get(actorId || "superadmin");
  if (actor && actor.demo) return res.status(403).json({ error: "READ_ONLY_DEMO" });
  const g = GAMES.find((x) => x.id === gameId) || GAMES[0], r = roundsByGame.get(g.id) || newRound(g);
  if (action === "lock") { r.status = "LOCKED"; r.bettingEndsAt = Date.now(); }
  else if (action === "settle") { await settle(g, r); newRound(g); }
  else if (action === "reset-round") { newRound(g); }
  res.json({ ok: true });
});
app.post("/api/session", async (req, res) => {
  try {
    const reqId = String(req.body?.sessionId || "").trim();
    if (accounts.has(reqId)) { const a = accounts.get(reqId); return res.json({ sessionId: a.id, balance: a.balance, role: a.role, name: a.name }); }
    if (pool) {
      if (reqId) { const ex = await pool.query(`select session_id, coalesce(balance, display_points, 10000) as balance from training_app.training_sessions where session_id=$1`, [reqId]); if (ex.rows[0]) return res.json({ sessionId: ex.rows[0].session_id, balance: Number(ex.rows[0].balance), role: "USER", name: "Guest Player" }); }
      const sid = `TRAIN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      await pool.query(`insert into training_app.training_sessions (session_id, display_points, balance) values ($1, 10000, 10000)`, [sid]);
      await logStmt(pool, sid, "OPENING_CREDIT", sid, "Initial training balance", 0, 10000, 10000);
      return res.status(201).json({ sessionId: sid, balance: 10000, role: "USER", name: "Guest Player" });
    }
    const sid = `TRAIN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    memSessions.set(sid, { sessionId: sid, balance: 10000, history: [], statements: [] });
    res.status(201).json({ sessionId: sid, balance: 10000, role: "USER", name: "Guest Player" });
  } catch (err) { res.status(500).json({ error: "SESSION_DB_ERROR", detail: err.message }); }
});
app.post("/api/session/:id/refill", async (req, res) => {
  const sid = req.params.id;
  if (accounts.has(sid)) { accounts.get(sid).balance = 10000; return res.json({ ok: true, balance: 10000 }); }
  if (pool) { await pool.query(`update training_app.training_sessions set balance=10000, display_points=10000, updated_at=now() where session_id=$1`, [sid]); await logStmt(pool, sid, "REFILL_RESET", sid, "Reset training balance to 10,000 VC", 0, 10000, 10000); }
  res.json({ ok: true, balance: 10000 });
});
app.get("/api/games", (_req, res) => res.json({ games: GAMES.map((g) => ({ ...g, houseProfitPct: getEffectiveHouseProfitPct(g.id) })) }));
app.get("/api/rounds/active", (req, res) => { tick(); const g = GAMES.find((x) => x.id === String(req.query.gameId || GAMES[0].id)) || GAMES[0], r = roundsByGame.get(g.id), now = Date.now(); const secondsRemaining = Math.max(0, Math.ceil(((r.status === "OPEN" ? r.bettingEndsAt : r.settlesAt) - now) / 1000)); res.json({ game: { ...g, houseProfitPct: getEffectiveHouseProfitPct(g.id) }, round: { roundId: r.roundId, status: r.status, secondsRemaining, dealStep: r.dealStep }, recentResults: recentByGame.get(g.id) || [] }); });
app.post("/api/rounds/:roundId/entries", async (req, res) => {
  tick(); const { sessionId, gameId, selection, amount, idempotencyKey } = req.body || {}; const amt = r2(amount);
  const g = GAMES.find((x) => x.id === gameId), r = g && roundsByGame.get(g.id);
  if (!sessionId || !g || !g.options.includes(selection) || !r || r.roundId !== req.params.roundId || r.status !== "OPEN" || amt <= 0) return res.status(409).json({ error: "ROUND_OR_SESSION_INVALID" });
  const key = `${sessionId}:${idempotencyKey}`;
  if (idempotency.has(key)) return res.json({ status: "REPLAY", ...idempotency.get(key) });
  const entry = { entryId: `ENT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`, sessionId, gameName: g.name, selection, amount: amt, result: "PENDING", payout: 0, winningOption: null, settled: false };
  if (accounts.has(sessionId)) {
    const a = accounts.get(sessionId);
    if (a.expiresAt && Date.now() > a.expiresAt) return res.status(403).json({ error: "DEMO_5M_EXPIRED" });
    if (a.balance < amt) return res.status(400).json({ error: "INSUFFICIENT_BALANCE" });
    a.balance = r2(a.balance - amt); r.entries.push(entry);
    const s = memSessions.get(sessionId) || { sessionId, balance: a.balance, history: [], statements: [] };
    s.history.unshift(entry); s.statements.unshift({ statement_id: `STM-${crypto.randomBytes(3).toString("hex").toUpperCase()}`, entry_type: "BET_PLACED", description: `${g.name} - ${selection}`, debit: amt, credit: 0, balance_after: a.balance, created_at: new Date().toISOString() });
    memSessions.set(sessionId, s); idempotency.set(key, { entry, balance: a.balance });
    return res.status(201).json({ status: "ACCEPTED", entry, balance: a.balance });
  }
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const u = await client.query(`update training_app.training_sessions set balance = balance - $1, display_points = balance - $1, updated_at = now() where session_id=$2 and balance >= $1 returning balance`, [amt, sessionId]);
      if (!u.rows[0]) { await client.query("rollback"); return res.status(400).json({ error: "INSUFFICIENT_OR_INVALID_SESSION" }); }
      const newBal = Number(u.rows[0].balance);
      await client.query(`insert into training_app.training_entries (entry_id, session_id, round_id, game_id, game_name, selection, amount) values ($1,$2,$3,$4,$5,$6,$7)`, [entry.entryId, sessionId, r.roundId, g.id, g.name, selection, amt]);
      await logStmt(client, sessionId, "BET_PLACED", entry.entryId, `${g.name} - ${selection} (${r.roundId})`, amt, 0, newBal);
      await client.query("commit"); r.entries.push(entry); idempotency.set(key, { entry, balance: newBal });
      return res.status(201).json({ status: "ACCEPTED", entry, balance: newBal });
    } catch (err) { await client.query("rollback"); return res.status(500).json({ error: "DB_ERROR", detail: err.message }); } finally { client.release(); }
  }
  res.status(404).json({ error: "SESSION_NOT_FOUND" });
});
app.get("/api/history", async (req, res) => {
  const sid = String(req.query.sessionId || "");
  if (accounts.has(sid)) { const a = accounts.get(sid), s = memSessions.get(sid) || { history: [], statements: [] }; return res.json({ balance: a.balance, history: s.history, statements: s.statements }); }
  if (pool) {
    const s = await pool.query(`select balance from training_app.training_sessions where session_id=$1`, [sid]);
    if (!s.rows[0]) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
    const h = await pool.query(`select entry_id as "entryId", game_name as "gameName", selection, amount, result, payout, winning_option as "winningOption" from training_app.training_entries where session_id=$1 order by created_at desc limit 30`, [sid]);
    const st = await pool.query(`select statement_id, entry_type, reference_id, description, debit, credit, balance_after, created_at from training_app.account_statement where session_id=$1 order by created_at desc limit 50`, [sid]);
    return res.json({ balance: Number(s.rows[0].balance), history: h.rows, statements: st.rows });
  }
  res.status(404).json({ error: "SESSION_NOT_FOUND" });
});
app.listen(PORT, "0.0.0.0", () => console.log("READY_ON_3000"));
