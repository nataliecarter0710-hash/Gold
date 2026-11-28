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

const dbUrl = process.env.TRAINING_DATABASE_URL || "";
const pool = dbUrl ? new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } }) : null;

const GAMES = [
  { id: "teen-patti-2020", name: "Teen Patti 20-20", options: ["Player A", "Player B"], payout: 1.95, durationSec: 25 },
  { id: "dragon-tiger", name: "Dragon Tiger", options: ["Dragon", "Tiger", "Tie"], payout: 1.95, durationSec: 20 },
  { id: "andar-bahar", name: "Andar Bahar", options: ["Andar", "Bahar"], payout: 1.9, durationSec: 20 },
  { id: "baccarat", name: "Baccarat", options: ["Player", "Banker", "Tie"], payout: 1.95, durationSec: 25 },
  { id: "roulette", name: "European Roulette", options: ["Red", "Black", "Green 0"], payout: 2.0, durationSec: 25 },
  { id: "seven-up-down", name: "7 Up 7 Down", options: ["7 Down", "7 Exact", "7 Up"], payout: 2.0, durationSec: 20 },
  { id: "poker-t20", name: "Poker T20", options: ["Player A", "Player B"], payout: 1.95, durationSec: 25 },
  { id: "sic-bo", name: "Sic Bo", options: ["Small (4-10)", "Big (11-17)"], payout: 1.95, durationSec: 20 },
  { id: "football-studio", name: "Football Studio", options: ["Home", "Away", "Draw"], payout: 1.95, durationSec: 20 },
  { id: "casino-war", name: "Casino War", options: ["Player", "Dealer", "War"], payout: 1.95, durationSec: 20 },
  { id: "lightning-roulette", name: "Lightning Roulette", options: ["Red", "Black", "Lightning"], payout: 2.0, durationSec: 25 },
  { id: "crazy-time", name: "Crazy Time Wheel", options: ["1", "2", "5", "Bonus"], payout: 2.0, durationSec: 25 },
  { id: "horse-racing", name: "Virtual Horse Racing", options: ["Lane 1", "Lane 2", "Lane 3", "Lane 4"], payout: 3.6, durationSec: 25 },
  { id: "lucky-7", name: "Lucky 7", options: ["Low", "High"], payout: 1.95, durationSec: 20 },
  { id: "32-cards", name: "32 Cards", options: ["Player 8", "Player 9", "Player 10", "Player 11"], payout: 3.6, durationSec: 25 },
  { id: "amar-akbar-anthony", name: "Amar Akbar Anthony", options: ["Amar", "Akbar", "Anthony"], payout: 2.85, durationSec: 20 },
  { id: "bollywood-casino", name: "Bollywood Casino", options: ["Don", "Amar", "Akbar", "Anthony"], payout: 3.6, durationSec: 20 },
  { id: "muflis-teen-patti", name: "Muflis Teen Patti", options: ["Player A", "Player B"], payout: 1.95, durationSec: 25 },
  { id: "race-20", name: "Race 20", options: ["Spade", "Heart", "Club", "Diamond"], payout: 3.6, durationSec: 25 },
  { id: "queen", name: "Queen", options: ["Total 0", "Total 1", "Total 2", "Total 3"], payout: 3.6, durationSec: 20 },
  { id: "worli-matka", name: "Instant Worli", options: ["Single Odd", "Single Even"], payout: 1.9, durationSec: 20 },
  { id: "dt-lion", name: "Dragon Tiger Lion", options: ["Dragon", "Tiger", "Lion"], payout: 2.85, durationSec: 20 },
  { id: "one-day-teen-patti", name: "1-Day Teen Patti", options: ["Player A", "Player B"], payout: 1.95, durationSec: 25 },
  { id: "super-over", name: "Super Over Cricket", options: ["Batting", "Bowling"], payout: 1.95, durationSec: 20 }
];

const memSessions = new Map(), roundsByGame = new Map(), recentByGame = new Map(), idempotency = new Map();
const r2 = (n) => Math.round(Number(n) * 100) / 100;

async function logStmt(db, sid, type, ref, desc, debit, credit, balAfter) {
  const stmtId = `STM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  if (db) {
    await db.query(
      `insert into training_app.account_statement (statement_id, session_id, entry_type, reference_id, description, debit, credit, balance_after) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [stmtId, sid, type, ref, desc, debit, credit, balAfter]
    );
  } else {
    const s = memSessions.get(sid);
    if (s) { s.statements.unshift({ statement_id: stmtId, entry_type: type, reference_id: ref, description: desc, debit, credit, balance_after: balAfter, created_at: new Date().toISOString() }); s.statements = s.statements.slice(0, 150); }
  }
}

const newRound = (g) => {
  const now = Date.now(), r = { roundId: `${g.id.toUpperCase()}-${now}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`, gameId: g.id, gameName: g.name, status: "OPEN", bettingEndsAt: now + g.durationSec * 1000, settlesAt: now + (g.durationSec + 5) * 1000, entries: [] };
  roundsByGame.set(g.id, r); return r;
};

const settle = async (g, r) => {
  if (r.status === "SETTLED") return;
  const win = g.options[crypto.randomInt(0, g.options.length)];
  r.winningOption = win; r.status = "SETTLED";
  const mult = ["Tie", "Draw", "Green 0"].includes(win) ? 8.0 : g.payout;
  for (const e of r.entries) {
    if (e.settled) continue;
    e.settled = true;
    const payout = e.selection === win ? r2(e.amount * mult) : 0;
    const result = payout > 0 ? "WON" : "LOST";
    e.payout = payout; e.result = result; e.winningOption = win;
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query(`update training_app.training_entries set result=$1, payout=$2, winning_option=$3, settled=true where entry_id=$4`, [result, payout, win, e.entryId]);
        if (payout > 0) {
          const u = await client.query(`update training_app.training_sessions set balance = balance + $1, display_points = balance + $1, updated_at = now() where session_id=$2 returning balance`, [payout, e.sessionId]);
          if (u.rows[0]) await logStmt(client, e.sessionId, "WIN_SETTLEMENT", e.entryId, `${g.name} (${e.selection}) won on ${win}`, 0, payout, Number(u.rows[0].balance));
        }
        await client.query("commit");
      } catch (err) { await client.query("rollback"); console.error(err); } finally { client.release(); }
    } else {
      const s = memSessions.get(e.sessionId);
      if (s && payout > 0) { s.balance = r2(s.balance + payout); await logStmt(null, e.sessionId, "WIN_SETTLEMENT", e.entryId, `${g.name} (${e.selection}) won on ${win}`, 0, payout, s.balance); }
    }
  }
  const list = recentByGame.get(g.id) || [];
  list.unshift({ roundId: r.roundId, winningOption: win });
  recentByGame.set(g.id, list.slice(0, 12));
};

const tick = () => {
  const now = Date.now();
  for (const g of GAMES) {
    const r = roundsByGame.get(g.id) || newRound(g);
    if (r.status === "OPEN" && now >= r.bettingEndsAt) r.status = "LOCKED";
    if (r.status === "LOCKED" && now >= r.settlesAt) { settle(g, r); newRound(g); }
  }
};
GAMES.forEach(newRound);
setInterval(tick, 500);
app.get("/api/health", async (_req, res) => res.json({ ok: true, db: Boolean(pool), games: GAMES.length }));

app.post("/api/session", async (req, res) => {
  const reqId = String(req.body?.sessionId || "").trim();
  if (pool) {
    if (reqId) {
      const ex = await pool.query(`select session_id, balance from training_app.training_sessions where session_id=$1`, [reqId]);
      if (ex.rows[0]) return res.json({ sessionId: ex.rows[0].session_id, balance: Number(ex.rows[0].balance) });
    }
    const sid = `TRAIN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    await pool.query(`insert into training_app.training_sessions (session_id, display_points, balance) values ($1, 10000, 10000)`, [sid]);
    await logStmt(pool, sid, "OPENING_CREDIT", sid, "Initial training balance", 0, 10000, 10000);
    return res.status(201).json({ sessionId: sid, balance: 10000 });
  }
  if (reqId && memSessions.has(reqId)) { const s = memSessions.get(reqId); return res.json({ sessionId: s.sessionId, balance: s.balance }); }
  const s = { sessionId: `TRAIN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`, balance: 10000, history: [], statements: [] };
  memSessions.set(s.sessionId, s);
  await logStmt(null, s.sessionId, "OPENING_CREDIT", s.sessionId, "Initial training balance", 0, 10000, 10000);
  res.status(201).json({ sessionId: s.sessionId, balance: s.balance });
});

app.post("/api/session/:id/refill", async (req, res) => {
  const sid = req.params.id;
  if (pool) {
    const u = await pool.query(`update training_app.training_sessions set balance=10000, display_points=10000, updated_at=now() where session_id=$1 returning balance`, [sid]);
    if (!u.rows[0]) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
    await logStmt(pool, sid, "REFILL_RESET", sid, "Reset training balance to 10,000 VC", 0, 10000, 10000);
    return res.json({ ok: true, balance: 10000 });
  }
  const s = memSessions.get(sid);
  if (!s) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
  s.balance = 10000;
  await logStmt(null, sid, "REFILL_RESET", sid, "Reset training balance to 10,000 VC", 0, 10000, 10000);
  res.json({ ok: true, balance: 10000 });
});

app.get("/api/games", (_req, res) => res.json({ games: GAMES }));

app.get("/api/rounds/active", (req, res) => {
  tick();
  const g = GAMES.find((x) => x.id === String(req.query.gameId || GAMES[0].id)) || GAMES[0];
  const r = roundsByGame.get(g.id), now = Date.now();
  const secondsRemaining = Math.max(0, Math.ceil(((r.status === "OPEN" ? r.bettingEndsAt : r.settlesAt) - now) / 1000));
  res.json({ game: g, round: { roundId: r.roundId, status: r.status, secondsRemaining }, recentResults: recentByGame.get(g.id) || [] });
});

app.post("/api/rounds/:roundId/entries", async (req, res) => {
  tick();
  const { sessionId, gameId, selection, amount, idempotencyKey } = req.body || {};
  const amt = r2(amount);
  if (!sessionId || !gameId || !selection || !idempotencyKey || !Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "INVALID_INPUT" });
  const key = `${sessionId}:${idempotencyKey}`, fp = JSON.stringify({ roundId: req.params.roundId, gameId, selection, amt });
  if (idempotency.has(key)) {
    const prev = idempotency.get(key);
    return prev.fp !== fp ? res.status(409).json({ error: "IDEMPOTENCY_CONFLICT" }) : res.json({ status: "REPLAY", entry: prev.entry, balance: prev.balance });
  }
  const g = GAMES.find((x) => x.id === gameId), r = g && roundsByGame.get(g.id);
  if (!g || !g.options.includes(selection) || !r || r.roundId !== req.params.roundId || r.status !== "OPEN") return res.status(409).json({ error: "ROUND_OR_SESSION_INVALID" });
  const entry = { entryId: `ENT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`, gameName: g.name, selection, amount: amt, result: "PENDING", payout: 0, winningOption: null, settled: false };

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const u = await client.query(`update training_app.training_sessions set balance = balance - $1, display_points = balance - $1, updated_at = now() where session_id=$2 and balance >= $1 returning balance`, [amt, sessionId]);
      if (!u.rows[0]) { await client.query("rollback"); return res.status(400).json({ error: "INSUFFICIENT_OR_INVALID_SESSION" }); }
      const newBal = Number(u.rows[0].balance);
      await client.query(`insert into training_app.training_entries (entry_id, session_id, round_id, game_id, game_name, selection, amount) values ($1,$2,$3,$4,$5,$6,$7)`, [entry.entryId, sessionId, r.roundId, g.id, g.name, selection, amt]);
      await logStmt(client, sessionId, "BET_PLACED", entry.entryId, `${g.name} - ${selection} (${r.roundId})`, amt, 0, newBal);
      await client.query("commit");
      r.entries.push({ ...entry, sessionId });
      idempotency.set(key, { fp, entry, balance: newBal });
      return res.status(201).json({ status: "ACCEPTED", entry, balance: newBal });
    } catch (err) { await client.query("rollback"); return res.status(500).json({ error: "DB_ERROR" }); } finally { client.release(); }
  }

  const s = memSessions.get(sessionId);
  if (!s) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
  if (s.balance < amt) return res.status(400).json({ error: "INSUFFICIENT_BALANCE" });
  s.balance = r2(s.balance - amt);
  r.entries.push({ ...entry, sessionId });
  s.history.unshift(entry); s.history = s.history.slice(0, 100);
  await logStmt(null, sessionId, "BET_PLACED", entry.entryId, `${g.name} - ${selection} (${r.roundId})`, amt, 0, s.balance);
  idempotency.set(key, { fp, entry, balance: s.balance });
  res.status(201).json({ status: "ACCEPTED", entry, balance: s.balance });
});

app.get("/api/history", async (req, res) => {
  const sid = String(req.query.sessionId || "");
  if (pool) {
    const s = await pool.query(`select balance from training_app.training_sessions where session_id=$1`, [sid]);
    if (!s.rows[0]) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
    const h = await pool.query(`select entry_id as "entryId", game_name as "gameName", selection, amount, result, payout, winning_option as "winningOption" from training_app.training_entries where session_id=$1 order by created_at desc limit 30`, [sid]);
    const st = await pool.query(`select statement_id, entry_type, reference_id, description, debit, credit, balance_after, created_at from training_app.account_statement where session_id=$1 order by created_at desc limit 50`, [sid]);
    return res.json({ balance: Number(s.rows[0].balance), history: h.rows, statements: st.rows });
  }
  const s = memSessions.get(sid);
  if (!s) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
  res.json({ balance: s.balance, history: s.history, statements: s.statements });
});

app.listen(PORT, "0.0.0.0", () => console.log("READY_ON_3000"));
