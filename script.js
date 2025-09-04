
// Inject left-side menu button and overlay
(function initSideMenu(){
  const wrap = document.querySelector('.nav-wrap');
  if(!wrap) return;
  // Avoid duplicate
  if (document.querySelector('.side-menu')) return;

  // Menu button
  const btn = document.createElement('button');
  btn.className = 'menu-btn';
  btn.setAttribute('aria-label','Open Menu');
  btn.textContent = '☰';
  wrap.insertBefore(btn, wrap.firstChild);

  // Side menu + mask
  const mask = document.createElement('div'); mask.className='menu-mask';
  const menu = document.createElement('aside'); menu.className='side-menu';
  menu.innerHTML = `
    <div class="top">
      <button class="close" aria-label="Close">×</button>
    </div>
    <nav>
      <a href="index.html">Home</a>
      <a href="stats-players.html">Player Stats</a>
      <a href="stats-teams.html">Team Stats</a>
      <a href="leaders-players.html">Leaders — Players</a>
      <a href="leaders-teams.html">Leaders — Teams</a>
      <a href="teams.html">Teams</a>
      <a href="schedule.html">Schedule</a>
      <a href="standings.html">Standings</a>
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
