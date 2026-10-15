/* 整合性アドバイザー：hard / soft / suggestion の3段階で現在の状態を説明する。
 * soft と suggestion は「珍しい＝誤り」とは扱わず、意図的な組み合わせとして残せる。
 */
import { optionOf } from '../data/fields';
import { valuesOf } from '../engine/draw';
import { worldMatch } from '../engine/match';
import type { ForgeState, Issue } from '../types';
import { allViolations } from './hard';

export function advise(state: ForgeState): Issue[] {
  const v = valuesOf(state);
  const out: Issue[] = [];
  for (const x of allViolations(v)) {
    out.push({ id: `hard:${x.rule}:${x.fields.join('-')}`, level: 'hard', fields: x.fields, titleJa: '矛盾しています', messageJa: x.reasonJa });
  }
  const world = v.world;
  const modes = state.settings.coherence;
  // soft：世界観と衣装・背景のずれ（カオスでは説明だけ）
  if (world && world.id !== 'world_mix') {
    if (v.outfit && worldMatch(v.outfit, world) === 'mismatch') {
      out.push({ id: 'soft:outfit_world', level: modes === 'wild' ? 'suggestion' : 'soft', fields: ['outfit', 'world'], titleJa: '世界観と衣装が離れています', messageJa: `「${world.ja}」に「${v.outfit.ja}」。意図的なミックスなら、そのままで構いません。` });
    }
    if (state.optionalModules.backgroundEnabled && v.scene && worldMatch(v.scene, world) === 'mismatch') {
      out.push({ id: 'soft:scene_world', level: modes === 'wild' ? 'suggestion' : 'soft', fields: ['scene', 'world'], titleJa: '世界観と背景が離れています', messageJa: `「${world.ja}」の人物が「${v.scene.ja}」にいます。` });
    }
  }
  if (v.archetype?.prefs?.world && world && !v.archetype.prefs.world.some((w) => w === world.id || world.tags?.includes(w))) {
    out.push({ id: 'suggest:arch_world', level: 'suggestion', fields: ['archetype', 'world'], titleJa: '意外な舞台です', messageJa: `「${v.archetype.ja}」が「${world.ja}」に。新しい解釈として楽しめます。` });
  }
  // suggestion：画角外の要素
  const shot = v.shot?.level ?? 5;
  if (shot <= 1 && v.outfit?.lower) {
    out.push({ id: 'suggest:shot_lower', level: 'suggestion', fields: ['shot', 'outfit'], titleJa: '下半身の衣装は省略して出力します', messageJa: '寄りの構図なので、ズボンや靴の指定は出力から外しています（設定は保持）。' });
  }
  if (state.optionalModules.backgroundEnabled && v.scene?.place === 'simple' && v.time) {
    out.push({ id: 'suggest:simple_time', level: 'suggestion', fields: ['scene', 'time'], titleJa: 'シンプル背景では時間帯を出力しません', messageJa: '時間帯・天候の設定は保持しています。' });
  }
  // 禁断の調合（pose-composition-workshop の拘束アドバイスを要約）
  if (state.optionalModules.unlimitedEnabled) {
    const b = v.bindPos, bound = !!b && !['none', 'held'].includes(b.id);
    if (bound && v.restraint?.tags?.includes('chain') && v.anchor?.id === 'none') {
      out.push({ id: 'suggest:chain_anchor', level: 'suggestion', fields: ['restraint', 'anchor'], titleJa: '鎖は固定先が見えると安定します', messageJa: '固定先なしの鎖は、装飾的な鎖として崩れやすい傾向があります。壁・柱などの固定先を選ぶと描写が安定しやすくなります。' });
    }
    if (b?.id === 'wrists_behind' && (v.shot?.level ?? 5) <= 2) {
      out.push({ id: 'suggest:behind_shot', level: 'suggestion', fields: ['bindPos', 'shot'], titleJa: '後ろ手は手元が省略されやすい構図です', messageJa: '腰上〜全身で、腰の後ろの手首と指を見せる構図が安定します。' });
    }
    if (v.blindfold?.tags?.includes('covered')) {
      out.push({ id: 'suggest:blind_eyes', level: 'suggestion', fields: ['blindfold', 'eyeShape', 'eyeColor'], titleJa: '目元・瞳の色は出力していません', messageJa: '目隠しで目が隠れるため、目元・瞳の色・「こちらを見る」を出力から外しています（設定は保持）。' });
    }
  }
  const pres = optionOf('presentation', state.fields.presentation.id);
  if (pres && ['fem', 'slight_fem'].includes(pres.id)) {
    out.push({ id: 'suggest:fem_keep_male', level: 'suggestion', fields: ['presentation'], titleJa: '女性的な美形でも男性として出力します', messageJa: '人物の性別タグは男性のまま。うまく出ない場合は「male focus」の強調や、LoRAの併用を検討してください。' });
  }
  if (v.hairStyle?.tags?.includes('eastern') && world && !world.tags?.some((t) => ['japan', 'china', 'eastern', 'fantasy', 'mix'].includes(t))) {
    out.push({ id: 'suggest:eastern_hair', level: 'suggestion', fields: ['hairStyle', 'world'], titleJa: '東洋風の髪型です', messageJa: `「${v.hairStyle.ja}」は「${world.ja}」では珍しい組み合わせです。` });
  }
  return out;
}
