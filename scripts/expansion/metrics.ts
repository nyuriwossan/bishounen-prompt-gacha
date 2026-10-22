/* 抽選の健康指標（増築の前後比較用）
 *   npx vite-node scripts/expansion/metrics.ts -- <出力JSON>
 * - 固定 0/5/10/15 項目での stuck 率（他項目と両立する候補がなく元値を保った抽選の割合）と拒否率
 * - 項目ごとの Shannon エントロピーと実効候補数（exp(H)）・到達率
 * - 外見の複合署名（年齢×容姿×体格×顔×目元×髪型×衣装×ポーズ）の衝突率
 * - 同じ美形タイプどうしの「似通い」：見た目の軸のうち異なる軸が3つ以下（close）・6つ以下（near）の組の割合と、平均の異なる軸数
 * - PixAI 出力に looking at viewer を含む割合（こちら向き視線への偏り）
 * 旧版（増築前）と新版のどちらでも動くよう、項目・任意モジュールは実行時に調べる。
 */
import fs from 'node:fs';
import { DATA_VERSION, DRAW_ORDER, fieldDef, FIELDS, optionOf } from '../../src/data/fields';
import { draw } from '../../src/engine/draw';
import { seededRandom } from '../../src/engine/rng';
import { DEFAULT_MODULES, emptyState, isActive } from '../../src/engine/state';
import { buildPrompt } from '../../src/prompts/build';
import type { FieldId, ForgeModules, ForgeState, Mode } from '../../src/types';

const OLD_MODULES = ['kemonoEnabled', 'backgroundEnabled', 'poseEnabled', 'facialHairEnabled', 'hairAccentEnabled', 'nameEnabled', 'glassesEnabled', 'marksEnabled', 'propEnabled', 'unlimitedEnabled', 'cosplayEnabled'];
const NEW_MODULES = (Object.keys(DEFAULT_MODULES) as Array<keyof ForgeModules>).filter((k) => !OLD_MODULES.includes(k));
const FIELD_IDS = FIELDS.map((f) => f.id);
const BASE_AXES: FieldId[] = ['age', 'presentation', 'build', 'face', 'eyeShape', 'eyeColor', 'hairLength', 'hairStyle', 'hairColor', 'expression', 'pose', 'shot', 'angle', 'outfit'];
const NEW_AXES = (['ageCue', 'hairTexture', 'fringe', 'gaze', 'headPose', 'outfitDetail', 'fabric'] as string[]).filter((f) => FIELD_IDS.includes(f as FieldId)) as FieldId[];
const SIG: FieldId[] = ['age', 'presentation', 'build', 'face', 'eyeShape', 'hairStyle', 'outfit', 'pose'];
const MODES: Mode[] = ['coherent', 'balanced', 'wild'];
const DEPTHS = [0, 5, 10, 15];
const PER = Number(process.env.METRICS_PER ?? 250);

interface Cond { id: string; modules: Partial<ForgeModules> }
const CONDS: Cond[] = [
  { id: 'default', modules: {} },
  { id: 'detailOn', modules: { glassesEnabled: true, marksEnabled: true, propEnabled: true, facialHairEnabled: true } }
];
if (NEW_MODULES.length) {
  CONDS.push({ id: 'expansionOn', modules: Object.fromEntries(NEW_MODULES.map((k) => [k, true])) });
  CONDS.push({ id: 'allOn', modules: { glassesEnabled: true, marksEnabled: true, propEnabled: true, facialHairEnabled: true, ...Object.fromEntries(NEW_MODULES.map((k) => [k, true])) } });
}

function entropy(counts: Record<string, number>): { H: number; eff: number; reached: number } {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  let H = 0;
  for (const c of Object.values(counts)) { const p = c / total; if (p > 0) H -= p * Math.log(p); }
  return { H: +H.toFixed(3), eff: +Math.exp(H).toFixed(1), reached: Object.keys(counts).length };
}

const report: Record<string, unknown> = { generatedAt: new Date().toISOString(), dataVersion: DATA_VERSION, perCell: PER, newModules: NEW_MODULES, conditions: {} };
for (const cond of CONDS) {
  const res: Record<string, unknown> = {};
  for (const mode of MODES) {
    const rng = seededRandom(`metrics|${cond.id}|${mode}`);
    const lockRows: Array<{ depth: number; draws: number; ok: number; refused: number; stuckDraws: number; stuckRate: number }> = [];
    const counts: Partial<Record<FieldId, Record<string, number>>> = {};
    const sigs = new Map<string, number>();
    const byArch = new Map<string, ForgeState[]>();
    let viewer = 0, total = 0;
    for (const depth of DEPTHS) {
      let ok = 0, refused = 0, stuck = 0;
      for (let i = 0; i < PER; i++) {
        let s = emptyState();
        s.settings.coherence = mode;
        Object.assign(s.optionalModules, cond.modules);
        s = draw(s, { seed: `m|${cond.id}|${mode}|${depth}|${i}|init` }).state;
        if (depth) {
          const cand = DRAW_ORDER.filter((f) => isActive(s, f) && fieldDef(f).randomizable !== false && s.fields[f].id);
          for (let k = 0; k < depth && cand.length; k++) s.fields[cand.splice(Math.floor(rng() * cand.length), 1)[0]].locked = true;
        }
        const r = draw(s, { seed: `m|${cond.id}|${mode}|${depth}|${i}` });
        if (!r.ok) { refused++; continue; }
        ok++;
        if (r.stuck.length) stuck++;
        if (depth === 0) {
          const st = r.state;
          for (const f of DRAW_ORDER) {
            if (!isActive(st, f) || fieldDef(f).randomizable === false) continue;
            const id = st.fields[f].id ?? '-';
            (counts[f] ??= {})[id] = (counts[f]![id] ?? 0) + 1;
          }
          const sig = SIG.map((f) => st.fields[f].id).join('|');
          sigs.set(sig, (sigs.get(sig) ?? 0) + 1);
          const a = st.fields.archetype.id!;
          if (!byArch.has(a)) byArch.set(a, []);
          byArch.get(a)!.push(st);
          total++;
          if (/\blooking at viewer\b/.test(buildPrompt(st, 'pixai').positive)) viewer++;
        }
      }
      lockRows.push({ depth, draws: PER, ok, refused, stuckDraws: stuck, stuckRate: +(stuck / Math.max(1, ok)).toFixed(4) });
    }
    const fieldEntropy = Object.fromEntries(Object.entries(counts).map(([f, c]) => [f, { ...entropy(c!), options: fieldDef(f as FieldId).options.length }]));
    // 同じ美形タイプどうしの似通い（異なる軸が3以下の組の割合）と、平均の異なる軸数
    const axesSets: Record<string, FieldId[]> = { base: BASE_AXES, ...(NEW_AXES.length ? { withNew: [...BASE_AXES, ...NEW_AXES] } : {}) };
    const sim: Record<string, { pairs: number; meanDiff: number; closeRate: number; nearRate: number }> = {};
    for (const [k, axes] of Object.entries(axesSets)) {
      let pairs = 0, diffSum = 0, close = 0, near = 0;
      for (const list of byArch.values()) {
        for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
          const d = axes.filter((f) => (isActive(list[x], f) ? list[x].fields[f].id : '-') !== (isActive(list[y], f) ? list[y].fields[f].id : '-')).length;
          pairs++; diffSum += d; if (d <= 3) close++; if (d <= 6) near++;
        }
      }
      sim[k] = { pairs, meanDiff: +(diffSum / Math.max(1, pairs)).toFixed(2), closeRate: +(close / Math.max(1, pairs)).toFixed(4), nearRate: +(near / Math.max(1, pairs)).toFixed(4) };
    }
    const collisions = [...sigs.values()].filter((c) => c > 1).reduce((a, c) => a + c - 1, 0);
    res[mode] = {
      lockDepth: lockRows,
      signature: { fields: SIG, draws: total, collisions, collisionRate: +(collisions / Math.max(1, total)).toFixed(4) },
      sameArchetype: sim,
      viewerGazeShare: +(viewer / Math.max(1, total)).toFixed(3),
      fieldEntropy
    };
    console.log(cond.id, mode, JSON.stringify(lockRows.map((r) => `${r.depth}:${r.stuckRate}/${r.refused}`)), 'viewer', (viewer / total).toFixed(3), JSON.stringify(sim));
  }
  (report.conditions as Record<string, unknown>)[cond.id] = res;
}
void optionOf;
const out = process.argv[2] ?? `docs/test-artifacts/expansion-metrics-${DATA_VERSION}.json`;
fs.writeFileSync(out, JSON.stringify(report, null, 1) + '\n');
console.log('wrote', out);
