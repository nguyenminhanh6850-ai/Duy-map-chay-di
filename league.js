/* =========================================================
   league.js — Giải Đấu Tuần (League) + Nhập Giftcode
   Module độc lập: chỉ giao tiếp với game.js qua window.GameBridge
   và được game.js gọi ngược lại bằng window.League.onRunEnd(score).
   Nhúng SAU game.js trong index.html.
   ========================================================= */
(function () {
  'use strict';

  const GB = window.GameBridge;
  if (!GB) { console.warn('league.js: không thấy window.GameBridge (game.js chưa nạp?)'); return; }

  // ---------- Cấu hình ----------
  const UNLOCK_SCORE = 3000;                       // kỷ lục tối thiểu để mở Giải Đấu
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;         // chu kỳ 7 ngày
  const TOP_N = 15;                                // số hạng hiển thị
  const KEY_CLAIMED = 'duyMapChayDiLeagueClaimed'; // danh sách weekId đã nhận thưởng
  const KEY_USED_CODES = 'duyMapChayDiUsedCodes';  // danh sách giftcode đã dùng

  // Bảng thưởng cuối tuần (đọc từ trên xuống, khớp dòng đầu tiên có rank <= max)
  const REWARD_TIERS = [
    { max: 1,        label: 'Top 1',   crystal: 500, coin: 10000, char: 'duongtao' },
    { max: 2,        label: 'Top 2',   crystal: 300, coin: 7500,  char: 'duongtao' },
    { max: 3,        label: 'Top 3',   crystal: 200, coin: 5000,  char: 'duongtao' },
    { max: 10,       label: 'Top 4–10', crystal: 125, coin: 3500 },
    { max: Infinity, label: 'Top 11+', crystal: 65,  coin: 2000 }
  ];
  const rewardForRank = (rank) => REWARD_TIERS.find((t) => rank <= t.max);

  // Danh sách mã quà tặng có sẵn trong code — muốn thêm mã mới chỉ cần thêm 1 dòng (khóa = chữ thường).
  // V22: ngoài danh sách này, redeemCode() còn đọc thêm giftcodes/{code} trên Firebase ({ crystal, coin, active })
  // nên bạn có thể thêm mã nóng trực tiếp trên Firebase Console mà không cần sửa code.
  const GIFT_CODES = {
    triananh7: { crystal: 75, coin: 700 },
    tannoprime: { crystal: 35, coin: 600 },
     quangvaonghai: {crystal: 50, coin: 700},
     mung2011nghi: {crystal: 75, coin: 1000},
     trongsetv2: {crystal: 50, coin: 500},
     mungthaybang: {crystal: 50, coin: 500}
  };
  const GIFT_FETCH_TIMEOUT = 6000; // chờ tối đa 6 giây khi hỏi Firebase

  // ---------- Tiện ích ----------
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.floor(Number(n) || 0).toLocaleString('vi-VN');
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
  function bindClose(modal) {
    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-close]')) GB.closeModal();
    });
  }
  const isUnlocked = () => GB.best >= UNLOCK_SCORE;

  // ---------- Giờ server & weekId ----------
  let serverOffset = 0;
  let offsetReady = false;
  let offsetWaiters = [];
  if (GB.lbDb) {
    GB.lbDb.ref('.info/serverTimeOffset').on('value', (snap) => {
      serverOffset = Number(snap.val()) || 0;
      offsetReady = true;
      offsetWaiters.splice(0).forEach((fn) => fn());
      refreshClaimState();
    });
  }
  const serverNow = () => Date.now() + serverOffset;
  const currentWeekId = () => Math.floor(serverNow() / WEEK_MS);
  const weekEndsAt = (weekId) => (weekId + 1) * WEEK_MS;
  const weekPath = (weekId) => 'tournaments/week_' + weekId;
  // Chờ tối đa 2 giây để có offset chuẩn trước khi ghi điểm
  function whenOffsetReady() {
    if (offsetReady || !GB.lbDb) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, 2000);
      offsetWaiters.push(() => { clearTimeout(timer); resolve(); });
    });
  }

  // ---------- [PROFILE] Avatar người chơi ----------
  function currentAvatar() {
    let a = 'duy';
    try { a = localStorage.getItem('duyMapChayDiAvatar') || 'duy'; } catch (_) { /* storage may be disabled */ }
    return (GB.characters && GB.characters[a]) ? a : 'duy';
  }
  // Bản ghi cũ chưa có avatar → suy từ tên nhân vật (row.character)
  function avatarKeyOf(row) {
    const chars = GB.characters || {};
    if (row.avatar && chars[row.avatar]) return row.avatar;
    return Object.keys(chars).find((k) => chars[k].name === row.character || GB.charName(k) === row.character) || 'duy';
  }

  // ---------- Ghi điểm khi kết thúc lượt chạy thường ----------
  function onRunEnd(score) {
    if (!GB.lbDb || !isUnlocked()) return;                       // chưa mở khóa: không đẩy điểm
    if (window.Multiplayer && window.Multiplayer.isInMatch && window.Multiplayer.isInMatch()) return; // trận Solo không tính giải tuần
    const value = Math.floor(Number(score));
    if (!Number.isFinite(value) || value <= 0) return;
    whenOffsetReady().then(() => {
      const payload = {
        name: GB.lbPlayerName(),
        score: value,
        character: GB.charName(GB.selectedCharacter),
        avatar: currentAvatar(), // [PROFILE]
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      };
      return GB.lbDb.ref(weekPath(currentWeekId()) + '/' + GB.lbUid)
        .transaction((cur) => (cur && Number(cur.score) >= value ? undefined : payload)); // chỉ ghi đè nếu cao hơn
    }).catch((err) => console.warn('Không đẩy được điểm giải tuần:', err));
  }

  // =========================================================
  //  GIAO DIỆN: tab "Giải Đấu Tuần" trong #leaderboardModal
  // =========================================================
  const lbModal = $('leaderboardModal');
  const lbPanel = lbModal && lbModal.querySelector('.modal-panel');
  const lbNameRow = lbModal && lbModal.querySelector('.lb-name-row');
  const lbStatusEl = $('lbStatus');
  const lbBody = lbModal && lbModal.querySelector('.tab-body');

  let tabGlobal = null;
  let tabLeague = null;
  let globalPane = null;
  let leaguePane = null;
  let timerEl = null;
  let listEl = null;
  let statusEl = null;
  let claimBoxEl = null;
  let myWeekEl = null;
  let lockBoxEl = null;
  let activeTab = 'global';
  let listenRef = null;
  let listenWeek = null;
  let countdownTimer = 0;

  function buildLeagueUi() {
    if (!lbModal || !lbPanel || !lbBody) return;

    // Gom nội dung cũ (nhập tên + trạng thái + danh sách) vào pane "Toàn cầu"
    globalPane = el('div', 'lg-pane');
    globalPane.id = 'lgGlobalPane';
    lbPanel.insertBefore(globalPane, lbNameRow);
    globalPane.appendChild(lbNameRow);
    globalPane.appendChild(lbStatusEl);
    globalPane.appendChild(lbBody);

    // Thanh tab
    const tabs = el('div', 'tabs');
    tabs.setAttribute('role', 'tablist');
    tabGlobal = el('button', 'tab is-selected', '🌍 TOÀN CẦU');
    tabGlobal.type = 'button';
    tabLeague = el('button', 'tab', '🏆 GIẢI ĐẤU TUẦN');
    tabLeague.type = 'button';
    tabs.appendChild(tabGlobal);
    tabs.appendChild(tabLeague);
    lbPanel.insertBefore(tabs, globalPane);

    // Pane giải đấu
    leaguePane = el('div', 'lg-pane');
    leaguePane.id = 'lgLeaguePane';
    leaguePane.hidden = true;

    lockBoxEl = el('div', 'lg-lock');
    leaguePane.appendChild(lockBoxEl);

    timerEl = el('p', 'challenge-timer');
    leaguePane.appendChild(timerEl);

    claimBoxEl = el('div', 'lg-claim');
    claimBoxEl.hidden = true;
    leaguePane.appendChild(claimBoxEl);

    myWeekEl = el('p', 'modal-note');
    leaguePane.appendChild(myWeekEl);

    statusEl = el('p', 'modal-note');
    leaguePane.appendChild(statusEl);

    const body = el('div', 'tab-body');
    listEl = el('div', 'lb-list');
    body.appendChild(listEl);
    leaguePane.appendChild(body);

    const rewardBox = el('div', 'lg-rewards');
    rewardBox.appendChild(el('strong', '', 'CƠ CẤU THƯỞNG CUỐI TUẦN'));
    REWARD_TIERS.forEach((tier) => {
      const row = el('div', 'lg-reward-row');
      row.appendChild(el('span', '', tier.label));
      const rewardCell = el('span', 'px', `💎 ${tier.crystal} · 🪙 ${fmt(tier.coin)}`);
      if (tier.char === 'duongtao') {
        const tag = el('small', '', '+ 😏 Dương Tào (hoàn 💎 100 nếu đã có)');
        tag.style.display = 'block';
        rewardCell.appendChild(tag);
      }
      row.appendChild(rewardCell);
      rewardBox.appendChild(row);
    });
    leaguePane.appendChild(rewardBox);
    lbPanel.appendChild(leaguePane);

    tabGlobal.addEventListener('click', () => selectTab('global'));
    tabLeague.addEventListener('click', () => selectTab('league'));

    // Mở popup bằng nút 🏆 cũ: luôn về tab Toàn cầu rồi cập nhật ổ khóa
    const openBtn = $('openLeaderboard');
    if (openBtn) openBtn.addEventListener('click', () => { selectTab('global'); updateTabLock(); refreshClaimState(); });

    // Đóng popup thì ngắt lắng nghe + dừng đồng hồ
    new MutationObserver(() => { if (lbModal.hidden) stopLeagueListen(); }).observe(lbModal, { attributes: true, attributeFilter: ['hidden'] });
    updateTabLock();
  }

  function updateTabLock() {
    if (!tabLeague) return;
    tabLeague.textContent = isUnlocked() ? '🏆 GIẢI ĐẤU TUẦN' : '🔒 GIẢI ĐẤU TUẦN';
  }

  function selectTab(name) {
    activeTab = name;
    updateTabLock();
    tabGlobal.classList.toggle('is-selected', name === 'global');
    tabLeague.classList.toggle('is-selected', name === 'league');
    globalPane.hidden = name !== 'global';
    leaguePane.hidden = name !== 'league';
    if (name === 'league') openLeagueTab(); else stopLeagueListen();
  }

  function renderLock() {
    lockBoxEl.textContent = '';
    if (isUnlocked()) { lockBoxEl.hidden = true; return; }
    lockBoxEl.hidden = false;
    const have = Math.floor(GB.best);
    const missing = Math.max(0, UNLOCK_SCORE - have);
    lockBoxEl.appendChild(el('strong', '', '🔒 Giải Đấu Tuần chưa mở khóa'));
    lockBoxEl.appendChild(el('span', '', `Cần kỷ lục ${fmt(UNLOCK_SCORE)} điểm. Hiện tại: ${fmt(have)} — còn thiếu ${fmt(missing)}. Điểm chưa được đẩy lên giải.`));
    const bar = el('div', 'lg-bar');
    const fill = el('i');
    fill.style.width = Math.min(100, Math.round((have / UNLOCK_SCORE) * 100)) + '%';
    bar.appendChild(fill);
    lockBoxEl.appendChild(bar);
    GB.showToast(`🔒 Giải Đấu Tuần mở ở ${fmt(UNLOCK_SCORE)} điểm — bạn mới có ${fmt(have)}.`);
  }

  // ----- Đồng hồ đếm ngược reset tuần -----
  function tickCountdown() {
    if (!timerEl) return;
    const remain = Math.max(0, weekEndsAt(currentWeekId()) - serverNow());
    const d = Math.floor(remain / 86400000);
    const h = Math.floor((remain % 86400000) / 3600000);
    const m = Math.floor((remain % 3600000) / 60000);
    const s = Math.floor((remain % 60000) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    timerEl.textContent = `⏳ Reset tuần sau: ${d} ngày ${pad(h)}:${pad(m)}:${pad(s)}`;
    // Sang tuần mới thì nạp lại bảng
    if (listenWeek !== null && listenWeek !== currentWeekId() && activeTab === 'league' && !lbModal.hidden) openLeagueTab();
  }

  function openLeagueTab() {
    renderLock();
    clearInterval(countdownTimer);
    tickCountdown();
    countdownTimer = setInterval(tickCountdown, 1000);
    listEl.textContent = '';
    myWeekEl.textContent = '';
    statusEl.textContent = '';
    refreshClaimState();
    if (!GB.lbDb) { statusEl.textContent = 'Chưa kết nối được Firebase. Kiểm tra mạng rồi mở lại.'; return; }
    whenOffsetReady().then(startLeagueListen);
  }

  function stopLeagueListen() {
    clearInterval(countdownTimer);
    if (listenRef) { listenRef.off(); listenRef = null; }
    listenWeek = null;
  }

  function startLeagueListen() {
    if (activeTab !== 'league' || lbModal.hidden) return;
    if (listenRef) { listenRef.off(); listenRef = null; }
    listenWeek = currentWeekId();
    statusEl.textContent = 'Đang tải bảng xếp hạng tuần...';
    listenRef = GB.lbDb.ref(weekPath(listenWeek)).orderByChild('score').limitToLast(TOP_N);
    listenRef.on('value', (snap) => {
      const rows = [];
      snap.forEach((child) => {
        const v = child.val() || {};
        rows.push({
          id: String(child.key),
          name: String(v.name || 'Runner').slice(0, 16),
          score: Math.floor(Number(v.score)) || 0,
          character: String(v.character || 'Duy'),
          avatar: (GB.characters && GB.characters[v.avatar]) ? v.avatar : '', // [PROFILE]
          at: Number(v.updatedAt) || 0
        });
      });
      rows.sort((a, b) => (b.score - a.score) || (a.at - b.at)); // bằng điểm: ai lập trước xếp trên
      statusEl.textContent = '';
      renderRows(rows);
      const mine = rows.find((r) => r.id === GB.lbUid);
      myWeekEl.textContent = mine ? `Điểm tuần này của bạn: ${fmt(mine.score)}` : (isUnlocked() ? 'Bạn chưa có điểm tuần này (hoặc đang ngoài Top ' + TOP_N + '). Hãy chạy một ván!' : '');
    }, (err) => {
      console.warn('Lỗi đọc giải tuần:', err);
      statusEl.textContent = 'Không tải được giải tuần. Kiểm tra mạng hoặc Rules của Firebase.';
    });
  }

  const MEDALS = ['🥇', '🥈', '🥉'];
  function renderRows(rows) {
    listEl.textContent = '';
    if (!rows.length) { listEl.appendChild(el('p', 'lb-empty', 'Tuần này chưa có ai trên bảng. Hãy lập điểm đầu tiên!')); return; }
    rows.forEach((row, i) => {
      const item = el('div', 'lb-row' + (i < 3 ? ` is-top${i + 1}` : '') + (row.id === GB.lbUid ? ' is-me' : ''));
      item.appendChild(i < 3 ? el('span', 'lb-rank', MEDALS[i]) : el('span', 'lb-rank px', String(i + 1)));
      // [PROFILE] cột Avatar (khớp lưới 4 cột của .lb-row)
      const avBox = el('span', 'lb-avatar');
      const avImg = document.createElement('img');
      avImg.alt = '';
      avImg.src = ((GB.characters && GB.characters[avatarKeyOf(row)]) || GB.characters.duy).src;
      avBox.appendChild(avImg);
      item.appendChild(avBox);
      const info = el('div', 'lb-info');
      info.appendChild(el('strong', '', row.name));
      info.appendChild(el('small', '', row.character));
      item.appendChild(info);
      item.appendChild(el('span', 'lb-score px', fmt(row.score)));
      listEl.appendChild(item);
    });
  }

  // =========================================================
  //  CHỐT THƯỞNG CUỐI TUẦN (Lazy Claim)
  // =========================================================
  let pendingClaim = null;     // { weekId, rank, tier }
  let claimChecking = false;
  let claimFloat = null;
  let claimCheckedWeek = null;

  const claimedList = () => lsGet(KEY_CLAIMED, []);
  function markClaimed(weekId) {
    const list = claimedList();
    if (list.indexOf(weekId) === -1) list.push(weekId);
    lsSet(KEY_CLAIMED, list.slice(-30));
  }

  // Tính hạng của mình ở tuần trước: đếm số người điểm cao hơn (hoặc bằng điểm nhưng lập trước)
  function checkLastWeek() {
    if (!GB.lbDb || claimChecking) return;
    const prevWeek = currentWeekId() - 1;
    if (claimedList().indexOf(prevWeek) !== -1) { pendingClaim = null; renderClaim(); return; }
    if (pendingClaim && pendingClaim.weekId === prevWeek) { renderClaim(); return; }
    claimChecking = true;
    const base = GB.lbDb.ref(weekPath(prevWeek));
    base.child(GB.lbUid).once('value').then((mineSnap) => {
      const mine = mineSnap.val();
      if (!mine || !Number.isFinite(Number(mine.score))) { pendingClaim = null; return null; } // không có hạng
      const myScore = Number(mine.score);
      const myAt = Number(mine.updatedAt) || 0;
      return base.orderByChild('score').startAt(myScore).once('value').then((snap) => {
        let ahead = 0;
        snap.forEach((child) => {
          if (child.key === GB.lbUid) return;
          const v = child.val() || {};
          const s = Number(v.score) || 0;
          if (s > myScore || (s === myScore && (Number(v.updatedAt) || 0) < myAt)) ahead++;
        });
        const rank = ahead + 1;
        pendingClaim = { weekId: prevWeek, rank, tier: rewardForRank(rank) };
      });
    }).catch((err) => { console.warn('Không kiểm tra được thưởng tuần trước:', err); })
      .then(() => { claimChecking = false; claimCheckedWeek = prevWeek; renderClaim(); });
  }

  function refreshClaimState() {
    if (!GB.lbDb || !offsetReady) return;
    if (claimCheckedWeek === currentWeekId() - 1 && !pendingClaim) return; // đã kiểm tra, không có gì để nhận
    checkLastWeek();
  }

  function claimNow() {
    if (!pendingClaim) return;
    const { weekId, rank, tier } = pendingClaim;
    if (claimedList().indexOf(weekId) !== -1) { pendingClaim = null; renderClaim(); return; }
    markClaimed(weekId);
    let crystalAmount = tier.crystal;
    let charNote = '';
    if (tier.char === 'duongtao' && GB.hasCharacter && GB.unlockCharacter) {
      if (GB.hasCharacter('duongtao')) { crystalAmount += 100; charNote = ' · Đã có Dương Tào → hoàn thêm +100 💎'; }
      else if (GB.unlockCharacter('duongtao')) charNote = ' · 😏 MỞ KHÓA NHÂN VẬT DƯƠNG TÀO!';
    }
    GB.addReward(crystalAmount, tier.coin);
    GB.playUiSound && GB.playUiSound('claim');
    GB.showToast(`🎉 Nhận thưởng Giải Tuần (hạng #${rank}): +${crystalAmount} 💎 +${fmt(tier.coin)} 🪙${charNote}`);
    pendingClaim = null;
    renderClaim();
  }

  function renderClaim() {
    if (claimBoxEl) {
      claimBoxEl.textContent = '';
      claimBoxEl.hidden = !pendingClaim;
      if (pendingClaim) {
        const { rank, tier } = pendingClaim;
        claimBoxEl.appendChild(el('strong', '', `🎁 Thưởng tuần trước — Hạng #${rank}`));
        let claimCrystal = tier.crystal;
        let claimNote = '';
        if (tier.char === 'duongtao') {
          if (GB.hasCharacter && GB.hasCharacter('duongtao')) { claimCrystal += 100; claimNote = '  (đã có Dương Tào: hoàn +100 💎)'; }
          else claimNote = '  + 😏 Dương Tào';
        }
        claimBoxEl.appendChild(el('span', 'px', `+${claimCrystal} 💎  +${fmt(tier.coin)} 🪙${claimNote}`));
        const btn = el('button', 'card-btn select', 'NHẬN THƯỞNG');
        btn.type = 'button';
        btn.addEventListener('click', claimNow);
        claimBoxEl.appendChild(btn);
      }
    }
    if (claimFloat) claimFloat.hidden = !pendingClaim;
    const openBtn = $('openLeaderboard');
    if (openBtn) openBtn.classList.toggle('has-claim', !!pendingClaim);
  }

  // Nút nổi ở sảnh khi có thưởng chưa nhận
  function buildClaimFloat() {
    const lobby = $('lobbyScreen');
    if (!lobby) return;
    claimFloat = el('button', 'lg-claim-float', '🎁 NHẬN THƯỞNG GIẢI TUẦN');
    claimFloat.type = 'button';
    claimFloat.hidden = true;
    claimFloat.addEventListener('click', claimNow);
    lobby.appendChild(claimFloat);
  }

  // =========================================================
  //  GIFTCODE
  // =========================================================

  // V22: Giftcode là 1 tab trong popup NEWS (index.html có sẵn #giftPane) — không còn popup riêng.
  let giftInput = null;
  let giftMsg = null;
  let giftBtn = null;
  let giftBusy = false;

  function buildGiftcodeUi() {
    const pane = $('giftPane');
    if (!pane) { console.warn('league.js: không thấy #giftPane trong popup News'); return; }

    pane.appendChild(el('p', 'modal-note', 'Nhập mã quà tặng (không phân biệt chữ hoa/thường). Mỗi mã chỉ dùng được 1 lần.'));

    const row = el('div', 'lb-name-row');
    giftInput = el('input', 'lb-input');
    giftInput.type = 'text';
    giftInput.maxLength = 32;
    giftInput.autocomplete = 'off';
    giftInput.spellcheck = false;
    giftInput.placeholder = 'Nhập mã...';
    giftBtn = el('button', 'card-btn select', 'NHẬN');
    giftBtn.type = 'button';
    row.appendChild(giftInput);
    row.appendChild(giftBtn);
    pane.appendChild(row);

    giftMsg = el('p', 'lg-gift-msg');
    pane.appendChild(giftMsg);

    giftBtn.addEventListener('click', redeemCode);
    giftInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); redeemCode(); } });

    // Chuyển sang tab Giftcode: xoá thông báo cũ rồi đưa con trỏ vào ô nhập
    const tabBtn = $('newsTabGift');
    if (tabBtn) tabBtn.addEventListener('click', () => {
      setGiftMsg('', '');
      setTimeout(() => giftInput.focus({ preventScroll: true }), 50);
    });
  }

  function setGiftMsg(text, kind) {
    giftMsg.textContent = text;
    giftMsg.className = 'lg-gift-msg' + (kind ? ' is-' + kind : '');
  }

  // Đọc giftcodes/{code} trên Firebase (chỉ đọc đúng 1 mã, không liệt kê được toàn bộ danh sách mã)
  function fetchRemoteCode(code) {
    if (!GB.lbDb || !/^[a-z0-9_-]{1,32}$/.test(code)) return Promise.resolve(null);
    const read = GB.lbDb.ref('giftcodes/' + code).once('value').then((snap) => {
      const v = snap.val();
      if (!v || typeof v !== 'object') return null;
      if (v.active === false || v.active === 'false' || v.active === 0) return null; // mã đã tắt
      const crystal = Math.max(0, Math.floor(Number(v.crystal) || 0));
      const coin = Math.max(0, Math.floor(Number(v.coin) || 0));
      return (crystal || coin) ? { crystal, coin } : null;
    });
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), GIFT_FETCH_TIMEOUT));
    return Promise.race([read, timeout]);
  }

  function grantCode(code, reward) {
    const used = lsGet(KEY_USED_CODES, []);
    if (used.indexOf(code) !== -1) { setGiftMsg('⚠️ Bạn đã dùng mã này rồi.', 'warn'); return; }
    used.push(code);
    lsSet(KEY_USED_CODES, used);
    GB.addReward(reward.crystal || 0, reward.coin || 0);
    GB.playUiSound && GB.playUiSound('claim');
    setGiftMsg(`🎉 Nhập mã thành công! +${reward.crystal || 0} 💎 và +${fmt(reward.coin || 0)} 🪙`, 'ok');
    giftInput.value = '';
  }

  function redeemCode() {
    if (giftBusy) return;
    const code = giftInput.value.trim().toLowerCase();
    if (!code) { setGiftMsg('Vui lòng nhập mã.', 'bad'); return; }
    if (lsGet(KEY_USED_CODES, []).indexOf(code) !== -1) { setGiftMsg('⚠️ Bạn đã dùng mã này rồi.', 'warn'); return; }

    // 1) Mã có sẵn trong code: xử lý ngay, không cần mạng
    if (Object.prototype.hasOwnProperty.call(GIFT_CODES, code)) { grantCode(code, GIFT_CODES[code]); return; }

    // 2) Mã nóng trên Firebase: giftcodes/{code} = { crystal, coin, active }
    giftBusy = true;
    giftBtn.disabled = true;
    setGiftMsg('Đang kiểm tra mã...', '');
    fetchRemoteCode(code).then((reward) => {
      if (!reward) { setGiftMsg('❌ Mã không hợp lệ hoặc đã hết hạn. Kiểm tra lại nhé!', 'bad'); GB.playTone && GB.playTone(160, 0.12, 'sawtooth', 0.03); return; }
      grantCode(code, reward);
    }).catch((err) => {
      console.warn('Không kiểm tra được giftcode:', err);
      setGiftMsg('⚠️ Không kiểm tra được mã (lỗi mạng hoặc Rules Firebase). Thử lại sau nhé!', 'warn');
    }).then(() => { giftBusy = false; giftBtn.disabled = false; });
  }

  // ---------- Khởi tạo ----------
  buildLeagueUi();
  buildClaimFloat();
  buildGiftcodeUi();
  renderClaim();
  // Kiểm tra thưởng tuần trước khi mở game (đợi có giờ server)
  whenOffsetReady().then(refreshClaimState);
  // Kỷ lục tăng sau mỗi ván → cập nhật ổ khóa; kiểm tra lại thưởng khi quay về sảnh/tab
  setInterval(() => { updateTabLock(); if (!document.hidden) refreshClaimState(); }, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateTabLock(); refreshClaimState(); } });

  window.League = { onRunEnd, isUnlocked, rewardForRank, currentWeekId };
})();
