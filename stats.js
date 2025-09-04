
// Primary data location for your site
const DATA_BASES = ['/Euro2KL/assets/data','assets/data','/assets/data'];
const QS = new URLSearchParams(location.search);
const BOX_FILE = QS.get('box') || 'boxscore.json';
const GAMES_FILE = QS.get('games') || 'games.json';
const PLAYERS_FILE = QS.get('players') || 'players.json';
const TEAM_STATS_FILE = QS.get('teamstats') || 'team_stats.json';

async function tryFetchJSON(bases,file){
  const errs=[];
  for(const base of bases){
    const url=`${base.replace(/\/$/,'')}/${file.replace(/^\//,'')}`;
    try{ const r=await fetch(url,{cache:'no-store'}); if(r.ok) return r.json(); errs.push(`${url} → ${r.status}`);}catch(e){ errs.push(`${url} → ${e.message}`); }
  }
  const error = new Error('All paths failed for '+file); error._e2kErrors=errs; throw error;
}

const by=k=>(a,b)=>(b[k]??0)-(a[k]??0);
const round=(x,d=1)=>Number.parseFloat(x??0).toFixed(d);
const pctFmt=v=>round(100*(v||0),1)+'%';
const nameFrom=p=> (p.first_name&&p.last_name)?`${p.first_name} ${p.last_name}`:
                    (p.firstName&&p.lastName)?`${p.firstName} ${p.lastName}`:
                    p.name||p.playerName||p.fullName||p.gamertag||p.id||'—';

function renderLeaders(el,title,rows){
  const card=document.createElement('div'); card.className='card';
  card.innerHTML=`<h3>${title}</h3><table class="table"><tbody></tbody></table>`;
  const tb=card.querySelector('tbody');
  rows.forEach((r,i)=>{ const tr=document.createElement('tr');
    tr.innerHTML=`<td class="rank">${i+1}.</td><td>${r.name}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${r.val}</td>`;
    tb.appendChild(tr);
  });
  el.appendChild(card);
}
function showEmpty(where,msg,details){ const div=document.createElement('div'); div.className='empty'; div.innerHTML=`<strong>${msg}</strong>${details?`<div class="kicker">${details}</div>`:''}`; where.appendChild(div); }

// --- Scoreboard helpers ---
function val(v){ return Array.isArray(v)?v: (v!=null?v:0); }
function teamName(t){ return t?.name || t?.team || t?.abbr || t?.id || 'Team'; }
function getQuarters(t){
  // supports [q1,q2,q3,q4] under quarters or q1..q4 fields
  if(Array.isArray(t?.quarters)) return t.quarters;
  const q = [t?.q1, t?.q2, t?.q3, t?.q4].map(x=> Number(x||0));
  if(q.some(x=>x)) return q;
  return null;
}
function renderScoreboard(container, game){
  const home = game.home || game.host || game.team1 || game.alpha || {};
  const away = game.away || game.visitor || game.team2 || game.beta || {};
  const hq = getQuarters(home) || [null,null,null,null];
  const aq = getQuarters(away) || [null,null,null,null];
  const div = document.createElement('div'); div.className='scoreboard';
  div.innerHTML = `
    <div class="team left">
      <div class="name">${teamName(home)}</div>
      <div class="bigscore">${home.score ?? home.points ?? 0}</div>
    </div>
    <div class="quarters">
      ${['Q1','Q2','Q3','Q4'].map((lbl,i)=>`<div class="q"><span class="label">${lbl}</span><div>${hq[i]??'-'} : ${aq[i]??'-'}</div></div>`).join('')}
    </div>
    <div class="team right" style="justify-content:flex-end">
      <div class="bigscore">${away.score ?? away.points ?? 0}</div>
      <div class="name">${teamName(away)}</div>
    </div>`;
  container.appendChild(div);
}

// --- Player extraction (generic) ---
const STAT_KEYS = {
  pts:['pts','points','PTS'],
  reb:['reb','rebounds','totReb','REB'],
  ast:['ast','assists','AST'],
  stl:['stl','steals','STL'],
  blk:['blk','blocks','BLK'],
  fgm:['fgm','fieldGoalsMade','FGM'],
  fga:['fga','fieldGoalsAttempted','FGA'],
  tpm:['tpm','threePM','3pm','3PM'],
  tpa:['tpa','threePA','3pa','3PA'],
  ftm:['ftm','freeThrowsMade','FTM'],
  fta:['fta','freeThrowsAttempted','FTA'],
  fg_pct:['fg_pct','fgPct'],
  tp_pct:['tp_pct','tpPct','threePPct','3pPct'],
  ft_pct:['ft_pct','ftPct']
};
function readField(obj, list){ for(const k of list){ if(obj[k]!=null) return obj[k]; } return null; }
function isPlayerish(o){ if(typeof o!=='object'||Array.isArray(o)) return false; return Object.values(STAT_KEYS).flat().some(k=> o[k]!=null); }
function findPlayerArrays(root){
  const res=[]; (function walk(v,path){
    if(Array.isArray(v)){
      if(v.length && typeof v[0]==='object' && v.some(isPlayerish)) res.push({path,arr:v});
      v.forEach((it,i)=> walk(it, path+`[${i}]`));
    }else if(v && typeof v==='object'){
      for(const k of Object.keys(v)) walk(v[k], path?`${path}.${k}`:k);
    }
  })(root,'');
  return res;
}
function extractPlayersGeneric(game){
  const arrays = findPlayerArrays(game);
  let players = [];
  arrays.forEach(({path,arr})=>{
    const teamHint = /home|host|team1|alpha/i.test(path) ? 'HOME' : /away|visitor|team2|beta/i.test(path) ? 'AWAY' : null;
    arr.forEach(p=>{
      const pts = readField(p, STAT_KEYS.pts) ?? 0;
      const reb = readField(p, STAT_KEYS.reb) ?? 0;
      const ast = readField(p, STAT_KEYS.ast) ?? 0;
      const stl = readField(p, STAT_KEYS.stl) ?? 0;
      const blk = readField(p, STAT_KEYS.blk) ?? 0;
      const fgm = readField(p, STAT_KEYS.fgm);
      const fga = readField(p, STAT_KEYS.fga);
      const tpm = readField(p, STAT_KEYS.tpm);
      const tpa = readField(p, STAT_KEYS.tpa);
      const ftm = readField(p, STAT_KEYS.ftm);
      const fta = readField(p, STAT_KEYS.fta);
      const fg_pct = readField(p, STAT_KEYS.fg_pct); const tp_pct = readField(p, STAT_KEYS.tp_pct); const ft_pct = readField(p, STAT_KEYS.ft_pct);
      players.push({
        name: nameFrom(p),
        team: p.team || p.teamName || p.team_id || p.teamId || teamHint,
        pts, reb, ast, stl, blk,
        fg_pct: fg_pct != null ? fg_pct : (fgm!=null && fga ? fgm/fga : null),
        tp_pct: tp_pct != null ? tp_pct : (tpm!=null && tpa ? tpm/tpa : null),
        ft_pct: ft_pct != null ? ft_pct : (ftm!=null && fta ? ftm/fta : null),
        tpm: tpm ?? 0
      });
    });
  });
  return players;
}
function parseGameTime(g){
  const d = g.date || g.gameDate || g.start_time || g.startTime || g.timestamp || g.ts;
  const t = Date.parse(d || 0);
  return Number.isNaN(t) ? 0 : t;
}

async function loadBoxOrGames(){
  try{
    const box = await tryFetchJSON(DATA_BASES, BOX_FILE);
    const game = box.game || box; // either {game:{...}} or the game object directly
    return {gameFrom:'box', game};
  }catch(e){ /* fall back */ }
  const raw = await tryFetchJSON(DATA_BASES, GAMES_FILE);
  const games = Array.isArray(raw) ? raw : (raw.games || raw.schedule || raw.data || []);
  if(!games.length) throw new Error('No games found.');
  const sorted=[...games].sort((a,b)=> parseGameTime(b)-parseGameTime(a));
  let game= sorted.find(g=> /final|complete|completed|ended/i.test(String(g.status||''))) || sorted[0];
  return {gameFrom:'games', game};
}

// --- Page builders ---
async function buildPlayerLeaders(){
  const host=document.querySelector('#player-leaders');
  try{
    const {gameFrom, game} = await loadBoxOrGames();
    // scoreboard
    renderScoreboard(document.querySelector('#scoreboard'), game);
    // players
    const players = extractPlayersGeneric(game);
    if(!players.length){ showEmpty(host, 'Game loaded but no player lines found.', 'Add players under home.players / away.players or include stat arrays.'); return; }
    const cats=[
      ['POINTS','pts',0],['REBOUNDS','reb',0],['ASSISTS','ast',0],['STEALS','stl',0],['BLOCKS','blk',0],
      ['FIELD GOAL %','fg_pct',1,pctFmt],['3-PT MADE','tpm',0],['3-PT %','tp_pct',1,pctFmt],['FREE THROW %','ft_pct',1,pctFmt]
    ];
    for(const [label,key,d,fmt] of cats){
      const top=[...players].sort(by(key)).slice(0,5).map(p=>({name:p.name, val: fmt?fmt(p[key]):round(p[key],d)}));
      renderLeaders(host,label,top);
    }
  }catch(err){
    showEmpty(host,'Couldn’t load a game from boxscore.json or games.json.', (err._e2kErrors||[]).join('<br>'));
  }
}

async function buildTeamLeaders(){
  const wrap=document.querySelector('#team-leaders');
  // Use team_stats.json if provided
  try{
    const tstats = await tryFetchJSON(DATA_BASES, TEAM_STATS_FILE);
    if(Array.isArray(tstats)&&tstats.length){
      const cats=[['POINTS PER GAME','ppg',1],['REBOUNDS PER GAME','rpg',1],['ASSISTS PER GAME','apg',1],['STEALS PER GAME','spg',1],['BLOCKS PER GAME','bpg',1]];
      for(const [label,key,d] of cats){
        const top=[...tstats].sort(by(key)).slice(0,5).map(t=>({name:t.name||t.team||t.team_id||t.id||t.abbr, val: round(t[key],d)}));
        renderLeaders(wrap,label,top);
      }
      return;
    }
  }catch(e){ /* fall through */ }

  // Derive from all games: use team totals when available, else sum players, else at least use team scores for PPG
  try{
    const raw = await tryFetchJSON(DATA_BASES, GAMES_FILE);
    const games = Array.isArray(raw) ? raw : (raw.games || raw.schedule || raw.data || []);
    const teams = new Map(); // name -> totals
    function ensure(name){ if(!teams.has(name)) teams.set(name,{gp:0,pts:0,reb:0,ast:0,stl:0,blk:0}); return teams.get(name); }
    games.forEach(g=>{
      const home=g.home||g.host||g.team1||g.alpha; const away=g.away||g.visitor||g.team2||g.beta;
      if(home){ const t=ensure(home.name||home.team||home.abbr||home.id||'HOME'); t.gp++; t.pts += Number(home.score||home.points||0);
        const tt=home.totals||{}; t.reb+=Number(tt.reb||tt.rebounds||0); t.ast+=Number(tt.ast||tt.assists||0); t.stl+=Number(tt.stl||tt.steals||0); t.blk+=Number(tt.blk||tt.blocks||0);
      }
      if(away){ const t=ensure(away.name||away.team||away.abbr||away.id||'AWAY'); t.gp++; t.pts += Number(away.score||away.points||0);
        const tt=away.totals||{}; t.reb+=Number(tt.reb||tt.rebounds||0); t.ast+=Number(tt.ast||tt.assists||0); t.stl+=Number(tt.stl||tt.steals||0); t.blk+=Number(tt.blk||tt.blocks||0);
      }
      // if totals missing, try sum players
      const players = extractPlayersGeneric(g);
      const sum=(list,key)=> list.reduce((s,x)=> s + Number(x[key]||0), 0);
      if(players.length){
        const homeList = players.filter(p=>String(p.team).toUpperCase().includes('HOME'));
        const awayList = players.filter(p=>String(p.team).toUpperCase().includes('AWAY'));
        if(home && homeList.length){ const t=ensure(home.name||home.team||home.abbr||home.id||'HOME'); t.reb+=sum(homeList,'reb'); t.ast+=sum(homeList,'ast'); t.stl+=sum(homeList,'stl'); t.blk+=sum(homeList,'blk'); }
        if(away && awayList.length){ const t=ensure(away.name||away.team||away.abbr||away.id||'AWAY'); t.reb+=sum(awayList,'reb'); t.ast+=sum(awayList,'ast'); t.stl+=sum(awayList,'stl'); t.blk+=sum(awayList,'blk'); }
      }
    });
    const arr=[...teams.entries()].map(([name,t])=>({name, ppg:t.pts/(t.gp||1), rpg:t.reb/(t.gp||1), apg:t.ast/(t.gp||1), spg:t.stl/(t.gp||1), bpg:t.blk/(t.gp||1)}));
    if(!arr.length){ showEmpty(wrap,'Team leaders need games.json with teams or players.'); return; }
    const cats=[['POINTS PER GAME','ppg',1],['REBOUNDS PER GAME','rpg',1],['ASSISTS PER GAME','apg',1],['STEALS PER GAME','spg',1],['BLOCKS PER GAME','bpg',1]];
    for(const [label,key,d] of cats){
      const top=[...arr].sort(by(key)).slice(0,5).map(t=>({name:t.name, val: round(t[key],d)}));
      renderLeaders(wrap,label,top);
    }
  }catch(err){
    showEmpty(wrap,'Couldn’t derive team leaders from data.', (err._e2kErrors||[]).join('<br>'));
  }
}

window.addEventListener('DOMContentLoaded', async ()=>{
  if(document.querySelector('#player-leaders')) await buildPlayerLeaders();
  if(document.querySelector('#team-leaders')) await buildTeamLeaders();
});
