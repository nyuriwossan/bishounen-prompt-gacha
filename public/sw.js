/* 美青年錬成ガチャ — オフライン用の最小限のサービスワーカー
 * 同一オリジンの GET だけをキャッシュする。HTML はネットワーク優先、その他はキャッシュ優先。
 *
 * Cache Storage はオリジン（nyuriwossan.github.io）全体で共有されている。
 * 同じオリジンの他のアプリ（Workbox のキャッシュなど）を壊さないよう、
 * このアプリが作ったキャッシュ（名前が PREFIX で始まるもの）だけを読み書き・削除する。
 */
const PREFIX = 'bpg-';
const CACHE = PREFIX + 'v2';
const fromCache = (req) => caches.open(CACHE).then((c) => c.match(req));
const toCache = (req, res) => caches.open(CACHE).then((c) => c.put(req, res));

self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html']).catch(() => undefined))); });
self.addEventListener('activate', (e) => {
  // 自分の古い版（bpg- で始まり、今の版ではないもの）だけを消す。接頭辞のないキャッシュ・他の接頭辞のキャッシュには触れない。
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    e.respondWith(fetch(req).then((res) => { toCache(req, res.clone()); return res; }).catch(() => fromCache(req).then((r) => r || fromCache('./index.html'))));
    return;
  }
  e.respondWith(fromCache(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) toCache(req, res.clone());
    return res;
  })));
});
