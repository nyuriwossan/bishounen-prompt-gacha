/* 辞書・抽選設定（個人の好み）
 * - 候補ごとの「抽選から除外」と、項目ごとの「この項目を使わない（OFF）」。
 * - 錬成結果（ForgeState）には入れない。戻す／進む・お気に入り・履歴・共有URLの対象外で、端末内に別に保存する（storage.ts）。
 * - 除外は自動の抽選だけを制限する。手で選ぶこと・固定中の値・保存済みの結果は変えない。
 * - 任意モジュール（眼鏡・背景・獣人・禁断など）のON/OFFは既存のスイッチ（ForgeState.optionalModules）をそのまま使う。
 *   ここで持つOFFは、モジュールを持たない項目（髪型・衣装など）だけ。
 * - 未設定（除外なし・OFFなし）なら、抽選・出力は従来と完全に同じ。
 */
import { DATA_VERSION, fieldDef, FIELDS } from '../data/fields';
import type { FieldId, Option } from '../types';

export const PREFS_VERSION = 1;

export interface DrawPrefs {
  version: number;
  /** 項目ごとの、抽選から除外した候補ID。辞書に新しく足された候補は自動で抽選対象になる */
  excluded: Partial<Record<FieldId, string[]>>;
  /** 使わない（抽選も出力もしない）項目。モジュールを持たない項目だけ */
  disabled: FieldId[];
}

export const emptyPrefs = (): DrawPrefs => ({ version: PREFS_VERSION, excluded: {}, disabled: [] });

/** OFFにできない項目と理由（アプリの基本条件・他項目の判定の土台） */
export const REQUIRED_FIELDS: Partial<Record<FieldId, string>> = {
  age: '成人であることを示す基本の項目のため、OFFにできません。候補の除外はできます（成人の範囲は変わりません）。',
  archetype: '美形の軸となる基本の項目のため、OFFにできません。候補の除外はできます。',
  shot: '衣装の見える範囲とポーズの判定に使うため、OFFにできません。候補の除外はできます。'
};

/** 他の項目に連動してOFFになる項目（衣装を使わないなら、衣装の色・文化の意匠・着崩し・衣装の状態も出さない。
 * 文化・意匠モチーフは衣装・装飾の意匠にだけ反映する項目のため） */
export const DISABLED_WITH: Partial<Record<FieldId, FieldId>> = {
  mainColor: 'outfit', accentColor: 'outfit', culture: 'outfit', disarray: 'outfit', wear1: 'outfit', wear2: 'outfit'
};

/** 自動の抽選で選ばれる項目か（画風は手で選ぶ設定値なので、除外設定の対象外） */
export const isRandomField = (f: FieldId) => fieldDef(f).randomizable !== false;

/** 項目単位でOFFにできる項目：モジュールを持たず、自動で抽選され、必須でない */
export const OFFABLE_FIELDS: FieldId[] = FIELDS.filter((d) => !d.module && d.randomizable !== false && !REQUIRED_FIELDS[d.id]).map((d) => d.id);

let current: DrawPrefs = emptyPrefs();
let excludedSets = new Map<FieldId, Set<string>>();
let disabledSet = new Set<FieldId>();

/** 抽選エンジンが参照する現在の設定を差し替える（UI の起動時・変更時、テスト） */
export function setDrawPrefs(p: DrawPrefs | null | undefined): void {
  current = p ? clonePrefs(p) : emptyPrefs();
  excludedSets = new Map(Object.entries(current.excluded).map(([f, ids]) => [f as FieldId, new Set(ids)]));
  disabledSet = new Set(current.disabled.filter((f) => OFFABLE_FIELDS.includes(f)));
}
export function getDrawPrefs(): DrawPrefs { return clonePrefs(current); }
export function clonePrefs(p: DrawPrefs): DrawPrefs {
  return { version: p.version, excluded: Object.fromEntries(Object.entries(p.excluded).map(([f, ids]) => [f, [...(ids ?? [])]])), disabled: [...p.disabled] };
}

/** その候補を自動の抽選から除外しているか */
export function isExcluded(field: FieldId, id: string | null | undefined): boolean {
  return !!id && !!excludedSets.get(field)?.has(id);
}
/** 項目を個人設定でOFFにしているか（衣装に連動する項目も含む） */
export function isPrefOff(field: FieldId): boolean {
  if (disabledSet.has(field)) return true;
  const parent = DISABLED_WITH[field];
  return !!parent && disabledSet.has(parent);
}
/** 項目そのもののOFFスイッチ（連動を除く） */
export const isDisabledField = (field: FieldId) => disabledSet.has(field);

/** 候補の requires が、個人設定でOFFの項目を前提にしているか（例：髪の色OFFなら「黒髪クール」、衣装OFFなら「ネクタイを緩める」）。
 * OFFの項目は出力されないため、それを前提にする候補は自動の抽選に出さず、手でも選べないようにする（ONにすると選べる） */
export function requiresOffFields(o: Option): FieldId[] {
  if (!o.requires || !disabledSet.size) return [];
  return [...new Set(o.requires.map((r) => r.slice(0, r.indexOf(':')) as FieldId).filter((g) => isPrefOff(g)))];
}

/** 自動の抽選で使ってよい候補（除外とOFF前提を外す）。未設定ならそのまま返す */
export function allowedOf(field: FieldId, options: Option[]): Option[] {
  if (!excludedSets.get(field)?.size && !disabledSet.size) return options;
  return options.filter((o) => !isExcluded(field, o.id) && requiresOffFields(o).length === 0);
}

/** 設定が初期状態から変わっているか */
export function hasPrefs(p: DrawPrefs = current): boolean {
  return p.disabled.length > 0 || Object.values(p.excluded).some((ids) => (ids?.length ?? 0) > 0);
}

/** 辞書に存在する除外IDの数（削除された候補の未知IDは数えない） */
export function excludedCount(field: FieldId, p: DrawPrefs = current): number {
  const ids = new Set(p.excluded[field] ?? []);
  return fieldDef(field).options.filter((o) => ids.has(o.id)).length;
}

// ---------------- 辞書の更新（2026-10-22 の増築から）----------------
/* 除外は「除外したIDだけ」を保存するので、辞書に足した候補は自動で抽選対象になる。
 * 既存の除外は勝手に変えず、更新を知らせて、利用者が「今回追加した候補だけ除外／戻す」を選べるようにする。
 * 新しい任意項目（年齢の表れ・視線など）は既定OFFのスイッチで管理するので、ここでは扱わない。 */

/** 増築前からある項目（この版で項目ごと新しく足したものを除く） */
const isOldField = (f: FieldId) => fieldDef(f).options.some((o) => !o.since);
/** その版で足した候補のID（「なし」を除く。項目ごと新しい項目は対象外） */
export function addedOptionIds(field: FieldId, version = DATA_VERSION): string[] {
  if (!isOldField(field)) return [];
  return fieldDef(field).options.filter((o) => o.since === version && o.id !== 'none').map((o) => o.id);
}
/** その版で候補を足した項目と件数 */
export function addedFields(version = DATA_VERSION): Array<{ field: FieldId; count: number }> {
  return FIELDS.map((d) => ({ field: d.id, count: addedOptionIds(d.id, version).length })).filter((x) => x.count > 0 && isRandomField(x.field));
}
/** 除外設定のある項目のうち、その版で候補が足された項目（新しい候補が、除外の設定に関係なく抽選対象になっている項目） */
export function addedIntoExcluded(p: DrawPrefs, version = DATA_VERSION): Array<{ field: FieldId; count: number; allowed: number }> {
  return addedFields(version).filter((x) => (p.excluded[x.field]?.length ?? 0) > 0).map((x) => {
    const ex = new Set(p.excluded[x.field] ?? []);
    return { ...x, allowed: addedOptionIds(x.field, version).filter((id) => !ex.has(id)).length };
  }).filter((x) => x.allowed > 0);
}
/** その版で足した候補を、まとめて抽選から除外する（fields を省くと候補を足したすべての項目） */
export function excludeAdded(p: DrawPrefs, fields?: FieldId[], version = DATA_VERSION): DrawPrefs {
  const next = clonePrefs(p);
  for (const { field } of addedFields(version)) {
    if (fields && !fields.includes(field)) continue;
    next.excluded[field] = [...new Set([...(next.excluded[field] ?? []), ...addedOptionIds(field, version)])];
  }
  return next;
}
/** その版で足した候補を、まとめて抽選対象に戻す */
export function includeAdded(p: DrawPrefs, fields?: FieldId[], version = DATA_VERSION): DrawPrefs {
  const next = clonePrefs(p);
  for (const { field } of addedFields(version)) {
    if (fields && !fields.includes(field)) continue;
    const added = new Set(addedOptionIds(field, version));
    const rest = (next.excluded[field] ?? []).filter((id) => !added.has(id));
    if (rest.length) next.excluded[field] = rest; else delete next.excluded[field];
  }
  return next;
}
