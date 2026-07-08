const CACHE_NAME = "ecoblaster-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Nunca cacheia /api/* — precisam sempre de dado fresco (turnos abertos, etc.).
// Pro resto (app shell, ícones), tenta a rede primeiro e guarda em cache; se
// não tiver rede, serve a última versão cacheada.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const resposta = await fetch(event.request, { cache: "no-store" });
        if (resposta && resposta.status === 200) {
          cache.put(event.request, resposta.clone());
        }
        return resposta;
      } catch {
        const cacheada = await cache.match(event.request);
        if (cacheada) return cacheada;
        throw new Error("Sem conexão e sem cache disponível");
      }
    })
  );
});
