import express from "express";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const path = require("path");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const ROUND_CYCLE_SEC = 35;
const BET_WINDOW_SEC = 30;
const HARD_LOCK_SEC = 5;
const A1_TO_B1_DELAY_MS = 2500;
const CARD_STEP_MS = 2500;
const ONEDAY_STAGE_SEC = 20;

const DB_URL = process.env.TRAINING_DATABASE_URL || process.env.DATABASE_URL || "";
const pool = DB_URL ? new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } }) : null;

const GAMES = [
  { id: "teen-patti-2020", name: "Teen Patti 20-20", cat: "Cards", mode: "3CARD", options: ["Player A", "Player B"], fancyOptions: ["Pair Plus", "3 Card Flush"], payout: 1.95 },
  { id: "teen-patti-oneday", name: "Teen Patti One Day", cat: "Cards", mode: "ONEDAY", options: ["Player A", "Player B"], fancyOptions: ["High Card", "Sequence"], payout: 1.95 },
  { id: "poker-t20", name: "Poker T20", cat: "Cards", mode: "3CARD", options: ["Player A", "Player B"], fancyOptions: [" suited", "Pair"], payout: 1.95 },
  { id: "poker-oneday", name: "Poker One Day", cat: "Cards", mode: "POKER_ONEDAY", options: ["Player A", "Player B"], fancyOptions: ["Flop Hit", "River Ace"], payout: 1.95 },
  { id: "dragon-tiger", name: "Dragon Tiger", cat: "Cards", mode: "3CARD", options: ["Dragon", "Tiger", "Tie"], fancyOptions: ["Suited Tie"], payout: 1.95 },
  { id: "baccarat", name: "Baccarat", cat: "Cards", mode: "3CARD", options: ["Player", "Banker", "Tie"], fancyOptions: ["Pair"], payout: 1.95 },
  { id: "andar-bahar", name: "Andar Bahar", cat: "Cards", mode: "3CARD", options: ["Andar", "Bahar"], fancyOptions: ["First Card Match"], payout: 1.9 },
  { id: "casino-war", name: "Casino War", cat: "Cards", mode: "3CARD", options: ["Player", "Dealer", "War"], fancyOptions: ["Tie War"], payout: 1.9 },
  { id: "amar-akbar-anthony", name: "Amar Akbar Anthony", cat: "Cards", mode: "3CARD", options: ["Amar", "Akbar", "Anthony"], fancyOptions: ["Red Suit"], payout: 2.85 },
  { id: "lucky-7", name: "Lucky 7", cat: "Cards", mode: "3CARD", options: ["Low (1-6)", "7 Lucky", "High (8-13)"], fancyOptions: ["Even", "Odd"], payout: 1.95 },
  { id: "32-cards", name: "32 Cards Casino", cat: "Cards", mode: "3CARD", options: ["8", "9", "10", "11"], fancyOptions: ["Highest Hand"], payout: 3.6 },
  { id: "football-studio", name: "Football Studio", cat: "Cards", mode: "3CARD", options: ["Home", "Away", "Draw"], fancyOptions: ["High Card"], payout: 1.95 },
  { id: "roulette-live", name: "Live Roulette", cat: "Wheel", mode: "WHEEL", options: ["Red", "Black", "Zero"], fancyOptions: ["Odd", "Even"], payout: 1.95 },
  { id: "lightning-roulette", name: "Lightning Roulette", cat: "Wheel", mode: "WHEEL", options: ["Red", "Black", "Lucky No"], fancyOptions: ["Multiplier Hit"], payout: 2.0 },
  { id: "crazy-time", name: "Crazy Time", cat: "Wheel", mode: "WHEEL", options: ["1x", "2x", "5x", "Bonus"], fancyOptions: ["Top Slot Match"], payout: 2.0 },
  { id: "dream-catcher", name: "Dream Catcher", cat: "Wheel", mode: "WHEEL", options: ["1", "2", "5", "10"], fancyOptions: ["2x Spin"], payout: 2.0 },
  { id: "sic-bo", name: "Sic Bo", cat: "Dice", mode: "DICE", options: ["Small", "Big", "Triple"], fancyOptions: ["Double"], payout: 1.9 },
  { id: "7-up-7-down", name: "7 Up 7 Down", cat: "Dice", mode: "DICE", options: ["Under 7", "Exact 7", "Over 7"], fancyOptions: ["Doubles"], payout: 1.9 },
  { id: "horse-racing", name: "Horse Racing", cat: "Track", mode: "TRACK", options: ["Lane 1", "Lane 2", "Lane 3", "Lane 4"], fancyOptions: ["Exacta"], payout: 2.8 },
  { id: "greyhound-racing", name: "Greyhound Racing", cat: "Track", mode: "TRACK", options: ["Trap 1", "Trap 2", "Trap 3", "Trap 4"], fancyOptions: ["Show"], payout: 2.7 },
  { id: "virtual-cricket", name: "Virtual Cricket", cat: "Sports", mode: "SPORTS", options: ["Team A", "Team B"], fancyOptions: ["Six Over"], payout: 1.9 },
  { id: "virtual-football", name: "Virtual Football", cat: "Sports", mode: "SPORTS", options: ["Home", "Draw", "Away"], fancyOptions: ["Both Score"], payout: 1.95 },
  { id: "virtual-tennis", name: "Virtual Tennis", cat: "Sports", mode: "SPORTS", options: ["Player 1", "Player 2"], fancyOptions: ["Tiebreak"], payout: 1.9 },
  { id: "virtual-kabaddi", name: "Virtual Kabaddi", cat: "Sports", mode: "SPORTS", options: ["Raid A", "Raid B"], fancyOptions: ["Super Raid"], payout: 1.95 }
];
  const RED_N = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const C1_N = new Set([1,4,7,10,13,16,19,22,25,28,31,34]);
const C2_N = new Set([2,5,8,11,14,17,20,23,26,29,32,35]);
function allOutcomes(g) {
  if (g.id === "roulette-live" || g.id === "lightning-roulette") return Array.from({ length: 37 }, (_, i) => String(i));
  return (g.options || []).concat((g.fancyOptions || []).map(x => x.trim()).filter(Boolean));
}
function payFor(g, e, out) {
  const sel = String(e.selection || "").trim();
  const mult = e.isFancy ? 2 : (g.payout || 1.95);
  if (g.id === "roulette-live" || g.id === "lightning-roulette") {
    const n = Number(out);
    if (sel === String(n)) return Math.round(e.amount * 35);
    if (sel === "Red" && RED_N.has(n)) return Math.round(e.amount * 1.95);
    if (sel === "Black" && n > 0 && !RED_N.has(n)) return Math.round(e.amount * 1.95);
    if (sel === "Zero" && n === 0) return Math.round(e.amount * 35);
    if (sel === "Odd" && n > 0 && n % 2 === 1) return Math.round(e.amount * 1.95);
    if (sel === "Even" && n > 0 && n % 2 === 0) return Math.round(e.amount * 1.95);
    if (sel === "Column 1" && C1_N.has(n)) return Math.round(e.amount * 2.9);
    if (sel === "Column 2" && C2_N.has(n)) return Math.round(e.amount * 2.9);
    if (sel === "Column 3" && n > 0 && !C1_N.has(n) && !C2_N.has(n)) return Math.round(e.amount * 2.9);
    return 0;
  }
  return sel === out ? Math.round(e.amount * mult) : 0;
}
function pickWinner(g, roundId) {
  if (state.forcedNextWinner[g.id]) { const w = state.forcedNextWinner[g.id]; delete state.forcedNextWinner[g.id]; return w; }
  const entries = state.entries[roundId] || [];
  const list = allOutcomes(g).map(out => ({ out, loss: entries.reduce((t, e) => t + payFor(g, e, out), 0) })).sort((x, y) => x.loss - y.loss);
  const h = hashStr(roundId), pct = effPct(g.id) / 100;
  if ((h % 100) / 100 < pct && entries.length && list.length) {
    const zero = list.filter(x => x.loss === 0);
    const poolList = zero.length ? zero : list.filter(x => x.loss === list[0].loss);
    const chosen = poolList[h % poolList.length].out;
    if (g.id === "roulette-live" || g.id === "lightning-roulette") { const n = Number(chosen); return n === 0 ? "Zero" : (RED_N.has(n) ? "Red" : "Black"); }
    if ((g.options || []).includes(chosen)) return chosen;
    return (list.find(x => (g.options || []).includes(x.out)) || list[0]).out;
  }
  return (g.options || ["Player A"])[h % (g.options || ["Player A"]).length];
}
function getOrAdvanceRound(gid) {
  const g = getGame(gid), now = Date.now();
  let r = state.rounds[gid];
  const revealMs = g.mode === "POKER_ONEDAY" ? ONEDAY_STAGE_SEC * 1000 : (g.mode === "ONEDAY" ? ONEDAY_STAGE_SEC * 1000 : 6 * CARD_STEP_MS);
  if (!r) {
    const roundId = `${gid.toUpperCase()}-${Math.floor(now / 1000)}`;
    r = state.rounds[gid] = { roundId, gameId: gid, startedAt: now, status: "OPEN", hand: buildHand(roundId, g.mode), settled: false, winningOption: null };
  }
  const elapsedMs = now - r.startedAt, elapsedSec = Math.floor(elapsedMs / 1000);
  if (elapsedSec < BET_WINDOW_SEC) { r.status = "OPEN"; r.fancyLocked = false; r.secondsRemaining = ROUND_CYCLE_SEC - elapsedSec; r.dealStep = 0; }
  else if (elapsedSec < ROUND_CYCLE_SEC) { r.status = "LOCKED"; r.fancyLocked = true; r.secondsRemaining = ROUND_CYCLE_SEC - elapsedSec; r.dealStep = 0; }
  else if (elapsedMs < ROUND_CYCLE_SEC * 1000 + revealMs) {
    r.status = "DEALING"; r.fancyLocked = true; r.secondsRemaining = 0;
    const stepUnit = g.mode === "ONEDAY" ? Math.floor((ONEDAY_STAGE_SEC * 1000) / 6) : (g.mode === "POKER_ONEDAY" ? Math.floor((ONEDAY_STAGE_SEC * 1000) / 4) : CARD_STEP_MS);
    r.dealStep = Math.min(g.mode === "POKER_ONEDAY" ? 4 : 6, Math.floor((elapsedMs - ROUND_CYCLE_SEC * 1000) / stepUnit) + 1);
  } else {
    if (!r.settled) { r.settled = true; r.status = "SETTLED"; r.fancyLocked = true; r.dealStep = g.mode === "POKER_ONEDAY" ? 4 : 6; r.winningOption = pickWinner(g, r.roundId); settleRound(g, r); }
    if (elapsedMs >= ROUND_CYCLE_SEC * 1000 + revealMs + 3000) {
      const nextId = `${gid.toUpperCase()}-${Math.floor(now / 1000)}`;
      if (nextId !== r.roundId) r = state.rounds[gid] = { roundId: nextId, gameId: gid, startedAt: now, status: "OPEN", hand: buildHand(nextId, g.mode), settled: false, winningOption: null, dealStep: 0, secondsRemaining: ROUND_CYCLE_SEC };
    }
  }
  return r;
}
app.get("/api/rounds/active", (req, res) => {
  const g = getGame(req.query.gameId), r = getOrAdvanceRound(g.id);
  const vh = r.status === "OPEN" ? null : (g.mode === "POKER_ONEDAY"
    ? { pA: r.dealStep >= 1 ? (r.hand.pA || []) : [], pB: r.dealStep >= 2 ? (r.hand.pB || []) : [], comm: r.dealStep >= 3 ? (r.hand.comm || []).slice(0, r.dealStep === 3 ? 3 : 5) : [] }
    : Object.fromEntries((r.hand.order || []).slice(0, r.dealStep || 0).map(k => [k, r.hand.cards[k]])));
  res.json({ game: { ...g, houseProfitPct: effPct(g.id) }, round: { roundId: r.roundId, gameId: r.gameId, status: r.status, secondsRemaining: r.secondsRemaining, dealStep: r.dealStep, fancyLocked: r.fancyLocked, winningOption: r.status === "SETTLED" ? r.winningOption : null, visibleHand: vh }, recentResults: state.recent[g.id] || [] });
});
