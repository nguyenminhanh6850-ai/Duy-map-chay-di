# Duy mập chạy đi — V8 City Route

- Giảm tần suất cụm dàn giáo; khoảng chạy mặt đất giữa các cụm dài hơn.
- Cụm vượt tường có ba dàn giáo: hai dàn giáo thấp gần ngang nhau và một dàn giáo cao hơn ở phía trên.
- Tường cao hơn, đặt sau hai dàn giáo thấp.
- Sửa trạng thái tiếp đất trên dàn giáo và cho phép nhảy khi đang đứng trên dàn giáo/xe buýt.
- Giữ nguyên nhân vật, kỹ năng, map sa mạc và các tài nguyên của V7.
Mở `index.html` trong trình duyệt sau khi giải nén toàn bộ thư mục.


## Cập nhật V9
- Sửa hình giàn giáo: chân chống kéo xuống sát mặt đường, không còn tạo cảm giác lơ lửng.
- Thêm Mu Rát với ảnh nhân vật mới; khóa đến khi đạt 3333 điểm.
- Kỹ năng “Lướt lướt”: Mu Rát hóa hồn ma, bản sao chạy lướt qua chướng ngại vật; hiệu lực 15 giây, chu kỳ hồi 36 giây.


## V10 update
- Updated Mu Rát with the newly supplied right-facing pose and cropped transparent margins.
- City scaffold routes alternate between an upper-left and upper-right deck variant around the two lower decks before the taller wall.
- Scaffold support legs are clipped to the visible playfield/road height.


## V11 — Coin và nâng cấp nhân vật
- Nhận 1 Coin mỗi 20 điểm; thưởng thêm 100 Coin khi chạm mỗi mốc 1.000 điểm trong lượt chạy.
- Coin và cấp nâng cấp được lưu bằng localStorage trên trình duyệt/thiết bị.
- Mỗi nhân vật có Level 1–4; Level 5 hiển thị Coming Soon.
- Giá nâng cấp: Level 2 = 100 Coin, Level 3 = 360 Coin, Level 4 = 750 Coin.
- Duy: hồi chiêu 36→30 giây ở Lv2; thời gian Hành quân cơ bản 12→15 giây ở Lv3; Lv4 chịu thêm một va chạm.
- Trọng Sét: hồi chiêu 40→35 giây ở Lv2; thời gian Sét 15→18 giây ở Lv3; Lv4 chịu thêm một va chạm.
- Mu Rát: hồi chiêu 36→30 giây ở Lv2; thời gian Lướt lướt 15→18 giây ở Lv3; Lv4 chịu thêm một va chạm.


## V12 Hotfix — Cooldown, City hitbox và cân bằng
- Sửa cooldown: lần kích hoạt đầu vẫn theo mốc hồi chiêu hiện tại; từ lần thứ hai, thời gian hồi chiêu đầy đủ bắt đầu sau khi hiệu lực kỹ năng kết thúc. Nâng Lv3 không còn làm cooldown thực tế tụt còn 15–18 giây.
- Sửa va chạm tiếp đất một chiều trên mặt sàn dàn giáo/xe buýt bằng kiểm tra quỹ đạo rơi; tăng độ ổn định khi đáp và đứng trên sàn.
- Map City: tăng xác suất xe buýt; thêm bia xuất hiện đơn lẻ; tăng cơ hội gặp thùng đơn.
- Dàn giáo đơn xuất hiện thường xuyên hơn (khoảng 70% lượt tạo tuyến); combo dàn giáo + tường cao giảm còn khoảng 30%, tường thấp hơn và có khoảng đáp rộng hơn.
- Tăng nhịp xuất hiện chướng ngại vật mặt đường ở City ở mức vừa phải.


## V13 — Upgrade UI & giá nâng cấp
- Duy và Trọng Sét: Lv2 300 Coin, Lv3 750 Coin, Lv4 1.200 Coin.
- Mu Rát: Lv2 400 Coin, Lv3 1.000 Coin, Lv4 1.600 Coin.
- Làm mới xưởng nâng cấp: ba tab nhân vật ở phía trên, khu vực hồ sơ ở giữa hiển thị ảnh, kỹ năng, hồi chiêu, thời gian duy trì và chống chịu; chuyển nhân vật có hiệu ứng.
- Giữ nguyên tiến trình Coin và cấp nâng cấp đã lưu trên trình duyệt.


## V14 — Cải tổ giao diện Single-Screen (Game Mobile/Web)
- Toàn bộ game cố định trong một khung nhìn (`height: 100dvh; overflow: hidden`), chuyển cảnh bằng ẩn/hiện các lớp giao diện thay vì cuộn trang.
- **Sảnh chính**: thanh trên (Coin, Kỷ lục, Âm thanh); giữa là tên game + nhân vật chạy tại chỗ kèm cấp/kỹ năng; dưới là nút CHƠI NGAY (to, giữa) cùng [NHÂN VẬT & NÂNG CẤP] và [HƯỚNG DẪN / THÀNH TỰU].
- **Popup Nhân vật & Nâng cấp**: nền mờ, 3 thẻ ngang (Duy, Trọng Sét, Mu Rát), mỗi thẻ có nút CHỌN và NÂNG CẤP kèm giá Coin. Mu Rát hiện bóng đen + ổ khóa đến khi đạt 3.333 điểm.
- **Trong trận**: canvas phóng to lấp đầy màn hình; HUD chỉ gồm Điểm, Coin vừa nhặt, thanh hồi chiêu và biểu tượng Giáp (Lv4). Canvas giữ khung logic cố định rồi scale bằng CSS nên độ khó/vật lý không đổi.
- **Game Over**: bảng tổng kết giữa màn hình (điểm ván này, Coin kiếm được, kỷ lục) với CHƠI LẠI / VỀ SẢNH & NÂNG CẤP. Có độ trễ ~0,7 giây chống bấm nhầm khi đang nhấn Space liên tục.
- **Popup Hướng dẫn / Thành tựu**: thành tựu tính từ kỷ lục và cấp nâng cấp đã lưu, không cần dữ liệu mới.
- **Font**: Oswald (tiêu đề), Chakra Petch (giao diện, có tiếng Việt), Press Start 2P (chỉ cho số/chữ không dấu vì font này không có dấu tiếng Việt). Font tải từ Google Fonts nên cần mạng; khi offline sẽ dùng font dự phòng.
- **Micro-interactions**: nút `scale(.95)` khi bấm; thẻ nhân vật đổi màu viền phát sáng theo từng nhân vật khi di chuột.
- Phím tắt: Space/Enter ở sảnh = Chơi ngay; Space/↑/W = nhảy; R = chơi lại; Esc = đóng popup.
- Lưu thêm nhân vật đang chọn (`duyMapChayDiChar`); Coin, kỷ lục và cấp nâng cấp cũ giữ nguyên.


## V15 — Vá lỗi giàn giáo, Nhiệm vụ hằng ngày, Gacha, Túi vật phẩm, Tô Duy
**Vá lỗi hitbox ma trên giàn giáo**
- `validateSupport()` siết chặt: ngay khi chân nhân vật vượt mép chiều rộng của giàn giáo/xe buýt, hoặc chân không còn sát mặt bệ, trạng thái tiếp đất bị hủy (`groundPlatform = null`, `onGround = false`) trong cùng khung hình và trọng lực kéo nhân vật rơi. Đã bỏ nhánh cũ có thể giữ nhân vật lơ lửng khi chân chồng lên bệ nhưng lệch độ cao.

**Nhiệm vụ hằng ngày** (nút 📅 trên sảnh, chấm đỏ khi có thưởng chưa nhận)
- Mỗi ngày 3 nhiệm vụ ngẫu nhiên, mỗi nhiệm vụ thuộc một loại khác nhau, tự làm mới theo ngày của đồng hồ hệ thống. 1 điểm = 1m.
- Loại nhiệm vụ: chạy 1000/1200/1500m trong 1 màn (250/350/500 Coin); tích lũy 3000m qua nhiều màn (300 Coin); tông vào xe buýt 1 hoặc 2 lần (100/200 Coin); kích hoạt kỹ năng 2 hoặc 3 lần trong một lượt (250/400 Coin).
- Nhận đủ cả 3 nhiệm vụ mới mở nút thưởng lớn 10 Crystal. Crystal hiển thị cạnh Coin trên sảnh và trong các popup.
- "Tông vào xe buýt": tính mỗi lần chạm thân/mặt trước xe (kể cả khi có giáp hoặc đang dùng kỹ năng xuyên); đáp lên nóc xe không tính.

**Gacha & Túi vật phẩm** (nút 🎁)
- Mở x1 = 15 Crystal, Mở x5 = 65 Crystal, có hiệu ứng rung hộp rồi bung kết quả.
- Mỗi hộp luôn có 300–900 Coin, cộng thêm 1 phần thưởng: 80% vật phẩm (Khiên bảo vệ / Nam châm vàng / Đồng hồ cát), 15% nhân vật Tô Duy (trùng thì hoàn 10 Crystal), 5% Key Mini-game.
- Túi vật phẩm (tab thứ hai trong Gacha): chọn trang bị trước khi bấm CHƠI NGAY. Khiên +1 chống chịu 1 màn; Nam châm x2 Coin nhận được trong 1 màn; Đồng hồ cát giảm 15% thời gian hồi skill trong 3 màn. Vật phẩm bị trừ khi bắt đầu chơi, trang bị phải chọn lại cho lần sau (riêng Đồng hồ cát giữ nguyên đến hết 3 màn).
- Mini-game (nút 🎮): hiển thị X/3 Key; đủ 3/3 sẽ mở khóa và hiện "Sắp ra mắt". Key thừa khi đã đủ 3 không được cộng thêm.

**Nhân vật Tô Duy** (ảnh `assets/to-duy.png`, mở khóa qua Gacha)
- Kỹ năng thụ động "Ninja": tự kích hoạt sau 25 giây chạy, duy trì 8 giây, lặp lại suốt màn chơi; thanh đếm ngược/hiệu lực nằm ở HUD. Khi bật, mọi chướng ngại trong tầm chém phía trước (kể cả trên không lúc nhân vật nhảy) bị katana chém đứt đôi và biến mất, không gây sát thương.
- Nâng cấp: Lv2 300 Coin (chờ 25→22s), Lv3 750 Coin (duy trì 8→12s), Lv4 1.200 Coin (+1 chống chịu), Lv5 "Sắp ra mắt".

**Dữ liệu localStorage mới**: `duyMapChayDiCrystals`, `duyMapChayDiOwned`, `duyMapChayDiItems` (kho, trang bị, lượt Đồng hồ cát), `duyMapChayDiKeys`, `duyMapChayDiQuests`. Coin, kỷ lục, cấp nâng cấp (nay có thêm `toduy`) và nhân vật đang chọn vẫn dùng khóa cũ.


## V15 Audio Update
- Thêm nhạc nền `assets/Thangbanhuyenthoaibeat.mp3` (lặp liên tục).
- Nhạc bắt đầu sau tương tác đầu tiên của người chơi (ví dụ chạm màn hình hoặc bấm Chơi), tương thích chính sách Autoplay của trình duyệt điện thoại.
- Nút loa trên thanh đầu sảnh chuyển qua 3 chế độ: `ÂM THANH` (nhạc + hiệu ứng), `TẮT NHẠC` (chỉ hiệu ứng), `TẮT HẾT` (im lặng).
- Hiệu ứng âm thanh Web Audio API cho thao tác chọn nhân vật, nâng cấp, gacha, nhận thưởng, mở/đóng popup và các nút giao diện.
- Khi tab/trình duyệt bị ẩn (`visibilitychange`), nhạc nền tạm dừng và AudioContext được suspend; khi quay lại, nhạc chỉ phát lại sau tương tác tiếp theo.


## V16 — Sửa âm thanh
- SFX to hơn: âm lượng playTone/playUiSound nâng lên khoảng 0.25–0.45 (gấp ~10 lần).
- Nhạc nền phát trực tiếp bằng HTMLAudioElement (bỏ createMediaElementSource), volume = 0.5; tắt bằng pause().
- Lần chạm/phím đầu tiên ở bất kỳ đâu sẽ phát nhạc ngay nếu musicOn và nhạc đang paused.


## V17 — Shop, Túi đồ riêng, chỉnh vật phẩm & map City
- **Vật phẩm hỗ trợ** đổi tên: "+1 chống chịu" (🛡️), "×2 Coin" (🪙 kèm huy hiệu ×2, không còn là nam châm), "Giảm thời gian hồi chiêu 15%" (⌛). Cả 3 vật phẩm đều chỉ có hiệu lực **1 màn** (hồi chiêu giảm từ 3 màn xuống 1 màn). Lượt còn dở của bản cũ được đổi thành 1 vật phẩm trong kho.
- **Túi đồ** tách thành nút riêng 🎒 ở cột bên phải sảnh (không còn là tab trong Gacha). Dải "ĐÃ TRANG BỊ" ở sảnh mở thẳng Túi đồ.
- **Shop** 🏪 (nút mới ở sảnh) với chủ shop ông Duy "Chan pa" (ảnh `assets/chu-shop.png`, có hiệu ứng thở/lắc nhẹ, bong bóng thoại, nhảy khi mua):
  - PHỔ THÔNG: +1 chống chịu 2.500 Coin · ×2 Coin 2.000 Coin · Giảm thời gian hồi chiêu 15% 3.000 Coin; mỗi món tối đa 3 lần/ngày (reset theo ngày của thiết bị). Lưu ở `duyMapChayDiShop`.
  - CAO CẤP, ĐẶC BIỆT: Coming Soon.
- **Map City**: dàn giáo giảm ~80% (khoảng cách giữa hai cụm dàn giáo ×8). Bia, thùng, xe buýt xuất hiện nhiều hơn ~40% (khoảng chờ giữa hai vật cản chia 1,4, tối thiểu 0,6 giây).
- **Xưởng nâng cấp**: nhân vật Lv4 không còn lặp chữ Level 5 hai lần (nút chỉ ghi "ĐÃ TỐI ĐA").


## V18 — Tiểu Đội Chi Viện
- Nhân vật Gacha mới **Duy Quân đội** (`duyquandoi`, `assets/duy-quan-doi.png`), kỹ năng **CHI VIỆN**: hồi chiêu 38s / duy trì 16s; Lv2 (400 Coin) hồi 33s; Lv3 (1000 Coin) duy trì 19s; Lv4 (1600 Coin) Giáp +1. Khi kích hoạt miễn nhiễm va chạm và có 2 bản sao Duy hộ tống (trước ~48px, sau ~42px) cùng hào quang xanh lá.
- Gacha: 80% vật phẩm (4 món) · 15% nhân vật chia đều 7,5% Tô Duy / 7,5% Duy Quân đội (trùng hoàn 10 Crystal) · 5% Key Mini-game.
- Vật phẩm mới 🔋 **Tăng 15% thời gian duy trì kỹ năng** (`duration`, 3600 Coin, 3 lần/ngày). **×2 Coin** giảm còn 600 Coin.
- Thành tựu: 11 mốc, nút `NHẬN 💎 X`, lưu ở `duyMapChayDiAchv` (kèm tổng mét chạy, số hộp Gacha, số lần tông xe buýt).
- Toàn màn hình mobile: `100dvh` + `visualViewport` + Fullscreen API khi bấm CHƠI NGAY (thiết bị cảm ứng).
- Mục 📰 NEWS ở sảnh, chấm đỏ theo `duyMapChayDiSeenVersion`.
- 
## V19 — Đánh Boss Xe Tăng
- Mini-game "Sắp ra mắt" → chế độ **ĐÁNH BOSS XE TĂNG**. Đủ 3/3 Key → bấm MỞ KHÓA (trừ 3 Key, lưu `duyMapChayDiBossUnlocked`).
- Các lượt sau: tốn 1 Key hoặc 15 Crystal. Không tính điểm mét; thanh máu Boss kiểu Wither ở cạnh trên.
- 2 tim (+1 giáp Lv4, +1 khiên), bất tử 1,2 giây sau khi trúng đòn. Kỹ năng nhân vật còn 50% thời gian trong trận Boss.
- Lụm hòm 🚀💣 để bắn Boss. Chiêu 1: đạn pháo (laser đỏ cảnh báo 0,7s). Chiêu 2: tên lửa chậm (Ninja chém / Sét giật nổ được).
- Phase 2 (≤50% máu): ra chiêu nhanh hơn 25%, thêm thùng gỗ / rào chắn.
- Thưởng thắng: 45💎 + (80% 2.000🪙 / 20% 10💎). Thua: rút <50% → 5💎 + 500🪙; rút ≥50% → 10💎 + 700🪙. Không nhân đôi Coin.
- Gacha: đủ 3 Key chưa dùng mà ra thêm Key → đền bù 15💎.
- Duy Quân đội dùng tông đỏ như Tô Duy ở giao diện nhân vật.

## V20 — Anh Em "Sét"
- Nhân vật thứ 6 **Tiến** (`tien`, `assets/tien.png`): bán vĩnh viễn ở **Shop → Đặc Biệt** giá 15.000 Coin (mua 1 lần, sau đó hiện `✓ ĐÃ SỞ HỮU`). Lưu ở `duyMapChayDiOwned` (`owned.tien`).
- Kỹ năng gốc **NHẢY KÉP** (chủ động, không hồi chiêu/không thời gian duy trì): thêm 1 lần nhảy trên không (`airJumps = 1`), tự hồi khi chạm đất / nóc xe buýt / giàn giáo (kể cả khi chạy hụt khỏi mép bệ vẫn còn 1 lượt). Thanh kỹ năng: `NHẢY KÉP · SẴN SÀNG` (100%) / `NHẢY KÉP · ĐÃ DÙNG` (0%).
- Skin **Tiến Trọng Duy** (`tien_trio`): **Shop → Cao Cấp**, cần có Tiến; mua bằng 💎 20 hoặc 🪙 7.500 (`owned.tienSkin`). Mặc / Tháo tại thẻ Tiến trong popup Nhân vật & Nâng cấp (`equippedSkin.tien`, lưu ở `duyMapChayDiSkin`).
- Kỹ năng khi mặc skin **ANH EM "SÉT"** (thay Nhảy kép): hồi chiêu 50s, duy trì 22s (Boss: còn 11s). Duy chạy trước (`player.x + 26`), Trọng "Sét" chạy sau (`player.x - 26`), cùng độ cao `player.y`, chung hào quang Hành quân. Miễn nhiễm va chạm (kể cả đạn Boss) và tự phóng sét phá chướng ngại trong tầm 360px.
- Nâng cấp Tiến (tổng 3.000 Coin): Lv2 (400) +12% lực nhảy kép / skin hồi 44s · Lv3 (1.000) rơi chậm 15% sau nhảy kép / skin duy trì 25s · Lv4 (1.600) Chống chịu +1.
- Boss Xe Tăng khó hơn: `shellSpeed` 900 (Phase 2: 1.000), `missileSpeed` 460 (Phase 2: 540), `bossConflict` 0,5s. Chiêu tên lửa bắn **loạt 2 quả (Phase 1) / 3 quả (Phase 2)** cách nhau 150–180px, độ cao so le thấp → cao → thấp.
- Phase 2 có thêm **giàn giáo** (rộng 160–190px, cao ~88px) xen thùng gỗ / rào chắn; kèm đòn quét sát đất (1 đạn pháo tầm thấp hoặc loạt 2 tên lửa tầm thấp) buộc nhảy lên giàn giáo, có hòm bom 💣 ở cuối giàn giáo.
- Thành tựu `a8` cố định: nâng đủ 5 nhân vật bất kỳ lên Lv4. Thêm bài News **V20**. Service worker cache `v20`.
