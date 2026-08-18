const CACHE_NAME = "vietutil-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/pages/lunar-calendar/",
  "/pages/date-tools/",
  "/pages/finance-tools/",
  "/pages/text-tools/",
  "/pages/more-tools/",
  "/assets/css/base.css",
  "/assets/css/components.css",
  "/assets/css/pages.css",
  "/assets/js/site.js",
  "/assets/js/utils.js",
  "/assets/js/tools/date-tools.js",
  "/assets/js/tools/finance-tools.js",
  "/assets/js/tools/lunar.js",
  "/assets/js/tools/more-tools.js",
  "/assets/js/tools/text-tools.js",
  "/assets/js/vendor/qrcode.js",
  "/assets/img/icon/site.webmanifest",
  "/assets/img/icon/android-chrome-192x192.png",
  "/assets/img/icon/android-chrome-512x512.png",
  "/assets/img/icon/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function (cacheName) {
              return cacheName !== CACHE_NAME;
            })
            .map(function (cacheName) {
              return caches.delete(cacheName);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(function () {
          return caches.match(request, { ignoreSearch: true }).then(function (cachedResponse) {
            return cachedResponse || caches.match("/index.html");
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cachedResponse) {
      const networkResponse = fetch(request)
        .then(function (response) {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(function () {
          return cachedResponse;
        });

      return cachedResponse || networkResponse;
    })
  );
});
