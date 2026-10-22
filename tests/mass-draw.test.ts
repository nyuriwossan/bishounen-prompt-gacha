/* 大量抽選テスト
 * - 4,200回の抽選を「3モード × おまかせスタイル（なし含む）× ロック条件・任意モジュール・禁断の調合・コスプレ」に分散
 * - hard 違反・例外・美形アンカー欠落・男性1名指定・成人・ロック不変を集計
 * - 100件以上のロック競合ケース（hard ルールから機械的に列挙）
 * - 全美形タイプが抽選で到達可能か（眼鏡を前提にするタイプは眼鏡ONで確認）、手動で全候補を採用できるか
 * 結果は docs/test-artifacts/mass-draw-report.json に保存する（再現用の seed と条件つき）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { allViolations, PAIR_RULES } from '../src/advisor/hard';
import { DATA_VERSION, DRAW_ORDER, fieldDef, FIELDS, optionOf } from '../src/data/fields';
import { STYLE_PRESETS } from '../src/data/presets';
import { adopt, draw, valuesOf } from '../src/engine/draw';
import { seededRandom } from '../src/engine/rng';
import { cloneState, emptyState, FORBIDDEN_FIELDS, isActive } from '../src/engine/state';
import { buildPrompt } from '../src/prompts/build';
import type { FieldId, ForgeState, Mode } from '../src/types';

const MODES: Mode[] = ['coherent', 'balanced', 'wild'];
const PRESETS = [undefined, ...STYLE_PRESETS];
const LOCK_PATTERNS = ['none', 'lock3', 'lock8', 'manualLocked', 'modulesOn', 'modulesOff', 'unlimited', 'cosplay'] as const;
const DRAWS = 4200;
/** 画像生成サービスで弾かれやすい語・性的／露出を直接示す語（禁断の調合でも出さない） */
const BLOCKED = /\b(nsfw|bondage|bdsm|nude|naked|nudity|sex|sexual|erotic|shirtless|topless|lewd)\b/i;
const FEMALE = /\b(1girl|female|woman|girl|breasts)\b/i;
const MINOR = /\b(child|kid|teen|teenager|shota|loli|schoolboy)\b/i;

interface Anomaly { kind: string; seed: string; mode: Mode; preset: string; pattern: string; detail: string }

function base(rng: () => number, mode: Mode, pattern: (typeof LOCK_PATTERNS)[number], seed: string): ForgeState {
  let s = emptyState();
  s.settings.coherence = mode;
  if (pattern === 'modulesOn') Object.assign(s.optionalModules, { kemonoEnabled: true, facialHairEnabled: true, hairAccentEnabled: true, glassesEnabled: true, marksEnabled: true, propEnabled: true });
  if (pattern === 'modulesOff') Object.assign(s.optionalModules, { backgroundEnabled: false, poseEnabled: false, nameEnabled: false });
  if (pattern === 'unlimited') Object.assign(s.optionalModules, { unlimitedEnabled: true, glassesEnabled: rng() < 0.5, propEnabled: rng() < 0.5, marksEnabled: rng() < 0.5 });
  if (pattern === 'cosplay') Object.assign(s.optionalModules, { cosplayEnabled: true, unlimitedEnabled: rng() < 0.5, kemonoEnabled: rng() < 0.3, propEnabled: rng() < 0.5 });
  s = draw(s, { seed: seed + ':init' }).state;
  const candidates = DRAW_ORDER.filter((f) => isActive(s, f) && fieldDef(f).randomizable !== false);
  const pick = (n: number) => { const c = [...candidates]; const out: FieldId[] = []; while (out.length < n && c.length) out.push(c.splice(Math.floor(rng() * c.length), 1)[0]); return out; };
  if (pattern === 'lock3') for (const f of pick(3)) s.fields[f].locked = true;
  if (pattern === 'lock8') for (const f of pick(8)) s.fields[f].locked = true;
  if (pattern === 'manualLocked') {
    for (const f of pick(2)) {
      const opts = fieldDef(f).options;
      const r = adopt(s, f, opts[Math.floor(rng() * opts.length)].id, true, { seed: seed + ':adopt' });
      if (r.ok) s = r.state;
    }
  }
  return s;
}

describe('大量抽選（4,200回）', () => {
  it('hard 違反・例外・アンカー欠落ゼロ、ロック不変、偏りなし', { timeout: 600000 }, async () => {
    const rng = seededRandom('mass');
    const anomalies: Anomaly[] = [];
    const counts: Record<string, Record<string, number>> = { archetype: {}, hairColor: {}, outfit: {}, world: {}, age: {}, presentation: {}, hairLength: {}, scene: {} };
    const modeWorldOutfit: Record<Mode, [number, number]> = { coherent: [0, 0], balanced: [0, 0], wild: [0, 0] };
    const modeArchetypeHit: Record<Mode, [number, number]> = { coherent: [0, 0], balanced: [0, 0], wild: [0, 0] };
    let ok = 0, refused = 0, exceptions = 0, stuckCount = 0;
    const signatures = new Map<string, number>();
    const t0 = Date.now();

    for (let i = 0; i < DRAWS; i++) {
      // 長い同期処理でテストランナーとの通信が途切れないよう、ときどき制御を返す（CIで RPC タイムアウトになったため）
      if (i % 100 === 0) await new Promise((r) => setImmediate(r));
      const mode = MODES[i % MODES.length];
      const preset = PRESETS[Math.floor(i / MODES.length) % PRESETS.length];
      const pattern = LOCK_PATTERNS[Math.floor(i / (MODES.length * PRESETS.length)) % LOCK_PATTERNS.length];
      const seed = `mass-${i}`;
      const ctx = { seed, mode, preset: preset?.id ?? '-', pattern };
      try {
        const s0 = base(rng, mode, pattern, seed);
        const lockedBefore = DRAW_ORDER.filter((f) => s0.fields[f].locked).map((f) => [f, s0.fields[f].id] as const);
        const r = draw(s0, { seed, preset });
        if (!r.ok) {
          refused++;
          // 拒否はロック済みの矛盾がある時だけ許される
          const lockedOnly = r.conflicts.every((c) => c.unlockCandidates.length > 0);
          if (!lockedOnly) anomalies.push({ kind: 'refused-without-locked-conflict', ...ctx, detail: JSON.stringify(r.conflicts) });
          if (r.state !== s0) anomalies.push({ kind: 'refused-but-changed', ...ctx, detail: '' });
          continue;
        }
        ok++;
        if (r.stuck.length) stuckCount++;
        const s = r.state;
        for (const [f, id] of lockedBefore) if (s.fields[f].id !== id) anomalies.push({ kind: 'lock-changed', ...ctx, detail: `${f}: ${id} → ${s.fields[f].id}` });
        const viols = allViolations(valuesOf(s)).filter((v) => v.fields.some((f) => !s0.fields[f].locked));
        for (const v of viols) anomalies.push({ kind: 'hard-violation', ...ctx, detail: `${v.rule}: ${v.reasonJa}` });
        for (const f of DRAW_ORDER) if (isActive(s, f) && fieldDef(f).randomizable !== false && !optionOf(f, s.fields[f].id) && !r.stuck.includes(f)) anomalies.push({ kind: 'missing-field', ...ctx, detail: f });
        const age = optionOf('age', s.fields.age.id)!;
        // 禁断の調合がOFFなら、その項目・拘束の構図・立場の表情は一切出ない
        if (!s.optionalModules.unlimitedEnabled) {
          const vv = valuesOf(s);
          for (const f of FORBIDDEN_FIELDS) if (vv[f] && vv[f]!.id !== 'none' && f !== 'tightness') anomalies.push({ kind: 'forbidden-leak', ...ctx, detail: f });
          if (vv.pose?.tags?.includes('bound') || vv.expression?.cat === 'forbidden' || vv.scene?.cat === 'captivity') anomalies.push({ kind: 'forbidden-leak', ...ctx, detail: `${vv.pose?.id}/${vv.expression?.id}/${vv.scene?.id}` });
          if (buildPrompt(s, 'pixai').sections.some((x) => x.id === 'forbidden')) anomalies.push({ kind: 'forbidden-leak', ...ctx, detail: 'section' });
        }
        // コスプレ：OFFなら一切出ない。ONなら（固定がない限り）必ずコスプレ枠。獣人ONで耳付き、禁断ONでセーラー服は出ない
        const outfitOpt = optionOf('outfit', s.fields.outfit.id);
        if (!s.optionalModules.cosplayEnabled && outfitOpt?.cat === 'cosplay') anomalies.push({ kind: 'cosplay-leak', ...ctx, detail: outfitOpt.id });
        if (s.optionalModules.cosplayEnabled && !s0.fields.outfit.locked && outfitOpt?.cat !== 'cosplay') anomalies.push({ kind: 'cosplay-missing', ...ctx, detail: outfitOpt?.id ?? '-' });
        if (s.optionalModules.cosplayEnabled && s.optionalModules.kemonoEnabled && outfitOpt?.tags?.includes('f_ears')) anomalies.push({ kind: 'cosplay-ears', ...ctx, detail: outfitOpt.id });
        if (s.optionalModules.unlimitedEnabled && outfitOpt?.tags?.includes('no_forbidden')) anomalies.push({ kind: 'cosplay-forbidden', ...ctx, detail: outfitOpt.id });
        if ((age.ageMin ?? 0) < 18) anomalies.push({ kind: 'minor-age', ...ctx, detail: age.id });
        for (const t of ['pixai', 'novelai', 'genericTags', 'naturalEnglish', 'japanese'] as const) {
          const p = buildPrompt(s, t).positive;
          if (t !== 'naturalEnglish' && t !== 'japanese') {
            const tags = p.split(', ');
            for (const need of ['1boy', 'solo', 'male focus', 'handsome']) if (!tags.includes(need)) anomalies.push({ kind: 'anchor-missing', ...ctx, detail: `${t}:${need}` });
          }
          if (t === 'naturalEnglish' && !/strikingly handsome/.test(p)) anomalies.push({ kind: 'anchor-missing', ...ctx, detail: 'natural' });
          if (FEMALE.test(p) && t !== 'japanese') anomalies.push({ kind: 'female-tag', ...ctx, detail: t });
          if (MINOR.test(p) || /\badult\b/i.test(p)) anomalies.push({ kind: 'age-word', ...ctx, detail: t });
          if (/undefined|\bnull\b|\{c[12]\}/.test(p)) anomalies.push({ kind: 'template-leak', ...ctx, detail: t });
          if (BLOCKED.test(p)) anomalies.push({ kind: 'blocked-word', ...ctx, detail: `${t}: ${p.match(BLOCKED)![0]}` });
        }
        for (const k of Object.keys(counts)) { const id = s.fields[k as FieldId].id ?? '-'; counts[k][id] = (counts[k][id] || 0) + 1; }
        const sig = DRAW_ORDER.map((f) => s.fields[f].id).join('|');
        signatures.set(sig, (signatures.get(sig) || 0) + 1);
        // 世界観との一致率は通常の衣装で測る（コスプレは世界観を問わない）
        if (!preset && !s.optionalModules.cosplayEnabled) {
          const w = optionOf('world', s.fields.world.id)!, o = optionOf('outfit', s.fields.outfit.id)!;
          modeWorldOutfit[mode][1]++;
          if (w.id === 'world_mix' || (o.worlds || []).some((x) => x === w.id || (w.tags || []).includes(x))) modeWorldOutfit[mode][0]++;
          const a = optionOf('archetype', s.fields.archetype.id)!;
          for (const [f, refs] of Object.entries(a.prefs || {}) as Array<[FieldId, string[]]>) {
            if (['world', 'age'].includes(f) || !isActive(s, f)) continue;
            modeArchetypeHit[mode][1]++;
            const v = optionOf(f, s.fields[f].id);
            if (v && refs.some((r) => r.split('|').some((x) => x === v.id || (x.startsWith('#') && (v.tags?.includes(x.slice(1)) || v.cat === x.slice(1)))))) modeArchetypeHit[mode][0]++;
          }
        }
      } catch (e) {
        exceptions++;
        anomalies.push({ kind: 'exception', ...ctx, detail: String((e as Error).stack ?? e).slice(0, 500) });
      }
    }

    const elapsed = Date.now() - t0;
    const top = (k: string, n = 5) => Object.entries(counts[k]).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id, c]) => ({ id, share: +(c / ok).toFixed(4) }));
    const duplicates = [...signatures.values()].filter((c) => c > 1).length;
    const reachedArchetypes = Object.keys(counts.archetype).length;
    const report = {
      generatedAt: new Date().toISOString(), dataVersion: DATA_VERSION, draws: DRAWS, ok, refusedByLockedConflict: refused, exceptions, drawsWithStuckField: stuckCount,
      elapsedMs: elapsed, msPerDraw: +(elapsed / DRAWS).toFixed(2),
      anomalies: anomalies.slice(0, 200), anomalyCount: anomalies.length,
      anomalyKinds: anomalies.reduce<Record<string, number>>((m, a) => { m[a.kind] = (m[a.kind] || 0) + 1; return m; }, {}),
      duplicateFullResults: duplicates,
      reachedArchetypes, totalArchetypes: fieldDef('archetype').options.length,
      categoryCoverage: Object.fromEntries(Object.keys(counts).map((k) => [k, `${Object.keys(counts[k]).length}/${fieldDef(k as FieldId).options.length}`])),
      topShares: Object.fromEntries(Object.keys(counts).map((k) => [k, top(k)])),
      modeComparison: Object.fromEntries(MODES.map((m) => [m, {
        worldOutfitMatchRate: +(modeWorldOutfit[m][0] / modeWorldOutfit[m][1]).toFixed(3), samples: modeWorldOutfit[m][1],
        archetypePreferenceHitRate: +(modeArchetypeHit[m][0] / modeArchetypeHit[m][1]).toFixed(3)
      }]))
    };
    fs.mkdirSync(path.resolve('docs/test-artifacts'), { recursive: true });
    fs.writeFileSync(path.resolve('docs/test-artifacts/mass-draw-report.json'), JSON.stringify(report, null, 2) + '\n');

    expect(exceptions).toBe(0);
    expect(anomalies.filter((a) => a.kind !== 'refused-without-locked-conflict')).toEqual([]);
    expect(anomalies).toEqual([]);
    expect(ok).toBeGreaterThan(DRAWS * 0.9);
    expect(duplicates).toBe(0);
    // 装身具を前提にするタイプ（眼鏡の知性派）は既定OFFでは出ない。それ以外は全種到達し、前提のタイプはONで到達することを別に確かめる
    const needsItem = fieldDef('archetype').options.filter((o) => o.requires?.some((r) => /^(glasses|marks|prop):/.test(r))).map((o) => o.id);
    const unreached = fieldDef('archetype').options.map((o) => o.id).filter((id) => !counts.archetype[id] && !needsItem.includes(id));
    expect(unreached).toEqual([]);
    for (const id of needsItem) {
      const s = emptyState(); Object.assign(s.optionalModules, { glassesEnabled: true, marksEnabled: true, propEnabled: true });
      const cat = optionOf('archetype', id)!.cat!;
      let hit = false;
      for (let i = 0; i < 400 && !hit; i++) hit = draw(s, { seed: `need:${id}:${i}`, preset: { id: 'need', ja: '', desc: '', icon: '', filters: { archetype: [`cat:${cat}`] } } }).state.fields.archetype.id === id;
      expect(hit, id).toBe(true);
    }
    // 偏り：特定の美形タイプ・髪色・衣装に異常に集中しない
    expect(top('archetype', 1)[0].share).toBeLessThan(0.05);
    expect(top('hairColor', 1)[0].share).toBeLessThan(0.12);
    expect(top('outfit', 1)[0].share).toBeLessThan(0.06);
    // モード差
    const c = report.modeComparison as unknown as Record<Mode, { worldOutfitMatchRate: number; archetypePreferenceHitRate: number }>;
    expect(c.coherent.worldOutfitMatchRate).toBeGreaterThan(c.balanced.worldOutfitMatchRate);
    expect(c.balanced.worldOutfitMatchRate).toBeGreaterThan(c.wild.worldOutfitMatchRate);
    expect(c.coherent.archetypePreferenceHitRate).toBeGreaterThan(c.balanced.archetypePreferenceHitRate);
    expect(c.balanced.archetypePreferenceHitRate).toBeGreaterThan(c.wild.archetypePreferenceHitRate);
  });
});

describe('ロック競合（hard ルールから列挙した100件以上）', () => {
  it('固定どうしの矛盾は抽選せず、衝突項目・理由・解除候補を返す', { timeout: 300000 }, async () => {
    const cases: Array<{ a: [FieldId, string]; b: [FieldId, string]; rule: string }> = [];
    for (const rule of PAIR_RULES) {
      const [fa, fb] = rule.fields;
      let n = 0;
      for (const oa of fieldDef(fa).options) {
        for (const ob of fieldDef(fb).options) {
          const v = { [fa]: oa, [fb]: ob } as Parameters<typeof rule.check>[0];
          if (rule.id === 'hair_accent_duplicate') (v as Record<string, unknown>).hairAccent = optionOf('hairAccent', 'streaks');
          if (rule.check(v)) { cases.push({ a: [fa, oa.id], b: [fb, ob.id], rule: rule.id }); n++; }
          if (n >= 14) break;
        }
        if (n >= 14) break;
      }
    }
    // requires（ポーズ→持ち物・眼鏡・衣装）
    for (const p of fieldDef('pose').options.filter((x) => x.requires)) {
      const [f, ref] = p.requires![0].split(':') as [FieldId, string];
      const bad = fieldDef(f).options.find((o) => (ref === '!none' ? o.id === 'none' : !(o.tags?.includes(ref.slice(1)) || o.id === ref)));
      if (bad) cases.push({ a: ['pose', p.id], b: [f, bad.id], rule: 'requires' });
    }
    expect(cases.length).toBeGreaterThanOrEqual(100);
    const failures: string[] = [];
    for (const [i, c] of cases.entries()) {
      // 長い同期処理でテストランナーとの通信が途切れないよう、ときどき制御を返す
      if (i % 50 === 0) await new Promise((r) => setImmediate(r));
      const s0 = emptyState(); Object.assign(s0.optionalModules, { glassesEnabled: true, marksEnabled: true, propEnabled: true, unlimitedEnabled: true });
      let s = draw(s0, { seed: 'lc' + i }).state;
      s = cloneState(s);
      if (c.rule === 'hair_accent_duplicate') { s.optionalModules.hairAccentEnabled = true; s.fields.hairAccent = { id: 'streaks', source: 'manual', locked: true }; }
      if (c.rule === 'ears_kemono' || c.rule === 'outfit_ears_kemono') s.optionalModules.kemonoEnabled = true;
      if (c.a[0] === 'outfit' && optionOf('outfit', c.a[1])?.cat === 'cosplay') s.optionalModules.cosplayEnabled = true;
      s.fields[c.a[0]] = { id: c.a[1], source: 'manual', locked: true };
      s.fields[c.b[0]] = { id: c.b[1], source: 'manual', locked: true };
      if ((c.rule === 'ears_kemono' || c.rule === 'outfit_ears_kemono') && !s.fields.kemonoLevel.id) s.fields.kemonoLevel = { id: 'lv1', source: 'manual', locked: false };
      const before = JSON.stringify(s);
      const t = Date.now();
      const r = draw(s, { seed: 'x' + i });
      const fields = new Set(r.conflicts.flatMap((x) => x.fields));
      if (r.ok) failures.push(`${c.rule} ${c.a.join('=')} × ${c.b.join('=')}: 抽選されてしまった`);
      else if (!fields.has(c.a[0]) || !fields.has(c.b[0])) failures.push(`${c.rule}: 衝突項目が不足 ${[...fields]}`);
      else if (!r.conflicts.every((x) => x.reasonJa.length > 5 && x.unlockCandidates.length > 0)) failures.push(`${c.rule}: 理由または解除候補が無い`);
      else if (JSON.stringify(r.state) !== before) failures.push(`${c.rule}: 状態が変わった`);
      if (Date.now() - t > 2000) failures.push(`${c.rule}: 時間がかかりすぎ`);
    }
    fs.mkdirSync(path.resolve('docs/test-artifacts'), { recursive: true });
    fs.writeFileSync(path.resolve('docs/test-artifacts/lock-conflict-cases.json'), JSON.stringify({ total: cases.length, byRule: cases.reduce<Record<string, number>>((m, c) => { m[c.rule] = (m[c.rule] || 0) + 1; return m; }, {}), failures }, null, 2) + '\n');
    expect(failures).toEqual([]);
  });
});

describe('到達可能性', () => {
  it('全項目の全候補を手動で採用できる（必要なら未固定の関連項目を合わせて引き直す）', { timeout: 300000 }, async () => {
    const failures: string[] = [];
    let s = emptyState();
    Object.assign(s.optionalModules, { kemonoEnabled: true, facialHairEnabled: true, hairAccentEnabled: true, glassesEnabled: true, marksEnabled: true, propEnabled: true, unlimitedEnabled: true, cosplayEnabled: true });
    s = draw(s, { seed: 'reach' }).state;
    // 獣人モード中は「尖った人の耳」は獣の耳と両立しない（hard）。モードOFFの状態で確認する。
    const humanEars = cloneState(s); humanEars.optionalModules.kemonoEnabled = false;
    let n = 0;
    for (const f of FIELDS) {
      for (const o of f.options) {
        if (n++ % 100 === 0) await new Promise((r) => setImmediate(r));
        // 衣装の兎耳も獣の耳と両立しないので、同じく獣人OFFで確認する
        const from = (f.id === 'marks' && o.id === 'pointy_ears') || (f.id === 'outfit' && o.tags?.includes('f_ears')) ? humanEars : s;
        const r = adopt(from, f.id, o.id, false, { seed: `${f.id}:${o.id}` });
        if (!r.ok || r.state.fields[f.id].id !== o.id) failures.push(`${f.id}:${o.id} ${r.notices.join(' ')}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
