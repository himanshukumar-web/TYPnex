const CACHE_NAME = "typnex-pwa-v2";

// Only cache public static branding shell assets
const PUBLIC_STATIC_SHELL = [
  "/",
  "/login",
  "/manifest.json",
  "/favicon.ico"
];

// Sensitive routes that MUST NEVER be cached in public service worker cache
const SENSITIVE_PATH_PATTERNS = [
  "/api/",
  "/chat",
  "/employee",
  "/admin",
  "/department",
  "/files",
  "/uploads",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PUBLIC_STATIC_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // STRICT SECURITY RULE:
  // Never cache non-GET requests, API requests, authenticated chat, employee, admin, or private file downloads!
  if (
    event.request.method !== "GET" ||
    SENSITIVE_PATH_PATTERNS.some((pattern) => url.pathname.startsWith(pattern))
  ) {
    return; // Pass through to network with no caching
  }

  // Network first with offline fallback for static assets only
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
