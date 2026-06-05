

var loops = {};

function $i(id) { return document.getElementById(id); }

// ── Navigation ────────────────────────────────────────
function nav(v) {
  document.querySelectorAll('.view').forEach(e => e.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(e => e.classList.remove('on'));
  $i('v-play').style.display = 'none';

  const el = $i('v-' + v);
  if (el) el.classList.add('on');

  const map = { games: 0, news: 1, lb: 2, search: 3, settings: 4, tos: 5 };
  if (map[v] !== undefined) document.querySelectorAll('.nb')[map[v]].classList.add('on');
  if (v === 'lb') window.renderLB && window.renderLB();
}


function go(g) {
  stopAll();
  document.querySelectorAll('.view').forEach(e => e.classList.remove('on'));
  $i('v-play').style.display = 'flex';
  $i('ptitle').textContent = '// ' + g;
  $i('play-body').innerHTML = '';
  if (window['build_' + g]) window['build_' + g]($i('play-body'));
}

function back() {
  stopAll();
  $i('v-play').style.display = 'none';
  nav('games');
}

function stopAll() {
  for (var k in loops) {
    try { clearInterval(loops[k]); cancelAnimationFrame(loops[k]); } catch (e) {}
  }
  loops = {};
}

// ── Canvas & Side Panel helpers ───────────────────────
function mkC(w, h) {
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function mkSP(html) {
  var d = document.createElement('div');
  d.className = 'sp';
  d.innerHTML = html;
  return d;
}

// ════════════════════════════════════════════════════
// TETRIS
// ════════════════════════════════════════════════════
window.build_tetris = function (a) {
  var CW = 20, CO = 10, RO = 20;
  var P = [[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
  var cv = mkC(CW * CO, CW * RO), ctx = cv.getContext('2d');
  var sp = mkSP(`
    <div class="sb"><div class="sl">score</div><div class="sv" id="ts">0</div></div>
    <div class="sb"><div class="sl">level</div><div class="sv" id="tl">1</div></div>
    <div class="sb"><div class="sl">lines</div><div class="sv" id="tln">0</div></div>
    <canvas id="tnx" width="74" height="56" style="border:1px solid #1e1e1e"></canvas>
    <button class="gbtn" id="tbtn" onclick="window._tstart()">start</button>
    <div class="gover" id="tov"></div>
    <div class="hint">←→ move · ↑ rotate<br>↓ drop · space hard</div>
  `);
  a.appendChild(cv); a.appendChild(sp);

  var bd, cur, nxt, sc, ln, lv, alive;
  var nb  = () => Array.from({ length: RO }, () => Array(CO).fill(0));
  var rp  = () => Math.floor(Math.random() * P.length);
  var mk  = i => ({ s: JSON.parse(JSON.stringify(P[i])), x: Math.floor(CO / 2) - Math.floor(P[i][0].length / 2), y: 0 });
  var rot = s => s[0].map((_, i) => s.map(r => r[i])).reverse();

  var hit = (p, dx, dy, rs) => {
    var s = rs || p.s;
    for (var r = 0; r < s.length; r++)
      for (var c = 0; c < s[r].length; c++)
        if (s[r][c]) { var nx = p.x + c + dx, ny = p.y + r + dy; if (nx < 0 || nx >= CO || ny >= RO || ny < 0 || bd[ny][nx]) return true; }
    return false;
  };

  var draw = () => {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (var r = 0; r < RO; r++) for (var c = 0; c < CO; c++) {
      if (bd[r][c]) { ctx.fillStyle = '#fff'; ctx.fillRect(c*CW+1, r*CW+1, CW-2, CW-2); }
      else { ctx.strokeStyle = '#111'; ctx.strokeRect(c*CW+.5, r*CW+.5, CW-1, CW-1); }
    }
    if (cur) cur.s.forEach((row, r) => row.forEach((v, c) => {
      if (v) { ctx.fillStyle = '#aaa'; ctx.fillRect((cur.x+c)*CW+1, (cur.y+r)*CW+1, CW-2, CW-2); }
    }));
  };

  var drawN = () => {
    var nc = $i('tnx'); if (!nc) return;
    var nx = nc.getContext('2d'), pp = P[nxt], sz = 13;
    nx.fillStyle = '#0a0a0a'; nx.fillRect(0, 0, 74, 56);
    var ox = (74 - pp[0].length * sz) / 2, oy = (56 - pp.length * sz) / 2;
    pp.forEach((row, r) => row.forEach((v, c) => { if (v) { nx.fillStyle = '#fff'; nx.fillRect(ox+c*sz+1, oy+r*sz+1, sz-2, sz-2); } }));
  };

  var clr = () => {
    var cl = 0;
    for (var r = RO - 1; r >= 0; r--) { if (bd[r].every(v => v)) { bd.splice(r, 1); bd.unshift(Array(CO).fill(0)); cl++; r++; } }
    if (cl) {
      ln += cl; sc += [0, 100, 300, 500, 800][cl] * lv; lv = Math.floor(ln / 10) + 1;
      if ($i('ts'))  $i('ts').textContent  = sc;
      if ($i('tln')) $i('tln').textContent = ln;
      if ($i('tl'))  $i('tl').textContent  = lv;
      clearInterval(loops.tet);
      loops.tet = setInterval(step, Math.max(80, 480 - lv * 40));
    }
  };

  var spawn = () => {
    cur = mk(nxt); nxt = rp(); drawN();
    if (hit(cur, 0, 0)) {
      alive = false;
      window.addScore && window.addScore('tetris', sc);
      clearInterval(loops.tet);
      if ($i('tov'))  $i('tov').textContent  = 'game over';
      if ($i('tbtn')) $i('tbtn').textContent = 'restart';
    }
  };

  var lock = () => {
    cur.s.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) bd[cur.y + r][cur.x + c] = 1; }));
    clr(); spawn();
  };

  var step = () => { if (!alive) return; if (!hit(cur, 0, 1)) cur.y++; else lock(); draw(); };

  window._tstart = () => {
    bd = nb(); sc = 0; ln = 0; lv = 1; alive = true;
    ['ts','tln'].forEach(id => { if ($i(id)) $i(id).textContent = '0'; });
    if ($i('tl'))  $i('tl').textContent  = '1';
    if ($i('tov'))  $i('tov').textContent  = '';
    if ($i('tbtn')) $i('tbtn').textContent = 'restart';
    nxt = rp(); spawn(); draw();
    clearInterval(loops.tet); loops.tet = setInterval(step, 480);
  };

  document.addEventListener('keydown', function tetK(e) {
    if (!alive) return;
    if (e.key === 'ArrowLeft'  && !hit(cur, -1, 0)) { cur.x--; draw(); }
    else if (e.key === 'ArrowRight' && !hit(cur, 1, 0)) { cur.x++; draw(); }
    else if (e.key === 'ArrowDown'  && !hit(cur, 0, 1)) { cur.y++; draw(); }
    else if (e.key === 'ArrowUp') { var r = rot(cur.s); if (!hit(cur, 0, 0, r)) cur.s = r; draw(); }
    else if (e.key === ' ') { e.preventDefault(); while (!hit(cur, 0, 1)) cur.y++; lock(); draw(); }
  });

  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#222'; ctx.font = '10px JetBrains Mono';
  ctx.fillText('press start', 14, RO * CW / 2);
};

// ════════════════════════════════════════════════════
// SNAKE
// ════════════════════════════════════════════════════
window.build_snake = function (a) {
  var SZ = 14, C = 26, R = 22;
  var cv = mkC(SZ * C, SZ * R), ctx = cv.getContext('2d');
  var sp = mkSP(`
    <div class="sb"><div class="sl">score</div><div class="sv" id="ss">0</div></div>
    <div class="sb"><div class="sl">best</div><div class="sv" id="sbst">0</div></div>
    <button class="gbtn" onclick="window._snstart()">start</button>
    <div class="gover" id="snov"></div>
    <div class="hint">wasd / arrows</div>
  `);
  a.appendChild(cv); a.appendChild(sp);

  var snake, dir, food, sc, best = 0, alive = false;
  var rf = () => { var f; do { f = { x: Math.floor(Math.random() * C), y: Math.floor(Math.random() * R) }; } while (snake.some(s => s.x === f.x && s.y === f.y)); return f; };

  var drw = () => {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#0f0f0f';
    for (var x = 0; x < C; x++) for (var y = 0; y < R; y++) ctx.strokeRect(x*SZ+.5, y*SZ+.5, SZ-1, SZ-1);
    snake.forEach((s, i) => { ctx.fillStyle = i ? '#555' : '#fff'; ctx.fillRect(s.x*SZ+1, s.y*SZ+1, SZ-2, SZ-2); });
    ctx.fillStyle = '#888'; ctx.fillRect(food.x*SZ+3, food.y*SZ+3, SZ-6, SZ-6);
  };

  var step = () => {
    if (!alive) return;
    var h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (h.x < 0 || h.x >= C || h.y < 0 || h.y >= R || snake.some(s => s.x === h.x && s.y === h.y)) {
      alive = false; window.addScore && window.addScore('snake', sc);
      clearInterval(loops.snk); if ($i('snov')) $i('snov').textContent = 'game over'; return;
    }
    snake.unshift(h);
    if (h.x === food.x && h.y === food.y) {
      sc += 10; if (sc > best) best = sc;
      if ($i('ss'))   $i('ss').textContent   = sc;
      if ($i('sbst')) $i('sbst').textContent = best;
      food = rf();
    } else snake.pop();
    drw();
  };

  window._snstart = () => {
    snake = [{ x: 13, y: 11 }, { x: 12, y: 11 }, { x: 11, y: 11 }];
    dir = { x: 1, y: 0 }; sc = 0; alive = true;
    if ($i('ss'))   $i('ss').textContent   = '0';
    if ($i('snov')) $i('snov').textContent = '';
    food = rf(); drw();
    clearInterval(loops.snk); loops.snk = setInterval(step, 115);
  };

  document.addEventListener('keydown', e => {
    if (!alive) return;
    var k = e.key;
    if ((k === 'ArrowUp'    || k === 'w') && dir.y === 0) dir = { x: 0, y: -1 };
    else if ((k === 'ArrowDown'  || k === 's') && dir.y === 0) dir = { x: 0, y:  1 };
    else if ((k === 'ArrowLeft'  || k === 'a') && dir.x === 0) dir = { x: -1, y: 0 };
    else if ((k === 'ArrowRight' || k === 'd') && dir.x === 0) dir = { x:  1, y: 0 };
  });

  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#222'; ctx.font = '10px JetBrains Mono';
  ctx.fillText('press start', 130, R * SZ / 2);
};

// ════════════════════════════════════════════════════
// PONG
// ════════════════════════════════════════════════════
window.build_pong = function (a) {
  var W = 380, H = 250, PH = 50, PW = 8;
  var cv = mkC(W, H), ctx = cv.getContext('2d');
  var sp = mkSP(`
    <div class="sb"><div class="sl">you</div><div class="sv" id="p1s">0</div></div>
    <div class="sb"><div class="sl">cpu</div><div class="sv" id="p2s">0</div></div>
    <button class="gbtn" onclick="window._pstart()">start</button>
    <div class="gover" id="pgov"></div>
    <div class="hint">w s · first to 7</div>
  `);
  a.appendChild(cv); a.appendChild(sp);

  var p1y, p2y, bx, by, vx, vy, p1sc, p2sc, alive = false, keys = {};
  var rst = () => { bx = W/2; by = H/2; vx = (Math.random() > .5 ? 1 : -1) * 3.8; vy = (Math.random() - .5) * 4; };
  var drw = () => {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1a1a1a'; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.fillRect(10, p1y, PW, PH); ctx.fillRect(W-PW-10, p2y, PW, PH);
    ctx.fillStyle = '#ccc'; ctx.fillRect(bx-4, by-4, 8, 8);
  };
  var fr = () => {
    if (!alive) { loops.png = null; return; }
    if (keys.w) p1y = Math.max(0, p1y - 4.5);
    if (keys.s) p1y = Math.min(H - PH, p1y + 4.5);
    var m = p2y + PH / 2;
    if (by > m + 3) p2y = Math.min(H-PH, p2y + 3.4); else if (by < m - 3) p2y = Math.max(0, p2y - 3.4);
    bx += vx; by += vy;
    if (by <= 0 || by >= H) vy = -vy;
    if (bx <= 18 && by >= p1y && by <= p1y+PH && vx < 0) { vx = -vx*1.04; vy += ((by-p1y-PH/2)/PH)*2; }
    if (bx >= W-18 && by >= p2y && by <= p2y+PH && vx > 0) { vx = -vx*1.04; vy += ((by-p2y-PH/2)/PH)*2; }
    if (bx < 0) { p2sc++; if ($i('p2s')) $i('p2s').textContent = p2sc; if (p2sc >= 7) { alive = false; cancelAnimationFrame(loops.png); if ($i('pgov')) $i('pgov').textContent = 'cpu wins'; drw(); return; } rst(); }
    if (bx > W) { p1sc++; if ($i('p1s')) $i('p1s').textContent = p1sc; if (p1sc >= 7) { alive = false; window.addScore && window.addScore('pong', p1sc*100); cancelAnimationFrame(loops.png); if ($i('pgov')) $i('pgov').textContent = 'you win!'; drw(); return; } rst(); }
    drw(); loops.png = requestAnimationFrame(fr);
  };
  window._pstart = () => {
    p1y = (H-PH)/2; p2y = (H-PH)/2; p1sc = 0; p2sc = 0; alive = true;
    if ($i('p1s')) $i('p1s').textContent = '0';
    if ($i('p2s')) $i('p2s').textContent = '0';
    if ($i('pgov')) $i('pgov').textContent = '';
    rst(); cancelAnimationFrame(loops.png); loops.png = requestAnimationFrame(fr);
  };
  document.addEventListener('keydown', e => { keys[e.key] = true; if (e.key==='w'||e.key==='s') e.preventDefault(); });
  document.addEventListener('keyup',   e => { delete keys[e.key]; });
  ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#222'; ctx.font='10px JetBrains Mono'; ctx.fillText('press start', W/2-40, H/2);
};

// ════════════════════════════════════════════════════
// BREAKOUT
// ════════════════════════════════════════════════════
window.build_breakout = function (a) {
  var W = 380, H = 270;
  var cv = mkC(W, H), ctx = cv.getContext('2d'); cv.style.cursor = 'none';
  var sp = mkSP(`
    <div class="sb"><div class="sl">score</div><div class="sv" id="bks">0</div></div>
    <div class="sb"><div class="sl">lives</div><div class="sv" id="bkl">3</div></div>
    <button class="gbtn" onclick="window._bstart()">start</button>
    <div class="gover" id="bkov"></div>
    <div class="hint">mouse or ← →</div>
  `);
  a.appendChild(cv); a.appendChild(sp);

  var px = W/2, pw = 60, bx, by, vx, vy, bricks, sc, lives, alive = false;
  var mkBr = () => { var b = []; for (var r=0;r<5;r++) for (var c=0;c<9;c++) b.push({x:8+c*40,y:22+r*17,w:36,h:11,ok:true,pts:(5-r)*10}); return b; };
  var drw  = () => {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0,0,W,H);
    bricks.forEach(b => { if (!b.ok) return; ctx.fillStyle='#fff'; ctx.fillRect(b.x,b.y,b.w,b.h); });
    ctx.fillStyle = '#888'; ctx.fillRect(px-pw/2, H-18, pw, 7);
    ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.arc(bx,by,5,0,Math.PI*2); ctx.fill();
  };
  var fr = () => {
    if (!alive) { loops.brk = null; return; }
    bx += vx; by += vy;
    if (bx<5||bx>W-5) vx=-vx;
    if (by<5) vy=-vy;
    if (by>H-18-7&&by<H-10&&bx>px-pw/2&&bx<px+pw/2) { vy=-Math.abs(vy); vx+=((bx-px)/pw)*2; }
    if (by>H) {
      lives--; if ($i('bkl')) $i('bkl').textContent = lives;
      if (lives<=0) { alive=false; cancelAnimationFrame(loops.brk); if($i('bkov'))$i('bkov').textContent='game over'; drw(); return; }
      by=H-60; vy=-Math.abs(vy);
    }
    bricks.forEach(b => { if (!b.ok) return; if (bx>b.x&&bx<b.x+b.w&&by>b.y&&by<b.y+b.h) { b.ok=false; sc+=b.pts; if($i('bks'))$i('bks').textContent=sc; vy=-vy; } });
    if (bricks.every(b=>!b.ok)) { alive=false; window.addScore&&window.addScore('breakout',sc); cancelAnimationFrame(loops.brk); if($i('bkov'))$i('bkov').textContent='you win!'; drw(); return; }
    drw(); loops.brk = requestAnimationFrame(fr);
  };
  window._bstart = () => {
    px=W/2; bx=W/2; by=H-60; vx=2.5; vy=-3.5; sc=0; lives=3; alive=true; bricks=mkBr();
    if($i('bks'))$i('bks').textContent='0'; if($i('bkl'))$i('bkl').textContent='3'; if($i('bkov'))$i('bkov').textContent='';
    cancelAnimationFrame(loops.brk); loops.brk=requestAnimationFrame(fr);
  };
  cv.addEventListener('mousemove', e => { var r=cv.getBoundingClientRect(); px=e.clientX-r.left; });
  document.addEventListener('keydown', e => { if(e.key==='ArrowLeft')px=Math.max(pw/2,px-14); if(e.key==='ArrowRight')px=Math.min(W-pw/2,px+14); });
  ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#222'; ctx.font='10px JetBrains Mono'; ctx.fillText('press start',W/2-44,H/2);
};

// ════════════════════════════════════════════════════
// FLAPPY
// ════════════════════════════════════════════════════
window.build_flappy = function (a) {
  var W = 280, H = 380;
  var cv = mkC(W, H), ctx = cv.getContext('2d');
  var sp = mkSP(`
    <div class="sb"><div class="sl">score</div><div class="sv" id="fls">0</div></div>
    <div class="sb"><div class="sl">best</div><div class="sv" id="flb">0</div></div>
    <button class="gbtn" onclick="window._flstart()">start</button>
    <div class="gover" id="flov"></div>
    <div class="hint">space / click</div>
  `);
  a.appendChild(cv); a.appendChild(sp);

  var bird, pipes, sc, best=0, alive=false, fc=0;
  var drw = () => {
    ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#1a1a1a'; ctx.fillRect(0,H-25,W,25);
    pipes.forEach(p => { ctx.fillStyle='#2a2a2a'; ctx.fillRect(p.x,0,26,p.top); ctx.fillRect(p.x,p.top+85,26,H); });
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(55,bird.y,9,0,Math.PI*2); ctx.fill();
  };
  var tick = () => {
    if (!alive) { loops.flp=null; return; }
    bird.vy+=0.36; bird.y+=bird.vy; fc++;
    if (fc%80===0) pipes.push({x:W,top:40+Math.floor(Math.random()*(H-180))});
    pipes.forEach(p=>p.x-=2.2); pipes=pipes.filter(p=>p.x>-28);
    var hit=pipes.some(p=>55>p.x&&55<p.x+26&&(bird.y-9<p.top||bird.y+9>p.top+85));
    if (bird.y>H-35||bird.y<0||hit) {
      alive=false; window.addScore&&window.addScore('flappy',sc);
      cancelAnimationFrame(loops.flp); if($i('flov'))$i('flov').textContent='game over'; drw(); return;
    }
    pipes.filter(p=>p.x+26<55&&!p.scored).forEach(p=>{
      p.scored=true; sc++; if(sc>best)best=sc;
      if($i('fls'))$i('fls').textContent=sc; if($i('flb'))$i('flb').textContent=best;
    });
    drw(); loops.flp=requestAnimationFrame(tick);
  };
  var flap = () => { if (alive) bird.vy=-7; };
  window._flstart = () => {
    bird={y:H/2,vy:0}; pipes=[]; sc=0; alive=true; fc=0;
    if($i('fls'))$i('fls').textContent='0'; if($i('flov'))$i('flov').textContent='';
    cancelAnimationFrame(loops.flp); loops.flp=requestAnimationFrame(tick);
  };
  document.addEventListener('keydown', e => { if(e.key===' ')flap(); });
  cv.addEventListener('click', flap);
  ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#222'; ctx.font='10px JetBrains Mono'; ctx.fillText('press start',W/2-44,H/2);
};

// ════════════════════════════════════════════════════
// ASTEROIDS
// ════════════════════════════════════════════════════
window.build_asteroids = function (a) {
  var W = 400, H = 320;
  var cv = mkC(W, H), ctx = cv.getContext('2d');
  var sp = mkSP(`
    <div class="sb"><div class="sl">score</div><div class="sv" id="ass">0</div></div>
    <div class="sb"><div class="sl">lives</div><div class="sv" id="asl">3</div></div>
    <button class="gbtn" onclick="window._astart()">start</button>
    <div class="gover" id="asov"></div>
    <div class="hint">↑ thrust · ←→<br>space = fire</div>
  `);
  a.appendChild(cv); a.appendChild(sp);

  var ship, asts, bullets, sc, lives, alive=false, keys={}, inv=0;
  var rA = (x,y,r) => ({ x:x!=null?x:Math.random()*W, y:y!=null?y:Math.random()*H, vx:(Math.random()-.5)*2, vy:(Math.random()-.5)*2, r:r||28+Math.random()*18, a:Math.random()*Math.PI*2, rot:(Math.random()-.5)*.05 });

  var drw = () => {
    ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,W,H);
    asts.forEach(ast => {
      ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.beginPath();
      for(var i=0;i<8;i++){var ag=ast.a+(i/8)*Math.PI*2,rv=ast.r*(0.8+0.2*Math.sin(i*2));i?ctx.lineTo(ast.x+Math.cos(ag)*rv,ast.y+Math.sin(ag)*rv):ctx.moveTo(ast.x+Math.cos(ag)*rv,ast.y+Math.sin(ag)*rv);}
      ctx.closePath(); ctx.stroke();
    });
    bullets.forEach(b => { ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(b.x,b.y,2,0,Math.PI*2); ctx.fill(); });
    if (alive&&inv%4<2) {
      ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.save();
      ctx.translate(ship.x,ship.y); ctx.rotate(ship.a);
      ctx.beginPath(); ctx.moveTo(0,-13); ctx.lineTo(8,9); ctx.lineTo(0,5); ctx.lineTo(-8,9); ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
  };

  var tick = () => {
    if (!alive) { loops.ast=null; return; }
    if (inv>0) inv--;
    if (keys.ArrowLeft)  ship.a-=0.07;
    if (keys.ArrowRight) ship.a+=0.07;
    if (keys.ArrowUp)   { ship.vx+=Math.sin(ship.a)*0.25; ship.vy-=Math.cos(ship.a)*0.25; }
    ship.vx*=0.98; ship.vy*=0.98;
    ship.x=(ship.x+ship.vx+W)%W; ship.y=(ship.y+ship.vy+H)%H;
    asts.forEach(ast=>{ast.x=(ast.x+ast.vx+W)%W;ast.y=(ast.y+ast.vy+H)%H;ast.a+=ast.rot;});
    bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.life--;});
    bullets=bullets.filter(b=>b.life>0);
    var na=[];
    asts.forEach(ast=>{
      var hi=bullets.findIndex(b=>Math.hypot(b.x-ast.x,b.y-ast.y)<ast.r);
      if(hi>=0){bullets.splice(hi,1);sc+=ast.r>20?10:ast.r>12?20:50;if($i('ass'))$i('ass').textContent=sc;if(ast.r>12){na.push(rA(ast.x,ast.y,ast.r*.55));na.push(rA(ast.x,ast.y,ast.r*.55));}}else na.push(ast);
    });
    asts=na;
    if(!asts.length)asts=[rA(),rA(),rA(),rA(),rA()];
    if(inv===0&&asts.some(ast=>Math.hypot(ship.x-ast.x,ship.y-ast.y)<ast.r-4)){
      lives--;if($i('asl'))$i('asl').textContent=lives;
      if(lives<=0){alive=false;window.addScore&&window.addScore('asteroids',sc);cancelAnimationFrame(loops.ast);if($i('asov'))$i('asov').textContent='game over';drw();return;}
      inv=120;
    }
    drw(); loops.ast=requestAnimationFrame(tick);
  };

  window._astart = () => {
    ship={x:W/2,y:H/2,vx:0,vy:0,a:0};asts=[rA(),rA(),rA(),rA()];bullets=[];sc=0;lives=3;alive=true;inv=60;
    if($i('ass'))$i('ass').textContent='0'; if($i('asl'))$i('asl').textContent='3'; if($i('asov'))$i('asov').textContent='';
    cancelAnimationFrame(loops.ast); loops.ast=requestAnimationFrame(tick);
  };
  document.addEventListener('keydown', e=>{
    keys[e.key]=true;
    if(e.key===' '&&alive&&bullets.length<5){e.preventDefault();bullets.push({x:ship.x+Math.sin(ship.a)*14,y:ship.y-Math.cos(ship.a)*14,vx:Math.sin(ship.a)*7,vy:-Math.cos(ship.a)*7,life:50});}
  });
  document.addEventListener('keyup', e=>{ delete keys[e.key]; });
  ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#222'; ctx.font='10px JetBrains Mono'; ctx.fillText('press start',W/2-48,H/2);
};

// ════════════════════════════════════════════════════
// MINESWEEPER
// ════════════════════════════════════════════════════
window.build_minesweeper = function (a) {
  var C=12, R=10, M=15, TS=28;
  var wrap=document.createElement('div'); wrap.style.cssText='display:flex;gap:14px;align-items:flex-start';
  var gEl=document.createElement('div'); gEl.style.cssText='display:grid;grid-template-columns:repeat('+C+','+TS+'px);gap:2px;background:#111;padding:3px;border:1px solid #1e1e1e';
  var sp=mkSP(`<div class="sb"><div class="sl">mines</div><div class="sv" id="msm">${M}</div></div><div class="sb"><div class="sl">time</div><div class="sv" id="mst">0</div></div><button class="gbtn" onclick="window._msstart()">new game</button><div class="gover" id="msov"></div><div class="hint">click reveal<br>right-click flag</div>`);
  wrap.appendChild(gEl); wrap.appendChild(sp); a.appendChild(wrap);

  var cells, tmr, elapsed, started;
  var idx = (r,c) => r*C+c;
  var nb2 = (r,c) => { var n=[]; for(var dr=-1;dr<=1;dr++) for(var dc=-1;dc<=1;dc++) { if(dr||dc){var nr=r+dr,nc=c+dc;if(nr>=0&&nr<R&&nc>=0&&nc<C)n.push({r:nr,c:nc});}} return n; };
  var ren = () => {
    Array.from(gEl.children).forEach((el,i)=>{
      var r=Math.floor(i/C),c=i%C,cell=cells[i];
      el.textContent=''; el.style.background=cell.rev?'#1a1a1a':'#222'; el.style.color='#fff'; el.style.border='1px solid '+(cell.rev?'#111':'#2a2a2a');
      if(cell.flag&&!cell.rev){el.textContent='⚑';el.style.color='#666';}
      else if(cell.rev){if(cell.mine){el.textContent='✦';el.style.background='#200';}else if(cell.cnt>0){el.textContent=cell.cnt;var cc=['','#8af','#8f8','#f88','#88f','#f8f','#8ff','#ff8','#aaa'];el.style.color=cc[cell.cnt]||'#fff';}}
    });
  };
  var reveal = (r,c) => { if(r<0||r>=R||c<0||c>=C)return;var cell=cells[idx(r,c)];if(cell.rev||cell.flag)return;cell.rev=true;if(!cell.cnt&&!cell.mine)nb2(r,c).forEach(n=>reveal(n.r,n.c)); };

  window._msstart = () => {
    clearInterval(tmr); elapsed=0; started=false;
    if($i('mst'))$i('mst').textContent='0'; if($i('msov'))$i('msov').textContent='';
    cells=Array.from({length:R*C},()=>({mine:false,rev:false,flag:false,cnt:0}));
    var placed=0; while(placed<M){var ri=Math.floor(Math.random()*R*C);if(!cells[ri].mine){cells[ri].mine=true;placed++;}}
    cells.forEach((cell,i)=>{if(!cell.mine){var r=Math.floor(i/C),c=i%C;cell.cnt=nb2(r,c).filter(n=>cells[idx(n.r,n.c)].mine).length;}});
    gEl.innerHTML='';
    cells.forEach((cell,i)=>{
      var el=document.createElement('div');
      el.style.cssText='width:'+TS+'px;height:'+TS+'px;display:flex;align-items:center;justify-content:center;font-size:10px;font-family:JetBrains Mono,monospace;cursor:pointer;user-select:none';
      var r=Math.floor(i/C),c=i%C;
      el.addEventListener('click',()=>{
        if(!started){started=true;tmr=setInterval(()=>{elapsed++;if($i('mst'))$i('mst').textContent=elapsed;},1000);}
        if(cell.flag||cell.rev)return;
        if(cell.mine){cells.forEach(cc=>{if(cc.mine)cc.rev=true;});ren();clearInterval(tmr);if($i('msov'))$i('msov').textContent='boom!';return;}
        reveal(r,c);ren();
        if(cells.every(cc=>cc.rev||cc.mine)){clearInterval(tmr);window.addScore&&window.addScore('minesweeper',Math.max(0,1000-elapsed*5));if($i('msov'))$i('msov').textContent='cleared!';}
      });
      el.addEventListener('contextmenu',e=>{e.preventDefault();if(!cell.rev)cell.flag=!cell.flag;ren();});
      gEl.appendChild(el);
    });
    ren();
  };
  window._msstart();
};

// ════════════════════════════════════════════════════
// 2048
// ════════════════════════════════════════════════════
window.build_g2048 = function (a) {
  var S=4, TS=76, G=5;
  var wrap=document.createElement('div'); wrap.style.cssText='display:flex;gap:14px;align-items:flex-start';
  var bEl=document.createElement('div'); bEl.style.cssText='display:grid;grid-template-columns:repeat(4,'+TS+'px);gap:'+G+'px;background:#111;padding:'+G+'px;border:1px solid #1e1e1e';
  var sp=mkSP(`<div class="sb"><div class="sl">score</div><div class="sv" id="g2s">0</div></div><div class="sb"><div class="sl">best</div><div class="sv" id="g2b">0</div></div><button class="gbtn" onclick="window._2start()">new game</button><div class="gover" id="g2ov"></div><div class="hint">arrow keys<br>merge to 2048!</div>`);
  wrap.appendChild(bEl); wrap.appendChild(sp); a.appendChild(wrap);

  var grid, sc, best=0;
  var emp = () => grid.flatMap((r,ri)=>r.map((v,ci)=>v===0?{r:ri,c:ci}:null)).filter(Boolean);
  var addR = () => { var e=emp();if(!e.length)return;var en=e[Math.floor(Math.random()*e.length)];grid[en.r][en.c]=Math.random()<.9?2:4; };
  var COLS = {0:'#111',2:'#1a1a1a',4:'#222',8:'#2a2a2a',16:'#333',32:'#3a3a3a',64:'#444',128:'#555',256:'#666',512:'#777',1024:'#888',2048:'#fff'};

  var ren = () => {
    bEl.innerHTML='';
    grid.forEach(row=>row.forEach(v=>{
      var c=document.createElement('div');
      c.style.cssText='width:'+TS+'px;height:'+TS+'px;display:flex;align-items:center;justify-content:center;font-size:'+(v>999?14:v>99?17:21)+'px;font-weight:700;font-family:JetBrains Mono,monospace;background:'+(COLS[v]||'#fff')+';color:'+(v>=128?'#000':'#ccc');
      c.textContent=v||''; bEl.appendChild(c);
    }));
    if($i('g2s'))$i('g2s').textContent=sc;
    if(sc>best){best=sc;if($i('g2b'))$i('g2b').textContent=best;}
  };

  var slide = row => { var r=row.filter(v=>v);for(var i=0;i<r.length-1;i++){if(r[i]===r[i+1]){r[i]*=2;sc+=r[i];r.splice(i+1,1);i++;}}while(r.length<S)r.push(0);return r; };
  var move = dir => {
    var old=JSON.stringify(grid);
    if(dir==='left')  grid=grid.map(r=>slide(r));
    else if(dir==='right') grid=grid.map(r=>slide([...r].reverse()).reverse());
    else if(dir==='up')  {for(var c=0;c<S;c++){var col=grid.map(r=>r[c]);col=slide(col);grid.forEach((r,ri)=>r[c]=col[ri]);}}
    else {for(var c=0;c<S;c++){var col=grid.map(r=>r[c]).reverse();col=slide(col).reverse();grid.forEach((r,ri)=>r[c]=col[ri]);}}
    if(JSON.stringify(grid)!==old)addR();ren();
    if(grid.some(r=>r.includes(2048))&&$i('g2ov')&&!$i('g2ov').textContent){$i('g2ov').textContent='2048!';window.addScore&&window.addScore('2048',sc);}
  };

  window._2start = () => { grid=Array.from({length:S},()=>Array(S).fill(0));sc=0;if($i('g2ov'))$i('g2ov').textContent='';addR();addR();ren(); };
  document.addEventListener('keydown', e=>{var m={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};if(m[e.key]){e.preventDefault();move(m[e.key]);}});
  window._2start();
};

// ════════════════════════════════════════════════════
// TIC-TAC-TOE
// ════════════════════════════════════════════════════
window.build_tictactoe = function (a) {
  var wrap=document.createElement('div'); wrap.style.cssText='display:flex;gap:14px;align-items:flex-start';
  var bEl=document.createElement('div'); bEl.style.cssText='display:grid;grid-template-columns:repeat(3,78px);gap:4px;background:#111;padding:4px;border:1px solid #1e1e1e';
  var sp=mkSP(`<div class="sb"><div class="sl">turn</div><div class="sv" id="tt">X</div></div><div class="sb"><div class="sl">wins</div><div class="sv" id="tw">0</div></div><button class="gbtn" onclick="window._ttstart()">new game</button><div class="gover" id="ttov"></div><div class="hint">you = X · vs CPU</div>`);
  wrap.appendChild(bEl); wrap.appendChild(sp); a.appendChild(wrap);

  var cells, wins=0, over;
  var WIN = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  var chk = () => WIN.find(l => cells[l[0]] && l.every(i => cells[i] === cells[l[0]]));
  var ren = () => { Array.from(bEl.children).forEach((el,i)=>{el.textContent=cells[i]||'';el.style.color=cells[i]==='X'?'#fff':'#666';el.style.background=cells[i]?'#1a1a1a':'#0d0d0d';}); };
  var ai  = () => {
    var emp=cells.map((v,i)=>v?null:i).filter(v=>v!==null);if(!emp.length)return;
    for(var x of emp){cells[x]='O';if(chk())return;cells[x]=null;}
    for(var x of emp){cells[x]='X';if(chk()){cells[x]='O';return;}cells[x]=null;}
    if(cells[4]===null){cells[4]='O';return;}
    var cor=[0,2,6,8].filter(i=>!cells[i]);if(cor.length){cells[cor[Math.floor(Math.random()*cor.length)]]='O';return;}
    cells[emp[Math.floor(Math.random()*emp.length)]]='O';
  };

  window._ttstart = () => {
    cells=Array(9).fill(null); over=false;
    if($i('ttov'))$i('ttov').textContent=''; if($i('tt'))$i('tt').textContent='X';
    bEl.innerHTML='';
    cells.forEach((_,i)=>{
      var el=document.createElement('div');
      el.style.cssText='width:78px;height:78px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;font-family:JetBrains Mono,monospace;cursor:pointer;background:#0d0d0d;border:1px solid #1a1a1a';
      el.addEventListener('click',()=>{
        if(over||cells[i])return;
        cells[i]='X';ren();
        var w=chk();if(w){over=true;wins++;if($i('tw'))$i('tw').textContent=wins;if($i('ttov'))$i('ttov').textContent='you win!';window.addScore&&window.addScore('tictactoe',wins*100);return;}
        if(cells.every(v=>v)){over=true;if($i('ttov'))$i('ttov').textContent='draw';return;}
        if($i('tt'))$i('tt').textContent='O';
        setTimeout(()=>{ai();ren();var w2=chk();if(w2){over=true;if($i('ttov'))$i('ttov').textContent='cpu wins!';}else if(cells.every(v=>v)){over=true;if($i('ttov'))$i('ttov').textContent='draw';}if($i('tt')&&!over)$i('tt').textContent='X';},300);
      });
      bEl.appendChild(el);
    });
    ren();
  };
  window._ttstart();
};

// ════════════════════════════════════════════════════
// MEMORY
// ════════════════════════════════════════════════════
window.build_memory = function (a) {
  var SYM = ['▲','▼','◆','●','■','★','✦','◈','⬡','▬','⊞','✕'];
  var wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;gap:10px;align-items:center';
  var info=document.createElement('div'); info.style.cssText='display:flex;gap:10px';
  info.innerHTML='<div class="sb" style="padding:7px 14px"><div class="sl">moves</div><div class="sv" id="mm">0</div></div><div class="sb" style="padding:7px 14px"><div class="sl">pairs</div><div class="sv" id="mp">0</div></div>';
  var gEl=document.createElement('div'); gEl.style.cssText='display:grid;grid-template-columns:repeat(6,50px);gap:5px';
  var btn=document.createElement('button'); btn.className='gbtn'; btn.style.width='120px'; btn.textContent='new game'; btn.onclick=()=>window._memstart();
  wrap.appendChild(info); wrap.appendChild(gEl); wrap.appendChild(btn); a.appendChild(wrap);

  var cards, flipped, matched, moves, locked;
  window._memstart = () => {
    moves=0;matched=0;flipped=[];locked=false;
    if($i('mm'))$i('mm').textContent='0'; if($i('mp'))$i('mp').textContent='0';
    var deck=[...SYM,...SYM].sort(()=>Math.random()-.5);
    cards=deck.map((s,i)=>({sym:s,id:i,rev:false,ok:false}));
    gEl.innerHTML='';
    cards.forEach(card=>{
      var el=document.createElement('div');
      el.style.cssText='width:50px;height:50px;display:flex;align-items:center;justify-content:center;font-size:17px;background:#1a1a1a;border:1px solid #222;cursor:pointer';
      el.addEventListener('click',()=>{
        if(locked||card.rev||card.ok)return;
        card.rev=true;el.textContent=card.sym;el.style.background='#2a2a2a';
        flipped.push({card,el});
        if(flipped.length===2){
          moves++;if($i('mm'))$i('mm').textContent=moves;locked=true;
          var x=flipped[0],y=flipped[1];
          if(x.card.sym===y.card.sym){
            x.card.ok=y.card.ok=true;x.el.style.background='#1a2a1a';y.el.style.background='#1a2a1a';
            matched++;if($i('mp'))$i('mp').textContent=matched;flipped=[];locked=false;
            if(matched===SYM.length)window.addScore&&window.addScore('memory',Math.max(100,500-moves*10));
          }else{
            setTimeout(()=>{x.card.rev=y.card.rev=false;x.el.textContent='';y.el.textContent='';x.el.style.background='#1a1a1a';y.el.style.background='#1a1a1a';flipped=[];locked=false;},700);
          }
        }
      });
      gEl.appendChild(el);
    });
  };
  window._memstart();
};

// ════════════════════════════════════════════════════
// TYPING TEST
// ════════════════════════════════════════════════════
window.build_typing = function (a) {
  var WDS = ['the','quick','brown','fox','jumps','over','lazy','dog','terminal','keyboard','binary','syntax','module','function','variable','system','network','pixel','cipher','stack','queue','array','loop','class','type','void','null','echo','port','shell'];
  var wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;gap:10px;max-width:440px';
  var stats=document.createElement('div'); stats.style.cssText='display:flex;gap:8px';
  stats.innerHTML='<div class="sb" style="flex:1;padding:7px"><div class="sl">wpm</div><div class="sv" id="twpm">—</div></div><div class="sb" style="flex:1;padding:7px"><div class="sl">acc</div><div class="sv" id="tacc">—</div></div><div class="sb" style="flex:1;padding:7px"><div class="sl">time</div><div class="sv" id="ttime">30</div></div>';
  var disp=document.createElement('div'); disp.style.cssText='background:#0d0d0d;border:1px solid #1e1e1e;padding:12px;font-size:12px;line-height:2;color:#333;font-family:JetBrains Mono,monospace;min-height:76px';
  var inp=document.createElement('input'); inp.style.cssText='background:#0d0d0d;border:1px solid #1e1e1e;color:#fff;font-family:JetBrains Mono,monospace;font-size:12px;padding:8px 10px;outline:none;width:100%'; inp.placeholder='click here and type...';
  var btn=document.createElement('button'); btn.className='gbtn'; btn.style.width='120px'; btn.textContent='restart'; btn.onclick=()=>window._typstart();
  wrap.appendChild(stats); wrap.appendChild(disp); wrap.appendChild(inp); wrap.appendChild(btn); a.appendChild(wrap);

  var seq, cur, correct, wrong, timeLeft, running;
  var mkSeq = () => Array.from({length:50},()=>WDS[Math.floor(Math.random()*WDS.length)]);
  var ren   = () => { disp.innerHTML=seq.map((w,i)=>`<span style="color:${i<cur?'#333':i===cur?'#fff':'inherit'};${i===cur?'border-bottom:1px solid #fff':''}">${w} </span>`).join(''); };

  inp.addEventListener('input',()=>{
    if(!running)return;
    var v=inp.value;
    if(v.endsWith(' ')){var g=v.trim();if(g===seq[cur])correct++;else wrong++;cur++;inp.value='';ren();}
  });

  window._typstart = () => {
    seq=mkSeq();cur=0;correct=0;wrong=0;timeLeft=30;running=true;inp.disabled=false;inp.value='';
    if($i('ttime'))$i('ttime').textContent='30'; if($i('twpm'))$i('twpm').textContent='—'; if($i('tacc'))$i('tacc').textContent='—';
    ren();
    clearInterval(loops.typ);
    loops.typ=setInterval(()=>{
      timeLeft--;if($i('ttime'))$i('ttime').textContent=timeLeft;
      if(timeLeft<=0){
        clearInterval(loops.typ);running=false;inp.disabled=true;
        var wpm=correct*2,acc=correct+wrong>0?Math.round(correct/(correct+wrong)*100):0;
        if($i('twpm'))$i('twpm').textContent=wpm; if($i('tacc'))$i('tacc').textContent=acc+'%';
        window.addScore&&window.addScore('typing',wpm);
      }
    },1000);
    inp.focus();
  };
  window._typstart();
};

// ════════════════════════════════════════════════════
// WORD GUESS
// ════════════════════════════════════════════════════
window.build_wordle = function (a) {
  var WORDS = ['crane','storm','blink','plumb','frost','chess','ghost','plant','stone','drive','flame','brush','clock','bread','light','night','space','black','white','green','sword','tower','track','queen','pixel','bytes','cache','debug','parse','logic'];
  var wrap=document.createElement('div'); wrap.style.cssText='display:flex;gap:14px;align-items:flex-start';
  var left=document.createElement('div'); left.style.cssText='display:flex;flex-direction:column;gap:8px;align-items:center';
  var gEl=document.createElement('div'); gEl.style.cssText='display:flex;flex-direction:column;gap:4px';
  var inp=document.createElement('input'); inp.style.cssText='background:#0d0d0d;border:1px solid #1e1e1e;color:#fff;font-family:JetBrains Mono,monospace;font-size:12px;padding:7px 10px;width:200px;outline:none;text-transform:uppercase;letter-spacing:3px'; inp.maxLength=5; inp.placeholder='GUESS';
  var sub=document.createElement('button'); sub.className='gbtn'; sub.style.width='200px'; sub.textContent='submit';
  left.appendChild(gEl); left.appendChild(inp); left.appendChild(sub);
  var sp=mkSP(`<div class="sb"><div class="sl">try</div><div class="sv" id="wa">0/6</div></div><div class="sb"><div class="sl">wins</div><div class="sv" id="ww">0</div></div><button class="gbtn" onclick="window._wrdstart()">new word</button><div class="gover" id="wov"></div><div class="hint">5-letter word<br>■ right place<br>▨ wrong place<br>⬜ not in word</div>`);
  wrap.appendChild(left); wrap.appendChild(sp); a.appendChild(wrap);

  var word, guesses, wins=0, done;
  var mkRows = () => {
    gEl.innerHTML='';
    for(var r=0;r<6;r++){
      var row=document.createElement('div'); row.style.cssText='display:flex;gap:4px';
      for(var c=0;c<5;c++){var cell=document.createElement('div');cell.id='wc-'+r+'-'+c;cell.style.cssText='width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;font-family:JetBrains Mono,monospace;background:#111;border:1px solid #1e1e1e;color:#fff';row.appendChild(cell);}
      gEl.appendChild(row);
    }
  };

  var guess = () => {
    if(done)return;
    var g=inp.value.toUpperCase().trim();
    if(g.length!==5){inp.style.borderColor='#f44';setTimeout(()=>inp.style.borderColor='#1e1e1e',400);return;}
    var row=guesses;guesses++;if($i('wa'))$i('wa').textContent=guesses+'/6';inp.value='';
    var wA=[...word.toUpperCase()],res=Array(5).fill('n'),used=Array(5).fill(false);
    for(var i=0;i<5;i++){if(g[i]===wA[i]){res[i]='c';used[i]=true;}}
    for(var i=0;i<5;i++){if(res[i]==='c')continue;var j=wA.findIndex((l,idx)=>l===g[i]&&!used[idx]);if(j>=0){res[i]='p';used[j]=true;}}
    for(var i=0;i<5;i++){var cell=$i('wc-'+row+'-'+i);if(cell){cell.textContent=g[i];cell.style.background=res[i]==='c'?'#1a3a1a':res[i]==='p'?'#2a2a0a':'#1a1a1a';cell.style.borderColor=res[i]==='c'?'#4f4':res[i]==='p'?'#cc0':'#333';}}
    if(g===word.toUpperCase()){done=true;wins++;if($i('ww'))$i('ww').textContent=wins;window.addScore&&window.addScore('wordle',100+(6-row)*20);if($i('wov'))$i('wov').textContent='correct!';}
    else if(guesses===6){done=true;if($i('wov'))$i('wov').textContent='word: '+word.toUpperCase();}
  };

  sub.addEventListener('click', guess);
  inp.addEventListener('keydown', e => { if(e.key==='Enter')guess(); });

  window._wrdstart = () => { word=WORDS[Math.floor(Math.random()*WORDS.length)];guesses=0;done=false;if($i('wa'))$i('wa').textContent='0/6';if($i('wov'))$i('wov').textContent='';mkRows(); };
  window._wrdstart();
};