
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
  });
}

// Inject left-side menu button and overlay (works on all pages)
(function initSideMenu(){
  const wrap = document.querySelector('.nav-wrap');
  if(!wrap) return;
  const btn = document.createElement('button');
  btn.className = 'menu-btn';
  btn.setAttribute('aria-label','Open Menu');
  btn.textContent = '☰';
  wrap.insertBefore(btn, wrap.firstChild);
  const mask = document.createElement('div'); mask.className='menu-mask';
  const menu = document.createElement('aside'); menu.className='side-menu';
  menu.innerHTML = `
    <div class="top">
      <div style="display:flex;align-items:center;gap:10px">
        <img src="assets/logo.png" class="logo" alt="Euro2KLeague">
        <strong>Euro2KLeague</strong>
      </div>
      <button class="close" aria-label="Close">×</button>
    </div>
    <nav>
      <a href="index.html">Watch / Home</a>
      <a href="index.html">League</a>
      <a href="teams.html">Teams</a>
      <a href="schedule.html">Schedule</a>
      <a href="standings.html">Standings</a>
      <a href="stats-players.html">Player Stats</a>
      <a href="stats-teams.html">Team Stats</a>
      <a href="leaders-players.html">Leaders — Players</a>
      <a href="leaders-teams.html">Leaders — Teams</a>
      <a href="#">Shop</a>
    </nav>
  `;
  document.body.appendChild(menu);
  document.body.appendChild(mask);
  function open(){ menu.classList.add('open'); mask.classList.add('show'); }
  function close(){ menu.classList.remove('open'); mask.classList.remove('show'); }
  btn.addEventListener('click', open);
  menu.querySelector('.close').addEventListener('click', close);
  mask.addEventListener('click', close);
})();

// ---------- Helpers ----------
function fmt(v, type='float', precision=1){
  if (v==null || Number.isNaN(v)) return '—';
  if(type==='int') return Math.round(v);
  if(type==='pct') return (v*100).toFixed(precision);
  if(type==='float') return Number(v).toFixed(precision);
  if(type==='text') return v;
  return v;
}
function safeDiv(a,b){ return b ? a/b : 0; }
function parseCSV(text){
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h=>h.trim());
  return lines.slice(1).map(line=>{
    const cells = line.split(',');
    const obj={};
    headers.forEach((h,i)=>{ const val=cells[i]; obj[h]=isNaN(val)?val: Number(val); });
    return obj;
  });
}
function toCSV(rows){
  if(!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for(const r of rows){ lines.push(headers.map(h=> r[h] ?? '').join(',')); }
  return lines.join('\n');
}
async function loadStats(){ 
  const [players, cfg] = await Promise.all([fetch('assets/data/players.json').then(r=>r.json()), fetch('assets/data/stats-config.json').then(r=>r.json())]);
  return {players, cfg};
}
function evalFormula(expr, row, extra){
  const allowed = /[0-9+\-*/(). _a-zA-Z]/g;
  if (!expr.match(allowed)) return 0;
  const scope = {...row, ...extra};
  const keys = Object.keys(scope);
  const vals = Object.values(scope);
  try{
    const fn = new Function(...keys, `return ${expr};`);
    const out = fn(...vals);
    return (out && isFinite(out)) ? out : 0;
  }catch(e){ return 0; }
}
function aggregateTeams(players, cfg){
  const map = {};
  const sum = (a,b)=> (a||0)+(b||0);
  for(const p of players){
    const key = p.team;
    map[key] = map[key] || {team:key,gp:0,mins:0,pts:0,reb:0,ast:0,stl:0,blk:0,tov:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,pf:0,plusminus:0, roster:0};
    const t = map[key];
    t.gp = Math.max(t.gp, p.gp);
    for(const f of ['mins','pts','reb','ast','stl','blk','tov','fgm','fga','tpm','tpa','ftm','fta','pf','plusminus']) t[f] = sum(t[f], p[f]||0);
    t.roster++;
  }
  for(const t of Object.values(map)){
    t.fg_pct = safeDiv(t.fgm, t.fga);
    t.tp_pct = safeDiv(t.tpm, t.tpa);
    t.ft_pct = safeDiv(t.ftm, t.fta);
    t.mins_pg = safeDiv(t.mins, t.gp);
    t.pts_pg  = safeDiv(t.pts,  t.gp);
    t.reb_pg  = safeDiv(t.reb,  t.gp);
    t.ast_pg  = safeDiv(t.ast,  t.gp);
    t.stl_pg  = safeDiv(t.stl,  t.gp);
    t.blk_pg  = safeDiv(t.blk,  t.gp);
    t.tov_pg  = safeDiv(t.tov,  t.gp);
  }
  return Object.values(map);
}
function computePlayerMetrics(players, cfg){
  const teams = aggregateTeams(players, cfg);
  const teamMap = {}; teams.forEach(t => teamMap[t.team]=t);
  return players.map(p => {
    const row = {...p};
    const extra = { team_fga: teamMap[p.team]?.fga || 0, team_fta: teamMap[p.team]?.fta || 0, team_tov: teamMap[p.team]?.tov || 0 };
    for(const [field, expr] of Object.entries(cfg.computed_formulas)){
      row[field] = evalFormula(expr, row, extra);
    }
    return row;
  });
}
function renderTable(el, rows, columns, sortState){
  el.innerHTML = '';
  const header = document.createElement('div'); header.className='tr th';
  columns.forEach(col=>{
    const h = document.createElement('div');
    h.textContent = col.label || col.field;
    h.className = 'th sortable';
    h.addEventListener('click', ()=>{
      const dir = (sortState.field===col.field && sortState.dir==='desc') ? 'asc' : 'desc';
      sortState.field = col.field; sortState.dir = dir;
      const mult = dir==='desc' ? -1 : 1;
      rows.sort((a,b)=> (a[col.field]??0)>(b[col.field]??0) ? mult : -mult);
      renderTable(el, rows, columns, sortState);
    });
    header.appendChild(h);
  });
  el.appendChild(header);
  for(const r of rows){
    const row = document.createElement('div'); row.className='tr';
    columns.forEach(col => {
      const v = r[col.field];
      const d = document.createElement('div');
      d.textContent = fmt(v, col.type||'float', col.precision??1);
      row.appendChild(d);
    });
    el.appendChild(row);
  }
}
function buildMetricPicker(gridEl, allFields, chosen, onToggle){
  gridEl.innerHTML = allFields.map(f => `
    <label><input type="checkbox" ${chosen.includes(f.field)?'checked':''} data-field="${f.field}"><span>${f.label||f.field}</span></label>
  `).join('');
  gridEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => onToggle(cb.dataset.field, cb.checked));
  });
}

// TEAMS PAGE RENDER
(async function renderTeams(){
  const grid = document.getElementById('teams-grid');
  if(!grid) return;
  const teams = await fetch('assets/data/teams.json').then(r=>r.json());
  grid.innerHTML = teams.map(t => `
    <article class="team-card">
      <div class="badge">${t.code.slice(0,2)}</div>
      <div class="team-name">${t.name}</div>
      <div class="team-meta">${t.city} • Coach ${t.coach}</div>
      <div class="team-chip">#${t.code}</div>
    </article>
  `).join('');
})();

// SCHEDULE PAGE RENDER
(async function renderSchedule(){
  const table = document.getElementById('schedule-table');
  if(!table) return;
  const data = await fetch('assets/data/schedule.json').then(r=>r.json());
  const weekFilter = document.getElementById('weekFilter');
  const weeks = [...new Set(data.map(g=>g.week))].sort((a,b)=>a-b);
  weekFilter.innerHTML = `<option value="all">All weeks</option>` + weeks.map(w=>`<option value="${w}">Week ${w}</option>`).join('');
  const draw = () => {
    const sel = weekFilter.value;
    const rows = data.filter(g => sel==='all' || g.week==sel);
    renderTable(table, rows.slice(), [
      {field:'match', label:'Matchup', type:'text'},
      {field:'date', label:'Date', type:'text'},
      {field:'time', label:'Time', type:'text'},
      {field:'venue', label:'Venue', type:'text'},
      {field:'status', label:'Status', type:'text'}
    ], {field:'date', dir:'asc'});
  };
  data.forEach(g => g.match = `${g.away} @ ${g.home}`);
  weekFilter.addEventListener('change', draw);
  draw();
})();

// STANDINGS PAGE RENDER
(async function renderStandings(){
  const table = document.getElementById('standings-table');
  if(!table) return;
  const rows = await fetch('assets/data/standings.json').then(r=>r.json());
  rows.forEach((r,i)=> r.rank = i+1);
  renderTable(table, rows.slice().sort((a,b)=> (b.wins/(b.wins+b.losses)) - (a.wins/(a.wins+a.losses))), [
    {field:'rank',label:'#',type:'int'},
    {field:'team',label:'Team',type:'text'},
    {field:'wins',label:'W',type:'int'},
    {field:'losses',label:'L',type:'int'},
    {field:'pf',label:'PF',type:'int'},
    {field:'pa',label:'PA',type:'int'}
  ], {field:'rank',dir:'asc'});
})();

// ---------- Players Stats Page ----------
(async function playersStatsPage(){
  const table = document.getElementById('players-table');
  if(!table) return;
  const search = document.getElementById('searchPlayers');
  const teamFilter = document.getElementById('teamFilter');
  const addMetricBtn = document.getElementById('addMetricBtn');
  const metricPicker = document.getElementById('metricPicker');
  const metricGrid = document.getElementById('metricGrid');
  const closeMetric = document.getElementById('closeMetric');
  const exportBtn = document.getElementById('exportPlayersCsv');
  const importInput = document.getElementById('importPlayersCsv');

  const {players, cfg} = await loadStats();
  const computed = computePlayerMetrics(players, cfg);
  const teams = [...new Set(computed.map(p=>p.team))].sort();
  teamFilter.innerHTML = '<option value="all">All</option>' + teams.map(t=>`<option value="${t}">${t}</option>`).join('');

  const baseCols = cfg.player_columns_default;
  const known = new Set(baseCols.map(c=>c.field));
  const extraFields = Object.keys(computed[0]).filter(k=>!known.has(k) && (typeof computed[0][k] === 'number'));
  const extraCols = extraFields.map(f => ({field:f, label:f.toUpperCase(), type:'float', precision:1}));
  let columns = [...baseCols];

  function draw(){
    const q = (search.value||'').toLowerCase();
    const t = teamFilter.value;
    const filtered = computed.filter(p => (t==='all' || p.team===t) && ((p.name||'').toLowerCase().includes(q) || (p.team||'').toLowerCase().includes(q)));
    renderTable(table, filtered.slice(), columns, {field:'pts_pg', dir:'desc'});
  }

  const allFields = [...baseCols, ...extraCols];
  addMetricBtn.addEventListener('click', ()=>{
    metricPicker.hidden=false;
    buildMetricPicker(metricGrid, allFields, columns.map(c=>c.field), (field, checked)=>{
      if(checked){
        const add = allFields.find(f=>f.field===field);
        if(!columns.find(c=>c.field===field)) columns.push(add);
      }else{
        columns = columns.filter(c=>c.field!==field);
      }
      draw();
    });
  });
  closeMetric.addEventListener('click', ()=>{ metricPicker.hidden=true; });

  exportBtn.addEventListener('click', ()=>{
    const rows = computed.map(r=>{ const o={}; columns.forEach(c=> o[c.field]=r[c.field]); return o; });
    const blob = new Blob([toCSV(rows)], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='players_stats.csv'; a.click(); URL.revokeObjectURL(url);
  });
  importInput.addEventListener('change', async ()=>{
    const file = importInput.files[0]; const text = await file.text(); const rows = parseCSV(text);
    for(const imp of rows){ const p = computed.find(r => r.name===imp.name && r.team===imp.team); if(p){ Object.assign(p, imp); } }
    const newFields = Object.keys(rows[0]||{}).filter(f=>!columns.find(c=>c.field===f));
    for(const nf of newFields){ columns.push({field:nf,label:nf.toUpperCase(),type:'float',precision:1}); }
    draw();
  });

  search.addEventListener('input', draw);
  teamFilter.addEventListener('change', draw);
  draw();
})();

// ---------- Team Stats Page ----------
(async function teamStatsPage(){
  const table = document.getElementById('teams-table');
  if(!table) return;
  const viewSel = document.getElementById('teamView');
  const addMetricBtn = document.getElementById('addTeamMetricBtn');
  const picker = document.getElementById('teamMetricPicker');
  const grid = document.getElementById('teamMetricGrid');
  const closeBtn = document.getElementById('closeTeamMetric');
  const exportBtn = document.getElementById('exportTeamsCsv');

  const {players, cfg} = await loadStats();
  const teams = aggregateTeams(computePlayerMetrics(players, cfg), cfg);

  const baseCols = [
    {field:'team', label:'Team', type:'text'},
    {field:'gp', label:'GP', type:'int'},
    {field:'mins_pg', label:'MIN', type:'float', precision:1},
    {field:'pts_pg', label:'PTS', type:'float', precision:1},
    {field:'reb_pg', label:'REB', type:'float', precision:1},
    {field:'ast_pg', label:'AST', type:'float', precision:1},
    {field:'stl_pg', label:'STL', type:'float', precision:1},
    {field:'blk_pg', label:'BLK', type:'float', precision:1},
    {field:'tov_pg', label:'TOV', type:'float', precision:1},
    {field:'fg_pct', label:'FG%', type:'pct', precision:1},
    {field:'tp_pct', label:'3P%', type:'pct', precision:1},
    {field:'ft_pct', label:'FT%', type:'pct', precision:1}
  ];
  const totalCols = [
    {field:'team', label:'Team', type:'text'},
    {field:'gp', label:'GP', type:'int'},
    {field:'mins', label:'MIN', type:'int'},
    {field:'pts', label:'PTS', type:'int'},
    {field:'reb', label:'REB', type:'int'},
    {field:'ast', label:'AST', type:'int'},
    {field:'stl', label:'STL', type:'int'},
    {field:'blk', label:'BLK', type:'int'},
    {field:'tov', label:'TOV', type:'int'},
    {field:'fg_pct', label:'FG%', type:'pct', precision:1},
    {field:'tp_pct', label:'3P%', type:'pct', precision:1},
    {field:'ft_pct', label:'FT%', type:'pct', precision:1}
  ];

  let columns = baseCols.slice();
  let rows = teams.slice();

  function draw(){
    const pergame = viewSel.value==='pergame';
    columns = pergame ? baseCols.slice() : totalCols.slice();
    renderTable(table, rows.slice(), columns, {field: pergame?'pts_pg':'pts', dir:'desc'});
  }
  viewSel.addEventListener('change', draw);

  const allFields = [...baseCols, ...totalCols].filter((v,i,a)=>a.findIndex(t=>t.field===v.field)===i);
  addMetricBtn.addEventListener('click', ()=>{
    picker.hidden=false;
    buildMetricPicker(grid, allFields, columns.map(c=>c.field), (field, checked)=>{
      if(checked){ const add = allFields.find(f=>f.field===field); if(!columns.find(c=>c.field===field)) columns.push(add); }
      else{ columns = columns.filter(c=>c.field!==field); }
      draw();
    });
  });
  closeBtn.addEventListener('click', ()=> picker.hidden=true );

  exportBtn.addEventListener('click', ()=>{
    const rowsOut = rows.map(r=>{ const o={}; columns.forEach(c=> o[c.field]=r[c.field]); return o; });
    const blob = new Blob([toCSV(rowsOut)], {type:'text/csv'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='teams_stats.csv'; a.click(); URL.revokeObjectURL(url);
  });

  draw();
})();

// ---------- Leaders: Players ----------
(async function leadersPlayersPage(){
  const table = document.getElementById('leaders-players-table');
  if(!table) return;
  const metricSel = document.getElementById('leaderMetric');
  const minGp = document.getElementById('minGp');
  const topN = document.getElementById('topN');
  const refreshBtn = document.getElementById('refreshLeaders');

  const {players, cfg} = await loadStats();
  const computed = computePlayerMetrics(players, cfg);

  const allFields = cfg.player_columns_default.filter(c=>c.type!=='text').map(c=>({field:c.field,label:c.label,type:c.type,precision:c.precision||1}));
  metricSel.innerHTML = allFields.map(f=>`<option value="${f.field}">${f.label}</option>`).join('');
  metricSel.value = cfg.leaders_default_metric || 'pts_pg';

  function draw(){
    const k = metricSel.value;
    const rows = computed.filter(p=> p.gp >= Number(minGp.value))
                         .sort((a,b)=> (b[k]??0) - (a[k]??0))
                         .slice(0, Number(topN.value));
    const columns = [{field:'name',label:'Player',type:'text'},{field:'team',label:'Team',type:'text'},{field:k,label:metricSel.options[metricSel.selectedIndex].text,type:(allFields.find(f=>f.field===k)?.type||'float'),precision:1}];
    renderTable(table, rows, columns, {field:k, dir:'desc'});
  }
  refreshBtn.addEventListener('click', draw);
  draw();
})();

// ---------- Leaders: Teams ----------
(async function leadersTeamsPage(){
  const table = document.getElementById('leaders-teams-table');
  if(!table) return;
  const viewSel = document.getElementById('leadersTeamView');
  const metricSel = document.getElementById('leaderTeamMetric');
  const topN = document.getElementById('topNTeam');
  const refreshBtn = document.getElementById('refreshTeamLeaders');

  const {players, cfg} = await loadStats();
  const teams = aggregateTeams(computePlayerMetrics(players, cfg), cfg);

  const perGameFields = [
    {field:'pts_pg', label:'PTS', type:'float', precision:1},
    {field:'reb_pg', label:'REB', type:'float', precision:1},
    {field:'ast_pg', label:'AST', type:'float', precision:1},
    {field:'stl_pg', label:'STL', type:'float', precision:1},
    {field:'blk_pg', label:'BLK', type:'float', precision:1},
    {field:'tov_pg', label:'TOV (low best)', type:'float', precision:1},
    {field:'fg_pct', label:'FG%', type:'pct', precision:1},
    {field:'tp_pct', label:'3P%', type:'pct', precision:1},
    {field:'ft_pct', label:'FT%', type:'pct', precision:1}
  ];
  const totalFields = [
    {field:'pts', label:'PTS', type:'int'},
    {field:'reb', label:'REB', type:'int'},
    {field:'ast', label:'AST', type:'int'},
    {field:'stl', label:'STL', type:'int'},
    {field:'blk', label:'BLK', type:'int'},
    {field:'tov', label:'TOV (low best)', type:'int'}
  ];

  function refreshMetricOptions(){
    const list = (viewSel.value==='pergame') ? perGameFields : totalFields;
    metricSel.innerHTML = list.map(f=>`<option value="${f.field}">${f.label}</option>`).join('');
  }
  refreshMetricOptions();

  function draw(){
    const k = metricSel.value;
    const list = teams.slice().sort((a,b)=> (k.includes('tov') ? ((a[k]??0)-(b[k]??0)) : ((b[k]??0)-(a[k]??0)))).slice(0, Number(topN.value));
    const columns = [{field:'team',label:'Team',type:'text'},{field:k,label:metricSel.options[metricSel.selectedIndex].text,type:(k.includes('pct')?'pct':'float'),precision:1}];
    renderTable(table, list, columns, {field:k, dir: k.includes('tov') ? 'asc':'desc'});
  }
  viewSel.addEventListener('change', ()=>{ refreshMetricOptions(); draw(); });
  refreshBtn.addEventListener('click', draw);
  draw();
})();
