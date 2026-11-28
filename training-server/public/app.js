let sid=localStorage.getItem("gb9_sid")||"",role="USER",gid="teen-patti-2020",chip=100,round=null,games=[],filter="",cat="ALL",admOpen=location.pathname==="/admin",lastStageKey="";
const $=id=>document.getElementById(id)||{style:{},dataset:{},classList:{add:()=>{},remove:()=>{}}},setBal=v=>{$("bal").textContent=Number(v||0).toLocaleString()+" VC";};
const slotOrder=["A1","B1","A2","B2","A3","B3"];

function cardHtml(c,label){
  if(!c)return '<div class="pcard back" style="transition:all 420ms ease"><span class="slotLbl">'+(label||"")+'</span></div>';
  return '<div class="pcard '+(c.red?"red":"")+'" style="transition:all 420ms ease"><span>'+c.rank+'</span><span style="align-self:flex-end">'+c.suit+'</span></div>';
}

function renderStage(g,r,recent){
  const box=$("visualRow"),hint=$("stageHint"),vh=r.visibleHand||{},step=r.dealStep||0;
  const stageKey=[r.roundId,r.status,step,r.winningOption||""].join("|");
  if(stageKey===lastStageKey)return;
  lastStageKey=stageKey;
  if(r.status==="OPEN"){hint.textContent=r.secondsRemaining>5?"Betting OPEN (30s window • 35s cycle)":"HARD LOCK (NO MORE BETS)";box.innerHTML=slotOrder.map(k=>cardHtml(null,k)).join("");return;}
  if(r.status==="LOCKED"){hint.textContent="HARD LOCK — Dealing starts after 35s ("+r.secondsRemaining+"s)";box.innerHTML=slotOrder.map(k=>cardHtml(null,k)).join("");return;}
  if(g.mode==="POKER_ONEDAY"){
    const stg=step===1?"A1 + A2":step===2?"B1 + B2":step===3?"Flop (3 cards)":"River / Final";
    hint.textContent=(r.status==="SETTLED"?"SETTLED — Winner: "+r.winningOption:"Stage "+step+"/4: "+stg);
    const a=(vh.pA||[]).map(c=>cardHtml(c,"A")),b=(vh.pB||[]).map(c=>cardHtml(c,"B")),cm=(vh.comm||[]).map(c=>cardHtml(c,"C"));
    box.innerHTML='<div class="handGrp">'+a.join("")+'</div><div class="handGrp">'+b.join("")+'</div><div class="handGrp">'+cm.join("")+'</div>'+(r.status==="SETTLED"?'<div class="winBanner">Winner: '+r.winningOption+'</div>':"");
    return;
  }
  const curSlot=slotOrder[Math.max(0,Math.min(5,step-1))];
  hint.textContent=r.status==="SETTLED"?"SETTLED — Winner: "+(r.winningOption||(recent[0]&&recent[0].winningOption)||"--"):"Dealing "+curSlot+" (2.5s cadence)...";
  box.innerHTML=slotOrder.map(k=>cardHtml(vh[k],k)).join("")+(r.status==="SETTLED"?'<div class="winBanner">Winner: '+r.winningOption+'</div>':"");
}
  el.querySelectorAll(".bead").forEach(b=>b.onclick=()=>showRoundDetail((list||[])[Number(b.dataset.idx)]));

async function poll(){
  const d=await (await fetch("/api/rounds/active?gameId="+encodeURIComponent(gid))).json();round=d.round;
  $("gname").textContent=d.game.name;$("payoutTag").textContent="Payout "+d.game.payout+"x • HP "+d.game.houseProfitPct+"%";$("rid").textContent=round.roundId;
  $("phase").textContent=round.status+(round.fancyLocked?" • FANCY LOCK":"");$("timer").textContent=(round.secondsRemaining||0)+"s";
  $("pfill").style.width=(round.status==="OPEN"?Math.max(0,Math.min(100,Math.round(((round.secondsRemaining||0)/35)*100))):0)+"%";
  renderStage(d.game,round,d.recentResults||[]);renderRecent(d.recentResults||[],d.game);
}
function renderOpts(g,r){
  const o=$("opts");o.innerHTML="";
  const mainLocked=r.status!=="OPEN"||(r.secondsRemaining||0)<=5;
  (g.options||[]).forEach(op=>{const b=document.createElement("button");b.className="optBtn";b.textContent=op+" • "+chip.toLocaleString()+" VC";b.disabled=mainLocked;b.onclick=()=>bet(op,false);o.appendChild(b);});
  (g.fancyOptions||[]).forEach(fo=>{const b=document.createElement("button");b.className="optBtn fancyBtn";b.textContent="[Fancy] "+fo.trim()+" • "+chip.toLocaleString()+" VC";b.disabled=mainLocked||Boolean(r.fancyLocked);b.onclick=()=>bet(fo.trim(),true);o.appendChild(b);});
}
async function bet(selection,isFancy){
  const r=await fetch("/api/rounds/"+encodeURIComponent(round.roundId)+"/entries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gameId:gid,selection,amount:chip,isFancy,accountId:sid||"player01"})});
  const d=await r.json();if(!r.ok){$("msg").textContent=d.detail||d.error||"Bet rejected";return;}
  setBal(d.balance);$("msg").textContent="Accepted "+chip.toLocaleString()+" VC on "+selection;hist();
}
async function hist(){
  const r=await fetch("/api/history?accountId="+encodeURIComponent(sid||"player01"));if(!r.ok)return;const d=await r.json();setBal(d.balance);
  $("hist").innerHTML=(d.history||[]).map(h=>'<div class="row"><div><b>'+h.roundId+'</b> • '+h.gameName+' • '+h.selection+' ('+Number(h.amount).toLocaleString()+' VC)</div><div class="'+(h.result==="WON"?"won":(h.result==="LOST"?"lost":"pend"))+'">'+h.result+(Number(h.payout)?' +'+Number(h.payout).toLocaleString()+' VC':'')+'</div></div>').join("")||"No entries yet.";
}
async function boot(){
  games=(await (await fetch("/api/games")).json()).games||[];
  const el=$("games");el.innerHTML="";
  games.forEach(g=>{const b=document.createElement("button");b.className="gbtn"+(g.id===gid?" active":"");b.innerHTML='<span class="gn">'+g.name+'</span><span class="gp">'+g.payout+'x • HP '+g.houseProfitPct+'%</span>';b.onclick=()=>{gid=g.id;lastStageKey="";boot();poll();};el.appendChild(b);});
  poll();hist();setInterval(poll,500);setInterval(hist,2000);
}
boot();
