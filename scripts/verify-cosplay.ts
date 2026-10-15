/* コスプレ衣装の実機確認セット（PixAI アプリ版で画像にして確かめる代表ケース）
 *   npm run report:verify-cosplay
 * 各ケースは「固定した項目＋シード」で再現でき、共有URLでアプリに同じ状態を開ける（同じ辞書の版なら同じ結果）。
 * 出力：docs/VERIFY-COSPLAY.md（読む用）と docs/test-artifacts/verify-cosplay.json（チェックリストのページ用）
 */
import fs from 'node:fs';
import { allViolations } from '../src/advisor/hard';
import { DATA_VERSION, optionOf } from '../src/data/fields';
import { draw, valuesOf } from '../src/engine/draw';
import { emptyState } from '../src/engine/state';
import { buildPrompt } from '../src/prompts/build';
import { encodeShare } from '../src/storage/storage';
import type { FieldId, ForgeModules } from '../src/types';

const APP_URL = 'https://nyuriwossan.github.io/bishounen-prompt-gacha/';
/** どのケースでも確かめる点 */
const COMMON = ['アプリ版で弾かれない（判定も控えておく）', '男性の体つきのまま（胸のふくらみがない）・人物が1人だけ'];

interface Case { id: string; group: string; title: string; seed: string; lock: Partial<Record<FieldId, string>>; modules?: Partial<ForgeModules>; checks: string[] }
/** 衣装全体が見えるよう、正面の立ち姿・全身・目線の高さで固定する */
const full = (outfit: string): Partial<Record<FieldId, string>> => ({ outfit, shot: 'full_body', pose: 'standing_relaxed', angle: 'eye_level' });

const CASES: Case[] = [
  // ---- メイド・制服系 ----
  { id: 'c01', group: 'メイド・制服系', title: 'メイド服（ロング）', seed: 'cs01', lock: full('maid_classic'), checks: ['エプロンとヘッドドレスのあるメイド服に見える', 'スカートが長い'] },
  { id: 'c02', group: 'メイド・制服系', title: 'ミニスカメイド', seed: 'cs02', lock: full('maid_mini'), checks: ['フリルのミニスカートと白いニーハイになっている'] },
  { id: 'c03', group: 'メイド・制服系', title: 'ミニスカナース', seed: 'cs03', lock: full('nurse_mini'), checks: ['ナースキャップとナース服に見える', 'ミニスカートになっている'] },
  { id: 'c04', group: 'メイド・制服系', title: 'セーラー服', seed: 'cs04', lock: full('sailor_suit'), checks: ['セーラー襟とスカーフのある服に見える', 'プリーツスカートになっている'] },
  { id: 'c05', group: 'メイド・制服系', title: 'ミニスカポリス', seed: 'cs05', lock: full('police_mini'), checks: ['警官の制服と帽子に見える', 'ミニスカートと黒いストッキングになっている'] },
  // ---- 水着・露出多め ----
  { id: 'c06', group: '水着・露出多め', title: 'ビキニ', seed: 'cs06', lock: full('bikini'), checks: ['男性がビキニを着ている（女性の体にならない）'] },
  { id: 'c07', group: '水着・露出多め', title: '紐ビキニ', seed: 'cs07', lock: full('string_bikini'), checks: ['横を紐で結ぶビキニに見える'] },
  { id: 'c08', group: '水着・露出多め', title: '水着と開襟シャツ', seed: 'cs08', lock: full('swim_trunks'), checks: ['前を開けたシャツと海パンになっている'] },
  { id: 'c09', group: '水着・露出多め', title: 'バニーボーイ', seed: 'cs09', lock: full('bunny_boy'), checks: ['兎耳・蝶ネクタイ・カフスのバニー衣装に見える', '網タイツになっている'] },
  { id: 'c10', group: '水着・露出多め', title: '逆バニー', seed: 'cs10', lock: full('reverse_bunny'), checks: ['袖と脚だけを覆う逆バニーに見える', '下着（ブリーフ）で股間が隠れている'] },
  { id: 'c11', group: '水着・露出多め', title: 'チアリーダー', seed: 'cs11', lock: full('cheerleader'), checks: ['袖なしの短いトップスとショートパンツになっている'] },
  // ---- 季節・異国・舞台 ----
  { id: 'c12', group: '季節・異国・舞台', title: 'ミニスカチャイナ', seed: 'cs12', lock: full('china_mini'), checks: ['丈の短いチャイナ服で、スリットがある'] },
  { id: 'c13', group: '季節・異国・舞台', title: 'ミニスカサンタ', seed: 'cs13', lock: full('santa_mini'), checks: ['サンタ帽と白いファーのサンタ衣装に見える', 'ミニスカートになっている'] },
  { id: 'c14', group: '季節・異国・舞台', title: 'ハーネスと開襟シャツ', seed: 'cs14', lock: full('harness_shirt'), checks: ['胸のハーネスが服の上に描かれている'] },
  { id: 'c15', group: '季節・異国・舞台', title: 'バレエダンサー', seed: 'cs15', lock: full('ballet_dancer'), checks: ['白いタイツとバレエシューズのダンサーに見える'] },
  { id: 'c16', group: '季節・異国・舞台', title: 'サーカス団長', seed: 'cs16', lock: full('ringleader'), checks: ['燕尾服とシルクハットの団長に見える', 'ロングブーツになっている'] },
  // ---- 組み合わせ ----
  { id: 'c17', group: '組み合わせ', title: 'ミニスカメイド×女性的な美形・細身（女性化しないか）', seed: 'cs17', lock: { ...full('maid_mini'), presentation: 'fem', build: 'slim' },
    checks: ['顔は女性的でも、男性として描かれている'] },
  { id: 'c18', group: '組み合わせ', title: 'ビキニ×筋肉質の成熟した美形', seed: 'cs18', lock: { ...full('bikini'), build: 'muscular', age: 'a35_44' },
    checks: ['筋肉質の体にビキニが描けている'] },
  { id: 'c19', group: '組み合わせ', title: 'メイド服（ロング）×禁断：リボンで両手首を前', seed: 'cs19', modules: { unlimitedEnabled: true },
    lock: { outfit: 'maid_classic', shot: 'cowboy_shot', role: 'captive', restraint: 'ribbon', bindPos: 'wrists_front', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['リボンが手首を結んでいる（エプロンのリボンと混ざっていない）'] },
  { id: 'c20', group: '組み合わせ', title: 'ミニスカポリス×禁断：手錠を手にした支配者', seed: 'cs20', modules: { unlimitedEnabled: true },
    lock: { outfit: 'police_mini', shot: 'cowboy_shot', role: 'ruler', restraint: 'cuffs', bindPos: 'held', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['手錠を手に持っている（自分には掛かっていない）'] }
];

interface Row { id: string; group: string; title: string; seed: string; url: string; pixai: string; negative: string; settingsJa: string; checks: string[] }
const rows: Row[] = [];
for (const c of CASES) {
  let s = emptyState();
  s.settings.coherence = 'coherent';
  s.settings.negative = true;
  Object.assign(s.optionalModules, { cosplayEnabled: true }, c.modules ?? {});
  for (const [f, id] of Object.entries(c.lock) as Array<[FieldId, string]>) {
    if (!optionOf(f, id)) throw new Error(`${c.id}: ${f}=${id} は辞書にありません`);
    s.fields[f] = { id, source: 'manual', locked: true };
  }
  const r = draw(s, { seed: c.seed });
  if (!r.ok) throw new Error(`${c.id}: ${r.notices.join(' ')} ${JSON.stringify(r.conflicts)}`);
  s = r.state;
  const viol = allViolations(valuesOf(s));
  if (viol.length) throw new Error(`${c.id}: ${viol.map((v) => v.reasonJa).join(' / ')}`);
  const pix = buildPrompt(s, 'pixai');
  const ja = buildPrompt(s, 'japanese').japaneseLines;
  const pick = ['美形タイプ', '容姿傾向', '体格', '年齢層', '立場', '拘束', '衣装', 'ポーズ', '構図', '背景'];
  rows.push({
    id: c.id, group: c.group, title: c.title, seed: c.seed,
    url: `${APP_URL}#s=${encodeShare(s)}`,
    pixai: pix.positive, negative: pix.negative,
    settingsJa: ja.filter(([k]) => pick.includes(k)).map(([k, v]) => `${k}：${v}`).join('／'),
    checks: [...COMMON, ...c.checks]
  });
}

fs.mkdirSync('docs/test-artifacts', { recursive: true });
fs.writeFileSync('docs/test-artifacts/verify-cosplay.json', JSON.stringify({ dataVersion: DATA_VERSION, cases: rows }, null, 2) + '\n');
const md: string[] = ['# コスプレ衣装 実機確認セット', '', `辞書の版 ${DATA_VERSION}。各ケースの共有URLを開くと、アプリに同じ状態が再現されます（コスプレON・ネガティブON）。PixAI 向けタグと、画像で確かめる点を載せています。`, ''];
let group = '';
for (const r of rows) {
  if (r.group !== group) { md.push(`## ${r.group}`, ''); group = r.group; }
  md.push(`### ${r.id}. ${r.title}`, '', `- 設定：${r.settingsJa}`, `- 共有URL：${r.url}`, '- 確かめる点：', ...r.checks.map((x) => `  - [ ] ${x}`), '', '```text', r.pixai, '```', '', 'ネガティブ：', '', '```text', r.negative, '```', '');
}
fs.writeFileSync('docs/VERIFY-COSPLAY.md', md.join('\n'));
console.log(`docs/VERIFY-COSPLAY.md と verify-cosplay.json に ${rows.length} 件を書き出しました。`);
