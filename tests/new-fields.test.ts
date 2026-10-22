/* 2026-10 増築の任意項目（年齢の表れ・髪質・前髪・視線・頭の向き・衣装の細部・素材）の機能テスト。
 * 固定・個別の引き直し・手で選ぶ・禁断の調合やコスプレとの関係・衣装3案・人物の一括固定・共有URL・
 * 出力（視線の置き換え、PixAI/NovelAI の系統）・辞書の更新のお知らせ を確かめる。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { allViolations, candidateViolations } from '../src/advisor/hard';
import { DATA_VERSION, fieldDef, optionOf } from '../src/data/fields';
import { STYLE_PRESETS } from '../src/data/presets';
import { adopt, checkAdopt, draw, fillModule, setModule, toggleLock, valuesOf } from '../src/engine/draw';
import { lockPerson } from '../src/engine/person';
import { addedFields, addedIntoExcluded, addedOptionIds, excludeAdded, getDrawPrefs, includeAdded, setDrawPrefs, type DrawPrefs } from '../src/engine/prefs';
import { cloneState, emptyState, EXPANSION_FIELDS, isActive, moduleKey } from '../src/engine/state';
import { applyCard, wardrobePreview } from '../src/engine/wardrobe';
import { buildPrompt, checkFreeTags, NOVELAI_V5_QUALITY } from '../src/prompts/build';
import { decodeShare, DICT_SEEN_KEY, encodeShare, loadDictSeen, normalizeState, saveDictSeen, setStorage, type KV } from '../src/storage/storage';
import type { FieldId, ForgeModules, ForgeState } from '../src/types';

class MemoryKV implements KV {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}
let kv: MemoryKV;
const NO_PREFS: DrawPrefs = { version: 1, excluded: {}, disabled: [] } as unknown as DrawPrefs;
beforeEach(() => { kv = new MemoryKV(); setStorage(kv); setDrawPrefs({ ...getDrawPrefs(), excluded: {}, disabled: [] }); });

const MOD = (f: FieldId) => moduleKey(fieldDef(f).module!) as keyof ForgeModules;
const ALL_ON: Partial<ForgeModules> = Object.fromEntries(EXPANSION_FIELDS.map((f) => [MOD(f), true]));
const withModules = (on: Partial<ForgeModules> = ALL_ON, seed = 'nf') => {
  const s = emptyState();
  Object.assign(s.optionalModules, on);
  const r = draw(s, { seed });
  expect(r.ok).toBe(true);
  return r.state;
};
const put = (s: ForgeState, f: FieldId, id: string, locked = true) => { const t = cloneState(s); t.fields[f] = { id, source: 'manual', locked }; return t; };
const set = (s: ForgeState) => EXPANSION_FIELDS.filter((f) => s.fields[f].id !== 'none');

describe('既定はOFF・「なし」', () => {
  it('7つの項目は、既定では抽選も出力もしない', () => {
    for (let i = 0; i < 30; i++) {
      const s = draw(emptyState(), { seed: 'off' + i }).state;
      for (const f of EXPANSION_FIELDS) {
        expect(s.fields[f].id, f).toBe('none');
        expect(isActive(s, f), f).toBe(false);
      }
    }
  });
  it('スイッチは詳細な調合のモジュールで、項目ごとに独立している', () => {
    const keys = new Set(EXPANSION_FIELDS.map(MOD));
    expect(keys.size).toBe(7);
    for (const f of EXPANSION_FIELDS) expect(emptyState().optionalModules[MOD(f)]).toBe(false);
  });
});

describe('ONにしたときの抽選', () => {
  it('ONにした項目は「なし」以外も出て、hard 制約の違反がない', () => {
    const seen: Record<string, Set<string>> = {};
    for (let i = 0; i < 160; i++) {
      const s = withModules(ALL_ON, 'on' + i);
      expect(allViolations(valuesOf(s)), `seed on${i}`).toEqual([]);
      for (const f of EXPANSION_FIELDS) (seen[f] ??= new Set()).add(s.fields[f].id ?? '');
    }
    for (const f of EXPANSION_FIELDS) expect(seen[f].size, f).toBeGreaterThan(3);
  });
  it('1項目だけONにしても、他の増築項目は「なし」のまま', () => {
    for (const f of EXPANSION_FIELDS) {
      const s = withModules({ [MOD(f)]: true, poseEnabled: true }, 'one-' + f);
      for (const g of EXPANSION_FIELDS) if (g !== f) expect(s.fields[g].id, `${f}→${g}`).toBe('none');
    }
  });
  it('fillModule で途中からONにすると、その項目だけを補う', () => {
    const base = draw(emptyState(), { seed: 'fill' }).state;
    for (const f of EXPANSION_FIELDS) {
      const s = setModule(base, MOD(f), true);
      const r = fillModule(s, fieldDef(f).module!);
      if (!r) continue;
      expect(r.ok, f).toBe(true);
      for (const g of ['archetype', 'hairColor', 'outfit', 'eyeColor'] as FieldId[]) expect(r.state.fields[g].id, `${f}:${g}`).toBe(base.fields[g].id);
    }
  });
});

describe('固定・個別の引き直し・手で選ぶ', () => {
  it('固定した値は、全体の錬成でも変わらない', () => {
    let s = withModules(ALL_ON, 'lock');
    const want = Object.fromEntries(EXPANSION_FIELDS.map((f) => [f, s.fields[f].id]));
    for (const f of EXPANSION_FIELDS) s = toggleLock(s, f);
    for (let i = 0; i < 25; i++) {
      const r = draw(s, { seed: 'lk' + i });
      if (!r.ok) continue;
      for (const f of EXPANSION_FIELDS) expect(r.state.fields[f].id, f).toBe(want[f]);
    }
  });
  it('個別の引き直しは、その項目以外を変えない', () => {
    // 衣装は素材も細部も選べる白シャツに固定（和装などは素材を足さないため）
    const s0 = emptyState(); Object.assign(s0.optionalModules, ALL_ON); s0.fields.outfit = { id: 'white_shirt', source: 'manual', locked: true }; s0.fields.age = { id: 'a35_44', source: 'manual', locked: true };
    // 前髪・髪質が選べる髪型（前髪まで決まった髪型・坊主などでない）の結果を使う
    let s = draw(s0, { seed: 'reroll' }).state;
    for (let k = 0; k < 80; k++) {
      s = draw(s0, { seed: 'reroll' + k }).state;
      const st = optionOf('hairStyle', s.fields.hairStyle.id)!;
      if (!st.fringeFixed && !st.curl && ['medium', 'short', 'shoulder'].some((x) => (s.fields.hairLength.id ?? '').includes(x))) break;
    }
    for (const f of EXPANSION_FIELDS) {
      let changed = false;
      for (let i = 0; i < 30 && !changed; i++) {
        const r = draw(s, { seed: `rr-${f}-${i}`, targets: [f] });
        expect(r.ok, f).toBe(true);
        for (const g of Object.keys(s.fields) as FieldId[]) if (g !== f) expect(r.state.fields[g].id, `${f}:${g}`).toBe(s.fields[g].id);
        changed = r.state.fields[f].id !== s.fields[f].id;
      }
      // 今の組み合わせで両立する候補が2つ以上あるときだけ、変わることを求める（視線が決まったポーズなどは1つしかない）
      const v = valuesOf(s, (g) => g !== f);
      const room = fieldDef(f).options.filter((o) => candidateViolations(f, o, v).length === 0).length;
      if (room >= 2) expect(changed, `${f} が引き直しで変わらない（両立する候補 ${room}件）`).toBe(true);
    }
  });
  it('手で選ぶ：両立する候補は採用でき、両立しない候補は理由つきで止まる', () => {
    let s = withModules(ALL_ON, 'adopt');
    s = put(put(s, 'expression', 'gentle_smile'), 'pose', 'standing', false);
    const a = adopt(s, 'gaze', 'downward', true);
    expect(a.ok).toBe(true);
    expect(a.state.fields.gaze).toMatchObject({ id: 'downward', locked: true, source: 'manual' });
    // 本を見る視線は、持ち物の本がないと成立しない（持ち物はOFF）
    const c = checkAdopt(put(s, 'prop', 'none'), 'gaze', 'at_book');
    expect(c.ok).toBe(false);
    // 18〜24歳に「深い」年齢の表れは付かない
    const young = put(s, 'age', 'a18_24');
    for (const o of fieldDef('ageCue').options.filter((x) => x.cat === 'deep')) expect(checkAdopt(young, 'ageCue', o.id).ok, o.id).toBe(false);
  });
});

describe('組み合わせの制約', () => {
  it('視線を決めるポーズ（gazeFit）には合う視線だけ', () => {
    const poses = fieldDef('pose').options.filter((p) => p.gazeFit);
    expect(poses.length).toBeGreaterThan(5);
    for (const p of poses) {
      for (const g of fieldDef('gaze').options.filter((x) => x.id !== 'none')) {
        const v = valuesOf(put(put(withModules(ALL_ON, 'gf'), 'pose', p.id), 'gaze', g.id));
        const bad = allViolations(v).some((x) => x.rule === 'gaze_pose');
        expect(bad, `${p.id}×${g.id}`).toBe(!p.gazeFit!.includes(g.id) || (!!p.eyesClosed && !g.eyesClosed));
      }
    }
  });
  it('目隠し・拘束の間は、視線・頭の向き・衣装の細部・素材を重ねない', () => {
    const s = withModules({ ...ALL_ON, unlimitedEnabled: true }, 'forb');
    const blind = fieldDef('blindfold').options.find((o) => o.id !== 'none')!.id;
    const rest = fieldDef('restraint').options.find((o) => o.id !== 'none')!.id;
    const v1 = valuesOf(put(put(s, 'blindfold', blind), 'gaze', 'downward'));
    expect(allViolations(v1).map((x) => x.rule)).toContain('gaze_blindfold');
    const v2 = valuesOf(put(put(put(s, 'restraint', rest), 'headPose', 'head_tilt'), 'fabric', 'fine_wool'));
    const rules = allViolations(v2).map((x) => x.rule);
    expect(rules).toContain('head_restraint');
    expect(rules).toContain('fabric_restraint');
  });
  it('禁断の調合で大量に引いても、目隠し・拘束と視線・細部は同時に出ない', () => {
    for (let i = 0; i < 80; i++) {
      const s = withModules({ ...ALL_ON, unlimitedEnabled: true }, 'fx' + i);
      const forb = ['blindfold', 'restraint'].some((f) => s.fields[f as FieldId].id !== 'none');
      if (forb) { expect(s.fields.gaze.id).toBe('none'); expect(s.fields.headPose.id).toBe('none'); }
      if (s.fields.restraint.id !== 'none') { expect(s.fields.outfitDetail.id).toBe('none'); expect(s.fields.fabric.id).toBe('none'); }
    }
  });
  it('コスプレ衣装には、衣装の細部・素材を付けない', () => {
    for (let i = 0; i < 40; i++) {
      const s = withModules({ ...ALL_ON, cosplayEnabled: true }, 'cos' + i);
      if (optionOf('outfit', s.fields.outfit.id)?.cat === 'cosplay') { expect(s.fields.outfitDetail.id).toBe('none'); expect(s.fields.fabric.id).toBe('none'); }
    }
  });
  it('年齢の表れは年齢に合うものだけ（若い年齢ほど「なし」が多い）', () => {
    const none: Record<string, number> = {}, n: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      const s = withModules({ ageCueEnabled: true }, 'age' + i);
      const age = s.fields.age.id ?? '', cue = optionOf('ageCue', s.fields.ageCue.id)!;
      n[age] = (n[age] ?? 0) + 1;
      if (cue.id === 'none') none[age] = (none[age] ?? 0) + 1;
      if (age === 'a18_24') expect(cue.id).toBe('none');
      if (cue.cat === 'deep') expect(['a45_59', 'a60p']).toContain(age);
    }
    expect(n.a18_24 ?? 0).toBeGreaterThan(0);
    const rate = (a: string) => (none[a] ?? 0) / Math.max(1, n[a] ?? 0);
    if ((n.a25_34 ?? 0) > 10 && (n.a45_59 ?? 0) > 10) expect(rate('a25_34')).toBeGreaterThanOrEqual(rate('a45_59'));
  });
  it('髪質・前髪は、髪の長さや前髪の決まった髪型と食い違わない', () => {
    for (let i = 0; i < 120; i++) {
      const s = withModules({ hairTextureEnabled: true, fringeEnabled: true }, 'hair' + i);
      const st = optionOf('hairStyle', s.fields.hairStyle.id)!;
      if (st.fringeFixed) expect(s.fields.fringe.id).toBe('none');
      const t = optionOf('hairTexture', s.fields.hairTexture.id)!;
      if (t.lengths) expect(t.lengths).toContain(s.fields.hairLength.id);
    }
  });
});

describe('出力', () => {
  const viewerPose = fieldDef('pose').options.find((p) => !p.gazeFit && !p.eyesClosed && p.en.includes('looking at viewer') && !p.tags?.includes('bound'))!;
  it('視線を指定すると、ポーズの looking at viewer を外し、視線のタグは1つだけ', () => {
    expect(viewerPose).toBeTruthy();
    let s = withModules({ gazeEnabled: true }, 'out');
    s = put(put(put(s, 'pose', viewerPose.id), 'gaze', 'downward'), 'expression', 'gentle_smile');
    const p = buildPrompt(s, 'pixai').positive;
    expect(p).not.toMatch(/looking at viewer/);
    expect(p).toMatch(/looking down/);
    const n = buildPrompt(s, 'naturalEnglish').positive;
    expect(n).not.toMatch(/looking at the viewer/i);
  });
  it('視線が「なし」なら、ポーズの出力は増築前と同じ', () => {
    const s = put(withModules({ gazeEnabled: true }, 'out2'), 'pose', viewerPose.id);
    const t = put(s, 'gaze', 'none');
    const u = cloneState(t); u.optionalModules.gazeEnabled = false;
    expect(buildPrompt(t, 'pixai').positive).toBe(buildPrompt(u, 'pixai').positive);
  });
  it('ONにした項目は、PixAI・NovelAI・自然文・日本語のすべてに出る', () => {
    const s = withModules(ALL_ON, 'all-out');
    for (const f of set(s)) {
      const o = optionOf(f, s.fields[f].id)!;
      if (!isActive(s, f)) continue;
      if (fieldDef(f).group === 'pose' && !s.optionalModules.poseEnabled) continue;
      expect(buildPrompt(s, 'pixai').positive, f).toContain(o.en[0]);
      expect(buildPrompt(s, 'japanese').positive, f).toContain(o.ja.split('｜')[0].split('（')[0]);
    }
  });
  it('PixAI の DiT 系は自然な英文、NovelAI V4.5/V5 は品質タグを末尾に付ける', () => {
    const s = withModules({}, 'prof');
    s.settings.quality = true; s.settings.negative = true;
    const sdxl = buildPrompt(s, 'pixai').positive;
    s.settings.pixaiProfile = 'dit';
    const dit = buildPrompt(s, 'pixai').positive;
    expect(dit).not.toBe(sdxl);
    expect(dit).toMatch(/\. /);
    expect(dit).not.toMatch(/masterpiece|best quality/);
    expect(buildPrompt(s, 'pixai').negative.length).toBeGreaterThan(0);
    const v4 = buildPrompt(s, 'novelai').positive;
    s.settings.novelaiProfile = 'v5';
    const v5 = buildPrompt(s, 'novelai').positive;
    expect(v4).not.toBe(v5);
    expect(v5.endsWith(NOVELAI_V5_QUALITY.join(', '))).toBe(true);
    s.settings.quality = false;
    expect(buildPrompt(s, 'novelai').positive).not.toMatch(/no text/);
  });
  it('自由入力の注意：視線を指定しているのに視線のタグを足すと知らせる', () => {
    const s = put(withModules({ gazeEnabled: true }, 'lint'), 'gaze', 'downward');
    const w = checkFreeTags(['looking at viewer'], s, buildPrompt(s, 'pixai').positive.split(', '));
    expect(w.length).toBeGreaterThan(0);
  });
});

describe('衣装3案・人物の一括固定', () => {
  it('衣装3案は、細部・素材も衣装に合わせて作り、採用しても違反がない', () => {
    const s = withModules({ outfitDetailEnabled: true, fabricEnabled: true }, 'wd');
    for (let i = 0; i < 6; i++) {
      const pv = wardrobePreview(s, { seed: 'wd' + i });
      for (const card of pv.cards) {
        const r = applyCard(s, card);
        expect(allViolations(valuesOf(r.state)), `${i}`).toEqual([]);
      }
    }
  });
  it('衣装3案は、細部・素材がOFFなら「なし」のまま', () => {
    const s = withModules({}, 'wd-off');
    const pv = wardrobePreview(s, { seed: 'x' });
    for (const card of pv.cards) { const r = applyCard(s, card); expect(r.state.fields.outfitDetail.id).toBe('none'); expect(r.state.fields.fabric.id).toBe('none'); }
  });
  it('人物の一括固定は、ONの年齢の表れ・髪質・前髪も固定する（OFFなら触らない）', () => {
    const on = lockPerson(withModules({ ageCueEnabled: true, hairTextureEnabled: true, fringeEnabled: true }, 'pl'));
    for (const f of ['ageCue', 'hairTexture', 'fringe'] as FieldId[]) expect(on.state.fields[f].locked, f).toBe(true);
    const off = lockPerson(withModules({}, 'pl2'));
    for (const f of ['ageCue', 'hairTexture', 'fringe'] as FieldId[]) expect(off.state.fields[f].locked, f).toBe(false);
  });
});

describe('保存・共有', () => {
  it('共有URL：ONの項目と値・固定を復元する', () => {
    let s = withModules(ALL_ON, 'share');
    s = toggleLock(s, 'gaze');
    const d = decodeShare(encodeShare(s)).state!;
    for (const f of EXPANSION_FIELDS) { expect(d.fields[f].id, f).toBe(s.fields[f].id); expect(d.optionalModules[MOD(f)], f).toBe(true); }
    expect(d.fields.gaze.locked).toBe(true);
  });
  it('共有URL：OFFのままの結果は、増築前と同じ長さの符号のまま（新しい項目を書かない）', () => {
    const s = draw(emptyState(), { seed: 'short' }).state;
    const code = encodeShare(s);
    for (const f of EXPANSION_FIELDS) expect(code.includes(`"${f}"`)).toBe(false);
    const d = decodeShare(code).state!;
    for (const f of EXPANSION_FIELDS) { expect(d.fields[f].id).toBe('none'); expect(d.optionalModules[MOD(f)]).toBe(false); }
  });
  it('設定：知らない系統の値は既定に戻し、既定は従来の出力', () => {
    const s = draw(emptyState(), { seed: 'st' }).state;
    const raw = JSON.parse(JSON.stringify(s));
    raw.settings.pixaiProfile = 'flux'; raw.settings.novelaiProfile = 9;
    const n = normalizeState(raw);
    expect(n.settings.pixaiProfile).toBe('sdxl');
    expect(n.settings.novelaiProfile).toBe('v4');
    delete raw.settings.pixaiProfile;
    expect(normalizeState(raw).settings.pixaiProfile).toBe('sdxl');
  });
  it('存在しない候補IDの増築項目は「なし」に戻し、報告する', () => {
    const s = withModules(ALL_ON, 'bad');
    const raw = JSON.parse(JSON.stringify(s));
    raw.fields.gaze.id = 'telepathic_stare';
    const report = { lostFields: [] as Array<{ field: string; id: string }>, notes: [] as string[] };
    const n = normalizeState(raw, report);
    expect(fieldDef('gaze').options.some((o) => o.id === n.fields.gaze.id)).toBe(true);
    expect(report.lostFields.some((x) => x.field === 'gaze')).toBe(true);
  });
});

describe('辞書の更新（新しい候補の扱い）', () => {
  it('この版で追加した候補は既存の項目にあり、新しい任意項目は対象外', () => {
    const added = addedFields();
    expect(added.length).toBeGreaterThan(5);
    for (const f of EXPANSION_FIELDS) expect(addedOptionIds(f)).toEqual([]);
    expect(added.find((x) => x.field === 'outfit')?.count).toBeGreaterThan(10);
  });
  it('除外の設定がない人には知らせない。除外の設定がある項目に足されたときだけ知らせる', () => {
    expect(addedIntoExcluded(NO_PREFS)).toEqual([]);
    const p = { ...NO_PREFS, excluded: { outfit: ['school_uniform'], eyeColor: ['red'] } } as DrawPrefs;
    const r = addedIntoExcluded(p);
    expect(r.map((x) => x.field)).toEqual(['outfit']);
    expect(r[0].allowed).toBe(addedOptionIds('outfit').length);
  });
  it('まとめて除外・戻すは、今回の追加分だけを動かし、元の除外は保つ', () => {
    const p = { ...NO_PREFS, excluded: { outfit: ['school_uniform'] } } as DrawPrefs;
    const ex = excludeAdded(p);
    expect(ex.excluded.outfit).toContain('school_uniform');
    for (const id of addedOptionIds('outfit')) expect(ex.excluded.outfit).toContain(id);
    expect(addedIntoExcluded(ex)).toEqual([]);
    const back = includeAdded(ex);
    expect(back.excluded.outfit).toEqual(['school_uniform']);
    expect(back.excluded.scene).toBeUndefined();
    const one = excludeAdded(NO_PREFS, ['scene']);
    expect(Object.keys(one.excluded)).toEqual(['scene']);
    expect(p.excluded.outfit).toEqual(['school_uniform']);
  });
  it('お知らせの確認済みは、版ごとに覚える（他の保存データには触れない）', () => {
    kv.setItem('bpg:v1:favorites', '[]');
    expect(loadDictSeen()).toBeNull();
    saveDictSeen(DATA_VERSION);
    expect(loadDictSeen()).toBe(DATA_VERSION);
    expect(kv.getItem(DICT_SEEN_KEY)).toContain(DATA_VERSION);
    expect(kv.getItem('bpg:v1:favorites')).toBe('[]');
  });
});

describe('新しいおまかせスタイル', () => {
  it('働く大人・時代と旅・年齢がにじむ大人 が成立する', () => {
    const ids = ['working_adults', 'era_journey', 'mature_grace'];
    for (const id of ids) {
      const preset = STYLE_PRESETS.find((p) => p.id === id)!;
      expect(preset, id).toBeTruthy();
      for (let i = 0; i < 25; i++) {
        let s = emptyState();
        if (preset.modules) Object.assign(s.optionalModules, preset.modules);
        const r = draw(s, { seed: `${id}${i}`, preset });
        expect(r.ok, `${id}${i}`).toBe(true);
        s = r.state;
        if (id === 'working_adults') expect(optionOf('archetype', s.fields.archetype.id)?.cat).toBe('working');
        if (id === 'mature_grace') { expect(['a35_44', 'a45_59', 'a60p']).toContain(s.fields.age.id); expect(s.fields.ageCue.id).not.toBe('none'); }
      }
    }
  });
});
