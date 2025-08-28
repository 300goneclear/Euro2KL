function $(q,scope=document){return scope.querySelector(q)}
function $all(q,scope=document){return [...scope.querySelectorAll(q)]}
function fmtPct(w,l){const g=w+l;return g? (w/g).toFixed(3).slice(1):".000"}

function getSeed(){
  const el = document.getElementById('seed')
  return JSON.parse(el.textContent)
}

function renderHero(){
  const s = getSeed()
  const title = $("#hero-title")
  const sub = $("#hero-sub")
  if(title) title.textContent = `EURO2KL Champions — Esports Basketball • ${s.season}`
  if(sub) sub.textContent = `${s.matchday} • Official site preview`
}

function renderFixtures(containerId="fixtures"){
  const s=getSeed(), wrap=$("#"+containerId)
  if(!wrap) return
  wrap.innerHTML=""
  s.fixtures.forEach(f=>{
    wrap.insertAdjacentHTML("beforeend",`
      <div class="fixture">
        <div class="club"><div class="badge"></div><div>${f.home.abbr} — ${f.home.name}</div></div>
        <div class="kick">${f.status || f.date}</div>
        <div class="club" style="justify-content:end"><div>${f.away.abbr} — ${f.away.name}</div><div class="badge"></div></div>
      </div>
    `)
  })
}

function renderGroups(containerId="groups"){
  const s=getSeed(), wrap=$("#"+containerId)
  if(!wrap) return
  wrap.innerHTML=""
  Object.entries(s.groups).forEach(([g,rows])=>{
    const table = [`<div class="card"><h3>${g}</h3><table class="table"><thead><tr><th>Club</th><th>W</th><th>L</th><th>Pct</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody>`]
    rows.forEach(r=>{
      const diff = (r.pf - r.pa)
      table.push(`<tr><td>${r.abbr} — ${r.team}</td><td>${r.w}</td><td>${r.l}</td><td>${fmtPct(r.w,r.l)}</td><td>${r.pf}</td><td>${r.pa}</td><td>${diff>0?"+":""}${diff}</td></tr>`)
    })
    table.push("</tbody></table></div>")
    wrap.insertAdjacentHTML("beforeend",table.join(""))
  })
}

function renderLeaders(containerId="leaders"){
  const s=getSeed(), wrap=$("#"+containerId)
  if(!wrap) return
  wrap.innerHTML=""
  Object.entries(s.leaders).forEach(([cat,list])=>{
    const cards = list.map(x=>`<div class="card"><div class="pill">${cat}</div><h3>${x.rank}. ${x.player} — ${x.team}</h3><div class="sub">${x.val}</div></div>`).join("")
    wrap.insertAdjacentHTML("beforeend",`<div class="card"><h3>${cat}</h3><div class="card-row">${cards}</div></div>`)
  })
}

function renderClubs(containerId="club-grid"){
  const s=getSeed(), wrap=$("#"+containerId)
  if(!wrap) return
  wrap.innerHTML = s.clubs.map(c=>`
    <div class="card"><h3>${c.abbr}</h3><div class="sub">${c.name}</div><div class="pill">View club →</div></div>
  `).join("")
}

function renderNews(containerId="news"){
  const s=getSeed(), wrap=$("#"+containerId)
  if(!wrap) return
  wrap.innerHTML = s.news.map(n=>`
    <div class="card"><h3>${n.title}</h3><div class="sub">${n.date}</div><p>${n.excerpt}</p><a class="pill" href="${n.link}">Read →</a></div>
  `).join("")
}

document.addEventListener("DOMContentLoaded",()=>{
  renderHero()
  renderFixtures()
  renderGroups()
  renderLeaders()
  renderClubs()
  renderNews()
})