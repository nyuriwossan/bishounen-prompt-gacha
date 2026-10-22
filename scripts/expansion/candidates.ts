/* 増築の入力資料（394候補・テーマ25件）を読む小さな関数。監査スクリプトとテストで共有する。 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export interface Candidate {
  id: string; category: string; category_ja: string; ja: string; description: string; en: string[]; nat: string;
  compatibility: { requires: string[]; hard_conflicts: string[]; soft_cautions: string[]; tags: string[] };
  delta_from_existing: string; confidence: 'A' | 'B' | 'C'; priority: 'high' | 'medium' | 'low'; phase: 1 | 2 | 3;
  existing_field: boolean; reconstruction: boolean; source: string; source_urls: string[];
}
export interface Theme {
  id: string; title_ja: string; age_band: string; existing_system_feasibility: string;
  selected_option_ids: string[]; new_field_option_ids: string[]; existing_field_option_ids: string[];
  example_pixai_sdxl_tag_prompt: string; example_natural_english_prompt: string; compatibility_note: string; usage_note: string;
}

const SRC = path.resolve('docs/expansion/source');
export function loadCandidates(): Candidate[] {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(SRC, 'expansion_candidates.json.gz'))).toString('utf8')) as Candidate[];
}
export function loadCandidateCsv(): Array<Record<string, string>> {
  const text = zlib.gunzipSync(fs.readFileSync(path.join(SRC, 'expansion_candidates.csv.gz'))).toString('utf8').replace(/^\uFEFF/, '');
  return parseCsv(text);
}
export function loadThemes(): Theme[] {
  return JSON.parse(fs.readFileSync(path.join(SRC, 'theme_sets.json'), 'utf8')) as Theme[];
}

/** RFC 4180 程度のCSV（引用符・改行を含むセル）を読む */
export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

/** 英語句の正規化（大文字小文字・記号・空白・語末の s の揺れをそろえる） */
export function normEn(s: string): string {
  return s.toLowerCase().normalize('NFKC').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').map((w) => (w.length > 3 ? w.replace(/(es|s)$/, '') : w)).join(' ');
}
/** 添付資料の category と、現行の FieldId の対応 */
export const CATEGORY_TO_FIELD: Record<string, string> = {
  archetype: 'archetype', face: 'face', eyeShape: 'eyeShape', feature: 'marks', beard: 'facialHair', build: 'build', hairStyle: 'hairStyle',
  expression: 'expression', vibe: 'aura', world: 'world', occupation: 'occupation', outfit: 'outfit', pose: 'pose', prop: 'prop', scene: 'scene',
  weather: 'time', lighting: 'light', ageCue: 'ageCue', hairTexture: 'hairTexture', fringe: 'fringe', gaze: 'gaze', headPose: 'headPose',
  outfitDetail: 'outfitDetail', fabric: 'fabric'
};
