/* =========================================================
   event.js — Sự kiện cộng đồng toàn cầu 3 ngày (V22)
   Cả server cùng chạy tới 67.000 điểm → mở khóa phần thưởng theo mốc.
   Module độc lập: chỉ giao tiếp với game.js qua window.GameBridge
   và được game.js gọi ngược lại bằng window.LimitedEvent.onRunEnd(score).
   Nhúng SAU game.js trong index.html.

   MUỐN SỬA SỰ KIỆN? Chỉ cần sửa khối CONFIG ngay bên dưới.
   ========================================================= */
(function () {
  'use strict';

  const GB = window.GameBridge;
  if (!GB) { console.warn('event.js: không thấy window.GameBridge (game.js chưa nạp?)'); return; }

  // =========================================================
  //  CONFIG — sửa ở đây
  // =========================================================
  const CONFIG = {
    // Nhánh dữ liệu trên Firebase Realtime Database
    EVENT_PATH: 'events/global_run_67k_3days',

    // Thời điểm bắt đầu sự kiện:
    //  • null  → tự bắt đầu khi có người đầu tiên mở game (giờ server được ghi vào events/.../startAt;
    //            muốn dời/lên lịch/chạy lại thì sửa hoặc xóa giá trị startAt trên Firebase Console)
    //  • hoặc đặt cứng, ví dụ: '2026-11-18T00:00:00+07:00'  (chuỗi ISO) hay 1790000000000 (ms)
    START_AT: null,

    DURATION_MS: 3 * 24 * 60 * 60 * 1000, // đúng 3 ngày (tính theo giờ server Firebase)
    GOAL: 67000,                           // mục tiêu điểm toàn cầu
    MIN_BEST: 1000,                        // kỷ lục tối thiểu để đóng góp điểm & mở khóa sự kiện
    MIN_PERSONAL: 3000,                    // điểm cá nhân phải tự góp để nhận các mốc có cờ needPersonal
    TOP_N: 10,                             // số người hiển thị ở Bảng vinh danh

    // Các mốc thưởng. reward: { crystal: n } hoặc { key: n }
    MILESTONES: [
      { target: 1000,  reward: { crystal: 10 },  needPersonal: false },
      { target: 9000,  reward: { crystal: 50 },  needPersonal: false },
      { target: 15000, reward: { crystal: 100 }, needPersonal: true },
      { target: 30000, reward: { crystal: 100 }, needPersonal: true },
      { target: 36000, reward: { key: 1 },       needPersonal: true },
      { target: 67000, reward: { crystal: 150 }, needPersonal: true }
    ]
  };

  const KEY_CLAIMED = 'duyMapChayDiEventClaimed_' + CONFIG.EVENT_PATH.replace(/[^a-z0-9]/gi, '_');
  const KEY_PENDING = 'duyMapChayDiEventPending_' + CONFIG.EVENT_PATH.replace(/[^a-z0-9]/gi, '_');

  // ---------- Tiện ích ----------
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.floor(Number(n) || 0).toLocaleString('vi-VN');
  const pad = (n) => String(n).padStart(2, '0');
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function lsGet(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* storage may be disabled */ }
  }
  const isUnlocked = () => GB.best >= CONFIG.MIN_BEST;
  const db = GB.lbDb;
  const base = db ? db.ref(CONFIG.EVENT_PATH) : null;

  // ---------- Giờ server & thời gian sự kiện ----------
  let serverOffset = 0;
  let offsetReady = false;
  let offsetWaiters = [];
  const serverNow = () => Date.now() + serverOffset;
  if (db) {
    db.ref('.info/serverTimeOffset').on('value', (snap) => {
      serverOffset = Number(snap.val()) || 0;
      offsetReady = true;
      offsetWaiters.splice(0).forEach((fn) => fn());
      refreshAll();
    });
  }

  let startAt = null; // ms (giờ server) hoặc null nếu chưa biết
  if (CONFIG.START_AT != null) {
    const parsed = typeof CONFIG.START_AT === 'number' ? CONFIG.START_AT : Date.parse(CONFIG.START_AT);
    if (Number.isFinite(parsed)) startAt = parsed;
  }
  const endAt = () => (startAt == null ? null : startAt + CONFIG.DURATION_MS);

  // 'loading' | 'pending' | 'active' | 'ended'
  function eventStatus() {
    if (startAt == null || !offsetReady) return 'loading';
    const now = serverNow();
    if (now < startAt) return 'pending';
    if (now >= endAt()) return 'ended';
    return 'active';
  }

  // Chờ tối đa 2 giây để có giờ server + thời điểm bắt đầu trước khi ghi điểm
  function whenReady() {
    if ((offsetReady && startAt != null) || !db) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, 2500);
      offsetWaiters.push(() => { if (startAt != null) { clearTimeout(timer); resolve(); } });
      readyWaiters.push(() => { clearTimeout(timer); resolve(); });
    });
  }
  const readyWaiters = [];

  // ---------- Dữ liệu trực tiếp từ Firebase ----------
  let total = 0;     // tổng điểm toàn cầu
  let mine = 0;      // điểm cá nhân đã góp
  let startSeeded = false;

  if (base) {
    base.child('totalScore').on('value', (snap) => { total = Math.max(0, Math.floor(Number(snap.val()) || 0)); refreshAll(); },
      (err) => console.warn('Không đọc được tổng điểm sự kiện:', err));
    base.child('contributors/' + GB.lbUid + '/score').on('value', (snap) => { mine = Math.max(0, Math.floor(Number(snap.val()) || 0)); refreshAll(); },
      (err) => console.warn('Không đọc được điểm đóng góp:', err));
    if (CONFIG.START_AT == null) {
      base.child('startAt').on('value', (snap) => {
        const v = Number(snap.val());
        if (Number.isFinite(v) && v > 0) {
          startAt = v;
          readyWaiters.splice(0).forEach((fn) => fn());
          flushPending();
          refreshAll();
        } else if (!startSeeded) {
          // Chưa có thời điểm bắt đầu: người đầu tiên mở game sẽ ghi giờ server (chỉ ghi được 1 lần nhờ Rules)
          startSeeded = true;
          base.child('startAt').transaction((cur) => (cur === null ? firebase.database.ServerValue.TIMESTAMP : undefined))
            .catch((err) => console.warn('Không khởi tạo được thời điểm bắt đầu sự kiện:', err));
        }
      }, (err) => console.warn('Không đọc được thời điểm bắt đầu sự kiện:', err));
    }
  }

  // ---------- Ghi điểm khi kết thúc lượt chạy thường ----------
  function pendingList() { const l = lsGet(KEY_PENDING, []); return Array.isArray(l) ? l.filter((n) => Number.isFinite(n) && n > 0) : []; }
  function savePending(list) { lsSet(KEY_PENDING, list.slice(-20)); }

  function submitScore(value) {
    return whenReady().then(() => {
      if (eventStatus() !== 'active') return 'skipped';           // hết hạn / chưa bắt đầu: ngừng cộng điểm
      const name = GB.lbPlayerName();
      return base.child('totalScore').transaction((cur) => (Number(cur) || 0) + value)
        .then(() => base.child('contributors/' + GB.lbUid).transaction((cur) => ({
          name,
          score: ((cur && Number(cur.score)) || 0) + value,
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        })))
        .then(() => 'ok');
    });
  }

  function onRunEnd(score) {
    if (!base || !isUnlocked()) return;                                                                    // cần kỷ lục ≥ 1.000
    if (window.Multiplayer && window.Multiplayer.isInMatch && window.Multiplayer.isInMatch()) return;     // trận Solo 1v1 không tính
    const value = Math.floor(Number(score));
    if (!Number.isFinite(value) || value <= 0) return;
    submitScore(value).catch((err) => {
      console.warn('Không đẩy được điểm sự kiện, sẽ thử lại sau:', err);
      savePending(pendingList().concat(value));
    });
    refreshAll();
  }

  let flushing = false;
  function flushPending() {
    if (flushing || !base || !isUnlocked()) return;
    const list = pendingList();
    if (!list.length) return;
    flushing = true;
    savePending([]);
    list.reduce((chain, value) => chain.then(() => submitScore(value).catch(() => savePending(pendingList().concat(value)))), Promise.resolve())
      .then(() => { flushing = false; });
  }

  // ---------- Thưởng ----------
  const claimedList = () => { const l = lsGet(KEY_CLAIMED, []); return Array.isArray(l) ? l : []; };
  const msId = (ms) => String(ms.target);
  const isClaimed = (ms) => claimedList().indexOf(msId(ms)) !== -1;
  const globalReached = (ms) => total >= ms.target;
  const personalOk = (ms) => !ms.needPersonal || mine >= CONFIG.MIN_PERSONAL;
  const canClaim = (ms) => isUnlocked() && !isClaimed(ms) && globalReached(ms) && personalOk(ms);
  const rewardText = (ms) => (ms.reward.key ? `🔑 ${ms.reward.key} Key Mini-game` : `💎 ${fmt(ms.reward.crystal)} Crystal`);

  function claim(ms) {
    if (!canClaim(ms)) return;
    const list = claimedList();
    list.push(msId(ms));
    lsSet(KEY_CLAIMED, list);
    let msg;
    if (ms.reward.key) {
      const r = GB.addKey(ms.reward.key);
      msg = r.converted > 0 ? `🔑 Đã đủ 3/3 Key → quy đổi thành 💎 ${r.crystalGained}` : `🔑 Nhận ${r.added} Key Mini-game`;
    } else {
      GB.addReward(ms.reward.crystal, 0);
      msg = `💎 Nhận ${fmt(ms.reward.crystal)} Crystal`;
    }
    GB.playUiSound && GB.playUiSound('claim');
    GB.showToast(`🎉 Sự kiện — mốc ${fmt(ms.target)}: ${msg}`);
    refreshAll();
  }

  // =========================================================
  //  GIAO DIỆN POPUP
  // =========================================================
  let modal = null;
  let timerEl, lockEl, totalNumEl, totalBarEl, mineNumEl, mineBarEl, listEl, topEl, statusEl;
  let countdownTimer = 0;
  let topRef = null;
  let topRows = [];

  function buildUi() {
    modal = el('div', 'modal');
    modal.id = 'eventModal';
    modal.hidden = true;

    const backdrop = el('div', 'modal-backdrop');
    backdrop.setAttribute('data-close', '');
    modal.appendChild(backdrop);

    const panel = el('div', 'panel modal-panel modal-event');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'eventTitle');

    const head = el('header', 'modal-head');
    const titleWrap = el('div');
    titleWrap.appendChild(el('p', 'kicker', 'TOÀN CẦU · 3 NGÀY'));
    const h2 = el('h2', '', '🎉 Sự kiện cộng đồng');
    h2.id = 'eventTitle';
    titleWrap.appendChild(h2);
    head.appendChild(titleWrap);
    const closeBtn = el('button', 'close-btn', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('data-close', '');
    closeBtn.setAttribute('aria-label', 'Đóng');
    head.appendChild(closeBtn);
    panel.appendChild(head);

    const body = el('div', 'q-pane');
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.overflow = 'auto';
    body.style.minHeight = '0';

    timerEl = el('p', 'ev-timer');
    body.appendChild(timerEl);
    lockEl = el('div', 'lg-lock ev-lock');
    body.appendChild(lockEl);

    // Tiến độ toàn cầu
    const gBox = el('div', 'ev-box');
    const gHead = el('div', 'ev-box-head');
    gHead.appendChild(el('span', '', '🌍 TỔNG ĐIỂM TOÀN CẦU'));
    totalNumEl = el('b', 'px');
    gHead.appendChild(totalNumEl);
    gBox.appendChild(gHead);
    totalBarEl = el('div', 'ev-bar');
    totalBarEl.appendChild(el('i'));
    CONFIG.MILESTONES.forEach((ms) => {
      const tick = el('span', 'ev-tick');
      tick.style.left = Math.min(99.5, (ms.target / CONFIG.GOAL) * 100) + '%';
      totalBarEl.appendChild(tick);
    });
    gBox.appendChild(totalBarEl);
    body.appendChild(gBox);

    // Đóng góp cá nhân
    const pBox = el('div', 'ev-box');
    const pHead = el('div', 'ev-box-head');
    pHead.appendChild(el('span', '', '🙋 ĐÓNG GÓP CỦA BẠN'));
    mineNumEl = el('b', 'px');
    pHead.appendChild(mineNumEl);
    pBox.appendChild(pHead);
    mineBarEl = el('div', 'ev-bar is-me');
    mineBarEl.appendChild(el('i'));
    pBox.appendChild(mineBarEl);
    body.appendChild(pBox);

    // Mốc thưởng
    body.appendChild(el('p', 'modal-note', `6 mốc thưởng theo tổng điểm toàn cầu. Các mốc có dấu ★ yêu cầu bạn tự chạy góp từ ${fmt(CONFIG.MIN_PERSONAL)} điểm. Hết 3 ngày vẫn nhận bù được thưởng mốc đã đạt.`));
    listEl = el('div', 'ev-list');
    body.appendChild(listEl);

    // Bảng vinh danh
    body.appendChild(el('p', 'kicker', '🏅 BẢNG VINH DANH TOP ĐÓNG GÓP'));
    topEl = el('div', 'lb-list ev-top');
    body.appendChild(topEl);

    statusEl = el('p', 'ev-status');
    body.appendChild(statusEl);

    panel.appendChild(body);
    modal.appendChild(panel);
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target.closest('[data-close]')) GB.closeModal(); });

    listEl.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-claim]');
      if (!btn || btn.disabled) return;
      const ms = CONFIG.MILESTONES.find((m) => msId(m) === btn.dataset.claim);
      if (ms) claim(ms);
    });

    const openBtn = $('openEvent');
    if (openBtn) openBtn.addEventListener('click', openEvent);

    // Đóng popup thì ngắt lắng nghe Top + dừng đồng hồ
    new MutationObserver(() => { if (modal.hidden) stopLive(); }).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  }

  function openEvent() {
    GB.openModal(modal, $('openEvent'));
    renderModal();
    clearInterval(countdownTimer);
    countdownTimer = setInterval(renderTimer, 1000);
    startTopListen();
  }
  function stopLive() {
    clearInterval(countdownTimer);
    if (topRef) { topRef.off(); topRef = null; }
  }

  function startTopListen() {
    if (!base) { statusEl.textContent = 'Chưa kết nối được Firebase. Kiểm tra mạng rồi mở lại.'; return; }
    if (topRef) topRef.off();
    statusEl.textContent = 'Đang tải bảng vinh danh...';
    topRef = base.child('contributors').orderByChild('score').limitToLast(CONFIG.TOP_N);
    topRef.on('value', (snap) => {
      const rows = [];
      snap.forEach((child) => {
        const v = child.val() || {};
        rows.push({ id: String(child.key), name: String(v.name || 'Runner').slice(0, 16), score: Math.floor(Number(v.score)) || 0 });
      });
      rows.reverse();
      topRows = rows;
      statusEl.textContent = '';
      renderTop();
    }, (err) => {
      console.warn('Lỗi đọc bảng vinh danh sự kiện:', err);
      statusEl.textContent = 'Không tải được bảng vinh danh. Kiểm tra mạng hoặc Rules của Firebase.';
    });
  }

  function renderTimer() {
    if (!timerEl) return;
    const st = eventStatus();
    timerEl.classList.toggle('is-ended', st === 'ended');
    if (st === 'loading') { timerEl.textContent = '⏳ Đang đồng bộ giờ sự kiện...'; return; }
    if (st === 'pending') {
      const r = Math.max(0, startAt - serverNow());
      timerEl.textContent = `⏳ Sự kiện bắt đầu sau: ${Math.floor(r / 86400000)} ngày ${pad(Math.floor((r % 86400000) / 3600000))}:${pad(Math.floor((r % 3600000) / 60000))}:${pad(Math.floor((r % 60000) / 1000))}`;
      return;
    }
    if (st === 'ended') { timerEl.textContent = '🏁 Sự kiện đã kết thúc — vẫn nhận bù thưởng các mốc đã đạt!'; return; }
    const r = Math.max(0, endAt() - serverNow());
    timerEl.textContent = `⏳ Kết thúc sau: ${Math.floor(r / 86400000)} ngày ${pad(Math.floor((r % 86400000) / 3600000))}:${pad(Math.floor((r % 3600000) / 60000))}:${pad(Math.floor((r % 60000) / 1000))}`;
    // Hết giờ khi popup đang mở: cập nhật lại giao diện một lần
    if (r === 0) refreshAll();
  }

  function renderLock() {
    lockEl.textContent = '';
    if (isUnlocked()) { lockEl.hidden = true; return; }
    lockEl.hidden = false;
    const have = Math.floor(GB.best);
    lockEl.appendChild(el('strong', '', '🔒 Sự kiện chưa mở khóa'));
    lockEl.appendChild(el('span', '', `Cần kỷ lục ${fmt(CONFIG.MIN_BEST)} điểm để đóng góp điểm và nhận thưởng. Hiện tại: ${fmt(have)} — còn thiếu ${fmt(Math.max(0, CONFIG.MIN_BEST - have))}.`));
    const bar = el('div', 'lg-bar');
    const fill = el('i');
    fill.style.width = Math.min(100, Math.round((have / CONFIG.MIN_BEST) * 100)) + '%';
    bar.appendChild(fill);
    lockEl.appendChild(bar);
  }

  function renderMilestones() {
    listEl.textContent = '';
    CONFIG.MILESTONES.forEach((ms, i) => {
      const claimed = isClaimed(ms);
      const ready = canClaim(ms);
      const row = el('div', 'ev-ms' + (ready ? ' is-ready' : '') + (claimed ? ' is-claimed' : ''));
      row.appendChild(el('span', 'ev-ms-no px', String(i + 1)));
      const info = el('div');
      info.appendChild(el('strong', '', `${fmt(ms.target)} điểm${ms.needPersonal ? ' ★' : ''} → ${rewardText(ms)}`));
      let note;
      if (claimed) note = 'Đã nhận';
      else if (!globalReached(ms)) note = `Còn thiếu ${fmt(ms.target - total)} điểm toàn cầu`;
      else if (!personalOk(ms)) note = `Cần tự góp ≥ ${fmt(CONFIG.MIN_PERSONAL)} điểm (bạn: ${fmt(mine)})`;
      else if (!isUnlocked()) note = `Cần kỷ lục ≥ ${fmt(CONFIG.MIN_BEST)} điểm`;
      else note = 'Đã đạt mốc — nhận thưởng ngay!';
      info.appendChild(el('small', '', note));
      row.appendChild(info);
      let btn;
      if (claimed) { btn = el('button', 'card-btn select is-on', '✓ ĐÃ NHẬN'); btn.disabled = true; }
      else if (ready) { btn = el('button', 'card-btn upgrade', 'NHẬN'); btn.setAttribute('data-claim', msId(ms)); }
      else { btn = el('button', 'card-btn upgrade', '🔒 CHƯA ĐỦ'); btn.disabled = true; }
      btn.type = 'button';
      row.appendChild(btn);
      listEl.appendChild(row);
    });
  }

  function renderTop() {
    if (!topEl) return;
    topEl.textContent = '';
    if (!topRows.length) { topEl.appendChild(el('p', 'lb-empty', 'Chưa có ai đóng góp. Hãy là người đầu tiên!')); return; }
    const medals = ['🥇', '🥈', '🥉'];
    topRows.forEach((row, i) => {
      const item = el('div', 'lb-row' + (i < 3 ? ` is-top${i + 1}` : '') + (row.id === GB.lbUid ? ' is-me' : ''));
      item.appendChild(i < 3 ? el('span', 'lb-rank', medals[i]) : el('span', 'lb-rank px', String(i + 1)));
      const info = el('div', 'lb-info');
      info.appendChild(el('strong', '', row.name));
      info.appendChild(el('small', '', 'Điểm đóng góp'));
      item.appendChild(info);
      item.appendChild(el('span', 'lb-score px', fmt(row.score)));
      topEl.appendChild(item);
    });
  }

  function renderModal() {
    if (!modal || modal.hidden) return;
    renderTimer();
    renderLock();
    totalNumEl.textContent = `${fmt(total)} / ${fmt(CONFIG.GOAL)}`;
    totalBarEl.firstChild.style.width = Math.min(100, (total / CONFIG.GOAL) * 100) + '%';
    mineNumEl.textContent = `${fmt(mine)} / ${fmt(CONFIG.MIN_PERSONAL)} ★`;
    mineBarEl.firstChild.style.width = Math.min(100, (mine / CONFIG.MIN_PERSONAL) * 100) + '%';
    renderMilestones();
    renderTop();
  }

  // ---------- Nút ngoài sảnh: ổ khóa + chấm đỏ báo nhận thưởng ----------
  function renderButton() {
    const dot = $('eventDot');
    const lock = $('eventLock');
    const btn = $('openEvent');
    const unlocked = isUnlocked();
    if (lock) lock.hidden = unlocked;
    if (btn) btn.classList.toggle('is-locked', !unlocked);
    if (dot) dot.hidden = !CONFIG.MILESTONES.some(canClaim);
  }

  function refreshAll() { renderButton(); renderModal(); }

  // ---------- Khởi tạo ----------
  buildUi();
  renderButton();
  setInterval(() => { renderButton(); if (!document.hidden) flushPending(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshAll(); flushPending(); } });

  window.LimitedEvent = { onRunEnd, status: eventStatus, config: CONFIG };
})();
