/* Galina: запросы к /api без Cookie — обход Apache 400 (LimitRequestFieldSize) без правки конфига сервера. */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try {
      await self.registration.unregister();
    } catch (e) {
      // ignore
    }
  })());
});

self.addEventListener('fetch', function (event) {
  // Ничего не перехватываем: прежняя версия SW мешала запросам к Apache.
  return;
});
