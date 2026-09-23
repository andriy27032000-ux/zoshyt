// Service worker: дає програмі працювати без інтернету.
// Стратегія: спершу мережа (щоб оновлення доходили самі), якщо мережі немає або вона повільна — копія з пристрою.
const CACHE = 'zoshyt-v5';
const FILES = ['./', 'index.html', 'icon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png', 'terms.html', 'privacy.html'];
const NET_TIMEOUT = 3500;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {})))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // Supabase та інше — напряму
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === 'navigate' ? new Request('index.html') : req;
    const cached = await cache.match(key, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    });
    if (!cached) return net.catch(() => new Response('Немає інтернету', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } }));
    const timeout = new Promise(r => setTimeout(() => r(null), NET_TIMEOUT));
    try {
      const res = await Promise.race([net, timeout]);
      return res || cached;
    } catch { return cached; }
  })());
});
