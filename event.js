/* =========================================================
   event.js — Sự kiện cộng đồng toàn cầu 3 ngày (V22)
   Cả server cùng chạy tới 67.000 điểm → mở khóa phần thưởng theo mốc.
   Module độc lập: chỉ giao tiếp với game.js qua window.GameBridge
   và được game.js gọi ngược lại bằng window.LimitedEvent.onRunEnd(score).
   Nhúng SAU game.js trong index.html.

   MUỐN SỬA SỰ KIỆN? Chỉ cần sửa khối CONFIG ngay bên dưới.

   V24.1: thêm "Sự kiện 20/11 — Chào mừng Ngày Nhà Giáo Việt Nam" chạy SONG SONG với sự kiện cộng đồng
   (khối EDU bên dưới, dữ liệu lưu localStorage key riêng 'duyMapChayDiEvent2011_...').
   Popup Sự kiện có 2 tab: 🎓 Sự kiện 20/11 (mặc định) và 🌍 Cộng đồng 67K (giữ nguyên toàn bộ logic cũ).

   V25: thêm tab thứ 3 "🔨 Đấu Giá S+" — đấu giá 4 suất Skin S+ "Tân Nika" toàn server (khối AUCTION bên dưới,
   Firebase 'auctions/tan_nika_s_plus_v1', trao thưởng qua GameBridge.unlockTanNika()).

   V26: REWORK sự kiện cộng đồng thành BATTLE PASS "Chiến Dịch Bóng Ma Katana" — 7 ngày, mục tiêu 2.000.000m (thanh kéo dài tới
   3.000.000m "Vượt Ngưỡng"), 8 mốc thưởng, 2 nhánh song song FREE & CAO CẤP (mở khóa bằng 500 Crystal, nhận bù quà các mốc đã đạt).
   Mốc 2.000.000m nhánh Cao Cấp trao Skin S+ giới hạn "Tô Duy Buddha" qua GameBridge.unlockToDuyBuddha().
   ========================================================= */
(function () {
  'use strict';

  const GB = window.GameBridge;
  if (!GB) { console.warn('event.js: không thấy window.GameBridge (game.js chưa nạp?)'); return; }

  // =========================================================
  //  CONFIG — sửa ở đây
  // =========================================================
  const ALL4 = (n) => ({ magnet: n, shield: n, hourglass: n, duration: n });   // n cái của mỗi loại trong 4 vật phẩm
  const CONFIG = {
    // Nhánh dữ liệu trên Firebase Realtime Database (đường dẫn MỚI → bộ đếm toàn server bắt đầu lại từ 0)
    EVENT_PATH: 'events/katana_phantom_campaign_v1',

    // Thời điểm bắt đầu sự kiện:
    //  • null  → tự bắt đầu khi có người đầu tiên mở game (giờ server được ghi vào events/.../startAt;
    //            muốn dời/lên lịch/chạy lại thì sửa hoặc xóa giá trị startAt trên Firebase Console)
    //  • hoặc đặt cứng, ví dụ: '2026-11-27T00:00:00+07:00'  (chuỗi ISO) hay 1790000000000 (ms)
    START_AT: null,

    DURATION_MS: 7 * 24 * 60 * 60 * 1000,  // đúng 7 ngày (tính theo giờ server Firebase — serverNow())
    GOAL: 2000000,                         // mục tiêu CHÍNH THỨC toàn server (m)
    MAX_GOAL: 3000000,                     // thanh tiến độ kéo dài tối đa — đoạn 2M → 3M là "Vượt Ngưỡng" (vàng kim)
    MIN_BEST: 1000,                        // kỷ lục cá nhân tối thiểu để đóng góp & mở khóa sự kiện
    PREMIUM_PRICE: 500,                    // giá mở khóa nhánh Cao Cấp (Crystal)
    TOP_N: 10,                             // số người hiển thị ở Bảng vinh danh

    // 8 mốc thưởng. target: tổng mét toàn server · personal: mét cá nhân tối thiểu phải tự góp (áp dụng cho cả 2 nhánh)
    // reward: { crystal, coin, key, items: { magnet(×2 Coin) | shield | hourglass | duration: n }, skin: 'toduy_buddha' }
    MILESTONES: [
      { target: 10000,   personal: 0,     free: { coin: 2000 },                       premium: { crystal: 15 } },
      { target: 50000,   personal: 0,     free: { items: { magnet: 1, shield: 1 } },   premium: { items: { magnet: 2, shield: 2 } } },
      { target: 100000,  personal: 0,     free: { items: { hourglass: 1, duration: 1 } }, premium: { items: { hourglass: 2, duration: 2 } } },
      { target: 300000,  personal: 3000,  free: { crystal: 50 },                      premium: { crystal: 100 } },
      { target: 500000,  personal: 5000,  free: { coin: 10000 },                      premium: { coin: 20000 } },
      { target: 1000000, personal: 10000, free: { crystal: 150 },                     premium: { items: ALL4(4), key: 3 } },
      { target: 2000000, personal: 20000, free: { crystal: 200 },                     premium: { skin: 'toduy_buddha' } },
      { target: 3000000, personal: 30000, over: true, free: { crystal: 75, coin: 5000 }, premium: { items: ALL4(2) } }
    ]
  };
  const PERSONAL_MAX = Math.max.apply(null, CONFIG.MILESTONES.map((m) => m.personal));

  const KEY_CLAIMED = 'duyMapChayDiEventClaimed_' + CONFIG.EVENT_PATH.replace(/[^a-z0-9]/gi, '_');
  const KEY_PENDING = 'duyMapChayDiEventPending_' + CONFIG.EVENT_PATH.replace(/[^a-z0-9]/gi, '_');
  const KEY_PASS = 'duyMapChayDiEventPass_' + CONFIG.EVENT_PATH.replace(/[^a-z0-9]/gi, '_');   // đã mở khóa nhánh Cao Cấp (localStorage)

  // =========================================================
  //  AUCTION — Đấu giá Skin S+ "Tân Nika" (V25). MUỐN SỬA? Chỉ cần sửa khối này.
  // =========================================================
  const AUCTION = {
    PATH: 'auctions/tan_nika_s_plus_v1',   // nhánh Firebase: startAt · endAt · bids/{uid}
    // null → tự khởi tạo startAt trên Firebase khi có người đầu tiên mở game (giờ server); hoặc đặt cứng ISO / ms.
    START_AT: null,
    DURATION_MS: (2 * 24 * 60 + 23) * 60 * 1000,   // đúng 2 ngày 23 phút = 174.180.000 ms (giờ server Firebase)
    SLOTS: 4,                                      // Top 4 người đặt giá cao nhất
    START_PRICE: 10000,                            // giá khởi điểm (Coin)
    MIN_STEP: 1000,                                // bước giá tối thiểu so với người hạng 4
    SNIPE_MS: 2 * 60 * 1000,                       // chống snipe: lọt Top 4 khi còn < 2 phút...
    SNIPE_EXTEND_MS: 2 * 60 * 1000                 // ...thì cộng thêm 2 phút vào endAt
  };
  const AUC_KEY_SUFFIX = AUCTION.PATH.replace(/[^a-z0-9]/gi, '_');
  const KEY_AUCTION_LOCKED = 'duyMapChayDiAuctionLocked_' + AUC_KEY_SUFFIX;    // Coin người chơi đã nạp vào phiên đấu giá (mặc định 0)
  const KEY_AUCTION_CLAIMED = 'duyMapChayDiAuctionClaimed_' + AUC_KEY_SUFFIX;  // đã nhận skin
  const KEY_AUCTION_NOTICE = 'duyMapChayDiAuctionNotice_' + AUC_KEY_SUFFIX;    // chấm đỏ: vừa bị đẩy khỏi Top 4 & được hoàn Coin

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
        .then(() => {
          const write = (withVip) => base.child('contributors/' + GB.lbUid).transaction((cur) => {
            const row = { name, score: ((cur && Number(cur.score)) || 0) + value, updatedAt: firebase.database.ServerValue.TIMESTAMP };
            if (withVip) row.vip = true;   // 👑 VIP: đã mở khóa nhánh Cao Cấp
            return row;
          });
          return hasPass() ? write(true).catch(() => write(false)) : write(false);   // Rules chưa cho field vip → vẫn ghi điểm bình thường
        })
        .then(() => 'ok');
    });
  }

  function communityRunEnd(score) {
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

  // ---------- Thưởng (2 nhánh FREE / CAO CẤP) ----------
  const ITEM_LABEL = { magnet: '🪙 [×2 Coin]', shield: '🛡️ [Khiên +1 chống chịu]', hourglass: '⌛ [Giảm 15% hồi chiêu]', duration: '🔋 [Tăng 15% duy trì]' };
  const claimedList = () => { const l = lsGet(KEY_CLAIMED, []); return Array.isArray(l) ? l : []; };
  const claimId = (ms, tier) => (tier === 'premium' ? 'p' : 'f') + ms.target;
  const isClaimed = (ms, tier) => claimedList().indexOf(claimId(ms, tier)) !== -1;
  const globalReached = (ms) => total >= ms.target;
  const personalOk = (ms) => !ms.personal || mine >= ms.personal;
  function hasPass() { return lsGet(KEY_PASS, false) === true; }
  const canClaim = (ms, tier) => isUnlocked() && !isClaimed(ms, tier) && globalReached(ms) && personalOk(ms) && (tier !== 'premium' || hasPass());
  const anyClaimable = () => CONFIG.MILESTONES.some((ms) => canClaim(ms, 'free') || canClaim(ms, 'premium'));

  // Danh sách dòng chữ mô tả phần thưởng
  function rewardLines(r) {
    const out = [];
    if (r.skin === 'toduy_buddha') out.push('🥷 SKIN S+ GIỚI HẠN: Tô Duy Buddha');
    if (r.crystal) out.push(`💎 ${fmt(r.crystal)} Crystal`);
    if (r.coin) out.push(`🪙 ${fmt(r.coin)} Coin`);
    if (r.items) Object.keys(r.items).forEach((k) => out.push(`${r.items[k]}x ${ITEM_LABEL[k] || k}`));
    if (r.key) out.push(`🔑 ${r.key}x Key Mini-game`);
    return out;
  }
  // Trao thưởng thật qua GameBridge; trả về chuỗi tóm tắt
  function grantReward(r) {
    const parts = [];
    if (r.crystal || r.coin) {
      GB.addReward(r.crystal || 0, r.coin || 0);
      if (r.crystal) parts.push(`💎 ${fmt(r.crystal)} Crystal`);
      if (r.coin) parts.push(`🪙 ${fmt(r.coin)} Coin`);
    }
    if (r.items) {
      const inv = GB.inventory;
      Object.keys(r.items).forEach((k) => { if (inv && k in inv) inv[k] = (Number(inv[k]) || 0) + r.items[k]; });
      GB.saveMeta && GB.saveMeta();
      GB.updateLobby && GB.updateLobby();
      parts.push(Object.keys(r.items).map((k) => `${r.items[k]}x ${ITEM_LABEL[k] || k}`).join(' + '));
    }
    if (r.key) {
      const res = GB.addKey(r.key);
      parts.push(res.converted > 0 ? `🔑 ${res.added} Key + 💎 ${res.crystalGained} (Key dư quy đổi)` : `🔑 ${res.added} Key Mini-game`);
    }
    if (r.skin === 'toduy_buddha') {
      GB.unlockToDuyBuddha();
      parts.push('🥷 Skin S+ Tô Duy Buddha');
    }
    return parts.join(' · ');
  }

  // quiet = true: không bật toast riêng (dùng khi nhận bù hàng loạt lúc mua Pass). Trả về chuỗi tóm tắt hoặc null nếu không nhận được.
  function claim(ms, tier, quiet) {
    if (!canClaim(ms, tier)) return null;
    const reward = tier === 'premium' ? ms.premium : ms.free;
    if (reward.skin && typeof GB.unlockToDuyBuddha !== 'function') {
      if (!quiet) GB.showToast('Phiên bản game chưa hỗ trợ nhận skin. Hãy cập nhật game.js.');
      return null;
    }
    const list = claimedList();
    list.push(claimId(ms, tier));
    lsSet(KEY_CLAIMED, list);
    const msg = grantReward(reward);
    if (!quiet) {
      GB.playUiSound && GB.playUiSound('claim');
      GB.showToast(reward.skin
        ? '🎉 CHÚC MỪNG! Bạn đã sở hữu Skin S+ “Tô Duy Buddha”! Vào Nhân vật → Tô Duy để mặc skin.'
        : `🎉 Bóng Ma Katana — mốc ${fmt(ms.target)}m (${tier === 'premium' ? 'Cao Cấp' : 'Free'}): ${msg}`);
      refreshAll();
    }
    return msg;
  }

  // ---------- Mở khóa nhánh Cao Cấp (500 Crystal) ----------
  let passConfirmUntil = 0;   // bấm lần 1 → xác nhận trong 4 giây, bấm lần 2 mới trừ Crystal
  function markVip() {
    if (!base || !GB.lbUid) return;
    base.child('contributors/' + GB.lbUid).transaction((cur) => (cur ? Object.assign({}, cur, { vip: true }) : cur))
      .catch((err) => console.warn('Không gắn được huy hiệu VIP:', err));
  }
  function buyPass() {
    if (hasPass()) return;
    if (!isUnlocked()) { GB.showToast(`Cần kỷ lục ≥ ${fmt(CONFIG.MIN_BEST)}m để mở khóa sự kiện.`); return; }
    if (GB.crystals < CONFIG.PREMIUM_PRICE) { GB.showToast(`Chưa đủ Crystal: cần 💎 ${CONFIG.PREMIUM_PRICE} (bạn có ${fmt(GB.crystals)}).`); return; }
    if (Date.now() > passConfirmUntil) { passConfirmUntil = Date.now() + 4000; renderModal(); setTimeout(renderModal, 4100); return; }
    passConfirmUntil = 0;
    if (!GB.spendCrystals(CONFIG.PREMIUM_PRICE)) { GB.showToast('Không đủ Crystal để mở khóa.'); renderModal(); return; }
    lsSet(KEY_PASS, true);
    markVip();
    // Nhận bù toàn bộ quà Cao Cấp của các mốc đã đạt
    let got = 0;
    CONFIG.MILESTONES.forEach((ms) => { if (claim(ms, 'premium', true) !== null) got++; });
    GB.playUiSound && GB.playUiSound('claim');
    GB.showToast(got > 0 ? `👑 Đã mở khóa nhánh CAO CẤP! Nhận bù quà của ${got} mốc đã đạt.` : '👑 Đã mở khóa nhánh CAO CẤP! Quà Cao Cấp nhận được khi đạt từng mốc.');
    refreshAll();
  }

  // =========================================================
  //  SỰ KIỆN 20/11 — CHÀO MỪNG NGÀY NHÀ GIÁO VIỆT NAM (V24.1)
  //  Sự kiện cá nhân 4 ngày: làm nhiệm vụ → nhận 💯 → đổi quà ở Cửa hàng quy đổi.
  //  Dữ liệu lưu cục bộ (localStorage key riêng) nên KHÔNG đụng dữ liệu sự kiện cộng đồng cũ.
  //  MUỐN SỬA? Chỉ cần sửa khối EDU ngay bên dưới.
  // =========================================================
  const EDU = {
    KEY: 'duyMapChayDiEvent2011_state_v1',
    // Thời điểm bắt đầu: chuỗi ISO / ms. Đặt null → tự bắt đầu khi thiết bị này mở game lần đầu sau bản cập nhật.
    START_AT: '2026-11-20T00:00:00+07:00',
    DAYS: 4,
    DAY_MS: 24 * 60 * 60 * 1000,
    MIN_BEST: 1000,                          // kỷ lục tối thiểu để mở khóa sự kiện
    ALLOW_AFTER_END: true,                   // hết 4 ngày: vẫn nhận bù nhiệm vụ đã xong & đổi 💯 còn dư (tiến độ đóng băng)
    ITEM_KEYS: ['shield', 'magnet', 'hourglass', 'duration'],
    // type: run (kỷ lục 1 màn) · total (tích lũy) · shop · murat · skill · race · solo · tien · gacha
    DAY_LIST: [
      { day: 1, title: 'Khởi Động', tasks: [
        { id: 'd1_run5k',    type: 'run',   target: 5000,  reward: 10, text: 'Chạy đạt 5.000m trong một màn chơi thường' },
        { id: 'd1_total30k', type: 'total', target: 30000, reward: 20, text: 'Chạy tích lũy tổng 30.000m qua nhiều màn' },
        { id: 'd1_shop4',    type: 'shop',  target: 4,     reward: 5,  text: 'Mua đủ cả 4 loại vật phẩm hỗ trợ (🛡️ 🧲 ⏳ 🔋, mỗi loại ≥ 1 cái) tại Shop Ông Duy Chan Pa' }
      ] },
      { day: 2, title: 'Bứt Tốc', tasks: [
        { id: 'd2_murat10k', type: 'murat', target: 10000, reward: 25, text: 'Dùng Mu Rát đạt 10.000m trong một màn' },
        { id: 'd2_skill7',   type: 'skill', target: 7,     reward: 10, text: 'Kích hoạt kỹ năng 7 lần trong một trận đấu' },
        { id: 'd2_race',     type: 'race',  target: 1,     reward: 35, text: 'Tham gia và hoàn thành 1 trận Racing (không cần về nhất)' }
      ] },
      { day: 3, title: 'Tri Ân', tasks: [
        { id: 'd3_solo3',    type: 'solo',  target: 3,     reward: 10, text: 'Thắng 3 trận Solo 1v1' },
        { id: 'd3_tien7890', type: 'tien',  target: 7890,  reward: 15, text: 'Dùng Tiến (bản gốc, không mặc skin) đạt 7.890 điểm trong một màn' },
        { id: 'd3_gacha5',   type: 'gacha', target: 5,     reward: 10, text: 'Mở hộp Gacha 5 lần' }
      ] },
      { day: 4, title: 'Tổng Kết & Cày Bù', tasks: [],
        note: 'Hôm nay không có nhiệm vụ mới. Đây là ngày cày bù: hãy hoàn thành nốt các nhiệm vụ Day 1–3 còn thiếu (tiến độ vẫn được tính) rồi đổi quà ở Cửa hàng quy đổi bên dưới!' }
    ],
    SHOP: [
      { id: 'cr150', label: '💎 150 Crystal',   cost: 60, max: 1, give: { crystal: 150 } },
      { id: 'cr100', label: '💎 100 Crystal',   cost: 45, max: 1, give: { crystal: 100 } },
      { id: 'cr50',  label: '💎 50 Crystal',    cost: 25, max: 1, give: { crystal: 50 } },
      { id: 'key1',  label: '🔑 1 Key Mini-game', cost: 15, max: 2, give: { key: 1 } },
      { id: 'coin1k', label: '🪙 1.000 Coin',   cost: 5,  max: 0, give: { coin: 1000 } }   // max 0 = không giới hạn
    ]
  };
  const EDU_TASKS = [].concat(...EDU.DAY_LIST.map((d) => d.tasks.map((t) => Object.assign({ day: d.day }, t))));
  const EDU_FUND = EDU_TASKS.reduce((sum, t) => sum + t.reward, 0);   // tổng quỹ = 140 💯

  function eduLoad() {
    const raw = lsGet(EDU.KEY, null) || {};
    const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
    return {
      progress: obj(raw.progress), claimed: obj(raw.claimed), bought: obj(raw.bought), items: obj(raw.items),
      points: Math.max(0, Math.floor(Number(raw.points)) || 0),
      startSeen: Number(raw.startSeen) || 0
    };
  }
  let edu = eduLoad();
  const eduSave = () => lsSet(EDU.KEY, edu);

  function eduStart() {
    if (EDU.START_AT != null) {
      const v = typeof EDU.START_AT === 'number' ? EDU.START_AT : Date.parse(EDU.START_AT);
      if (Number.isFinite(v)) return v;
    }
    if (!edu.startSeen) { edu.startSeen = serverNow(); eduSave(); }
    return edu.startSeen;
  }
  const eduEnd = () => eduStart() + EDU.DAYS * EDU.DAY_MS;
  // 'pending' | 'active' | 'ended'
  function eduStatus() {
    const now = serverNow();
    if (now < eduStart()) return 'pending';
    if (now >= eduEnd()) return 'ended';
    return 'active';
  }
  const eduDay = () => Math.min(EDU.DAYS, Math.max(1, Math.floor((serverNow() - eduStart()) / EDU.DAY_MS) + 1));
  const eduUnlocked = () => GB.best >= EDU.MIN_BEST;
  const eduProg = (t) => Math.max(0, Number(edu.progress[t.id]) || 0);
  // Tiến độ chỉ tính khi sự kiện đang diễn ra, đã mở khóa và đã tới ngày của nhiệm vụ (ngày cũ vẫn tiếp tục được tính)
  const eduCountable = (t) => eduStatus() === 'active' && eduUnlocked() && t.day <= eduDay();
  const eduClaimable = (t) => !edu.claimed[t.id] && eduProg(t) >= t.target && eduUnlocked() && (EDU.ALLOW_AFTER_END || eduStatus() !== 'ended') && t.day <= eduDay();
  const eduHasClaimable = () => EDU_TASKS.some(eduClaimable);
  const inOtherMode = () => !!((window.Multiplayer && window.Multiplayer.isInMatch && window.Multiplayer.isInMatch()) ||
    (window.Racing && window.Racing.isInMatch && window.Racing.isInMatch()));

  function eduAdvance(type, value, mode) {
    let changed = false;
    EDU_TASKS.forEach((t) => {
      if (t.type !== type || edu.claimed[t.id] || !eduCountable(t)) return;
      const cur = eduProg(t);
      const next = mode === 'add' ? cur + value : Math.max(cur, value);
      if (next !== cur) { edu.progress[t.id] = next; changed = true; }
    });
    if (changed) { eduSave(); refreshAll(); }
  }

  // ----- Hook từ game.js / racing.js / multiplayer.js (đều gọi an toàn qua window.LimitedEvent?.on...?.()) -----
  function eduRunEnd(score, info) {
    if (inOtherMode()) return;                                   // Solo 1v1 & Racing không phải "màn chơi thường"
    const meters = Math.floor(Number(score));
    if (!Number.isFinite(meters) || meters <= 0) return;
    const ctx = info || {};
    const character = ctx.character || GB.selectedCharacter;
    const tienOriginal = ctx.tienOriginal !== undefined ? !!ctx.tienOriginal : !!GB.tienOriginal;
    eduAdvance('run', meters, 'max');
    eduAdvance('total', meters, 'add');
    if (character === 'murat') eduAdvance('murat', meters, 'max');
    if (tienOriginal) eduAdvance('tien', meters, 'max');
    if (Number(ctx.skillCount) > 0) eduAdvance('skill', Number(ctx.skillCount), 'max');
  }
  function onSkillUse(count) { const n = Math.floor(Number(count)); if (n > 0) eduAdvance('skill', n, 'max'); }
  function onShopBuy(key) {
    if (EDU.ITEM_KEYS.indexOf(key) === -1) return;
    const probe = EDU_TASKS.find((t) => t.type === 'shop');
    if (!probe || edu.claimed[probe.id] || !eduCountable(probe)) return;
    if (!edu.items[key]) edu.items[key] = 1;
    eduAdvance('shop', Object.keys(edu.items).length, 'max');
  }
  function onGacha(count) { const n = Math.floor(Number(count)); if (n > 0) eduAdvance('gacha', n, 'add'); }
  function onRaceComplete() { eduAdvance('race', 1, 'max'); }
  function onSoloWin() { eduAdvance('solo', 1, 'add'); }

  // ----- Nhận 💯 & đổi quà -----
  function eduClaim(t) {
    if (!t || !eduClaimable(t)) return;
    edu.claimed[t.id] = true;
    edu.points += t.reward;
    eduSave();
    GB.playUiSound && GB.playUiSound('claim');
    GB.showToast(`🎓 Sự kiện 20/11 — Day ${t.day}: +${t.reward} 💯`);
    refreshAll();
  }
  function eduBuy(item) {
    if (!item || !eduUnlocked()) return;
    if (!EDU.ALLOW_AFTER_END && eduStatus() === 'ended') return;
    const n = Number(edu.bought[item.id]) || 0;
    if (item.max > 0 && n >= item.max) return;
    if (edu.points < item.cost) { GB.showToast(`Chưa đủ 💯: cần ${item.cost} 💯.`); return; }
    edu.points -= item.cost;
    edu.bought[item.id] = n + 1;
    eduSave();                                                   // ghi trước rồi mới phát quà → không thể nhận 2 lần khi tải lại trang
    let msg;
    if (item.give.key) {
      const r = GB.addKey(item.give.key);
      msg = r.converted > 0 ? `🔑 Đã đủ 3/3 Key → quy đổi thành 💎 ${r.crystalGained}` : `🔑 Nhận ${r.added} Key Mini-game`;
    } else if (item.give.crystal) {
      GB.addReward(item.give.crystal, 0);
      msg = `💎 Nhận ${fmt(item.give.crystal)} Crystal`;
    } else {
      GB.addReward(0, item.give.coin);
      msg = `🪙 Nhận ${fmt(item.give.coin)} Coin`;
    }
    GB.playUiSound && GB.playUiSound('claim');
    GB.showToast(`🛒 Đổi quà thành công: ${msg}`);
    refreshAll();
  }

  // =========================================================
  //  ĐẤU GIÁ — LOGIC (Firebase realtime + Coin an toàn)
  // =========================================================
  const abase = db ? db.ref(AUCTION.PATH) : null;
  let aucStartAt = null;       // ms (giờ server)
  let aucEndAt = null;         // ms (giờ server) — có thể bị cộng thêm bởi chống snipe
  let aucStartSeeded = false;
  let aucEndSeeded = false;
  let aucBids = [];            // đã sắp xếp: amount giảm dần, bằng nhau thì updatedAt nhỏ hơn xếp trên
  let aucBusy = false;         // đang ghi giá → tạm hoãn tự hoàn Coin (tránh hoàn nhầm khi dữ liệu chưa kịp về)
  let aucInputTouched = false;
  if (AUCTION.START_AT != null) {
    const parsed = typeof AUCTION.START_AT === 'number' ? AUCTION.START_AT : Date.parse(AUCTION.START_AT);
    if (Number.isFinite(parsed)) aucStartAt = parsed;
  }
  const aucEnd = () => (aucEndAt != null ? aucEndAt : (aucStartAt != null ? aucStartAt + AUCTION.DURATION_MS : null));
  // 'loading' | 'pending' | 'active' | 'ended'
  function aucStatus() {
    if (aucStartAt == null || aucEnd() == null || !offsetReady) return 'loading';
    const now = serverNow();
    if (now < aucStartAt) return 'pending';
    if (now >= aucEnd()) return 'ended';
    return 'active';
  }
  const aucLocked = () => Math.max(0, Math.floor(Number(lsGet(KEY_AUCTION_LOCKED, 0))) || 0);
  const setAucLocked = (v) => lsSet(KEY_AUCTION_LOCKED, Math.max(0, Math.floor(Number(v)) || 0));
  const aucClaimed = () => !!lsGet(KEY_AUCTION_CLAIMED, false) && !!GB.hasTanNika;
  const aucTop = () => aucBids.slice(0, AUCTION.SLOTS);
  const aucRank = (id) => aucBids.findIndex((b) => b.id === (id || GB.lbUid));   // -1 nếu chưa có giá
  const aucInTop = (id) => { const r = aucRank(id); return r >= 0 && r < AUCTION.SLOTS; };
  const aucWinPending = () => aucStatus() === 'ended' && aucInTop() && !aucClaimed();
  const aucAttention = () => aucWinPending() || !!lsGet(KEY_AUCTION_NOTICE, false);
  const aucModalOpen = () => !!(modal && !modal.hidden && activeTab === 'auc');

  function aucSort(rows) {
    const t = (v) => (Number.isFinite(v) ? v : Number.MAX_SAFE_INTEGER);
    return rows.sort((a, b) => (b.amount - a.amount) || (t(a.updatedAt) - t(b.updatedAt)) || (a.id < b.id ? -1 : 1));
  }
  // Giá tối thiểu để vào / giữ chỗ trong Top 4
  function aucMin() {
    const top = aucTop();
    let need = top.length >= AUCTION.SLOTS ? top[AUCTION.SLOTS - 1].amount + AUCTION.MIN_STEP : AUCTION.START_PRICE;
    need = Math.max(need, AUCTION.START_PRICE);
    const r = aucRank();
    if (r >= 0 && r < AUCTION.SLOTS) need = Math.max(need, aucBids[r].amount + AUCTION.MIN_STEP);   // nâng giá phải cao hơn giá hiện tại của chính mình
    return need;
  }

  function aucSeedEnd() {
    if (aucEndSeeded || aucStartAt == null || !abase) return;
    aucEndSeeded = true;
    // Chỉ ghi khi chưa có endAt (transaction → không ghi đè khi nhiều máy cùng mở)
    abase.child('endAt').transaction((cur) => (cur === null ? aucStartAt + AUCTION.DURATION_MS : undefined))
      .catch((err) => console.warn('Không khởi tạo được thời điểm kết thúc đấu giá:', err));
  }

  // Tự hoàn 100% Coin khi rớt khỏi Top 4 (không hoàn trùng: ghi lockedCoin = 0 TRƯỚC khi cộng Coin)
  function aucAutoRefund() {
    if (aucBusy || !abase) return;
    const locked = aucLocked();
    if (locked <= 0 || aucClaimed()) return;
    if (aucInTop()) return;
    setAucLocked(0);
    GB.addReward(0, locked);
    abase.child('bids/' + GB.lbUid).remove().catch((err) => console.warn('Không xóa được giá đặt cũ:', err));
    if (!aucModalOpen()) lsSet(KEY_AUCTION_NOTICE, true);
    GB.showToast('⚠️ Bạn đã bị đẩy khỏi Top 4 Đấu Giá! Hệ thống đã hoàn trả 100% Coin.');
    GB.playUiSound && GB.playUiSound('claim');
  }

  if (abase) {
    if (AUCTION.START_AT == null) {
      abase.child('startAt').on('value', (snap) => {
        const v = Number(snap.val());
        if (Number.isFinite(v) && v > 0) {
          aucStartAt = v;
          aucSeedEnd();
          refreshAll();
        } else if (!aucStartSeeded) {
          // Chưa có thời điểm bắt đầu: người đầu tiên mở game ghi giờ server (1 lần duy nhất nhờ transaction)
          aucStartSeeded = true;
          abase.child('startAt').transaction((cur) => (cur === null ? firebase.database.ServerValue.TIMESTAMP : undefined))
            .catch((err) => console.warn('Không khởi tạo được thời điểm bắt đầu đấu giá:', err));
        }
      }, (err) => console.warn('Không đọc được thời điểm bắt đầu đấu giá:', err));
    } else {
      aucSeedEnd();
    }
    abase.child('endAt').on('value', (snap) => {
      const v = Number(snap.val());
      if (Number.isFinite(v) && v > 0) aucEndAt = v;
      refreshAll();
    }, (err) => console.warn('Không đọc được thời điểm kết thúc đấu giá:', err));
    abase.child('bids').on('value', (snap) => {
      const rows = [];
      snap.forEach((child) => {
        const v = child.val() || {};
        const amount = Math.floor(Number(v.amount)) || 0;
        if (amount > 0) rows.push({ id: String(child.key), name: String(v.name || 'Runner').slice(0, 16), amount, updatedAt: Number(v.updatedAt) });
      });
      aucBids = aucSort(rows);
      aucAutoRefund();
      refreshAll();
    }, (err) => console.warn('Không đọc được danh sách đặt giá:', err));
  }

  function aucPlaceBid(raw) {
    if (!abase) { GB.showToast('Chưa kết nối được Firebase. Kiểm tra mạng rồi thử lại.'); return; }
    if (aucBusy) return;
    if (aucStatus() !== 'active') { GB.showToast('Phiên đấu giá không còn nhận giá.'); return; }
    const newBid = Math.floor(Number(raw));
    if (!Number.isFinite(newBid) || newBid <= 0) { GB.showToast('Hãy nhập số Coin hợp lệ.'); return; }
    const minReq = aucMin();
    if (newBid < minReq) { GB.showToast(`Giá tối thiểu hiện tại: 🪙 ${fmt(minReq)} Coin.`); return; }
    const prevLocked = aucLocked();
    const delta = newBid - prevLocked;                 // chỉ trừ phần chênh lệch so với số Coin đã nạp
    if (delta <= 0) { GB.showToast('Giá mới phải cao hơn số Coin bạn đã đặt.'); return; }
    if (GB.coinBalance < delta) { GB.showToast(`Không đủ Coin: cần thêm 🪙 ${fmt(delta)} (bạn có ${fmt(GB.coinBalance)}).`); return; }
    const uid = GB.lbUid;
    const enters = aucBids.filter((b) => b.id !== uid && b.amount >= newBid).length < AUCTION.SLOTS;   // người đặt trước cùng giá xếp trên
    aucBusy = true;
    GB.coinBalance = GB.coinBalance - delta;
    setAucLocked(newBid);
    GB.saveEconomy && GB.saveEconomy();
    GB.updateLobby && GB.updateLobby();
    refreshAll();
    abase.child('bids/' + uid).transaction((cur) => {
      if (cur && Number(cur.amount) >= newBid) return undefined;   // đã có giá bằng/cao hơn: hủy
      return { name: GB.lbPlayerName(), amount: newBid, updatedAt: firebase.database.ServerValue.TIMESTAMP };
    }).then((res) => {
      if (!res || !res.committed) throw new Error('bid-not-committed');
      // Ghi nhận ngay giá của mình vào danh sách cục bộ (sự kiện realtime có thể về chậm hơn kết quả giao dịch),
      // tránh việc tự hoàn Coin nhầm; sự kiện thật từ Firebase sẽ ghi đè lại ngay sau đó.
      aucBids = aucSort(aucBids.filter((b) => b.id !== uid).concat({ id: uid, name: GB.lbPlayerName().slice(0, 16), amount: newBid, updatedAt: serverNow() }));
      aucBusy = false;
      aucInputTouched = false;
      GB.playUiSound && GB.playUiSound('claim');
      GB.showToast(`🔨 Đặt giá thành công: 🪙 ${fmt(newBid)} Coin.`);
      // Chống snipe phút chót: lọt Top 4 khi còn < 2 phút → cộng thêm 2 phút vào endAt trên Firebase
      if (enters && aucEnd() != null && aucEnd() - serverNow() < AUCTION.SNIPE_MS) {
        abase.child('endAt').transaction((cur) => {
          const e = Number(cur);
          if (!Number.isFinite(e) || e - serverNow() >= AUCTION.SNIPE_MS) return undefined;
          return e + AUCTION.SNIPE_EXTEND_MS;
        }).then((r) => { if (r && r.committed) GB.showToast('⏱️ Chống snipe: cộng thêm 2 phút cho phiên đấu giá!'); })
          .catch((err) => console.warn('Không gia hạn được phiên đấu giá:', err));
      }
      aucAutoRefund();
      refreshAll();
    }).catch((err) => {
      // Giao dịch Firebase thất bại → hoàn lại đúng phần Coin vừa trừ
      console.warn('Đặt giá thất bại:', err);
      aucBusy = false;
      GB.coinBalance = GB.coinBalance + delta;
      setAucLocked(prevLocked);
      GB.saveEconomy && GB.saveEconomy();
      GB.updateLobby && GB.updateLobby();
      GB.showToast('Đặt giá thất bại — đã hoàn lại Coin vừa trừ. Kiểm tra mạng rồi thử lại.');
      refreshAll();
    });
  }

  function aucClaim() {
    if (aucStatus() !== 'ended' || !aucInTop() || aucClaimed()) return;
    if (typeof GB.unlockTanNika !== 'function') { GB.showToast('Phiên bản game chưa hỗ trợ nhận skin. Hãy cập nhật game.js.'); return; }
    GB.unlockTanNika();
    lsSet(KEY_AUCTION_CLAIMED, true);
    GB.playUiSound && GB.playUiSound('claim');
    GB.showToast('🎉 CHÚC MỪNG! Bạn đã sở hữu Skin S+ “Tân Nika”! Vào Nhân vật → Tân để mặc skin.');
    refreshAll();
  }

  // =========================================================
  //  GIAO DIỆN POPUP
  // =========================================================
  let modal = null;
  let timerEl, lockEl, totalNumEl, totalBarEl, mineNumEl, mineBarEl, listEl, topEl, statusEl;
  let comPane, eduPane, tabEduBtn, tabComBtn, tabEduDot, tabComDot, eduTimerEl, eduBodyEl;
  let aucPane, tabAucBtn, tabAucDot, aucTimerEl, aucInfoEl, aucTopEl, aucBidBox, aucInputEl, aucBidBtn, aucMsgEl, aucClaimBtn;
  let passEl, totalFillEl, overFillEl, mineFillEl;
  let activeTab = 'edu';
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
    titleWrap.appendChild(el('p', 'kicker', 'SỰ KIỆN GIỚI HẠN'));
    const h2 = el('h2', '', '🎉 Sự kiện');
    h2.id = 'eventTitle';
    titleWrap.appendChild(h2);
    head.appendChild(titleWrap);
    const closeBtn = el('button', 'close-btn', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('data-close', '');
    closeBtn.setAttribute('aria-label', 'Đóng');
    head.appendChild(closeBtn);
    panel.appendChild(head);

    // V24.1: 2 tab chuyển đổi — mặc định mở 🎓 Sự kiện 20/11
    if (!document.getElementById('eventTabsStyle')) {
      const st = el('style');
      st.id = 'eventTabsStyle';
      st.textContent = `
      .ev-tabs{display:flex;gap:8px;padding:2px 2px 8px}
      .ev-tab{flex:1 1 0;position:relative;border:2px solid rgba(255,255,255,.14);background:rgba(0,0,0,.28);color:var(--muted,#b9c6aa);border-radius:12px;padding:9px 6px;font:700 12px var(--font-ui,"Chakra Petch",system-ui,sans-serif);cursor:pointer}
      .ev-tab.is-on{background:rgba(216,245,139,.14);border-color:var(--lime,#d8f58b);color:#fff}
      .ev-tab-dot{position:absolute;top:-5px;right:-5px;width:11px;height:11px;border-radius:50%;background:var(--danger,#ff5a4f);border:2px solid #0b1a12}
      .ev-tab-dot[hidden]{display:none}
      .ev20-day{margin-top:2px}
      .ev20-day.is-locked{opacity:.62}
      .ev20-sub{margin:2px 0 6px;font-size:11px;font-weight:700;color:var(--muted,#b9c6aa)}
      .ev20-note{margin:4px 0 0;padding:10px 12px;border-radius:12px;background:rgba(255,216,74,.09);border:2px dashed rgba(255,216,74,.4);font-size:12px;font-weight:700;line-height:1.45;color:var(--gold,#ffd84a)}
      .ev20-bar{height:7px;border-radius:5px;background:rgba(0,0,0,.35);overflow:hidden;margin-top:5px}
      .ev20-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#4cc7f5,#ffd84a)}
      .ev20-pts b{font-size:18px}
      .ev-tab{font-size:11px;padding:9px 3px;line-height:1.2}
      .au-prize{display:flex;gap:12px;align-items:center}
      .au-art{flex:0 0 84px;height:112px;border-radius:12px;background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.28),rgba(0,0,0,.35));display:flex;align-items:flex-end;justify-content:center;overflow:hidden;border:2px solid rgba(255,255,255,.25)}
      .au-art img{height:100%;width:auto;object-fit:contain}
      .au-prize-info{display:flex;flex-direction:column;gap:4px;min-width:0}
      .au-prize-info strong{font-size:16px}
      .au-prize-info small{font-size:11px;line-height:1.4;color:var(--muted,#b9c6aa)}
      .au-badge{align-self:flex-start;padding:3px 9px;border-radius:999px;font:900 10px/1.3 system-ui,sans-serif;letter-spacing:.04em;color:#1b1030;border:1px solid rgba(255,255,255,.85);background:linear-gradient(90deg,#ff5f6d,#ffc371,#f9f871,#6bffb8,#5ec8ff,#c58bff,#ff5f6d);background-size:300% 100%;animation:auRainbow 3s linear infinite;box-shadow:0 0 10px rgba(255,255,255,.55)}
      @keyframes auRainbow{to{background-position:300% 0}}
      .au-info{margin:0;font-size:12px;font-weight:700;line-height:1.55}
      .au-info b{color:var(--gold,#ffd84a)}
      .au-row{display:flex;gap:8px;align-items:center;margin-top:8px}
      .au-input{flex:1 1 auto;min-width:0;padding:10px 12px;border-radius:10px;border:2px solid rgba(255,255,255,.2);background:rgba(0,0,0,.35);color:#fff;font:800 16px var(--font-ui,system-ui,sans-serif)}
      .au-chips{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
      .au-chip{padding:6px 10px;border-radius:999px;border:2px solid rgba(255,255,255,.18);background:rgba(0,0,0,.3);color:#fff;font:800 11px var(--font-ui,system-ui,sans-serif);cursor:pointer}
      .au-empty{opacity:.55}
      .au-claim{width:100%;margin-top:6px;padding:12px;font-size:14px}
      .au-claim:not(:disabled){animation:auPulse 1.2s ease-in-out infinite}
      @keyframes auPulse{50%{box-shadow:0 0 18px rgba(255,216,74,.9)}}
      `;
      document.head.appendChild(st);
    }
    if (!document.getElementById('eventPassStyle')) {
      const sp = el('style');
      sp.id = 'eventPassStyle';
      sp.textContent = `
      .bp-box{margin:6px 0;padding:10px 12px 12px;border-radius:14px;background:rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.12)}
      .bp-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font:800 12px var(--font-ui,system-ui,sans-serif)}
      .bp-head b{font-size:14px;text-align:right}
      .bp-bar{position:relative;height:16px;margin:26px 2px 8px;border-radius:9px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.14)}
      .bp-bar.is-me{margin-top:12px}
      .bp-zone{position:absolute;top:0;bottom:0;left:66.6667%;right:0;border-radius:0 9px 9px 0;background:repeating-linear-gradient(45deg,rgba(255,216,74,.2) 0 6px,rgba(255,216,74,.07) 6px 12px)}
      .bp-fill{position:absolute;top:0;bottom:0;left:0;width:0;border-radius:9px 0 0 9px;background:linear-gradient(90deg,#4cc7f5,#d8f58b);transition:width .4s}
      .bp-fill.over{left:66.6667%;border-radius:0 9px 9px 0;background:linear-gradient(90deg,#ffe27a,#ffb300,#fff2b0);box-shadow:0 0 12px rgba(255,216,74,.95)}
      .bp-fill.me{background:linear-gradient(90deg,#ffb347,#ff7b00)}
      .bp-tick{position:absolute;top:-3px;bottom:-3px;width:2px;margin-left:-1px;background:rgba(255,255,255,.5)}
      .bp-goal{position:absolute;top:-8px;bottom:-8px;left:66.6667%;width:4px;margin-left:-2px;border-radius:2px;background:#fff6c4;box-shadow:0 0 10px 3px #ffd84a,0 0 22px 6px rgba(255,216,74,.7);animation:bpGlow 1.4s ease-in-out infinite}
      @keyframes bpGlow{50%{box-shadow:0 0 16px 5px #ffe27a,0 0 30px 10px rgba(255,216,74,.9)}}
      .bp-lab{position:absolute;top:-22px;transform:translateX(-50%);font:900 10px/1 system-ui,sans-serif;color:#ffe27a;white-space:nowrap;text-shadow:0 0 6px #ffb300}
      .bp-pass{display:flex;gap:10px;align-items:center;margin:6px 0;padding:10px 12px;border-radius:14px;border:2px solid rgba(255,216,74,.55);background:linear-gradient(90deg,rgba(255,216,74,.16),rgba(120,70,0,.18))}
      .bp-pass.is-on{border-color:rgba(255,216,74,.9);box-shadow:0 0 14px rgba(255,216,74,.45)}
      .bp-pass-info{flex:1 1 auto;min-width:0;font:700 11px/1.45 var(--font-ui,system-ui,sans-serif)}
      .bp-pass-info strong{display:block;font-size:13px;color:#ffe27a}
      .bp-pass .card-btn{flex:0 0 auto;width:auto;padding:9px 12px}
      .bp-row{margin:8px 0;padding:8px;border-radius:14px;background:rgba(0,0,0,.24);border:2px solid rgba(255,255,255,.1)}
      .bp-row.is-over{border-color:rgba(255,216,74,.6);background:linear-gradient(180deg,rgba(255,216,74,.14),rgba(0,0,0,.24))}
      .bp-row.is-ready{border-color:var(--lime,#d8f58b)}
      .bp-rh{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap}
      .bp-rh strong{font-size:14px}
      .bp-tag{padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.1);font:800 10px/1.4 system-ui,sans-serif}
      .bp-tag.gold{background:linear-gradient(90deg,#ffe27a,#ffb300);color:#3a2300}
      .bp-cols{display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .bp-col{position:relative;display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:10px;border:2px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);min-width:0}
      .bp-col.prem{border-color:rgba(255,216,74,.55);background:linear-gradient(180deg,rgba(255,216,74,.15),rgba(120,70,0,.12))}
      .bp-col.prem.is-locked{filter:saturate(.55) brightness(.9)}
      .bp-lbl{font:900 9px/1 system-ui,sans-serif;letter-spacing:.06em;color:var(--muted,#b9c6aa)}
      .bp-col.prem .bp-lbl{color:#ffd84a}
      .bp-lock{position:absolute;top:5px;right:7px;font-size:14px}
      .bp-rw{flex:1 1 auto;display:flex;flex-direction:column;gap:2px;font:700 11px/1.4 var(--font-ui,system-ui,sans-serif)}
      .bp-col .card-btn{width:100%;padding:8px 4px;font-size:11px}
      .bp-note{margin:6px 0 0;font:700 10px/1.4 system-ui,sans-serif;color:var(--muted,#b9c6aa)}
      .bp-vip{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:999px;font:900 9px/1.5 system-ui,sans-serif;color:#3a2300;background:linear-gradient(90deg,#ffe27a,#ffb300);box-shadow:0 0 8px rgba(255,216,74,.7);vertical-align:middle}
      `;
      document.head.appendChild(sp);
    }
    const tabs = el('div', 'ev-tabs');
    tabs.setAttribute('role', 'tablist');
    tabEduBtn = el('button', 'ev-tab is-on', '🎓 Sự kiện 20/11');
    tabEduBtn.type = 'button';
    tabEduBtn.setAttribute('role', 'tab');
    tabEduDot = el('i', 'ev-tab-dot');
    tabEduDot.hidden = true;
    tabEduBtn.appendChild(tabEduDot);
    tabComBtn = el('button', 'ev-tab', '🥷 Bóng Ma Katana');
    tabComBtn.type = 'button';
    tabComBtn.setAttribute('role', 'tab');
    tabComDot = el('i', 'ev-tab-dot');
    tabComDot.hidden = true;
    tabComBtn.appendChild(tabComDot);
    tabAucBtn = el('button', 'ev-tab', '🔨 Đấu Giá S+');
    tabAucBtn.type = 'button';
    tabAucBtn.setAttribute('role', 'tab');
    tabAucDot = el('i', 'ev-tab-dot');
    tabAucDot.hidden = true;
    tabAucBtn.appendChild(tabAucDot);
    tabs.appendChild(tabEduBtn);
    tabs.appendChild(tabComBtn);
    tabs.appendChild(tabAucBtn);
    tabEduBtn.addEventListener('click', () => setTab('edu'));
    tabComBtn.addEventListener('click', () => setTab('com'));
    tabAucBtn.addEventListener('click', () => setTab('auc'));
    panel.appendChild(tabs);

    // Tab 1 — Sự kiện 20/11
    eduPane = el('div', 'q-pane');
    eduPane.style.display = 'flex';
    eduPane.style.flexDirection = 'column';
    eduPane.style.overflow = 'auto';
    eduPane.style.minHeight = '0';
    eduTimerEl = el('p', 'ev-timer');
    eduPane.appendChild(eduTimerEl);
    eduBodyEl = el('div');
    eduPane.appendChild(eduBodyEl);
    eduPane.addEventListener('click', (event) => {
      const claimBtn = event.target.closest('[data-edu-claim]');
      if (claimBtn && !claimBtn.disabled) { eduClaim(EDU_TASKS.find((t) => t.id === claimBtn.dataset.eduClaim)); return; }
      const buyBtn = event.target.closest('[data-edu-buy]');
      if (buyBtn && !buyBtn.disabled) eduBuy(EDU.SHOP.find((i) => i.id === buyBtn.dataset.eduBuy));
    });
    panel.appendChild(eduPane);

    // Tab 2 — Chiến Dịch Bóng Ma Katana (Battle Pass 7 ngày, V26)
    const body = el('div', 'q-pane');
    comPane = body;
    body.style.display = 'none';
    body.style.flexDirection = 'column';
    body.style.overflow = 'auto';
    body.style.minHeight = '0';

    timerEl = el('p', 'ev-timer');
    body.appendChild(timerEl);
    lockEl = el('div', 'lg-lock ev-lock');
    body.appendChild(lockEl);

    // Tiến độ toàn server: 0 → 2.000.000m (xanh) · 2M → 3M "Vượt Ngưỡng" (vàng kim) · vạch mốc rực sáng tại 2M
    const gBox = el('div', 'bp-box');
    const gHead = el('div', 'bp-head');
    gHead.appendChild(el('span', '', '🥷 TỔNG MÉT TOÀN SERVER'));
    totalNumEl = el('b', 'px');
    gHead.appendChild(totalNumEl);
    gBox.appendChild(gHead);
    totalBarEl = el('div', 'bp-bar');
    totalBarEl.appendChild(el('div', 'bp-zone'));
    totalFillEl = el('i', 'bp-fill');
    totalBarEl.appendChild(totalFillEl);
    overFillEl = el('i', 'bp-fill over');
    totalBarEl.appendChild(overFillEl);
    CONFIG.MILESTONES.forEach((ms) => {
      if (ms.target === CONFIG.GOAL || ms.target >= CONFIG.MAX_GOAL) return;
      const tick = el('span', 'bp-tick');
      tick.style.left = (ms.target / CONFIG.MAX_GOAL) * 100 + '%';
      totalBarEl.appendChild(tick);
    });
    totalBarEl.appendChild(el('span', 'bp-goal'));
    const goalLab = el('span', 'bp-lab', '🎯 2.000.000m');
    goalLab.style.left = (CONFIG.GOAL / CONFIG.MAX_GOAL) * 100 + '%';
    totalBarEl.appendChild(goalLab);
    const overLab = el('span', 'bp-lab', '✨ VƯỢT NGƯỠNG · 3.000.000m');
    overLab.style.left = '100%';
    overLab.style.transform = 'translateX(-100%)';
    overLab.style.top = '20px';
    totalBarEl.appendChild(overLab);
    gBox.appendChild(totalBarEl);
    body.appendChild(gBox);

    // Đóng góp cá nhân
    const pBox = el('div', 'bp-box');
    const pHead = el('div', 'bp-head');
    pHead.appendChild(el('span', '', '🙋 ĐÓNG GÓP CỦA BẠN'));
    mineNumEl = el('b', 'px');
    pHead.appendChild(mineNumEl);
    pBox.appendChild(pHead);
    mineBarEl = el('div', 'bp-bar is-me');
    mineFillEl = el('i', 'bp-fill me');
    mineBarEl.appendChild(mineFillEl);
    CONFIG.MILESTONES.forEach((ms) => {
      if (!ms.personal || ms.personal >= PERSONAL_MAX) return;
      const tick = el('span', 'bp-tick');
      tick.style.left = (ms.personal / PERSONAL_MAX) * 100 + '%';
      mineBarEl.appendChild(tick);
    });
    pBox.appendChild(mineBarEl);
    body.appendChild(pBox);

    // Nhánh Cao Cấp (Premium Pass)
    passEl = el('div', 'bp-pass');
    body.appendChild(passEl);

    // 8 mốc thưởng, mỗi mốc 2 cột song song: FREE | CAO CẤP
    body.appendChild(el('p', 'modal-note', `8 mốc thưởng theo tổng mét toàn server (mốc cuối là Vượt Ngưỡng). Một số mốc yêu cầu bạn tự chạy góp một lượng mét tối thiểu. Điều kiện tham gia: kỷ lục cá nhân ≥ ${fmt(CONFIG.MIN_BEST)}m. Hết 7 ngày vẫn nhận bù thưởng các mốc đã đạt.`));
    listEl = el('div', 'ev-list');
    body.appendChild(listEl);

    // Bảng vinh danh
    body.appendChild(el('p', 'kicker', '🏅 BẢNG VINH DANH TOP ĐÓNG GÓP'));
    topEl = el('div', 'lb-list ev-top');
    body.appendChild(topEl);

    statusEl = el('p', 'ev-status');
    body.appendChild(statusEl);

    panel.appendChild(body);
    buildAuctionPane(panel);
    modal.appendChild(panel);
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target.closest('[data-close]')) GB.closeModal(); });

    comPane.addEventListener('click', (event) => {
      if (event.target.closest('[data-buy-pass]')) { buyPass(); return; }
      const btn = event.target.closest('[data-claim]');
      if (!btn || btn.disabled) return;
      const parts = String(btn.dataset.claim).split(':');   // 'free:50000' | 'premium:50000'
      const ms = CONFIG.MILESTONES.find((m) => String(m.target) === parts[1]);
      if (ms) claim(ms, parts[0] === 'premium' ? 'premium' : 'free');
    });

    const openBtn = $('openEvent');
    if (openBtn) openBtn.addEventListener('click', openEvent);

    // Đóng popup thì ngắt lắng nghe Top + dừng đồng hồ
    new MutationObserver(() => { if (modal.hidden) stopLive(); }).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  }

  function openEvent() {
    GB.openModal(modal, $('openEvent'));
    clearInterval(countdownTimer);
    setTab('edu');                                                   // luôn mở Tab 1 (🎓 Sự kiện 20/11) trước
    countdownTimer = setInterval(() => { if (activeTab === 'edu') renderEduTimer(); else if (activeTab === 'auc') renderAucTimer(); else renderTimer(); }, 1000);
  }

  function setTab(name) {
    activeTab = name === 'com' ? 'com' : (name === 'auc' ? 'auc' : 'edu');
    eduPane.style.display = activeTab === 'edu' ? 'flex' : 'none';
    comPane.style.display = activeTab === 'com' ? 'flex' : 'none';
    aucPane.style.display = activeTab === 'auc' ? 'flex' : 'none';
    tabAucBtn.classList.toggle('is-on', activeTab === 'auc');
    tabAucBtn.setAttribute('aria-selected', String(activeTab === 'auc'));
    if (activeTab === 'auc') { lsSet(KEY_AUCTION_NOTICE, false); aucInputTouched = false; }   // đã xem thông báo hoàn Coin
    tabEduBtn.classList.toggle('is-on', activeTab === 'edu');
    tabComBtn.classList.toggle('is-on', activeTab === 'com');
    tabEduBtn.setAttribute('aria-selected', String(activeTab === 'edu'));
    tabComBtn.setAttribute('aria-selected', String(activeTab === 'com'));
    if (activeTab === 'com') startTopListen();                       // chỉ nghe Bảng vinh danh khi đang xem tab cộng đồng
    else if (topRef) { topRef.off(); topRef = null; }
    renderModal();
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
        rows.push({ id: String(child.key), name: String(v.name || 'Runner').slice(0, 16), score: Math.floor(Number(v.score)) || 0, vip: v.vip === true });
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
    lockEl.appendChild(el('span', '', `Cần kỷ lục ${fmt(CONFIG.MIN_BEST)} m để đóng góp mét chạy và nhận thưởng. Hiện tại: ${fmt(have)} — còn thiếu ${fmt(Math.max(0, CONFIG.MIN_BEST - have))}.`));
    const bar = el('div', 'lg-bar');
    const fill = el('i');
    fill.style.width = Math.min(100, Math.round((have / CONFIG.MIN_BEST) * 100)) + '%';
    bar.appendChild(fill);
    lockEl.appendChild(bar);
  }

  function renderPass() {
    if (!passEl) return;
    passEl.textContent = '';
    const on = hasPass();
    passEl.classList.toggle('is-on', on);
    const info = el('div', 'bp-pass-info');
    if (on) {
      info.appendChild(el('strong', '', '👑 NHÁNH CAO CẤP ĐÃ MỞ KHÓA'));
      info.appendChild(el('span', '', 'Bạn nhận quà gấp đôi / độc quyền ở cột Cao Cấp và có huy hiệu 👑 VIP trên Bảng vinh danh.'));
      passEl.appendChild(info);
      return;
    }
    info.appendChild(el('strong', '', '👑 MỞ KHÓA NHÁNH CAO CẤP'));
    info.appendChild(el('span', '', `Quà gấp đôi + Skin S+ “Tô Duy Buddha” ở mốc 2.000.000m. Mua lúc nào cũng được — nhận bù toàn bộ quà các mốc đã đạt. Bạn có 💎 ${fmt(GB.crystals)}.`));
    passEl.appendChild(info);
    const confirming = Date.now() < passConfirmUntil;
    const btn = el('button', 'card-btn upgrade', confirming ? `XÁC NHẬN · 💎 ${CONFIG.PREMIUM_PRICE}` : `MỞ KHÓA 💎 ${CONFIG.PREMIUM_PRICE}`);
    btn.type = 'button';
    btn.setAttribute('data-buy-pass', '');
    passEl.appendChild(btn);
  }

  function renderBars() {
    totalNumEl.textContent = `${fmt(total)}m / ${fmt(CONFIG.GOAL)}m${total > CONFIG.GOAL ? ' ✨' : ''}`;
    totalFillEl.style.width = (Math.min(total, CONFIG.GOAL) / CONFIG.MAX_GOAL) * 100 + '%';
    overFillEl.style.width = (Math.max(0, Math.min(total, CONFIG.MAX_GOAL) - CONFIG.GOAL) / CONFIG.MAX_GOAL) * 100 + '%';
    mineNumEl.textContent = `${fmt(mine)}m / ${fmt(PERSONAL_MAX)}m`;
    mineFillEl.style.width = Math.min(100, (mine / PERSONAL_MAX) * 100) + '%';
  }

  function renderMilestones() {
    listEl.textContent = '';
    const pass = hasPass();
    CONFIG.MILESTONES.forEach((ms, i) => {
      const reached = globalReached(ms);
      const anyReady = canClaim(ms, 'free') || canClaim(ms, 'premium');
      const row = el('div', 'bp-row' + (ms.over ? ' is-over' : '') + (anyReady ? ' is-ready' : ''));

      const head = el('div', 'bp-rh');
      head.appendChild(el('strong', '', `${i + 1}. ${fmt(ms.target)}m`));
      const tags = el('span');
      if (ms.over) { const g = el('span', 'bp-tag gold', '✨ VƯỢT NGƯỠNG'); tags.appendChild(g); tags.appendChild(document.createTextNode(' ')); }
      tags.appendChild(el('span', 'bp-tag', ms.personal ? `🙋 Cá nhân ≥ ${fmt(ms.personal)}m` : '🙋 Cá nhân: 0m'));
      head.appendChild(tags);
      row.appendChild(head);

      const cols = el('div', 'bp-cols');
      ['free', 'premium'].forEach((tier) => {
        const prem = tier === 'premium';
        const col = el('div', 'bp-col' + (prem ? ' prem' : '') + (prem && !pass ? ' is-locked' : ''));
        col.appendChild(el('span', 'bp-lbl', prem ? 'CAO CẤP' : 'FREE'));
        if (prem && !pass) col.appendChild(el('span', 'bp-lock', '🔒'));
        const rw = el('div', 'bp-rw');
        rewardLines(ms[tier]).forEach((line) => rw.appendChild(el('span', '', line)));
        col.appendChild(rw);

        let btn;
        if (isClaimed(ms, tier)) { btn = el('button', 'card-btn select is-on', '✓ ĐÃ NHẬN'); btn.disabled = true; }
        else if (canClaim(ms, tier)) { btn = el('button', 'card-btn upgrade', 'NHẬN'); btn.setAttribute('data-claim', `${tier}:${ms.target}`); }
        else {
          let why = '🔒 CHƯA ĐẠT';
          if (reached && !personalOk(ms)) why = `🙋 CẦN ${fmt(ms.personal)}m`;
          else if (reached && !isUnlocked()) why = `🔒 KỶ LỤC ${fmt(CONFIG.MIN_BEST)}m`;
          else if (reached && prem && !pass) why = '🔒 CẦN CAO CẤP';
          btn = el('button', 'card-btn upgrade', why);
          btn.disabled = true;
        }
        btn.type = 'button';
        col.appendChild(btn);
        cols.appendChild(col);
      });
      row.appendChild(cols);

      let note;
      if (!reached) note = `Còn thiếu ${fmt(ms.target - total)}m toàn server`;
      else if (!personalOk(ms)) note = `Đã đạt mốc — bạn cần tự góp ≥ ${fmt(ms.personal)}m (hiện có ${fmt(mine)}m)`;
      else note = 'Đã đạt mốc';
      row.appendChild(el('p', 'bp-note', note));
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
      const nameEl = el('strong', '', row.name);
      if (row.vip || (row.id === GB.lbUid && hasPass())) nameEl.appendChild(el('span', 'bp-vip', '👑 VIP'));
      info.appendChild(nameEl);
      info.appendChild(el('small', '', 'Mét đóng góp'));
      item.appendChild(info);
      item.appendChild(el('span', 'lb-score px', fmt(row.score) + 'm'));
      topEl.appendChild(item);
    });
  }

  const cdText = (r) => `${Math.floor(r / 86400000)} ngày ${pad(Math.floor((r % 86400000) / 3600000))}:${pad(Math.floor((r % 3600000) / 60000))}:${pad(Math.floor((r % 60000) / 1000))}`;

  function renderEduTimer() {
    if (!eduTimerEl) return;
    const st = eduStatus();
    eduTimerEl.classList.toggle('is-ended', st === 'ended');
    if (st === 'pending') { eduTimerEl.textContent = `⏳ Sự kiện 20/11 bắt đầu sau: ${cdText(Math.max(0, eduStart() - serverNow()))}`; return; }
    if (st === 'ended') { eduTimerEl.textContent = EDU.ALLOW_AFTER_END ? '🏁 Sự kiện 20/11 đã kết thúc — vẫn nhận bù nhiệm vụ đã xong và đổi quà bằng 💯 còn dư!' : '🏁 Sự kiện 20/11 đã kết thúc.'; return; }
    const r = Math.max(0, eduEnd() - serverNow());
    eduTimerEl.textContent = `⏳ Day ${eduDay()}/${EDU.DAYS} · Kết thúc sau: ${cdText(r)}`;
    if (r === 0) refreshAll();
  }

  function eduDateLabel(day) {
    const d = new Date(eduStart() + (day - 1) * EDU.DAY_MS);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  }

  function renderEdu() {
    renderEduTimer();
    const root = eduBodyEl;
    root.textContent = '';
    const st = eduStatus();
    const cur = eduDay();

    // Khóa theo kỷ lục
    if (!eduUnlocked()) {
      const lock = el('div', 'lg-lock ev-lock');
      const have = Math.floor(GB.best);
      lock.appendChild(el('strong', '', '🔒 Sự kiện chưa mở khóa'));
      lock.appendChild(el('span', '', `Cần kỷ lục ${fmt(EDU.MIN_BEST)} điểm để làm nhiệm vụ và nhận 💯. Hiện tại: ${fmt(have)} — còn thiếu ${fmt(Math.max(0, EDU.MIN_BEST - have))}.`));
      const bar = el('div', 'lg-bar');
      const fill = el('i');
      fill.style.width = Math.min(100, Math.round((have / EDU.MIN_BEST) * 100)) + '%';
      bar.appendChild(fill);
      lock.appendChild(bar);
      root.appendChild(lock);
    }

    // Số dư 💯
    const earned = EDU_TASKS.reduce((sum, t) => sum + (edu.claimed[t.id] ? t.reward : 0), 0);
    const pBox = el('div', 'ev-box ev20-pts');
    const pHead = el('div', 'ev-box-head');
    pHead.appendChild(el('span', '', '💯 ĐIỂM SỰ KIỆN CỦA BẠN'));
    pHead.appendChild(el('b', 'px', fmt(edu.points)));
    pBox.appendChild(pHead);
    pBox.appendChild(el('p', 'ev20-sub', `Đã nhận ${fmt(earned)} / ${fmt(EDU_FUND)} 💯 từ nhiệm vụ · Nhiệm vụ các ngày trước vẫn được tính tiến độ khi sang ngày mới.`));
    root.appendChild(pBox);

    // Nhiệm vụ theo ngày
    EDU.DAY_LIST.forEach((d) => {
      const dayLocked = st === 'pending' || d.day > cur;
      const dayFund = d.tasks.reduce((sum, t) => sum + t.reward, 0);
      const box = el('div', 'ev-box ev20-day' + (dayLocked ? ' is-locked' : ''));
      const head = el('div', 'ev-box-head');
      head.appendChild(el('span', '', `DAY ${d.day} · ${d.title.toUpperCase()}`));
      head.appendChild(el('b', 'px', `${dayFund} 💯`));
      box.appendChild(head);
      box.appendChild(el('p', 'ev20-sub', dayLocked ? `🔒 Mở vào ngày ${eduDateLabel(d.day)}` : (d.day === cur && st === 'active' ? `Đang diễn ra · ngày ${eduDateLabel(d.day)}` : `Đã mở · ngày ${eduDateLabel(d.day)}`)));
      if (d.note) box.appendChild(el('p', 'ev20-note', '🔁 ' + d.note));
      d.tasks.forEach((tk, i) => {
        const t = EDU_TASKS.find((x) => x.id === tk.id);
        const claimed = !!edu.claimed[t.id];
        const ready = eduClaimable(t);
        const prog = eduProg(t);
        const row = el('div', 'ev-ms' + (ready ? ' is-ready' : '') + (claimed ? ' is-claimed' : ''));
        row.appendChild(el('span', 'ev-ms-no px', String(i + 1)));
        const info = el('div');
        info.appendChild(el('strong', '', `${t.text} → +${t.reward} 💯`));
        let note;
        if (claimed) note = 'Đã nhận';
        else if (dayLocked) note = 'Chưa mở — chưa tính tiến độ';
        else if (prog >= t.target) note = 'Hoàn thành — nhận thưởng ngay!';
        else note = `Tiến độ: ${fmt(Math.min(prog, t.target))} / ${fmt(t.target)}`;
        info.appendChild(el('small', '', note));
        const bar = el('div', 'ev20-bar');
        const fill = el('i');
        fill.style.width = (claimed ? 100 : Math.min(100, (prog / t.target) * 100)) + '%';
        bar.appendChild(fill);
        info.appendChild(bar);
        row.appendChild(info);
        let btn;
        if (claimed) { btn = el('button', 'card-btn select is-on', '✓ ĐÃ NHẬN'); btn.disabled = true; }
        else if (ready) { btn = el('button', 'card-btn upgrade', `NHẬN +${t.reward}💯`); btn.setAttribute('data-edu-claim', t.id); }
        else { btn = el('button', 'card-btn upgrade', dayLocked ? '🔒 CHƯA MỞ' : '🔒 CHƯA ĐỦ'); btn.disabled = true; }
        btn.type = 'button';
        row.appendChild(btn);
        box.appendChild(row);
      });
      root.appendChild(box);
    });

    // Cửa hàng quy đổi
    const sBox = el('div', 'ev-box');
    const sHead = el('div', 'ev-box-head');
    sHead.appendChild(el('span', '', '🛒 CỬA HÀNG QUY ĐỔI'));
    sHead.appendChild(el('b', 'px', `${fmt(edu.points)} 💯`));
    sBox.appendChild(sHead);
    EDU.SHOP.forEach((item, i) => {
      const n = Number(edu.bought[item.id]) || 0;
      const soldOut = item.max > 0 && n >= item.max;
      const poor = edu.points < item.cost;
      const closed = !eduUnlocked() || (!EDU.ALLOW_AFTER_END && st === 'ended');
      const row = el('div', 'ev-ms' + (soldOut ? ' is-claimed' : (!poor && !closed ? ' is-ready' : '')));
      row.appendChild(el('span', 'ev-ms-no px', String(i + 1)));
      const info = el('div');
      info.appendChild(el('strong', '', `${item.label} — ${item.cost} 💯`));
      info.appendChild(el('small', '', item.max > 0 ? `Đã đổi ${n}/${item.max}` : `Không giới hạn · đã đổi ${n} lần`));
      row.appendChild(info);
      let btn;
      if (soldOut) { btn = el('button', 'card-btn select is-on', '✓ ĐÃ ĐỔI'); btn.disabled = true; }
      else if (closed) { btn = el('button', 'card-btn upgrade', '🔒 CHƯA MỞ'); btn.disabled = true; }
      else if (poor) { btn = el('button', 'card-btn upgrade', `THIẾU ${item.cost - edu.points}💯`); btn.disabled = true; }
      else { btn = el('button', 'card-btn upgrade', `ĐỔI ${item.cost}💯`); btn.setAttribute('data-edu-buy', item.id); }
      btn.type = 'button';
      row.appendChild(btn);
      sBox.appendChild(row);
    });
    root.appendChild(sBox);
  }

  // ---------- Tab 3 — 🔨 Đấu Giá S+ ----------
  function buildAuctionPane(panel) {
    aucPane = el('div', 'q-pane');
    aucPane.style.display = 'none';
    aucPane.style.flexDirection = 'column';
    aucPane.style.overflow = 'auto';
    aucPane.style.minHeight = '0';
    aucTimerEl = el('p', 'ev-timer');
    aucPane.appendChild(aucTimerEl);

    const prize = el('div', 'ev-box au-prize');
    const art = el('div', 'au-art');
    const img = el('img');
    img.src = 'assets/tan-nika.png';
    img.alt = 'Skin Tân Nika';
    art.appendChild(img);
    prize.appendChild(art);
    const pInfo = el('div', 'au-prize-info');
    pInfo.appendChild(el('span', 'au-badge', 'SKIN S+ LIMITED'));
    pInfo.appendChild(el('strong', '', 'Tân Nika'));
    pInfo.appendChild(el('small', '', 'Chỉ 4 suất toàn server. Gắn trực tiếp vào nhân vật Tân: hồi chiêu 46s/42s, duy trì 24s/27s, Hóa Thân Nika miễn nhiễm va chạm, ép bẹp vật cản đổi Coin, nội tại ẩn “Thức Tỉnh Nhịp Trống” và nhạc nền độc quyền.'));
    prize.appendChild(pInfo);
    aucPane.appendChild(prize);

    aucPane.appendChild(el('p', 'modal-note', `Top ${AUCTION.SLOTS} người đặt giá cao nhất khi hết giờ nhận Skin. Giá khởi điểm 🪙 ${fmt(AUCTION.START_PRICE)}, mỗi lần nâng tối thiểu +${fmt(AUCTION.MIN_STEP)} so với người hạng ${AUCTION.SLOTS}. Coin bị trừ ngay khi đặt giá và hoàn 100% nếu bạn bị đẩy khỏi Top ${AUCTION.SLOTS}. Lọt Top ${AUCTION.SLOTS} khi còn dưới 2 phút sẽ cộng thêm 2 phút.`));

    const infoBox = el('div', 'ev-box');
    aucInfoEl = el('p', 'au-info');
    infoBox.appendChild(aucInfoEl);
    aucPane.appendChild(infoBox);

    aucPane.appendChild(el('p', 'kicker', `🏆 TOP ${AUCTION.SLOTS} ĐẤU GIÁ`));
    aucTopEl = el('div', 'lb-list ev-top');
    aucPane.appendChild(aucTopEl);

    aucBidBox = el('div', 'ev-box');
    const row = el('div', 'au-row');
    aucInputEl = el('input', 'au-input');
    aucInputEl.type = 'number';
    aucInputEl.inputMode = 'numeric';
    aucInputEl.step = String(AUCTION.MIN_STEP);
    aucInputEl.setAttribute('aria-label', 'Số Coin đặt giá');
    aucInputEl.addEventListener('input', () => { aucInputTouched = true; });
    aucInputEl.addEventListener('keydown', (event) => { if (event.key === 'Enter') aucPlaceBid(aucInputEl.value); });
    row.appendChild(aucInputEl);
    aucBidBtn = el('button', 'card-btn upgrade', '🔨 ĐẶT GIÁ');
    aucBidBtn.type = 'button';
    aucBidBtn.addEventListener('click', () => aucPlaceBid(aucInputEl.value));
    row.appendChild(aucBidBtn);
    aucBidBox.appendChild(row);
    const chips = el('div', 'au-chips');
    [['MIN', 0], ['+1.000', 1000], ['+5.000', 5000], ['+10.000', 10000]].forEach(([label, add]) => {
      const chip = el('button', 'au-chip', label);
      chip.type = 'button';
      chip.addEventListener('click', () => {
        const cur = Math.floor(Number(aucInputEl.value)) || 0;
        aucInputEl.value = String(add === 0 ? aucMin() : Math.max(cur, aucMin()) + add);
        aucInputTouched = true;
      });
      chips.appendChild(chip);
    });
    aucBidBox.appendChild(chips);
    aucPane.appendChild(aucBidBox);

    aucMsgEl = el('p', 'modal-note');
    aucPane.appendChild(aucMsgEl);
    aucClaimBtn = el('button', 'card-btn upgrade au-claim', '🎉 NHẬN SKIN TÂN NIKA S+');
    aucClaimBtn.type = 'button';
    aucClaimBtn.hidden = true;
    aucClaimBtn.addEventListener('click', aucClaim);
    aucPane.appendChild(aucClaimBtn);
    panel.appendChild(aucPane);
  }

  function renderAucTimer() {
    if (!aucTimerEl) return;
    const st = aucStatus();
    aucTimerEl.classList.toggle('is-ended', st === 'ended');
    if (st === 'loading') { aucTimerEl.textContent = '⏳ Đang đồng bộ giờ đấu giá...'; return; }
    if (st === 'pending') { aucTimerEl.textContent = `⏳ Đấu giá bắt đầu sau: ${cdText(Math.max(0, aucStartAt - serverNow()))}`; return; }
    if (st === 'ended') { aucTimerEl.textContent = '🏁 Phiên đấu giá đã kết thúc.'; return; }
    const r = Math.max(0, aucEnd() - serverNow());
    aucTimerEl.textContent = `⏳ Đấu giá kết thúc sau: ${cdText(r)}`;
    if (r === 0) refreshAll();
  }

  function renderAuction() {
    if (!aucPane) return;
    renderAucTimer();
    const st = aucStatus();
    const rank = aucRank();
    const inTop = rank >= 0 && rank < AUCTION.SLOTS;
    const min = aucMin();
    const locked = aucLocked();
    const top = aucTop();

    // Thông tin giá
    aucInfoEl.textContent = '';
    const addLine = (label, value) => {
      const line = el('div');
      line.appendChild(document.createTextNode(label + ' '));
      line.appendChild(el('b', '', value));
      aucInfoEl.appendChild(line);
    };
    addLine('Giá tối thiểu để vào Top ' + AUCTION.SLOTS + ':', `🪙 ${fmt(min)}`);
    addLine('Giá bạn đang đặt:', locked > 0 ? `🪙 ${fmt(locked)}${inTop ? ` · hạng #${rank + 1}` : ''}` : 'chưa đặt');
    addLine('Số dư Coin:', `🪙 ${fmt(GB.coinBalance)}`);

    // Top 4
    aucTopEl.textContent = '';
    const medals = ['🥇', '🥈', '🥉'];
    for (let i = 0; i < AUCTION.SLOTS; i++) {
      const b = top[i];
      const item = el('div', 'lb-row' + (i < 3 ? ` is-top${i + 1}` : '') + (b && b.id === GB.lbUid ? ' is-me' : '') + (b ? '' : ' au-empty'));
      item.appendChild(i < 3 ? el('span', 'lb-rank', medals[i]) : el('span', 'lb-rank px', String(i + 1)));
      const info = el('div', 'lb-info');
      info.appendChild(el('strong', '', b ? b.name : 'Còn trống'));
      info.appendChild(el('small', '', b ? 'Giá đặt' : `Từ 🪙 ${fmt(AUCTION.START_PRICE)}`));
      item.appendChild(info);
      item.appendChild(el('span', 'lb-score px', b ? `🪙 ${fmt(b.amount)}` : '—'));
      aucTopEl.appendChild(item);
    }

    // Ô đặt giá
    const canBid = st === 'active';
    aucBidBox.hidden = !canBid;
    aucBidBtn.textContent = inTop ? '🔨 NÂNG GIÁ' : '🔨 ĐẶT GIÁ';
    aucBidBtn.disabled = aucBusy;
    aucInputEl.min = String(min);
    if (!aucInputTouched || !aucInputEl.value) aucInputEl.value = String(min);

    // Thông báo + nhận thưởng
    let msg = '';
    if (!abase) msg = 'Chưa kết nối được Firebase. Kiểm tra mạng rồi mở lại.';
    else if (st === 'loading') msg = 'Đang đồng bộ dữ liệu đấu giá...';
    else if (st === 'pending') msg = 'Phiên đấu giá chưa bắt đầu.';
    else if (st === 'active') msg = inTop ? `Bạn đang nằm trong Top ${AUCTION.SLOTS}. Hãy nâng giá để giữ chỗ nếu bị vượt!` : 'Đặt giá để giành 1 trong 4 suất Skin S+ Tân Nika.';
    else if (inTop) msg = aucClaimed() ? '✅ Bạn đã nhận Skin Tân Nika.' : `🎉 Bạn thuộc Top ${AUCTION.SLOTS}! Nhận Skin ngay bên dưới.`;
    else msg = `Phiên đấu giá đã kết thúc. Bạn không nằm trong Top ${AUCTION.SLOTS}.`;
    aucMsgEl.textContent = msg;
    const showClaim = st === 'ended' && inTop;
    aucClaimBtn.hidden = !showClaim;
    if (showClaim) {
      const done = aucClaimed();
      aucClaimBtn.disabled = done;
      aucClaimBtn.textContent = done ? '✓ ĐÃ NHẬN SKIN TÂN NIKA' : '🎉 NHẬN SKIN TÂN NIKA S+';
    }
  }

  function renderTabDots() {
    if (tabEduDot) tabEduDot.hidden = !eduHasClaimable();
    if (tabComDot) tabComDot.hidden = !anyClaimable();
    if (tabAucDot) tabAucDot.hidden = !aucAttention();
  }

  function renderModal() {
    if (!modal || modal.hidden) return;
    renderTabDots();
    if (activeTab === 'edu') { renderEdu(); return; }
    if (activeTab === 'auc') { renderAuction(); return; }
    renderTimer();
    renderLock();
    renderBars();
    renderPass();
    renderMilestones();
    renderTop();
  }

  // ---------- Nút ngoài sảnh: ổ khóa + chấm đỏ báo nhận thưởng ----------
  function renderButton() {
    const dot = $('eventDot');
    const lock = $('eventLock');
    const btn = $('openEvent');
    const unlocked = isUnlocked();   // cả 2 sự kiện cùng mở khóa ở kỷ lục 1.000m (EDU.MIN_BEST = CONFIG.MIN_BEST)
    if (lock) lock.hidden = unlocked;
    if (btn) btn.classList.toggle('is-locked', !unlocked);
    if (dot) dot.hidden = !(anyClaimable() || eduHasClaimable() || aucAttention());   // V24.1: sáng khi có thưởng chưa nhận ở BẤT KỲ tab nào
  }

  function refreshAll() { renderButton(); renderModal(); }

  // ---------- Khởi tạo ----------
  buildUi();
  renderButton();
  setInterval(() => { renderButton(); if (!document.hidden) flushPending(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshAll(); flushPending(); } });

  // V24.1: onRunEnd(score[, info]) giữ nguyên chữ ký cũ — gọi cho cả 2 sự kiện. Các hook on* khác được game.js /
  // racing.js / multiplayer.js gọi an toàn bằng window.LimitedEvent?.onXxx?.(...)
  function onRunEnd(score, info) {
    try { eduRunEnd(score, info); } catch (err) { console.warn('Sự kiện 20/11: lỗi cập nhật tiến độ:', err); }
    communityRunEnd(score);
  }
  window.LimitedEvent = {
    onRunEnd, onSkillUse, onShopBuy, onGacha, onRaceComplete, onSoloWin,
    status: eventStatus, status2011: eduStatus, config: CONFIG, config2011: EDU,
    statusAuction: aucStatus, configAuction: AUCTION
  };
})();
