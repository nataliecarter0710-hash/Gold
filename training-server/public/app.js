let sid=localStorage.getItem("gb9_sid")||"",role="USER",gid="teen-patti-2020",chip=100,round=null,games=[],filter="",cat="ALL",admOpen=location.pathname==="/admin";
const $=id=>document.getElementById(id)||{style:{},dataset:{},classList:{add:()=>{},remove:()=>{}}},setBal=v=>$("bal").textContent=Number(v).toLocaleString()+" VC";
const suits=[{s:"♠",r:false},{s:"♥",r:true},{s:"♣",r:false},{s:"♦",r:true}],ranks=["A","K","Q","J","10","9","8","7"];
const hashNum=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h;};

function renderStage(g,r,recent){
  const box=$("visualRow"),hint=$("stageHint"),isDice=g.cat==="Dice";
  if(r.status==="OPEN"){hint.textContent="Betting OPEN (25s cycle)";box.innerHTML=isDice?'<div class="die">?</div><div class="die">?</div>':'<div class="pcard back"></div><div class="pcard back"></div><div class="pcard back"></div>';return;}
  const latest=(recent&&recent[0]&&recent[0].winningOption)||g.options[0],h=hashNum(r.roundId),step=r.dealStep||1;
  hint.textContent=r.status==="LOCKED"?"Sequential Deal Step "+step+"/3...":"Round SETTLED";
  if(isDice){const d1=(h%6)+1,d2=((h>>3)%6)+1;box.innerHTML='<div class="die">'+d1+'</div>'+(step>=2?'<div class="die">'+d2+'</div>':'<div class="die">?</div>')+(r.status==="SETTLED"?'<div class="winBanner">Winner: '+latest+'</div>':"");}
  else{const c1=suits[h%4],c2=suits[(h>>2)%4],r1=ranks[h%8],r2=ranks[(h>>4)%8];box.innerHTML='<div class="pcard '+(c1.r?"red":"")+'"><span>'+r1+'</span><span style="align-self:flex-end">'+c1.s+'</span></div>'+(step>=2?'<div class="pcard '+(c2.r?"red":"")+'"><span>'+r2+'</span><span style="align-self:flex-end">'+c2.s+'</span></div>':'<div class="pcard back"></div>')+(r.status==="SETTLED"?'<div class="winBanner">Winner: '+latest+'</div>':"");}
}

async function initSession(){
  const r=await fetch("/api/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:sid})});
  const d=await r.json();if(!r.ok){$("msg").textContent=d.detail||d.error;return;}
  sid=d.sessionId;role=d.role||"USER";localStorage.setItem("gb9_sid",sid);
  $("sid").textContent=sid;$("roleLbl").textContent=role;setBal(d.balance);hist();
}
function renderGames(){
  const el=$("games");el.innerHTML="";
  games.filter(g=>(cat==="ALL"||g.cat===cat)&&g.name.toLowerCase().includes(filter)).forEach(g=>{
    const b=document.createElement("button");b.className="gbtn"+(g.id===gid?" active":"");
    b.innerHTML='<span class="gn">'+g.name+'</span><span class="gp">'+g.payout+'x • HP '+g.houseProfitPct+'%</span>';
    b.onclick=()=>{gid=g.id;$("msg").textContent="";renderGames();poll();if(admOpen)loadAdmin();};el.appendChild(b);
  });
}

async function poll(){
  const d=await (await fetch("/api/rounds/active?gameId="+encodeURIComponent(gid))).json();round=d.round;
  $("gname").textContent=d.game.name;$("payoutTag").textContent="Payout "+d.game.payout+"x • HP "+d.game.houseProfitPct+"%";$("rid").textContent=round.roundId;
  const ph=$("phase");ph.textContent=round.status;ph.style.background=round.status==="OPEN"?"#065f46":"#7f1d1d";ph.style.color=round.status==="OPEN"?"#6ee7b7":"#fca5a5";
  $("timer").textContent=round.secondsRemaining+"s";$("pfill").style.width=(round.status==="OPEN"?Math.max(0,Math.min(100,Math.round((round.secondsRemaining/25)*100))):0)+"%";
  renderStage(d.game,round,d.recentResults);
  const fs=$("forceSel");if(fs&&fs.dataset.gid!==d.game.id){fs.dataset.gid=d.game.id;fs.innerHTML='<option value="">Auto</option>'+d.game.options.map(op=>'<option value="'+op+'">'+op+'</option>').join("");}
  const o=$("opts");o.innerHTML="";const canBet=round.status==="OPEN"&&round.secondsRemaining>1;
  d.game.options.forEach(op=>{const b=document.createElement("button");b.className="optBtn";b.textContent=op+" • "+chip.toLocaleString()+" VC";b.disabled=!canBet;b.onclick=()=>bet(op);o.appendChild(b);});
  $("recent").innerHTML='<span style="font-size:11px;color:#94a3b8">Recent:</span> '+((d.recentResults||[]).map(x=>'<span class="bead">'+x.winningOption+'</span>').join("")||"--");
}

async function bet(selection){
  if(!sid)await initSession();
  const r=await fetch("/api/rounds/"+encodeURIComponent(round.roundId)+"/entries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:sid,gameId:gid,selection,amount:chip,idempotencyKey:round.roundId+"-"+selection+"-"+Date.now()})});
  const d=await r.json();if(!r.ok){$("msg").textContent=d.detail||d.error;return;}
  setBal(d.balance);$("msg").textContent="Accepted: "+chip.toLocaleString()+" VC on "+selection;hist();if(admOpen)loadAdmin();
}

async function hist(){
  if(!sid)return;const r=await fetch("/api/history?sessionId="+encodeURIComponent(sid));if(!r.ok)return;const d=await r.json();setBal(d.balance);
  $("hist").innerHTML=(d.history||[]).map(h=>'<div class="row"><div><b>'+h.gameName+'</b> • '+h.selection+' ('+Number(h.amount).toLocaleString()+' VC)'+(h.winningOption?' → <b>'+h.winningOption+'</b>':'')+'</div><div class="'+(h.result==="WON"?"won":(h.result==="LOST"?"lost":"pend"))+'">'+h.result+(Number(h.payout)?' +'+Number(h.payout).toLocaleString()+' VC':'')+'</div></div>').join("")||"No entries yet.";
  $("stmt").innerHTML=(d.statements||[]).map(s=>'<div class="row"><div><b>'+s.entry_type+'</b><div style="color:#94a3b8">'+s.description+'</div></div><div style="text-align:right"><b>'+(Number(s.debit)?'-'+Number(s.debit).toLocaleString():'')+(Number(s.credit)?'+'+Number(s.credit).toLocaleString():'')+' VC</b><div style="color:#94a3b8">Bal: '+Number(s.balance_after).toLocaleString()+'</div></div></div>').join("")||"No ledger entries.";
}

async function loadAdmin(){
  const actor=role==="USER"?"superadmin":sid;
  const [st,dl]=await Promise.all([fetch("/api/admin/state?gameId="+encodeURIComponent(gid)).then(x=>x.json()),fetch("/api/admin/downline?actorId="+encodeURIComponent(actor)).then(x=>x.json())]);
  $("admSummary").textContent="Vol: "+st.stats.totalVolume+" • Paid: "+st.stats.totalPayout+" • Net: "+st.stats.netHouseProfit;
  $("gPct").value=st.globalHouseProfitPct;$("mPct").value=typeof st.perGamePct[gid]==="number"?st.perGamePct[gid]:"";$("forceSel").value=st.forcedNextWinner[gid]||"";
  $("expBox").innerHTML="Exposure ("+gid+"): "+Object.entries(st.activeRoundExposure||{}).map(([k,v])=>k+": <b>"+v+" VC</b>").join(" • ")+" (HP: <b>"+st.effectiveGamePct+"%</b>)";
  $("downList").innerHTML=(dl.accounts||[]).map(a=>'<div class="row"><div><b>'+a.id+'</b> ('+a.role+') • Bal: <b>'+Number(a.balance).toLocaleString()+' VC</b> • '+(a.active?"ACTIVE":"INACTIVE")+'</div><div style="display:flex;gap:5px"><button class="miniBtn" onclick="xfer(\''+a.id+'\',\'DEPOSIT\')">+1k</button><button class="warnBtn" onclick="xfer(\''+a.id+'\',\'WITHDRAW\')">-1k</button><button class="btnRef" onclick="togAct(\''+a.id+'\','+(!a.active)+')">'+(a.active?"Block":"Enable")+'</button></div></div>').join("");
}

async function xfer(targetId,direction){await fetch("/api/admin/downline/transfer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({actorId:role==="USER"?"superadmin":sid,targetId,direction,amount:1000})});loadAdmin();initSession();}
async function togAct(targetId,active){await fetch("/api/admin/downline/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({actorId:role==="USER"?"superadmin":sid,targetId,active})});loadAdmin();}
async function adminPost(url,body){const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({actorId:sid,...body})});const d=await r.json();if(!r.ok){$("msg").textContent=d.error;return;}games=(await (await fetch("/api/games")).json()).games||[];renderGames();poll();loadAdmin();}
async function doLogin(payload){const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok){$("msg").textContent=d.error;return;}sid=d.account.id;role=d.account.role;localStorage.setItem("gb9_sid",sid);$("sid").textContent=sid+(d.account.demo?" (DEMO)":"");$("roleLbl").textContent=role;setBal(d.account.balance);hist();if(admOpen)loadAdmin();}

$("btnLogin").onclick=()=>{const v=$("acctSel").value;if(!v){sid="";localStorage.removeItem("gb9_sid");initSession();}else doLogin({accountId:v});};
$("btnDemo5m").onclick=()=>doLogin({mode:"PLAYER_DEMO_5M"});
$("btnDemoRo").onclick=()=>{admOpen=true;$("admPanel").style.display="block";doLogin({mode:"MGMT_DEMO_RO"});};
$("togAdm").onclick=()=>{admOpen=!admOpen;$("admPanel").style.display=admOpen?"block":"none";if(admOpen)loadAdmin();};
$("goAdminUrl").onclick=()=>location.href="/admin";
$("saveGPct").onclick=()=>adminPost("/api/admin/config",{globalHouseProfitPct:Number($("gPct").value)});
$("saveMPct").onclick=()=>adminPost("/api/admin/config",{gameId:gid,gameHouseProfitPct:Number($("mPct").value)});
$("clrMPct").onclick=()=>adminPost("/api/admin/config",{gameId:gid,clearGameOverride:true});
$("saveForce").onclick=()=>adminPost("/api/admin/config",{gameId:gid,forcedWinner:$("forceSel").value});
$("actLock").onclick=()=>adminPost("/api/admin/round-action",{gameId:gid,action:"lock"});
$("actSettle").onclick=()=>adminPost("/api/admin/round-action",{gameId:gid,action:"settle"});
$("actReset").onclick=()=>adminPost("/api/admin/round-action",{gameId:gid,action:"reset-round"});
$("btnCreate").onclick=()=>adminPost("/api/admin/downline/create",{newId:$("newId").value,role:$("newRole").value,initialBalance:Number($("newBal").value)});
document.querySelectorAll(".cbtn").forEach(b=>b.onclick=()=>{document.querySelectorAll(".cbtn").forEach(x=>x.classList.remove("active"));b.classList.add("active");cat=b.dataset.c;renderGames();});
$("q").oninput=e=>{filter=e.target.value.trim().toLowerCase();renderGames();};
$("tBets").onclick=()=>{$("tBets").classList.add("active");$("tStmt").classList.remove("active");$("hist").style.display="block";$("stmt").style.display="none";};
$("tStmt").onclick=()=>{$("tStmt").classList.add("active");$("tBets").classList.remove("active");$("hist").style.display="none";$("stmt").style.display="block";};
document.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");chip=Number(b.dataset.c.replace(/,/g,""));poll();});
$("refill").onclick=async()=>{const d=await (await fetch("/api/session/"+encodeURIComponent(sid)+"/refill",{method:"POST"})).json();setBal(d.balance);hist();};

(async()=>{
  $("portalBadge").textContent=location.pathname==="/admin"?"ADMIN PORTAL":"LIVE STUDIO";
  $("admPanel").style.display=admOpen?"block":"none";
  games=(await (await fetch("/api/games")).json()).games||[];renderGames();poll();
  setInterval(poll,1000);setInterval(hist,2000);setInterval(()=>{if(admOpen)loadAdmin();},2000);
  await initSession();if(admOpen)loadAdmin();
})();
