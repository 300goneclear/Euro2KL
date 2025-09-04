
const DATA_BASE = '/data'; // change to 'data' if your site is a project page (e.g., /Euro2KL/)
async function fetchJSON(path){ const r = await fetch(path,{cache:'no-store'}); if(!r.ok) throw new Error(path); return r.json(); }
const by = k => (a,b)=> (b[k]??0)-(a[k]??0);
const round = (x,d=1)=> Number.parseFloat(x??0).toFixed(d);
function renderLeaders(el, title, rows){
  const card = document.createElement('div'); card.className='card';
  card.innerHTML = `<h3>${title}</h3><table class="table"><tbody></tbody></table>`;
  const tb = card.querySelector('tbody');
  rows.forEach((r,i)=>{ const tr = document.createElement('tr');
    tr.innerHTML = `<td class="rank">${i+1}.</td><td>${r.name}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${r.val}</td>`;
    tb.appendChild(tr);
  });
  el.appendChild(card);
}
function nameFrom(p){ return `${p.first_name??''} ${p.last_name??''}`.trim(); }
async function buildPlayerLeaders(){
  const players = await fetchJSON(`${DATA_BASE}/players.json`);
  players.forEach(p=>{ if(p.tpm==null) p.tpm = (p.tp_pct!=null && p.ppg!=null) ? Math.max(0,(p.ppg*(p.tp_pct||0))/3) : 0; });
  const cats=[['POINTS PER GAME','ppg',1],['REBOUNDS PER GAME','rpg',1],['ASSISTS PER GAME','apg',1],['BLOCKS PER GAME','bpg',1],['STEALS PER GAME','spg',1],['FIELD GOAL PERCENTAGE','fg_pct',3, v=> round(100*v,1)+'%'],['THREE POINTERS MADE','tpm',1],['THREE POINT PERCENTAGE','tp_pct',3, v=> round(100*v,1)+'%'],['FREE THROW PERCENTAGE','ft_pct',3, v=> round(100*v,1)+'%']];
  const wrap=document.querySelector('#player-leaders');
  for(const [label,key,d,fmt] of cats){
    const rows=[...players].sort(by(key)).slice(0,5).map(p=>({name:nameFrom(p)||p.id,val:fmt?fmt(p[key]):round(p[key],d)}));
    renderLeaders(wrap,label,rows);
  }
}
async function buildTeamLeaders(){
  let stats=null, players=null, teams=null;
  try{stats=await fetchJSON(`${DATA_BASE}/team_stats.json`);}catch(e){}
  try{players=await fetchJSON(`${DATA_BASE}/players.json`);}catch(e){}
  try{teams=await fetchJSON(`${DATA_BASE}/teams.json`);}catch(e){}
  const teamName=id=> Array.isArray(teams)?((teams.find(t=>(t.id||t.abbr)===id||t.abbr===id)||{}).name||id):id;
  let byTeam={};
  if(Array.isArray(stats)&&stats.length&&(stats[0].ppg!=null)){
    stats.forEach(t=>{const id=t.team_id||t.id||t.abbr; byTeam[id]={ppg:t.ppg,rpg:t.rpg,apg:t.apg,spg:t.spg,bpg:t.bpg,fg_pct:t.fg_pct,tp_pct:t.tp_pct,ft_pct:t.ft_pct};});
  }else if(Array.isArray(players)){
    players.forEach(p=>{const id=p.team_id; if(!id) return; if(!byTeam[id]) byTeam[id]={ppg:0,rpg:0,apg:0,spg:0,bpg:0,fg_pct:[],tp_pct:[],ft_pct:[]};
      byTeam[id].ppg+=p.ppg??0; byTeam[id].rpg+=p.rpg??0; byTeam[id].apg+=p.apg??0; byTeam[id].spg+=p.spg??0; byTeam[id].bpg+=p.bpg??0;
      if(p.fg_pct!=null) byTeam[id].fg_pct.push(p.fg_pct); if(p.tp_pct!=null) byTeam[id].tp_pct.push(p.tp_pct); if(p.ft_pct!=null) byTeam[id].ft_pct.push(p.ft_pct);
    });
    for(const id of Object.keys(byTeam)){ const t=byTeam[id];
      t.fg_pct=t.fg_pct.length?t.fg_pct.reduce((a,b)=>a+b,0)/t.fg_pct.length:0;
      t.tp_pct=t.tp_pct.length?t.tp_pct.reduce((a,b)=>a+b,0)/t.tp_pct.length:0;
      t.ft_pct=t.ft_pct.length?t.ft_pct.reduce((a,b)=>a+b,0)/t.ft_pct.length:0;
    }
  }
  const arr=Object.entries(byTeam).map(([id,s])=>({name:teamName(id),...s}));
  const cats=[['POINTS PER GAME','ppg',1],['REBOUNDS PER GAME','rpg',1],['ASSISTS PER GAME','apg',1],['STEALS PER GAME','spg',1],['BLOCKS PER GAME','bpg',1],['FIELD GOAL PERCENTAGE','fg_pct',3, v=> round(100*v,1)+'%'],['THREE POINT PERCENTAGE','tp_pct',3, v=> round(100*v,1)+'%'],['FREE THROW PERCENTAGE','ft_pct',3, v=> round(100*v,1)+'%']];
  const wrap=document.querySelector('#team-leaders');
  for(const [label,key,d,fmt] of cats){
    const rows=[...arr].sort(by(key)).slice(0,5).map(t=>({name:t.name,val:fmt?fmt(t[key]):round(t[key],d)}));
    renderLeaders(wrap,label,rows);
  }
}
window.addEventListener('DOMContentLoaded', async ()=>{
  if(document.querySelector('#player-leaders')) await buildPlayerLeaders();
  if(document.querySelector('#team-leaders')) await buildTeamLeaders();
});
