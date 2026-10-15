/* 禁断の調合の実機確認セット（PixAI などで画像にして確かめる代表ケース）
 *   npm run report:verify
 * 各ケースは「固定した項目＋シード」で再現でき、共有URLでアプリに同じ状態を開ける（同じ辞書の版なら同じ結果）。
 * 出力：docs/VERIFY-SET.md（読む用）と docs/test-artifacts/verify-set.json（チェックリストのページ用）
 */
import fs from 'node:fs';
import { allViolations } from '../src/advisor/hard';
import { DATA_VERSION, optionOf } from '../src/data/fields';
import { draw, valuesOf } from '../src/engine/draw';
import { emptyState } from '../src/engine/state';
import { buildPrompt, titleOf } from '../src/prompts/build';
import { encodeShare } from '../src/storage/storage';
import type { FieldId, Mode } from '../src/types';

const APP_URL = 'https://nyuriwossan.github.io/bishounen-prompt-gacha/';

interface Case { id: string; group: string; title: string; seed: string; mode?: Mode; lock: Partial<Record<FieldId, string>>; checks: string[] }
const CASES: Case[] = [
  // ---- 拘束の基本 ----
  { id: 'v01', group: '拘束の基本', title: '両手首を前で縄（基本形）', seed: 'vs01', lock: { role: 'captive', restraint: 'rope', bindPos: 'wrists_front', tightness: 'secured', pose: 'bound_front_stand', shot: 'cowboy_shot', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['縄が手首だけに巻かれ、腕や首に回っていない', '縛られた両手・指が崩れていない', '縄以外の拘束具（鎖など）が混ざっていない'] },
  { id: 'v02', group: '拘束の基本', title: '後ろ手に鎖、壁へ固定・肩越しに振り返る', seed: 'vs02', lock: { role: 'defiant', restraint: 'chain', bindPos: 'wrists_behind', anchor: 'wall', pose: 'bound_behind_lookback', shot: 'cowboy_shot', scene: 'dungeon_cell', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['鎖が壁の金具までつながって見える', '後ろ手の手首と指が見えている（省略されていない）', '肩や腕の向きが不自然でない'] },
  { id: 'v03', group: '拘束の基本', title: '頭上で吊る鎖（地下牢）', seed: 'vs03', lock: { role: 'prisoner', restraint: 'chain', bindPos: 'wrists_overhead', anchor: 'overhead', pose: 'bound_overhead_stand', shot: 'full_body', scene: 'dungeon_cell', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['両足が床に着いている（宙吊りになっていない）', '鎖が頭上の固定具につながっている', '屋内（牢）の背景になっている'] },
  { id: 'v04', group: '拘束の基本', title: '椅子の肘掛けに革ベルトで固定', seed: 'vs04', lock: { role: 'captive', restraint: 'straps', bindPos: 'armrests', anchor: 'chair', pose: 'bound_chair', shot: 'cowboy_shot', scene: 'interrogation_room', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['左右の手首がそれぞれ肘掛けに固定されている', '椅子と両手がどちらも画面に入っている'] },
  // ---- 膝立ち・うつ伏せ ----
  { id: 'v05', group: '膝立ち・うつ伏せ', title: '後ろ手に縛られて膝立ち', seed: 'vs05', lock: { role: 'captive', restraint: 'rope', bindPos: 'wrists_behind', pose: 'kneel_behind', shot: 'knee_up', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['上体を起こした膝立ちになっている', '後ろ手の縄と手が見える'] },
  { id: 'v06', group: '膝立ち・うつ伏せ', title: '頭上で吊られて膝立ち', seed: 'vs06', lock: { role: 'resigned', restraint: 'chain', bindPos: 'wrists_overhead', anchor: 'overhead', pose: 'kneel_overhead', shot: 'full_body', scene: 'dungeon_cell', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['両膝が床に着いている', '腕が頭上に上がり、鎖が固定具へつながっている'] },
  { id: 'v07', group: '膝立ち・うつ伏せ', title: '後ろ手に縛られてうつ伏せ', seed: 'vs07', lock: { role: 'captive', restraint: 'rope', bindPos: 'wrists_behind', pose: 'prone_behind', shot: 'full_body', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['うつ伏せ（腹ばい）になっている。仰向けになっていない', '縛った腕で体を支えていない', '顔がこちらへ向いている'] },
  { id: 'v08', group: '膝立ち・うつ伏せ', title: '足首を縛られ、うつ伏せで肘をつく', seed: 'vs08', lock: { role: 'captive', restraint: 'rope', bindPos: 'ankles', pose: 'prone_ankles', shot: 'full_body', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['足首だけが縛られ、手は自由', '肘で上体を起こしている'] },
  // ---- 目隠し ----
  { id: 'v09', group: '目隠し', title: 'レースの目隠し×竜の瞳の美形（目が透けないか）', seed: 'vs09', lock: { role: 'captive', restraint: 'ribbon', bindPos: 'wrists_front', blindfold: 'lace', archetype: 'dragon_blood', eyeShape: 'slit_pupils', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['レース越しに目（縦長の瞳孔・光る目）が描かれていない', 'レースの目隠しに見える', '「こちらを見る」視線になっていない'] },
  { id: 'v10', group: '目隠し', title: '布の目隠し＋目元が特徴の美形タイプ', seed: 'vs10', lock: { role: 'prisoner', restraint: 'silk_cord', bindPos: 'wrists_behind', blindfold: 'cloth', eyeShape: 'piercing', eyeColor: 'gold', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['目隠しを貫通して目が描かれていない', '金色の瞳が出ていない（出力から外している）'] },
  { id: 'v11', group: '目隠し', title: 'フードを目深に被る', seed: 'vs11', lock: { role: 'captive', restraint: 'bandage', bindPos: 'wrists_front', blindfold: 'hood_low', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['フードで目元が隠れている', '頭飾り（冠など）と重なっていない'] },
  // ---- 拘束具の素材 ----
  { id: 'v12', group: '拘束具の素材', title: '触手（触手の巣）', seed: 'vs12', lock: { role: 'captive', restraint: 'tentacles', bindPos: 'wrists_overhead', world: 'dark_fantasy', scene: 'tentacle_lair', pose: 'bound_overhead_stand', shot: 'full_body', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['触手が手首に巻き付いている', '縄や鎖が混ざっていない', '露出や性的な描写に寄りすぎていない'] },
  { id: 'v13', group: '拘束具の素材', title: '光の鎖（魔法陣の祭壇）', seed: 'vs13', lock: { role: 'captive', restraint: 'light_chains', bindPos: 'torso_arms', world: 'high_fantasy', scene: 'ritual_altar', pose: 'chain_torso_stand', shot: 'cowboy_shot', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['光る鎖に見える（普通の鎖になっていない）', '腕と胴体に巻かれ、首には回っていない'] },
  { id: 'v14', group: '拘束具の素材', title: 'ラッピングのリボン（巨大な鳥籠）', seed: 'vs14', lock: { role: 'captive', restraint: 'ribbon', bindPos: 'wrists_front', tightness: 'decorative', scene: 'giant_birdcage', blindfold: 'ribbon', world: 'european_court', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['手首のリボンが蝶結びの「贈り物」らしく見える', '目隠しのリボンと手首のリボンが別々に描けている'] },
  { id: 'v15', group: '拘束具の素材', title: '蔓草（触手との違い）', seed: 'vs15', lock: { role: 'captive', restraint: 'vines', bindPos: 'wrists_behind', world: 'mythic', scene: 'deep_forest', pose: 'kneel_head_down', shot: 'cowboy_shot', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['植物の蔓に見える（触手と区別できる）', '項垂れた膝立ちになっている'] },
  // ---- 着崩し・衣装の状態 ----
  { id: 'v16', group: '着崩し・衣装の状態', title: '腕を上げて服がずり上がる（腹ちらり）', seed: 'vs16', lock: { role: 'captive', restraint: 'rope', bindPos: 'wrists_overhead', pose: 'bound_overhead_stand', disarray: 'riding_up', outfit: 'oversized_tee_wide', shot: 'cowboy_shot', scene: 'abandoned_factory', blindfold: 'none', wear1: 'none', wear2: 'none' },
    checks: ['腹がちらりと見える程度（それ以上の露出になっていない）', '服がずり上がって見える'] },
  { id: 'v17', group: '着崩し・衣装の状態', title: '裾から腹がちらり（腕は下ろしたまま）', seed: 'vs17', lock: { role: 'defiant', restraint: 'cuffs', bindPos: 'wrists_front', disarray: 'midriff_peek', outfit: 'zip_hoodie_tee', scene: 'prison_cell', blindfold: 'none', wear1: 'none', wear2: 'none' },
    checks: ['裾から腹がちらりと見える程度', '露出がそれ以上広がっていない'] },
  { id: 'v18', group: '着崩し・衣装の状態', title: 'ずぶ濡れ＋ほつれ（透けないか）', seed: 'vs18', lock: { role: 'captive', restraint: 'rope', bindPos: 'wrists_front', wear1: 'drenched', wear2: 'frayed', outfit: 'camp_collar_shirt', time: 'rainy_night', blindfold: 'none', disarray: 'none' },
    checks: ['濡れていても服が透けていない', 'ほつれが表現されている（大きな破れになっていない）'] },
  // ---- する側 ----
  { id: 'v19', group: 'する側', title: '手錠を手にした支配者', seed: 'vs19', lock: { role: 'ruler', restraint: 'cuffs', bindPos: 'held', expression: 'smug', scene: 'interrogation_room', world: 'noir', outfit: 'three_piece', pose: 'three_quarter', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['手錠を手に持っている（自分には掛かっていない）', '人物が1人だけ（相手が描かれていない）'] },
  { id: 'v20', group: 'する側', title: '影の触手を操る', seed: 'vs20', lock: { role: 'ruler', restraint: 'shadow_tentacles', bindPos: 'held', world: 'dark_fantasy', expression: 'cold_glare', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none' },
    checks: ['影の触手を操っているように見える（本人には巻き付いていない）', '人物が1人だけ'] }
];

interface Row { id: string; group: string; title: string; seed: string; url: string; pixai: string; negative: string; settingsJa: string; checks: string[] }
const rows: Row[] = [];
for (const c of CASES) {
  let s = emptyState();
  s.settings.coherence = c.mode ?? 'coherent';
  s.settings.negative = true;
  s.optionalModules.unlimitedEnabled = true;
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
  const pick = ['美形タイプ', '立場', '拘束', '目隠し・視界', '衣装の乱れ', '衣装の状態', '衣装', 'ポーズ', '構図', '背景'];
  rows.push({
    id: c.id, group: c.group, title: c.title, seed: c.seed,
    url: `${APP_URL}#s=${encodeShare(s)}`,
    pixai: pix.positive, negative: pix.negative,
    settingsJa: ja.filter(([k]) => pick.includes(k)).map(([k, v]) => `${k}：${v}`).join('／'),
    checks: c.checks
  });
  void titleOf;
}

fs.mkdirSync('docs/test-artifacts', { recursive: true });
fs.writeFileSync('docs/test-artifacts/verify-set.json', JSON.stringify({ dataVersion: DATA_VERSION, cases: rows }, null, 2) + '\n');
const md: string[] = ['# 禁断の調合 実機確認セット', '', `辞書の版 ${DATA_VERSION}。各ケースの共有URLを開くと、アプリに同じ状態が再現されます（ネガティブはON）。PixAI 向けタグと、画像で確かめる点を載せています。`, ''];
let group = '';
for (const r of rows) {
  if (r.group !== group) { md.push(`## ${r.group}`, ''); group = r.group; }
  md.push(`### ${r.id}. ${r.title}`, '', `- 設定：${r.settingsJa}`, `- 共有URL：${r.url}`, '- 確かめる点：', ...r.checks.map((x) => `  - [ ] ${x}`), '', '```text', r.pixai, '```', '', 'ネガティブ：', '', '```text', r.negative, '```', '');
}
fs.writeFileSync('docs/VERIFY-SET.md', md.join('\n'));
console.log(`docs/VERIFY-SET.md と verify-set.json に ${rows.length} 件を書き出しました。`);
