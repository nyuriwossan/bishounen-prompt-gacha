/* 衣装3案のプレビュー
 * - 変えるのは衣装と、従属するメインカラー・差し色だけ（固定中のものは変えない）。他の項目はすべて保持する。
 * - 通常の抽選（draw）を対象項目だけに絞って使うので、抽選モードの相性・辞書・抽選設定の除外とOFF・hard 制約・
 *   コスプレ／禁断の状態がそのまま効く。ポーズや持ち物などを書き換えないと成立しない案は出ない。
 * - プレビュー専用のシードを使い、現在の状態・直近履歴・錬成番号を一切変えない（作るだけでは何も確定しない）。
 * - 衣装が異なる案を優先し、足りなければ色違い（明記）で補う。今の結果と同じ案・同じ案の重複は出さない。試行回数は有限。
 */
import { fieldDef, optionOf } from '../data/fields';
import { outfitColorUse, shotLevelOf } from '../prompts/build';
import type { FieldId, ForgeState } from '../types';
import { draw, valuesOf, type RecentMap } from './draw';
import { allViolations } from '../advisor/hard';
import { excludedCount, getDrawPrefs, isPrefOff } from './prefs';
import { cloneState, isActive } from './state';

export const WARDROBE_FIELDS: FieldId[] = ['outfit', 'mainColor', 'accentColor', 'outfitDetail', 'fabric'];
/** 衣装に従う細部・素材（2026-10 増築。ONで固定していなければ、衣装違いの案で衣装に合わせて引き直す） */
const DETAIL_FIELDS: FieldId[] = ['outfitDetail', 'fabric'];
const MAX_CARDS = 3;
/** 衣装違い・色違いを合わせた抽選の上限（無限に試さない） */
const MAX_TRIES = 8;

export interface WardrobeCard {
  /** 採用したときの結果（衣装・色だけが今の結果と違う） */
  state: ForgeState;
  /** 衣装は同じで色だけが違う案 */
  colorOnly: boolean;
  /** 今の結果から変わる項目の短い説明 */
  changes: string[];
  seed: string;
}
export interface WardrobePreview {
  cards: WardrobeCard[];
  /** 3案に満たないとき・0案のときの理由 */
  reason: string;
  /** 設定を見直すと増やせる項目（辞書・抽選設定への導線） */
  prefsFields: FieldId[];
  /** 衣装がOFF（辞書・抽選設定）で使えない */
  off: boolean;
  /** 作成時の状態の版。採用時に今の状態と比べ、違えば古い案として採用しない */
  baseSig: string;
}

/** 採用の可否を判断するための、状態と設定の版（値・固定・任意モード・抽選モード・辞書・抽選設定） */
export function wardrobeSig(state: ForgeState): string {
  return JSON.stringify([
    Object.entries(state.fields).map(([f, x]) => `${f}=${x.id ?? ''}${x.locked ? '!' : ''}`),
    state.optionalModules, state.settings.coherence, getDrawPrefs()
  ]);
}

/** 見た目として違いが出る部分（衣装と、その服・画角で実際に出力される色）。重複判定に使う */
function visibleKey(state: ForgeState): string {
  const o = optionOf('outfit', state.fields.outfit.id);
  const use = outfitColorUse(o, shotLevelOf(state));
  const details = DETAIL_FIELDS.map((f) => (isActive(state, f) ? state.fields[f].id : '-'));
  return [state.fields.outfit.id, use.main ? state.fields.mainColor.id : '-', use.accent ? state.fields.accentColor.id : '-', ...details].join('|');
}

const label = (f: FieldId) => fieldDef(f).short ?? fieldDef(f).ja;
function describeChanges(from: ForgeState, to: ForgeState): string[] {
  const use = outfitColorUse(optionOf('outfit', to.fields.outfit.id), shotLevelOf(to));
  const out: string[] = [];
  for (const f of WARDROBE_FIELDS) {
    const a = from.fields[f].id, b = to.fields[f].id;
    if (a === b) continue;
    // 出力されない色の変化は書かない（見た目は変わらない）。OFFの細部・素材も書かない
    if ((f === 'mainColor' && !use.main) || (f === 'accentColor' && !use.accent)) continue;
    if (DETAIL_FIELDS.includes(f) && !isActive(to, f)) continue;
    out.push(`${label(f)}：${optionOf(f, a)?.ja ?? '—'} → ${optionOf(f, b)?.ja ?? '—'}`);
  }
  return out;
}

export function wardrobePreview(state: ForgeState, opts: { seed: string; recent?: RecentMap }): WardrobePreview {
  const baseSig = wardrobeSig(state);
  const base: WardrobePreview = { cards: [], reason: '', prefsFields: [], off: false, baseSig };
  if (isPrefOff('outfit')) {
    return { ...base, off: true, prefsFields: ['outfit'], reason: '衣装は辞書・抽選設定でOFFにしているため、衣装の案を作れません。ONにすると使えます（今の結果はそのままです）。' };
  }
  const work = cloneState(state);
  const curKey = visibleKey(work);
  const seen = new Set([curKey]);
  const cards: WardrobeCard[] = [];
  const prefsFields = new Set<FieldId>();
  let tries = 0;
  const outfitFree = isActive(work, 'outfit') && !work.fields.outfit.locked;
  const colorFree = (['mainColor', 'accentColor'] as FieldId[]).filter((f) => isActive(work, f) && !work.fields[f].locked);
  const detailFree = DETAIL_FIELDS.filter((f) => isActive(work, f) && !work.fields[f].locked);

  const attempt = (targets: FieldId[], avoid: Partial<Record<FieldId, string[]>>, colorOnly: boolean): boolean => {
    if (tries >= MAX_TRIES || !targets.length) return false;
    const seed = `${opts.seed}~${tries++}`;
    // recent は複製を渡す（プレビューでは直近履歴を進めない）
    const r = draw(work, { targets, seed, avoid, recent: opts.recent ? JSON.parse(JSON.stringify(opts.recent)) : undefined });
    if (!r.ok) { for (const f of r.prefsFields ?? []) prefsFields.add(f); return false; }
    if (r.stuck.length) return false;
    const key = visibleKey(r.state);
    if (seen.has(key)) return false;
    // 念のため全体の hard 制約を確かめる（衣装以外を変えずに成立していること）
    if (allViolations(valuesOf(r.state)).length) return false;
    seen.add(key);
    const next = cloneState(state);
    for (const f of WARDROBE_FIELDS) next.fields[f] = { ...r.state.fields[f] };
    next.lastSeed = seed;
    cards.push({ state: next, colorOnly, changes: describeChanges(state, next), seed });
    return true;
  };

  // 1. 衣装が異なる案（今の衣装・出した衣装を避ける）
  if (outfitFree) {
    while (cards.length < MAX_CARDS && tries < MAX_TRIES) {
      const avoid = { outfit: [work.fields.outfit.id ?? '', ...cards.map((c) => c.state.fields.outfit.id ?? '')] };
      if (!attempt(['outfit', ...colorFree, ...detailFree], avoid, false)) break;
    }
  }
  // 2. 足りなければ色違い（衣装はそのまま、出力される色だけ）
  const use = outfitColorUse(optionOf('outfit', work.fields.outfit.id), shotLevelOf(work));
  const visibleColors = colorFree.filter((f) => (f === 'mainColor' ? use.main : use.accent));
  let colorMiss = 0;
  while (cards.length < MAX_CARDS && tries < MAX_TRIES && visibleColors.length && colorMiss < 2) {
    const lead = visibleColors[0];
    const used = [work.fields[lead].id ?? '', ...cards.filter((c) => c.colorOnly).map((c) => c.state.fields[lead].id ?? '')];
    if (!attempt(visibleColors, { [lead]: used }, true)) colorMiss++;
  }

  const n = cards.length;
  let reason = '';
  if (n < MAX_CARDS) {
    const why: string[] = [];
    if (!outfitFree) why.push(work.fields.outfit.locked ? '衣装を固定しているため、色違いだけを出しています' : '衣装を変えられません');
    else why.push('今の固定・ポーズ・持ち物・コスプレや禁断の状態・抽選モードの相性と両立する別の衣装が限られています');
    if (!visibleColors.length) why.push(colorFree.length ? 'この服・この画角では色が出力されないため、色違いは作れません' : '衣装の色を固定しているため、色違いは作れません');
    if (excludedCount('outfit') > 0 || excludedCount('mainColor') > 0 || excludedCount('accentColor') > 0) {
      why.push('辞書・抽選設定で衣装や色の候補を除外しています');
      for (const f of WARDROBE_FIELDS) if (excludedCount(f) > 0) prefsFields.add(f);
    }
    reason = n === 0
      ? `条件に合う別の案が見つかりませんでした（${why.join('。')}）。今の結果はそのままです。`
      : `条件に合う別の案は${n}案でした（${why.join('。')}）。`;
  }
  return { cards, reason, prefsFields: [...prefsFields], off: false, baseSig };
}

/** 案を採用するときの検証。作成後に結果や設定が変わっていれば、古い案として採用しない */
export function canAdoptCard(current: ForgeState, preview: WardrobePreview, card: WardrobeCard): { ok: boolean; reason?: string } {
  if (wardrobeSig(current) !== preview.baseSig) return { ok: false, reason: '案を作ったあとに結果か設定が変わったため、この案は使えません。「別の3案を見る」で作り直してください。' };
  if (allViolations(valuesOf(card.state)).length) return { ok: false, reason: 'この案は今の条件と両立しません。作り直してください。' };
  return { ok: true };
}

/** 採用：衣装と色だけを今の結果へ反映した状態（錬成番号は1つ進める） */
export function applyCard(current: ForgeState, card: WardrobeCard): { state: ForgeState; changed: FieldId[] } {
  const s = cloneState(current);
  const changed: FieldId[] = [];
  for (const f of WARDROBE_FIELDS) {
    if (s.fields[f].id !== card.state.fields[f].id) changed.push(f);
    s.fields[f] = { ...card.state.fields[f] };
  }
  s.lastSeed = card.seed;
  s.drawCount = (current.drawCount || 0) + 1;
  return { state: s, changed };
}
