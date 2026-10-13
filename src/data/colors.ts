/* 衣装の色彩設計（メインカラー・差し色）。
 * outfit-prompt-workshop の colors 128色（hex・系統・トーン・ムード付き）を移植。
 */
import type { Category, Option } from '../types';
import cpw from './imported/cpw.json';

type CpwColor = { id: string; ja: string; en: string; hex: string; family: string; tone: string; temperature: string; moods?: string[] };

const toneWeight: Record<string, number> = { dark: 1.4, deep: 1.3, muted: 1.1, pale: 0.9, bright: 0.9, vivid: 0.8 };
export const COLOR: Option[] = (cpw.colors as CpwColor[]).map((c) => ({
  id: c.id,
  ja: c.ja,
  en: [c.en],
  hex: c.hex,
  cat: c.family,
  sub: c.tone,
  w: (toneWeight[c.tone] ?? 1) * (['black', 'white', 'metal'].includes(c.family) ? 1.3 : 1),
  tags: [c.family, c.tone, c.temperature, ...(c.moods || [])],
  src: 'cpw:colors'
}));

export const COLOR_CATS: Category[] = [
  { id: 'black', ja: '黒' }, { id: 'white', ja: '白' }, { id: 'metal', ja: '金属色' }, { id: 'gem', ja: '宝石色' },
  { id: 'red', ja: '赤' }, { id: 'pink', ja: '桃' }, { id: 'orange', ja: '橙' }, { id: 'yellow', ja: '黄' },
  { id: 'yellow_green', ja: '黄緑' }, { id: 'green', ja: '緑' }, { id: 'cyan', ja: '青緑' }, { id: 'blue', ja: '青' },
  { id: 'purple', ja: '紫' }, { id: 'brown', ja: '茶' }
];
