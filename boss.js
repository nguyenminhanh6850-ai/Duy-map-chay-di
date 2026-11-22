// boss.js — Mini-game "Đánh Boss Xe Tăng" (V19), tách khỏi game.js.
// Nạp SAU game.js. Mọi tương tác với game đi qua window.GameBridge.
// Đăng ký vào popup Mini-game qua GameBridge.registerMiniGame(...) để sau này thêm mini-game thứ 2.
(() => {
  'use strict';

  const G = window.GameBridge;
  if (!G) {
    console.error('boss.js: thiếu window.GameBridge — hãy nạp game.js trước boss.js.');
    return;
  }

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.floor(n).toLocaleString('vi-VN');
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const random = (min, max) => G.random(min, max);   // dùng gameRand của game.js (đồng bộ seed Solo 1v1)
  const vfxRandom = (min, max) => min + Math.random() * (max - min);
  const player = G.player;                          // object cố định (const) trong game.js

  // =====================================================================
  // CẤU HÌNH — giữ nguyên 100% chỉ số của bản gốc
  // =====================================================================
  const BOSS_CFG = {
    name: 'XE TĂNG CHIẾN ĐẤU',
    maxHp: 300,          // tổng máu Boss
    rocketDmg: 5,        // hòm đạn → tên lửa bay thẳng
    bombDmg: 10,         // hòm bom → bay vòng cung, đau hơn
    lives: 2,            // số tim mặc định (giáp Lv4 / vật phẩm khiên cộng thêm qua spareHits)
    invuln: 1.2,         // giây bất tử sau khi trúng đòn
    telegraph: 0.7,      // giây hiện laser đỏ cảnh báo trước khi bắn đạn pháo
    missileWindup: 0.4,  // giây Boss nạp tên lửa trước khi phóng
    restMin: 1.3,        // nhịp nghỉ giữa các đợt ra chiêu
    restMax: 1.6,
    rageRate: 1.25,      // Phase 2: ra chiêu nhanh hơn 25%
    rageAt: 0.5,         // Phase 2 khi máu Boss còn ≤ 50%
    shellSpeed: 900,     // đạn pháo laser đỏ (px/s) — Phase 1
    shellSpeedRage: 1000,  // đạn pháo ở Phase 2
    missileSpeed: 460,   // tên lửa hành trình (px/s) — Phase 1
    missileSpeedRage: 500, // tên lửa ở Phase 2
    scroll: 300,         // tốc độ cuộn nền cố định trong trận Boss
    crystalFee: 15,
    unlockKeys: 3,
    skillMult: 0.5       // trận Boss: thời gian duy trì kỹ năng của mọi nhân vật giảm 50%
  };
  const BOSS_REWARD = {
    winCrystal: 45,
    winCoin: 2000,
    winCoinChance: 0.8,       // 80% ra 2.000 Coin, 20% ra thêm 10 Crystal
    winBonusCrystal: 10,
    lossLow: { crystal: 5, coin: 500 },    // rút < 50% máu Boss
    lossHigh: { crystal: 10, coin: 800 }   // rút ≥ 50% máu Boss (đã vào Phase 2)
  };

  // ----- DOM (đọc theo id, giống game.js) -----
  const bossBar = $('bossBar');
  const bossFill = $('bossFill');
  const bossPct = $('bossPct');
  const heartsEl = $('hearts');
  const bossResultEl = $('bossResult');
  const overStats = $('overStats');
  const retryText = $('retryText');
  const gameOver = $('gameOver');
  const overPanel = gameOver.querySelector('.over-panel');
  const overKicker = $('overKicker');
  const overTitle = $('overTitle');
  const overBest = $('overBest');
  const backLobbyButton = $('backLobbyButton');

  const bossSprite = new Image();
  bossSprite.onload = () => { if (G.state !== 'running') G.render(); };
  bossSprite.onerror = () => console.error('Không tải được ảnh Boss: assets/boss-tank.png');
  bossSprite.src = 'assets/boss-tank.png';

  // =====================================================================
  // TRẠNG THÁI TRẬN
  // =====================================================================
  function makeBoss() {
    return {
      hp: BOSS_CFG.maxHp, maxHp: BOSS_CFG.maxHp, rage: false, dead: false, deadT: 0, deadFxT: 0,
      lives: BOSS_CFG.lives, invuln: 0, cd: 1.7, attack: null, recoil: 0, hitFlash: 0,
      shells: [], missiles: [], pickups: [], shots: [], blasts: [], combo: null, obstacleCount: 0,
      pickupTimer: 1.1, crateTimer: 2.4, hits: 0, shownPct: -1, shownHearts: ''
    };
  }
  let boss = makeBoss();
  let bossResult = null;

  // ----- Hình học Boss -----
  function bossRect() {
    const ratio = bossSprite.naturalWidth && bossSprite.naturalHeight ? bossSprite.naturalWidth / bossSprite.naturalHeight : 2.04;
    const w = G.width * 0.28; // chiếm ~28% chiều ngang
    const h = w / ratio;
    // Nhún nhẹ theo nhịp di chuyển của nền
    const bob = G.state === 'running' && !boss.dead ? Math.abs(Math.sin(G.worldTime * 7)) * 2.4 : 0;
    return { x: G.width - w - 4 + boss.recoil * 28, y: G.groundY + 7 - h - bob, w, h };
  }
  function bossMuzzle() { const r = bossRect(); return { x: r.x + r.w * 0.03, y: r.y + r.h * 0.07 }; }
  function bossCenter() { const r = bossRect(); return { x: r.x + r.w * 0.42, y: r.y + r.h * 0.5 }; }
  // Tầm thấp: phải nhảy qua. Tầm cao: đứng yên dưới đất là né được.
  function bossLaneY(lane) { return lane === 'low' ? G.groundY - player.height * 0.30 : G.groundY - player.height - 6; }

  function playerBox() {
    const pw = Math.max(player.width * 0.52, player.height * 0.30);
    return { x: player.x + player.width * 0.25 - (pw - player.width * 0.52) / 2, y: player.y + player.height * 0.12, w: pw, h: player.height * 0.84 };
  }
  function rectHitsPlayer(x, y, w, h, shrink = 0.12) {
    const b = playerBox();
    const ix = w * shrink, iy = h * shrink;
    x += ix; y += iy; w -= ix * 2; h -= iy * 2;
    return b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y;
  }

  // ----- HUD: tim & thanh máu -----
  function updateHearts(hit = false) {
    const text = '❤️'.repeat(Math.max(0, boss.lives)) + '🖤'.repeat(Math.max(0, BOSS_CFG.lives - boss.lives));
    if (text !== boss.shownHearts) { boss.shownHearts = text; heartsEl.textContent = text; }
    heartsEl.setAttribute('aria-label', `${boss.lives} tim`);
    if (hit) {
      heartsEl.classList.remove('is-hit');
      void heartsEl.offsetWidth;
      heartsEl.classList.add('is-hit');
    }
  }
  function updateBossHud() {
    const pct = Math.max(0, Math.ceil(boss.hp / boss.maxHp * 100));
    if (pct === boss.shownPct) return;
    boss.shownPct = pct;
    bossFill.style.width = `${pct}%`;
    bossPct.textContent = `${pct}%`;
  }

  // Gọi từ game.js khi bắt đầu mọi ván (kể cả ván thường: chỉ reset, không hiện HUD Boss).
  function onRunStart() {
    boss = makeBoss();
    bossResult = null;
    bossBar.hidden = !G.bossMode;
    heartsEl.hidden = !G.bossMode;
    bossBar.classList.remove('is-rage');
    if (!G.bossMode) return;
    updateBossHud();
    updateHearts();
    const eqMagnet = G.equipped.magnet && G.inventory.magnet > 0 ? ' · ×2 Coin không áp dụng ở trận Boss' : '';
    const items = G.runItemsToast();
    G.showToast(`ĐÁNH BOSS! Lụm hòm 🚀💣 để phản công, né đạn theo đường laser đỏ.${eqMagnet}${items ? ' · ' + items : ''}`);
  }

  // ----- Chọn nhịp ra chiêu: không để hai mối nguy tới người chơi cùng lúc (luôn có đường né) -----
  function bossThreatTimes() {
    const px = player.x + player.width * 0.5;
    const times = [];
    boss.shells.forEach(s => times.push((s.x - px) / s.vx));
    boss.missiles.forEach(m => times.push((m.x - px) / m.vx));
    G.obstacles.forEach(o => times.push((o.x + o.w * 0.5 - px) / Math.max(1, G.speed)));
    if (boss.attack) attackArrivals(boss.attack).forEach(t => times.push(t));
    if (boss.combo) attackArrivals(boss.combo.attack).forEach(t => times.push(boss.combo.wait + t));
    return times.filter(t => t > -0.5);
  }
  // V20: ngưỡng trùng lặp 0.5s để Boss ra chiêu dồn dập hơn
  const bossConflict = (t) => bossThreatTimes().some(other => Math.abs(other - t) < 0.5);
  // Thời điểm (tính từ lúc bắt đầu nạp) mỗi đạn của một đòn chạm tới người chơi
  function attackArrivals(a) {
    const px = player.x + player.width * 0.5;
    const m = bossMuzzle();
    if (a.type === 'shell') return [a.t + (m.x - 30 - px) / a.vx];
    return a.salvo.map(sv => a.t + (m.x - 40 + sv.dx - px) / a.vx);
  }
  const bossShellSpeed = () => (boss.rage ? BOSS_CFG.shellSpeedRage : BOSS_CFG.shellSpeed);
  const bossMissileSpeed = () => (boss.rage ? BOSS_CFG.missileSpeedRage : BOSS_CFG.missileSpeed);
  // Loạt tên lửa: các quả cách nhau 150–180px theo trục x, độ cao so le (thấp → cao → thấp).
  function makeSalvo(count, allLow = false, gap = null) {
    const salvo = [];
    let dx = 0;
    for (let i = 0; i < count; i++) {
      if (i > 0) dx += gap || random(150, 180);
      const low = allLow || i % 2 === 0;
      const y = low ? G.groundY - player.height * random(0.22, 0.40) : G.groundY - player.height - random(10, 30);
      salvo.push({ dx, y });
    }
    return salvo;
  }

  function startBossAttack() {
    let attack;
    if (Math.random() < 0.6) {
      // Chiêu 1: đạn pháo nhanh, có laser đỏ cảnh báo
      attack = { type: 'shell', lane: Math.random() < 0.5 ? 'low' : 'high', t: BOSS_CFG.telegraph, vx: bossShellSpeed() };
    } else {
      // Chiêu 2: bắn LOẠT tên lửa — 2 quả ở Phase 1, 3 quả ở Phase 2, độ cao so le
      attack = { type: 'missile', t: BOSS_CFG.missileWindup, vx: bossMissileSpeed(), salvo: makeSalvo(boss.rage ? 3 : 2) };
    }
    if (attackArrivals(attack).some(bossConflict)) { boss.cd = 0.15; return; }
    boss.attack = attack;
  }
  function fireBossAttack() {
    const a = boss.attack;
    const m = bossMuzzle();
    if (a.type === 'shell') {
      const y = bossLaneY(a.lane);
      boss.shells.push({ x: m.x - 30, y, w: 38, h: 14, vx: a.vx });
      boss.blasts.push({ x: m.x - 6, y, life: 0.2, max: 0.2, r: 22, color: '#ffd34d' });
      boss.recoil = 0.18;
      G.playTone(130, 0.16, 'sawtooth', 0.05);
    } else {
      a.salvo.forEach(sv => boss.missiles.push({ x: m.x - 40 + sv.dx, y: sv.y, w: 46, h: 16, vx: a.vx, smoke: 0 }));
      boss.blasts.push({ x: m.x - 6, y: a.salvo[0].y, life: 0.2, max: 0.2, r: 18, color: '#ff9a3a' });
      boss.recoil = 0.12;
      G.playTone(210, 0.22, 'triangle', 0.045);
    }
    boss.attack = null;
    // Nhịp nghỉ 1,3–1,6 giây; Phase 2 ra chiêu nhanh hơn 25%
    boss.cd = random(BOSS_CFG.restMin, BOSS_CFG.restMax) / (boss.rage ? BOSS_CFG.rageRate : 1);
  }

  function enterBossRage() {
    boss.rage = true;
    bossBar.classList.add('is-rage');
    boss.crateTimer = 1.8;
    G.screenShake = Math.max(G.screenShake, 0.4);
    const c = bossCenter();
    G.burst(c.x, c.y, 24, false, '#ff7a2b');
    G.showToast('BOSS NỔI GIẬN! Ra chiêu nhanh hơn, thùng gỗ, rào chắn & giàn giáo xuất hiện trên đường!');
    G.playTone(90, 0.4, 'sawtooth', 0.05);
  }

  // ----- Trúng đòn -----
  function hurtBossPlayer() {
    if (boss.invuln > 0 || G.state !== 'running') return;
    if (G.phatAutoSave()) return; // Phát đầy Nộ: tự kích hoạt, đỡ đòn miễn phí
    boss.invuln = BOSS_CFG.invuln;
    G.screenShake = Math.max(G.screenShake, 0.22);
    G.burst(player.x + player.width * 0.5, player.y + player.height * 0.5, 18, false, '#ff7a2b');
    G.playTone(140, 0.2, 'sawtooth', 0.05);
    if (G.consumeSquadGuard()) {
      // Đồng đội đã đỡ thay; giữ nguyên Giáp và số tim Boss.
    } else if (G.spareHits > 0) {
      G.spareHits--;
      G.updateShield(true);
      G.showToast(`GIÁP BẢO HỘ! Còn ${G.spareHits} giáp · ${boss.lives} tim.`);
    } else {
      boss.lives--;
      updateHearts(true);
      if (boss.lives <= 0) { G.endGame(); return; }
      G.showToast(`TRÚNG ĐẠN! Còn ${boss.lives} tim. Bất tử ${BOSS_CFG.invuln} giây.`);
    }
  }

  // ----- Hòm đạn / bom: lụm để phản công -----
  function spawnBossPickup() {
    const spawnX = G.width + 30;
    let lane = Math.random() < 0.5 ? 'low' : 'high';
    if (lane === 'low' && G.obstacles.some(o => Math.abs(o.x - spawnX) < 150)) lane = 'high';
    const w = 32, h = 28;
    const y = lane === 'low' ? G.groundY - h - 3 : G.groundY - player.height - 56;
    boss.pickups.push({ x: spawnX, y, w, h, lane, kind: Math.random() < 0.35 ? 'bomb' : 'rocket', phase: random(0, 6.28), taken: false });
  }
  function collectBossPickup(p) {
    p.taken = true;
    const t = bossCenter();
    const sx = player.x + player.width * 0.85;
    const sy = player.y + player.height * 0.4;
    const bomb = p.kind === 'bomb';
    boss.shots.push({
      sx, sy, tx: t.x, ty: t.y, t: 0,
      dur: Math.max(0.35, (t.x - sx) / (bomb ? 620 : 800)),
      kind: p.kind, dmg: bomb ? BOSS_CFG.bombDmg : BOSS_CFG.rocketDmg
    });
    G.burst(p.x + p.w / 2, p.y + p.h / 2, 8, false, '#ffd34d');
    G.playTone(bomb ? 220 : 520, 0.12, 'square', 0.03);
  }
  function shotPos(s) {
    const p = clamp(s.t / s.dur, 0, 1);
    const arc = s.kind === 'bomb' ? Math.sin(Math.PI * p) * 70 : 0;
    return { x: s.sx + (s.tx - s.sx) * p, y: s.sy + (s.ty - s.sy) * p - arc, p };
  }
  function impactBoss(s) {
    boss.hp = Math.max(0, boss.hp - s.dmg);
    boss.hits++;
    boss.hitFlash = 0.18;
    boss.blasts.push({ x: s.tx, y: s.ty, life: 0.36, max: 0.36, r: s.kind === 'bomb' ? 52 : 38 });
    G.burst(s.tx, s.ty, s.kind === 'bomb' ? 16 : 10, false, '#ff9a3a');
    G.screenShake = Math.max(G.screenShake, s.kind === 'bomb' ? 0.2 : 0.14);
    G.playTone(s.kind === 'bomb' ? 95 : 130, 0.2, 'sawtooth', 0.05);
    updateBossHud();
    if (boss.hp <= 0) defeatBoss();
    else if (!boss.rage && boss.hp <= boss.maxHp * BOSS_CFG.rageAt) enterBossRage();
  }
  function defeatBoss() {
    boss.dead = true;
    boss.deadT = 0;
    boss.deadFxT = 0;
    boss.attack = null;
    boss.combo = null;
    boss.shells = []; boss.missiles = []; boss.pickups = []; boss.shots = [];
    G.screenShake = 0.5;
    finishBoss(true);
  }

  // ----- Tên lửa bị Ninja chém / Sét giật nổ -----
  function sliceMissile(m) {
    m.dead = true;
    G.slashFX.push({ x: m.x + m.w / 2, y: m.y, w: m.w, h: m.h * 2, life: 0.3, max: 0.3 });
    boss.blasts.push({ x: m.x + m.w / 2, y: m.y, life: 0.3, max: 0.3, r: 28 });
    G.burst(m.x + m.w / 2, m.y, 10, false, '#ff9a3a');
    G.playTone(vfxRandom(900, 1300), 0.06, 'sawtooth', 0.025);
  }
  function zapMissile(m) {
    m.dead = true;
    G.lightningFlash = 0.28;
    G.lightningStrikes.push({ x: m.x + m.w / 2, y: m.y, life: 0.62, max: 0.62 });
    boss.blasts.push({ x: m.x + m.w / 2, y: m.y, life: 0.3, max: 0.3, r: 28 });
    G.burst(m.x + m.w / 2, m.y, 12, false, '#ff9a3a');
    if (G.lightningCooldown <= 0) { G.lightningCooldown = 0.18; G.playTone(vfxRandom(520, 900), 0.07, 'square', 0.025); }
  }

  // V20: thùng gỗ / rào chắn / GIÀN GIÁO xen kẽ (cứ 2 vật cản thường thì tới 1 giàn giáo).
  // Trả về loại vừa sinh ra, hoặc null nếu tới lượt giàn giáo mà sân chưa trống (sẽ thử lại sau).
  function spawnBossObstacle() {
    const spawnX = G.width + 30;
    const scaffoldTurn = boss.obstacleCount % 3 === 2;
    const fieldClear = !boss.attack && !boss.combo && !boss.shells.length && !boss.missiles.length && !G.platforms.length;
    if (scaffoldTurn && !fieldClear) return null;
    boss.obstacleCount++;
    if (scaffoldTurn) {
      // Giàn giáo rộng 160–190px, cao cách mặt đất ~88px
      const deckW = random(160, 190);
      const deckY = G.groundY - 88;
      G.platforms.push({ x: spawnX, y: deckY, w: deckW, h: 14, type: 'scaffold', passed: false });
      // Pha "buộc nhảy lên cao": Boss bắn 1 đạn pháo tầm thấp HOẶC loạt 2 tên lửa tầm thấp nối đuôi
      const px = player.x + player.width * 0.5;
      const reach = (spawnX - px) / G.speed; // giây để giàn giáo chạm tới người chơi
      const useShell = Math.random() < 0.5;
      const attack = useShell
        ? { type: 'shell', lane: 'low', t: BOSS_CFG.telegraph, vx: bossShellSpeed() }
        : { type: 'missile', t: BOSS_CFG.missileWindup, vx: bossMissileSpeed(), salvo: makeSalvo(2, true, 150) };
      const fly = attackArrivals(attack)[0] - attack.t; // thời gian bay của đạn đầu tiên
      const hitAt = reach + (useShell ? 0.30 : 0.12);   // đạn đầu tới khi người chơi đã đứng trên giàn giáo
      boss.combo = { wait: Math.max(0.05, hitAt - attack.t - fly), attack };
      // Hòm bom 💣 ở cuối giàn giáo — phần thưởng cho người leo lên
      boss.pickups.push({ x: spawnX + deckW - 40, y: deckY - 34, w: 32, h: 28, lane: 'deck', kind: 'bomb', phase: random(0, 6.28), taken: false });
      return 'scaffold';
    }
    if (Math.random() < 0.55) {
      const s = random(0.95, 1.2);
      G.obstacles.push({ x: spawnX, y: G.groundY - 35 * s, w: 34 * s, h: 35 * s, type: 'crate', passed: true, scale: s });
      return 'crate';
    }
    G.obstacles.push({ x: spawnX, y: G.groundY - 42, w: 48, h: 42, type: 'barrier', passed: true });
    return 'barrier';
  }

  // ----- Vòng cập nhật chính của trận Boss (gọi trong update() của game.js) -----
  function updateBossFight(dt, skillActive) {
    if (!G.bossMode || boss.dead || G.state !== 'running') return;
    const sel = G.selectedCharacter;
    const phasing = skillActive && G.IMMUNE_SKILL_CHARS.includes(sel);
    const ninja = skillActive && sel === 'toduy';
    const trieu = skillActive && sel === 'trieu';
    const duongtao2 = skillActive && sel === 'duongtao';
    const thunder = skillActive && (sel === 'trong' || sel === 'tien');
    boss.invuln = Math.max(0, boss.invuln - dt);

    if (!boss.rage && boss.hp <= boss.maxHp * BOSS_CFG.rageAt) enterBossRage();

    // Máy trạng thái ra chiêu
    if (boss.combo) {
      // Combo giàn giáo: chờ đúng nhịp rồi nạp đòn quét sát đất (ưu tiên hơn đòn thường)
      boss.combo.wait -= dt;
      if (boss.combo.wait <= 0) { boss.attack = boss.combo.attack; boss.combo = null; }
    } else if (boss.attack) {
      boss.attack.t -= dt;
      if (boss.attack.t <= 0) fireBossAttack();
    } else if (!G.platforms.length) { // giàn giáo còn trên màn hình: tạm nghỉ đòn thường để luôn có đường né
      boss.cd -= dt;
      if (boss.cd <= 0) startBossAttack();
    }

    // Đạn pháo (không bị Ninja/Sét phá được)
    boss.shells.forEach(s => {
      s.x -= s.vx * dt;
      if (!s.dodged && !s.hit && s.x + s.w < player.x) { s.dodged = true; G.phatAddRage(G.PHAT_RAGE_PER_OBSTACLE); }
    });
    // Tên lửa (Ninja chém đứt / Sét giật nổ được)
    boss.missiles.forEach(m => {
      m.x -= m.vx * dt;
      if (!m.dodged && !m.dead && !m.hit && m.x + m.w < player.x) { m.dodged = true; G.phatAddRage(G.PHAT_RAGE_PER_OBSTACLE); }
      m.smoke -= dt;
      if (m.smoke <= 0) {
        m.smoke = 0.07;
        G.particles.push({ x: m.x + m.w, y: m.y, vx: vfxRandom(10, 40), vy: vfxRandom(-16, 4), g: -20, life: 0.5, maxLife: 0.5, size: vfxRandom(3, 5), dust: true, color: 'rgba(120,120,120,.7)' });
      }
      if (m.dead) return;
      if (sel === 'quang' && skillActive && m.x < player.x + player.width + 70 && m.x + m.w > player.x - 10) {
        m.dead = true;
        G.knockedObstacles.push({ x: m.x, y: m.y - m.h / 2, w: m.w, h: m.h, type: 'barrier', vx: vfxRandom(280, 500), vy: vfxRandom(-760, -480), spin: vfxRandom(-13, 13), angle: 0, life: 1.45, knocked: true });
        G.burst(m.x + m.w / 2, m.y, 14, false, '#ff8a28');
        G.screenShake = Math.max(G.screenShake, 0.07);
      } else if (trieu && m.x < player.x + player.width + 390 && m.x + m.w > player.x) {
        m.dead = true;
        G.knockedObstacles.push({ x: m.x, y: m.y - m.h / 2, w: m.w, h: m.h, type: 'barrier', vx: vfxRandom(180, 340), vy: vfxRandom(-600, -380), spin: vfxRandom(-10, 10), angle: 0, life: 1.5 });
      } else if (duongtao2 && G.duongtaoHits(m.x, m.w)) {
        m.dead = true;
        G.knockedObstacles.push({ x: m.x, y: m.y - m.h / 2, w: m.w, h: m.h, type: 'barrier', vx: vfxRandom(180, 340), vy: vfxRandom(-600, -380), spin: vfxRandom(-10, 10), angle: 0, life: 1.5, knocked: true });
        G.burst(m.x + m.w / 2, m.y, 10, false, '#ffd34d');
      } else if (G.brooms.length && G.broomHits(m.x, m.w)) {
        m.dead = true;
        G.knockedObstacles.push({ x: m.x, y: m.y - m.h / 2, w: m.w, h: m.h, type: 'barrier', vx: vfxRandom(180, 340), vy: vfxRandom(-600, -380), spin: vfxRandom(-10, 10), angle: 0, life: 1.5, knocked: true });
      } else if (G.smokeRings.length && G.smokeRingHits(m.x, m.w)) {
        m.dead = true;
        G.knockedObstacles.push({ x: m.x, y: m.y - m.h / 2, w: m.w, h: m.h, type: 'barrier', vx: vfxRandom(180, 340), vy: vfxRandom(-600, -380), spin: vfxRandom(-10, 10), angle: 0, life: 1.5, knocked: true });
        G.burst(m.x + m.w / 2, m.y, 8, false, '#e9e4d2');
      } else if (ninja &&
          m.x < player.x + player.width + G.NINJA_REACH && m.x + m.w > player.x + player.width * 0.2 &&
          m.y + m.h / 2 > player.y - 64 && m.y - m.h / 2 < player.y + player.height + 28) {
        sliceMissile(m);
      } else if (thunder && m.x > player.x - 4 && m.x < player.x + 360) {
        zapMissile(m);
      }
    });

    // Va chạm với người chơi (Duy / Mu Rát / Duy Quân đội xuyên qua khi đang dùng kỹ năng)
    if (!phasing && boss.invuln <= 0) {
      for (const s of boss.shells) {
        if (!s.hit && rectHitsPlayer(s.x, s.y - s.h / 2, s.w, s.h)) {
          s.hit = true;
          boss.blasts.push({ x: s.x, y: s.y, life: 0.25, max: 0.25, r: 26 });
          hurtBossPlayer();
          break;
        }
      }
      for (const m of boss.missiles) {
        if (G.state !== 'running') break;
        if (!m.dead && !m.hit && rectHitsPlayer(m.x, m.y - m.h / 2, m.w, m.h)) {
          m.hit = true;
          boss.blasts.push({ x: m.x, y: m.y, life: 0.3, max: 0.3, r: 32 });
          hurtBossPlayer();
          break;
        }
      }
    }
    boss.shells = boss.shells.filter(s => !s.hit && s.x + s.w > -20);
    boss.missiles = boss.missiles.filter(m => !m.dead && !m.hit && m.x + m.w > -20);
    if (G.state !== 'running') return;

    // Hòm đạn / bom trên đường
    boss.pickupTimer -= dt;
    if (boss.pickupTimer <= 0) { spawnBossPickup(); boss.pickupTimer = random(1.7, 2.7); }
    boss.pickups.forEach(p => { p.x -= G.speed * dt; });
    boss.pickups.forEach(p => { if (!p.taken && rectHitsPlayer(p.x, p.y, p.w, p.h, -0.1)) collectBossPickup(p); });
    boss.pickups = boss.pickups.filter(p => !p.taken && p.x + p.w > -20);

    // Phase 2: thùng gỗ / rào chắn
    if (boss.rage) {
      boss.crateTimer -= dt;
      if (boss.crateTimer <= 0) {
        const spawnX = G.width + 30;
        const arrive = (spawnX - player.x - player.width * 0.5) / G.speed;
        const lowPickupNear = boss.pickups.some(p => p.lane === 'low' && Math.abs(p.x - spawnX) < 130);
        if (lowPickupNear || G.platforms.length || bossConflict(arrive)) boss.crateTimer = 0.2;
        else {
          const kind = spawnBossObstacle();
          boss.crateTimer = kind === null ? 0.25 : (kind === 'scaffold' ? random(3.8, 4.8) : random(2.4, 3.6));
        }
      }
    }

    // Tên lửa / bom của người chơi bay về phía Boss
    boss.shots.forEach(s => {
      s.t += dt;
      if (Math.random() < dt * 40) {
        const p = shotPos(s);
        G.particles.push({ x: p.x, y: p.y, vx: vfxRandom(-30, 10), vy: vfxRandom(-10, 10), g: 0, life: 0.3, maxLife: 0.3, size: vfxRandom(2, 4), dust: false, color: s.kind === 'bomb' ? '#b8b8b8' : '#ffb347' });
      }
    });
    const arrived = boss.shots.filter(s => s.t >= s.dur);
    boss.shots = boss.shots.filter(s => s.t < s.dur);
    arrived.forEach(s => { if (!boss.dead) impactBoss(s); });
  }

  // Hiệu ứng (nổ, rung, Boss sụp đổ) vẫn chạy khi trận đã kết thúc
  function updateBossFX(dt) {
    boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    boss.recoil = Math.max(0, boss.recoil - dt);
    boss.blasts.forEach(b => { b.life -= dt; });
    boss.blasts = boss.blasts.filter(b => b.life > 0);
    if (boss.dead) {
      boss.deadT += dt;
      boss.deadFxT -= dt;
      if (boss.deadFxT <= 0 && boss.deadT < 1.2) {
        boss.deadFxT = 0.12;
        const r = bossRect();
        const x = r.x + vfxRandom(0.1, 0.9) * r.w;
        const y = r.y + vfxRandom(0.1, 0.9) * r.h;
        boss.blasts.push({ x, y, life: 0.4, max: 0.4, r: vfxRandom(26, 46) });
        G.burst(x, y, 10, false, '#ff9a3a');
        G.screenShake = Math.max(G.screenShake, 0.12);
        G.playTone(vfxRandom(80, 170), 0.18, 'sawtooth', 0.04);
      }
    }
  }

  // ----- Kết thúc trận Boss: tính thưởng, lưu localStorage -----
  function finishBoss(win) {
    if (G.state !== 'running' || !G.bossMode) return;
    G.state = 'over';
    G.overAt = performance.now();
    const R = BOSS_REWARD;
    const phase2 = boss.hp <= boss.maxHp * BOSS_CFG.rageAt;
    const res = { win, drained: clamp(1 - boss.hp / boss.maxHp, 0, 1), crystal: 0, coin: 0, base: 0, bonusCoin: 0, bonusCrystal: 0, tier: null, hits: boss.hits };
    if (win) {
      G.achv.bossWins += 1;
      G.saveAchv();
      res.base = R.winCrystal;
      if (Math.random() < R.winCoinChance) res.bonusCoin = R.winCoin;
      else res.bonusCrystal = R.winBonusCrystal;
      res.crystal = res.base + res.bonusCrystal;
      res.coin = res.bonusCoin;
    } else {
      const tier = phase2 ? R.lossHigh : R.lossLow;
      res.tier = phase2 ? 'high' : 'low';
      res.crystal = tier.crystal;
      res.coin = tier.coin;
    }
    // Cộng thẳng vào tài khoản — không áp dụng ×2 Coin cho phần thưởng Boss
    G.crystals += res.crystal;
    G.coinBalance += res.coin;
    G.saveEconomy();
    G.saveMeta();
    // Thử thách "Độc cô cầu bại": thắng, không vật phẩm hỗ trợ, không mất tim nào
    const ri = G.runItems;
    const perfect = !ri.shield && !ri.hourglass && !ri.duration && boss.lives === BOSS_CFG.lives;
    G.commitChallengeBoss(win, perfect);
    G.commitProfileRun(); // [PROFILE]
    bossResult = res;
    if (!win) {
      G.screenShake = 0.22;
      G.burst(player.x + player.width * 0.6, player.y + player.height * 0.75, 12);
      G.playTone(110, 0.16, 'sawtooth', 0.04);
    } else {
      G.playTone(660, 0.2, 'triangle', 0.045);
    }
    G.updateHud();
    G.updateLobby();
    G.renderCharacterCards();
    G.overTimer = setTimeout(() => { if (G.state === 'over') G.showGameOver(); }, win ? 1300 : 650);
  }

  function showBossResult() {
    const r = bossResult;
    overPanel.classList.toggle('is-record', r.win);
    overKicker.textContent = r.win ? 'CHIẾN THẮNG' : 'THẤT BẠI';
    overTitle.textContent = r.win ? 'Hạ gục Boss!' : 'Boss còn trụ vững!';
    overStats.hidden = true;
    overBest.hidden = true;
    const row = (label, value, cls = '') => `<div class="boss-res-row ${cls}"><span>${label}</span><strong class="px">${value}</strong></div>`;
    const pct = Math.round(r.drained * 100);
    let rows = row('MÁU BOSS ĐÃ RÚT', `${pct}%`);
    if (r.win) {
      rows += row('PHẦN THƯỞNG HẠ GỤC', `💎 +${r.base}`, 'is-gold');
      rows += r.bonusCoin
        ? row('THƯỞNG THÊM (NGẪU NHIÊN)', `🪙 +${fmt(r.bonusCoin)}`, 'is-gold')
        : row('THƯỞNG THÊM (NGẪU NHIÊN)', `💎 +${r.bonusCrystal}`, 'is-gold');
    } else {
      rows += row(r.tier === 'high' ? 'THƯỞNG AN ỦI (≥ 50%)' : 'THƯỞNG AN ỦI (< 50%)', `💎 +${r.crystal} · 🪙 +${fmt(r.coin)}`, 'is-gold');
    }
    const note = r.win
      ? 'Phần thưởng đã được cộng vào tài khoản (không nhân đôi Coin).'
      : (r.tier === 'high' ? 'Boss đã vào Phase 2 — thử lại để hạ gục và nhận 💎 45!' : 'Rút từ 50% máu Boss trở lên để nhận thưởng an ủi lớn hơn.');
    bossResultEl.innerHTML = rows + `<p class="boss-res-note">${note}</p>`;
    bossResultEl.hidden = false;
    retryText.textContent = 'KHIÊU CHIẾN LẠI';
    backLobbyButton.textContent = 'VỀ SẢNH';
    gameOver.hidden = false;
  }

  // ----- Thanh toán & vào trận -----
  function startRun(method) {
    if (G.state === 'running' || !G.bossUnlocked) return;
    if (method === 'key') {
      if (G.miniKeys < 1) return;
      G.miniKeys--;
    } else if (method === 'crystal') {
      if (G.crystals < BOSS_CFG.crystalFee) return;
      G.crystals -= BOSS_CFG.crystalFee;
    } else return;
    G.saveMeta();
    G.updateLobby();
    G.startGame('boss');
  }

  // ----- Vẽ -----
  function drawBossBack() {
    boss.pickups.forEach(drawBossPickup);
    drawBossTank();
    drawBossLaser();
  }
  function drawBossFront() {
    boss.shells.forEach(drawBossShell);
    boss.missiles.forEach(drawBossMissile);
    boss.shots.forEach(drawPlayerShot);
    boss.blasts.forEach(drawBlast);
  }
  function drawBossTank() {
    const ctx = G.ctx;
    const r = bossRect();
    const shakeX = boss.hitFlash > 0 ? vfxRandom(-2, 2) : 0;
    ctx.fillStyle = 'rgba(40, 60, 30, .24)';
    ctx.beginPath(); ctx.ellipse(r.x + r.w * 0.5, G.groundY + 4, r.w * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    if (boss.rage && !boss.dead) {
      // Phase 2: hào quang đỏ cam bao quanh xe tăng
      const pulse = 0.28 + Math.sin(G.worldTime * 9) * 0.1;
      const cx = r.x + r.w / 2, cy = r.y + r.h * 0.55;
      const g = ctx.createRadialGradient(cx, cy, r.w * 0.1, cx, cy, r.w * 0.62);
      g.addColorStop(0, `rgba(255, 90, 30, ${pulse})`);
      g.addColorStop(1, 'rgba(255, 90, 30, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r.w * 0.62, 0, Math.PI * 2); ctx.fill();
    }
    if (boss.dead) ctx.globalAlpha = clamp(1 - (boss.deadT - 0.7) / 0.5, 0, 1);
    if (bossSprite.complete && bossSprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bossSprite, r.x + shakeX, r.y, r.w, r.h);
    } else {
      // Placeholder tạm nếu chưa có ảnh assets/boss-tank.png
      ctx.fillStyle = '#2b2f2a'; G.roundedRect(r.x + r.w * 0.03, r.y + r.h * 0.78, r.w * 0.94, r.h * 0.22, 8); ctx.fill();
      ctx.fillStyle = '#4f6b3a'; G.roundedRect(r.x + r.w * 0.05, r.y + r.h * 0.42, r.w * 0.9, r.h * 0.4, 8); ctx.fill();
      ctx.fillStyle = '#5d7c43'; G.roundedRect(r.x + r.w * 0.25, r.y + r.h * 0.16, r.w * 0.5, r.h * 0.32, 8); ctx.fill();
      ctx.fillStyle = '#3d5230'; ctx.fillRect(r.x, r.y + r.h * 0.2, r.w * 0.34, r.h * 0.08);
    }
    ctx.restore();
  }
  function drawBossLaser() {
    const ctx = G.ctx;
    const a = boss.attack;
    if (!a || G.state !== 'running') return;
    const m = bossMuzzle();
    const prog = clamp(1 - a.t / (a.type === 'shell' ? BOSS_CFG.telegraph : BOSS_CFG.missileWindup), 0, 1);
    const pulse = 0.5 + Math.sin(G.worldTime * 30) * 0.5;
    ctx.save();
    ctx.lineCap = 'round';
    if (a.type === 'shell') {
      // Đường laser đỏ mờ cảnh báo 0,7 giây trước khi đạn bay ra
      const y = bossLaneY(a.lane);
      ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 10;
      ctx.strokeStyle = `rgba(255, 50, 50, ${0.16 + prog * 0.22 + pulse * 0.08})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(m.x, y); ctx.lineTo(0, y); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255, 200, 200, ${0.22 + prog * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(m.x, y); ctx.lineTo(0, y); ctx.stroke();
      ctx.fillStyle = `rgba(255, 60, 60, ${0.4 + pulse * 0.4})`;
      ctx.beginPath(); ctx.arc(m.x, y, 4 + prog * 3, 0, Math.PI * 2); ctx.fill();
    } else {
      // Tên lửa: vệt cam ngắn báo hiệu độ cao sắp phóng
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = `rgba(255, 150, 50, ${0.25 + prog * 0.3})`;
      ctx.lineWidth = 2;
      a.salvo.forEach(sv => { ctx.beginPath(); ctx.moveTo(m.x, sv.y); ctx.lineTo(m.x - 90, sv.y); ctx.stroke(); });
    }
    ctx.restore();
  }
  function drawBossShell(s) {
    const ctx = G.ctx;
    const g = ctx.createLinearGradient(s.x + s.w, 0, s.x + s.w + 48, 0);
    g.addColorStop(0, 'rgba(255, 170, 60, .6)');
    g.addColorStop(1, 'rgba(255, 170, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(s.x + s.w - 2, s.y - 3, 50, 6);
    ctx.fillStyle = '#3a3f3a';
    G.roundedRect(s.x, s.y - s.h / 2, s.w, s.h, 6); ctx.fill();
    ctx.fillStyle = '#d6a24a';
    G.roundedRect(s.x, s.y - s.h / 2, s.w * 0.32, s.h, 5); ctx.fill();
    ctx.fillStyle = '#7a2d1f';
    ctx.fillRect(s.x + s.w * 0.78, s.y - s.h / 2, 4, s.h);
  }
  function drawBossMissile(m) {
    const ctx = G.ctx;
    const flick = Math.sin(G.worldTime * 50) * 4;
    ctx.fillStyle = `rgba(255, 140, 40, ${0.75 + Math.sin(G.worldTime * 40) * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(m.x + m.w - 2, m.y - 4);
    ctx.lineTo(m.x + m.w + 18 + flick, m.y);
    ctx.lineTo(m.x + m.w - 2, m.y + 4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a2a2a'; // cánh đuôi
    ctx.beginPath();
    ctx.moveTo(m.x + m.w - 12, m.y - m.h / 2 + 2); ctx.lineTo(m.x + m.w, m.y - m.h / 2 - 4); ctx.lineTo(m.x + m.w, m.y);
    ctx.moveTo(m.x + m.w - 12, m.y + m.h / 2 - 2); ctx.lineTo(m.x + m.w, m.y + m.h / 2 + 4); ctx.lineTo(m.x + m.w, m.y);
    ctx.fill();
    ctx.fillStyle = '#d9dedb';
    G.roundedRect(m.x + 8, m.y - m.h / 2 + 2, m.w - 10, m.h - 4, 5); ctx.fill();
    ctx.fillStyle = '#d63b2f'; // đầu đạn
    ctx.beginPath();
    ctx.moveTo(m.x + 12, m.y - m.h / 2 + 2); ctx.lineTo(m.x, m.y); ctx.lineTo(m.x + 12, m.y + m.h / 2 - 2);
    ctx.closePath(); ctx.fill();
  }
  function drawPlayerShot(s) {
    const ctx = G.ctx;
    const pos = shotPos(s);
    const next = shotPos({ ...s, t: s.t + 0.02 });
    const ang = Math.atan2(next.y - pos.y, next.x - pos.x);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    if (s.kind === 'bomb') {
      ctx.rotate(s.t * 9);
      ctx.fillStyle = '#23272b';
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.arc(-3, -3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c9a063'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(3, -14); ctx.stroke();
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath(); ctx.arc(3, -14, 2.5 + Math.sin(G.worldTime * 40), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.rotate(ang);
      ctx.fillStyle = 'rgba(255, 160, 50, .85)';
      ctx.beginPath(); ctx.moveTo(-14, -3); ctx.lineTo(-26 + Math.sin(G.worldTime * 50) * 3, 0); ctx.lineTo(-14, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e4e8e4'; G.roundedRect(-14, -4, 26, 8, 4); ctx.fill();
      ctx.fillStyle = '#d63b2f';
      ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(20, 0); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawBossPickup(p) {
    const ctx = G.ctx;
    const bob = Math.sin(G.worldTime * 4 + p.phase) * 2;
    ctx.save();
    ctx.translate(0, bob);
    ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#5b7a3a';
    G.roundedRect(p.x, p.y, p.w, p.h, 5); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#2f4620'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(p.x + 3, p.y + 3, p.w - 6, 3);
    ctx.font = `${Math.round(p.h * 0.62)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.kind === 'bomb' ? '💣' : '🚀', p.x + p.w / 2, p.y + p.h / 2 + 3);
    ctx.restore();
  }
  function drawBlast(b) {
    const ctx = G.ctx;
    const p = 1 - b.life / b.max;
    const r = b.r * (0.35 + 0.65 * p);
    ctx.save();
    ctx.globalAlpha = clamp(1 - p, 0, 1);
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
    g.addColorStop(0, '#fff6c2');
    g.addColorStop(0.45, b.color || '#ffa63a');
    g.addColorStop(1, 'rgba(255, 90, 30, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // =====================================================================
  // MINI-GAME PANEL (đăng ký vào popup Mini-game của game.js)
  // =====================================================================
  function renderMiniBoss() {
    const slots = [0, 1, 2].map(i => `<span class="key-slot ${i < G.miniKeys ? 'on' : ''}" aria-hidden="true">🔑</span>`).join('');
    const head = `<div class="key-slots" role="img" aria-label="${G.miniKeys} trên 3 Key">${slots}</div>
      <p class="px mini-count">${G.miniKeys}/3 KEY</p>`;
    if (!G.bossUnlocked) {
      const can = G.miniKeys >= BOSS_CFG.unlockKeys;
      return head + (can
        ? '<p>Bạn đã thu thập đủ <b>3/3 Key</b>! Mở khóa <b>vĩnh viễn</b> chế độ <b>Đánh Boss Xe Tăng</b> (tốn 3 Key, chỉ một lần).</p>'
        : '<p>Cần đủ <b>3/3 Key</b> để mở khóa chế độ <b>Đánh Boss Xe Tăng</b>.<br>Key có thể rơi ngẫu nhiên (5%) khi mở hộp Gacha.</p>') +
        `<button class="btn btn-play btn-small boss-unlock" type="button" data-boss="unlock" ${can ? '' : 'disabled'}><span aria-hidden="true">🔓</span><span>MỞ KHÓA CHẾ ĐỘ BOSS</span></button>`;
    }
    const keyOk = G.miniKeys >= 1;
    const crystalOk = G.crystals >= BOSS_CFG.crystalFee;
    return head + `
      <div class="boss-card">
        <img src="assets/boss-tank.png" alt="Xe tăng chiến đấu">
        <div><strong>${BOSS_CFG.name}</strong>
        <p>Lụm hòm 🚀💣 trên đường để phản công, né đạn theo laser đỏ. Boss còn dưới 50% máu sẽ nổi giận!</p></div>
      </div>
      <ul class="boss-rules">
        <li>❤️ <b>2 tim</b> (+1 giáp Lv4, +1 khiên 🛡️) · kỹ năng nhân vật chỉ còn <b>50%</b> thời gian</li>
        <li>🏆 Thắng: <b>💎 45</b> + (80% <b>🪙 2.000</b> hoặc 20% <b>💎 10</b>)</li>
        <li>💔 Thua: rút &lt;50% máu → <b>💎 5 + 🪙 500</b> · rút ≥50% → <b>💎 10 + 🪙 700</b></li>
      </ul>
      <p class="boss-fee">PHÍ VÀO MỖI LƯỢT: 🔑 1 KEY HOẶC 💎 ${BOSS_CFG.crystalFee} CRYSTAL</p>
      <div class="boss-pay">
        <button class="btn btn-play btn-small" type="button" data-boss="key" ${keyOk ? '' : 'disabled'}><span>🔑 DÙNG 1 KEY</span></button>
        <button class="btn btn-play btn-small" type="button" data-boss="crystal" ${crystalOk ? '' : 'disabled'}><span>💎 ${BOSS_CFG.crystalFee} CRYSTAL</span></button>
      </div>
      <p class="mini-own">Đang có: 🔑 ${G.miniKeys}/3 · 💎 ${fmt(G.crystals)}</p>`;
  }
  function onMiniClick(event) {
    const btn = event.target.closest('[data-boss]');
    if (!btn || btn.disabled) return;
    const act = btn.dataset.boss;
    if (act === 'unlock') {
      if (G.bossUnlocked || G.miniKeys < BOSS_CFG.unlockKeys) return;
      G.miniKeys -= BOSS_CFG.unlockKeys; // trừ 3 Key, mở khóa vĩnh viễn
      G.bossUnlocked = true;
      G.saveMeta();
      G.updateLobby();
      G.renderMini();
      G.playUiSound('claim');
    } else {
      startRun(act);
    }
  }

  // =====================================================================
  // API công khai cho game.js (qua GameBridge.boss) và đăng ký mini-game
  // =====================================================================
  G.boss = {
    cfg: BOSS_CFG,
    reward: BOSS_REWARD,
    onRunStart,
    update: updateBossFight,
    fx: (dt) => { updateBossFX(dt); updateBossHud(); },
    drawBack: drawBossBack,
    drawFront: drawBossFront,
    invuln: () => boss.invuln,
    hurtPlayer: hurtBossPlayer,
    // Sét Gầm pha 1 của Trọng Riding trúng Boss
    onRiderStrike(damage) {
      if (boss.dead) return;
      boss.missiles.forEach(m => { if (!m.dead && !m.hit) zapMissile(m); }); // phá toàn bộ tên lửa đang bay
      boss.hp = Math.max(0, boss.hp - damage);
      boss.hits++;
      boss.hitFlash = 0.18;
      updateBossHud();
      if (boss.hp <= 0) defeatBoss();
      else if (!boss.rage && boss.hp <= boss.maxHp * BOSS_CFG.rageAt) enterBossRage();
    },
    finish: finishBoss,
    hasResult: () => !!bossResult,
    showResult: showBossResult,
    startRun
  };

  G.registerMiniGame({
    id: 'boss',
    render: renderMiniBoss,
    onClick: onMiniClick
  });
})();
