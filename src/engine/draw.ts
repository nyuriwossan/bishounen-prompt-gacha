/* 制約付き錬成エンジン
 * 順序：
 *  1. ロック済み項目どうしの hard 矛盾を確認（あれば抽選しない。ロックは黙って変えない）
 *  2. 世界観 → 文化 → 美形タイプ → 人物 → 髪 → 衣装 → 表情・構図 → 背景 の順に、
 *     決定済みの値と hard 矛盾しない候補だけから、soft 重み付きで抽選
 *  3. 正規化・全体検査。対象項目に矛盾が残れば対象項目だけを引き直して修復
 *  4. 修復できなければ結果を出さず、衝突項目・理由・解除候補を返す
 */
import { allViolations, candidateViolations, type Values, type Violation } from '../advisor/hard';
import { DATA_VERSION, DRAW_ORDER, fieldDef, optionOf, RELATED } from '../data/fields';
import { isCosplay } from '../data/outfits';
import type { DrawConflict, DrawResult, FieldId, ForgeState, Option, StylePreset } from '../types';
import { matchAny } from './match';
import { newSeed, seededRandom, weightedPick, type Rng } from './rng';
import { allowedOf, hasPrefs, isPrefOff, REQUIRED_FIELDS, requiresOffFields } from './prefs';
import { cloneState, isActive, moduleKey, OFF_AS_NONE } from './state';
import { applyShares, shareBoosts, softWeight } from './weights';

export type RecentMap = Partial<Record<FieldId, string[]>>;

export interface DrawOptions {
  /** 抽選する項目（省略時はすべて） */
  targets?: FieldId[];
  /** シードを明示（省略時は設定の固定シード、なければ新規） */
  seed?: string;
  /** 直近履歴（重複回避用）。渡すと更新されたものが返る */
  recent?: RecentMap;
  /** おまかせスタイル */
  preset?: StylePreset;
  /** 一時的に保持する項目（ロックはしない） */
  hold?: FieldId[];
  /** true ならおまかせ条件に合う候補が無いとき、条件外から選ばない */
  strictFilter?: boolean;
}
export interface DrawOutcome extends DrawResult { recent: RecentMap; stuck: FieldId[]; seed: string; /** 辞書・抽選設定の除外・OFFが原因で成立しなかった項目（設定を開く導線） */ prefsFields?: FieldId[];
  /** 原因の種類：zero 抽選対象が0件／preset スタイルの条件に合う候補をすべて除外／stuck 両立する候補をすべて除外／off 項目がOFF */
  prefsKind?: 'zero' | 'preset' | 'stuck' | 'off' }

/** 自動の抽選の母集団（除外を適用する前）。衣装はコスプレのスイッチで変わる */
function baseOptions(f: FieldId, s: ForgeState, strict = false): Option[] {
  const all = fieldDef(f).options;
  if (f !== 'outfit') return all;
  const m = s.optionalModules;
  if (!m.cosplayEnabled) return all.filter((o) => !isCosplay(o));
  if (strict) return all;
  return all.filter((o) => isCosplay(o) && !(m.kemonoEnabled && o.tags?.includes('f_ears')) && !(m.unlimitedEnabled && o.tags?.includes('no_forbidden')));
}

/** 内部用の絞り込み（一覧から引く・ONにした直後）は、おまかせスタイルとして扱わない */
const isStylePreset = (p: StylePreset | null | undefined): p is StylePreset => !!p && p.id !== 'within' && p.id !== 'module-on';

/** おまかせスタイルの条件に合う候補を、辞書・抽選設定ですべて除外している項目（抽選前に説明するため） */
export function presetPrefsConflicts(state: ForgeState, preset: StylePreset | null | undefined, targets?: FieldId[]): Array<{ field: FieldId; message: string }> {
  if (!isStylePreset(preset)) return [];
  const s = cloneState(state);
  if (preset.modules) Object.assign(s.optionalModules, preset.modules);
  const list = targets ?? drawableFields(s);
  const out: Array<{ field: FieldId; message: string }> = [];
  for (const [f, filter] of Object.entries(preset.filters) as Array<[FieldId, string[]]>) {
    if (!filter?.length || !list.includes(f)) continue;
    // コスプレONの衣装はスタイルの衣装の条件を使わない
    if (f === 'outfit' && s.optionalModules.cosplayEnabled) continue;
    const base = baseOptions(f, s).filter((o) => matchAny(o, filter));
    if (base.length && !allowedOf(f, base).length) {
      out.push({ field: f, message: `おまかせスタイル「${preset.ja}」の条件（${label(f)}）に合う候補を、すべて抽選から除外しています。スタイルを外すか、辞書・抽選設定で除外を見直してください。` });
    }
  }
  return out;
}

function prefsPrecheck(s: ForgeState, targets: FieldId[], opts: DrawOptions): { message: string; fields: FieldId[]; kind: 'zero' | 'preset' } | null {
  const zero = targets.filter((f) => !allowedOf(f, baseOptions(f, s, !!opts.strictFilter)).length);
  if (zero.length) {
    const names = zero.map((f) => `「${label(f)}${f === 'outfit' && s.optionalModules.cosplayEnabled && !opts.strictFilter ? '（コスプレ枠）' : ''}」`).join('');
    const offable = zero.every((f) => !REQUIRED_FIELDS[f]);
    return { message: `${names}に抽選対象の候補が0件のため、錬成しませんでした。辞書・抽選設定で候補を選ぶ${offable ? 'か、この項目をOFFにしてください' : 'ようにしてください'}。`, fields: zero, kind: 'zero' };
  }
  const conflicts = presetPrefsConflicts(s, opts.preset, targets);
  if (conflicts.length) return { message: conflicts.map((c) => c.message).join(' '), fields: conflicts.map((c) => c.field), kind: 'preset' };
  return null;
}

/** 除外が原因で両立する候補が残らなかったときの説明（原因になった固定項目を挙げる） */
function prefsStuckMessage(f: FieldId, s: ForgeState, determined: Values, within: boolean): string {
  if (within) return 'この一覧には、他の項目と両立する抽選対象の候補がありません。抽選から除外した候補は、行を押せば手で選べます。';
  const allowed = allowedOf(f, baseOptions(f, s));
  const involved = [...new Set(allowed.flatMap((o) => candidateViolations(f, o, determined).flatMap((v) => v.fields)))]
    .filter((g) => g !== f && s.fields[g].locked);
  const hint = involved.length ? `${involved.map((g) => `「${label(g)}」`).join('')}の固定を見直してください` : '関連する項目もまとめて引き直してください';
  return `「${label(f)}」に選べる候補がありません（両立する候補をすべて抽選から除外しています）。抽選対象を増やすか、${hint}。結果は変えていません。`;
}

/** 裾の切り方：top-p（累積確率）と min-p（最有力候補の何割未満を切るか）。まとまり重視ほど、相性の悪い長い裾を切る */
const TOP_P: Record<ForgeState['settings']['coherence'], number> = { coherent: 0.95, balanced: 0.99, wild: 1 };
const MIN_P: Record<ForgeState['settings']['coherence'], number> = { coherent: 0.1, balanced: 0.03, wild: 0 };
export function minP(weights: number[], ratio: number): number[] {
  if (ratio <= 0) return weights;
  const max = Math.max(...weights);
  if (!(max > 0)) return weights;
  return weights.map((w) => (w >= max * ratio ? w : 0));
}
export function nucleus(weights: number[], p: number): number[] {
  if (p >= 1) return weights;
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return weights;
  const order = weights.map((w, i) => [w, i] as const).sort((a, b) => b[0] - a[0]);
  const keep = new Set<number>();
  let acc = 0;
  for (const [w, i] of order) { keep.add(i); acc += w; if (acc / total >= p) break; }
  return weights.map((w, i) => (keep.has(i) ? w : 0));
}

export function valuesOf(state: ForgeState, only?: (f: FieldId) => boolean): Values {
  const v: Values = {};
  for (const f of DRAW_ORDER) {
    if (only && !only(f)) continue;
    if (!isActive(state, f)) {
      // 眼鏡・特徴・持ち物はOFFなら「なし」。それを前提にするポーズ（眼鏡を押し上げる・抜刀など）が出ないようにする
      if (OFF_AS_NONE.includes(f)) { const none = optionOf(f, 'none'); if (none) v[f] = none; }
      continue;
    }
    const opt = optionOf(f, state.fields[f].id);
    if (opt) v[f] = opt;
  }
  return v;
}

const label = (f: FieldId) => fieldDef(f).short ?? fieldDef(f).ja;

function toConflicts(viols: Violation[], state: ForgeState): DrawConflict[] {
  return viols.map((x) => ({ fields: x.fields, reasonJa: x.reasonJa, unlockCandidates: x.fields.filter((f) => state.fields[f].locked) }));
}

/** 抽選対象になり得る項目 */
export function drawableFields(state: ForgeState, targets?: FieldId[], hold: FieldId[] = []): FieldId[] {
  const want = new Set(targets ?? DRAW_ORDER);
  return DRAW_ORDER.filter((f) => want.has(f) && fieldDef(f).randomizable !== false && isActive(state, f) && !state.fields[f].locked && !hold.includes(f));
}

export function draw(input: ForgeState, opts: DrawOptions = {}): DrawOutcome {
  const s = cloneState(input);
  if (opts.preset?.modules) Object.assign(s.optionalModules, opts.preset.modules);
  const fixedSeed = s.settings.seed.trim();
  const seed = opts.seed ?? (fixedSeed || newSeed());
  const useRecent = !fixedSeed && !opts.seed;
  const recent: RecentMap = JSON.parse(JSON.stringify(opts.recent ?? {}));
  const mode = s.settings.coherence;
  const notices: string[] = [];
  const stuck: FieldId[] = [];

  const targets = drawableFields(s, opts.targets, opts.hold);
  const rng = seededRandom(`${seed}|${DATA_VERSION}|${mode}|${targets.join(',')}|${opts.preset?.id ?? ''}`);

  // 1. ロック済みどうしの矛盾
  const lockedViolations = allViolations(valuesOf(s, (f) => s.fields[f].locked));
  if (lockedViolations.length) {
    return {
      ok: false, state: input, notices: ['固定中の項目どうしが矛盾しているため、錬成を中止しました。どちらかの固定を外してください。'],
      conflicts: toConflicts(lockedViolations, s), changed: [], recent: opts.recent ?? {}, stuck: [], seed
    };
  }
  if (!targets.length) {
    const lockedCount = DRAW_ORDER.filter((f) => s.fields[f].locked).length;
    return { ok: true, state: input, notices: [lockedCount ? '対象の項目はすべて固定中です。固定を外すと引き直せます。' : '引き直せる項目がありません。'], conflicts: [], changed: [], recent: opts.recent ?? {}, stuck: [], seed };
  }

  // 1.5 辞書・抽選設定：抽選対象が0件の項目や、おまかせスタイルの条件に合う候補をすべて除外している項目があれば、抽選しない（黙って条件をゆるめない）
  const prefsStop = prefsPrecheck(s, targets, opts);
  if (prefsStop) return { ok: false, state: input, notices: [prefsStop.message], conflicts: [], changed: [], recent: opts.recent ?? {}, stuck: [], seed, prefsFields: prefsStop.fields, prefsKind: prefsStop.kind };

  // 2. 順に抽選
  const targetSet = new Set(targets);
  const determined: Values = valuesOf(s, (f) => !targetSet.has(f));
  for (const f of targets) {
    const pending = new Set(targets.slice(targets.indexOf(f) + 1));
    const ctx: PickCtx = { useRecent, recent, preset: opts.preset, notices, strict: opts.strictFilter, pending };
    const picked = pickFor(f, s, determined, rng, ctx);
    if (!picked) {
      // 除外がなければ候補があった → 除外した候補を復活させず、元の値で黙って済ませず、今回の抽選全体を取り消す
      const unfiltered = poolFor(f, s, determined, { ...ctx, notices: [] }, false);
      if (unfiltered && unfiltered.length) {
        return {
          ok: false, state: input, notices: [prefsStuckMessage(f, s, determined, !!opts.strictFilter && opts.preset?.id === 'within')],
          conflicts: [], changed: [], recent: opts.recent ?? {}, stuck: [], seed, prefsFields: [f], prefsKind: 'stuck'
        };
      }
    }
    if (picked) {
      s.fields[f] = { id: picked.id, source: opts.preset && opts.preset.filters[f] ? 'preset' : 'random', locked: false };
      determined[f] = picked;
      if (useRecent) recent[f] = [...(recent[f] || []).filter((x) => x !== picked.id), picked.id].slice(-Math.max(1, s.settings.keepRecentCount));
    } else {
      stuck.push(f);
      const cur = optionOf(f, s.fields[f].id);
      if (cur) determined[f] = cur;
    }
  }

  // 3. 全体検査と修復（対象項目に関わる矛盾だけを、対象項目の引き直しで直す）
  for (let round = 0; round < 4; round++) {
    const viols = allViolations(valuesOf(s)).filter((x) => x.fields.some((f) => targetSet.has(f)));
    if (!viols.length) break;
    for (const viol of viols) {
      for (const f of viol.fields.filter((g) => targetSet.has(g))) {
        const others = valuesOf(s, (g) => g !== f);
        const picked = pickFor(f, s, others, rng, { useRecent: false, recent, preset: undefined, notices: [] });
        if (picked) { s.fields[f] = { id: picked.id, source: 'random', locked: false }; break; }
      }
    }
  }
  const remaining = allViolations(valuesOf(s)).filter((x) => x.fields.some((f) => targetSet.has(f)));
  if (remaining.length) {
    return {
      ok: false, state: input,
      notices: ['条件を満たす組み合わせが見つからなかったため、結果を出しませんでした。', ...(hasPrefs() ? ['辞書・抽選設定の除外が影響している可能性があります。'] : [])],
      conflicts: toConflicts(remaining, s), changed: [], recent: opts.recent ?? {}, stuck, seed
    };
  }

  if (stuck.length) {
    const names = stuck.map(label).join('・');
    notices.push(`${names}：他の項目と両立する候補がないため、元の値を保ちました。関連項目もまとめて引き直せます。`);
  }

  s.lastSeed = seed;
  s.drawCount = (input.drawCount || 0) + 1;
  const changed = targets.filter((f) => input.fields[f].id !== s.fields[f].id);
  return { ok: true, state: s, notices, conflicts: [], changed, recent, stuck, seed };
}

interface PickCtx { useRecent: boolean; recent: RecentMap; preset?: StylePreset; notices: string[]; strict?: boolean; pending?: Set<FieldId> }

/** 1手先読み：この候補を選ぶと、まだ引いていない関連項目に両立する候補が残らない場合は外す。
 * 禁断の調合の連鎖（立場→拘束具→拘束位置→固定先・着崩し・表情→画角→ポーズ）だけに使う（他の項目は従来どおりで十分速い） */
const LOOKAHEAD: Partial<Record<FieldId, FieldId[]>> = {
  outfit: ['restraint'], role: ['bindPos'], restraint: ['bindPos'], bindPos: ['anchor', 'shot', 'pose', 'prop'], anchor: ['shot', 'pose'], disarray: ['pose'], expression: ['pose'], shot: ['pose']
};
function leavesRoom(f: FieldId, o: Option, determined: Values, pending: Set<FieldId> | undefined, s: ForgeState, preset?: StylePreset, usePrefs = true): boolean {
  const next = LOOKAHEAD[f];
  if (!next || !pending || !s.optionalModules.unlimitedEnabled) return true;
  const v = { ...determined, [f]: o };
  return next.every((g) => {
    if (!pending.has(g) || !isActive(s, g)) return true;
    // 先読みも、抽選から除外した候補は「残る候補」に数えない
    const options = usePrefs ? allowedOf(g, fieldDef(g).options) : fieldDef(g).options;
    // おまかせスタイルの条件がある項目は、その条件に合う候補が残るかで判断する（例：触手の森で、鎖付きの衣装を先に引かない）
    const filter = preset?.filters[g];
    const narrowed = filter?.length ? options.filter((x) => matchAny(x, filter)) : [];
    const pool = narrowed.length ? narrowed : options;
    return pool.some((x) => candidateViolations(g, x, v).length === 0);
  });
}

/** 候補の requires が、まだ決まっていない項目についておまかせスタイルの条件と両立できるか（例：銀髪特集で「黒髪クール」を引かない） */
function requiresFitPreset(o: Option, determined: Values, preset: StylePreset | undefined, usePrefs = true): boolean {
  if (!preset || !o.requires) return true;
  return o.requires.every((req) => {
    const i = req.indexOf(':');
    const g = req.slice(0, i) as FieldId, refs = req.slice(i + 1).split('|');
    const filter = preset.filters[g];
    if (!filter?.length || determined[g]) return true;
    const options = usePrefs ? allowedOf(g, fieldDef(g).options) : fieldDef(g).options;
    return options.some((x) => matchAny(x, filter) && refs.some((r) => matchAny(x, [r])));
  });
}

/** 衣装の抽選範囲。コスプレOFFならコスプレ衣装を外し、ONなら自動の抽選はコスプレ枠だけから行う。
 * 一覧から引く（strict）ときは、ONなら一覧のとおり（通常の衣装も可）。
 * 獣人ONでは耳付きの衣装を、禁断ONでは禁断と組まない衣装（セーラー服）を、自動の抽選から外す */
function outfitPool(s: ForgeState, determined: Values, ctx: PickCtx, usePrefs = true): { options: Option[]; cosplayOnly: boolean } {
  const all = fieldDef('outfit').options;
  const allowed = usePrefs ? allowedOf('outfit', all) : all;
  const m = s.optionalModules;
  if (!m.cosplayEnabled) return { options: allowed.filter((o) => !isCosplay(o)), cosplayOnly: false };
  if (ctx.strict) return { options: allowed, cosplayOnly: false };
  const cosplay = (xs: Option[]) => xs.filter((o) => isCosplay(o)
    && !(m.kemonoEnabled && o.tags?.includes('f_ears'))
    && !(m.unlimitedEnabled && o.tags?.includes('no_forbidden')));
  const fits = (xs: Option[]) => xs.some((o) => candidateViolations('outfit', o, determined).length === 0);
  const pool = cosplay(allowed);
  // 固定中の項目と両立するコスプレ衣装がなければ、通常の衣装から選ぶ
  if (!fits(pool)) {
    // 両立するコスプレ衣装はあるのに、すべて抽選から除外している → 通常の衣装へ逃がさず、抽選を成立させない
    if (usePrefs && fits(cosplay(all))) return { options: [], cosplayOnly: true };
    ctx.notices.push('固定中の項目と両立するコスプレ衣装がないため、通常の衣装から選びました。');
    return { options: allowed.filter((o) => !isCosplay(o)), cosplayOnly: false };
  }
  return { options: pool, cosplayOnly: true };
}

/** 抽選の候補集合（重み付けの前）。順序：抽選対象の候補（除外・OFF前提を外す）→ 決定済みの値との hard 制約 → 先読み → おまかせスタイルの条件。
 * usePrefs=false は「除外がなければ候補があったか」の判定用（乱数は使わない） */
function poolFor(f: FieldId, s: ForgeState, determined: Values, ctx: PickCtx, usePrefs = true): Option[] | null {
  const def = fieldDef(f);
  const scope = f === 'outfit' ? outfitPool(s, determined, ctx, usePrefs) : { options: usePrefs ? allowedOf(f, def.options) : def.options, cosplayOnly: false };
  const compatibleNow = scope.options.filter((o) => candidateViolations(f, o, determined).length === 0);
  const roomy = compatibleNow.filter((o) => leavesRoom(f, o, determined, ctx.pending, s, ctx.preset, usePrefs));
  const allCompatible = roomy.length ? roomy : compatibleNow;
  const presetFit = allCompatible.filter((o) => requiresFitPreset(o, determined, ctx.preset, usePrefs));
  const compatible = presetFit.length ? presetFit : allCompatible;
  let pool = compatible;
  // コスプレONの衣装は、おまかせスタイルの衣装の条件より優先する（コスプレ枠だけから引く）
  const filter = scope.cosplayOnly ? undefined : ctx.preset?.filters[f];
  if (filter && filter.length) {
    const narrowed = compatible.filter((o) => matchAny(o, filter));
    if (narrowed.length) pool = narrowed;
    else if (ctx.strict) return null;
    // ONにした直後の「なし以外」（module-on）で、なし以外をすべて除外しているときは、黙って「なし」から選ぶ（条件ではなく手応えのための絞り込み）
    else if (compatible.length && !(ctx.preset?.id === 'module-on' && usePrefs && !allowedOf(f, def.options).some((o) => matchAny(o, filter)))) ctx.notices.push(`おまかせスタイルの条件に合う「${label(f)}」が他の項目と両立しないため、条件外から選びました。`);
  }
  return pool;
}

function pickFor(f: FieldId, s: ForgeState, determined: Values, rng: Rng, ctx: PickCtx): Option | null {
  const def = fieldDef(f);
  const pool = poolFor(f, s, determined, ctx);
  if (!pool || !pool.length) return null;
  // 禁断の調合は組み合わせで候補が大きく絞られるのが普通なので、「少なめ」の通知は出さない
  if (pool.length <= 2 && def.options.length > 6 && def.group !== 'forbidden' && !s.optionalModules.unlimitedEnabled) ctx.notices.push(`「${label(f)}」は今の条件だと候補が少なめです（${pool.length}件）。`);

  // 避ける直近の数は候補数の半分まで（年齢層5種などの小さな候補で行き詰まらないように）
  const keep = Math.floor(pool.length / 2);
  const recentIds = ctx.useRecent && keep > 0 ? (ctx.recent[f] || []).slice(-keep) : [];
  const mode = s.settings.coherence;
  const base = pool.map((o) => softWeight(f, o, determined, mode));
  const boosted = applyShares(pool, base, shareBoosts(f, determined, mode));
  const trimmed = nucleus(minP(boosted, MIN_P[mode]), TOP_P[mode]);
  // 直近の重複回避は段階的にゆるめる：①相性の良い候補から直近を除く → ②全候補から直近を除く → ③直近も許可
  const notRecent = (w: number[]) => w.map((x, i) => (recentIds.includes(pool[i].id) ? 0 : x));
  let weights = notRecent(trimmed);
  if (!weights.some((w) => w > 0)) weights = notRecent(boosted);
  if (!weights.some((w) => w > 0)) {
    weights = trimmed;
    if (recentIds.length && pool.length > 1) ctx.notices.push(`「${label(f)}」は直近と同じ候補しか残っていないため、重複回避をゆるめました。`);
  }
  return weightedPick(pool, weights, rng);
}

// ---------------------------------------------------------------
// 手動選択・固定

export interface AdoptCheck { ok: boolean; violations: Violation[]; blockingLocked: FieldId[]; conflictingUnlocked: FieldId[]; /** OFFのため両立できない項目（眼鏡・特徴・持ち物） */ blockingOff: FieldId[]; /** コスプレ衣装のスイッチがOFF */ blockingCosplay?: boolean; /** この項目そのものを辞書・抽選設定でOFFにしている */ blockingPrefOff?: boolean }

/** 手動採用の事前確認。抽選から除外した候補も手では選べる（除外は自動の抽選だけの制限） */
export function checkAdopt(state: ForgeState, field: FieldId, id: string): AdoptCheck {
  const opt = optionOf(field, id);
  if (!opt) return { ok: false, violations: [], blockingLocked: [], conflictingUnlocked: [], blockingOff: [] };
  if (isPrefOff(field)) return { ok: false, violations: [], blockingLocked: [], conflictingUnlocked: [], blockingOff: [], blockingPrefOff: true };
  if (!isActive(state, field)) return { ok: true, violations: [], blockingLocked: [], conflictingUnlocked: [], blockingOff: [] };
  // コスプレ衣装は、スイッチがOFFの間は選べない
  if (field === 'outfit' && isCosplay(opt) && !state.optionalModules.cosplayEnabled) return { ok: false, violations: [], blockingLocked: [], conflictingUnlocked: [], blockingOff: [], blockingCosplay: true };
  const others = valuesOf(state, (g) => g !== field);
  const violations = candidateViolations(field, opt, others);
  const involved = [...new Set(violations.flatMap((v) => v.fields))].filter((g) => g !== field);
  // 辞書・抽選設定でOFFの項目を前提にする候補（髪の色OFFの「黒髪クール」、衣装OFFの「ネクタイを緩める」など）も選べない
  const blockingOff = [...new Set([...involved.filter((g) => !isActive(state, g)), ...requiresOffFields(opt)])];
  return {
    ok: violations.length === 0 && blockingOff.length === 0, violations,
    blockingLocked: involved.filter((g) => state.fields[g].locked && isActive(state, g)),
    conflictingUnlocked: involved.filter((g) => !state.fields[g].locked && isActive(state, g)),
    blockingOff
  };
}

/** 衣装を手で選んだとき、新しい服に合わせて引き直す色。固定しておらず、手で選んでもいない（自動で出た）色だけ */
export function followColors(state: ForgeState, field: FieldId): FieldId[] {
  if (field !== 'outfit') return [];
  return (['mainColor', 'accentColor'] as FieldId[]).filter((f) => !state.fields[f].locked && state.fields[f].source !== 'manual' && isActive(state, f));
}
/** 辞書・抽選設定でOFFにした項目は、抽選も手動の変更もしない */
export function prefOffNotice(field: FieldId): string {
  return `「${label(field)}」は辞書・抽選設定でOFFにしています。抽選・出力をせず、値と固定はそのまま保っています。ONにすると変更できます。`;
}
export const COSPLAY_OFF_NOTICE = 'コスプレ衣装がOFFのため、この候補は選べません。詳細な調合の「コスプレ衣装」でONにすると選べます。';
const FOLLOW_NOTICE = '自動で出た衣装の色を、選んだ服に合わせて引き直しました。';

/** 手動採用。競合する未固定項目があれば、それらだけを引き直す（ロック項目は変えない）。衣装なら自動で出た色も服に合わせる */
export function adopt(state: ForgeState, field: FieldId, id: string, lock: boolean, opts: { seed?: string; recent?: RecentMap } = {}): DrawOutcome {
  const check = checkAdopt(state, field, id);
  const seed = opts.seed ?? newSeed();
  if (check.blockingPrefOff) {
    return { ok: false, state, notices: [prefOffNotice(field)], conflicts: [], changed: [], recent: opts.recent ?? {}, stuck: [], seed, prefsFields: [field], prefsKind: 'off' };
  }
  if (check.blockingCosplay) {
    return { ok: false, state, notices: [COSPLAY_OFF_NOTICE], conflicts: [], changed: [], recent: opts.recent ?? {}, stuck: [], seed };
  }
  if (check.blockingOff.length) {
    const viaPrefs = check.blockingOff.filter((g) => isPrefOff(g));
    return {
      ok: false, state, notices: [`「${check.blockingOff.map(label).join('・')}」がOFFのため、この候補は選べません。${viaPrefs.length ? '辞書・抽選設定' : '詳細な調合'}でONにすると選べます。`],
      prefsFields: viaPrefs.length ? viaPrefs : undefined, prefsKind: viaPrefs.length ? 'off' : undefined,
      conflicts: [], changed: [], recent: opts.recent ?? {}, stuck: [], seed
    };
  }
  if (check.blockingLocked.length) {
    return {
      ok: false, state, notices: [`固定中の「${check.blockingLocked.map(label).join('・')}」と両立しません。固定を外すか、別の候補を選んでください。`],
      conflicts: check.violations.map((v) => ({ fields: v.fields, reasonJa: v.reasonJa, unlockCandidates: v.fields.filter((f) => state.fields[f].locked) })),
      changed: [], recent: opts.recent ?? {}, stuck: [], seed
    };
  }
  const s = cloneState(state);
  s.fields[field] = { id, source: 'manual', locked: lock };
  const plain: DrawOutcome = { ok: true, state: s, notices: [], conflicts: [], changed: [field], recent: opts.recent ?? {}, stuck: [], seed };
  const follow = followColors(s, field).filter((f) => !check.conflictingUnlocked.includes(f));
  if (!check.conflictingUnlocked.length && !follow.length) return plain;
  let res = draw(s, { targets: [...check.conflictingUnlocked, ...follow], hold: [field], seed, recent: opts.recent });
  // 直接ぶつかる項目だけでは直せないとき（例：拘束位置を変えるには拘束具も変える必要がある）は、関連項目まで広げてもう一度
  if ((!res.ok || res.stuck.length) && check.conflictingUnlocked.length) {
    // 関連の関連まで（例：持ち物 → 拘束位置 → 拘束具）
    const wider = relatedTargets(s, relatedTargets(s, check.conflictingUnlocked)).filter((f) => f !== field);
    // 順に引くため一度で組めないことがある。シードを変えて数回だけ試す（決定的）
    for (let k = 0; k < 8 && (!res.ok || res.stuck.length); k++) res = draw(s, { targets: [...wider, ...follow], hold: [field], seed: `${seed}~${k}`, recent: opts.recent });
    // それでも組めなければ、もう一段だけ広げる（例：服のずり上がり → ポーズ → 拘束位置 → 拘束具・立場）
    if (!res.ok || res.stuck.length) {
      const widest = relatedTargets(s, wider).filter((f) => f !== field);
      for (let k = 0; k < 8 && (!res.ok || res.stuck.length); k++) res = draw(s, { targets: [...widest, ...follow], hold: [field], seed: `${seed}~w${k}`, recent: opts.recent });
    }
  }
  if (!res.ok || res.stuck.length) {
    // 色を合わせられなかっただけなら、色はそのままで採用する
    if (!check.conflictingUnlocked.length) return plain;
    return { ...res, ok: false, state, notices: ['この候補と両立する組み合わせが見つかりませんでした。', ...res.notices] };
  }
  const notices = [
    ...(check.conflictingUnlocked.length ? [`「${res.changed.filter((f) => f !== field && !follow.includes(f)).map(label).join('・') || check.conflictingUnlocked.map(label).join('・')}」を、採用した候補に合わせて引き直しました。`] : []),
    ...(follow.length ? [FOLLOW_NOTICE] : []),
    ...res.notices
  ];
  return { ...res, changed: [field, ...res.changed], notices };
}

export function toggleLock(state: ForgeState, field: FieldId): ForgeState {
  const s = cloneState(state);
  s.fields[field].locked = !s.fields[field].locked;
  return s;
}

/** ロックだけを外す。値は消さない */
export function unlockAll(state: ForgeState): ForgeState {
  const s = cloneState(state);
  for (const f of DRAW_ORDER) s.fields[f].locked = false;
  return s;
}

export function lockCount(state: ForgeState): number {
  return DRAW_ORDER.filter((f) => state.fields[f].locked).length;
}

/** 行き詰まった項目を、関連する未固定項目と一緒に引き直すための対象 */
export function relatedTargets(state: ForgeState, fields: FieldId[]): FieldId[] {
  const out = new Set<FieldId>(fields);
  for (const f of fields) for (const g of RELATED[f] || []) if (!state.fields[g].locked && isActive(state, g)) out.add(g);
  return [...out];
}

export function setModule(state: ForgeState, key: keyof ForgeState['optionalModules'], on: boolean): ForgeState {
  const s = cloneState(state);
  s.optionalModules[key] = on;
  return s;
}

/** モジュールをOFFにしたあと、OFFの項目を前提にしていた値（例：囚われの場所、眼鏡を押し上げるポーズ）を、固定していなければ引き直す */
export function repairAfterModuleOff(state: ForgeState, recent?: RecentMap): DrawOutcome | null {
  const viols = allViolations(valuesOf(state));
  const set = new Set(viols.flatMap((v) => v.fields));
  // コスプレOFF：固定していないコスプレ衣装は、通常の衣装（と自動で出た色）に引き直す
  if (!state.optionalModules.cosplayEnabled && isCosplay(optionOf('outfit', state.fields.outfit.id)) && !state.fields.outfit.locked) {
    set.add('outfit');
    for (const c of followColors(state, 'outfit')) set.add(c);
  }
  const targets = [...set].filter((f) => isActive(state, f) && !state.fields[f].locked);
  if (!targets.length) return null;
  const r = draw(state, { targets, recent });
  return r.ok ? r : null;
}

/** モジュールをONにしたとき、その項目に値が無ければ抽選して埋める */
export function fillModule(state: ForgeState, module: Parameters<typeof moduleKey>[0], recent?: RecentMap): DrawOutcome | null {
  // 禁断の調合：ONにしたら、禁断演出とそれに合わせる表情・ポーズ・画角をまとめて引く（「なし」も通常どおり出る）
  if (module === 'unlimited') return draw(state, { targets: GROUPS.forbidden, recent });
  // コスプレ：ONにしたら、固定していない衣装と自動で出た色を、コスプレ枠から引き直す
  if (module === 'cosplay') {
    if (state.fields.outfit.locked) return null;
    return draw(state, { targets: ['outfit', ...followColors(state, 'outfit')], recent });
  }
  // 眼鏡・特徴・持ち物は「なし」のままだとONにした手応えがないので、固定していなければ引き直す
  const fields = DRAW_ORDER.filter((f) => fieldDef(f).module === module && isActive(state, f)
    && (!optionOf(f, state.fields[f].id) || (OFF_AS_NONE.includes(f) && state.fields[f].id === 'none' && !state.fields[f].locked)));
  if (!fields.length) return null;
  // ONにした直後は「なし」以外から引く（以降の錬成では「なし」も出る）
  const items = fields.filter((f) => ['glasses', 'marks', 'prop'].includes(f));
  const preset: StylePreset | undefined = items.length ? { id: 'module-on', ja: '', desc: '', icon: '', filters: Object.fromEntries(items.map((f) => [f, ['!none']])) } : undefined;
  const res = draw(state, { targets: fields, recent, preset });
  if (res.ok) for (const f of items) if (res.state.fields[f].source === 'preset') res.state.fields[f].source = 'random';
  return res;
}

// ---- クイック操作の対象 ----
export const GROUPS: Record<'direction' | 'outfit' | 'hair' | 'expression' | 'forbidden', FieldId[]> = {
  /** 同じ方向性で引く：主要軸を保持して、それ以外 */
  direction: DRAW_ORDER.filter((f) => !['age', 'presentation', 'archetype', 'world', 'culture'].includes(f)),
  outfit: ['outfit', 'mainColor', 'accentColor'],
  hair: ['hairLength', 'hairStyle', 'hairColor', 'hairAccent', 'hairAccentColor'],
  expression: ['expression', 'pose', 'shot', 'angle', 'prop'],
  /** 禁断演出だけ引き直す：立場・拘束・目隠し・着崩し・衣装の状態と、それに合わせる表情・ポーズ・画角 */
  forbidden: ['role', 'restraint', 'bindPos', 'anchor', 'tightness', 'blindfold', 'disarray', 'wear1', 'wear2', 'expression', 'pose', 'shot']
};

/** 候補の一覧（検索・分類で絞った中）から1つ引く。ロック指定があれば採用後に固定。 */
export function drawWithin(state: ForgeState, field: FieldId, ids: string[], lock: boolean, recent?: RecentMap): DrawOutcome {
  const unlocked = cloneState(state);
  unlocked.fields[field].locked = false;
  const preset: StylePreset = { id: 'within', ja: '', desc: '', icon: '', filters: { [field]: ids } };
  const res = draw(unlocked, { targets: [field, ...followColors(unlocked, field)], preset, strictFilter: true, recent });
  if (!res.ok) return { ...res, state };
  if (res.stuck.length) return { ...res, ok: false, state, notices: ['この一覧には、他の項目と両立する候補がありません。'] };
  res.state.fields[field] = { ...res.state.fields[field], source: 'manual', locked: lock };
  return res;
}
