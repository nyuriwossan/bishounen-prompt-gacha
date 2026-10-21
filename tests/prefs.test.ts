/* 辞書・抽選設定（候補の除外・項目のOFF）の回帰テスト
 * - 除外は候補集合に適用され、すべての自動の抽選経路・3モード・フォールバックで復活しない
 * - 成立しない抽選は全体を取り消し、結果・直近履歴を部分的に変えない
 * - OFFの項目は出力から消え、値と固定は保持され、ONで戻る（再抽選しない）
 * - 保存は版付き・ID管理。古いデータ・JSON・共有URLを壊さず、読込で個人設定を勝手に上書きしない
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { allViolations } from '../src/advisor/hard';
import { DRAW_ORDER, fieldDef, FIELDS, optionOf } from '../src/data/fields';
import { STYLE_PRESETS } from '../src/data/presets';
import { adopt, checkAdopt, draw, drawWithin, fillModule, GROUPS, presetPrefsConflicts, repairAfterModuleOff, toggleLock, unlockAll, valuesOf } from '../src/engine/draw';
import { allowedOf, emptyPrefs, excludedCount, getDrawPrefs, hasPrefs, isExcluded, OFFABLE_FIELDS, REQUIRED_FIELDS, setDrawPrefs, type DrawPrefs } from '../src/engine/prefs';
import { seededRandom } from '../src/engine/rng';
import { cloneState, emptyState, isActive } from '../src/engine/state';
import { matchAny } from '../src/engine/match';
import { buildPrompt, titleOf, toMarkdown } from '../src/prompts/build';
import {
  backupHasPrefs, clearAll, decodeShare, encodeShare, exportBackup, importBackup, KEYS, listFavorites, loadPrefs, normalizePrefs, PREFS_KEY, saveFavorite, savePrefs, setStorage, type KV
} from '../src/storage/storage';
import type { FieldId, ForgeState, Mode, OutputTarget } from '../src/types';

class MemoryKV implements KV {
  data = new Map<string, string>();
  fail = false;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.fail) throw new Error('QuotaExceededError'); this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}
let kv: MemoryKV;
beforeEach(() => { kv = new MemoryKV(); setStorage(kv); setDrawPrefs(null); });
afterEach(() => { setDrawPrefs(null); setStorage(null); });

const MODES: Mode[] = ['coherent', 'balanced', 'wild'];
const TARGETS: OutputTarget[] = ['pixai', 'novelai', 'genericTags', 'naturalEnglish', 'japanese'];
const prefsOf = (excluded: DrawPrefs['excluded'], disabled: FieldId[] = []): DrawPrefs => ({ ...emptyPrefs(), excluded, disabled });
const ids = (f: FieldId) => fieldDef(f).options.map((o) => o.id);
const fresh = (seed: string, mode: Mode = 'coherent', mods: Partial<ForgeState['optionalModules']> = {}) => {
  const s = emptyState(); s.settings.coherence = mode; Object.assign(s.optionalModules, mods);
  const r = draw(s, { seed });
  expect(r.ok, r.notices.join()).toBe(true);
  return r.state;
};
/** 自動で入った値（固定・手動以外）が除外候補でないか */
function excludedAuto(s: ForgeState): string[] {
  return DRAW_ORDER.filter((f) => isActive(s, f) && fieldDef(f).randomizable !== false && !s.fields[f].locked && s.fields[f].source !== 'manual' && isExcluded(f, s.fields[f].id))
    .map((f) => `${f}=${s.fields[f].id}`);
}
const tagsOf = (s: ForgeState) => buildPrompt(s, 'genericTags').positive.split(',').map((t) => t.trim());

describe('未設定では従来どおり', () => {
  it('除外なし・OFFなしの設定と、設定なしは同じ抽選・出力になる（同じシード）', () => {
    for (const mode of MODES) for (let i = 0; i < 8; i++) {
      const mods = i % 2 ? { unlimitedEnabled: true, glassesEnabled: true, propEnabled: true } : { cosplayEnabled: i % 4 === 0 };
      setDrawPrefs(null);
      const a = draw(Object.assign(emptyState(), { settings: { ...emptyState().settings, coherence: mode } }, { optionalModules: { ...emptyState().optionalModules, ...mods } }), { seed: `same-${i}`, preset: i % 3 ? undefined : STYLE_PRESETS[i] });
      setDrawPrefs(prefsOf({}, []));
      const b = draw(Object.assign(emptyState(), { settings: { ...emptyState().settings, coherence: mode } }, { optionalModules: { ...emptyState().optionalModules, ...mods } }), { seed: `same-${i}`, preset: i % 3 ? undefined : STYLE_PRESETS[i] });
      expect(JSON.stringify(b.state.fields)).toBe(JSON.stringify(a.state.fields));
      for (const t of TARGETS) expect(buildPrompt(b.state, t).positive).toBe(buildPrompt(a.state, t).positive);
    }
  });
  it('辞書から消えた候補の未知IDだけの除外は、抽選に影響しない', () => {
    const a = fresh('unknown');
    setDrawPrefs(prefsOf({ hairStyle: ['no_such_style'], outfit: ['gone_outfit'] }));
    const b = fresh('unknown');
    expect(b.fields).toEqual(a.fields);
    expect(excludedCount('hairStyle')).toBe(0);
  });
  it('既定の任意スイッチ（眼鏡・持ち物・獣人・禁断・コスプレのOFF）は、設定を変えても勝手にONにならない', () => {
    setDrawPrefs(prefsOf({ glasses: ['none'], prop: ['none'] }));
    const s = fresh('modules');
    for (const k of ['glassesEnabled', 'marksEnabled', 'propEnabled', 'kemonoEnabled', 'unlimitedEnabled', 'cosplayEnabled'] as const) expect(s.optionalModules[k], k).toBe(false);
  });
});

describe('除外は候補集合に適用される', () => {
  it('allowedOf は除外候補を外す。未設定なら同じ配列を返す', () => {
    const all = fieldDef('hairStyle').options;
    expect(allowedOf('hairStyle', all)).toBe(all);
    setDrawPrefs(prefsOf({ hairStyle: [all[0].id, all[1].id] }));
    expect(allowedOf('hairStyle', all).map((o) => o.id)).toEqual(all.slice(2).map((o) => o.id));
  });
  it('1件だけ許可すると、3モード・おまかせスタイル・部分の引き直しのどれでも必ずその候補になる', () => {
    setDrawPrefs(prefsOf({ eyeColor: ids('eyeColor').filter((x) => x !== 'crimson') }));
    for (const mode of MODES) {
      for (const [i, preset] of [undefined, ...STYLE_PRESETS.filter((p) => !p.filters.eyeColor && p.group !== 'forbidden')].entries()) {
        const s0 = emptyState(); s0.settings.coherence = mode;
        const r = draw(s0, { seed: `one-${mode}-${i}`, preset });
        expect(r.ok, `${mode} ${preset?.id} ${r.notices}`).toBe(true);
        expect(r.state.fields.eyeColor.id).toBe('crimson');
      }
    }
    const s = fresh('one-groups');
    for (const g of Object.keys(GROUPS) as Array<keyof typeof GROUPS>) {
      const r = draw(s, { targets: [...GROUPS[g], 'eyeColor'], seed: `g-${g}` });
      expect(r.ok).toBe(true);
      expect(r.state.fields.eyeColor.id).toBe('crimson');
    }
  });
  it('大量抽選：除外した候補は、全体錬成・部分の引き直し・サイコロ・スタイル・この中から引く・ON時の補充・OFF時の修復で一度も出ない', { timeout: 300000 }, async () => {
    const rng = seededRandom('prefs-mass');
    const pick = (f: FieldId, ratio: number) => ids(f).filter(() => rng() < ratio);
    // 半分前後を除外（「なし」も除外対象になり得る）
    const excluded: DrawPrefs['excluded'] = {
      archetype: pick('archetype', 0.4), hairStyle: pick('hairStyle', 0.5), hairColor: pick('hairColor', 0.5), outfit: pick('outfit', 0.4), expression: pick('expression', 0.4),
      pose: pick('pose', 0.4), scene: pick('scene', 0.4), world: pick('world', 0.3), eyeColor: pick('eyeColor', 0.5), mainColor: pick('mainColor', 0.5), accentColor: pick('accentColor', 0.5),
      restraint: pick('restraint', 0.3).filter((x) => x !== 'none'), blindfold: pick('blindfold', 0.3).filter((x) => x !== 'none'), name: pick('name', 0.5), kemonoSpecies: pick('kemonoSpecies', 0.5)
    };
    setDrawPrefs(prefsOf(excluded));
    const leaks: string[] = [];
    let ok = 0, refused = 0;
    const PRESETS = [undefined, ...STYLE_PRESETS];
    for (let i = 0; i < 900; i++) {
      if (i % 50 === 0) await new Promise((r) => setImmediate(r));
      const mode = MODES[i % 3];
      const mods = [{}, { unlimitedEnabled: true, glassesEnabled: true, propEnabled: true }, { cosplayEnabled: true, kemonoEnabled: true }, { kemonoEnabled: true, hairAccentEnabled: true, marksEnabled: true }][i % 4];
      const s0 = emptyState(); s0.settings.coherence = mode; Object.assign(s0.optionalModules, mods);
      const preset = PRESETS[i % PRESETS.length];
      const r0 = draw(s0, { seed: `pm-${i}`, preset: preset?.group === 'forbidden' && !s0.optionalModules.unlimitedEnabled ? undefined : preset });
      if (!r0.ok) { refused++; expect(r0.state).toBe(s0); continue; }
      ok++;
      let s = r0.state;
      leaks.push(...excludedAuto(s).map((x) => `forge#${i}:${x}`));
      // 部分の引き直し
      const g = (Object.keys(GROUPS) as Array<keyof typeof GROUPS>)[i % 5];
      const rg = draw(s, { targets: GROUPS[g], seed: `pg-${i}` });
      if (rg.ok) { leaks.push(...excludedAuto(rg.state).map((x) => `group#${i}:${x}`)); s = rg.state; }
      // サイコロ（1項目）
      const f = (['hairStyle', 'outfit', 'expression', 'pose', 'scene', 'eyeColor'] as FieldId[])[i % 6];
      const rf = draw(s, { targets: [f], seed: `pf-${i}` });
      if (rf.ok) leaks.push(...excludedAuto(rf.state).map((x) => `reroll#${i}:${x}`));
      // この中から引く（除外候補を混ぜた一覧を渡しても、除外候補は出ない）
      const w = drawWithin(s, 'hairColor', ids('hairColor').slice(0, 30), false);
      if (w.ok && isExcluded('hairColor', w.state.fields.hairColor.id)) leaks.push(`within#${i}:${w.state.fields.hairColor.id}`);
      // 手動採用に伴う引き直し（衣装を手で選ぶ → 自動の色を合わせる）
      const ad = adopt(s, 'outfit', 'black_suit', false, { seed: `pa-${i}` });
      if (ad.ok) for (const c of ['mainColor', 'accentColor'] as FieldId[]) if (ad.state.fields[c].source === 'random' && isExcluded(c, ad.state.fields[c].id)) leaks.push(`adopt#${i}:${c}`);
      // ONにした直後の補充・OFF時の修復
      if (i % 10 === 0) {
        const on = cloneState(s); on.optionalModules.unlimitedEnabled = true;
        const fm = fillModule(on, 'unlimited');
        if (fm?.ok) leaks.push(...excludedAuto(fm.state).map((x) => `fill#${i}:${x}`));
        const off = cloneState(fm?.ok ? fm.state : on); off.optionalModules.unlimitedEnabled = false;
        const rp = repairAfterModuleOff(off);
        if (rp?.ok) leaks.push(...excludedAuto(rp.state).map((x) => `repair#${i}:${x}`));
      }
      if (allViolations(valuesOf(s)).length) leaks.push(`hard#${i}`);
    }
    expect(leaks).toEqual([]);
    expect(ok).toBeGreaterThan(refused);
  });
  it('直近の重複回避をゆるめる段階でも、除外した候補へは戻らない', () => {
    // 年齢層を2件だけ許可し、直近履歴をその2件で埋める
    setDrawPrefs(prefsOf({ age: ids('age').filter((x) => !['a25_34', 'a35_44'].includes(x)) }));
    let s = fresh('recent');
    let recent = {};
    for (let i = 0; i < 20; i++) {
      const r = draw(s, { targets: ['age'], recent });
      expect(r.ok).toBe(true);
      expect(['a25_34', 'a35_44']).toContain(r.state.fields.age.id);
      s = r.state; recent = r.recent;
    }
  });
  it('コスプレON：除外していないコスプレ衣装だけから引き、すべて除外したら通常の衣装へ逃がさず錬成しない', () => {
    const cos = fieldDef('outfit').options.filter((o) => o.cat === 'cosplay').map((o) => o.id);
    setDrawPrefs(prefsOf({ outfit: cos.filter((x) => x !== cos[0]) }));
    for (let i = 0; i < 12; i++) expect(fresh(`cos-${i}`, MODES[i % 3], { cosplayEnabled: true }).fields.outfit.id).toBe(cos[0]);
    const s = fresh('cos-base', 'coherent', { cosplayEnabled: true });
    setDrawPrefs(prefsOf({ outfit: cos }));
    const r = draw(s, { seed: 'cos-none' });
    expect(r.ok).toBe(false);
    expect(r.prefsKind).toBe('zero');
    expect(r.notices.join()).toContain('コスプレ枠');
    expect(r.state).toBe(s);
  });
});

describe('固定と除外', () => {
  it('固定した値を除外しても値は保たれ、固定を外したあとの抽選では出ない', () => {
    let s = fresh('lockx');
    const id = s.fields.hairColor.id!;
    s = toggleLock(s, 'hairColor');
    setDrawPrefs(prefsOf({ hairColor: [id] }));
    for (let i = 0; i < 6; i++) {
      const r = draw(s, { seed: `lx-${i}` });
      expect(r.ok).toBe(true);
      expect(r.state.fields.hairColor).toEqual({ id, source: 'random', locked: true });
    }
    s = unlockAll(s);
    // 「ロック全解除」は除外設定を変えない
    expect(getDrawPrefs().excluded.hairColor).toEqual([id]);
    for (let i = 0; i < 30; i++) expect(draw(s, { seed: `ux-${i}` }).state.fields.hairColor.id).not.toBe(id);
  });
  it('除外しても、今の結果・保存済みのお気に入りは書き換えない', () => {
    const s = fresh('keep');
    saveFavorite(s, 'keep');
    const before = JSON.stringify(s);
    setDrawPrefs(prefsOf({ outfit: [s.fields.outfit.id!], hairStyle: [s.fields.hairStyle.id!] }));
    expect(JSON.stringify(s)).toBe(before);
    expect(JSON.stringify(listFavorites()[0].state.fields)).toBe(JSON.stringify(s.fields));
  });
});

describe('成立しない抽選は全体を取り消す', () => {
  it('抽選対象が0件：理由と項目を返し、結果・直近履歴を変えない', () => {
    const s = fresh('zero');
    setDrawPrefs(prefsOf({ hairStyle: ids('hairStyle') }));
    const recent = { age: ['a25_34'] };
    const r = draw(s, { seed: 'z', recent });
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(r.changed).toEqual([]);
    expect(r.recent).toBe(recent);
    expect(r.prefsKind).toBe('zero');
    expect(r.prefsFields).toEqual(['hairStyle']);
    expect(r.notices.join()).toContain('「髪型」に抽選対象の候補が0件');
    // 髪型を含まない部分の引き直しは成立する
    expect(draw(s, { targets: GROUPS.outfit, seed: 'z2' }).ok).toBe(true);
  });
  it('固定との衝突：髪の長さを固定し、その長さに合う髪型をすべて除外 → 髪の長さの固定を見直すよう案内し、何も変えない', () => {
    let s = fresh('stuck');
    s = cloneState(s); s.fields.hairLength = { id: 'very_short', source: 'manual', locked: true };
    const fits = fieldDef('hairStyle').options.filter((o) => !o.lengths || o.lengths.includes('very_short')).map((o) => o.id);
    setDrawPrefs(prefsOf({ hairStyle: fits }));
    const r = draw(s, { seed: 'st' });
    expect(r.ok).toBe(false);
    expect(r.prefsKind).toBe('stuck');
    expect(r.prefsFields).toEqual(['hairStyle']);
    expect(r.notices.join()).toMatch(/「髪型」に選べる候補がありません.*「髪の長さ」の固定を見直してください/);
    expect(r.state).toBe(s);
    expect(r.stuck).toEqual([]);
  });
  it('おまかせスタイルの条件に合う候補をすべて除外：実行前に説明でき、実行しても条件外へ黙って逃がさない', () => {
    const black = STYLE_PRESETS.find((p) => p.id === 'black')!;
    const s = fresh('preset');
    const matching = fieldDef('hairColor').options.filter((o) => matchAny(o, black.filters.hairColor)).map((o) => o.id);
    setDrawPrefs(prefsOf({ hairColor: matching }));
    const pre = presetPrefsConflicts(s, black);
    expect(pre.map((c) => c.field)).toEqual(['hairColor']);
    expect(pre[0].message).toContain('黒髪特集');
    const r = draw(s, { seed: 'pr', preset: black });
    expect(r.ok).toBe(false);
    expect(r.prefsKind).toBe('preset');
    expect(r.state).toBe(s);
    // 条件の一部だけ除外しているなら、残りから引く
    setDrawPrefs(prefsOf({ hairColor: matching.slice(1) }));
    expect(presetPrefsConflicts(s, black)).toEqual([]);
    const ok = draw(s, { seed: 'pr2', preset: black });
    expect(ok.ok).toBe(true);
    expect(ok.state.fields.hairColor.id).toBe(matching[0]);
  });
  it('この中から引く：一覧の候補がすべて除外中なら、説明して何も変えない', () => {
    const s = fresh('within');
    setDrawPrefs(prefsOf({ hairColor: ['black', 'blue_black'] }));
    const r = drawWithin(s, 'hairColor', ['black', 'blue_black'], true);
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(r.notices.join()).toContain('抽選対象の候補がありません');
  });
});

describe('手で選ぶ', () => {
  it('除外中の候補も手で選べ、除外の設定は変わらない', () => {
    const s = fresh('manual');
    const target = ids('outfit').find((x) => x !== s.fields.outfit.id && checkAdopt(s, 'outfit', x).ok)!;
    setDrawPrefs(prefsOf({ outfit: [target] }));
    const before = JSON.stringify(getDrawPrefs());
    expect(checkAdopt(s, 'outfit', target).ok).toBe(true);
    const r = adopt(s, 'outfit', target, true, { seed: 'm' });
    expect(r.ok).toBe(true);
    expect(r.state.fields.outfit).toEqual({ id: target, source: 'manual', locked: true });
    expect(JSON.stringify(getDrawPrefs())).toBe(before);
  });
  it('OFFの項目は手で変えられず、OFFの項目を前提にする候補も選べない（ONにすると選べる）', () => {
    const s = fresh('offmanual');
    setDrawPrefs(prefsOf({}, ['hairColor', 'outfit']));
    const c = checkAdopt(s, 'hairColor', 'black');
    expect(c.blockingPrefOff).toBe(true);
    const r = adopt(s, 'hairColor', 'black', true);
    expect(r.ok).toBe(false);
    expect(r.prefsKind).toBe('off');
    expect(r.state).toBe(s);
    // 黒髪クール（髪の色が前提）・ネクタイを緩める（衣装が前提）
    expect(checkAdopt(s, 'archetype', 'black_hair_cool').blockingOff).toContain('hairColor');
    expect(checkAdopt(s, 'pose', 'loosen_tie').blockingOff).toContain('outfit');
    setDrawPrefs(null);
    expect(checkAdopt(s, 'archetype', 'black_hair_cool').blockingOff).toEqual([]);
  });
});

describe('項目のOFF（カテゴリ全体）', () => {
  it('OFFにできない必須項目（年齢層・美形タイプ・構図）と、自動で抽選しない画風は、OFFの対象外', () => {
    for (const f of Object.keys(REQUIRED_FIELDS) as FieldId[]) expect(OFFABLE_FIELDS).not.toContain(f);
    expect(OFFABLE_FIELDS).not.toContain('artStyle');
    // モジュールのある項目は既存のスイッチを使う（二重のスイッチを作らない）
    for (const f of OFFABLE_FIELDS) expect(fieldDef(f).module, f).toBeUndefined();
    // 不正なOFF指定（必須・モジュール項目）は無視する
    setDrawPrefs(prefsOf({}, ['age', 'glasses', 'artStyle'] as FieldId[]));
    const s = fresh('required');
    expect(isActive(s, 'age')).toBe(true);
    expect(buildPrompt(s).positive).toMatch(/young man|man\b|adult|mature|elderly|middle-aged/i);
  });
  it('OFFは出力に即時反映し、値と固定は保持。ONに戻すと元の値で出力する（再抽選しない）', () => {
    let s = fresh('offout');
    s = toggleLock(s, 'hairColor');
    const color = optionOf('hairColor', s.fields.hairColor.id)!;
    const before = Object.fromEntries(TARGETS.map((t) => [t, buildPrompt(s, t).positive]));
    setDrawPrefs(prefsOf({}, ['hairColor']));
    for (const t of ['pixai', 'novelai', 'genericTags'] as OutputTarget[]) for (const tag of color.en) expect(buildPrompt(s, t).positive.split(', ')).not.toContain(tag);
    expect(buildPrompt(s, 'naturalEnglish').positive).not.toContain(color.en[0].replace(/ hair$/, ' hair'));
    expect(buildPrompt(s, 'japanese').positive).not.toContain(color.ja);
    expect(toMarkdown(s)).not.toContain(color.ja);
    expect(titleOf(s)).not.toContain(color.ja.slice(0, 2));
    expect(s.fields.hairColor).toEqual({ id: color.id, source: 'random', locked: true });
    // OFFの間の錬成でも値は変わらない
    const r = draw(s, { seed: 'off-draw' });
    expect(r.state.fields.hairColor).toEqual(s.fields.hairColor);
    setDrawPrefs(null);
    for (const t of TARGETS) expect(buildPrompt(s, t).positive).toBe(before[t]);
  });
  it('衣装をOFF：衣装・衣装の色・着崩し・衣装の状態のタグが出ず、衣装を前提にするポーズを引かない', () => {
    setDrawPrefs(prefsOf({}, ['outfit']));
    for (let i = 0; i < 60; i++) {
      const s = fresh(`nooutfit-${i}`, MODES[i % 3], { unlimitedEnabled: i % 2 === 0, propEnabled: true });
      const out = buildPrompt(s, 'genericTags');
      expect(out.sections.find((x) => x.id === 'outfit')!.tags).toEqual([]);
      const v = valuesOf(s);
      expect(v.outfit).toBeUndefined();
      expect(v.mainColor).toBeUndefined();
      expect([v.disarray?.id, v.wear1?.id, v.wear2?.id].filter((x) => x && x !== 'none')).toEqual([]);
      const pose = optionOf('pose', s.fields.pose.id);
      expect(pose?.requires?.some((r) => r.startsWith('outfit:')) ?? false, pose?.id).toBe(false);
      expect(buildPrompt(s, 'japanese').japaneseLines.map(([k]) => k)).not.toContain('衣装');
      expect(buildPrompt(s, 'naturalEnglish').positive).not.toMatch(/He wears (a|an) [^;]+\.(\s|$)/);
    }
  });
  it('OFFの項目の隠れた値は、他の項目の抽選を縛らない（固定した黒髪でも、髪の色OFFなら銀髪特集の髪の条件は判定しない）', () => {
    let s = fresh('hidden');
    s = cloneState(s); s.fields.hairColor = { id: 'black', source: 'manual', locked: true };
    s.fields.archetype = { id: 'black_hair_cool', source: 'manual', locked: false };
    setDrawPrefs(prefsOf({}, ['hairColor']));
    // 髪の色がOFFなので「黒髪クール」は自動では出ない（実際に必要な依存は保つ）
    for (let i = 0; i < 40; i++) expect(draw(s, { seed: `hid-${i}`, targets: ['archetype'] }).state.fields.archetype.id).not.toBe('black_hair_cool');
    expect(allViolations(valuesOf(s)).length).toBe(0);
  });
  it('出力される各形式で、OFFの項目のタグは他の項目の由来以外から出ない（複合タグの漏れなし）', () => {
    const leaks: string[] = [];
    for (const off of OFFABLE_FIELDS) for (let k = 0; k < 6; k++) {
      setDrawPrefs(null);
      const base = fresh(`leak-${off}-${k}`, MODES[k % 3], k % 2 ? { unlimitedEnabled: true } : { kemonoEnabled: true, glassesEnabled: true, propEnabled: true });
      const own = optionOf(off, base.fields[off].id);
      setDrawPrefs(prefsOf({}, [off]));
      const tags = new Set(tagsOf(base).map((t) => t.toLowerCase()));
      // 他の有効な項目の値の英語（と衣装テンプレート）に含まれるタグは、その項目の由来なので許す
      const v = valuesOf(base);
      const others = new Set(Object.entries(v).filter(([f]) => f !== off).flatMap(([, o]) => [...o!.en, ...(o!.upper ?? '').split(/\s*,\s*/), ...(o!.lower ?? '').split(/\s*,\s*/)]).map((t) => t.toLowerCase().trim()));
      for (const t of own?.en ?? []) if (tags.has(t.toLowerCase()) && !others.has(t.toLowerCase())) leaks.push(`${off}:${t}`);
      // 日本語設定の行にも出さない（OFFの項目の行は消える）
      const ja = buildPrompt(base, 'japanese');
      if (own && ja.japaneseLines.some(([key, val]) => key === fieldDef(off).ja && val === own.ja)) leaks.push(`${off}:ja`);
      // 衣装の色：衣装テンプレートの {c1}/{c2} からも出ない
      if (off === 'mainColor' || off === 'accentColor') {
        const pos = buildPrompt(base, 'genericTags').positive;
        expect(pos).not.toMatch(/\{c[12]\}/);
      }
    }
    expect(leaks).toEqual([]);
  });
  it('OFFの間は「この項目だけ再抽選」の対象にならない', () => {
    const s = fresh('noreroll');
    setDrawPrefs(prefsOf({}, ['expression']));
    const r = draw(s, { targets: ['expression'] });
    expect(r.changed).toEqual([]);
    expect(r.state.fields.expression).toEqual(s.fields.expression);
  });
});

describe('保存・読込', () => {
  it('版付きで保存し、再読み込みで同じ設定になる', () => {
    const p = prefsOf({ hairStyle: ['mash', 'wolf_cut'] }, ['background' as FieldId, 'outfit']);
    expect(savePrefs(p)).toBe(true);
    const raw = JSON.parse(kv.getItem(PREFS_KEY)!);
    expect(raw.version).toBe(1);
    const l = loadPrefs();
    expect(l.ok).toBe(true);
    expect(l.prefs.excluded).toEqual({ hairStyle: ['mash', 'wolf_cut'] });
    // OFFにできない項目は読み込み時に落とす
    expect(l.prefs.disabled).toEqual(['outfit']);
  });
  it('保存に失敗したら false（成功扱いにしない）。保存先が使えないときも false', () => {
    kv.fail = true;
    expect(savePrefs(prefsOf({ hairStyle: ['mash'] }))).toBe(false);
    setStorage({ getItem: () => null, setItem: () => { throw new Error('denied'); }, removeItem: () => undefined });
    expect(savePrefs(emptyPrefs())).toBe(false);
  });
  it('壊れた設定はこの設定だけ初期化し、お気に入り・履歴は消さない', () => {
    saveFavorite(fresh('fav'), 'fav');
    kv.setItem(PREFS_KEY, '{broken');
    const a = loadPrefs();
    expect(a.ok).toBe(false);
    expect(hasPrefs(a.prefs)).toBe(false);
    kv.setItem(PREFS_KEY, JSON.stringify({ version: 1, excluded: 'x' }));
    expect(loadPrefs().ok).toBe(false);
    expect(listFavorites().length).toBe(1);
  });
  it('改名したIDは読み替え、未知IDはエラーにせず保持（数えない）、重複は除く', () => {
    const n = normalizePrefs({ version: 1, excluded: { bindPos: ['armrests', 'armrests'], hairStyle: ['ghost', 5, ''], nope: ['x'] }, disabled: ['outfit', 'outfit', 'zzz'] });
    expect(n.ok).toBe(true);
    expect(n.prefs.excluded.bindPos).toEqual(['chair_back']);
    expect(n.prefs.excluded.hairStyle).toEqual(['ghost']);
    expect(n.prefs.disabled).toEqual(['outfit']);
    setDrawPrefs(n.prefs);
    expect(excludedCount('hairStyle')).toBe(0);
    expect(isExcluded('bindPos', 'chair_back')).toBe(true);
    // 新しい版の設定でも、読める範囲で使う
    expect(normalizePrefs({ version: 99, excluded: { hairStyle: ['mash'] } }).prefs.excluded.hairStyle).toEqual(['mash']);
  });
  it('辞書に新しく足された候補は、初期状態で抽選対象（除外IDだけを保存しているため）', () => {
    setDrawPrefs(prefsOf({ hairStyle: ['mash'] }));
    const fake = { ...fieldDef('hairStyle').options[0], id: 'brand_new_style' };
    expect(allowedOf('hairStyle', [fake]).map((o) => o.id)).toEqual(['brand_new_style']);
  });
  it('「保存データをすべて削除」は設定を消さない（設定のリセットは辞書・抽選設定から行う）', () => {
    savePrefs(prefsOf({ hairStyle: ['mash'] }));
    clearAll();
    expect(loadPrefs().prefs.excluded.hairStyle).toEqual(['mash']);
    expect(Object.values(KEYS)).not.toContain(PREFS_KEY);
  });
});

describe('JSON・共有URL', () => {
  it('全データJSONに設定を含め、読込では設定を返すだけで保存しない（復元は利用者が選んだときだけ）', () => {
    const s = fresh('json');
    saveFavorite(s, 'a');
    const p = prefsOf({ outfit: ['black_suit'] }, ['world']);
    const text = exportBackup(s, p);
    expect(JSON.parse(text).drawPrefs).toEqual({ version: 1, excluded: { outfit: ['black_suit'] }, disabled: ['world'] });
    expect(backupHasPrefs(text)).toBe(true);
    // 別の端末を想定：今の設定は別物
    kv.data.clear();
    savePrefs(prefsOf({ hairStyle: ['mash'] }));
    const r = importBackup(text);
    expect(r.ok).toBe(true);
    expect(r.favoritesAdded).toBe(1);
    expect(r.drawPrefs).toEqual(p);
    // importBackup 自体は設定を書き換えない
    expect(loadPrefs().prefs.excluded).toEqual({ hairStyle: ['mash'] });
  });
  it('古いJSON（設定なし）も読め、設定を含まないと判定する', () => {
    const s = fresh('oldjson');
    const old = JSON.parse(exportBackup(s, emptyPrefs()));
    delete old.drawPrefs;
    const text = JSON.stringify(old);
    expect(backupHasPrefs(text)).toBe(false);
    savePrefs(prefsOf({ hairStyle: ['mash'] }));
    const r = importBackup(text);
    expect(r.ok).toBe(true);
    expect(r.drawPrefs).toBeUndefined();
    expect(loadPrefs().prefs.excluded).toEqual({ hairStyle: ['mash'] });
  });
  it('ファイル内の壊れた設定は読み込まず、お気に入りは読み込む', () => {
    const s = fresh('badjson');
    saveFavorite(s, 'x');
    const obj = JSON.parse(exportBackup(s, emptyPrefs()));
    obj.drawPrefs = { version: 'x' };
    kv.data.clear();
    const r = importBackup(JSON.stringify(obj));
    expect(r.ok).toBe(true);
    expect(r.favoritesAdded).toBe(1);
    expect(r.drawPrefs).toBeUndefined();
    expect(r.report.notes.join()).toContain('辞書・抽選設定');
  });
  it('共有URLに個人の設定を混ぜず、開いても受信側の設定を変えない。除外中の候補でも置き換えずに復元する', () => {
    const s = fresh('share');
    setDrawPrefs(prefsOf({ hairStyle: [s.fields.hairStyle.id!] }, ['world']));
    const code = encodeShare(s);
    const text = decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length + 3) % 4))));
    expect(text).not.toMatch(/excluded|disabled|drawPrefs/);
    savePrefs(prefsOf({ outfit: ['black_suit'] }));
    const d = decodeShare(code);
    expect(d.state!.fields.hairStyle.id).toBe(s.fields.hairStyle.id);
    expect(d.state!.fields.world.id).toBe(s.fields.world.id);
    expect(loadPrefs().prefs.excluded).toEqual({ outfit: ['black_suit'] });
  });
});

describe('辞書の件数', () => {
  it('件数は辞書から算出（固定値を持たない）', () => {
    setDrawPrefs(prefsOf({ hairStyle: ids('hairStyle').slice(0, 6) }));
    expect(excludedCount('hairStyle')).toBe(6);
    expect(FIELDS.find((d) => d.id === 'hairStyle')!.options.length - excludedCount('hairStyle')).toBe(ids('hairStyle').length - 6);
  });
});
