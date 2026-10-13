/* soft 制約：重みで相性を表現する。
 *   まとまり重視（coherent）… 相性の良い候補群に確率の大半を割り当て、外れる候補は大きく下げる
 *   バランス（balanced）… 相性の良い候補を優先しつつ、意外性も残す
 *   カオス（wild）… 相性をほぼ無視。基本重みも平たくし、希少候補にも当選余地を与える
 * hard 制約は weights ではなく hard.ts のフィルタで守る。
 *
 * 2段構え：
 *  1) softWeight … 候補ごとの倍率（世界観の一致度、年齢と白髪、容姿傾向と顔立ち…）
 *  2) shareBoosts … 「好みに合う候補群」が候補数に埋もれないよう、群全体の当選確率の下限を保証する
 *     （例：美形タイプが好む衣装群は、まとまり重視なら合計60%以上）
 */
import type { Values } from '../advisor/hard';
import type { FieldId, Mode, Option } from '../types';
import { fieldDef } from '../data/fields';
import { matchAny } from './match';

export interface ModeParams { pref: number; mismatch: number; softMismatch: number; flatten: number; fantasy: number; floor: number }
export const MODE_PARAMS: Record<Mode, ModeParams> = {
  coherent: { pref: 3, mismatch: 0.08, softMismatch: 0.3, flatten: 1, fantasy: 0.2, floor: 0 },
  balanced: { pref: 1.8, mismatch: 0.4, softMismatch: 0.7, flatten: 1, fantasy: 0.55, floor: 0 },
  wild: { pref: 1.1, mismatch: 1, softMismatch: 1, flatten: 0.4, fantasy: 1, floor: 0.25 }
};
/** 群の確率下限（mode 別） */
const SHARE: Record<string, Record<Mode, number>> = {
  archetype: { coherent: 0.72, balanced: 0.4, wild: 0 },
  occupationOutfit: { coherent: 0.55, balanced: 0.3, wild: 0 },
  cultureOutfit: { coherent: 0.65, balanced: 0.4, wild: 0.1 },
  outfitColor: { coherent: 0.6, balanced: 0.35, wild: 0 },
  world: { coherent: 0.85, balanced: 0.6, wild: 0 },
  archetypeWorld: { coherent: 0.7, balanced: 0.4, wild: 0 },
  name: { coherent: 0.95, balanced: 0.8, wild: 0.3 },
  cultureTied: { coherent: 0.45, balanced: 0.3, wild: 0 },
  cultureNone: { coherent: 0.85, balanced: 0.7, wild: 0 },
  occupationNone: { coherent: 0.55, balanced: 0.3, wild: 0 }
};

const WORLD_FIT_FIELDS = new Set<FieldId>(['outfit', 'scene', 'occupation', 'prop', 'pose', 'culture', 'light']);
const GENERIC_WORLD_TAGS = new Set(['western', 'historical', 'fantasy', 'modern', 'eastern', 'urban', 'dark', 'retro', 'night', 'street']);
const REALISTIC_WORLDS = new Set(['modern', 'business', 'noir', 'urban_night', 'taisho', 'japanese_historical', 'chinese_court', 'european_court', 'victorian', 'military']);

/** 世界観との一致度：null=中立 / -1=不一致 / 0.5=大まかな一致 / 1=固有タグ一致 / 1.2=世界観そのもの */
export function worldStrength(opt: Option, world: Option | undefined): number | null {
  if (!world || !opt.worlds || opt.worlds.length === 0 || world.id === 'world_mix') return null;
  let best = -1;
  for (const w of opt.worlds) {
    if (w === world.id) best = Math.max(best, 1.2);
    else if (world.tags?.includes(w)) best = Math.max(best, GENERIC_WORLD_TAGS.has(w) ? 0.5 : 1);
  }
  return best;
}

/** 衣装タグ → 合う色タグ */
const OUTFIT_COLOR: Array<[string[], string[]]> = [
  [['dark', 'gothic', 'assassin'], ['dark', 'black', 'deep', 'nocturnal', 'gothic']],
  [['sacred', 'religious'], ['white', 'pale', 'metal', 'sacred', 'pure', 'divine']],
  [['royal', 'luxury', 'noble'], ['gem', 'metal', 'deep', 'royal', 'noble', 'rich']],
  [['casual', 'soft', 'home', 'light'], ['muted', 'pale', 'soft', 'daily', 'casual', 'calm', 'natural']],
  [['street', 'stage'], ['black', 'vivid', 'urban', 'bold']],
  [['military', 'officer'], ['dark', 'deep', 'muted', 'metal', 'severe']],
  [['suit', 'formal', 'detective', 'butler'], ['dark', 'black', 'deep', 'muted', 'gray', 'white', 'formal', 'sober']],
  [['traditional'], ['traditional', 'deep', 'muted', 'refined']],
  [['tech'], ['black', 'cyan', 'blue', 'metal', 'vivid', 'sleek']],
  [['rugged', 'travel', 'hunter', 'armor'], ['brown', 'earthy', 'muted', 'dark', 'metal', 'natural']]
];
const AURA_EXPR: Record<string, string[]> = {
  refreshing: ['sunny', 'warm'], pure: ['gentle', 'refined', 'sacred'], gentle: ['warm', 'gentle'], sunny: ['sunny'], noble: ['refined', 'noble'],
  regal: ['noble', 'cold'], cool: ['cool', 'cold'], aloof: ['cold', 'aloof'], stoic: ['cool', 'warrior'], sophisticated: ['refined', 'playful'],
  mysterious: ['mystic', 'alluring'], ethereal: ['sacred', 'mystic'], sacred: ['sacred'], melancholy: ['fragile', 'melancholy'], decadent: ['decadent', 'alluring'],
  alluring: ['alluring'], dangerous: ['danger'], sinister: ['danger', 'cold'], playful: ['playful'], rugged: ['warrior', 'wild'], wild: ['wild'], warm_mature: ['warm']
};
const NEEDS_SET = new Set(['leaning_wall', 'leaning_railing', 'sitting_stairs', 'sitting_window', 'throne_lounge', 'chin_on_hand_table']);
const intersects = (a: string[] | undefined, b: string[] | undefined) => !!a && !!b && a.some((x) => b.includes(x));
const outfitColorTags = (outfit: Option | undefined): string[] =>
  outfit?.tags ? OUTFIT_COLOR.filter(([o]) => intersects(outfit.tags, o)).flatMap(([, c]) => c) : [];

/** 候補 opt を field に置くときの重み（hard 制約はここでは見ない） */
export function softWeight(field: FieldId, opt: Option, v: Values, mode: Mode): number {
  const P = MODE_PARAMS[mode];
  let w = Math.pow(opt.w ?? 1, P.flatten);
  const pref = (k = 1) => { w *= Math.pow(P.pref, k); };
  const miss = (k = 1) => { w *= Math.pow(P.mismatch, k); };

  // 世界観との一致度
  if (WORLD_FIT_FIELDS.has(field)) {
    const ws = worldStrength(opt, v.world);
    if (ws !== null) { if (ws > 0) pref(ws); else miss(field === 'light' || field === 'pose' || field === 'prop' ? 0.6 : 1); }
  }
  if (field === 'culture' && opt.id === 'none' && v.world && ['japan', 'china', 'desert', 'north'].some((t) => v.world!.tags?.includes(t))) w *= mode === 'coherent' ? 0.5 : 0.8;

  // 美形タイプ：自分（archetype）を選ぶときの、決定済み項目との相性
  if (field === 'archetype' && opt.prefs) {
    for (const g of ['age', 'presentation', 'build', 'occupation', 'culture'] as FieldId[]) {
      const cur = v[g], refs = opt.prefs[g];
      if (cur && refs) { if (matchAny(cur, refs)) pref(); else if (g === 'age') w *= P.softMismatch; }
    }
    for (const g of ['outfit', 'hairColor', 'eyeColor', 'expression', 'hairStyle', 'glasses', 'marks'] as FieldId[]) {
      const cur = v[g];
      if (cur && opt.prefs[g] && matchAny(cur, opt.prefs[g])) pref(0.7);
    }
    if (v.world && opt.prefs.world && !matchAny(v.world, opt.prefs.world) && !opt.prefs.world.some((x) => v.world!.tags?.includes(x))) w *= P.softMismatch;
  }

  // 職業の最低年齢（教授・枢機卿など）
  if (field === 'occupation' && opt.ageMin && v.age && (v.age.ageMin ?? 18) + 10 < opt.ageMin) miss(1.2);
  // 職業 ← 決定済みの衣装
  if (field === 'occupation' && v.outfit && opt.outfitPrefs && matchAny(v.outfit, opt.outfitPrefs)) pref(1.2);
  if (field === 'culture' && v.outfit?.culture && v.outfit.culture === opt.id) pref(2);

  // 現実寄りの世界観で幻想的な色・瞳・特徴を下げる
  if (v.world && REALISTIC_WORLDS.has(v.world.id)) {
    const fantastical = (field === 'hairColor' || field === 'eyeColor' || field === 'hairAccentColor') ? opt.natural === false
      : (field === 'eyeShape' || field === 'marks') ? intersects(opt.tags, ['inhuman', 'fantasy', 'mystic']) : false;
    if (fantastical) w *= P.fantasy;
  }

  // 年齢
  const age = v.age?.id;
  if (field === 'hairColor' && age && ['silver', 'white', 'gray', 'smoky_gray', 'pearl_white', 'charcoal'].includes(opt.id)) {
    if (age === 'a60p') pref(2); else if (age === 'a45_59') pref(1);
  }
  if (field === 'facialHair' && age) {
    if (age === 'a18_24' && ['full_beard', 'mustache'].includes(opt.id)) miss(0.7);
    if (['a35_44', 'a45_59', 'a60p'].includes(age) && opt.id !== 'none') pref(0.5);
  }
  if (field === 'face' && opt.tags?.includes('mature') && age && ['a18_24', 'a25_34'].includes(age)) w *= P.softMismatch;

  // 容姿傾向と顔立ち
  const pres = v.presentation?.tags || [];
  if (field === 'face' && pres.length) {
    if (intersects(opt.tags, pres)) pref(0.7);
    if (opt.tags?.includes('masc') && pres.includes('fem')) w *= P.softMismatch;
    if (intersects(opt.tags, ['fem', 'delicate']) && pres.includes('masc') && !pres.includes('andro')) w *= P.softMismatch;
  }

  // 衣装と色
  if (field === 'mainColor' && mode === 'coherent' && opt.sub === 'vivid' && v.outfit && !intersects(v.outfit.tags, ['casual', 'street', 'stage', 'light', 'sporty'])) w *= 0.35;
  if (field === 'mainColor' && mode !== 'wild' && opt.cat === 'pink' && v.outfit && intersects(v.outfit.tags, ['armor', 'military', 'formal', 'suit'])) w *= P.softMismatch;
  if (field === 'accentColor' && v.mainColor) {
    if (opt.cat !== v.mainColor.cat) w *= 1.3;
    if (opt.cat === 'metal' || opt.cat === 'gem') w *= 1.4;
  }
  if ((field === 'mainColor' || field === 'accentColor') && v.aura?.tags) {
    if (v.aura.tags.includes('dark') && intersects(opt.tags, ['dark', 'deep', 'black'])) pref(0.3);
    if (v.aura.tags.includes('bright') && intersects(opt.tags, ['bright', 'pale', 'white'])) pref(0.3);
  }

  // 雰囲気と表情
  if (field === 'expression' && v.aura && intersects(opt.tags, AURA_EXPR[v.aura.id])) pref(0.6);

  // ポーズ・持ち物・アングル
  if (field === 'pose') {
    const ctxTags = [...(v.outfit?.tags || []), ...(v.occupation?.tags || []), ...(v.expression?.tags || [])];
    if (intersects(opt.tags, ctxTags)) pref(0.4);
    if (v.scene?.place === 'simple' && NEEDS_SET.has(opt.id)) miss(0.5);
  }
  if (field === 'scene' && v.pose && NEEDS_SET.has(v.pose.id) && opt.place === 'simple') miss(0.5);
  if (field === 'prop' && opt.id !== 'none') {
    const ctxTags = [...(v.outfit?.tags || []), ...(v.occupation?.tags || [])];
    if (intersects(opt.tags, ctxTags)) pref(0.6);
  }
  if (field === 'angle' && v.pose?.tags?.includes('dominant') && opt.tags?.includes('dominant')) pref(0.8);

  // 背景・時間・光
  if (field === 'time' && v.scene?.tags?.includes('night') && opt.daylight === 'night') pref(0.8);
  if (field === 'scene' && opt.place === 'simple' && mode === 'coherent') w *= 0.6;
  if (field === 'light') {
    if (opt.tags?.includes('indoor') && v.scene?.place === 'outdoor') miss(0.7);
    if (opt.tags?.includes('nature') && v.scene?.place === 'indoor') miss(0.7);
    if (opt.id === 'studio_soft' && v.scene?.place !== 'simple') miss(0.4);
    if (opt.id === 'studio_soft' && v.scene?.place === 'simple') pref(0.6);
    if (opt.id === 'stained_glass') { if (v.scene?.tags?.includes('sacred')) pref(0.8); else miss(0.8); }
    if (['candlelight', 'lantern_glow'].includes(opt.id) && v.scene?.place === 'outdoor' && v.time?.daylight === 'day') miss(0.8);
    if (v.aura?.tags && intersects(opt.tags, v.aura.tags)) pref(0.4);
  }
  if (field === 'aura' && v.world?.tags?.includes('dark') && opt.tags?.includes('dark')) pref(0.5);

  return Math.max(w, P.floor * Math.pow(opt.w ?? 1, P.flatten) * 0.2);
}

export interface ShareBoost { label: string; match: (o: Option) => boolean; share: number }

/** 候補群の確率下限 */
export function shareBoosts(field: FieldId, v: Values, mode: Mode): ShareBoost[] {
  const out: ShareBoost[] = [];
  const add = (label: string, key: keyof typeof SHARE, match: (o: Option) => boolean) => { const share = SHARE[key][mode]; if (share > 0) out.push({ label, match, share }); };
  // 美形タイプの好み（先に適用し、最後に世界観で全体の下限を保証する）
  const refs = v.archetype?.prefs?.[field];
  if (field !== 'archetype' && refs?.length) add('archetype', 'archetype', (o) => matchAny(o, refs));
  if (field === 'archetype' && v.world) add('archetypeWorld', 'archetypeWorld', (o) => !!o.prefs?.world && (matchAny(v.world, o.prefs.world) || o.prefs.world.some((x) => v.world!.tags?.includes(x) && !GENERIC_WORLD_TAGS.has(x))));
  // 美形タイプが好む衣装を着る職業を優先（例：サイバーパンクの運び屋 → ハッカー・賞金稼ぎ）
  if (field === 'occupation' && v.archetype?.prefs?.outfit && !v.archetype.prefs.occupation) {
    const outs = fieldDef('outfit').options.filter((o) => matchAny(o, v.archetype!.prefs!.outfit));
    add('archetypeOcc', 'archetype', (o) => !!o.outfitPrefs && outs.some((x) => matchAny(x, o.outfitPrefs)));
  }
  // 美形タイプが職業を想定しないなら「指定しない」を厚めに
  if (field === 'occupation' && v.archetype && !v.archetype.prefs?.occupation) add('occupationNone', 'occupationNone', (o) => o.id === 'none');
  // 先に決まる項目で、美形タイプの好む髪型・ポーズが成立する余地を残す
  if (field === 'hairLength' && v.archetype?.prefs?.hairStyle) {
    const styles = fieldDef('hairStyle').options.filter((o) => matchAny(o, v.archetype!.prefs!.hairStyle));
    const lens = new Set(styles.flatMap((o) => o.lengths || []));
    if (lens.size) add('archetypeHair', 'archetype', (o) => lens.has(o.id));
  }
  if (field === 'shot' && v.archetype?.prefs?.pose) {
    const poses = fieldDef('pose').options.filter((o) => matchAny(o, v.archetype!.prefs!.pose));
    const minLevel = Math.min(...poses.map((o) => o.minShot ?? 0));
    if (poses.length) add('archetypeShot', 'archetype', (o) => (o.level ?? 5) >= minLevel);
  }
  // 職業 → 衣装
  if (field === 'outfit' && v.occupation?.outfitPrefs?.length) { const r = v.occupation.outfitPrefs; add('occupation', 'occupationOutfit', (o) => matchAny(o, r)); }
  // 文化モチーフ → 伝統衣装
  if (field === 'outfit' && v.culture && v.culture.id !== 'none') { const c = v.culture.id; add('culture', 'cultureOutfit', (o) => o.culture === c); }
  // 衣装 → 色
  if ((field === 'mainColor' || field === 'accentColor') && v.outfit) {
    const tags = outfitColorTags(v.outfit);
    if (tags.length) add('color', 'outfitColor', (o) => intersects(o.tags, tags));
  }
  // 文化モチーフ：舞台に結び付く文化がなければ「指定なし」を基本にする
  if (field === 'culture' && v.world) {
    const tied = ['japan', 'china', 'desert', 'north'].some((t) => v.world!.tags?.includes(t));
    if (tied) add('cultureTied', 'cultureTied', (o) => (worldStrength(o, v.world) ?? 0) >= 1);
    else add('cultureNone', 'cultureNone', (o) => o.id === 'none');
  }
  // 世界観に固有一致する候補群（最後に適用）
  if (WORLD_FIT_FIELDS.has(field) && field !== 'culture' && field !== 'light' && field !== 'prop' && field !== 'pose') {
    // 世界観を問わない候補（指定しない・シンプル背景など）は一致側に数える
    add('world', 'world', (o) => { const ws = worldStrength(o, v.world); return ws === null || ws >= 1; });
  }
  // 世界観 → 呼び名の系統
  if (field === 'name' && v.world?.nameSystem && v.world.nameSystem !== 'mixed') { const sys = v.world.nameSystem; add('name', 'name', (o) => o.nameSystem === sys); }
  // 適用順：職業・文化・色 → 美形タイプ → 世界観（後に適用したものほど優先される）
  const ORDER: Record<string, number> = { occupation: 1, culture: 1, color: 1, archetype: 2, archetypeHair: 2, archetypeShot: 2, archetypeWorld: 2, archetypeOcc: 2, occupationNone: 1, cultureTied: 2, cultureNone: 2, world: 3, name: 3 };
  return out.sort((a, b) => (ORDER[a.label] ?? 2) - (ORDER[b.label] ?? 2));
}

/** 群の合計確率が share 未満なら、群の重みを持ち上げる */
export function applyShares(pool: Option[], weights: number[], boosts: ShareBoost[]): number[] {
  const w = [...weights];
  for (const b of boosts) {
    let total = 0, matched = 0;
    pool.forEach((o, i) => { total += w[i]; if (b.match(o)) matched += w[i]; });
    if (matched <= 0 || total <= 0 || matched >= total) continue;
    if (matched / total >= b.share) continue;
    const factor = (b.share * (total - matched)) / ((1 - b.share) * matched);
    pool.forEach((o, i) => { if (b.match(o)) w[i] *= factor; });
  }
  return w;
}
