/* =========================================================
   racing.js — RACING · Đua Tốc Độ 3–5 người (Firebase Realtime Database)
   Module độc lập: chỉ giao tiếp với game.js qua window.GameBridge
   và được game.js gọi ngược lại bằng:
     window.Racing.onUpdate(dt)        (cuối hàm update)
     window.Racing.onFall(scoreAt)     (đầu hàm endGame — trả true = "đã xử lý, đừng Game Over")
   Nhúng SAU game.js (và multiplayer.js) trong index.html.

   V24.1 — BOT NPC: bấm GHÉP PHÒNG NHANH mà sau 15 giây vẫn không có người thật vào phòng → phòng chờ bị gỡ khỏi
   Firebase và trận được chạy GIẢ LẬP HOÀN TOÀN TRÊN CLIENT với 2 Bot (tên lấy từ danh sách NPC của game).
   Trận Bot không ghi gì lên Firebase, không cược 💎 và không có quỹ thưởng (tránh cày Crystal vô hạn).

   Cấu trúc dữ liệu racing_rooms/{roomId}:
   {
     seed, status: 'waiting'|'countdown'|'racing'|'finished',
     hostUid, createdAt, startAt, isPublic, minPlayers, maxPlayers,
     winnerUid, winReason, finishedAt, finalLap,
     players: { [uid]: { name, char, cn, ready, online, order, score, paid, falls } },
     events:  { [pushId]: { type:'fall', uid, name, at, ts } }
   }
   ========================================================= */
(function () {
  'use strict';

  const GB = window.GameBridge;
  if (!GB) { console.warn('racing.js: không thấy window.GameBridge (game.js chưa nạp?)'); return; }

  // ---------- Cấu hình ----------
  const TARGET_DISTANCE = 25000;          // vạch đích
  const MAP_STEP = 3000;                  // cứ mỗi 3.000m đổi map (3k, 6k, ... 24k)
  const FINAL_LAP_AT = 22000;             // còn 3.000m cuối → cảnh báo nước rút
  const BET = 5;                          // cược 5 Crystal / người
  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 5;
  const SEND_INTERVAL = 0.4;              // đồng bộ tiến độ mỗi 400ms
  const COUNTDOWN_MS = 3300;              // 3 - 2 - 1 - GO
  const FALL_DEBOUNCE_MS = 350;           // nhiều va chạm cùng 1 khung hình chỉ tính 1 lần té
  const BOT_WAIT_MS = 15000;              // V24.1: chờ 15s không có người thật → ghép Bot NPC
  const BOT_COUNT = 2;                    // số Bot trong trận giả lập (cùng bạn = 3 người, đúng mức tối thiểu của Racing)
  const BOT_SPEED_MIN = 36;               // m/s — tốc độ chạy trung bình của Bot
  const BOT_SPEED_MAX = 42;
  const BOT_FALL_PER_SEC = 0.0015;        // xác suất vấp ngã mỗi giây (≈ 1 lần / 11 phút) → bị reset về 0m như người thật
  const BOT_FALL_GRACE = 8;               // giây "an toàn" sau khi Bot vừa hồi sinh
  const RACE_COMPLETE_MIN_MS = 60000;     // phải ở trong trận ≥ 60s mới tính "hoàn thành Racing" cho sự kiện 20/11
  const MAPS = ['desert', 'city', 'beach', 'sunset'];
  const MAP_LABEL = { desert: 'Sa Mạc', city: 'City', beach: 'Bãi Biển', sunset: 'Bãi Biển Hoàng Hôn' };
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const KEY_LAST_ROOM = 'duyMapChayDiRacingLastRoom';
  const STALE_MS = 3 * 60 * 60 * 1000;    // phòng bỏ quên > 3 giờ sẽ bị dọn
  const SLOT_COLORS = ['#ffd84a', '#4cc7f5', '#ff6b6b', '#7ee081', '#c792ff'];
  const FALL_LINES = [
    (n, d) => `💀 ${n} vừa sẩy chân ở ${d}m và bay thẳng về 0m!`,
    (n, d) => `🤡 ${n} vấp ở ${d}m — chào mừng quay lại vạch xuất phát!`,
    (n, d) => `🪦 ${n} hy sinh ở ${d}m, hồi sinh tại 0m!`,
    (n, d) => `😭 ${n} ngã ở ${d}m... lại từ đầu thôi!`
  ];

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
  function randomCode(len) {
    let out = '';
    for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return out;
  }
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  // Lộ trình map: dùng riêng 1 bộ sinh từ seed (không đụng gameRand) → cả phòng có đúng cùng lộ trình.
  // 8 mốc (3k..24k), mỗi mốc bốc ngẫu nhiên 1 trong 4 map, không trùng map ngay trước đó để luôn thấy đổi map.
  function buildRoute(seed) {
    const rnd = mulberry32((seed ^ 0x5bd1e995) >>> 0);
    const out = [];
    let prev = 'desert';
    for (let i = 0; i < Math.floor(TARGET_DISTANCE / MAP_STEP); i++) {
      const pool = MAPS.filter((m) => m !== prev);
      const pick = pool[Math.floor(rnd() * pool.length)];
      out.push(pick);
      prev = pick;
    }
    return out;
  }

  // ---------- Giờ server ----------
  let serverOffset = 0;
  if (db) db.ref('.info/serverTimeOffset').on('value', (snap) => { serverOffset = Number(snap.val()) || 0; });
  const serverNow = () => Date.now() + serverOffset;

  // ---------- Trạng thái cục bộ ----------
  // phase: idle | menu | room | countdown | racing | result
  let phase = 'idle';
  let roomId = null;
  let roomRef = null;
  let evRef = null;
  let room = null;
  let route = [];
  let startedKey = 0;           // startAt của vòng đã khởi động đếm ngược
  let countdownTimer = 0;
  let sendAcc = 0;
  let lastFallAt = 0;
  let myFalls = 0;
  let claiming = false;
  let rewardedKey = null;
  let lockStart = false;
  let migrating = false;
  let armedMode = '';
  let finalLapOn = false;
  let finalLapAsked = false;
  let lastResult = null;
  let quitArmed = 0;
  const seenEvents = new Set();
  let markers = [];
  // V24.1: Bot NPC (trận giả lập cục bộ)
  let botMatch = false;
  let bots = [];                // [{ uid, speed, t, phase, fallCd }]
  let botSearchTimer = 0;
  let botTickTimer = 0;
  let botSearchUntil = 0;
  let raceBeganAt = 0;
  let botRemoving = false;      // đang gỡ phòng chờ để ghép Bot → bỏ qua snapshot "phòng đã đóng"

  const isHost = () => !!room && room.hostUid === me();
  const myRef = () => roomRef && roomRef.child('players/' + me());
  const isInMatch = () => phase === 'countdown' || phase === 'racing' || phase === 'result';
  const playersOf = (r) => (r && r.players) || {};
  const byOrder = (ps) => (a, b) => ((ps[a].order || 0) - (ps[b].order || 0)) || (a < b ? -1 : 1);
  const potOf = (r) => (botMatch ? 0 : Object.values(playersOf(r)).filter((p) => p && p.paid === true).length * BET);
  const canBet = () => GB.crystals >= BET;

  function newPlayer() {
    return {
      name: GB.lbPlayerName(),
      char: GB.selectedCharacter,
      cn: GB.charName(GB.selectedCharacter),
      ready: false, online: true, order: serverNow(), score: 0, paid: false, falls: 0
    };
  }

  // =========================================================
  //  GIAO DIỆN (tự chèn vào DOM)
  // =========================================================
  const CSS = `
  .rc-hud{position:absolute;inset:0;z-index:6;pointer-events:none;font-family:var(--font-ui,"Chakra Petch",system-ui,sans-serif)}
  .rc-hud[hidden]{display:none}
  .rc-map{position:absolute;top:calc(env(safe-area-inset-top,0px) + var(--rc-top,50px));left:50%;transform:translateX(-50%);width:min(74%,540px);padding:3px 10px 2px;border-radius:12px;background:rgba(8,23,15,.72);border:2px solid rgba(255,255,255,.16);backdrop-filter:blur(6px)}
  .rc-map-head{display:flex;justify-content:space-between;gap:8px;font-size:10px;font-weight:700;color:#e9f3ff;letter-spacing:.3px;white-space:nowrap;overflow:hidden}
  .rc-map-head span:last-child{color:var(--gold,#ffd34d);overflow:hidden;text-overflow:ellipsis}
  .rc-lane{position:relative;height:42px;margin:0 8px}
  .rc-track{position:absolute;left:0;right:0;top:50%;height:8px;margin-top:-4px;border-radius:6px;background:rgba(255,255,255,.22);overflow:visible}
  .rc-fill{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:6px;background:linear-gradient(90deg,#4cc7f5,#ffd84a)}
  .rc-tick{position:absolute;top:-2px;bottom:-2px;width:1px;background:rgba(255,255,255,.5)}
  .rc-tick.is-final{width:2px;background:#ff5252}
  .rc-flag{position:absolute;right:-9px;top:-17px;font-size:14px;line-height:1}
  .rc-mk{position:absolute;top:50%;width:0;height:0;transition:filter .2s}
  .rc-mk img,.rc-mk .rc-fallback{position:absolute;left:-10px;top:-10px;width:20px;height:20px;border-radius:50%;object-fit:cover;background:#1b2a3d;border:2px solid var(--c,#fff);box-sizing:border-box;image-rendering:auto}
  .rc-mk.is-me img,.rc-mk.is-me .rc-fallback{width:24px;height:24px;left:-12px;top:-12px;box-shadow:0 0 8px 2px var(--c,#fff)}
  .rc-mk-name{position:absolute;left:0;transform:translateX(-50%);font-size:9px;font-weight:700;color:#fff;text-shadow:0 1px 2px #000,0 0 3px #000;white-space:nowrap}
  .rc-mk.rc-up .rc-mk-name{top:-25px}
  .rc-mk.rc-dn .rc-mk-name{top:11px}
  .rc-mk.is-me .rc-mk-name{color:#ffd84a}
  .rc-mk.is-off{filter:grayscale(1) opacity(.5)}
  .rc-mk.is-hit img,.rc-mk.is-hit .rc-fallback{animation:rcHit .9s ease-out}
  .rc-map.is-flash{animation:rcMapFlash .9s ease-out}
  @keyframes rcHit{0%,40%{box-shadow:0 0 0 4px #ff2d2d,0 0 14px 6px #ff2d2d}100%{box-shadow:none}}
  @keyframes rcMapFlash{0%,35%{background:rgba(255,40,40,.7);border-color:#ff4d4d}100%{background:rgba(8,23,15,.72)}}
  .rc-feed{position:absolute;left:10px;top:calc(env(safe-area-inset-top,0px) + var(--rc-top,50px) + 62px);display:flex;flex-direction:column;gap:4px;max-width:min(60%,360px)}
  .rc-feed div{padding:4px 9px;border-radius:8px;background:rgba(8,23,15,.82);border-left:3px solid var(--danger,#ff6b5e);color:#fff;font-size:11px;font-weight:600;line-height:1.25;animation:rcFeed 4.8s ease forwards}
  @keyframes rcFeed{0%{opacity:0;transform:translateX(-14px)}8%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}
  .rc-vignette{position:absolute;inset:0;display:none;box-shadow:inset 0 0 70px 18px rgba(255,30,30,.55);animation:rcPulse .9s ease-in-out infinite alternate}
  .rc-hud.is-final .rc-vignette{display:block}
  @keyframes rcPulse{from{opacity:.35}to{opacity:1}}
  .rc-banner{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%) scale(.8);padding:8px 18px;border-radius:12px;background:rgba(190,10,10,.88);color:#fff;font-weight:800;font-size:clamp(15px,3.4vw,24px);letter-spacing:.5px;text-align:center;opacity:0;white-space:nowrap}
  .rc-banner.is-show{animation:rcBanner 3.4s ease forwards}
  @keyframes rcBanner{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}10%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}18%{transform:translate(-50%,-50%) scale(1)}85%{opacity:1}100%{opacity:0}}
  .rc-quit{position:absolute;left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);pointer-events:auto;border:0;border-radius:10px;padding:6px 10px;background:rgba(8,23,15,.72);border:2px solid rgba(255,255,255,.16);color:#fff;font:700 11px var(--font-ui,sans-serif);cursor:pointer}
  .rc-quit.is-armed{background:#c62828}
  .rc-overlay{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:16px;background:rgba(4,12,8,.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
  .rc-overlay[hidden]{display:none}
  .rc-box{width:min(100%,420px);max-height:calc(100vh - 32px);overflow:auto;padding:16px 18px;text-align:center;display:grid;gap:8px}
  .rc-title{margin:0;font-family:var(--font-title);font-size:26px;letter-spacing:.04em}
  .rc-big{font-size:64px;line-height:1.1;color:var(--lime);text-shadow:0 0 24px rgba(216,245,139,.6)}
  .rc-sub{margin:0;color:var(--muted);font-size:13px;line-height:1.5}
  .rc-rank{display:grid;gap:6px}
  .rc-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.24);border:2px solid rgba(255,255,255,.08);font-size:13px;text-align:left}
  .rc-row.is-me{border-color:rgba(216,245,139,.5)}
  .rc-row.is-win{background:rgba(255,211,77,.14);border-color:var(--gold)}
  .rc-row b{min-width:26px}
  .rc-row .rc-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rc-row small{color:var(--muted);font-weight:700}
  .rc-row strong{color:var(--gold)}
  .rc-reward{font-weight:700;font-size:15px}
  .rc-reward.is-win{color:var(--gold)}.rc-reward.is-lose{color:var(--danger)}
  .rc-acts{display:grid;gap:8px}
  .rc-acts [hidden]{display:none}
  .rc-slots{display:grid;gap:6px}
  .rc-slot{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:14px;background:rgba(0,0,0,.24);border:2px solid rgba(255,255,255,.08);font-size:13px;text-align:left}
  .rc-slot.is-me{border-color:rgba(216,245,139,.5)}
  .rc-slot.is-ready{background:rgba(216,245,139,.1);border-color:var(--lime)}
  .rc-slot.is-empty{opacity:.55;font-style:italic}
  .rc-slot .rc-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rc-slot small{color:var(--muted);font-weight:700;font-size:11px}
  .rc-pot{margin:0;text-align:center;font-weight:700;color:var(--gold);font-size:13px}
  .rc-btnrow{display:flex;gap:8px;flex-wrap:wrap}
  @media (max-height:520px){.rc-lane{height:34px}.rc-map{--rc-top:46px}.rc-big{font-size:44px}.rc-box{padding:12px 14px;gap:6px}}
  .rc-btnrow>*{flex:1 1 140px}
  `;

  let modal, menuView, roomView, msgEl, codeInput, createBtn, quickBtn, joinBtn, menuNote;
  let codeText, copyBtn, slotsEl, potEl, roomInfoEl, readyBtn, leaveBtn;
  let overlay, ovTitle, ovBig, ovSub, ovBody, ovActions, rematchBtn, exitBtn;
  let hud, mapBox, mapHead1, mapHead2, lane, fillEl, bannerEl, feedEl, quitBtn;

  function buildUi() {
    const style = el('style');
    style.id = 'racingStyle';
    style.textContent = CSS;
    document.head.appendChild(style);

    // ----- Nút ngoài sảnh (nếu index.html chưa có thì tự thêm) -----
    if (!$('openRacing')) {
      const rail = document.querySelector('.side-rail-left') || document.querySelector('.side-rail');
      if (rail) {
        const b = el('button', 'rail-btn');
        b.id = 'openRacing';
        b.type = 'button';
        const ico = el('span', 'rail-ico', '🏁'); ico.setAttribute('aria-hidden', 'true');
        b.appendChild(ico);
        b.appendChild(el('span', 'rail-txt', 'RACING'));
        rail.appendChild(b);
      }
    }

    // ----- Popup RACING -----
    modal = el('div', 'modal');
    modal.id = 'racingModal';
    modal.hidden = true;
    const backdrop = el('div', 'modal-backdrop');
    backdrop.setAttribute('data-close', '');
    modal.appendChild(backdrop);

    const panel = el('div', 'panel modal-panel lg-narrow');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'rcTitle');

    const head = el('header', 'modal-head');
    const titleWrap = el('div');
    titleWrap.appendChild(el('p', 'kicker', 'ĐUA 3–5 NGƯỜI'));
    const h2 = el('h2', '', 'RACING 🏁');
    h2.id = 'rcTitle';
    titleWrap.appendChild(h2);
    head.appendChild(titleWrap);
    const closeBtn = el('button', 'close-btn', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('data-close', '');
    closeBtn.setAttribute('aria-label', 'Đóng');
    head.appendChild(closeBtn);
    panel.appendChild(head);

    // Màn chọn
    menuView = el('div', 'mp-view');
    menuNote = el('p', 'modal-note');
    menuView.appendChild(menuNote);
    createBtn = el('button', 'card-btn select mp-big', '➕ TẠO PHÒNG');
    createBtn.type = 'button';
    quickBtn = el('button', 'card-btn upgrade mp-big', '⚡ GHÉP PHÒNG NHANH');
    quickBtn.type = 'button';
    const topRow = el('div', 'rc-btnrow');
    topRow.appendChild(createBtn);
    topRow.appendChild(quickBtn);
    menuView.appendChild(topRow);
    menuView.appendChild(el('p', 'mp-or', '— hoặc nhập mã mời —'));
    const joinRow = el('div', 'lb-name-row');
    codeInput = el('input', 'lb-input mp-code-input');
    codeInput.type = 'text';
    codeInput.maxLength = 6;
    codeInput.autocomplete = 'off';
    codeInput.spellcheck = false;
    codeInput.placeholder = 'MÃ PHÒNG';
    joinBtn = el('button', 'card-btn upgrade', 'VÀO PHÒNG');
    joinBtn.type = 'button';
    joinRow.appendChild(codeInput);
    joinRow.appendChild(joinBtn);
    menuView.appendChild(joinRow);
    panel.appendChild(menuView);

    // Phòng chờ
    roomView = el('div', 'mp-view');
    roomView.hidden = true;
    const codeBox = el('div', 'mp-codebox');
    codeBox.appendChild(el('small', '', 'MÃ PHÒNG'));
    codeText = el('strong', 'px', '------');
    codeBox.appendChild(codeText);
    copyBtn = el('button', 'card-btn', 'SAO CHÉP');
    copyBtn.type = 'button';
    codeBox.appendChild(copyBtn);
    roomView.appendChild(codeBox);
    potEl = el('p', 'rc-pot');
    roomView.appendChild(potEl);
    slotsEl = el('div', 'rc-slots');
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

    // ----- Lớp phủ: đếm ngược / bảng tổng kết -----
    overlay = el('div', 'rc-overlay');
    overlay.hidden = true;
    const box = el('div', 'panel rc-box');
    ovTitle = el('h2', 'rc-title');
    ovBig = el('div', 'rc-big px');
    ovSub = el('p', 'rc-sub');
    ovBody = el('div');
    ovActions = el('div', 'rc-acts');
    rematchBtn = el('button', 'card-btn select mp-big', 'ĐUA LẠI');
    rematchBtn.type = 'button';
    exitBtn = el('button', 'card-btn', 'RỜI PHÒNG');
    exitBtn.type = 'button';
    ovActions.appendChild(rematchBtn);
    ovActions.appendChild(exitBtn);
    [ovTitle, ovBig, ovSub, ovBody, ovActions].forEach((n) => box.appendChild(n));
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // ----- HUD trong trận: Minimap + Kill-feed + Nước rút -----
    hud = el('div', 'rc-hud');
    hud.hidden = true;
    mapBox = el('div', 'rc-map');
    const mh = el('div', 'rc-map-head');
    mapHead1 = el('span', '', '🏁 0m / 25.000m');
    mapHead2 = el('span', '', '');
    mh.appendChild(mapHead1);
    mh.appendChild(mapHead2);
    mapBox.appendChild(mh);
    lane = el('div', 'rc-lane');
    const track = el('div', 'rc-track');
    fillEl = el('i', 'rc-fill');
    track.appendChild(fillEl);
    for (let m = MAP_STEP; m < TARGET_DISTANCE; m += MAP_STEP) {
      const t = el('i', 'rc-tick');
      t.style.left = (m / TARGET_DISTANCE * 100) + '%';
      track.appendChild(t);
    }
    const tf = el('i', 'rc-tick is-final');
    tf.style.left = (FINAL_LAP_AT / TARGET_DISTANCE * 100) + '%';
    track.appendChild(tf);
    track.appendChild(el('span', 'rc-flag', '🏁'));
    lane.appendChild(track);
    mapBox.appendChild(lane);
    hud.appendChild(mapBox);
    feedEl = el('div', 'rc-feed');
    hud.appendChild(feedEl);
    hud.appendChild(el('div', 'rc-vignette'));
    bannerEl = el('div', 'rc-banner', '🚨 NƯỚC RÚT! CÒN 3.000m CUỐI!');
    hud.appendChild(bannerEl);
    quitBtn = el('button', 'rc-quit', '🚪 THOÁT');
    quitBtn.type = 'button';
    quitBtn.addEventListener('click', onQuitTap);
    hud.appendChild(quitBtn);
    ($('gameScreen') || document.body).appendChild(hud);

    // ----- Sự kiện -----
    const openBtn = $('openRacing');
    if (openBtn) openBtn.addEventListener('click', openMenu);
    createBtn.addEventListener('click', () => createRoom(false));
    quickBtn.addEventListener('click', quickMatch);
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
    rematchBtn.addEventListener('click', rematch);
    exitBtn.addEventListener('click', () => leaveRoom());

    // Đóng popup khi đang ở menu / phòng chờ = rời phòng
    new MutationObserver(() => {
      if (modal.hidden && (phase === 'menu' || phase === 'room')) leaveRoom();
    }).observe(modal, { attributes: true, attributeFilter: ['hidden'] });

    // Chặn Space/Enter/R "chơi lại" của game.js khi đang ở bảng đếm ngược / tổng kết
    window.addEventListener('keydown', (e) => {
      if (!isInMatch() || GB.state === 'running') return;
      if (['Space', 'Enter', 'KeyR', 'ArrowUp', 'KeyW'].includes(e.code)) {
        if (e.target && e.target.tagName === 'BUTTON') return;
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
  function setBusy(b) { createBtn.disabled = quickBtn.disabled = joinBtn.disabled = b || !db; }

  function openMenu() {
    if (phase !== 'idle') return;
    phase = 'menu';
    showView('menu');
    codeInput.value = '';
    menuNote.textContent = `Cược ${BET} 💎 mỗi người (trừ khi trận bắt đầu). Tối thiểu ${MIN_PLAYERS}, tối đa ${MAX_PLAYERS} người. Ai chạm ${fmt(TARGET_DISTANCE)}m đầu tiên ăn TRỌN quỹ thưởng! Chết là quay về 0m. Cấm vật phẩm hỗ trợ. Ghép phòng nhanh mà ${BOT_WAIT_MS / 1000}s vẫn vắng người sẽ tự ghép Bot NPC (trận luyện tập, không cược).`;
    setBusy(false);
    if (!db) setMsg('Chưa kết nối được Firebase. Kiểm tra mạng rồi thử lại.', 'bad');
    else if (!canBet()) setMsg(`Bạn cần tối thiểu ${BET} 💎 để tham gia (hiện có ${fmt(GB.crystals)} 💎).`, 'warn');
    else setMsg('');
    GB.openModal(modal, $('openRacing'));
  }

  // ----- Phòng chờ -----
  function renderRoom() {
    if (!room) return;
    const ps = playersOf(room);
    const uids = Object.keys(ps).sort(byOrder(ps));
    codeText.textContent = roomId;
    slotsEl.textContent = '';
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const uid = uids[i];
      const p = uid ? ps[uid] : null;
      if (!p) {
        slotsEl.appendChild(el('div', 'rc-slot is-empty', `Ô ${i + 1}: đang chờ người chơi...`));
        continue;
      }
      const slot = el('div', 'rc-slot' + (p.ready ? ' is-ready' : '') + (uid === me() ? ' is-me' : ''));
      const dot = el('span', '', '●');
      dot.style.color = SLOT_COLORS[i % SLOT_COLORS.length];
      slot.appendChild(dot);
      const nm = el('span', 'rc-nm', (p.name || 'Runner') + (uid === room.hostUid ? ' 👑' : '') + ' · ' + (p.cn || 'Duy'));
      slot.appendChild(nm);
      slot.appendChild(el('small', '', p.online === false ? 'mất kết nối' : (p.ready ? 'SẴN SÀNG ✅' : 'chưa sẵn sàng ⏳')));
      slotsEl.appendChild(slot);
    }
    const n = uids.length;
    potEl.textContent = `🎁 Quỹ thưởng nếu ${n} người cùng đua: ${n} × ${BET} = ${n * BET} 💎`;
    const mine = ps[me()];
    if (room.status === 'finished') {
      readyBtn.disabled = !isHost();
      readyBtn.textContent = isHost() ? 'MỞ VÁN MỚI' : 'CHỜ CHỦ PHÒNG MỞ VÁN MỚI...';
      roomInfoEl.textContent = 'Ván trước đã kết thúc.';
    } else {
      readyBtn.disabled = false;
      readyBtn.textContent = mine && mine.ready ? 'HỦY SẴN SÀNG' : `SẴN SÀNG (cược ${BET} 💎)`;
      if (botSearchUntil > 0 && n < 2) {
        const left = Math.max(0, Math.ceil((botSearchUntil - Date.now()) / 1000));
        roomInfoEl.textContent = `🔎 Đang tìm đối thủ... ${left}s nữa vẫn chưa có ai sẽ tự ghép Bot NPC để vào trận ngay.`;
      } else {
        roomInfoEl.textContent = n < MIN_PLAYERS
          ? `Cần tối thiểu ${MIN_PLAYERS} người (đang có ${n}). Gửi mã phòng cho bạn bè!`
          : 'Tất cả bấm SẴN SÀNG để bắt đầu đếm ngược 3-2-1.';
      }
    }
  }

  // ----- Lớp phủ: đếm ngược / tổng kết -----
  function ranking() {
    const ps = playersOf(room);
    const winner = room && room.winnerUid;
    const list = Object.keys(ps).filter((u) => ps[u].paid === true || u === winner);
    list.sort((a, b) => {
      if (a === winner) return -1;
      if (b === winner) return 1;
      return (Number(ps[b].score) || 0) - (Number(ps[a].score) || 0) || (Number(ps[a].falls) || 0) - (Number(ps[b].falls) || 0);
    });
    return list;
  }

  function renderOverlay() {
    if (phase === 'countdown') {
      overlay.hidden = false;
      ovTitle.textContent = 'RACING 🏁';
      ovBig.hidden = false;
      ovBody.textContent = '';
      ovActions.hidden = true;
      const n = Object.keys(playersOf(room)).length;
      ovSub.textContent = botMatch
        ? `${n} người (có Bot) · trận luyện tập: không cược, không thưởng · đích ${fmt(TARGET_DISTANCE)}m`
        : `${n} người · cược ${BET} 💎 · quỹ thưởng ${n * BET} 💎 · đích ${fmt(TARGET_DISTANCE)}m`;
      return;
    }
    if (phase === 'result' && room) {
      overlay.hidden = false;
      ovBig.hidden = true;
      const ps = playersOf(room);
      const winner = room.winnerUid;
      const rank = ranking();
      const myRank = rank.indexOf(me()) + 1;
      const win = winner === me();
      const pot = potOf(room);
      ovTitle.textContent = win ? '🏆 BẠN VỀ NHẤT!' : (myRank > 0 ? `😵 Bạn về hạng ${myRank}` : '🏁 Trận kết thúc');
      const wp = winner ? ps[winner] : null;
      ovSub.textContent = wp
        ? (room.winReason === 'forfeit' ? `${wp.name} thắng do mọi đối thủ đã thoát.` : `${wp.name} chạm đích ${fmt(TARGET_DISTANCE)}m đầu tiên!`)
        : 'Trận đấu đã kết thúc.';
      ovBody.textContent = '';
      const list = el('div', 'rc-rank');
      rank.forEach((uid, i) => {
        const p = ps[uid] || {};
        const row = el('div', 'rc-row' + (uid === me() ? ' is-me' : '') + (uid === winner ? ' is-win' : ''));
        row.appendChild(el('b', '', ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i] || String(i + 1)));
        row.appendChild(el('span', 'rc-nm', (p.name || 'Runner') + (p.online === false ? ' (đã thoát)' : '')));
        const sc = uid === winner ? Math.max(TARGET_DISTANCE, Number(p.score) || 0) : (Number(p.score) || 0);
        row.appendChild(el('small', '', `${fmt(sc)}m${p.falls ? ' · ngã ' + p.falls : ''}`));
        if (uid === winner && !botMatch) row.appendChild(el('strong', '', `+${pot}💎`));
        list.appendChild(row);
      });
      ovBody.appendChild(list);
      if (botMatch) ovBody.appendChild(el('div', 'rc-reward', '🤖 Trận luyện tập với Bot — không cược, không thưởng 💎'));
      else if (win) ovBody.appendChild(el('div', 'rc-reward is-win', `+${pot} 💎 (quỹ ${pot / BET} × ${BET})`));
      else if (myRank > 0) ovBody.appendChild(el('div', 'rc-reward is-lose', `-${BET} 💎 (tiền cược, người thắng nhận ${pot} 💎)`));
      ovActions.hidden = false;
      rematchBtn.hidden = false;
      rematchBtn.textContent = botMatch ? 'ĐUA LẠI VỚI BOT' : (isHost() ? 'ĐUA LẠI (mở ván mới)' : 'VỀ PHÒNG CHỜ');
      exitBtn.hidden = false;
      return;
    }
    overlay.hidden = true;
  }

  // ----- HUD trong trận -----
  function buildMarkers() {
    markers.forEach((m) => m.node.remove());
    markers = [];
    const ps = playersOf(room);
    const uids = Object.keys(ps).sort(byOrder(ps));
    uids.forEach((uid, i) => {
      const p = ps[uid];
      const node = el('div', 'rc-mk ' + (i % 2 ? 'rc-dn' : 'rc-up') + (uid === me() ? ' is-me' : ''));
      node.style.setProperty('--c', SLOT_COLORS[i % SLOT_COLORS.length]);
      node.style.zIndex = uid === me() ? '5' : String(2 + (i % 3));
      const info = GB.characters[p.char] || GB.characters.duy;
      const img = el('img');
      img.alt = '';
      img.src = info.src;
      img.addEventListener('error', () => { img.replaceWith(el('span', 'rc-fallback')); });
      node.appendChild(img);
      const nm = String(uid === me() ? 'BẠN' : (p.name || 'Runner'));
      node.appendChild(el('span', 'rc-mk-name', nm.length > 9 ? nm.slice(0, 8) + '…' : nm));
      lane.appendChild(node);
      markers.push({ uid, node, pos: 0 });
    });
  }

  let headTxt1 = '';
  let headTxt2 = '';
  function updateMinimap(dt) {
    if (!room) return;
    const ps = playersOf(room);
    const k = 1 - Math.exp(-dt * 10);
    let leadUid = null;
    let lead = -1;
    markers.forEach((m) => {
      const p = ps[m.uid];
      const target = m.uid === me() ? Math.max(0, GB.score) : (Number(p && p.score) || 0);
      if (target < m.pos - 1500) m.pos = target;          // vừa té về 0m → "bay" ngay về vạch xuất phát
      else m.pos += (target - m.pos) * k;
      m.node.style.left = clamp(m.pos / TARGET_DISTANCE, 0, 1) * 100 + '%';
      m.node.classList.toggle('is-off', !p || p.online === false);
      if (target > lead) { lead = target; leadUid = m.uid; }
    });
    fillEl.style.width = clamp(lead / TARGET_DISTANCE, 0, 1) * 100 + '%';
    const t1 = `🏁 ${fmt(GB.score)}m / ${fmt(TARGET_DISTANCE)}m · ${botMatch ? '🤖 luyện tập' : '🎁 ' + potOf(room) + '💎'}`;
    const lp = leadUid ? ps[leadUid] : null;
    const t2 = lp ? `${leadUid === me() ? 'BẠN dẫn đầu' : '👑 ' + (lp.name || 'Runner') + ' ' + fmt(lead) + 'm'} · ${MAP_LABEL[GB.currentMap] || ''}` : '';
    if (t1 !== headTxt1) { headTxt1 = t1; mapHead1.textContent = t1; }
    if (t2 !== headTxt2) { headTxt2 = t2; mapHead2.textContent = t2; }
  }

  function flashHit(uid) {
    mapBox.classList.remove('is-flash');
    void mapBox.offsetWidth;
    mapBox.classList.add('is-flash');
    const m = markers.find((x) => x.uid === uid);
    if (m) {
      m.node.classList.remove('is-hit');
      void m.node.offsetWidth;
      m.node.classList.add('is-hit');
      setTimeout(() => m.node.classList.remove('is-hit'), 1000);
    }
  }

  function pushFeed(text) {
    const row = el('div', '', text);
    feedEl.appendChild(row);
    while (feedEl.children.length > 4) feedEl.removeChild(feedEl.firstChild);
    setTimeout(() => row.remove(), 4900);
  }

  function setFinalLap() {
    if (finalLapOn) return;
    finalLapOn = true;
    hud.classList.add('is-final');
    bannerEl.classList.remove('is-show');
    void bannerEl.offsetWidth;
    bannerEl.classList.add('is-show');
    GB.playTone(880, 0.12, 'square', 0.04);
    setTimeout(() => GB.playTone(660, 0.12, 'square', 0.04), 160);
    setTimeout(() => GB.playTone(880, 0.16, 'square', 0.04), 320);
  }

  function onQuitTap() {
    if (phase !== 'racing') return;
    if (quitArmed && Date.now() - quitArmed < 2600) { quitArmed = 0; leaveRoom(); return; }
    quitArmed = Date.now();
    quitBtn.classList.add('is-armed');
    quitBtn.textContent = botMatch ? 'BẤM LẦN NỮA — thoát trận' : 'BẤM LẦN NỮA — mất cược';
    setTimeout(() => {
      if (Date.now() - quitArmed >= 2500) { quitArmed = 0; quitBtn.classList.remove('is-armed'); quitBtn.textContent = '🚪 THOÁT'; }
    }, 2650);
  }

  function showHud(on) {
    hud.hidden = !on;
    if (!on) {
      hud.classList.remove('is-final');
      bannerEl.classList.remove('is-show');
      feedEl.textContent = '';
      quitArmed = 0;
      quitBtn.classList.remove('is-armed');
      quitBtn.textContent = '🚪 THOÁT';
    }
  }

  // =========================================================
  //  PHÒNG: tạo / vào / ghép nhanh / rời
  // =========================================================
  function needCrystals() {
    if (canBet()) return false;
    setMsg(`Cần tối thiểu ${BET} 💎 để cược (hiện có ${fmt(GB.crystals)} 💎).`, 'warn');
    return true;
  }

  async function createRoom(isPublic) {
    if (!db || needCrystals()) return;
    setBusy(true);
    setMsg('Đang tạo phòng...');
    try {
      const seed = newSeed();
      for (let i = 0; i < 8; i++) {
        const id = randomCode(i < 5 ? 5 : 6);                 // mã mời 5 ký tự, trùng nhiều thì tăng lên 6
        const ref = db.ref('racing_rooms/' + id);
        const data = {
          seed, status: 'waiting', hostUid: me(), createdAt: TS(), isPublic: !!isPublic,
          minPlayers: MIN_PLAYERS, maxPlayers: MAX_PLAYERS, players: { [me()]: newPlayer() }
        };
        const res = await ref.transaction((cur) => (cur === null ? data : undefined), undefined, false);
        if (res.committed) { attach(id, ref); return; }
      }
      setMsg('Không tạo được phòng, hãy thử lại.', 'bad');
    } catch (err) {
      console.warn('Lỗi tạo phòng Racing:', err);
      setMsg('Lỗi tạo phòng. Kiểm tra mạng hoặc Rules của Firebase.', 'bad');
    }
    setBusy(false);
  }

  // Trả về true nếu vào được phòng. quiet = true: không báo lỗi (dùng cho Ghép nhanh thử nhiều phòng)
  async function joinById(id, quiet) {
    const ref = db.ref('racing_rooms/' + id);
    try {
      const r = (await ref.once('value')).val();
      if (!r) { if (!quiet) setMsg('❌ Không tìm thấy phòng này.', 'bad'); return false; }
      const res = await ref.transaction((cur) => {
        if (!cur) return cur;                                   // chưa có dữ liệu cục bộ → để server thử lại
        const ps = cur.players || {};
        if (ps[me()]) return cur;
        if (cur.status !== 'waiting') return undefined;
        if (Object.keys(ps).length >= MAX_PLAYERS) return undefined;
        ps[me()] = newPlayer();
        cur.players = ps;
        return cur;
      }, undefined, false);
      const v = res.snapshot && res.snapshot.val();
      const mine = v && v.players && v.players[me()];
      if (res.committed && mine && v.status === 'waiting') { attach(id, ref); return true; }
      if (!quiet) setMsg(v && v.status !== 'waiting' ? '⚠️ Phòng đang thi đấu.' : '⚠️ Phòng đã đầy.', 'warn');
    } catch (err) {
      console.warn('Lỗi vào phòng Racing:', err);
      if (!quiet) setMsg('Lỗi vào phòng. Kiểm tra mạng hoặc Rules của Firebase.', 'bad');
    }
    return false;
  }

  async function joinRoom(rawCode) {
    if (!db || needCrystals()) return;
    const id = String(rawCode || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4,6}$/.test(id)) { setMsg('Mã phòng gồm 4–6 ký tự.', 'bad'); return; }
    setBusy(true);
    setMsg('Đang vào phòng...');
    const ok = await joinById(id, false);
    if (!ok) setBusy(false);
  }

  async function quickMatch() {
    if (!db || needCrystals()) return;
    setBusy(true);
    setMsg('Đang tìm phòng...');
    try {
      const snap = await db.ref('racing_rooms').orderByChild('status').equalTo('waiting').limitToFirst(30).once('value');
      const cands = [];
      snap.forEach((ch) => {
        const r = ch.val();
        if (!r) return;
        const n = r.players ? Object.keys(r.players).length : 0;
        if (n === 0) { ch.ref.remove().catch(() => {}); return; }          // phòng rác không còn ai
        if (!r.isPublic || n >= MAX_PLAYERS) return;
        if (r.createdAt && serverNow() - r.createdAt > STALE_MS) return;
        cands.push({ id: ch.key, n, createdAt: r.createdAt || 0 });
      });
      cands.sort((a, b) => b.n - a.n || a.createdAt - b.createdAt);        // ưu tiên phòng đông nhất
      for (const c of cands) { if (await joinById(c.id, true)) { armBotSearch(); return; } }
      await createRoom(true);                                              // không có phòng trống → tự mở phòng công khai
      if (phase === 'room') armBotSearch();                                // V24.1: 15s vẫn vắng người → ghép Bot NPC
    } catch (err) {
      console.warn('Lỗi ghép phòng nhanh:', err);
      setMsg('Lỗi ghép phòng. Kiểm tra mạng hoặc Rules của Firebase.', 'bad');
      setBusy(false);
    }
  }

  function armDisconnect(mode) {
    const ref = myRef();
    if (!ref) return;
    armedMode = mode;
    ref.onDisconnect().cancel();
    if (mode === 'remove') ref.onDisconnect().remove();           // còn ở phòng chờ: thoát ngang → xóa khỏi phòng
    else ref.onDisconnect().update({ online: false });            // đã vào trận: thoát ngang → đánh dấu offline (giữ chỗ trong bảng xếp hạng)
  }

  function attach(id, ref) {
    roomId = id;
    roomRef = ref;
    room = null;
    phase = 'room';
    startedKey = 0;
    lockStart = false;
    migrating = false;
    seenEvents.clear();
    try { localStorage.setItem(KEY_LAST_ROOM, id); } catch (_) { /* storage may be disabled */ }
    armDisconnect('remove');
    setMsg('');
    showView('room');
    setBusy(false);
    ref.on('value', onRoom, (err) => {
      console.warn('Lỗi đọc phòng Racing:', err);
      GB.showToast('Mất kết nối phòng Racing.');
      leaveRoom();
    });
    evRef = ref.child('events');
    evRef.limitToLast(12).on('child_added', onEvent);
  }

  function detach() {
    clearInterval(countdownTimer);
    countdownTimer = 0;
    clearBotSearch();
    botMatch = false;
    botRemoving = false;
    bots = [];
    raceBeganAt = 0;
    if (roomRef) roomRef.off('value');
    if (evRef) evRef.off('child_added');
    GB.setRacingMode(false);
    window.gameRand = Math.random;
    phase = 'idle';
    room = null;
    roomRef = null;
    evRef = null;
    roomId = null;
    lastResult = null;
    finalLapOn = false;
    finalLapAsked = false;
    claiming = false;
    armedMode = '';
    markers.forEach((m) => m.node.remove());
    markers = [];
    overlay.hidden = true;
    showHud(false);
  }

  async function leaveRoom() {
    if (phase === 'idle') return;
    const ref = roomRef;
    const myId = me();
    const gs = $('gameScreen');
    const inGame = !!gs && gs.classList.contains('is-active');
    detach();
    showView('menu');
    setBusy(false);
    if (inGame) GB.toLobby(false);
    try { localStorage.removeItem(KEY_LAST_ROOM); } catch (_) { /* storage may be disabled */ }
    if (!ref) return;
    try {
      ref.child('players/' + myId).onDisconnect().cancel();
      const r = (await ref.once('value')).val();
      if (!r) return;
      const mine = r.players && r.players[myId];
      if (mine) {
        // Đã cược (trong trận / vừa kết thúc) → giữ chỗ, chỉ đánh dấu offline; chưa cược → xóa hẳn
        if (mine.paid && (r.status === 'racing' || r.status === 'finished')) await ref.child('players/' + myId).update({ online: false });
        else await ref.child('players/' + myId).remove();
      }
      const after = (await ref.child('players').once('value')).val() || {};
      const anyOnline = Object.keys(after).some((u) => after[u] && after[u].online !== false);
      if (!anyOnline) await ref.remove();                                  // không còn ai → xóa phòng rác
    } catch (err) { console.warn('Dọn phòng Racing lỗi:', err); }
  }

  // Dọn phòng cũ còn sót từ lần trước (đóng tab đột ngột)
  function cleanStaleRoom() {
    if (!db) return;
    let last = null;
    try { last = localStorage.getItem(KEY_LAST_ROOM); } catch (_) { return; }
    if (!last) return;
    db.ref('racing_rooms/' + last).once('value').then((snap) => {
      const r = snap.val();
      if (!r) return null;
      const ps = Object.keys(r.players || {}).map((k) => r.players[k]);
      const allOffline = ps.length === 0 || ps.every((p) => p.online === false);
      const old = r.createdAt && serverNow() - r.createdAt > STALE_MS;
      if (allOffline || old) return snap.ref.remove();
      return null;
    }).catch(() => {}).then(() => { try { localStorage.removeItem(KEY_LAST_ROOM); } catch (_) { /* ignore */ } });
  }

  // =========================================================
  //  ĐỒNG BỘ PHÒNG
  // =========================================================
  // Chủ phòng thoát (hoặc mất kết nối) → người chơi kế tiếp (theo thứ tự vào phòng) tự nhận quyền điều phối
  function maybeMigrateHost() {
    const ps = playersOf(room);
    const h = ps[room.hostUid];
    if (h && h.online !== false) return;
    const dead = room.hostUid;
    const cand = Object.keys(ps).filter((u) => u !== dead && ps[u].online !== false).sort(byOrder(ps))[0];
    if (cand !== me() || migrating) return;
    migrating = true;
    roomRef.child('hostUid').transaction((cur) => (cur === dead ? me() : undefined), undefined, false)
      .then((r) => { if (r.committed) GB.showToast('👑 Bạn là chủ phòng mới.'); })
      .catch(() => {})
      .then(() => { migrating = false; });
  }

  function onlineCount() {
    const ps = playersOf(room);
    return Object.keys(ps).filter((u) => ps[u].online !== false).length;
  }

  function hostTryStart() {
    if (!isHost() || room.status !== 'waiting' || lockStart) return;
    const ps = playersOf(room);
    const list = Object.keys(ps).map((u) => ps[u]);
    if (list.length < MIN_PLAYERS || list.length > MAX_PLAYERS) return;
    if (!list.every((p) => p.ready && p.online !== false)) return;
    lockStart = true;
    roomRef.update({ status: 'countdown', startAt: serverNow() + COUNTDOWN_MS, seed: newSeed(), events: null, winnerUid: null, finalLap: null, winReason: null })
      .catch((err) => console.warn('Không bắt đầu đếm ngược Racing:', err))
      .then(() => { lockStart = false; });
  }

  function onRoom(snap) {
    if (botRemoving) return;                                    // V24.1: phòng đang được gỡ để chuyển sang trận Bot
    room = snap.val();
    if (!room) {
      if (phase !== 'idle') { GB.showToast('Phòng Racing đã đóng.'); leaveRoom(); }
      return;
    }
    const ps = playersOf(room);
    if (!ps[me()]) {
      if (phase !== 'idle') { GB.showToast('Bạn không còn trong phòng Racing.'); leaveRoom(); }
      return;
    }
    maybeMigrateHost();

    // Có người thắng → kết thúc trận cho tất cả
    if (phase === 'racing' && (room.winnerUid || room.status === 'finished')) { finishRace(); return; }

    if (phase === 'room') {
      if (room.status === 'waiting' && armedMode !== 'remove') armDisconnect('remove');
      renderRoom();
      hostTryStart();
      if (room.status === 'countdown' && startedKey !== room.startAt) startCountdown();
    } else if (phase === 'countdown') {
      if (room.status === 'waiting') abortCountdown();                       // bị hủy (thiếu người)
      else if (isHost() && room.status === 'countdown' && onlineCount() < MIN_PLAYERS) {
        roomRef.update({ status: 'waiting' }).catch(() => {});
      }
    } else if (phase === 'racing') {
      checkLoneSurvivor();
      checkFinalLap();
    } else if (phase === 'result') {
      if (room.status === 'waiting') backToRoom();
      else renderOverlay();
    }
  }

  function toggleReady() {
    if (!room || phase !== 'room') return;
    if (room.status === 'finished') { if (isHost()) resetRoomToWaiting(); return; }
    if (room.status !== 'waiting') return;
    const mine = playersOf(room)[me()];
    if (!mine.ready && needCrystals()) return;
    setMsg('');
    const fresh = newPlayer();
    myRef().update({ ready: !mine.ready, name: fresh.name, char: fresh.char, cn: fresh.cn, online: true })
      .catch((err) => console.warn('Không đổi trạng thái sẵn sàng:', err));
  }

  function resetRoomToWaiting() {
    if (!isHost() || !room) return;
    const ups = { status: 'waiting', winnerUid: null, finalLap: null, events: null, startAt: null, winReason: null, finishedAt: null, seed: newSeed() };
    const ps = playersOf(room);
    Object.keys(ps).forEach((uid) => {
      if (ps[uid].online === false) { ups['players/' + uid] = null; return; }
      const b = 'players/' + uid + '/';
      ups[b + 'score'] = 0;
      ups[b + 'ready'] = false;
      ups[b + 'paid'] = false;
      ups[b + 'falls'] = 0;
    });
    roomRef.update(ups).catch((err) => console.warn('Không mở ván mới:', err));
  }

  function rematch() {
    if (phase !== 'result' || !room) return;
    if (botMatch) { launchBotMatch(); return; }
    if (isHost() && room.status === 'finished') resetRoomToWaiting();
    backToRoom();
  }

  function backToRoom() {
    if (phase !== 'result' && phase !== 'countdown') return;
    clearInterval(countdownTimer);
    overlay.hidden = true;
    showHud(false);
    const gs = $('gameScreen');
    if (gs && gs.classList.contains('is-active')) GB.toLobby(false);
    phase = 'room';
    startedKey = room ? Number(room.startAt) || 0 : 0;
    showView('room');
    setBusy(false);
    setMsg('');
    if (room && room.status === 'waiting') armDisconnect('remove');
    GB.openModal(modal, $('openRacing'));
    renderRoom();
  }

  // =========================================================
  //  ĐẾM NGƯỢC & BẮT ĐẦU TRẬN
  // =========================================================
  function startCountdown() {
    clearBotSearch();
    startedKey = room.startAt;
    phase = 'countdown';
    lastResult = null;
    finalLapOn = false;
    finalLapAsked = false;
    claiming = false;
    seenEvents.clear();
    ovBig.textContent = '';
    GB.closeModal();                       // phase đã là 'countdown' nên observer sẽ không coi là rời phòng
    renderOverlay();
    clearInterval(countdownTimer);
    const tick = () => {
      if (phase !== 'countdown' || !room) return;
      const remain = Number(room.startAt) - serverNow();
      if (!(remain > 0)) { clearInterval(countdownTimer); beginRace(); return; }
      const n = clamp(Math.ceil(remain / 1000), 1, 3);
      if (ovBig.textContent !== String(n)) { ovBig.textContent = String(n); GB.playTone(n === 1 ? 760 : 520, 0.09, 'square', 0.03); }
    };
    countdownTimer = setInterval(tick, 80);
    tick();
  }

  function abortCountdown() {
    clearInterval(countdownTimer);
    GB.showToast('Trận bị hủy vì thiếu người.');
    backToRoom();
  }

  function beginRace() {
    if (phase !== 'countdown' || !room) return;
    // Trừ cược 5 💎 NGAY khi trận chính thức bắt đầu (chống thoát ngang giữa trận). Trận Bot (luyện tập) không cược.
    if (!botMatch && !GB.spendCrystals(BET)) {
      GB.showToast(`Không đủ ${BET} 💎 để cược — bạn bị loại khỏi trận.`);
      leaveRoom();
      return;
    }
    route = buildRoute(room.seed);
    window.gameRand = mulberry32(room.seed);          // cả phòng cùng seed → cùng địa hình
    GB.setRacingMode(true);
    overlay.hidden = true;
    phase = 'racing';
    sendAcc = 0;
    myFalls = 0;
    lastFallAt = 0;
    claiming = false;
    finalLapOn = false;
    finalLapAsked = false;
    headTxt1 = headTxt2 = '';
    armDisconnect('offline');
    raceBeganAt = Date.now();
    if (botMatch) {
      room.status = 'racing';                                   // trận giả lập: không ghi gì lên Firebase
      bots.forEach((b) => { b.t = 0; b.fallCd = BOT_FALL_GRACE; });
    } else {
      const fresh = newPlayer();
      myRef().update({ paid: true, score: 0, falls: 0, online: true, ready: true, name: fresh.name, char: fresh.char, cn: fresh.cn })
        .catch((err) => console.warn('Không cập nhật trạng thái vào trận:', err));
      roomRef.child('status').transaction((cur) => (cur === 'countdown' ? 'racing' : undefined), undefined, false).catch(() => {});
    }
    buildMarkers();
    showHud(true);
    GB.startGame('score');
    GB.showToast(botMatch ? `🏁 ĐUA với Bot! Chạm ${fmt(TARGET_DISTANCE)}m đầu tiên để về nhất. Chết là về 0m!` : `🏁 ĐUA! Chạm ${fmt(TARGET_DISTANCE)}m đầu tiên để ăn trọn quỹ thưởng. Chết là về 0m!`);
  }

  // =========================================================
  //  TRONG TRẬN
  // =========================================================
  function mapForScore(s) {
    const stage = Math.min(route.length, Math.floor(s / MAP_STEP));
    return stage <= 0 ? 'desert' : route[stage - 1];
  }

  // game.js gọi ở đầu endGame(): trả true = đã xử lý "chết quay về 0m", KHÔNG hiện Game Over
  function onFall(scoreAt) {
    if (phase !== 'racing' || GB.state !== 'running') return false;
    const now = performance.now();
    if (now - lastFallAt < FALL_DEBOUNCE_MS) return true;
    lastFallAt = now;
    myFalls++;
    GB.racingRespawn();
    sendAcc = 0;
    const ref = myRef();
    if (ref) ref.update({ score: 0, falls: myFalls }).catch(() => {});
    if (botMatch && room && room.players && room.players[me()]) {
      room.players[me()].score = 0;
      room.players[me()].falls = myFalls;
      pushFeed(FALL_LINES[hashStr('me' + myFalls) % FALL_LINES.length]('BẠN', fmt(scoreAt)));
      flashHit(me());
    }
    if (evRef) {
      evRef.push({ type: 'fall', uid: me(), name: GB.lbPlayerName(), at: Math.floor(scoreAt) || 0, ts: TS() })
        .catch((err) => console.warn('Không gửi sự kiện té ngã:', err));
    }
    return true;
  }

  function onEvent(snap) {
    const ev = snap.val();
    if (!ev || phase !== 'racing' || seenEvents.has(snap.key) || ev.type !== 'fall') return;
    const startAt = room ? Number(room.startAt) || 0 : 0;
    if (Number(ev.ts) && Number(ev.ts) < startAt - 500) return;              // sự kiện của ván cũ
    seenEvents.add(snap.key);
    const name = ev.uid === me() ? 'BẠN' : (ev.name || 'Runner');
    pushFeed(FALL_LINES[hashStr(snap.key) % FALL_LINES.length](name, fmt(ev.at)));
    flashHit(ev.uid);                                                       // chớp đỏ: có người vừa tụt về 0%
    if (ev.uid !== me()) GB.playTone(180, 0.1, 'triangle', 0.02);
  }

  // Còn 3.000m cuối: ai chạm 22.000m trước thì ghi cờ lên Firebase → cả phòng bật cảnh báo đỏ
  function checkFinalLap() {
    if (!room) return;
    if (botMatch) { setFinalLap(); return; }                    // trận Bot: bật cảnh báo nước rút ngay tại máy
    if (room.finalLap) { setFinalLap(); return; }
    if (finalLapAsked) return;
    const ps = playersOf(room);
    const top = Math.max(GB.state === 'running' ? GB.score : 0, ...Object.keys(ps).map((u) => Number(ps[u].score) || 0));
    if (top >= FINAL_LAP_AT) {
      finalLapAsked = true;
      roomRef.child('finalLap').transaction((cur) => (cur ? undefined : me()), undefined, false).catch(() => {});
    }
  }

  // Chỉ còn 1 người chơi đã cược trong phòng (những người khác thoát hết) → thắng cuộc
  function checkLoneSurvivor() {
    const ps = playersOf(room);
    const paid = Object.keys(ps).filter((u) => ps[u].paid === true);
    if (paid.length < 2) return;
    const live = paid.filter((u) => ps[u].online !== false);
    if (live.length === 1 && live[0] === me()) claimWin('forfeit');
  }

  async function claimWin(reason) {
    if (claiming || phase !== 'racing') return;
    if (botMatch) { claiming = true; botFinish(me(), reason); return; }
    if (!roomRef) return;
    claiming = true;
    try {
      const res = await roomRef.child('winnerUid').transaction((cur) => (cur ? undefined : me()), undefined, false);
      if (res.committed && res.snapshot.val() === me()) {
        roomRef.update({ status: 'finished', finishedAt: TS(), winReason: reason || 'finish' }).catch(() => {});
      }
    } catch (err) {
      console.warn('Không ghi nhận người thắng:', err);
      claiming = false;
    }
  }

  function onUpdate(dt) {
    if (phase !== 'racing' && phase !== 'result') return;
    const go = $('gameOver');
    if (go && !go.hidden) go.hidden = true;           // Racing dùng bảng tổng kết riêng, không dùng bảng "chơi lại" của game

    if (phase !== 'racing') return;
    if (botMatch) simulateBots(dt);
    if (phase !== 'racing') return;                             // Bot vừa về đích → trận đã kết thúc
    if (GB.state === 'running') {
      const s = GB.score;
      GB.racingSetMap(mapForScore(s));                // xoay vòng map mỗi 3.000m theo lộ trình chung của phòng
      sendAcc += dt;
      if (sendAcc >= SEND_INTERVAL) {
        sendAcc = 0;
        const ref = myRef();
        if (ref) ref.child('score').set(Math.floor(s)).catch(() => {});
        else if (botMatch && room.players[me()]) room.players[me()].score = Math.floor(s);
      }
      if (s >= TARGET_DISTANCE) claimWin('finish');
      else if (s >= FINAL_LAP_AT) checkFinalLap();
    }
    updateMinimap(dt);
  }

  // =========================================================
  //  KẾT THÚC TRẬN
  // =========================================================
  function finishRace() {
    if (phase !== 'racing' || !room) return;
    const myScore = Math.floor(GB.score);
    const winner = room.winnerUid || null;
    phase = 'result';
    GB.setRacingMode(false);                           // tắt cờ trước để endGame() chạy bình thường
    window.gameRand = Math.random;
    if (GB.state === 'running') GB.endGame();
    const mine = myRef();
    const finalScore = winner === me() ? Math.max(TARGET_DISTANCE, myScore) : myScore;
    if (mine) mine.update({ score: finalScore }).catch(() => {});
    else if (botMatch && room.players[me()]) room.players[me()].score = finalScore;
    // V24.1: sự kiện 20/11 — "tham gia & hoàn thành 1 trận Racing" (không cần về nhất; phải thực sự đua ≥ 60s)
    if (raceBeganAt && Date.now() - raceBeganAt >= RACE_COMPLETE_MIN_MS) window.LimitedEvent?.onRaceComplete?.();
    if (!botMatch && winner === me() && rewardedKey !== room.startAt) {
      rewardedKey = room.startAt;
      const pot = potOf(room);                         // 100% quỹ = số người thực sự cược × 5 💎
      GB.addReward(pot, 0);
      GB.playUiSound('claim');
    }
    lastResult = { winner, myScore };
    showHud(false);
    renderOverlay();
  }

  // =========================================================
  //  BOT NPC (V24.1) — tìm trận 15s không có người thật → trận giả lập cục bộ
  // =========================================================
  function clearBotSearch() {
    clearTimeout(botSearchTimer);
    clearInterval(botTickTimer);
    botSearchTimer = 0;
    botTickTimer = 0;
    botSearchUntil = 0;
  }

  function armBotSearch() {
    clearBotSearch();
    botSearchUntil = Date.now() + BOT_WAIT_MS;
    botSearchTimer = setTimeout(onBotSearchTimeout, BOT_WAIT_MS);
    botTickTimer = setInterval(() => { if (phase === 'room' && room) renderRoom(); }, 500);   // đồng hồ đếm lùi trong phòng chờ
    if (phase === 'room' && room) renderRoom();
  }

  async function onBotSearchTimeout() {
    botSearchTimer = 0;
    const ref = roomRef;
    if (phase !== 'room' || !room || !ref || botMatch) { clearBotSearch(); return; }
    if (Object.keys(playersOf(room)).some((u) => u !== me())) { clearBotSearch(); return; }   // đã có người thật vào phòng → chơi bình thường
    clearBotSearch();
    let removed = false;
    botRemoving = true;
    try {
      // Gỡ phòng chờ chỉ khi vẫn còn mỗi mình (transaction: nếu có người vừa vào đúng lúc thì hủy việc ghép Bot)
      const res = await ref.transaction((cur) => {
        if (!cur) return cur;
        if (Object.keys(cur.players || {}).some((u) => u !== me())) return undefined;
        return null;
      }, undefined, false);
      removed = !!res.committed;
    } catch (err) {
      console.warn('Không gỡ được phòng chờ Racing, vẫn ghép Bot:', err);
      ref.remove().catch(() => {});
      removed = true;
    }
    if (removed && phase === 'room' && roomRef === ref) {
      startBotMatch();
      botRemoving = false;
      return;
    }
    botRemoving = false;
    if (!removed && phase === 'room' && roomRef === ref) ref.once('value').then(onRoom).catch(() => {});   // có người vào đúng lúc → tiếp tục phòng thường
  }

  function startBotMatch() {
    if (roomRef) {
      roomRef.off('value');
      try { roomRef.child('players/' + me()).onDisconnect().cancel(); } catch (_) { /* ignore */ }
    }
    if (evRef) evRef.off('child_added');
    roomRef = null;
    evRef = null;
    roomId = null;
    armedMode = '';
    try { localStorage.removeItem(KEY_LAST_ROOM); } catch (_) { /* storage may be disabled */ }
    launchBotMatch();
    const names = bots.map((b) => room.players[b.uid].name).join(', ');
    GB.showToast(`🤖 Không có người chơi thật — ghép Bot NPC: ${names}. Vào trận ngay!`);
  }

  function launchBotMatch() {
    botMatch = true;
    const npcs = (GB.lbNpcs || []).slice();
    for (let i = npcs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = npcs[i]; npcs[i] = npcs[j]; npcs[j] = t; }
    while (npcs.length < BOT_COUNT) npcs.push({ id: 'npc_extra_' + npcs.length, name: 'Runner ' + (npcs.length + 1), char: 'duy' });
    const base = serverNow();
    const players = {};
    players[me()] = Object.assign(newPlayer(), { ready: true, paid: true, order: base });
    bots = [];
    npcs.slice(0, BOT_COUNT).forEach((n, i) => {
      const uid = 'bot_' + n.id;
      const info = GB.characters[n.char] || GB.characters.duy;
      players[uid] = { name: n.name, char: n.char, cn: info.name, ready: true, online: true, order: base + i + 1, score: 0, paid: true, falls: 0, bot: true };
      bots.push({ uid, speed: BOT_SPEED_MIN + Math.random() * (BOT_SPEED_MAX - BOT_SPEED_MIN), t: 0, phase: Math.random() * 6.28, fallCd: BOT_FALL_GRACE });
    });
    room = { seed: newSeed(), status: 'countdown', hostUid: me(), startAt: serverNow() + COUNTDOWN_MS, players, winnerUid: null, finalLap: null, local: true };
    rewardedKey = null;
    startCountdown();                                           // dùng lại luồng đếm ngược 3-2-1 → beginRace()
  }

  function simulateBots(dt) {
    if (!room || !room.players) return;
    dt = Math.min(dt, 0.25);
    for (const b of bots) {
      const p = room.players[b.uid];
      if (!p || phase !== 'racing') continue;
      b.t += dt;
      b.fallCd -= dt;
      const v = b.speed * (1 + 0.05 * Math.sin(b.t * 0.7 + b.phase));        // dao động nhẹ để thanh tiến độ trông tự nhiên
      p.score = (Number(p.score) || 0) + v * dt;
      if (p.score >= FINAL_LAP_AT) setFinalLap();
      if (p.score >= TARGET_DISTANCE) { botFinish(b.uid, 'finish'); return; }
      if (b.fallCd <= 0 && p.score > 300 && Math.random() < BOT_FALL_PER_SEC * dt) {
        // Bot vấp ngã: reset về 0m giống luật người chơi thật
        const at = Math.floor(p.score);
        p.score = 0;
        p.falls = (Number(p.falls) || 0) + 1;
        b.fallCd = BOT_FALL_GRACE;
        b.speed = BOT_SPEED_MIN + Math.random() * (BOT_SPEED_MAX - BOT_SPEED_MIN);
        pushFeed(FALL_LINES[hashStr(b.uid + p.falls) % FALL_LINES.length](p.name, fmt(at)));
        flashHit(b.uid);
        GB.playTone(180, 0.1, 'triangle', 0.02);
      }
    }
  }

  function botFinish(uid, reason) {
    if (!botMatch || !room || phase !== 'racing' || room.winnerUid) return;
    room.winnerUid = uid;
    room.status = 'finished';
    room.winReason = reason || 'finish';
    finishRace();
  }

  // ---------- Khởi tạo ----------
  buildUi();
  cleanStaleRoom();
  window.Racing = { onUpdate, onFall, isInMatch };
})();
