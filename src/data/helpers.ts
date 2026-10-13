import type { Option } from '../types';

/** 候補を1行で書くための小さな関数。en は「, 」区切りでタグに分割する。 */
export function o(id: string, ja: string, en: string | string[], extra: Partial<Option> = {}): Option {
  const tags = Array.isArray(en) ? en : en.split(/\s*,\s*/).filter(Boolean);
  return { id, ja, en: tags, ...extra };
}

/** 'a,b,c' → ['a','b','c'] */
export const list = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);
