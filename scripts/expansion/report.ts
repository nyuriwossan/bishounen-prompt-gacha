/* docs/EXPANSION-AUDIT.md を、採否台帳（ledger.ts）・機械監査（audit-machine.json）・テーマ判定（themes.ts）から生成する。
 *   npx vite-node scripts/expansion/audit.ts && npx vite-node scripts/expansion/report.ts
 * 手で書き足すと再生成で消えるので、説明を変えたいときはこのスクリプトを直す。
 */
import fs from 'node:fs';
import { DATA_VERSION, fieldDef, FIELDS, optionOf } from '../../src/data/fields';
import type { FieldId } from '../../src/types';
import { CATEGORY_TO_FIELD, loadCandidates } from './candidates';
import { LEDGER, type Decision } from './ledger';
import { evaluateThemes } from './themes';

const audit = JSON.parse(fs.readFileSync('docs/expansion/audit-machine.json', 'utf8')) as {
  input: Record<string, unknown> & { byCategory: Record<string, number>; byPhase: Record<string, number>; byPriority: Record<string, number>; byConfidence: Record<string, number> };
  summary: Record<string, number>;
  results: Array<{ id: string; exactDup: string[]; nearSameField: string[]; jaDup: string[]; idClash: string; candidateTwins: string[]; templateNat: boolean; abstract: boolean }>;
};
const byId = new Map(audit.results.map((r) => [r.id, r]));
const cands = loadCandidates();
const JA: Record<Decision, string> = { adopt: '採用', modify: '修正して採用', merge: '統合', hold: '保留', reject: '不採用' };
const ORDER: Decision[] = ['adopt', 'modify', 'merge', 'hold', 'reject'];
const esc = (s: string) => s.replace(/\|/g, '｜').replace(/\n/g, ' ');
const target = (field?: FieldId, ids?: string[]) => (field && ids ? ids.map((id) => `\`${field}:${id}\`（${optionOf(field, id)?.ja ?? '?'}）`).join('、') : '—');

const FIELDS_TOTAL = () => FIELDS.reduce((n, f) => n + f.options.length, 0);
let cache: ReturnType<typeof evaluateThemes> | null = null;
const themes = () => (cache ??= evaluateThemes());
const L: string[] = [];
const count = (d: Decision, cat?: string) => cands.filter((c) => (!cat || c.category === cat) && LEDGER[c.id]?.decision === d).length;
L.push('# EXPANSION-AUDIT — Deep Research 394候補の監査と採否', '');
L.push(`辞書の版：\`${DATA_VERSION}\`（増築前は \`2026.10.12\`）。この文書は \`scripts/expansion/report.ts\` で生成している（台帳：\`scripts/expansion/ledger.ts\`、機械監査：\`docs/expansion/audit-machine.json\`、テーマ判定：\`scripts/expansion/themes.ts\`）。`, '');
L.push('## 1. 結論', '');
L.push(`- 394件すべてを台帳に記録した：${ORDER.map((d) => `${JA[d]} ${count(d)}件`).join('・')}。`);
const baseIds = JSON.parse(fs.readFileSync('tests/fixtures/dictionary-ids-2026.10.12.json', 'utf8')).ids as Record<string, string[]>;
const adoptedKeys = new Set(Object.values(LEDGER).filter((e) => e.decision === 'adopt' || e.decision === 'modify').flatMap((e) => e.to!.map((id) => `${e.field}:${id}`)));
const mergeNew = [...new Set(Object.values(LEDGER).filter((e) => e.decision === 'merge').flatMap((e) => e.to!.map((id) => `${e.field}:${id}`)))]
  .filter((k) => !adoptedKeys.has(k) && !baseIds[k.split(':')[0]]?.includes(k.split(':')[1]));
L.push(`- 新しい候補は「採用」「修正して採用」の ${count('adopt') + count('modify')}件（候補IDは \`x_<分類>_\` を外して既存の命名に合わせた）${mergeNew.length ? `と、統合で作った ${mergeNew.length}件（${mergeNew.map((k) => `\`${k}\``).join('、')}：別分類の候補を移してまとめたもの）` : ''}。ほかの「統合」は、既存の候補や増築の別候補へまとめたもの。新しい7項目の「指定しない／ポーズに任せる」を加え、辞書は 1727件 → ${FIELDS_TOTAL()}件。`);
L.push('- 入力は再構成データ（全件 `reconstruction: true`）で、出典URLは一般的な辞書・タグ解説に留まる。採否はタグとしての描きやすさ・既存の辞書との重複・制約の矛盾・方針（成人男性1名の美形、文化を肌や顔立ちと結び付けない）で判断した。画像での確認はしていない（§6）。');
L.push(`- テーマ25件：${['現行で成立', '候補修正で成立', '新機能後に成立', '要調整', '保留'].map((s) => `${s} ${themes().filter((t) => t.status === s).length}件`).join('・')}。`, '');

L.push('## 2. 入力の確認', '');
L.push(`- 件数 ${audit.input.count}・ID重複なし（一意 ${audit.input.uniqueIds}）・CSV ${audit.input.csvRows}行とJSONの一致：${audit.input.csvMatchesJson ? '一致' : '不一致'}。既存項目向け ${audit.input.existingField}件・新項目向け ${audit.input.newField}件。`);
L.push(`- 段階：${Object.entries(audit.input.byPhase).map(([k, v]) => `Phase ${k} ${v}件`).join('・')}。優先度：${Object.entries(audit.input.byPriority).map(([k, v]) => `${k} ${v}`).join('・')}。確度：${Object.entries(audit.input.byConfidence).map(([k, v]) => `${k} ${v}`).join('・')}。`);
L.push('- 原本は `docs/expansion/source/`（gzip と SHA-256。`tests/expansion.test.ts` が件数・CSVとの一致・台帳の網羅を検査）。', '');

L.push('## 3. 機械監査の要約', '');
L.push('増築前の辞書（`tests/fixtures/dictionary-ids-2026.10.12.json`、1727件）と照合した。英語句は小文字化・記号除去・語末の s を揃えて比較している。', '');
L.push('| 観点 | 件数 | 扱い |', '|---|---:|---|');
const S = audit.summary;
L.push(`| 既存の候補と英語句が一致 | ${S.exactDuplicateOfExisting} | 原則「統合」。語が同じでも意味が違うもの（別項目の同語）は個別に判断 |`);
L.push(`| 同じ項目で語が大きく重なる（Jaccard ≥ 0.34） | ${S.nearSameField} | 差分が画像で描き分けられるかで判断 |`);
L.push(`| 日本語名が既存と一致 | ${S.japaneseNameClash} | 名前を変えるか統合 |`);
L.push(`| 候補ID（\`x_\` を除く）が既存と衝突 | ${S.idClash} | 既存IDは変えず、新しいIDを付け直すか統合 |`);
L.push(`| 候補どうしの重複 | ${S.candidateTwins} | 1つにまとめる |`);
L.push(`| 自然文がカテゴリごとの定型文 | ${S.templateNat} | 採用分はすべて自然文を書き直し（"adult" を含めない） |`);
L.push(`| 確度C（抽象語） | ${S.abstractC} | 描ける語へ言い換えるか、保留・不採用 |`, '');

L.push('## 4. 分類ごとの採否', '');
L.push('| 分類 | 反映先 | 件数 | 採用 | 修正採用 | 統合 | 保留 | 不採用 |', '|---|---|---:|---:|---:|---:|---:|---:|');
const cats = [...new Set(cands.map((c) => c.category))];
for (const c of cats) L.push(`| ${c} | \`${CATEGORY_TO_FIELD[c]}\` | ${audit.input.byCategory[c]} | ${ORDER.map((d) => count(d, c)).join(' | ')} |`);
L.push(`| 計 | | ${cands.length} | ${ORDER.map((d) => count(d)).join(' | ')} |`, '');

L.push('## 5. 保留・不採用', '');
L.push('| 候補 | 名前 | 判定 | 理由 |', '|---|---|---|---|');
for (const c of cands) { const e = LEDGER[c.id]; if (e.decision === 'hold' || e.decision === 'reject') L.push(`| \`${c.id}\` | ${esc(c.ja)} | ${JA[e.decision]} | ${esc(e.why)} |`); }
L.push('');

L.push('## 6. 未確認のこと', '');
L.push('- 画像生成（PixAI・NovelAI）での見え方は確認していない。特に、年齢の表れ（皺・白髪の強さ）、視線と頭の向きの組み合わせ、衣装の細部（小さな装身具）は、モデルによって無視・誇張されることがある。');
L.push('- 地域の世界観（韓国の都市・南アジアの大都市など）は、肌の色・顔立ちと結び付けていない（抽選上も独立）。描かれ方の偏りは画像で確かめていない。');
L.push('- 確度B・Cの候補の語は、一般的なタグ解説と既存の辞書の語に合わせて直したが、各サービスの公式タグ一覧との照合はしていない。', '');

L.push('## 7. テーマ25件の判定', '');
L.push('テーマは「素材の組み合わせ例」として扱い、台帳で候補を実際の辞書IDへ読み替えて、それらを固定して1人分を錬成できるかを判定した（`tests/expansion.test.ts` で15件以上の成立を検査）。', '');
L.push('- 「現行で成立」が0件なのは、どのテーマにも増築で足した候補が1つ以上含まれるため（増築前の辞書だけで成立するテーマはない）。');
L.push('- 読み替えは原資料の候補をそのまま辞書IDへ写したもの。テーマ08・24の美形タイプ（軌道都市の外交官）や10（アール・ヌーヴォーの神秘家）は原資料の指定で、テーマの世界観とはずれるが、判定では原資料のまま扱った。アプリでは美形タイプを固定しなければ、世界観に合うタイプが選ばれる。');
L.push('- 「要調整」は、同じ項目に2つの候補がある（単一選択）か、ポーズと持ち物の手の数・衣装に既にある部位など hard 制約で両立しないもの。どれか1つを外せば成立する。', '');
L.push('| ID | テーマ | 判定 | 読み替え | 注記 |', '|---|---|---|---|---|');
for (const t of themes()) L.push(`| ${t.theme.id} | ${esc(t.theme.title_ja)} | ${t.status} | ${t.mapped.map((m) => `${fieldDef(m.field).short ?? fieldDef(m.field).ja}:${optionOf(m.field, m.id)?.ja ?? m.id}`).join('、')} | ${esc(t.notes.join(' ／ ')) || '—'} |`);
L.push('');
L.push('### 成立したテーマの出力例（PixAI・SDXL系、既定の設定。固定していない項目は抽選）', '');
for (const t of themes().filter((x) => x.pixai).slice(0, 6)) L.push(`- **${t.theme.id} ${esc(t.theme.title_ja)}**：\`${t.pixai}\``);
L.push('');

L.push('## 8. 全候補の台帳', '');
L.push('「反映先」は採用・修正採用なら新しい候補、統合ならまとめた先。機械監査の列は、既存と英語句が一致（=）・同じ項目で語が重なる（≈）・候補どうしの重複（⇄）・定型文（定）・確度C（C）。', '');
for (const c of cats) {
  L.push(`### ${c}（${audit.input.byCategory[c]}件 → \`${CATEGORY_TO_FIELD[c]}\`）`, '');
  L.push('| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |', '|---|---|---|---|---|---|');
  for (const x of cands.filter((d) => d.category === c)) {
    const e = LEDGER[x.id], a = byId.get(x.id);
    const marks = a ? [a.exactDup.length ? `=${a.exactDup.join(',')}` : '', a.nearSameField.length ? '≈' : '', a.candidateTwins.length ? '⇄' : '', a.templateNat ? '定' : '', a.abstract ? 'C' : ''].filter(Boolean).join(' ') : '';
    L.push(`| \`${x.id}\` | ${esc(x.ja)} | ${JA[e.decision]} | ${target(e.field, e.to)} | ${esc(e.why)} | ${marks} |`);
  }
  L.push('');
}

fs.writeFileSync('docs/EXPANSION-AUDIT.md', L.join('\n'));
console.log('docs/EXPANSION-AUDIT.md', L.length, 'lines');
