/* サービスワーカー（public/sw.js）の単体テスト
 * Cache Storage はオリジン全体で共有されるため、同じオリジンの他アプリのキャッシュを消さない・読まないことを確かめる。
 * sw.js をそのまま node:vm で読み込み、self / caches / fetch を最小限の偽物に差し替えて、install・activate・fetch を発火させる。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const SCOPE = 'https://nyuriwossan.github.io/bishounen-prompt-gacha/';
const SW_SOURCE = fs.readFileSync(path.resolve('public/sw.js'), 'utf8');

interface FakeRequest { url: string; method: string; mode: string }
interface FakeResponse { body: string; ok: boolean; clone: () => FakeResponse }

const response = (body: string, ok = true): FakeResponse => ({ body, ok, clone: () => response(body, ok) });
const request = (url: string, mode = 'no-cors', method = 'GET'): FakeRequest => ({ url: new URL(url, SCOPE).href, method, mode });
const keyOf = (r: FakeRequest | string) => new URL(typeof r === 'string' ? r : r.url, SCOPE + 'sw.js').href;

class FakeCache {
  entries = new Map<string, FakeResponse>();
  async match(r: FakeRequest | string) { return this.entries.get(keyOf(r)); }
  async put(r: FakeRequest | string, res: FakeResponse) { this.entries.set(keyOf(r), res); }
  async addAll(list: string[]) { for (const u of list) this.entries.set(keyOf(u), response(`network:${keyOf(u)}`)); }
}

class FakeCacheStorage {
  store = new Map<string, FakeCache>();
  async keys() { return [...this.store.keys()]; }
  async open(name: string) { if (!this.store.has(name)) this.store.set(name, new FakeCache()); return this.store.get(name)!; }
  async delete(name: string) { return this.store.delete(name); }
  // オリジン全体を探す caches.match。sw.js が使っていないことをテストで確かめる。
  async match(r: FakeRequest | string) { for (const c of this.store.values()) { const hit = await c.match(r); if (hit) return hit; } return undefined; }
}

function loadWorker(opts: { online?: boolean; seed?: Record<string, Record<string, string>> } = {}) {
  const caches = new FakeCacheStorage();
  for (const [name, entries] of Object.entries(opts.seed ?? {})) {
    const c = new FakeCache();
    for (const [u, body] of Object.entries(entries)) c.entries.set(keyOf(u), response(body));
    caches.store.set(name, c);
  }
  const state = { online: opts.online ?? true, fetched: [] as string[], globalMatchCalls: 0, claimed: false };
  const realMatch = caches.match.bind(caches);
  caches.match = async (r) => { state.globalMatchCalls++; return realMatch(r); };
  const listeners = new Map<string, (e: unknown) => void>();
  const self = {
    location: new URL(SCOPE + 'sw.js'),
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    skipWaiting: () => undefined,
    clients: { claim: async () => { state.claimed = true; } }
  };
  const fetch = async (r: FakeRequest) => {
    state.fetched.push(r.url);
    if (!state.online) throw new TypeError('Failed to fetch');
    return response(`network:${r.url}`);
  };
  vm.runInNewContext(SW_SOURCE, { self, caches, fetch, URL });

  const lifecycle = async (type: 'install' | 'activate') => {
    let wait: Promise<unknown> = Promise.resolve();
    listeners.get(type)!({ waitUntil: (p: Promise<unknown>) => { wait = p; } });
    await wait;
  };
  const dispatchFetch = async (r: FakeRequest) => {
    let reply: Promise<FakeResponse | undefined> | undefined;
    listeners.get('fetch')!({ request: r, respondWith: (p: Promise<FakeResponse | undefined>) => { reply = p; } });
    const res = reply ? await reply : undefined;
    await new Promise((done) => setTimeout(done, 0)); // 応答のあとで行われる put を待つ
    return { handled: !!reply, res };
  };
  return { caches, state, lifecycle, dispatchFetch };
}

const FOREIGN = ['workbox-precache-v2-https://example/', 'other-app-v1', 'font-logo-workshop-runtime', 'v1'];

describe('サービスワーカー：キャッシュは自分の分だけ扱う', () => {
  it('キャッシュ名は bpg- の接頭辞付きで、版は bpg-v2', () => {
    expect(SW_SOURCE).toMatch(/const PREFIX = 'bpg-';/);
    expect(SW_SOURCE).toMatch(/const CACHE = PREFIX \+ 'v2';/);
  });

  it('activate：他アプリのキャッシュは残し、古い bpg-v1 だけを消して bpg-v2 を残す', async () => {
    const seed: Record<string, Record<string, string>> = { 'bpg-v1': { './index.html': 'old' }, 'bpg-v0-test': {} };
    for (const k of FOREIGN) seed[k] = { [`https://nyuriwossan.github.io/${encodeURIComponent(k)}/index.html`]: k };
    const sw = loadWorker({ seed });
    await sw.lifecycle('install');
    await sw.lifecycle('activate');
    const keys = await sw.caches.keys();
    for (const k of FOREIGN) expect(keys, k).toContain(k);
    expect(keys).toContain('bpg-v2');
    expect(keys).not.toContain('bpg-v1');
    expect(keys).not.toContain('bpg-v0-test');
    // 他アプリのキャッシュの中身もそのまま
    for (const k of FOREIGN) expect(sw.caches.store.get(k)!.entries.size, k).toBe(1);
    expect(sw.state.claimed).toBe(true);
  });

  it('activate：接頭辞が似ているだけのキャッシュ（bpg で始まるが bpg- ではない）にも触れない', async () => {
    const sw = loadWorker({ seed: { bpgx: {}, 'BPG-v1': {}, 'xbpg-v1': {} } });
    await sw.lifecycle('activate');
    expect(await sw.caches.keys()).toEqual(expect.arrayContaining(['bpgx', 'BPG-v1', 'xbpg-v1']));
  });

  it('install：./ と ./index.html を bpg-v2 に入れる', async () => {
    const sw = loadWorker();
    await sw.lifecycle('install');
    const c = sw.caches.store.get('bpg-v2')!;
    expect([...c.entries.keys()].sort()).toEqual([SCOPE, SCOPE + 'index.html']);
  });
});

describe('サービスワーカー：fetch の動作（既存の動作を保つ）', () => {
  it('HTML はネットワーク優先で、取得したものを bpg-v2 に保存する', async () => {
    const sw = loadWorker({ seed: { 'bpg-v2': { './': 'stale' } } });
    const { handled, res } = await sw.dispatchFetch(request('./', 'navigate'));
    expect(handled).toBe(true);
    expect(res?.body).toBe(`network:${SCOPE}`);
    expect((await sw.caches.store.get('bpg-v2')!.match(SCOPE))?.body).toBe(`network:${SCOPE}`);
  });

  it('オフラインの HTML は bpg-v2 から返し、無ければ ./index.html にフォールバックする', async () => {
    const sw = loadWorker({ online: false, seed: { 'bpg-v2': { './': 'cached-root', './index.html': 'cached-index' } } });
    expect((await sw.dispatchFetch(request('./', 'navigate'))).res?.body).toBe('cached-root');
    expect((await sw.dispatchFetch(request('./?s=abc', 'navigate'))).res?.body).toBe('cached-index');
  });

  it('オフラインの HTML は他アプリのキャッシュを返さない（caches.match でオリジン全体を探さない）', async () => {
    const sw = loadWorker({
      online: false,
      seed: { 'bpg-v2': { './index.html': 'mine' }, 'other-app-v1': { './': 'foreign-root', './assets/app.js': 'foreign-js' } }
    });
    expect((await sw.dispatchFetch(request('./', 'navigate'))).res?.body).toBe('mine');
    expect(sw.state.globalMatchCalls).toBe(0);
  });

  it('その他の資源はキャッシュ優先で、無ければ取得して bpg-v2 に保存する', async () => {
    const sw = loadWorker({ seed: { 'bpg-v2': { './assets/a.js': 'cached-a' } } });
    expect((await sw.dispatchFetch(request('./assets/a.js'))).res?.body).toBe('cached-a');
    expect(sw.state.fetched).toEqual([]);
    const b = await sw.dispatchFetch(request('./assets/b.css'));
    expect(b.res?.body).toBe(`network:${SCOPE}assets/b.css`);
    expect(await sw.caches.store.get('bpg-v2')!.match(SCOPE + 'assets/b.css')).toBeTruthy();
  });

  it('その他の資源も他アプリのキャッシュからは返さない', async () => {
    const sw = loadWorker({ seed: { 'other-app-v1': { './assets/a.js': 'foreign-js' } } });
    const { res } = await sw.dispatchFetch(request('./assets/a.js'));
    expect(res?.body).toBe(`network:${SCOPE}assets/a.js`);
    expect(sw.state.globalMatchCalls).toBe(0);
    expect(sw.caches.store.get('other-app-v1')!.entries.size).toBe(1);
  });

  it('GET 以外と別オリジンには関与しない', async () => {
    const sw = loadWorker();
    expect((await sw.dispatchFetch(request('./api', 'cors', 'POST'))).handled).toBe(false);
    expect((await sw.dispatchFetch(request('https://fonts.googleapis.com/css2?family=x'))).handled).toBe(false);
  });
});
