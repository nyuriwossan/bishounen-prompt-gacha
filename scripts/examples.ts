/* 方向性の異なる美青年10名の完成プロンプト例を docs/EXAMPLES.md に書き出す。
 *   npm run report:examples
 * 各例は「固定した軸＋シード」で再現できる（同じ辞書の版なら同じ結果）。
 */
import fs from 'node:fs';
import { draw } from '../src/engine/draw';
import { emptyState } from '../src/engine/state';
import { buildPrompt, titleOf } from '../src/prompts/build';
import { DATA_VERSION, fieldDef, optionOf } from '../src/data/fields';
import type { FieldId, ForgeModules, Mode } from '../src/types';

interface Ex { label: string; seed: string; mode?: Mode; lock: Partial<Record<FieldId, string>>; modules?: Partial<ForgeModules> }
const EXAMPLES: Ex[] = [
  { label: '現代スーツ×吸血鬼風の妖艶な美形', seed: 'ex01', lock: { world: 'urban_night', archetype: 'vampire_count', outfit: 'three_piece', age: 'a25_34' } },
  { label: '和風ファンタジー×銀髪の神官', seed: 'ex02', lock: { world: 'wafu_fantasy', archetype: 'pure_acolyte', hairColor: 'silver', outfit: 'kariginu' } },
  { label: '近未来SF×東洋的な刺繍衣装（カオス）', seed: 'ex03', mode: 'wild', lock: { world: 'near_future', outfit: 'hanfu_noble', culture: 'china' } },
  { label: '中性的な容姿×筋肉質の大柄な男性', seed: 'ex04', lock: { presentation: 'andro', build: 'burly', archetype: 'gentle_giant' } },
  { label: '60歳以上×気品ある老紳士', seed: 'ex05', lock: { age: 'a60p', archetype: 'silver_gentleman' } },
  { label: '黒髪の騎士（ハイファンタジー）', seed: 'ex06', lock: { world: 'high_fantasy', archetype: 'steadfast_knight', hairColor: 'black' } },
  { label: '民族意匠：砂漠の王子', seed: 'ex07', lock: { world: 'desert_fantasy', archetype: 'desert_prince', culture: 'arabia' } },
  { label: '儚げな美青年（雪の精）', seed: 'ex08', lock: { archetype: 'snow_prince', presentation: 'slight_fem', build: 'delicate' } },
  { label: 'サイバーパンクの危険な男', seed: 'ex09', lock: { world: 'cyberpunk', archetype: 'cyber_runner', age: 'a25_34' } },
  { label: 'ケモミミ美青年（狐）', seed: 'ex10', lock: { world: 'wafu_fantasy', archetype: 'fox_spirit', kemonoSpecies: 'fox', kemonoLevel: 'lv1' }, modules: { kemonoEnabled: true } }
];

const out: string[] = [`# 完成プロンプト例（10名）`, '', `辞書の版 ${DATA_VERSION}。各例は表の「固定」とシードで再現できます。PixAI向けタグ（品質タグあり）・自然な英文・日本語設定を掲載。`, ''];
for (const [i, ex] of EXAMPLES.entries()) {
  let s = emptyState();
  s.settings.coherence = ex.mode ?? 'coherent';
  Object.assign(s.optionalModules, ex.modules ?? {});
  for (const [f, id] of Object.entries(ex.lock)) s.fields[f as FieldId] = { id: id!, source: 'manual', locked: true };
  const r = draw(s, { seed: ex.seed });
  if (!r.ok) throw new Error(`${ex.label}: ${JSON.stringify(r.conflicts)}`);
  s = r.state;
  const lockText = Object.entries(ex.lock).map(([f, id]) => `${fieldDef(f as FieldId).ja}=${optionOf(f as FieldId, id)?.ja}`).join('、');
  out.push(`## ${i + 1}. ${ex.label} — 「${titleOf(s)}」`, '', `- モード：${{ coherent: 'まとまり重視', balanced: 'バランス', wild: 'カオス' }[s.settings.coherence]}／seed：\`${ex.seed}\`／固定：${lockText}`, '');
  out.push('**PixAI向けタグ**', '', '```text', buildPrompt(s, 'pixai').positive, '```', '');
  out.push('**自然な英文**', '', '```text', buildPrompt(s, 'naturalEnglish').positive, '```', '');
  out.push('**日本語設定**', '', `> ${buildPrompt(s, 'japanese').japanese}`, '');
}
fs.writeFileSync('docs/EXAMPLES.md', out.join('\n'));
console.log('wrote docs/EXAMPLES.md');
