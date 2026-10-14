/* 辞書の件数と構成を docs/DATA-CATALOG.md に書き出す（npm run report:catalog） */
import fs from 'node:fs';
import { FIELDS, DATA_VERSION } from '../src/data/fields';
import { STYLE_PRESETS } from '../src/data/presets';
const SRC: Record<string, string> = { new: '新規', caw: '外見工房', cpw: '衣装工房', pcw: 'ポーズ工房', bg: '背景工房', kemono: '獣人工房', oc: 'OCメーカー' };
const GROUP: Record<string, string> = { basic: '基本', face: '詳細：顔', role: '詳細：役割', pose: '詳細：ポーズ', scene: '詳細：背景', kemono: '任意：獣人', style: '任意：画風・名前' };
const L: string[] = [`# DATA-CATALOG — 辞書の件数と構成`, '', `辞書の版：\`${DATA_VERSION}\`。件数は \`src/data/fields.ts\` の登録から自動集計（\`npm run report:catalog\` で再生成。下限は \`tests/data.test.ts\` で検査）。`, '',
  '## 指示書の目標との対応', '', '| 分類 | 目標 | 実数 |', '|---|---:|---:|'];
const n = (id: string, excl = true) => FIELDS.find((f) => f.id === id)!.options.filter((o) => !excl || !['none', 'unspecified'].includes(o.id)).length;
const scene = n('scene'), light = n('light'), time = n('time');
L.push(`| 美形アーキタイプ | 100種以上 | ${n('archetype')} |`, `| 顔立ち・印象の候補 | 主要軸を網羅 | 顔立ち${n('face')}・目元${n('eyeShape')}・特徴${n('marks')}・眼鏡${n('glasses')}・ひげ${n('facialHair')}・肌${n('skin')}・容姿傾向${n('presentation')}・体格${n('build')} |`,
  `| 髪色 | 40色以上 | ${n('hairColor')} |`, `| 髪型 | 50種以上（長さ別制約） | ${n('hairStyle')}（長さ${n('hairLength')}段階） |`, `| 瞳色 | 30色以上 | ${n('eyeColor')} |`,
  `| 世界観・派生舞台 | 20種類以上 | ${n('world')}（＋文化モチーフ${n('culture')}） |`, `| 職業・立場 | 60種以上 | ${n('occupation')} |`, `| 男性キャラ向け衣装セット | 100種以上 | ${n('outfit')}（配色${n('mainColor')}色×差し色） |`,
  `| ポーズ・構図プリセット | 50種以上 | ポーズ${n('pose')}・画角${n('shot')}・アングル${n('angle')}・持ち物${n('prop')} |`,
  `| 背景・照明組み合わせ | 80種以上 | 背景${scene}（空間${FIELDS.find(f=>f.id==='scene')!.options.filter(o=>o.place!=='simple').length}・シンプル/抽象${FIELDS.find(f=>f.id==='scene')!.options.filter(o=>o.place==='simple').length}）× 光${light} × 時間帯・天候${time}（hard 制約で成立しない組み合わせは除外） |`,
  `| おまかせスタイル | 10〜25種 | ${STYLE_PRESETS.length} |`, '');
L.push('## 項目別', '', '| 項目 | ID | 区分 | 件数 | 大分類 | 出典（件数） |', '|---|---|---|---:|---:|---|');
let total = 0;
for (const f of FIELDS) {
  total += f.options.length;
  const by: Record<string, number> = {};
  for (const o of f.options) { const k = (o.src || 'new').split(':')[0]; by[k] = (by[k] || 0) + 1; }
  L.push(`| ${f.ja} | \`${f.id}\` | ${GROUP[f.group]}${f.module ? `（${f.module}）` : ''} | ${f.options.length} | ${f.categories?.length ?? '—'} | ${Object.entries(by).map(([k, v]) => `${SRC[k] ?? k} ${v}`).join('、')} |`);
}
L.push('', `合計 ${total} 候補（髪色・配色は複数項目で共有するため重複計上を含む）。「新規」には既存工房の語彙を参考に再構成したものを含む（詳細は SOURCE-AUDIT.md）。`, '');
L.push('## 美形アーキタイプの分類', '', '| 大分類 | 件数 | 例 |', '|---|---:|---|');
const arch = FIELDS.find((f) => f.id === 'archetype')!;
for (const c of arch.categories!) { const os = arch.options.filter((o) => o.cat === c.id); L.push(`| ${c.ja} | ${os.length} | ${os.slice(0, 4).map((o) => o.ja).join('、')}… |`); }
L.push('', '各アーキタイプは `en`（英語の美形アンカー）・`nat`（自然文）・`desc`（日本語の説明）と、顔／目元／表情／体格／容姿傾向／衣装／ポーズ／雰囲気／世界観／年齢／色などへの好み（soft）を持つ。名前が年齢を含むタイプ（「若き」「青年」「老紳士」など）は年齢層を、髪を含むタイプ（「黒髪クール」「ウルフヘア」「マッシュ系」）は髪色・髪型・髪の長さを、「眼鏡の知性派」は眼鏡ありを hard 条件にしている。', '');
L.push('## スキーマ', '', '```ts', 'interface Option {', '  id: string; ja: string; en: string[]; nat?: string; cat?: string; desc?: string; w?: number; tags?: string[]; hex?: string; src?: string;', '  worlds?: string[];           // 世界観との相性（soft）', '  lengths?: string[];          // 髪型が成立する長さ（hard）', '  minShot?: 0|1|2|3|4|5;       // ポーズに必要な最小画角（hard）', '  hands?: number;              // ポーズの空いた手 / 持ち物に必要な手（hard）', '  gazeViewer?: boolean; eyesClosed?: boolean;  // 視線（hard）', '  place?: "indoor"|"outdoor"|"semi"|"simple"; daylight?: "day"|"night"|"twilight"; outdoorOnly?: boolean; needs?: string[]; // 背景・時間・光（hard）', '  culture?: string; upper?: string; lower?: string;  // 衣装：伝統衣装の文化（hard）・{c1}{c2} の色つき描写', '  prefs?: Partial<Record<FieldId, string[]>>;        // 美形アーキタイプの好み（soft）', '  outfitPrefs?: string[];      // 職業の衣装傾向（soft）', '  requires?: string[];         // 成立条件（hard）例 "glasses:!none", "prop:#blade", "age:a18_24|a25_34"', '}', '```', '');
fs.writeFileSync('docs/DATA-CATALOG.md', L.join('\n'));
