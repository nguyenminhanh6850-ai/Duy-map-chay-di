/* =========================================================
   multiplayer.js — SOLO 1V1 (Firebase Realtime Database)
   Module độc lập: chỉ giao tiếp với game.js qua window.GameBridge
   và được game.js gọi ngược lại bằng:
     window.Multiplayer.onUpdate(dt)  (cuối hàm update)
     window.Multiplayer.onRender(ctx) (trong hàm render)
   Nhúng SAU game.js trong index.html.

   Cấu trúc dữ liệu rooms/{roomId}:
   {
     seed, round, status: 'waiting'|'lobby'|'countdown'|'playing'|'finished',
     hostUid, guestUid, createdAt, startAt,
     players: { [uid]: { name, char, cn, ready, online, alive, score, y, skill, rematch } }
   }
   ========================================================= */
(function () {
  'use strict';

  const GB = window.GameBridge;
  if (!GB) { console.warn('multiplayer.js: không thấy window.GameBridge (game.js chưa nạp?)'); return; }

  // ---------- Cấu hình ----------
    const WIN_REWARD = { crystal: 5, coin: 400 };    // thưởng cho người thắng
  const MAX_DAILY_CRYSTAL_WINS = 3;                 // giới hạn nhận Crystal tối đa 3 lần/ngày
  const MIN_SCORE_FOR_REWARD = 100;                 // phải chạy ít nhất 100m mới có thưởng

  function canClaimSoloCrystal() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const data = JSON.parse(localStorage.getItem('duyMapSoloDaily') || '{}');
      return data.date !== today || (data.count || 0) < MAX_DAILY_CRYSTAL_WINS;
    } catch (_) { return true; }
  }

  function recordSoloCrystalWin() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const data = JSON.parse(localStorage.getItem('duyMapSoloDaily') || '{}');
      const count = data.date === today ? (data.count || 0) + 1 : 1;
      localStorage.setItem('duyMapSoloDaily', JSON.stringify({ date: today, count }));
    } catch (_) { /* storage may be disabled */ }
  }
   // thưởng cho người thắng (kể cả thắng do đối thủ thoát)
  const SEND_INTERVAL = 1 / 12;                     // ~12 lần/giây
  const COUNTDOWN_MS = 3300;                        // 3 - 2 - 1 - GO
  const SCORE_TO_PX = 9.4;                          // game.js: score += dt * speed / 9.4  →  1 điểm ≈ 9.4px
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CODE_LEN = 5;
  const KEY_LAST_ROOM = 'duyMapChayDiLastRoom';
  const STALE_MS = 3 * 60 * 60 * 1000;              // phòng bỏ quên > 3 giờ sẽ bị dọn

  // ---------- Tiện ích ----------
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.floor(Number(n) || 0).toLocaleString('vi-VN');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const db = GB.lbDb;
  const me = () => GB.lbUid;
  const TS = () => firebase.database.ServerValue.TIMESTAMP;

  // Mulberry32: bộ sinh số giả ngẫu nhiên xác định theo seed (2 máy cùng seed → cùng dãy số)
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const newSeed = () => Math.floor(Math.random() * 4294967296);
  function randomCode() {
    let out = '';
    for (let i = 0; i < CODE_LEN; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return out;
  }

  // ---------- Giờ server ----------
  let serverOffset = 0;
  if (db) db.ref('.info/serverTimeOffset').on('value', (snap) => { serverOffset = Number(snap.val()) || 0; });
  const serverNow = () => Date.now() + serverOffset;

  // ---------- Trạng thái cục bộ ----------
  // phase: idle | menu | room | countdown | playing | waiting | result
  let phase = 'idle';
  let roomId = null;
  let roomRef = null;
  let room = null;
  let startedRound = 0;         // vòng đã khởi động đếm ngược
  let rewardedRound = 0;        // vòng đã trả thưởng
  let countdownTimer = 0;
  let sendAcc = 0;
  let wasRunning = false;
  let lockStartCountdown = false;
  let lockRematch = false;
  let playerDisconnectArmed = false;
  let lastResult = null;        // { winner, reason, myScore, oppScore, rewarded }
  const ghost = { init: false, score: 0, y: 0 };
  const ghostImages = {};

  const isHost = () => !!room && room.hostUid === me();
  const myRef = () => roomRef && roomRef.child('players/' + me());
  function oppUid() {
    if (!room || !room.players) return null;
    return Object.keys(room.players).find((k) => k !== me()) || null;
  }
  const oppData = () => { const u = oppUid(); return u ? room.players[u] : null; };
  const isInMatch = () => phase === 'countdown' || phase === 'playing' || phase === 'waiting' || phase === 'result';

  function newPlayer() {
    return {
      name: GB.lbPlayerName(),
      char: GB.selectedCharacter,
      cn: GB.charName(GB.selectedCharacter),
      ready: false, online: true, alive: true, score: 0, y: 0, skill: false, rematch: false
    };
  }

  // =========================================================
  //  GIAO DIỆN
  // =========================================================
  let modal, menuView, roomView, msgEl, codeInput, createBtn, joinBtn, codeText, copyBtn, slotsEl, roomInfoEl, readyBtn, leaveBtn;
  let overlay, ovTitle, ovBig, ovSub, ovLines, ovActions, rematchBtn, exitBtn, quitBtn;
  let hud;

  function buildUi() {
    // ----- Popup SOLO 1V1 -----
    modal = el('div', 'modal');
    modal.id = 'soloModal';
    modal.hidden = true;
    const backdrop = el('div', 'modal-backdrop');
    backdrop.setAttribute('data-close', '');
    modal.appendChild(backdrop);

    const panel = el('div', 'panel modal-panel lg-narrow');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'mpTitle');

    const head = el('header', 'modal-head');
    const titleWrap = el('div');
    titleWrap.appendChild(el('p', 'kicker', 'ĐẤU 1 VS 1'));
    const h2 = el('h2', '', 'SOLO 1V1');
    h2.id = 'mpTitle';
    titleWrap.appendChild(h2);
    head.appendChild(titleWrap);
    const closeBtn = el('button', 'close-btn', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('data-close', '');
    closeBtn.setAttribute('aria-label', 'Đóng');
    head.appendChild(closeBtn);
    panel.appendChild(head);

    // Màn chọn: tạo phòng / vào phòng
    menuView = el('div', 'mp-view');
    menuView.appendChild(el('p', 'modal-note', 'Hai người chạy cùng một bản đồ (cùng seed). Ai vấp trước sẽ chờ đối thủ; điểm cao hơn thắng.'));
    createBtn = el('button', 'card-btn select mp-big', '➕ TẠO PHÒNG');
    createBtn.type = 'button';
    menuView.appendChild(createBtn);
    menuView.appendChild(el('p', 'mp-or', '— hoặc —'));
    const joinRow = el('div', 'lb-name-row');
    codeInput = el('input', 'lb-input mp-code-input');
    codeInput.type = 'text';
    codeInput.maxLength = CODE_LEN;
    codeInput.autocomplete = 'off';
    codeInput.spellcheck = false;
    codeInput.placeholder = 'MÃ PHÒNG';
    joinBtn = el('button', 'card-btn upgrade', 'VÀO PHÒNG');
    joinBtn.type = 'button';
    joinRow.appendChild(codeInput);
    joinRow.appendChild(joinBtn);
    menuView.appendChild(joinRow);
    panel.appendChild(menuView);

    // Màn phòng chờ
    roomView = el('div', 'mp-view');
    roomView.hidden = true;
    const codeBox = el('div', 'mp-codebox');
    codeBox.appendChild(el('small', '', 'MÃ PHÒNG'));
    codeText = el('strong', 'px', '-----');
    codeBox.appendChild(codeText);
    copyBtn = el('button', 'card-btn', 'SAO CHÉP');
    copyBtn.type = 'button';
    codeBox.appendChild(copyBtn);
    roomView.appendChild(codeBox);
    slotsEl = el('div', 'mp-slots');
    roomView.appendChild(slotsEl);
    roomInfoEl = el('p', 'modal-note mp-info');
    roomView.appendChild(roomInfoEl);
    const actions = el('div', 'mp-actions');
    readyBtn = el('button', 'card-btn select mp-big', 'SẴN SÀNG');
    readyBtn.type = 'button';
    leaveBtn = el('button', 'card-btn', 'RỜI PHÒNG');
    leaveBtn.type = 'button';
    actions.appendChild(readyBtn);
    actions.appendChild(leaveBtn);
    roomView.appendChild(actions);
    panel.appendChild(roomView);

    msgEl = el('p', 'lg-gift-msg');
    panel.appendChild(msgEl);

    modal.appendChild(panel);
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target.closest('[data-close]')) GB.closeModal(); });

    // ----- Lớp phủ: đếm ngược / chờ đối thủ / kết quả -----
    overlay = el('div', 'mp-overlay');
    overlay.hidden = true;
    const box = el('div', 'panel mp-ov-box');
    ovTitle = el('h2', 'mp-ov-title');
    ovBig = el('div', 'mp-ov-big px');
    ovSub = el('p', 'mp-ov-sub');
    ovLines = el('div', 'mp-ov-lines');
    ovActions = el('div', 'mp-actions');
    rematchBtn = el('button', 'card-btn select mp-big', 'CHƠI LẠI');
    rematchBtn.type = 'button';
    exitBtn = el('button', 'card-btn', 'THOÁT');
    exitBtn.type = 'button';
    quitBtn = el('button', 'card-btn', 'RỜI TRẬN (xử thua)');
    quitBtn.type = 'button';
    ovActions.appendChild(rematchBtn);
    ovActions.appendChild(exitBtn);
    ovActions.appendChild(quitBtn);
    [ovTitle, ovBig, ovSub, ovLines, ovActions].forEach((n) => box.appendChild(n));
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // ----- HUD nhỏ trong game -----
    hud = el('div', 'mp-hud');
    hud.hidden = true;
    const gameScreen = $('gameScreen');
    (gameScreen || document.body).appendChild(hud);

    // ----- Sự kiện -----
    const openBtn = $('openSolo');
    if (openBtn) openBtn.addEventListener('click', openMenu);
    createBtn.addEventListener('click', createRoom);
    joinBtn.addEventListener('click', () => joinRoom(codeInput.value));
    codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); joinRoom(codeInput.value); } });
    copyBtn.addEventListener('click', () => {
      if (!roomId) return;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(roomId).then(() => setMsg('Đã sao chép mã phòng.', 'ok')).catch(() => setMsg('Không sao chép được, hãy gõ tay mã phòng.', 'warn'));
      else setMsg('Trình duyệt không hỗ trợ sao chép, hãy gõ tay mã phòng.', 'warn');
    });
    readyBtn.addEventListener('click', toggleReady);
    leaveBtn.addEventListener('click', () => { leaveRoom(); GB.closeModal(); });
    rematchBtn.addEventListener('click', requestRematch);
    exitBtn.addEventListener('click', () => leaveRoom());
    quitBtn.addEventListener('click', () => leaveRoom());

    // Đóng popup khi đang ở menu/phòng chờ = rời phòng
    new MutationObserver(() => {
      if (modal.hidden && (phase === 'menu' || phase === 'room')) leaveRoom();
    }).observe(modal, { attributes: true, attributeFilter: ['hidden'] });

    // Chặn Space/Enter/R "chơi lại" của game.js khi đang trong trận Solo
    window.addEventListener('keydown', (e) => {
      if (!isInMatch() || GB.state === 'running') return;
      if (['Space', 'Enter', 'KeyR', 'ArrowUp', 'KeyW'].includes(e.code)) {
        if (e.target && e.target.tagName === 'BUTTON') return; // để nút đang focus tự xử lý
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  }

  function setMsg(text, kind) {
    msgEl.textContent = text || '';
    msgEl.className = 'lg-gift-msg' + (kind ? ' is-' + kind : '');
  }

  function showView(name) {
    menuView.hidden = name !== 'menu';
    roomView.hidden = name !== 'room';
  }

  function openMenu() {
    if (phase !== 'idle') return;
    phase = 'menu';
    showView('menu');
    codeInput.value = '';
    setMsg(db ? '' : 'Chưa kết nối được Firebase. Kiểm tra mạng rồi thử lại.', db ? '' : 'bad');
    createBtn.disabled = joinBtn.disabled = !db;
    GB.openModal(modal, $('openSolo'));
  }

  // ----- Phòng chờ -----
  function renderRoom() {
    if (!room) return;
    codeText.textContent = roomId;
    slotsEl.textContent = '';
    const order = [room.hostUid, room.guestUid].filter(Boolean);
    for (let i = 0; i < 2; i++) {
      const uid = order[i];
      const p = uid && room.players ? room.players[uid] : null;
      const slot = el('div', 'mp-slot' + (p && p.ready ? ' is-ready' : '') + (uid === me() ? ' is-me' : ''));
      if (!p) {
        slot.appendChild(el('strong', '', 'Đang chờ người chơi...'));
        slot.appendChild(el('small', '', 'Gửi mã phòng cho bạn bè'));
      } else {
        const nm = el('strong', '', p.name || 'Runner');
        if (uid === room.hostUid) nm.appendChild(el('span', 'lb-npc', 'CHỦ PHÒNG'));
        slot.appendChild(nm);
        slot.appendChild(el('small', '', (p.cn || 'Duy') + (p.online === false ? ' · mất kết nối' : '')));
        slot.appendChild(el('span', 'mp-state', p.ready ? 'SẴN SÀNG ✅' : 'Chưa sẵn sàng ⏳'));
      }
      slotsEl.appendChild(slot);
    }
    const opp = oppData();
    const mine = room.players && room.players[me()];
    readyBtn.disabled = !opp;
    readyBtn.textContent = mine && mine.ready ? 'HỦY SẴN SÀNG' : 'SẴN SÀNG';
    roomInfoEl.textContent = !opp
      ? 'Đang chờ đối thủ vào phòng...'
      : 'Cả hai bấm SẴN SÀNG để bắt đầu đếm ngược 3-2-1.';
  }

  // ----- Lớp phủ trận đấu -----
  function renderOverlay() {
    if (phase === 'countdown') {
      overlay.hidden = false;
      overlay.classList.remove('is-light');
      const opp = oppData();
      ovTitle.textContent = 'SOLO 1V1';
      ovSub.textContent = opp ? `VS ${opp.name} (${opp.cn || ''})` : '';
      ovLines.textContent = '';
      ovActions.hidden = true;
      ovBig.hidden = false;
      return;
    }
    if (phase === 'waiting') {
      overlay.hidden = false;
      overlay.classList.add('is-light');
      const opp = oppData();
      const mine = room && room.players ? room.players[me()] : null;
      ovTitle.textContent = '💀 Bạn đã vấp!';
      ovBig.hidden = true;
      ovSub.textContent = `Điểm của bạn: ${fmt(mine ? mine.score : GB.score)}m — chờ ${opp ? opp.name : 'đối thủ'} hoàn thành...`;
      ovLines.textContent = opp ? `Đối thủ đang ở ${fmt(opp.score)}m` : '';
      ovActions.hidden = false;
      rematchBtn.hidden = true;
      exitBtn.hidden = true;
      quitBtn.hidden = false;
      return;
    }
    if (phase === 'result' && lastResult) {
      overlay.hidden = false;
      overlay.classList.remove('is-light');
      const win = lastResult.winner === me();
      const draw = lastResult.winner === null;
      ovTitle.textContent = draw ? '🤝 HÒA!' : (win ? '🏆 BẠN THẮNG!' : '😵 BẠN THUA');
      ovBig.hidden = true;
      ovSub.textContent = lastResult.reason === 'left' ? 'Đối thủ đã thoát giữa trận.' : '';
      ovLines.textContent = '';
      const opp = oppData();
      ovLines.appendChild(el('div', 'mp-line', `Bạn: ${fmt(lastResult.myScore)}m`));
      ovLines.appendChild(el('div', 'mp-line', `${opp ? opp.name : 'Đối thủ'}: ${fmt(lastResult.oppScore)}m`));
      if (lastResult.rewarded) {
  const rewardText = lastResult.gotCrystal > 0
    ? `+${lastResult.gotCrystal} 💎  +${fmt(WIN_REWARD.coin)} 🪙`
    : `+${fmt(WIN_REWARD.coin)} 🪙 (Đã hết lượt nhận 💎 hôm nay)`;
  ovLines.appendChild(el('div', 'mp-line is-reward', rewardText));
} else if (win && lastResult.myScore < MIN_SCORE_FOR_REWARD) {
  ovLines.appendChild(el('div', 'mp-line', `Cần đạt tối thiểu ${MIN_SCORE_FOR_REWARD}m để nhận thưởng`));
      }
      ovActions.hidden = false;
      quitBtn.hidden = true;
      exitBtn.hidden = false;
      rematchBtn.hidden = false;
      const mine = room && room.players ? room.players[me()] : null;
      const oppGone = !opp || opp.online === false;
      rematchBtn.disabled = oppGone || !!(mine && mine.rematch);
      rematchBtn.textContent = oppGone ? 'ĐỐI THỦ ĐÃ RỜI' : (mine && mine.rematch ? 'ĐANG CHỜ ĐỐI THỦ...' : (opp && opp.rematch ? 'CHƠI LẠI (đối thủ đã sẵn sàng)' : 'CHƠI LẠI'));
      return;
    }
    overlay.hidden = true;
  }

  let hudText = '';
  function updateHud() {
    if (phase !== 'playing' && phase !== 'waiting') { hud.hidden = true; return; }
    const opp = oppData();
    const text = opp ? `VS ${opp.name} · ${fmt(ghost.score)}m${opp.alive ? '' : ' 💀'}` : '';
    hud.hidden = !opp;
    if (text !== hudText) { hudText = text; hud.textContent = text; }
  }

  // =========================================================
  //  PHÒNG: tạo / vào / rời
  // =========================================================
  async function createRoom() {
    if (!db) return;
    createBtn.disabled = joinBtn.disabled = true;
    setMsg('Đang tạo phòng...');
    try {
      const seed = newSeed();
      for (let i = 0; i < 6; i++) {
        const id = randomCode();
        const ref = db.ref('rooms/' + id);
        const data = { seed, round: 1, status: 'waiting', hostUid: me(), createdAt: TS(), players: { [me()]: newPlayer() } };
        const res = await ref.transaction((cur) => (cur === null ? data : undefined), undefined, false);
        if (res.committed) { attach(id, ref, true); return; }
      }
      setMsg('Không tạo được phòng, hãy thử lại.', 'bad');
    } catch (err) {
      console.warn('Lỗi tạo phòng:', err);
      setMsg('Lỗi tạo phòng. Kiểm tra mạng hoặc Rules của Firebase.', 'bad');
    }
    createBtn.disabled = joinBtn.disabled = false;
  }

  async function joinRoom(rawCode) {
    if (!db) return;
    const id = String(rawCode || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(id)) { setMsg('Mã phòng gồm 5 ký tự.', 'bad'); return; }
    createBtn.disabled = joinBtn.disabled = true;
    setMsg('Đang vào phòng...');
    try {
      const ref = db.ref('rooms/' + id);
      const r = (await ref.once('value')).val();
      if (!r) { setMsg('❌ Không tìm thấy phòng này.', 'bad'); }
      else {
        const already = r.hostUid === me() || r.guestUid === me();
        let ok = already;
        if (!already) {
          if (r.status !== 'waiting' || r.guestUid) { setMsg('⚠️ Phòng đã đầy hoặc đang thi đấu.', 'warn'); }
          else {
            const tx = await ref.child('guestUid').transaction((cur) => (cur ? undefined : me()), undefined, false);
            ok = tx.committed && tx.snapshot.val() === me();
            if (!ok) setMsg('⚠️ Phòng đã đầy.', 'warn');
          }
        }
        if (ok) {
          await ref.child('players/' + me()).set(newPlayer());
          if (!already) await ref.child('status').set('lobby');
          attach(id, ref, false);
          return;
        }
      }
    } catch (err) {
      console.warn('Lỗi vào phòng:', err);
      setMsg('Lỗi vào phòng. Kiểm tra mạng hoặc Rules của Firebase.', 'bad');
    }
    createBtn.disabled = joinBtn.disabled = false;
  }

  function attach(id, ref, asHost) {
    roomId = id;
    roomRef = ref;
    room = null;
    phase = 'room';
    startedRound = 0;
    lockStartCountdown = false;
    lockRematch = false;
    playerDisconnectArmed = false;
    try { localStorage.setItem(KEY_LAST_ROOM, id); } catch (_) { /* storage may be disabled */ }
    if (asHost) ref.onDisconnect().remove();                        // chủ phòng thoát khi chưa có khách → xóa phòng rác
    else armPlayerDisconnect();                                     // khách: thoát ngang → đánh dấu offline
    setMsg('');
    showView('room');
    createBtn.disabled = joinBtn.disabled = false;
    ref.on('value', onRoom, (err) => {
      console.warn('Lỗi đọc phòng:', err);
      GB.showToast('Mất kết nối phòng Solo.');
      leaveRoom();
    });
  }

  // Thoát ngang → tự đánh dấu offline để đối thủ xử thắng
  function armPlayerDisconnect() {
    if (!roomRef || playerDisconnectArmed) return;
    playerDisconnectArmed = true;
    myRef().onDisconnect().update({ online: false });
  }

  function detach() {
    clearInterval(countdownTimer);
    countdownTimer = 0;
    if (roomRef) roomRef.off('value');
    phase = 'idle';
    room = null;
    roomRef = null;
    roomId = null;
    lastResult = null;
    ghost.init = false;
    hudText = '';
    window.gameRand = Math.random;               // trả lại Math.random khi thoát Solo
    overlay.hidden = true;
    hud.hidden = true;
  }

  async function leaveRoom() {
    if (phase === 'idle') return;
    const ref = roomRef;
    const myId = me();
    const gameScreen = $('gameScreen');
    const inGame = !!gameScreen && gameScreen.classList.contains('is-active');
    detach();
    showView('menu');
    if (inGame) GB.toLobby(false);
    try { localStorage.removeItem(KEY_LAST_ROOM); } catch (_) { /* storage may be disabled */ }
    if (!ref) return;
    try {
      ref.onDisconnect().cancel();
      const r = (await ref.once('value')).val();
      if (r) {
        const ou = Object.keys(r.players || {}).find((k) => k !== myId);
        const o = ou ? r.players[ou] : null;
        if (!o || o.online === false) await ref.remove();                         // không còn ai → xóa phòng rác
        else await ref.child('players/' + myId).update({ online: false });         // đối thủ còn → báo mình đã rời (xử thắng cho họ)
      }
    } catch (err) { console.warn('Dọn phòng lỗi:', err); }
  }

  // Dọn phòng cũ còn sót từ lần trước (đóng tab đột ngột cả hai bên)
  function cleanStaleRoom() {
    if (!db) return;
    let last = null;
    try { last = localStorage.getItem(KEY_LAST_ROOM); } catch (_) { return; }
    if (!last) return;
    db.ref('rooms/' + last).once('value').then((snap) => {
      const r = snap.val();
      if (!r) return null;
      const players = Object.keys(r.players || {}).map((k) => r.players[k]);
      const allOffline = players.length === 0 || players.every((p) => p.online === false);
      const old = r.createdAt && serverNow() - r.createdAt > STALE_MS;
      if (allOffline || old) return snap.ref.remove();
      return null;
    }).catch(() => {}).then(() => { try { localStorage.removeItem(KEY_LAST_ROOM); } catch (_) { /* ignore */ } });
  }

  // =========================================================
  //  ĐỒNG BỘ PHÒNG
  // =========================================================
  function onRoom(snap) {
    room = snap.val();
    if (!room) {
      if (phase !== 'idle') { GB.showToast('Phòng Solo đã đóng.'); leaveRoom(); }
      return;
    }
    const mine = room.players && room.players[me()];
    if (!mine) { leaveRoom(); return; }                          // mình không còn trong phòng
    const opp = oppData();

    if (phase === 'room' || phase === 'countdown') {
      const oppGone = !opp || opp.online === false;
      if (oppGone && room.status !== 'waiting') {
        if (!isHost()) { GB.showToast('Chủ phòng đã rời. Phòng đóng lại.'); leaveRoom(); return; }
        resetToWaiting(opp ? room.guestUid : null);
        return;
      }
      if (isHost() && opp && !playerDisconnectArmed) {
        // Đã có khách: hủy lệnh "xóa phòng khi host thoát" và chuyển sang chế độ đánh dấu offline
        roomRef.onDisconnect().cancel();
        armPlayerDisconnect();
      }
    }

    if (phase === 'room') {
      renderRoom();
      if (isHost() && room.status === 'lobby' && !lockStartCountdown && opp && mine.ready && opp.ready && opp.online !== false) {
        lockStartCountdown = true;
        roomRef.update({ status: 'countdown', startAt: serverNow() + COUNTDOWN_MS })
          .catch((err) => console.warn('Không bắt đầu đếm ngược:', err))
          .then(() => { lockStartCountdown = false; });
      }
    }

    if (room.status === 'countdown' && startedRound !== room.round && (phase === 'room' || phase === 'result')) startCountdown();

    if (phase === 'playing' || phase === 'waiting') evaluate();

    if (phase === 'result') {
      renderOverlay();
      if (isHost() && room.status === 'finished' && !lockRematch && opp && mine.rematch && opp.rematch) startRematch();
    }
  }

  function resetToWaiting(guestUid) {
    const updates = { status: 'waiting', guestUid: null };
    if (guestUid) updates['players/' + guestUid] = null;
    updates['players/' + me() + '/ready'] = false;
    roomRef.update(updates).then(() => {
      playerDisconnectArmed = false;
      roomRef.onDisconnect().remove();
    }).catch((err) => console.warn('Không reset phòng:', err));
    if (phase === 'countdown') {
      clearInterval(countdownTimer);
      overlay.hidden = true;
      phase = 'room';
      showView('room');
      GB.openModal(modal, $('openSolo'));
    }
  }

  function toggleReady() {
    if (!room || phase !== 'room') return;
    const mine = room.players[me()];
    const fresh = newPlayer();
    myRef().update({ ready: !mine.ready, name: fresh.name, char: fresh.char, cn: fresh.cn, online: true })
      .catch((err) => console.warn('Không đổi trạng thái sẵn sàng:', err));
  }

  // =========================================================
  //  ĐẾM NGƯỢC & BẮT ĐẦU TRẬN
  // =========================================================
  function startCountdown() {
    startedRound = room.round;
    phase = 'countdown';
    lockStartCountdown = false;
    lastResult = null;
    ghost.init = false;
    ovBig.textContent = '';
    GB.closeModal();                       // phase đã là 'countdown' nên observer sẽ không coi là rời phòng
    renderOverlay();
    clearInterval(countdownTimer);
    const tick = () => {
      if (phase !== 'countdown' || !room) return;
      const remain = Number(room.startAt) - serverNow();
      if (!(remain > 0)) { clearInterval(countdownTimer); beginMatch(); return; }
      const n = clamp(Math.ceil(remain / 1000), 1, 3);
      if (ovBig.textContent !== String(n)) { ovBig.textContent = String(n); GB.playTone(n === 1 ? 760 : 520, 0.09, 'square', 0.03); }
    };
    countdownTimer = setInterval(tick, 80);
    tick();
  }

  function beginMatch() {
    // Gán bộ sinh số ngẫu nhiên Mulberry32 từ room.seed cho TOÀN BỘ trận (2 máy cùng seed → cùng bản đồ)
    window.gameRand = mulberry32(room.seed);
    overlay.hidden = true;
    phase = 'playing';
    sendAcc = 0;
    ghost.init = false;
    const fresh = newPlayer();
    myRef().update({ score: 0, y: 0, alive: true, skill: false, ready: true, rematch: false, online: true, name: fresh.name, char: fresh.char, cn: fresh.cn })
      .catch((err) => console.warn('Không cập nhật trạng thái vào trận:', err));
    roomRef.child('status').transaction((cur) => (cur === 'countdown' ? 'playing' : undefined), undefined, false).catch(() => {});
    GB.startGame('score');
    wasRunning = GB.state === 'running';
  }

  // =========================================================
  //  TRONG TRẬN: gửi trạng thái, phát hiện vấp, xử thắng/thua
  // =========================================================
  const heightAboveGround = () => Math.max(0, GB.groundY - GB.player.height - GB.player.y);

  function pushState(alive) {
    const ref = myRef();
    if (!ref) return;
    ref.update({
      score: Math.floor(GB.score),
      y: Math.round(heightAboveGround()),
      alive,
      skill: alive && GB.skillActive
    }).catch(() => {});
  }

  function onUpdate(dt) {
    if (phase !== 'playing' && phase !== 'waiting' && phase !== 'result') return;
    const go = $('gameOver');
    if (go && !go.hidden) go.hidden = true;           // trận Solo dùng bảng kết quả riêng, không dùng bảng "chơi lại" của game

    // Nội suy bóng mờ đối thủ
    const opp = oppData();
    if (opp) {
      if (!ghost.init) { ghost.init = true; ghost.score = Number(opp.score) || 0; ghost.y = Number(opp.y) || 0; }
      else {
        const k = 1 - Math.exp(-dt * 14);
        ghost.score += ((Number(opp.score) || 0) - ghost.score) * k;
        ghost.y += ((Number(opp.y) || 0) - ghost.y) * k;
      }
    }

    if (phase === 'playing') {
      const running = GB.state === 'running';
      if (wasRunning && !running) {
        // Mình vừa vấp → gửi điểm cuối, chuyển sang trạng thái chờ đối thủ
        phase = 'waiting';
        pushState(false);
        renderOverlay();
        evaluate();
      } else if (running) {
        sendAcc += dt;
        if (sendAcc >= SEND_INTERVAL) { sendAcc = 0; pushState(true); }
        evaluate();                                   // còn sống mà vượt điểm người đã thua → thắng ngay
      }
      wasRunning = running;
    } else if (phase === 'waiting') {
      renderOverlay();
    }
    updateHud();
  }

  // Luật: cả 2 cùng thua → so điểm; người còn sống vượt điểm người đã thua → thắng ngay; đối thủ thoát → thắng
  function evaluate() {
    if (!room || (phase !== 'playing' && phase !== 'waiting')) return;
    const mine = room.players[me()];
    const opp = oppData();
    if (!mine) return;
    if (!opp || opp.online === false) { finish(me(), 'left'); return; }
    if (!mine.alive && !opp.alive) {
      const a = Number(mine.score) || 0;
      const b = Number(opp.score) || 0;
      finish(a === b ? null : (a > b ? me() : oppUid()), 'score');
      return;
    }
    if (mine.alive && !opp.alive && GB.state === 'running' && Math.floor(GB.score) > (Number(opp.score) || 0)) {
      GB.endGame();                                    // đã vượt điểm người thua → kết thúc ván của mình; onUpdate sẽ gửi điểm cuối
    }
  }

  function finish(winner, reason) {
    if (phase === 'result' || !room) return;
    const mine = room.players[me()] || {};
    const opp = oppData() || {};
    const myScore = phase === 'waiting' || !mine.alive ? (Number(mine.score) || 0) : Math.floor(GB.score);
    phase = 'result';
    if (GB.state === 'running') GB.endGame();           // đối thủ thoát giữa trận: dừng ván của mình
     let rewarded = false;
 if (winner === me() && rewardedRound !== room.round && myScore >= MIN_SCORE_FOR_REWARD) {
   rewardedRound = room.round;
   const gotCrystal = canClaimSoloCrystal() ? WIN_REWARD.crystal : 0;
   if (gotCrystal > 0) recordSoloCrystalWin();
   GB.addReward(gotCrystal, WIN_REWARD.coin);
   GB.playUiSound('claim');
   rewarded = true;
 }
     
    lastResult = { winner, reason, myScore, oppScore: Number(opp.score) || 0, rewarded, gotCrystal };
     
    roomRef.child('status').transaction((cur) => (cur === 'playing' ? 'finished' : undefined), undefined, false).catch(() => {});
    renderOverlay();
  }

  // ----- Chơi lại -----
  function requestRematch() {
    if (phase !== 'result' || !room) return;
    myRef().update({ rematch: true }).catch((err) => console.warn('Không gửi yêu cầu chơi lại:', err));
  }

  function startRematch() {
    lockRematch = true;
    const updates = { status: 'countdown', round: room.round + 1, seed: newSeed(), startAt: serverNow() + COUNTDOWN_MS };
    Object.keys(room.players).forEach((uid) => {
      const base = 'players/' + uid + '/';
      updates[base + 'score'] = 0;
      updates[base + 'y'] = 0;
      updates[base + 'alive'] = true;
      updates[base + 'skill'] = false;
      updates[base + 'rematch'] = false;
      updates[base + 'ready'] = true;
    });
    roomRef.update(updates)
      .catch((err) => console.warn('Không bắt đầu ván chơi lại:', err))
      .then(() => { lockRematch = false; });
  }

  // =========================================================
  //  VẼ BÓNG MỜ ĐỐI THỦ (Ghost sprite)
  // =========================================================
  function ghostImage(key) {
    const info = GB.characters[key] || GB.characters.duy;
    if (!ghostImages[info.src]) { const img = new Image(); img.src = info.src; ghostImages[info.src] = img; }
    return ghostImages[info.src];
  }

  function onRender(ctx) {
    if ((phase !== 'playing' && phase !== 'waiting' && phase !== 'result') || !ghost.init) return;
    const opp = oppData();
    if (!opp) return;
    const p = GB.player;
    const delta = ghost.score - GB.score;                                   // đối thủ hơn/kém mình bao nhiêu mét
    const gx = p.x + clamp(delta * SCORE_TO_PX, -(p.x - 6), GB.width - p.x - p.width - 6);
    const gy = GB.groundY - p.height - ghost.y;
    const alive = !!opp.alive;

    ctx.save();
    ctx.globalAlpha = alive ? 0.45 : 0.2;
    if (alive && opp.skill) { ctx.shadowColor = '#d8f58b'; ctx.shadowBlur = 16; }   // đối thủ đang dùng tuyệt chiêu → phát sáng
    const img = ghostImage(opp.char);
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, gx, gy, p.width, p.height);
    } else {
      ctx.fillStyle = '#9fd8ff';
      ctx.fillRect(gx, gy, p.width, p.height);
    }
    ctx.restore();

    // Tên đối thủ + chênh lệch điểm
    ctx.save();
    ctx.font = '700 11px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.65)';
    ctx.fillStyle = alive ? '#ffffff' : '#c9c9c9';
    const label = `${alive ? '' : '💀 '}${opp.name} ${delta >= 0 ? '+' : ''}${Math.round(delta)}m`;
    const ly = Math.max(14, gy - 6);
    ctx.strokeText(label, gx + p.width / 2, ly);
    ctx.fillText(label, gx + p.width / 2, ly);
    ctx.restore();
  }

  // ---------- Khởi tạo ----------
  buildUi();
  cleanStaleRoom();
  window.Multiplayer = { onUpdate, onRender, isInMatch };
})();
