/* テーマ25件の成立判定（台帳で候補を実際の辞書IDへ読み替え、固定して1人分を錬成できるか）。
 * テーマは「素材の組み合わせ例」であり、確実に同時選択できるプリセットではない（依頼書 §5 Phase 2）。
 *   現行で成立       … 読み替えた候補がすべて増築前からあり、そのまま固定して錬成できる
 *   候補修正で成立   … 増築・統合した既存項目の候補だけで、固定して錬成できる
 *   新機能後に成立   … 新しい任意項目（年齢の表れ・視線など）を使って、固定して錬成できる
 *   要調整           … 同じ項目に2つの候補がある・固定どうしが hard 制約で両立しないなど、一部を外せば成立
 *   保留             … 保留・不採用の候補を含み、読み替え先がない
 */
import fs from 'node:fs';
import { fieldDef, optionOf } from '../../src/data/fields';
import { draw } from '../../src/engine/draw';
import { emptyState, moduleKey } from '../../src/engine/state';
import { buildPrompt } from '../../src/prompts/build';
import type { FieldId, ForgeState } from '../../src/types';
import { loadThemes, type Theme } from './candidates';
import { LEDGER } from './ledger';

export type ThemeStatus = '現行で成立' | '候補修正で成立' | '新機能後に成立' | '要調整' | '保留';
export interface ThemeResult {
  theme: Theme; status: ThemeStatus; mapped: Array<{ cand: string; field: FieldId; id: string; decision: string }>; notes: string[];
  state?: ForgeState; pixai?: string; natural?: string;
}

const base = JSON.parse(fs.readFileSync('tests/fixtures/dictionary-ids-2026.10.12.json', 'utf8')) as { ids: Record<string, string[]> };
const NEW_FIELDS: FieldId[] = ['ageCue', 'hairTexture', 'fringe', 'gaze', 'headPose', 'outfitDetail', 'fabric'];

export function evaluateTheme(t: Theme, seed = t.id): ThemeResult {
  const notes: string[] = [];
  const mapped: ThemeResult['mapped'] = [];
  let unresolved = false;
  for (const cand of t.selected_option_ids) {
    const e = LEDGER[cand];
    if (!e) { notes.push(`${cand}：台帳にない`); unresolved = true; continue; }
    if (e.decision === 'hold' || e.decision === 'reject') { notes.push(`${cand}：${e.decision === 'hold' ? '保留' : '不採用'}（${e.why}）`); unresolved = true; continue; }
    mapped.push({ cand, field: e.field!, id: e.to![0], decision: e.decision });
  }
  if (unresolved) return { theme: t, status: '保留', mapped, notes };
  // 同じ項目に2つ以上 → 先のものを使い、要調整として記録
  const byField = new Map<FieldId, string>();
  let adjust = false;
  for (const m of mapped) {
    const prev = byField.get(m.field);
    if (prev && prev !== m.id) { notes.push(`「${fieldDef(m.field).ja}」に2つ（${optionOf(m.field, prev)?.ja}／${optionOf(m.field, m.id)?.ja}）。単一選択のため先の1つで判定`); adjust = true; continue; }
    byField.set(m.field, m.id);
  }
  let s = emptyState();
  for (const [f, id] of byField) {
    const mod = fieldDef(f).module;
    if (mod) s.optionalModules[moduleKey(mod)] = true;
    s.fields[f] = { id, source: 'manual', locked: true };
  }
  const r = draw(s, { seed });
  if (!r.ok) {
    for (const c of r.conflicts) notes.push(`両立しない：${c.reasonJa}`);
    for (const n of r.notices) notes.push(n);
    return { theme: t, status: '要調整', mapped, notes };
  }
  s = r.state;
  const usesNew = [...byField.keys()].some((f) => NEW_FIELDS.includes(f));
  const allOld = [...byField.entries()].every(([f, id]) => base.ids[f]?.includes(id));
  const status: ThemeStatus = adjust ? '要調整' : usesNew ? '新機能後に成立' : allOld ? '現行で成立' : '候補修正で成立';
  return { theme: t, status, mapped, notes, state: s, pixai: buildPrompt(s, 'pixai').positive, natural: buildPrompt(s, 'naturalEnglish').positive };
}

export function evaluateThemes(): ThemeResult[] {
  return loadThemes().map((t) => evaluateTheme(t));
}
