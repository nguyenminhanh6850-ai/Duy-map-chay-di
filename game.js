(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const stage = $('gameStage');
  const app = $('app');
  const lobbyScreen = $('lobbyScreen');
  const gameScreen = $('gameScreen');
  const playButton = $('playButton');
  const openCharactersBtn = $('openCharacters');
  const openHelpBtn = $('openHelp');
  const characterModal = $('characterModal');
  const helpModal = $('helpModal');
  const cardRow = $('cardRow');
  const achvList = $('achvList');
  const lobbyCoin = $('lobbyCoin');
  const lobbyBest = $('lobbyBest');
  const modalCoin = $('modalCoin');
  const heroSprite = $('heroSprite');
  const heroName = $('heroName');
  const heroLevel = $('heroLevel');
  const heroSkill = $('heroSkill');
  const scoreValue = $('scoreValue');
  const runCoinValue = $('runCoinValue');
  const shieldIcon = $('shieldIcon');
  const skillBar = $('skillBar');
  const skillFill = $('skillFill');
  const skillLabel = $('skillLabel');
  const toast = $('toast');
  const gameOver = $('gameOver');
  const overPanel = gameOver.querySelector('.over-panel');
  const overKicker = $('overKicker');
  const overTitle = $('overTitle');
  const overScore = $('overScore');
  const overCoin = $('overCoin');
  const overBest = $('overBest');
  const retryButton = $('retryButton');
  const backLobbyButton = $('backLobbyButton');
  const soundButton = $('soundButton');
  const soundIcon = $('soundIcon');
  const soundText = $('soundText');
  const lobbyCrystal = $('lobbyCrystal');
  const questDot = $('questDot');
  const miniKeysLabel = $('miniKeysLabel');
  const miniIcon = $('miniIcon');
  const equipStrip = $('equipStrip');
  const hudItems = $('hudItems');
  const questModal = $('questModal');
  const gachaModal = $('gachaModal');
  const miniModal = $('miniModal');
  const questList = $('questList');
  const questBonus = $('questBonus');
  const gachaBox = $('gachaBox');
  const gachaResults = $('gachaResults');
  const bagList = $('bagList');
  const miniBody = $('miniBody');
  const bagModal = $('bagModal');
  const shopModal = $('shopModal');
  const shopBody = $('shopBody');
  const shopBubble = $('shopBubble');

  // Khung logic của canvas được giữ gần như cố định (vật lý/chướng ngại vật dùng pixel),
  // rồi phóng to bằng CSS để lấp đầy màn hình mà không đổi độ khó.
  const LOGICAL_MIN_H = 300;
  const LOGICAL_MAX_H = 380;
  const LOGICAL_TARGET_W = 660;
  const MIN_ASPECT = 1.5;
  const MAX_ASPECT = 2.6;

  let toastTimer = 0;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  const fmt = (n) => Math.floor(n).toLocaleString('vi-VN');

  const characters = {
    duy: { name: 'Duy', src: 'assets/nhan-vat.png' },
    trong: { name: 'Trọng \"Sét\"', src: 'assets/trong-set.png' },
    murat: { name: 'Mu Rát', src: 'assets/mu-rat.png', unlock: 3333 },
    toduy: { name: 'Tô Duy', src: 'assets/to-duy.png' },
    duyquandoi: { name: 'Duy Quân đội', src: 'assets/duy-quan-doi.png' }
  };
  let selectedCharacter = 'duy';
  let sprite = new Image();
  function isMuRatUnlocked() { return best >= 3333 || score >= 3333; }
  function isCharUnlocked(key) {
    if (key === 'murat') return isMuRatUnlocked();
    if (key === 'toduy') return !!owned.toduy;
    if (key === 'duyquandoi') return !!owned.duyquandoi;
    return true;
  }
  let muRatShown = false;
  function refreshCharacterLocks() {
    const unlocked = isMuRatUnlocked();
    if (unlocked === muRatShown) return;
    muRatShown = unlocked;
    renderCharacterCards();
    if (unlocked && state === 'running') showToast('MU RÁT ĐÃ MỞ KHÓA! Vào sảnh để chọn nhân vật mới.');
  }
  function loadCharacter(key) {
    if (!isCharUnlocked(key)) return;
    selectedCharacter = key;
    try { localStorage.setItem('duyMapChayDiChar', key); } catch (_) { /* storage may be disabled */ }
    const info = characters[key] || characters.duy;
    const nextSprite = new Image();
    nextSprite.onload = () => { sprite = nextSprite; fitCanvas(); render(); };
    nextSprite.onerror = () => console.error('Không tải được ảnh nhân vật:', info.src);
    nextSprite.src = info.src;
    updateLobby();
    renderCharacterCards();
    if (state !== 'running') render();
  }
  sprite.onload = () => fitCanvas();
  sprite.onerror = () => console.error('Không tải được ảnh nhân vật Duy: assets/nhan-vat.png');
  sprite.src = characters.duy.src;
  const canSprite = new Image();
  canSprite.onload = () => render();
  canSprite.onerror = () => console.error('Không tải được ảnh lon bia: assets/bia-333.png');
  canSprite.src = 'assets/bia-333.png';
  const busSprite = new Image();
  busSprite.onload = () => render();
  busSprite.onerror = () => console.error('Không tải được ảnh xe buýt: assets/xe-buyt.png');
  busSprite.src = 'assets/xe-buyt.png';

  let best = 0;
  try {
    const storedBest = Number(localStorage.getItem('duyMapChayDiBest') || 0);
    best = Number.isFinite(storedBest) && storedBest > 0 ? storedBest : 0;
  } catch (_) { /* local-file browsing may restrict storage */ }
  const upgradeConfig = {
    duy: {
      name: 'Duy',
      levels: [
        { level: 2, cost: 300, title: 'Hồi chiêu nhanh hơn', desc: 'Giảm hồi chiêu Hành quân từ 36 xuống 30 giây.' },
        { level: 3, cost: 750, title: 'Hành quân bền bỉ', desc: 'Tăng thời gian Hành quân từ 12 lên 15 giây.' },
        { level: 4, cost: 1200, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    },
    trong: {
      name: 'Trọng “Sét”',
      levels: [
        { level: 2, cost: 300, title: 'Sét hồi nhanh', desc: 'Giảm hồi chiêu từ 40 xuống 35 giây.' },
        { level: 3, cost: 750, title: 'Sét kéo dài', desc: 'Tăng thời gian kỹ năng từ 15 lên 18 giây.' },
        { level: 4, cost: 1200, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    },
    murat: {
      name: 'Mu Rát',
      levels: [
        { level: 2, cost: 400, title: 'Lướt nhanh hơn', desc: 'Giảm hồi chiêu Lướt lướt từ 36 xuống 30 giây.' },
        { level: 3, cost: 1000, title: 'Lướt kéo dài', desc: 'Tăng thời gian Lướt lướt từ 15 lên 18 giây.' },
        { level: 4, cost: 1600, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    },
    toduy: {
      name: 'Tô Duy',
      levels: [
        { level: 2, cost: 300, title: 'Ninja hồi nhanh', desc: 'Giảm thời gian chờ kích hoạt Ninja từ 25 xuống 22 giây.' },
        { level: 3, cost: 750, title: 'Ninja bền bỉ', desc: 'Tăng thời gian duy trì Ninja từ 8 lên 12 giây.' },
        { level: 4, cost: 1200, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    },
    duyquandoi: {
      name: 'Duy Quân đội',
      levels: [
        { level: 2, cost: 400, title: 'Chi viện nhanh', desc: 'Giảm hồi chiêu Chi viện từ 38 xuống 33 giây.' },
        { level: 3, cost: 1000, title: 'Chi viện bền bỉ', desc: 'Tăng thời gian Chi viện từ 16 lên 19 giây.' },
        { level: 4, cost: 1600, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    }
  };
  const upgradeShowcaseInfo = {
    duy: { image: 'assets/nhan-vat.png', skill: 'HÀNH QUÂN', baseCooldown: 36, upgradedCooldown: 30, baseDuration: 12, upgradedDuration: 15, description: 'Miễn nhiễm chướng ngại vật trong thời gian kỹ năng.' },
    trong: { image: 'assets/trong-set.png', skill: 'SẤM SÉT', baseCooldown: 40, upgradedCooldown: 35, baseDuration: 15, upgradedDuration: 18, description: 'Gọi sét phá hủy chướng ngại vật trong thời gian kỹ năng.' },
    murat: { image: 'assets/mu-rat.png', skill: 'LƯỚT LƯỚT', baseCooldown: 36, upgradedCooldown: 30, baseDuration: 15, upgradedDuration: 18, description: 'Hóa thành bóng ma và lướt xuyên qua chướng ngại vật.' },
    toduy: { image: 'assets/to-duy.png', skill: 'NINJA', baseCooldown: 25, upgradedCooldown: 22, baseDuration: 8, upgradedDuration: 12, description: 'Thụ động: tự kích hoạt, katana chém đứt đôi mọi chướng ngại phía trước.' },
    duyquandoi: { image: 'assets/duy-quan-doi.png', skill: 'CHI VIỆN', baseCooldown: 38, upgradedCooldown: 33, baseDuration: 16, upgradedDuration: 19, description: 'Miễn nhiễm va chạm, gọi 2 Duy Hành quân hộ tống trước và sau.' }
  };
  let coinBalance = 0;
  let upgrades = { duy: 1, trong: 1, murat: 1, toduy: 1, duyquandoi: 1 };
  let upgradeCharacter = 'duy';
  let lastCoinScore = 0;
  let bonusMilestone = 0;
  let spareHits = 0;
  let runCoins = 0;
  let overAt = 0;
  let overTimer = 0;
  // --- V15: Crystal, vật phẩm, nhiệm vụ, Key, hiệu ứng katana ---
  let crystals = 0;
  let owned = { toduy: false, duyquandoi: false };
  let inventory = { shield: 0, magnet: 0, hourglass: 0, duration: 0 };
  let equipped = { shield: false, magnet: false, hourglass: false, duration: false };
  let miniKeys = 0;
  let bossUnlocked = false; // V19: đã mở khóa vĩnh viễn chế độ Đánh Boss (lưu localStorage)
  let bossMode = false;     // true khi đang trong trận Đánh Boss (không tính điểm mét)
  const BOSS_SKILL_MULT = 0.5; // Trận Boss: thời gian duy trì kỹ năng của mọi nhân vật giảm 50%
  let questData = null;
  let runItems = { shield: false, magnet: false, hourglass: false, duration: false };
  let hourglassRun = false;
  let durationRun = false;
  let runSkillCount = 0;
  let runBusHits = 0;
  let sliceFX = [];
  let slashFX = [];
  const NINJA_REACH = 150; // tầm chém phía trước nhân vật (px)
  try {
    coinBalance = Math.max(0, Number(localStorage.getItem('duyMapChayDiCoins') || 0));
    const savedUpgrades = JSON.parse(localStorage.getItem('duyMapChayDiUpgrades') || '{}');
    for (const key of Object.keys(upgrades)) upgrades[key] = Math.max(1, Math.min(4, Number(savedUpgrades[key]) || 1));
  } catch (_) { /* local storage may be unavailable */ }

  function saveEconomy() {
    try {
      localStorage.setItem('duyMapChayDiCoins', String(coinBalance));
      localStorage.setItem('duyMapChayDiUpgrades', JSON.stringify(upgrades));
    } catch (_) { /* local storage may be unavailable */ }
  }
  function skillInterval(key = selectedCharacter) {
    const lv = upgrades[key] || 1;
    let value;
    if (key === 'toduy') value = lv >= 2 ? 22 : 25;
    else if (key === 'duyquandoi') value = lv >= 2 ? 33 : 38;
    else if (key === 'trong') value = lv >= 2 ? 35 : 40;
    else value = lv >= 2 ? 30 : 36;
    // Vật phẩm giảm hồi chiêu: giảm 15% thời gian hồi trong các màn có hiệu lực (chỉ khi đang chạy).
    if (state === 'running' && hourglassRun && key === selectedCharacter) value = Math.round(value * 0.85 * 10) / 10;
    return value;
  }
  function skillDuration(key = selectedCharacter) {
    const lv = upgrades[key] || 1;
    let value;
    if (key === 'toduy') value = lv >= 3 ? 12 : 8;
    else if (key === 'duyquandoi') value = lv >= 3 ? 19 : 16;
    else {
      const base = key === 'duy' ? 12 : 15;
      value = lv >= 3 ? (key === 'duy' ? 15 : 18) : base;
    }
    // Vật phẩm 🔋: +15% thời gian duy trì kỹ năng trong màn chơi có hiệu lực (làm tròn 1 chữ số thập phân).
    if (state === 'running' && durationRun && key === selectedCharacter) value = Math.round(value * 1.15 * 10) / 10;
    // V19: trong trận Đánh Boss, thời gian duy trì của tất cả nhân vật giảm 50%.
    if (state === 'running' && bossMode) value = Math.round(value * BOSS_SKILL_MULT * 10) / 10;
    return value;
  }

  // ---------- Lưu trữ localStorage cho dữ liệu mới ----------
  const achv = { claimed: [], totalMeters: 0, totalGacha: 0, totalBusHits: 0 };
  const LS = {
    crystals: 'duyMapChayDiCrystals',
    owned: 'duyMapChayDiOwned',
    items: 'duyMapChayDiItems',
    achv: 'duyMapChayDiAchv',
    seenVersion: 'duyMapChayDiSeenVersion',
    keys: 'duyMapChayDiKeys',
    quests: 'duyMapChayDiQuests',
    shop: 'duyMapChayDiShop',
    boss: 'duyMapChayDiBossUnlocked'
  };
  function lsRead(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (_) { return fallback; }
  }
  function lsWrite(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* storage may be unavailable */ }
  }
  const toCount = (v, max = Infinity) => Math.min(max, Math.max(0, Math.floor(Number(v)) || 0));
  function loadMeta() {
    crystals = toCount(lsRead(LS.crystals, 0));
    const ownedSaved = lsRead(LS.owned, {}) || {};
    owned.toduy = !!ownedSaved.toduy;
    owned.duyquandoi = !!ownedSaved.duyquandoi;
    const items = lsRead(LS.items, {}) || {};
    inventory.shield = toCount(items.shield);
    inventory.magnet = toCount(items.magnet);
    inventory.hourglass = toCount(items.hourglass);
    inventory.duration = toCount(items.duration);
    // V17: vật phẩm giảm hồi chiêu chỉ còn 1 màn. Lượt còn dở của bản cũ được đổi thành 1 vật phẩm.
    if (toCount(items.hourglassCharges) > 0) inventory.hourglass++;
    const eq = items.equipped || {};
    equipped.shield = !!eq.shield;
    equipped.magnet = !!eq.magnet;
    equipped.hourglass = !!eq.hourglass;
    equipped.duration = !!eq.duration;
    miniKeys = toCount(lsRead(LS.keys, 0), 3);
    bossUnlocked = lsRead(LS.boss, false) === true;
    const av = lsRead(LS.achv, {}) || {};
    achv.claimed = Array.isArray(av.claimed) ? av.claimed.filter(id => typeof id === 'string') : [];
    achv.totalMeters = toCount(av.totalMeters);
    achv.totalGacha = toCount(av.totalGacha);
    achv.totalBusHits = toCount(av.totalBusHits);
  }
  function saveAchv() { lsWrite(LS.achv, achv); }
  function saveMeta() {
    lsWrite(LS.crystals, crystals);
    lsWrite(LS.owned, owned);
    lsWrite(LS.items, { ...inventory, equipped });
    lsWrite(LS.keys, miniKeys);
    lsWrite(LS.boss, bossUnlocked);
  }
  loadMeta();

  // ---------- Sảnh: thông tin nhân vật đang chọn ----------
  function updateLobby() {
    lobbyCoin.textContent = fmt(coinBalance);
    lobbyBest.textContent = formatScore(best);
    refreshCurrencies();
    updateMiniButton();
    updateEquipStrip();
    updateQuestDot();
    const info = upgradeShowcaseInfo[selectedCharacter];
    heroName.textContent = upgradeConfig[selectedCharacter].name;
    heroLevel.textContent = `LV ${upgrades[selectedCharacter]}`;
    heroSkill.textContent = `✦ ${info.skill}`;
    if (heroSprite.getAttribute('src') !== info.image) {
      heroSprite.src = info.image;
      heroSprite.alt = upgradeConfig[selectedCharacter].name;
      heroSprite.classList.remove('is-swap');
      void heroSprite.offsetWidth;
      heroSprite.classList.add('is-swap');
    }
  }

  // ---------- Popup: 3 thẻ nhân vật (chọn + nâng cấp) ----------
  function renderCharacterCards() {
    modalCoin.textContent = fmt(coinBalance);
    const keepScroll = cardRow.scrollLeft;
    const unlockedMuRat = isMuRatUnlocked();
    cardRow.innerHTML = Object.keys(characters).map((key) => {
      const cfg = upgradeConfig[key];
      const info = upgradeShowcaseInfo[key];
      const lv = upgrades[key];
      const locked = !isCharUnlocked(key);
      const selected = selectedCharacter === key;
      if (locked) {
        const isMuRat = key === 'murat';
        const pct = Math.min(100, Math.round(best / 3333 * 100));
        const lockText = isMuRat
          ? `Đạt <b>3.333 điểm</b> trong một ván để mở khóa.<br>Kỷ lục của bạn: ${fmt(best)}`
          : `Mở khóa vĩnh viễn từ <b>Gacha</b>.<br>${key === 'duyquandoi' ? '7,5% ra Duy Quân đội' : '7,5% ra Tô Duy'} mỗi hộp.`;
        return `<article class="char-card is-locked" data-key="${key}">
          <div class="card-art"><img src="${info.image}" alt="Nhân vật chưa mở khóa"><span class="lock-mark" aria-hidden="true">🔒</span><span class="card-tag">KHÓA</span></div>
          <h3 class="card-name">${cfg.name}</h3>
          <p class="card-skill">✦ ${info.skill}</p>
          <p class="card-lock-text">${lockText}</p>
          ${isMuRat ? `<div class="lock-progress" aria-label="Tiến độ mở khóa"><i style="width:${pct}%"></i></div>` : ''}
          <div class="card-actions"><button class="card-btn select" type="button" disabled>🔒 CHƯA MỞ KHÓA</button></div>
        </article>`;
      }
      const next = cfg.levels[lv - 1]; // thông tin cấp tiếp theo (lv + 1)
      const pips = [1, 2, 3, 4].map(n => `<i class="pip ${n <= lv ? 'on' : ''}"></i>`).join('') + '<i class="pip soon" title="Level 5 · Coming Soon"></i>';
      let upgradeBtn;
      if (!next) {
        upgradeBtn = `<button class="card-btn upgrade maxed" type="button" disabled>✓ ĐÃ TỐI ĐA</button>`;
      } else {
        const affordable = coinBalance >= next.cost;
        upgradeBtn = `<button class="card-btn upgrade" type="button" data-upgrade="${key}" ${affordable ? '' : 'disabled'} title="${affordable ? '' : 'Chưa đủ Coin'}">NÂNG CẤP LV${lv + 1} <span class="cost">🪙 ${fmt(next.cost)}</span></button>`;
      }
      return `<article class="char-card ${selected ? 'is-selected' : ''}" data-key="${key}">
        <div class="card-art"><img src="${info.image}" alt="${cfg.name}"><span class="card-lv px">LV ${lv}</span></div>
        <h3 class="card-name">${cfg.name}</h3>
        <p class="card-skill">✦ ${info.skill}</p>
        <div class="card-stats">
          <div class="card-stat"><span>HỒI CHIÊU</span><b>${skillInterval(key)}s</b></div>
          <div class="card-stat"><span>KỸ NĂNG</span><b>${skillDuration(key)}s</b></div>
          <div class="card-stat"><span>GIÁP</span><b>+${lv >= 4 ? 1 : 0}</b></div>
        </div>
        <div class="pips" aria-label="Cấp ${lv} trên 4">${pips}</div>
        <p class="card-next">${next ? `<b>LV${lv + 1}: ${next.title}</b><br>${next.desc}` : '<b>Đã đạt cấp cao nhất</b><br>Level 5 · Coming Soon'}</p>
        <div class="card-actions">
          <button class="card-btn select ${selected ? 'is-on' : ''}" type="button" data-select="${key}" ${selected ? 'disabled' : ''}>${selected ? '✓ ĐANG CHỌN' : 'CHỌN'}</button>
          ${upgradeBtn}
        </div>
      </article>`;
    }).join('');
    cardRow.scrollLeft = keepScroll;
  }
  cardRow.addEventListener('click', (event) => {
    const selectBtn = event.target.closest('[data-select]');
    const upgradeBtn = event.target.closest('[data-upgrade]');
    if (selectBtn && !selectBtn.disabled) {
      if (state !== 'running') loadCharacter(selectBtn.dataset.select);
    } else if (upgradeBtn && !upgradeBtn.disabled) {
      const key = upgradeBtn.dataset.upgrade;
      const lv = upgrades[key];
      const item = upgradeConfig[key].levels[lv - 1];
      if (!item || coinBalance < item.cost) return;
      coinBalance -= item.cost;
      upgrades[key] = lv + 1;
      saveEconomy();
      updateLobby();
      renderCharacterCards();
      playTone(660, 0.1, 'triangle', 0.035);
    }
  });

  // ---------- Popup: Hướng dẫn / Thành tựu ----------
  function achievementList() {
    const roster = Object.keys(upgrades);
    const maxLv = Math.max(...roster.map(k => upgrades[k]));
    const atLv4 = roster.filter(k => upgrades[k] >= 4).length;
    return [
      { id: 'a1', icon: '🏃', title: 'Khởi động', desc: 'Đạt 500 điểm trong một ván', cur: best, goal: 500, reward: 5 },
      { id: 'a2', icon: '🏜️', title: 'Nghìn dặm', desc: 'Đạt 1.000 điểm trong một ván', cur: best, goal: 1000, reward: 10 },
      { id: 'a3', icon: '🏙️', title: 'Vào thành phố', desc: 'Chạm tới map City ở 3.000 điểm', cur: best, goal: 3000, reward: 15 },
      { id: 'a4', icon: '👻', title: 'Triệu hồi Mu Rát', desc: 'Đạt 3.333 điểm để mở khóa Mu Rát', cur: best, goal: 3333, reward: 15 },
      { id: 'a5', icon: '🔥', title: 'Bá chủ đường phố', desc: 'Đạt 6.000 điểm trong một ván', cur: best, goal: 6000, reward: 25 },
      { id: 'a6', icon: '⚡', title: 'Lên đời', desc: 'Nâng một nhân vật lên Lv2', cur: maxLv, goal: 2, reward: 10 },
      { id: 'a7', icon: '🛡️', title: 'Cứng cáp', desc: 'Nâng một nhân vật lên Lv4 để có Giáp', cur: maxLv, goal: 4, reward: 15 },
      { id: 'a8', icon: '👑', title: 'Đội hình tối thượng', desc: `Nâng tất cả ${roster.length} nhân vật lên Lv4 (kể cả Tô Duy và Duy Quân đội)`, cur: atLv4, goal: roster.length, reward: 30 },
      { id: 'a9', icon: '🎁', title: 'Thợ săn kho báu', desc: 'Mở tổng cộng 5 hộp Gacha', cur: achv.totalGacha, goal: 5, reward: 15 },
      { id: 'a10', icon: '🛣️', title: 'Người chạy bền bỉ', desc: 'Chạy tích lũy tổng 20.000m qua mọi ván', cur: achv.totalMeters, goal: 20000, reward: 20 },
      { id: 'a11', icon: '🚌', title: 'Tài xế hung thần', desc: 'Tông trúng xe buýt tổng cộng 15 lần', cur: achv.totalBusHits, goal: 15, reward: 10 }
    ];
  }
  function renderAchievements() {
    achvList.innerHTML = achievementList().map((a) => {
      const done = a.cur >= a.goal;
      const claimed = achv.claimed.includes(a.id);
      const pct = Math.min(100, Math.round(a.cur / a.goal * 100));
      let stateHtml;
      if (claimed) stateHtml = '<span class="achv-state is-claimed">✓ ĐÃ NHẬN</span>';
      else if (done) stateHtml = `<button class="card-btn upgrade achv-claim" type="button" data-achv-claim="${a.id}">NHẬN 💎 ${a.reward}</button>`;
      else stateHtml = `<span class="achv-state">${fmt(Math.min(a.cur, a.goal))}/${fmt(a.goal)}<br>💎 ${a.reward}</span>`;
      return `<div class="achv ${done ? 'done' : ''} ${claimed ? 'claimed' : ''}">
        <span class="achv-ico" aria-hidden="true">${a.icon}</span>
        <div><strong>${a.title}</strong><p>${a.desc}</p><div class="achv-bar"><i style="width:${pct}%"></i></div></div>
        ${stateHtml}
      </div>`;
    }).join('');
  }
  achvList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-achv-claim]');
    if (!btn || btn.disabled) return;
    const a = achievementList().find(x => x.id === btn.dataset.achvClaim);
    if (!a || a.cur < a.goal || achv.claimed.includes(a.id)) return;
    achv.claimed.push(a.id);
    crystals += a.reward;
    saveAchv();
    saveMeta();
    playUiSound('claim');
    refreshCurrencies();
    updateLobby();
    renderAchievements();
    showToast(`ĐÃ NHẬN 💎 ${a.reward} — ${a.title}`);
  });
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-selected', t === tab));
    $('tabGuide').hidden = tab.dataset.tab !== 'guide';
    $('tabAchv').hidden = tab.dataset.tab !== 'achv';
    if (tab.dataset.tab === 'achv') renderAchievements();
  }));

  // ---------- Quản lý popup & màn hình ----------
  let activeModal = null;
  let modalOpener = null;
  function openModal(el, opener) {
    closeModal();
    activeModal = el;
    modalOpener = opener || null;
    el.hidden = false;
    const closeBtn = el.querySelector('.close-btn');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }
  function closeModal() {
    if (!activeModal) return;
    activeModal.hidden = true;
    activeModal = null;
    modalOpener = null;
    // Bỏ focus để phím Space ở sảnh luôn là "CHƠI NGAY" thay vì mở lại popup
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  document.querySelectorAll('.modal').forEach((modal) => modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) closeModal();
  }));
  function showScreen(name) {
    lobbyScreen.classList.toggle('is-active', name === 'lobby');
    gameScreen.classList.toggle('is-active', name === 'game');
  }
  function openCharacterModal() { renderCharacterCards(); openModal(characterModal, openCharactersBtn); }
  function openHelpModal() {
    renderAchievements();
    openModal(helpModal, openHelpBtn);
  }
  // ---------- News: bảng tin cập nhật ----------
  const NEWS_POSTS = [
    {
      version: 'V19', title: 'Đại Chiến Xe Tăng', date: '13/11/2026',
      items: [
        'Mini-game thay “Sắp ra mắt” bằng chế độ <b>Đánh Boss Xe Tăng</b>: thu thập 3/3 Key để mở khóa vĩnh viễn.',
        'Từ các lượt sau, mỗi lần khiêu chiến tốn <b>🔑 1 Key</b> hoặc <b>💎 15 Crystal</b>.',
        'Lụm hòm 🚀💣 trên đường để phản công, né đạn theo laser đỏ. Boss dưới 50% máu sẽ <b>nổi giận</b>.',
        'Hạ gục Boss nhận <b>💎 45</b> + thưởng thêm; thua vẫn có thưởng an ủi theo % máu Boss đã rút.',
        'Gacha: đang giữ đủ 3 Key mà ra thêm Key sẽ được đền bù <b>💎 15</b>.',
        'Giao diện <b>Duy Quân đội</b> đổi sang tông đỏ giống Tô Duy (cùng là nhân vật Gacha).'
      ]
    },
    {
      version: 'V18', title: 'Tiểu Đội Chi Viện', date: '12/11/2026',
      items: [
        'Ra mắt nhân vật mới <b>Duy Quân đội</b> trong Gacha với kỹ năng <i>Chi Viện</i>: gọi 2 Duy Hành quân bao kê.',
        'Thêm vật phẩm mới <b>🔋 Tăng 15% thời gian duy trì kỹ năng</b> trong Shop &amp; Gacha.',
        'Vật phẩm <b>×2 Coin</b> giảm giá còn <b>600 Coin</b> trong Shop.',
        'Mở rộng hệ thống <b>Thành tựu</b> với 11 mốc thử thách và phần thưởng <b>Crystal 💎</b>.',
        'Tối ưu hiển thị toàn màn hình trên điện thoại và ra mắt bảng tin <b>News</b>.'
      ]
    }
  ];
  const NEWS_LATEST = NEWS_POSTS[0].version;
  const newsModal = $('newsModal');
  const newsList = $('newsList');
  const openNewsBtn = $('openNews');
  const newsDot = $('newsDot');
  function updateNewsDot() { if (newsDot) newsDot.hidden = lsRead(LS.seenVersion, '') === NEWS_LATEST; }
  function renderNews() {
    newsList.innerHTML = NEWS_POSTS.map((p, i) => `<article class="news-post ${i === 0 ? 'is-latest' : ''}">
        <header><span class="news-ver px">${p.version}</span><div><strong>${p.title}</strong><small>${p.date}${i === 0 ? ' · MỚI NHẤT' : ''}</small></div></header>
        <ul>${p.items.map(t => `<li>${t}</li>`).join('')}</ul>
      </article>`).join('');
  }
  function openNewsModal() {
    renderNews();
    openModal(newsModal, openNewsBtn);
    lsWrite(LS.seenVersion, NEWS_LATEST);
    updateNewsDot();
  }
  openNewsBtn.addEventListener('click', openNewsModal);

  function toLobby(openUpgrades = false) {
    clearTimeout(overTimer);
    state = 'ready';
    bossMode = false;
    gameScreen.classList.remove('boss-mode');
    gameOver.hidden = true;
    showScreen('lobby');
    updateLobby();
    renderCharacterCards();
    if (openUpgrades) openCharacterModal();
  }
  playButton.addEventListener('click', () => startGame());
  openCharactersBtn.addEventListener('click', openCharacterModal);
  openHelpBtn.addEventListener('click', openHelpModal);
  retryButton.addEventListener('click', () => retryRun());
  backLobbyButton.addEventListener('click', () => toLobby(!bossMode));

  function awardCoinsForScore() {
    const whole = Math.floor(score);
    const distanceCoins = Math.floor(whole / 20) - Math.floor(lastCoinScore / 20);
    const reachedMilestone = Math.floor(whole / 1000);
    const bonusCoins = Math.max(0, reachedMilestone - bonusMilestone) * 100;
    if (distanceCoins > 0 || bonusCoins > 0) {
      const gained = (Math.max(0, distanceCoins) + bonusCoins) * (runItems.magnet ? 2 : 1);
      coinBalance += gained;
      runCoins += gained;
      lastCoinScore = whole;
      bonusMilestone = reachedMilestone;
      saveEconomy();
      if (bonusCoins > 0) showToast(`MỐC ${fmt(reachedMilestone * 1000)} ĐIỂM! +${bonusCoins * (runItems.magnet ? 2 : 1)} COIN THƯỞNG`);
    } else if (whole > lastCoinScore) lastCoinScore = whole;
  }

  // =====================================================================
  // V15 — Crystal · Nhiệm vụ hằng ngày · Gacha · Túi vật phẩm · Mini-game
  // =====================================================================
  const ITEMS = {
    shield: { icon: '🛡️', name: '+1 chống chịu', desc: 'Chịu thêm 1 va chạm trong 1 màn.', price: 2500 },
    magnet: { icon: '🪙', badge: '×2', name: '×2 Coin', desc: 'Nhân đôi Coin nhận được trong 1 màn.', price: 600 },
    hourglass: { icon: '⌛', name: 'Giảm thời gian hồi chiêu 15%', desc: 'Giảm 15% thời gian hồi chiêu trong 1 màn.', price: 3000 },
    duration: { icon: '🔋', name: 'Tăng 15% thời gian duy trì kỹ năng', desc: 'Kỹ năng kéo dài thêm 15% trong 1 màn.', price: 3600 }
  };
  // Biểu tượng vật phẩm dạng HTML: ×2 Coin hiện đồng xu kèm huy hiệu ×2 (không còn là nam châm).
  function itemIconHTML(key) {
    const it = ITEMS[key];
    return it.badge ? `<span class="item-ico-stack">${it.icon}<b class="item-ico-badge">${it.badge}</b></span>` : it.icon;
  }
  const itemIconText = (key) => ITEMS[key].icon + (ITEMS[key].badge || '');
  const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

  function refreshCurrencies() {
    const coinText = fmt(coinBalance);
    const crystalText = fmt(crystals);
    [lobbyCoin, modalCoin, $('questCoin'), $('gachaCoin'), $('shopCoin')].forEach(el => { if (el) el.textContent = coinText; });
    [lobbyCrystal, $('questCrystal'), $('gachaCrystal')].forEach(el => { if (el) el.textContent = crystalText; });
  }
  function updateMiniButton() {
    miniKeysLabel.textContent = `${miniKeys}/3`;
    miniIcon.textContent = (bossUnlocked || miniKeys >= 3) ? '🔓' : '🔒';
  }
  const itemAvailable = (key) => inventory[key] > 0;
  function updateEquipStrip() {
    const active = Object.keys(ITEMS).filter(k => equipped[k] && itemAvailable(k));
    equipStrip.hidden = active.length === 0;
    equipStrip.textContent = active.map(k => itemIconText(k)).join(' ') + ' ĐÃ TRANG BỊ';
  }

  // ---------- Vật phẩm: tiêu thụ khi bấm Chơi ----------
  function consumeEquippedItems(forBoss = false) {
    runItems = { shield: false, magnet: false, hourglass: false, duration: false };
    for (const key of ['shield', 'magnet', 'hourglass', 'duration']) {
      if (forBoss && key === 'magnet') continue; // ×2 Coin không áp dụng ở trận Boss: giữ nguyên vật phẩm, không tiêu hao
      if (equipped[key] && inventory[key] > 0) {
        inventory[key]--;
        runItems[key] = true;
      }
      equipped[key] = false; // mỗi lần chơi phải chọn lại trước khi bấm Chơi
    }
    hourglassRun = runItems.hourglass;
    durationRun = runItems.duration;
    saveMeta();
  }
  function runItemsToast() {
    const used = Object.keys(ITEMS).filter(k => runItems[k]).map(k => `${itemIconText(k)} ${ITEMS[k].name}`);
    return used.length ? `Đang dùng: ${used.join(' · ')}` : '';
  }
  function renderHudItems() {
    const parts = [];
    if (runItems.magnet) parts.push('<span class="hud-item" title="×2 Coin">🪙<small>×2</small></span>');
    if (runItems.hourglass) parts.push('<span class="hud-item" title="Giảm thời gian hồi chiêu 15%">⌛<small>-15%</small></span>');
    if (runItems.duration) parts.push('<span class="hud-item" title="Tăng 15% thời gian duy trì kỹ năng">🔋<small>+15%</small></span>');
    hudItems.innerHTML = parts.join('');
  }

  // ---------- Nhiệm vụ hằng ngày ----------
  const QUEST_POOL = {
    dist: [{ target: 1000, reward: 250 }, { target: 1200, reward: 350 }, { target: 1500, reward: 500 }],
    total: [{ target: 3000, reward: 300 }],
    bus: [{ target: 1, reward: 100 }, { target: 2, reward: 200 }],
    skill: [{ target: 2, reward: 250 }, { target: 3, reward: 400 }]
  };
  const QUEST_ICON = { dist: '🏃', total: '🛣️', bus: '🚌', skill: '✨' };
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function questText(q) {
    if (q.type === 'dist') return `Chạy đạt ${fmt(q.target)}m trong 1 màn`;
    if (q.type === 'total') return `Chạy tích lũy tổng ${fmt(q.target)}m qua nhiều màn`;
    if (q.type === 'bus') return `Tông vào xe buýt ${q.target} lần`;
    return `Kích hoạt kỹ năng ${q.target} lần trong một lượt chạy`;
  }
  function generateQuests(day) {
    const types = Object.keys(QUEST_POOL);
    for (let i = types.length - 1; i > 0; i--) { // xáo trộn Fisher–Yates
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    const quests = types.slice(0, 3).map((type, i) => {
      const variant = pickOne(QUEST_POOL[type]);
      return { id: `${day}-${i}`, type, target: variant.target, reward: variant.reward, progress: 0, claimed: false };
    });
    return { day, quests, bonusClaimed: false };
  }
  function saveQuests() { lsWrite(LS.quests, questData); }
  // Trả về true nếu vừa sang ngày mới (đã tạo nhiệm vụ mới).
  function ensureQuests() {
    const day = todayKey();
    const saved = questData || lsRead(LS.quests, null);
    const valid = saved && saved.day === day && Array.isArray(saved.quests) && saved.quests.length === 3 &&
      saved.quests.every(q => q && QUEST_POOL[q.type] && Number.isFinite(q.target) && Number.isFinite(q.reward));
    if (valid) { questData = saved; return false; }
    questData = generateQuests(day);
    saveQuests();
    return true;
  }
  function commitQuestsRun(finalScore) {
    ensureQuests();
    const meters = Math.floor(finalScore);
    questData.quests.forEach(q => {
      if (q.type === 'dist') q.progress = Math.max(q.progress, meters);
      else if (q.type === 'total') q.progress += meters;
      else if (q.type === 'bus') q.progress += runBusHits;
      else if (q.type === 'skill') q.progress = Math.max(q.progress, runSkillCount);
    });
    saveQuests();
  }
  function questsAllClaimed() { return questData.quests.every(q => q.claimed); }
  function updateQuestDot() {
    if (!questData) return;
    const claimable = questData.quests.some(q => !q.claimed && q.progress >= q.target);
    const bonus = questsAllClaimed() && !questData.bonusClaimed;
    questDot.hidden = !(claimable || bonus);
  }
  function renderQuests() {
    ensureQuests();
    refreshCurrencies();
    questList.innerHTML = questData.quests.map((q, i) => {
      const done = q.progress >= q.target;
      const shown = Math.min(q.progress, q.target);
      const pct = Math.round(shown / q.target * 100);
      const unit = q.type === 'dist' || q.type === 'total' ? 'm' : '';
      let action;
      if (q.claimed) action = '<button class="card-btn select is-on" type="button" disabled>✓ ĐÃ NHẬN</button>';
      else if (done) action = `<button class="card-btn upgrade" type="button" data-claim="${i}">NHẬN 🪙 ${fmt(q.reward)}</button>`;
      else action = `<button class="card-btn upgrade" type="button" disabled>🪙 ${fmt(q.reward)}</button>`;
      return `<div class="quest ${done ? 'done' : ''} ${q.claimed ? 'claimed' : ''}">
        <span class="quest-ico" aria-hidden="true">${QUEST_ICON[q.type]}</span>
        <div class="quest-main"><strong>${questText(q)}</strong><div class="achv-bar"><i style="width:${pct}%"></i></div><small>${fmt(shown)}/${fmt(q.target)}${unit}</small></div>
        ${action}
      </div>`;
    }).join('');
    if (questData.bonusClaimed) {
      questBonus.disabled = true;
      questBonus.textContent = '✓ ĐÃ NHẬN THƯỞNG LỚN · 10 💎';
    } else if (questsAllClaimed()) {
      questBonus.disabled = false;
      questBonus.textContent = 'NHẬN THƯỞNG LỚN · 10 💎';
    } else {
      questBonus.disabled = true;
      questBonus.textContent = '🔒 THƯỞNG LỚN · 10 💎 (NHẬN ĐỦ 3 NHIỆM VỤ)';
    }
  }
  questList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-claim]');
    if (!btn || btn.disabled) return;
    ensureQuests();
    const q = questData.quests[Number(btn.dataset.claim)];
    if (!q || q.claimed || q.progress < q.target) return;
    q.claimed = true;
    coinBalance += q.reward;
    saveEconomy();
    saveQuests();
    updateLobby();
    renderQuests();
    playTone(740, 0.1, 'triangle', 0.035);
  });
  questBonus.addEventListener('click', () => {
    ensureQuests();
    if (questData.bonusClaimed || !questsAllClaimed()) return;
    questData.bonusClaimed = true;
    crystals += 10;
    saveMeta();
    saveQuests();
    updateLobby();
    renderQuests();
    playTone(900, 0.14, 'triangle', 0.04);
  });

  // ---------- Gacha ----------
  const GACHA_PRICE = { 1: 15, 5: 65 };
  let gachaBusy = false;
  let lastBoxes = [];
  function rollBox() {
    const coin = 300 + Math.floor(Math.random() * 601); // 300–900
    coinBalance += coin;
    const roll = Math.random();
    let text;
    let rare = false;
    if (roll < 0.80) {
      const key = pickOne(Object.keys(ITEMS));
      inventory[key]++;
      text = `${itemIconText(key)} ${ITEMS[key].name} +1`;
    } else if (roll < 0.875) {
      // 7,5%: Tô Duy
      rare = true;
      if (owned.toduy) {
        crystals += 10;
        text = '🥷 Tô Duy (đã sở hữu) → hoàn 💎 10';
      } else {
        owned.toduy = true;
        text = '🥷 NHÂN VẬT MỚI: Tô Duy! Đã mở khóa vĩnh viễn';
      }
    } else if (roll < 0.95) {
      // 7,5%: Duy Quân đội (cùng 15% nhóm nhân vật, chia đều 50/50)
      rare = true;
      if (owned.duyquandoi) {
        crystals += 10;
        text = '🪖 Duy Quân đội (đã sở hữu) → hoàn 💎 10';
      } else {
        owned.duyquandoi = true;
        text = '🪖 NHÂN VẬT MỚI: Duy Quân đội! Đã mở khóa vĩnh viễn';
      }
    } else {
      rare = true;
      if (miniKeys < 3) {
        miniKeys++;
        text = `🔑 Key Mini-game (${miniKeys}/3)`;
      } else {
        crystals += 15; // đang giữ 3 Key chưa dùng → đền bù thay vì cộng thêm
        text = '🔑 Key Mini-game (đã đủ 3/3) → đền bù 💎 15';
      }
    }
    return { coin, text, rare };
  }
  function openBoxes(count) {
    const price = GACHA_PRICE[count];
    if (gachaBusy || !price || crystals < price) return;
    gachaBusy = true;
    crystals -= price;
    lastBoxes = Array.from({ length: count }, rollBox); // phần thưởng được ghi ngay, hiệu ứng chỉ để hiển thị
    achv.totalGacha += count;
    saveAchv();
    saveMeta();
    saveEconomy();
    updateLobby();
    renderCharacterCards();
    renderGacha(true);
    gachaBox.classList.remove('is-burst');
    gachaBox.classList.add('is-shaking');
    playTone(260, 0.5, 'sawtooth', 0.02);
    setTimeout(() => {
      gachaBox.classList.remove('is-shaking');
      gachaBox.classList.add('is-burst');
      gachaBusy = false;
      renderGacha(false);
      playTone(880, 0.18, 'triangle', 0.04);
    }, 950);
  }
  function renderGacha(opening = false) {
    refreshCurrencies();
    $('openX1').disabled = opening || gachaBusy || crystals < GACHA_PRICE[1];
    $('openX5').disabled = opening || gachaBusy || crystals < GACHA_PRICE[5];
    if (opening) { gachaResults.innerHTML = ''; return; }
    if (!lastBoxes.length) { gachaResults.innerHTML = ''; return; }
    const totalCoin = lastBoxes.reduce((sum, b) => sum + b.coin, 0);
    gachaResults.innerHTML = lastBoxes.map((b, i) => `<div class="gacha-row ${b.rare ? 'is-rare' : ''}" style="animation-delay:${i * 0.12}s">
        <span class="coin-text">🪙 +${fmt(b.coin)}</span><span>${b.text}</span></div>`).join('') +
      (lastBoxes.length > 1 ? `<div class="gacha-total">TỔNG: 🪙 +${fmt(totalCoin)}</div>` : '');
  }
  $('openX1').addEventListener('click', () => openBoxes(1));
  $('openX5').addEventListener('click', () => openBoxes(5));

  // ---------- Túi vật phẩm ----------
  function renderBag() {
    bagList.innerHTML = Object.keys(ITEMS).map((key) => {
      const info = ITEMS[key];
      const avail = itemAvailable(key);
      const on = equipped[key] && avail;
      const btn = on
        ? `<button class="card-btn select is-on" type="button" data-equip="${key}">✓ ĐÃ TRANG BỊ</button>`
        : `<button class="card-btn select" type="button" data-equip="${key}" ${avail ? '' : 'disabled'}>${avail ? 'TRANG BỊ' : 'CHƯA CÓ'}</button>`;
      return `<div class="bag-item ${on ? 'is-equipped' : ''}">
        <span class="bag-ico" aria-hidden="true">${itemIconHTML(key)}</span>
        <div><strong>${info.name}</strong><p>${info.desc}<br>Sở hữu: <b class="bag-count">${inventory[key]}</b></p></div>
        ${btn}
      </div>`;
    }).join('');
  }
  bagList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-equip]');
    if (!btn || btn.disabled) return;
    const key = btn.dataset.equip;
    if (!itemAvailable(key)) return;
    equipped[key] = !equipped[key];
    saveMeta();
    renderBag();
    updateEquipStrip();
  });

  // ---------- Shop ----------
  const SHOP_LIMIT = 3; // số lần mua mỗi vật phẩm mỗi ngày
  let shopData = null;
  let shopTab = 'common';
  function ensureShop() {
    const day = todayKey();
    const saved = shopData || lsRead(LS.shop, null);
    if (saved && saved.day === day && saved.bought && typeof saved.bought === 'object') { shopData = saved; return; }
    shopData = { day, bought: { shield: 0, magnet: 0, hourglass: 0, duration: 0 } };
    lsWrite(LS.shop, shopData);
  }
  const shopBought = (key) => toCount(shopData.bought[key], SHOP_LIMIT);
  const SHOP_LINES = {
    greet: ['Mua gì thì mua, đừng làm mất thời gian của ông Duy!', 'Vào đây! Hàng ông Duy toàn loại xịn.', 'Có tiền thì cứ mua, hết hàng là mai quay lại.'],
    buy: ['Hàng đẹp đấy, chạy cho nhanh nhé!', 'Cảm ơn quý khách. Chan pa gật đầu.', 'Giao dịch xong. Đi chơi đi!'],
    poor: ['Thiếu Coin rồi, đi chạy thêm đi!', 'Ví mỏng quá… chạy kiếm thêm Coin nhé.'],
    soldout: ['Hôm nay hết hàng món này, mai quay lại nhé!'],
    soon: ['Hàng này chưa về. Đợi ông Duy nhập đã!']
  };
  let shopBubbleTimer = 0;
  function shopSay(kind) {
    if (!shopBubble) return;
    shopBubble.textContent = pickOne(SHOP_LINES[kind] || SHOP_LINES.greet);
    shopBubble.classList.remove('is-pop');
    void shopBubble.offsetWidth;
    shopBubble.classList.add('is-pop');
    const img = $('shopkeeperImg');
    if (img && kind !== 'greet') {
      img.classList.remove('is-react');
      void img.offsetWidth;
      img.classList.add('is-react');
    }
    clearTimeout(shopBubbleTimer);
    shopBubbleTimer = setTimeout(() => { if (activeModal === shopModal) shopBubble.classList.remove('is-pop'); }, 4200);
  }
  function renderShop() {
    ensureShop();
    refreshCurrencies();
    document.querySelectorAll('.stab').forEach(t => t.classList.toggle('is-selected', t.dataset.stab === shopTab));
    if (shopTab !== 'common') {
      const name = shopTab === 'premium' ? 'CAO CẤP' : 'ĐẶC BIỆT';
      shopBody.innerHTML = `<div class="shop-soon"><span aria-hidden="true">🚧</span><strong>COMING SOON</strong><p>Mục <b>${name}</b> sẽ sớm ra mắt. Ông Duy đang đi nhập hàng!</p></div>`;
      return;
    }
    shopBody.innerHTML = '<div class="shop-list">' + Object.keys(ITEMS).map((key) => {
      const info = ITEMS[key];
      const bought = shopBought(key);
      const left = SHOP_LIMIT - bought;
      const soldOut = left <= 0;
      const poor = coinBalance < info.price;
      const label = soldOut ? 'HẾT LƯỢT HÔM NAY' : `MUA <span class="cost">🪙 ${fmt(info.price)}</span>`;
      return `<div class="shop-item ${soldOut ? 'is-soldout' : ''}">
        <span class="bag-ico" aria-hidden="true">${itemIconHTML(key)}</span>
        <div class="shop-item-main"><strong>${info.name}</strong><p>${info.desc}</p>
          <small>Đã mua hôm nay: <b class="bag-count">${bought}/${SHOP_LIMIT}</b> · Đang có: <b class="bag-count">${inventory[key]}</b></small></div>
        <button class="card-btn upgrade shop-buy ${poor && !soldOut ? 'is-poor' : ''}" type="button" data-buy="${key}" ${soldOut ? 'disabled' : ''}>${label}</button>
      </div>`;
    }).join('') + '</div>';
  }
  shopBody.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-buy]');
    if (!btn || btn.disabled) return;
    ensureShop();
    const key = btn.dataset.buy;
    const info = ITEMS[key];
    if (!info) return;
    if (shopBought(key) >= SHOP_LIMIT) { shopSay('soldout'); renderShop(); return; }
    if (coinBalance < info.price) { shopSay('poor'); showToast(`Chưa đủ Coin: cần ${fmt(info.price)} Coin.`); return; }
    coinBalance -= info.price;
    inventory[key]++;
    shopData.bought[key] = shopBought(key) + 1;
    lsWrite(LS.shop, shopData);
    saveEconomy();
    saveMeta();
    updateLobby();
    renderShop();
    shopSay('buy');
    playTone(780, 0.12, 'triangle', 0.035);
  });
  document.querySelectorAll('.stab').forEach((tab) => tab.addEventListener('click', () => {
    shopTab = tab.dataset.stab;
    renderShop();
    if (shopTab !== 'common') shopSay('soon'); else shopSay('greet');
  }));

  // ---------- Mini-game: Đánh Boss Xe Tăng ----------
  function renderMini() {
    const slots = [0, 1, 2].map(i => `<span class="key-slot ${i < miniKeys ? 'on' : ''}" aria-hidden="true">🔑</span>`).join('');
    const head = `<div class="key-slots" role="img" aria-label="${miniKeys} trên 3 Key">${slots}</div>
      <p class="px mini-count">${miniKeys}/3 KEY</p>`;
    if (!bossUnlocked) {
      const can = miniKeys >= BOSS_CFG.unlockKeys;
      miniBody.innerHTML = head + (can
        ? '<p>Bạn đã thu thập đủ <b>3/3 Key</b>! Mở khóa <b>vĩnh viễn</b> chế độ <b>Đánh Boss Xe Tăng</b> (tốn 3 Key, chỉ một lần).</p>'
        : '<p>Cần đủ <b>3/3 Key</b> để mở khóa chế độ <b>Đánh Boss Xe Tăng</b>.<br>Key có thể rơi ngẫu nhiên (5%) khi mở hộp Gacha.</p>') +
        `<button class="btn btn-play btn-small boss-unlock" type="button" data-boss="unlock" ${can ? '' : 'disabled'}><span aria-hidden="true">🔓</span><span>MỞ KHÓA CHẾ ĐỘ BOSS</span></button>`;
      return;
    }
    const keyOk = miniKeys >= 1;
    const crystalOk = crystals >= BOSS_CFG.crystalFee;
    miniBody.innerHTML = head + `
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
      <p class="mini-own">Đang có: 🔑 ${miniKeys}/3 · 💎 ${fmt(crystals)}</p>`;
  }
  miniBody.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-boss]');
    if (!btn || btn.disabled) return;
    const act = btn.dataset.boss;
    if (act === 'unlock') {
      if (bossUnlocked || miniKeys < BOSS_CFG.unlockKeys) return;
      miniKeys -= BOSS_CFG.unlockKeys; // trừ 3 Key, mở khóa vĩnh viễn
      bossUnlocked = true;
      saveMeta();
      updateLobby();
      renderMini();
      playUiSound('claim');
    } else {
      startBossRun(act);
    }
  });

  // ---------- Mở popup ----------
  function openQuestModal() { renderQuests(); openModal(questModal, $('openQuests')); }
  function openGachaModal() { renderGacha(false); openModal(gachaModal, $('openGacha')); }
  function openBagModal() { renderBag(); openModal(bagModal, $('openBag')); }
  function openShopModal() { renderShop(); openModal(shopModal, $('openShop')); shopSay('greet'); }
  function openMiniModal() { renderMini(); openModal(miniModal, $('openMini')); }
  $('openQuests').addEventListener('click', openQuestModal);
  $('openGacha').addEventListener('click', () => openGachaModal());
  $('openBag').addEventListener('click', openBagModal);
  $('openShop').addEventListener('click', openShopModal);
  $('openMini').addEventListener('click', openMiniModal);
  equipStrip.addEventListener('click', openBagModal);

  let achievedRecord = false;
  let score = 0;
  let state = 'ready'; // ready | running | over
  let width = 0;
  let height = 0;
  let dpr = 1;
  let groundY = 0;
  let lastTime = 0;
  let worldTime = 0;
  let worldDistance = 0; // Integrated travel distance keeps every scrolling layer synced to speed.
  let speed = 330;
  let spawnTimer = 1.05;
  let obstacles = [];
  let clouds = [];
  let particles = [];
  // ---------- Âm thanh: Web Audio API + nhạc nền MP3 ----------
  // 3 chế độ của nút loa: bật tất cả -> tắt nhạc -> tắt toàn bộ.
  let audioMode = 'all'; // all | music-off | mute
  try {
    const savedAudioMode = localStorage.getItem('duyMapChayDiAudioMode');
    if (['all', 'music-off', 'mute'].includes(savedAudioMode)) audioMode = savedAudioMode;
  } catch (_) { /* storage may be disabled */ }
  let musicOn = audioMode !== 'mute' && audioMode !== 'music-off';
  let sfxOn = audioMode !== 'mute';
  let audioContext = null;
  let musicAudio = null;
  let sfxGain = null;
  const MUSIC_VOLUME = 0.5;
  // Âm lượng SFX: nâng lên 0.25 - 0.45 để nghe rõ trên loa điện thoại.
  const sfxLevel = (v) => Math.min(0.45, Math.max(0.25, v * 10));
  let musicPausedByVisibility = false;
  let screenShake = 0;
  let routeStyle = 0;
  let overheadChance = 0.23;
  let elapsedRun = 0;
  let skillActiveUntil = 0;
  let skillTriggered = false;
  let nextSkillAt = 36;
  let lightningStrikes = [];
  let lightningStrikeTimer = 0;
  let nextScaffoldX = 0;
  let cityMode = false;
  let cityElapsed = 0;
  let platforms = [];
  let groundPlatform = null;
  let lightningFlash = 0;
  let lightningCooldown = 0;
  let muRatCloneX = -9999;
  let squadY = [0, 0]; // độ cao (có trễ) của 2 bản sao Duy trong kỹ năng Chi viện: [phía trước, phía sau]
  const squadSprite = new Image();
  squadSprite.onerror = () => console.error('Không tải được ảnh Duy hộ tống: assets/nhan-vat.png');
  squadSprite.src = 'assets/nhan-vat.png';
  let cityBuildings = [];


  const player = {
    x: 72,
    y: 0,
    width: 54,
    height: 86,
    velocityY: 0,
    gravity: 1900,
    jumpPower: 690,
    onGround: true,
    runPhase: 0
  };

  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function fitCanvas() {
    // clientWidth/Height không bị ảnh hưởng bởi hiệu ứng scale khi chuyển màn hình
    const box = { width: stage.clientWidth, height: stage.clientHeight };
    if (box.width < 2 || box.height < 2) return; // màn hình chơi đang ẩn
    const aspect = clamp(box.width / box.height, MIN_ASPECT, MAX_ASPECT);
    let cssW = box.width;
    let cssH = cssW / aspect;
    if (cssH > box.height) { cssH = box.height; cssW = cssH * aspect; }
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    height = clamp(LOGICAL_TARGET_W / aspect, LOGICAL_MIN_H, LOGICAL_MAX_H);
    width = Math.round(height * aspect);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const k = (cssW * dpr) / width;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    groundY = height - Math.max(32, height * 0.14);

    player.height = clamp(height * 0.31, 68, 100);
    const ratio = sprite.naturalWidth && sprite.naturalHeight
      ? sprite.naturalWidth / sprite.naturalHeight
      : 0.63;
    player.width = player.height * ratio;
    player.x = clamp(width * 0.105, 28, 95);
    if (player.onGround || state !== 'running') player.y = groundY - player.height;
    makeClouds();
  }

  function makeClouds() {
    clouds = [];
    const count = Math.max(4, Math.ceil(width / 145));
    for (let i = 0; i < count; i++) {
      clouds.push({ x: (i / count) * width + random(-30, 30), y: random(24, height * 0.37), scale: random(0.65, 1.25), speed: random(7, 18) });
    }
  }

  function formatScore(value) { return String(Math.floor(value)).padStart(5, '0'); }

  let hudCache = { score: '', coins: '' };
  function updateHud() {
    const sc = formatScore(score);
    if (sc !== hudCache.score) { hudCache.score = sc; scoreValue.textContent = sc; }
    const rc = `+${fmt(runCoins)}`;
    if (rc !== hudCache.coins) { hudCache.coins = rc; runCoinValue.textContent = rc; }
  }
  function updateShield(hit = false) {
    const has = upgrades[selectedCharacter] >= 4 || runItems.shield;
    shieldIcon.hidden = !has;
    shieldIcon.classList.toggle('is-used', has && spareHits <= 0);
    if (hit) {
      shieldIcon.classList.remove('is-hit');
      void shieldIcon.offsetWidth;
      shieldIcon.classList.add('is-hit');
    }
  }
  function showGameOver() {
    if (bossMode && bossResult) { showBossResult(); return; }
    overStats.hidden = false;
    overBest.hidden = false;
    bossResultEl.hidden = true;
    retryText.textContent = 'CHƠI LẠI';
    backLobbyButton.textContent = 'VỀ SẢNH / NÂNG CẤP';
    overPanel.classList.toggle('is-record', achievedRecord);
    overKicker.textContent = achievedRecord ? 'KỶ LỤC MỚI' : 'KẾT THÚC LƯỢT CHẠY';
    overTitle.textContent = achievedRecord ? 'Kỷ lục mới!' : 'Ôi, vấp mất rồi!';
    overScore.textContent = formatScore(score);
    overCoin.textContent = `+${fmt(runCoins)}`;
    overBest.textContent = `KỶ LỤC: ${formatScore(best)}`;
    gameOver.hidden = false;
  }

  function tryFullscreen() {
    // Chỉ thử trên thiết bị cảm ứng; bọc an toàn để iOS Safari (không hỗ trợ) không báo lỗi.
    try {
      if (!(window.matchMedia && matchMedia('(pointer: coarse)').matches)) return;
      const el = document.documentElement;
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!req) return;
      const result = req.call(el);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (_) { /* không hỗ trợ fullscreen */ }
  }

  function startGame(mode = 'score') {
    tryFullscreen();
    unlockAudioFromGesture();
    closeModal();
    clearTimeout(overTimer);
    gameOver.hidden = true;
    showScreen('game');
    fitCanvas();
    bossMode = mode === 'boss';
    gameScreen.classList.toggle('boss-mode', bossMode);
    state = 'running';
    score = 0;
    runCoins = 0;
    consumeEquippedItems(bossMode);
    runSkillCount = 0;
    runBusHits = 0;
    sliceFX = [];
    slashFX = [];
    lastCoinScore = 0;
    bonusMilestone = 0;
    spareHits = (upgrades[selectedCharacter] >= 4 ? 1 : 0) + (runItems.shield ? 1 : 0);
    achievedRecord = false;
    speed = bossMode ? BOSS_CFG.scroll : Math.min(width * 0.63, 380);
    routeStyle = Math.floor(Math.random() * 4);
    overheadChance = [0.18, 0.24, 0.30, 0.34][routeStyle];
    spawnTimer = random(0.8, 1.25);
    obstacles = [];
    particles = [];
    screenShake = 0;
    player.velocityY = 0;
    player.onGround = true;
    player.y = groundY - player.height;
    groundPlatform = null;
    worldTime = 0;
    worldDistance = 0;
    elapsedRun = 0;
    skillActiveUntil = 0;
    skillTriggered = false;
    nextSkillAt = skillInterval();
    muRatCloneX = -9999;
    lightningStrikes = [];
    cityMode = false;
    cityElapsed = 0;
    platforms = [];
    lightningFlash = 0;
    lightningCooldown = 0;
    cityBuildings = [];
    updateShield(false);
    renderHudItems();
    initBossRun();
    if (bossMode) {
      const eqMagnet = equipped.magnet && inventory.magnet > 0 ? ' · ×2 Coin không áp dụng ở trận Boss' : '';
      showToast(`ĐÁNH BOSS! Lụm hòm 🚀💣 để phản công, né đạn theo đường laser đỏ.${eqMagnet}${runItemsToast() ? ' · ' + runItemsToast() : ''}`);
    } else {
      showToast(runItemsToast() || 'Tập trung nhé — City mở ở 3.000 điểm. Mỗi nhân vật có tuyệt chiêu riêng.');
    }
    updateHud();
  }

  function endGame() {
    if (state !== 'running') return;
    if (bossMode) { finishBoss(false); return; } // hết tim: tính thưởng an ủi theo % máu Boss đã rút
    state = 'over';
    screenShake = 0.22;
    achievedRecord = Math.floor(score) > best;
    if (achievedRecord) {
      best = Math.floor(score);
      try { localStorage.setItem('duyMapChayDiBest', String(best)); } catch (_) { /* storage may be disabled */ }
    }
    burst(player.x + player.width * 0.6, player.y + player.height * 0.75, 12);
    commitQuestsRun(score);
    achv.totalMeters += Math.floor(score);
    achv.totalBusHits += runBusHits;
    saveAchv();
    overAt = performance.now();
    updateHud();
    updateLobby();
    renderCharacterCards();
    playTone(110, 0.16, 'sawtooth', 0.04);
    overTimer = setTimeout(() => { if (state === 'over') showGameOver(); }, 550);
  }

  function jump() {
    if (state !== 'running') return;
    if (player.onGround || groundPlatform) {
      player.velocityY = -player.jumpPower;
      player.onGround = false;
      groundPlatform = null;
      burst(player.x + player.width * 0.35, player.y + player.height, 5, true);
      playTone(470, 0.07, 'square', 0.025);
    }
  }

  // Nhạc nền phát trực tiếp bằng HTMLAudioElement (không qua Web Audio API).
  function ensureMusic() {
    if (!musicAudio) {
      musicAudio = new Audio('assets/Thangbanhuyenthoaibeat.mp3');
      musicAudio.loop = true;
      musicAudio.preload = 'auto';
      musicAudio.volume = MUSIC_VOLUME;
    }
    return musicAudio;
  }

  // Web Audio API chỉ dùng cho hiệu ứng (SFX).
  function ensureAudio() {
    ensureMusic();
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioContext = new AudioCtx();
      sfxGain = audioContext.createGain();
      sfxGain.gain.value = sfxOn ? 0.9 : 0;
      sfxGain.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }

  function startBackgroundMusic() {
    if (!musicOn || document.hidden) return;
    ensureAudio();
    if (!musicAudio) return;
    musicAudio.volume = MUSIC_VOLUME;
    const attempt = musicAudio.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        // Autoplay bị chặn thì lần chạm/phím tiếp theo sẽ thử phát lại.
      });
    }
  }

  function unlockAudioFromGesture() {
    if (!musicOn && !sfxOn) return;
    ensureAudio();
    if (musicOn && musicAudio && musicAudio.paused) {
      musicPausedByVisibility = false;
      startBackgroundMusic();
    }
  }

  function updateSoundButton() {
    const icon = audioMode === 'all' ? '🔊' : (audioMode === 'music-off' ? '🔉' : '🔇');
    const label = audioMode === 'all' ? 'BẬT' : (audioMode === 'music-off' ? 'NHẠC OFF' : 'TẮT HẾT');
    soundIcon.textContent = icon;
    soundText.textContent = label;
    soundButton.setAttribute('aria-pressed', String(audioMode !== 'mute'));
    soundButton.setAttribute('aria-label', `Chế độ âm thanh: ${label}. Chạm để đổi chế độ`);
    soundButton.title = `Chạm để đổi chế độ âm thanh (hiện tại: ${label})`;
  }

  function setAudioMode(mode) {
    audioMode = mode;
    musicOn = mode === 'all';
    sfxOn = mode !== 'mute';
    try { localStorage.setItem('duyMapChayDiAudioMode', mode); } catch (_) { /* storage may be disabled */ }
    if (audioContext && sfxGain) sfxGain.gain.value = sfxOn ? 0.9 : 0;
    if (musicAudio) {
      if (musicOn) musicAudio.volume = MUSIC_VOLUME;
      else musicAudio.pause();
    }
    if (musicOn) startBackgroundMusic();
    updateSoundButton();
  }

  function playTone(frequency, duration, type = 'sine', volume = 0.03) {
    if (!sfxOn) return;
    const audio = ensureAudio();
    if (!audio || !sfxGain) return;
    try {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, audio.currentTime);
      gain.gain.setValueAtTime(sfxLevel(volume), audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start();
      osc.stop(audio.currentTime + duration);
    } catch (_) { /* audio is optional */ }
  }

  function playUiSound(kind = 'tap') {
    if (!sfxOn) return;
    const audio = ensureAudio();
    if (!audio || !sfxGain) return;
    const now = audio.currentTime;
    const notes = {
      tap: [[520, 0.045, 'sine', 0.018]],
      select: [[520, 0.055, 'triangle', 0.026], [760, 0.075, 'triangle', 0.022]],
      upgrade: [[440, 0.07, 'triangle', 0.025], [660, 0.08, 'triangle', 0.03], [880, 0.11, 'sine', 0.026]],
      gacha: [[240, 0.10, 'sawtooth', 0.022], [360, 0.12, 'triangle', 0.025], [540, 0.15, 'sine', 0.03]],
      open: [[420, 0.055, 'sine', 0.018], [620, 0.07, 'triangle', 0.02]],
      close: [[480, 0.065, 'sine', 0.018], [330, 0.07, 'sine', 0.016]],
      claim: [[660, 0.08, 'triangle', 0.025], [990, 0.12, 'sine', 0.03]]
    };
    (notes[kind] || notes.tap).forEach(([freq, duration, type, volume], index) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const startAt = now + index * 0.065;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(sfxLevel(volume), startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(startAt);
      osc.stop(startAt + duration);
    });
  }

  // Mọi nút giao diện đều có phản hồi; các thao tác đặc biệt có âm riêng.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button, [role="tab"]');
    if (!button || button.disabled || button === soundButton) return;
    if (button.matches('[data-select], [data-equip]')) playUiSound('select');
    else if (button.matches('[data-upgrade]')) playUiSound('upgrade');
    else if (button.id === 'openX1' || button.id === 'openX5') playUiSound('gacha');
    else if (button.matches('[data-achv-claim]')) return; // âm 'claim' được phát trong handler nhận thưởng
    else if (button.matches('[data-claim], #questBonus')) playUiSound('claim');
    else if (button.matches('.close-btn, [data-close]')) playUiSound('close');
    else if (button.matches('.rail-btn, .tab, .stab, .btn, .card-btn, .equip-strip')) playUiSound('open');
    else playUiSound('tap');
  });

  // Bắt tương tác đầu tiên để mở khóa AudioContext và phát nhạc theo Autoplay Policy.
  // Nếu musicOn = true mà nhạc đang paused thì phát ngay ở lần chạm/phím đầu tiên, ở bất kỳ đâu.
  // Một số trình duyệt di động chỉ coi touchend/pointerup/click là "user activation",
  // nên đăng ký thêm các sự kiện này để play() chắc chắn được chấp nhận.
  const firstGestureHandler = (event) => {
    // Không bật nhạc thoáng qua nếu cú chạm đầu tiên chính là nút loa.
    if (event.target && event.target.closest && event.target.closest('#soundButton')) return;
    unlockAudioFromGesture();
  };
  ['pointerdown', 'touchstart', 'pointerup', 'touchend', 'click', 'keydown'].forEach((type) => {
    document.addEventListener(type, firstGestureHandler, { capture: true, passive: true });
  });

  function burst(x, y, count, dust = false, color = null) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: random(dust ? -100 : -145, dust ? 45 : 145),
        vy: random(dust ? -60 : -155, dust ? -12 : 45),
        life: random(0.22, 0.48),
        maxLife: 0.48,
        size: random(2, dust ? 4 : 5),
        dust,
        color
      });
    }
  }

  function addObstacle() {
    const spawnX = width + 28;
    const nearScaffold = (x, w, margin = 76) => platforms.some(p =>
      x < p.x + p.w + margin && x + w > p.x - margin
    );

    // City: increase bus frequency, but keep each bus separate from scaffold routes.
    if (cityMode && Math.random() < 0.35) {
      const h = clamp(height * random(0.34, 0.42), 72, 118);
      const ratio = busSprite.naturalWidth && busSprite.naturalHeight
        ? busSprite.naturalWidth / busSprite.naturalHeight : 1.42;
      const w = h * ratio;
      if (!nearScaffold(spawnX, w, 64)) {
        obstacles.push({ x: spawnX, y: groundY - h, w, h, type: 'bus', passed: false });
      }
      return;
    }

    const roll = Math.random();
    // Floating cans now also appear in City as independent obstacles.
    const canChance = cityMode ? 0.30 : overheadChance;
    if (roll < canChance) {
      const h = random(45, 62);
      const w = h * random(0.68, 0.84);
      const lane = Math.random() < 0.5 ? 'low' : 'high';
      const y = lane === 'low'
        ? groundY - player.height - h * random(0.18, 0.35)
        : groundY - player.height - h - random(8, 30);
      if (!cityMode || !nearScaffold(spawnX, w, 66)) {
        obstacles.push({ x: spawnX, y, w, h, type: 'can', lane, passed: false, bobOffset: random(0, 6.28), bobSpeed: random(1.1, 2.2) });
      }
      return;
    }

    // City wall obstacles are created only by the occasional scaffold-combo route.
    const rollGround = Math.random();
    let type = cityMode ? 'crate' : 'cactus';
    if (!cityMode) {
      if (rollGround < 0.22) type = 'double';
      else if (rollGround < 0.43) type = 'crate';
      else if (rollGround < 0.61) type = 'tall';
    }
    const scale = random(0.9, 1.15);
    const w = type === 'double' ? 44 : type === 'crate' ? (cityMode ? 38 : 34) : type === 'tall' ? 30 : 23;
    const h = type === 'crate' ? (cityMode ? 40 : 35) : type === 'double' ? 48 : type === 'tall' ? random(66, 80) : 42;
    const finalW = w * scale;
    if (cityMode && nearScaffold(spawnX, finalW, 76)) return;
    obstacles.push({ x: spawnX, y: groundY - h * scale, w: finalW, h: h * scale, type, passed: false, scale });
  }

  // V17: giàn giáo ở map City giảm mạnh ~80% (khoảng cách giữa hai cụm giàn giáo dài gấp ~8 lần).
  const CITY_SCAFFOLD_GAP_MULT = 8;
  // V17: bia, thùng, xe buýt xuất hiện nhiều hơn ~40% (khoảng chờ giữa hai vật cản ngắn lại).
  const CITY_OBSTACLE_RATE = 1.4;
  function cityGroundGap() {
    // Faster scrolling needs a longer ground segment so the player can fall off a deck,
    // touch down, and still have room to jump onto the next one.
    return (random(235, 295) + Math.max(0, speed - 231) * 0.24) * CITY_SCAFFOLD_GAP_MULT;
  }

  function enterCity() {
    if (cityMode) return;
    cityMode = true;
    cityElapsed = 0;
    // Reset City to the same 0.7x opening pace, then ramp up gradually.
    speed = 231; // 231 / 330 = 0.7x
    // Do not let desert obstacles or their old platforms leak into the City map.
    obstacles = [];
    platforms = [];
    groundPlatform = null;
    player.onGround = true;
    player.velocityY = 0;
    player.y = groundY - player.height;
    spawnTimer = 0.8;
    cityBuildings = [];
    // City route deliberately alternates: ground run -> raised scaffold -> ground gap.
    const firstX = width + 255;
    const firstW = random(155, 190);
    platforms.push({ x: firstX, y: groundY - random(76, 94), w: firstW, h: 12, type: 'scaffold', passed: false });
    nextScaffoldX = firstX + firstW + cityGroundGap();
    lightningStrikes = [];
    lightningStrikeTimer = 0;
    showToast('MAP CITY! Xe buýt, thùng, bia dày đặc; thỉnh thoảng có dàn giáo làm bệ nhảy.');
    playTone(740, 0.12, 'triangle', 0.035);
  }

  // =====================================================================
  // V19 — ĐÁNH BOSS XE TĂNG (mở khóa bằng 3/3 Key, vào chơi tốn 1 Key hoặc 15 Crystal)
  // =====================================================================
  const BOSS_CFG = {
    name: 'XE TĂNG CHIẾN ĐẤU',
    maxHp: 120,          // tổng máu Boss
    rocketDmg: 5,        // hòm đạn → tên lửa bay thẳng
    bombDmg: 8,          // hòm bom → bay vòng cung, đau hơn
    lives: 2,            // số tim mặc định (giáp Lv4 / vật phẩm khiên cộng thêm qua spareHits)
    invuln: 1.2,         // giây bất tử sau khi trúng đòn
    telegraph: 0.7,      // giây hiện laser đỏ cảnh báo trước khi bắn đạn pháo
    missileWindup: 0.4,  // giây Boss nạp tên lửa trước khi phóng
    restMin: 1.3,        // nhịp nghỉ giữa các đợt ra chiêu
    restMax: 1.6,
    rageRate: 1.25,      // Phase 2: ra chiêu nhanh hơn 25%
    rageAt: 0.5,         // Phase 2 khi máu Boss còn ≤ 50%
    shellSpeed: 560,     // đạn pháo nhanh (px/s)
    missileSpeed: 270,   // tên lửa hành trình chậm hơn
    scroll: 300,         // tốc độ cuộn nền cố định trong trận Boss
    crystalFee: 15,
    unlockKeys: 3
  };
  const BOSS_REWARD = {
    winCrystal: 45,
    winCoin: 2000,
    winCoinChance: 0.8,       // 80% ra 2.000 Coin, 20% ra thêm 10 Crystal
    winBonusCrystal: 10,
    lossLow: { crystal: 5, coin: 500 },    // rút < 50% máu Boss
    lossHigh: { crystal: 10, coin: 700 }   // rút ≥ 50% máu Boss (đã vào Phase 2)
  };

  const bossBar = $('bossBar');
  const bossFill = $('bossFill');
  const bossPct = $('bossPct');
  const heartsEl = $('hearts');
  const overStats = $('overStats');
  const bossResultEl = $('bossResult');
  const retryText = $('retryText');

  const bossSprite = new Image();
  bossSprite.onload = () => { if (state !== 'running') render(); };
  bossSprite.onerror = () => console.error('Không tải được ảnh Boss: assets/boss-tank.png');
  bossSprite.src = 'assets/boss-tank.png';

  function makeBoss() {
    return {
      hp: BOSS_CFG.maxHp, maxHp: BOSS_CFG.maxHp, rage: false, dead: false, deadT: 0, deadFxT: 0,
      lives: BOSS_CFG.lives, invuln: 0, cd: 1.7, attack: null, recoil: 0, hitFlash: 0,
      shells: [], missiles: [], pickups: [], shots: [], blasts: [],
      pickupTimer: 1.1, crateTimer: 2.4, hits: 0, shownPct: -1, shownHearts: ''
    };
  }
  let boss = makeBoss();
  let bossResult = null;

  // ----- Hình học Boss -----
  function bossRect() {
    const ratio = bossSprite.naturalWidth && bossSprite.naturalHeight ? bossSprite.naturalWidth / bossSprite.naturalHeight : 2.04;
    const w = width * 0.28; // chiếm ~28% chiều ngang
    const h = w / ratio;
    // Nhún nhẹ theo nhịp di chuyển của nền
    const bob = state === 'running' && !boss.dead ? Math.abs(Math.sin(worldTime * 7)) * 2.4 : 0;
    return { x: width - w - 4 + boss.recoil * 28, y: groundY + 7 - h - bob, w, h };
  }
  function bossMuzzle() { const r = bossRect(); return { x: r.x + r.w * 0.03, y: r.y + r.h * 0.07 }; }
  function bossCenter() { const r = bossRect(); return { x: r.x + r.w * 0.42, y: r.y + r.h * 0.5 }; }
  // Tầm thấp: phải nhảy qua. Tầm cao: đứng yên dưới đất là né được.
  function bossLaneY(lane) { return lane === 'low' ? groundY - player.height * 0.30 : groundY - player.height - 6; }

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
  function initBossRun() {
    boss = makeBoss();
    bossResult = null;
    bossBar.hidden = !bossMode;
    heartsEl.hidden = !bossMode;
    bossBar.classList.remove('is-rage');
    if (bossMode) { updateBossHud(); updateHearts(); }
  }

  // ----- Chọn nhịp ra chiêu: không để hai mối nguy tới người chơi cùng lúc (luôn có đường né) -----
  function bossThreatTimes() {
    const px = player.x + player.width * 0.5;
    const times = [];
    boss.shells.forEach(s => times.push((s.x - px) / s.vx));
    boss.missiles.forEach(m => times.push((m.x - px) / m.vx));
    obstacles.forEach(o => times.push((o.x + o.w * 0.5 - px) / Math.max(1, speed)));
    if (boss.attack) times.push(boss.attack.t + (bossMuzzle().x - px) / boss.attack.vx);
    return times.filter(t => t > -0.5);
  }
  const bossConflict = (t) => bossThreatTimes().some(other => Math.abs(other - t) < 0.9);

  function startBossAttack() {
    const px = player.x + player.width * 0.5;
    const mx = bossMuzzle().x;
    let attack;
    if (Math.random() < 0.6) {
      // Chiêu 1: đạn pháo nhanh, có laser đỏ cảnh báo
      attack = { type: 'shell', lane: Math.random() < 0.5 ? 'low' : 'high', t: BOSS_CFG.telegraph, vx: BOSS_CFG.shellSpeed };
    } else {
      // Chiêu 2: tên lửa hành trình bay chậm ở độ cao ngẫu nhiên (tầm thấp hoặc tầm cao)
      const low = Math.random() < 0.5;
      const y = low ? groundY - player.height * random(0.22, 0.40) : groundY - player.height - random(10, 30);
      attack = { type: 'missile', y, t: BOSS_CFG.missileWindup, vx: BOSS_CFG.missileSpeed };
    }
    if (bossConflict(attack.t + (mx - px) / attack.vx)) { boss.cd = 0.15; return; }
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
      playTone(130, 0.16, 'sawtooth', 0.05);
    } else {
      boss.missiles.push({ x: m.x - 40, y: a.y, w: 46, h: 16, vx: a.vx, smoke: 0 });
      boss.blasts.push({ x: m.x - 6, y: a.y, life: 0.2, max: 0.2, r: 18, color: '#ff9a3a' });
      boss.recoil = 0.12;
      playTone(210, 0.22, 'triangle', 0.045);
    }
    boss.attack = null;
    // Nhịp nghỉ 1,3–1,6 giây; Phase 2 ra chiêu nhanh hơn 25%
    boss.cd = random(BOSS_CFG.restMin, BOSS_CFG.restMax) / (boss.rage ? BOSS_CFG.rageRate : 1);
  }

  function enterBossRage() {
    boss.rage = true;
    bossBar.classList.add('is-rage');
    boss.crateTimer = 1.8;
    screenShake = Math.max(screenShake, 0.4);
    const c = bossCenter();
    burst(c.x, c.y, 24, false, '#ff7a2b');
    showToast('BOSS NỔI GIẬN! Ra chiêu nhanh hơn, thùng gỗ & rào chắn xuất hiện trên đường!');
    playTone(90, 0.4, 'sawtooth', 0.05);
  }

  // ----- Trúng đòn -----
  function hurtBossPlayer() {
    if (boss.invuln > 0 || state !== 'running') return;
    boss.invuln = BOSS_CFG.invuln;
    screenShake = Math.max(screenShake, 0.22);
    burst(player.x + player.width * 0.5, player.y + player.height * 0.5, 18, false, '#ff7a2b');
    playTone(140, 0.2, 'sawtooth', 0.05);
    if (spareHits > 0) {
      spareHits--;
      updateShield(true);
      showToast(`GIÁP BẢO HỘ! Còn ${spareHits} giáp · ${boss.lives} tim.`);
    } else {
      boss.lives--;
      updateHearts(true);
      if (boss.lives <= 0) { endGame(); return; }
      showToast(`TRÚNG ĐẠN! Còn ${boss.lives} tim. Bất tử ${BOSS_CFG.invuln} giây.`);
    }
  }

  // ----- Hòm đạn / bom: lụm để phản công -----
  function spawnBossPickup() {
    const spawnX = width + 30;
    let lane = Math.random() < 0.5 ? 'low' : 'high';
    if (lane === 'low' && obstacles.some(o => Math.abs(o.x - spawnX) < 150)) lane = 'high';
    const w = 32, h = 28;
    const y = lane === 'low' ? groundY - h - 3 : groundY - player.height - 56;
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
    burst(p.x + p.w / 2, p.y + p.h / 2, 8, false, '#ffd34d');
    playTone(bomb ? 220 : 520, 0.12, 'square', 0.03);
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
    burst(s.tx, s.ty, s.kind === 'bomb' ? 16 : 10, false, '#ff9a3a');
    screenShake = Math.max(screenShake, s.kind === 'bomb' ? 0.2 : 0.14);
    playTone(s.kind === 'bomb' ? 95 : 130, 0.2, 'sawtooth', 0.05);
    updateBossHud();
    if (boss.hp <= 0) defeatBoss();
    else if (!boss.rage && boss.hp <= boss.maxHp * BOSS_CFG.rageAt) enterBossRage();
  }
  function defeatBoss() {
    boss.dead = true;
    boss.deadT = 0;
    boss.deadFxT = 0;
    boss.attack = null;
    boss.shells = []; boss.missiles = []; boss.pickups = []; boss.shots = [];
    screenShake = 0.5;
    finishBoss(true);
  }

  // ----- Tên lửa bị Ninja chém / Sét giật nổ -----
  function sliceMissile(m) {
    m.dead = true;
    slashFX.push({ x: m.x + m.w / 2, y: m.y, w: m.w, h: m.h * 2, life: 0.3, max: 0.3 });
    boss.blasts.push({ x: m.x + m.w / 2, y: m.y, life: 0.3, max: 0.3, r: 28 });
    burst(m.x + m.w / 2, m.y, 10, false, '#ff9a3a');
    playTone(random(900, 1300), 0.06, 'sawtooth', 0.025);
  }
  function zapMissile(m) {
    m.dead = true;
    lightningFlash = 0.28;
    lightningStrikes.push({ x: m.x + m.w / 2, y: m.y, life: 0.62, max: 0.62 });
    boss.blasts.push({ x: m.x + m.w / 2, y: m.y, life: 0.3, max: 0.3, r: 28 });
    burst(m.x + m.w / 2, m.y, 12, false, '#ff9a3a');
    if (lightningCooldown <= 0) { lightningCooldown = 0.18; playTone(random(520, 900), 0.07, 'square', 0.025); }
  }

  function spawnBossObstacle() {
    const spawnX = width + 30;
    if (Math.random() < 0.55) {
      const s = random(0.95, 1.2);
      obstacles.push({ x: spawnX, y: groundY - 35 * s, w: 34 * s, h: 35 * s, type: 'crate', passed: true, scale: s });
    } else {
      obstacles.push({ x: spawnX, y: groundY - 42, w: 48, h: 42, type: 'barrier', passed: true });
    }
  }

  // ----- Vòng cập nhật chính của trận Boss (gọi trong update() khi đang chạy) -----
  function updateBossFight(dt, skillActive) {
    if (!bossMode || boss.dead || state !== 'running') return;
    const phasing = skillActive && (selectedCharacter === 'duy' || selectedCharacter === 'murat' || selectedCharacter === 'duyquandoi');
    const ninja = skillActive && selectedCharacter === 'toduy';
    const thunder = skillActive && selectedCharacter === 'trong';
    boss.invuln = Math.max(0, boss.invuln - dt);

    if (!boss.rage && boss.hp <= boss.maxHp * BOSS_CFG.rageAt) enterBossRage();

    // Máy trạng thái ra chiêu
    if (boss.attack) {
      boss.attack.t -= dt;
      if (boss.attack.t <= 0) fireBossAttack();
    } else {
      boss.cd -= dt;
      if (boss.cd <= 0) startBossAttack();
    }

    // Đạn pháo (không bị Ninja/Sét phá được)
    boss.shells.forEach(s => { s.x -= s.vx * dt; });
    // Tên lửa (Ninja chém đứt / Sét giật nổ được)
    boss.missiles.forEach(m => {
      m.x -= m.vx * dt;
      m.smoke -= dt;
      if (m.smoke <= 0) {
        m.smoke = 0.07;
        particles.push({ x: m.x + m.w, y: m.y, vx: random(10, 40), vy: random(-16, 4), g: -20, life: 0.5, maxLife: 0.5, size: random(3, 5), dust: true, color: 'rgba(120,120,120,.7)' });
      }
      if (m.dead) return;
      if (ninja &&
          m.x < player.x + player.width + NINJA_REACH && m.x + m.w > player.x + player.width * 0.2 &&
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
        if (state !== 'running') break;
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
    if (state !== 'running') return;

    // Hòm đạn / bom trên đường
    boss.pickupTimer -= dt;
    if (boss.pickupTimer <= 0) { spawnBossPickup(); boss.pickupTimer = random(1.7, 2.7); }
    boss.pickups.forEach(p => { p.x -= speed * dt; });
    boss.pickups.forEach(p => { if (!p.taken && rectHitsPlayer(p.x, p.y, p.w, p.h, -0.1)) collectBossPickup(p); });
    boss.pickups = boss.pickups.filter(p => !p.taken && p.x + p.w > -20);

    // Phase 2: thùng gỗ / rào chắn
    if (boss.rage) {
      boss.crateTimer -= dt;
      if (boss.crateTimer <= 0) {
        const spawnX = width + 30;
        const arrive = (spawnX - player.x - player.width * 0.5) / speed;
        const lowPickupNear = boss.pickups.some(p => p.lane === 'low' && Math.abs(p.x - spawnX) < 130);
        if (lowPickupNear || bossConflict(arrive)) boss.crateTimer = 0.2;
        else { spawnBossObstacle(); boss.crateTimer = random(2.4, 3.6); }
      }
    }

    // Tên lửa / bom của người chơi bay về phía Boss
    boss.shots.forEach(s => {
      s.t += dt;
      if (Math.random() < dt * 40) {
        const p = shotPos(s);
        particles.push({ x: p.x, y: p.y, vx: random(-30, 10), vy: random(-10, 10), g: 0, life: 0.3, maxLife: 0.3, size: random(2, 4), dust: false, color: s.kind === 'bomb' ? '#b8b8b8' : '#ffb347' });
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
        const x = r.x + random(0.1, 0.9) * r.w;
        const y = r.y + random(0.1, 0.9) * r.h;
        boss.blasts.push({ x, y, life: 0.4, max: 0.4, r: random(26, 46) });
        burst(x, y, 10, false, '#ff9a3a');
        screenShake = Math.max(screenShake, 0.12);
        playTone(random(80, 170), 0.18, 'sawtooth', 0.04);
      }
    }
  }

  // ----- Kết thúc trận Boss: tính thưởng, lưu localStorage -----
  function finishBoss(win) {
    if (state !== 'running' || !bossMode) return;
    state = 'over';
    overAt = performance.now();
    const R = BOSS_REWARD;
    const phase2 = boss.hp <= boss.maxHp * BOSS_CFG.rageAt;
    const res = { win, drained: clamp(1 - boss.hp / boss.maxHp, 0, 1), crystal: 0, coin: 0, base: 0, bonusCoin: 0, bonusCrystal: 0, tier: null, hits: boss.hits };
    if (win) {
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
    crystals += res.crystal;
    coinBalance += res.coin;
    saveEconomy();
    saveMeta();
    bossResult = res;
    if (!win) {
      screenShake = 0.22;
      burst(player.x + player.width * 0.6, player.y + player.height * 0.75, 12);
      playTone(110, 0.16, 'sawtooth', 0.04);
    } else {
      playTone(660, 0.2, 'triangle', 0.045);
    }
    updateHud();
    updateLobby();
    renderCharacterCards();
    overTimer = setTimeout(() => { if (state === 'over') showGameOver(); }, win ? 1300 : 650);
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
  function startBossRun(method) {
    if (state === 'running' || !bossUnlocked) return;
    if (method === 'key') {
      if (miniKeys < 1) return;
      miniKeys--;
    } else if (method === 'crystal') {
      if (crystals < BOSS_CFG.crystalFee) return;
      crystals -= BOSS_CFG.crystalFee;
    } else return;
    saveMeta();
    updateLobby();
    startGame('boss');
  }
  function retryRun() {
    if (bossMode) { toLobby(false); openMiniModal(); } // trận Boss phải trả phí lại
    else startGame();
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
    const r = bossRect();
    const shakeX = boss.hitFlash > 0 ? random(-2, 2) : 0;
    ctx.fillStyle = 'rgba(40, 60, 30, .24)';
    ctx.beginPath(); ctx.ellipse(r.x + r.w * 0.5, groundY + 4, r.w * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    if (boss.rage && !boss.dead) {
      // Phase 2: hào quang đỏ cam bao quanh xe tăng
      const pulse = 0.28 + Math.sin(worldTime * 9) * 0.1;
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
      ctx.fillStyle = '#2b2f2a'; roundedRect(r.x + r.w * 0.03, r.y + r.h * 0.78, r.w * 0.94, r.h * 0.22, 8); ctx.fill();
      ctx.fillStyle = '#4f6b3a'; roundedRect(r.x + r.w * 0.05, r.y + r.h * 0.42, r.w * 0.9, r.h * 0.4, 8); ctx.fill();
      ctx.fillStyle = '#5d7c43'; roundedRect(r.x + r.w * 0.25, r.y + r.h * 0.16, r.w * 0.5, r.h * 0.32, 8); ctx.fill();
      ctx.fillStyle = '#3d5230'; ctx.fillRect(r.x, r.y + r.h * 0.2, r.w * 0.34, r.h * 0.08);
    }
    ctx.restore();
  }
  function drawBossLaser() {
    const a = boss.attack;
    if (!a || state !== 'running') return;
    const m = bossMuzzle();
    const prog = clamp(1 - a.t / (a.type === 'shell' ? BOSS_CFG.telegraph : BOSS_CFG.missileWindup), 0, 1);
    const pulse = 0.5 + Math.sin(worldTime * 30) * 0.5;
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
      ctx.beginPath(); ctx.moveTo(m.x, a.y); ctx.lineTo(m.x - 90, a.y); ctx.stroke();
    }
    ctx.restore();
  }
  function drawBossShell(s) {
    const g = ctx.createLinearGradient(s.x + s.w, 0, s.x + s.w + 48, 0);
    g.addColorStop(0, 'rgba(255, 170, 60, .6)');
    g.addColorStop(1, 'rgba(255, 170, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(s.x + s.w - 2, s.y - 3, 50, 6);
    ctx.fillStyle = '#3a3f3a';
    roundedRect(s.x, s.y - s.h / 2, s.w, s.h, 6); ctx.fill();
    ctx.fillStyle = '#d6a24a';
    roundedRect(s.x, s.y - s.h / 2, s.w * 0.32, s.h, 5); ctx.fill();
    ctx.fillStyle = '#7a2d1f';
    ctx.fillRect(s.x + s.w * 0.78, s.y - s.h / 2, 4, s.h);
  }
  function drawBossMissile(m) {
    const flick = Math.sin(worldTime * 50) * 4;
    ctx.fillStyle = `rgba(255, 140, 40, ${0.75 + Math.sin(worldTime * 40) * 0.2})`;
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
    roundedRect(m.x + 8, m.y - m.h / 2 + 2, m.w - 10, m.h - 4, 5); ctx.fill();
    ctx.fillStyle = '#d63b2f'; // đầu đạn
    ctx.beginPath();
    ctx.moveTo(m.x + 12, m.y - m.h / 2 + 2); ctx.lineTo(m.x, m.y); ctx.lineTo(m.x + 12, m.y + m.h / 2 - 2);
    ctx.closePath(); ctx.fill();
  }
  function drawPlayerShot(s) {
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
      ctx.beginPath(); ctx.arc(3, -14, 2.5 + Math.sin(worldTime * 40), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.rotate(ang);
      ctx.fillStyle = 'rgba(255, 160, 50, .85)';
      ctx.beginPath(); ctx.moveTo(-14, -3); ctx.lineTo(-26 + Math.sin(worldTime * 50) * 3, 0); ctx.lineTo(-14, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e4e8e4'; roundedRect(-14, -4, 26, 8, 4); ctx.fill();
      ctx.fillStyle = '#d63b2f';
      ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(20, 0); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawBossPickup(p) {
    const bob = Math.sin(worldTime * 4 + p.phase) * 2;
    ctx.save();
    ctx.translate(0, bob);
    ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#5b7a3a';
    roundedRect(p.x, p.y, p.w, p.h, 5); ctx.fill();
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

  function activateSkill() {
    skillTriggered = true;
    runSkillCount++;
    const duration = skillDuration();
    skillActiveUntil = elapsedRun + duration;
    lightningCooldown = 0;
    if (selectedCharacter === 'duy') {
      showToast(`HÀNH QUÂN kích hoạt: Duy xuyên chướng ngại vật trong ${duration} giây!`);
      burst(player.x + player.width / 2, player.y + player.height / 2, 24);
      playTone(300, 0.18, 'sawtooth', 0.035);
    } else if (selectedCharacter === 'trong') {
      showToast(`SÉT kích hoạt: sấm sét phá chướng ngại vật trong ${duration} giây!`);
      lightningFlash = 0.4;
      playTone(180, 0.24, 'sawtooth', 0.05);
    } else if (selectedCharacter === 'duyquandoi') {
      squadY = [player.y, player.y];
      showToast(`CHI VIỆN kích hoạt: tiểu đội Duy hộ tống, miễn nhiễm va chạm trong ${duration} giây!`);
      burst(player.x + player.width / 2, player.y + player.height / 2, 26);
      playTone(260, 0.2, 'sawtooth', 0.035);
    } else if (selectedCharacter === 'toduy') {
      showToast(`NINJA kích hoạt: katana chém đứt chướng ngại vật phía trước trong ${duration} giây!`);
      burst(player.x + player.width / 2, player.y + player.height / 2, 18);
      playTone(880, 0.12, 'sawtooth', 0.03);
    } else {
      muRatCloneX = player.x + player.width * 0.55;
      showToast(`LƯỚT LƯỚT: Mu Rát hóa hồn ma, bản sao lướt xuyên chướng ngại vật trong ${duration} giây!`);
      burst(player.x + player.width / 2, player.y + player.height / 2, 28);
      playTone(620, 0.2, 'triangle', 0.04);
    }
  }

  // Kiểm tra bệ đỡ dưới chân (xe buýt / giàn giáo). Ngay khi chân vượt mép bệ,
  // trạng thái tiếp đất bị huỷ để trọng lực áp dụng và nhân vật rơi xuống.
  function validateSupport() {
    if (groundPlatform) {
      const platformStillExists = obstacles.includes(groundPlatform) || platforms.includes(groundPlatform);
      const footLeft = player.x + player.width * 0.28;
      const footRight = player.x + player.width * 0.72;
      const overlaps = platformStillExists &&
        footRight > groundPlatform.x + 1 &&
        footLeft < groundPlatform.x + groundPlatform.w - 1;
      const feetAligned = Math.abs((player.y + player.height) - groundPlatform.y) <= 6;
      if (overlaps && feetAligned && player.velocityY >= 0) {
        player.y = groundPlatform.y - player.height;
        player.velocityY = 0;
        player.onGround = true;
      } else {
        // Chân đã vượt mép bệ (hoặc bệ biến mất / chân không còn sát mặt bệ): huỷ tiếp đất ngay
        // để trọng lực áp dụng trong cùng khung hình, không để nhân vật lơ lửng.
        groundPlatform = null;
        player.onGround = false;
      }
    }
    // Lưới an toàn: "đứng trên đất" nhưng chân cao hơn mặt đường mà không có bệ đỡ -> rơi.
    if (player.onGround && !groundPlatform && player.y + player.height < groundY - 1) {
      player.onGround = false;
    }
  }

  function update(dt) {
    worldTime += dt;
    if (state === 'running') worldDistance += speed * dt;
    clouds.forEach(cloud => {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -90) { cloud.x = width + random(10, 120); cloud.y = random(22, height * 0.36); }
    });

    if (state === 'running') {
      elapsedRun += dt;
      // First activation follows the base interval; every later cooldown starts after the active window ends.
      if (elapsedRun >= nextSkillAt) {
        activateSkill();
        // Cooldown is a full, independent interval AFTER the skill expires.
        // This prevents upgraded duration (Lv.3) from eating into the cooldown.
        nextSkillAt = skillActiveUntil + skillInterval();
      }
      const skillActive = elapsedRun < skillActiveUntil && skillTriggered;
      if (selectedCharacter === 'duyquandoi' && skillActive) {
        // Hai bản sao bám theo player.y với độ trễ nhẹ để tạo cảm giác chạy/nhảy đồng bộ.
        squadY[0] += (player.y - squadY[0]) * Math.min(1, dt * 20);
        squadY[1] += (player.y - squadY[1]) * Math.min(1, dt * 12);
      }
      if (selectedCharacter === 'murat' && skillActive) {
        muRatCloneX += speed * dt * 1.75;
        if (muRatCloneX > width + player.width + 30) muRatCloneX = -player.width;
      }
      lightningStrikes.forEach(strike => { strike.life -= dt; strike.x -= speed * dt * 0.35; });
      lightningStrikes = lightningStrikes.filter(strike => strike.life > 0);
      lightningCooldown = Math.max(0, lightningCooldown - dt);
      lightningStrikeTimer = Math.max(0, lightningStrikeTimer - dt);

      if (!bossMode && score >= 3000 && !cityMode) enterCity();
      if (bossMode) {
        speed = BOSS_CFG.scroll; // tốc độ cuộn cố định trong trận Boss
      } else if (cityMode) {
        cityElapsed += dt;
        // City starts more slowly, then gradually ramps up to the normal late-game pace.
        const cityTarget = Math.min(625, 231 + cityElapsed * 13.5);
        speed += (cityTarget - speed) * Math.min(1, dt * 1.5);
      } else {
        speed = Math.min(690, speed + dt * 5.5);
      }

      if (!bossMode) {
        score += dt * (speed / 9.4);
        awardCoinsForScore();
        if (score >= 3333) refreshCharacterLocks();
        spawnTimer -= dt;
      } else spawnTimer = 99;
      if (spawnTimer <= 0) {
        addObstacle();
        const difficulty = clamp((speed - 300) / 500, 0, 0.48);
        spawnTimer = random(cityMode ? 0.92 : 1.05, cityMode ? 1.42 : 1.62) - difficulty * (cityMode ? 0.45 : 1);
        if (cityMode) spawnTimer = Math.max(0.6, spawnTimer / CITY_OBSTACLE_RATE);
      }

      // Scroll platforms before checking whether the player is still supported.
      platforms.forEach(platform => { platform.x -= speed * dt; });
      platforms = platforms.filter(platform => platform.x + platform.w > -20);
      if (cityMode) {
        // Spawn a new scaffold only after the previous one is almost behind the player.
        // The long ground gap between decks makes the route alternate naturally.
        nextScaffoldX -= speed * dt;
        if (nextScaffoldX < width + 145 && platforms.length < 4) {
          const deckX = Math.max(width + 115, nextScaffoldX);
          const soloScaffold = Math.random() < 0.70;
          if (soloScaffold) {
            // Frequent standalone scaffold: a clear, readable jump-and-land opportunity.
            const deckW = random(165, 205);
            const deckY = groundY - random(82, 108);
            platforms.push({ x: deckX, y: deckY, w: deckW, h: 14, type: 'scaffold', passed: false, solo: true });
            nextScaffoldX = deckX + deckW + cityGroundGap() * 0.92;
          } else {
            // Less frequent and less punishing scaffold + wall combination.
            const deckY = groundY - random(104, 118);
            const firstW = random(132, 150);
            const gap = random(12, 22);
            const secondW = random(132, 150);
            const secondX = deckX + firstW + gap;
            platforms.push({ x: deckX, y: deckY, w: firstW, h: 14, type: 'scaffold', passed: false });
            platforms.push({ x: secondX, y: deckY + random(-3, 3), w: secondW, h: 14, type: 'scaffold', passed: false });

            const upperW = random(105, 122);
            const upperY = deckY - random(48, 60);
            const upperOnLeft = Math.random() < 0.5;
            const upperX = upperOnLeft
              ? deckX + random(0, Math.max(0, firstW - upperW) * 0.25)
              : secondX + Math.max(0, secondW - upperW) - random(0, Math.max(0, secondW - upperW) * 0.25);
            platforms.push({ x: upperX, y: upperY, w: upperW, h: 14, type: 'scaffold', passed: false, upperVariant: upperOnLeft ? 'left' : 'right' });

            // Shorter wall and a more generous landing gap than the previous build.
            const wallX = secondX + secondW + random(34, 52);
            const wallW = random(54, 66);
            const wallH = Math.min(groundY - upperY - player.height * 0.42, random(92, 108));
            obstacles.push({ x: wallX, y: groundY - wallH, w: wallW, h: wallH, type: 'wall', passed: false, cityWall: true, scaffoldVariant: upperOnLeft ? 'upper-left' : 'upper-right' });
            nextScaffoldX = wallX + wallW + cityGroundGap() * 1.05;
          }
        }
      }

      validateSupport();

      player.runPhase += dt * speed * 0.055;
      const previousBottom = player.y + player.height;
      if (!player.onGround) {
        player.velocityY += player.gravity * dt;
        player.y += player.velocityY * dt;
        if (player.y >= groundY - player.height) {
          player.y = groundY - player.height;
          player.velocityY = 0;
          player.onGround = true;
          groundPlatform = null;
          burst(player.x + player.width * 0.42, groundY - 1, 3, true);
        }
      }

      obstacles.forEach(obstacle => {
        obstacle.x -= speed * dt;
        if (obstacle.type === 'can') {
          obstacle.y += Math.sin(worldTime * obstacle.bobSpeed + obstacle.bobOffset) * 7 * dt;
        }
        if (!obstacle.passed && obstacle.x + obstacle.w < player.x) {
          obstacle.passed = true;
          if (!bossMode) {
            score += 4;
            awardCoinsForScore();
          }
        }

        // Ninja: katana chém đứt đôi mọi chướng ngại trong tầm chém (cả trên không khi nhân vật nhảy).
        if (selectedCharacter === 'toduy' && skillActive && !obstacle.destroyedByNinja && groundPlatform !== obstacle) {
          const bandTop = player.y - 64;
          const bandBottom = player.y + player.height + 28;
          if (obstacle.x < player.x + player.width + NINJA_REACH &&
              obstacle.x + obstacle.w > player.x + player.width * 0.2 &&
              obstacle.y + obstacle.h > bandTop && obstacle.y < bandBottom) {
            ninjaSlice(obstacle);
          }
        }

        // Sét clears obstacles in front of Trọng while the skill is active.
        if (selectedCharacter === 'trong' && skillActive && !obstacle.destroyedByLightning &&
            obstacle.x > player.x - 4 && obstacle.x < player.x + 360) {
          obstacle.destroyedByLightning = true;
          // Every destroyed obstacle gets a visible cloud-and-bolt effect; no per-obstacle timer race.
          lightningFlash = 0.28;
          lightningStrikes.push({
            x: obstacle.x + obstacle.w / 2,
            y: obstacle.y + obstacle.h * 0.45,
            life: 0.62,
            maxLife: 0.62
          });
          burst(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, 14);
          if (lightningCooldown <= 0) {
            lightningCooldown = 0.18;
            playTone(random(520, 900), 0.07, 'square', 0.025);
          }
        }
      });
      obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.w > -30 && !obstacle.destroyedByLightning && !obstacle.destroyedByNinja);
      validateSupport(); // bus đã dịch chuyển xong: kiểm tra lại bệ đỡ ngay trong cùng khung hình

      // Swept one-way landing on bus roofs and scaffold decks; side/front contact remains dangerous.
      const landingSurfaces = [...obstacles.filter(o => o.type === 'bus'), ...platforms];
      if (!player.onGround && player.velocityY > 0) {
        for (const surface of landingSurfaces) {
          const footLeft = player.x + player.width * 0.28;
          const footRight = player.x + player.width * 0.72;
          const horizontallyOverlapping = footRight > surface.x + 1 &&
            footLeft < surface.x + surface.w - 1;
          const bottom = player.y + player.height;
          const landingTolerance = Math.max(30, player.velocityY * dt + 12);
          if (horizontallyOverlapping && previousBottom <= surface.y + 12 &&
              bottom >= surface.y - 2 && bottom <= surface.y + landingTolerance) {
            player.y = surface.y - player.height;
            player.velocityY = 0;
            player.onGround = true;
            groundPlatform = surface;
            burst(player.x + player.width * 0.45, surface.y, 4, true);
            break;
          }
        }
      }

      // Nhiệm vụ: đếm mỗi lần tông vào một chiếc xe buýt (đáp lên nóc xe không tính).
      obstacles.forEach(obstacle => {
        if (obstacle.type !== 'bus' || obstacle.hitCounted || groundPlatform === obstacle) return;
        const landingOnTop = player.velocityY >= 0 &&
          player.x + player.width * 0.72 > obstacle.x &&
          player.x + player.width * 0.28 < obstacle.x + obstacle.w &&
          player.y + player.height <= obstacle.y + 16;
        if (!landingOnTop && checkCollision(obstacle)) { obstacle.hitCounted = true; runBusHits++; }
      });

      // Hành quân ignores collision while its 10-second window is active.
      if (!(skillActive && (selectedCharacter === 'duy' || selectedCharacter === 'murat' || selectedCharacter === 'duyquandoi'))) {
        obstacles.forEach(obstacle => {
          if (obstacle.type === 'bus' && player.onGround && groundPlatform === obstacle) return;
          if (checkCollision(obstacle)) {
            // Falling onto a bus is a landing, not a crash.
            if (obstacle.type === 'bus' && player.velocityY >= 0 &&
                player.x + player.width * 0.72 > obstacle.x &&
                player.x + player.width * 0.28 < obstacle.x + obstacle.w &&
                player.y + player.height <= obstacle.y + 16) return;
            if (bossMode) {
              // Trận Boss: trúng thùng/rào mất 1 giáp/tim + bất tử tạm 1,2 giây (không chết ngay)
              if (boss.invuln <= 0) { obstacle.ignored = true; hurtBossPlayer(); }
              return;
            }
            if (spareHits > 0) {
              spareHits--;
              updateShield(true);
              obstacle.ignored = true;
              burst(player.x + player.width * 0.5, player.y + player.height * 0.5, 20);
              showToast(`GIÁP BẢO HỘ! Đã đỡ va chạm, còn ${spareHits} lượt chịu đòn.`);
              playTone(250, 0.16, 'triangle', 0.045);
            } else {
              endGame();
            }
          }
        });
      }
      updateBossFight(dt, skillActive);
      lightningFlash = Math.max(0, lightningFlash - dt);
    }

    sliceFX.forEach(f => { f.life -= dt; f.o.x -= (state === 'running' ? speed : 0) * dt * 0.9; });
    sliceFX = sliceFX.filter(f => f.life > 0);
    slashFX.forEach(f => { f.life -= dt; f.x -= (state === 'running' ? speed : 0) * dt * 0.9; });
    slashFX = slashFX.filter(f => f.life > 0);
    particles.forEach(p => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.g === undefined ? 340 : p.g) * dt;
    });
    particles = particles.filter(p => p.life > 0);
    screenShake = Math.max(0, screenShake - dt);
    if (bossMode) { updateBossFX(dt); updateBossHud(); }
    updateHud();
  }

  function checkCollision(obstacle) {
    if (obstacle.ignored) return false;
    const pw = Math.max(player.width * 0.52, player.height * 0.30);
    const px = player.x + player.width * 0.25 - (pw - player.width * 0.52) / 2;
    const py = player.y + player.height * 0.12;
    const ph = player.height * 0.84;
    if (obstacle.type === 'wall') {
      const ox = obstacle.x + 2, oy = obstacle.y + 2;
      const ow = obstacle.w - 4, oh = obstacle.h - 2;
      return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
    }
    if (obstacle.type === 'bus') {
      // Deliberately rectangular hitbox around the visible bus body.
      const ox = obstacle.x + obstacle.w * 0.06;
      const oy = obstacle.y + obstacle.h * 0.12;
      const ow = obstacle.w * 0.88;
      const oh = obstacle.h * 0.86;
      return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
    }
    const isCan = obstacle.type === 'can';
    const ox = obstacle.x + obstacle.w * (isCan ? 0.16 : 0.12);
    const oy = obstacle.y + obstacle.h * (isCan ? 0.10 : 0.08);
    const ow = obstacle.w * (isCan ? 0.68 : 0.76);
    const oh = obstacle.h * (isCan ? 0.80 : 0.90);
    return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
  }

  function drawBackground() {
    if (cityMode) {
      drawCityBackground();
      return;
    }
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#edf5d9');
    sky.addColorStop(1, '#f8f8e9');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Soft sun and drifting clouds.
    ctx.fillStyle = 'rgba(203, 230, 145, .48)';
    ctx.beginPath();
    ctx.arc(width * 0.82, height * 0.20, Math.min(37, height * 0.13), 0, Math.PI * 2);
    ctx.fill();
    clouds.forEach(c => drawCloud(c.x, c.y, c.scale));

    // Distant rounded hills.
    ctx.fillStyle = '#dce9bf';
    ctx.beginPath();
    ctx.moveTo(0, groundY - 21);
    for (let x = 0; x <= width + 30; x += 30) {
      const y = groundY - 23 - Math.sin(x * 0.011 + worldTime * 0.2) * 10 - Math.sin(x * 0.023) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, groundY + 2); ctx.lineTo(0, groundY + 2); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#d1e2af';
    ctx.beginPath();
    ctx.moveTo(0, groundY - 7);
    for (let x = 0; x <= width + 25; x += 25) {
      ctx.lineTo(x, groundY - 11 - Math.sin(x * 0.015 + 1.2) * 6);
    }
    ctx.lineTo(width, groundY + 3); ctx.lineTo(0, groundY + 3); ctx.closePath(); ctx.fill();

    // Ground strip.
    ctx.fillStyle = '#e5edcf';
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.strokeStyle = '#789c63';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, groundY + 0.5); ctx.lineTo(width, groundY + 0.5); ctx.stroke();

    ctx.strokeStyle = 'rgba(89, 132, 72, .22)';
    ctx.lineWidth = 1.5;
    const offset = state === 'running' ? (worldDistance * 1.0) % 64 : worldTime * 8 % 64;
    for (let x = -offset; x < width + 40; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, groundY + 13); ctx.lineTo(x + 20, groundY + 13); ctx.stroke();
    }
    for (let x = 22; x < width; x += 97) {
      const gx = (x - (state === 'running' ? worldDistance * 0.5 : worldTime * 14) % (width + 30) + width + 30) % (width + 30);
      ctx.fillStyle = 'rgba(100, 148, 75, .38)';
      ctx.fillRect(gx, groundY + 22 + (x % 2) * 4, 3, 2);
    }
  }

  function drawCityBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#b8e3f5');
    sky.addColorStop(0.72, '#e4f3ef');
    sky.addColorStop(1, '#f2f5e9');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 237, 154, .72)';
    ctx.beginPath(); ctx.arc(width * .82, height * .17, Math.min(30, height * .10), 0, Math.PI * 2); ctx.fill();
    clouds.forEach(c => drawCloud(c.x, c.y, c.scale * .8));

    const scroll = (state === 'running' ? worldDistance * .22 : worldTime * 25) % 210;
    for (let i = -1; i < Math.ceil(width / 210) + 2; i++) {
      const x = i * 210 - scroll;
      const seed = (i + 20) % 3;
      const bw = 105 + seed * 22;
      const bh = height * (0.31 + seed * 0.07);
      const by = groundY - bh;
      ctx.fillStyle = ['#a8c9d5', '#91b8c8', '#b7d0d8'][seed];
      roundedRect(x, by, bw, bh, 5); ctx.fill();
      ctx.fillStyle = 'rgba(245,251,238,.72)';
      for (let wy = by + 14; wy < groundY - 18; wy += 22) {
        for (let wx = x + 12; wx < x + bw - 10; wx += 20) {
          ctx.fillRect(wx, wy, 9, 11);
        }
      }

    }

    ctx.fillStyle = '#c6d9d0'; ctx.fillRect(0, groundY, width, height - groundY);
    ctx.fillStyle = '#617e83'; ctx.fillRect(0, groundY, width, 3);
    ctx.fillStyle = '#f8f1c6';
    const offset = state === 'running' ? (worldDistance * 1.0) % 80 : worldTime * 8 % 80;
    for (let x = -offset; x < width + 50; x += 80) ctx.fillRect(x, groundY + 18, 38, 3);
  }

  function drawCloud(x, y, scale) {
    ctx.fillStyle = 'rgba(255, 255, 250, .75)';
    ctx.beginPath();
    ctx.ellipse(x, y + 6 * scale, 22 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 10 * scale, y + 3 * scale, 10 * scale, 9 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 5 * scale, y, 13 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCactus(x, y, w, h) {
    ctx.save(); ctx.translate(x, y); ctx.scale(w / 28, h / 48);
    ctx.fillStyle = '#398957';
    roundedRect(7, 7, 13, 41, 5); ctx.fill();
    roundedRect(0, 21, 9, 6, 3); ctx.fill();
    roundedRect(0, 15, 5, 12, 2); ctx.fill();
    roundedRect(18, 16, 10, 6, 3); ctx.fill();
    roundedRect(23, 8, 5, 14, 2); ctx.fill();
    ctx.fillStyle = '#80bd73';
    ctx.fillRect(10, 11, 2, 30); ctx.fillRect(3, 18, 1.5, 5); ctx.fillRect(25, 10, 1.5, 7);
    ctx.restore();
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function drawCrate(obstacle) {
    const { x, y, w, h } = obstacle;
    ctx.fillStyle = '#c88745';
    roundedRect(x, y, w, h, 4); ctx.fill();
    ctx.strokeStyle = '#8a5d37'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#e7b575'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + w - 5, y + h - 5); ctx.moveTo(x + w - 5, y + 5); ctx.lineTo(x + 5, y + h - 5); ctx.stroke();
  }

  function drawObstacle(o) {
    if (o.type === 'wall') {
      ctx.fillStyle = '#8d969c';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#b8c0c4';
      for (let yy = o.y + 8; yy < o.y + o.h; yy += 18) {
        ctx.fillRect(o.x + 5, yy, o.w - 10, 3);
      }
      ctx.strokeStyle = '#657078'; ctx.lineWidth = 2; ctx.strokeRect(o.x, o.y, o.w, o.h);
      return;
    }
    if (o.type === 'bus') {
      if (busSprite.complete && busSprite.naturalWidth > 0) {
        ctx.drawImage(busSprite, o.x, o.y, o.w, o.h);
      } else {
        ctx.fillStyle = '#1686bd'; ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#cdeefa'; ctx.fillRect(o.x + o.w * .12, o.y + o.h * .12, o.w * .72, o.h * .30);
      }
      return;
    }
    if (o.type === 'can') {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#33402b';
      ctx.beginPath();
      ctx.ellipse(o.x + o.w * 0.5, o.y + o.h + 3, o.w * 0.4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (canSprite.complete && canSprite.naturalWidth > 0) {
        ctx.drawImage(canSprite, o.x, o.y, o.w, o.h);
      } else {
        ctx.fillStyle = '#c8a72d'; roundedRect(o.x, o.y, o.w, o.h, 8); ctx.fill();
      }
      return;
    }
    if (o.type === 'barrier') {
      // Rào chắn sọc vàng-đen (Phase 2 của Boss)
      ctx.fillStyle = '#6b6f73';
      ctx.fillRect(o.x + 3, o.y + o.h * 0.35, 5, o.h * 0.65);
      ctx.fillRect(o.x + o.w - 8, o.y + o.h * 0.35, 5, o.h * 0.65);
      ctx.save();
      ctx.beginPath(); ctx.rect(o.x, o.y, o.w, o.h * 0.5); ctx.clip();
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(o.x, o.y, o.w, o.h * 0.5);
      ctx.fillStyle = '#2b2b2b';
      for (let sx = o.x - o.h * 0.5; sx < o.x + o.w; sx += 14) {
        ctx.beginPath(); ctx.moveTo(sx, o.y + o.h * 0.5); ctx.lineTo(sx + 7, o.y + o.h * 0.5); ctx.lineTo(sx + 7 + o.h * 0.5, o.y); ctx.lineTo(sx + o.h * 0.5, o.y); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2; ctx.strokeRect(o.x, o.y, o.w, o.h * 0.5);
      return;
    }
    if (o.type === 'tall') { drawCactus(o.x, o.y, o.w, o.h); return; }
    if (o.type === 'crate') { drawCrate(o); return; }
    if (o.type === 'double') {
      drawCactus(o.x, o.y + o.h * 0.06, o.w * 0.55, o.h * 0.94);
      drawCactus(o.x + o.w * 0.47, o.y, o.w * 0.53, o.h);
    } else {
      drawCactus(o.x, o.y, o.w, o.h);
    }
    ctx.fillStyle = 'rgba(40, 78, 42, .08)';
    ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, groundY + 2, o.w * .7, 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawPlayer() {
    const skillActive = state === 'running' && elapsedRun < skillActiveUntil && skillTriggered;
    if (skillActive && selectedCharacter === 'duy') {
      ctx.save();
      ctx.strokeStyle = `rgba(74, 160, 92, ${0.45 + Math.sin(worldTime * 14) * 0.2})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(player.x + player.width / 2, player.y + player.height / 2, player.width * .62, player.height * .58, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (skillActive && selectedCharacter === 'duyquandoi') {
      // CHI VIỆN: 2 bản sao Duy (sprite mặc định) hộ tống trước ~48px và sau ~42px, bao quanh bởi hào quang Hành quân.
      const cs = squadSprite;
      const cw = cs.naturalWidth && cs.naturalHeight ? player.height * (cs.naturalWidth / cs.naturalHeight) : player.width;
      const frontX = player.x + 48;
      const backX = player.x - 42;
      const left = Math.min(backX, player.x);
      const right = Math.max(frontX + cw, player.x + player.width);
      const cy = (Math.min(squadY[0], squadY[1], player.y) + Math.max(squadY[0], squadY[1], player.y) + player.height) / 2;
      ctx.save();
      const pulse = Math.sin(worldTime * 14) * 0.2;
      ctx.fillStyle = `rgba(74, 160, 92, ${0.10 + pulse * 0.2})`;
      ctx.strokeStyle = `rgba(74, 160, 92, ${0.5 + pulse})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse((left + right) / 2, cy, (right - left) / 2 + 10, player.height * 0.62, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      if (cs.complete && cs.naturalWidth > 0) {
        [[backX, squadY[1], 1.6], [frontX, squadY[0], 0]].forEach(([x, y, phaseShift]) => {
          const grounded = Math.abs(y - player.y) < 1.5 && player.onGround;
          const bob = grounded ? Math.abs(Math.sin(player.runPhase + phaseShift)) * 2 : 0;
          const feetGap = clamp((groundY - (y + player.height)) / 120, 0, 1);
          ctx.fillStyle = `rgba(48, 82, 45, ${0.15 - feetGap * 0.08})`;
          ctx.beginPath(); ctx.ellipse(x + cw * 0.48, groundY + 2, cw * (0.39 - feetGap * 0.12), 4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(cs, x, y + bob, cw, player.height);
        });
      }
    }
    if (skillActive && selectedCharacter === 'murat') {
      // Mu Rát becomes a translucent ghost while a bright duplicate repeatedly dashes ahead.
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.shadowColor = '#72eaff'; ctx.shadowBlur = 18;
      ctx.filter = 'brightness(1.45) sepia(1) saturate(4) hue-rotate(145deg)';
      if (sprite.complete && sprite.naturalWidth > 0) ctx.drawImage(sprite, muRatCloneX, player.y, player.width, player.height);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.38 + Math.sin(worldTime * 12) * 0.08;
      ctx.shadowColor = '#6be7ff'; ctx.shadowBlur = 15;
    }
    if (skillActive && selectedCharacter === 'toduy') {
      // Katana vung quanh nhân vật trong lúc Ninja đang bật.
      ctx.save();
      ctx.strokeStyle = `rgba(190, 120, 255, ${0.35 + Math.sin(worldTime * 12) * 0.15})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(player.x + player.width / 2, player.y + player.height / 2, player.width * .75, player.height * .56, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.translate(player.x + player.width * 0.85, player.y + player.height * 0.45);
      ctx.rotate(-0.7 + Math.sin(worldTime * 10) * 0.55);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(235,245,255,.96)'; ctx.lineWidth = 3;
      ctx.shadowColor = '#9fd8ff'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(50, 0); ctx.stroke();
      ctx.restore();
    }
    const shadowW = player.width * (player.onGround ? 0.78 : 0.55);
    ctx.fillStyle = `rgba(48, 82, 45, ${player.onGround ? .16 : .08})`;
    ctx.beginPath(); ctx.ellipse(player.x + player.width * .48, groundY + 2, shadowW / 2, 4, 0, 0, Math.PI * 2); ctx.fill();

    if (sprite.complete && sprite.naturalWidth > 0) {
      // The provided transparent cutout is drawn proportionally, never stretched.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const bob = player.onGround && state === 'running' ? Math.abs(Math.sin(player.runPhase)) * 2 : 0;
      if (skillActive && selectedCharacter === 'murat') ctx.filter = 'brightness(1.35) sepia(1) saturate(3) hue-rotate(145deg)';
      ctx.drawImage(sprite, player.x, player.y + bob, player.width, player.height);
    } else {
      // Graceful fallback while the image is loading.
      ctx.fillStyle = '#2d794b'; roundedRect(player.x, player.y, player.width, player.height, 10); ctx.fill();
    }
    if (skillActive && selectedCharacter === 'murat') { ctx.filter = 'none'; ctx.restore(); }
  }

  // Chém đứt đôi: lưu ảnh chụp vật cản, vẽ hai nửa tách ra theo đường chém chéo.
  function ninjaSlice(obstacle) {
    obstacle.destroyedByNinja = true;
    const snapshot = { ...obstacle };
    sliceFX.push({ o: snapshot, side: -1, life: 0.7, max: 0.7 });
    sliceFX.push({ o: { ...obstacle }, side: 1, life: 0.7, max: 0.7 });
    slashFX.push({ x: obstacle.x + obstacle.w / 2, y: obstacle.y + obstacle.h / 2, w: obstacle.w, h: obstacle.h, life: 0.3, max: 0.3 });
    burst(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, 10);
    screenShake = Math.max(screenShake, 0.05);
    if (lightningCooldown <= 0) {
      lightningCooldown = 0.12;
      playTone(random(900, 1300), 0.06, 'sawtooth', 0.025);
    }
  }
  function drawSliceHalves() {
    sliceFX.forEach(f => {
      const o = f.o;
      const p = 1 - f.life / f.max;
      const cx = o.x + o.w / 2;
      const cy = o.y + o.h / 2;
      const top = f.side < 0;
      ctx.save();
      ctx.globalAlpha = clamp(1 - p * p, 0, 1);
      ctx.translate(cx + (top ? 26 : -16) * p, cy + (top ? -38 : 26) * p + 120 * p * p * (top ? 0.3 : 0.6));
      ctx.rotate((top ? 0.5 : -0.4) * p);
      ctx.translate(-cx, -cy);
      const pad = 14;
      const ax = o.x - pad, ay = cy + o.h * 0.45;
      const bx = o.x + o.w + pad, by = cy - o.h * 0.45;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      if (top) { ctx.lineTo(bx, o.y - 40); ctx.lineTo(ax, o.y - 40); }
      else { ctx.lineTo(bx, o.y + o.h + 40); ctx.lineTo(ax, o.y + o.h + 40); }
      ctx.closePath();
      ctx.clip();
      drawObstacle(o);
      ctx.restore();
    });
  }
  function drawSlashes() {
    slashFX.forEach(f => {
      const p = 1 - f.life / f.max;
      const reach = Math.max(f.w, 34) * 0.95 + 18;
      const sweep = clamp(p * 2.2, 0, 1);
      const x0 = f.x - reach, y0 = f.y + f.h * 0.6;
      const x1 = f.x - reach + reach * 2 * sweep, y1 = f.y + f.h * 0.6 - f.h * 1.2 * sweep;
      ctx.save();
      ctx.globalAlpha = clamp(1 - Math.max(0, p - 0.35) / 0.65, 0, 1);
      ctx.lineCap = 'round';
      ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = 16;
      ctx.strokeStyle = 'rgba(150, 215, 255, .55)'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(f.x + 4, f.y + 2, x1, y1); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(f.x + 4, f.y + 2, x1, y1); ctx.stroke();
      ctx.restore();
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color || (p.dust ? '#91ad72' : '#75a84e');
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  function drawPlatforms() {
    platforms.forEach(p => {
      // Wooden deck, metal frame, and cross-braces make the scaffold readable.
      ctx.fillStyle = '#d8b579';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#8b6b43';
      ctx.fillRect(p.x, p.y + p.h - 3, p.w, 3);
      ctx.strokeStyle = '#657f88';
      ctx.lineWidth = 2;
      // Extend every support leg all the way to the road so decks never look suspended.
      const postBottom = Math.max(0, Math.min(height - (p.y + p.h), groundY - (p.y + p.h)));
      for (const px of [p.x + 5, p.x + p.w - 5]) {
        ctx.beginPath();
        ctx.moveTo(px, p.y + p.h);
        ctx.lineTo(px, p.y + p.h + postBottom);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(p.x + 5, p.y + p.h + postBottom * .55);
      ctx.lineTo(p.x + p.w - 5, p.y + p.h + postBottom * .9);
      ctx.moveTo(p.x + p.w - 5, p.y + p.h + postBottom * .55);
      ctx.lineTo(p.x + 5, p.y + p.h + postBottom * .9);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1;
      for (let x = p.x + 10; x < p.x + p.w - 3; x += 14) {
        ctx.beginPath(); ctx.moveTo(x, p.y + 2); ctx.lineTo(x, p.y + p.h - 2); ctx.stroke();
      }
    });
  }

  function drawLightning() {
    if (selectedCharacter !== 'trong' || state !== 'running') return;
    ctx.save();
    // The cloud and bolt stay at each struck obstacle for a short, visible flash.
    lightningStrikes.forEach(strike => {
      const alpha = clamp(strike.life / strike.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      const cx = strike.x, cy = strike.y;
      ctx.fillStyle = '#46576f';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 28, 24, 11, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 12, cy - 32, 13, 13, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 9, cy - 34, 15, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff29a';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#49cfff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy - 25);
      ctx.lineTo(cx - 6, cy - 10);
      ctx.lineTo(cx + 3, cy - 10);
      ctx.lineTo(cx - 8, cy + 8);
      ctx.stroke();
    });
    // A small electric aura around Trọng while the skill is active.
    const active = elapsedRun < skillActiveUntil && skillTriggered;
    if (active) {
      ctx.globalAlpha = .85;
      ctx.strokeStyle = '#6edbff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#49cfff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(player.x + player.width * .52, player.y + player.height * .48,
        player.width * .66, player.height * .62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  const skillNames = { duy: 'HÀNH QUÂN', trong: 'SẤM SÉT', murat: 'LƯỚT LƯỚT', toduy: 'NINJA', duyquandoi: 'CHI VIỆN' };
  let skillCache = { label: '', pct: -1, active: null, city: null };
  function updateSkillHud() {
    const name = skillNames[selectedCharacter] || 'KỸ NĂNG';
    let label = name;
    let pct = 0;
    let active = false;
    if (state === 'running') {
      const remaining = Math.max(0, skillActiveUntil - elapsedRun);
      if (skillTriggered && remaining > 0) {
        active = true;
        pct = remaining / skillDuration() * 100;
        label = `${name} · ${remaining.toFixed(1)}s`;
      } else {
        const total = Math.max(1, skillInterval());
        const rc = Math.max(0, nextSkillAt - elapsedRun);
        pct = (1 - rc / total) * 100;
        label = `${name} · HỒI ${Math.ceil(rc)}s`;
      }
    }
    pct = Math.round(clamp(pct, 0, 100));
    if (label !== skillCache.label) { skillCache.label = label; skillLabel.textContent = label; }
    if (pct !== skillCache.pct) { skillCache.pct = pct; skillFill.style.width = `${pct}%`; skillBar.setAttribute('aria-valuenow', String(pct)); }
    if (active !== skillCache.active) { skillCache.active = active; skillBar.classList.toggle('is-active', active); }
    if (cityMode !== skillCache.city) { skillCache.city = cityMode; skillBar.classList.toggle('is-city', cityMode); }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (screenShake > 0) ctx.translate(random(-3, 3) * screenShake * 5, random(-2, 2) * screenShake * 5);
    drawBackground();
    platforms.forEach(p => { /* platforms are drawn as part of the city layer below */ });
    drawPlatforms();
    obstacles.forEach(drawObstacle);
    if (bossMode) drawBossBack();
    drawSliceHalves();
    const blink = bossMode && state === 'running' && boss.invuln > 0 && Math.floor(boss.invuln * 12) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    drawPlayer();
    if (blink) ctx.globalAlpha = 1;
    drawSlashes();
    drawLightning();
    if (bossMode) drawBossFront();
    drawParticles();
    ctx.restore();
    updateSkillHud();
  }

  function frame(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.035);
    lastTime = timestamp;
    try {
      if (gameScreen.classList.contains('is-active')) {
        update(dt);
        render();
      }
    } catch (error) {
      // Keep the animation loop alive if a non-essential HUD element fails.
      console.error('Lỗi cập nhật khung hình game:', error);
    } finally {
      requestAnimationFrame(frame);
    }
  }

  stage.addEventListener('pointerdown', (event) => {
    if (state !== 'running') return;
    event.preventDefault();
    jump();
  }, { passive: false });

  document.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      if (activeModal) { event.preventDefault(); closeModal(); }
      return;
    }
    if (activeModal) return;
    if (state === 'running') {
      if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) { event.preventDefault(); jump(); }
      return;
    }
    if (event.target && event.target.tagName === 'BUTTON') return; // nút đang focus tự xử lý Space/Enter
    if (['Space', 'Enter', 'ArrowUp', 'KeyW', 'KeyR'].includes(event.code)) {
      event.preventDefault();
      if (lobbyScreen.classList.contains('is-active')) startGame();
      else if (state === 'over' && performance.now() - overAt > 700) retryRun();
    }
  });

  soundButton.addEventListener('click', () => {
    const nextMode = audioMode === 'all' ? 'music-off' : (audioMode === 'music-off' ? 'mute' : 'all');
    setAudioMode(nextMode);
    if (sfxOn) playTone(620, 0.08, 'sine', 0.025);
  });

  // Thanh địa chỉ trình duyệt di động trượt lên/xuống: cập nhật chiều cao thật và vẽ lại canvas ngay.
  function syncViewport() {
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    if (h > 0) document.documentElement.style.setProperty('--app-h', `${Math.round(h)}px`);
    fitCanvas();
  }
  window.addEventListener('resize', syncViewport);
  window.addEventListener('orientationchange', () => setTimeout(syncViewport, 250));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncViewport);
    window.visualViewport.addEventListener('scroll', syncViewport);
  }
  syncViewport();
  if ('ResizeObserver' in window) new ResizeObserver(fitCanvas).observe(stage);

  // Khởi tạo
  muRatShown = isMuRatUnlocked();
  try {
    const savedChar = localStorage.getItem('duyMapChayDiChar');
    if (savedChar && characters[savedChar] && isCharUnlocked(savedChar) && savedChar !== 'duy') loadCharacter(savedChar);
  } catch (_) { /* storage may be disabled */ }
  ensureQuests();
  updateNewsDot();
  updateLobby();
  renderCharacterCards();
  updateHud();
  updateSoundButton();
  setInterval(() => {
    if (ensureQuests()) { updateQuestDot(); if (activeModal === questModal) renderQuests(); }
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (musicAudio && !musicAudio.paused) {
        musicAudio.pause();
        musicPausedByVisibility = true;
      }
      if (audioContext && audioContext.state === 'running') audioContext.suspend().catch(() => {});
      return;
    }
    if (ensureQuests()) { updateQuestDot(); if (activeModal === questModal) renderQuests(); }
    // Không tự phát khi quay lại tab: chờ cú chạm/phím tiếp theo của người chơi.
  });
  requestAnimationFrame(frame);
})();
