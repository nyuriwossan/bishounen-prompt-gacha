import type { Option } from '../types';

/** 候補を1行で書くための小さな関数。en は「, 」区切りでタグに分割する。 */
export function o(id: string, ja: string, en: string | string[], extra: Partial<Option> = {}): Option {
  const tags = Array.isArray(en) ? en : en.split(/\s*,\s*/).filter(Boolean);
  return { id, ja, en: tags, ...extra };
}

/** 'a,b,c' → ['a','b','c'] */
export const list = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);

/** 2026-10 の大規模増築で足した辞書の版（fields.ts の DATA_VERSION と同じ値。テストで一致を検査） */
export const EXPANSION_VERSION = '2026.10.13';
/** 増築で足した候補に印を付ける（新しい候補の通知・「今回追加した候補だけ除外」に使う） */
export const added = (x: Option): Option => ({ ...x, since: EXPANSION_VERSION });
