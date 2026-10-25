/* Juno PWA service worker.
 * Keep API responses, checkout, account and payment flows network-only.
 */
const CACHE_NAME = "juno-shell-v6";
const SHELL_URLS = [
  "/",
  "/index.html",
  "/product.html",
  "/games.html",
  "/games.css",
  "/games.js",
  "/sales.html",
  "/sales.css",
  "/sales.js",
  "/sales-data.js",
  "/catalog.json",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.svg?v=3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => (key.startsWith("threadly-shell-") || key.startsWith("juno-shell-")) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always keep live APIs, authentication, orders and payments online.
  if (url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/.netlify/") ||
      url.pathname.startsWith("/admin")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            const cacheKey = url.pathname === "/" ? "/index.html" : url.pathname;
            caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true }) || await caches.match(url.pathname);
          return cached || caches.match("/index.html") || caches.match("/offline.html");
        })
    );
    return;
  }

  // Always refresh the bundled catalogue after a deploy instead of pinning stale data.
  if (url.pathname === "/catalog.json") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(async () => {
        const cached = await caches.match(request);
        return cached || new Response(JSON.stringify({ products: [], productCount: 0 }), {
          status: 503,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      })
    );
    return;
  }

  // Cache the app shell and local assets; update from network when possible.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return cached || network;
    })
  );
});
