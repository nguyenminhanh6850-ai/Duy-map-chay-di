const CACHE_NAME = 'duy-map-chay-di-v18';

// 1. Cài đặt Service Worker ngay lập tức
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Kích hoạt và tự động xóa bộ nhớ đệm của các bản cập nhật cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. Chặn các yêu cầu tải file: Ưu tiên lấy từ máy (nhanh + chơi được khi mất mạng)
self.addEventListener('fetch', (event) => {
  // Chỉ xử lý các yêu cầu tải dữ liệu thông thường (GET)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Nếu file đã có sẵn trong máy thì trả về luôn
      if (cachedResponse) {
        return cachedResponse;
      }

      // Nếu chưa có thì tải từ mạng về, đồng thời lưu vào bộ nhớ đệm cho lần sau
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
