/* 394候補の機械監査（増築前の辞書と照合）
 *   npx vite-node scripts/expansion/audit.ts
 * 入力：docs/expansion/source/expansion_candidates.{json,csv}.gz、増築前の全候補ID（tests/fixtures/dictionary-ids-2026.10.12.json）
 * 出力：docs/expansion/audit-machine.json
 * 調べること：件数・ID一意・カテゴリ/段階/優先度の配分・CSVとJSONの一致、
 *   既存辞書との英語句の正規化一致（全項目）・同じ項目内の語の重なり（Jaccard）・日本語名の一致・ID衝突、
 *   候補どうしの重複、定型文のままの自然文、抽象語（確度C）。
 * 採否そのものは scripts/expansion/ledger.ts（人の判断）に書き、この結果はその根拠の一部として EXPANSION-AUDIT.md に載せる。
 */
import fs from 'node:fs';
import { fieldDef, FIELDS } from '../../src/data/fields';
import type { FieldId, Option } from '../../src/types';
import { CATEGORY_TO_FIELD, loadCandidateCsv, loadCandidates, normEn } from './candidates';

const base = JSON.parse(fs.readFileSync('tests/fixtures/dictionary-ids-2026.10.12.json', 'utf8')) as { ids: Record<string, string[]> };
const isBase = (f: string, id: string) => !!base.ids[f]?.includes(id);
/** 増築前から存在した候補（照合の相手） */
const existing: Array<{ field: FieldId; o: Option }> = FIELDS.flatMap((f) => f.options.filter((o) => isBase(f.id, o.id)).map((o) => ({ field: f.id, o })));
const phrases = (o: Option): string[] => [...o.en, ...(o.upper ? o.upper.split(/\s*,\s*/) : []), ...(o.lower ? o.lower.split(/\s*,\s*/) : [])]
  .map((x) => normEn(x.replace(/\{c[12]\}/g, ''))).filter(Boolean);
const tokens = (xs: string[]) => new Set(xs.join(' ').split(' ').filter((w) => w.length > 2 && !['and', 'with', 'the', 'his', 'hair', 'holding'].includes(w)));
const jaccard = (a: Set<string>, b: Set<string>) => { const i = [...a].filter((x) => b.has(x)).length; return i / Math.max(1, a.size + b.size - i); };

const cands = loadCandidates();
const csv = loadCandidateCsv();
const ids = cands.map((c) => c.id);
const count = <T extends string | number>(xs: T[]) => xs.reduce<Record<string, number>>((m, x) => { m[String(x)] = (m[String(x)] ?? 0) + 1; return m; }, {});

// CSV と JSON の一致
const csvById = new Map(csv.map((r) => [r.id, r]));
const csvDiffs: string[] = [];
for (const c of cands) {
  const r = csvById.get(c.id);
  if (!r) { csvDiffs.push(`${c.id}: CSVに無い`); continue; }
  const pairs: Array<[string, string, string]> = [['category', c.category, r.category], ['ja', c.ja, r.ja], ['en', c.en.join('; '), r.en], ['nat', c.nat, r.nat], ['phase', String(c.phase), r.phase], ['priority', c.priority, r.priority], ['confidence', c.confidence, r.confidence]];
  for (const [k, a, b] of pairs) if (a.trim() !== (b ?? '').trim()) csvDiffs.push(`${c.id}.${k}: JSON「${a}」/ CSV「${b}」`);
}
for (const r of csv) if (!ids.includes(r.id)) csvDiffs.push(`${r.id}: JSONに無い`);

// 定型文：書き出しの5語が、ほかの5件以上の候補と同じ自然文（カテゴリごとに同じ型へ語を差し込んだもの）
const head5 = (t: string) => t.split(/\s+/).slice(0, 5).join(' ');
const headCount = count(cands.map((c) => head5(c.nat)));
const isTemplateNat = (t: string) => (headCount[head5(t)] ?? 0) >= 6;
const results = cands.map((c) => {
  const field = CATEGORY_TO_FIELD[c.category] as FieldId;
  const cp = c.en.map(normEn);
  const ct = tokens(cp);
  const exact = existing.filter((x) => phrases(x.o).some((p) => cp.includes(p))).map((x) => `${x.field}:${x.o.id}`);
  const sameFieldOpts = existing.filter((x) => x.field === field);
  const near = sameFieldOpts.map((x) => ({ k: `${x.field}:${x.o.id}`, j: jaccard(ct, tokens(phrases(x.o))) })).filter((x) => x.j >= 0.34).sort((a, b) => b.j - a.j).slice(0, 3).map((x) => `${x.k}(${x.j.toFixed(2)})`);
  const jaDup = existing.filter((x) => x.o.ja === c.ja).map((x) => `${x.field}:${x.o.id}`);
  const shortId = c.id.replace(new RegExp(`^x_${c.category}_`), '');
  const idClash = FIELDS.some((f) => f.id === field) && isBase(field, shortId) ? `${field}:${shortId}` : '';
  const twins = cands.filter((d) => d.id !== c.id && (d.ja === c.ja || d.en.map(normEn).some((p) => cp.includes(p)))).map((d) => d.id);
  return {
    id: c.id, category: c.category, field, fieldExists: FIELDS.some((f) => f.id === field) && isBase(field, fieldDef(field).options[0]?.id ?? ''),
    ja: c.ja, en: c.en, exactDup: exact, nearSameField: near, jaDup, idClash, candidateTwins: twins,
    templateNat: isTemplateNat(c.nat), natHead: head5(c.nat), abstract: c.confidence === 'C', phase: c.phase, priority: c.priority, confidence: c.confidence
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  input: { count: cands.length, uniqueIds: new Set(ids).size, csvRows: csv.length, csvMatchesJson: csvDiffs.length === 0, csvDiffs: csvDiffs.slice(0, 50),
    byCategory: count(cands.map((c) => c.category)), byPhase: count(cands.map((c) => c.phase)), byPriority: count(cands.map((c) => c.priority)), byConfidence: count(cands.map((c) => c.confidence)),
    existingField: cands.filter((c) => c.existing_field).length, newField: cands.filter((c) => !c.existing_field).length, allReconstruction: cands.every((c) => c.reconstruction) },
  summary: {
    exactDuplicateOfExisting: results.filter((r) => r.exactDup.length).length,
    nearSameField: results.filter((r) => r.nearSameField.length).length,
    japaneseNameClash: results.filter((r) => r.jaDup.length).length,
    idClash: results.filter((r) => r.idClash).length,
    candidateTwins: results.filter((r) => r.candidateTwins.length).length,
    templateNat: results.filter((r) => r.templateNat).length,
    abstractC: results.filter((r) => r.abstract).length
  },
  results
};
fs.mkdirSync('docs/expansion', { recursive: true });
fs.writeFileSync('docs/expansion/audit-machine.json', JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({ input: { ...report.input, csvDiffs: report.input.csvDiffs.length }, summary: report.summary }, null, 1));
