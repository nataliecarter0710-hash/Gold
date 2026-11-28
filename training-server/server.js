import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const { Pool } = pg;
const pool = process.env.TRAINING_DATABASE_URL
  ? new Pool({ connectionString: process.env.TRAINING_DATABASE_URL, ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined })
  : null;

const games = [
["tp20","Teen Patti 2020",["Player A","Player B"],35],["poker20","Poker 2020",["Player A","Player B"],35],
["dt20","Dragon Tiger",["Dragon","Tiger","Tie"],35],["baccarat","Baccarat",["Player","Banker","Tie"],35],
["aaa","Amar Akbar Anthony",["Amar","Akbar","Anthony"],25],["lucky7","Lucky 7",["Low 7","High 7"],25],
["32cards","32 Cards",["Player 8","Player 9","Player 10","Player 11"],25],["roulette","Roulette",["Red","Black","Green"],35],
["aviator","Aviator",["Demo flight"],25],["tp1d","Teen Patti One Day",["Player A","Player B"],35],
["pk1d","Poker One Day",["Player A","Player B"],35],["dtcf","Dragon Tiger Coin Flip",["Dragon","Tiger"],25],
["football","Football Studio",["Home","Away","Draw"],25],["muflis","Muflis Teen Patti",["Player A","Player B"],35],
["32ab","32 Cards A/B",["A","B"],25],["andar1","Andar Bahar 1",["Andar","Bahar"],25],
["andar2","Andar Bahar 2",["Andar","Bahar"],25],["bollywood","Bollywood Casino",["Don","Amar","Akbar","Anthony"],25],
["worli","Worli Matka",["Demo 1","Demo 2"],25],["lightning","Lightning Roulette",["Red","Black","Green"],35],
["crazytime","Crazy Time",["1","2","5","10"],25],["sicbo","Sic Bo",["Small","Big","Triple"],25],
["sevenup","Seven Up Down",["7 Up","7 Down","7"],25],["race20","Race 20",["Spade","Heart","Club","Diamond"],25]
].map(([id,name,options,durationSec])=>({id,name,options,durationSec}));

const rounds = new Map();
const sessions = new Map();
const activity = [];
const now = () => Date.now();
const roundFor = (game) => {
  const durationMs=game.durationSec*1000;
  const bucket=Math.floor(now()/durationMs);
  const roundId=game.id+"-"+bucket;
  if(!rounds.has(roundId)){
    const start=bucket*durationMs, end=start+durationMs;
    rounds.set(roundId,{roundId,gameId:game.id,gameName:game.name,startAt:start,lockAt:end-5000,endAt:end,outcome:game.options[Math.floor(Math.random()*game.options.length)],saved:false});
  }
  return rounds.get(roundId);
};
async function initDb(){
 if(!pool)return;
 await pool.query("CREATE SCHEMA IF NOT EXISTS training_app");
 await pool.query("CREATE TABLE IF NOT EXISTS training_app.training_sessions (session_id text primary key, display_points numeric not null default 10000, updated_at timestamptz default now())");
 await pool.query("CREATE TABLE IF NOT EXISTS training_app.training_activity (activity_id text primary key, session_id text not null, round_id text not null, game_name text not null, observed_outcome text not null, created_at timestamptz default now())");
}
async function saveSession(s){
 if(pool)await pool.query("INSERT INTO training_app.training_sessions(session_id,display_points) VALUES($1,$2) ON CONFLICT(session_id) DO UPDATE SET display_points=EXCLUDED.display_points,updated_at=now()",[s.sessionId,s.displayPoints]);
}
async function saveActivity(a){
 activity.unshift(a); activity.splice(1000);
 if(pool)await pool.query("INSERT INTO training_app.training_activity(activity_id,session_id,round_id,game_name,observed_outcome) VALUES($1,$2,$3,$4,$5) ON CONFLICT(activity_id) DO NOTHING",[a.activityId,a.sessionId,a.roundId,a.gameName,a.observedOutcome]);
}
async function historyFor(sessionId){
 if(pool){const q=await pool.query("SELECT activity_id as \"activityId\",session_id as \"sessionId\",round_id as \"roundId\",game_name as \"gameName\",observed_outcome as \"observedOutcome\",created_at as \"createdAt\" FROM training_app.training_activity WHERE session_id=$1 ORDER BY created_at DESC LIMIT 100",[sessionId]);return q.rows;}
 return activity.filter(a=>a.sessionId===sessionId).slice(0,100);
}
app.get("/api/health",(req,res)=>res.json({status:"ok",mode:"non-wagering-training"}));
app.post("/api/session",async(req,res)=>{
 try{const sessionId=crypto.randomUUID();const s={sessionId,displayPoints:10000};sessions.set(sessionId,s);await saveSession(s);res.json(s);}
 catch(e){res.status(500).json({error:"Session creation failed"});}
});
app.post("/api/session/:id/refill",async(req,res)=>{
 try{let s=sessions.get(req.params.id);if(!s&&pool){const q=await pool.query("SELECT session_id,display_points FROM training_app.training_sessions WHERE session_id=$1",[req.params.id]);if(q.rows[0])s={sessionId:q.rows[0].session_id,displayPoints:Number(q.rows[0].display_points)};}
 if(!s)return res.status(404).json({error:"Session not found"});s.displayPoints=10000;sessions.set(s.sessionId,s);await saveSession(s);res.json(s);}
 catch(e){res.status(500).json({error:"Refill failed"});}
});
app.get("/api/games",(req,res)=>res.json(games));
app.get("/api/rounds/active",async(req,res)=>{
 const game=games.find(g=>g.id===req.query.gameId);if(!game)return res.status(400).json({error:"Valid gameId required"});
 const r=roundFor(game);const t=now();const phase=t<r.lockAt?"OPEN":t<r.endAt?"LOCKED":"COMPLETED";
 if(phase==="COMPLETED"&&!r.saved){
  r.saved=true;
  const sid=String(req.query.sessionId||"guest");
  await saveActivity({activityId:r.roundId+"-"+sid,sessionId:sid,roundId:r.roundId,gameName:r.gameName,observedOutcome:r.outcome,createdAt:new Date().toISOString()});
 }
 res.json({roundId:r.roundId,gameId:r.gameId,gameName:r.gameName,phase,secondsRemaining:Math.max(0,Math.ceil(( (phase==="OPEN"?r.lockAt:phase==="LOCKED"?r.endAt:r.endAt)-t)/1000)),lockAt:r.lockAt,endAt:r.endAt,outcome:phase==="COMPLETED"?r.outcome:null});
});
app.get("/api/history",async(req,res)=>{
 const sessionId=String(req.query.sessionId||"");
 if(!sessionId)return res.status(400).json({error:"sessionId required"});
 try{let s=sessions.get(sessionId);if(!s&&pool){const q=await pool.query("SELECT session_id,display_points FROM training_app.training_sessions WHERE session_id=$1",[sessionId]);if(q.rows[0])s={sessionId:q.rows[0].session_id,displayPoints:Number(q.rows[0].display_points)};}
 res.json({session:s||null,history:await historyFor(sessionId)});}
 catch(e){res.status(500).json({error:"History unavailable"});}
});
const PORT=process.env.PORT||3000;
initDb().then(()=>app.listen(PORT,"0.0.0.0",()=>console.log("Training simulator listening on "+PORT))).catch(e=>{console.error("Database setup failed");process.exit(1);});
