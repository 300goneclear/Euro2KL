
// Data bases: project path first
const DATA_BASES = ['/Euro2KL/assets/data','assets/data','/assets/data'];
const QS = new URLSearchParams(location.search);
const GAMES_FILE = QS.get('games') || 'games.json';
const PLAYERS_FILE = QS.get('players') || 'players.json';
const TEAM_STATS_FILE = QS.get('teamstats') || 'team_stats.json';
const TEAMS_FILE = QS.get('teams') || 'teams.json';

async function tryFetchJSON(bases, file){
  const errs=[];
  for(const base of bases){
    const url = `${base.replace(/\/$/,'')}/${file.replace(/^\//,'')}`;
    try{
      const r = await fetch(url,{cache:'no-store'});
      if(r.ok) return r.json();
      errs.push(`${url} → ${r.status}`);
    }catch(e){ errs.push(`${url} → ${e.message}`); }
  }
  const error = new Error('All paths failed for '+file); error._e2kErrors=errs; throw error;
}

const by=k=>(a,b)=>(b[k]??0)-(a[k]??0);
const round=(x,d=1)=>Number.parseFloat(x??0).toFixed(d);
const nameFrom=p=> (p.first_name&&p.last_name)?`${p.first_name} ${p.last_name}` :
                    (p.firstName&&p.lastName)?`${p.firstName} ${p.lastName}` :
                    p.name||p.playerName||p.fullName||p.id||'—';

function renderLeaders(el,title,rows){ const card=document.createElement('div'); card.className='card';
  card.innerHTML=`<h3>${title}</h3><table class="table"><tbody></tbody></table>`; const tb=card.querySelector('tbody');
  rows.forEach((r,i)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td class="rank">${i+1}.</td><td>${r.name}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${r.val}</td>`; tb.appendChild(tr); });
  el.appendChild(card);
}
function showEmpty(where,msg,details){ const div=document.createElement('div'); div.className='empty'; div.innerHTML=`<strong>${msg}</strong>${details?`<div class="kicker">${details}</div>`:''}`; where.appendChild(div); }

// Parse date-ish fields from a game object for sorting
function parseGameTime(g){
  const d = g.date || g.gameDate || g.start_time || g.startTime || g.timestamp || g.ts;
  if(!d) return 0;
  const t = Date.parse(d);
  return Number.isNaN(t) ? 0 : t;
}

// Try to extract an array of player statlines from a game object
function extractPlayersFromGame(g){
  let piles = [];
  // common places
  if(Array.isArray(g.players)) piles.push(g.players);
  if(Array.isArray(g.activePlayers)) piles.push(g.activePlayers);
  if(g.home && Array.isArray(g.home.players)) piles.push(g.home.players);
  if(g.away && Array.isArray(g.away.players)) piles.push(g.away.players);
  if(g.boxscore && Array.isArray(g.boxscore.players)) piles.push(g.boxscore.players);
  if(Array.isArray(g.boxscore)) piles.push(g.boxscore);
  if(Array.isArray(g.stats)) piles.push(g.stats);
  if(Array.isArray(g.statlines)) piles.push(g.statlines);
  // flatten
  let arr = piles.flat();
  // map to normalized fields
  return arr.map(p=>{
    const pts = p.points ?? p.pts ?? p.PTS ?? 0;
    const reb = p.rebounds ?? p.reb ?? p.totReb ?? p.REB ?? 0;
    const ast = p.assists ?? p.ast ?? p.AST ?? 0;
    const stl = p.steals ?? p.stl ?? p.STL ?? 0;
    const blk = p.blocks ?? p.blk ?? p.BLK ?? 0;
    const fgm = p.fgm ?? p.fieldGoalsMade ?? p.FGM;
    const fga = p.fga ?? p.fieldGoalsAttempted ?? p.FGA;
    const tpm = p.tpm ?? p.threePointersMade ?? p['3pm'] ?? p['3PM'];
    const tpa = p.tpa ?? p.threePointersAttempted ?? p['3pa'] ?? p['3PA'];
    const ftm = p.ftm ?? p.freeThrowsMade ?? p.FTM;
    const fta = p.fta ?? p.freeThrowsAttempted ?? p.FTA;
    const fg_pct = p.fg_pct ?? p.fgPct ?? (fgm!=null&&fga? fgm/fga : null);
    const tp_pct = p.tp_pct ?? p.tpPct ?? (tpm!=null&&tpa? tpm/tpa : null);
    const ft_pct = p.ft_pct ?? p.ftPct ?? (ftm!=null&&fta? ftm/fta : null);
    return { ...p, name: nameFrom(p), pts, reb, ast, stl, blk, fg_pct, tp_pct, ft_pct, tpm: tpm ?? 0 };
  });
}

async function buildGameLeaders(){
  const host = document.querySelector('#player-leaders');
  try{
    const raw = await tryFetchJSON(DATA_BASES, GAMES_FILE);
    const games = Array.isArray(raw) ? raw : (raw.games || raw.schedule || raw.data || []);
    if(!games.length){ showEmpty(host, 'No games found in games.json.', 'Expected array at root or under "games".'); return; }
    // Pick newest (by date), prefer status Final/Completed
    const sorted = [...games].sort((a,b)=> parseGameTime(b) - parseGameTime(a));
    let game = sorted.find(g=> /final|complete|completed|ended/i.test((g.status||'')+'')) || sorted[0];
    const players = extractPlayersFromGame(game);
    if(!players.length){ showEmpty(host, 'Found latest game but no player lines.', 'Looking for players under players, home.players, away.players, boxscore, stats, statlines.'); return; }
    document.querySelector('#leaders-title').textContent = 'Game Leaders — ' + (game.date || game.gameDate || '');
    const cats=[
      ['POINTS','pts',0],['REBOUNDS','reb',0],['ASSISTS','ast',0],['STEALS','stl',0],['BLOCKS','blk',0],
      ['FIELD GOAL %','fg_pct',1, v=> round(100*(v||0),1)+'%'],['3-PT MADE','tpm',0],['3-PT %','tp_pct',1, v=> round(100*(v||0),1)+'%'],['FREE THROW %','ft_pct',1, v=> round(100*(v||0),1)+'%']
    ];
    for(const [label,key,d,fmt] of cats){
      const top=[...players].sort(by(key)).slice(0,5).map(p=>({name:p.name,val:fmt?fmt(p[key]):round(p[key],d)}));
      renderLeaders(host,label,top);
    }
  }catch(err){
    showEmpty(host, 'Couldn’t load games.json.', (err._e2kErrors||[]).join('<br>'));
  }
}

async function buildSeasonFallback(){
  const host = document.querySelector('#season-leaders');
  try{
    const players = await tryFetchJSON(DATA_BASES, PLAYERS_FILE);
    players.forEach(p=>{ if(p.tpm==null && p.tp_pct!=null && p.ppg!=null) p.tpm=Math.max(0,(p.ppg*(p.tp_pct||0))/3); });
    const cats=[
      ['POINTS PER GAME','ppg',1],['REBOUNDS PER GAME','rpg',1],['ASSISTS PER GAME','apg',1],
      ['STEALS PER GAME','spg',1],['BLOCKS PER GAME','bpg',1],
      ['FIELD GOAL %','fg_pct',3, v=> round(100*v,1)+'%'],
      ['3-PT MADE','tpm',1],['3-PT %','tp_pct',3, v=> round(100*v,1)+'%'],
      ['FREE THROW %','ft_pct',3, v=> round(100*v,1)+'%']
    ];
    for(const [label,key,d,fmt] of cats){
      const top=[...players].sort(by(key)).slice(0,5).map(p=>({name:nameFrom(p),val:fmt?fmt(p[key]):round(p[key],d)}));
      renderLeaders(host,label,top);
    }
  }catch(err){
    showEmpty(host,'Fallback players.json missing.', (err._e2kErrors||[]).join('<br>'));
  }
}

async function buildTeamLeaders(){
  const wrap=document.querySelector('#team-leaders');
  try{
    let teamsStats=null, players=null, teams=null;
    try{teamsStats=await tryFetchJSON(DATA_BASES,TEAM_STATS_FILE);}catch(e){}
    try{players=await tryFetchJSON(DATA_BASES,PLAYERS_FILE);}catch(e){}
    try{teams=await tryFetchJSON(DATA_BASES,TEAMS_FILE);}catch(e){}
    const tname=id=>Array.isArray(teams)?((teams.find(t=>(t.id||t.abbr)===id||t.abbr===id)||{}).name||id):id;
    let byTeam={};
    if(Array.isArray(teamsStats)&&teamsStats.length&&(teamsStats[0].ppg!=null)){
      teamsStats.forEach(t=>{const id=t.team_id||t.id||t.abbr; byTeam[id]={ppg:t.ppg,rpg:t.rpg,apg:t.apg,spg:t.spg,bpg:t.bpg,fg_pct:t.fg_pct,tp_pct:t.tp_pct,ft_pct:t.ft_pct};});
    }else if(Array.isArray(players)){
      players.forEach(p=>{const id=p.team_id||p.teamId; if(!id) return; if(!byTeam[id]) byTeam[id]={ppg:0,rpg:0,apg:0,spg:0,bpg:0,fg_pct:[],tp_pct:[],ft_pct:[]};
        byTeam[id].ppg+=p.ppg??0; byTeam[id].rpg+=p.rpg??0; byTeam[id].apg+=p.apg??0; byTeam[id].spg+=p.spg??0; byTeam[id].bpg+=p.bpg??0;
        if(p.fg_pct!=null) byTeam[id].fg_pct.push(p.fg_pct); if(p.tp_pct!=null) byTeam[id].tp_pct.push(p.tp_pct); if(p.ft_pct!=null) byTeam[id].ft_pct.push(p.ft_pct);
      });
      for(const id of Object.keys(byTeam)){ const t=byTeam[id];
        t.fg_pct=t.fg_pct.length?t.fg_pct.reduce((a,b)=>a+b,0)/t.fg_pct.length:0;
        t.tp_pct=t.tp_pct.length?t.tp_pct.reduce((a,b)=>a+b,0)/t.tp_pct.length:0;
        t.ft_pct=t.ft_pct.length?t.ft_pct.reduce((a,b)=>a+b,0)/t.ft_pct.length:0;
      }
    }
    const arr=Object.entries(byTeam).map(([id,s])=>({name:tname(id),...s}));
    const cats=[['POINTS PER GAME','ppg',1],['REBOUNDS PER GAME','rpg',1],['ASSISTS PER GAME','apg',1],['STEALS PER GAME','spg',1],['BLOCKS PER GAME','bpg',1],['FIELD GOAL %','fg_pct',3,v=>round(100*v,1)+'%'],['3-PT %','tp_pct',3,v=>round(100*v,1)+'%'],['FT %','ft_pct',3,v=>round(100*v,1)+'%']];
    for(const [label,key,d,fmt] of cats){ const top=[...arr].sort(by(key)).slice(0,5).map(t=>({name:t.name,val:fmt?fmt(t[key]):round(t[key],d)})); renderLeaders(wrap,label,top); }
  }catch(err){ showEmpty(wrap,'Team leaders need team_stats.json or players.json.', (err._e2kErrors||[]).join('<br>')); }
}

window.addEventListener('DOMContentLoaded', async ()=>{
  await buildGameLeaders();
  await buildSeasonFallback();
  if(document.querySelector('#team-leaders')) await buildTeamLeaders();
});
