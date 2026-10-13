import type { Option } from '../types';

/** 参照（id / #タグ / cat:大分類 / !none）が候補に一致するか */
export function matchRef(opt: Option | undefined, ref: string): boolean {
  if (!opt) return false;
  if (ref === '!none') return !['none', 'unspecified'].includes(opt.id);
  if (ref.startsWith('#')) {
    const t = ref.slice(1);
    return !!(opt.tags?.includes(t) || opt.cat === t || opt.sub === t);
  }
  if (ref.startsWith('cat:')) return opt.cat === ref.slice(4);
  return opt.id === ref;
}

export const matchAny = (opt: Option | undefined, refs: string[] | undefined): boolean =>
  !!refs && refs.some((r) => matchRef(opt, r));

/** 世界観の一致：候補の worlds が、世界観の id または tags のどれかに一致 */
export function worldMatch(opt: Option, world: Option | undefined): 'match' | 'mismatch' | 'neutral' {
  if (!world || !opt.worlds || opt.worlds.length === 0) return 'neutral';
  if (world.id === 'world_mix') return 'neutral';
  const keys = new Set([world.id, ...(world.tags || [])]);
  return opt.worlds.some((w) => keys.has(w)) ? 'match' : 'mismatch';
}
