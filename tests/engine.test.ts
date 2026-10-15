import { describe, expect, it } from 'vitest';
import { allViolations } from '../src/advisor/hard';
import { DRAW_ORDER, fieldDef, optionOf } from '../src/data/fields';
import { STYLE_PRESETS } from '../src/data/presets';
import { adopt, checkAdopt, draw, drawWithin, fillModule, GROUPS, repairAfterModuleOff, lockCount, nucleus, relatedTargets, toggleLock, unlockAll, valuesOf } from '../src/engine/draw';
import { hashSeed, seededRandom, weightedPick } from '../src/engine/rng';
import { cloneState, emptyState, isActive } from '../src/engine/state';
import { applyShares, softWeight } from '../src/engine/weights';
import type { FieldId, ForgeState } from '../src/types';

const fresh = (seed = 'base', mode: ForgeState['settings']['coherence'] = 'coherent', items = false) => {
  const s = emptyState(); s.settings.coherence = mode;
  if (items) Object.assign(s.optionalModules, { glassesEnabled: true, marksEnabled: true, propEnabled: true });
  const r = draw(s, { seed });
  expect(r.ok).toBe(true);
  return r.state;
};
const set = (s: ForgeState, f: FieldId, id: string, locked = true) => { const t = cloneState(s); t.fields[f] = { id, source: 'manual', locked }; return t; };

describe('乱数', () => {
  it('同じシードは同じ乱数列', () => {
    const a = seededRandom('x'), b = seededRandom('x');
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
  it('重み付き抽選は重み0を選ばず、重み合計0なら null', () => {
    const r = seededRandom('w');
    for (let i = 0; i < 200; i++) expect(weightedPick(['a', 'b'], [0, 1], r)).toBe('b');
    expect(weightedPick(['a'], [0], r)).toBeNull();
  });
  it('nucleus は上位の累積 p だけを残す', () => {
    expect(nucleus([50, 30, 15, 5], 0.9)).toEqual([50, 30, 15, 0]);
    expect(nucleus([1, 1], 1)).toEqual([1, 1]);
  });
});

describe('初回の錬成', () => {
  it('全項目が埋まり、hard 矛盾がない', () => {
    const s = fresh();
    for (const f of DRAW_ORDER) if (isActive(s, f) && fieldDef(f).randomizable !== false) expect(s.fields[f].id, f).toBeTruthy();
    expect(allViolations(valuesOf(s))).toEqual([]);
    expect(s.lastSeed).toBe('base');
    expect(s.drawCount).toBe(1);
  });
});

describe('ロック', () => {
  it('全ロック状態で再錬成しても、値／IDが1件も変わらない', () => {
    let s = fresh('lockall');
    for (const f of DRAW_ORDER) s.fields[f].locked = true;
    const before = JSON.stringify(s.fields);
    const r = draw(s, { seed: 'again' });
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r.state.fields)).toBe(before);
    expect(r.changed).toEqual([]);
    expect(r.notices.join()).toContain('固定中');
    s = r.state;
  });
  it('非ロック項目の再抽選は、ロック済み項目を変えない（50回）', () => {
    let s = fresh('partial');
    const locked: FieldId[] = ['archetype', 'hairColor', 'world', 'outfit', 'expression', 'shot'];
    for (const f of locked) s.fields[f].locked = true;
    const snap = Object.fromEntries(locked.map((f) => [f, s.fields[f].id]));
    for (let i = 0; i < 50; i++) {
      const r = draw(s, { seed: `p${i}` });
      expect(r.ok).toBe(true);
      for (const f of locked) expect(r.state.fields[f].id).toBe(snap[f]);
      s = r.state;
    }
  });
  it('1項目の再抽選で、無関係の値は変わらない', () => {
    const s = fresh('single');
    for (const target of ['eyeColor', 'expression', 'outfit', 'hairColor', 'scene'] as FieldId[]) {
      const r = draw(s, { targets: [target], seed: 'one' + target });
      expect(r.ok).toBe(true);
      for (const f of DRAW_ORDER) if (f !== target) expect(r.state.fields[f].id, `${target}→${f}`).toBe(s.fields[f].id);
    }
  });
  it('ロック全解除は固定だけを外し、値を消さない', () => {
    let s = fresh('unlock');
    for (const f of ['age', 'outfit', 'hairStyle'] as FieldId[]) s = toggleLock(s, f);
    expect(lockCount(s)).toBe(3);
    const u = unlockAll(s);
    expect(lockCount(u)).toBe(0);
    for (const f of DRAW_ORDER) expect(u.fields[f].id).toBe(s.fields[f].id);
  });
  it('同じ方向性で引く：年齢・美形タイプ・容姿傾向・世界観・意匠を保つ', () => {
    const s = fresh('direction');
    const r = draw(s, { targets: GROUPS.direction, seed: 'dir2' });
    for (const f of ['age', 'archetype', 'presentation', 'world', 'culture'] as FieldId[]) expect(r.state.fields[f].id).toBe(s.fields[f].id);
  });
  it('服だけ着せ替え：衣装と色以外は変わらない', () => {
    const s = fresh('outfitonly');
    const r = draw(s, { targets: GROUPS.outfit, seed: 'o2' });
    for (const f of DRAW_ORDER) if (!GROUPS.outfit.includes(f)) expect(r.state.fields[f].id).toBe(s.fields[f].id);
  });
});

describe('hard 制約', () => {
  it('短髪に長髪専用の髪型は出ない（髪の長さを固定して200回）', () => {
    for (const len of ['very_short', 'short']) {
      let s = set(fresh('hair' + len), 'hairLength', len);
      for (let i = 0; i < 100; i++) {
        s = draw(s, { seed: `${len}${i}` }).state;
        expect(optionOf('hairStyle', s.fields.hairStyle.id)!.lengths).toContain(len);
      }
    }
  });
  it('髪型を固定すると、髪の長さはその髪型が成立する長さから選ばれる', () => {
    let s = set(fresh('style'), 'hairStyle', 'very_long_straight');
    for (let i = 0; i < 30; i++) { s = draw(s, { seed: 'vl' + i }).state; expect(s.fields.hairLength.id).toBe('very_long'); }
  });
  it('構図を顔アップで固定すると、全身の動きが必要なポーズは出ない', () => {
    let s = set(fresh('shot'), 'shot', 'close_up');
    for (let i = 0; i < 80; i++) { s = draw(s, { seed: 'c' + i }).state; expect(optionOf('pose', s.fields.pose.id)!.minShot).toBe(0); }
  });
  it('両手を使うポーズでは、手を占有する持ち物は手の数を超えない', () => {
    let s = set(fresh('hands'), 'pose', 'arms_crossed');
    for (let i = 0; i < 60; i++) { s = draw(s, { seed: 'h' + i }).state; expect(optionOf('prop', s.fields.prop.id)!.hands).toBe(0); }
  });
  it('持ち物が必要なポーズは、必要な持ち物とセットになる', () => {
    let s = set(fresh('req', 'coherent', true), 'pose', 'draw_sword');
    for (let i = 0; i < 40; i++) { s = draw(s, { seed: 'r' + i }).state; expect(optionOf('prop', s.fields.prop.id)!.tags).toContain('blade'); }
  });
  it('眼鏡・特徴・持ち物は既定OFFで、出力にも判定にも「なし」として扱う', () => {
    const s0 = emptyState();
    expect([s0.optionalModules.glassesEnabled, s0.optionalModules.marksEnabled, s0.optionalModules.propEnabled]).toEqual([false, false, false]);
    let s = fresh('off');
    for (let i = 0; i < 150; i++) {
      s = draw(s, { seed: 'o' + i }).state;
      const v = valuesOf(s);
      expect([v.glasses?.id, v.marks?.id, v.prop?.id]).toEqual(['none', 'none', 'none']);
      const pose = optionOf('pose', s.fields.pose.id)!;
      // 眼鏡や持ち物を前提にするポーズは出ない
      expect(pose.requires?.some((r) => r.startsWith('glasses:') || r.startsWith('prop:')) ?? false, pose.id).toBe(false);
      expect(s.fields.archetype.id).not.toBe('glasses_intellectual');
    }
  });
  it('OFFの項目を前提にする候補は、手で選ぶとONを促して状態を変えない', () => {
    const s = fresh('off2');
    const chk = checkAdopt(s, 'pose', 'adjust_glasses');
    expect(chk.blockingOff).toEqual(['glasses']);
    const r = adopt(s, 'pose', 'adjust_glasses', true);
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(r.notices[0]).toContain('眼鏡');
    expect(checkAdopt(s, 'archetype', 'glasses_intellectual').blockingOff).toEqual(['glasses']);
  });
  it('スイッチをONにすると、その場で抽選して埋める（固定中の値は変えない）', () => {
    let s = fresh('on');
    s.optionalModules.glassesEnabled = true;
    const ids = new Set<string>();
    for (let i = 0; i < 30; i++) { const r = fillModule(s, 'glasses'); if (r) ids.add(r.state.fields.glasses.id!); }
    expect(ids.size).toBeGreaterThan(1);
    expect(ids.has('none')).toBe(false);
    s = set(s, 'glasses', 'none', true);
    expect(fillModule(s, 'glasses')).toBeNull();
  });
  it('眼鏡の知性派は、眼鏡ONなら必ず眼鏡をかける', () => {
    let s = set(fresh('gi', 'coherent', true), 'archetype', 'glasses_intellectual');
    for (let i = 0; i < 30; i++) { s = draw(s, { seed: 'gi' + i }).state; expect(s.fields.glasses.id).not.toBe('none'); }
  });
  it('持ち物はポーズを出力するときだけ有効', () => {
    const s = fresh('pp', 'coherent', true);
    expect(isActive(s, 'prop')).toBe(true);
    s.optionalModules.poseEnabled = false;
    expect(isActive(s, 'prop')).toBe(false);
  });
  it('現代・日常の新スタイルは、新しい美形タイプと日常着を中心に引く', () => {
    const preset = STYLE_PRESETS.find((p) => p.id === 'modern_daily')!;
    let s = fresh('md');
    let daily = 0;
    for (let i = 0; i < 40; i++) {
      s = draw(s, { seed: 'md' + i, preset }).state;
      expect(optionOf('archetype', s.fields.archetype.id)!.cat).toBe('contemporary');
      if (optionOf('outfit', s.fields.outfit.id)!.cat === 'daily') daily++;
    }
    expect(daily).toBeGreaterThan(30);
  });
  it('名前に髪の特徴を含むタイプは、その髪と必ず組み合う（固定中の別の髪なら候補から外れる）', () => {
    for (const [type, check] of [
      ['black_hair_cool', (st: ForgeState) => optionOf('hairColor', st.fields.hairColor.id)!.cat === 'black'],
      ['wolf_languid', (st: ForgeState) => st.fields.hairStyle.id === 'wolf_cut'],
      ['soft_mash', (st: ForgeState) => st.fields.hairStyle.id === 'mash']
    ] as const) {
      let s = set(fresh('hair-' + type, 'wild'), 'archetype', type);
      for (let i = 0; i < 25; i++) { s = draw(s, { seed: type + i }).state; expect(check(s), `${type}#${i}`).toBe(true); }
    }
    let s = set(fresh('short'), 'hairLength', 'short');
    for (let i = 0; i < 60; i++) { s = draw(s, { seed: 'sh' + i, preset: STYLE_PRESETS.find((p) => p.id === 'downer_mood') }).state; expect(s.fields.archetype.id).not.toBe('wolf_languid'); }
    expect(checkAdopt(set(fresh('lk'), 'hairColor', 'silver'), 'archetype', 'black_hair_cool').blockingLocked).toEqual(['hairColor']);
  });
  it('文化モチーフを固定すると、別文化の伝統衣装は出ない', () => {
    let s = set(fresh('culture'), 'culture', 'japan');
    for (let i = 0; i < 80; i++) {
      s = draw(s, { seed: 'j' + i }).state;
      const o = optionOf('outfit', s.fields.outfit.id)!;
      if (o.culture) expect(o.culture).toBe('japan');
    }
  });
  it('夜には直射の日光系の光が出ない／屋内では雨・雪が出ない', () => {
    let s = set(fresh('night'), 'time', 'night');
    for (let i = 0; i < 60; i++) { s = draw(s, { seed: 'n' + i }).state; const l = optionOf('light', s.fields.light.id)!; if (l.needs) expect(l.needs).toContain('night'); }
    let t = set(fresh('indoor'), 'scene', 'library');
    for (let i = 0; i < 60; i++) { t = draw(t, { seed: 'i' + i }).state; expect(optionOf('time', t.fields.time.id)!.outdoorOnly).toBeFalsy(); }
  });
  it('獣人モードOFFでは獣人項目を抽選しない／ONで埋まる', () => {
    const s = fresh('kemono');
    expect(s.fields.kemonoSpecies.id).toBeNull();
    const on = cloneState(s); on.optionalModules.kemonoEnabled = true;
    const r = draw(on, { seed: 'k' });
    expect(r.state.fields.kemonoSpecies.id).toBeTruthy();
    expect(r.state.fields.marks.id).not.toBe('pointy_ears');
  });
  it('名前に年齢を含む美形タイプは、矛盾する年齢層と組み合わない', () => {
    let s = set(fresh('agearch'), 'age', 'a60p');
    for (let i = 0; i < 60; i++) { s = draw(s, { seed: 'aa' + i }).state; expect(['young_general', 'cold_monarch', 'young_duke', 'refreshing_youth']).not.toContain(s.fields.archetype.id); }
  });
});

describe('競合と候補不足', () => {
  it('固定どうしが矛盾していれば錬成せず、理由と解除候補を返す（無限ループしない）', () => {
    let s = fresh('conflict');
    s = set(s, 'hairLength', 'very_short'); s = set(s, 'hairStyle', 'very_long_straight');
    const before = JSON.stringify(s);
    const r = draw(s, { seed: 'x' });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.state)).toBe(before);
    expect(r.conflicts[0].fields).toEqual(['hairLength', 'hairStyle']);
    expect(r.conflicts[0].unlockCandidates).toEqual(['hairLength', 'hairStyle']);
    expect(r.conflicts[0].reasonJa).toContain('腰まで届くストレート');
  });
  it('1項目再抽選で両立する候補が0件なら、元の値を保って知らせる', () => {
    let s = fresh('stuck');
    s = set(s, 'pose', 'reading'); s = set(s, 'prop', 'book', false);
    const r = draw(s, { targets: ['prop'], seed: 's' });
    expect(r.ok).toBe(true);
    // 本が必要なポーズに固定 → 本・魔導書以外は候補にならない
    expect(['book', 'grimoire']).toContain(r.state.fields.prop.id);
    const s2 = set(set(fresh('stuck2'), 'pose', 'arms_crossed', false), 'prop', 'none', false);
    const lockedShot = set(s2, 'shot', 'close_up');
    const r2 = draw(lockedShot, { targets: ['pose'], seed: 'p' });
    expect(r2.ok).toBe(true);
    expect(optionOf('pose', r2.state.fields.pose.id)!.minShot).toBe(0);
  });
  it('両立する候補がない項目は stuck として返り、関連項目の引き直し対象を提示できる', () => {
    let s = fresh('stuck3', 'coherent', true);
    s = set(s, 'expression', 'smile_eyes_closed'); // 目を閉じる
    s = set(s, 'shot', 'close_up');
    s = set(s, 'glasses', 'none');
    // 顔アップで成立し、目を閉じた表情と両立し、眼鏡不要のポーズは「横顔」だけ
    const r = draw(s, { targets: ['pose'], seed: 'q' });
    expect(r.ok).toBe(true);
    expect(r.state.fields.pose.id).toBe('side_profile');
    expect(relatedTargets(s, ['pose'])).toEqual(expect.arrayContaining(['pose', 'prop']));
  });
  it('手動採用：未固定の項目と競合したら、その項目だけを合わせて引き直す', () => {
    const s = set(fresh('adopt'), 'hairLength', 'short', false);
    const chk = checkAdopt(s, 'hairStyle', 'floor_length');
    expect(chk.ok).toBe(false);
    expect(chk.conflictingUnlocked).toEqual(['hairLength']);
    const r = adopt(s, 'hairStyle', 'floor_length', true, { seed: 'z' });
    expect(r.ok).toBe(true);
    expect(r.state.fields.hairStyle).toEqual({ id: 'floor_length', source: 'manual', locked: true });
    expect(r.state.fields.hairLength.id).toBe('very_long');
  });
  it('手動採用：固定中の項目と競合したら採用せず、状態を変えない', () => {
    const s = set(fresh('adopt2'), 'hairLength', 'short', true);
    const r = adopt(s, 'hairStyle', 'floor_length', true);
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
  });
  it('衣装を手で選ぶと、自動で出た色は新しい服に合わせて引き直される', () => {
    const s = fresh('follow');
    const mains = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const r = adopt(s, 'outfit', 'three_piece', true, { seed: 'f' + i });
      expect(r.ok).toBe(true);
      expect(r.state.fields.outfit).toEqual({ id: 'three_piece', source: 'manual', locked: true });
      expect(r.state.fields.mainColor.source).toBe('random');
      expect(r.changed).toEqual(expect.arrayContaining(['outfit']));
      expect(r.state.fields.mainColor.id).not.toBe(r.state.fields.accentColor.id);
      mains.add(r.state.fields.mainColor.id!);
    }
    expect(mains.size).toBeGreaterThan(1);
  });
  it('衣装を手で選んでも、固定した色と手で選んだ色は変わらない', () => {
    let s = set(fresh('follow2'), 'mainColor', 'jet_black', true);
    s = adopt(s, 'accentColor', 'deep_crimson', false).state;
    for (let i = 0; i < 10; i++) {
      const r = adopt(s, 'outfit', 'three_piece', true, { seed: 'g' + i });
      expect(r.state.fields.mainColor).toEqual(s.fields.mainColor);
      expect(r.state.fields.accentColor).toEqual(s.fields.accentColor);
      const w = drawWithin(s, 'outfit', ['three_piece', 'slim_suit'], true);
      expect(w.state.fields.mainColor).toEqual(s.fields.mainColor);
      expect(w.state.fields.accentColor).toEqual(s.fields.accentColor);
    }
  });
  it('衣装以外を手で選んでも色は引き直さない／一覧から引く衣装では自動の色も合わせる', () => {
    const s = fresh('follow3');
    const r = adopt(s, 'eyeColor', 'gold', true, { seed: 'h' });
    expect(r.state.fields.mainColor).toEqual(s.fields.mainColor);
    expect(r.state.fields.accentColor).toEqual(s.fields.accentColor);
    const mains = new Set<string>();
    for (let i = 0; i < 20; i++) mains.add(drawWithin(s, 'outfit', ['three_piece'], true).state.fields.mainColor.id!);
    expect(mains.size).toBeGreaterThan(1);
  });
  it('手動で選んだ値は、ロックしなければ次の錬成で変わり得る', () => {
    let s = fresh('manual');
    s = adopt(s, 'eyeColor', 'gold', false).state;
    expect(s.fields.eyeColor.source).toBe('manual');
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) ids.add(draw(s, { seed: 'm' + i }).state.fields.eyeColor.id!);
    expect(ids.size).toBeGreaterThan(1);
  });
  it('一覧から引く（drawWithin）は一覧の中だけから選ぶ', () => {
    const s = fresh('within');
    for (let i = 0; i < 20; i++) {
      const r = drawWithin(s, 'hairColor', ['silver', 'white', 'black'], false);
      expect(['silver', 'white', 'black']).toContain(r.state.fields.hairColor.id);
    }
  });
});

describe('シードと重複回避', () => {
  it('同じseed＋同じ条件は同じ結果（3モード）', () => {
    for (const mode of ['coherent', 'balanced', 'wild'] as const) {
      const a = fresh('repro', mode), b = fresh('repro', mode);
      expect(JSON.stringify(a.fields)).toBe(JSON.stringify(b.fields));
    }
  });
  it('固定シード設定でも同じ結果になり、シード無しなら毎回変わる', () => {
    const s = emptyState(); s.settings.seed = 'fixed-1';
    const a = draw(s).state, b = draw(s).state;
    expect(JSON.stringify(a.fields)).toBe(JSON.stringify(b.fields));
    expect(a.lastSeed).toBe('fixed-1');
    const c = draw(emptyState()).state, d = draw(emptyState()).state;
    expect(JSON.stringify(c.fields)).not.toBe(JSON.stringify(d.fields));
  });
  it('直近履歴を避ける（同じ項目が連続しにくい）', () => {
    let s = fresh('recent', 'balanced');
    s.settings.seed = '';
    let recent = {};
    let same = 0;
    for (let i = 0; i < 60; i++) {
      const prev = s.fields.archetype.id;
      const r = draw(s, { targets: ['archetype'], recent });
      recent = r.recent; s = r.state;
      if (s.fields.archetype.id === prev) same++;
    }
    expect(same).toBeLessThanOrEqual(2);
  });
  it('候補不足のときは重複回避をゆるめる（候補が直近だけでも止まらない）', () => {
    const s = set(fresh('relax'), 'hairStyle', 'very_long_straight');
    s.settings.seed = '';
    const recent = { hairLength: ['very_long'] };
    const r = draw(s, { targets: ['hairLength'], recent });
    expect(r.ok).toBe(true);
    expect(r.state.fields.hairLength.id).toBe('very_long');
  });
});

describe('モードとおまかせスタイル', () => {
  it('まとまり重視は世界観に合う衣装の割合が高く、カオスは低い', () => {
    const rate = (mode: 'coherent' | 'balanced' | 'wild') => {
      let hit = 0;
      for (let i = 0; i < 150; i++) {
        const s = fresh('m' + i, mode);
        const w = optionOf('world', s.fields.world.id)!, o = optionOf('outfit', s.fields.outfit.id)!;
        if (w.id === 'world_mix' || (o.worlds || []).some((x) => x === w.id || (w.tags || []).includes(x))) hit++;
      }
      return hit / 150;
    };
    const c = rate('coherent'), b = rate('balanced'), w = rate('wild');
    expect(c).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(w);
    expect(c).toBeGreaterThan(0.85);
  });
  it('おまかせスタイルは条件の範囲で抽選し、固定を優先する', () => {
    const silver = STYLE_PRESETS.find((p) => p.id === 'silver')!;
    for (let i = 0; i < 20; i++) {
      const r = draw(fresh('ps' + i), { preset: silver, seed: 'ps' + i });
      expect(silver.filters.hairColor).toContain(r.state.fields.hairColor.id);
    }
    const locked = set(fresh('psl'), 'hairColor', 'black');
    const r = draw(locked, { preset: silver, seed: 'psl' });
    expect(r.state.fields.hairColor.id).toBe('black');
  });
  it('ケモミミのおまかせは獣人モードを有効にする', () => {
    const k = STYLE_PRESETS.find((p) => p.id === 'kemono')!;
    const r = draw(fresh('kp'), { preset: k, seed: 'kp' });
    expect(r.state.optionalModules.kemonoEnabled).toBe(true);
    expect(['lv1', 'lv2']).toContain(r.state.fields.kemonoLevel.id);
  });
  it('群の下限：好みに合う候補群は指定の確率を確保する', () => {
    const pool = fieldDef('outfit').options;
    const w = pool.map(() => 1);
    const out = applyShares(pool, w, [{ label: 't', match: (o) => o.id === 'butler', share: 0.5 }]);
    const total = out.reduce((a, b) => a + b, 0);
    expect(out[pool.findIndex((o) => o.id === 'butler')] / total).toBeCloseTo(0.5, 5);
  });
  it('カオスでは現実寄りの世界観でも幻想色の髪が下がらない', () => {
    const v = { world: optionOf('world', 'business')! };
    const pink = optionOf('hairColor', 'pastel_blue')!;
    expect(softWeight('hairColor', pink, v, 'coherent')).toBeLessThan(softWeight('hairColor', pink, v, 'wild') * 1.01);
  });
});

describe('禁断の調合（アンリミテッドモード）', () => {
  const onState = (seed: string, mode: ForgeState['settings']['coherence'] = 'coherent') => {
    const s = emptyState(); s.settings.coherence = mode; s.optionalModules.unlimitedEnabled = true;
    const r = draw(s, { seed }); expect(r.ok, JSON.stringify(r.conflicts)).toBe(true); return r.state;
  };
  it('既定はOFFで、OFFの間は立場・拘束・目隠し・着崩し・状態がすべて「なし」', () => {
    expect(emptyState().optionalModules.unlimitedEnabled).toBe(false);
    let s = fresh('fb0');
    for (let i = 0; i < 60; i++) {
      s = draw(s, { seed: 'fb0' + i }).state;
      const v = valuesOf(s);
      for (const f of ['role', 'restraint', 'bindPos', 'anchor', 'blindfold', 'disarray', 'wear1', 'wear2'] as const) expect(v[f]?.id, f).toBe('none');
      expect(v.pose!.tags?.includes('bound')).toBe(false);
      expect(v.expression!.cat).not.toBe('forbidden');
    }
  });
  it('ONでは組み合わせの約束を守る（3モード×各80回）', () => {
    for (const mode of ['coherent', 'balanced', 'wild'] as const) {
      let s = onState('fb-' + mode, mode);
      for (let i = 0; i < 80; i++) {
        const r = draw(s, { seed: `fb-${mode}-${i}` });
        expect(r.ok).toBe(true);
        s = r.state;
        const v = valuesOf(s);
        expect(allViolations(v), `${mode}#${i}`).toEqual([]);
        const role = v.role!, b = v.bindPos!, p = v.pose!;
        const captorOnly = role.tags?.includes('captor') && !role.tags?.includes('captive');
        if (captorOnly) expect(['none', 'held']).toContain(b.id);
        if (v.restraint!.id === 'none') expect(b.id).toBe('none');
        if (p.tags?.includes('bound')) expect(p.requires![0].replace('bindPos:', '').split('|')).toContain(b.id);
        if (v.disarray!.id === 'tie_loosened') expect(v.outfit!.tags).toContain('tie');
        if (v.wear1!.cat === 'wet') expect(v.wear2!.cat).not.toBe('wet');
        if (v.wear2!.id !== 'none') expect(v.wear1!.id).not.toBe('none');
        if (v.blindfold!.tags?.includes('covered')) expect(v.glasses?.id ?? 'none').toBe('none');
        if (v.bindPos!.id === 'wrists_overhead' || v.anchor!.id === 'overhead') expect(['indoor', 'simple'], `${mode}#${i} ${v.scene!.id}`).toContain(v.scene!.place);
        if (v.restraint!.id !== 'none' && v.outfit!.tags?.includes('f_chain')) expect(v.restraint!.tags).toContain('chain');
        if (v.restraint!.id !== 'none' && v.outfit!.tags?.includes('f_strap')) expect(v.restraint!.id).toBe('straps');
        if (v.disarray!.id === 'riding_up') expect(v.pose!.tags).toContain('arms_up');
        expect(r.stuck, `${mode}#${i}`).toEqual([]);
      }
    }
  });
  it('される側では、拘束の構図と立場に合う表情が出やすい', () => {
    let bound = 0, captiveExpr = 0;
    let s = set(onState('fb-cap'), 'role', 'captive');
    for (let i = 0; i < 60; i++) {
      s = draw(s, { seed: 'cap' + i }).state;
      if (optionOf('pose', s.fields.pose.id)!.tags?.includes('bound')) bound++;
      if (['wary', 'defiant', 'frustrated', 'resigned', 'bewildered', 'quiet_tears', 'determined', 'flustered', 'sad_smile', 'intense_stare'].includes(s.fields.expression.id!)) captiveExpr++;
    }
    expect(bound).toBeGreaterThan(25);
    expect(captiveExpr).toBeGreaterThan(30);
  });
  it('縛っていると囚われの場所（地下牢・独房・鳥籠など）が出やすく、触手の巣は触手のときだけ', () => {
    let s = set(set(set(onState('cap'), 'role', 'captive'), 'restraint', 'chain'), 'bindPos', 'wrists_front');
    let n = 0;
    for (let i = 0; i < 60; i++) {
      s = draw(s, { seed: 'cap' + i }).state;
      const sc = optionOf('scene', s.fields.scene.id)!;
      if (sc.cat === 'captivity') n++;
      expect(sc.id).not.toBe('tentacle_lair');
    }
    expect(n).toBeGreaterThan(30);
    let t = set(set(set(onState('lair'), 'role', 'captive'), 'restraint', 'tentacles'), 'world', 'dark_fantasy');
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) { t = draw(t, { seed: 'lair' + i }).state; seen.add(t.fields.scene.id!); }
    expect(seen.has('tentacle_lair')).toBe(true);
  });
  it('OFFにすると、囚われの場所は固定していなければ引き直され、OFFの抽選では出ない', () => {
    const s = set(set(onState('caoff'), 'role', 'captive'), 'scene', 'dungeon_cell', false);
    s.optionalModules.unlimitedEnabled = false;
    const r = repairAfterModuleOff(s)!;
    expect(optionOf('scene', r.state.fields.scene.id)!.cat).not.toBe('captivity');
    let f = fresh('cap-off');
    for (let i = 0; i < 80; i++) { f = draw(f, { seed: 'co' + i }).state; expect(optionOf('scene', f.fields.scene.id)!.cat).not.toBe('captivity'); }
  });
  it('膝立ち・うつ伏せの拘束ポーズは、対応する拘束位置で出る', () => {
    const seen = new Set<string>();
    for (const [bind, poses] of [['wrists_behind', ['kneel_behind', 'prone_behind', 'kneel_look_up', 'kneel_head_down']], ['wrists_overhead', ['kneel_overhead']], ['wrists_front', ['prone_reach']], ['ankles', ['prone_ankles']]] as const) {
      let s = set(set(set(onState('kp-' + bind), 'role', 'captive'), 'restraint', 'rope'), 'bindPos', bind);
      for (let i = 0; i < 120; i++) { s = draw(s, { seed: `kp-${bind}-${i}` }).state; seen.add(s.fields.pose.id!); }
      for (const p of poses) expect(seen.has(p), `${bind}:${p}`).toBe(true);
    }
  });
  it('「禁断演出だけ引き直す」は、他の項目（髪・衣装・美形タイプ）を変えない', () => {
    const s = onState('fb-group');
    const r = draw(s, { targets: GROUPS.forbidden, seed: 'g' });
    for (const f of ['archetype', 'hairStyle', 'hairColor', 'outfit', 'world'] as const) expect(r.state.fields[f].id).toBe(s.fields[f].id);
  });
  it('ONにすると、禁断演出をその場でまとめて引く', () => {
    const s = fresh('fb-fill'); s.optionalModules.unlimitedEnabled = true;
    const r = fillModule(s, 'unlimited')!;
    expect(r.ok).toBe(true);
    expect(r.state.fields.role.id).not.toBe('none');
  });
  it('立場がOFFでは立場の表情を手で選べず、ONなら選べる', () => {
    expect(checkAdopt(fresh('fb-ex'), 'expression', 'wary').blockingOff).toEqual(['role']);
    const s = set(onState('fb-ex2'), 'role', 'captive');
    expect(adopt(s, 'expression', 'wary', true).ok).toBe(true);
  });
});
