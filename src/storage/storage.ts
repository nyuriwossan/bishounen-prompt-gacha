/* 端末内保存：自動保存・お気に入り・履歴・JSONバックアップ・共有URL
 * 正本は「選択ID＋固定状態＋設定」。生成済みの文章は保存しない（辞書の修正に追従できる）。
 * 壊れたJSON・古い版・削除された候補IDでもアプリを落とさず、復元できなかった項目を返す。
 * 参考：creative-idea-gacha（保存件数・容量上限・型検証）、character-appearance（選択IDを正本にする方針）
 */
import { DATA_VERSION, optionOf } from '../data/fields';
import { isCosplay } from '../data/outfits';
import { emptyPrefs, OFFABLE_FIELDS, PREFS_VERSION, type DrawPrefs } from '../engine/prefs';
import { cloneState, DEFAULT_MODULES, DEFAULT_SETTINGS, emptyState, EXPANSION_FIELDS, SCHEMA_VERSION } from '../engine/state';
import { FIELD_IDS, type FieldId, type ForgeModules, type ForgeState } from '../types';

export const APP_ID = 'bishounen-prompt-gacha';
export const KEYS = {
  current: 'bpg:v1:current', favorites: 'bpg:v1:favorites', history: 'bpg:v1:history', recent: 'bpg:v1:recent', ui: 'bpg:v1:ui',
  /** 以前の履歴：通常の履歴（50件）に入りきらない分（JSON読込のはみ出しなど）を保護する場所 */
  historyLegacy: 'bpg:v1:historyLegacy',
  /** 着せ替え中の元の人物（派生として保存するときの元） */
  wardrobe: 'bpg:v1:wardrobe'
} as const;
/** 辞書・抽選設定（個人の好み）。「保存データをすべて削除」の対象外にするため KEYS とは分ける */
export const PREFS_KEY = 'bpg:v1:drawPrefs';
/** 辞書の更新のお知らせを確認した版（2026-10-22 追加）。「保存データをすべて削除」の対象外 */
export const DICT_SEEN_KEY = 'bpg:v1:dictSeen';
export function loadDictSeen(): string | null {
  try { const v = store()?.getItem(DICT_SEEN_KEY); return typeof v === 'string' ? v.slice(0, 40) : null; } catch { return null; }
}
export function saveDictSeen(version: string): boolean {
  try { store()?.setItem(DICT_SEEN_KEY, version); return true; } catch { return false; }
}
export const MAX_FAVORITES = 300;
/** 通常の履歴は直近50件（2026-10-22 に一度10件にしたが、ユーザーの判断で50件に戻した） */
export const MAX_HISTORY = 50;
/** 「以前の履歴」の上限 */
export const MAX_LEGACY_HISTORY = 100;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface SavedForge {
  id: string;
  name: string;
  memo: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  state: ForgeState;
  /** 派生の場合、元キャラ（ルート）のお気に入りID。元キャラ・独立した保存では無し。
   * 派生は参照だけでなく state に単独で復元できる全設定を持つ。元を編集しても派生は変わらない */
  rootId?: string;
}
export interface HistoryEntry {
  id: string; at: string; title: string; state: ForgeState;
  /** 着せ替え中だった場合の元キャラのお気に入りID（登録済みのときだけ） */
  baseId?: string;
}

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

/** 眼鏡・特徴・持ち物のスイッチ（2026-10 追加）と、2026-10-22 増築の任意項目。これより前のデータにはキーがない。
 * 増築の項目は旧データでは値も「なし」なので、どちらの移行方針でもOFFになる（開いただけで顔・髪・衣装が変わらない） */
const ITEM_MODULES = [['glassesEnabled', 'glasses'], ['marksEnabled', 'marks'], ['propEnabled', 'prop'],
  ['ageCueEnabled', 'ageCue'], ['hairTextureEnabled', 'hairTexture'], ['fringeEnabled', 'fringe'], ['gazeEnabled', 'gaze'], ['headPoseEnabled', 'headPose'],
  ['outfitDetailEnabled', 'outfitDetail'], ['fabricEnabled', 'fabric']] as const;
/** 共有URLの任意スイッチの文字（v=2）。増築の項目は a/t/r/z/e/d/q。文字が無ければOFF（旧いURLはすべてOFF） */
const SHARE_FLAGS: Array<[keyof ForgeModules, string]> = [
  ['kemonoEnabled', 'k'], ['backgroundEnabled', 'b'], ['poseEnabled', 'p'], ['facialHairEnabled', 'f'], ['hairAccentEnabled', 'h'], ['nameEnabled', 'n'],
  ['glassesEnabled', 'g'], ['marksEnabled', 'x'], ['propEnabled', 'o'], ['unlimitedEnabled', 'u'], ['cosplayEnabled', 'y'],
  ['ageCueEnabled', 'a'], ['hairTextureEnabled', 't'], ['fringeEnabled', 'r'], ['gazeEnabled', 'z'], ['headPoseEnabled', 'e'], ['outfitDetailEnabled', 'd'], ['fabricEnabled', 'q']
];
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
  if (st.pixaiProfile === 'sdxl' || st.pixaiProfile === 'dit') s.pixaiProfile = st.pixaiProfile;
  if (st.novelaiProfile === 'v4' || st.novelaiProfile === 'v5') s.novelaiProfile = st.novelaiProfile;
  const mods = isObj(raw.optionalModules) ? raw.optionalModules : {};
  for (const k of Object.keys(DEFAULT_MODULES) as Array<keyof typeof DEFAULT_MODULES>) if (typeof mods[k] === 'boolean') base.optionalModules[k] = mods[k] as boolean;
  migrateItemModules(base, mods, legacy);
  // コスプレ衣装なのにスイッチの記録がなければONにする（見た目を保つ）
  if (typeof mods.cosplayEnabled !== 'boolean' && isCosplay(optionOf('outfit', base.fields.outfit.id))) base.optionalModules.cosplayEnabled = true;
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
  disarray: { bottom_unbuttoned: 'midriff_peek' },
  // 2026.10.10：肘掛けへの固定を、椅子の背もたれへの縛りつけに置き換え
  bindPos: { armrests: 'chair_back' }
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

// ---------------- 辞書・抽選設定 ----------------
/** 1項目あたりの除外IDの上限（壊れたデータで膨らまないように） */
const MAX_EXCLUDED_PER_FIELD = 2000;
/**
 * 設定を検証して正規化する。
 * - 候補は配列の位置ではなく ID で持つ。改名した ID は新しい ID へ読み替える。
 * - 辞書から消えた候補の未知IDはそのまま保持するが、数えず・使わない（エラーにしない）。
 * - 形が壊れていれば、この設定だけを初期化する（ok=false）。お気に入り・履歴には触れない。
 */
export function normalizePrefs(raw: unknown): { prefs: DrawPrefs; ok: boolean; notes: string[] } {
  const notes: string[] = [];
  if (raw === null || raw === undefined) return { prefs: emptyPrefs(), ok: true, notes };
  if (!isObj(raw) || typeof raw.version !== 'number' || (raw.excluded !== undefined && !isObj(raw.excluded)) || (raw.disabled !== undefined && !Array.isArray(raw.disabled))) {
    return { prefs: emptyPrefs(), ok: false, notes: ['辞書・抽選設定の保存データが壊れていたため、この設定だけを初期状態に戻しました。お気に入りと履歴はそのままです。'] };
  }
  if (raw.version > PREFS_VERSION) notes.push('新しい版の辞書・抽選設定です。読めた範囲だけ使います。');
  const prefs = emptyPrefs();
  const excluded = isObj(raw.excluded) ? raw.excluded : {};
  for (const f of FIELD_IDS) {
    const ids = excluded[f];
    if (!Array.isArray(ids)) continue;
    const clean = [...new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 120).map((x) => migrateId(f, x)))].slice(0, MAX_EXCLUDED_PER_FIELD);
    if (clean.length) prefs.excluded[f] = clean;
  }
  const disabled = Array.isArray(raw.disabled) ? raw.disabled : [];
  prefs.disabled = [...new Set(disabled.filter((x): x is FieldId => typeof x === 'string' && OFFABLE_FIELDS.includes(x as FieldId)))];
  return { prefs, ok: true, notes };
}
export function loadPrefs(): { prefs: DrawPrefs; ok: boolean; notes: string[] } {
  let raw: unknown = null;
  try {
    const text = store()?.getItem(PREFS_KEY);
    raw = text ? JSON.parse(text) : null;
  } catch {
    return { prefs: emptyPrefs(), ok: false, notes: ['辞書・抽選設定の保存データが読めなかったため、この設定だけを初期状態に戻しました。お気に入りと履歴はそのままです。'] };
  }
  return normalizePrefs(raw);
}
/** 保存。保存できない（容量不足・ブラウザの保存が使えない）ときは false。成功したとは表示しない */
export function savePrefs(p: DrawPrefs): boolean {
  const st = store();
  if (!st) return false;
  try { st.setItem(PREFS_KEY, JSON.stringify({ version: PREFS_VERSION, excluded: p.excluded, disabled: p.disabled })); return true; } catch { return false; }
}

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
    state: normalizeState(raw.state),
    ...(str(raw.rootId, 80) ? { rootId: str(raw.rootId, 80) } : {})
  };
}
export function listFavorites(): SavedForge[] {
  const raw = read<unknown[]>(KEYS.favorites, []);
  const items = (Array.isArray(raw) ? raw : []).map(normalizeSaved).filter((x): x is SavedForge => !!x)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  // 元キャラが見つからない派生（削除済み・未知のID）は、独立した保存結果として扱う
  const ids = new Set(items.map((x) => x.id));
  return items.map((x) => (x.rootId && (!ids.has(x.rootId) || x.rootId === x.id) ? withoutRoot(x) : x));
}
function withoutRoot(x: SavedForge): SavedForge { const { rootId: _r, ...rest } = x; void _r; return rest; }
/** 元キャラの派生（新しい順） */
export function derivativesOf(rootId: string, items: SavedForge[] = listFavorites()): SavedForge[] {
  return items.filter((x) => x.rootId === rootId);
}
/** 派生の元キャラのID。派生から派生を作っても、ルートの元キャラに紐づける（入れ子にしない） */
export function rootIdOf(item: SavedForge): string { return item.rootId ?? item.id; }
function putFavorites(items: SavedForge[]): boolean { return write(KEYS.favorites, items.slice(0, MAX_FAVORITES)); }

const FULL_REASON = `お気に入りは${MAX_FAVORITES}件までです。不要なものを削除してください。`;
const SPACE_REASON = '保存領域が不足しています。履歴やお気に入りを整理するか、全データをJSONで書き出してください。今の結果は画面に残っています。';
function makeFavorite(state: ForgeState, name: string, memo = '', tags: string[] = [], rootId?: string): SavedForge {
  const now = new Date().toISOString();
  return { id: uid(), name: name.trim().slice(0, 80) || '名もなき美青年', memo: memo.slice(0, 2000), tags: tags.slice(0, 10), createdAt: now, updatedAt: now, state: cloneState(state), ...(rootId ? { rootId } : {}) };
}
export function saveFavorite(state: ForgeState, name: string, memo = '', tags: string[] = [], opts: { rootId?: string } = {}): { ok: boolean; item?: SavedForge; reason?: string } {
  const items = listFavorites();
  if (items.length >= MAX_FAVORITES) return { ok: false, reason: FULL_REASON };
  // 派生の元は、ルートの元キャラにそろえる（元が見つからなければ独立した保存にする）
  const parent = opts.rootId ? items.find((x) => x.id === opts.rootId) : undefined;
  const item = makeFavorite(state, name, memo, tags, parent ? rootIdOf(parent) : undefined);
  return putFavorites([item, ...items]) ? { ok: true, item } : { ok: false, reason: SPACE_REASON };
}
/** 元の人物と派生を、まとめて保存する（片方だけ保存される状態にしない）。空きが2件ないときは何も保存しない */
export function saveFavoritePair(base: { state: ForgeState; name: string }, derived: { state: ForgeState; name: string; memo?: string; tags?: string[] }): { ok: boolean; base?: SavedForge; derived?: SavedForge; reason?: string } {
  const items = listFavorites();
  if (items.length + 2 > MAX_FAVORITES) return { ok: false, reason: `元の人物と派生の2件を保存する空きがありません（お気に入りは${MAX_FAVORITES}件まで、現在${items.length}件）。` };
  const b = makeFavorite(base.state, base.name);
  const d = makeFavorite(derived.state, derived.name, derived.memo, derived.tags, b.id);
  // 派生を先頭に、その次に元（どちらも新しいので一覧の上に並ぶ）
  d.updatedAt = new Date(Date.parse(b.updatedAt) + 1).toISOString();
  return putFavorites([d, b, ...items]) ? { ok: true, base: b, derived: d } : { ok: false, reason: SPACE_REASON };
}
/** 派生の紐づけを外し、別キャラ（独立した保存）にする */
export function unlinkFavorite(id: string): boolean {
  const items = listFavorites();
  const i = items.findIndex((x) => x.id === id);
  if (i < 0 || !items[i].rootId) return false;
  items[i] = withoutRoot(items[i]);
  return putFavorites(items);
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
  // 派生の複製は同じ元キャラの派生に、元キャラの複製は独立した保存にする
  const r = saveFavorite(src.state, `${src.name}（複製）`.slice(0, 80), src.memo, src.tags, { rootId: src.rootId });
  return r.item ?? null;
}
/** 削除。元キャラを消しても派生は消さず、独立した保存結果として残す */
export function deleteFavorite(id: string): boolean {
  return putFavorites(listFavorites().filter((x) => x.id !== id).map((x) => (x.rootId === id ? withoutRoot(x) : x)));
}

// ---------------- 履歴 ----------------
function normalizeHistory(h: Record<string, unknown>, report?: MigrationReport): HistoryEntry {
  return { id: str(h.id, 80) || uid(), at: str(h.at, 40), title: str(h.title, 120), state: normalizeState(h.state, report), ...(str(h.baseId, 80) ? { baseId: str(h.baseId, 80) } : {}) };
}
function readHistory(key: string): HistoryEntry[] {
  const raw = read<unknown[]>(key, []);
  return (Array.isArray(raw) ? raw : []).filter(isObj).map((h) => normalizeHistory(h));
}
/** 通常の履歴（新しい順・最大50件）。表示用 */
export function listHistory(): HistoryEntry[] { return readHistory(KEYS.history).slice(0, MAX_HISTORY); }
/** 以前の履歴（通常の50件に入りきらない分）。書き出し・お気に入り保存・削除ができる */
export function listLegacyHistory(): HistoryEntry[] { return readHistory(KEYS.historyLegacy); }

/**
 * 起動時の履歴の整理。通常の履歴（50件）と以前の履歴を、新しい順に並べ直して振り分ける。
 * - 通常の履歴に空きがあれば、以前の履歴の新しいものから戻す（10件版を開いたとき「以前の履歴」へ移った11〜50件目を、通常の履歴へ戻す）
 * - 通常の履歴が50件を超えていれば、超過分を黙って捨てず「以前の履歴」へ移す
 * 何度呼んでも同じ結果になる。restored は通常の履歴へ戻した件数、moved は以前の履歴へ移した件数。
 * 書き込みは「増える側」を先に行い、途中で失敗しても履歴が消えないようにする。
 */
export function migrateHistory(): { restored: number; moved: number } {
  const normal = readHistory(KEYS.history);
  const legacy = listLegacyHistory();
  const none = { restored: 0, moved: 0 };
  if (normal.length <= MAX_HISTORY && (!legacy.length || normal.length >= MAX_HISTORY)) return none;
  const seen = new Set<string>();
  const all = [...normal, ...legacy].filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true))).sort((a, b) => b.at.localeCompare(a.at));
  const nextNormal = all.slice(0, MAX_HISTORY);
  const nextLegacy = all.slice(MAX_HISTORY, MAX_HISTORY + MAX_LEGACY_HISTORY);
  const normalIds = new Set(normal.map((h) => h.id));
  const restored = nextNormal.filter((h) => !normalIds.has(h.id)).length;
  const moved = normal.filter((h) => !nextNormal.some((x) => x.id === h.id)).length;
  if (restored) {
    // 通常の履歴を先に増やし、成功したら以前の履歴から外す（失敗しても両方に残るだけで消えない）
    if (!write(KEYS.history, nextNormal)) return none;
    if (!write(KEYS.historyLegacy, nextLegacy)) return { restored, moved: 0 };
  } else {
    if (!write(KEYS.historyLegacy, nextLegacy)) return none;
    if (!write(KEYS.history, nextNormal)) return none;
  }
  return { restored, moved };
}
export function deleteLegacyHistory(id: string): boolean { return write(KEYS.historyLegacy, listLegacyHistory().filter((h) => h.id !== id)); }
export function clearLegacyHistory(): boolean { return write(KEYS.historyLegacy, []); }

/** 結果として同じか（項目の値と任意モードの状態。固定・出所・シード・錬成番号は比べない） */
export function sameResult(a: ForgeState, b: ForgeState): boolean {
  return FIELD_IDS.every((f) => (a.fields[f].id ?? null) === (b.fields[f].id ?? null))
    && (Object.keys(DEFAULT_MODULES) as Array<keyof typeof DEFAULT_MODULES>).every((k) => a.optionalModules[k] === b.optionalModules[k]);
}

function historyEntry(state: ForgeState, title: string, at: Date, baseId?: string): HistoryEntry {
  return { id: uid(), at: at.toISOString(), title, state: cloneState(state), ...(baseId ? { baseId } : {}) };
}
function putHistory(next: HistoryEntry[]): boolean {
  let list = next.slice(0, MAX_HISTORY);
  // 容量不足なら古いものから削って再試行（最後の1件まで）
  while (!write(KEYS.history, list)) {
    if (list.length <= 1) return false;
    list = list.slice(0, Math.ceil(list.length / 2));
  }
  return true;
}
/**
 * 確定した結果を履歴へ記録する（成功した抽選・衣装の採用のときだけ呼ぶ）。
 * - 置き換える前の結果（prev）が最新の履歴と違えば、先に退避する（初期結果・手で編集した結果を失わない）
 * - 最新の履歴と同じ結果は追加しない（直前と異なれば、過去と同じ結果でも記録する）
 * - 最終的に最新50件に収める
 * 戻り値：保存に成功したか（記録が不要だった場合も true）
 */
export function recordHistory(prev: ForgeState | null, next: ForgeState, titleOf: (s: ForgeState) => string, opts: { prevBaseId?: string; nextBaseId?: string } = {}): boolean {
  const items = listHistory();
  const now = Date.now();
  const add: HistoryEntry[] = [];
  let latest = items[0]?.state ?? null;
  if (prev && !sameResult(prev, next) && (!latest || !sameResult(latest, prev))) {
    add.push(historyEntry(prev, titleOf(prev), new Date(now - 1), opts.prevBaseId));
    latest = prev;
  }
  if (!latest || !sameResult(latest, next)) add.unshift(historyEntry(next, titleOf(next), new Date(now), opts.nextBaseId));
  if (!add.length) return true;
  return putHistory([...add, ...items]);
}
/** 互換用：結果を1件そのまま記録する（退避・重複判定なし） */
export function pushHistory(state: ForgeState, title: string): boolean {
  return putHistory([historyEntry(state, title, new Date()), ...listHistory()]);
}
export function clearHistory(): void { write(KEYS.history, []); }

// ---------------- 着せ替えの元 ----------------
/** 着せ替え中の元の人物。baseId は登録済みの元キャラ（お気に入り）のID。base は着せ替えを始めた時点の結果（衣装を変える前） */
export interface WardrobeSession { baseId?: string; baseName?: string; base: ForgeState }
export function loadWardrobeSession(): WardrobeSession | null {
  const raw = read<unknown>(KEYS.wardrobe, null);
  if (!isObj(raw) || !isObj(raw.base)) return null;
  return { base: normalizeState(raw.base), ...(str(raw.baseId, 80) ? { baseId: str(raw.baseId, 80) } : {}), ...(str(raw.baseName, 80) ? { baseName: str(raw.baseName, 80) } : {}) };
}
export function saveWardrobeSession(s: WardrobeSession | null): boolean {
  if (!s) { try { store()?.removeItem(KEYS.wardrobe); return true; } catch { return false; } }
  return write(KEYS.wardrobe, s);
}

// ---------------- 全削除 ----------------
export function clearAll(): void {
  const s = store();
  if (!s) return;
  for (const k of Object.values(KEYS)) { try { s.removeItem(k); } catch { /* noop */ } }
}

// ---------------- JSON バックアップ ----------------
export interface Backup {
  app: string; type: 'bishounen-backup'; schemaVersion: number; dataVersion: string; exportedAt: string; current: ForgeState | null; favorites: SavedForge[]; history: HistoryEntry[]; sources: string;
  /** 辞書・抽選設定（2026-10 追加。古いJSONには無い） */ drawPrefs?: DrawPrefs;
  /** 以前の履歴（2026-10-22 追加） */ historyLegacy?: HistoryEntry[];
}
export function exportBackup(current: ForgeState | null, prefs: DrawPrefs = loadPrefs().prefs): string {
  const b: Backup = {
    app: APP_ID, type: 'bishounen-backup', schemaVersion: SCHEMA_VERSION, dataVersion: DATA_VERSION, exportedAt: new Date().toISOString(),
    current, favorites: listFavorites(), history: listHistory(), historyLegacy: listLegacyHistory(), drawPrefs: { version: PREFS_VERSION, excluded: prefs.excluded, disabled: prefs.disabled },
    sources: 'Dictionary sources: see docs/SOURCE-AUDIT.md in https://github.com/nyuriwossan/bishounen-prompt-gacha'
  };
  return JSON.stringify(b, null, 2);
}
/** 以前の履歴だけを書き出す（全データJSONと同じ形式。読み込むときは「履歴も復元する」で戻せる） */
export function exportLegacyHistory(): string {
  const b: Backup = {
    app: APP_ID, type: 'bishounen-backup', schemaVersion: SCHEMA_VERSION, dataVersion: DATA_VERSION, exportedAt: new Date().toISOString(),
    current: null, favorites: [], history: listLegacyHistory(), sources: 'Dictionary sources: see docs/SOURCE-AUDIT.md in https://github.com/nyuriwossan/bishounen-prompt-gacha'
  };
  return JSON.stringify(b, null, 2);
}
export function exportSingle(state: ForgeState, name: string): string {
  return JSON.stringify({ app: APP_ID, type: 'bishounen-single', schemaVersion: SCHEMA_VERSION, dataVersion: DATA_VERSION, exportedAt: new Date().toISOString(), name, state }, null, 2);
}

export interface ImportResult {
  ok: boolean; error?: string; current?: ForgeState; favoritesAdded: number; historyAdded: number; report: MigrationReport;
  /** 履歴の読み込みで、通常の50件からはみ出して「以前の履歴」へ入れた件数 */
  historyToLegacy?: number;
  /** ファイルに辞書・抽選設定が含まれていたときだけ、その内容（取り込むかは呼び出し側が利用者に確認して決める。ここでは保存しない） */
  drawPrefs?: DrawPrefs;
}
/** 読み込む前の確認：辞書・抽選設定・履歴を含むバックアップか（含むときだけ「〜も復元する」を出す） */
export function backupContents(text: string): { prefs: boolean; history: number } {
  try {
    if (typeof text !== 'string' || text.length > MAX_IMPORT_BYTES) return { prefs: false, history: 0 };
    const raw = JSON.parse(text);
    if (!isObj(raw) || raw.app !== APP_ID || raw.type !== 'bishounen-backup') return { prefs: false, history: 0 };
    const n = (Array.isArray(raw.history) ? raw.history.length : 0) + (Array.isArray(raw.historyLegacy) ? raw.historyLegacy.length : 0);
    return { prefs: raw.drawPrefs !== undefined && raw.drawPrefs !== null, history: n };
  } catch { return { prefs: false, history: 0 } }
}
export const backupHasPrefs = (text: string) => backupContents(text).prefs;
/** JSON を検証して取り込む。
 * - お気に入りは追加。同じIDで同じ内容ならスキップし、内容が違えば新しいIDを振る。同じファイル内の元キャラ／派生の参照も付け替える
 * - 元キャラが見つからない派生（親のないファイル・未知のID）は、独立した保存結果として扱う
 * - 履歴は restoreHistory のときだけ取り込む（日時順に統合・同じIDは1件・通常は最新50件、はみ出しは「以前の履歴」へ）
 */
export function importBackup(text: string, opts: { restoreHistory?: boolean } = {}): ImportResult {
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
  const existing = listFavorites();
  const byId = new Map(existing.map((x) => [x.id, x]));
  const used = new Set(existing.map((x) => x.id));
  const added: SavedForge[] = [];
  /** ファイル内の旧ID → 取り込み後のID（同じ内容でスキップしたものは既存のID） */
  const idMap = new Map<string, string>();
  for (const f of favIn) {
    const n = normalizeSaved(f);
    if (!n) continue;
    n.state = normalizeState((f as Record<string, unknown>).state, report);
    const same = byId.get(n.id);
    if (same && same.name === n.name && sameResult(same.state, n.state)) { idMap.set(n.id, n.id); continue; }
    const fileId = n.id;
    if (used.has(n.id)) n.id = uid();
    idMap.set(fileId, n.id);
    used.add(n.id); added.push(n);
  }
  // 元キャラの参照を付け替える：同じファイル内 → 取り込み後のID、既存のお気に入り → そのまま、どちらにも無い → 独立した保存
  for (let i = 0; i < added.length; i++) {
    const r = added[i].rootId;
    if (!r) continue;
    const mapped = idMap.get(r) ?? (byId.has(r) ? r : undefined);
    added[i] = mapped && mapped !== added[i].id ? { ...added[i], rootId: mapped } : withoutRoot(added[i]);
  }
  const room = MAX_FAVORITES - existing.length;
  if (added.length > room) report.notes.push(`お気に入りの上限（${MAX_FAVORITES}件）を超えた${added.length - Math.max(0, room)}件は取り込みませんでした。`);
  const okFav = putFavorites([...added.slice(0, Math.max(0, room)), ...existing]);
  let historyAdded = 0, historyToLegacy = 0;
  if (opts.restoreHistory && (Array.isArray(raw.history) || Array.isArray(raw.historyLegacy))) {
    const take = (xs: unknown) => (Array.isArray(xs) ? xs : []).filter(isObj).slice(0, MAX_LEGACY_HISTORY).map((h) => normalizeHistory(h, report));
    const incoming = take(raw.history);
    const known = new Set([...readHistory(KEYS.history), ...listLegacyHistory()].map((h) => h.id));
    const fresh = incoming.filter((h) => !known.has(h.id));
    const merged = [...readHistory(KEYS.history), ...fresh].sort((a, b) => b.at.localeCompare(a.at));
    const legacyIn = [...merged.slice(MAX_HISTORY), ...take(raw.historyLegacy).filter((h) => !known.has(h.id))];
    const legacy = listLegacyHistory();
    const legacyIds = new Set(legacy.map((h) => h.id));
    const legacyAdd: HistoryEntry[] = [];
    for (const h of legacyIn) if (!legacyIds.has(h.id)) { legacyIds.add(h.id); legacyAdd.push(h); }
    // 読み込みは新しい抽選として記録しない（記録日時はファイルのまま）
    const okL = !legacyAdd.length || write(KEYS.historyLegacy, [...legacy, ...legacyAdd].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_LEGACY_HISTORY));
    const okH = okL && write(KEYS.history, merged.slice(0, MAX_HISTORY));
    if (okH) { historyAdded = fresh.length; historyToLegacy = legacyAdd.length; }
    else report.notes.push('履歴は保存領域が不足したため読み込めませんでした。');
  }
  let drawPrefs: DrawPrefs | undefined;
  if (raw.drawPrefs !== undefined && raw.drawPrefs !== null) {
    const p = normalizePrefs(raw.drawPrefs);
    if (p.ok) drawPrefs = p.prefs;
    else report.notes.push('ファイル内の辞書・抽選設定は形式が不正なため、読み込みませんでした。');
  }
  if (!okFav) return { ok: false, error: '保存領域が不足しています。', current, favoritesAdded: 0, historyAdded, historyToLegacy, report, drawPrefs };
  return { ok: true, current, favoritesAdded: Math.min(added.length, Math.max(0, room)), historyAdded, historyToLegacy, report, drawPrefs };
}

// ---------------- 共有URL（短い状態だけ） ----------------
/** 項目IDと固定状態だけを # 以降に入れる。個人の自由入力（自由タグ・LoRA・メモ）は含めない。 */
export function encodeShare(state: ForgeState): string {
  const pairs = FIELD_IDS.map((f) => {
    const sel = state.fields[f];
    // 増築の任意項目が「なし」（既定値）で固定もしていなければ省く（URLを短く保つ。読み込み側の既定も「なし」）
    if (EXPANSION_FIELDS.includes(f) && sel.id === 'none' && !sel.locked) return '';
    return sel.id ? `${f}=${sel.id}${sel.locked ? '!' : ''}` : '';
  }).filter(Boolean);
  const m = state.optionalModules;
  const flags = SHARE_FLAGS.map(([k, c]) => (m[k] ? c : '')).join('');
  // v=2：眼鏡(g)・特徴(x)・持ち物(o) のスイッチを含む。v=1 は値から推定する。コスプレ(y) は無ければOFF
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
    s.optionalModules = Object.fromEntries(SHARE_FLAGS.map(([k, c]) => [k, flags.includes(c)])) as unknown as ForgeModules;
    if (ver === '1') migrateItemModules(s, {}, 'preserve');
    if (!flags.includes('y') && isCosplay(optionOf('outfit', s.fields.outfit.id))) s.optionalModules.cosplayEnabled = true;
    const c = params.get('c');
    if (c === 'coherent' || c === 'balanced' || c === 'wild') s.settings.coherence = c;
    s.lastSeed = (params.get('seed') ?? '').slice(0, 64);
    s.settings = { ...DEFAULT_SETTINGS, coherence: s.settings.coherence };
    return { state: s, report };
  } catch {
    return { state: null, report };
  }
}
