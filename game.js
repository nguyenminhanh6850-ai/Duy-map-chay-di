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
  const challengeList = $('challengeList');
  const challengeTimerEl = $('challengeTimer');
  const challengeDot = $('challengeDot');
  const challengeLock = $('challengeLock');
  const gachaModal = $('gachaModal');
  const miniModal = $('miniModal');
  const questList = $('questList');
  const questBonus = $('questBonus');
  const gachaBox = $('gachaBox');
  const gachaResults = $('gachaResults');
  const bagList = $('bagList');
  const miniBody = $('miniBody');
  const bagPane = $('bagPane');
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
    duyquandoi: { name: 'Duy Quân đội', src: 'assets/duy-quan-doi.png' },
    trieu: { name: 'Triều', src: 'assets/trieu.png' },
    tan: { name: 'Tân', src: 'assets/tan.png' },
    phat: { name: 'Phát', src: 'assets/phat.png' },
    onghai: { name: 'Ông Hai', src: 'assets/ong-hai.png' },
    buibang: { name: 'Bùi Bằng', src: 'assets/bui-bang.png' },   // [BÙI BẰNG]
    tien: { name: 'Tiến', src: 'assets/tien.png' },
    quang: { name: 'Quang', src: 'assets/quang.png' },
    duongtao: { name: 'Dương Tào', src: 'assets/duong-tao.png' },
    trongriding: { name: 'Trọng Riding', src: 'assets/trong-riding.png' }
  };
  let selectedCharacter = 'duy';
  // [PROFILE] Avatar
  const AVATAR_KEY = 'duyMapChayDiAvatar';
  let selectedAvatar = 'duy';
  try { const a = localStorage.getItem(AVATAR_KEY); if (a && characters[a]) selectedAvatar = a; } catch (_) { /* storage may be disabled */ }
  function currentAvatar() { return (characters[selectedAvatar] && isCharUnlocked(selectedAvatar)) ? selectedAvatar : 'duy'; }
  let sprite = new Image();
  function isMuRatUnlocked() { return best >= 3333 || score >= 3333; }
  function isCharUnlocked(key) {
    if (key === 'murat') return isMuRatUnlocked();
    if (key === 'toduy') return !!owned.toduy;
    if (key === 'duyquandoi') return !!owned.duyquandoi;
    if (key === 'trieu') return !!owned.trieu;
    if (key === 'tan') return !!owned.tan;
    if (key === 'phat') return !!owned.phat;
    if (key === 'onghai') return !!owned.onghai;
    if (key === 'tien') return !!owned.tien;
    if (key === 'quang') return !!owned.quang;
    if (key === 'duongtao') return !!owned.duongtao;
    if (key === 'buibang') return !!owned.buibang;   // [BÙI BẰNG] mở khóa từ Gacha
    if (key === 'trongriding') return !!owned.trongriding;
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
    trongriding: {
      name: 'Trọng Riding',
      levels: [
        { level: 2, cost: 400, title: 'Sét Gầm & Chiến Mã nhanh hơn', desc: 'Hồi chiêu Sét Gầm giảm từ 29 xuống 25 giây; thời gian Gọi Chiến Mã (khi mất ngựa) giảm từ 24 xuống 20 giây.' },
        { level: 3, cost: 1000, title: 'Sét bền bỉ · Xung chấn sinh tiền', desc: 'Duy trì Sét Gầm tăng từ 11 lên 14 giây; mỗi vật cản bị xung chấn sét phá hủy thưởng +25 Coin (không áp dụng trong trận Boss).' },
        { level: 4, cost: 1600, title: 'Giáp bảo hộ +1', desc: 'Thêm +1 Giáp bảo hộ đầu trận.' }
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
        { level: 3, cost: 750, title: 'Ninja bền bỉ', desc: 'Tăng thời gian duy trì Ninja từ 8 lên 13 giây.' },
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
    },
    trieu: {
      name: 'Triều',
      levels: [
        { level: 2, cost: 400, title: 'Vua lý thuyết hồi nhanh', desc: 'Giảm hồi chiêu gốc từ 36 xuống 31 giây.' },
        { level: 3, cost: 1000, title: 'Vua lý thuyết bền bỉ', desc: 'Tăng thời gian duy trì gốc từ 14 lên 17 giây.' },
        { level: 4, cost: 1600, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    },
    tan: {
      name: 'Tân',
      levels: [
        { level: 2, cost: 400, title: 'Ném chổi hồi nhanh', desc: 'Giảm hồi chiêu Ném chổi từ 27 xuống 24 giây.' },
        { level: 3, cost: 1000, title: 'Ném chổi bền bỉ', desc: 'Tăng thời gian duy trì Ném chổi từ 13 lên 15 giây.' },
        { level: 4, cost: 1600, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    },
    phat: {
      name: 'Phát',
      levels: [
        { level: 2, cost: 400, title: 'Tích nộ nhanh', desc: 'Giảm yêu cầu Nộ để kích hoạt từ 100 xuống 85.' },
        { level: 3, cost: 1000, title: 'Quyền năng bền bỉ', desc: 'Tăng thời gian duy trì kỹ năng từ 10 lên 13 giây.' },
        { level: 4, cost: 1600, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    },
    onghai: {
      name: 'Ông Hai',
      levels: [
        { level: 2, cost: 400, title: 'Thông nòng điếu', desc: 'Giảm hồi chiêu gốc từ 30 xuống 27 giây.' },
        { level: 3, cost: 1000, title: 'Thuốc lào tiên phẩm', desc: 'Tăng thời gian bay gốc từ 15 lên 17 giây.' },
        { level: 4, cost: 1600, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    },
    tien: {
      name: 'Tiến',
      levels: [
        { level: 2, cost: 400, title: 'Bật nhảy mạnh · Sét hồi nhanh', desc: 'Cả 2 dạng: +12% lực bật nhảy kép. Bản Skin: thêm giảm hồi chiêu Anh em “Sét” từ 50 xuống 46 giây.' },
        { level: 3, cost: 1000, title: 'Lướt nhẹ · Sét bền bỉ', desc: 'Cả 2 dạng: giảm 15% tốc độ rơi sau khi nhảy kép (dễ căn bệ). Bản Skin: thêm tăng thời gian duy trì Anh em “Sét” từ 21 lên 23 giây.' },
        { level: 4, cost: 1600, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt (cả 2 dạng).' }
      ]
    },
    quang: {
      name: 'Quang',
      levels: [
        { level: 2, cost: 1500, title: 'Động cơ tăng áp', desc: 'Giảm hồi chiêu GOD RIDER từ 15 xuống 12.5 giây.' },
        { level: 3, cost: 3500, title: 'Bình xăng lớn', desc: 'Tăng thời gian lái mô tô từ 3,5 lên 5 giây.' },
        { level: 4, cost: 6000, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    },
    buibang: {   // [BÙI BẰNG]
      name: 'Bùi Bằng',
      levels: [
        { level: 2, cost: 400, title: 'Bình điện lớn', desc: 'Tăng dung lượng bình điện từ 80 lên 100 điện (đề máy 10 điện, lái 3,0 điện/giây).' },
        { level: 3, cost: 1000, title: 'Sạc nhanh · Giảm phạt', desc: 'Sạc thường nhanh hơn (từ 1,6 lên 2,2 điện/giây, sau 0,5s) và giảm thời gian phạt quá tải từ 60s xuống 45s.' },
        { level: 4, cost: 1600, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    },
    duongtao: {
      name: 'Dương Tào',
      levels: [
        { level: 2, cost: 400, title: 'Đấm gọn · Bốc nhanh', desc: 'Giảm hồi chiêu Bốc đầu nón 3/4 từ 40 xuống 36 giây; giảm hồi chiêu Đấm từ 8,5 xuống 7,8 giây.' },
        { level: 3, cost: 1000, title: 'Giữ ga · Đấm lẹ', desc: 'Tăng thời gian duy trì Bốc đầu từ 17 lên 20 giây; giảm hồi chiêu Đấm từ 7,8 xuống 7,0 giây.' },
        { level: 4, cost: 1600, title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
      ]
    }
  };
  const upgradeShowcaseInfo = {
    duy: { image: 'assets/nhan-vat.png', skill: 'HÀNH QUÂN', baseCooldown: 36, upgradedCooldown: 30, baseDuration: 12, upgradedDuration: 15, description: 'Miễn nhiễm chướng ngại vật trong thời gian kỹ năng.' },
    trong: { image: 'assets/trong-set.png', skill: 'SẤM SÉT', baseCooldown: 40, upgradedCooldown: 35, baseDuration: 15, upgradedDuration: 18, description: 'Gọi sét phá hủy chướng ngại vật trong thời gian kỹ năng.' },
    murat: { image: 'assets/mu-rat.png', skill: 'LƯỚT LƯỚT', baseCooldown: 36, upgradedCooldown: 30, baseDuration: 15, upgradedDuration: 18, description: 'Hóa thành bóng ma và lướt xuyên qua chướng ngại vật.' },
    toduy: { image: 'assets/to-duy.png', skill: 'NINJA', baseCooldown: 25, upgradedCooldown: 22, baseDuration: 8, upgradedDuration: 13, description: 'Thụ động: tự kích hoạt, katana chém đứt đôi mọi chướng ngại phía trước.' },
    duyquandoi: { image: 'assets/duy-quan-doi.png', skill: 'CHI VIỆN', baseCooldown: 38, upgradedCooldown: 33, baseDuration: 16, upgradedDuration: 19, description: 'Miễn nhiễm va chạm, gọi 2 Duy Hành quân hộ tống; hết chiêu 2 đồng đội ở lại tối đa 15 giây, đỡ thay tối đa 2 lần va chạm.' },
    trieu: { image: 'assets/trieu.png', skill: 'VUA LÝ THUYẾT', baseCooldown: 36, upgradedCooldown: 31, baseDuration: 14, upgradedDuration: 17, description: 'Nội tại tăng sức mạnh theo điểm; luồng chữ hất văng chướng ngại vật.' },
    tan: { image: 'assets/tan.png', skill: 'NÉM CHỔI', baseCooldown: 27, upgradedCooldown: 24, baseDuration: 13, upgradedDuration: 15, description: 'Thụ động: tự kích hoạt, miễn nhiễm va chạm và liên tục ném cây chổi xoay tròn hất văng mọi chướng ngại phía trước.' },
    phat: { image: 'assets/phat.png', skill: 'TÍCH NỘ QUYỀN', baseCooldown: 0, upgradedCooldown: 0, baseDuration: 10, upgradedDuration: 13, description: 'Chủ động: vượt chướng ngại (+7 nộ) và chạy mỗi 250m (+7 Nộ). Đủ Nộ thì bấm nút / phím E · S: 10 giây miễn nhiễm va chạm + quay ngẫu nhiên 1 trong 3 hiệu ứng.' },
    onghai: { image: 'assets/ong-hai.png', skill: 'LÀO THỦ TU TIÊN', baseCooldown: 30, upgradedCooldown: 27, baseDuration: 15, upgradedDuration: 17, description: 'Thụ động: tự kích hoạt, cưỡi điếu cày bay trên cao, miễn nhiễm va chạm, nhả vòng khói hất văng vật cản tầm trung/cao. Cuối chiêu quay ngẫu nhiên: êm ái / say thuốc / tắt điếu.' },
    tien: { image: 'assets/tien.png', skill: 'NHẢY KÉP', baseCooldown: 0, upgradedCooldown: 0, baseDuration: 0, upgradedDuration: 0,
      skinSkill: 'ANH EM “SÉT”', skinBaseCooldown: 50, skinUpgradedCooldown: 46, skinBaseDuration: 21, skinUpgradedDuration: 23,
      description: 'Chủ động: bấm nhảy thêm 1 lần trên không (cả bản gốc lẫn Skin), hồi lại khi chạm đất / nóc xe / giàn giáo. Skin Tiến Trọng Duy: giữ nguyên Nhảy kép, có thêm Anh em “Sét” đi cùng, miễn nhiễm va chạm và phóng sét phá chướng ngại.' },
    quang: { image: 'assets/quang.png', skill: 'GOD RIDER', baseCooldown: 15, upgradedCooldown: 12, baseDuration: 3.5, upgradedDuration: 5, description: 'Chủ động: cưỡi siêu mô tô tăng tốc ngẫu nhiên 1,45× – 2,0×, miễn nhiễm va chạm, cán văng vật cản và lướt qua hố nước (10% hồi +1 giáp khi kích hoạt).' },
    buibang: { image: 'assets/bui-bang.png', skill: 'VF 3 · LÁI XE ĐIỆN', baseCooldown: 60, upgradedCooldown: 45, baseDuration: 80, upgradedDuration: 100, description: 'Chủ động: bấm nút 🚗 / phím E · S để lái VF 3 — miễn nhiễm va chạm, chạy 1,15×, cán văng vật cản và lướt qua hố nước. Bình điện 80 (Lv2: 100): đề máy tốn 10 điện, lái mất 3,0 điện/giây. Xuống xe chờ 0,5s rồi sạc 1,6 điện/giây (Lv3: 2,2). Pin dưới 15 sẽ có cảnh báo. Hết điện thì QUÁ TẢI bị phạt 60s (Lv3: 45s).' },
    duongtao: { image: 'assets/duong-tao.png', skill: 'BỐC ĐẦU NÓN 3/4', baseCooldown: 40, upgradedCooldown: 36, baseDuration: 17, upgradedDuration: 20, description: 'Skill 1 (chủ động): đấm văng 1 vật cản gần nhất phía trước (nút 👊 / phím E · S). Skill 2 (thụ động): bốc đầu xe nón 3/4, miễn nhiễm va chạm, chạy 1,12×, lấp hố nước và bắn câu thoại hất văng vật cản.' },
    trongriding: { image: 'assets/trong-riding.png', skill: 'CHIẾN MÃ SẤM SÉT', baseCooldown: 29, upgradedCooldown: 25, baseDuration: 11, upgradedDuration: 14, description: 'Cưỡi ngựa: bật Sét Gầm phá chướng ngại và hào quang miễn nhiễm. Va chạm khi cưỡi thì bỏ ngựa chạy lấy người (không mất giáp), gọi lại Chiến Mã sau khi thanh đầy.' }
  };
  let coinBalance = 0;
  let upgrades = { duy: 1, trong: 1, murat: 1, toduy: 1, duyquandoi: 1, trieu: 1, tan: 1, phat: 1, onghai: 1, tien: 1, quang: 1, duongtao: 1, buibang: 1, trongriding: 1 };
  let upgradeCharacter = 'duy';
  let lastCoinScore = 0;
  let bonusMilestone = 0;
  let spareHits = 0;
  // V23 — Phát · Tích Nộ Quyền (khai báo sớm để các hàm dùng chung gọi được mọi lúc)
  const PHAT_RAGE_PER_OBSTACLE = 7; // vượt chướng ngại / né đạn Boss
  const PHAT_RAGE_PER_250M = 7;     // mỗi 250m
  let phatRage = 0;
  let phatNextMark = 250;
  let phatEffect = null;             // 'integral' | 'sugar' | 'prob' trong lúc bật chiêu
  let phatFx = [];                   // chữ nổi: +10 C₆H₁₂O₆, +35 Coin...
  let runMaxSpare = 0;               // giáp tối đa đầu trận (hiệu ứng P = 0.2 không hồi vượt mức này)
  let runCoins = 0;
  let overAt = 0;
  let overTimer = 0;
  // --- V15: Crystal, vật phẩm, nhiệm vụ, Key, hiệu ứng katana ---
  let crystals = 0;
  let owned = { toduy: false, duyquandoi: false, trieu: false, tan: false, phat: false, onghai: false, tien: false, quang: false, duongtao: false, buibang: false, trongriding: false, tienSkin: false, tanSkin: false, toduySkin: false };
  let equippedSkin = { tien: false, tan: false, toduy: false }; // V20: đang mặc skin "Tiến Trọng Duy" hay không (lưu localStorage)
  const TIEN_PRICE = 10000;             // Shop Đặc Biệt: mua nhân vật Tiến vĩnh viễn (Coin)
  const QUANG_PRICE = 100000;           // Shop Đặc Biệt: mua nhân vật Quang vĩnh viễn (Coin)
  const TIEN_SKIN_CRYSTAL = 20;         // Shop Cao Cấp: skin Tiến Trọng Duy bằng Crystal...
  const TIEN_SKIN_COIN = 7500;          // ...hoặc bằng Coin
  // Black Friday · Trọng Riding (limited 6 ngày, mốc cố định theo giờ Việt Nam)
  const BF_START_MS = Date.parse('2026-11-22T00:00:00+07:00');
  const BF_END_MS = BF_START_MS + 6 * 24 * 60 * 60 * 1000;
  const BF_PRICE_ORIGINAL = 200;
  const BF_PRICE_SALE = 150;
  const bfEnded = (now = Date.now()) => now >= BF_END_MS;
  function bfTimeLeftText(now = Date.now()) {
    const ms = Math.max(0, BF_END_MS - now);
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${d} ngày ${h} giờ ${m} phút`;
  }
  const tienSkinOn = (key = selectedCharacter) => key === 'tien' && !!owned.tienSkin && !!equippedSkin.tien;
  // V25 — Skin S+ giới hạn "Tân Nika" (đấu giá trong popup Sự kiện, event.js): gắn trực tiếp vào nhân vật Tân.
  const tanNikaOn = (key = selectedCharacter) => key === 'tan' && !!owned.tanSkin && !!equippedSkin.tan;
  const TAN_NIKA_SRC = 'assets/tan-nika.png';
  // Mô tả nâng cấp thật của Tân Nika (hiện trên thẻ nhân vật khi đang mặc skin)
  const TAN_NIKA_NEXT = {
    2: { title: 'Thức Tỉnh Nhanh Hơn', desc: 'Giảm hồi chiêu Hóa Thân Nika từ 46 xuống 42 giây (37s sau Thức Tỉnh).' },
    3: { title: 'Nhịp Trống Bền Bỉ', desc: 'Tăng thời gian Hóa Thân Nika từ 24 lên 27 giây; thưởng ép bẹp tăng từ 15 lên 20 Coin/vật.' },
    4: { title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
  };
  const TAN_NIKA_MUSIC = 'assets/drums-of-liberation-remix.mp3';
  const TAN_NIKA_CHORUS_AT = 170.0;   // 2:50 — đoạn điệp khúc cao trào
  const TAN_NIKA_FINALE = 1.5;        // 1,5 giây cuối: Cây Chổi Khổng Lồ
  const TAN_NIKA_COIN = 15;           // Coin mỗi vật cản bị ép bẹp (Lv3: 20)
  const TAN_NIKA_COIN_LV3 = 20;
  let tanAwakened = false;            // Nội tại ẩn "Thức Tỉnh Nhịp Trống" đã kích hoạt trong ván này
  let tanWasNika = false;             // khung hình trước đang ở dạng Nika?
  let tanBroomLaunched = false;
  let tanBigBroom = null;             // Cây Chổi Khổng Lồ cuối chiêu
  let tanSquashed = [];               // vật cản bị ép bẹp (chỉ để vẽ)
  let tanFx = [];                     // chữ +Coin, sóng xung chấn
  let tanFlash = 0;                   // chớp trắng toàn màn hình
  let tanGraceUntil = 0;              // bất tử ngắn sau khi hết chiêu để đáp đất an toàn
  let tanWaves = [];                  // sóng "Đường Cao Su" gợn trên mặt đường
  let tanFists = [];                  // cú đấm cao su khổng lồ từ trên trời
  let tanFistTimer = 0;               // đếm 2,6s giữa các cú đấm
  let tanBigJump = false;             // đang trong cú nhảy cao su vọt cao
  const TAN_FIST_INTERVAL = 2.6;
  const tanNikaSprite = new Image();
  tanNikaSprite.onerror = () => console.error('Không tải được ảnh Tân Nika: ' + TAN_NIKA_SRC);
  tanNikaSprite.src = TAN_NIKA_SRC;
  // =====================================================================
  // V26 — SKIN S+ GIỚI HẠN "TÔ DUY BUDDHA" (trao thưởng từ sự kiện Chiến Dịch Bóng Ma Katana, event.js)
  //  • Skill 1 chủ động: VẠN PHẬT TRẢM KHÔNG (nút ⚔️ / phím E, S)   • Skill 2 theo chu kỳ: CÂN ĐẨU VÂN · CHÂN LONG HỘ THỂ
  //  • Nội tại: LUÂN HỒI NGỘ ĐẠO (quay bằng Math.random — KHÔNG dùng window.gameRand nên không lệch seed Solo 1v1)
  //  • Tuyệt đối không có cơ chế cộng Coin trong bộ kỹ năng này.
  // =====================================================================
  const toduyBuddhaOn = (key = selectedCharacter) => key === 'toduy' && !!owned.toduySkin && !!equippedSkin.toduy;
  const TODUY_BUDDHA_SRC = 'assets/to-duy-buddha.png';
  const tdSprite = new Image();
  tdSprite.onload = () => { if (state !== 'running') render(); };
  tdSprite.onerror = () => console.error('Không tải được ảnh Tô Duy Buddha: ' + TODUY_BUDDHA_SRC);
  tdSprite.src = TODUY_BUDDHA_SRC;
  const TODUY_BUDDHA_NEXT = {
    2: { title: 'Trảm Không Tốc Biến', desc: 'Giảm hồi Vạn Phật Trảm Không từ 10 xuống 8,5 giây; hồi Cân Đẩu Vân từ 40 xuống 36 giây.' },
    3: { title: 'Mây Vàng Bền Bỉ', desc: 'Tăng thời gian duy trì Cân Đẩu Vân · Chân Long Hộ Thể từ 18 lên 21 giây.' },
    4: { title: 'Chống chịu +1', desc: 'Chịu được thêm một lần va chạm trong mỗi lượt.' }
  };
  const TD_SLASH_RANGE = 360;        // Ấn Ký Phật Quang lao tới trước 360px
  const TD_SLASH_SPEED = 980;        // px/s
  const TD_LAYER_GAP = 25;           // Tầng Mây Thấp: cách mặt đất 25px
  const TD_DRAGON_INTERVAL = 2.2;    // Kim Long lao tới mỗi 2,2 giây
  const TD_DRAGON_DASH = 420;        // quãng lao của Kim Long
  const TD_DRAGON_LEN = 240;         // chiều dài thân rồng
  const TD_RIFT_LIFE = 1.2;          // Vết Rách Không Gian tồn tại 1,2 giây
  const TD_GRACE = 0.8;              // đáp đất an toàn sau khi hết chiêu
  const TD_FONT = "'Noto Serif CJK SC','Noto Sans CJK SC','Songti SC','SimSun','Microsoft YaHei',serif";
  let tdSlashReadyAt = 0;            // mốc (elapsedRun) Skill 1 sẵn sàng
  let tdSeals = [];                  // Ấn Ký Phật Quang đang bay
  let tdLayer = 0;                   // 0 = Tầng Mây Thấp · 1 = Tầng Mây Cao
  let tdWasCloud = false;
  let tdGraceUntil = 0;
  let tdFx = [];                     // bụi sao, tàn lửa, sóng xung kích
  let tdRifts = [];                  // Vết Rách Không Gian
  let tdDragon = null;               // Kim Long
  let tdNextBonus = 0;               // Chân Kinh: +3–5s duy trì cho lần bật chiêu kế tiếp
  let tdNextMult = 1;                // Đại Giác Ngộ: ×1.5 duy trì cho lần bật chiêu kế tiếp
  let tdDurLocked = 0;               // thời lượng duy trì đã chốt lúc bật chiêu (HUD không nhảy số)
  let tdCloudA = 0;                  // độ hiện của Cân Đẩu Vân (0..1)
  let tdStarTimer = 0;
  const tdSlashCd = (key = 'toduy') => {
    let v = (upgrades[key] || 1) >= 2 ? 8.5 : 10;
    if (state === 'running' && hourglassRun && key === selectedCharacter) v = Math.round(v * 0.85 * 10) / 10;
    return v;
  };
  const tdCloudNow = () => toduyBuddhaOn() && state === 'running' && skillTriggered && elapsedRun < skillActiveUntil;
  const tdGraceNow = () => toduyBuddhaOn() && state === 'running' && elapsedRun < tdGraceUntil;
  // Nhân vật có kỹ năng theo chu kỳ (hồi chiêu + duy trì)? Tiến gốc chỉ có Nhảy kép chủ động nên không có.
  const hasTimedSkill = (key = selectedCharacter) => key !== 'phat' && (key !== 'tien' || tienSkinOn('tien')); // Phát: tích Nộ chủ động, không theo hồi chiêu
  const charName = (key) => (tienSkinOn(key) ? 'Tiến Trọng Duy' : tanNikaOn(key) ? 'Tân Nika' : toduyBuddhaOn(key) ? 'Tô Duy Buddha' : upgradeConfig[key].name);
  const charSkillName = (key) => (tienSkinOn(key) ? upgradeShowcaseInfo.tien.skinSkill : tanNikaOn(key) ? 'THỨC TỈNH NIKA' : toduyBuddhaOn(key) ? 'VẠN PHẬT TRẢM KHÔNG' : upgradeShowcaseInfo[key].skill);
  let inventory = { shield: 0, magnet: 0, hourglass: 0, duration: 0 };
  let equipped = { shield: false, magnet: false, hourglass: false, duration: false };
  let miniKeys = 0;
  let bossUnlocked = false; // V19: đã mở khóa vĩnh viễn chế độ Đánh Boss (lưu localStorage)
  let bossMode = false;     // true khi đang trong trận Đánh Boss (không tính điểm mét)
  let questData = null;
  let challengeData = null; // V20.1: Thử thách 3 ngày (lưu localStorage 'duyMapChayDiChallenge')
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
    if (key === 'tien') value = tienSkinOn('tien') ? (lv >= 2 ? 46 : 50) : 0; // Tiến gốc: Nhảy kép không hồi chiêu
    else if (key === 'toduy') value = toduyBuddhaOn('toduy') ? (lv >= 2 ? 36 : 40) : (lv >= 2 ? 22 : 25); // V26 Buddha: Cân Đẩu Vân hồi 40s / Lv2 36s
    else if (key === 'duyquandoi') value = lv >= 2 ? 33 : 38;
    else if (key === 'trieu') value = (lv >= 2 ? 31 : 36) - (score >= 4000 ? 3 : score >= 2000 ? 1 : 0);
    else if (key === 'tan') {
      if (tanNikaOn('tan')) {
        value = lv >= 2 ? 42 : 46; // V25 Skin Tân Nika: hồi 46s / Lv2+ 42s
        if (state === 'running' && tanAwakened) value -= 5; // Nội tại ẩn "Thức Tỉnh Nhịp Trống": -5s vĩnh viễn trong ván
      } else value = lv >= 2 ? 24 : 27; // V22: Ném chổi — hồi chiêu 27s, Lv2 còn 24s
    }
    else if (key === 'phat') value = 0; // V23: Phát không có hồi chiêu theo thời gian (tích Nộ)
    else if (key === 'onghai') value = lv >= 2 ? 27 : 30;
    else if (key === 'quang') value = lv >= 2 ? 12.5 : 15;
    else if (key === 'duongtao') value = lv >= 2 ? 36 : 40; // Skill 2: Bốc đầu nón 3/4
    else if (key === 'buibang') value = lv >= 3 ? 45 : 60;   // [BÙI BẰNG] thời gian phạt quá tải
    else if (key === 'trong') value = lv >= 2 ? 35 : 40;
    else if (key === 'trongriding') value = lv >= 2 ? 25 : 29; // Sét Gầm (khi đang cưỡi ngựa); Gọi Chiến Mã dùng riderCallTime()
    else value = lv >= 2 ? 30 : 36;
    // Vật phẩm giảm hồi chiêu: giảm 15% thời gian hồi trong các màn có hiệu lực (chỉ khi đang chạy).
    if (state === 'running' && hourglassRun && key === selectedCharacter) value = Math.round(value * 0.85 * 10) / 10;
    if (key === 'quang' && state === 'running' && quangPassiveBoost) value = Math.round(value * 0.85 * 10) / 10;
    return value;
  }
  function skillDuration(key = selectedCharacter) {
    const lv = upgrades[key] || 1;
    let value;
    if (key === 'tien') value = tienSkinOn('tien') ? (lv >= 3 ? 23 : 21) : 0;
    else if (key === 'toduy') {
      if (toduyBuddhaOn('toduy')) {   // V26 Buddha: Cân Đẩu Vân duy trì 18s / Lv3 21s (+ nội tại Luân Hồi Ngộ Đạo)
        if (state === 'running' && tdDurLocked > 0) return tdDurLocked;   // đã chốt lúc bật chiêu
        value = lv >= 3 ? 21 : 18;
        if (state === 'running') value = (value + tdNextBonus) * tdNextMult;
        value = Math.round(value * 10) / 10;
      } else value = lv >= 3 ? 13 : 8;
    }
    else if (key === 'duyquandoi') value = lv >= 3 ? 19 : 16;
    else if (key === 'trieu') value = (lv >= 3 ? 17 : 14) + (score >= 5000 ? 2 : score >= 3000 ? 1 : 0);
    else if (key === 'tan') value = tanNikaOn('tan') ? (lv >= 3 ? 27 : 24) : (lv >= 3 ? 15 : 13); // V22: Ném chổi 13s/15s · V25 Tân Nika 24s/27s
    else if (key === 'phat') value = lv >= 3 ? 13 : 10; // V23: Tích Nộ Quyền — duy trì 10s, Lv3 lên 13s
    else if (key === 'onghai') value = lv >= 3 ? 17 : 15;
    else if (key === 'quang') value = lv >= 3 ? 5 : 3.5;
    else if (key === 'duongtao') value = lv >= 3 ? 20 : 17; // Skill 2: Bốc đầu nón 3/4
    else if (key === 'buibang') value = lv >= 2 ? 100 : 80;  // [BÙI BẰNG] dung lượng bình điện
    else if (key === 'trongriding') value = lv >= 3 ? 14 : 11; // Sét Gầm: pha 2 (hào quang miễn nhiễm)
    else {
      const base = key === 'duy' ? 12 : 15;
      value = lv >= 3 ? (key === 'duy' ? 15 : 18) : base;
    }
    // Vật phẩm 🔋: +15% thời gian duy trì kỹ năng trong màn chơi có hiệu lực (làm tròn 1 chữ số thập phân).
    if (state === 'running' && durationRun && key === selectedCharacter) value = Math.round(value * 1.15 * 10) / 10;
    // V19: trong trận Đánh Boss, thời gian duy trì của tất cả nhân vật giảm 50%.
    if (state === 'running' && bossMode) value = Math.round(value * window.GameBridge.boss.cfg.skillMult * 10) / 10;
    return value;
  }

  // ---------- Lưu trữ localStorage cho dữ liệu mới ----------
  const achv = { claimed: [], totalMeters: 0, totalGacha: 0, totalBusHits: 0, rainbowCount: 0, bossWins: 0, visitedMaps: [], totalRuns: 0, totalSkillsUsed: 0, charUsage: {} }; // [PROFILE]
  const LS = {
    crystals: 'duyMapChayDiCrystals',
    owned: 'duyMapChayDiOwned',
    items: 'duyMapChayDiItems',
    achv: 'duyMapChayDiAchv',
    seenVersion: 'duyMapChayDiSeenVersion',
    keys: 'duyMapChayDiKeys',
    quests: 'duyMapChayDiQuests',
    challenge: 'duyMapChayDiChallenge',
    shop: 'duyMapChayDiShop',
    boss: 'duyMapChayDiBossUnlocked',
    skin: 'duyMapChayDiSkin'
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
    owned.trieu = !!ownedSaved.trieu;
    owned.tan = !!ownedSaved.tan;
    owned.phat = !!ownedSaved.phat;
    owned.onghai = !!ownedSaved.onghai;
    owned.buibang = !!ownedSaved.buibang;   // [BÙI BẰNG] Gacha
    owned.tien = !!ownedSaved.tien;
    owned.quang = !!ownedSaved.quang;
    owned.duongtao = !!ownedSaved.duongtao;
    owned.trongriding = !!ownedSaved.trongriding;
    owned.tienSkin = !!ownedSaved.tienSkin && owned.tien;
    owned.tanSkin = !!ownedSaved.tanSkin && owned.tan;   // V25: Skin S+ Tân Nika
    owned.toduySkin = !!ownedSaved.toduySkin && owned.toduy;   // V26: Skin S+ Tô Duy Buddha
    const skinSaved = lsRead(LS.skin, {}) || {};
    equippedSkin.tien = !!skinSaved.tien && owned.tienSkin;
    equippedSkin.tan = !!skinSaved.tan && owned.tanSkin;
    equippedSkin.toduy = !!skinSaved.toduy && owned.toduySkin;
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
    achv.rainbowCount = toCount(av.rainbowCount);
    achv.bossWins = toCount(av.bossWins);
    achv.visitedMaps = Array.isArray(av.visitedMaps) ? av.visitedMaps.filter(k => typeof k === 'string') : [];
    // [PROFILE]
    achv.totalRuns = toCount(av.totalRuns);
    achv.totalSkillsUsed = toCount(av.totalSkillsUsed);
    achv.charUsage = {};
    if (av.charUsage && typeof av.charUsage === 'object') {
      Object.keys(av.charUsage).forEach((k) => { if (characters[k]) achv.charUsage[k] = toCount(av.charUsage[k]); });
    }
  }
  function saveAchv() { lsWrite(LS.achv, achv); }
  // [PROFILE] Ghi nhận 1 ván kết thúc (thường + Boss)
  function commitProfileRun() {
    achv.totalRuns += 1;
    achv.totalSkillsUsed += runSkillCount;
    achv.charUsage[selectedCharacter] = (achv.charUsage[selectedCharacter] || 0) + 1;
    saveAchv();
  }
  function markMapVisited(key) {
    if (!key || achv.visitedMaps.includes(key)) return;
    achv.visitedMaps.push(key);
    saveAchv();
  }
  function saveMeta() {
    lsWrite(LS.crystals, crystals);
    lsWrite(LS.owned, owned);
    lsWrite(LS.skin, equippedSkin);
    lsWrite(LS.items, { ...inventory, equipped });
    lsWrite(LS.keys, miniKeys);
    lsWrite(LS.boss, bossUnlocked);
  }
  loadMeta();
  {
    // V25: huy hiệu "SKIN S+ LIMITED" (gradient cầu vồng chuyển động) + nút mặc skin Tân Nika
    const nikaStyle = document.createElement('style');
    nikaStyle.textContent = `
      .char-card .card-art:has(.skin-badge-nika){position:relative}
      .skin-badge-nika{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);z-index:3;white-space:nowrap;padding:3px 9px;border-radius:999px;font:900 9px/1.3 system-ui,sans-serif;letter-spacing:.04em;color:#1b1030;border:1px solid rgba(255,255,255,.85);background:linear-gradient(90deg,#ff5f6d,#ffc371,#f9f871,#6bffb8,#5ec8ff,#c58bff,#ff5f6d);background-size:300% 100%;animation:nikaRainbow 3s linear infinite;box-shadow:0 0 10px rgba(255,255,255,.65)}
      @keyframes nikaRainbow{to{background-position:300% 0}}
      .card-btn.skin.nika{background:linear-gradient(90deg,#ff5f6d,#ffb347,#f4e04d,#5ee7a8,#5ec8ff,#c58bff,#ff5f6d);background-size:300% 100%;animation:nikaRainbow 4s linear infinite;color:#1b1030;font-weight:900}
      .card-btn.skin.nika.is-on{filter:saturate(.8) brightness(.95)}
    `;
    document.head.appendChild(nikaStyle);
  }

  // ---------- Sảnh: thông tin nhân vật đang chọn ----------
  function updateLobby() {
    lobbyCoin.textContent = fmt(coinBalance);
    lobbyBest.textContent = formatScore(best);
    refreshCurrencies();
    updateMiniButton();
    updateEquipStrip();
    updateQuestDot();
    updateChallengeButton();
    const info = upgradeShowcaseInfo[selectedCharacter];
    heroName.textContent = charName(selectedCharacter);
    heroLevel.textContent = `LV ${upgrades[selectedCharacter]}`;
    heroSkill.textContent = `✦ ${charSkillName(selectedCharacter)}`;
    const trioOn = tienSkinOn('tien') && selectedCharacter === 'tien';
    const heroImg = (selectedCharacter === 'tan' && tanNikaOn('tan')) ? TAN_NIKA_SRC : (toduyBuddhaOn(selectedCharacter) ? TODUY_BUDDHA_SRC : info.image);
    const heroMarkup = trioOn
      ? '<img src="assets/trong-set.png" alt=""><img src="assets/tien.png" alt=""><img src="assets/nhan-vat.png" alt="">'
      : `<img src="${heroImg}" alt="">`;
    const heroState = `${trioOn ? 'trio' : 'single'}-${heroImg}`;
    if (heroSprite.dataset.visual !== heroState) {
      heroSprite.innerHTML = heroMarkup;
      heroSprite.dataset.visual = heroState;
      heroSprite.classList.toggle('is-trio', trioOn);
      heroSprite.setAttribute('aria-label', charName(selectedCharacter));
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
          : (key === 'tien'
            ? `Mua vĩnh viễn tại <b>Shop → Đặc Biệt</b>.<br>Giá 🪙 ${fmt(TIEN_PRICE)} (chỉ mua 1 lần).`
            : key === 'duongtao'
              ? 'Độc quyền phần thưởng <b>Top 1–3 Giải Đấu Tuần</b> (League).'
            : key === 'trongriding'
              ? 'Mua tại <b>Shop → Đặc Biệt</b> trong đợt <b>Black Friday</b> (💎 150).'
            : key === 'quang'
              ? `Mua vĩnh viễn tại <b>Shop → Đặc Biệt</b>.<br>Giá 🪙 ${fmt(QUANG_PRICE)} (chỉ mua 1 lần).`
              : `Mở khóa vĩnh viễn từ <b>Gacha</b>.<br>~2,14% ra ${cfg.name} mỗi hộp.`);
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
      const skinOn = tienSkinOn(key);
      const nikaOn = tanNikaOn(key);
      const tdOn = toduyBuddhaOn(key);
      const timed = hasTimedSkill(key);
      const isPhat = key === 'phat';
      const isBB = key === 'buibang';
    const cdText = isBB ? `CHỦ ĐỘNG · PHẠT ${skillInterval(key)}s` : isPhat ? `${phatNeed()} NỘ` : (key === 'duongtao' ? `${skillInterval(key)}s · ${dtFmtCd(dtPunchCd(key))}s` : (tdOn ? `${skillInterval(key)}s · ${tdSlashCd(key)}s` : (timed ? `${skillInterval(key)}s` : '—')));
      const durText = isBB ? `${bbMaxPin()} ĐIỆN` : isPhat ? `${skillDuration(key)}s` : (timed ? `${skillDuration(key)}s` : '+1 NHẢY');
      const pips = [1, 2, 3, 4].map(n => `<i class="pip ${n <= lv ? 'on' : ''}"></i>`).join('') + '<i class="pip soon" title="Level 5 · Coming Soon"></i>';
      let upgradeBtn;
      if (!next) {
        upgradeBtn = `<button class="card-btn upgrade maxed" type="button" disabled>✓ ĐÃ TỐI ĐA</button>`;
      } else {
        const affordable = coinBalance >= next.cost;
        upgradeBtn = `<button class="card-btn upgrade" type="button" data-upgrade="${key}" ${affordable ? '' : 'disabled'} title="${affordable ? '' : 'Chưa đủ Coin'}">NÂNG CẤP LV${lv + 1} <span class="cost">🪙 ${fmt(next.cost)}</span></button>`;
      }
      return `<article class="char-card ${selected ? 'is-selected' : ''}" data-key="${key}">
        <div class="card-art">${skinOn ? '<div class="trio-art" style="display:flex;align-items:flex-end;justify-content:center;width:100%;height:100%;padding:6px 4px;box-sizing:border-box"><img src="assets/trong-set.png" alt="Trọng Sét" style="height:82%;width:auto;max-width:34%;object-fit:contain"><img src="assets/tien.png" alt="Tiến" style="height:88%;width:auto;max-width:34%;object-fit:contain"><img src="assets/nhan-vat.png" alt="Duy" style="height:82%;width:auto;max-width:34%;object-fit:contain"></div>' : `<img src="${nikaOn ? TAN_NIKA_SRC : tdOn ? TODUY_BUDDHA_SRC : info.image}" alt="${charName(key)}">`}<span class="card-lv px">LV ${lv}</span>${key === 'tan' && owned.tanSkin ? '<span class="skin-badge-nika">SKIN S+ LIMITED</span>' : ''}${key === 'toduy' && owned.toduySkin ? '<span class="skin-badge-nika">SKIN S+ LIMITED</span>' : ''}</div>
        <h3 class="card-name">${charName(key)}</h3>
        <p class="card-skill">✦ ${charSkillName(key)}</p>
        <div class="card-stats">
          <div class="card-stat"><span>${isPhat ? 'NỘ CẦN' : 'HỒI CHIÊU'}</span><b>${cdText}</b></div>
          <div class="card-stat"><span>KỸ NĂNG</span><b>${durText}</b></div>
          <div class="card-stat"><span>GIÁP</span><b>+${lv >= 4 ? 1 : 0}</b></div>
        </div>
        <div class="pips" aria-label="Cấp ${lv} trên 4">${pips}</div>
        <p class="card-next">${next ? (() => { const nn = (nikaOn && TAN_NIKA_NEXT[lv + 1]) || (tdOn && TODUY_BUDDHA_NEXT[lv + 1]) || next; return `<b>LV${lv + 1}: ${nn.title}</b><br>${nn.desc}`; })() : '<b>Đã đạt cấp cao nhất</b><br>Level 5 · Coming Soon'}</p>
        <div class="card-actions">
          <button class="card-btn select ${selected ? 'is-on' : ''}" type="button" data-select="${key}" ${selected ? 'disabled' : ''}>${selected ? '✓ ĐANG CHỌN' : 'CHỌN'}</button>
          ${upgradeBtn}
          ${key === 'tien' && owned.tienSkin ? `<button class="card-btn skin ${skinOn ? 'is-on' : ''}" type="button" data-skin="tien">${skinOn ? '✓ ĐANG MẶC · THÁO SKIN' : '🎽 MẶC SKIN TIẾN TRỌNG DUY'}</button>` : ''}
          ${key === 'tan' && owned.tanSkin ? `<button class="card-btn skin nika ${nikaOn ? 'is-on' : ''}" type="button" data-skin="tan">${nikaOn ? '✓ ĐANG MẶC · THÁO SKIN' : '🎽 MẶC SKIN TÂN NIKA'}</button>` : ''}
          ${key === 'toduy' && owned.toduySkin ? `<button class="card-btn skin nika ${tdOn ? 'is-on' : ''}" type="button" data-skin="toduy">${tdOn ? '✓ ĐANG MẶC · THÁO SKIN' : '🎽 MẶC SKIN TÔ DUY BUDDHA'}</button>` : ''}
        </div>
      </article>`;
    }).join('');
    cardRow.scrollLeft = keepScroll;
  }
  cardRow.addEventListener('click', (event) => {
    const selectBtn = event.target.closest('[data-select]');
    const upgradeBtn = event.target.closest('[data-upgrade]');
    const skinBtn = event.target.closest('[data-skin]');
    if (skinBtn && !skinBtn.disabled) {
      // Mặc / Tháo skin Tiến Trọng Duy (chỉ đổi được ngoài trận chạy)
      const skinKey = skinBtn.dataset.skin;
      if (state === 'running' || !((skinKey === 'tien' && owned.tienSkin) || (skinKey === 'tan' && owned.tanSkin) || (skinKey === 'toduy' && owned.toduySkin))) return;
      equippedSkin[skinKey] = !equippedSkin[skinKey];
      saveMeta();
      updateLobby();
      renderCharacterCards();
      playUiSound('select');
      if (skinKey === 'tan') showToast(equippedSkin.tan ? 'ĐÃ MẶC SKIN TÂN NIKA: hồi chiêu dài hơn nhưng duy trì lâu, hóa thân ép bẹp mọi vật cản!' : 'ĐÃ THÁO SKIN: Tân dùng lại Ném chổi.');
      else if (skinKey === 'toduy') showToast(equippedSkin.toduy ? 'ĐÃ MẶC SKIN TÔ DUY BUDDHA: Vạn Phật Trảm Không (E / S) + Cân Đẩu Vân · Chân Long Hộ Thể!' : 'ĐÃ THÁO SKIN: Tô Duy dùng lại Ninja.');
      else showToast(equippedSkin.tien ? 'ĐÃ MẶC SKIN TIẾN TRỌNG DUY: Anh em “Sét” đi cùng, vẫn giữ Nhảy kép.' : 'ĐÃ THÁO SKIN: Tiến dùng lại Nhảy kép.');
    } else if (selectBtn && !selectBtn.disabled) {
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
    const ownedGachaCount = ['toduy', 'duyquandoi', 'trieu', 'tan', 'phat', 'onghai', 'buibang'].filter(k => owned[k]).length;
    const allMaps = ['desert', 'city', 'night', 'beach', 'sunset', 'village', 'school'];   // [SCHOOL]
const visitedCount = allMaps.filter(m => achv.visitedMaps.includes(m)).length;
    return [
      { id: 'a1', icon: '🏃', title: 'Khởi động', desc: 'Đạt 500 điểm trong một ván', cur: best, goal: 500, reward: 5 },
      { id: 'a2', icon: '🏜️', title: 'Nghìn dặm', desc: 'Đạt 1.000 điểm trong một ván', cur: best, goal: 1000, reward: 10 },
      { id: 'a3', icon: '🏙️', title: 'Vào thành phố', desc: 'Chạm tới map City ở 3.000 điểm', cur: best, goal: 3000, reward: 15 },
      { id: 'a4', icon: '👻', title: 'Triệu hồi Mu Rát', desc: 'Đạt 3.333 điểm để mở khóa Mu Rát', cur: best, goal: 3333, reward: 15 },
      { id: 'a5', icon: '🔥', title: 'Bá chủ đường phố', desc: 'Đạt 6.000 điểm trong một ván', cur: best, goal: 6000, reward: 25 },
      { id: 'a6', icon: '⚡', title: 'Lên đời', desc: 'Nâng một nhân vật lên Lv2', cur: maxLv, goal: 2, reward: 10 },
      { id: 'a7', icon: '🛡️', title: 'Cứng cáp', desc: 'Nâng một nhân vật lên Lv4 để có Giáp', cur: maxLv, goal: 4, reward: 15 },
      { id: 'a8', icon: '👑', title: 'Đội hình tối thượng', desc: 'Nâng đủ 5 nhân vật bất kỳ lên Lv4', cur: Math.min(atLv4, 5), goal: 5, reward: 30 },
      { id: 'a9', icon: '🎁', title: 'Thợ săn kho báu', desc: 'Mở tổng cộng 5 hộp Gacha', cur: achv.totalGacha, goal: 5, reward: 15 },
      { id: 'a10', icon: '🛣️', title: 'Người chạy bền bỉ', desc: 'Chạy tích lũy tổng 20.000m qua mọi ván', cur: achv.totalMeters, goal: 20000, reward: 20 },
      { id: 'a11', icon: '🚌', title: 'Tài xế hung thần', desc: 'Tông trúng xe buýt tổng cộng 15 lần', cur: achv.totalBusHits, goal: 15, reward: 10 },
      { id: 'a12', icon: '🥷', title: 'Bóng ma Katana', desc: 'Sở hữu nhân vật Tô Duy từ Gacha', cur: owned.toduy ? 1 : 0, goal: 1, reward: 25 },
      { id: 'a13', icon: '🪖', title: 'Tiểu đội trưởng', desc: 'Sở hữu nhân vật Duy Quân đội từ Gacha', cur: owned.duyquandoi ? 1 : 0, goal: 1, reward: 25 },
      { id: 'a14', icon: '🎓', title: 'Vua lý thuyết', desc: 'Sở hữu nhân vật Triều từ Gacha', cur: owned.trieu ? 1 : 0, goal: 1, reward: 25 },
      { id: 'a15', icon: '🧹', title: 'Chiến thần dọn dẹp', desc: 'Sở hữu nhân vật Tân từ Gacha', cur: owned.tan ? 1 : 0, goal: 1, reward: 25 },
      { id: 'a16', icon: '⚛️', title: 'Nhà toán học điên', desc: 'Sở hữu nhân vật Phát từ Gacha', cur: owned.phat ? 1 : 0, goal: 1, reward: 25 },
      { id: 'a17', icon: '🚬', title: 'Lào thủ tu tiên', desc: 'Sở hữu nhân vật Ông Hai từ Gacha', cur: owned.onghai ? 1 : 0, goal: 1, reward: 25 },
      { id: 'a18', icon: '🎰', title: 'Trùm Gacha', desc: 'Sở hữu đủ 7 nhân vật trong Gacha', cur: ownedGachaCount, goal: 7, reward: 75 },
      { id: 'a19', icon: '🏍️', title: 'Rich man', desc: 'Sở hữu nhân vật huyền thoại Quang', cur: owned.quang ? 1 : 0, goal: 1, reward: 75 },
      { id: 'a20', icon: '😏', title: 'Thách đấu League', desc: 'Sở hữu nhân vật Dương Tào', cur: owned.duongtao ? 1 : 0, goal: 1, reward: 75 },
      { id: 'a21', icon: '👕', title: 'Tiến và Tiền', desc: 'Sở hữu nhân vật Tiến cùng Skin Tiến Trọng Duy', cur: (owned.tien ? 1 : 0) + (owned.tienSkin ? 1 : 0), goal: 2, reward: 15 },
      { id: 'a22', icon: '🗺️', title: 'Adventure', desc: 'Khám phá hết tất cả 7 bản đồ hiện tại', cur: visitedCount, goal: 7, reward: 50 },
      { id: 'a23', icon: '🌈', title: 'Đó là sò nui?', desc: 'Nhặt được Sò Nui 7 Màu trên đường chạy', cur: achv.rainbowCount, goal: 1, reward: 15 },
      { id: 'a24', icon: '🎖️', title: 'Thợ săn tank', desc: 'Đánh thắng Boss Xe Tăng lần đầu tiên', cur: achv.bossWins, goal: 1, reward: 35 },
      { id: 'a25', icon: '🌋', title: 'Vua sinh tồn', desc: 'Đạt kỷ lục vượt qua 12.000m', cur: best, goal: 12000, reward: 35 },
      { id: 'a26', icon: '🏆', title: 'MVP', desc: 'Đạt kỷ lục cá nhân 20.000m', cur: best, goal: 20000, reward: 50 },
      { id: 'a27', icon: '🚗', title: 'Mở khóa Bùi Bằng', desc: 'Sở hữu nhân vật Bùi Bằng từ Gacha', cur: owned.buibang ? 1 : 0, goal: 1, reward: 25 }   // [BÙI BẰNG]
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
    const isPlaying = name === 'game';
    lobbyScreen.classList.toggle('is-active', name === 'lobby');
    gameScreen.classList.toggle('is-active', isPlaying);

    // Tìm và ẩn mọi nút có chữ "Sao lưu" khi vào trận, hiện lại khi về sảnh
    document.querySelectorAll('button, a, div[role="button"]').forEach((el) => {
      if (el.textContent && el.textContent.trim().includes('Sao lưu')) {
        el.style.display = isPlaying ? 'none' : '';
      }
    });
    }
  
  function openCharacterModal() { renderCharacterCards(); openModal(characterModal, openCharactersBtn); }
  function openHelpModal() {
    openModal(helpModal, openHelpBtn);
  }
  // ---------- News: bảng tin cập nhật ----------
  const NEWS_POSTS = [
    {
      version: 'V26', title: 'Battle Pass Katana · Đợt Cân Bằng Nhân Vật · Sửa Map Trường Học', date: '26/11/2026',
      items: [
        '<b>🎉 Sự kiện mới: Battle Pass “Chiến Dịch Bóng Ma Katana”</b> — cả server cùng chạy trong <b>7 ngày</b> tới mục tiêu <b>2.000.000m</b> (thanh tiến độ kéo dài tới <b>3.000.000m</b> “Vượt Ngưỡng”) với <b>8 mốc thưởng</b>. Cần kỷ lục từ <b>1.000 điểm</b> để tham gia.',
        'Hai nhánh song song <b>FREE</b> và <b>CAO CẤP</b>. Mở khóa nhánh Cao Cấp với giá <b>💎 500 Crystal</b> và nhận bù toàn bộ quà các mốc đã đạt. Mốc 2.000.000m nhánh Cao Cấp tặng Skin S+ giới hạn <b>Tô Duy Buddha</b>.',
        '<b>⚖️ Đợt cân bằng nhân vật</b> — chỉnh 4 nhân vật Quang, Bùi Bằng, Dương Tào và Triều (chi tiết bên dưới).',
        '<b>Quang · GOD RIDER</b>: tốc độ không còn cố định 1,45× mà <b>ngẫu nhiên 1,45× – 2,0×</b> mỗi lần kích hoạt (hiện trên thông báo). Thêm <b>10%</b> cơ hội hồi <b>+1 giáp</b> khi bật chiêu, không vượt quá số giáp tối đa đầu trận.',
        '<b>Bùi Bằng · VF 3</b>: phí đề máy tăng <b>4 → 10 điện</b>; thời gian bất tử sau khi xuống xe giảm một nửa, <b>0,75s → 0,375s</b>.',
        '<b>Dương Tào</b>: nội tại mới cho Đấm — <b>5 lần đấm trúng</b> giảm hồi chiêu <b>1s</b>, <b>10 lần</b> giảm tổng <b>2s</b> (trong ván, hồi chiêu tối thiểu 2s). Ngoài ra, khi <b>kết thúc Bốc đầu nón 3/4</b>, Đấm được <b>hồi lập tức</b>.',
        '<b>Triều · Vua Lý Thuyết</b>: thêm <b>Nội tại V</b> ở mốc <b>10.000m</b> — hồi <b>+1 giáp bảo hộ</b> (không vượt giáp tối đa đầu trận).',
        '<b>Sửa Map Trường Học</b>: giảm tỷ lệ combo Bạt nhún + Nhà vệ sinh (35% → 20%), tăng khoảng cách giữa các vật cản để Cameo và bàn ghế không còn đứng sát nhau bít đường. Sau vật cản cần nhảy sẽ không còn sinh cặp sách bay cao làm đập đầu khi vừa nhảy qua.'
      ]
    },
    {
      version: 'V25.1', title: 'Map Trường Học · Bạt Nhún · Flappy Ông Hai & Đấu Giá', date: '25/11/2026',
      items: [
        'Bản đồ thứ 7: <b>Trường Học 🏫</b> — dãy phòng học 2 tầng, cột cờ Tổ quốc và sân gạch đỏ / xi măng có vạch kẻ sân thể dục. Xuất hiện ở các mốc <b>3.000m</b>, <b>6.000m</b> và chia đều cùng 5 map còn lại từ <b>10.000m</b> trở đi.',
        'Combo <b>Bạt nhún 🤸 + Nhà vệ sinh học sinh</b>: nhà vệ sinh cao 155px, nhảy thường không qua nổi — hãy <b>đạp bạt nhún</b> để bay vút lên (hồi lại lượt nhảy kép của Tiến) rồi đáp lên nóc chạy tiếp an toàn.',
        'Cameo <b>Bùi Bằng</b> & <b>Dương Tào</b> đứng chặn đường kèm bong bóng thoại, cùng <b>bàn ghế học sinh</b> và <b>cặp sách bay</b> xen kẽ nhịp nhảy / chạy luồn.',
        'Thành tựu <b>Adventure</b> nay yêu cầu khám phá đủ <b>7 bản đồ</b>.',
        'Nhắc nhẹ: đừng quên ghé chơi <b>Flappy Ông Hai 🐦</b> và tham gia <b>Đấu giá 🔨</b> trong popup <b>Sự Kiện</b> để không bỏ lỡ phần thưởng nhé!'
      ]
    },
    {
      version: 'V24.3', title: 'Ra Mắt Bùi Bằng · Xe Điện VF 3 & Nút Tạm Dừng', date: '23/11/2026',
      items: [
        'Nhân vật Gacha thứ bảy: <b>Bùi Bằng 🚗</b> với kỹ năng chủ động <b>VF 3 · LÁI XE ĐIỆN</b> — miễn nhiễm va chạm, chạy nhanh hơn và cán văng vật cản.',
        'Bình điện <b>80</b> (Lv2: <b>100</b>): đề máy tốn <b>4 điện</b>, lái mất <b>3,0 điện/giây</b>. Pin dưới <b>15</b> điện sẽ có cảnh báo. Hết điện sẽ <b>QUÁ TẢI</b> và bị phạt <b>60 giây</b> (Lv3: 45 giây).',
        'Tỷ lệ Gacha nhóm nhân vật được chia đều cho <b>7 nhân vật</b> (~<b>2,14%</b> mỗi người). Thành tựu <b>Trùm Gacha</b> nay yêu cầu đủ 7 nhân vật, thêm thành tựu <b>Mở khóa Bùi Bằng</b>.',
        'Thêm nút <b>⏸ Tạm dừng</b> (phím <b>P</b> hoặc <b>Esc</b>) khi chơi đơn và đánh Boss. Nút tự ẩn ở Solo 1v1 và Racing để không lệch đồng bộ.'
      ]
    },
    {
      version: 'V24.2', title: 'Cân Bằng Nhân Vật · Điều Chỉnh Kỹ Năng', date: '21/11/2026',
      items: [
        'Skin <b>Tiến Trọng Duy</b>: Anh em “Sét” hồi chiêu <b>50 giây</b> (Lv2: 46 giây), thời gian duy trì <b>21 giây</b> (Lv3: 23 giây).',
        '<b>Tô Duy</b>: kỹ năng NINJA được tăng thời gian duy trì ở Lv3 từ 12 lên <b>13 giây</b>.',
        '<b>Quang</b>: GOD RIDER được tăng thời gian lái mô tô ở Lv3 từ 4,5 lên <b>5 giây</b>.'
      ]
    },
    {
      version: 'V24.2', title: 'Black Friday · Trọng Riding · Cân bằng Duy Quân đội', date: '22/11/2026',
      items: [
        'Ra mắt nhân vật giới hạn <b>Trọng Riding</b> 🐎 (biến thể của Trọng “Sét”): <i>Chiến Mã Sấm Sét</i> với mạng kép, bỏ ngựa chạy lấy người khi va chạm và gọi lại Chiến Mã sau khi thanh đầy.',
        'Mở bán <b>BLACK FRIDAY · LIMITED</b> trong 6 ngày tại <b>Shop → Đặc Biệt</b>: giá sale <b>💎 150</b> (gốc 💎 200).',
        'Cân bằng <b>Duy Quân đội</b>: đồng đội hộ vệ sau Chi viện chỉ ở lại tối đa <b>15 giây</b>, nhấp nháy 3 giây cuối để cảnh báo.'
      ]
    },
    {
      version: 'V24.1', title: 'Chào Mừng 20/11 · Tiến Trọng Duy Nhảy Kép · Bot Ghép Trận', date: '19/11/2026',
      items: [
        'Ra mắt <b>Sự kiện 4 ngày chào mừng Ngày Nhà Giáo Việt Nam 20/11</b> 🎓: hoàn thành nhiệm vụ Day 1–3 (Day 4 cày bù) để thu thập điểm <b>💯</b> và đổi tới <b>💎 300 Crystal</b>, Key Mini-game cùng nhiều Coin.',
        'Sự kiện cộng đồng <b>67.000 điểm</b> trước đó vẫn được giữ lại ở tab riêng trong mục Sự Kiện để người chơi nhận bù các mốc thưởng đã đạt sau khi kết thúc.',
        'Nâng cấp Skin <b>Tiến Trọng Duy</b>: giữ nguyên kỹ năng chủ động <b>Nhảy kép</b> (kèm hiệu ứng Lv2, Lv3) song song với chiêu <i>Anh em “Sét”</i>.',
        'Thêm hệ thống <b>Bot NPC tự động ghép trận sau 15 giây</b> chờ ở cả hai chế độ <b>Racing</b> và <b>Solo 1v1</b>, giúp vào trận ngay cả khi vắng người.'
      ]
    },
    {
      version: 'V24', title: 'Ông Hai · Lào Thủ Tu Tiên', date: '19/11/2026',
      items: [
        'Nhân vật Gacha thứ sáu <b>Ông Hai</b> 🚬 với kỹ năng tự kích hoạt <i>LÀO THỦ TU TIÊN</i>: hồi 30s, bay trên điếu cày 15s, <b>miễn nhiễm 100%</b> và nhả vòng khói hất văng vật cản tầm trung/cao.',
        'Cuối chiêu quay ngẫu nhiên: <b>60% Êm ái</b> (hồi chiêu -15%) · <b>30% Say thuốc tu tiên</b> (+5–12s bay, khói vàng) · <b>10% Tắt điếu</b> (hạ cánh thường).',
        'Nâng cấp: Lv2 400 Coin hồi 30→27s; Lv3 1.000 Coin bay 15→17s; Lv4 1.600 Coin +1 giáp đầu trận.',
        'Tỷ lệ Gacha nhóm nhân vật 15% chia đều cho 6 nhân vật: <b>2,5% mỗi người</b>.'
      ]
    },
    {
      version: 'V23', title: 'Phát · Hoàng Hôn · Biển Hiệu Mới', date: '18/11/2026',
      items: [
        'Nhân vật Gacha thứ năm <b>Phát</b> ⚡ với kỹ năng chủ động <i>TÍCH NỘ QUYỀN</i>: thanh kỹ năng không chạy theo thời gian mà nạp Nộ khi <b>vượt chướng ngại vật (+10)</b>, né đạn / tên lửa Boss (+10) và mỗi <b>250m (+10)</b> (hiện chữ C₆H₁₂O₆).',
        'Đủ Nộ thì bấm nút kích hoạt trên màn hình (hoặc phím <b>E / S</b>); nếu lỡ va chạm lúc đang đầy Nộ, kỹ năng tự bật để cứu nguy. Đang bật chiêu thì không tích thêm Nộ.',
        'Kỹ năng kéo dài 13 giây, <b>miễn nhiễm va chạm 100%</b> và quay ngẫu nhiên: <b>50% ∫ f(x)dx</b> (lấp hố nước, xóa vật cản tầm thấp) · <b>30% C₁₂H₂₂O₁₁</b> (×2 Coin, không ×2 điểm) · <b>20% P = 0.2</b> (vật cản → +35 Coin/vật, hồi +1 giáp tối đa bằng giáp đầu trận).',
        'Nâng cấp Phát: Lv2 400 Coin giảm Nộ cần từ 100 xuống 85; Lv3 1.000 Coin duy trì 13→16 giây; Lv4 1.600 Coin thêm 1 giáp đầu trận.',
        'Tỷ lệ Gacha nhóm nhân vật 15% chia đều cho 5 nhân vật: <b>3% Tô Duy · Duy Quân đội · Triều · Tân · Phát</b>.',
        '<b>Lộ trình map</b> 3.000m → 6.000m → 10.000m được bốc thăm sẵn từ đầu ván. Thêm <b>Bãi Biển Hoàng Hôn</b> 🌅: trời cam tím, mặt trời hạ thấp, nhịp độ nhanh hơn một chút.',
        'Cân bằng Bãi Biển: vật cản ra dày hơn một chút, hố nước rộng hơn. Biển hiệu có 3 loại: <b>treo cao</b> (chạy dưới), <b>cắm sát đất</b> (nhảy qua) và <b>treo tầm giữa</b> — khi bạn lại gần sẽ trượt lên cao hoặc sập xuống đất theo mũi tên cảnh báo!'
      ]
    },
    {
      version: 'V22', title: 'Bãi Biển · Tân · Sự Kiện Toàn Cầu', date: '17/11/2026',
      items: [
        'Ra mắt <b>Map Bãi Biển</b> 🏖️: đạt 3.000 điểm, game chọn ngẫu nhiên 50/50 giữa <b>Map City</b> và <b>Map Bãi Biển</b>.',
        'Bãi Biển có <b>hố nước</b> cắt ngang mặt đường (nhỏ và lớn, viền bọt sóng): phải nhảy qua, rơi xuống nước sẽ mất giáp bảo hộ (nảy lên) hoặc thua. Kỹ năng miễn nhiễm vẫn đi qua an toàn.',
        'Thêm <b>dù che nắng</b> (nhảy qua) và <b>biển hiệu lớn treo cao</b>: chạy bên dưới thì an toàn, nhưng nhảy lên sẽ đụng bảng!',
        'Nhân vật Gacha thứ tư <b>Tân</b> 🧹 với kỹ năng tự kích hoạt <i>NÉM CHỔI</i>: miễn nhiễm va chạm và liên tục ném chổi xoay hất văng mọi chướng ngại, kể cả tên lửa Boss.',
        'Tân: hồi chiêu 27 giây · duy trì 13 giây. Lv2 400 Coin hồi chiêu 27→24 giây; Lv3 1.000 Coin duy trì 13→15 giây; Lv4 1.600 Coin thêm 1 giáp.',
        'Tỷ lệ Gacha nhóm nhân vật 15% chia đều cho 4 nhân vật: <b>3,75% Tô Duy · Duy Quân đội · Triều · Tân</b> (trùng hoàn 💎 10).',
        '<b>🎉 Sự kiện cộng đồng toàn cầu 3 ngày</b>: cả server cùng chạy đến <b>67.000 điểm</b>, nhận Crystal / Key theo 6 mốc. Cần kỷ lục từ 1.000 điểm để tham gia.',
        'Giftcode mới <b>tannoprime</b>: 💎 35 + 🪙 600. Giftcode giờ còn đọc được từ Firebase nên có thể thêm mã nóng bất cứ lúc nào.',
        'Gọn gàng hơn: sảnh chỉ còn 8 nút. <b>Nhiệm vụ</b> gộp Hằng ngày · Thử thách · Thành tựu; <b>Shop</b> gộp thêm Túi đồ; <b>News</b> gộp thêm Giftcode.',
        'Giao diện nâng cấp của Triều và Tân đổi sang tông đỏ giống Tô Duy &amp; Duy Quân đội.'
      ]
    },
    {
      version: 'V21', title: 'Triều — Vua Lý Thuyết', date: '16/11/2026',
      items: [
        'Giảm giá mở khóa nhân vật <b>Tiến</b> tại Shop → Đặc Biệt từ 🪙 15.000 còn <b>🪙 10.000 Coin</b>.',
        'Ra mắt nhân vật Gacha thứ ba <b>Triều</b> 👑 với kỹ năng tự kích hoạt <i>VUA LÝ THUYẾT</i>; sở hữu vĩnh viễn sau khi quay trúng, trùng nhân vật hoàn <b>💎 10 Crystal</b>.',
        'Tỷ lệ nhóm nhân vật Gacha 15% được chia đều: <b>5% Tô Duy · 5% Duy Quân đội · 5% Triều</b>. Tỷ lệ Key Mini-game vẫn là 5%.',
        'Nâng cấp Triều: Lv2 400 Coin giảm hồi chiêu 36→31 giây; Lv3 1.000 Coin tăng duy trì 14→17 giây; Lv4 1.600 Coin thêm 1 giáp.',
        'Nội tại theo điểm: 2.000 điểm hồi chiêu -1 giây; 3.000 điểm duy trì +1 giây; 4.000 điểm hồi chiêu -2 giây; 5.000 điểm duy trì +1 giây.',
        'Chữ <b>VUA LÝ THUYẾT</b> tiến hóa màu sắc/kích cỡ theo điểm và hất văng chướng ngại vật, kể cả tên lửa Boss, trong thời gian kỹ năng.'
      ]
    },
    {
      version: 'V20.1', title: 'Thử Thách 3 Ngày', date: '15/11/2026',
      items: [
        'Ra mắt tính năng <b>Thử Thách 🎯</b> ngay tại sảnh: mở khóa khi đạt kỷ lục <b>1.000 điểm</b>.',
        'Mỗi đợt có <b>2 thử thách ngẫu nhiên</b> (không trùng loại), tự làm mới sau <b>mỗi 3 ngày</b> — popup hiển thị đếm ngược.',
        'Hoàn thành để nhận <b>💎 Crystal</b> (15–30 💎): đạt điểm với Duy / Trọng “Sét”, săn Coin, chạy đường dài, ra trận với đủ 4 vật phẩm…',
        'Thử thách <b>Độc cô cầu bại</b> chỉ xuất hiện khi đã mở khóa Boss: hạ Xe Tăng không dùng vật phẩm hỗ trợ và không mất tim nào.',
        'Chấm đỏ trên nút Thử Thách báo khi có phần thưởng chưa nhận.'
      ]
    },
    {
      version: 'V20', title: 'Bảng Xếp Hạng Thế Giới', date: '15/11/2026',
      items: [
        'Ra mắt <b>Bảng xếp hạng thế giới</b> 🏆 tích hợp Firebase, kèm dàn NPC thử thách.',
        'Tối ưu hiển thị đội hình 3 người cho Skin <b>Tiến Trọng Duy</b>: cả ba luôn chạy cùng nhau từ đầu trận.',
        'Ra mắt nhân vật thứ 6 <b>Tiến</b>, bán vĩnh viễn tại <b>Shop → Đặc Biệt</b> (🪙 15.000) với kỹ năng chủ động <i>Nhảy kép</i>: bấm nhảy thêm 1 lần trên không, hồi lại khi chạm đất, nóc xe hoặc giàn giáo.',
        'Skin <b>Tiến Trọng Duy</b> bán tại <b>Shop → Cao Cấp</b> (💎 20 hoặc 🪙 7.500, cần có Tiến): kỹ năng <i>Anh em “Sét”</i> triệu hồi Duy &amp; Trọng “Sét” chạy cùng, miễn nhiễm va chạm và phóng sét phá chướng ngại.',
        'Mặc / Tháo skin ngay tại thẻ Tiến trong <b>Nhân vật &amp; Nâng cấp</b>; Tiến nâng cấp Lv2–Lv4 với tổng 🪙 3.000.',
        '<b>Boss Xe Tăng khó hơn</b>: đạn pháo &amp; tên lửa nhanh hơn, ra chiêu dồn dập, bắn loạt 2–3 tên lửa so le độ cao.',
        'Phase 2 xuất hiện <b>giàn giáo</b> kèm đòn quét sát đất buộc nhảy lên cao; thưởng hòm bom 💣 ở cuối giàn giáo.',
        'Thành tựu <b>Đội hình tối thượng</b> cố định: nâng đủ 5 nhân vật bất kỳ lên Lv4.'
      ]
    },
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
  // V22: popup News có 2 tab — Bảng tin / Giftcode (giao diện Giftcode do league.js dựng vào #giftPane)
  function selectNewsTab(name) {
    document.querySelectorAll('#newsModal [data-ntab]').forEach(t => t.classList.toggle('is-selected', t.dataset.ntab === name));
    $('newsPane').hidden = name !== 'news';
    $('giftPane').hidden = name !== 'gift';
  }
  function openNewsModal(tab = 'news') {
    renderNews();
    openModal(newsModal, openNewsBtn);
    selectNewsTab(tab);
    lsWrite(LS.seenVersion, NEWS_LATEST);
    updateNewsDot();
  }
  document.querySelectorAll('#newsModal [data-ntab]').forEach(t => t.addEventListener('click', () => selectNewsTab(t.dataset.ntab)));
  openNewsBtn.addEventListener('click', () => openNewsModal());

  // ================= BẢNG XẾP HẠNG THẾ GIỚI (Firebase Realtime Database) =================
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBcLojXrplp7nhTsG4w_Jt_e4t7_yVVnBA',
    authDomain: 'duy-map-chay-di.firebaseapp.com',
    databaseURL: 'https://duy-map-chay-di-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'duy-map-chay-di',
    storageBucket: 'duy-map-chay-di.firebasestorage.app',
    messagingSenderId: '122497729882',
    appId: '1:122497729882:web:e5494121869a59682e9f63'
  };
  const LB_KEY_UID = 'duyMapChayDiUid';
  const LB_KEY_NAME = 'duyMapChayDiName';
  const LB_TOP = 15;
  const LB_NPCS = [
    { id: 'npc_ong_duy_chan_pa', name: 'Ông Duy Chan Pa', score: 333, character: 'Duy' },
    { id: 'npc_viet_quat', name: 'Việt quất', score: 3636, character: 'Mu Rát' },
    { id: 'npc_t_burh_tv', name: 'T Burh TV', score: 200, character: 'Trọng “Sét”' }
  ];
  const LB_MEDALS = ['🥇', '🥈', '🥉'];

  let lbDb = null;
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      lbDb = firebase.database();
    }
  } catch (err) { console.warn('Không khởi tạo được Firebase:', err); }

  const lbStoreGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lbStoreSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* storage may be disabled */ } };
  const lbNow = () => firebase.database.ServerValue.TIMESTAMP;

  function lbMakeUid() {
    try {
      const a = new Uint8Array(10);
      crypto.getRandomValues(a);
      return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('');
    } catch (_) {
      return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    }
  }
  let lbUid = lbStoreGet(LB_KEY_UID);
  if (!lbUid) { lbUid = lbMakeUid(); lbStoreSet(LB_KEY_UID, lbUid); }

  function lbPlayerName() {
    const saved = (lbStoreGet(LB_KEY_NAME) || '').trim().slice(0, 16);
    return saved || `Runner #${lbUid.slice(-4)}`;
  }

  // Đẩy điểm: chỉ ghi khi cao hơn điểm đang có trên server (không bao giờ làm tụt kỷ lục)
  function lbSubmitScore(rawScore) {
    if (!lbDb) return;
    const value = Math.floor(Number(rawScore));
    if (!Number.isFinite(value) || value <= 0) return;
    const payload = { name: lbPlayerName(), score: value, character: charName(selectedCharacter), avatar: currentAvatar(), updatedAt: lbNow() }; // [PROFILE]
    lbDb.ref('leaderboard/' + lbUid)
      .transaction((cur) => (cur && Number(cur.score) >= value ? undefined : payload))
      .catch((err) => console.warn('Không đẩy được điểm:', err));
  }

  // Đổi tên: lưu local + cập nhật Firebase, giữ nguyên score cũ
  function lbSaveName(rawName) {
    const name = String(rawName || '').replace(/\s+/g, ' ').trim().slice(0, 16);
    if (!name) return null;
    lbStoreSet(LB_KEY_NAME, name);
    if (lbDb) {
      const ref = lbDb.ref('leaderboard/' + lbUid);
      ref.once('value').then((snap) => {
        if (snap.exists()) return ref.update({ name, avatar: currentAvatar(), updatedAt: lbNow() }); // [PROFILE]
        if (best > 0) return ref.set({ name, score: Math.floor(best), character: charName(selectedCharacter), avatar: currentAvatar(), updatedAt: lbNow() }); // [PROFILE]
        return null; // chưa có điểm: tên sẽ được gửi cùng kỷ lục đầu tiên
      }).catch((err) => console.warn('Không cập nhật được tên:', err));
    }
    return name;
  }

  // Nạp NPC mặc định (chỉ ghi nếu node chưa tồn tại)
  function lbSeedNpcs() {
    if (!lbDb) return;
    LB_NPCS.forEach((n) => {
      lbDb.ref('leaderboard/' + n.id)
        .transaction((cur) => (cur === null ? { name: n.name, score: n.score, character: n.character, updatedAt: lbNow() } : undefined))
        .catch((err) => console.warn('Không nạp được NPC:', err));
    });
  }
  lbSeedNpcs();

  // ----- Giao diện popup -----
  const lbModal = $('leaderboardModal');
  const lbList = $('lbList');
  const lbNameInput = $('lbNameInput');
  const lbNameSave = $('lbNameSave');
  const lbStatus = $('lbStatus');
  let lbListening = false;

  function lbSetStatus(text) { lbStatus.textContent = text || ''; lbStatus.style.display = text ? 'block' : 'none'; }
  function lbEl(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // [PROFILE] Helper chọn avatar cho 1 dòng BXH (NPC/bản cũ chưa có avatar → suy từ tên nhân vật)
  function lbAvatarKey(row) {
    if (row.avatar && characters[row.avatar]) return row.avatar;
    return Object.keys(characters).find((k) => characters[k].name === row.character || upgradeConfig[k]?.name === row.character) || 'duy';
  }

  function lbRender(rows) {
    lbList.textContent = '';
    if (!rows.length) { lbList.appendChild(lbEl('p', 'lb-empty', 'Chưa có ai trên bảng xếp hạng. Hãy lập kỷ lục đầu tiên!')); return; }
    rows.forEach((row, i) => {
      const item = lbEl('div', 'lb-row' + (i < 3 ? ` is-top${i + 1}` : '') + (row.id === lbUid ? ' is-me' : ''));
      item.appendChild(i < 3 ? lbEl('span', 'lb-rank', LB_MEDALS[i]) : lbEl('span', 'lb-rank px', String(i + 1)));
      // [PROFILE]
      const avBox = lbEl('span', 'lb-avatar');
      const avImg = document.createElement('img');
      avImg.alt = ''; avImg.src = characters[lbAvatarKey(row)].src;
      avBox.appendChild(avImg);
      item.appendChild(avBox);
      const info = lbEl('div', 'lb-info');
      const nameEl = lbEl('strong', '', row.name);
      if (row.id.indexOf('npc_') === 0) nameEl.appendChild(lbEl('span', 'lb-npc', 'NPC'));
      info.appendChild(nameEl);
      info.appendChild(lbEl('small', '', row.character));
      item.appendChild(info);
      item.appendChild(lbEl('span', 'lb-score px', row.score.toLocaleString('vi-VN')));
      lbList.appendChild(item);
    });
  }

  function lbListen() {
    if (lbListening) return;
    if (!lbDb) { lbSetStatus('Chưa kết nối được Firebase. Kiểm tra mạng rồi mở lại.'); return; }
    lbListening = true;
    lbSetStatus('Đang tải bảng xếp hạng...');
    lbDb.ref('leaderboard').orderByChild('score').limitToLast(LB_TOP).on('value', (snap) => {
      const rows = [];
      snap.forEach((child) => {
        const v = child.val() || {};
        rows.push({
          id: String(child.key),
          name: String(v.name || 'Runner').slice(0, 16),
          score: Math.floor(Number(v.score)) || 0,
          character: String(v.character || 'Duy'),
          avatar: characters[v.avatar] ? v.avatar : ''   // [PROFILE]
        });
      });
      rows.reverse(); // giảm dần
      lbSetStatus('');
      lbRender(rows);
    }, (err) => {
      lbListening = false;
      console.warn('Lỗi đọc bảng xếp hạng:', err);
      lbSetStatus('Không tải được bảng xếp hạng. Kiểm tra mạng hoặc Rules của Firebase.');
    });
  }

  function openLeaderboardModal() {
    lbNameInput.value = lbPlayerName();
    lbSetStatus('');
    openModal(lbModal, $('openLeaderboard'));
    lbListen();
  }
  function handleSaveName() {
    const name = lbSaveName(lbNameInput.value);
    if (!name) { lbSetStatus('Tên không được để trống.'); return; }
    lbNameInput.value = name;
    lbSetStatus(`Đã lưu tên: ${name}`);
    renderProfileChip(); // [PROFILE]
  }
  $('openLeaderboard').addEventListener('click', openLeaderboardModal);
  lbNameSave.addEventListener('click', handleSaveName);
  lbNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveName(); } });

  // =====================================================================
  // [PROFILE] Hồ sơ người chơi & chọn Avatar
  // =====================================================================
  const PROFILE_TITLES = [
    { min: 20000, name: 'Huyền Thoại MVP' },
    { min: 10000, name: 'Vua Sinh Tồn' },
    { min: 5000, name: 'Chiến Thần Tốc Độ' },
    { min: 1000, name: 'Người Chạy Phố Thị' },
    { min: 0, name: 'Tân Binh Tập Chạy' }
  ];
  const profileTitle = () => PROFILE_TITLES.find((t) => best >= t.min).name;
  const pfEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  function profileFavorite() {
    let key = null, max = 0;
    Object.keys(achv.charUsage).forEach((k) => {
      if (characters[k] && achv.charUsage[k] > max) { max = achv.charUsage[k]; key = k; }
    });
    return key ? { key, runs: max } : null;
  }

  function renderProfileChip() {
    const img = $('profileChipImg'), nm = $('profileChipName');
    if (!img || !nm) return;
    img.src = characters[currentAvatar()].src;
    nm.textContent = lbPlayerName();
  }

  function renderProfile() {
    const av = currentAvatar();
    $('profileAvatarImg').src = characters[av].src;
    $('profileTitle').textContent = profileTitle();

    $('profileAvatarGrid').innerHTML = Object.keys(characters).map((key) => {
      const src = characters[key].src;
      if (!isCharUnlocked(key)) {
        return `<div class="pf-av is-locked" aria-label="Chưa mở khóa"><img src="${src}" alt=""><span class="pf-lock" aria-hidden="true">🔒</span></div>`;
      }
      return `<button class="pf-av${key === av ? ' is-on' : ''}" type="button" data-avatar="${key}" aria-label="${pfEsc(charName(key))}"><img src="${src}" alt=""></button>`;
    }).join('');

    const fav = profileFavorite();
    $('profileFav').innerHTML = fav
      ? `<img src="${characters[fav.key].src}" alt=""><div><small>NHÂN VẬT TỦ</small><strong>${pfEsc(charName(fav.key))}</strong><span class="px">${fmt(fav.runs)} ván</span></div>`
      : `<div><small>NHÂN VẬT TỦ</small><strong>Chưa có dữ liệu</strong><span>Chơi vài ván để mở thẻ này</span></div>`;

    const stats = [
      ['🏆', 'KỶ LỤC CAO NHẤT', `${fmt(best)}m`],
      ['🛣️', 'TỔNG QUÃNG ĐƯỜNG', `${fmt(achv.totalMeters)}m`],
      ['🎮', 'SỐ VÁN ĐÃ CHƠI', fmt(achv.totalRuns)],
      ['🎖️', 'BOSS XE TĂNG ĐÃ HẠ', fmt(achv.bossWins)],
      ['✨', 'SỐ LẦN DÙNG KỸ NĂNG', fmt(achv.totalSkillsUsed)],
      ['🌈', 'SÒ NUI 7 MÀU ĐÃ ĂN', fmt(achv.rainbowCount)]
    ];
    $('profileStats').innerHTML = stats.map(([ico, label, val]) =>
      `<div class="pf-stat"><span class="pf-stat-ico" aria-hidden="true">${ico}</span><small>${label}</small><strong class="px">${val}</strong></div>`
    ).join('');
  }

  function openProfileModal() {
    $('profileNameInput').value = lbPlayerName();
    $('profileStatus').textContent = '';
    $('profileAvatarPicker').hidden = true;
    renderProfile();
    openModal($('profileModal'), $('openProfile'));
  }
  function profileSaveName() {
    const name = lbSaveName($('profileNameInput').value);
    if (!name) { $('profileStatus').textContent = 'Tên không được để trống.'; return; }
    $('profileNameInput').value = name;
    $('profileStatus').textContent = `Đã lưu tên: ${name}`;
    renderProfileChip();
  }

  $('openProfile').addEventListener('click', openProfileModal);
  $('profileAvatarBtn').addEventListener('click', () => { const p = $('profileAvatarPicker'); p.hidden = !p.hidden; });
  $('profileAvatarGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-avatar]');
    if (!b || !isCharUnlocked(b.dataset.avatar)) return;
    selectedAvatar = b.dataset.avatar;
    try { localStorage.setItem(AVATAR_KEY, selectedAvatar); } catch (_) { /* storage may be disabled */ }
    lbSaveName(lbPlayerName());          // đẩy avatar mới lên Firebase
    renderProfile();
    renderProfileChip();
    $('profileAvatarPicker').hidden = true;
  });
  $('profileNameSave').addEventListener('click', profileSaveName);
  $('profileNameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); profileSaveName(); } });

  function toLobby(openUpgrades = false) {
    clearTimeout(overTimer);
    if (typeof paused !== 'undefined' && paused) { paused = false; lastTime = 0; document.getElementById('pauseOverlay')?.classList.remove('show'); }
    state = 'ready';
    bossMode = false;
    gameScreen.classList.remove('boss-mode');
    gameOver.hidden = true;
    showScreen('lobby');
    setMusicTrack('default');   // V25: rời trận → trả nhạc nền thường
    updateLobby();
    renderCharacterCards();
    if (openUpgrades) openCharacterModal();
  }
  playButton.addEventListener('click', () => startGame());
  openCharactersBtn.addEventListener('click', openCharacterModal);
  openHelpBtn.addEventListener('click', openHelpModal);
    function retryRun() {
    if (bossMode) { toLobby(false); openMiniModal(); }
    else startGame();
    }
  retryButton.addEventListener('click', () => retryRun());
  backLobbyButton.addEventListener('click', () => toLobby(!bossMode));

  function awardCoinsForScore() {
    const whole = Math.floor(score);
    const distanceCoins = Math.floor(whole / 20) - Math.floor(lastCoinScore / 20);
    const reachedMilestone = Math.floor(whole / 1000);
    const bonusCoins = Math.max(0, reachedMilestone - bonusMilestone) * 100;
    if (distanceCoins > 0 || bonusCoins > 0) {
      const coinMult = (runItems.magnet || phatSugarOn()) ? 2 : 1; // V23: ×2 Coin vật phẩm hoặc hiệu ứng C₁₂H₂₂O₁₁ của Phát (không cộng dồn)
      const gained = (Math.max(0, distanceCoins) + bonusCoins) * coinMult;
      coinBalance += gained;
      runCoins += gained;
      lastCoinScore = whole;
      bonusMilestone = reachedMilestone;
      saveEconomy();
      if (bonusCoins > 0) showToast(`MỐC ${fmt(reachedMilestone * 1000)} ĐIỂM! +${bonusCoins * coinMult} COIN THƯỞNG`);
    } else if (whole > lastCoinScore) lastCoinScore = whole;
  }

  // =====================================================================
  // V15 — Crystal · Nhiệm vụ hằng ngày · Gacha · Túi vật phẩm · Mini-game
  // =====================================================================
  const ITEMS = {
    shield: { icon: '🛡️', name: '+1 chống chịu', desc: 'Chịu thêm 1 va chạm trong 1 màn.', price: 2500 },
    magnet: { icon: '🪙', name: '×2 Coin', desc: 'Nhân đôi Coin nhận được trong 1 màn.', price: 600 },
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
    [lobbyCoin, modalCoin, $('questCoin'), $('challengeCoin'), $('gachaCoin'), $('shopCoin')].forEach(el => { if (el) el.textContent = coinText; });
    [lobbyCrystal, $('questCrystal'), $('challengeCrystal'), $('gachaCrystal'), $('shopCrystal')].forEach(el => { if (el) el.textContent = crystalText; });
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
    if (racingMode) { // RACING: cấm vật phẩm hỗ trợ, không trừ túi đồ, giữ nguyên trạng thái trang bị
      runItems = { shield: false, magnet: false, hourglass: false, duration: false };
      hourglassRun = false;
      durationRun = false;
      return;
    }
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
  // V22: chấm đỏ của nút NHIỆM VỤ gộp cả Hằng ngày + Thử thách; mỗi tab có chấm riêng.
  const questTabDot = $('questTabDot');
  function updateQuestDot() {
    if (!questData) return;
    const claimable = questData.quests.some(q => !q.claimed && q.progress >= q.target);
    const bonus = questsAllClaimed() && !questData.bonusClaimed;
    const dailyDot = claimable || bonus;
    const challengeDotOn = challengeUnlocked() && challengeHasClaimable();
    questDot.hidden = !(dailyDot || challengeDotOn);
    if (questTabDot) questTabDot.hidden = !dailyDot;
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

  // ---------- V20.1: Thử thách (CHALLENGE) — 2 nhiệm vụ / 3 ngày, thưởng Crystal ----------
  const CHALLENGE_UNLOCK = 1000;
  const CHALLENGE_PERIOD = 3 * 24 * 60 * 60 * 1000; // 3 ngày (ms), mốc theo timestamp hệ thống
  const CHALLENGE_POOL = {
    duy:   { icon: '🏃', title: 'Thử thách Duy', desc: 'Dùng Duy đạt 3.600 điểm trong một màn chạy thường', target: 3600, reward: 15, unit: 'm' },
    trong: { icon: '⚡', title: 'Thử thách Trọng “Sét”', desc: 'Dùng Trọng “Sét” đạt 4.000 điểm trong một màn chạy thường', target: 4000, reward: 15, unit: 'm' },
    coin:  { icon: '🪙', title: 'Thợ săn tiền vàng', desc: 'Kiếm được 2.000 Coin trong một màn chạy thường', target: 2000, reward: 25, unit: '' },
    peak:  { icon: '🏔️', title: 'Chinh phục đỉnh cao', desc: 'Đạt 5.000 điểm trong một màn chạy thường', target: 5000, reward: 20, unit: 'm' },
    total: { icon: '🛣️', title: 'Đường dài bền bỉ', desc: 'Chạy tích lũy tổng cộng 10.000 điểm qua nhiều màn chạy thường', target: 10000, reward: 20, unit: 'm' },
    gear:  { icon: '🎒', title: 'Trang bị tận răng', desc: 'Dùng cùng lúc cả 4 vật phẩm hỗ trợ trong một màn chạy thường', target: 1, reward: 15, unit: '' },
    solo:  { icon: '🛡️', title: 'Độc cô cầu bại', desc: 'Đánh bại Boss Xe Tăng mà không dùng vật phẩm hỗ trợ nào và không mất tim nào', target: 1, reward: 30, unit: '', needBoss: true }
  };
  const challengeCycle = (now = Date.now()) => Math.floor(now / CHALLENGE_PERIOD);
  const challengeUnlocked = () => best >= CHALLENGE_UNLOCK;
  function generateChallenge(cycle) {
    const types = Object.keys(CHALLENGE_POOL).filter(t => !CHALLENGE_POOL[t].needBoss || bossUnlocked);
    for (let i = types.length - 1; i > 0; i--) { // xáo trộn Fisher–Yates
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    return { cycle, quests: types.slice(0, 2).map(type => ({ type, progress: 0, claimed: false })) };
  }
  function saveChallenge() { lsWrite(LS.challenge, challengeData); }
  // Trả về true nếu vừa tạo đợt thử thách mới (sang chu kỳ 3 ngày mới / dữ liệu chưa có hoặc hỏng).
  function ensureChallenge() {
    const cycle = challengeCycle();
    const saved = challengeData || lsRead(LS.challenge, null);
    const valid = saved && saved.cycle === cycle && Array.isArray(saved.quests) && saved.quests.length === 2 &&
      saved.quests.every(q => q && CHALLENGE_POOL[q.type] && Number.isFinite(q.progress)) &&
      saved.quests[0].type !== saved.quests[1].type;
    if (valid) { challengeData = saved; return false; }
    challengeData = generateChallenge(cycle);
    saveChallenge();
    return true;
  }
  function challengeTarget(q) { return CHALLENGE_POOL[q.type].target; }
  // Gọi khi kết thúc một màn chạy thường (kể cả khi chưa mở khóa Thử thách thì không tính tiến độ).
  function commitChallengeRun(finalScore) {
    if (!challengeUnlocked()) return;
    ensureChallenge();
    const meters = Math.floor(finalScore);
    challengeData.quests.forEach(q => {
      if (q.claimed) return;
      const cap = challengeTarget(q);
      if (q.type === 'duy') { if (selectedCharacter === 'duy') q.progress = Math.min(cap, Math.max(q.progress, meters)); }
      else if (q.type === 'trong') { if (selectedCharacter === 'trong') q.progress = Math.min(cap, Math.max(q.progress, meters)); }
      else if (q.type === 'coin') q.progress = Math.min(cap, Math.max(q.progress, runCoins));
      else if (q.type === 'peak') q.progress = Math.min(cap, Math.max(q.progress, meters));
      else if (q.type === 'total') q.progress = Math.min(cap, q.progress + meters);
      else if (q.type === 'gear') { if (runItems.shield && runItems.magnet && runItems.hourglass && runItems.duration) q.progress = 1; }
    });
    saveChallenge();
    updateChallengeButton();
  }
  // Gọi khi kết thúc trận Boss.
  function commitChallengeBoss(win, perfect) {
    if (!challengeUnlocked()) return;
    ensureChallenge();
    if (bossMode && win && perfect) {
      challengeData.quests.forEach(q => { if (q.type === 'solo' && !q.claimed) q.progress = 1; });
      saveChallenge();
    }
    updateChallengeButton();
  }
  function challengeHasClaimable() {
    return !!challengeData && challengeData.quests.some(q => !q.claimed && q.progress >= challengeTarget(q));
  }
  function updateChallengeButton() {
    const unlocked = challengeUnlocked();
    if (challengeLock) challengeLock.hidden = unlocked;
    if (challengeDot) challengeDot.hidden = !(unlocked && challengeHasClaimable());
    const tabBtn = $('qTabChallenge');
    if (tabBtn) tabBtn.classList.toggle('is-locked', !unlocked);
    updateQuestDot();
  }
  function challengeTimeLeftText() {
    const ms = Math.max(0, (challengeCycle() + 1) * CHALLENGE_PERIOD - Date.now());
    const totalMin = Math.ceil(ms / 60000);
    const d = Math.floor(totalMin / 1440), h = Math.floor((totalMin % 1440) / 60), m = totalMin % 60;
    return `${d} ngày ${h} giờ ${String(m).padStart(2, '0')} phút`;
  }
  function renderChallengeTimer() {
    if (challengeTimerEl) challengeTimerEl.innerHTML = `⏳ Làm mới sau: <b>${challengeTimeLeftText()}</b>`;
  }
  function renderChallenge() {
    ensureChallenge();
    refreshCurrencies();
    renderChallengeTimer();
    challengeList.innerHTML = challengeData.quests.map((q, i) => {
      const def = CHALLENGE_POOL[q.type];
      const done = q.progress >= def.target;
      const shown = Math.min(q.progress, def.target);
      const pct = Math.round(shown / def.target * 100);
      let action;
      if (q.claimed) action = '<button class="card-btn select is-on" type="button" disabled>✓ ĐÃ NHẬN</button>';
      else if (done) action = `<button class="card-btn upgrade" type="button" data-claim="${i}">NHẬN 💎 ${def.reward}</button>`;
      else action = `<button class="card-btn upgrade" type="button" disabled>💎 ${def.reward}</button>`;
      return `<div class="quest ${done ? 'done' : ''} ${q.claimed ? 'claimed' : ''}">
        <span class="quest-ico" aria-hidden="true">${def.icon}</span>
        <div class="quest-main"><strong>${def.title}</strong><small class="challenge-desc">${def.desc}</small><div class="achv-bar"><i style="width:${pct}%"></i></div><small>${fmt(shown)}/${fmt(def.target)}${def.unit}</small></div>
        ${action}
      </div>`;
    }).join('');
  }
  challengeList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-claim]');
    if (!btn || btn.disabled) return;
    ensureChallenge();
    const q = challengeData.quests[Number(btn.dataset.claim)];
    if (!q || q.claimed || q.progress < challengeTarget(q)) return;
    q.claimed = true;
    crystals += CHALLENGE_POOL[q.type].reward;
    saveMeta();
    saveChallenge();
    updateLobby();
    renderChallenge();
    playTone(900, 0.14, 'triangle', 0.04);
  });
  setInterval(() => { if (activeModal === questModal && questTab === 'challenge') renderChallengeTimer(); }, 30000);

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
    } else if (roll < 0.95) {
      // nhóm nhân vật 15% (0.80 → 0.95) chia đều cho 7 nhân vật (~2,14% mỗi người)
      rare = true;
      const pool = [
        ['toduy', '🥷', 'Tô Duy'], ['duyquandoi', '🪖', 'Duy Quân đội'], ['trieu', '👑', 'Triều'],
        ['tan', '🧹', 'Tân'], ['phat', '⚡', 'Phát'], ['onghai', '🚬', 'Ông Hai'], ['buibang', '🚗', 'Bùi Bằng']
      ];
      const [ck, icon, nm] = pool[Math.min(pool.length - 1, Math.floor((roll - 0.80) / 0.15 * pool.length))];
      if (owned[ck]) { crystals += 25; text = `${icon} ${nm} (đã sở hữu) → hoàn 💎 25`; }
      else { owned[ck] = true; text = `${icon} NHÂN VẬT MỚI: ${nm}! Đã mở khóa vĩnh viễn`; }
    } else {
      rare = true;
      if (miniKeys < 3) { miniKeys++; text = `🔑 Key Mini-game (${miniKeys}/3)`; }
      else { crystals += 50; text = '🔑 Key Mini-game (đã đủ 3/3) → đền bù 💎 50'; }
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
    window.LimitedEvent?.onGacha?.(count); // V24.1: nhiệm vụ sự kiện 20/11
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
    poor: ['Thiếu Coin rồi, đi chạy thêm đi!', 'Ví mỏng quá… chạy kiếm thêm Coin nhé', 'Đéo đủ coin!'],
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
  function bfItemHTML() {
    const ended = bfEnded();
    const has = !!owned.trongriding;
    const poor = crystals < BF_PRICE_SALE;
    let btn;
    if (has) btn = '<button class="card-btn upgrade shop-buy" type="button" disabled>✓ ĐÃ SỞ HỮU</button>';
    else if (ended) btn = '<button class="card-btn upgrade shop-buy" type="button" disabled>ĐÃ KẾT THÚC SỰ KIỆN</button>';
    else btn = `<button class="card-btn upgrade shop-buy ${poor ? 'is-poor' : ''}" type="button" data-buy-bf="trongriding"><s class="bf-old">💎 ${BF_PRICE_ORIGINAL}</s> <span class="cost">💎 ${BF_PRICE_SALE}</span></button>`;
    const timer = ended ? 'Sự kiện đã kết thúc' : `Còn lại: <b id="bfCountdown">${bfTimeLeftText()}</b>`;
    return `<div class="shop-item shop-char bf-item ${has || ended ? 'is-soldout' : ''}">
        <span class="shop-thumb-wrap"><img class="shop-thumb" src="assets/trong-riding.png" alt="Trọng Riding"></span>
        <div class="shop-item-main"><span class="bf-badge">BLACK FRIDAY · LIMITED</span>
          <strong>Trọng Riding <em class="shop-tag">LIMITED</em></strong>
          <p><b>CHIẾN MÃ SẤM SÉT</b>: cưỡi ngựa bật Sét Gầm phá chướng ngại và miễn nhiễm va chạm. Trúng vật cản khi cưỡi thì bỏ ngựa chạy lấy người, không mất giáp.</p>
          <small class="bf-timer">${timer}</small></div>
        ${btn}
      </div>`;
  }
  function buyTrongRiding() {
    if (owned.trongriding) { shopSay('soldout'); renderShop(); return; }
    if (bfEnded()) { showToast('Sự kiện Black Friday đã kết thúc.'); renderShop(); return; }
    if (crystals < BF_PRICE_SALE) { shopSay('poor'); showToast(`Chưa đủ Crystal: cần 💎 ${BF_PRICE_SALE} để mở khóa Trọng Riding.`); return; }
    crystals -= BF_PRICE_SALE;
    owned.trongriding = true;
    saveMeta(); updateLobby(); renderCharacterCards(); renderShop(); shopSay('buy');
    playUiSound('claim');
    showToast('TRỌNG RIDING ĐÃ ĐƯỢC MỞ KHÓA! Chiến Mã Sấm Sét đã có trong danh sách nhân vật.');
  }
  // Cập nhật đồng hồ đếm ngược Black Friday mỗi giây khi Shop đang mở
  setInterval(() => {
    const el = document.getElementById('bfCountdown');
    if (el) el.textContent = bfTimeLeftText();
  }, 1000);
  function renderShop() {
    ensureShop();
    refreshCurrencies();
    document.querySelectorAll('.stab').forEach(t => t.classList.toggle('is-selected', t.dataset.stab === shopTab));
    // V22: Túi đồ là tab thứ 4 của Shop (giữ nguyên thanh vật phẩm đang trang bị ở sảnh)
    const bagTab = shopTab === 'bag';
    shopBody.hidden = bagTab;
    bagPane.hidden = !bagTab;
    if (bagTab) { renderBag(); return; }
    if (shopTab === 'special') {
      // Nhân vật Tiến và Quang được bán vĩnh viễn tại Shop → Đặc Biệt.
      const hasTien = !!owned.tien, hasQuang = !!owned.quang;
      const tienLabel = hasTien ? '✓ ĐÃ SỞ HỮU' : `MUA <span class="cost">🪙 ${fmt(TIEN_PRICE)}</span>`;
      const quangLabel = hasQuang ? '✓ ĐÃ SỞ HỮU' : `MUA <span class="cost">🪙 ${fmt(QUANG_PRICE)}</span>`;
      shopBody.innerHTML = `<div class="shop-list">
        ${bfItemHTML()}
        <div class="shop-item shop-char ${hasTien ? 'is-soldout' : ''}">
          <span class="shop-thumb-wrap"><img class="shop-thumb" src="assets/tien.png" alt="Tiến"></span>
          <div class="shop-item-main"><strong>Tiến <em class="shop-tag">NHÂN VẬT</em></strong>
            <p>Kỹ năng <b>NHẢY KÉP</b>: bấm nhảy thêm 1 lần trên không; lượt nhảy tự hồi khi chạm đất, nóc xe buýt hoặc giàn giáo.</p>
            <small>Mua một lần · mở khóa vĩnh viễn</small></div>
          <button class="card-btn upgrade shop-buy ${coinBalance < TIEN_PRICE && !hasTien ? 'is-poor' : ''}" type="button" data-buy-char="tien" ${hasTien ? 'disabled' : ''}>${tienLabel}</button>
        </div>
        <div class="shop-item shop-char ${hasQuang ? 'is-soldout' : ''}">
          <span class="shop-thumb-wrap"><img class="shop-thumb" src="assets/quang.png" alt="Quang"></span>
          <div class="shop-item-main"><strong>Quang <em class="shop-tag">NHÂN VẬT HUYỀN THOẠI</em></strong>
            <p><b>GOD RIDER</b>: cưỡi siêu mô tô tăng tốc ngẫu nhiên 1,45× – 2,0× trong 3,5 giây (Lv3: 5 giây), miễn nhiễm va chạm, cán văng chướng ngại và lướt qua hố nước.</p>
            <small>Mua một lần · mở khóa vĩnh viễn · nâng cấp riêng đến Lv4</small></div>
          <button class="card-btn upgrade shop-buy ${coinBalance < QUANG_PRICE && !hasQuang ? 'is-poor' : ''}" type="button" data-buy-char="quang" ${hasQuang ? 'disabled' : ''}>${quangLabel}</button>
        </div>
      </div>`;
      return;
    }
    if (shopTab === 'premium') {
      // V20 — Tab Cao Cấp: skin Tiến Trọng Duy (cần có Tiến), trả bằng Crystal HOẶC Coin
      const hasChar = !!owned.tien;
      const hasSkin = !!owned.tienSkin;
      const crystalPoor = crystals < TIEN_SKIN_CRYSTAL;
      const coinPoor = coinBalance < TIEN_SKIN_COIN;
      let action;
      let note;
      if (hasSkin) {
        action = '<button class="card-btn upgrade shop-buy" type="button" disabled>✓ ĐÃ SỞ HỮU</button>';
        note = 'Mặc / Tháo skin tại thẻ <b>Tiến</b> trong popup <b>Nhân vật &amp; Nâng cấp</b>.';
      } else if (!hasChar) {
        action = '<button class="card-btn upgrade shop-buy" type="button" disabled>🔒 CHƯA MỞ</button>';
        note = '<span class="shop-need">🔒 Cần sở hữu nhân vật Tiến trước</span>';
      } else {
        action = `<div class="shop-pay">
          <button class="card-btn upgrade shop-buy ${crystalPoor ? 'is-poor' : ''}" type="button" data-buy-skin="crystal"><span class="cost">💎 ${TIEN_SKIN_CRYSTAL}</span></button>
          <button class="card-btn upgrade shop-buy ${coinPoor ? 'is-poor' : ''}" type="button" data-buy-skin="coin"><span class="cost">🪙 ${fmt(TIEN_SKIN_COIN)}</span></button>
        </div>`;
        note = 'Thanh toán bằng <b>💎 Crystal</b> hoặc <b>🪙 Coin</b>.';
      }
      shopBody.innerHTML = `<div class="shop-list"><div class="shop-item shop-char ${hasSkin ? 'is-soldout' : ''} ${!hasChar ? 'is-locked' : ''}">
        <span class="shop-thumb-wrap"><img class="shop-thumb" src="assets/tien.png" alt="Skin Tiến Trọng Duy">${!hasChar ? '<i class="shop-lock" aria-hidden="true">🔒</i>' : ''}</span>
        <div class="shop-item-main"><strong>Tiến Trọng Duy <em class="shop-tag">SKIN</em></strong>
          <p>Giữ <b>Nhảy kép</b> và thêm <b>ANH EM “SÉT”</b> (hồi 50s · kéo dài 21s; Lv2: hồi 46s · Lv3: kéo dài 23s): Duy &amp; Trọng “Sét” chạy cùng, miễn nhiễm va chạm và phóng tia sét phá chướng ngại trong tầm 360px.</p>
          <small>${note}</small></div>
        ${action}
      </div></div>`;
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
  function buyQuang() {
    if (owned.quang) { shopSay('soldout'); renderShop(); return; }
    if (coinBalance < QUANG_PRICE) { shopSay('poor'); showToast(`Chưa đủ Coin: cần ${fmt(QUANG_PRICE)} Coin để mở khóa Quang.`); return; }
    coinBalance -= QUANG_PRICE;
    owned.quang = true;
    saveEconomy(); saveMeta(); updateLobby(); renderCharacterCards(); renderShop(); shopSay('buy');
    playUiSound('claim');
    showToast('GOD RIDER ĐÃ ĐƯỢC MỞ KHÓA! Quang hiện đã có trong danh sách nhân vật.');
  }
  function buyTien() {
    if (owned.tien) { shopSay('soldout'); renderShop(); return; }
    if (coinBalance < TIEN_PRICE) { shopSay('poor'); showToast(`Chưa đủ Coin: cần ${fmt(TIEN_PRICE)} Coin.`); return; }
    coinBalance -= TIEN_PRICE;
    owned.tien = true;
    saveEconomy();
    saveMeta();
    updateLobby();
    renderCharacterCards();
    renderShop();
    shopSay('buy');
    playUiSound('claim');
    showToast('ĐÃ MỞ KHÓA NHÂN VẬT TIẾN! Vào Nhân vật & Nâng cấp để chọn.');
  }
  function buyTienSkin(method) {
    if (!owned.tien || owned.tienSkin) return;
    if (method === 'crystal') {
      if (crystals < TIEN_SKIN_CRYSTAL) { shopSay('poor'); showToast(`Chưa đủ Crystal: cần ${TIEN_SKIN_CRYSTAL} Crystal.`); return; }
      crystals -= TIEN_SKIN_CRYSTAL;
    } else if (method === 'coin') {
      if (coinBalance < TIEN_SKIN_COIN) { shopSay('poor'); showToast(`Chưa đủ Coin: cần ${fmt(TIEN_SKIN_COIN)} Coin.`); return; }
      coinBalance -= TIEN_SKIN_COIN;
    } else return;
    owned.tienSkin = true;
    equippedSkin.tien = false; // mua xong chưa tự mặc: bật tại thẻ Tiến
    saveEconomy();
    saveMeta();
    updateLobby();
    renderCharacterCards();
    renderShop();
    shopSay('buy');
    playUiSound('claim');
    showToast('ĐÃ MUA SKIN TIẾN TRỌNG DUY! Vào Nhân vật & Nâng cấp → thẻ Tiến để Mặc.');
  }
  shopBody.addEventListener('click', (event) => {
    const charBtn = event.target.closest('[data-buy-char]');
    const skinBtn = event.target.closest('[data-buy-skin]');
    const bfBtn = event.target.closest('[data-buy-bf]');
    if (bfBtn && !bfBtn.disabled) { buyTrongRiding(); return; }
    if (charBtn && !charBtn.disabled) { if (charBtn.dataset.buyChar === 'quang') buyQuang(); else buyTien(); return; }
    if (skinBtn && !skinBtn.disabled) { buyTienSkin(skinBtn.dataset.buySkin); return; }
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
    window.LimitedEvent?.onShopBuy?.(key); // V24.1: nhiệm vụ sự kiện 20/11
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
    shopSay('greet');
  }));

  // ---------- Mini-game: registry (boss.js đăng ký mục "boss") ----------
  const miniGames = [];
  function renderMini() {
    miniBody.innerHTML = miniGames.map((g) => g.render()).join('');
  }
  miniBody.addEventListener('click', (event) => {
    for (const g of miniGames) if (g.onClick) g.onClick(event);
  });

  // ---------- Mở popup ----------
  // V22: popup NHIỆM VỤ có 3 tab — Hằng ngày · Thử thách · Thành tựu
  let questTab = 'daily';
  function selectQuestTab(name) {
    if (name === 'challenge' && !challengeUnlocked()) {
      showToast(`🔒 Thử Thách mở khóa khi đạt kỷ lục ${fmt(CHALLENGE_UNLOCK)} điểm (hiện tại: ${fmt(best)}).`);
      return;
    }
    questTab = name;
    document.querySelectorAll('#questModal [data-qtab]').forEach(t => t.classList.toggle('is-selected', t.dataset.qtab === name));
    $('qPaneDaily').hidden = name !== 'daily';
    $('qPaneChallenge').hidden = name !== 'challenge';
    $('qPaneAchv').hidden = name !== 'achv';
    if (name === 'daily') renderQuests();
    else if (name === 'challenge') renderChallenge();
    else renderAchievements();
  }
  document.querySelectorAll('#questModal [data-qtab]').forEach(t => t.addEventListener('click', () => selectQuestTab(t.dataset.qtab)));
  function openQuestModal(tab = 'daily') { openModal(questModal, $('openQuests')); selectQuestTab(tab); }
  function openGachaModal() { renderGacha(false); openModal(gachaModal, $('openGacha')); }
  // V22: Túi đồ nằm trong Shop (tab thứ 4)
  function openShopModal(tab) {
    if (tab) shopTab = tab;
    renderShop();
    openModal(shopModal, $('openShop'));
    shopSay('greet');
  }
  function openMiniModal() { renderMini(); openModal(miniModal, $('openMini')); }
  $('openQuests').addEventListener('click', () => openQuestModal());
  $('openGacha').addEventListener('click', () => openGachaModal());
  $('openShop').addEventListener('click', () => openShopModal());
  $('openMini').addEventListener('click', openMiniModal);
  equipStrip.addEventListener('click', () => openShopModal('bag'));

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
  const MUSIC_TRACKS = { default: 'assets/Thangbanhuyenthoaibeat.mp3', nika: TAN_NIKA_MUSIC };
  let musicTrack = 'default';   // 'nika' = nhạc độc quyền của skin Tân Nika
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
  let knockedObstacles = [];
  let trieuMilestones = new Set();
  let lightningStrikeTimer = 0;
  let nextScaffoldX = 0;
  let cityMode = false;
  let cityElapsed = 0;
  // V22: Map Bãi Biển + kỹ năng Ném chổi của Tân
  let beachMode = false;
  // V23: lộ trình map 3.000m → 6.000m → 10.000m, bốc thăm sẵn từ đầu ván bằng window.gameRand()
  // (mỗi phần tử: 'city' | 'beach' | 'sunset'). Solo 1v1 dùng chung seed nên hai người luôn cùng lộ trình.
  // ===== [GĐ1] LỘ TRÌNH MAP MỞ RỘNG =====
  const MAP_MARKS = [3000, 6000, 10000];
  const ROUTE_LOOP_STEP = 4000;     // sau 10.000m: cứ +4.000m đổi map (14.000m, 18.000m...)
  const ROUTE_EXTRA_STAGES = 14;    // số mốc lặp bốc thăm sẵn
  const mapMarkAt = (stage) => stage < MAP_MARKS.length
    ? MAP_MARKS[stage]
    : MAP_MARKS[MAP_MARKS.length - 1] + (stage - MAP_MARKS.length + 1) * ROUTE_LOOP_STEP;
  let mapRoute = ['city', 'city', 'city'];
  let routeStage = 0;      // số mốc map đã qua
  let beachSunset = false; // Bãi Biển Hoàng Hôn
  let cityNight = false;   // [GĐ1] Night City (luôn đi kèm cityMode = true)
  let nightPad = 0;        // [GĐ1] nghỉ thêm sau khi sinh xe buýt đêm
  let villageMode = false; // [GĐ2] Map Làng Quê Miền Tây
  let schoolMode = false;  // [SCHOOL] Map Trường Học (bạt nhún + nhà vệ sinh học sinh)
  let schoolRings = [];    // [SCHOOL] vòng sóng không khí khi giẫm bạt nhún
  let villageDecor = [];   // [GĐ2] cây dừa trang trí (thân + tán không va chạm) chạy theo nền
  let windDir = 0, windTimer = 0, windCool = 8, windStreaks = [];   // [GĐ3-B2] trạng thái gió làng quê
  let rainbowItems = [], rainbowUntil = 0;   // [L4] Sò Nui 7 Màu: item trên map + thời điểm hết bất tử cầu vồng
  // RACING: cờ chế độ Đua Tốc Độ (racing.js điều khiển). Bật: cấm vật phẩm hỗ trợ, chết → quay về 0m thay vì Game Over.
  let racingMode = false;
  let waterPits = [];
  let brooms = [];
  // V24 — Ông Hai · Lào thủ tu tiên
  let smokeRings = [];
  let onghaiRolled = true;
  let onghaiGold = false;
  let onghaiFlying = false;
  let onghaiLanding = false;
  let onghaiRingTimer = 0;
  let onghaiPuffTimer = 0;
  let broomTimer = 0;
  let platforms = [];
  let groundPlatform = null;
  let lightningFlash = 0;
  let lightningCooldown = 0;
  let quangPassiveBoost = false;
  let quangBikePhase = 0;
  let quangStartedAt = 0;
  let quangWasActive = false;
  // [BÙI BẰNG] VF 3 — pin 0..100
  let bbPin = 100;
  let bbDriving = false;
  let bbOverloadUntil = 0;      // elapsedRun khi sạc xong (0 = không quá tải)
  let bbOverloadLen = 12;
  let bbSpeedApplied = false;
  let bbChargeDelayUntil = 0;   // trễ sạc sau khi chủ động xuống xe
  let bbLowWarned = false;      // đã cảnh báo pin yếu trong lượt lái này chưa
  let bbSafeUntil = 0;          // bất tử ngắn sau khi chủ động xuống xe
  const bbMaxPin = () => (upgrades.buibang || 1) >= 2 ? 100 : 80;
  const bbPenalty = () => (upgrades.buibang || 1) >= 3 ? 45 : 60;
  const bbSafeNow = () => selectedCharacter === 'buibang' && state === 'running' && elapsedRun < bbSafeUntil;
  const BB_SPEED = 1.15;
  let quangSpeedApplied = false;
  let quangSpeedMult = 1.45;   // hệ số tốc độ GOD RIDER của lần kích hoạt hiện tại (1,45–2,0; Math.random → không lệch seed Solo 1v1)
  // Dương Tào — Skill 1 Đấm (chủ động, cận chiến 1 mục tiêu) + Skill 2 Bốc đầu nón 3/4 (thụ động theo chu kỳ)
  let dtPunchCount = 0;        // số lần đấm trúng vật cản trong ván (nội tại giảm hồi chiêu Đấm)
  let dtWasWheelie = false;    // Skill 2 (bốc đầu) đang bật ở khung hình trước
  let dtPunchReadyAt = 0;      // mốc elapsedRun mà Skill 1 sẵn sàng trở lại
  let dtSpeedApplied = false;  // đã nhân 1,12× tốc độ ở khung hình trước chưa (hoàn trả đầu update)
  let dtWords = [];            // luồng chữ Skill 2 đang bay
  let dtWord = '';             // câu thoại Skill 2 của lần kích hoạt hiện tại
  let dtLastWord = -1;         // chỉ số câu thoại Skill 2 liền trước (không lặp)
  let dtLastPunchLine = -1;    // chỉ số câu thoại Skill 1 liền trước (không lặp)
  let dtWordTimer = 0;
  let dtPunchFx = [];          // vệt đấm
  let muRatCloneX = -9999;
  let squadY = [0, 0]; // độ cao (có trễ) của 2 bản sao Duy trong kỹ năng Chi viện: [phía trước, phía sau]
  let squadGuards = 0; // V23.1: số đồng đội hộ vệ còn lại sau Chi viện (tối đa 2)
  let squadConverted = false; // bảo đảm chỉ chuyển Chi viện thành hộ vệ một lần mỗi lần bật chiêu
  const SQUAD_GUARD_MAX_TIME = 15; // Nerf: hộ vệ chỉ ở lại tối đa 15 giây sau khi hết Chi viện
  const SQUAD_GUARD_WARN_TIME = 3; // cảnh báo nhẹ ở 3 giây cuối
  let squadGuardUntil = 0; // mốc elapsedRun mà hộ vệ tự rời đi
  let squadGuardWarned = false;
  // ---------- Trọng Riding · Chiến Mã Sấm Sét (mạng kép) ----------
  let riderMounted = true;     // true: Trạng thái 1 (cưỡi ngựa) · false: Trạng thái 2 (đi bộ)
  let riderProgress = 0;       // tiến độ 0..1 của thanh kỹ năng (hồi Sét Gầm khi cưỡi / Gọi Chiến Mã khi đi bộ)
  let riderInvulnUntil = 0;    // mốc elapsedRun hết 1 giây bất tử sau khi bỏ ngựa
  let riderPrevGround = true;  // trạng thái tiếp đất của khung hình trước (phát hiện cú chạm đất)
  let riderVfx = [];           // tia sét zic-zac, sóng xung chấn và tia lửa điện của Chiến Mã
  let riderAutoBoltTimer = 0;  // nhịp tự động phóng sét mỗi 0.45 giây trong pha 2
  const RIDER_JUMP_BOOST = 1.08;     // cưỡi ngựa: lực nhảy +8%
  const RIDER_RESCUE_JUMP = 1.05;    // cú nhảy giải cứu khi bỏ ngựa
  const RIDER_INVULN_TIME = 1.0;     // giây bất tử để tiếp đất an toàn
  const RIDER_STRIKE_RANGE = 360;    // tầm Sét Gầm pha 1 (px)
  const RIDER_SHOCK_RANGE = 250;     // tầm xung chấn khi ngựa tiếp đất (px)
  const RIDER_SHOCK_COIN = 25;       // Lv3: thưởng Coin mỗi vật cản bị xung chấn phá
  const RIDER_BOSS_DAMAGE = 15;      // Sét Gầm pha 1 trận Boss
  const riderHorseImg = new Image();
  riderHorseImg.onerror = () => console.error('Không tải được ảnh Trọng Riding: assets/trong-riding.png');
  riderHorseImg.src = 'assets/trong-riding.png';
  const isRider = () => selectedCharacter === 'trongriding';
  const riderSkillActiveNow = () => isRider() && skillTriggered && elapsedRun < skillActiveUntil;
  const riderInvulnActive = () => isRider() && elapsedRun < riderInvulnUntil;
  // Ảnh đang hiển thị: ngựa khi cưỡi, Trọng đi bộ (trong-set.png) khi mất ngựa
  const activePlayerImage = () => (isRider() ? (riderMounted ? riderHorseImg : trongSprite) : sprite);
  function riderCallTime() {
    const lv = upgrades.trongriding || 1;
    let value = lv >= 2 ? 20 : 24;
    if (state === 'running' && hourglassRun) value = Math.round(value * 0.85 * 10) / 10;
    return value;
  }
  function riderLightningStrike(o) {
    o.destroyedByLightning = true;
    lightningFlash = 0.28;
    lightningStrikes.push({ x: o.x + o.w / 2, y: o.y + o.h * 0.45, life: 0.62, maxLife: 0.62 });
    burst(o.x + o.w / 2, o.y + o.h / 2, 14);
    if (lightningCooldown <= 0) { lightningCooldown = 0.18; playTone(vfxRandom(520, 900), 0.07, 'square', 0.025); }
  }
  // ---------- VFX Sét Gầm (Canvas; chỉ lưu hiệu ứng trong riderVfx) ----------
  function makeZigzag(x1, y1, x2, y2, segs, jit) {
    const pts = [[x1, y1]];
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push([x1 + (x2 - x1) * t + vfxRandom(-jit * 0.3, jit * 0.3), y1 + (y2 - y1) * t + vfxRandom(-jit, jit)]);
    }
    pts.push([x2, y2]);
    return pts;
  }
  function drawBoltPath(pts, alpha, width) {
    ctx.save();
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = width + 3; ctx.shadowColor = '#ffe14d'; ctx.shadowBlur = 16;
    ctx.globalAlpha = alpha * 0.55; ctx.stroke();
    ctx.strokeStyle = '#fff8c4'; ctx.lineWidth = width; ctx.shadowBlur = 8;
    ctx.globalAlpha = alpha; ctx.stroke();
    ctx.restore();
  }
  // Ba tia sét zic-zac vàng bắn thẳng từ ngựa về phía trước 360px.
  function spawnRiderBolts() {
    const x1 = player.x + player.width * 0.85;
    for (let i = 0; i < 3; i++) {
      const y1 = player.y + player.height * (0.22 + i * 0.22);
      riderVfx.push({ kind: 'bolt', pts: makeZigzag(x1, y1, x1 + RIDER_STRIKE_RANGE, y1 + vfxRandom(-40, 40), 14, 14), life: 0.34, max: 0.34, width: 3.5 });
    }
  }
  // Sóng điện vàng cam khi ngựa tiếp đất, kèm tia lửa ở hai móng.
  function spawnRiderWave() {
    riderVfx.push({ kind: 'wave', x0: player.x + player.width * 0.5, life: 0.42, max: 0.42 });
    [0.28, 0.72].forEach(k => {
      const hx = player.x + player.width * k;
      riderVfx.push({ kind: 'bolt', pts: makeZigzag(hx, groundY - 2, hx + vfxRandom(-26, 26), groundY - vfxRandom(18, 34), 4, 5), life: 0.3, max: 0.3, width: 2 });
    });
  }
  function drawRiderVfx() {
    if (!riderVfx.length) return;
    ctx.save();
    riderVfx.forEach(f => {
      const t = clamp(f.life / f.max, 0, 1);
      ctx.save();
      if (f.kind === 'bolt') {
        drawBoltPath(f.pts, t, f.width || 3.5);
      } else if (f.kind === 'wave') {
        const progress = 1 - t;
        const front = f.x0 + RIDER_SHOCK_RANGE * (1 - Math.pow(1 - progress, 3));
        ctx.globalAlpha = t;
        ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 4; ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(f.x0, groundY - 2); ctx.lineTo(front, groundY - 2); ctx.stroke();
        ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3 + 3 * t;
        ctx.beginPath(); ctx.moveTo(front - 22, groundY - 2);
        ctx.quadraticCurveTo(front + 4, groundY - 46, front + 14, groundY - 2); ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
  }
  // Pha 2: tự đánh vật cản gần nhất trong 320px; ở Boss chuyển yêu cầu qua bridge.
  function riderAutoStrike() {
    const reach = player.x + 320;
    const ahead = player.x + player.width * 0.5;
    if (bossMode) {
      // boss.js có thể xử lý chọn/đánh tên lửa; game.js không đọc trực tiếp boss/missile.
      const handled = window.GameBridge?.boss?.onRiderAutoStrike?.({ ahead, reach, playerX: player.x, playerWidth: player.width });
      if (handled) {
        riderVfx.push({ kind: 'bolt', pts: makeZigzag(ahead + 24, Math.max(0, player.y - 120), ahead + 24, player.y + player.height * 0.35, 6, 8), life: 0.22, max: 0.22, width: 3 });
        return;
      }
    } else {
      let target = null;
      obstacles.forEach(o => {
        if (o === groundPlatform || o.destroyedByLightning || o.x <= ahead || o.x >= reach) return;
        if (!target || o.x < target.x) target = o;
      });
      if (target) { riderLightningStrike(target); return; }
    }
    // Phía trước trống: giáng một tia sét xuống mặt đường và tóe lửa vàng.
    const tx = player.x + vfxRandom(120, 300);
    const topY = Math.max(0, groundY - vfxRandom(200, 240));
    riderVfx.push({ kind: 'bolt', pts: makeZigzag(tx + vfxRandom(-20, 20), topY, tx, groundY, 8, 12), life: 0.25, max: 0.25, width: 3 });
    for (let i = 0; i < 2; i++) {
      const sx = tx + vfxRandom(-30, 30);
      riderVfx.push({ kind: 'bolt', pts: makeZigzag(sx, groundY - 2, sx + vfxRandom(-22, 22), groundY - vfxRandom(12, 26), 4, 4), life: 0.2, max: 0.2, width: 2 });
    }
    burst(tx, groundY - 4, 10, false, '#ffe14d');
    playTone(vfxRandom(120, 300), 0.12, 'sawtooth', 0.03);
  }
  function riderCastLightning() {
    // Pha 1 (tức thì): sét diện rộng phá chướng ngại & lấp hố nước trong 360px phía trước
    riderProgress = 0;
    riderAutoBoltTimer = 0;
    skillTriggered = true;
    runSkillCount++; window.LimitedEvent?.onSkillUse?.(runSkillCount);
    const duration = skillDuration();
    skillActiveUntil = elapsedRun + duration;
    lightningCooldown = 0;
    const reach = player.x + RIDER_STRIKE_RANGE;
    obstacles.forEach(o => {
      if (o === groundPlatform || o.destroyedByLightning || o.x <= player.x - 4 || o.x >= reach) return;
      riderLightningStrike(o);
    });
    waterPits.forEach(pit => {
      if (!pit.absorbed && !pit.filled && pit.x < reach && pit.x + pit.w > player.x - 4) pit.filled = true;
    });
    if (bossMode) window.GameBridge?.boss?.onRiderStrike?.(RIDER_BOSS_DAMAGE);
    lightningFlash = 0.4;
    spawnRiderBolts();
    burst(player.x + player.width * 0.5, player.y + player.height * 0.4, 30, false, '#ffe66b');
    screenShake = Math.max(screenShake, 0.18);
    showToast(`SÉT GẦM kích hoạt! Phá chướng ngại phía trước, ngựa miễn nhiễm va chạm và xung chấn sét trong ${duration} giây!`);
    playTone(180, 0.24, 'sawtooth', 0.05);
  }
  function riderShockwave() {
    // Pha 2: mỗi lần ngựa tiếp đất sau khi nhảy, xung chấn đánh tan vật cản trong 250px.
    spawnRiderWave();
    const reach = player.x + RIDER_SHOCK_RANGE;
    let count = 0;
    if (bossMode) {
      // boss.js tự chọn tên lửa trong tầm; không truy cập trực tiếp boss/zapMissile ở game.js.
      window.GameBridge?.boss?.onRiderShockwave?.({ ahead: player.x + player.width * 0.5, reach, range: RIDER_SHOCK_RANGE });
    } else {
      obstacles.forEach(o => {
        if (o === groundPlatform || o.destroyedByLightning || o.x <= player.x + player.width * 0.5 || o.x >= reach) return;
        riderLightningStrike(o);
        count++;
      });
    }
    burst(player.x + player.width * 0.5, groundY, 12, true, '#ffe66b');
    playTone(420, 0.1, 'triangle', 0.03);
    if (!bossMode && count > 0 && (upgrades.trongriding || 1) >= 3) {
      const gained = RIDER_SHOCK_COIN * count;
      coinBalance += gained;
      runCoins += gained;
      saveEconomy();
    }
  }
  function riderSummonHorse() {
    // Gọi Chiến Mã: một tia sét giáng xuống vị trí Trọng, phá vật cản sát bên rồi hồi lại Trạng thái 1
    riderMounted = true;
    riderProgress = 0;
    lightningFlash = 0.4;
    lightningStrikes.push({ x: player.x + player.width * 0.5, y: player.y + player.height * 0.5, life: 0.62, maxLife: 0.62 });
    obstacles.forEach(o => {
      if (o === groundPlatform || o.destroyedByLightning) return;
      if (o.x + o.w > player.x - 30 && o.x < player.x + 140) riderLightningStrike(o);
    });
    burst(player.x + player.width * 0.5, player.y + player.height * 0.5, 28, false, '#ffe66b');
    screenShake = Math.max(screenShake, 0.16);
    showToast('CHIẾN MÃ QUAY LẠI! Sấm sét giáng xuống, Trọng cưỡi ngựa trở lại.');
    playTone(120, 0.3, 'sawtooth', 0.06);
  }
  function riderKnockObstacle(o) {
    if (!o || o.knockedByRider || o === groundPlatform) return;
    o.knockedByRider = true;
    knockedObstacles.push({ ...o, vx: vfxRandom(260, 480), vy: vfxRandom(-700, -460), spin: vfxRandom(-11, 11), angle: 0, life: 1.4, knocked: true });
    burst(o.x + o.w / 2, o.y + o.h / 2, 16, false, '#ffd34d');
    screenShake = Math.max(screenShake, 0.12);
    playTone(200, 0.16, 'sawtooth', 0.045);
  }
  // Bỏ ngựa chạy lấy người: nhảy vọt lên, 1 giây bất tử, thanh kỹ năng giữ nguyên %
  function riderBailOut() {
    riderMounted = false;
    skillActiveUntil = 0;
    skillTriggered = false;
    riderAutoBoltTimer = 0;
    riderInvulnUntil = elapsedRun + RIDER_INVULN_TIME;
    player.velocityY = -player.jumpPower * RIDER_RESCUE_JUMP;
    player.onGround = false;
    groundPlatform = null;
    player.floaty = false;
    burst(player.x + player.width * 0.5, player.y + player.height * 0.5, 22, false, '#ffd34d');
    screenShake = Math.max(screenShake, 0.14);
    showToast('BỎ NGỰA CHẠY LẤY NGƯỜI! Trọng chạy bộ, thanh Gọi Chiến Mã giữ nguyên tiến độ.');
    playTone(300, 0.18, 'triangle', 0.045);
  }
  function updateRider(dt) {
    if (riderVfx.length) {
      riderVfx.forEach(f => { f.life -= dt; });
      riderVfx = riderVfx.filter(f => f.life > 0);
    }
    if (!isRider()) return;
    const landed = player.onGround && !riderPrevGround;
    riderPrevGround = player.onGround;
    if (riderSkillActiveNow()) {
      if (landed && riderMounted) riderShockwave();
      if (riderMounted) {
        riderAutoBoltTimer -= dt;
        if (riderAutoBoltTimer <= 0) {
          riderAutoBoltTimer = 0.45;
          riderAutoStrike();
        }
      }
      return;
    }
    if (riderMounted) {
      riderProgress = Math.min(1, riderProgress + dt / Math.max(1, skillInterval()));
      if (riderProgress >= 1) riderCastLightning();
    } else {
      riderProgress = Math.min(1, riderProgress + dt / riderCallTime());
      if (riderProgress >= 1) riderSummonHorse();
    }
  }
  const squadSprite = new Image();
  squadSprite.onerror = () => console.error('Không tải được ảnh Duy hộ tống: assets/nhan-vat.png');
  squadSprite.src = 'assets/nhan-vat.png';
  // [SPRITE] Sò Nui vật cản (Night City) và Sò Nui 7 Màu (item)
  const soNuiSprite = new Image();
  soNuiSprite.onerror = () => console.error('Không tải được ảnh: assets/so-nui.png');
  soNuiSprite.src = 'assets/so-nui.png';
  const soNuiRainbowSprite = new Image();
  soNuiRainbowSprite.onerror = () => console.error('Không tải được ảnh: assets/so-nui-7mau.png');
  soNuiRainbowSprite.src = 'assets/so-nui-7mau.png';
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
    runPhase: 0,
    airJumpsLeft: 0, // V20: số lượt nhảy kép còn lại trên không (Tiến, V24.1: cả Skin)
    floaty: false    // V20 Lv3: đang lướt nhẹ sau khi nhảy kép (rơi chậm hơn 15%) — V24.1: áp dụng cả Skin
  };
  const TIEN_AIR_JUMPS = 1;
  // Số lượt nhảy trên không: Tiến có Nhảy kép ở cả bản gốc lẫn Skin Tiến Trọng Duy (V24.1).
  const airJumpsMax = () => (selectedCharacter === 'tien' ? TIEN_AIR_JUMPS : 0); // V24.1: cả bản gốc lẫn Skin Tiến Trọng Duy đều có Nhảy kép
  const trongSprite = new Image(); // V20: Trọng "Sét" trong đội hình Anh em "Sét"
  trongSprite.onerror = () => console.error('Không tải được ảnh Trọng "Sét": assets/trong-set.png');
  trongSprite.src = 'assets/trong-set.png';

  // Bộ sinh số ngẫu nhiên cho bản đồ: mặc định = Math.random; Solo 1v1 tạm thay bằng Mulberry32(seed).
  window.gameRand = Math.random;
  const random = (min, max) => min + window.gameRand() * (max - min);

  // ===== [GĐ1] BỐC THĂM LỘ TRÌNH (đúng 1 lần gameRand / mốc → Solo 1v1 không lệch seed) =====
  const ALL_MAPS = ['city', 'beach', 'night', 'sunset', 'village', 'school'];   // [SCHOOL] thêm school
  const ROUTE_WEIGHTS = {
    0: { city: 30, beach: 30, village: 25, night: 7.5, sunset: 7.5, school: 25 },   // [SCHOOL] 3.000m
    1: { night: 30, sunset: 30, village: 20, city: 10, beach: 10, school: 20 }      // [SCHOOL] 6.000m
  };                                                                     // 10.000m trở đi: đều nhau (6 map)
  function drawRouteStage(stage, prev) {
    const w = ROUTE_WEIGHTS[stage] || { city: 1, beach: 1, night: 1, sunset: 1, village: 1, school: 1 };   // [SCHOOL]
    const pool = ALL_MAPS.filter(k => k !== prev);        // chống lặp map liền trước
    const total = pool.reduce((s, k) => s + (w[k] || 0), 0);
    let r = window.gameRand() * total;
    for (const k of pool) { r -= (w[k] || 0); if (r < 0) return k; }
    return pool[pool.length - 1];
  }
  // Số ngẫu nhiên cho hiệu ứng thị giác (mây, hạt, rung màn hình...) — KHÔNG dùng gameRand để không lệch seed.
  const vfxRandom = (min, max) => min + Math.random() * (max - min);
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
      clouds.push({ x: (i / count) * width + vfxRandom(-30, 30), y: vfxRandom(24, height * 0.37), scale: vfxRandom(0.65, 1.25), speed: vfxRandom(7, 18) });
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
  // Duy Quân đội: đồng đội hộ vệ đỡ đòn trước Giáp Lv4.
  function consumeSquadGuard() {
    if (selectedCharacter !== 'duyquandoi' || squadGuards <= 0) return false;
    squadGuards = Math.max(0, squadGuards - 1);
    burst(player.x + player.width * 0.5, player.y + player.height * 0.5, 18, false, '#9be4ff');
    showToast(`ĐỒNG ĐỘI HỘ VỆ! Đã đỡ đòn thay, còn ${squadGuards}/2 đồng đội.`);
    playTone(310, 0.16, 'triangle', 0.045);
    return true;
  }
  function showGameOver() {
    if (bossMode && window.GameBridge.boss.hasResult()) { window.GameBridge.boss.showResult(); return; }
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
    knockedObstacles = [];
    trieuMilestones = new Set();
    lastCoinScore = 0;
    bonusMilestone = 0;
    spareHits = (upgrades[selectedCharacter] >= 4 ? 1 : 0) + (runItems.shield ? 1 : 0);
    runMaxSpare = spareHits; // giáp tối đa đầu trận
    phatRage = 0;
    phatNextMark = 250;
    quangPassiveBoost = false;
    quangBikePhase = 0;
    quangStartedAt = 0;
    quangWasActive = false;
    quangSpeedApplied = false; quangSpeedMult = 1.45;
    bbPin = bbMaxPin(); bbDriving = false; bbOverloadUntil = 0; bbSpeedApplied = false; bbSafeUntil = 0; bbChargeDelayUntil = 0; bbLowWarned = false;   // [BÙI BẰNG]
    dtPunchCount = 0; dtWasWheelie = false;
    dtPunchReadyAt = 0; dtSpeedApplied = false; dtWords = []; dtWord = ''; dtLastWord = -1; dtLastPunchLine = -1; dtWordTimer = 0; dtPunchFx = [];
    phatEffect = null;
    phatFx = [];
    achievedRecord = false;
    speed = bossMode ? window.GameBridge.boss.cfg.scroll : Math.min(width * 0.63, 380);
    routeStyle = Math.floor(window.gameRand() * 4);
    overheadChance = [0.18, 0.24, 0.30, 0.34][routeStyle];
    // [GĐ1] bốc thăm toàn bộ lộ trình (3 mốc đầu + các mốc lặp sau 10.000m)
    {
      mapRoute = [];
      let prev = 'desert';
      for (let s = 0; s < MAP_MARKS.length + ROUTE_EXTRA_STAGES; s++) {
        prev = drawRouteStage(s, prev);
        mapRoute.push(prev);
      }
      routeStage = 0;
      beachSunset = false;
    }
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
    squadGuards = 0;
    squadConverted = false;
    squadGuardUntil = 0;
    squadGuardWarned = false;
    squadY = [player.y, player.y];
    riderMounted = true; riderProgress = 0; riderInvulnUntil = 0; riderPrevGround = true;
    riderVfx = []; riderAutoBoltTimer = 0;
    tanAwakened = false; tanWasNika = false; tanBroomLaunched = false; tanBigBroom = null; tanSquashed = []; tanFx = []; tanFlash = 0; tanGraceUntil = 0; tanWaves = []; tanFists = []; tanFistTimer = 0; tanBigJump = false;   // V25 Tân Nika
    tdResetRun();   // V26 Tô Duy Buddha
    nextSkillAt = hasTimedSkill() ? skillInterval() : Infinity; // Tiến gốc: Nhảy kép không có chu kỳ
    player.airJumpsLeft = airJumpsMax();
    player.floaty = false;
    muRatCloneX = -9999;
    lightningStrikes = [];
    cityMode = false;
    cityNight = false; nightPad = 0;   // [GĐ1]
    rainbowUntil = 0; rainbowItems = [];   // [L4]
    schoolMode = false; schoolRings = [];   // [SCHOOL]
    villageMode = false; villageDecor = []; windDir = 0; windTimer = 0; windCool = 8; windStreaks = [];   // [GĐ3-B2]   // [GĐ2]
    beachMode = false;
    waterPits = [];
    brooms = [];
    broomTimer = 0;
    smokeRings = []; onghaiRolled = true; onghaiGold = false; onghaiFlying = false; onghaiLanding = false; onghaiRingTimer = 0; onghaiPuffTimer = 0;
    cityElapsed = 0;
    platforms = [];
    lightningFlash = 0;
    lightningCooldown = 0;
    cityBuildings = [];
    updateShield(false);
    renderHudItems();
    window.GameBridge.boss.onRunStart();
    { const nikaRun = selectedCharacter === 'tan' && tanNikaOn('tan'); setMusicTrack(nikaRun ? 'nika' : 'default', nikaRun); }   // V25: nhạc độc quyền Tân Nika từ đầu trận
    if (!bossMode) {
      showToast(runItemsToast() || (selectedCharacter === 'phat' ? 'PHÁT: vượt chướng ngại & chạy 250m để tích Nộ — đủ Nộ thì bấm nút ⚡ hoặc phím E / S!' : selectedCharacter === 'quang' ? 'QUANG: GOD RIDER là kỹ năng chủ động — bấm nút mô tô hoặc E / S khi sẵn sàng!' : selectedCharacter === 'buibang' ? 'BÙI BẰNG: bấm nút 🚗 hoặc phím E / S để lái VF 3 — miễn nhiễm va chạm, pin tụt dần, hết pin sẽ QUÁ TẢI!' : selectedCharacter === 'duongtao' ? 'DƯƠNG TÀO: bấm nút 👊 hoặc phím E / S để đấm văng 1 vật cản gần nhất. Bốc đầu nón 3/4 sẽ tự kích hoạt theo chu kỳ!' : selectedCharacter === 'trongriding' ? 'TRỌNG RIDING: đang cưỡi ngựa, Sét Gầm tự kích hoạt khi thanh đầy. Va chạm khi cưỡi thì bỏ ngựa chạy lấy người!' : 'Tập trung nhé — City hoặc Bãi Biển mở ở 3.000 điểm. Mỗi nhân vật có tuyệt chiêu riêng.'));
    }
    updateHud();
  }

  function endGame() {
    if (state !== 'running') return;
    if (racingMode && window.Racing?.onFall(Math.floor(score))) return; // RACING: chết → quay về 0m, không Game Over
    if (bossMode) { window.GameBridge.boss.finish(false); return; } // hết tim: tính thưởng an ủi theo % máu Boss đã rút
    state = 'over';
    screenShake = 0.22;
    achievedRecord = Math.floor(score) > best;
    if (achievedRecord) {
      best = Math.floor(score);
      try { localStorage.setItem('duyMapChayDiBest', String(best)); } catch (_) { /* storage may be disabled */ }
      lbSubmitScore(best);
    }
    window.League?.onRunEnd(score);
    // V22: sự kiện cộng đồng (event.js) — không tính trận Solo 1v1. V24.1: tham số thứ 2 (tùy chọn) phục vụ Sự kiện 20/11
    window.LimitedEvent?.onRunEnd(score, { character: selectedCharacter, tienOriginal: selectedCharacter === 'tien' && !tienSkinOn('tien'), skillCount: runSkillCount });
    burst(player.x + player.width * 0.6, player.y + player.height * 0.75, 12);
    commitQuestsRun(score);
    commitChallengeRun(score);
    commitProfileRun(); // [PROFILE]
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

  function jump(isRepeat = false) {
    if (state !== 'running') return;
    if (tdCloudNow()) {   // V26 Cân Đẩu Vân: Nhảy / chạm màn hình = đổi Tầng Mây Thấp ⇄ Cao
      if (!isRepeat) {
        tdLayer = tdLayer ? 0 : 1;
        tdFx.push({ type: 'ring', x: player.x + player.width * 0.5, y: player.y + player.height, life: 0.4, max: 0.4, rmax: 70 });
        burst(player.x + player.width * 0.5, player.y + player.height, 8, false, '#ffe27a');
        playTone(tdLayer ? 620 : 440, 0.09, 'triangle', 0.035);
      }
      return;
    }
    if (selectedCharacter === 'quang' && quangActiveNow()) return;
    if (selectedCharacter === 'buibang' && bbDriving) return;   // [BÙI BẰNG] đang lái xe không nhảy
    if (selectedCharacter === 'onghai' && onghaiActiveNow()) return;
    // Tân Nika: Nhảy Cao Su — bấm nhảy khi đang hóa thân (kể cả lúc đang nảy thấp) để bật vọt lên cực cao
    if (tanNikaActiveNow() && (player.onGround || groundY - player.y - player.height < 45)) {
      player.velocityY = -820;
      player.onGround = false;
      groundPlatform = null;
      player.floaty = false;
      tanBigJump = true;
      tanFx.push({ type: 'ring', x: player.x + player.width / 2, y: groundY - 6, life: 0.5, max: 0.5, rmax: 120 });
      burst(player.x + player.width * 0.5, groundY - 2, 10, false, '#ffffff');
      playTone(360, 0.14, 'triangle', 0.04);
      return;
    }
    if (player.onGround || groundPlatform) {
      player.velocityY = -player.jumpPower * (isRider() && riderMounted ? RIDER_JUMP_BOOST : 1);
      player.onGround = false;
      groundPlatform = null;
      player.floaty = false;
      burst(player.x + player.width * 0.35, player.y + player.height, 5, true);
      playTone(470, 0.07, 'square', 0.025);
    } else if (!isRepeat && player.airJumpsLeft > 0 && airJumpsMax() > 0) {
      // NHẢY KÉP (Tiến, cả bản gốc lẫn Skin): thêm 1 lần nhảy trên không, kể cả khi vừa chạy hụt khỏi mép bệ đỡ.
      player.airJumpsLeft--;
      const lv = upgrades.tien || 1;
      player.velocityY = -player.jumpPower * (lv >= 2 ? 1.12 : 1); // Lv2: +12% lực bật nhảy kép
      player.floaty = lv >= 3;                                      // Lv3: rơi chậm hơn 15% sau khi nhảy kép
      burst(player.x + player.width * 0.5, player.y + player.height, 9, false, '#8fe3ff');
      playTone(700, 0.09, 'square', 0.03);
    }
  }

  // Nhạc nền phát trực tiếp bằng HTMLAudioElement (không qua Web Audio API).
  function ensureMusic() {
    if (!musicAudio) {
      musicAudio = new Audio(MUSIC_TRACKS[musicTrack] || MUSIC_TRACKS.default);
      musicAudio.loop = true;
      musicAudio.preload = 'auto';
      musicAudio.volume = MUSIC_VOLUME;
      // Thiếu file nhạc Nika → quay về nhạc nền thường để không mất tiếng.
      musicAudio.addEventListener('error', () => {
        if (musicTrack !== 'nika') return;
        musicTrack = 'default';
        musicAudio.src = MUSIC_TRACKS.default;
        if (musicOn) startBackgroundMusic();
      });
    }
    return musicAudio;
  }
  // Đổi bài nhạc nền (mặc định ↔ Tân Nika). restart = true: phát lại từ đầu bài.
  function setMusicTrack(name, restart = false) {
    if (!MUSIC_TRACKS[name]) name = 'default';
    if (musicTrack === name && (musicAudio || name === 'default') && !restart) return;
    if (!musicAudio && name === 'default') { musicTrack = name; return; }
    const wasPlaying = !!musicAudio && !musicAudio.paused;
    musicTrack = name;
    const a = ensureMusic();
    if (!a.src.endsWith(MUSIC_TRACKS[name])) a.src = MUSIC_TRACKS[name];
    a.loop = true;
    a.volume = MUSIC_VOLUME;
    try { a.currentTime = 0; } catch (_) { /* chưa tải metadata */ }
    if (musicOn && !document.hidden && (wasPlaying || name === 'nika')) startBackgroundMusic();
  }
  // Kỹ năng Nika kích hoạt → tua nhạc sang điệp khúc 2:50.
  function tanNikaSeekChorus() {
    if (musicTrack !== 'nika' || !musicAudio) return;
    const seek = () => { try { musicAudio.currentTime = TAN_NIKA_CHORUS_AT; } catch (_) { /* bỏ qua */ } };
    if (musicAudio.readyState >= 1) seek();
    else musicAudio.addEventListener('loadedmetadata', seek, { once: true });
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
        vx: vfxRandom(dust ? -100 : -145, dust ? 45 : 145),
        vy: vfxRandom(dust ? -60 : -155, dust ? -12 : 45),
        life: vfxRandom(0.22, 0.48),
        maxLife: 0.48,
        size: vfxRandom(2, dust ? 4 : 5),
        dust,
        color
      });
    }
    if (particles.length > 80) particles.splice(0, particles.length - 80);
  }

  // ===== [GĐ1] VẬT CẢN NIGHT CITY =====
  const NIGHT_BUS_MULT = 1.65, NIGHT_CAN_MULT = 1.48, NIGHT_BUS_WAIT = 0.30;
  function addNightObstacle() {
    // Bốc đủ số lần gameRand TRƯỚC khi return để Solo 1v1 không lệch seed
    const roll = window.gameRand(), r1 = window.gameRand(), r2 = window.gameRand(), r3 = window.gameRand();
    if (obstacles.some(o => o.nightBus && o.wait > 0)) return;   // xe buýt đang chờ ở rìa phải

    if (roll < 0.30) {                                           // xe buýt lao nhanh
      if (obstacles.some(o => o.x > width * 0.35)) return;       // tránh chồng lên vật cản mới sinh
      const h = clamp(height * (0.34 + 0.08 * r1), 72, 118);
      const ratio = busSprite.naturalWidth && busSprite.naturalHeight ? busSprite.naturalWidth / busSprite.naturalHeight : 1.42;
      const w = h * ratio;
      obstacles.push({ x: width - w - 6, y: groundY - h, w, h, type: 'bus', passed: false, nightBus: true, wait: NIGHT_BUS_WAIT });
      nightPad = 0.8;
      return;
    }
    if (roll < 0.55) {                                           // lon bia bay nhanh, tầm đầu (phải chạy luồn, không nhảy)
      const h = 45 + 17 * r1, w = h * (0.68 + 0.16 * r2);
      obstacles.push({ x: width + 28, y: groundY - player.height - h - 2, w, h, type: 'can', lane: 'high',
        passed: false, nightCan: true, fixedY: false, bobOffset: r3 * 6.28, bobSpeed: 6, bobAmp: 14 });
      return;
    }
    // [BAG] Sò Nui: bịch snack đứng sát đất; 35% lượt sinh tạo cặp đôi.
    const h = 48 + 10 * r1;
    const singleW = h * (soNuiSprite.naturalWidth && soNuiSprite.naturalHeight ? soNuiSprite.naturalWidth / soNuiSprite.naturalHeight : 0.72);
    const isDouble = r3 < 0.35;
    const w = isDouble ? singleW * 2 + 4 : singleW;
    obstacles.push({ x: width + 28, y: groundY - h, w, h, singleW, isDouble, type: 'sonui', passed: false, seed: Math.floor(r2 * 97) });
    if (isDouble) nightPad = 0.25;
  }

  // ===== [GĐ2] VẬT CẢN LÀNG QUÊ: sông lớn · cây dừa (có/không chùm) =====
  // ===== [GĐ3] VẬT CẢN LÀNG QUÊ: sông lớn · cây dừa · xe máy cày (+ combo sông sau máy cày) =====
  function addVillageObstacle() {
    // Bốc đủ số lần gameRand TRƯỚC khi xử lý để Solo 1v1 không lệch seed
    let roll = window.gameRand();
    const r1 = window.gameRand(), r2 = window.gameRand(), r3 = window.gameRand(), r4 = window.gameRand();
    // [GĐ3-B2] Gió ngược: không sinh Sông lớn (lượt sông được đổi sang cây dừa có chùm)
    if (windDir === -1 && roll < 0.30) roll = 0.30;
    // [GĐ3-B1] Combo: xe máy cày + sông lớn ngay phía trước (35%), không áp dụng khi gió ngược
    const comboPlanned = roll >= 0.52 && roll < 0.77 && windDir !== -1 && r3 < 0.35;
    let spawnX = width + 28;
    const hazards = [...obstacles, ...waterPits];
    if (hazards.length) {
      const prev = hazards.reduce((a, b) => (a.x + a.w > b.x + b.w ? a : b));
      let minGap = comboPlanned ? 445 : 170 + speed * 0.12;   // [L4] combo: 445 để sông không sát vật cản trước   // combo cần thêm chỗ cho sông nằm trước máy cày
      const prevIsPit = waterPits.includes(prev);   // [FIX] sông lớn không có prev.type
      const coconutRoll = roll >= 0.30 && roll < 0.52;   // lượt này quay trúng cây dừa có chùm
      if (prev.type === 'tractor' && coconutRoll) roll = 0.80;   // [FIX] không chùm dừa chồng lên đầu máy cày → đổi thành dừa trang trí
      if (prev.type === 'tractor') minGap += 340;                           // [FIX] máy cày chạy chậm 0.55×: bù đủ chênh tốc độ, tránh bít đường
      if (prevIsPit && coconutRoll) minGap += 180;                          // [FIX] nhảy qua sông, tiếp đất xong mới chui dưới tán dừa
      if (prev.type === 'coconutTree' && roll < 0.30) minGap += 90;         // sông lớn sau tán dừa: thêm nhịp
      spawnX = Math.max(spawnX, prev.x + prev.w + minGap);
    }

    // [GĐ3-A1] Sông lớn: 135–165px (trước: 155–185px)
    if (roll < 0.30) {
      waterPits.push({ x: spawnX, w: 135 + 30 * r1, passed: false, absorbed: false, beachNeed: 'jump' });
      return;
    }

    // [GĐ3-A2] Cây dừa CÓ chùm: thân là decor, tán là obstacle; decorRef liên kết hai phần
    if (roll < 0.52) {
      const w = 74 + 18 * r1, h = 46;
      const y = groundY - player.height - 14 - h;             // tán cao hơn đầu 14px: chạy dưới an toàn, nhảy là đụng
      const decor = { x: spawnX + w / 2, top: y + h * 0.35, lean: 0, crown: false, s: w / 84, phase: r2 * 6.28 };
      villageDecor.push(decor);
      obstacles.push({ x: spawnX, y, w, h, type: 'coconutTree', hasFruit: true, passed: false, beachNeed: 'stay', decorRef: decor });
      return;
    }

    // [GĐ3-B1] Xe máy cày: 25%
    if (roll < 0.77) {
      const w = 104 + 14 * r1, h = 70 + 8 * r2;
      const tractor = { x: spawnX, y: groundY - h, w, h, type: 'tractor', passed: false, beachNeed: 'jump' };
      obstacles.push(tractor);
      if (comboPlanned) {
        // Sông nằm phía trước máy cày (bên trái đầu xe), cách 40–60px, rộng 145–165px
        const gap = 40 + 20 * r4, rw = 145 + 20 * r1;
        waterPits.push({ x: tractor.x - gap - rw, w: rw, passed: false, absorbed: false, beachNeed: 'jump' });
      }
      return;
    }

    // Cây dừa KHÔNG chùm: chỉ là cảnh trang trí, không có hitbox
    villageDecor.push({ x: spawnX + 20 + 30 * r1, top: groundY - 150 - 40 * r2, lean: (r1 - 0.5) * 30, crown: true, s: 0.9 + 0.3 * r1, phase: r2 * 6.28 });
  }

  function updateVillageDecor(dt) {
    villageDecor.forEach(d => { d.x -= speed * dt; });
    villageDecor = villageDecor.filter(d => d.x > -160 && !d.dead);   // [GĐ3-A2] bỏ thân đã bị phá tán
  }

  // =====================================================================
  // [SCHOOL] MAP TRƯỜNG HỌC: Bạt nhún + Nhà vệ sinh học sinh · Cameo Bùi Bằng & Dương Tào · Bàn ghế · Cặp sách bay
  // =====================================================================
  const SCHOOL_CAMEOS = {
    buibang: { src: 'assets/bui-bang.png', lines: ['Đang chờ sạc VF 3!', 'Hết điện rồi!'] },
    duongtao: { src: 'assets/duong-tao.png', lines: ['Khỏi nhoerrr 😏', 'Có nón 3/4 không?'] }
  };
  const schoolCameoSprites = {};
  Object.keys(SCHOOL_CAMEOS).forEach(k => {
    const im = new Image();
    im.onerror = () => console.error('Không tải được ảnh cameo:', SCHOOL_CAMEOS[k].src);
    im.src = SCHOOL_CAMEOS[k].src;
    schoolCameoSprites[k] = im;
  });
  const SCHOOL_BAG_COLORS = [['#e0453a', '#a82a22'], ['#2f80ed', '#1d57ad'], ['#f2a413', '#b57606'], ['#3fb16a', '#27804a']];

  function enterSchool(first = true) {
    schoolMode = true; schoolRings = [];
    cityMode = false; cityNight = false;
    beachMode = false; beachSunset = false;
    villageMode = false; villageDecor = []; windDir = 0; windTimer = 0; windCool = 8; windStreaks = [];
    waterPits = [];
    if (first) { cityElapsed = 0; speed = 265; }   // mốc 3.000m mở bằng nhịp 0.8x; các mốc sau giữ tốc độ đang chạy
    obstacles = [];
    platforms = [];
    groundPlatform = null;
    player.onGround = true;
    player.velocityY = 0;
    player.y = groundY - player.height;
    spawnTimer = 0.8;
    lightningStrikes = [];
    lightningStrikeTimer = 0;
    showToast('MAP TRƯỜNG HỌC! Đạp bạt nhún để bay qua Nhà vệ sinh, coi chừng Bùi Bằng & Dương Tào chặn đường!');
    playTone(587, 0.12, 'triangle', 0.035);
  }

  // Bốc đủ số lần gameRand TRƯỚC khi xử lý để Solo 1v1 không lệch seed
  function addSchoolObstacle() {
    const roll = window.gameRand();
    const r1 = window.gameRand(), r2 = window.gameRand(), r3 = window.gameRand(), r4 = window.gameRand();
    const comboPlanned = roll < 0.20;                 // ~20% combo bạt nhún + nhà vệ sinh
    let spawnX = width + 28;
    let afterToilet = false;   // [FIX] vật cản liền sau nhà vệ sinh
    let afterJump = false;     // vật cản liền trước yêu cầu nhảy → không sinh cặp sách bay cao ngay sau
    if (obstacles.length) {
      const prev = obstacles.reduce((a, b) => (a.x + a.w > b.x + b.w ? a : b));
      let minGap = 240 + speed * 0.28;
      if (prev.type === 'schoolToilet') { minGap = 250 + speed * 0.50; afterToilet = true; }   // [FIX] rơi từ đỉnh bạt nhún xuống đất an toàn
      if (comboPlanned) minGap += 70;                                  // chừa chỗ đứng vững trước khi đạp bạt
      if (prev.beachNeed === 'jump') afterJump = true;
      spawnX = Math.max(spawnX, prev.x + prev.w + minGap);
    }

    // 1) Combo Bạt nhún + Nhà vệ sinh học sinh (~20%)
    if (comboPlanned) {
      const tramp = { x: spawnX, y: groundY - 22, w: 74, h: 22, type: 'trampoline', passed: true, bounceAnim: 0, bounceCool: 0 };   // passed: true → không cộng điểm 2 lần
      const toilet = { x: tramp.x + tramp.w + 115, y: groundY - 155, w: 105, h: 155, type: 'schoolToilet', passed: false };
      obstacles.push(tramp, toilet);
      return;
    }
    // 2) Cameo Bùi Bằng / Dương Tào chặn đường (~30%)
    if (roll < 0.50) {
      const who = r1 < 0.5 ? 'buibang' : 'duongtao';
      const lines = SCHOOL_CAMEOS[who].lines;
      obstacles.push({ x: spawnX, y: groundY - 76, w: 48, h: 76, type: 'cameo', who, line: lines[r2 < 0.5 ? 0 : 1], passed: false, beachNeed: 'jump' });
      return;
    }
    // 3) Vật cản phụ (~50%): bàn ghế học sinh · cặp sách bay
    if (r1 < 0.5) {
      obstacles.push({ x: spawnX, y: groundY - 44, w: 54, h: 44, type: 'desk', passed: false, beachNeed: 'jump' });
    } else {
      const h = 40 + 14 * r2, w = h * 0.85;
      const lane = (afterToilet || afterJump || r3 < 0.5) ? 'low' : 'high';      // low: nhảy qua · high: chạy luồn · [FIX] sau nhà vệ sinh luôn 'low'
      const y = lane === 'low'
        ? groundY - player.height - h * (0.18 + 0.17 * r4)
        : groundY - player.height - h - (8 + 22 * r4);
      obstacles.push({ x: spawnX, y, w, h, type: 'schoolBag', lane, passed: false, beachNeed: lane === 'low' ? 'jump' : 'stay',
        bobOffset: r4 * 6.28, bobSpeed: 1.2 + r2, colorIdx: Math.floor(r2 * SCHOOL_BAG_COLORS.length) % SCHOOL_BAG_COLORS.length });
    }
  }

  function addObstacle() {
    // [L4] Sò Nui 7 Màu: 1% mỗi lần sinh vật cản (không Boss/Racing). Dùng gameRand để đồng bộ Solo 1v1.
    const rainbowRoll = window.gameRand(), rainbowDur = window.gameRand();
    if (!bossMode && !racingMode && rainbowRoll < 0.01) {
      const sx = width + 28, sw = 28;   // [BAG] bịch đứng 28x38
      // Cách xa vật cản khác ít nhất 100px
      const clear = ![...obstacles, ...waterPits, ...rainbowItems].some(o => o.x < sx + sw + 100 && o.x + o.w > sx - 100);
      if (clear) {
        rainbowItems.push({ x: sx, y: groundY - 46 - 19, w: sw, h: 38, dur: 5 + rainbowDur * 15, phase: vfxRandom(0, 6.28) });
        return;
      }
    }
    if (beachMode) { addBeachObstacle(); return; }
    if (cityNight) { addNightObstacle(); return; }   // [GĐ1]
    if (villageMode) { addVillageObstacle(); return; }   // [GĐ2]
    if (schoolMode) { addSchoolObstacle(); return; }     // [SCHOOL]
    const spawnX = width + 28;
    const nearScaffold = (x, w, margin = 76) => platforms.some(p =>
      x < p.x + p.w + margin && x + w > p.x - margin
    );

    // City: increase bus frequency, but keep each bus separate from scaffold routes.
    if (cityMode && window.gameRand() < 0.28) {
      const h = clamp(height * random(0.34, 0.42), 72, 118);
      const ratio = busSprite.naturalWidth && busSprite.naturalHeight
        ? busSprite.naturalWidth / busSprite.naturalHeight : 1.42;
      const w = h * ratio;
      if (!nearScaffold(spawnX, w, 64)) {
        obstacles.push({ x: spawnX, y: groundY - h, w, h, type: 'bus', passed: false });
      }
      return;
    }

    const roll = window.gameRand();
    // Floating cans now also appear in City as independent obstacles.
    const canChance = cityMode ? 0.40 : overheadChance;
    if (roll < canChance) {
      const h = random(45, 62);
      const w = h * random(0.68, 0.84);
      const lane = window.gameRand() < (cityMode ? 0.65 : 0.5) ? 'low' : 'high';
      const y = lane === 'low'
        ? groundY - player.height - h * random(0.18, 0.35)
        : groundY - player.height - h - random(8, 30);
      if (!cityMode || !nearScaffold(spawnX, w, 66)) {
        obstacles.push({ x: spawnX, y, w, h, type: 'can', lane, passed: false, bobOffset: random(0, 6.28), bobSpeed: random(1.1, 2.2) });
      }
      return;
    }

    // City wall obstacles are created only by the occasional scaffold-combo route.
    const rollGround = window.gameRand();
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
  const CITY_OBSTACLE_RATE = 1.3;
  function cityGroundGap() {
    // Faster scrolling needs a longer ground segment so the player can fall off a deck,
    // touch down, and still have room to jump onto the next one.
    return (random(235, 295) + Math.max(0, speed - 231) * 0.24) * CITY_SCAFFOLD_GAP_MULT;
  }

  function currentMapKey() { return schoolMode ? 'school' : cityMode ? (cityNight ? 'night' : 'city') : (villageMode ? 'village' : (beachMode ? (beachSunset ? 'sunset' : 'beach') : 'desert')); }   // [GĐ2]
  // V23: chuyển map theo lộ trình. Cùng map thì giữ nguyên, không reset.
  function switchMap(target, first) {
    if (target === currentMapKey()) return;
    if (target === 'city') enterCity(first, false);
    else if (target === 'night') enterCity(first, true);   // [GĐ1]
    else if (target === 'village') enterVillage(first);   // [GĐ2]
    else if (target === 'school') enterSchool(first);     // [SCHOOL]
    else enterBeach(target === 'sunset', first);
  }

  // ---------- RACING: về Sa Mạc, đổi map theo lộ trình, hồi sinh tại vạch xuất phát ----------
  function enterDesert() {
    cityNight = false;   // [GĐ1]
    schoolMode = false; schoolRings = [];   // [SCHOOL]
    villageMode = false; villageDecor = []; windDir = 0; windTimer = 0; windCool = 8; windStreaks = [];   // [GĐ3-B2]   // [GĐ2]
    cityMode = false;
    beachMode = false;
    beachSunset = false;
    waterPits = [];
    platforms = [];
    groundPlatform = null;
    lightningStrikes = [];
    lightningStrikeTimer = 0;
    cityBuildings = [];
    player.onGround = true;
    player.velocityY = 0;
    player.y = groundY - player.height;
    spawnTimer = 0.8;
  }
  function racingSetMap(key) {
    if (!racingMode || state !== 'running' || key === currentMapKey()) return false;
    const fromDesert = currentMapKey() === 'desert';
    if (key === 'desert') enterDesert(); else switchMap(key, fromDesert);
    return true;
  }
  function racingRespawn() {
    rainbowUntil = 0; rainbowItems = [];   // [L4]
    if (!racingMode || state !== 'running') return;
    score = 0;
    enterDesert();
    speed = Math.min(width * 0.63, 380);
    cityElapsed = 0;
    // Xóa chướng ngại trong 450px phía trước mặt + vật cản đặc trưng map khác (xe buýt, tường, biển hiệu...)
    const DESERT_TYPES = ['cactus', 'double', 'crate', 'tall', 'can'];
    const from = player.x - 20, to = player.x + player.width + 450;
    obstacles.forEach(o => {
      if ((o.x + o.w > from && o.x < to) || !DESERT_TYPES.includes(o.type)) { o.ignored = true; o.racingCleared = true; }
    });
    obstacles = obstacles.filter(o => !o.racingCleared);
    spareHits = upgrades[selectedCharacter] >= 4 ? 1 : 0; // khôi phục giáp mặc định của nhân vật
    runMaxSpare = spareHits;
    squadGuards = 0;
    squadGuardUntil = 0;
    squadGuardWarned = false;
    dtPunchCount = 0; dtWasWheelie = false;
    dtPunchReadyAt = elapsedRun; dtSpeedApplied = false; dtWords = []; dtWordTimer = 0; dtPunchFx = [];
    if (selectedCharacter === 'duongtao') { skillActiveUntil = elapsedRun; skillTriggered = false; nextSkillAt = elapsedRun + skillInterval(); }
    updateShield(false);
    burst(player.x + player.width * 0.5, player.y + player.height * 0.5, 22);
    screenShake = 0.18;
    playTone(160, 0.2, 'sawtooth', 0.04);
    updateHud();
  }
  function spendCrystals(amount = 0) {
    const n = Math.max(0, Math.floor(amount));
    if (crystals < n) return false;
    crystals -= n;
    saveEconomy();
    saveMeta();
    updateLobby();
    return true;
  }

  function enterCity(first = true, night = false) {
    if (cityMode && cityNight === night) return;           // [GĐ1] cho phép City ngày ⇄ Night
    cityMode = true;
    cityNight = night;
    schoolMode = false; schoolRings = [];   // [SCHOOL]
    villageMode = false; villageDecor = []; windDir = 0; windTimer = 0; windCool = 8; windStreaks = [];   // [GĐ3-B2]   // [GĐ2]                                     // [GĐ1]
    beachMode = false;
    beachSunset = false;
    waterPits = [];
    // Chỉ mốc 3.000m mở bằng nhịp 0.8x; các mốc sau KHÔNG reset tốc độ đang chạy.
    if (first) {
      cityElapsed = 0;
      speed = 265; // 265 / 330 = 0.8x
    }
    obstacles = [];
    platforms = [];
    groundPlatform = null;
    player.onGround = true;
    player.velocityY = 0;
    player.y = groundY - player.height;
    spawnTimer = 0.8;
    nightPad = 0;                                          // [GĐ1]
    cityBuildings = [];
    if (!night) {                                          // [GĐ1] Night City: không giàn giáo
      const firstX = width + 255;
      const firstW = random(155, 190);
      platforms.push({ x: firstX, y: groundY - random(76, 94), w: firstW, h: 12, type: 'scaffold', passed: false });
      nextScaffoldX = firstX + firstW + cityGroundGap();
    }
    lightningStrikes = [];
    lightningStrikeTimer = 0;
    showToast(night
      ? 'NIGHT CITY! Sò Nui dưới đường, xe buýt lao nhanh, lon bia bay tầm đầu — đừng nhảy!'
      : (first ? 'MAP CITY! Xe buýt, thùng, bia dày đặc; thỉnh thoảng có dàn giáo làm bệ nhảy.' : 'CHUYỂN MAP: CITY! Xe buýt, thùng, bia dày đặc.'));
    playTone(740, 0.12, 'triangle', 0.035);
  }

  // =====================================================================
  // V22 — MAP BÃI BIỂN: hố nước · dù che nắng · biển hiệu treo cao
  // =====================================================================
  function enterBeach(sunset = false, first = true) {
    cityNight = false;   // [GĐ1]
    schoolMode = false; schoolRings = [];   // [SCHOOL]
    villageMode = false; villageDecor = []; windDir = 0; windTimer = 0; windCool = 8; windStreaks = [];   // [GĐ3-B2]   // [GĐ2]
    cityMode = false;
    beachMode = true;
    beachSunset = !!sunset;
    if (first) {
      cityElapsed = 0;
      speed = 265; // cùng nhịp mở đầu 0.8x như City rồi tăng dần
    }
    obstacles = [];
    platforms = [];
    waterPits = [];
    groundPlatform = null;
    player.onGround = true;
    player.velocityY = 0;
    player.y = groundY - player.height;
    spawnTimer = 0.8;
    lightningStrikes = [];
    lightningStrikeTimer = 0;
    showToast(beachSunset
      ? 'BÃI BIỂN HOÀNG HÔN! Nhịp độ nhanh hơn: hố nước, dù, biển hiệu treo cao / cắm đất / treo giữa trượt theo mũi tên.'
      : (first ? 'MAP BÃI BIỂN! Nhảy qua hố nước & dù, chạy luồn biển hiệu treo cao, nhảy qua biển hiệu cắm đất — xem mũi tên ở biển hiệu giữa!' : 'CHUYỂN MAP: BÃI BIỂN! Hố nước, dù che nắng và biển hiệu đủ kiểu.'));
    playTone(660, 0.12, 'triangle', 0.035);
  }

  // ===== [GĐ2] VÀO MAP LÀNG QUÊ =====
  function enterVillage(first = true) {
    windDir = 0; windTimer = 0; windCool = 8; windStreaks = [];   // [GĐ3-B2]
    cityMode = false; cityNight = false;
    beachMode = false; beachSunset = false;
    villageMode = true;
    schoolMode = false; schoolRings = [];   // [SCHOOL]
    waterPits = [];
    villageDecor = [];
    // Mốc 3.000m mở bằng nhịp 0.8x; các mốc sau giữ nguyên tốc độ đang chạy
    if (first) { cityElapsed = 0; speed = 265; }
    obstacles = [];
    platforms = [];
    groundPlatform = null;
    player.onGround = true;
    player.velocityY = 0;
    player.y = groundY - player.height;
    spawnTimer = 0.8;
    lightningStrikes = [];
    lightningStrikeTimer = 0;
    showToast(first
      ? 'MAP LÀNG QUÊ! Sông lớn rộng — canh mép mà nhảy. Cây dừa có chùm: tán treo cao, chạy dưới là an toàn.'
      : 'CHUYỂN MAP: LÀNG QUÊ! Sông lớn & cây dừa có chùm.');
    playTone(520, 0.12, 'triangle', 0.035);
  }

  const BEACH_SIGN_TEXTS = ['BÃI BIỂN', 'KEM MÁT LẠNH', 'NƯỚC DỪA', 'CẤM NHẢY!', 'CẨN THẬN ĐẦU'];
  const BEACH_UMBRELLA_COLORS = [['#ff5252', '#ffffff'], ['#2f9bff', '#ffffff'], ['#ffb02e', '#ffffff']];

  // Mỗi vật cản bãi biển thuộc 1 trong 2 loại hành động: 'jump' (phải nhảy) hoặc 'stay' (chạy bên dưới, không được nhảy).
  // Khoảng cách giữa 2 vật cản luôn đủ để người chơi tiếp đất / hạ đầu trước khi gặp vật tiếp theo.
  // V23: biển hiệu có 3 biến thể — 'hang' (treo cao, chạy dưới) · 'ground' (cắm sát đất, nhảy qua) · 'mid' (treo tầm giữa:
  // lại gần < 250px thì trượt lên cao hoặc sập xuống đất theo mũi tên). Kết quả của biển 'mid' được bốc sẵn bằng window.gameRand()
  // lúc sinh ra (không bốc lúc trượt) để Solo 1v1 không lệch seed.
  const BEACH_GROUND_SIGN_TEXTS = ['CHÚ Ý!', 'NHẢY NÀO!', 'KẸT CÁT', 'CẨN THẬN'];
  const MID_SIGN_TRIGGER = 250;
  function addBeachObstacle() {
    const roll = window.gameRand();
    const kind = roll < 0.32 ? 'pit' : roll < 0.54 ? 'umbrella' : roll < 0.80 ? 'sign' : 'can';
    let w = 0, h = 0, lane = 'low', need = 'jump', variant = 'hang', midUp = false;
    if (kind === 'pit') {
      const large = window.gameRand() < 0.45;
      w = large ? random(122, 152) : random(70, 92); // V23: hố nhỏ ~70–92px, hố lớn ~122–152px (trước 60–80 / 105–135)
    } else if (kind === 'umbrella') {
      h = random(54, 66);
      w = h * random(0.86, 1.0);
    } else if (kind === 'sign') {
      const sv = window.gameRand();
      variant = sv < 0.38 ? 'hang' : sv < 0.68 ? 'ground' : 'mid';
      if (variant === 'hang') { w = random(96, 130); h = random(42, 52); need = 'stay'; }
      else if (variant === 'ground') { w = random(70, 92); h = random(44, 54); need = 'jump'; }
      else {
        w = random(104, 130); h = random(40, 48);
        midUp = window.gameRand() < 0.5;      // true: trượt lên cao (chạy dưới) · false: sập xuống đất (nhảy qua)
        need = midUp ? 'stay' : 'jump';
      }
    } else {
      h = random(45, 62);
      w = h * random(0.68, 0.84);
      lane = window.gameRand() < 0.5 ? 'low' : 'high';
      need = lane === 'low' ? 'jump' : 'stay';
    }

    let spawnX = width + 28;
    const hazards = [...obstacles, ...waterPits];
    if (hazards.length) {
      const prev = hazards.reduce((a, b) => (a.x + a.w > b.x + b.w ? a : b));
      const reach = speed * 0.78; // quãng đường bay được trong một cú nhảy
      let minGap = 160;
      if (need === 'stay' && prev.beachNeed === 'jump') minGap = reach * 0.55 + 70;       // vừa nhảy xong phải kịp tiếp đất trước khi tới biển hiệu
      else if (need === 'jump' && prev.beachNeed === 'jump') minGap = 150 + speed * 0.12;  // tiếp đất rồi nhảy tiếp
      else if (need === 'jump' && prev.beachNeed === 'stay' && prev.variant === 'mid') minGap = 190; // biển giữa vừa trượt xong, chừa chỗ nhìn mũi tên kế tiếp
      spawnX = Math.max(spawnX, prev.x + prev.w + minGap);
    }

    if (kind === 'pit') {
      waterPits.push({ x: spawnX, w, passed: false, absorbed: false, beachNeed: 'jump' });
    } else if (kind === 'umbrella') {
      obstacles.push({ x: spawnX, y: groundY - h, w, h, type: 'umbrella', passed: false, beachNeed: 'jump', colors: BEACH_UMBRELLA_COLORS[Math.floor(vfxRandom(0, BEACH_UMBRELLA_COLORS.length))] });
    } else if (kind === 'sign') {
      const highY = groundY - player.height - 14 - h; // khoảng trống phía dưới bảng cao hơn đầu nhân vật ~14px → chạy bên dưới an toàn, nhảy lên là đụng
      const base = { x: spawnX, w, h, type: 'beachSign', passed: false, beachNeed: need, variant };
      if (variant === 'hang') {
        obstacles.push({ ...base, y: highY, label: BEACH_SIGN_TEXTS[Math.floor(vfxRandom(0, BEACH_SIGN_TEXTS.length))] });
      } else if (variant === 'ground') {
        obstacles.push({ ...base, y: groundY - h, label: BEACH_GROUND_SIGN_TEXTS[Math.floor(vfxRandom(0, BEACH_GROUND_SIGN_TEXTS.length))] });
      } else {
        const midY = groundY - player.height * 0.78 - h * 0.55; // chắn cả lúc đứng chạy lẫn nhảy thấp → buộc đọc mũi tên
        obstacles.push({ ...base, y: midY, midUp, highY, lowY: groundY - h, slide: 0 });
      }
    } else {
      const y = lane === 'low'
        ? groundY - player.height - h * random(0.18, 0.35)
        : groundY - player.height - h - random(8, 30);
      obstacles.push({ x: spawnX, y, w, h, type: 'can', lane, passed: false, beachNeed: need, bobOffset: random(0, 6.28), bobSpeed: random(1.1, 2.2) });
    }
  }

  // Biển hiệu treo tầm giữa: khi nhân vật lại gần < 250px thì trượt lên cao hoặc sập xuống đất theo mũi tên cảnh báo.
  function updateMidSign(o, dt) {
    if (o.variant !== 'mid') return;
    if (!o.slide && o.x - (player.x + player.width) < MID_SIGN_TRIGGER) {
      o.slide = 1; // đang trượt
      if (!o.midUp) { playTone(180, 0.12, 'sawtooth', 0.03); }
    }
    if (o.slide === 1) {
      const target = o.midUp ? o.highY : o.lowY;
      const step = (o.midUp ? 380 : 720) * dt; // trượt lên êm, sập xuống nhanh
      if (Math.abs(target - o.y) <= step) {
        o.y = target;
        o.slide = 2; // đã vào vị trí
        if (!o.midUp) {
          screenShake = Math.max(screenShake, 0.08);
          burst(o.x + o.w / 2, groundY - 2, 8, true);
        }
      } else o.y += Math.sign(target - o.y) * step;
    }
  }

  // Hố nước: cuộn theo nền; nhân vật chạm mặt đường lúc tâm bàn chân nằm trong lòng hố → rơi xuống nước.
  function updateWaterPits(dt, skillActive) {
    waterPits.forEach(pit => {
      pit.x -= speed * dt;
      if (!pit.passed && pit.x + pit.w < player.x) {
        pit.passed = true;
        if (!pit.filled) phatAddRage(PHAT_RAGE_PER_OBSTACLE); // V23: vượt qua hố nước cũng cộng Nộ
        if (!bossMode) { score += 4; awardCoinsForScore(); }
      }
    });
    waterPits = waterPits.filter(pit => pit.x + pit.w > -30);
    if (state !== 'running' || groundPlatform || player.y + player.height < groundY - 0.5) return; // đang ở trên không / trên bệ
    const feet = player.x + player.width * 0.5;
    for (const pit of waterPits) {
      if (pit.absorbed || pit.filled) continue; // hố đã bị ∫ f(x)dx lấp đầy thì đi qua như đường thường
      if (feet > pit.x + 6 && feet < pit.x + pit.w - 6) { fallInWater(pit, skillActive); break; }
    }
  }
  function fallInWater(pit, skillActive) {
    if (rainbowActive()) return;   // [L4] bất tử cầu vồng: lướt qua sông/hố an toàn
    if (skillActive && IMMUNE_SKILL_CHARS.includes(selectedCharacter)) return; // kỹ năng miễn nhiễm: đi qua an toàn
    if (bbSafeNow()) return;   // [BÙI BẰNG] bất tử 0,8s sau khi xuống xe
    if (tanGraceNow()) return; // V25: Tân Nika vừa hết chiêu, đáp đất an toàn
    if (tdGraceNow()) return;  // V26: Tô Duy Buddha vừa hết Cân Đẩu Vân, đáp đất an toàn 0,8s
    if (isRider() && riderInvulnActive()) return;                 // Trọng Riding: vừa bỏ ngựa, 1 giây bất tử
    if (isRider() && riderMounted && !bossMode) { pit.absorbed = true; riderBailOut(); return; } // cưỡi ngựa: nhảy vọt khỏi hố
    if (phatAutoSave()) { pit.absorbed = true; return; } // Phát đang đầy Nộ: tự kích hoạt cứu nguy
    burst(player.x + player.width * 0.5, groundY - 2, 16, false, '#9be4ff');
    const guardedBySquad = consumeSquadGuard();
    if (guardedBySquad || spareHits > 0) {
      if (!guardedBySquad) spareHits--;
      pit.absorbed = true; // hố này không còn gây hại lần nữa
      if (!guardedBySquad) updateShield(true);
      player.velocityY = -player.jumpPower * 0.95; // nảy lên khỏi mặt nước
      player.onGround = false;
      groundPlatform = null;
      if (!guardedBySquad) showToast(`RƠI XUỐNG NƯỚC! Giáp bảo hộ vỡ, còn ${spareHits} lượt chịu đòn.`);
      playTone(250, 0.16, 'triangle', 0.045);
    } else {
      endGame();
    }
  }

  // ----- Vẽ Map Bãi Biển -----
  function drawPalm(x, baseY, h, lean) {
    const topX = x + lean, topY = baseY - h;
    ctx.strokeStyle = beachSunset ? '#3b2336' : '#8a5a2b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.quadraticCurveTo(x + lean * 0.2, baseY - h * 0.55, topX, topY); ctx.stroke();
    ctx.fillStyle = beachSunset ? '#2c4a43' : '#2f9e44';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.62;
      ctx.save(); ctx.translate(topX, topY); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(13, 0, 15, 4.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = beachSunset ? '#3b2336' : '#6b3f1d';
    ctx.beginPath(); ctx.arc(topX, topY + 2, 2.6, 0, Math.PI * 2); ctx.fill();
  }

  function drawBeachBackground() {
    const scroll = state === 'running' ? worldDistance : worldTime * 30;
    const horizon = groundY - Math.max(52, height * 0.17);
    const seaBottom = groundY - 12;

    // Bầu trời nắng xanh sáng
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    if (beachSunset) {
      // Hoàng hôn: tím chàm → hồng → cam → vàng nhạt sát đường chân trời
      sky.addColorStop(0, '#2f2a6b');
      sky.addColorStop(0.45, '#b84f8e');
      sky.addColorStop(0.78, '#ff8a5c');
      sky.addColorStop(1, '#ffd08a');
    } else {
      sky.addColorStop(0, '#46b4f4');
      sky.addColorStop(1, '#bdeafc');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Mặt trời
    const sr = Math.min(30, height * 0.10) * (beachSunset ? 1.35 : 1);
    const sx = width * (beachSunset ? 0.7 : 0.82);
    const sy = beachSunset ? horizon - sr * 0.35 : height * 0.19; // hoàng hôn: mặt trời hạ thấp sát mặt biển
    const halo = ctx.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 2.6);
    halo.addColorStop(0, beachSunset ? 'rgba(255, 170, 90, .75)' : 'rgba(255, 244, 170, .65)');
    halo.addColorStop(1, beachSunset ? 'rgba(255, 120, 90, 0)' : 'rgba(255, 244, 170, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(sx, sy, sr * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = beachSunset ? '#ffb347' : '#ffd84a';
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();

    // Mây trôi
    if (beachSunset) ctx.globalAlpha = 0.5;
    clouds.forEach(c => drawCloud(c.x, c.y, c.scale * 0.9));
    ctx.globalAlpha = 1;

    // Biển xa + sóng xanh
    const sea = ctx.createLinearGradient(0, horizon, 0, seaBottom);
    if (beachSunset) {
      sea.addColorStop(0, '#ff9560');
      sea.addColorStop(0.45, '#b9508f');
      sea.addColorStop(1, '#5b3f9e');
    } else {
      sea.addColorStop(0, '#1f9ce0');
      sea.addColorStop(1, '#6fd3f3');
    }
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizon, width, seaBottom - horizon + 1);
    ctx.strokeStyle = beachSunset ? 'rgba(255, 214, 190, .5)' : 'rgba(255, 255, 255, .55)';
    ctx.lineWidth = 1.5;
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      const wy = horizon + 7 + r * ((seaBottom - horizon - 12) / rows);
      ctx.beginPath();
      for (let x = 0; x <= width + 8; x += 8) {
        const yy = wy + Math.sin((x + scroll * (0.12 + r * 0.05)) * 0.06 + worldTime * (1.1 + r * 0.4) + r) * 2.2;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    if (beachSunset) {
      // Vệt nắng lấp lánh dưới mặt trời
      ctx.fillStyle = 'rgba(255, 226, 160, .55)';
      for (let i = 0; i < 6; i++) {
        const gy = horizon + 4 + i * ((seaBottom - horizon - 8) / 6);
        const gw = sr * 1.7 * (1 - i * 0.1);
        ctx.fillRect(sx - gw / 2 + Math.sin(worldTime * 2 + i * 1.3) * 4, gy, gw, 2);
      }
    }

    // Bờ cát ướt + bọt sóng vỗ bờ
    ctx.fillStyle = beachSunset ? '#d9a577' : '#ead28a';
    ctx.fillRect(0, seaBottom, width, groundY - seaBottom);
    ctx.fillStyle = beachSunset ? 'rgba(255, 230, 215, .85)' : 'rgba(255, 255, 255, .9)';
    ctx.beginPath(); ctx.moveTo(0, seaBottom + 5);
    for (let x = 0; x <= width + 8; x += 8) ctx.lineTo(x, seaBottom + 1 + Math.sin(x * 0.07 + worldTime * 2.2) * 2.4 + 2);
    ctx.lineTo(width, seaBottom - 3); ctx.lineTo(0, seaBottom - 3); ctx.closePath(); ctx.fill();

    // Hàng dừa (parallax, vị trí theo toạ độ thế giới nên không bị nhảy hình)
    const palmSpan = 250;
    const palmScroll = scroll * 0.3;
    const firstPalm = Math.floor(palmScroll / palmSpan) - 1;
    for (let k = firstPalm; k < firstPalm + Math.ceil(width / palmSpan) + 3; k++) {
      const v = ((k % 3) + 3) % 3;
      drawPalm(k * palmSpan - palmScroll + 40 + v * 28, groundY - 5, 40 + v * 8, 7 - v * 4);
    }

    // Mặt đường = bãi cát vàng
    ctx.fillStyle = beachSunset ? '#e8b27d' : '#f5dc8c';
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.fillStyle = beachSunset ? '#b8794a' : '#d8b45a';
    ctx.fillRect(0, groundY, width, 3);
    ctx.strokeStyle = beachSunset ? 'rgba(140, 90, 60, .35)' : 'rgba(190, 150, 70, .35)';
    ctx.lineWidth = 1.5;
    const off = scroll % 64;
    for (let x = -off; x < width + 40; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, groundY + 13); ctx.lineTo(x + 18, groundY + 13); ctx.stroke();
    }
    ctx.fillStyle = beachSunset ? 'rgba(140, 90, 60, .45)' : 'rgba(190, 150, 70, .45)';
    for (let x = 22; x < width; x += 97) {
      const gx = (x - (scroll * 0.5) % (width + 30) + width + 30) % (width + 30);
      ctx.fillRect(gx, groundY + 22 + (x % 2) * 4, 3, 2);
    }
  }

  function drawWaterPits() {
    waterPits.forEach(pit => {
      const { x, w } = pit;
      if (x > width + 10 || x + w < -10) return;
      if (villageMode) { drawVillageRiver(pit); return; }   // [GĐ2] sông lớn
      const y = groundY, h = height - groundY;
      if (pit.filled) {
        // V23: hố đã được ∫ f(x)dx lấp đầy — nền cát + các cột Riemann xanh ngọc
        ctx.fillStyle = beachSunset ? '#e8b27d' : '#f5dc8c';
        ctx.fillRect(x - 1, y, w + 2, h);
        const cols = Math.max(3, Math.floor(w / 12));
        const bw = w / cols;
        ctx.fillStyle = 'rgba(25, 211, 197, .38)';
        for (let i = 0; i < cols; i++) {
          const bh = 8 + 7 * Math.abs(Math.sin(i * 0.9 + worldTime * 3));
          ctx.fillRect(x + i * bw + 1, y, bw - 2, bh);
        }
        ctx.fillStyle = beachSunset ? '#b8794a' : '#d8b45a';
        ctx.fillRect(x - 1, y, w + 2, 3);
        return;
      }
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, beachSunset ? '#ff9d70' : '#4cc7f5');
      g.addColorStop(1, beachSunset ? '#6e3fa3' : '#1b7fc4');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      // gợn sóng trong hố
      ctx.strokeStyle = 'rgba(255, 255, 255, .55)';
      ctx.lineWidth = 2;
      for (let row = 0; row < 2; row++) {
        const wy = y + 10 + row * 13;
        ctx.beginPath();
        for (let px = x + 5; px <= x + w - 5; px += 6) {
          const yy = wy + Math.sin(px * 0.18 + worldTime * 4 + row * 1.7) * 2;
          if (px === x + 5) ctx.moveTo(px, yy); else ctx.lineTo(px, yy);
        }
        ctx.stroke();
      }
      // mặt nước + viền bọt sóng trắng hai bên
      ctx.fillStyle = 'rgba(255, 255, 255, .4)';
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = 'rgba(255, 255, 255, .92)';
      ctx.fillRect(x - 2, y, 5, h);
      ctx.fillRect(x + w - 3, y, 5, h);
      for (const ex of [x, x + w]) {
        const dir = ex === x ? 1 : -1;
        for (let i = 0; i < 5; i++) {
          const by = y + 4 + i * ((h - 8) / 4);
          const bx = ex + dir * (3 + Math.sin(worldTime * 5 + i * 2 + ex * 0.05) * 1.6);
          ctx.beginPath(); ctx.arc(bx, by, 3.4 - (i % 2) * 0.9, 0, Math.PI * 2); ctx.fill();
        }
      }
    });
  }

  function drawUmbrella(o) {
    const cx = o.x + o.w / 2;
    const baseY = o.y + o.h;
    const colors = o.colors || BEACH_UMBRELLA_COLORS[0];
    ctx.fillStyle = 'rgba(120, 90, 30, .25)';
    ctx.beginPath(); ctx.ellipse(cx, baseY + 2, o.w * 0.42, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, o.y + o.h * 0.45); ctx.lineTo(cx, baseY); ctx.stroke();
    const bot = o.y + o.h * 0.5, ry = o.h * 0.46, rx = o.w / 2, n = 6;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? colors[1] : colors[0];
      ctx.beginPath(); ctx.moveTo(cx, bot);
      ctx.ellipse(cx, bot, rx, ry, 0, Math.PI + i * Math.PI / n, Math.PI + (i + 1) * Math.PI / n);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx, bot, rx, ry, 0, Math.PI, Math.PI * 2); ctx.lineTo(cx - rx, bot); ctx.stroke();
    ctx.fillStyle = '#7a5230';
    ctx.beginPath(); ctx.arc(cx, o.y + o.h * 0.04, 2.4, 0, Math.PI * 2); ctx.fill();
  }

  function drawSignArrow(cx, cy, size, up, color) {
    const d = up ? -1 : 1; // hướng mũi tên
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy + d * size);
    ctx.lineTo(cx + size * 0.85, cy - d * size * 0.1);
    ctx.lineTo(cx + size * 0.3, cy - d * size * 0.1);
    ctx.lineTo(cx + size * 0.3, cy - d * size);
    ctx.lineTo(cx - size * 0.3, cy - d * size);
    ctx.lineTo(cx - size * 0.3, cy - d * size * 0.1);
    ctx.lineTo(cx - size * 0.85, cy - d * size * 0.1);
    ctx.closePath();
    ctx.fill();
  }

  // Biển hiệu cắm sát đất: bảng gỗ trên cọc, phải nhảy qua.
  function drawGroundSign(o) {
    const bh = o.h * 0.64;
    const cx = o.x + o.w / 2;
    ctx.fillStyle = 'rgba(120, 90, 30, .25)';
    ctx.beginPath(); ctx.ellipse(cx, groundY + 2, o.w * 0.42, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(cx - 3, o.y + bh - 2, 6, o.h - bh + 2);
    ctx.fillStyle = '#fff5cf';
    roundedRect(o.x, o.y, o.w, bh, 7); ctx.fill();
    ctx.strokeStyle = '#e0793a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ff8a4c';
    roundedRect(o.x + 4, o.y + 4, o.w - 8, 5, 2.5); ctx.fill();
    ctx.save();
    ctx.fillStyle = '#c2410c';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = 15;
    ctx.font = `900 ${fs}px sans-serif`;
    while (fs > 8 && ctx.measureText(o.label || 'CHÚ Ý!').width > o.w - 12) { fs--; ctx.font = `900 ${fs}px sans-serif`; }
    ctx.fillText(o.label || 'CHÚ Ý!', cx, o.y + bh * 0.66);
    ctx.restore();
  }

  // Biển hiệu treo tầm giữa: mũi tên ▲ (trượt lên → chạy dưới) hoặc ▼ (sập xuống → nhảy qua).
  function drawMidSign(o) {
    const pulse = 0.72 + 0.28 * Math.sin(worldTime * 10);
    if (!o.knocked) {
      ctx.strokeStyle = 'rgba(60, 40, 25, .55)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x + 16, -10); ctx.lineTo(o.x + 16, o.y);
      ctx.moveTo(o.x + o.w - 16, -10); ctx.lineTo(o.x + o.w - 16, o.y);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffe27a';
    roundedRect(o.x, o.y, o.w, o.h, 7); ctx.fill();
    ctx.strokeStyle = '#d62828'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#d62828';
    roundedRect(o.x + 4, o.y + 4, o.w - 8, 5, 2.5); ctx.fill();
    const arrowColor = o.midUp ? '#1b9e3e' : '#d62828';
    ctx.save();
    ctx.globalAlpha = pulse;
    drawSignArrow(o.x + 19, o.y + o.h * 0.62, o.h * 0.27, !!o.midUp, arrowColor);
    drawSignArrow(o.x + o.w - 19, o.y + o.h * 0.62, o.h * 0.27, !!o.midUp, arrowColor);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#7a1d1d';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 10px sans-serif';
    ctx.fillText('CẢNH BÁO', o.x + o.w / 2, o.y + o.h * 0.64);
    ctx.restore();
  }

  function drawBeachSign(o) {
    if (o.variant === 'ground') { drawGroundSign(o); return; }
    if (o.variant === 'mid') { drawMidSign(o); return; }
    if (!o.knocked) {
      // Cột trụ chỉ vẽ mờ làm nền — KHÔNG tính va chạm.
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#6b4a2b';
      const postTop = o.y - 8;
      ctx.fillRect(o.x + 5, postTop, 5, groundY - postTop);
      ctx.fillRect(o.x + o.w - 10, postTop, 5, groundY - postTop);
      ctx.fillRect(o.x + 5, postTop, o.w - 10, 4);
      ctx.restore();
    }
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(o.x + 14, o.y - 4); ctx.lineTo(o.x + 14, o.y + 2);
    ctx.moveTo(o.x + o.w - 14, o.y - 4); ctx.lineTo(o.x + o.w - 14, o.y + 2);
    ctx.stroke();
    ctx.fillStyle = '#fff5cf';
    roundedRect(o.x, o.y, o.w, o.h, 7); ctx.fill();
    ctx.strokeStyle = '#e0793a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ff8a4c';
    roundedRect(o.x + 4, o.y + 4, o.w - 8, 6, 3); ctx.fill();
    ctx.save();
    ctx.fillStyle = '#c2410c';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = 17;
    ctx.font = `900 ${fs}px sans-serif`;
    while (fs > 9 && ctx.measureText(o.label || 'BÃI BIỂN').width > o.w - 14) { fs--; ctx.font = `900 ${fs}px sans-serif`; }
    ctx.fillText(o.label || 'BÃI BIỂN', o.x + o.w / 2, o.y + o.h * 0.64);
    ctx.restore();
  }

  const overStats = $('overStats');
  const bossResultEl = $('bossResult');
  const retryText = $('retryText');

  // =====================================================================
  // V22 — TÂN · NÉM CHỔI: chổi cán đỏ đầu vàng xoay tròn bay ~360px phía trước, hất văng chướng ngại
  // =====================================================================
  const IMMUNE_SKILL_CHARS = ['duy', 'murat', 'duyquandoi', 'toduy', 'tien', 'trieu', 'tan', 'phat', 'onghai', 'quang', 'duongtao', 'buibang', 'trongriding']; // kỹ năng miễn nhiễm va chạm
  const BROOM_RANGE = 360;     // tầm bay của mỗi cây chổi (px)
  const BROOM_SPEED = 780;     // tốc độ bay (px/s)
  const BROOM_INTERVAL = 0.36; // nhịp ném (giây)
    let megaBroomThrown = false;
  function throwBroom(mega = false) {
    brooms.push({
      x0: player.x + player.width * 0.8,
      y: mega ? groundY - player.height * 0.65 : player.y + player.height * 0.5,
      travel: 0,
      angle: 0,
      mega
    });
    if (mega) {
      screenShake = Math.max(screenShake, 0.14);
      playTone(280, 0.22, 'sawtooth', 0.045);
    }
  }
  function updateBrooms(dt) {
    brooms.forEach(b => {
      b.travel += (b.mega ? 1050 : BROOM_SPEED) * dt;
      b.angle += (b.mega ? 12 : 17) * dt;
    });
    brooms = brooms.filter(b => b.travel < (b.mega ? width + 120 : BROOM_RANGE));
  }
  function broomHits(x, w) {
    return brooms.some(b => {
      const bx = b.x0 + b.travel;
      const hitRadius = b.mega ? 85 : 36;
      return x < bx + hitRadius && x + w > bx - hitRadius;
    });
  }
  function drawBroom(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.translate(-8, 0);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8f1d1d'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.strokeStyle = '#e53935'; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.fillStyle = '#ff7a2f';
    ctx.beginPath(); ctx.moveTo(12, -3); ctx.lineTo(21, -12); ctx.lineTo(21, 12); ctx.lineTo(12, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f1d23f';
    ctx.beginPath(); ctx.moveTo(21, -12); ctx.lineTo(42, -16); ctx.lineTo(42, 16); ctx.lineTo(21, 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160, 125, 20, .75)'; ctx.lineWidth = 1.2;
    for (let i = -12; i <= 12; i += 6) { ctx.beginPath(); ctx.moveTo(22, i * 0.9); ctx.lineTo(42, i * 1.2); ctx.stroke(); }
    ctx.restore();
  }
  function drawBrooms() {
    brooms.forEach(b => {
      const maxDist = b.mega ? width + 120 : BROOM_RANGE;
      const t = b.travel / maxDist;
      ctx.save();
      ctx.globalAlpha = b.mega ? 1 : clamp(1 - Math.max(0, t - 0.75) / 0.25, 0, 1);
      ctx.translate(b.x0 + b.travel, b.y - (b.mega ? 0 : Math.sin(t * Math.PI) * 10));
      if (b.mega) {
        ctx.scale(2.5, 2.5);
        ctx.shadowColor = '#ffd34d';
        ctx.shadowBlur = 16;
      }
      drawBroom(0, 0, b.angle);
      ctx.restore();
    });
  }
  

  // =====================================================================
  // V23 — PHÁT · TÍCH NỘ QUYỀN CHỦ ĐỘNG
  // Nạp Nộ: +10 mỗi chướng ngại vượt qua (hoặc đạn / tên lửa Boss né được), +10 mỗi 250m. Đủ Nộ → bấm nút / E / S,
  // hoặc tự kích hoạt cứu nguy khi sắp va chạm. Trong lúc bật chiêu: miễn nhiễm 100% + 1 trong 3 hiệu ứng, không tích thêm Nộ.
  // =====================================================================
  // =====================================================================
  // V24 — ÔNG HAI · LÀO THỦ TU TIÊN (bay trên điếu cày, nhả vòng khói)
  // =====================================================================
  const ONGHAI_RING_RANGE = 380;
  const ONGHAI_RING_SPEED = 760;
  const ONGHAI_RING_INTERVAL = 0.45;
  const ONGHAI_LAND_CLEAR = 180;
  const onghaiActiveNow = () => selectedCharacter === 'onghai' && state === 'running' && skillTriggered && elapsedRun < skillActiveUntil;

  function onghaiPipe() {
    const len = player.width * 2.1;
    const cx = player.x + player.width * 0.5;
    const cy = player.y + player.height * 0.97;
    const ang = -0.1 + Math.sin(worldTime * 3) * 0.025;
    const thick = Math.max(9, player.height * 0.09);
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const at = (lx, ly) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
    return { len, cx, cy, ang, thick, mouth: at(len * 0.4, -thick * 1.9), tail: at(-len * 0.5, 0) };
  }
  const onghaiCanKnock = (o) => o.type === 'can' || (o.type === 'beachSign' && o.variant !== 'ground') || o.type === 'coconutTree' || o.type === 'schoolBag';   // [GĐ2] thêm tán dừa · [SCHOOL] cặp sách bay

  function updateSmokeRings(dt) {
    smokeRings.forEach(r => { r.travel += ONGHAI_RING_SPEED * dt; });
    smokeRings = smokeRings.filter(r => r.travel < ONGHAI_RING_RANGE);
  }
  function smokeRingHits(x, w) {
    return smokeRings.some(r => { const rx = r.x0 + r.travel; return x < rx + 26 && x + w > rx - 26; });
  }

  function onghaiClearAhead() {
    const front = player.x + player.width + ONGHAI_LAND_CLEAR;
    obstacles.forEach(o => {
      if (!o.wipedByOngHai && o.x < front && o.x + o.w > player.x - 10) {
        o.wipedByOngHai = true;
        burst(o.x + o.w / 2, o.y + o.h / 2, 8, false, '#e9e4d2');
      }
    });
    waterPits.forEach(p => { if (p.x < front && p.x + p.w > player.x - 10) p.filled = true; });
  }

  function onghaiEndRoll() {
    onghaiRolled = true;
    const roll = Math.random();
    if (roll < 0.60) {
      nextSkillAt = skillActiveUntil + Math.round(skillInterval() * 0.85 * 10) / 10;
      phatPopup('ÊM ÁI · HỒI CHIÊU -15%', '#8ff0a4');
      playTone(660, 0.14, 'triangle', 0.035);
    } else if (roll < 0.90) {
      let extra = 5 + Math.random() * 7;
      if (bossMode) extra *= window.GameBridge.boss.cfg.skillMult;
      extra = Math.round(extra * 10) / 10;
      skillActiveUntil += extra;
      nextSkillAt = skillActiveUntil + skillInterval();
      onghaiGold = true;
      phatPopup(`TU TIÊN · +${extra}s BAY!`, '#ffd34d');
      burst(player.x + player.width * 0.5, player.y + player.height * 0.6, 22, false, '#ffd34d');
      playTone(880, 0.2, 'triangle', 0.04);
    } else {
      phatPopup('TẮT ĐIẾU · HẠ CÁNH', '#d0d0d0');
      playTone(220, 0.16, 'sawtooth', 0.03);
    }
  }

  function onghaiStep(dt, skillActive) {
    if (selectedCharacter !== 'onghai' || state !== 'running') return;
    if (skillActive) {
      onghaiFlying = true;
      const target = groundY - player.height * 1.4 + Math.sin(worldTime * 3) * 6;
      player.y += (target - player.y) * Math.min(1, dt * 8);
      player.velocityY = 0; player.onGround = false; groundPlatform = null;
      onghaiPuffTimer -= dt;
      if (onghaiPuffTimer <= 0) {
        onghaiPuffTimer = 0.05;
        const t = onghaiPipe().tail;
        particles.push({ x: t.x, y: t.y, vx: -vfxRandom(70, 150), vy: vfxRandom(-35, 5), g: -18, life: vfxRandom(0.5, 0.85), maxLife: 0.85, size: vfxRandom(3, 6.5), dust: true, color: Math.random() < 0.5 ? 'rgba(245,245,245,.85)' : 'rgba(165,165,165,.8)' });
      }
      onghaiRingTimer -= dt;
      if (onghaiRingTimer <= 0) {
        onghaiRingTimer = ONGHAI_RING_INTERVAL;
        const m = onghaiPipe().mouth;
        smokeRings.push({ x0: m.x, y: m.y, travel: 0, gold: onghaiGold });
        playTone(vfxRandom(300, 380), 0.07, 'sine', 0.02);
      }
    } else if (onghaiFlying) {
      onghaiFlying = false; onghaiGold = false; onghaiLanding = true;
      burst(player.x + player.width * 0.5, player.y + player.height, 14, false, '#e8c46a');
    }
    if (onghaiLanding) {
      onghaiClearAhead();
      if (player.onGround) {
        onghaiLanding = false;
        screenShake = Math.max(screenShake, 0.1);
        burst(player.x + player.width * 0.5, groundY - 2, 16, true);
        playTone(150, 0.2, 'sawtooth', 0.04);
      }
    }
  }

  function drawOngHaiPipe() {
    const p = onghaiPipe();
    const L = p.len, T = p.thick;
    ctx.save();
    ctx.translate(p.cx, p.cy); ctx.rotate(p.ang);
    if (onghaiGold) { ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 16; }
    ctx.fillStyle = '#5e3b1c';
    ctx.beginPath();
    ctx.moveTo(-L * 0.34, T * 0.4); ctx.lineTo(-L * 0.04, T * 0.4); ctx.lineTo(-L * 0.08, T * 1.5); ctx.lineTo(-L * 0.30, T * 1.5);
    ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(0, -T / 2, 0, T / 2);
    g.addColorStop(0, '#e8c46a'); g.addColorStop(0.5, '#c9953a'); g.addColorStop(1, '#8a5a1c');
    ctx.fillStyle = g;
    roundedRect(-L / 2, -T / 2, L, T, T / 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#7a4c14'; ctx.lineWidth = 2;
    [-0.28, -0.05, 0.2].forEach(n => { ctx.beginPath(); ctx.moveTo(L * n, -T / 2); ctx.lineTo(L * n, T / 2); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(255,240,180,.55)';
    ctx.beginPath(); ctx.moveTo(-L / 2 + T / 2, -T * 0.2); ctx.lineTo(L / 2 - T / 2, -T * 0.2); ctx.stroke();
    const bx = L * 0.4;
    ctx.fillStyle = '#6b4423';
    ctx.beginPath();
    ctx.moveTo(bx - T * 0.45, -T * 0.4); ctx.lineTo(bx - T * 0.7, -T * 1.7); ctx.lineTo(bx + T * 0.7, -T * 1.7); ctx.lineTo(bx + T * 0.45, -T * 0.4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b1a0d';
    ctx.beginPath(); ctx.ellipse(bx, -T * 1.7, T * 0.7, T * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,120,40,${0.6 + Math.sin(worldTime * 18) * 0.3})`;
    ctx.beginPath(); ctx.arc(bx, -T * 1.72, T * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a240f';
    ctx.beginPath(); ctx.ellipse(-L / 2 + T * 0.15, 0, T * 0.28, T * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawSmokeRings() {
    smokeRings.forEach(r => {
      const t = r.travel / ONGHAI_RING_RANGE;
      const rad = 9 + t * 20;
      ctx.save();
      ctx.globalAlpha = clamp(1 - t * t, 0, 1) * 0.9;
      ctx.lineWidth = 5 - t * 2.5;
      ctx.strokeStyle = r.gold ? '#ffd34d' : 'rgba(240,240,240,.95)';
      if (r.gold) { ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 12; }
      ctx.beginPath(); ctx.arc(r.x0 + r.travel, r.y, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = r.gold ? 'rgba(255,245,200,.9)' : 'rgba(150,150,150,.7)';
      ctx.beginPath(); ctx.arc(r.x0 + r.travel, r.y, Math.max(2, rad - 4), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });
  }

  function phatNeed() { return (upgrades.phat || 1) >= 2 ? 85 : 100; }
  function phatSelected() { return selectedCharacter === 'phat'; }
  function phatActiveNow() { return phatSelected() && state === 'running' && skillTriggered && elapsedRun < skillActiveUntil; }
  function phatSugarOn() { return phatActiveNow() && phatEffect === 'sugar' && !bossMode; }
  function phatReady() { return phatSelected() && state === 'running' && !phatActiveNow() && phatRage >= phatNeed(); }
  const PHAT_EFFECT_NAME = { integral: '∫ f(x)dx', sugar: 'C₁₂H₂₂O₁₁', prob: 'P(A|B) = P(A∩B)/P(B)' };

  function phatPopup(text, color, x = player.x + player.width * 0.5, y = player.y - 4) {
    phatFx.push({ x: x + vfxRandom(-12, 12), y, text, color, life: 0.95, max: 0.95 });
    if (phatFx.length > 24) phatFx.shift();
  }
  function phatAddRage(amount) {
    if (!phatSelected() || state !== 'running' || phatActiveNow()) return; // đang bật chiêu: không tích thêm Nộ
    const need = phatNeed();
    if (phatRage >= need) return;
    phatRage = Math.min(need, phatRage + amount);
    phatPopup(`+${amount} C₆H₁₂O₆`, '#8ff5ff');
    if (phatRage >= need) {
      showToast('ĐỦ NỘ! Bấm nút ⚡ (hoặc phím E / S) để kích hoạt Tích Nộ Quyền.');
      playTone(880, 0.16, 'triangle', 0.04);
    }
  }
  function phatActivate(auto = false) {
    if (!phatReady()) return false;
    skillTriggered = true;
    runSkillCount++; window.LimitedEvent?.onSkillUse?.(runSkillCount); // V24.1: nhiệm vụ sự kiện 20/11
    const duration = Math.round(skillDuration() * (auto ? 0.5 : 1) * 10) / 10;
    skillActiveUntil = elapsedRun + duration;
    phatRage = 0;
    const r = Math.random(); // quay xác suất P(A) — dùng Math.random (không dùng gameRand để không lệch seed Solo)
    phatEffect = r < 0.5 ? 'integral' : (r < 0.8 ? 'sugar' : 'prob');
    const cx = player.x + player.width / 2, cy = player.y + player.height / 2;
    const prefix = auto ? 'TỰ KÍCH HOẠT CỨU NGUY! ' : 'TÍCH NỘ QUYỀN! ';
    if (phatEffect === 'integral') {
      waterPits.forEach(pit => { if (pit.x < width + 40) pit.filled = true; });
      burst(cx, cy, 24, false, '#19d3c5');
      showToast(`${prefix}Tích phân diện tích ∫ f(x)dx: lấp hố nước, xóa vật cản tầm thấp trong ${duration} giây!`);
    } else if (phatEffect === 'sugar') {
      burst(cx, cy, 24, false, '#ffb02e');
      showToast(`${prefix}Hưng phấn đường huyết C₁₂H₂₂O₁₁: ×2 Coin & hất văng mọi vật cản trong ${duration} giây!`);
    } else {
      let healed = false;
      if (spareHits < runMaxSpare) { spareHits++; healed = true; updateShield(false); }
      burst(cx, cy, 24, false, '#c58bff');
      showToast(`${prefix}Đột biến xác suất P(A|B) = P(A∩B)/P(B) = 0.2: vật cản → +35 Coin/vật${healed ? ' · hồi +1 giáp' : ''} trong ${duration} giây!`);
    }
    phatPopup(PHAT_EFFECT_NAME[phatEffect], '#ffffff', cx, player.y - 22);
    playTone(auto ? 330 : 520, 0.22, 'sawtooth', 0.045);
    return true;
  }
  // Sắp va chạm mà đang đầy Nộ → tự kích hoạt để cứu nguy (trả về true nếu đã cứu được).
  function phatAutoSave() {
    return phatReady() && phatActivate(true);
  }
  function phatIsLowObstacle(o) {
    return o.y + o.h >= groundY - 24 || (o.type === 'can' && o.lane === 'low');
  }
  // Hiệu ứng của chiêu lên từng chướng ngại vật phía trước (∫: xóa vật cản tầm thấp · P = 0.2: đổi thành Coin).
  function phatAffect(o) {
    if (o.wipedByPhat || o.convertedByPhat || groundPlatform === o) return;
    if (!(o.x < player.x + player.width + 400 && o.x + o.w > player.x - 6)) return;
    const ox = o.x + o.w / 2, oy = o.y + o.h / 2;
    if (phatEffect === 'integral') {
      if (!phatIsLowObstacle(o)) return;
      o.wipedByPhat = true;
      burst(ox, oy, 10, false, '#19d3c5');
      if (lightningCooldown <= 0) { lightningCooldown = 0.12; playTone(vfxRandom(500, 760), 0.06, 'sine', 0.025); }
    } else if (phatEffect === 'prob') {
      o.convertedByPhat = true;
      const coin = bossMode ? 0 : 35 * (runItems.magnet ? 2 : 1); // Boss: thưởng cố định, không cộng thêm Coin
      if (coin) { coinBalance += coin; runCoins += coin; saveEconomy(); }
      phatPopup(coin ? `+${coin} 🪙` : 'P(A|B) = 0.2', '#ffe27a', ox, oy - 6);
      burst(ox, oy, 10, false, '#c58bff');
      if (lightningCooldown <= 0) { lightningCooldown = 0.12; playTone(vfxRandom(700, 980), 0.06, 'triangle', 0.03); }
    }
  }

  function quangActiveNow() { return selectedCharacter === 'quang' && state === 'running' && skillTriggered && elapsedRun < skillActiveUntil; }
  function quangDuration() { return skillDuration('quang'); }
  function quangCooldown() { return skillInterval('quang'); }
  function quangKnockObstacle(o, shockwave = false) {
    if (!o || o.knockedByQuang || o.type === 'scaffold') return;
    o.knockedByQuang = true;
    knockedObstacles.push({ ...o, vx: vfxRandom(260, 520), vy: vfxRandom(-760, -470), spin: vfxRandom(-13, 13), angle: 0, life: 1.45, knocked: true });
    burst(o.x + o.w / 2, o.y + o.h / 2, shockwave ? 16 : 10, false, vfxRandom(0, 1) < 0.5 ? '#ff6a21' : '#ffd34d');
    screenShake = Math.max(screenShake, shockwave ? 0.13 : 0.055);
    o.knockedByQuang = true;  }
  function quangShockwave() {
    const left = player.x - 20, right = player.x + player.width + 180;
    obstacles.forEach(o => { if (o.x + o.w >= left && o.x <= right) quangKnockObstacle(o, true); });
    obstacles = obstacles.filter(o => !o.knockedByQuang);
    waterPits.forEach(pit => { if (pit.x + pit.w >= left && pit.x <= right) pit.filled = true; });
    burst(player.x + player.width + 70, groundY - 8, 30, false, '#ffb52e');
    screenShake = Math.max(screenShake, 0.16);
    playTone(120, 0.24, 'sawtooth', 0.055);
  }
  function activateQuangSkill() {
    if (state !== 'running' || selectedCharacter !== 'quang' || quangActiveNow() || elapsedRun < nextSkillAt) return false;
    skillTriggered = true;
    runSkillCount++; window.LimitedEvent?.onSkillUse?.(runSkillCount); // V24.1: nhiệm vụ sự kiện 20/11
    const duration = quangDuration();
    skillActiveUntil = elapsedRun + duration;
    nextSkillAt = skillActiveUntil + quangCooldown();
    quangWasActive = true;
    quangStartedAt = elapsedRun;
    quangSpeedMult = Math.round((1.45 + Math.random() * 0.55) * 100) / 100;   // 1,45× – 2,0× (Math.random, không dùng gameRand)
    let quangHealed = false;
    if (Math.random() < 0.10 && spareHits < runMaxSpare) { spareHits++; updateShield(false); quangHealed = true; }   // 10%: hồi +1 giáp (không vượt giáp tối đa đầu trận)
    if (!player.onGround || player.y + player.height < groundY - 2) {
      const airborneY = player.y + player.height * 0.55;
      burst(player.x + player.width * 0.5, airborneY, 12, false, '#ff9a36');
      player.y = groundY - player.height;
      player.velocityY = 0; player.onGround = true; groundPlatform = null;
      burst(player.x + player.width * 0.5, groundY - 3, 18, true, '#7beaff');
    }
    playTone(74, 0.42, 'sawtooth', 0.085);
    playTone(148, 0.3, 'triangle', 0.045);
    burst(player.x + player.width * 0.55, groundY - 8, 28, false, '#ff6b22');
    showToast(`🔥 GOD RIDER! Mô tô tăng tốc ${quangSpeedMult.toFixed(2).replace('.', ',')}× trong ${duration.toFixed(1)} giây — miễn nhiễm và cán văng mọi vật cản!`);
    if (quangHealed) phatPopup('+1 GIÁP!', '#7dffb0');
    return true;
  }

  // =====================================================================
  // [BÙI BẰNG] VF 3 — lái xe điện, pin 100
  // =====================================================================
  const bbActiveNow = () => selectedCharacter === 'buibang' && state === 'running' && bbDriving;
  const bbOverloaded = () => bbOverloadUntil > 0 && elapsedRun < bbOverloadUntil;
  function bbExit(forced) {
    if (!bbDriving) return;
    bbDriving = false;
    skillTriggered = false; skillActiveUntil = elapsedRun;
    burst(player.x + player.width * 0.9, groundY - 8, 16, false, forced ? '#ff5a3c' : '#19d3c5');
    playTone(forced ? 90 : 260, 0.22, forced ? 'sawtooth' : 'triangle', 0.05);
    if (forced) {
      bbPin = 0;
      bbOverloadLen = bbPenalty();
      bbOverloadUntil = elapsedRun + bbOverloadLen;
      showToast(`🔌 QUÁ TẢI! Hết điện — bị phạt ${bbOverloadLen}s mới lái lại được.`);
    } else {
      bbSafeUntil = elapsedRun + 0.375;       // bất tử ngắn lúc tiếp đất
      bbChargeDelayUntil = elapsedRun + 0.5; // độ trễ 0,5s trước khi sạc lại
    }
  }

          let bbLastToggle = 0;
  function bbToggle() {
    if (state !== 'running' || selectedCharacter !== 'buibang') return false;
    if (performance.now() - bbLastToggle < 250) return false;
    bbLastToggle = performance.now();
    
    if (bbDriving) { bbExit(false); return true; }
    if (bbOverloaded()) { phatPopup('Quá tải! Đang bị phạt...', '#ff9a36'); return false; }
    if (bbPin < 10) { phatPopup('Cần ít nhất 10 điện để đề máy!', '#ff9a36'); return false; }
    bbPin = Math.max(0, bbPin - 10);   // phí đề máy
    bbLowWarned = false;
    bbDriving = true;
    skillTriggered = true; skillActiveUntil = elapsedRun + 9999;
    runSkillCount++; window.LimitedEvent?.onSkillUse?.(runSkillCount);
    if (!player.onGround || player.y + player.height < groundY - 2) {
      player.y = groundY - player.height; player.velocityY = 0; player.onGround = true; groundPlatform = null;
    }
    burst(player.x + player.width * 0.6, groundY - 6, 20, false, '#19d3c5');
    playTone(180, 0.3, 'triangle', 0.06); playTone(360, 0.2, 'sine', 0.04);
    showToast('🚗 VF 3! Lái xe điện — miễn nhiễm va chạm, cán văng vật cản. Đề máy tốn 10 điện, lái mất 3,0 điện/giây!');
    return true;
  }
  function bbStep(dt) {
    if (selectedCharacter !== 'buibang' || state !== 'running') return;
    if (bbDriving) {
      skillTriggered = true; skillActiveUntil = elapsedRun + 9999;
      bbPin -= dt * 3.0;                 // lái: -3,0 điện / giây
      if (bbPin <= 15 && !bbLowWarned) {
        bbLowWarned = true;
        phatPopup('⚠️ PIN YẾU! Tắt xe kẻo quá tải!', '#ff9a36');
        playTone(620, 0.08, 'sine', 0.03);
      }
      if (bbPin <= 0) bbExit(true);
    } else if (bbOverloaded()) {
      bbPin = 0;                         // đang bị phạt
    } else {
      if (bbOverloadUntil > 0) { bbOverloadUntil = 0; bbPin = bbMaxPin(); showToast('🔋 Hết phạt! Bình điện đã đầy.'); }
      if (elapsedRun >= bbChargeDelayUntil) bbPin = Math.min(bbMaxPin(), bbPin + dt * ((upgrades.buibang || 1) >= 3 ? 2.2 : 1.6));   // sạc thường: 1,6 điện/s (Lv3: 2,2) sau 0,5s
    }
  }

  // =====================================================================
  // DƯƠNG TÀO — Skill 1: Đấm (chủ động) · Skill 2: Bốc đầu xe nón 3/4 (thụ động theo chu kỳ)
  // =====================================================================
  const DT_PUNCH_REACH = 230;    // tầm đấm phía trước (px, hệ tọa độ logic 660px)
  const DT_PUNCH_LINES = ['Khỏi', 'Khỏi nhoerrr😏', 'Khỏi luôn nhoerrr😏', '😏'];
  const DT_WHEELIE_LINES = ['Có mua được nón 3/4 😏 không', 'Có bia con lạc đà không 😏', 'Xăng giảm 😏', '😏😏😏', 'Có đốt được mỡ 34 phút k😏'];
  const DT_WORD_SPEED = 420;     // tốc độ bay của chữ (px/s)
  const DT_WORD_RANGE = 400;     // tầm bay của chữ (px)
  const DT_WORD_INTERVAL = 0.68; // nhịp bắn chữ (giây)
  const DT_WHEELIE_ANGLE = 27 * Math.PI / 180;
  const duongtaoSkill2Now = () => selectedCharacter === 'duongtao' && state === 'running' && skillTriggered && elapsedRun < skillActiveUntil;
  const dtFmtCd = (v) => String(v).replace('.', ',');
  // Hồi chiêu Skill 1 (Đấm): 8,5s → Lv2 7,8s → Lv3 7,0s; vật phẩm ⌛ giảm 15%.
  function dtPunchCd(key = 'duongtao') {
    const lv = upgrades[key] || 1;
    let v = lv >= 3 ? 7.0 : (lv >= 2 ? 7.8 : 8.5);
    if (state === 'running' && key === 'duongtao' && key === selectedCharacter) v -= (dtPunchCount >= 10 ? 2 : (dtPunchCount >= 5 ? 1 : 0));   // nội tại: 5 lần đấm -1s · 10 lần đấm -2s
    if (state === 'running' && hourglassRun && key === selectedCharacter) v = Math.round(v * 0.85 * 10) / 10;
    return Math.max(2, v);
  }
  // Chọn ngẫu nhiên 1 câu thoại, không lặp lại câu liền trước (chỉ là hiệu ứng thị giác → vfxRandom).
  function dtPickLine(list, last) {
    let i = Math.min(list.length - 1, Math.floor(vfxRandom(0, list.length)));
    if (list.length > 1 && i === last) i = (i + 1 + Math.min(list.length - 2, Math.floor(vfxRandom(0, list.length - 1)))) % list.length;
    return i;
  }
  function duongtaoKnock(o, strong) {
    if (!o || o.knockedByDuongTao || o.type === 'scaffold') return;
    o.knockedByDuongTao = true;
    knockedObstacles.push({ ...o, vx: vfxRandom(strong ? 300 : 180, strong ? 560 : 360), vy: vfxRandom(strong ? -780 : -620, strong ? -480 : -390), spin: vfxRandom(-13, 13), angle: 0, life: 1.5, knocked: true });
    burst(o.x + o.w / 2, o.y + o.h / 2, strong ? 14 : 8, false, strong ? '#ffd34d' : '#ffe9a0');
    if (strong) screenShake = Math.max(screenShake, 0.09);
    if (lightningCooldown <= 0) { lightningCooldown = 0.12; playTone(vfxRandom(strong ? 160 : 420, strong ? 240 : 620), 0.07, strong ? 'sawtooth' : 'triangle', 0.03); }
  }
  // Vật cản gần nhất phía trước trong tầm ngắn (bỏ qua giàn giáo / bệ đang đứng; hố nước không phải vật cản).
  function duongtaoPunchTarget() {
    const left = player.x + player.width * 0.25;
    const right = player.x + player.width + DT_PUNCH_REACH;
    let best = null;
    obstacles.forEach(o => {
      if (!o || o.type === 'scaffold' || o.ignored || o.knockedByDuongTao || o.racingCleared || groundPlatform === o) return;
      if (o.x + o.w <= left || o.x >= right) return;
      if (!best || o.x < best.x) best = o;
    });
    return best;
  }
  function activateDuongTaoPunch() {
    if (state !== 'running' || selectedCharacter !== 'duongtao') return false;
    if (duongtaoSkill2Now()) { phatPopup('Đang bốc đầu!', '#ffd34d'); return false; }   // khóa Skill 1 khi Skill 2 bật
    if (elapsedRun < dtPunchReadyAt) { phatPopup(`Hồi ${Math.ceil(dtPunchReadyAt - elapsedRun)}s`, '#cfd8dc'); return false; }
    const target = duongtaoPunchTarget();
    if (!target) { phatPopup('Chưa có vật cản trong tầm', '#cfd8dc'); return false; }   // không mất hồi chiêu
    dtPunchCount++;
    if (dtPunchCount === 5) showToast('👊 NỘI TẠI I: ĐẤM NHANH (-1s hồi chiêu)');
    else if (dtPunchCount === 10) showToast('👊 NỘI TẠI II: ĐẤM CỰC NHANH (-2s hồi chiêu)');
    dtPunchReadyAt = elapsedRun + dtPunchCd();
    const hx = target.x + target.w / 2, hy = target.y + target.h / 2;
    duongtaoKnock(target, true);
    unlinkCoconutDecor(target);                                   // trúng tán dừa ở Làng Quê thì xóa luôn thân
    obstacles = obstacles.filter(o => o !== target);
    dtLastPunchLine = dtPickLine(DT_PUNCH_LINES, dtLastPunchLine);
    const line = DT_PUNCH_LINES[dtLastPunchLine];
    phatPopup(line.includes('😏') ? line : `😏 ${line}`, '#ffe27a', hx, target.y - 4);
    dtPunchFx.push({ x0: player.x + player.width * 0.95, x1: hx, y: player.y + player.height * 0.42, life: 0.22, max: 0.22 });
    burst(hx, hy, 12, false, '#fff3b0');
    return true;
  }
  function spawnDuongTaoWord() {
    ctx.save(); ctx.font = '900 17px sans-serif';
    const w = ctx.measureText(dtWord).width * 1.1;
    ctx.restore();
    dtWords.push({ x0: player.x + player.width * 0.9, y: player.y + player.height * 0.22, travel: 0, text: dtWord, w });
    if (dtWords.length > 6) dtWords.shift();
  }
  function updateDuongTao(dt, skillActive) {
    dtWords.forEach(k => { k.travel += DT_WORD_SPEED * dt; });
    dtWords = dtWords.filter(k => k.travel < DT_WORD_RANGE);
    dtPunchFx.forEach(f => { f.life -= dt; });
    dtPunchFx = dtPunchFx.filter(f => f.life > 0);
    if (selectedCharacter !== 'duongtao') return;
    if (skillActive) dtWasWheelie = true;
    else if (dtWasWheelie) {   // vừa hết bốc đầu → Đấm sẵn sàng ngay
      dtWasWheelie = false;
      dtPunchReadyAt = elapsedRun;
      phatPopup('👊 ĐẤM SẴN SÀNG!', '#ffd34d');
    }
    if (skillActive) {
      dtWordTimer -= dt;
      if (dtWordTimer <= 0) { dtWordTimer = DT_WORD_INTERVAL; spawnDuongTaoWord(); }
    } else { dtWordTimer = 0; dtWords = []; }
  }
  // Vùng trúng của luồng chữ: thân người chơi → mũi xe, cộng thêm các cụm chữ đang bay.
  function duongtaoHits(x, w) {
    const bodyL = player.x + player.width * 0.25, front = player.x + player.width * 0.9;
    if (x < front && x + w > bodyL) return true;
    return dtWords.some(k => { const wx = k.x0 + k.travel; return x < wx + k.w && x + w > wx; });
  }
  function drawDuongTaoWords() {
    if (!dtWords.length) return;
    ctx.save();
    ctx.font = '900 17px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    dtWords.forEach(k => {
      const p = k.travel / DT_WORD_RANGE;
      const sc = 0.7 + 0.5 * Math.min(1, p * 2);
      ctx.save();
      ctx.globalAlpha = clamp(1 - p * p, 0, 1);
      ctx.translate(k.x0 + k.travel, k.y - Math.sin(p * Math.PI) * 14);
      ctx.scale(sc, sc);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.strokeText(k.text, 0, 0);
      ctx.fillStyle = '#ffd83a'; ctx.fillText(k.text, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }
  function drawDuongTaoFx() {
    if (!dtPunchFx.length) return;
    ctx.save(); ctx.lineCap = 'round';
    dtPunchFx.forEach(f => {
      const p = 1 - f.life / f.max;
      const xe = f.x0 + (f.x1 - f.x0) * Math.min(1, p * 3);
      ctx.globalAlpha = clamp(1 - p, 0, 1);
      ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 12;
      ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(f.x0, f.y); ctx.lineTo(xe, f.y); ctx.stroke();
      ctx.strokeStyle = '#ffb300'; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(f.x0, f.y + i * 5); ctx.lineTo(xe - 14, f.y + i * 5); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xe, f.y, 5 + p * 9, 0, Math.PI * 2); ctx.globalAlpha *= 0.55; ctx.fill();
    });
    ctx.restore();
  }
  // Dương Tào đội mũ bảo hiểm 3/4 (đen nhám viền vàng, kính chắn gió) ngồi xe máy, bốc đầu cố định ~27° suốt thời gian chiêu.
  function drawDuongTaoWheelie() {
    const h = player.height, dw = player.width, dh = player.height;
    const R = h * 0.17, L = h * 0.95;
    const by = player.y + player.height;                       // mặt đường / chân bám theo nhân vật (nhảy vẫn khớp)
    const px0 = player.x + dw * 0.5 - L * 0.5, py0 = by - R;   // tâm bánh sau (điểm xoay)
    const spin = worldTime * 14;
    ctx.save();
    ctx.translate(px0, py0);
    // vệt gió + khói pô (hiệu ứng thị giác → vfxRandom)
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { const yy = -R * (0.4 + i * 0.9); ctx.beginPath(); ctx.moveTo(-R - 14 - vfxRandom(0, 18), yy); ctx.lineTo(-R * 0.4, yy); ctx.stroke(); }
    ctx.fillStyle = 'rgba(200,200,200,.55)';
    ctx.beginPath(); ctx.arc(-R - 8 - vfxRandom(0, 8), -R * 0.1 - vfxRandom(0, 4), vfxRandom(2.5, 4.5), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.rotate(-DT_WHEELIE_ANGLE);
    const wheel = (wx) => {
      ctx.save(); ctx.translate(wx, 0); ctx.rotate(spin);
      ctx.fillStyle = '#14161b'; ctx.strokeStyle = '#8d96a3'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#d9dde3'; ctx.lineWidth = 1.2;
      for (let a = 0; a < 6; a++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 1.5); ctx.lineTo(0, R - 2.5); ctx.stroke(); }
      ctx.fillStyle = '#f2c200'; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    wheel(0); wheel(L);
    // thân xe máy (đỏ) + yên + giảm xóc + ghi-đông + đèn
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(L * 0.72, -R * 2.0); ctx.lineTo(L, 0); ctx.stroke();
    ctx.strokeStyle = '#6e7480'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(L * 0.32, -R * 0.35); ctx.lineTo(-R * 0.7, -R * 0.15); ctx.stroke();
    ctx.fillStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(-R * 0.15, -R * 0.95); ctx.lineTo(L * 0.14, -R * 1.05); ctx.lineTo(L * 0.62, -R * 1.05);
    ctx.quadraticCurveTo(L * 0.8, -R * 0.95, L * 0.84, -R * 0.2); ctx.lineTo(L * 0.52, -R * 0.35); ctx.lineTo(L * 0.26, -R * 0.35); ctx.lineTo(L * 0.12, -R * 0.1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b1b20'; roundedRect(L * 0.2, -R * 1.42, L * 0.44, R * 0.42, R * 0.2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(L * 0.64, -R * 2.12); ctx.lineTo(L * 0.76, -R * 2.0); ctx.stroke();
    ctx.fillStyle = '#ffe08a'; ctx.shadowColor = '#ffc400'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(L * 0.77, -R * 1.65, 2.8, 3.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    // chân ngồi trên xe (quần đen)
    const hipX = L * 0.46, hipY = -R * 1.4;
    ctx.strokeStyle = '#15151b'; ctx.lineWidth = dw * 0.34;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(L * 0.7, -R * 1.05); ctx.lineTo(L * 0.52, -R * 0.12); ctx.stroke();
    ctx.fillStyle = '#0c0c10'; ctx.beginPath(); ctx.ellipse(L * 0.55, -R * 0.06, dw * 0.28, dw * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    // thân trên Dương Tào (cắt từ ảnh nhân vật: đầu → thắt lưng), hơi ngả trước để tay chạm ghi-đông
    ctx.save();
    ctx.translate(hipX, hipY); ctx.rotate(0.17);
    const ox = -dw * 0.45, oy = -dh * 0.58;
    if (sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sprite, 0, 0, sprite.naturalWidth, sprite.naturalHeight * 0.58, ox, oy, dw, dh * 0.58);
    } else { ctx.fillStyle = '#6f86a8'; roundedRect(ox, oy, dw, dh * 0.58, 6); ctx.fill(); }
    // mũ bảo hiểm 3/4: đen nhám viền vàng + kính chắn gió
    const hx = ox + dw * 0.40, hy = oy + dh * 0.085, rx = dw * 0.30, ry = dh * 0.105;
    ctx.beginPath();
    ctx.moveTo(hx + rx * 0.62, hy - ry * 0.25);
    ctx.bezierCurveTo(hx + rx * 0.5, hy - ry * 1.15, hx - rx * 0.9, hy - ry * 1.25, hx - rx * 1.05, hy + ry * 0.2);
    ctx.lineTo(hx - rx * 0.8, hy + ry * 1.05);
    ctx.quadraticCurveTo(hx - rx * 0.2, hy + ry * 1.2, hx + rx * 0.05, hy + ry * 0.75);
    ctx.lineTo(hx + rx * 0.15, hy + ry * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#18181c'; ctx.fill();
    ctx.strokeStyle = '#f2c200'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx - rx * 0.5, hy - ry * 0.85); ctx.quadraticCurveTo(hx, hy - ry * 1.05, hx + rx * 0.3, hy - ry * 0.7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx + rx * 0.62, hy - ry * 0.35);
    ctx.quadraticCurveTo(hx + rx * 1.55, hy + ry * 0.1, hx + rx * 1.0, hy + ry * 0.95);
    ctx.lineTo(hx + rx * 0.5, hy + ry * 0.55); ctx.closePath();
    ctx.fillStyle = 'rgba(120,205,255,.30)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  // =====================================================================
  // V25 — TÂN NIKA (skin S+ giới hạn): tích tụ khói/mây → Hóa Thân (miễn nhiễm, nảy cao su, ép bẹp vật cản)
  //        → 1,5s cuối Cây Chổi Khổng Lồ quét bay vật cản → vụ nổ xung chấn, đáp đất an toàn.
  // =====================================================================
  const tanGraceNow = () => selectedCharacter === 'tan' && elapsedRun < tanGraceUntil;
  const tanNikaActiveNow = () => state === 'running' && selectedCharacter === 'tan' && tanNikaOn('tan') && skillTriggered && elapsedRun < skillActiveUntil;
  function tanAddWave(x, amp, life) { tanWaves.push({ x, age: 0, life, amp, phase: vfxRandom(0, 6.28) }); }
  // Tiến độ hồi chiêu 0..1; sau khi Thức Tỉnh luôn giữ tối thiểu 40% (khói chân không tắt).
  function tanNikaProgress() {
    const start = skillTriggered ? skillActiveUntil : 0;
    const span = Math.max(0.001, nextSkillAt - start);
    let p = clamp((elapsedRun - start) / span, 0, 1);
    if (tanAwakened) p = Math.max(p, 0.4);
    return p;
  }
  function tanSquash(o) {
    const snapshot = { ...o };
    o.squashedByNika = true;
    o.knockedByTan = true; // bị lọc khỏi mảng obstacles ngay khung hình này (và xóa thân dừa nếu có)
    tanSquashed.push({ o: snapshot, life: 0.85, max: 0.85 });
    let gain = 0;
    if (!bossMode) {
      const mult = (runItems.magnet || phatSugarOn()) ? 2 : 1; // ×2 Coin nếu dùng vật phẩm
      gain = (upgrades.tan >= 3 ? TAN_NIKA_COIN_LV3 : TAN_NIKA_COIN) * mult;
      coinBalance += gain;
      runCoins += gain;
      saveEconomy();
    }
    if (gain > 0) tanFx.push({ type: 'text', x: o.x + o.w / 2, y: groundY - 26, text: `+${gain}`, life: 0.9, max: 0.9 });
    burst(o.x + o.w / 2, groundY - 4, 7, true, '#ffffff');
    screenShake = Math.max(screenShake, 0.04);
    if (lightningCooldown <= 0) { lightningCooldown = 0.1; playTone(vfxRandom(120, 190), 0.07, 'square', 0.03); }
  }
  function tanNikaFinish() {
    tanBigBroom = null;
    tanBroomLaunched = false;
    screenShake = Math.max(screenShake, 0.35);
    tanFlash = 1;
    tanGraceUntil = elapsedRun + 0.8; // đáp đất an toàn
    const x0 = player.x - 60, x1 = player.x + player.width + 320;
    obstacles.forEach(o => {
      if (o.knockedByTan || o.x + o.w < x0 || o.x > x1) return;
      knockedObstacles.push({ ...o, vx: vfxRandom(260, 520), vy: vfxRandom(-760, -480), spin: vfxRandom(-11, 11), angle: 0, life: 1.7, knocked: true });
      o.knockedByTan = true;
    });
    waterPits.forEach(pit => { if (!pit.filled && pit.x < x1 && pit.x + pit.w > x0) pit.filled = true; });
    tanFx.push({ type: 'ring', x: player.x + player.width / 2, y: groundY - 6, life: 0.7, max: 0.7 });
    burst(player.x + player.width / 2, groundY - 6, 38, false, '#ffffff');
    playTone(90, 0.4, 'sawtooth', 0.07);
    playTone(60, 0.5, 'square', 0.05);
  }
  function updateTanNika(dt, skillActive) {
    tanSquashed.forEach(sq => { sq.life -= dt; sq.o.x -= speed * dt; });
    tanSquashed = tanSquashed.filter(sq => sq.life > 0);
    tanFx.forEach(f => { f.life -= dt; f.x -= speed * dt * 0.3; if (f.type === 'text') f.y -= 38 * dt; });
    tanFx = tanFx.filter(f => f.life > 0);
    // sóng đường cao su: trôi về phía sau theo tốc độ chạy, tắt dần
    tanWaves.forEach(w => { w.age += dt; w.x -= speed * dt; });
    tanWaves = tanWaves.filter(w => w.age < w.life);
    // cú đấm cao su khổng lồ: giáng xuống → ép bẹp → thu về
    tanFists.forEach(f => {
      f.t += dt;
      if (f.target && !f.hit) f.x = f.target.x + f.target.w / 2; else f.x -= speed * dt;
      if (!f.hit && f.t >= 0.28) {
        f.hit = true;
        if (f.target && !f.target.knockedByTan) tanSquash(f.target);
        tanAddWave(f.x, 9, 1.2);
        screenShake = Math.max(screenShake, 0.12);
        playTone(110, 0.2, 'sawtooth', 0.05);
      }
    });
    tanFists = tanFists.filter(f => f.t < 0.85);
    const active = skillActive && selectedCharacter === 'tan' && tanNikaOn('tan');
    if (tanWasNika && !active) { tanNikaFinish(); tanBigJump = false; tanFistTimer = 0; }
    tanWasNika = active;
    if (!active) return;
    // Đa dạng đòn đánh: mỗi 2,6s, có vật cản cách 200–380px phía trước → cánh tay cao su Haki giáng xuống
    tanFistTimer = Math.min(TAN_FIST_INTERVAL, tanFistTimer + dt);
    if (tanFistTimer >= TAN_FIST_INTERVAL) {
      const front = player.x + player.width;
      let tgt = null;
      obstacles.forEach(o => {
        const d = o.x - front;
        if (o.knockedByTan || o.squashedByNika || d < 200 || d > 380) return;
        if (!tgt || o.x < tgt.x) tgt = o;
      });
      if (tgt) {
        tanFists.push({ target: tgt, x: tgt.x + tgt.w / 2, t: 0, hit: false });
        tanFistTimer = 0;
        playTone(200, 0.18, 'sawtooth', 0.04);
      }
    }
    // 1,5 giây cuối: triệu hồi Cây Chổi Khổng Lồ quét ngang
    const left = skillActiveUntil - elapsedRun;
    if (left <= TAN_NIKA_FINALE && !tanBroomLaunched) {
      tanBroomLaunched = true;
      tanBigBroom = { x: player.x - 40, angle: 0 };
      screenShake = Math.max(screenShake, 0.18);
      playTone(240, 0.3, 'sawtooth', 0.05);
      showToast('👊 NẮM ĐẤM KHỔNG LỒ! Đấm bay mọi vật cản!');
    }
    if (tanBigBroom) {
      tanBigBroom.x += (width + 260) * dt / 1.05;
      tanBigBroom.angle += dt * 9;
      if (tanBigBroom.x > width + 220) tanBigBroom = null;
    }
    // Đường cao su: nảy tưng tưng nhẹ mỗi lần chạm đất
    if (player.onGround) {
      const cx = player.x + player.width / 2;
      if (tanBigJump) {
        // Hạ cánh từ cú nhảy cao: sóng cao su lớn + ép bẹp vật cản trong bán kính 110px
        tanBigJump = false;
        tanAddWave(cx, 16, 1.8);
        tanFx.push({ type: 'ring', x: cx, y: groundY - 6, life: 0.55, max: 0.55, rmax: 220 });
        obstacles.forEach(o => {
          if (o.knockedByTan || o.squashedByNika) return;
          if (o.x < cx + 110 && o.x + o.w > cx - 110) tanSquash(o);
        });
        burst(cx, groundY - 2, 16, false, '#ffffff');
        screenShake = Math.max(screenShake, 0.2);
        playTone(100, 0.25, 'square', 0.05);
      } else if (!groundPlatform) {
        tanAddWave(cx, 7, 1.4);   // chạm đường: điểm chấn động nhỏ
      }
      player.velocityY = -340;
      player.onGround = false;
      groundPlatform = null;
      burst(player.x + player.width * 0.45, groundY - 1, 3, true);
    }
    // Tự lấp đầy mọi hố nước / sông (Bãi Biển & Làng Quê)
    waterPits.forEach(pit => {
      if (!pit.filled && pit.x < player.x + player.width + 120 && pit.x + pit.w > player.x - 30) {
        pit.filled = true;
        burst(player.x + player.width * 0.6, groundY - 4, 12, false, '#ffffff');
      }
    });
  }
  // Dải mây trắng uốn lượn (Bezier) quanh một tâm
  function tanCloudRibbon(cx, cy, rx, ry, phase, w, alpha) {
    const pt = (a, k) => [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
    const s0 = pt(phase, 1), c1 = pt(phase + 0.8, 1.35), c2 = pt(phase + 1.6, 0.7), e = pt(phase + 2.5, 1.1);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]);
    ctx.strokeStyle = `rgba(255,255,255,${0.85 * alpha})`; ctx.lineWidth = w; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(205,218,238,${0.8 * alpha})`; ctx.lineWidth = w * 0.4; ctx.stroke();
    ctx.restore();
  }
  function tanBolt(x1, y1, x2, y2, red) {
    const pts = makeZigzag(x1, y1, x2, y2, 5, red ? 7 : 5);
    ctx.save();
    ctx.beginPath();
    pts.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])));
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (red) {
      ctx.strokeStyle = '#14000a'; ctx.lineWidth = 4.4; ctx.stroke();
      ctx.strokeStyle = '#ff2d2d'; ctx.lineWidth = 2; ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = 10; ctx.stroke();
    } else {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8; ctx.stroke();
    }
    ctx.restore();
  }
  // Giai đoạn tích tụ khi đang hồi chiêu: ≥35% khói chân · ≥70% mây quanh vai + tia sét trắng
  function drawTanNikaBuildup(skillActive) {
    if (state !== 'running' || skillActive || selectedCharacter !== 'tan' || !tanNikaOn('tan')) return;
    const p = tanNikaProgress();
    if (p < 0.35) return;
    const fx = player.x + player.width * 0.48, fy = groundY - 3;
    ctx.save();
    const n = p >= 0.7 ? 8 : 5;
    for (let i = 0; i < n; i++) {
      const cyc = ((worldTime * 0.9 + i / n) % 1);
      const x = fx + Math.sin(worldTime * 1.8 + i * 1.7) * player.width * 0.42;
      const y = fy - cyc * 24;
      const r = 6 + cyc * 7 + p * 4;
      ctx.globalAlpha = (1 - cyc) * 0.7;
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (p >= 0.7) {
      const a = clamp((p - 0.7) / 0.3, 0.45, 1);
      const cx = player.x + player.width * 0.5, cy = player.y + player.height * 0.26;
      tanCloudRibbon(cx, cy, player.width * 0.72, player.height * 0.2, worldTime * 1.3, 7, a);
      tanCloudRibbon(cx, cy + 4, player.width * 0.6, player.height * 0.16, worldTime * -1.1 + 2.2, 5, a);
      if (vfxRandom(0, 1) < 0.35) {
        const bx = cx + vfxRandom(-player.width * 0.5, player.width * 0.5), by = cy + vfxRandom(-8, 8);
        tanBolt(bx, by, bx + vfxRandom(-14, 14), by + vfxRandom(10, 24), false);
      }
    }
  }
  // Thân Tân Nika: cao su co giãn, mây trắng cuộn xoáy + sét đỏ-đen lách tách
  function drawTanNikaBody() {
    const img = tanNikaSprite;
    const h = player.height * 1.12;
    const w = h * (img.naturalWidth / img.naturalHeight);
    const cx = player.x + player.width * 0.5;
    const footY = player.y + player.height;
    const cy = player.y + player.height * 0.4;
    // mây phía sau
    for (let i = 0; i < 3; i++) tanCloudRibbon(cx, cy, player.width * (0.85 + i * 0.1), player.height * (0.42 + i * 0.04), worldTime * (3 + i * 0.6) + i * 2.1, 8 - i, 0.85);
    const air = !player.onGround;
    const k = air ? clamp(Math.abs(player.velocityY) / 700, 0, 1) * 0.1 : 0;
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.translate(cx, footY);
    ctx.scale(1 - k * 0.7, 1 + k);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
    // mây phía trước + sét đỏ-đen
    tanCloudRibbon(cx, cy - 6, player.width * 0.75, player.height * 0.3, worldTime * -4.2, 6, 0.9);
    for (let i = 0; i < 3; i++) {
      if (vfxRandom(0, 1) < 0.45) continue;
      const bx = cx + vfxRandom(-w * 0.4, w * 0.4), by = player.y + vfxRandom(0.1, 0.9) * player.height;
      tanBolt(bx, by, bx + vfxRandom(-26, 26), by + vfxRandom(-22, 22), true);
    }
  }
  // Đường Cao Su: sóng trắng/vàng nhạt gợn ngay trên mặt đường, lan ra hai bên và tắt dần
  function drawTanWaves() {
    if (!tanWaves.length) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    tanWaves.forEach(w => {
      const t = w.age / w.life, fade = Math.pow(1 - t, 1.6);
      const spread = 30 + w.age * 300;
      const x0 = w.x - spread, x1 = w.x + spread, seg = 12;
      ctx.beginPath();
      ctx.moveTo(x0, groundY - 1);
      for (let i = 0; i < seg; i++) {
        const a = x0 + (x1 - x0) * (i / seg), b = x0 + (x1 - x0) * ((i + 1) / seg), m = (a + b) / 2;
        const env = 1 - Math.abs(((m - w.x) / spread));            // mạnh nhất ở tâm
        const y = Math.sin((m - w.x) * 0.08 - w.age * 14 + w.phase) * w.amp * fade * Math.max(0, env);
        ctx.quadraticCurveTo(m, groundY - 1 - y * 2, b, groundY - 1);
      }
      ctx.shadowColor = '#fff6b0'; ctx.shadowBlur = 10;
      ctx.strokeStyle = `rgba(255,252,225,${0.85 * fade})`; ctx.lineWidth = 3; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,236,150,${0.6 * fade})`; ctx.lineWidth = 1.4; ctx.stroke();
    });
    ctx.restore();
  }
  // Nắm đấm Haki đen-đỏ (góc 0 = hướng sang phải; đơn vị gốc ~ 60x48 px, nhân với scale)
  function drawHakiFist(x, y, scale, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    const rr = (px, py, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(px + r, py);
      ctx.lineTo(px + w - r, py); ctx.quadraticCurveTo(px + w, py, px + w, py + r);
      ctx.lineTo(px + w, py + h - r); ctx.quadraticCurveTo(px + w, py + h, px + w - r, py + h);
      ctx.lineTo(px + r, py + h); ctx.quadraticCurveTo(px, py + h, px, py + h - r);
      ctx.lineTo(px, py + r); ctx.quadraticCurveTo(px, py, px + r, py);
      ctx.closePath();
    };
    const g = ctx.createLinearGradient(0, -24, 0, 24);
    g.addColorStop(0, '#0b0006'); g.addColorStop(0.5, '#3a0510'); g.addColorStop(1, '#0b0006');
    const lw = 2.2 / Math.max(0.6, scale * 0.6);
    // khối cổ tay + mu bàn tay bo góc
    ctx.fillStyle = g; ctx.strokeStyle = '#ff2d2d'; ctx.lineWidth = lw;
    ctx.shadowColor = '#ff2d2d'; ctx.shadowBlur = 14;
    rr(-30, -17, 30, 34, 8); ctx.fill(); ctx.stroke();      // cổ tay
    rr(-6, -22, 36, 44, 11); ctx.fill(); ctx.stroke();      // mu bàn tay
    // 4 đốt ngón tay cuộn tròn ở mặt trước
    for (let i = 0; i < 4; i++) {
      const fy = -17 + i * 11.3;
      ctx.beginPath(); ctx.ellipse(24, fy, 9, 6.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,90,90,.55)'; ctx.lineWidth = lw * 0.6;
      ctx.beginPath(); ctx.arc(24, fy, 3.4, -0.9, 1.6); ctx.stroke();   // nếp đốt ngón
      ctx.shadowBlur = 10; ctx.strokeStyle = '#ff2d2d'; ctx.lineWidth = lw;
    }
    // ngón cái gập ngang khóa chặt bên trên
    ctx.fillStyle = g;
    rr(2, -26, 30, 10, 5); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,90,90,.5)'; ctx.lineWidth = lw * 0.6;
    ctx.beginPath(); ctx.moveTo(16, -25); ctx.lineTo(16, -17); ctx.stroke();
    // tia Haki đỏ lách tách trên mu bàn tay
    ctx.strokeStyle = '#ff4040'; ctx.lineWidth = lw * 0.8; ctx.lineJoin = 'round';
    ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = 8;
    for (let k = 0; k < 3; k++) {
      const ph = worldTime * 14 + k * 2.1;
      const bx = -2 + k * 9, by = -16 + k * 14;
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.lineTo(bx + 6 + Math.sin(ph) * 3, by + 7 * Math.cos(ph * 1.3));
      ctx.lineTo(bx + 2 + Math.cos(ph) * 4, by + 14);
      ctx.lineTo(bx + 11 + Math.sin(ph * 1.7) * 3, by + 20 * (0.6 + 0.4 * Math.sin(ph)));
      ctx.stroke();
    }
    ctx.restore();
  }
  // Cánh tay cao su khổng lồ bọc Haki đen-đỏ giáng từ đỉnh màn hình, kết thúc bằng Nắm Đấm Haki
  function drawTanFists() {
    tanFists.forEach(f => {
      const down = clamp(f.t / 0.28, 0, 1), up = clamp((f.t - 0.5) / 0.35, 0, 1);
      const p = f.hit ? 1 - up : down * down;
      const fistY = -40 + (groundY - 8 + 40) * p;
      const aw = 34;
      ctx.save();
      ctx.translate(f.x, 0);
      const g = ctx.createLinearGradient(-aw, 0, aw, 0);
      g.addColorStop(0, '#0b0006'); g.addColorStop(0.5, '#3a0510'); g.addColorStop(1, '#0b0006');
      ctx.fillStyle = g; ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = 16;
      ctx.fillRect(-aw / 2, 0, aw, Math.max(0, fistY - 30));
      ctx.shadowBlur = 0;
      for (let i = 0; i < 3; i++) {   // vệt Haki đỏ chạy dọc cánh tay
        const x = -aw * 0.3 + i * aw * 0.3;
        ctx.strokeStyle = `rgba(255,45,45,${0.55 - i * 0.12})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + Math.sin(worldTime * 9 + i) * 3, Math.max(0, fistY - 30)); ctx.stroke();
      }
      ctx.restore();
      drawHakiFist(f.x, fistY, 1.35, Math.PI / 2);
    });
  }
  // Bầu trời & ánh trăng Nika: màn đêm tím than phủ lên nền trời + vầng trăng bạc
  function drawTanNikaSky() {
    ctx.save();
    ctx.fillStyle = 'rgba(12, 16, 40, 0.5)';
    ctx.fillRect(0, 0, width, groundY);
    const mx = width * 0.78, my = height * 0.22, mr = Math.min(46, height * 0.15);
    const glow = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3);
    glow.addColorStop(0, 'rgba(235,242,255,0.55)'); glow.addColorStop(1, 'rgba(235,242,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(mx, my, mr * 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = '#e8f0ff'; ctx.shadowBlur = 28;
    ctx.fillStyle = '#f4f7ff'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(190,200,225,0.35)';
    ctx.beginPath(); ctx.arc(mx - mr * 0.3, my - mr * 0.15, mr * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawTanSquashed() {
    tanSquashed.forEach(sq => {
      const o = sq.o, t = 1 - sq.life / sq.max, k = clamp(t / 0.14, 0, 1);
      ctx.save();
      ctx.globalAlpha = clamp(sq.life / 0.3, 0, 1);
      ctx.translate(o.x + o.w / 2, groundY);
      ctx.scale(1 + 0.45 * k, 1 - 0.86 * k); // → scale(1.45, 0.14)
      ctx.translate(-o.w / 2, -o.h);
      drawObstacle({ ...o, x: 0, y: 0, knocked: true });
      ctx.restore();
    });
  }
  function drawTanBigBroom() {
    const b = tanBigBroom;
    if (!b) return;
    const y = groundY - player.height * 0.5;
    const sx = player.x + player.width * 0.5;
    ctx.save();
    // đuôi mây trắng phía sau nắm đấm
    for (let i = 0; i < 7; i++) {
      ctx.globalAlpha = 0.85 - i * 0.1;
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(b.x - 80 - i * 34, y + Math.sin(b.angle + i) * 16, 22 - i * 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // cánh tay cao su Haki kéo dài từ người Tân tới đầu đòn
    const armLen = Math.max(0, b.x - 60 - sx), armH = 46;
    if (armLen > 0) {
      const ag = ctx.createLinearGradient(0, y - armH / 2, 0, y + armH / 2);
      ag.addColorStop(0, '#0b0006'); ag.addColorStop(0.5, '#3a0510'); ag.addColorStop(1, '#0b0006');
      ctx.fillStyle = ag; ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = 16;
      ctx.fillRect(sx, y - armH / 2, armLen, armH);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ff2d2d'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx, y - armH / 2); ctx.lineTo(sx + armLen, y - armH / 2);
      ctx.moveTo(sx, y + armH / 2); ctx.lineTo(sx + armLen, y + armH / 2); ctx.stroke();
      for (let i = 0; i < 3; i++) {   // vệt Haki đỏ chạy dọc cánh tay
        const yy = y - armH * 0.3 + i * armH * 0.3;
        ctx.strokeStyle = `rgba(255,45,45,${0.55 - i * 0.12})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(sx, yy);
        for (let x = 0; x <= armLen; x += 24) ctx.lineTo(sx + x, yy + Math.sin(worldTime * 9 + i + x * 0.05) * 3);
        ctx.stroke();
      }
    }
    ctx.restore();
    // nắm đấm khổng lồ phóng ngang về phía trước
    drawHakiFist(b.x, y, 2.8, 0);
    // lửa đỏ bọc đầu nắm đấm + mây trắng cuộn
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const fxp = b.x + 60 + vfxRandom(0, 95), fyp = y + vfxRandom(-62, 62);
      ctx.globalAlpha = vfxRandom(0.5, 0.9);
      ctx.fillStyle = i % 3 === 0 ? '#ffd34d' : '#ff3b1f';
      ctx.shadowColor = '#ff3b1f'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(fxp, fyp, vfxRandom(4, 8), vfxRandom(8, 15), 0, 0, Math.PI * 2); ctx.fill();
    }
    tanCloudRibbon(b.x + 110, y, 70, 70, b.angle * 1.4, 9, 0.9);
    ctx.restore();
  }
  function drawTanNikaFront() {
    drawTanBigBroom();
    drawTanFists();
    tanFx.forEach(f => {
      const t = 1 - f.life / f.max;
      ctx.save();
      if (f.type === 'ring') {
        const r = t * (f.rmax || width * 0.55);
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 + 6 * (1 - t);
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.globalAlpha = clamp(f.life / 0.4, 0, 1);
        ctx.font = '900 17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#7a4300';
        ctx.strokeText('🪙 ' + f.text, f.x, f.y);
        ctx.fillStyle = '#ffe34d'; ctx.fillText('🪙 ' + f.text, f.x, f.y);
      }
      ctx.restore();
    });
  }

  function activateSkill() {
    skillTriggered = true;
    runSkillCount++; window.LimitedEvent?.onSkillUse?.(runSkillCount); // V24.1: nhiệm vụ sự kiện 20/11
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
      squadConverted = false;
      squadGuardWarned = false;
      showToast(`CHI VIỆN kích hoạt: tiểu đội Duy hộ tống, miễn nhiễm va chạm trong ${duration} giây!`);
      burst(player.x + player.width / 2, player.y + player.height / 2, 26);
      playTone(260, 0.2, 'sawtooth', 0.035);
    } else if (selectedCharacter === 'tien') {
      showToast(`ANH EM “SÉT” kích hoạt: Duy & Trọng “Sét” chạy cùng, miễn nhiễm va chạm và phóng sét trong ${duration} giây!`);
      lightningFlash = 0.4;
      burst(player.x + player.width / 2, player.y + player.height / 2, 28);
      playTone(200, 0.24, 'sawtooth', 0.05);
    } else if (selectedCharacter === 'trieu') {
      showToast(`VUA LÝ THUYẾT kích hoạt! Luồng chữ hất văng chướng ngại trong ${duration} giây!`);
      burst(player.x + player.width / 2, player.y + player.height * 0.35, 30);
      playTone(740, 0.2, 'triangle', 0.045);
    
    } else if (selectedCharacter === 'tan' && tanNikaOn('tan')) {
      // V25 — HÓA THÂN NIKA
      tanBroomLaunched = false; tanBigBroom = null; tanFists = []; tanFistTimer = 0; tanBigJump = false;
      tanFlash = 1;
      screenShake = Math.max(screenShake, 0.12);
      if (!tanAwakened) {
        tanAwakened = true; // Nội tại ẩn: từ chu kỳ sau hồi chiêu giảm vĩnh viễn 5 giây (skillInterval tự trừ)
        showToast('☀️ THỨC TỈNH NIKA: Hồi chiêu giảm vĩnh viễn 5 giây!');
      } else {
        showToast(`HÓA THÂN NIKA: miễn nhiễm va chạm, ép bẹp mọi vật cản trong ${duration} giây!`);
      }
      tanNikaSeekChorus();
      burst(player.x + player.width / 2, player.y + player.height * 0.45, 34, false, '#ffffff');
      playTone(180, 0.3, 'sawtooth', 0.06);
      playTone(520, 0.22, 'triangle', 0.04);
    } else if (selectedCharacter === 'tan') {
      broomTimer = 0;
            megaBroomThrown = false;
      
      showToast(`NÉM CHỔI kích hoạt: Tân miễn nhiễm va chạm và liên tục ném chổi hất văng chướng ngại trong ${duration} giây!`);
      burst(player.x + player.width / 2, player.y + player.height * 0.5, 24, false, '#ffcf4d');
      playTone(520, 0.18, 'triangle', 0.04);
    } else if (selectedCharacter === 'onghai') {
      onghaiRolled = false; onghaiGold = false; onghaiRingTimer = 0; onghaiPuffTimer = 0;
      showToast(`LÀO THỦ TU TIÊN: Ông Hai cưỡi điếu cày bay ${duration} giây, miễn nhiễm va chạm và nhả vòng khói hất văng vật cản!`);
      burst(player.x + player.width / 2, player.y + player.height * 0.9, 24, false, '#e8c46a');
      playTone(330, 0.22, 'triangle', 0.04);
    } else if (selectedCharacter === 'duongtao') {
      dtWords = []; dtWordTimer = 0;
      dtLastWord = dtPickLine(DT_WHEELIE_LINES, dtLastWord);
      dtWord = DT_WHEELIE_LINES[dtLastWord];
      showToast(`😏 BỐC ĐẦU NÓN 3/4! Dương Tào miễn nhiễm va chạm, chạy 1,12× và hất văng vật cản trong ${duration} giây!`);
      burst(player.x + player.width / 2, player.y + player.height * 0.8, 26, false, '#ffd34d');
      playTone(110, 0.3, 'sawtooth', 0.07);
      playTone(220, 0.22, 'triangle', 0.04);
    } else if (selectedCharacter === 'toduy' && toduyBuddhaOn()) {
      // V26 — CÂN ĐẨU VÂN · CHÂN LONG HỘ THỂ: chốt thời lượng (đã gồm Chân Kinh / Đại Giác Ngộ) rồi xóa thưởng đã dùng
      tdDurLocked = duration; tdNextBonus = 0; tdNextMult = 1;
      tdLayer = 0;
      showToast(`CÂN ĐẨU VÂN · CHÂN LONG HỘ THỂ: Tô Duy cưỡi mây vàng, miễn nhiễm va chạm ${duration} giây! Bấm Nhảy để đổi tầng mây.`);
      burst(player.x + player.width / 2, player.y + player.height * 0.8, 28, false, '#ffd84a');
      tanFlash = Math.max(tanFlash, 0.3);
      screenShake = Math.max(screenShake, 0.1);
      tdFx.push({ type: 'ring', x: player.x + player.width / 2, y: player.y + player.height, life: 0.6, max: 0.6, rmax: 120 });
      playTone(330, 0.3, 'triangle', 0.05);
      playTone(660, 0.25, 'sine', 0.035);
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
    const previousQuangBoost = quangSpeedApplied;
    if (quangSpeedApplied) { speed /= quangSpeedMult; quangSpeedApplied = false; }
    const previousBbBoost = bbSpeedApplied;
    if (bbSpeedApplied) { speed /= BB_SPEED; bbSpeedApplied = false; }   // [BÙI BẰNG]
    const previousDtBoost = dtSpeedApplied;
    if (dtSpeedApplied) { speed /= 1.12; dtSpeedApplied = false; }   // Dương Tào: hoàn trả tốc độ, không cộng dồn
    if (state === 'running') worldDistance += speed * (previousQuangBoost ? quangSpeedMult : 1) * (previousBbBoost ? BB_SPEED : 1) * (previousDtBoost ? 1.12 : 1) * dt;
    clouds.forEach(cloud => {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -90) { cloud.x = width + vfxRandom(10, 120); cloud.y = vfxRandom(22, height * 0.36); }
    });

    if (state === 'running') {
      elapsedRun += dt;
      // First activation follows the base interval; every later cooldown starts after the active window ends.
      if (isRider()) updateRider(dt);
      bbStep(dt);   // [BÙI BẰNG]
      if (hasTimedSkill() && selectedCharacter !== 'quang' && selectedCharacter !== 'buibang' && !isRider() && elapsedRun >= nextSkillAt) {
        activateSkill();
        // Cooldown is a full, independent interval AFTER the skill expires.
        // This prevents upgraded duration (Lv.3) from eating into the cooldown.
        nextSkillAt = skillActiveUntil + skillInterval();
      }
      if (selectedCharacter === 'onghai' && skillTriggered && !onghaiRolled && elapsedRun >= skillActiveUntil) onghaiEndRoll();
      const skillActive = elapsedRun < skillActiveUntil && skillTriggered;
      if (selectedCharacter === 'quang' && quangWasActive && !skillActive && skillActiveUntil > 0) {
        quangWasActive = false;
        quangShockwave();
      }
      if (selectedCharacter === 'duyquandoi') {
        if (skillTriggered && !skillActive && skillActiveUntil > 0 && !squadConverted) {
          squadGuards = Math.min(2, squadGuards + 2);
          squadConverted = true;
          squadGuardUntil = elapsedRun + SQUAD_GUARD_MAX_TIME;
          squadGuardWarned = false;
          if (squadGuards > 0) showToast(`CHI VIỆN KẾT THÚC! 2 đồng đội ở lại hộ vệ tối đa ${SQUAD_GUARD_MAX_TIME} giây, đỡ thay tối đa 2 lần va chạm.`);
        }
        if (!skillActive && squadGuards > 0 && squadConverted) {
          const guardLeft = squadGuardUntil - elapsedRun;
          if (guardLeft <= 0) {
            // Hết giờ: đồng đội rút lui.
            squadGuards = 0;
            squadGuardWarned = false;
            burst(player.x + player.width * 0.5, player.y + player.height * 0.5, 14, false, '#ffd34d');
            showToast('ĐỒNG ĐỘI RỜI ĐI! Hết thời gian hộ vệ.');
            playTone(220, 0.14, 'triangle', 0.04);
          } else if (guardLeft <= SQUAD_GUARD_WARN_TIME && !squadGuardWarned) {
            squadGuardWarned = true;
            showToast(`⚠️ Đồng đội sắp rời đi trong ${SQUAD_GUARD_WARN_TIME} giây!`);
            playTone(420, 0.1, 'square', 0.03);
          }
        }
        if (skillActive || squadGuards > 0) {
          // Hai bản sao tiếp tục bám theo player.y, kể cả sau khi Chi viện kết thúc.
          squadY[0] += (player.y - squadY[0]) * Math.min(1, dt * 20);
          squadY[1] += (player.y - squadY[1]) * Math.min(1, dt * 12);
        }
      }
      if (selectedCharacter === 'murat' && skillActive) {
        muRatCloneX += speed * dt * 1.75;
        if (muRatCloneX > width + player.width + 30) muRatCloneX = -player.width;
      }
            if (selectedCharacter === 'tan' && skillActive && !tanNikaOn('tan')) {
        const timeLeft = skillActiveUntil - elapsedRun;
        if (timeLeft <= 0.4 && !megaBroomThrown) {
          megaBroomThrown = true;
          throwBroom(true);
        } else if (timeLeft > 0.4) {
          broomTimer -= dt;
          if (broomTimer <= 0) { throwBroom(false); broomTimer = BROOM_INTERVAL; }
        }
            }
      
      updateBrooms(dt);
      updateTanNika(dt, skillActive);
      updateDuongTao(dt, skillActive);
      updateSmokeRings(dt);
      knockedObstacles.forEach(o => { o.x += (o.vx - speed * 0.35) * dt; o.y += o.vy * dt; o.vy += 780 * dt; o.angle += o.spin * dt; o.life -= dt; });
      knockedObstacles = knockedObstacles.filter(o => o.life > 0 && o.y < height + 120);
      lightningStrikes.forEach(strike => { strike.life -= dt; strike.x -= speed * dt * 0.35; });
      lightningStrikes = lightningStrikes.filter(strike => strike.life > 0);
      lightningCooldown = Math.max(0, lightningCooldown - dt);
      lightningStrikeTimer = Math.max(0, lightningStrikeTimer - dt);

      if (state === 'running') markMapVisited(currentMapKey());
      if (!bossMode && !racingMode && routeStage < mapRoute.length && score >= mapMarkAt(routeStage)) {
        const target = mapRoute[routeStage];
        routeStage++;
        switchMap(target, routeStage === 1);
      }
      if (bossMode) {
        speed = window.GameBridge.boss.cfg.scroll; // tốc độ cuộn cố định trong trận Boss
      } else if (cityMode || beachMode || villageMode || schoolMode) {   // [GĐ2] · [SCHOOL]
        cityElapsed += dt;
        // City starts more slowly, then gradually ramps up to the normal late-game pace.
        // Bãi Biển Hoàng Hôn: nhịp độ nhanh hơn một chút (+4%, trần 655).
        const cityTarget = beachSunset ? Math.min(655, (231 + cityElapsed * 13.5) * 1.04) : Math.min(625, 231 + cityElapsed * 13.5);
        speed += (cityTarget * (villageMode ? windMul() : 1) - speed) * Math.min(1, dt * 1.5);   // [GĐ3-B2] gió
      } else {
        speed = Math.min(690, speed + dt * 5.5);
      }
      const quangNow = quangActiveNow();
      if (quangNow) {
        speed *= quangSpeedMult;
        quangSpeedApplied = true;
        quangBikePhase += dt * 34;
      } else { quangBikePhase *= Math.max(0, 1 - dt * 5); }
      if (selectedCharacter === 'buibang' && bbDriving) { speed *= BB_SPEED; bbSpeedApplied = true; }   // [BÙI BẰNG]
      if (selectedCharacter === 'duongtao' && skillActive) { speed *= 1.12; dtSpeedApplied = true; }   // Bốc đầu: tăng tốc 1,12×

      if (!bossMode) {
        score += dt * (speed / 9.4);
        if (selectedCharacter === 'quang' && !quangPassiveBoost && score >= 1000) {
          quangPassiveBoost = true;
          if (quangWasActive) nextSkillAt = skillActiveUntil + quangCooldown();
          else nextSkillAt = Math.max(elapsedRun, nextSkillAt - quangCooldown() * (0.15 / 0.85));
          showToast('⚡ NỘI TẠI QUANG: TĂNG TỐC! Hồi chiêu GOD RIDER giảm vĩnh viễn 15% trong ván này.');
          playTone(980, 0.18, 'triangle', 0.05);
        }
        while (score >= phatNextMark) { phatNextMark += 250; phatAddRage(PHAT_RAGE_PER_250M); } // Phát: +10 Nộ mỗi 250m
        if (selectedCharacter === 'trieu') {
          [[2000, 'NỘI TẠI I: HỒI CHIÊU -1 GIÂY'], [3000, 'NỘI TẠI II: DUY TRÌ +1 GIÂY'], [4000, 'NỘI TẠI III: HỒI CHIÊU -2 GIÂY'], [5000, 'NỘI TẠI IV: DUY TRÌ +1 GIÂY'], [10000, 'NỘI TẠI V (10.000m): HỒI PHỤC GIÁP BẢO HỘ!']].forEach(([mark, msg]) => {
            if (score >= mark && !trieuMilestones.has(mark)) {
              trieuMilestones.add(mark); showToast(msg);
              if (mark === 10000) {   // Nội tại V: hồi +1 giáp (không vượt giáp tối đa đầu trận)
                if (spareHits < runMaxSpare) { spareHits++; updateShield(false); }
                phatPopup('+1 GIÁP!', '#7dffb0');
              }
            }
          });
        }
        awardCoinsForScore();
        if (score >= 3333) refreshCharacterLocks();
        spawnTimer -= dt;
      } else spawnTimer = 99;
      if (spawnTimer <= 0) {
        addObstacle();
        const difficulty = clamp((speed - 300) / 500, 0, 0.48);
        spawnTimer = random(cityMode ? 0.92 : 1.05, cityMode ? 1.42 : 1.62) - difficulty * (cityMode ? 0.45 : 1);
        if (cityMode) spawnTimer = Math.max(0.95, spawnTimer / CITY_OBSTACLE_RATE);
        // V23: cân bằng Bãi Biển — nhịp ra vật cản dày hơn một chút (trước: 1.05 / 1.0–1.5); Hoàng Hôn dày thêm ~7%.
        if (beachMode) spawnTimer = Math.max(0.92, random(0.88, 1.32) - difficulty * 0.4) * (beachSunset ? 0.93 : 1);
        if (cityNight) { spawnTimer += nightPad; nightPad = 0; }   // [GĐ1]
        if (villageMode) spawnTimer = Math.max(0.95, random(1.0, 1.4) - difficulty * 0.4);   // [GĐ2] nhịp vật cản làng quê
        if (schoolMode) spawnTimer = Math.max(0.95, random(1.0, 1.45) - difficulty * 0.4);   // [SCHOOL] nhịp vật cản trường học
      }

      // Scroll platforms before checking whether the player is still supported.
      platforms.forEach(platform => { platform.x -= speed * dt; });
      platforms = platforms.filter(platform => platform.x + platform.w > -20);
      if (cityMode && !cityNight) {   // [GĐ1] Night City không có giàn giáo
        // Spawn a new scaffold only after the previous one is almost behind the player.
        // The long ground gap between decks makes the route alternate naturally.
        nextScaffoldX -= speed * dt;
        if (nextScaffoldX < width + 145 && platforms.length < 4) {
                    const deckX = Math.max(width + 115, nextScaffoldX);
          const soloScaffold = window.gameRand() < 0.70;
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
            const upperOnLeft = window.gameRand() < 0.5;
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
        // Lv3 Tiến gốc: sau khi nhảy kép, tốc độ rơi giảm 15% (lướt nhẹ, dễ căn bệ)
        player.y += player.velocityY * dt * (player.floaty && player.velocityY > 0 ? 0.85 : 1);
        if (player.y >= groundY - player.height) {
          player.y = groundY - player.height;
          player.velocityY = 0;
          player.onGround = true;
          groundPlatform = null;
          burst(player.x + player.width * 0.42, groundY - 1, 3, true);
        }
      }

      onghaiStep(dt, skillActive);
      updateToDuyBuddha(dt, skillActive);   // V26 Tô Duy Buddha
      if (beachMode || villageMode) {   // [GĐ2] sông lớn dùng chung hệ hố nước của Bãi Biển
        if (villageMode) { updateVillageDecor(dt); updateWind(dt); }   // [GĐ3-B2]   // [GĐ2] cuộn cây dừa trang trí
        // Phát · ∫ f(x)dx: mọi hố nước đã hiện trên màn hình đều được lấp đầy
        if (skillActive && selectedCharacter === 'phat' && phatEffect === 'integral') waterPits.forEach(pit => { if (pit.x < width + 40) pit.filled = true; });
        if (skillActive && (selectedCharacter === 'quang' || selectedCharacter === 'buibang')) {   // [BÙI BẰNG]
          waterPits.forEach(pit => {
            if (!pit.filled && pit.x < player.x + player.width + 90 && pit.x + pit.w > player.x - 30) {
              pit.filled = true;
              burst(player.x + player.width * 0.6, groundY - 4, 12, false, '#70e8ff');
            }
          });
        }
        if (skillActive && selectedCharacter === 'duongtao') {   // Bốc đầu: lướt qua hố nước / sông lớn (tự lấp đầy)
          waterPits.forEach(pit => {
            if (!pit.filled && pit.x < player.x + player.width + 120 && pit.x + pit.w > player.x - 30) {
              pit.filled = true;
              burst(player.x + player.width * 0.6, groundY - 4, 12, false, '#70e8ff');
            }
          });
        }
        updateWaterPits(dt, skillActive);
      }

      obstacles.forEach(obstacle => {
        // [GĐ1] Night City: xe buýt chờ rồi lao 1.45x · lon bia 1.35x
        if (obstacle.nightBus && obstacle.wait > 0) obstacle.wait -= dt;
        else obstacle.x -= speed * (obstacle.type === 'tractor' ? 0.55 : obstacle.nightBus ? NIGHT_BUS_MULT : obstacle.nightCan ? NIGHT_CAN_MULT : 1) * dt;   // [GĐ3-B1] máy cày 0.55x
        if (obstacle.type === 'beachSign' && obstacle.variant === 'mid') updateMidSign(obstacle, dt);
        if (obstacle.type === 'can' && !obstacle.fixedY) {   // [GĐ1] lon Night bay độ cao cố định
          obstacle.y += Math.sin(worldTime * obstacle.bobSpeed + obstacle.bobOffset) * (obstacle.bobAmp || 7) * dt;
        }
        if (!obstacle.passed && obstacle.x + obstacle.w < player.x) {
          obstacle.passed = true;
          if (!obstacle.ignored) phatAddRage(PHAT_RAGE_PER_OBSTACLE); // Phát: vượt chướng ngại vật +10 Nộ
          if (!bossMode) {
            score += 4;
            if (selectedCharacter === 'quang' && !quangPassiveBoost && score >= 1000) {
              quangPassiveBoost = true;
              if (quangWasActive) nextSkillAt = skillActiveUntil + quangCooldown();
              else nextSkillAt = Math.max(elapsedRun, nextSkillAt - quangCooldown() * (0.15 / 0.85));
              showToast('⚡ NỘI TẠI QUANG: TĂNG TỐC! Hồi chiêu GOD RIDER giảm vĩnh viễn 15% trong ván này.');
            }
            awardCoinsForScore();
          }
        }

        // Triều: luồng chữ VUA LÝ THUYẾT hất văng chướng ngại phía trước.
        if (selectedCharacter === 'trieu' && skillActive && !obstacle.knockedByTrieu &&
            obstacle.x < player.x + player.width + 390 && obstacle.x + obstacle.w > player.x + player.width * 0.25) {
          obstacle.knockedByTrieu = true;
          knockedObstacles.push({ ...obstacle, vx: vfxRandom(180, 360), vy: vfxRandom(-620, -390), spin: vfxRandom(-9, 9), angle: 0, life: 1.7 });
        }

        // Dương Tào · Bốc đầu: luồng câu thoại hất văng chướng ngại phía trước.
        if (selectedCharacter === 'duongtao' && skillActive && !obstacle.knockedByDuongTao && obstacle.type !== 'scaffold' &&
            groundPlatform !== obstacle && duongtaoHits(obstacle.x, obstacle.w)) {
          duongtaoKnock(obstacle, false);
        }

        // Tân Nika: Chổi Khổng Lồ cuối chiêu quét bay vật cản; mọi vật cản chạm vào Tân bị ép bẹp dí sát đất.
        if (selectedCharacter === 'tan' && skillActive && tanNikaOn('tan') && !obstacle.knockedByTan) {
          if (tanBigBroom && obstacle.x < tanBigBroom.x + 150 && obstacle.x + obstacle.w > player.x - 20) {
            obstacle.knockedByTan = true;
            knockedObstacles.push({ ...obstacle, vx: vfxRandom(260, 520), vy: vfxRandom(-760, -480), spin: vfxRandom(-11, 11), angle: 0, life: 1.7, knocked: true });
            burst(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, 8, false, '#ffffff');
          } else if (groundPlatform !== obstacle && checkCollision(obstacle)) {
            tanSquash(obstacle);
          }
        }
        // Tân: chổi xoay đang bay hất văng mọi chướng ngại nó quét qua (tái sử dụng hiệu ứng knockedObstacles của Triều).
        if (brooms.length && !obstacle.knockedByTan && broomHits(obstacle.x, obstacle.w)) {
          obstacle.knockedByTan = true;
          knockedObstacles.push({ ...obstacle, vx: vfxRandom(180, 360), vy: vfxRandom(-620, -390), spin: vfxRandom(-9, 9), angle: 0, life: 1.7, knocked: true });
          burst(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, 8, false, '#ffcf4d');
          if (lightningCooldown <= 0) { lightningCooldown = 0.12; playTone(vfxRandom(420, 620), 0.06, 'triangle', 0.025); }
        }
        // Ông Hai: vòng khói hất văng vật cản tầm trung/cao (không phá vật sát đất)
        if (smokeRings.length && !obstacle.knockedByOngHai && onghaiCanKnock(obstacle) && smokeRingHits(obstacle.x, obstacle.w)) {
          obstacle.knockedByOngHai = true;
          knockedObstacles.push({ ...obstacle, vx: vfxRandom(180, 360), vy: vfxRandom(-620, -390), spin: vfxRandom(-9, 9), angle: 0, life: 1.7, knocked: true });
          burst(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, 8, false, '#e9e4d2');
        }
        // Mu Rát: bóng ma lướt lên phía trước làm tan biến chướng ngại vật chạm phải
        if (selectedCharacter === 'murat' && skillActive && !obstacle.ghostCleared &&
            muRatCloneX + player.width * 0.8 > obstacle.x && muRatCloneX + player.width * 0.2 < obstacle.x + obstacle.w) {
          obstacle.ghostCleared = true;
          burst(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, 12, false, '#72eaff');
          playTone(vfxRandom(650, 950), 0.06, 'sine', 0.02);
                                 }
        
        // Ninja: katana chém đứt đôi mọi chướng ngại trong tầm chém (cả trên không khi nhân vật nhảy).
        if (selectedCharacter === 'toduy' && skillActive && !toduyBuddhaOn() && !obstacle.destroyedByNinja && groundPlatform !== obstacle) {
          const bandTop = player.y - 64;
          const bandBottom = player.y + player.height + 28;
          if (obstacle.x < player.x + player.width + NINJA_REACH &&
              obstacle.x + obstacle.w > player.x + player.width * 0.2 &&
              obstacle.y + obstacle.h > bandTop && obstacle.y < bandBottom) {
            ninjaSlice(obstacle);
          }
        }

        // Sét clears obstacles in front of Trọng while the skill is active.
        if ((selectedCharacter === 'trong' || selectedCharacter === 'tien') && skillActive && !obstacle.destroyedByLightning &&
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
            playTone(vfxRandom(520, 900), 0.07, 'square', 0.025);
          }
        }
        // GOD RIDER: đầu xe quét vật cản trên mọi độ cao, hất văng thay vì chỉ xuyên qua.
        if (skillActive && (selectedCharacter === 'quang' || selectedCharacter === 'buibang') && !obstacle.knockedByQuang &&
            obstacle.x < player.x + player.width + 38 && obstacle.x + obstacle.w > player.x + player.width * 0.15) {
          quangKnockObstacle(obstacle);
        }
        // Phát: hiệu ứng của chiêu lên chướng ngại vật phía trước
        if (skillActive && selectedCharacter === 'phat') phatAffect(obstacle);
      });
      obstacles.forEach(unlinkCoconutDecor);   // [GĐ3-A2] phá tán → xóa thân
      obstacles = obstacles.filter(obstacle => !obstacle.wipedByPhat && !obstacle.convertedByPhat && obstacle.x + obstacle.w > -30 && !obstacle.destroyedByLightning && !obstacle.destroyedByNinja && !obstacle.knockedByTrieu && !obstacle.knockedByTan && !obstacle.knockedByQuang && !obstacle.knockedByDuongTao && !obstacle.knockedByOngHai && !obstacle.wipedByOngHai && !obstacle.ghostCleared && !obstacle.knockedByRainbow && !obstacle.knockedByRider && !obstacle.knockedByPhatSugar);
      validateSupport(); // bus đã dịch chuyển xong: kiểm tra lại bệ đỡ ngay trong cùng khung hình

      // [SCHOOL] Bạt nhún: không gây sát thương — chân chạm vùng bạt là bật vút lên, hồi lượt nhảy kép
      if (schoolMode) {
        for (const t of obstacles) {
          if (t.type !== 'trampoline') continue;
          t.bounceAnim = Math.max(0, t.bounceAnim - dt * 3.2);
          t.bounceCool = Math.max(0, t.bounceCool - dt);
          if (t.bounceCool > 0 || t.ignored || onghaiFlying || (selectedCharacter === 'buibang' && bbDriving)) continue;
          if (player.x + player.width * 0.7 > t.x && player.x + player.width * 0.3 < t.x + t.w && player.y + player.height >= t.y) {
            player.velocityY = -960;
            player.onGround = false;
            groundPlatform = null;
            player.airJumpsLeft = airJumpsMax();
            t.bounceAnim = 1; t.bounceCool = 0.35;
            schoolRings.push({ x: player.x + player.width * 0.5, y: t.y + 2, life: 0.45, maxLife: 0.45 });
            burst(player.x + player.width * 0.5, t.y, 8, true);
            playTone(320, 0.08, 'sine', 0.04);
            setTimeout(() => playTone(640, 0.14, 'triangle', 0.04), 80);
            break;
          }
        }
      }

      // Swept one-way landing on bus roofs and scaffold decks; side/front contact remains dangerous.
      const landingSurfaces = [...obstacles.filter(o => o.type === 'bus' || o.type === 'tractor' || o.type === 'schoolToilet'), ...platforms];   // [GĐ3-B1] · [SCHOOL] nóc nhà vệ sinh
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

      // Nhảy kép tự hồi ngay khi chân chạm đất, nóc xe buýt hoặc giàn giáo.
      if (player.onGround || groundPlatform) { player.airJumpsLeft = airJumpsMax(); player.floaty = false; }
            if (isRider()) {
        const onSurf = !!(player.onGround || groundPlatform);
        if (onSurf && !riderPrevGround && riderMounted && riderSkillActiveNow()) riderShockwave();
        riderPrevGround = onSurf;
            }
      // Nhiệm vụ: đếm mỗi lần tông vào một chiếc xe buýt (đáp lên nóc xe không tính).
      obstacles.forEach(obstacle => {
        if (obstacle.type !== 'bus' || obstacle.hitCounted || groundPlatform === obstacle || onghaiFlying) return;
        const landingOnTop = player.velocityY >= 0 &&
          player.x + player.width * 0.72 > obstacle.x &&
          player.x + player.width * 0.28 < obstacle.x + obstacle.w &&
          player.y + player.height <= obstacle.y + 16;
        if (!landingOnTop && checkCollision(obstacle)) { obstacle.hitCounted = true; runBusHits++; }
      });

      // Phát · C₁₂H₂₂O₁₁: va chạm trực tiếp là hất văng vật cản
      if (phatActiveNow() && phatEffect === 'sugar') {
        obstacles.forEach(obstacle => {
          if (obstacle.knockedByPhatSugar || obstacle.type === 'scaffold' || groundPlatform === obstacle) return;
          if (checkCollision(obstacle)) phatSugarKnock(obstacle);
        });
      }

      // Hành quân ignores collision while its 10-second window is active.
      if (!(skillActive && IMMUNE_SKILL_CHARS.includes(selectedCharacter)) && !bbSafeNow() && !tanGraceNow() && !tdGraceNow()) {   // [BÙI BẰNG] · V25 Tân Nika hạ cánh an toàn
        obstacles.forEach(obstacle => {
          if (phatActiveNow()) return; // Phát vừa tự kích hoạt trong khung hình này → miễn nhiễm ngay
          if ((obstacle.type === 'bus' || obstacle.type === 'tractor' || obstacle.type === 'schoolToilet') && player.onGround && groundPlatform === obstacle) return;   // [GĐ3-B1] · [SCHOOL]
          if (checkCollision(obstacle)) {
            // Falling onto a bus is a landing, not a crash.
            if ((obstacle.type === 'bus' || obstacle.type === 'tractor' || obstacle.type === 'schoolToilet') && player.velocityY >= 0 &&
                player.x + player.width * 0.72 > obstacle.x &&
                player.x + player.width * 0.28 < obstacle.x + obstacle.w &&
                player.y + player.height <= obstacle.y + 16) return;
            if (rainbowActive()) { knockRainbow(obstacle); return; }   // [L4] bất tử cầu vồng: hất văng
            if (phatAutoSave()) { obstacle.ignored = true; return; } // Phát đầy Nộ: tự kích hoạt cứu nguy
            if (isRider() && riderInvulnActive()) return;             // Trọng Riding: vừa bỏ ngựa, 1 giây bất tử
            if (isRider() && riderMounted && !bossMode) {             // đang cưỡi: bỏ ngựa, không mất giáp / khiên
              obstacle.ignored = true;
              riderKnockObstacle(obstacle);
              riderBailOut();
              return;
            }
            if (bossMode) {
              // Trận Boss: trúng thùng/rào mất 1 giáp/tim + bất tử tạm 1,2 giây (không chết ngay)
              if (window.GameBridge.boss.invuln() <= 0) { obstacle.ignored = true; window.GameBridge.boss.hurtPlayer(); }
              return;
            }
            if (consumeSquadGuard()) {
              obstacle.ignored = true;
            } else if (spareHits > 0) {
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
      if (!bossMode) updateRainbowItems(dt);   // [L4] di chuyển + nhặt Sò Nui 7 Màu
      window.GameBridge.boss?.update(dt, skillActive);
      lightningFlash = Math.max(0, lightningFlash - dt);
    }

    phatFx.forEach(f => { f.life -= dt; f.y -= 36 * dt; });
    phatFx = phatFx.filter(f => f.life > 0);
    sliceFX.forEach(f => { f.life -= dt; f.o.x -= (state === 'running' ? speed : 0) * dt * 0.9; });
    sliceFX = sliceFX.filter(f => f.life > 0);
    slashFX.forEach(f => { f.life -= dt; f.x -= (state === 'running' ? speed : 0) * dt * 0.9; });
    slashFX = slashFX.filter(f => f.life > 0);
    updateToDuyFx(dt);   // V26
    schoolRings.forEach(r => { r.life -= dt; r.x -= (state === 'running' ? speed : 0) * dt; });   // [SCHOOL]
    schoolRings = schoolRings.filter(r => r.life > 0);
    particles.forEach(p => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.g === undefined ? 340 : p.g) * dt;
    });
    particles = particles.filter(p => p.life > 0);
    screenShake = Math.max(0, screenShake - dt);
    tanFlash = Math.max(0, tanFlash - dt * 2.4);
    if (bossMode) window.GameBridge.boss.fx(dt);
    updateHud();
    window.Multiplayer?.onUpdate(dt);
    window.Racing?.onUpdate(dt);
  }

  function checkCollision(obstacle) {
        if (obstacle.ignored) return false;
    const isMuRat = selectedCharacter === 'murat';
    const ridingHorse = isRider() && riderMounted;
    const pw = isMuRat ? player.height * 0.30 : ridingHorse ? player.width * 0.62 : Math.max(player.width * 0.52, player.height * 0.30);
    const px = isMuRat ? player.x + player.width * 0.42 : ridingHorse ? player.x + player.width / 2 - pw / 2 : player.x + player.width * 0.25 - (pw - player.width * 0.52) / 2;
    const py = player.y + player.height * 0.12;
    const ph = player.height * 0.84;
    
    if (obstacle.type === 'trampoline') return false;   // [SCHOOL] bạt nhún không gây sát thương
    if (obstacle.type === 'schoolToilet') {             // [SCHOOL] hộp chữ nhật quanh thân nhà vệ sinh
      const ox = obstacle.x + 3, oy = obstacle.y + 4, ow = obstacle.w - 6, oh = obstacle.h - 4;
      return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
    }
    if (obstacle.type === 'wall') {
      const ox = obstacle.x + 2, oy = obstacle.y + 2;
      const ow = obstacle.w - 4, oh = obstacle.h - 2;
      return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
    }
    if (obstacle.type === 'bus' || obstacle.type === 'tractor') {   // [GĐ3-B1]
      // Deliberately rectangular hitbox around the visible bus body.
      const ox = obstacle.x + obstacle.w * 0.06;
      const oy = obstacle.y + obstacle.h * 0.12;
      const ow = obstacle.w * 0.88;
      const oh = obstacle.h * 0.86;
      return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
    }
    if (obstacle.type === 'beachSign') {
      // Biển hiệu treo cao: chỉ tính phần bảng (cột trụ chỉ là nền, không va chạm).
      const ox = obstacle.x + 2, oy = obstacle.y + 1, ow = obstacle.w - 4, oh = obstacle.h - 2;
      return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
    }
    if (obstacle.type === 'coconutTree') {   // [GĐ2] chỉ tán + chùm dừa treo cao mới va chạm
      return px < obstacle.x + obstacle.w && px + pw > obstacle.x && py < obstacle.y + obstacle.h && py + ph > obstacle.y;
    }
    if (obstacle.type === 'umbrella') {
      // Tán dù (nửa trên) + cột dù (hẹp, nửa dưới).
      const cx = obstacle.x + obstacle.w * 0.05, cy = obstacle.y + obstacle.h * 0.05, cw = obstacle.w * 0.9, ch = obstacle.h * 0.45;
      const sx = obstacle.x + obstacle.w * 0.43, sy = obstacle.y + obstacle.h * 0.5, sw = obstacle.w * 0.14, sh = obstacle.h * 0.5;
      return (px < cx + cw && px + pw > cx && py < cy + ch && py + ph > cy) ||
             (px < sx + sw && px + pw > sx && py < sy + sh && py + ph > sy);
    }
    const isCan = obstacle.type === 'can';
    const ox = obstacle.x + obstacle.w * (isCan ? 0.16 : 0.12);
    const oy = obstacle.y + obstacle.h * (isCan ? 0.10 : 0.08);
    const ow = obstacle.w * (isCan ? 0.68 : 0.76);
    const oh = obstacle.h * (isCan ? 0.80 : 0.90);
    return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
  }

  function drawBackground() {
    if (schoolMode) { drawSchoolBackground(); return; }     // [SCHOOL]
    if (villageMode) { drawVillageBackground(); return; }   // [GĐ2]
    if (cityMode) {
      if (cityNight) drawNightCityBackground(); else drawCityBackground();   // [GĐ1]
      return;
    }
    if (beachMode) {
      drawBeachBackground();
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

  // ===== [GĐ1] NIGHT CITY: nền =====
  const nightHash = (n) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
  function drawNightCityBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#050816'); sky.addColorStop(0.6, '#10183a'); sky.addColorStop(1, '#2a2b5c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);

    // Sao nhấp nháy
    ctx.fillStyle = '#fffbe8';
    for (let i = 0; i < 38; i++) {
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(worldTime * (1 + nightHash(i + 7) * 2) + i));
      ctx.globalAlpha = 0.25 + 0.6 * tw;
      const s = i % 5 === 0 ? 2 : 1.4;
      ctx.fillRect(nightHash(i + 1) * width, nightHash(i + 101) * groundY * 0.55, s, s);
    }
    ctx.globalAlpha = 1;

    // Trăng + quầng sáng
    const mx = width * 0.82, my = height * 0.17, mr = Math.min(26, height * 0.09);
    const halo = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3);
    halo.addColorStop(0, 'rgba(210,225,255,.35)'); halo.addColorStop(1, 'rgba(210,225,255,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, mr * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8efff'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();

    // 2 lớp tòa nhà: xa (tối) + gần (bật đèn cửa sổ vàng)
    const layers = [
      { period: 170, par: 0.10, col: '#0d1230', win: false, hMin: 0.26, hRange: 0.16, wBase: 80 },
      { period: 210, par: 0.22, col: '#1a2048', win: true,  hMin: 0.30, hRange: 0.22, wBase: 105 }
    ];
    layers.forEach((L, li) => {
      const off = state === 'running' ? worldDistance * L.par : worldTime * 25 * (L.par / 0.22);
      const base = Math.floor(off / L.period), sc = off - base * L.period;
      for (let i = -1; i < Math.ceil(width / L.period) + 2; i++) {
        const id = base + i + li * 1000;
        const x = i * L.period - sc;
        const bw = L.wBase + nightHash(id) * 40;
        const bh = height * (L.hMin + nightHash(id + 0.5) * L.hRange);
        const by = groundY - bh;
        ctx.fillStyle = L.col; roundedRect(x, by, bw, bh, 4); ctx.fill();
        if (!L.win) continue;
        for (let wy = by + 14, row = 0; wy < groundY - 18; wy += 22, row++) {
          for (let wx = x + 12, col = 0; wx < x + bw - 10; wx += 20, col++) {
            const h = nightHash(id * 31 + col * 7 + row * 13);
            ctx.fillStyle = h < 0.5 ? '#ffd35a' : (h < 0.62 ? '#ffe9a6' : '#1d2550');
            ctx.fillRect(wx, wy, 9, 11);
          }
        }
      }
    });

    // Mặt đường tối + vạch kẻ mờ
    ctx.fillStyle = '#141829'; ctx.fillRect(0, groundY, width, height - groundY);
    ctx.fillStyle = '#3b4468'; ctx.fillRect(0, groundY, width, 3);
    ctx.fillStyle = '#8a8560';
    const goff = state === 'running' ? worldDistance : worldTime * 8;
    const dOff = goff % 80;
    for (let x = -dOff; x < width + 50; x += 80) ctx.fillRect(x, groundY + 18, 38, 3);

    // Cột đèn đường + quầng sáng
    const lampGap = 260, lb = Math.floor(goff / lampGap), ls = goff - lb * lampGap;
    for (let i = -1; i < Math.ceil(width / lampGap) + 2; i++) {
      const lx = i * lampGap - ls + 40;
      ctx.fillStyle = '#2b3150'; ctx.fillRect(lx, groundY - 64, 3, 64); ctx.fillRect(lx, groundY - 64, 14, 3);
      const g = ctx.createRadialGradient(lx + 13, groundY - 60, 2, lx + 13, groundY - 60, 62);
      g.addColorStop(0, 'rgba(255,214,110,.55)'); g.addColorStop(1, 'rgba(255,214,110,0)');
      ctx.fillStyle = g; ctx.fillRect(lx - 50, groundY - 122, 126, 126);
    }
  }

  // ===== [GĐ2] MAP LÀNG QUÊ: nền, sông lớn, cây dừa =====
  function drawPalmTrunk(x, baseY, topY, lean, lw = 6) {
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.quadraticCurveTo(x + lean * 0.4, (baseY + topY) / 2, x + lean, topY); ctx.stroke();
    ctx.strokeStyle = 'rgba(60, 35, 15, .45)'; ctx.lineWidth = 1.5;   // vân thân
    for (let t = 0.2; t < 1; t += 0.2) {
      const py = baseY + (topY - baseY) * t, px = x + lean * t * t;
      ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py); ctx.stroke();
    }
  }
  function drawPalmFronds(cx, cy, s, sway) {
    for (let i = 0; i < 6; i++) {                        // 6 tàu lá quạt đều quanh ngọn
      const a = -Math.PI * 0.95 + i * (Math.PI * 1.9 / 5) + sway;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = i % 2 ? '#2f8f3d' : '#3fa84e';
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(22 * s, -10 * s, 46 * s, 8 * s);
      ctx.quadraticCurveTo(22 * s, -2 * s, 0, 4 * s); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  function drawFarPalm(x, baseY) {
    const top = baseY - 62;
    drawPalmTrunk(x, baseY, top, 8, 3);
    drawPalmFronds(x + 8, top, 0.55, 0);
  }
  function drawThatchHouse(x, baseY, w) {               // nhà lá: vách gỗ + mái lá
    const h = w * 0.55;
    ctx.fillStyle = '#8c6a45'; ctx.fillRect(x, baseY - h, w, h);
    ctx.fillStyle = '#c9a25b';
    ctx.beginPath(); ctx.moveTo(x - 8, baseY - h); ctx.lineTo(x + w / 2, baseY - h - w * 0.45); ctx.lineTo(x + w + 8, baseY - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a3420'; ctx.fillRect(x + w * 0.4, baseY - h * 0.5, w * 0.2, h * 0.5);
  }
  function drawMonkeyBridge(x, y) {                     // cầu khỉ bắc qua rạch nhỏ (trang trí)
    ctx.fillStyle = '#6cc3d9'; ctx.fillRect(x - 46, y - 8, 92, 6);
    ctx.strokeStyle = '#8a5a33'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 40, y - 2); ctx.quadraticCurveTo(x, y - 30, x + 40, y - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 40, y - 12); ctx.quadraticCurveTo(x, y - 40, x + 40, y - 12); ctx.stroke();
  }
  function drawVillageBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#9fdcf2'); sky.addColorStop(0.7, '#e6f7fb'); sky.addColorStop(1, '#f3f8e4');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 239, 160, .75)';
    ctx.beginPath(); ctx.arc(width * 0.8, height * 0.16, Math.min(28, height * 0.09), 0, Math.PI * 2); ctx.fill();
    clouds.forEach(c => drawCloud(c.x, c.y, c.scale * 0.9));

    // Cánh đồng lúa lớp xa: xanh xen vàng
    const fieldTop = groundY - 58;
    ctx.fillStyle = '#9bc85a'; ctx.fillRect(0, fieldTop, width, groundY - fieldTop);
    for (let y = fieldTop + 4, i = 0; y < groundY; y += 9, i++) {
      ctx.fillStyle = i % 2 ? '#e4c35a' : '#7fb446';
      ctx.fillRect(0, y, width, 5);
    }

    // Lớp parallax: nhà lá, dừa xa, cầu khỉ
    const period = 230, off = state === 'running' ? worldDistance * 0.25 : worldTime * 12;
    const base = Math.floor(off / period), sc = off - base * period;
    for (let i = -1; i < Math.ceil(width / period) + 2; i++) {
      const x = i * period - sc, id = base + i;
      if (nightHash(id * 3 + 1) < 0.6) drawThatchHouse(x + 30, groundY, 40 + nightHash(id + 5) * 14);
      drawFarPalm(x + 140 + nightHash(id + 9) * 30, groundY);
      if (nightHash(id * 7 + 2) < 0.35) drawMonkeyBridge(x + 190, groundY - 4);
    }

    // Đường đất làng quê
    ctx.fillStyle = '#c8a46b'; ctx.fillRect(0, groundY, width, height - groundY);
    ctx.fillStyle = '#8a6a45'; ctx.fillRect(0, groundY, width, 3);
    ctx.fillStyle = 'rgba(120, 85, 45, .35)';
    const doff = state === 'running' ? worldDistance % 80 : (worldTime * 8) % 80;
    for (let x = -doff; x < width + 50; x += 80) ctx.fillRect(x, groundY + 18, 30, 2);
  }

  // Sông lớn: vẽ nước + bờ đất + gờ gỗ hai mép; khi đã ∫ f(x)dx lấp thì thành đường đất
  function drawVillageRiver(pit) {
    const { x, w } = pit, y = groundY, h = height - groundY;
    if (pit.filled) {
      ctx.fillStyle = '#c8a46b'; ctx.fillRect(x - 1, y, w + 2, h);
      const cols = Math.max(4, Math.floor(w / 14)), bw = w / cols;
      ctx.fillStyle = 'rgba(25, 211, 197, .38)';
      for (let i = 0; i < cols; i++) {
        const bh = 8 + 7 * Math.abs(Math.sin(i * 0.9 + worldTime * 3));
        ctx.fillRect(x + i * bw + 1, y, bw - 2, bh);
      }
      ctx.fillStyle = '#8a6a45'; ctx.fillRect(x - 1, y, w + 2, 3);
      return;
    }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#6fcbe0'); g.addColorStop(1, '#2a7fa0');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, .5)'; ctx.lineWidth = 2;   // sóng nước
    for (let row = 0; row < 3; row++) {
      const wy = y + 8 + row * 14;
      ctx.beginPath();
      for (let px = x + 6; px <= x + w - 6; px += 6) {
        const yy = wy + Math.sin(px * 0.16 + worldTime * 3.5 + row * 1.3) * 2;
        if (px === x + 6) ctx.moveTo(px, yy); else ctx.lineTo(px, yy);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#8a5a33'; ctx.fillRect(x - 8, y, 8, 8); ctx.fillRect(x + w, y, 8, 8);   // bờ đất
    ctx.fillStyle = '#6fae3e'; ctx.fillRect(x - 8, y - 2, 8, 3); ctx.fillRect(x + w, y - 2, 8, 3);   // cỏ mép bờ
    ctx.fillStyle = '#6b4226';                                                                    // gờ gỗ cọc
    ctx.fillRect(x - 6, y - 10, 4, 12); ctx.fillRect(x + w + 2, y - 10, 4, 12);
  }

  function drawVillageDecor() {
    villageDecor.forEach(d => {
      if (d.x < -160 || d.x > width + 160) return;
      ctx.fillStyle = 'rgba(40, 78, 42, .12)';
      ctx.beginPath(); ctx.ellipse(d.x, groundY + 2, 22 * d.s, 3, 0, 0, Math.PI * 2); ctx.fill();
      drawPalmTrunk(d.x, groundY + 2, d.top, d.lean, 6);
      if (d.crown) drawPalmFronds(d.x + d.lean, d.top, d.s, Math.sin(worldTime * 1.6 + d.phase) * 0.08);
    });
  }

  // Cây dừa có chùm: tán là vật cản (va chạm theo checkCollision), chùm dừa vàng/xanh treo dưới tán
  function drawCoconutCanopy(o) {
    const cx = o.x + o.w / 2, cy = o.y + o.h * 0.35, s = o.w / 84;
    drawPalmFronds(cx, cy, s, Math.sin(worldTime * 1.6) * 0.06);
    [[-0.26, 0.45], [0, 0.78], [0.24, 0.5]].forEach(([fx, fy], i) => {
      ctx.fillStyle = i % 2 ? '#8fc04a' : '#e8c53a';          // dừa xanh / dừa vàng
      ctx.strokeStyle = '#6b4a1f'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(o.x + o.w * (0.5 + fx), o.y + o.h * fy + 6, 6 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  }

  // ===== [GĐ3-A2] Tán dừa bị phá → xóa luôn thân trong villageDecor =====
  function unlinkCoconutDecor(o) {
    if (o.type !== 'coconutTree' || !o.decorRef) return;
    if (o.knockedByTrieu || o.knockedByTan || o.knockedByOngHai || o.knockedByQuang || o.knockedByDuongTao ||
        o.destroyedByNinja || o.destroyedByLightning || o.ghostCleared || o.convertedByPhat) {
      o.decorRef.dead = true;
    }
  }

  // ===== [GĐ3-B1] Xe máy cày nông thôn: đầu hướng trái, bánh sau to có gai ở phải =====
  function drawTractor(o) {
    const { x, y, w, h } = o;
    const rBig = h * 0.34, rSmall = h * 0.2;
    const bigX = x + w * 0.76, bigY = y + h - rBig;
    const smX = x + w * 0.18, smY = y + h - rSmall;
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(bigX, bigY, rBig, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a8f96';
    for (let i = 0; i < 8; i++) {
      const a = worldTime * 6 + i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(bigX + Math.cos(a) * rBig * 0.7, bigY + Math.sin(a) * rBig * 0.7);
      ctx.lineTo(bigX + Math.cos(a) * (rBig + 3), bigY + Math.sin(a) * (rBig + 3));
      ctx.lineTo(bigX + Math.cos(a + 0.15) * rBig * 0.7, bigY + Math.sin(a + 0.15) * rBig * 0.7);
      ctx.fill();
    }
    ctx.fillStyle = '#c9ced4'; ctx.beginPath(); ctx.arc(bigX, bigY, rBig * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(smX, smY, rSmall, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9ced4'; ctx.beginPath(); ctx.arc(smX, smY, rSmall * 0.4, 0, Math.PI * 2); ctx.fill();
    roundedRect(x + w * 0.14, y + h * 0.5, w * 0.8, h * 0.26, 4); ctx.fillStyle = '#d64b3a'; ctx.fill();
    roundedRect(x + w * 0.12, y + h * 0.28, w * 0.3, h * 0.3, 4); ctx.fillStyle = '#c0392b'; ctx.fill();
    roundedRect(x + w * 0.4, y, w * 0.4, h * 0.56, 5); ctx.fillStyle = '#2f6fb5'; ctx.fill();
    ctx.fillStyle = '#bfe8ff'; ctx.fillRect(x + w * 0.46, y + h * 0.1, w * 0.28, h * 0.2);
    ctx.fillStyle = '#4a4f55'; ctx.fillRect(x + w * 0.2, y + h * 0.02, w * 0.05, h * 0.4);
    for (let i = 0; i < 3; i++) {
      const t = (worldTime * 0.8 + i / 3) % 1;
      ctx.globalAlpha = (1 - t) * 0.45;
      ctx.fillStyle = '#e9e9e9';
      ctx.beginPath(); ctx.arc(x + w * 0.225 + t * 8, y + h * 0.02 - t * 36, 4 + t * 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ===== [GĐ3-B2] Làn gió xuôi (+18%) / ngược (-18%). gameRand cho quyết định, vfxRandom cho hiệu ứng =====
  const windMul = () => (windDir === 1 ? 1.18 : windDir === -1 ? 0.82 : 1);
  function updateWind(dt) {
    if (windDir === 0) {
      windCool -= dt;
      if (windCool <= 0) {
        const wantBack = window.gameRand() < 0.5;
        // An toàn: không bật gió ngược khi trên màn hình còn Sông lớn (khi đó đổi sang gió xuôi)
        if (wantBack && waterPits.length === 0) { windDir = -1; showToast('💨 GIÓ NGƯỢC! Tốc độ giảm -18%'); }
        else { windDir = 1; showToast('🍃 GIÓ XUÔI! Tốc độ tăng +18%'); }
        windTimer = 3.5 + window.gameRand();                      // 3.5–4.5s
      }
    } else {
      windTimer -= dt;
      if (windTimer <= 0) { windDir = 0; windCool = 8 + 4 * window.gameRand(); }   // nghỉ 8–12s
    }
    if (windDir !== 0 && vfxRandom(0, 1) < 0.35) {
      windStreaks.push({
        x: windDir === 1 ? width + 20 : -40,
        y: vfxRandom(30, groundY - 30),
        len: vfxRandom(60, 140),
        vx: windDir === 1 ? -760 : 760,                           // xuôi: phải→trái · ngược: trái→phải
        life: 2
      });
    }
    windStreaks.forEach(st => { st.x += st.vx * dt; st.life -= dt; });
    windStreaks = windStreaks.filter(st => st.life > 0 && st.x > -200 && st.x < width + 200);
  }
  function drawWindStreaks() {
    if (!windStreaks.length) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 2;
    windStreaks.forEach(st => {
      const tail = st.vx < 0 ? st.len : -st.len;
      ctx.strokeStyle = st.vx < 0 ? 'rgba(230, 250, 255, .75)' : 'rgba(255, 248, 224, .7)';
      ctx.globalAlpha = Math.max(0, Math.min(1, st.life));
      ctx.beginPath(); ctx.moveTo(st.x, st.y);
      ctx.quadraticCurveTo(st.x + tail * 0.5, st.y - 6, st.x + tail, st.y); ctx.stroke();
    });
    ctx.restore();
  }

  // ===== [L4] SÒ NUI 7 MÀU: nhặt → bất tử cầu vồng =====
  function rainbowActive() { return state === 'running' && elapsedRun < rainbowUntil; }

  function updateRainbowItems(dt) {
    rainbowItems.forEach(it => { it.x -= speed * dt; });
    rainbowItems = rainbowItems.filter(it => it.x + it.w > -30);
    const px = player.x, py = player.y;
    rainbowItems = rainbowItems.filter(it => {
      const hit = px < it.x + it.w && px + player.width > it.x && py < it.y + it.h && py + player.height > it.y;
      if (hit) collectRainbow(it);
      return !hit;
    });
  }

  function collectRainbow(it) {
    achv.rainbowCount += 1;
    saveAchv();
    const until = elapsedRun + it.dur;
    if (until > rainbowUntil) rainbowUntil = until;             // chỉ cập nhật khi thời gian mới lớn hơn
    const left = Math.round(rainbowUntil - elapsedRun);
    showToast(`🌈 SÒ NUI 7 MÀU! Bất tử cầu vồng trong ${left}s!`);
    playTone(880, 0.14, 'triangle', 0.05);
    playTone(1320, 0.18, 'sine', 0.04);
    for (let i = 0; i < 3; i++) {                                 // hiệu ứng gọn nhẹ: 3 lần, mỗi lần 3 hạt
      burst(player.x + player.width * 0.5, player.y + player.height * 0.5, 3, false, `hsl(${i * 120},100%,65%)`);
    }
  }

  // Phát · hiệu ứng 2 (C₁₂H₂₂O₁₁): húc trúng vật cản là hất văng xoay tròn lên trời (như Sò Nui 7 Màu)
  function phatSugarKnock(o) {
    if (o.knockedByPhatSugar) return;
    o.knockedByPhatSugar = true;
    o.ignored = true;
    knockedObstacles.push({ ...o, vx: vfxRandom(260, 520), vy: vfxRandom(-760, -470), spin: vfxRandom(-13, 13), angle: 0, life: 1.45, knocked: true });
    unlinkCoconutDecor(o);                                         // trúng tán dừa thì xóa luôn thân
    for (let i = 0; i < 3; i++) burst(o.x + o.w / 2, o.y + o.h / 2, 3, false, '#ffb02e');
    screenShake = Math.max(screenShake, 0.08);
  }

  function knockRainbow(o) {
    if (o.knockedByRainbow) return;
    o.knockedByRainbow = true;
    o.ignored = true;
    knockedObstacles.push({ ...o, vx: vfxRandom(260, 520), vy: vfxRandom(-760, -470), spin: vfxRandom(-13, 13), angle: 0, life: 1.45, knocked: true });
    unlinkCoconutDecor(o);                                         // trúng tán dừa thì xóa luôn thân
    for (let i = 0; i < 3; i++) {                                  // hiệu ứng gọn nhẹ: 3 lần, mỗi lần 3 hạt
      burst(o.x + o.w / 2, o.y + o.h / 2, 3, false, `hsl(${i * 120},100%,65%)`);
    }
    screenShake = Math.max(screenShake, 0.08);
  }

  function drawRainbowSoNui(it) {
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    const pulse = 1 + 0.12 * Math.sin(worldTime * 6 + it.phase);
    // Hào quang trắng-ấm phía sau
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
    glow.addColorStop(0, 'rgba(255,255,255,.55)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
    // [BAG] Cùng một ảnh bịch, đổi màu cầu vồng liên tục bằng hue-rotate; giữ tỷ lệ đứng
    if (soNuiSprite.complete && soNuiSprite.naturalWidth > 0) {
      const ratio = soNuiSprite.naturalWidth / soNuiSprite.naturalHeight;
      let dh = it.h * pulse, dw = dh * ratio;
      if (dw > it.w * pulse) { dw = it.w * pulse; dh = dw / ratio; }
      ctx.save();
      ctx.filter = `hue-rotate(${(worldTime * 120) % 360}deg) saturate(2)`;
      ctx.drawImage(soNuiSprite, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
    } else {
      ctx.fillStyle = `hsl(${(worldTime * 120) % 360},100%,62%)`;   // dự phòng khi chưa tải ảnh
      roundedRect(cx - it.w / 2, cy - it.h / 2, it.w, it.h, 6); ctx.fill();
    }
    // Lấp lánh quanh item
    for (let i = 0; i < 4; i++) {
      const a = worldTime * 2 + i * 1.57 + it.phase;
      ctx.fillStyle = `hsla(${(worldTime * 120 + i * 90) % 360},100%,80%,0.9)`;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 22, cy + Math.sin(a) * 18, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawRainbowAura() {
    const cx = player.x + player.width * 0.5, cy = player.y + player.height * 0.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {                                  // 3 vòng hào quang đổi màu theo thời gian
      ctx.strokeStyle = `hsla(${(i * 120 + worldTime * 200) % 360},100%,65%,.55)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 52 + i * 5 + Math.sin(worldTime * 8 + i) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {                                  // hạt bụi cầu vồng bay ngược về sau
      const t = (worldTime * 1.6 + i * 0.2) % 1;
      ctx.fillStyle = `hsla(${(i * 72 + worldTime * 200) % 360},100%,70%,${1 - t})`;
      ctx.beginPath(); ctx.arc(player.x - t * 40 + 10, cy + (i - 2) * 12, 3 * (1 - t) + 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
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

  // ===== [GĐ1] NIGHT CITY: vật cản & hiệu ứng =====
  function drawSoNuiShell(cx, cy, rx, ry, t) {
    ctx.fillStyle = ['#f2b441', '#e9a233', '#f7c35a'][t];
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b9731f'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = '#c98424';                                   // đường xoắn của vỏ sò
    ctx.beginPath(); ctx.arc(cx + rx * 0.15, cy, ry * 0.55, Math.PI * 0.2, Math.PI * 1.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,225,130,.75)';                       // điểm sáng giòn
    ctx.beginPath(); ctx.ellipse(cx - rx * 0.3, cy - ry * 0.4, rx * 0.28, ry * 0.18, -0.4, 0, Math.PI * 2); ctx.fill();
  }
  function drawSoNui(o) {
    if (!o.knocked) {                                              // bóng đổ nhẹ dưới chân bịch
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y + o.h + 2, o.w * 0.6, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    const singleW = o.isDouble ? (o.singleW || (o.w - 4) / 2) : o.w;
    const bagCount = o.isDouble ? 2 : 1;
    for (let i = 0; i < bagCount; i++) {
      const bagX = o.x + i * (singleW + 4);
      if (soNuiSprite.complete && soNuiSprite.naturalWidth > 0) {
        ctx.drawImage(soNuiSprite, bagX, o.y, singleW, o.h);
      } else {
        roundedRect(bagX, o.y, singleW, o.h, 6);                  // dự phòng khi chưa tải ảnh
        ctx.fillStyle = '#7cc04a'; ctx.fill();
        ctx.fillStyle = '#f5c542'; ctx.fillRect(bagX, o.y + o.h * 0.35, singleW, o.h * 0.3);
      }
    }
  }
  function drawNightBusFx(o) {
    const waiting = o.wait > 0;
    const fy = o.y + o.h * 0.68, len = waiting ? 90 : 250;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, width, groundY + 4); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(o.x, 0, o.x - len, 0);      // chùm đèn pha vàng rọi phía trước (bên trái)
    g.addColorStop(0, waiting ? 'rgba(255,225,120,.28)' : 'rgba(255,230,120,.6)');
    g.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(o.x, fy - 4); ctx.lineTo(o.x - len, fy - o.h * 0.45);
    ctx.lineTo(o.x - len, fy + o.h * 0.45); ctx.lineTo(o.x, fy + 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (waiting && Math.floor(worldTime * 10) % 2 === 0) {         // dấu "!" đỏ nhấp nháy
      const cx = o.x + o.w / 2, cy = o.y - 24;
      ctx.save();
      ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', cx, cy + 1);
      ctx.restore();
    }
  }
  function drawNightCanTrail(o) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const x0 = o.x + o.w * 0.8, len = 120;
    [0.25, 0.5, 0.75].forEach((p, i) => {
      const y = o.y + o.h * p, l = len * (i === 1 ? 1 : 0.65);
      const g = ctx.createLinearGradient(x0, 0, x0 + l, 0);
      g.addColorStop(0, 'rgba(255,240,170,.55)'); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.fillRect(x0, y - 2, l, 4);
    });
    ctx.restore();
  }

  function drawCrate(obstacle) {
    const { x, y, w, h } = obstacle;
    ctx.fillStyle = '#c88745';
    roundedRect(x, y, w, h, 4); ctx.fill();
    ctx.strokeStyle = '#8a5d37'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#e7b575'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + w - 5, y + h - 5); ctx.moveTo(x + w - 5, y + 5); ctx.lineTo(x + 5, y + h - 5); ctx.stroke();
  }

  // =====================================================================
  // [SCHOOL] VẼ MAP TRƯỜNG HỌC
  // =====================================================================
  function drawSchoolFlag(px, baseY, poleH) {
    const top = baseY - poleH, fw = 38, fh = 25;
    ctx.fillStyle = '#9aa0a6'; ctx.fillRect(px - 1.5, top - 4, 3, poleH + 4);
    ctx.fillStyle = '#d6b23a'; ctx.beginPath(); ctx.arc(px, top - 5, 3, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < fw; i += 2) {
      const wave = Math.sin(worldTime * 4.2 + i * 0.22) * 2.4 * (i / fw);
      ctx.fillStyle = '#da251d'; ctx.fillRect(px + 1.5 + i, top + wave, 2.2, fh);
    }
    // sao vàng năm cánh
    const cx = px + 1.5 + fw / 2, cy = top + fh / 2 + Math.sin(worldTime * 4.2 + fw * 0.11) * 1.2, R = 7.5, r = 3;
    ctx.fillStyle = '#ffde00'; ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const ang = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? r : R;
      const sx = cx + Math.cos(ang) * rad, sy = cy + Math.sin(ang) * rad;
      if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.closePath(); ctx.fill();
  }

  // Dãy phòng học 2 tầng: tường vàng kem, mái ngói đỏ, cửa sổ xanh
  function drawSchoolBuilding(x, baseY, w, h) {
    const top = baseY - h, floorH = h / 2;
    ctx.fillStyle = '#f5e6b3'; ctx.fillRect(x, top, w, h);
    ctx.fillStyle = '#dcc680'; ctx.fillRect(x, top + floorH - 2, w, 4);          // sàn tầng 2
    ctx.fillStyle = '#cdb46d'; ctx.fillRect(x, baseY - 5, w, 5);                  // chân tường
    const cols = Math.max(2, Math.floor((w - 24) / 38)), gap = (w - 24) / cols;
    for (let f = 0; f < 2; f++) {
      const wy = top + f * floorH + floorH * 0.2;
      for (let i = 0; i < cols; i++) {
        const wx = x + 12 + i * gap + (gap - 22) / 2;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(wx - 2, wy - 2, 26, floorH * 0.55 + 4);
        ctx.fillStyle = '#4da8e6'; ctx.fillRect(wx, wy, 22, floorH * 0.55);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(wx + 2, wy + 2, 7, floorH * 0.55 - 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(wx + 10, wy, 2, floorH * 0.55);
      }
    }
    ctx.fillStyle = '#b9923a'; ctx.fillRect(x, top + floorH + floorH * 0.82, w, 3);   // lan can hành lang tầng 2
    ctx.fillStyle = '#8a5a35'; ctx.fillRect(x + w / 2 - 9, baseY - floorH * 0.62, 18, floorH * 0.62);   // cửa chính
    ctx.fillStyle = '#e8d089'; ctx.fillRect(x + w / 2 - 1, baseY - floorH * 0.62, 2, floorH * 0.62);
    // mái ngói đỏ
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.moveTo(x - 8, top + 1); ctx.lineTo(x + 14, top - 17); ctx.lineTo(x + w - 14, top - 17); ctx.lineTo(x + w + 8, top + 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#962b20'; ctx.lineWidth = 1.2;
    for (let ty = top - 12; ty < top; ty += 6) { ctx.beginPath(); ctx.moveTo(x - 4 + (top - ty) * 0.2, ty); ctx.lineTo(x + w + 4 - (top - ty) * 0.2, ty); ctx.stroke(); }
    ctx.fillStyle = '#962b20'; ctx.fillRect(x + 14, top - 19, w - 28, 3);
  }

  function drawSchoolBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#6ec3ff'); sky.addColorStop(0.7, '#c9ebff'); sky.addColorStop(1, '#eef9ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 240, 170, .8)';
    ctx.beginPath(); ctx.arc(width * 0.82, height * 0.15, Math.min(26, height * 0.085), 0, Math.PI * 2); ctx.fill();
    clouds.forEach(c => drawCloud(c.x, c.y, c.scale * 0.95));

    // Lớp parallax: dãy phòng học + cột cờ + bụi cây
    const period = 340, off = state === 'running' ? worldDistance * 0.25 : worldTime * 12;
    const base = Math.floor(off / period), sc = off - base * period;
    const bh = Math.min(118, groundY * 0.4);
    for (let i = -1; i < Math.ceil(width / period) + 2; i++) {
      const x = i * period - sc, id = base + i;
      drawSchoolBuilding(x + 6, groundY - 2, 250, bh);
      ctx.fillStyle = '#4f9a4a';
      ctx.beginPath(); ctx.arc(x + 20, groundY - 4, 11, Math.PI, 0); ctx.arc(x + 40, groundY - 4, 9, Math.PI, 0); ctx.fill();
      if (nightHash(id * 5 + 1) < 0.75) drawSchoolFlag(x + 292, groundY - 2, Math.min(150, groundY * 0.52));
    }

    // Sân trường: gạch đỏ (nửa trên) + xi măng (nửa dưới) có vạch kẻ sân thể dục
    const gh = height - groundY, doff = state === 'running' ? worldDistance % 90 : (worldTime * 8) % 90;
    ctx.fillStyle = '#b84a35'; ctx.fillRect(0, groundY, width, gh * 0.5);
    ctx.fillStyle = 'rgba(90, 28, 18, .35)';
    for (let x = -doff; x < width + 90; x += 45) ctx.fillRect(x, groundY, 2, gh * 0.5);
    for (let y = groundY + 14; y < groundY + gh * 0.5; y += 14) ctx.fillRect(0, y, width, 2);
    ctx.fillStyle = '#c9c6bd'; ctx.fillRect(0, groundY + gh * 0.5, width, gh * 0.5 + 2);
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    for (let x = -doff; x < width + 90; x += 90) ctx.fillRect(x, groundY + gh * 0.5, 2, gh * 0.5 + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, groundY + gh * 0.5 + 6, width, 3);                            // vạch kẻ liền
    for (let x = -doff; x < width + 90; x += 90) ctx.fillRect(x, groundY + gh * 0.5 + 22, 46, 3);   // vạch kẻ đứt
    ctx.fillStyle = '#7b2f22'; ctx.fillRect(0, groundY, width, 3);
  }

  function drawSchoolRings() {
    schoolRings.forEach(r => {
      const t = 1 - r.life / r.maxLife;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - t)})`; ctx.lineWidth = 3 * (1 - t) + 1;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, 14 + 52 * t, 4 + 11 * t, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(120, 200, 255, ${0.6 * (1 - t)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, 8 + 34 * t, 3 + 7 * t, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });
  }

  // Bạt nhún: khung chân sắt đỏ + lò xo zig-zag + mặt bạt xanh (lún xuống khi vừa giẫm)
  function drawTrampoline(o) {
    const { x, y, w, h } = o, dip = (o.bounceAnim || 0) * 7, top = y + dip, bottom = y + h;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#d63a3a'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 9, top + 6); ctx.lineTo(x + 4, bottom);
    ctx.moveTo(x + w - 9, top + 6); ctx.lineTo(x + w - 4, bottom);
    ctx.moveTo(x + 6, bottom - 3); ctx.lineTo(x + w - 6, bottom - 3);
    ctx.stroke();
    ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 1.7;
    const springs = 4;
    for (let k = 0; k < springs; k++) {
      const sx = x + 14 + k * (w - 28) / (springs - 1), y0 = top + 6, y1 = bottom - 4, segs = 5;
      ctx.beginPath(); ctx.moveTo(sx, y0);
      for (let s = 1; s <= segs; s++) ctx.lineTo(sx + (s % 2 ? 3 : -3), y0 + (y1 - y0) * s / segs);
      ctx.stroke();
    }
    ctx.fillStyle = '#2e86f0'; roundedRect(x, top, w, 7, 3.5); ctx.fill();
    ctx.strokeStyle = '#1b5fb8'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x + 8, top + 1.5, w - 16, 1.8);
    ctx.restore();
  }

  // Nhà vệ sinh học sinh: tường gạch vàng nhạt, mái ngói xanh, biển đỏ chữ trắng, 2 cửa NAM / NỮ
  function drawSchoolToilet(o) {
    const { x, y, w, h } = o, bottom = y + h;
    ctx.save();
    ctx.fillStyle = '#f0d890'; ctx.fillRect(x, y + 12, w, h - 12);
    ctx.strokeStyle = 'rgba(160, 120, 50, .35)'; ctx.lineWidth = 1;
    for (let by = y + 22, row = 0; by < bottom; by += 11, row++) {
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + w, by); ctx.stroke();
      for (let bx = x + (row % 2 ? 8 : 16); bx < x + w; bx += 16) { ctx.beginPath(); ctx.moveTo(bx, by - 11); ctx.lineTo(bx, by); ctx.stroke(); }
    }
    ctx.strokeStyle = '#b8964a'; ctx.lineWidth = 2; ctx.strokeRect(x, y + 12, w, h - 12);
    // mái ngói xanh
    ctx.fillStyle = '#2f6fb5'; roundedRect(x - 5, y, w + 10, 16, 3); ctx.fill();
    ctx.strokeStyle = '#1f4f87'; ctx.lineWidth = 1.2;
    for (let tx = x - 2; tx < x + w + 4; tx += 8) { ctx.beginPath(); ctx.moveTo(tx, y + 2); ctx.lineTo(tx, y + 14); ctx.stroke(); }
    // biển đỏ chữ trắng
    const sw = w - 14, sy = y + 22;
    ctx.fillStyle = '#d32f2f'; roundedRect(x + 7, sy, sw, 20, 4); ctx.fill();
    ctx.strokeStyle = '#8f1d1d'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = 12; ctx.font = `900 ${fs}px sans-serif`;
    while (fs > 7 && ctx.measureText('NHÀ VỆ SINH').width > sw - 8) { fs--; ctx.font = `900 ${fs}px sans-serif`; }
    ctx.fillText('NHÀ VỆ SINH', x + w / 2, sy + 10.5);
    // 2 cửa buồng
    const dw = 36, dh = 78, dy = bottom - dh;
    [['NAM', x + 10, '#3f7fd0', '#2b5fa3'], ['NỮ', x + w - 10 - dw, '#e0709a', '#b24f77']].forEach(([label, dx, col, dark]) => {
      ctx.fillStyle = col; ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.strokeRect(dx, dy, dw, dh);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(dx + 4, dy + 22, dw - 8, 3); ctx.fillRect(dx + 4, dy + 30, dw - 8, 3);
      ctx.fillStyle = '#ffe9a3'; ctx.beginPath(); ctx.arc(dx + dw - 7, dy + dh * 0.55, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = '900 10px sans-serif'; ctx.fillText(label, dx + dw / 2, dy + 11);
    });
    ctx.restore();
  }

  // Cameo Bùi Bằng / Dương Tào: sprite + bong bóng thoại nhỏ trên đầu
  function drawSchoolCameo(o) {
    const { x, y, w, h } = o, img = schoolCameoSprites[o.who];
    ctx.save();
    ctx.globalAlpha = 0.16; ctx.fillStyle = '#33402b';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 2, w * 0.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    if (img && img.complete && img.naturalWidth > 0) {
      const dh = h, dw = Math.min(w * 1.35, dh * img.naturalWidth / img.naturalHeight);
      ctx.drawImage(img, x + w / 2 - dw / 2, y, dw, dh);
    } else {
      ctx.fillStyle = o.who === 'buibang' ? '#2f6fb5' : '#c0392b'; roundedRect(x, y, w, h, 8); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = '900 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.who === 'buibang' ? 'BB' : 'DT', x + w / 2, y + h / 2);
    }
    if (!o.knocked && o.line) {
      let fs = 11; ctx.font = `700 ${fs}px sans-serif`;
      while (fs > 8 && ctx.measureText(o.line).width > 128) { fs--; ctx.font = `700 ${fs}px sans-serif`; }
      const tw = ctx.measureText(o.line).width, bw = tw + 14, bhh = fs + 10;
      const bx = x + w / 2 - bw / 2, by = y - bhh - 9;
      ctx.fillStyle = '#ffffff'; roundedRect(bx, by, bw, bhh, 7); ctx.fill();
      ctx.strokeStyle = '#2b3440'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath();
      ctx.moveTo(x + w / 2 - 5, by + bhh - 0.5); ctx.lineTo(x + w / 2, by + bhh + 7); ctx.lineTo(x + w / 2 + 5, by + bhh - 0.5); ctx.fill();
      ctx.strokeStyle = '#2b3440'; ctx.beginPath();
      ctx.moveTo(x + w / 2 - 5, by + bhh); ctx.lineTo(x + w / 2, by + bhh + 7); ctx.lineTo(x + w / 2 + 5, by + bhh); ctx.stroke();
      ctx.fillStyle = '#1d2530'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.line, x + w / 2, by + bhh / 2 + 0.5);
    }
    ctx.restore();
  }

  // Bàn ghế học sinh: bàn gỗ có ngăn bàn + ghế tựa
  function drawSchoolDesk(o) {
    const { x, y, w, h } = o, dw = w * 0.7;
    ctx.save();
    ctx.fillStyle = '#c9954f'; ctx.fillRect(x, y + 10, dw, 6);                    // mặt bàn
    ctx.fillStyle = '#8a5f2c'; ctx.fillRect(x, y + 15, dw, 2);
    ctx.fillStyle = '#a9763a'; ctx.fillRect(x + 3, y + 17, dw - 6, 13);           // ngăn bàn
    ctx.fillStyle = '#4a3218'; ctx.fillRect(x + 6, y + 21, dw - 12, 6);
    ctx.fillStyle = '#e3d6b5'; ctx.fillRect(x + 8, y + 22, 10, 4);               // vở trong ngăn
    ctx.fillStyle = '#7a5530'; ctx.fillRect(x + 3, y + 30, 3, h - 30); ctx.fillRect(x + dw - 6, y + 30, 3, h - 30);   // chân bàn
    const cx = x + w * 0.76;                                                      // ghế tựa
    ctx.fillStyle = '#2f6fb5'; ctx.fillRect(cx + (w * 0.24 - 5), y + 2, 5, 28);   // lưng ghế
    ctx.fillRect(cx, y + 28, w * 0.24, 5);                                        // mặt ghế
    ctx.fillStyle = '#5a6672'; ctx.fillRect(cx + 1, y + 33, 2.5, h - 33); ctx.fillRect(cx + w * 0.24 - 4, y + 33, 2.5, h - 33);
    ctx.restore();
  }

  // Cặp sách bay: balo có cánh vỗ, lắc nhẹ khi bay
  function drawSchoolBag(o) {
    const { x, y, w, h } = o, [col, dark] = SCHOOL_BAG_COLORS[o.colorIdx || 0];
    const t = worldTime * (o.bobSpeed || 1.5) + (o.bobOffset || 0);
    const bob = Math.sin(t * 2) * 3, tilt = Math.sin(t) * 0.12, flap = Math.sin(worldTime * 16 + (o.bobOffset || 0));
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2 + bob); ctx.rotate(tilt); ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = 'rgba(255,255,255,.92)';                                      // cánh vỗ
    ctx.beginPath(); ctx.ellipse(-4, h * 0.38, 9, 5 + 3 * flap, -0.5 - 0.3 * flap, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w + 4, h * 0.38, 9, 5 + 3 * flap, 0.5 + 0.3 * flap, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 2.5;                                  // quai xách
    ctx.beginPath(); ctx.arc(w / 2, 4, w * 0.2, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = col; roundedRect(0, 3, w, h - 3, 7); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = dark; roundedRect(0, 3, w, h * 0.3, 7); ctx.fill();           // nắp balo
    ctx.fillStyle = 'rgba(255,255,255,.22)'; roundedRect(w * 0.16, h * 0.5, w * 0.68, h * 0.34, 4); ctx.fill();   // túi trước
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(w * 0.16, h * 0.5); ctx.lineTo(w * 0.84, h * 0.5); ctx.stroke();
    ctx.restore();
  }

  function drawObstacle(o) {
    if (o.type === 'trampoline') { drawTrampoline(o); return; }        // [SCHOOL]
    if (o.type === 'schoolToilet') { drawSchoolToilet(o); return; }    // [SCHOOL]
    if (o.type === 'cameo') { drawSchoolCameo(o); return; }            // [SCHOOL]
    if (o.type === 'desk') { drawSchoolDesk(o); return; }              // [SCHOOL]
    if (o.type === 'schoolBag') { drawSchoolBag(o); return; }          // [SCHOOL]
    if (o.type === 'sonui') { drawSoNui(o); return; }   // [GĐ1]
    if (o.type === 'coconutTree') { drawCoconutCanopy(o); return; }
    if (o.type === 'tractor') { drawTractor(o); return; }   // [GĐ3-B1]   // [GĐ2]
    if (o.type === 'umbrella') { drawUmbrella(o); return; }
    if (o.type === 'beachSign') { drawBeachSign(o); return; }
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
      if (o.nightBus && !o.knocked) drawNightBusFx(o);   // [GĐ1] đèn pha + dấu "!"
      if (busSprite.complete && busSprite.naturalWidth > 0) {
        ctx.drawImage(busSprite, o.x, o.y, o.w, o.h);
      } else {
        ctx.fillStyle = '#1686bd'; ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#cdeefa'; ctx.fillRect(o.x + o.w * .12, o.y + o.h * .12, o.w * .72, o.h * .30);
      }
      return;
    }
    if (o.type === 'can') {
      if (o.nightCan && !o.knocked) drawNightCanTrail(o);   // [GĐ1] vệt sáng đuôi
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

  // ----- V23 Phát: hào quang theo hiệu ứng + đồ thị ∫ f(x)dx + chữ nổi -----
  function drawPhatAura() {
    const cx = player.x + player.width * 0.5, cy = player.y + player.height * 0.5;
    const pulse = 0.5 + 0.5 * Math.sin(worldTime * 12);
    const col = phatEffect === 'sugar' ? [255, 176, 46] : (phatEffect === 'integral' ? [25, 211, 197] : [176, 120, 255]);
    ctx.save();
    const r = player.height * (phatEffect === 'sugar' ? 0.95 : 0.78);
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    g.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${0.42 + pulse * 0.18})`);
    g.addColorStop(1, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${0.55 + pulse * 0.25})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, player.width * 0.62, player.height * 0.58, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '900 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(20, 20, 40, .85)';
    const label = phatEffect === 'sugar' ? 'C₁₂H₂₂O₁₁ · ×2 COIN' : PHAT_EFFECT_NAME[phatEffect];
    ctx.strokeText(label, cx, player.y - 8);
    ctx.fillStyle = `rgb(${col[0]}, ${col[1]}, ${col[2]})`;
    ctx.fillText(label, cx, player.y - 8);
    ctx.restore();
  }
  function drawPhatFx() {
    drawDuongTaoFx();
    if (state === 'running' && phatActiveNow() && phatEffect === 'integral') {
      // Đồ thị hàm số xanh ngọc phía trước, tô diện tích bên dưới bằng các cột Riemann
      const x0 = player.x + player.width * 0.55;
      const x1 = Math.min(width + 10, x0 + 400);
      const fy = (x) => groundY - 30 - 16 * Math.sin((x - worldDistance * 0.9) * 0.03) - 7 * Math.sin(x * 0.012 + worldTime * 2.4);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0, groundY);
      for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, fy(x));
      ctx.lineTo(x1, groundY);
      ctx.closePath();
      const gr = ctx.createLinearGradient(0, groundY - 60, 0, groundY);
      gr.addColorStop(0, 'rgba(25, 211, 197, .34)');
      gr.addColorStop(1, 'rgba(25, 211, 197, .06)');
      ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = 'rgba(25, 211, 197, .35)'; ctx.lineWidth = 1;
      for (let x = x0; x <= x1; x += 14) { ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, fy(x)); ctx.stroke(); }
      ctx.strokeStyle = '#19d3c5'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.shadowColor = '#19d3c5'; ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 6) { if (x === x0) ctx.moveTo(x, fy(x)); else ctx.lineTo(x, fy(x)); }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = '900 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e8fffb';
      ctx.fillText('∫ f(x)dx', x0 + 12, fy(x0 + 12) - 16);
      ctx.restore();
    }
    if (state === 'running' && phatActiveNow() && phatEffect === 'prob') {
      // Công thức xác suất có điều kiện lơ lửng phía trước nhân vật
      const fx = player.x + player.width + 18;
      const fy = player.y - 34 + Math.sin(worldTime * 3) * 5;
      const pulse = 0.5 + 0.5 * Math.sin(worldTime * 6);
      ctx.save();
      ctx.font = '900 17px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = 5;
      const txt = 'P(A|B) = P(A∩B) / P(B) = 0.2';
      ctx.strokeStyle = 'rgba(30, 10, 60, .85)'; ctx.strokeText(txt, fx, fy);
      ctx.shadowColor = '#b078ff'; ctx.shadowBlur = 10 + pulse * 10;
      ctx.fillStyle = '#d9c2ff'; ctx.fillText(txt, fx, fy);
      ctx.restore();
    }
    if (phatFx.length) {
      ctx.save();
      ctx.font = '900 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = 4;
      phatFx.forEach(f => {
        ctx.globalAlpha = clamp(f.life / f.max * 1.4, 0, 1);
        ctx.strokeStyle = 'rgba(15, 25, 40, .85)';
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      });
      ctx.restore();
    }
  }

  function drawQuangBike() {
    const t = quangBikePhase;
    const x = player.x - player.width * 0.24;
    const y = groundY - 37 + Math.sin(t * 0.45) * 1.2;
    const w = player.width * 2.05;
    const wheelR = 13;
    const frontX = x + w * 0.82, rearX = x + w * 0.18;
    const wheelY = y + 27;
    const wheelie = clamp(1 - (elapsedRun - quangStartedAt) / 0.58, 0, 1) * 9;
    ctx.save();
    // Speed streaks and exhaust flames: all cosmetic randomness uses vfxRandom only.
    ctx.globalAlpha = 0.7; ctx.strokeStyle = '#7beaff'; ctx.lineWidth = 2; ctx.shadowColor = '#44dfff'; ctx.shadowBlur = 10;
    for (let i = 0; i < 5; i++) { const yy = y + 7 + i * 7 + Math.sin(t + i) * 2; ctx.beginPath(); ctx.moveTo(x - 26 - vfxRandom(0, 16), yy); ctx.lineTo(x + 5, yy); ctx.stroke(); }
    ctx.shadowBlur = 0;
    // Twin wheels with rotating spokes.
    [rearX, frontX].forEach((wx, i) => {
      const wy = i === 1 ? wheelY - wheelie : wheelY;
      ctx.save(); ctx.translate(wx, wy); ctx.rotate(-t * (i ? 1.18 : 1));
      ctx.fillStyle = '#10151d'; ctx.strokeStyle = '#9aa8b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, wheelR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ff9a28'; ctx.lineWidth = 1.6;
      for (let a = 0; a < 8; a++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, wheelR - 2); ctx.stroke(); }
      ctx.fillStyle = '#ffcf54'; ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
    // Exhaust flame flicker.
    ctx.save(); ctx.translate(rearX - 8, wheelY - 8); ctx.shadowColor = '#25dfff'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#20dfff'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-vfxRandom(20, 38), -vfxRandom(4, 10)); ctx.lineTo(-vfxRandom(14, 30), 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff8b24'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-vfxRandom(14, 24), -3); ctx.lineTo(-vfxRandom(10, 20), 4); ctx.closePath(); ctx.fill(); ctx.restore();
    // Sport-bike chassis, fairing, tank and raised front end.
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#151c28'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(rearX, wheelY); ctx.lineTo(x + w * .42, y + 12); ctx.lineTo(frontX, wheelY - wheelie); ctx.stroke();
    ctx.strokeStyle = '#ff5b22'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(rearX + 2, wheelY - 2); ctx.lineTo(x + w * .48, y + 8); ctx.lineTo(x + w * .7, y + 13 - wheelie * .35); ctx.lineTo(frontX - 2, wheelY - 2 - wheelie); ctx.stroke();
    ctx.fillStyle = '#202b3b'; ctx.beginPath(); ctx.moveTo(x + w * .28, y + 8); ctx.lineTo(x + w * .49, y - 1); ctx.lineTo(x + w * .72, y + 5); ctx.lineTo(x + w * .63, y + 17); ctx.lineTo(x + w * .35, y + 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6a20'; ctx.beginPath(); ctx.moveTo(x + w * .61, y + 7); ctx.lineTo(x + w * .97, y + 2); ctx.lineTo(x + w * .9, y + 15); ctx.lineTo(x + w * .66, y + 19); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe08a'; ctx.shadowColor = '#ffae36'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.ellipse(x + w * .96, y + 8, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // [BÙI BẰNG] xe VF 3 (canvas từ text.txt)
  function drawEvCar() {
    const carH = player.height * 0.78;
    const carW = carH * 1.65;
    const x = player.x - player.width * 0.25;
    const bounce = (state === 'running' && player.onGround) ? Math.sin(worldTime * 26) * 1.2 : 0;
    const y = player.y + player.height - carH + bounce;
  
    const wheelR = carH * 0.21;
    const rearWheelX = x + carW * 0.22;
    const frontWheelX = x + carW * 0.78;
    const wheelY = player.y + player.height - wheelR;
    const spin = state === 'running' ? worldTime * 18 : 0;
  
    ctx.save();
  
    // 1. Vệt gió điện xanh ngọc phía sau đuôi xe
    if (state === 'running') {
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#19d3c5';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        const sy = y + carH * (0.28 + i * 0.22);
        const len = 14 + ((worldTime * 90 + i * 13) % 18);
        ctx.beginPath(); ctx.moveTo(x - 4 - len, sy); ctx.lineTo(x - 2, sy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  
    // 2. Thân xe VF 3 trắng khối hộp
    ctx.fillStyle = '#f7f9fc';
    ctx.strokeStyle = '#cfd6e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + carW * 0.05, y + carH * 0.82);
    ctx.lineTo(x + carW * 0.04, y + carH * 0.44);
    ctx.lineTo(x + carW * 0.11, y + carH * 0.08);
    ctx.quadraticCurveTo(x + carW * 0.12, y, x + carW * 0.18, y);
    ctx.lineTo(x + carW * 0.62, y);
    ctx.quadraticCurveTo(x + carW * 0.67, y, x + carW * 0.69, y + carH * 0.06);
    ctx.lineTo(x + carW * 0.78, y + carH * 0.42);
    ctx.lineTo(x + carW * 0.94, y + carH * 0.46);
    ctx.quadraticCurveTo(x + carW * 0.98, y + carH * 0.48, x + carW * 0.98, y + carH * 0.56);
    ctx.lineTo(x + carW * 0.97, y + carH * 0.82);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  
    // 3. Ô kính khoang sau vát chéo đặc trưng VF 3
    ctx.fillStyle = '#1b222c';
    ctx.beginPath();
    ctx.moveTo(x + carW * 0.14, y + carH * 0.11);
    ctx.lineTo(x + carW * 0.36, y + carH * 0.11);
    ctx.lineTo(x + carW * 0.36, y + carH * 0.41);
    ctx.lineTo(x + carW * 0.21, y + carH * 0.41);
    ctx.closePath(); ctx.fill();
  
    // 4. Khung cửa lái & nửa thân trên Bùi Bằng ngồi trong
    ctx.fillStyle = '#263140';
    ctx.beginPath();
    ctx.moveTo(x + carW * 0.40, y + carH * 0.11);
    ctx.lineTo(x + carW * 0.64, y + carH * 0.11);
    ctx.lineTo(x + carW * 0.73, y + carH * 0.41);
    ctx.lineTo(x + carW * 0.40, y + carH * 0.41);
    ctx.closePath(); ctx.fill();
  
    if (sprite.complete && sprite.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + carW * 0.40, y + carH * 0.11);
      ctx.lineTo(x + carW * 0.64, y + carH * 0.11);
      ctx.lineTo(x + carW * 0.73, y + carH * 0.41);
      ctx.lineTo(x + carW * 0.40, y + carH * 0.41);
      ctx.closePath(); ctx.clip();
      // [BÙI BẰNG] cắt nửa thân trên (0 → 46% chiều cao), giữ đúng tỉ lệ để không méo
      const srcH = sprite.naturalHeight * 0.46;
      const srcW = Math.min(sprite.naturalWidth, srcH * 1.05);
      const srcX = (sprite.naturalWidth - srcW) / 2;
      const winW = carW * 0.33, winH = carH * 0.30;
      const dh = winH * 1.28, dw = dh * (srcW / srcH);
      ctx.drawImage(sprite, srcX, 0, srcW, srcH, x + carW * 0.40 + winW / 2 - dw / 2, y + carH * 0.11 + winH - dh + carH * 0.02, dw, dh);
      ctx.restore();
    }
  
    // 5. Tay nắm cửa & gương chiếu hậu vuông màu đen
    ctx.fillStyle = '#141820';
    roundedRect(x + carW * 0.41, y + carH * 0.47, carW * 0.06, carH * 0.045, 2); ctx.fill();
    roundedRect(x + carW * 0.68, y + carH * 0.34, carW * 0.075, carH * 0.11, 3); ctx.fill();
  
    // 6. Đèn LED trước & đèn hậu đỏ
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#8cecff'; ctx.shadowBlur = 12;
    roundedRect(x + carW * 0.91, y + carH * 0.50, carW * 0.065, carH * 0.08, 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e53935';
    roundedRect(x + carW * 0.04, y + carH * 0.48, carW * 0.035, carH * 0.14, 1.5); ctx.fill();
  
    // 7. Cản nhựa đen nhám & 2 bánh xe 5 chấu
    ctx.fillStyle = '#1c2026';
    ctx.fillRect(x + carW * 0.04, y + carH * 0.76, carW * 0.93, carH * 0.09);
  
    [rearWheelX, frontWheelX].forEach((wx) => {
      ctx.fillStyle = '#1c2026';
      ctx.beginPath(); ctx.arc(wx, wheelY, wheelR * 1.26, Math.PI, 0); ctx.fill();
      ctx.save(); ctx.translate(wx, wheelY); ctx.rotate(spin);
      ctx.fillStyle = '#12151a'; ctx.beginPath(); ctx.arc(0, 0, wheelR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8dee8'; ctx.beginPath(); ctx.arc(0, 0, wheelR * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#262d38'; ctx.lineWidth = 2.2;
      for (let i = 0; i < 5; i++) { ctx.rotate((Math.PI * 2) / 5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, wheelR * 0.58); ctx.stroke(); }
      ctx.fillStyle = '#12151a'; ctx.beginPath(); ctx.arc(0, 0, wheelR * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  
    // 8. Tia sét xanh báo hiệu xe điện
    ctx.fillStyle = '#19d3c5';
    ctx.beginPath();
    ctx.moveTo(x + carW * 0.54, y + carH * 0.53); ctx.lineTo(x + carW * 0.50, y + carH * 0.62);
    ctx.lineTo(x + carW * 0.54, y + carH * 0.62); ctx.lineTo(x + carW * 0.52, y + carH * 0.70);
    ctx.lineTo(x + carW * 0.58, y + carH * 0.60); ctx.lineTo(x + carW * 0.54, y + carH * 0.60);
    ctx.closePath(); ctx.fill();
  
    ctx.restore();
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
    if (skillActive && selectedCharacter === 'tan' && !tanNikaOn('tan')) {
      // NÉM CHỔI: vòng hào quang vàng cam quanh Tân (miễn nhiễm va chạm).
      ctx.save();
      ctx.strokeStyle = `rgba(255, 176, 46, ${0.5 + Math.sin(worldTime * 14) * 0.2})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(player.x + player.width * 0.42, player.y + player.height / 2, player.width * .6, player.height * .58, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (skillActive && isRider() && riderMounted) {
      // Chiến Mã Sấm Sét: hào quang điện vàng quanh ngựa (miễn nhiễm va chạm 100%)
      ctx.save();
      const pulse = Math.sin(worldTime * 16) * 0.2;
      ctx.strokeStyle = `rgba(255, 219, 77, ${0.6 + pulse})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ffe66b';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.ellipse(player.x + player.width / 2, player.y + player.height * 0.5, player.width * 1.2, player.height * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (skillActive && isRider() && riderMounted) {
      // Sét Gầm: tia lửa điện lách tách dọc lưng và chân ngựa.
      ctx.save();
      ctx.strokeStyle = '#ffe14d'; ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 8;
      for (let i = 0; i < 5; i++) {
        if (vfxRandom(0, 1) < 0.4) continue;
        const onBack = i < 3;
        const bx = player.x + player.width * (onBack ? vfxRandom(0.2, 0.8) : vfxRandom(0.15, 0.85));
        const by = onBack ? player.y + player.height * vfxRandom(0.3, 0.42) : player.y + player.height * vfxRandom(0.72, 0.95);
        drawBoltPath(makeZigzag(bx, by, bx + vfxRandom(-12, 12), by + vfxRandom(-14, 14), 4, 4), vfxRandom(0.6, 1), 1.6);
      }
      ctx.restore();
    }
    if (skillActive && selectedCharacter === 'phat') drawPhatAura();
    if (selectedCharacter === 'duyquandoi' && (skillActive || squadGuards > 0)) {
      // CHI VIỆN: khi bật chiêu hiện đủ hai đồng đội; sau chiêu chỉ còn số hộ vệ chưa dùng.
      const cs = squadSprite;
      const cw = cs.naturalWidth && cs.naturalHeight ? player.height * (cs.naturalWidth / cs.naturalHeight) : player.width;
      const frontX = player.x + 48;
      const backX = player.x - 42;
      const showFront = skillActive || squadGuards >= 2;
      const showBack = skillActive || squadGuards >= 1;

      // Hào quang miễn nhiễm chỉ tồn tại trong thời gian Chi viện đang hoạt động.
      if (skillActive) {
        const left = Math.min(backX, player.x);
        const right = Math.max(showFront ? frontX + cw : player.x + player.width, player.x + player.width);
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
      }

      if (cs.complete && cs.naturalWidth > 0) {
        const companions = [];
        if (showBack) companions.push([backX, squadY[1], 1.6]);
        if (showFront) companions.push([frontX, squadY[0], 0]);
        // Cảnh báo nhẹ: đồng đội nhấp nháy khi sắp hết thời gian hộ vệ.
        const guardLeftDraw = squadGuardUntil - elapsedRun;
        const guardBlink = !skillActive && squadGuards > 0 && guardLeftDraw > 0 && guardLeftDraw <= SQUAD_GUARD_WARN_TIME
          ? (Math.sin(worldTime * 18) > 0 ? 1 : 0.35) : 1;
        companions.forEach(([x, y, phaseShift]) => {
          ctx.globalAlpha = guardBlink;
          const grounded = Math.abs(y - player.y) < 1.5 && player.onGround;
          const bob = grounded ? Math.abs(Math.sin(player.runPhase + phaseShift)) * 2 : 0;
          const feetGap = clamp((groundY - (y + player.height)) / 120, 0, 1);
          ctx.fillStyle = `rgba(48, 82, 45, ${0.15 - feetGap * 0.08})`;
          ctx.beginPath(); ctx.ellipse(x + cw * 0.48, groundY + 2, cw * (0.39 - feetGap * 0.12), 4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(cs, x, y + bob, cw, player.height);
          ctx.globalAlpha = 1;
        });
      }
    }
    let tienSquadFront = null;
    const tienTrioOn = selectedCharacter === 'tien' && tienSkinOn('tien');
    if (tienTrioOn) {
      // V20.1: ba anh em luôn chạy cùng nhau; skill chỉ bật hào quang miễn nhiễm.
      const ds = squadSprite;
      const ts = trongSprite;
      const dw = ds.naturalWidth && ds.naturalHeight ? player.height * (ds.naturalWidth / ds.naturalHeight) : player.width;
      const tw = ts.naturalWidth && ts.naturalHeight ? player.height * (ts.naturalWidth / ts.naturalHeight) : player.width;
      const frontX = player.x + 36;
      const backX = player.x - 46;
      const left = Math.min(backX, player.x);
      const right = Math.max(frontX + dw, player.x + player.width);
      if (skillActive) {
        ctx.save();
        const pulse = Math.sin(worldTime * 14) * 0.2;
        ctx.fillStyle = `rgba(74, 160, 220, ${0.10 + pulse * 0.2})`;
        ctx.strokeStyle = `rgba(74, 190, 255, ${0.5 + pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse((left + right) / 2, player.y + player.height / 2, (right - left) / 2 + 14, player.height * 0.68, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      const feetGap = clamp((groundY - (player.y + player.height)) / 120, 0, 1);
      [[backX, tw, 1.6], [frontX, dw, 0]].forEach(([x, w, shift]) => {
        ctx.fillStyle = `rgba(48, 82, 45, ${0.15 - feetGap * 0.08})`;
        ctx.beginPath(); ctx.ellipse(x + w * 0.48, groundY + 2, w * (0.39 - feetGap * 0.12), 4, 0, 0, Math.PI * 2); ctx.fill();
      });
      const bobFor = (shift) => (player.onGround ? Math.abs(Math.sin(player.runPhase + shift)) * 2 : 0);
      if (ts.complete && ts.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(ts, backX, player.y + bobFor(1.6), tw, player.height);
      }
      tienSquadFront = { sprite: ds, x: frontX, w: dw, bob: bobFor(0) };
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
    if (skillActive && selectedCharacter === 'toduy' && !toduyBuddhaOn()) {
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
    if (skillActive && selectedCharacter === 'trieu') {
      const tier = score >= 5000 ? 2 : score >= 3000 ? 1 : 0;
      const scale = tier === 2 ? 1.5 : tier === 1 ? 1.25 : 1;
      const travel = (worldTime % 0.9) / 0.9;
      const tx = player.x + player.width * 0.8 + travel * 330;
      const ty = player.y + player.height * 0.27 - Math.sin(travel * Math.PI) * 20;
      ctx.save();
      ctx.globalAlpha = 1 - travel * 0.55;
      ctx.translate(tx, ty);
      ctx.scale((0.45 + travel * 1.05) * scale, (0.45 + travel * 1.05) * scale);
      ctx.font = '900 23px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.shadowColor = tier === 2 ? '#ff5a16' : tier === 1 ? '#ff9d00' : '#168cff';
      ctx.shadowBlur = tier === 2 ? 20 : 12;
      ctx.strokeStyle = tier === 2 ? '#ffe34d' : tier === 1 ? '#ff7b00' : '#1676d2';
      ctx.lineWidth = 5; ctx.strokeText('VUA LÝ THUYẾT', 0, 0);
      ctx.fillStyle = tier === 2 ? '#ff4b16' : tier === 1 ? '#ffe52e' : '#ffffff';
      ctx.fillText('VUA LÝ THUYẾT', 0, 0);
      ctx.restore();
    }
    if (skillActive && selectedCharacter === 'duongtao') drawDuongTaoWords();
    if (skillActive && selectedCharacter === 'onghai') drawOngHaiPipe();
    if (toduyBuddhaOn() && state === 'running') { drawToDuyAura(skillActive); drawToDuyCloud(false); }   // V26: Vòng Luân Hồi Phật Quang + Cân Đẩu Vân
    const shadowW = player.width * (player.onGround ? 0.78 : 0.55);
    ctx.fillStyle = `rgba(48, 82, 45, ${player.onGround ? .16 : .08})`;
    ctx.beginPath(); ctx.ellipse(player.x + player.width * .48, groundY + 2, shadowW / 2, 4, 0, 0, Math.PI * 2); ctx.fill();

    if (skillActive && selectedCharacter === 'duongtao') {
      drawDuongTaoWheelie();
    } else if (skillActive && selectedCharacter === 'buibang') {   // [BÙI BẰNG]
      drawEvCar();
    } else if (skillActive && selectedCharacter === 'quang') {
      if (sprite.complete && sprite.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sprite, player.x, player.y, player.width, player.height);
      }
      drawQuangBike();
    }
    else if (skillActive && selectedCharacter === 'tan' && tanNikaOn('tan') && tanNikaSprite.complete && tanNikaSprite.naturalWidth > 0) {
      drawTanNikaBody();   // V25: Hóa Thân Nika
    }
    else if (state === 'running' && !skillActive && selectedCharacter === 'tan' && tanNikaOn('tan') && tanAwakened && tanNikaSprite.complete && tanNikaSprite.naturalWidth > 0) {
      // Sau Thức Tỉnh, lúc hồi chiêu: giữ hình Nika nhưng tỉ lệ chuẩn 1.0× (khớp hitbox), không hào quang sét
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const bob = player.onGround ? Math.abs(Math.sin(player.runPhase)) * 2 : 0;
      const w = player.height * (tanNikaSprite.naturalWidth / tanNikaSprite.naturalHeight);   // giữ đúng tỉ lệ ảnh gốc, không bóp ngang
      ctx.drawImage(tanNikaSprite, player.x + player.width / 2 - w / 2, player.y + bob, w, player.height);
    }
    else if (toduyBuddhaOn() && tdSprite.complete && tdSprite.naturalWidth > 0) {
      drawToDuyBuddhaBody();   // V26: Tô Duy Buddha
    }
    else if (activePlayerImage().complete && activePlayerImage().naturalWidth > 0) {
      // The provided transparent cutout is drawn proportionally, never stretched.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const bob = player.onGround && state === 'running' ? Math.abs(Math.sin(player.runPhase)) * 2 : 0;
      if (skillActive && selectedCharacter === 'murat') ctx.filter = 'brightness(1.35) sepia(1) saturate(3) hue-rotate(145deg)';
      const img = activePlayerImage();
      if (isRider() && riderMounted) {
        // Ảnh cưỡi ngựa hơi rộng: giữ tỉ lệ gốc và căn giữa theo hitbox
        const hw = player.height * (img.naturalWidth / img.naturalHeight);
        ctx.drawImage(img, player.x + player.width / 2 - hw / 2, player.y + bob, hw, player.height);
      } else {
        ctx.drawImage(img, player.x, player.y + bob, player.width, player.height);
      }
    } else {
      // Graceful fallback while the image is loading.
      ctx.fillStyle = '#2d794b'; roundedRect(player.x, player.y, player.width, player.height, 10); ctx.fill();
    }
    if (skillActive && selectedCharacter === 'murat') { ctx.filter = 'none'; ctx.restore(); }
    drawTanNikaBuildup(skillActive);   // V25: khói / mây tích tụ khi đang hồi chiêu
    if (toduyBuddhaOn() && state === 'running') drawToDuyCloud(true);   // V26: cụm mây phía trước chân
    if (tienSquadFront && tienSquadFront.sprite.complete && tienSquadFront.sprite.naturalWidth > 0) {
      // Duy chạy phía trước Tiến (vẽ sau để đứng trước mặt)
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(tienSquadFront.sprite, tienSquadFront.x, player.y + tienSquadFront.bob, tienSquadFront.w, player.height);
    }
  }

  // =====================================================================
  // V26 — TÔ DUY BUDDHA: logic kỹ năng + VFX canvas
  // Mọi số ngẫu nhiên dùng Math.random / vfxRandom (không đụng window.gameRand → không lệch seed Solo 1v1).
  // =====================================================================
  function tdResetRun() {
    tdSlashReadyAt = 0; tdSeals = []; tdLayer = 0; tdWasCloud = false; tdGraceUntil = 0;
    tdFx = []; tdRifts = []; tdDragon = null; tdNextBonus = 0; tdNextMult = 1; tdDurLocked = 0; tdCloudA = 0; tdStarTimer = 0;
  }
  const tdSliceable = (o) => !o.destroyedByNinja && o.type !== 'trampoline' && groundPlatform !== o;
  function tdCircleHits(cx, cy, r, o) {
    const nx = Math.max(o.x, Math.min(cx, o.x + o.w)), ny = Math.max(o.y, Math.min(cy, o.y + o.h));
    return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) <= r * r;
  }
  // boss.js (nếu có) có thể đăng ký GameBridge.boss.sliceMissiles({x0,x1,y0,y1}) để chém tên lửa Boss; không có thì bỏ qua.
  function tdBossSlice(x0, x1, y0, y1) {
    try { window.GameBridge?.boss?.sliceMissiles?.({ x0, x1, y0, y1 }); } catch (_) { /* boss.js chưa hỗ trợ */ }
  }
  function tdSliceObstacle(o) {
    if (!tdSliceable(o)) return;
    ninjaSlice(o);   // chém đứt lìa làm đôi theo đường chéo (sliceFX + slashFX có sẵn)
    tdFx.push({ type: 'ring', x: o.x + o.w / 2, y: o.y + o.h / 2, life: 0.45, max: 0.45, rmax: Math.max(64, o.w * 0.95) });
    tanFlash = Math.max(tanFlash, 0.2);   // chớp sáng
  }

  // ---------- Skill 1 — VẠN PHẬT TRẢM KHÔNG ----------
  function tdCastSlash() {
    if (state !== 'running' || !toduyBuddhaOn()) return false;
    if (elapsedRun < tdSlashReadyAt) return false;
    tdSlashReadyAt = elapsedRun + tdSlashCd();
    runSkillCount++; window.LimitedEvent?.onSkillUse?.(runSkillCount);
    const x0 = player.x + player.width * 0.8, y = player.y + player.height * 0.45;
    tdSeals.push({ x0, y, travel: 0, prev: 0 });
    tdFx.push({ type: 'ring', x: x0, y, life: 0.35, max: 0.35, rmax: 70 });
    burst(x0, y, 14, false, '#ffd84a');
    playTone(740, 0.14, 'triangle', 0.045);
    playTone(1180, 0.1, 'sine', 0.03);
    phatPopup('VẠN PHẬT TRẢM KHÔNG', '#ffe27a');
    return true;
  }
  function tdUpdateSeals(dt) {
    tdSeals.forEach(s => {
      s.prev = s.travel;
      s.travel += TD_SLASH_SPEED * dt;
      for (let k = 0; k < 2; k++) {
        tdFx.push({ type: 'ember', x: s.x0 + s.travel - 10, y: s.y + vfxRandom(-14, 14), vx: -vfxRandom(70, 230), vy: vfxRandom(-45, 45), g: 60,
          life: vfxRandom(0.35, 0.75), max: 0.75, size: vfxRandom(2, 4.6), color: Math.random() < 0.5 ? '#ff9d1a' : '#ffd84a' });
      }
    });
    tdSeals = tdSeals.filter(s => s.travel < TD_SLASH_RANGE);
  }

  // ---------- Skill 2 — CÂN ĐẨU VÂN · CHÂN LONG HỘ THỂ ----------
  function tdOrbit(t, cx, cy) {
    return { x: cx + Math.cos(t * 1.55) * 118 + 24, y: Math.max(46, cy - 34 + Math.sin(t * 2.4) * 62) };
  }
  function tdSpawnDragon() {
    const cx = player.x + player.width * 0.5, cy = player.y + player.height * 0.4;
    const o = tdOrbit(0, cx, cy);
    tdDragon = { t: 0, mode: 'escort', timer: 1.2, mt: 0, hx: o.x, hy: o.y, sx: 0, sy: 0, ex: 0, ey: 0, trail: [], body: [], alpha: 0, leaving: false, rift: null, roar: 0 };
    for (let i = 0; i < 40; i++) tdDragon.trail.push({ x: o.x - i * 6, y: o.y + Math.sin(i * 0.4) * 6 });
    tdFx.push({ type: 'ring', x: o.x, y: o.y, life: 0.6, max: 0.6, rmax: 110 });
    playTone(130, 0.4, 'sawtooth', 0.05);
  }
  function tdStartDash(d) {
    d.mode = 'dash'; d.mt = 0; d.roar = 0.6;
    d.sx = d.hx; d.sy = d.hy;
    d.ex = Math.min(width + 40, d.hx + TD_DRAGON_DASH);
    d.ey = clamp(groundY - player.height * (0.45 + Math.random() * 0.25), 60, groundY - 24);
    // Vết Rách Không Gian dọc đường lao (lơ lửng 1,2 giây sau khi rồng lao xong)
    const n = 16, dx = d.ex - d.sx, dy = d.ey - d.sy, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const j = (i === 0 || i === n) ? 0 : vfxRandom(-9, 9);
      pts.push({ x: d.sx + dx * i / n + nx * j, y: d.sy + dy * i / n + ny * j });
    }
    const branches = [];
    for (let b = 0; b < 4; b++) {
      const idx = 2 + Math.floor(Math.random() * (n - 3)), ang = Math.atan2(dy, dx) + (Math.random() < 0.5 ? -1 : 1) * vfxRandom(0.7, 1.3), bl = vfxRandom(22, 52);
      branches.push({ i: idx, x: Math.cos(ang) * bl, y: Math.sin(ang) * bl, mx: Math.cos(ang + 0.5) * bl * 0.55, my: Math.sin(ang + 0.5) * bl * 0.55 });
    }
    d.rift = { pts, branches, nx, ny, dx: 0, reveal: 0, life: TD_RIFT_LIFE, max: TD_RIFT_LIFE };
    tdRifts.push(d.rift);
    tdFx.push({ type: 'ring', x: d.hx, y: d.hy, life: 0.5, max: 0.5, rmax: 130 });
    screenShake = Math.max(screenShake, 0.18);
    tanFlash = Math.max(tanFlash, 0.22);
    playTone(95, 0.45, 'sawtooth', 0.07);   // gầm vang
    playTone(190, 0.3, 'square', 0.035);
    phatPopup('KIM LONG GẦM!', '#ff9d1a', d.hx, d.hy - 30);
  }
  function tdUpdateDragon(dt, cloud) {
    if (cloud && !tdDragon) tdSpawnDragon();
    const d = tdDragon;
    if (!d) return;
    if (!cloud && !d.leaving) { d.leaving = true; tdFx.push({ type: 'ring', x: d.hx, y: d.hy, life: 0.5, max: 0.5, rmax: 90 }); }
    d.t += dt;
    d.roar = Math.max(0, d.roar - dt);
    d.alpha = d.leaving ? Math.max(0, d.alpha - dt * 3) : Math.min(1, d.alpha + dt * 4);
    if (d.leaving && d.alpha <= 0) { tdDragon = null; return; }
    const cx = player.x + player.width * 0.5, cy = player.y + player.height * 0.4;
    const orb = tdOrbit(d.t, cx, cy);
    if (d.mode === 'escort') {
      d.hx = orb.x; d.hy = orb.y;
      d.timer -= dt;
      if (d.timer <= 0 && !d.leaving) tdStartDash(d);
    } else if (d.mode === 'dash') {
      d.mt += dt / 0.42;
      const p = Math.min(1, d.mt), e = 1 - Math.pow(1 - p, 3);
      d.hx = d.sx + (d.ex - d.sx) * e;
      d.hy = d.sy + (d.ey - d.sy) * e + Math.sin(p * Math.PI * 3) * 9;
      if (d.rift) d.rift.reveal = p;
      if (p >= 1) { d.mode = 'back'; d.mt = 0; }
    } else {
      d.mt += dt / 0.5;
      const p = Math.min(1, d.mt), e = p * p * (3 - 2 * p);
      d.hx = d.ex + (orb.x - d.ex) * e;
      d.hy = d.ey + (orb.y - d.ey) * e;
      if (p >= 1) { d.mode = 'escort'; d.timer = TD_DRAGON_INTERVAL - 0.92; }
    }
    // lịch sử đường bay → thân rồng uốn theo
    const last = d.trail[0];
    if (!last || Math.hypot(d.hx - last.x, d.hy - last.y) >= 3) d.trail.unshift({ x: d.hx, y: d.hy });
    let acc = 0;
    for (let i = 1; i < d.trail.length; i++) {
      acc += Math.hypot(d.trail[i].x - d.trail[i - 1].x, d.trail[i].y - d.trail[i - 1].y);
      if (acc > TD_DRAGON_LEN + 40) { d.trail.length = i + 1; break; }
    }
    d.body = tdComputeBody(d);
  }
  function tdComputeBody(d) {
    const N = 26, SP = TD_DRAGON_LEN / (N - 1);
    const pts = [{ x: d.hx, y: d.hy }];
    let prev = { x: d.hx, y: d.hy }, remain = SP;
    for (const q of d.trail) {
      let dx = q.x - prev.x, dy = q.y - prev.y, seg = Math.hypot(dx, dy);
      while (seg >= remain && pts.length < N) {
        const k = remain / seg;
        prev = { x: prev.x + dx * k, y: prev.y + dy * k };
        pts.push(prev);
        dx = q.x - prev.x; dy = q.y - prev.y; seg = Math.hypot(dx, dy); remain = SP;
      }
      remain -= seg; prev = q;
      if (pts.length >= N) break;
    }
    while (pts.length < N) { const l = pts[pts.length - 1]; pts.push({ x: l.x - SP, y: l.y }); }
    const orig = pts.map(p => ({ x: p.x, y: p.y }));
    for (let i = 0; i < N; i++) {
      const a = orig[Math.max(0, i - 1)], b = orig[Math.min(N - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;   // hướng đầu → đuôi
      let nx = -ty, ny = tx; if (ny > 0) { nx = -nx; ny = -ny; }                                  // pháp tuyến hướng lên (sống lưng)
      const amp = 9 * Math.min(1, i / 5) * (1 - 0.35 * i / N);
      const off = Math.sin(i * 0.5 - d.t * 8) * amp;                                              // sóng sin
      pts[i] = { x: orig[i].x + nx * off, y: orig[i].y + ny * off, nx, ny, tx, ty, w: 3 + 13 * Math.pow(1 - i / (N - 1), 0.75) };
    }
    return pts;
  }
  function tdUpdateRifts(dt) {
    tdRifts.forEach(r => {
      if (r.reveal >= 1) r.life -= dt;
      r.dx -= speed * 0.2 * dt;
    });
    tdRifts = tdRifts.filter(r => r.life > 0);
  }

  // Kết thúc Skill 2: đáp đất an toàn + Nội tại LUÂN HỒI NGỘ ĐẠO
  function tdEndCloud() {
    tdGraceUntil = elapsedRun + TD_GRACE;
    tdDurLocked = 0;
    burst(player.x + player.width * 0.5, player.y + player.height, 18, false, '#ffd84a');
    const r = Math.random();   // KHÔNG dùng window.gameRand()
    if (r < 0.70) {
      const cut = Math.round((4 + Math.random() * 2) * 10) / 10;
      nextSkillAt = Math.max(elapsedRun + 2, nextSkillAt - cut);
      phatPopup(`TĨNH TÂM · -${cut}s HỒI CHIÊU`, '#8ff5ff');
      showToast(`☸️ LUÂN HỒI NGỘ ĐẠO — Tĩnh Tâm: giảm ${cut}s hồi chiêu của lần tới!`);
    } else if (r < 0.90) {
      const add = Math.round((3 + Math.random() * 2) * 10) / 10;
      tdNextBonus += add;
      phatPopup(`CHÂN KINH · +${add}s DUY TRÌ`, '#ffe27a');
      showToast(`☸️ LUÂN HỒI NGỘ ĐẠO — Chân Kinh: +${add}s duy trì cho lần bật chiêu kế tiếp!`);
    } else {
      tdNextMult = 1.5;
      phatPopup('ĐẠI GIÁC NGỘ · ×1.5 DUY TRÌ', '#ff9dfc');
      showToast('☸️ LUÂN HỒI NGỘ ĐẠO — ĐẠI GIÁC NGỘ: thời lượng duy trì lần tới ×1,5!');
    }
    playTone(523, 0.18, 'triangle', 0.04);
    playTone(784, 0.22, 'sine', 0.03);
  }

  // Bước cập nhật chính (gọi trong update(), ngay sau onghaiStep)
  function updateToDuyBuddha(dt, skillActive) {
    if (!toduyBuddhaOn() || state !== 'running') { if (tdDragon && !toduyBuddhaOn()) tdDragon = null; return; }
    const cloud = !!skillActive;
    if (cloud && !tdWasCloud) tdLayer = 0;
    if (!cloud && tdWasCloud) tdEndCloud();
    tdWasCloud = cloud;
    tdCloudA += ((cloud ? 1 : 0) - tdCloudA) * Math.min(1, dt * (cloud ? 10 : 6));
    if (tdCloudA < 0.01) tdCloudA = 0;

    if (cloud) {
      // bay 2 tầng: Thấp (cách đất 25px) ⇄ Cao (groundY - height*1.65), lướt mượt
      const lowY = groundY - player.height - TD_LAYER_GAP;
      const highY = groundY - player.height * 1.65;
      const target = (tdLayer ? highY : lowY) + Math.sin(worldTime * 3.2) * 3;
      player.y += (target - player.y) * Math.min(1, dt * 9);
      player.velocityY = 0; player.onGround = false; groundPlatform = null;
      tdStarTimer -= dt;
      while (tdStarTimer <= 0) {
        tdStarTimer += 0.022;
        tdFx.push({ type: 'star', x: player.x + player.width * 0.5 - vfxRandom(0, 50), y: player.y + player.height + vfxRandom(-4, 12),
          vx: -(speed * 0.55 + vfxRandom(70, 230)), vy: vfxRandom(-28, 28), g: 12, life: vfxRandom(0.55, 1.1), max: 1.1, size: vfxRandom(1.6, 4.2), color: Math.random() < 0.35 ? '#ffffff' : '#ffe27a' });
      }
    }
    if (tdGraceNow()) {   // 0,8s đáp đất an toàn: xóa vật cản + lấp hố ngay dưới chân
      obstacles.forEach(o => {
        if (!o.ghostCleared && o.x < player.x + player.width + 30 && o.x + o.w > player.x - 14 && o.y + o.h > player.y - 8) {
          o.ghostCleared = true;
          burst(o.x + o.w / 2, o.y + o.h / 2, 8, false, '#ffd84a');
        }
      });
      waterPits.forEach(pit => { if (!pit.filled && pit.x < player.x + player.width + 40 && pit.x + pit.w > player.x - 20) pit.filled = true; });
    }

    tdUpdateSeals(dt);
    tdUpdateDragon(dt, cloud);
    tdUpdateRifts(dt);

    // ---- Va chạm chém: Ấn Ký, Kim Long, Vết Rách Không Gian ----
    const list = obstacles.filter(tdSliceable);
    if (list.length) {
      tdSeals.forEach(s => {
        const xf = s.x0 + s.travel + 30, xb = s.x0 + s.prev - 24;
        list.forEach(o => { if (o.x < xf && o.x + o.w > xb) tdSliceObstacle(o); });
      });
      const d = tdDragon;
      if (d && d.alpha > 0.3 && d.body.length) {
        d.body.forEach((p, i) => {
          if (i > 0 && i % 2) return;
          const r = i === 0 ? 38 : 16;
          list.forEach(o => { if (tdCircleHits(p.x, p.y, r, o)) tdSliceObstacle(o); });
        });
      }
      tdRifts.forEach(rf => {
        if (rf.reveal <= 0) return;
        const nv = Math.max(2, Math.floor(rf.reveal * (rf.pts.length - 1)) + 1);
        for (let i = 0; i < nv - 1; i++) {
          for (let k = 0; k < 3; k++) {
            const px = rf.pts[i].x + (rf.pts[i + 1].x - rf.pts[i].x) * k / 3 + rf.dx;
            const py = rf.pts[i].y + (rf.pts[i + 1].y - rf.pts[i].y) * k / 3;
            list.forEach(o => { if (tdCircleHits(px, py, 30, o)) tdSliceObstacle(o); });
          }
        }
      });
    }
    // Tên lửa Boss (nếu boss.js hỗ trợ)
    tdSeals.forEach(s => tdBossSlice(s.x0 + s.prev - 24, s.x0 + s.travel + 30, 0, groundY));
    if (tdDragon && tdDragon.alpha > 0.3) {
      const d = tdDragon;
      tdBossSlice(d.hx - 60, d.hx + 60, d.hy - 60, d.hy + 60);
    }
    tdRifts.forEach(rf => {
      if (rf.reveal <= 0) return;
      const xs = rf.pts.map(p => p.x + rf.dx), ys = rf.pts.map(p => p.y);
      tdBossSlice(Math.min(...xs) - 30, Math.max(...xs) + 30, Math.min(...ys) - 40, Math.max(...ys) + 40);
    });
  }
  function updateToDuyFx(dt) {
    if (!tdFx.length) return;
    const sc = state === 'running' ? speed : 0;
    tdFx.forEach(f => {
      f.life -= dt;
      if (f.type === 'ring') f.x -= sc * dt * 0.9;
      else { f.x += f.vx * dt; f.y += f.vy * dt; if (f.g) f.vy += f.g * dt; }
    });
    tdFx = tdFx.filter(f => f.life > 0);
    if (tdFx.length > 240) tdFx.splice(0, tdFx.length - 240);
  }

  // =====================================================================
  //  VFX — VẼ CANVAS
  // =====================================================================
  // Vòng Luân Hồi Phật Quang sau lưng Tô Duy: 2 vòng đồng tâm vàng kim xoay ngược chiều + tia hào quang + ký tự cổ bay lơ lửng
  function drawToDuyAura(active) {
    const a = active ? 1 : 0.28, t = worldTime;
    const cx = player.x + player.width * 0.5, cy = player.y + player.height * 0.46;
    const R = Math.max(54, player.height * 0.82) * (active ? 1 : 0.8);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.35);
    g.addColorStop(0, 'rgba(255,236,150,.42)'); g.addColorStop(0.6, 'rgba(255,200,60,.16)'); g.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, Math.PI * 2); ctx.fill();
    // tia hào quang
    ctx.save();
    ctx.rotate(t * 0.4);
    ctx.lineCap = 'round';
    for (let i = 0; i < 20; i++) {
      const ang = i * Math.PI * 2 / 20, long = i % 2 === 0;
      const r0 = R * 0.84, r1 = R * (long ? 1.3 : 1.12) + Math.sin(t * 5 + i) * 4;
      const lg = ctx.createLinearGradient(Math.cos(ang) * r0, Math.sin(ang) * r0, Math.cos(ang) * r1, Math.sin(ang) * r1);
      lg.addColorStop(0, 'rgba(255,240,170,.85)'); lg.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.strokeStyle = lg; ctx.lineWidth = long ? 3 : 1.6;
      ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1); ctx.stroke();
    }
    ctx.restore();
    // 2 vòng đồng tâm xoay ngược chiều
    ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 16;
    ctx.strokeStyle = '#ffd84a';
    ctx.save(); ctx.rotate(t * 0.9); ctx.lineWidth = 3; ctx.setLineDash([16, 6, 3, 6]);
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.rotate(-t * 1.3); ctx.lineWidth = 2.2; ctx.setLineDash([5, 8]);
    ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.setLineDash([]);
    if (active) {
      // vòng tâm: 8 điểm sáng + ký tự cổ bay lơ lửng
      ctx.save(); ctx.rotate(-t * 0.6);
      for (let i = 0; i < 8; i++) {
        const ang = i * Math.PI / 4;
        ctx.fillStyle = '#fff6c4';
        ctx.beginPath(); ctx.arc(Math.cos(ang) * R * 0.78, Math.sin(ang) * R * 0.78, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      const glyphs = ['卍', '空', '破', '卍', '空', '破'];
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      glyphs.forEach((ch, i) => {
        const ang = t * 0.7 + i * Math.PI / 3, rr = R * 1.02 + Math.sin(t * 2 + i) * 9;
        ctx.globalAlpha = a * (0.65 + 0.35 * Math.sin(t * 3 + i * 1.7));
        ctx.font = `900 ${14 + (i % 3) * 3}px ${TD_FONT}`;
        ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#fff2b0';
        ctx.fillText(ch, Math.cos(ang) * rr, Math.sin(ang) * rr * 0.92 + Math.sin(t * 2.5 + i) * 5);
      });
    }
    ctx.restore();
  }

  // Cân Đẩu Vân: nhiều cụm elip chồng lớp, viền ánh kim
  const TD_PUFFS = [[-0.42, 0.05, 0.2, 0.15], [-0.22, -0.03, 0.24, 0.19], [0, -0.07, 0.28, 0.23], [0.24, -0.01, 0.24, 0.19], [0.44, 0.06, 0.2, 0.15], [0.08, 0.09, 0.34, 0.14], [-0.2, 0.1, 0.3, 0.13]];
  function drawToDuyCloud(front) {
    if (tdCloudA <= 0.02) return;
    const W = Math.max(player.width * 2.4, 96) * (0.6 + 0.4 * tdCloudA), t = worldTime;
    const cx = player.x + player.width * 0.5, cy = player.y + player.height + 3;
    ctx.save();
    ctx.globalAlpha = clamp(tdCloudA, 0, 1);
    ctx.translate(cx, cy);
    ctx.lineJoin = 'round';
    if (!front) {
      // đuôi mây trôi ngược về sau
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = tdCloudA * (0.5 - i * 0.1);
        ctx.fillStyle = '#ffe9a6';
        ctx.beginPath(); ctx.ellipse(-W * 0.5 - i * 15, 4 + Math.sin(t * 4 + i) * 3, W * (0.14 - i * 0.02), W * (0.07 - i * 0.01), 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = clamp(tdCloudA, 0, 1);
    }
    const puffs = front ? [TD_PUFFS[1], TD_PUFFS[5], TD_PUFFS[3]] : TD_PUFFS;
    puffs.forEach((p, i) => {
      const px = p[0] * W, py = p[1] * W + 6 + Math.sin(t * 3 + i * 1.3) * 2 + (front ? 4 : 0), rx = p[2] * W, ry = p[3] * W;
      const g = ctx.createRadialGradient(px - rx * 0.2, py - ry * 0.4, 1, px, py, rx);
      if (front) { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#fff0b8'); } else { g.addColorStop(0, '#fffbe8'); g.addColorStop(0.65, '#ffe9a6'); g.addColorStop(1, '#f6c445'); }
      ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = front ? 6 : 12;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,196,40,.9)'; ctx.lineWidth = 1.5;   // viền ánh kim
      ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    });
    ctx.restore();
  }

  // Vẽ Kim Long Phương Đông bằng Path/Bezier
  function tdFlame(x, y, tx, ty, w, color, bend = 0) {
    const dx = tx - x, dy = ty - y, len = Math.hypot(dx, dy) || 1, px = -dy / len * w / 2, py = dx / len * w / 2, bx = -dy / len * bend, by = dx / len * bend;
    ctx.beginPath();
    ctx.moveTo(x + px, y + py);
    ctx.quadraticCurveTo(x + px * 0.9 + dx * 0.55 + bx, y + py * 0.9 + dy * 0.55 + by, tx, ty);
    ctx.quadraticCurveTo(x - px * 0.9 + dx * 0.5 + bx, y - py * 0.9 + dy * 0.5 + by, x - px, y - py);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
  }
  function tdDrawDragonHead(x, y, ang, t, dashing) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    if (Math.cos(ang) < 0) ctx.scale(1, -1);
    ctx.scale(1.08, 1.08);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const wob = Math.sin(t * 6) * 8, open = 0.34 + 0.16 * Math.sin(t * 5) + (dashing ? 0.22 : 0);
    // 2 sợi râu rồng dài uốn lượn bay về sau
    ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 6;
    ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(38, 0); ctx.bezierCurveTo(54, 12 + wob * 0.4, 18, 30 + wob, -48, 16 + wob * 1.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(35, 2); ctx.bezierCurveTo(48, 22 - wob * 0.4, 8, 44 - wob, -64, 34 - wob * 1.2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-48, 16 + wob * 1.4, 2.2, 0, Math.PI * 2); ctx.arc(-64, 34 - wob * 1.2, 2.2, 0, Math.PI * 2); ctx.fill();
    // cặp sừng hươu phân nhánh vàng kim (sừng sau mờ hơn)
    const horn = (alpha, colA, colB, lw) => {
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = colA; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(-4, -15); ctx.bezierCurveTo(-12, -28, -26, -34, -44, -31); ctx.stroke();
      ctx.lineWidth = lw * 0.75;
      ctx.beginPath(); ctx.moveTo(-14, -27); ctx.quadraticCurveTo(-18, -34, -14, -42); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-28, -32); ctx.quadraticCurveTo(-31, -39, -35, -46); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-44, -31); ctx.quadraticCurveTo(-50, -34, -53, -25); ctx.stroke();
      ctx.strokeStyle = colB; ctx.lineWidth = lw * 0.35;
      ctx.beginPath(); ctx.moveTo(-5, -16); ctx.bezierCurveTo(-12, -28, -26, -33, -43, -31); ctx.stroke();
      ctx.globalAlpha /= alpha;
    };
    ctx.save(); ctx.translate(-3, 5); ctx.scale(0.86, 0.86); horn(0.8, '#c88a00', '#ffd84a', 4); ctx.restore();
    horn(1, '#ffcf2e', '#fff6c0', 4.4);
    ctx.shadowBlur = 0;
    // bờm lửa ở gáy
    [[-26, -10, -42, -24, 11, '#ff7b00'], [-20, -14, -36, -30, 12, '#ffb300'], [-13, -17, -26, -34, 10, '#ff5a00'], [-6, -18, -14, -35, 8, '#ffd84a']].forEach(f => {
      tdFlame(f[0], f[1], f[2] + Math.sin(t * 12 + f[0]) * 3, f[3] + Math.cos(t * 11 + f[0]) * 2, f[4], f[5], 4);
    });
    // vây má
    ctx.fillStyle = '#ff7b00';
    ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-36, 10); ctx.lineTo(-30, 0); ctx.lineTo(-38, -6); ctx.lineTo(-20, -4); ctx.closePath(); ctx.fill();
    // hàm dưới (mở rộng ngoạm xé không gian) + khoang miệng
    const hx = -8, hy = 5, c = Math.cos(open), s = Math.sin(open);
    const jt = { x: hx + 54 * c - 3 * s, y: hy + 54 * s + 3 * c };
    ctx.fillStyle = '#4d0505';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(44, 3); ctx.lineTo(jt.x, jt.y); ctx.closePath(); ctx.fill();
    const mg = ctx.createRadialGradient(24, 11, 1, 24, 11, 22);
    mg.addColorStop(0, 'rgba(255,170,40,.95)'); mg.addColorStop(1, 'rgba(255,90,0,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(44, 3); ctx.lineTo(jt.x, jt.y); ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(open); ctx.translate(-hx, -hy);
    const jg = ctx.createLinearGradient(-8, 0, 48, 0); jg.addColorStop(0, '#ff7b00'); jg.addColorStop(1, '#ffb52e');
    ctx.fillStyle = jg; ctx.strokeStyle = 'rgba(110,20,0,.8)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-8, 5); ctx.bezierCurveTo(8, 13, 28, 14, 46, 8); ctx.quadraticCurveTo(49, 5, 43, 3); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff7dd';
    [14, 22, 30, 38].forEach(px => { ctx.beginPath(); ctx.moveTo(px - 2, 6.5); ctx.lineTo(px + 2, 6.5); ctx.lineTo(px, 0.5); ctx.closePath(); ctx.fill(); });
    tdFlame(8, 10, -8, 22 + Math.sin(t * 9) * 2, 7, '#ffdf70', 2);   // chùm râu cằm
    ctx.restore();
    // sọ + mõm
    const sg = ctx.createLinearGradient(-26, 0, 52, 0);
    sg.addColorStop(0, '#ffe866'); sg.addColorStop(0.55, '#ffa31a'); sg.addColorStop(1, '#e03a10');
    ctx.fillStyle = sg; ctx.strokeStyle = 'rgba(110,20,0,.85)'; ctx.lineWidth = 1.6;
    ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-26, -12);
    ctx.bezierCurveTo(-12, -24, 10, -22, 28, -13);
    ctx.quadraticCurveTo(42, -11, 52, -5);
    ctx.quadraticCurveTo(54, -1, 46, 1);
    ctx.lineTo(30, 2);
    ctx.quadraticCurveTo(10, 5, -10, 6);
    ctx.lineTo(-26, 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff7dd';
    [14, 22, 30, 38].forEach(px => { ctx.beginPath(); ctx.moveTo(px - 2.2, 2.2); ctx.lineTo(px + 2.2, 2.2); ctx.lineTo(px, 8.2); ctx.closePath(); ctx.fill(); });
    // lông mày + lỗ mũi
    ctx.strokeStyle = '#a31500'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(3, -14); ctx.quadraticCurveTo(14, -18, 25, -11); ctx.stroke();
    ctx.fillStyle = '#7a1500'; ctx.beginPath(); ctx.arc(46, -4, 1.7, 0, Math.PI * 2); ctx.fill();
    if (dashing) tdFlame(50, -4, 66, -9 + Math.sin(t * 20) * 3, 7, 'rgba(255,200,60,.9)', 2);
    // đôi mắt rực sáng đỏ/trắng + vệt sáng kéo dài
    const trailLen = dashing ? 92 : 38;
    const eg = ctx.createLinearGradient(14, 0, 14 - trailLen, 0);
    eg.addColorStop(0, 'rgba(255,80,60,.95)'); eg.addColorStop(1, 'rgba(255,80,60,0)');
    ctx.strokeStyle = eg; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(14, -9); ctx.lineTo(14 - trailLen, -14); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(14, -8); ctx.lineTo(14 - trailLen * 0.7, -11); ctx.stroke();
    ctx.save();
    ctx.translate(14, -9); ctx.rotate(-0.38);
    ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.ellipse(0, 0, 6.4, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(1, 0, 3.4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a0000'; ctx.beginPath(); ctx.ellipse(1.6, 0, 0.9, 2.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  function drawToDuyDragon() {
    const d = tdDragon;
    if (!d || !d.body || d.body.length < 4) return;
    const body = d.body, n = body.length, t = worldTime;
    ctx.save();
    ctx.globalAlpha = clamp(d.alpha, 0, 1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // bờm lửa bay ngược dọc sống lưng
    for (let i = 2; i < n - 1; i += 2) {
      const p = body[i], sz = (1 - i / n) * 16 + 7 + Math.sin(t * 14 + i) * 3;
      const bx = p.x + p.nx * p.w, by = p.y + p.ny * p.w;
      tdFlame(bx, by, bx + p.nx * sz * 0.55 + p.tx * sz * 1.5, by + p.ny * sz * 0.55 + p.ty * sz * 1.5, 7, i % 4 === 0 ? '#ffb300' : '#ff5a00', 3);
    }
    // chân vuốt (2 đôi, phía bụng)
    [7, 16].forEach(i => {
      const p = body[i];
      [-5, 5].forEach(off => {
        const sx = p.x + p.tx * off, sy = p.y + p.ty * off;
        const ex = sx - p.nx * (p.w + 13) + p.tx * 5, ey = sy - p.ny * (p.w + 13) + p.ty * 5;
        ctx.strokeStyle = '#ffb300'; ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + ex) / 2 + p.tx * 6, (sy + ey) / 2 + p.ty * 6, ex, ey); ctx.stroke();
        ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 1.6;
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - p.nx * 5 + p.tx * k * 4, ey - p.ny * 5 + p.ty * k * 4); ctx.stroke(); }
      });
    });
    // thân: gradient vàng rực → cam lửa → đỏ thẫm
    const L = body.map(p => ({ x: p.x + p.nx * p.w, y: p.y + p.ny * p.w })), R = body.map(p => ({ x: p.x - p.nx * p.w, y: p.y - p.ny * p.w }));
    ctx.beginPath();
    ctx.moveTo(L[0].x, L[0].y);
    for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(L[i].x, L[i].y, (L[i].x + L[i + 1].x) / 2, (L[i].y + L[i + 1].y) / 2);
    ctx.lineTo(L[n - 1].x, L[n - 1].y);
    ctx.lineTo(R[n - 1].x, R[n - 1].y);
    for (let i = n - 2; i > 0; i--) ctx.quadraticCurveTo(R[i].x, R[i].y, (R[i].x + R[i - 1].x) / 2, (R[i].y + R[i - 1].y) / 2);
    ctx.lineTo(R[0].x, R[0].y);
    ctx.closePath();
    const bg = ctx.createLinearGradient(body[0].x, body[0].y, body[n - 1].x, body[n - 1].y);
    bg.addColorStop(0, '#ffe866'); bg.addColorStop(0.5, '#ff7b00'); bg.addColorStop(1, '#d92626');
    ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 14;
    ctx.fillStyle = bg; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(120,20,0,.65)'; ctx.lineWidth = 1.6; ctx.stroke();
    // bụng sáng (vảy bụng)
    ctx.strokeStyle = 'rgba(255,248,200,.55)'; ctx.lineWidth = 2.4; ctx.setLineDash([3, 4]);
    ctx.beginPath(); body.forEach((p, i) => { const x = p.x - p.nx * p.w * 0.5, y = p.y - p.ny * p.w * 0.5; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    ctx.setLineDash([]);
    // vảy rồng lấp lánh
    for (let i = 1; i < n - 1; i++) {
      const p = body[i], a = Math.atan2(p.ty, p.tx);
      ctx.strokeStyle = 'rgba(255,236,140,.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(p.x - p.tx * p.w * 0.5, p.y - p.ty * p.w * 0.5, p.w * 0.95, a - 0.9, a + 0.9); ctx.stroke();
      if (Math.sin(t * 9 + i * 1.7) > 0.7) {
        ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x + p.nx * p.w * 0.35, p.y + p.ny * p.w * 0.35, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
    }
    // chùm lửa đuôi
    const tl = body[n - 1];
    [[-8, '#d92626'], [0, '#ff7b00'], [8, '#ffb300']].forEach(([o, col], k) => tdFlame(tl.x, tl.y, tl.x + tl.tx * (20 + k * 4) + tl.nx * o * 0.8, tl.y + tl.ty * (20 + k * 4) + tl.ny * o * 0.8, 6, col, 3));
    // đầu rồng uy nghi
    const h0 = body[0], h2 = body[2];
    tdDrawDragonHead(h0.x, h0.y, Math.atan2(h0.y - h2.y, h0.x - h2.x), t, d.mode === 'dash' || d.roar > 0);
    ctx.restore();
  }

  // Vết Rách Không Gian: lõi trắng, viền tím sẫm + đỏ huyết nguyệt, tia sét vàng lách tách
  function drawToDuyRift() {
    if (!tdRifts.length) return;
    tdRifts.forEach(r => {
      if (r.reveal <= 0) return;
      const nv = Math.max(2, Math.floor(r.reveal * (r.pts.length - 1)) + 1);
      const fade = clamp(r.life / 0.35, 0, 1);
      const P = r.pts.slice(0, nv).map(p => ({ x: p.x + r.dx, y: p.y }));
      const last = r.pts.length - 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const line = () => { ctx.beginPath(); P.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); };
      // vầng tím sẫm ngoài cùng
      ctx.shadowColor = '#8a2be2'; ctx.shadowBlur = 24;
      ctx.strokeStyle = 'rgba(70,12,120,.45)'; ctx.lineWidth = 20; line(); ctx.stroke();
      // lỗ hổng hình thấu kính (phần không gian bị xé)
      ctx.shadowBlur = 0;
      const wAt = (i) => Math.sin(Math.PI * i / last) * 13 * (0.75 + 0.25 * Math.sin(worldTime * 12 + i));
      const A = [], B = [];
      P.forEach((p, i) => { const w = wAt(i); A.push({ x: p.x + r.nx * w, y: p.y + r.ny * w }); B.push({ x: p.x - r.nx * w, y: p.y - r.ny * w }); });
      ctx.beginPath(); A.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
      for (let i = B.length - 1; i >= 0; i--) ctx.lineTo(B[i].x, B[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(16,0,30,.9)'; ctx.fill();
      // viền đỏ huyết nguyệt
      ctx.shadowColor = '#ff2850'; ctx.shadowBlur = 14;
      ctx.strokeStyle = '#d4163c'; ctx.lineWidth = 2.6;
      ctx.beginPath(); A.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
      ctx.beginPath(); B.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
      // vết nứt phụ
      ctx.strokeStyle = '#7a1fd1'; ctx.lineWidth = 1.8;
      r.branches.forEach(b => {
        if (b.i >= nv) return;
        const o = P[b.i];
        ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.quadraticCurveTo(o.x + b.mx, o.y + b.my, o.x + b.x, o.y + b.y); ctx.stroke();
      });
      // lõi trắng tinh khiết
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.2; line(); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; line(); ctx.stroke();
      // tia sét vàng lách tách dọc vết rách
      ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 8;
      ctx.strokeStyle = '#ffe34d'; ctx.lineWidth = 1.7;
      for (let k = 0; k < 4; k++) {
        if (Math.random() < 0.35) continue;
        const o = P[Math.floor(Math.random() * P.length)];
        let x = o.x, y = o.y;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let s = 0; s < 4; s++) { x += vfxRandom(-14, 14); y += vfxRandom(-16, 16); ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  // Ấn Ký Phật Quang: vòng Kim Cang xoay tốc độ cao + hoa sen 8 cánh + 卍
  function drawToDuySeals() {
    tdSeals.forEach(s => {
      const x = s.x0 + s.travel, y = s.y, t = worldTime, life = 1 - s.travel / TD_SLASH_RANGE;
      ctx.save();
      ctx.globalAlpha = clamp(life * 4, 0, 1);
      ctx.translate(x, y);
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 44);
      g.addColorStop(0, 'rgba(255,245,190,.85)'); g.addColorStop(0.5, 'rgba(255,190,50,.35)'); g.addColorStop(1, 'rgba(255,140,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 16;
      // vòng Kim Cang xoay tốc độ cao
      ctx.strokeStyle = '#ffd84a';
      ctx.save(); ctx.rotate(t * 18); ctx.lineWidth = 3; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.rotate(-t * 24); ctx.lineWidth = 2; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.setLineDash([]);
      // hoa sen 8 cánh
      ctx.save(); ctx.rotate(t * 5);
      for (let k = 0; k < 8; k++) {
        ctx.save(); ctx.rotate(k * Math.PI / 4);
        ctx.fillStyle = 'rgba(255,240,170,.92)'; ctx.strokeStyle = '#ff9d00'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(0, -13, 4.4, 9.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      ctx.fillStyle = '#fff6c4'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 18px ${TD_FONT}`;
      ctx.lineWidth = 3; ctx.strokeStyle = '#ff7b00'; ctx.strokeText('卍', 0, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillText('卍', 0, 1);
      ctx.restore();
    });
  }
  // Bụi sao vàng, tàn lửa, sóng xung kích
  function drawToDuyFx() {
    if (!tdFx.length) return;
    ctx.save();
    tdFx.forEach(f => {
      const p = clamp(f.life / f.max, 0, 1);
      if (f.type === 'ring') {
        const e = 1 - p, r = f.rmax * (1 - Math.pow(1 - e, 2));
        ctx.globalAlpha = p;
        ctx.strokeStyle = 'rgba(255,230,140,1)'; ctx.lineWidth = 4 * p + 1;
        ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.82, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (f.type === 'star') {
        ctx.globalAlpha = p; ctx.fillStyle = f.color; ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 6;
        const s = f.size * (0.5 + p * 0.7);
        ctx.beginPath(); ctx.moveTo(f.x, f.y - s * 1.6); ctx.lineTo(f.x + s * 0.45, f.y - s * 0.45); ctx.lineTo(f.x + s * 1.6, f.y); ctx.lineTo(f.x + s * 0.45, f.y + s * 0.45);
        ctx.lineTo(f.x, f.y + s * 1.6); ctx.lineTo(f.x - s * 0.45, f.y + s * 0.45); ctx.lineTo(f.x - s * 1.6, f.y); ctx.lineTo(f.x - s * 0.45, f.y - s * 0.45); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.globalAlpha = p * 0.9; ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.size * (0.4 + p * 0.6), 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.restore();
  }
  function drawToDuyFront() {
    if (state === 'running' && toduyBuddhaOn()) { drawToDuyDragon(); drawToDuySeals(); }
    drawToDuyFx();
  }
  // Thân Tô Duy Buddha (dáng đứng quay lưng, giữ tỉ lệ ảnh gốc, tựa vào chân)
  function drawToDuyBuddhaBody() {
    const ratio = tdSprite.naturalWidth / tdSprite.naturalHeight;
    const h = player.height * 1.04, w = h * ratio;
    const cloud = tdCloudA > 0.5;
    const bob = cloud ? Math.sin(worldTime * 3.2) * 1.5 : (player.onGround && state === 'running' ? Math.abs(Math.sin(player.runPhase)) * 2 : 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.translate(player.x + player.width / 2, player.y + player.height + bob);
    ctx.rotate(cloud ? Math.sin(worldTime * 2.2) * 0.025 : 0);
    if (cloud) { ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 14; }
    ctx.drawImage(tdSprite, -w / 2, -h, w, h);
    ctx.restore();
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
      playTone(vfxRandom(900, 1300), 0.06, 'sawtooth', 0.025);
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
    if (!(selectedCharacter === 'trong' || selectedCharacter === 'tien' || isRider()) || state !== 'running') return;
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
    if (active && selectedCharacter === 'trong') {
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

  const skillNames = { duy: 'HÀNH QUÂN', trong: 'SẤM SÉT', murat: 'LƯỚT LƯỚT', toduy: 'NINJA', duyquandoi: 'CHI VIỆN', trieu: 'VUA LÝ THUYẾT', tan: 'NÉM CHỔI', phat: 'TÍCH NỘ', onghai: 'LÀO THỦ TU TIÊN', quang: 'GOD RIDER', buibang: 'VF 3', duongtao: 'BỐC ĐẦU', trongriding: 'SÉT GẦM' };
  let skillCache = { label: '', pct: -1, active: null, city: null, phatBtn: null, buttonText: '', buttonIcon: '', btnDim: null };
  const phatBtn = $('phatBtn');
  // Nút kích hoạt Tích Nộ Quyền: chặn nổi bọt để bấm không bị tính là cú nhảy.
  ['pointerdown', 'touchstart', 'mousedown', 'click'].forEach((type) => {
    phatBtn.addEventListener(type, (event) => {
      event.stopPropagation();
      if (type === 'pointerdown' || type === 'touchstart') {
        event.preventDefault();
        if (selectedCharacter === 'buibang') bbToggle(); else if (selectedCharacter === 'quang') activateQuangSkill(); else if (selectedCharacter === 'duongtao') activateDuongTaoPunch(); else if (toduyBuddhaOn()) tdCastSlash(); else phatActivate(false);
      }
    }, { passive: false });
  });
  function updateSkillHud() {
    const name = selectedCharacter === 'tien' ? charSkillName('tien') : (toduyBuddhaOn() ? 'CÂN ĐẨU VÂN' : (selectedCharacter === 'tan' && tanNikaOn('tan') ? 'THỨC TỈNH NIKA' : (skillNames[selectedCharacter] || 'KỸ NĂNG')));
    let label = name;
    let pct = 0;
    let active = false;
    if (selectedCharacter === 'buibang') {   // [BÙI BẰNG] HUD pin VF 3
      const maxPin = bbMaxPin();
      const pinTxt = `PIN: ${Math.ceil(clamp(bbPin, 0, maxPin))}/${maxPin}`;
      pct = state === 'running' ? (bbOverloaded() ? (1 - (bbOverloadUntil - elapsedRun) / Math.max(0.1, bbOverloadLen)) * 100 : bbPin / maxPin * 100) : 100;
      if (state !== 'running') label = `${pinTxt} · SẴN SÀNG`;
      else if (bbDriving && bbPin <= 15) { active = true; label = `${pinTxt} · ⚠️ PIN YẾU · XUỐNG XE`; }
      else if (bbDriving) { active = true; label = `${pinTxt} · ĐANG LÁI`; }
      else if (bbOverloaded()) label = `${pinTxt} · QUÁ TẢI · ${Math.ceil(Math.max(0, bbOverloadUntil - elapsedRun))}s`;
      else label = `${pinTxt} · SẴN SÀNG`;
    } else if (selectedCharacter === 'quang') {
      if (quangActiveNow()) {
        const remaining = Math.max(0, skillActiveUntil - elapsedRun);
        active = true; pct = remaining / skillDuration() * 100;
        label = `GOD RIDER · ${remaining.toFixed(1)}s`;
      } else if (state === 'running') {
        const rc = Math.max(0, nextSkillAt - elapsedRun);
        pct = (1 - rc / Math.max(1, skillInterval())) * 100;
        label = rc <= 0 ? 'GOD RIDER · SẴN SÀNG' : `GOD RIDER · HỒI ${Math.ceil(rc)}s`;
      } else label = `GOD RIDER · ${skillInterval()}s`;
    } else if (selectedCharacter === 'phat') {
      // Phát: thanh Nộ (nạp theo hành động, không chạy theo thời gian); khi bật chiêu thì đếm ngược thời gian duy trì.
      const need = phatNeed();
      if (state === 'running' && phatActiveNow()) {
        const remaining = Math.max(0, skillActiveUntil - elapsedRun);
        active = true;
        pct = remaining / skillDuration() * 100;
        label = `${PHAT_EFFECT_NAME[phatEffect] || name} · ${remaining.toFixed(1)}s`;
      } else if (state === 'running') {
        pct = phatRage / need * 100;
        label = phatRage >= need ? `${name} · ĐỦ NỘ!` : `${name} · ${Math.floor(phatRage)}/${need}`;
      } else label = `${name} · ${need} NỘ`;
    } else if (selectedCharacter === 'tien' && !tienSkinOn()) {
      // Nhảy kép: không hồi chiêu — đầy 100% khi còn lượt nhảy trên không, 0% sau khi đã dùng đến lúc tiếp đất.
      const ready = state !== 'running' || player.airJumpsLeft > 0;
      label = `${name} · ${ready ? 'SẴN SÀNG' : 'ĐÃ DÙNG'}`;
      pct = ready ? 100 : 0;
    } else if (isRider() && state === 'running') {
      // Trọng Riding: Sét Gầm khi cưỡi ngựa, Gọi Chiến Mã khi đi bộ (thanh giữ nguyên % khi mất ngựa)
      if (riderSkillActiveNow()) {
        const remaining = Math.max(0, skillActiveUntil - elapsedRun);
        active = true;
        pct = remaining / skillDuration() * 100;
        label = `SÉT GẦM · ${remaining.toFixed(1)}s`;
      } else {
        pct = riderProgress * 100;
        const total = riderMounted ? Math.max(1, skillInterval()) : riderCallTime();
        const left = Math.max(0, (1 - riderProgress) * total);
        label = riderMounted ? `SÉT GẦM · HỒI ${Math.ceil(left)}s` : `GỌI CHIẾN MÃ · HỒI ${Math.ceil(left)}s`;
      }
    } else if (state === 'running') {
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
    const dtSel = selectedCharacter === 'duongtao';
    const dtCd = dtSel && state === 'running' ? Math.max(0, dtPunchReadyAt - elapsedRun) : 0;
    const dtLocked = dtSel && duongtaoSkill2Now();
    const tdSel = toduyBuddhaOn();
    const tdCd = tdSel && state === 'running' ? Math.max(0, tdSlashReadyAt - elapsedRun) : 0;
    const bbSel = selectedCharacter === 'buibang';
    const bbOver = bbSel && state === 'running' && bbOverloaded();
    const showPhatBtn = (bbSel && state === 'running') || phatReady() || (selectedCharacter === 'quang' && state === 'running' && !quangActiveNow() && elapsedRun >= nextSkillAt) || (dtSel && state === 'running') || (tdSel && state === 'running');
    if (showPhatBtn !== skillCache.phatBtn) { skillCache.phatBtn = showPhatBtn; phatBtn.hidden = !showPhatBtn; }
    const buttonText = bbSel ? (bbDriving ? (bbPin <= 15 ? 'PIN YẾU · XUỐNG XE' : 'XUỐNG XE') : (bbOver ? `SẠC ${Math.ceil(Math.max(0, bbOverloadUntil - elapsedRun))}s` : 'LÁI XE')) : tdSel ? (tdCd > 0 ? `TRẢM KHÔNG · ${Math.ceil(tdCd)}s` : 'TRẢM KHÔNG') : dtSel ? (dtLocked ? 'ĐANG BỐC ĐẦU' : (dtCd > 0 ? `ĐẤM · ${Math.ceil(dtCd)}s` : 'ĐẤM 😏')) : (selectedCharacter === 'quang' ? 'GOD RIDER' : 'KÍCH HOẠT NỘ');
    const buttonIcon = bbSel ? (bbDriving ? (bbPin <= 15 ? '⚠️' : '🛑') : (bbOver ? '🔌' : '🚗')) : tdSel ? '⚔️' : dtSel ? '👊' : (selectedCharacter === 'quang' ? '🏍️' : '⚡');
    const btnDim = bbSel ? (!bbDriving && (bbOver || bbPin <= 0)) : tdSel ? tdCd > 0 : (dtSel && (dtLocked || dtCd > 0));
    if (btnDim !== skillCache.btnDim) { skillCache.btnDim = btnDim; phatBtn.style.opacity = btnDim ? '0.55' : ''; }
    if (skillCache.buttonText !== buttonText) { skillCache.buttonText = buttonText; phatBtn.querySelector('.phat-btn-txt').textContent = buttonText; }
    if (skillCache.buttonIcon !== buttonIcon) { skillCache.buttonIcon = buttonIcon; phatBtn.querySelector('.phat-btn-ico').textContent = buttonIcon; }
    // [GĐ1-sửa] tách 'night' khỏi 'city'; [GĐ2] thêm 'village'
    const mapKey = schoolMode ? 'school' : cityMode ? (cityNight ? 'night' : 'city') : (villageMode ? 'village' : (beachMode ? 'beach' : 'desert'));   // [SCHOOL]
    if (mapKey !== skillCache.city) {
      skillCache.city = mapKey;
      skillBar.classList.toggle('is-city', mapKey === 'city');
      skillBar.classList.toggle('is-night', mapKey === 'night');
      skillBar.classList.toggle('is-beach', mapKey === 'beach');
      skillBar.classList.toggle('is-village', mapKey === 'village');
      skillBar.classList.toggle('is-school', mapKey === 'school');   // [SCHOOL]
    }
  }

  function drawKnockedObstacles() {
    knockedObstacles.forEach(o => {
      ctx.save(); ctx.globalAlpha = clamp(o.life / 0.45, 0, 1);
      ctx.translate(o.x + o.w / 2, o.y + o.h / 2); ctx.rotate(o.angle);
      ctx.translate(-o.w / 2, -o.h / 2);
      drawObstacle({ ...o, x: 0, y: 0, knocked: true });
      ctx.restore();
    });
  }
  function render() {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (screenShake > 0) ctx.translate(vfxRandom(-3, 3) * screenShake * 5, vfxRandom(-2, 2) * screenShake * 5);
    drawBackground();
    if (tanNikaActiveNow()) drawTanNikaSky();   // V25: màn đêm + ánh trăng Nika
    platforms.forEach(p => { /* platforms are drawn as part of the city layer below */ });
    drawPlatforms();
    if (villageMode) drawVillageDecor();   // [GĐ2] cây dừa trang trí (sau nền, trước vật cản)
    if (beachMode || villageMode) drawWaterPits();
    rainbowItems.forEach(drawRainbowSoNui);   // [L4]
    obstacles.forEach(drawObstacle);
    drawKnockedObstacles();
    if (schoolRings.length) drawSchoolRings();   // [SCHOOL] vòng sóng bạt nhún
    drawTanWaves();
    drawTanSquashed();
    if (bossMode) window.GameBridge.boss.drawBack();
    drawSliceHalves();
    drawToDuyRift();   // V26: Vết Rách Không Gian
    const blink = bossMode && state === 'running' && window.GameBridge.boss.invuln() > 0 && Math.floor(window.GameBridge.boss.invuln() * 12) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    const rainbowOn = rainbowActive();   // [L4] nhân vật đổi màu cầu vồng
    drawPlayer();
    ctx.filter = 'none';
    if (rainbowOn) drawRainbowAura();
    if (blink) ctx.globalAlpha = 1;
    drawSlashes();
    drawToDuyFront();   // V26: Kim Long + Ấn Ký Phật Quang + bụi sao
    drawBrooms();
    drawTanNikaFront();
    drawSmokeRings();
    drawPhatFx();
    drawLightning();
    drawRiderVfx();
    if (bossMode) window.GameBridge.boss.drawFront();
    if (villageMode) drawWindStreaks();   // [GĐ3-B2]
    drawParticles();
    window.Multiplayer?.onRender(ctx);
    ctx.restore();
    if (tanFlash > 0) {   // V25: chớp trắng toàn màn hình (biến hình / vụ nổ xung chấn)
      ctx.save();
      ctx.globalAlpha = clamp(tanFlash, 0, 1) * 0.85;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    updateSkillHud();
  }

  // ---------- [V24.3] Tạm dừng (chỉ chơi đơn / Boss) ----------
  let paused = false;
  const pauseStyle = document.createElement('style');
  pauseStyle.textContent = `
    #pauseBtn{position:absolute;top:calc(env(safe-area-inset-top,0px) + 62px);right:10px;z-index:40;width:38px;height:38px;border-radius:50%;border:2px solid rgba(255,255,255,.55);background:rgba(15,20,35,.55);color:#fff;font-size:17px;line-height:1;cursor:pointer;display:none;align-items:center;justify-content:center;padding:0;-webkit-tap-highlight-color:transparent}
    #pauseBtn.show{display:flex}
    #pauseOverlay{position:absolute;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(5,8,18,.62)}
    #pauseOverlay.show{display:flex}
    #pauseOverlay .pause-card{min-width:230px;padding:20px 22px;border-radius:18px;background:linear-gradient(180deg,#1d2744,#10162b);border:2px solid rgba(255,255,255,.25);box-shadow:0 12px 40px rgba(0,0,0,.5);text-align:center;color:#fff;font-family:inherit}
    #pauseOverlay h3{margin:0 0 14px;font-size:20px;letter-spacing:.06em}
    #pauseOverlay button{display:block;width:100%;margin:8px 0 0;padding:12px 14px;border:0;border-radius:12px;font:inherit;font-weight:800;font-size:15px;cursor:pointer;color:#fff;background:#2e7bff}
    #pauseOverlay button.home{background:#4a5373}`;
  document.head.appendChild(pauseStyle);
  const pauseBtn = document.createElement('button');
  pauseBtn.id = 'pauseBtn'; pauseBtn.type = 'button'; pauseBtn.title = 'Tạm dừng (P)'; pauseBtn.textContent = '⏸';
  const pauseOverlay = document.createElement('div');
  pauseOverlay.id = 'pauseOverlay';
  pauseOverlay.innerHTML = '<div class="pause-card"><h3>⏸ TẠM DỪNG</h3><button type="button" id="pauseResume">▶ TIẾP TỤC</button><button type="button" id="pauseHome" class="home">🏠 VỀ SẢNH</button></div>';
  gameScreen.appendChild(pauseBtn);
  gameScreen.appendChild(pauseOverlay);
  // Solo 1v1 thay window.gameRand bằng bộ sinh theo seed; Racing bật racingMode → khóa Pause để không lệch đồng bộ mạng
  const canPause = () => state === 'running' && !racingMode && window.gameRand === Math.random;
  function setPaused(on) {
    if (on && (paused || !canPause())) return;
    if (!on && !paused) return;
    paused = on;
    pauseOverlay.classList.toggle('show', paused);
    if (!paused) lastTime = 0;   // tránh dt nhảy vọt khi tiếp tục
  }
  function syncPauseUi() {
    if (paused && !canPause()) setPaused(false);
    pauseBtn.classList.toggle('show', canPause() && gameScreen.classList.contains('is-active'));
    if (!canPause() && pauseOverlay.classList.contains('show')) pauseOverlay.classList.remove('show');
  }
  pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); setPaused(true); pauseBtn.blur(); });
  pauseBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  pauseOverlay.addEventListener('pointerdown', (e) => e.stopPropagation());
  document.getElementById('pauseResume').addEventListener('click', () => setPaused(false));
  document.getElementById('pauseHome').addEventListener('click', () => { setPaused(false); toLobby(false); });

  function frame(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.035);
    lastTime = timestamp;
    try {
      if (gameScreen.classList.contains('is-active')) {
        if (!paused) update(dt);
        render();
        syncPauseUi();
      }
    } catch (error) {
      // Keep the animation loop alive if a non-essential HUD element fails.
      console.error('Lỗi cập nhật khung hình game:', error);
    } finally {
      requestAnimationFrame(frame);
    }
  }

  stage.addEventListener('pointerdown', (event) => {
    if (state !== 'running' || paused) return;
    event.preventDefault();
    jump();
  }, { passive: false });

  document.addEventListener('keydown', (event) => {
    if (paused) {   // [V24.3] đang tạm dừng: chỉ nhận P / Esc để tiếp tục
      if (event.code === 'KeyP' || event.code === 'Escape') { event.preventDefault(); setPaused(false); }
      return;
    }
    if (event.code === 'Escape') {
      if (activeModal) { event.preventDefault(); closeModal(); }
      else if (canPause()) { event.preventDefault(); setPaused(true); }
      return;
    }
    if (activeModal) return;
    if (event.code === 'KeyP' && canPause()) { event.preventDefault(); setPaused(true); return; }
    if (state === 'running') {
      if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) { event.preventDefault(); jump(event.repeat); }
      else if (['KeyE', 'KeyS'].includes(event.code) && (selectedCharacter === 'phat' || selectedCharacter === 'quang' || selectedCharacter === 'duongtao' || selectedCharacter === 'buibang' || toduyBuddhaOn())) { event.preventDefault(); if (!event.repeat) { if (selectedCharacter === 'buibang') bbToggle(); else if (selectedCharacter === 'quang') activateQuangSkill(); else if (selectedCharacter === 'duongtao') activateDuongTaoPunch(); else if (toduyBuddhaOn()) tdCastSlash(); else phatActivate(false); } }
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
    renderProfileChip(); // [PROFILE]
  } catch (_) { /* storage may be disabled */ }
  ensureQuests();
  ensureChallenge();
  updateNewsDot();
  updateLobby();
  renderCharacterCards();
  updateHud();
  updateSoundButton();
  setInterval(() => {
    if (ensureQuests()) { updateQuestDot(); if (activeModal === questModal && questTab === 'daily') renderQuests(); }
    if (ensureChallenge()) { updateChallengeButton(); if (activeModal === questModal && questTab === 'challenge') renderChallenge(); }
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
    if (ensureQuests()) { updateQuestDot(); if (activeModal === questModal && questTab === 'daily') renderQuests(); }
    if (ensureChallenge()) { updateChallengeButton(); if (activeModal === questModal && questTab === 'challenge') renderChallenge(); }
    // Không tự phát khi quay lại tab: chờ cú chạm/phím tiếp theo của người chơi.
  });
  requestAnimationFrame(frame);

  // ---------- Cầu nối cho các module độc lập (league.js, multiplayer.js) ----------
  function addReward(crystalAmount = 0, coinAmount = 0) {
    crystals += Math.max(0, Math.floor(crystalAmount));
    coinBalance += Math.max(0, Math.floor(coinAmount));
    saveEconomy();
    saveMeta();
    updateLobby();
  }
  // V22: Key Mini-game từ sự kiện — đã đủ 3/3 Key thì mỗi Key dư quy đổi thành 💎 15.
  function addKey(amount = 1) {
    let added = 0;
    let converted = 0;
    for (let i = 0; i < Math.max(0, Math.floor(amount)); i++) {
      if (miniKeys < 3) { miniKeys++; added++; }
      else { crystals += 15; converted++; }
    }
    saveMeta();
    updateLobby();
    return { added, converted, crystalGained: converted * 15 };
  }
  window.GameBridge = {
    // Firebase + danh tính
    get lbDb() { return lbDb; },
    get lbUid() { return lbUid; },
    lbPlayerName,
    // V24.1: danh sách NPC dùng làm Bot ghép trận (Racing / Solo 1v1)
    get lbNpcs() { return LB_NPCS.map((n) => ({ id: n.id, name: n.name, char: n.character === 'Mu Rát' ? 'murat' : (String(n.character).indexOf('Trọng') === 0 ? 'trong' : 'duy') })); },
    get tienOriginal() { return selectedCharacter === 'tien' && !tienSkinOn('tien'); },
    // Nhân vật & trạng thái chạy
    get selectedCharacter() { return selectedCharacter; },
    charName,
    characters,
    get best() { return best; },
    get score() { return score; },
    get state() { return state; },
    set state(v) { state = v; },
    get skillActive() { return state === 'running' && elapsedRun < skillActiveUntil && skillTriggered; },
    player,
    get groundY() { return groundY; },
    get width() { return width; },
    get height() { return height; },
    get worldTime() { return worldTime; },
    get speed() { return speed; },
    get ctx() { return ctx; },
    // Kinh tế
    get crystals() { return crystals; },
    set crystals(v) { crystals = v; },
    get coinBalance() { return coinBalance; },
    set coinBalance(v) { coinBalance = v; },
    get miniKeys() { return miniKeys; },
    set miniKeys(v) { miniKeys = v; },
    get bossUnlocked() { return bossUnlocked; },
    set bossUnlocked(v) { bossUnlocked = !!v; },
    addReward,
    addKey,
    hasCharacter: (key) => !!owned[key],
    unlockCharacter: (key) => { if (!Object.prototype.hasOwnProperty.call(owned, key)) return false; owned[key] = true; saveMeta(); updateLobby(); renderCharacterCards(); return true; },
    // V25: trao Skin S+ "Tân Nika" khi thắng đấu giá (event.js gọi). Mở luôn nhân vật Tân nếu chưa có.
    unlockTanNika: () => { owned.tanSkin = true; owned.tan = true; saveMeta(); updateLobby(); renderCharacterCards(); return true; },
    get hasTanNika() { return !!owned.tanSkin; },
    // V26: trao Skin S+ "Tô Duy Buddha" từ Chiến Dịch Bóng Ma Katana (event.js gọi). Mở luôn nhân vật Tô Duy nếu chưa quay trúng Gacha.
    unlockToDuyBuddha: () => { owned.toduy = true; owned.toduySkin = true; saveMeta(); updateLobby(); renderCharacterCards(); return true; },
    get hasToDuyBuddha() { return !!owned.toduySkin; },
    spendCrystals,
    saveEconomy,
    saveMeta,
    get achv() { return achv; },
    saveAchv,
    commitProfileRun,
    // Trận hiện tại (dùng chung với Boss)
    get bossMode() { return bossMode; },
    get runItems() { return runItems; },
    get equipped() { return equipped; },
    get inventory() { return inventory; },
    runItemsToast,
    commitChallengeBoss: (win, perfect) => commitChallengeBoss(win, perfect),
    // Mảng & trạng thái vật thể (getter để luôn lấy mảng hiện tại)
    get obstacles() { return obstacles; },
    get platforms() { return platforms; },
    get particles() { return particles; },
    get knockedObstacles() { return knockedObstacles; },
    get lightningStrikes() { return lightningStrikes; },
    get brooms() { return brooms; },
    get smokeRings() { return smokeRings; },
    get slashFX() { return slashFX; },
    get screenShake() { return screenShake; },
    set screenShake(v) { screenShake = v; },
    get lightningFlash() { return lightningFlash; },
    set lightningFlash(v) { lightningFlash = v; },
    get lightningCooldown() { return lightningCooldown; },
    set lightningCooldown(v) { lightningCooldown = v; },
    get spareHits() { return spareHits; },
    set spareHits(v) { spareHits = v; },
    get overAt() { return overAt; },
    set overAt(v) { overAt = v; },
    get overTimer() { return overTimer; },
    set overTimer(v) { overTimer = v; },
    get IMMUNE_SKILL_CHARS() { return IMMUNE_SKILL_CHARS; },
    get NINJA_REACH() { return NINJA_REACH; },
    get PHAT_RAGE_PER_OBSTACLE() { return PHAT_RAGE_PER_OBSTACLE; },
    // Helper dùng chung
    random: (min, max) => random(min, max),
    roundedRect: (x, y, w, h, r) => roundedRect(x, y, w, h, r),
    burst: (x, y, count, dust, color) => burst(x, y, count, dust, color),
    consumeSquadGuard: () => consumeSquadGuard(),
    phatAddRage: (amount) => phatAddRage(amount),
    phatAutoSave: () => phatAutoSave(),
    duongtaoHits: (x, w) => duongtaoHits(x, w),
    broomHits: (x, w) => broomHits(x, w),
    smokeRingHits: (x, w) => smokeRingHits(x, w),
    updateShield,
    updateHud,
    render: () => render(),
    showGameOver: () => showGameOver(),
    // Điều khiển game & UI
    updateLobby,
    startGame: (mode) => startGame(mode),
    endGame: () => endGame(),
    toLobby: (openUpgrades) => toLobby(openUpgrades),
    renderCharacterCards,
    openModal,
    closeModal,
    showToast,
    formatScore,
    playTone,
    playUiSound,
    // Popup Mini-game: module đăng ký { id, render(): html, onClick(event) }
    registerMiniGame(game) {
      if (game && game.id && !miniGames.some((g) => g.id === game.id)) miniGames.push(game);
    },
    renderMini: () => renderMini(),
    // RACING (racing.js)
    get racingMode() { return racingMode; },
    setRacingMode: (on) => { racingMode = !!on; },
    racingRespawn: () => racingRespawn(),
    racingSetMap: (key) => racingSetMap(key),
    get currentMap() { return currentMapKey(); }
    // Boss (boss.js) gắn vào GameBridge.boss khi nạp
  };
})();
