import { describe, expect, it } from 'vitest';
import { FIELDS, fieldDef, DRAW_ORDER } from '../src/data/fields';
import { STYLE_PRESETS } from '../src/data/presets';
import { matchRef } from '../src/engine/match';
import { FIELD_IDS, type FieldId, type Option } from '../src/types';

const opts = (f: FieldId) => fieldDef(f).options;
const real = (f: FieldId) => opts(f).filter((o) => !['none', 'unspecified'].includes(o.id));
/** 参照が少なくとも1候補に一致するか（id / #tag / cat: / 複数候補 a|b） */
function resolvable(field: FieldId, ref: string): boolean {
  return ref.split('|').some((r) => opts(field).some((o) => matchRef(o, r)));
}

describe('辞書の件数（指示書の目標）', () => {
  const cases: Array<[FieldId, number]> = [
    ['archetype', 100], ['hairColor', 40], ['hairStyle', 50], ['eyeColor', 30], ['world', 20], ['outfit', 100], ['pose', 50]
  ];
  for (const [f, min] of cases) it(`${fieldDef(f).ja} は ${min} 件以上`, () => expect(real(f).length).toBeGreaterThanOrEqual(min));
  it('職業・立場は60件以上（指定しないを除く）', () => expect(real('occupation').length).toBeGreaterThanOrEqual(60));
  it('背景・照明の組み合わせは80以上（場所×光、時間帯を含めずに数えても）', () => {
    expect(opts('scene').length * opts('light').length).toBeGreaterThanOrEqual(80);
    expect(opts('scene').length).toBeGreaterThanOrEqual(60);
  });
  it('おまかせスタイルは10〜25種で、完全ランダム以外はすべて分類を持つ', () => {
    expect(STYLE_PRESETS.length).toBeGreaterThanOrEqual(10); expect(STYLE_PRESETS.length).toBeLessThanOrEqual(25);
    expect(STYLE_PRESETS.filter((p) => p.id !== 'random' && !p.group).map((p) => p.id)).toEqual([]);
  });
});

describe('辞書の整合性', () => {
  it('全項目が登録され、抽選順に重複・漏れがない', () => {
    expect(new Set(FIELDS.map((f) => f.id)).size).toBe(FIELDS.length);
    expect([...FIELD_IDS].sort()).toEqual([...FIELDS.map((f) => f.id)].sort());
    expect([...DRAW_ORDER].sort()).toEqual([...FIELD_IDS].sort());
  });
  for (const f of FIELDS) {
    it(`${f.ja}：ID重複ゼロ・日本語名あり・大分類が定義済み`, () => {
      const ids = f.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const o of f.options) {
        expect(o.ja.trim().length).toBeGreaterThan(0);
        expect(o.id).toMatch(/^[a-z0-9_]+$/);
        if (f.categories && o.cat) expect(f.categories.some((c) => c.id === o.cat), `${f.id}:${o.id} cat ${o.cat}`).toBe(true);
      }
    });
  }
  it('美形アーキタイプの好み参照はすべて解決できる（無効参照ゼロ）', () => {
    const bad: string[] = [];
    for (const a of opts('archetype')) for (const [f, refs] of Object.entries(a.prefs || {}) as Array<[FieldId, string[]]>) {
      for (const r of refs) if (!resolvable(f, r)) bad.push(`${a.id} → ${f}:${r}`);
    }
    expect(bad).toEqual([]);
  });
  it('requires 参照はすべて解決できる', () => {
    const bad: string[] = [];
    for (const f of FIELDS) for (const o of f.options) for (const req of o.requires || []) {
      const [field, ref] = [req.slice(0, req.indexOf(':')) as FieldId, req.slice(req.indexOf(':') + 1)];
      if (!FIELD_IDS.includes(field) || !(ref === '!none' || resolvable(field, ref))) bad.push(`${f.id}:${o.id} → ${req}`);
    }
    expect(bad).toEqual([]);
  });
  it('職業の衣装参照・おまかせスタイルの条件は解決できる', () => {
    const bad: string[] = [];
    for (const o of opts('occupation')) for (const r of o.outfitPrefs || []) if (!resolvable('outfit', r)) bad.push(`occupation:${o.id} → ${r}`);
    for (const p of STYLE_PRESETS) for (const [f, refs] of Object.entries(p.filters) as Array<[FieldId, string[]]>) for (const r of refs) if (!resolvable(f, r)) bad.push(`preset:${p.id} → ${f}:${r}`);
    expect(bad).toEqual([]);
  });
  it('世界観の参照（worlds）は既存の世界観IDかタグ', () => {
    const keys = new Set(opts('world').flatMap((w) => [w.id, ...(w.tags || [])]));
    const bad = FIELDS.flatMap((f) => f.options.flatMap((o) => (o.worlds || []).filter((w) => !keys.has(w)).map((w) => `${f.id}:${o.id}:${w}`)));
    expect(bad).toEqual([]);
  });
  it('髪型は長さの制約を必ず持ち、各長さに2種以上の髪型がある', () => {
    const lens = opts('hairLength').map((o) => o.id);
    for (const s of opts('hairStyle')) { expect(s.lengths?.length).toBeGreaterThan(0); for (const l of s.lengths!) expect(lens).toContain(l); }
    for (const l of lens) expect(opts('hairStyle').filter((s) => s.lengths!.includes(l)).length).toBeGreaterThanOrEqual(2);
  });
  it('衣装はプレースホルダーと上半身描写を持ち、伝統衣装の文化は文化モチーフに存在する', () => {
    const cultures = opts('culture').map((c) => c.id);
    for (const o of opts('outfit')) {
      expect(o.upper, o.id).toBeTruthy();
      expect(o.upper).toMatch(/\{c1\}/);
      if (o.culture) expect(cultures).toContain(o.culture);
    }
  });
  it('ポーズは画角レベルと手の数を持ち、持ち物は手の数を持つ', () => {
    for (const p of opts('pose')) { expect(p.minShot).toBeGreaterThanOrEqual(0); expect(p.hands).toBeGreaterThanOrEqual(0); }
    for (const p of opts('prop')) expect(p.hands).toBeGreaterThanOrEqual(0);
    for (const s of opts('shot')) expect(s.level).toBeGreaterThanOrEqual(0);
  });
  it('アーキタイプ100種以上はすべて英語アンカーと好みを持ち、名前・アンカーが重複しない', () => {
    const a = opts('archetype');
    expect(new Set(a.map((x) => x.ja)).size).toBe(a.length);
    expect(new Set(a.map((x) => x.en.join('|'))).size).toBe(a.length);
    for (const x of a) { expect(x.en.length).toBeGreaterThanOrEqual(1); expect(Object.keys(x.prefs || {}).length, x.id).toBeGreaterThanOrEqual(3); expect(x.desc).toBeTruthy(); }
    expect(new Set(a.map((x) => x.cat)).size).toBe(11);
  });
  it('現代・日常の美形タイプ12種：日常着を参照し、動物の部位や職業名を出力に混ぜない', () => {
    const a = opts('archetype').filter((x) => x.cat === 'contemporary');
    expect(a.length).toBe(12);
    const daily = new Set(opts('outfit').filter((o) => o.cat === 'daily').map((o) => o.id));
    for (const x of a) {
      expect(x.prefs?.outfit?.some((r) => daily.has(r)), x.id).toBe(true);
      expect(x.prefs?.occupation, x.id).toEqual(['none']);
      expect(x.en.join(' ') + x.nat, x.id).not.toMatch(/\b(ears?|tail|paws?|fangs?|dog|cat|puppy|kitten|wolf|band|rock|musician|model)\b/i);
      expect(Object.keys(x.prefs || {}).length, x.id).toBeGreaterThanOrEqual(6);
    }
    // 追加した日常着はすべて、どれかの新タイプから参照される
    const used = new Set(a.flatMap((x) => x.prefs?.outfit ?? []));
    expect([...daily].filter((id) => !used.has(id))).toEqual([]);
  });
  it('日常着は8〜12種で、チェーン・耳飾りを付けず、色の差し込み口を持つ', () => {
    const daily = opts('outfit').filter((o) => o.cat === 'daily');
    expect(daily.length).toBeGreaterThanOrEqual(8);
    expect(daily.length).toBeLessThanOrEqual(12);
    for (const o of daily) {
      const t = `${o.upper} ${o.lower}`;
      expect(t, o.id).not.toMatch(/chain|earring|necklace|piercing/i);
      expect(t, o.id).toContain('{c1}');
      expect(t, o.id).toContain('{c2}');
    }
  });
});

describe('安全性：成人・男性1名', () => {
  const MINOR = /\b(child|children|kid|kids|loli|shota|teen|teens|teenager|teenage|underage|toddler|schoolboy|little boy|young boy|boyish)\b/i;
  const FEMALE = /\b(1girl|girl|girls|female|woman|women|breasts)\b/i;
  const all: Array<[string, string]> = FIELDS.flatMap((f) => f.options.flatMap((o: Option) => [...o.en, o.nat ?? '', o.upper ?? '', o.lower ?? ''].map((t) => [`${f.id}:${o.id}`, t] as [string, string])));
  it('既定辞書に未成年を示す英語がない', () => expect(all.filter(([, t]) => MINOR.test(t))).toEqual([]));
  it('既定辞書に女性を示す英語がない', () => expect(all.filter(([, t]) => FEMALE.test(t))).toEqual([]));
  it('既定辞書に単独の "adult" がない（年齢は young man などで表す）', () => expect(all.filter(([, t]) => /\badult\b/i.test(t))).toEqual([]));
  it('年齢層はすべて18歳以上', () => { for (const a of opts('age')) expect(a.ageMin).toBeGreaterThanOrEqual(18); });
  it('学生服・制服の学校系や水着・下着は通常の衣装辞書に含めない', () => {
    expect(opts('outfit').filter((o) => /school|swim|lingerie|bikini|bunny/i.test(o.upper ?? ''))).toEqual([]);
  });
});
