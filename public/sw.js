/* Service Worker mínimo de Zyteron (habilita instalación como app / PWA).
 * Estrategia: network-first para navegación; no cachea respuestas privadas del
 * admin ni de APIs para no exponer datos. Solo provee el "app shell" offline
 * básico y el manejo de fetch requerido para la instalación. */

const CACHE = "zyteron-shell-v1";
const OFFLINE_ASSETS = ["/manifest.webmanifest", "/logo.svg", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // No interceptar APIs, admin ni orígenes externos: siempre a la red.
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/portal-clientes")
  ) {
    return;
  }

  // Assets estáticos: cache-first con actualización en segundo plano.
  if (/\.(png|svg|ico|webmanifest|css|js|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});

// ── Notificaciones del sistema operativo ──────────────────────────────
// Al tocar una notificación se enfoca la pestaña del panel si ya está
// abierta, y solo se abre una nueva cuando no hay ninguna.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.href) || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/admin") && "focus" in client) {
          client.navigate(destino);
          return client.focus();
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});

// Mensajes push del servidor (requiere claves VAPID configuradas).
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Zyteron", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Zyteron", {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag,
      data: { href: payload.href || "/admin" },
      vibrate: [180, 80, 180],
    })
  );
});
