/* 端末内保存：自動保存・お気に入り・履歴・JSONバックアップ・共有URL
 * 正本は「選択ID＋固定状態＋設定」。生成済みの文章は保存しない（辞書の修正に追従できる）。
 * 壊れたJSON・古い版・削除された候補IDでもアプリを落とさず、復元できなかった項目を返す。
 * 参考：creative-idea-gacha（保存件数・容量上限・型検証）、character-appearance（選択IDを正本にする方針）
 */
import { DATA_VERSION, optionOf } from '../data/fields';
import { cloneState, DEFAULT_MODULES, DEFAULT_SETTINGS, emptyState, SCHEMA_VERSION } from '../engine/state';
import { FIELD_IDS, type FieldId, type ForgeState } from '../types';

export const APP_ID = 'bishounen-prompt-gacha';
export const KEYS = { current: 'bpg:v1:current', favorites: 'bpg:v1:favorites', history: 'bpg:v1:history', recent: 'bpg:v1:recent', ui: 'bpg:v1:ui' } as const;
export const MAX_FAVORITES = 300;
export const MAX_HISTORY = 50;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface SavedForge {
  id: string;
  name: string;
  memo: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  state: ForgeState;
}
export interface HistoryEntry { id: string; at: string; title: string; state: ForgeState }

export interface MigrationReport { lostFields: Array<{ field: string; id: string }>; notes: string[] }

// ---------------- 低レベル ----------------
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
let kv: KV | null = null;
export function setStorage(s: KV | null) { kv = s; }
function store(): KV | null {
  if (kv) return kv;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}
function read<T>(key: string, fallback: T): T {
  try {
    const raw = store()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
/** 書き込み。容量不足などは false を返す（アプリは落とさない） */
function write(key: string, value: unknown): boolean {
  try { store()?.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

export const uid = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ---------------- 状態の正規化・移行 ----------------
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const str = (x: unknown, max = 200) => (typeof x === 'string' ? x.slice(0, max) : '');

/** 眼鏡・特徴・持ち物のスイッチ（2026-10 追加）。これより前のデータにはキーがない */
const ITEM_MODULES = [['glassesEnabled', 'glasses'], ['marksEnabled', 'marks'], ['propEnabled', 'prop']] as const;
/**
 * 旧データの移行方針：
 * - preserve（お気に入り・履歴・JSON・共有URL）：値が「なし」以外ならONにして、保存時の見た目を保つ
 * - current（自動保存の現在の状態）：新しい既定（OFF）を使う。ただし固定中で「なし」以外の値はONにして守る
 */
export type LegacyItems = 'preserve' | 'current';
function migrateItemModules(base: ForgeState, mods: Record<string, unknown>, legacy: LegacyItems) {
  for (const [key, field] of ITEM_MODULES) {
    if (typeof mods[key] === 'boolean') continue;
    const sel = base.fields[field];
    const has = !!sel.id && sel.id !== 'none';
    base.optionalModules[key] = legacy === 'preserve' ? has : has && sel.locked;
  }
}

/** どんな入力でも、安全な ForgeState に直す。無効なIDは捨てて報告する。 */
export function normalizeState(raw: unknown, report: MigrationReport = { lostFields: [], notes: [] }, legacy: LegacyItems = 'preserve'): ForgeState {
  const base = emptyState();
  if (!isObj(raw)) { report.notes.push('状態データの形式が不正なため、初期状態を使いました。'); return base; }
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (version > SCHEMA_VERSION) report.notes.push('新しい版のデータです。読めた範囲だけ復元しました。');
  const fields = isObj(raw.fields) ? raw.fields : {};
  for (const f of FIELD_IDS) {
    const sel = fields[f];
    if (!isObj(sel)) continue;
    const id = typeof sel.id === 'string' ? sel.id : null;
    const migrated = id ? migrateId(f, id) : null;
    if (id && !optionOf(f, migrated)) { report.lostFields.push({ field: f, id }); continue; }
    base.fields[f] = {
      id: migrated,
      source: sel.source === 'manual' || sel.source === 'preset' ? sel.source : 'random',
      locked: sel.locked === true
    };
  }
  const st = isObj(raw.settings) ? raw.settings : {};
  const s = base.settings;
  if (['coherent', 'balanced', 'wild'].includes(st.coherence as string)) s.coherence = st.coherence as typeof s.coherence;
  if (['pixai', 'novelai', 'genericTags', 'naturalEnglish', 'japanese'].includes(st.outputTarget as string)) s.outputTarget = st.outputTarget as typeof s.outputTarget;
  s.seed = str(st.seed, 64);
  if (typeof st.keepRecentCount === 'number' && st.keepRecentCount >= 0 && st.keepRecentCount <= 50) s.keepRecentCount = Math.round(st.keepRecentCount);
  for (const k of ['compact', 'negative', 'quality', 'emphasis'] as const) if (typeof st[k] === 'boolean') s[k] = st[k] as boolean;
  s.freeTags = str(st.freeTags, 4000);
  s.loraText = str(st.loraText, 1000);
  if (st.boyTag === 'none' || st.boyTag === '1boy') s.boyTag = st.boyTag;
  const mods = isObj(raw.optionalModules) ? raw.optionalModules : {};
  for (const k of Object.keys(DEFAULT_MODULES) as Array<keyof typeof DEFAULT_MODULES>) if (typeof mods[k] === 'boolean') base.optionalModules[k] = mods[k] as boolean;
  migrateItemModules(base, mods, legacy);
  base.lastSeed = str(raw.lastSeed, 64);
  base.drawCount = typeof raw.drawCount === 'number' && raw.drawCount >= 0 ? Math.floor(raw.drawCount) : 0;
  if (typeof raw.dataVersion === 'string' && raw.dataVersion !== DATA_VERSION) report.notes.push(`辞書の版が異なります（保存時 ${str(raw.dataVersion, 20)} → 現在 ${DATA_VERSION}）。`);
  base.dataVersion = DATA_VERSION;
  base.schemaVersion = SCHEMA_VERSION;
  return base;
}

/** 候補IDの改名表（辞書を改訂したらここに追記する） */
const ID_RENAMES: Partial<Record<FieldId, Record<string, string>>> = {
  // 2026.10.5：SDXL で「下のボタンだけ外す」が描けなかったため統合
  disarray: { bottom_unbuttoned: 'midriff_peek' }
};
function migrateId(field: FieldId, id: string): string {
  return ID_RENAMES[field]?.[id] ?? id;
}

/** 欠けた項目があるか（復元後に抽選で埋める） */
export function missingFields(s: ForgeState): FieldId[] {
  return FIELD_IDS.filter((f) => !s.fields[f].id);
}

// ---------------- 現在の状態 ----------------
export function loadCurrent(): { state: ForgeState | null; report: MigrationReport } {
  const report: MigrationReport = { lostFields: [], notes: [] };
  const raw = read<unknown>(KEYS.current, null);
  if (raw === null) return { state: null, report };
  return { state: normalizeState(raw, report, 'current'), report };
}
export const saveCurrent = (s: ForgeState) => write(KEYS.current, s);

export const loadRecent = () => read<Record<string, string[]>>(KEYS.recent, {});
export const saveRecent = (r: Record<string, string[]>) => write(KEYS.recent, r);

// ---------------- お気に入り ----------------
function normalizeSaved(raw: unknown): SavedForge | null {
  if (!isObj(raw)) return null;
  const now = new Date().toISOString();
  return {
    id: str(raw.id, 80) || uid(),
    name: str(raw.name, 80) || '名もなき美青年',
    memo: str(raw.memo, 2000),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === 'string').map((t) => t.slice(0, 30)).slice(0, 10) : [],
    createdAt: str(raw.createdAt, 40) || now,
    updatedAt: str(raw.updatedAt, 40) || now,
    state: normalizeState(raw.state)
  };
}
export function listFavorites(): SavedForge[] {
  const raw = read<unknown[]>(KEYS.favorites, []);
  return (Array.isArray(raw) ? raw : []).map(normalizeSaved).filter((x): x is SavedForge => !!x)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
function putFavorites(items: SavedForge[]): boolean { return write(KEYS.favorites, items.slice(0, MAX_FAVORITES)); }

export function saveFavorite(state: ForgeState, name: string, memo = '', tags: string[] = []): { ok: boolean; item?: SavedForge; reason?: string } {
  const items = listFavorites();
  if (items.length >= MAX_FAVORITES) return { ok: false, reason: `お気に入りは${MAX_FAVORITES}件までです。不要なものを削除してください。` };
  const now = new Date().toISOString();
  const item: SavedForge = { id: uid(), name: name.trim().slice(0, 80) || '名もなき美青年', memo: memo.slice(0, 2000), tags: tags.slice(0, 10), createdAt: now, updatedAt: now, state: cloneState(state) };
  return putFavorites([item, ...items]) ? { ok: true, item } : { ok: false, reason: '保存領域が不足しています。履歴やお気に入りを整理してください。' };
}
export function updateFavorite(id: string, patch: Partial<Pick<SavedForge, 'name' | 'memo' | 'tags' | 'state'>>): boolean {
  const items = listFavorites();
  const i = items.findIndex((x) => x.id === id);
  if (i < 0) return false;
  items[i] = { ...items[i], ...patch, name: (patch.name ?? items[i].name).slice(0, 80) || '名もなき美青年', updatedAt: new Date().toISOString() };
  return putFavorites(items);
}
export function duplicateFavorite(id: string): SavedForge | null {
  const src = listFavorites().find((x) => x.id === id);
  if (!src) return null;
  const r = saveFavorite(src.state, `${src.name}（複製）`.slice(0, 80), src.memo, src.tags);
  return r.item ?? null;
}
export function deleteFavorite(id: string): boolean { return putFavorites(listFavorites().filter((x) => x.id !== id)); }

// ---------------- 履歴 ----------------
export function listHistory(): HistoryEntry[] {
  const raw = read<unknown[]>(KEYS.history, []);
  return (Array.isArray(raw) ? raw : []).filter(isObj).map((h) => ({ id: str(h.id, 80) || uid(), at: str(h.at, 40), title: str(h.title, 120), state: normalizeState(h.state) }));
}
export function pushHistory(state: ForgeState, title: string): void {
  const items = listHistory();
  const entry: HistoryEntry = { id: uid(), at: new Date().toISOString(), title, state: cloneState(state) };
  let next = [entry, ...items].slice(0, MAX_HISTORY);
  // 容量不足なら古いものから削って再試行
  while (!write(KEYS.history, next) && next.length > 5) next = next.slice(0, Math.floor(next.length / 2));
}
export function clearHistory(): void { write(KEYS.history, []); }

// ---------------- 全削除 ----------------
export function clearAll(): void {
  const s = store();
  if (!s) return;
  for (const k of Object.values(KEYS)) { try { s.removeItem(k); } catch { /* noop */ } }
}

// ---------------- JSON バックアップ ----------------
export interface Backup { app: string; type: 'bishounen-backup'; schemaVersion: number; dataVersion: string; exportedAt: string; current: ForgeState | null; favorites: SavedForge[]; history: HistoryEntry[]; sources: string }
export function exportBackup(current: ForgeState | null): string {
  const b: Backup = {
    app: APP_ID, type: 'bishounen-backup', schemaVersion: SCHEMA_VERSION, dataVersion: DATA_VERSION, exportedAt: new Date().toISOString(),
    current, favorites: listFavorites(), history: listHistory(),
    sources: 'Dictionary sources: see docs/SOURCE-AUDIT.md in https://github.com/nyuriwossan/bishounen-prompt-gacha'
  };
  return JSON.stringify(b, null, 2);
}
export function exportSingle(state: ForgeState, name: string): string {
  return JSON.stringify({ app: APP_ID, type: 'bishounen-single', schemaVersion: SCHEMA_VERSION, dataVersion: DATA_VERSION, exportedAt: new Date().toISOString(), name, state }, null, 2);
}

export interface ImportResult { ok: boolean; error?: string; current?: ForgeState; favoritesAdded: number; historyAdded: number; report: MigrationReport }
/** JSON を検証して取り込む。お気に入りは追加（重複IDはスキップ）。 */
export function importBackup(text: string, merge = true): ImportResult {
  const report: MigrationReport = { lostFields: [], notes: [] };
  const fail = (error: string): ImportResult => ({ ok: false, error, favoritesAdded: 0, historyAdded: 0, report });
  if (typeof text !== 'string' || !text.trim()) return fail('ファイルが空です。');
  if (text.length > MAX_IMPORT_BYTES) return fail('ファイルが大きすぎます（5MBまで）。');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return fail('JSONとして読み込めませんでした。'); }
  if (!isObj(raw) || raw.app !== APP_ID) return fail('美青年錬成ガチャのデータではありません。');
  if (raw.type === 'bishounen-single') {
    const st = normalizeState(raw.state, report);
    const name = str(raw.name, 80) || '読み込んだ美青年';
    const r = saveFavorite(st, name);
    return { ok: r.ok, error: r.reason, current: st, favoritesAdded: r.ok ? 1 : 0, historyAdded: 0, report };
  }
  if (raw.type !== 'bishounen-backup') return fail('対応していないデータの種類です。');
  const current = raw.current ? normalizeState(raw.current, report) : undefined;
  const favIn = Array.isArray(raw.favorites) ? raw.favorites.slice(0, MAX_FAVORITES * 2) : [];
  const existing = merge ? listFavorites() : [];
  const ids = new Set(existing.map((x) => x.id));
  const added: SavedForge[] = [];
  for (const f of favIn) {
    const n = normalizeSaved(f);
    if (!n || ids.has(n.id)) continue;
    n.state = normalizeState((f as Record<string, unknown>).state, report);
    ids.add(n.id); added.push(n);
  }
  const room = MAX_FAVORITES - existing.length;
  if (added.length > room) report.notes.push(`お気に入りの上限（${MAX_FAVORITES}件）を超えた${added.length - Math.max(0, room)}件は取り込みませんでした。`);
  const okFav = putFavorites([...added.slice(0, Math.max(0, room)), ...existing]);
  let historyAdded = 0;
  if (Array.isArray(raw.history)) {
    const hist = raw.history.filter(isObj).slice(0, MAX_HISTORY).map((h) => ({ id: str(h.id, 80) || uid(), at: str(h.at, 40), title: str(h.title, 120), state: normalizeState(h.state, report) }));
    const merged = [...listHistory(), ...hist].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_HISTORY);
    write(KEYS.history, merged); historyAdded = hist.length;
  }
  if (!okFav) return { ok: false, error: '保存領域が不足しています。', current, favoritesAdded: 0, historyAdded, report };
  return { ok: true, current, favoritesAdded: Math.min(added.length, Math.max(0, room)), historyAdded, report };
}

// ---------------- 共有URL（短い状態だけ） ----------------
/** 項目IDと固定状態だけを # 以降に入れる。個人の自由入力（自由タグ・LoRA・メモ）は含めない。 */
export function encodeShare(state: ForgeState): string {
  const pairs = FIELD_IDS.map((f) => {
    const sel = state.fields[f];
    return sel.id ? `${f}=${sel.id}${sel.locked ? '!' : ''}` : '';
  }).filter(Boolean);
  const m = state.optionalModules;
  const flags = [m.kemonoEnabled ? 'k' : '', m.backgroundEnabled ? 'b' : '', m.poseEnabled ? 'p' : '', m.facialHairEnabled ? 'f' : '', m.hairAccentEnabled ? 'h' : '', m.nameEnabled ? 'n' : '',
    m.glassesEnabled ? 'g' : '', m.marksEnabled ? 'x' : '', m.propEnabled ? 'o' : '', m.unlimitedEnabled ? 'u' : ''].join('');
  // v=2：眼鏡(g)・特徴(x)・持ち物(o) のスイッチを含む。v=1 は値から推定する
  const s = [`v=2`, `d=${DATA_VERSION}`, `m=${flags}`, `c=${state.settings.coherence}`, `seed=${state.lastSeed}`, ...pairs].join('&');
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeShare(code: string): { state: ForgeState | null; report: MigrationReport } {
  const report: MigrationReport = { lostFields: [], notes: [] };
  try {
    if (!code || code.length > 4000) return { state: null, report };
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const text = decodeURIComponent(escape(atob(b64 + '==='.slice((b64.length + 3) % 4))));
    const params = new URLSearchParams(text);
    const ver = params.get('v');
    if (ver !== '1' && ver !== '2') return { state: null, report };
    const s = emptyState();
    for (const f of FIELD_IDS) {
      const raw = params.get(f);
      if (!raw) continue;
      const locked = raw.endsWith('!');
      const id = locked ? raw.slice(0, -1) : raw;
      if (!optionOf(f, id)) { report.lostFields.push({ field: f, id }); continue; }
      s.fields[f] = { id, source: 'manual', locked };
    }
    const flags = params.get('m') ?? '';
    s.optionalModules = {
      kemonoEnabled: flags.includes('k'), backgroundEnabled: flags.includes('b'), poseEnabled: flags.includes('p'), facialHairEnabled: flags.includes('f'), hairAccentEnabled: flags.includes('h'), nameEnabled: flags.includes('n'),
      glassesEnabled: flags.includes('g'), marksEnabled: flags.includes('x'), propEnabled: flags.includes('o'), unlimitedEnabled: flags.includes('u')
    };
    if (ver === '1') migrateItemModules(s, {}, 'preserve');
    const c = params.get('c');
    if (c === 'coherent' || c === 'balanced' || c === 'wild') s.settings.coherence = c;
    s.lastSeed = (params.get('seed') ?? '').slice(0, 64);
    s.settings = { ...DEFAULT_SETTINGS, coherence: s.settings.coherence };
    return { state: s, report };
  } catch {
    return { state: null, report };
  }
}
