
// Data paths (project first)
const DATA_BASES = ['/Euro2KL/assets/data','assets/data','/assets/data'];
const QS = new URLSearchParams(location.search);
const BOX_FILE = QS.get('box') || 'boxscore.json';
const GAMES_FILE = QS.get('games') || 'games.json';
const PLAYERS_FILE = QS.get('players') || 'players.json';
const TEAM_STATS_FILE = QS.get('teamstats') || 'team_stats.json';

async function tryFetchJSON(bases,file){
  const errs=[];
  for(const base of bases){
    const url = `${base.replace(/\/$/,'')}/${file.replace(/^\//,'')}`;
    try{ const r = await fetch(url,{cache:'no-store'}); if(r.ok) return r.json(); errs.push(`${url} → ${r.status}`); }
    catch(e){ errs.push(`${url} → ${e.message}`); }
  }
  const error = new Error('All paths failed for '+file); error._e2kErrors=errs; throw error;
}

const by=k=>(a,b)=>(b[k]??0)-(a[k]??0);
const round=(x,d=1)=> Number.parseFloat(x ?? 0).toFixed(d);
const pctFmt=v=> round(100*(v||0),1) + '%';
const nameFrom=p=> (p.first_name&&p.last_name)?`${p.first_name} ${p.last_name}` :
                    (p.firstName&&p.lastName)?`${p.firstName} ${p.lastName}` :
                    p.name || p.playerName || p.fullName || p.gamertag || p.id || '—';

// --- generic player array finder ---
const STAT_KEYS = {
  pts:['pts','points','PTS'], reb:['reb','rebounds','totReb','REB'], ast:['ast','assists','AST'],
  stl:['stl','steals','STL'], blk:['blk','blocks','BLK'],
  fgm:['fgm','fieldGoalsMade','FGM'], fga:['fga','fieldGoalsAttempted','FGA'],
  tpm:['tpm','threePM','3pm','3PM'], tpa:['tpa','threePA','3pa','3PA'],
  ftm:['ftm','freeThrowsMade','FTM'], fta:['fta','freeThrowsAttempted','FTA'],
  fg_pct:['fg_pct','fgPct'], tp_pct:['tp_pct','tpPct','threePPct','3pPct'], ft_pct:['ft_pct','ftPct']
};
function readField(o,keys){ for(const k of keys){ if(o[k]!=null) return o[k]; } return null; }
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
function extractPlayersWithTeam(game){
  const arrays = findPlayerArrays(game);
  const players = [];
  arrays.forEach(({path,arr})=>{
    const teamHint = /home|host|team1|alpha/i.test(path) ? 'HOME' :
                     /away|visitor|team2|beta/i.test(path) ? 'AWAY' : null;
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
  const t = Date.parse(d || 0); return Number.isNaN(t) ? 0 : t;
}

async function loadGamePreferBox(){
  try{
    const box = await tryFetchJSON(DATA_BASES, BOX_FILE);
    const game = box.game || box;
    return {source:'box', game};
  }catch(e){ /* fall through */ }
  const raw = await tryFetchJSON(DATA_BASES, GAMES_FILE);
  const games = Array.isArray(raw) ? raw : (raw.games || raw.schedule || raw.data || []);
  if(!games.length) throw new Error('No games found.');
  const sorted=[...games].sort((a,b)=> parseGameTime(b)-parseGameTime(a));
  const game = sorted.find(g=> /final|complete|completed|ended/i.test(String(g.status||''))) || sorted[0];
  return {source:'games', game};
}

// ---- PAGE BUILDERS ----
function renderLeaders(container, title, rows){
  const card=document.createElement('div'); card.className='card';
  card.innerHTML=`<h3>${title}</h3><table class="table"><tbody></tbody></table>`;
  const tbody=card.querySelector('tbody');
  rows.forEach((r,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="rank">${i+1}.</td><td>${r.name}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${r.val}</td>`;
    tbody.appendChild(tr);
  });
  container.appendChild(card);
}
function showEmpty(where,msg,details){ const div=document.createElement('div'); div.className='empty'; div.innerHTML=`<strong>${msg}</strong>${details?`<div class="kicker">${details}</div>`:''}`; where.appendChild(div); }

async function buildPlayerLeaders(){
  const host=document.querySelector('#player-leaders');
  try{
    const {game} = await loadGamePreferBox();
    const players = extractPlayersWithTeam(game);
    if(!players.length){ showEmpty(host,'Game loaded but no player lines found.','Add players under home.players / away.players.'); return; }
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
  // 1) Use team_stats.json if provided
  try{
    const tstats = await tryFetchJSON(DATA_BASES, TEAM_STATS_FILE);
    if(Array.isArray(tstats) && tstats.length){
      const cats=[['POINTS PER GAME','ppg',1],['REBOUNDS PER GAME','rpg',1],['ASSISTS PER GAME','apg',1],['STEALS PER GAME','spg',1],['BLOCKS PER GAME','bpg',1]];
      for(const [label,key,d] of cats){
        const top=[...tstats].sort(by(key)).slice(0,5).map(t=>({name:t.name||t.team||t.team_id||t.id||t.abbr, val: round(t[key],d)}));
        renderLeaders(wrap,label,top);
      }
      return;
    }
  }catch(e){ /* fall through */ }

  // 2) Prefer boxscore.json to derive two team rows (names from home/away)
  try{
    const box = await tryFetchJSON(DATA_BASES, BOX_FILE);
    const game = box.game || box;
    const home = game.home || game.host || {}, away = game.away || game.visitor || {};
    const nameH = home.name || home.team || home.abbr || home.id || 'Home';
    const nameA = away.name || away.team || away.abbr || away.id || 'Away';

    // totals from team.totals or sum of players
    function computeTeamLine(team, teamLabel){
      const t = {name: teamLabel, gp:1, pts: Number(team.score||team.points||0), reb:0, ast:0, stl:0, blk:0};
      const tt = team.totals || {};
      t.reb += Number(tt.reb||tt.rebounds||0);
      t.ast += Number(tt.ast||tt.assists||0);
      t.stl += Number(tt.stl||tt.steals||0);
      t.blk += Number(tt.blk||tt.blocks||0);
      const players = Array.isArray(team.players)?team.players:[];
      const sum=(key,alts)=> players.reduce((s,p)=> s + Number(p[key] ?? (alts?alts(p):0) || 0), 0);
      if(!t.reb) t.reb = sum('reb', p=> p.rebounds);
      if(!t.ast) t.ast = sum('ast', p=> p.assists);
      if(!t.stl) t.stl = sum('stl', p=> p.steals);
      if(!t.blk) t.blk = sum('blk', p=> p.blocks);
      return t;
    }
    const th = computeTeamLine(home, nameH);
    const ta = computeTeamLine(away, nameA);
    const arr=[th, ta].map(t=>({name:t.name, ppg:t.pts, rpg:t.reb, apg:t.ast, spg:t.stl, bpg:t.blk}));
    const cats=[['POINTS PER GAME','ppg',1],['REBOUNDS PER GAME','rpg',1],['ASSISTS PER GAME','apg',1],['STEALS PER GAME','spg',1],['BLOCKS PER GAME','bpg',1]];
    for(const [label,key,d] of cats){
      const top=[...arr].sort(by(key)).slice(0,5).map(t=>({name:t.name, val: round(t[key],d)}));
      renderLeaders(wrap,label,top);
    }
    return;
  }catch(e){ /* no boxscore, fall through */ }

  // 3) Derive from games.json (names from home.name/away.name when possible)
  try{
    const raw = await tryFetchJSON(DATA_BASES, GAMES_FILE);
    const games = Array.isArray(raw) ? raw : (raw.games || raw.schedule || raw.data || []);
    if(!games.length){ showEmpty(wrap,'No games found for team leaders.'); return; }
    const teams = new Map();
    const ensure = n => { if(!teams.has(n)) teams.set(n,{gp:0,pts:0,reb:0,ast:0,stl:0,blk:0}); return teams.get(n); };
    games.forEach(g=>{
      const home=g.home||g.host||{}; const away=g.away||g.visitor||{};
      const nameH = home.name || home.team || home.abbr || home.id || 'Home';
      const nameA = away.name || away.team || away.abbr || away.id || 'Away';
      const H=ensure(nameH), A=ensure(nameA);
      H.gp++; A.gp++;
      H.pts += Number(home.score||home.points||0);
      A.pts += Number(away.score||away.points||0);
      const addTotals = (t,tt)=>{ t.reb += Number(tt.reb||tt.rebounds||0); t.ast+=Number(tt.ast||tt.assists||0); t.stl+=Number(tt.stl||tt.steals||0); t.blk+=Number(tt.blk||tt.blocks||0); };
      if(home.totals) addTotals(H, home.totals);
      if(away.totals) addTotals(A, away.totals);
    });
    const arr=[...teams.entries()].map(([name,t])=>({name, ppg:t.pts/(t.gp or 1), rpg:t.reb/(t.gp or 1), apg:t.ast/(t.gp or 1), spg:t.stl/(t.gp or 1), bpg:t.blk/(t.gp or 1)}))
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
