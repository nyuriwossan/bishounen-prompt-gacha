/* 2026-10 増築の検査
 * - 394候補の台帳：全件をちょうど1回判定し、採用・修正採用・統合の行き先が実在する
 * - 辞書：既存IDを削除・改名していない／足した候補はすべて since を持ち台帳から辿れる／同じ項目内の英語の重複なし
 * - 新しい7項目のデータの形（「なし」・年齢の下限・使える髪の長さ・視線と頭の向きの参照・正規表現）
 * - テーマ25件の成立判定（成立したものは1人分の自然な出力になる）
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DATA_VERSION, fieldDef, FIELDS, optionOf } from '../src/data/fields';
import { EXPANSION_VERSION } from '../src/data/helpers';
import { EXPANSION_FIELDS } from '../src/engine/state';
import type { FieldId, Option } from '../src/types';
import { CATEGORY_TO_FIELD, loadCandidateCsv, loadCandidates, loadThemes, normEn } from '../scripts/expansion/candidates';
import { LEDGER } from '../scripts/expansion/ledger';
import { evaluateThemes } from '../scripts/expansion/themes';

const base = JSON.parse(fs.readFileSync('tests/fixtures/dictionary-ids-2026.10.12.json', 'utf8')) as { ids: Record<string, string[]> };
const cands = loadCandidates();
const isNew = (f: FieldId, o: Option) => !base.ids[f]?.includes(o.id);

describe('入力資料（394候補・25テーマ）', () => {
  it('件数・配分・CSVとJSONの一致', () => {
    expect(cands.length).toBe(394);
    expect(new Set(cands.map((c) => c.id)).size).toBe(394);
    expect(cands.filter((c) => c.existing_field).length).toBe(292);
    expect(cands.filter((c) => !c.existing_field).length).toBe(102);
    const phase = (p: number) => cands.filter((c) => c.phase === p).length;
    expect([phase(1), phase(2), phase(3)]).toEqual([146, 146, 102]);
    expect(new Set(cands.map((c) => c.category)).size).toBe(24);
    expect(cands.every((c) => c.reconstruction)).toBe(true);
    const csv = loadCandidateCsv();
    expect(csv.length).toBe(394);
    const byId = new Map(csv.map((r) => [r.id, r]));
    for (const c of cands) {
      const r = byId.get(c.id)!;
      expect(r, c.id).toBeTruthy();
      expect([r.category, r.ja, r.en, r.phase, r.priority], c.id).toEqual([c.category, c.ja, c.en.join('; '), String(c.phase), c.priority]);
    }
    const themes = loadThemes();
    expect(themes.length).toBe(25);
    const ids = new Set(cands.map((c) => c.id));
    for (const t of themes) for (const x of t.selected_option_ids) expect(ids.has(x), `${t.id}:${x}`).toBe(true);
  });
});

describe('採否台帳（scripts/expansion/ledger.ts）', () => {
  it('全394件をちょうど1回判定し、行き先の候補が辞書に実在する', () => {
    expect(Object.keys(LEDGER).sort()).toEqual(cands.map((c) => c.id).sort());
    for (const c of cands) {
      const e = LEDGER[c.id];
      expect(['adopt', 'modify', 'merge', 'hold', 'reject']).toContain(e.decision);
      expect(e.why.length, c.id).toBeGreaterThan(3);
      if (e.decision === 'hold' || e.decision === 'reject') { expect(e.to).toBeUndefined(); continue; }
      expect(FIELDS.some((f) => f.id === e.field), `${c.id} → ${e.field}`).toBe(true);
      for (const id of e.to!) expect(optionOf(e.field!, id), `${c.id} → ${e.field}:${id}`).toBeTruthy();
      // 採用・修正採用は、その候補の本来の項目（または対応先の項目）に新しく足した候補へ行く
      if (e.decision !== 'merge') {
        expect(e.field, c.id).toBe(CATEGORY_TO_FIELD[c.category]);
        for (const id of e.to!) expect(optionOf(e.field!, id)!.since, `${c.id} → ${id}`).toBe(EXPANSION_VERSION);
      }
    }
  });
  it('増築で足した候補は、すべて台帳のどれかの行き先になっている（台帳の外で足していない）', () => {
    const targets = new Set(Object.values(LEDGER).flatMap((e) => (e.to ?? []).map((id) => `${e.field}:${id}`)));
    const untracked: string[] = [];
    for (const f of FIELDS) for (const o of f.options) if (o.since && o.id !== 'none' && !targets.has(`${f.id}:${o.id}`)) untracked.push(`${f.id}:${o.id}`);
    expect(untracked).toEqual([]);
  });
});

describe('辞書の互換と品質', () => {
  it('辞書の版を上げ、増築前の候補IDを1件も削除・改名していない', () => {
    expect(DATA_VERSION).toBe(EXPANSION_VERSION);
    expect(DATA_VERSION).not.toBe('2026.10.12');
    const missing: string[] = [];
    for (const [f, ids] of Object.entries(base.ids)) for (const id of ids) if (!optionOf(f as FieldId, id)) missing.push(`${f}:${id}`);
    expect(missing).toEqual([]);
  });
  it('増築前に無かった候補はすべて since（辞書の版）を持ち、増築前からの候補は持たない', () => {
    for (const f of FIELDS) for (const o of f.options) {
      if (isNew(f.id, o)) expect(o.since, `${f.id}:${o.id}`).toBe(EXPANSION_VERSION);
      else expect(o.since, `${f.id}:${o.id}`).toBeUndefined();
    }
  });
  it('同じ項目の中で、英語の組み合わせが同じ候補はない（新しい候補）', () => {
    const dups: string[] = [];
    for (const f of FIELDS) {
      const key = (o: Option) => [...o.en, o.upper ?? '', o.lower ?? ''].map((x) => normEn(x.replace(/\{c[12]\}/g, ''))).filter(Boolean).sort().join('|');
      const seen = new Map<string, string>();
      for (const o of f.options) {
        const k = key(o);
        if (!k) continue;
        if (seen.has(k) && (o.since || optionOf(f.id, seen.get(k)!)?.since)) dups.push(`${f.id}:${seen.get(k)} = ${o.id}`);
        seen.set(k, o.id);
      }
    }
    expect(dups).toEqual([]);
  });
  it('新しい候補に、成人表現・未成年・女性化・露出・2人目を呼ぶ語を入れていない', () => {
    const bad = /\b(adult|child|kid|teen|teenager|boyish|schoolboy|girl|female|woman|breasts|nsfw|nude|naked|shirtless|topless|sexy|someone|another person|couple|2boys)\b/i;
    for (const f of FIELDS) for (const o of f.options) {
      if (!o.since) continue;
      const text = [...o.en, o.nat ?? '', o.upper ?? '', o.lower ?? ''].join(' | ');
      expect(text, `${f.id}:${o.id}`).not.toMatch(bad);
    }
  });
  it('美形タイプの好み（prefs）は、新しい項目の参照も含めてすべて辞書に実在する', () => {
    const bad: string[] = [];
    for (const a of fieldDef('archetype').options) for (const [f, refs] of Object.entries(a.prefs ?? {}) as Array<[FieldId, string[]]>) {
      for (const r of refs) {
        if (r.startsWith('#') || r.startsWith('cat:') || r === 'none') continue;
        if (!optionOf(f, r)) bad.push(`${a.id}.${f}:${r}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('職業の衣装傾向（outfitPrefs）の参照は実在する', () => {
    const bad = fieldDef('occupation').options.flatMap((o) => (o.outfitPrefs ?? []).filter((r) => !r.startsWith('#') && !optionOf('outfit', r)).map((r) => `${o.id}:${r}`));
    expect(bad).toEqual([]);
  });
});

describe('新しい7項目のデータ', () => {
  it('どれも任意（既定OFFのスイッチ）で、先頭に「なし」を持つ', () => {
    for (const f of EXPANSION_FIELDS) {
      const d = fieldDef(f);
      expect(d.module, f).toBeTruthy();
      expect(d.options[0].id, f).toBe('none');
      expect(d.options[0].en).toEqual([]);
      expect(d.options.filter((o) => o.id !== 'none').length, f).toBeGreaterThanOrEqual(8);
    }
  });
  it('年齢の表れ：すべて25歳以上の hard 条件と目安の年齢を持ち、18〜24歳には付かない', () => {
    for (const o of fieldDef('ageCue').options.filter((x) => x.id !== 'none')) {
      expect(o.requires?.[0], o.id).toMatch(/^age:/);
      expect(o.requires![0], o.id).not.toContain('a18_24');
      expect(o.ageMin, o.id).toBeGreaterThanOrEqual(35);
      expect(o.nat, o.id).toBeTruthy();
    }
  });
  it('髪質・前髪は使える髪の長さを持ち、髪質の系統は髪型と同じ語彙', () => {
    for (const f of ['hairTexture', 'fringe'] as FieldId[]) for (const o of fieldDef(f).options.filter((x) => x.id !== 'none')) {
      expect(o.lengths?.length, `${f}:${o.id}`).toBeGreaterThan(0);
      for (const l of o.lengths!) expect(optionOf('hairLength', l), `${o.id}:${l}`).toBeTruthy();
    }
    const curls = new Set(['straight', 'wavy', 'curly', 'coily']);
    for (const o of [...fieldDef('hairTexture').options, ...fieldDef('hairStyle').options]) if (o.curl) expect(curls.has(o.curl), o.id).toBe(true);
    // 前髪まで決まる髪型が十分あり、前髪の項目と重ねない
    expect(fieldDef('hairStyle').options.filter((o) => o.fringeFixed).length).toBeGreaterThanOrEqual(15);
  });
  it('ポーズの gazeFit / headFit は視線・頭の向きに実在する候補だけを指す', () => {
    for (const p of fieldDef('pose').options) {
      for (const g of p.gazeFit ?? []) expect(optionOf('gaze', g), `${p.id}:${g}`).toBeTruthy();
      for (const h of p.headFit ?? []) expect(optionOf('headPose', h), `${p.id}:${h}`).toBeTruthy();
    }
    expect(fieldDef('pose').options.filter((p) => p.gazeFit).length).toBeGreaterThanOrEqual(10);
  });
  it('衣装の細部の条件（正規表現・タグ）は有効で、少なくとも1つの衣装に付けられる', () => {
    const outfits = fieldDef('outfit').options.filter((o) => o.cat !== 'cosplay');
    for (const d of fieldDef('outfitDetail').options.filter((x) => x.id !== 'none')) {
      if (d.needsText) expect(() => new RegExp(d.needsText!, 'i')).not.toThrow();
      if (d.clashText) expect(() => new RegExp(d.clashText!, 'i')).not.toThrow();
      const fits = outfits.filter((o) => {
        const text = `${o.upper ?? ''} ${o.lower ?? ''}`;
        return (!d.parentTags || d.parentTags.some((t) => o.tags?.includes(t) || o.cat === t)) && (!d.needsText || new RegExp(d.needsText, 'i').test(text))
          && (!d.clashText || !new RegExp(d.clashText, 'i').test(text));
      });
      expect(fits.length, d.id).toBeGreaterThanOrEqual(3);
    }
  });
  it('素材はすべて素材の系統（mat）と自然文を持つ', () => {
    for (const o of fieldDef('fabric').options.filter((x) => x.id !== 'none')) { expect(o.mat, o.id).toBeTruthy(); expect(o.nat, o.id).toBeTruthy(); }
  });
});

describe('テーマ25件', () => {
  const results = evaluateThemes();
  it('全件を判定し、成立したテーマは1人分の出力（男性1名・美形アンカー・視線は1つ）になる', () => {
    expect(results.length).toBe(25);
    const ok = results.filter((r) => r.state);
    expect(ok.length).toBeGreaterThanOrEqual(15);
    for (const r of ok) {
      const tags = r.pixai!.split(', ');
      for (const need of ['1boy', 'solo', 'male focus', 'handsome']) expect(tags, r.theme.id).toContain(need);
      expect(r.pixai, r.theme.id).not.toMatch(/\badult\b/i);
      const gazeTags = tags.filter((t) => /^(looking at viewer|looking to the side|looking down|looking up|looking afar|closed eyes)$/.test(t));
      expect(gazeTags.length, `${r.theme.id}: ${gazeTags}`).toBeLessThanOrEqual(2);
      expect(r.natural, r.theme.id).toMatch(/strikingly handsome/);
    }
  });
});
