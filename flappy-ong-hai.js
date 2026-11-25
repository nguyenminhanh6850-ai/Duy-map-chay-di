/* FLAPPY ÔNG HAI — mini-game độc lập, đăng ký qua window.GameBridge.registerMiniGame */
(function () {
  'use strict';
  const GB = window.GameBridge;
  if (!GB || typeof GB.registerMiniGame !== 'function') return;

  const ID = 'flappy_ong_hai';
  const FEE = 2000;
  const BEST_KEY = 'duyMapFlappyOngHaiBest';
  const W = 720, H = 360;
  const GROUND_H = 34;

  // Vật lý & độ khó
  const GRAVITY = 1050, FLAP_V = -330, MAX_FALL = 460;
  const PIPE_W = 56, PIPE_SPEED = 185, PIPE_SPACING = 250;
  const GAP_START = 136, GAP_MIN = 94, GAP_SHRINK = 2.0;
  const CAP_H = 20, CAP_OVER = 5;

  // Nhân vật
  const OH = { x: 140, w: 40, h: 54 };      // kích thước vẽ ảnh Ông Hai
  const HIT = { rx: 15, ry: 22 };         // hitbox elip của Ông Hai (khoan dung)
  const PIPE_LEN = 54, PIPE_T = 8;        // điếu cày dưới chân

  const fmt = (n) => Math.floor(n).toLocaleString('vi-VN');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const unlocked = () => !!(GB.bossUnlocked || GB.miniKeys >= 3);

  function readBest() { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (_) { return 0; } }
  function writeBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (_) { /* optional */ } }

  // ---------- Phần thưởng ----------
  function calcReward(n) {
    let tier = null;
    if (n >= 50) tier = { label: '50+ ống', crystal: 35, coin: 5000 };
    else if (n >= 20) tier = { label: '20 – 49 ống', crystal: 15, coin: 2000 };
    else if (n >= 10) tier = { label: '10 – 19 ống', crystal: 10, coin: 1000 };
    else if (n >= 5) tier = { label: '5 – 9 ống', crystal: 5, coin: 1000 };
    const baseCoin = n * 100;
    const bonusCoin = tier ? tier.coin : 0;
    const crystal = tier ? tier.crystal : 0;
    return { tier, baseCoin, bonusCoin, crystal, totalCoin: baseCoin + bonusCoin };
  }

  // ---------- Ảnh Ông Hai ----------
  const img = new Image();
  let imgOk = false;
  img.onload = () => {
    if (img.naturalWidth && img.naturalHeight) OH.w = Math.round(OH.h * (img.naturalWidth / img.naturalHeight));
    imgOk = true;
  };
  img.src = 'assets/ong-hai.png';

  // ---------- UI (tạo lười khi mở) ----------
  let overlay, canvas, ctx, hudEl, panelEl, styleInjected = false;

  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    const s = document.createElement('style');
    s.textContent = `
      #flappyOverlay{position:fixed;inset:0;z-index:20000;background:#000;display:flex;align-items:center;justify-content:center;margin:0;padding:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
      #flappyOverlay[hidden]{display:none}
      #flappyOverlay .fl-wrap{position:relative;width:100vw;height:100vh;height:100dvh;max-width:none}
      #flappyOverlay canvas{width:100%;height:100%;display:block;object-fit:contain;background:#87ceeb;touch-action:none;border:0;border-radius:0}
      #flappyOverlay .fl-top{position:absolute;top:calc(10px + env(safe-area-inset-top,0px));left:calc(14px + env(safe-area-inset-left,0px));right:calc(14px + env(safe-area-inset-right,0px));z-index:2;display:flex;justify-content:space-between;align-items:center;gap:8px;color:#fff;font-weight:800;font-size:14px;text-shadow:0 1px 3px rgba(0,0,0,.8);pointer-events:none}
      #flappyOverlay .fl-exit{pointer-events:auto;background:#b3261e;color:#fff;border:0;border-radius:10px;padding:6px 12px;font-weight:800;cursor:pointer;text-shadow:none}
      #flappyOverlay .fl-panel{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto}
      #flappyOverlay .fl-panel[hidden]{display:none}
      #flappyOverlay .fl-box{background:rgba(30,20,10,.94);border:2px solid #c9953a;border-radius:14px;color:#fff;padding:14px 16px;width:100%;max-width:300px;text-align:center;font-size:14px;line-height:1.5}
      #flappyOverlay .fl-box h3{margin:0 0 6px;font-size:20px;color:#ffd34d}
      #flappyOverlay .fl-row{display:flex;justify-content:space-between;gap:8px;text-align:left}
      #flappyOverlay .fl-sep{border-top:1px dashed rgba(255,255,255,.25);margin:6px 0}
      #flappyOverlay .fl-total{font-size:16px;font-weight:900;color:#8ff5a8}
      #flappyOverlay .fl-btns{display:flex;gap:8px;margin-top:10px}
      #flappyOverlay .fl-btns button{flex:1;border:0;border-radius:10px;padding:9px 6px;font-weight:800;cursor:pointer;background:#e8c46a;color:#3a240f}
      #flappyOverlay .fl-btns button.alt{background:#555;color:#fff}
      #flappyOverlay .fl-btns button:disabled{opacity:.5;cursor:not-allowed}
      @media (max-height:460px){
        #flappyOverlay .fl-panel{padding:44px 10px 8px}
        #flappyOverlay .fl-box{padding:8px 12px;font-size:12px;line-height:1.35;max-width:340px}
        #flappyOverlay .fl-box h3{font-size:16px;margin-bottom:3px}
        #flappyOverlay .fl-sep{margin:3px 0}
        #flappyOverlay .fl-total{font-size:14px}
        #flappyOverlay .fl-btns{margin-top:6px}
        #flappyOverlay .fl-btns button{padding:6px 4px}
      }
    `;
    document.head.appendChild(s);
  }

  function buildOverlay() {
    injectStyle();
    overlay = document.createElement('div');
    overlay.id = 'flappyOverlay';
    overlay.innerHTML = `
      <div class="fl-top"><span>🚬 FLAPPY ÔNG HAI</span><span id="flHud"></span><button type="button" class="fl-exit" id="flExit">✕ Thoát</button></div>
      <div class="fl-wrap">
        <canvas id="flCanvas" width="${W}" height="${H}"></canvas>
        <div class="fl-panel" id="flPanel" hidden></div>
      </div>`;
    document.body.appendChild(overlay);
    canvas = overlay.querySelector('#flCanvas');
    ctx = canvas.getContext('2d');
    hudEl = overlay.querySelector('#flHud');
    panelEl = overlay.querySelector('#flPanel');

    canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); flap(); });
    canvas.addEventListener('mousedown', (e) => e.preventDefault());
    overlay.querySelector('#flExit').addEventListener('click', onExitBtn);
    panelEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-fl]');
      if (!b) return;
      if (b.dataset.fl === 'again') tryStart();
      else if (b.dataset.fl === 'quit') closeOverlay();
    });
  }

  // ---------- Trạng thái trò chơi ----------
  let phase = 'closed';   // closed | ready | running | over
  let bird, pipes, particles, score, best, lastT, raf, nextPipeX, groundX, rewardGiven, tClock;

  function resetRun() {
    bird = { y: H * 0.42, vy: 0, rot: 0 };
    pipes = []; particles = [];
    score = 0; groundX = 0; tClock = 0; rewardGiven = false;
    nextPipeX = W + 120;
    best = readBest();
  }

  function gapFor(n) { return Math.max(GAP_MIN, GAP_START - n * GAP_SHRINK); }

  function spawnPipe(x) {
    const gap = gapFor(score);
    const margin = 36;
    const top = margin + Math.random() * (H - GROUND_H - gap - margin * 2);
    pipes.push({ x, top, gap, passed: false });
  }

  function puff() {
    const px = OH.x - 6, py = bird.y + OH.h * 0.55;
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: px + (Math.random() - 0.5) * 8, y: py + (Math.random() - 0.5) * 8,
        vx: -30 - Math.random() * 40, vy: -10 + Math.random() * 30,
        r: 4 + Math.random() * 4, life: 0.7 + Math.random() * 0.4, max: 1.1
      });
    }
  }

  function flap() {
    if (phase === 'ready') {
      phase = 'running'; panelEl.hidden = true; lastT = performance.now();
    }
    if (phase !== 'running') return;
    bird.vy = FLAP_V;
    puff();
    GB.playTone(520, 0.08, 'triangle', 0.03);
  }

  // ---------- Bắt đầu / trừ phí ----------
  function tryStart() {
    if (!unlocked()) { GB.showToast('🔒 Cần đủ 3/3 Key hoặc đã mở khóa Boss.'); return false; }
    if (GB.coinBalance < FEE) { GB.showToast(`Chưa đủ ${fmt(FEE)} Coin để chơi.`); return false; }
    GB.coinBalance -= FEE;
    GB.saveEconomy();
    GB.updateLobby();
    GB.closeModal();
    if (!overlay) buildOverlay();
    overlay.hidden = false;
    resetRun();
    phase = 'ready';
    showReadyPanel();
    updateHud();
    attachKeys();
    cancelAnimationFrame(raf);
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
    return true;
  }

  function showReadyPanel() {
    panelEl.hidden = false;
    panelEl.style.pointerEvents = 'none';
    panelEl.innerHTML = `<div class="fl-box"><h3>🚬 SẴN SÀNG?</h3>Chạm / Space / ↑ / W để bay.<br>Né ống điếu tre, vượt càng nhiều càng thưởng lớn.<br><b>Chạm để bắt đầu</b></div>`;
  }

  function updateHud() {
    if (hudEl) hudEl.textContent = `Ống: ${score} · Kỷ lục: ${best}`;
  }

  // ---------- Kết thúc ----------
  function gameOver() {
    if (phase !== 'running') return;
    phase = 'over';
    GB.playTone(140, 0.35, 'sawtooth', 0.05);
    const prevBest = readBest();
    const newBest = score > prevBest;
    if (newBest) { best = score; writeBest(best); }
    updateHud();
    const r = calcReward(score);
    if (!rewardGiven) {
      rewardGiven = true;
      if (r.crystal > 0 || r.totalCoin > 0) GB.addReward(r.crystal, r.totalCoin);
    }
    panelEl.hidden = false;
    panelEl.style.pointerEvents = 'auto';
    const canAgain = unlocked() && GB.coinBalance >= FEE;
    panelEl.innerHTML = `
      <div class="fl-box">
        <h3>💥 GAME OVER</h3>
        <div class="fl-row"><span>Số ống vượt qua</span><b>${score}</b></div>
        <div class="fl-row"><span>Kỷ lục</span><b>${best}${newBest ? ' 🏆 Mới!' : ''}</b></div>
        <div class="fl-sep"></div>
        <div class="fl-row"><span>Thưởng cơ bản (${score} × 100)</span><b>🪙 ${fmt(r.baseCoin)}</b></div>
        <div class="fl-row"><span>Mốc ${r.tier ? r.tier.label : '(chưa đạt, cần ≥ 5 ống)'}</span><b>${r.tier ? `💎 ${r.crystal} · 🪙 ${fmt(r.bonusCoin)}` : '—'}</b></div>
        <div class="fl-sep"></div>
        <div class="fl-total">Tổng nhận: 💎 ${r.crystal} · 🪙 ${fmt(r.totalCoin)}</div>
        <div class="fl-btns">
          <button type="button" data-fl="again" ${canAgain ? '' : 'disabled'}>🔁 Chơi lại (🪙 ${fmt(FEE)})</button>
          <button type="button" class="alt" data-fl="quit">Thoát</button>
        </div>
      </div>`;
  }

  function onExitBtn() {
    if (phase === 'running') gameOver(); else closeOverlay();
  }

  function closeOverlay() {
    phase = 'closed';
    cancelAnimationFrame(raf);
    detachKeys();
    if (overlay) overlay.hidden = true;
    try { GB.renderMini(); } catch (_) { /* optional */ }
    GB.updateLobby();
  }

  // ---------- Bàn phím ----------
  function onKey(e) {
    if (phase === 'closed') return;
    const c = e.code;
    if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) flap();
    } else if (c === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation();
      onExitBtn();
    }
  }
  function attachKeys() { window.addEventListener('keydown', onKey, true); }
  function detachKeys() { window.removeEventListener('keydown', onKey, true); }

  // ---------- Vòng lặp ----------
  function loop(now) {
    if (phase === 'closed') return;
    const dt = Math.min(0.033, (now - lastT) / 1000 || 0);
    lastT = now;
    tClock += dt;
    if (phase === 'running') update(dt);
    else if (phase === 'ready') bird.y = H * 0.42 + Math.sin(tClock * 4) * 6;
    updateParticles(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    bird.vy = Math.min(MAX_FALL, bird.vy + GRAVITY * dt);
    bird.y += bird.vy * dt;
    bird.rot = clamp(bird.vy / 520, -0.5, 0.9) * 0.6;
    groundX = (groundX + PIPE_SPEED * dt) % 24;

    nextPipeX -= PIPE_SPEED * dt;
    if (nextPipeX <= W) { spawnPipe(nextPipeX); nextPipeX += PIPE_SPACING; }
    pipes.forEach((p) => { p.x -= PIPE_SPEED * dt; });
    pipes = pipes.filter((p) => p.x > -PIPE_W - 20);

    const bx = OH.x;
    pipes.forEach((p) => {
      if (!p.passed && p.x + PIPE_W < bx - HIT.rx) {
        p.passed = true; score++;
        GB.playTone(880, 0.1, 'square', 0.03);
        if (score > best) best = score;
        updateHud();
      }
    });

    // Va chạm: đất / trần / ống
    const cy = bird.y + OH.h * 0.45;
    if (bird.y + OH.h + 4 >= H - GROUND_H) { bird.y = H - GROUND_H - OH.h - 4; return gameOver(); }
    if (bird.y < -20) { bird.y = -20; bird.vy = 0; }
    for (const p of pipes) {
      const l = p.x - CAP_OVER, r = p.x + PIPE_W + CAP_OVER;
      if (bx + HIT.rx > l && bx - HIT.rx < r) {
        if (cy - HIT.ry < p.top || cy + HIT.ry + 8 > p.top + p.gap) return gameOver();
      }
    }
  }

  function updateParticles(dt) {
    particles.forEach((q) => { q.x += q.vx * dt; q.y += q.vy * dt; q.r += 6 * dt; q.life -= dt; });
    particles = particles.filter((q) => q.life > 0);
    if (phase === 'running' && Math.random() < dt * 8) {
      // nõ điếu âm ỉ khói nhẹ
      particles.push({ x: OH.x + PIPE_LEN * 0.4 + 14, y: bird.y + OH.h * 0.92 - 14, vx: -20, vy: -25, r: 3, life: 0.5, max: 1.1 });
    }
  }

  // ---------- Vẽ ----------
  function roundedPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#7ec8f0'); g.addColorStop(1, '#d9f2e6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // mây
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    [[60, 70, 1], [220, 120, 0.8], [330, 50, 0.6], [470, 90, 0.9], [620, 60, 0.7]].forEach(([cx, cy, s], i) => {
      const ox = ((cx - tClock * 8 * s - 0) % (W + 120) + (W + 120)) % (W + 120) - 60;
      ctx.beginPath();
      ctx.arc(ox, cy, 16 * s, 0, 7); ctx.arc(ox + 18 * s, cy + 4, 13 * s, 0, 7); ctx.arc(ox - 18 * s, cy + 5, 12 * s, 0, 7);
      ctx.fill();
    });
    // đồi xa
    ctx.fillStyle = '#9fd3a6';
    ctx.beginPath(); ctx.moveTo(0, H - GROUND_H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H - GROUND_H - 38 - Math.sin(x * 0.03 + 1) * 14);
    ctx.lineTo(W, H - GROUND_H); ctx.closePath(); ctx.fill();
  }

  function drawGround() {
    ctx.fillStyle = '#8a5a1c'; ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
    ctx.fillStyle = '#5da84a'; ctx.fillRect(0, H - GROUND_H, W, 8);
    ctx.fillStyle = '#6e4515';
    for (let x = -24 + (24 - groundX); x < W; x += 24) ctx.fillRect(x, H - GROUND_H + 14, 12, 4);
  }

  function bambooBody(x, y, w, h, vertical) {
    const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#e8c46a'); g.addColorStop(0.45, '#c9953a'); g.addColorStop(1, '#8a5a1c');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    // highlight
    ctx.fillStyle = 'rgba(255,240,180,.4)';
    ctx.fillRect(x + w * 0.2, y, 3, h);
  }

  function drawPipe(p) {
    const x = p.x, bottomY = p.top + p.gap;
    ctx.save();
    // ống trên
    bambooBody(x, 0, PIPE_W, p.top - CAP_H, true);
    // ống dưới
    bambooBody(x, bottomY + CAP_H, PIPE_W, H - GROUND_H - bottomY - CAP_H, true);
    // đốt tre
    ctx.strokeStyle = '#7a4c14'; ctx.lineWidth = 3;
    for (let y = p.top - CAP_H - 38; y > -10; y -= 46) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + PIPE_W, y); ctx.stroke(); }
    for (let y = bottomY + CAP_H + 38; y < H - GROUND_H; y += 46) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + PIPE_W, y); ctx.stroke(); }
    // miệng loe
    const capGrad = (y) => { const g = ctx.createLinearGradient(x - CAP_OVER, 0, x + PIPE_W + CAP_OVER, 0); g.addColorStop(0, '#f0d27f'); g.addColorStop(0.5, '#cf9a3c'); g.addColorStop(1, '#8a5a1c'); return g; };
    ctx.fillStyle = capGrad();
    roundedPath(x - CAP_OVER, p.top - CAP_H, PIPE_W + CAP_OVER * 2, CAP_H, 6); ctx.fill();
    ctx.strokeStyle = '#5e3b1c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = capGrad();
    roundedPath(x - CAP_OVER, bottomY, PIPE_W + CAP_OVER * 2, CAP_H, 6); ctx.fill();
    ctx.stroke();
    // lòng ống tối
    ctx.fillStyle = 'rgba(43,26,13,.55)';
    ctx.fillRect(x + 4, p.top - 5, PIPE_W - 8, 4);
    ctx.fillRect(x + 4, bottomY + 1, PIPE_W - 8, 4);
    ctx.restore();
  }

  // Điếu cày (theo drawOngHaiPipe trong game.js)
  function drawDieuCay(cx, cy, ang) {
    const L = PIPE_LEN, T = PIPE_T;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.fillStyle = '#5e3b1c'; // bình nước
    ctx.beginPath();
    ctx.moveTo(-L * 0.34, T * 0.4); ctx.lineTo(-L * 0.04, T * 0.4); ctx.lineTo(-L * 0.08, T * 1.5); ctx.lineTo(-L * 0.30, T * 1.5);
    ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(0, -T / 2, 0, T / 2);
    g.addColorStop(0, '#e8c46a'); g.addColorStop(0.5, '#c9953a'); g.addColorStop(1, '#8a5a1c');
    ctx.fillStyle = g;
    roundedPath(-L / 2, -T / 2, L, T, T / 2); ctx.fill();
    ctx.strokeStyle = '#7a4c14'; ctx.lineWidth = 2; // đốt đai
    [-0.28, -0.05, 0.2].forEach((n) => { ctx.beginPath(); ctx.moveTo(L * n, -T / 2); ctx.lineTo(L * n, T / 2); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(255,240,180,.55)';
    ctx.beginPath(); ctx.moveTo(-L / 2 + T / 2, -T * 0.2); ctx.lineTo(L / 2 - T / 2, -T * 0.2); ctx.stroke();
    const bx = L * 0.4; // nõ điếu
    ctx.fillStyle = '#6b4423';
    ctx.beginPath();
    ctx.moveTo(bx - T * 0.45, -T * 0.4); ctx.lineTo(bx - T * 0.7, -T * 1.7); ctx.lineTo(bx + T * 0.7, -T * 1.7); ctx.lineTo(bx + T * 0.45, -T * 0.4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b1a0d';
    ctx.beginPath(); ctx.ellipse(bx, -T * 1.7, T * 0.7, T * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,120,40,${0.6 + Math.sin(tClock * 18) * 0.3})`; // đốm lửa
    ctx.beginPath(); ctx.arc(bx, -T * 1.72, T * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a240f';
    ctx.beginPath(); ctx.ellipse(-L / 2 + T * 0.15, 0, T * 0.28, T * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawOngHai() {
    const cx = OH.x, top = bird.y;
    ctx.save();
    ctx.translate(cx, top + OH.h * 0.5);
    ctx.rotate(bird.rot);
    ctx.translate(-cx, -(top + OH.h * 0.5));
    // điếu cày dưới chân
    drawDieuCay(cx + 2, top + OH.h * 0.92, -0.08);
    if (imgOk) {
      ctx.drawImage(img, cx - OH.w / 2, top, OH.w, OH.h);
    } else {
      ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.arc(cx, top + 14, 13, 0, 7); ctx.fill();
      ctx.fillStyle = '#4a6a3a'; roundedPath(cx - 15, top + 26, 30, 28, 8); ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach((q) => {
      ctx.globalAlpha = clamp(q.life / q.max, 0, 1) * 0.75;
      ctx.fillStyle = '#f4f4f4';
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = clamp(q.life / q.max, 0, 1) * 0.35;
      ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = 1; ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function drawScore() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 40px system-ui, sans-serif';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(40,24,8,.85)';
    ctx.strokeText(String(score), W / 2, 56);
    ctx.fillStyle = '#fff'; ctx.fillText(String(score), W / 2, 56);
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(40,24,8,.85)';
    ctx.fillText(`Kỷ lục: ${best} · Khe: ${Math.round(gapFor(score))}`, W / 2, 76);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    pipes.forEach(drawPipe);
    drawGround();
    drawParticles();
    drawOngHai();
    drawScore();
    if (phase === 'over') { ctx.fillStyle = 'rgba(180,20,20,.18)'; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- Đăng ký vào popup Mini-game ----------
  GB.registerMiniGame({
    id: ID,
    render() {
      const ok = unlocked();
      const b = readBest();
      return `
        <div class="mini-card" data-mini="${ID}">
          <div class="mini-info">
            <h3>🚬 FLAPPY ÔNG HAI</h3>
            <p>Điều khiển Ông Hai bay trên điếu cày, né ống điếu tre. Mỗi ống +🪙 100, đạt mốc 5 / 10 / 20 / 50 ống nhận thêm 💎 và 🪙.</p>
            <p><b>Kỷ lục:</b> ${b} ống · <b>Phí:</b> 🪙 ${fmt(FEE)} / lượt</p>
            ${ok ? '' : '<p>🔒 Cần đủ 3/3 Key hoặc đã mở khóa Boss.</p>'}
          </div>
          <div class="card-actions">
            <button class="card-btn upgrade" type="button" data-flappy-play="1" ${ok ? '' : 'disabled'}>${ok ? `CHƠI NGAY <span class="cost">🪙 ${fmt(FEE)}</span>` : '🔒 CHƯA MỞ KHÓA'}</button>
          </div>
        </div>`;
    },
    onClick(event) {
      const btn = event.target.closest && event.target.closest('[data-flappy-play]');
      if (!btn || btn.disabled) return;
      tryStart();
    }
  });
})();
