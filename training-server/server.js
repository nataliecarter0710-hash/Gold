import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

const sessions = new Map(), roundsByGame = new Map(), recentByGame = new Map(), idempotency = new Map();
const newRound = (g) => {
  const now = Date.now(), r = { roundId: `${g.id.toUpperCase()}-${now}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`, gameId: g.id, gameName: g.name, status: "OPEN", bettingEndsAt: now + g.durationSec * 1000, settlesAt: now + (g.durationSec + 5) * 1000, entries: [] };
  roundsByGame.set(g.id, r); return r;
};
const settle = (g, r) => {
  if (r.status === "SETTLED") return;
  const win = g.options[crypto.randomInt(0, g.options.length)];
  r.winningOption = win; r.status = "SETTLED";
  for (const e of r.entries) {
    if (e.settled) continue; e.settled = true;
    const mult = ["Tie", "Draw", "Green 0"].includes(win) ? 8.0 : g.payout;
    e.payout = e.selection === win ? Math.round(e.amount * mult * 100) / 100 : 0;
    e.result = e.payout > 0 ? "WON" : "LOST"; e.winningOption = win;
    const s = sessions.get(e.sessionId);
    if (s && e.payout > 0) s.balance = Math.round((s.balance + e.payout) * 100) / 100;
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
app.get("/api/health", (_req, res) => res.json({ ok: true, games: GAMES.length }));
app.post("/api/session", (req, res) => {
  const id = String(req.body?.sessionId || "").trim();
  if (id && sessions.has(id)) return res.json(sessions.get(id));
  const s = { sessionId: `TRAIN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`, balance: 10000, history: [] };
  sessions.set(s.sessionId, s); res.status(201).json(s);
});
app.post("/api/session/:id/refill", (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
  s.balance = 10000; res.json({ ok: true, balance: s.balance });
});
app.get("/api/games", (_req, res) => res.json({ games: GAMES }));
app.get("/api/rounds/active", (req, res) => {
  tick();
  const g = GAMES.find((x) => x.id === String(req.query.gameId || GAMES[0].id)) || GAMES[0];
  const r = roundsByGame.get(g.id), now = Date.now();
  const secondsRemaining = Math.max(0, Math.ceil(((r.status === "OPEN" ? r.bettingEndsAt : r.settlesAt) - now) / 1000));
  res.json({ game: g, round: { roundId: r.roundId, status: r.status, secondsRemaining }, recentResults: recentByGame.get(g.id) || [] });
});
app.post("/api/rounds/:roundId/entries", (req, res) => {
  tick();
  const { sessionId, gameId, selection, amount, idempotencyKey } = req.body || {};
  const amt = Number(amount);
  if (!sessionId || !gameId || !selection || !idempotencyKey || !Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "INVALID_INPUT" });
  const key = `${sessionId}:${idempotencyKey}`, fp = JSON.stringify({ roundId: req.params.roundId, gameId, selection, amt });
  if (idempotency.has(key)) {
    const prev = idempotency.get(key);
    return prev.fp !== fp ? res.status(409).json({ error: "IDEMPOTENCY_CONFLICT" }) : res.json({ status: "REPLAY", entry: prev.entry, balance: sessions.get(sessionId)?.balance });
  }
  const s = sessions.get(sessionId), g = GAMES.find((x) => x.id === gameId), r = g && roundsByGame.get(g.id);
  if (!s || !g || !g.options.includes(selection) || !r || r.roundId !== req.params.roundId || r.status !== "OPEN") return res.status(409).json({ error: "ROUND_OR_SESSION_INVALID" });
  if (s.balance < amt) return res.status(400).json({ error: "INSUFFICIENT_BALANCE" });
  s.balance = Math.round((s.balance - amt) * 100) / 100;
  const entry = { entryId: `ENT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`, gameName: g.name, selection, amount: amt, result: "PENDING", payout: 0, winningOption: null, settled: false };
  r.entries.push({ ...entry, sessionId });
  s.history.unshift(entry); s.history = s.history.slice(0, 100);
  idempotency.set(key, { fp, entry });
  res.status(201).json({ status: "ACCEPTED", entry, balance: s.balance });
});
app.get("/api/history", (req, res) => {
  const s = sessions.get(String(req.query.sessionId || ""));
  if (!s) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
  res.json({ balance: s.balance, history: s.history });
});
app.listen(PORT, "0.0.0.0", () => console.log("READY_ON_3000"));
