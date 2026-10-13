/* シード付き擬似乱数
 * lora-training-prompt-workshop（MIT License）の hashSeed（FNV-1a）と seededRandom（mulberry32）を移植。
 * 同じシード文字列から同じ乱数列を返す。
 */
export type Rng = () => number;

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed: string): Rng {
  let value = hashSeed(seed);
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
/** 人が書き写しやすい8文字のシード */
export function newSeed(): string {
  const buf = new Uint32Array(8);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buf);
  else for (let i = 0; i < 8; i++) buf[i] = Math.floor(Math.random() * 2 ** 32);
  return Array.from(buf, (n) => ALPHABET[n % ALPHABET.length]).join('');
}

/** 重み付き抽選。重みの合計が0以下なら null */
export function weightedPick<T>(items: T[], weights: number[], rng: Rng): T | null {
  let total = 0;
  for (const w of weights) total += w > 0 ? w : 0;
  if (!items.length || total <= 0) return null;
  let cursor = rng() * total;
  for (let i = 0; i < items.length; i++) {
    const w = weights[i] > 0 ? weights[i] : 0;
    cursor -= w;
    if (cursor < 0) return items[i];
  }
  return items[items.length - 1];
}
