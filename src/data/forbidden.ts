/* 禁断の調合（アンリミテッドモード）：拘束・目隠し・着崩し・衣装の傷み。
 * 既定OFF。OFFの間はすべて「なし」として扱い、抽選にも出力にも一切混ぜない（state.ts の OFF_AS_NONE）。
 * 参考：pose-composition-workshop の拘束（restraint.js / generator.js：拘束位置・固定先・締め方と、
 *       手や鎖を見せる安定化の句、首への拘束をしない・非流血の方針）、
 *       outfit-prompt-workshop の状態・加工（conditions.js）と着こなし（styling.js：requiresFeature）。
 * 方針：
 *  - 成人男性1名のまま。PixAI のアプリ版で弾かれる語（adult など）や、性的・露出を直接示す語は出さない。
 *  - 首への拘束・負傷・流血は扱わない。濡れや破れから透け・露出を自動で足さない。
 *  - 触手・蔓・光の鎖などの幻想系は、世界観との相性（soft）で出やすさを変える。
 */
import type { Category, Option } from '../types';
import { o } from './helpers';

// ---------------- 立場 ----------------
// tags：captive（される側）/ captor（する側）。どちらとも取れる立場は両方を持つ。
export const ROLE: Option[] = [
  o('none', '指定しない', [], { w: 0.3, tags: [] }),
  o('binder', '拘束する側', 'dominant', { tags: ['captor'] }),
  o('watcher', '監視する側', 'dominant, watchful', { tags: ['captor'] }),
  o('hunter', '追い詰める側', 'dominant, predatory', { tags: ['captor'] }),
  o('ruler', '余裕のある支配者', 'dominant, composed', { tags: ['captor'] }),
  o('captive', '拘束される側', 'captive', { tags: ['captive'], w: 1.3 }),
  o('prisoner', '捕らえられた側', 'captive, prisoner', { tags: ['captive'] }),
  o('defiant', '反抗的な囚われ', 'captive, defiant', { tags: ['captive'] }),
  o('resigned', '諦めた囚われ', 'captive, resigned', { tags: ['captive'] }),
  o('ambiguous', 'どちらとも取れる', [], { tags: ['captive', 'captor'], desc: '出力は拘束具や表情に任せます。' }),
  o('offscreen', '相手は画面外', [], { tags: ['captive', 'captor'], desc: '人物は1名のまま。相手は描きません。' })
];

// ---------------- 拘束具 ----------------
// nat：拘束の素材名（「◯◯ around the wrists」の形で使う）。summoned は手に持たず「操る」もの。
const r = (id: string, ja: string, nat: string, worlds: string[], extra: Partial<Option> = {}) =>
  o(id, ja, [], { nat, worlds, tags: [], ...extra });
export const RESTRAINT: Option[] = [
  r('none', 'なし', '', [], { w: 1.2 }),
  r('rope', '縄', 'rope', []),
  r('chain', '鎖', 'chains', [], { tags: ['chain'] }),
  r('cuffs', '手錠', 'handcuffs', ['modern', 'noir', 'military', 'sf', 'urban']),
  r('straps', '革ベルト', 'leather straps', []),
  r('ornate_chain', '装飾鎖', 'ornate decorative chains', ['court', 'gothic', 'fantasy', 'stage'], { tags: ['chain'] }),
  r('ribbon', 'ラッピングのリボン', 'satin ribbon tied in a bow like a gift wrapping', [], { desc: '贈り物のように結ばれたリボン', tags: ['soft'] }),
  r('silk_cord', '絹の組紐', 'braided silk cords', ['japan', 'china', 'eastern', 'court']),
  r('bandage', '包帯', 'white bandages', []),
  r('tentacles', '触手', 'tentacles', ['fantasy', 'dark', 'supernatural', 'myth', 'sf'], { tags: ['summoned'] }),
  r('shadow_tentacles', '影の触手', 'shadowy tentacles of dark magic', ['fantasy', 'dark', 'supernatural', 'gothic'], { tags: ['summoned', 'magic'] }),
  r('vines', '蔓草', 'ivy vines', ['fantasy', 'myth', 'supernatural'], { tags: ['summoned'] }),
  r('rose_vines', '薔薇の蔓（棘なし）', 'thornless rose vines with blooming roses', ['fantasy', 'gothic', 'court', 'myth'], { tags: ['summoned'] }),
  r('light_chains', '光の鎖', 'glowing magical chains of light', ['fantasy', 'myth', 'sacred', 'supernatural'], { tags: ['summoned', 'magic', 'chain'] })
];

// ---------------- 拘束位置 ----------------
// tags：held（手に持つ・操る）/ wrists（両手首）/ one_wrist / ankles / torso。target は素材をどこに巻くか。
export const BIND_POS: Option[] = [
  o('none', 'なし', [], { w: 1, tags: [] }),
  o('held', '手に持つ・操る（する側）', [], { tags: ['held'], desc: '拘束具を手に持つ、または操る' }),
  o('wrists_front', '両手首を前', 'both wrists bound together in front, bound hands held near the waist', { tags: ['wrists'], nat: 'wrists' }),
  o('wrists_behind', '両手首を後ろ', 'both wrists bound behind the back, bound hands clearly visible behind the waist', { tags: ['wrists'], nat: 'wrists' }),
  o('wrists_overhead', '両手首を頭上', 'both wrists secured overhead, arms raised above the head, both feet planted on the floor', { tags: ['wrists'], nat: 'wrists' }),
  o('one_wrist', '片手首', 'one wrist restrained, the other arm free', { tags: ['one_wrist'], nat: 'one wrist' }),
  // 2026.10.10：肘掛けに手首を固定する形は SDXL で描けなかったため、背もたれに身体ごと縛りつける形に置き換え（縄・組紐だけ）
  // 2026.10.12：背もたれの長さが描けないため、胸ではなく腰を縄で椅子に縛りつける形に（ユーザー案）
  o('chair_back', '椅子に腰を縛りつける', 'tied to a chair with rope around the waist, hands behind the chair, seated upright', { tags: ['torso'], nat: 'waist' }),
  o('ankles', '両足首', 'both ankles bound together, hands free', { tags: ['ankles'], nat: 'ankles' }),
  o('torso_arms', '腕と胴体', 'restraints wrapped around the upper arms and torso, neck clear', { tags: ['torso'], nat: 'upper arms and torso' })
];

// ---------------- 固定先 ----------------
export const ANCHOR: Option[] = [
  o('none', '固定先なし', [], { w: 2 }),
  o('wall', '壁', 'secured to a wall ring'),
  o('pillar', '柱', 'secured to a pillar'),
  o('chair', '椅子', 'secured to a chair'),
  o('overhead', '頭上の固定具', 'attached to an overhead fixture')
];

// ---------------- 締め方 ----------------
export const TIGHTNESS: Option[] = [
  o('loose', '緩く巻く', 'loosely bound', { w: 1.3 }),
  o('secured', 'しっかり固定', 'securely bound'),
  o('decorative', '装飾的に巻く', 'decoratively wrapped')
];

// ---------------- 目隠し・視界 ----------------
// tags：covered（目が完全に隠れる。こちらを見る・眼鏡・目の描写を出さない）/ one_eye / closed（目を閉じる・伏せる）
export const BLINDFOLD: Option[] = [
  o('none', 'なし', [], { w: 5, tags: [] }),
  o('cloth', '布の目隠し', 'cloth blindfold', { tags: ['covered'] }),
  o('leather', '革の目隠し', 'leather blindfold', { tags: ['covered'] }),
  o('ribbon', 'リボンの目隠し', 'ribbon blindfold, satin ribbon tied over the eyes', { tags: ['covered'] }),
  o('lace', 'レースの目隠し', 'lace blindfold', { tags: ['covered'] }),
  o('silk', 'シルクの目隠し', 'silk blindfold', { tags: ['covered'] }),
  o('bandage_eyes', '包帯の目隠し', 'bandage over eyes', { tags: ['covered'] }),
  o('hood_low', 'フードで視界を遮る', 'hood pulled low over the eyes', { tags: ['covered', 'hood'] }),
  o('one_eye', '片目を覆う', 'bandage over one eye', { tags: ['one_eye'] }),
  o('veil', 'ベール越し', 'sheer veil over the face', { tags: ['veil'] }),
  o('masquerade', '目元の仮面', 'masquerade mask', { tags: ['one_eye', 'mask'] }),
  o('downcast', '伏し目', 'downcast eyes, looking down', { tags: ['closed'] }),
  o('eyes_closed', '目を閉じる', 'closed eyes', { tags: ['closed'] })
];

// ---------------- 衣装の乱れ ----------------
// outfitNeeds：衣装の特徴タグ（outfits.ts で upper/lower の語から付与）。sleeves は「袖のない衣装」以外。
const d = (id: string, ja: string, en: string, outfitNeeds: string, extra: Partial<Option> = {}) => o(id, ja, en, { outfitNeeds, ...extra });
export const DISARRAY: Option[] = [
  o('none', 'なし', [], { w: 3, outfitNeeds: '' }),
  d('partially_unbuttoned', 'ボタンを一部外す', 'partially unbuttoned shirt', 'f_shirt'),
  d('top_button_undone', '一番上のボタンを外す', 'top button undone', 'f_shirt'),
  d('collar_loosened', '襟元をゆるめる', 'collar loosened', 'f_collar'),
  d('tie_loosened', 'ネクタイをゆるめる', 'loosened necktie', 'tie'),
  d('sleeves_rolled', '袖をまくる', 'sleeves rolled up', 'sleeves'),
  d('sleeves_pushed', '袖をたくし上げる', 'sleeves pushed up', 'sleeves'),
  d('untucked', '裾を出す', 'shirt untucked', 'f_shirt'),
  d('half_tucked', '片側だけ裾を入れる', 'shirt half-tucked', 'f_shirt'),
  d('jacket_open', 'ジャケットを開ける', 'jacket worn open', 'f_jacket'),
  d('coat_open', 'コートを開ける', 'coat worn open', 'f_coat'),
  d('layer_open', '一枚を開いたまま', 'one layer hanging open', 'f_layered'),
  d('hood_up', 'フードを被る', 'hood up', 'f_hood'),
  d('disheveled', '全体を着崩す', 'disheveled clothes', ''),
  // 腹がちらりと見える（露出はここまで。f_top は裾のある上衣）
  d('midriff_peek', '裾から腹がちらり', 'midriff peek', 'f_top'),
  d('riding_up', '腕を上げて服がずり上がる', 'shirt riding up, midriff peek', 'f_top', { tags: ['arms_up'] })
];

// ---------------- 衣装の状態・加工（最大2件） ----------------
// cat：dirt / damage / wet。en は「clothes」に掛かる句。tear は鎧など硬い衣装では使わない。
const w = (id: string, ja: string, en: string, cat: string, tags: string[] = []) => o(id, ja, en, { cat, tags });
export const WEAR: Option[] = [
  o('none', 'なし', [], { w: 4, tags: [] }),
  w('dust_stained', '埃汚れ', 'dust-stained clothes', 'dirt'),
  w('mud_splattered', '泥はね汚れ', 'mud-splattered clothes', 'dirt'),
  w('mud_caked', '泥まみれ', 'clothes caked with mud', 'dirt'),
  w('soiled', '全体的な汚れ', 'soiled clothes', 'dirt'),
  w('soot_stained', '煤汚れ', 'soot-stained clothes', 'dirt'),
  w('oil_stained', '油汚れ', 'oil-stained clothes', 'dirt'),
  w('sand_covered', '砂まみれ', 'sand-covered clothes', 'dirt'),
  w('salt_stained', '塩・海水の跡', 'salt-stained clothes', 'dirt'),
  w('paint_splattered', '絵の具の飛沫', 'paint-splattered clothes', 'dirt'),
  w('frayed', 'ほつれ', 'frayed clothes, loose threads', 'damage', ['tear']),
  w('torn_light', '軽い破れ', 'slightly torn sleeve', 'damage', ['tear']),
  w('torn_places', '所々の破れ', 'clothes torn in several places', 'damage', ['tear', 'heavy_tear']),
  w('tattered', 'ぼろぼろ', 'tattered clothes', 'damage', ['tear', 'heavy_tear']),
  w('scuffed', '擦れ', 'scuffed clothes', 'damage'),
  w('scratched', '傷', 'scratched fabric', 'damage'),
  w('singed', '焦げ', 'singed clothes', 'damage'),
  w('scorched', '焼損', 'scorched clothes', 'damage'),
  w('mend_marks', '補修跡', 'visibly repaired clothes', 'damage', ['repair']),
  w('patched', 'パッチ補修', 'patched clothes', 'damage', ['repair']),
  w('battle_worn', '戦闘で傷んだ状態', 'battle-worn clothes', 'damage'),
  w('slightly_damp', 'わずかに湿っている', 'slightly damp clothes', 'wet'),
  w('rain_soaked', '雨に濡れている', 'rain-soaked clothes', 'wet', ['rain']),
  w('water_soaked', '水を吸って濡れている', 'water-soaked clothes', 'wet'),
  w('drenched', 'ずぶ濡れ', 'clothes drenched with water', 'wet'),
  w('water_droplets', '水滴が付いている', 'clothes covered in water droplets', 'wet'),
  w('sea_spray', '海水に濡れている', 'clothes wet with sea spray', 'wet'),
  w('snow_damp', '雪で湿っている', 'clothes damp from melting snow', 'wet', ['snow'])
];
export const WEAR_CATS: Category[] = [{ id: 'dirt', ja: '汚れ' }, { id: 'damage', ja: '損傷' }, { id: 'wet', ja: '濡れ' }];

// ---------------- 拘束の構図（ポーズに追加。拘束位置を hard 条件にする）----------------
// 姿勢の句だけを持ち、拘束の描写は拘束位置・拘束具の側で出す（重複させない）。
export const BOUND_POSES: Array<{ id: string; ja: string; en: string; posture: string; minShot: number; gaze: boolean; bind: string[]; armsUp?: boolean; headDown?: boolean }> = [
  { id: 'bound_front_stand', ja: '両手首を前で縛られて立つ', en: 'standing, looking at viewer', posture: 'standing', minShot: 2, gaze: true, bind: ['wrists_front'] },
  { id: 'bound_behind_lookback', ja: '後ろ手に縛られ、肩越しに振り返る', en: 'from behind, looking back over shoulder', posture: 'standing', minShot: 2, gaze: true, bind: ['wrists_behind'] },
  { id: 'bound_front_kneel', ja: '両手首を前で縛られて膝立ち', en: 'kneeling, upright kneeling, own hands together', posture: 'kneeling', minShot: 3, gaze: true, bind: ['wrists_front'] },
  { id: 'bound_chair', ja: '椅子に腰を縄で縛りつけられて座る', en: 'sitting, on chair', posture: 'sitting', minShot: 3, gaze: true, bind: ['chair_back'] },
  { id: 'wall_chain_lookback', ja: '片手首を壁へつながれて振り返る', en: 'looking back, one arm up, against wall', posture: 'standing', minShot: 2, gaze: true, bind: ['one_wrist'] },
  { id: 'bound_overhead_stand', ja: '両手首を頭上で固定されて立つ', en: 'standing, arms up', posture: 'standing', minShot: 2, gaze: true, bind: ['wrists_overhead'], armsUp: true },
  { id: 'ankles_floor', ja: '足首を縛られて床に座る', en: 'sitting on floor, knees up', posture: 'sitting', minShot: 4, gaze: true, bind: ['ankles'] },
  { id: 'chain_torso_stand', ja: '腕と胴体へ緩く巻いた演出的な立ち姿', en: 'standing', posture: 'standing', minShot: 2, gaze: true, bind: ['torso_arms'] },
  // 膝立ち（ポーズ構図工房の「膝立ち：上体を両膝の上に起こす」を参考）
  { id: 'kneel_behind', ja: '後ろ手に縛られて膝立ち', en: 'kneeling, upright kneeling, looking at viewer', posture: 'kneeling', minShot: 3, gaze: true, bind: ['wrists_behind'] },
  { id: 'kneel_overhead', ja: '両手首を頭上で吊られて膝立ち', en: 'kneeling, arms up', posture: 'kneeling', minShot: 3, gaze: true, bind: ['wrists_overhead'], armsUp: true },
  { id: 'kneel_look_up', ja: '膝をつき、縛られたまま見上げる', en: 'kneeling, looking up, looking at viewer', posture: 'kneeling', minShot: 2, gaze: true, bind: ['wrists_front', 'wrists_behind', 'torso_arms'] },
  { id: 'kneel_head_down', ja: '膝をつき、縛られて項垂れる', en: 'kneeling, sitting on heels, head down, looking down', posture: 'kneeling', minShot: 3, gaze: false, headDown: true, bind: ['wrists_front', 'wrists_behind', 'torso_arms'] },
  // うつ伏せ（ポーズ構図工房の lying prone を参考。縛った腕では上体を支えない）
  { id: 'prone_behind', ja: '後ろ手に縛られてうつ伏せ', en: 'on stomach, lying on stomach, prone, head turned, sideways glance', posture: 'lying', minShot: 4, gaze: true, bind: ['wrists_behind'] },
  { id: 'prone_reach', ja: 'うつ伏せで、縛られた両手を前へ投げ出す', en: 'on stomach, lying on stomach, prone, arms forward, head up', posture: 'lying', minShot: 3, gaze: true, bind: ['wrists_front'] },
  { id: 'prone_ankles', ja: '足首を縛られ、うつ伏せで肘をつく', en: 'on stomach, lying on stomach, prone, on elbows, hands on floor', posture: 'lying', minShot: 4, gaze: true, bind: ['ankles'] }
];

// ---------------- 表情（立場に合わせて追加。立場がOFF＝なしでは出ない）----------------
export const FORBIDDEN_EXPRESSIONS: Array<{ id: string; ja: string; en: string; side: 'captive' | 'captor' }> = [
  { id: 'wary', ja: '警戒した表情', en: 'wary expression, guarded look', side: 'captive' },
  { id: 'defiant', ja: '強がる表情', en: 'defiant expression, forced composure', side: 'captive' },
  { id: 'frustrated', ja: '悔しそうな表情', en: 'frustrated expression, biting lip', side: 'captive' },
  { id: 'resigned', ja: '諦めたような表情', en: 'resigned expression', side: 'captive' },
  { id: 'bewildered', ja: '困惑した表情', en: 'bewildered expression', side: 'captive' },
  { id: 'smug', ja: '得意げな笑み', en: 'smug smile', side: 'captor' },
  { id: 'cold_glare', ja: '冷たい視線', en: 'cold stare', side: 'captor' },
  { id: 'relish', ja: '愉悦の笑み', en: 'evil smile, smug', side: 'captor' },
  { id: 'delighted_captor', ja: '嬉しそうに見下ろす笑み', en: 'happy, smile, looking down at viewer', side: 'captor' }
];
/** 拘束される側には出さない、喜んでいる・楽しそうな表情（2026-10-15 ユーザーの希望） */
export const JOYFUL_EXPRESSIONS = new Set(['gentle_smile', 'closed_smile', 'tender', 'relieved', 'bright_smile', 'laughing', 'smile_eyes_closed', 'confident_smile', 'mischievous', 'teasing', 'smug', 'relish', 'delighted_captor']);
/** 拘束する側（する側だけの立場）の表情：嬉しそう・愉悦を感じている笑みに限る（2026-10-15 ユーザーの希望） */
export const PLEASURE_EXPRESSIONS = new Set(['smug', 'relish', 'delighted_captor', 'knowing_smile', 'provocative', 'smirk', 'confident_smile', 'teasing', 'mischievous', 'cold_smile', 'unhinged']);
/** 立場ごとに出やすくする既存の表情 */
export const ROLE_EXPRESSIONS: Record<'captive' | 'captor', string[]> = {
  captive: ['wary', 'defiant', 'frustrated', 'resigned', 'bewildered', 'quiet_tears', 'determined', 'flustered', 'sad_smile', 'intense_stare'],
  captor: ['smug', 'relish', 'delighted_captor', 'knowing_smile', 'provocative', 'smirk', 'confident_smile', 'teasing', 'cold_smile']
};

/* ---------------- タグ形式（PixAI / NovelAI / 汎用タグ）用の短いタグ ----------------
 * 2026-10-15 の実機確認（PixAI SDXL）で、ポーズ構図工房由来の長い英語の句はタグ形式ではほぼ効かず、
 * 素材を問わない「bound」が縄を呼ぶ・「captive / dominant」が相手役を呼ぶ、ことが分かった。
 * そこでタグ形式では danbooru 風の短いタグにし、長い句は自然な英文だけに残す（en / nat はそのまま）。
 * 縄・組紐以外では「bound」を使わず「restrained」と素材名で表す。 */
/** 「bound」を使ってよい素材（縄・組紐・包帯。4回目の実機確認で、包帯は bound がないと手首に巻かれなかった） */
const ROPE_LIKE = new Set(['rope', 'silk_cord', 'bandage']);
/** 拘束具の素材タグ（拘束位置に応じて「縛られた部位」のタグを足す） */
export function materialTags(restraintId: string, bindId: string): string[] {
  const part = bindId === 'ankles' ? 'bound legs, bound ankles' : bindId === 'torso_arms' ? 'bound arms' : bindId === 'chair_back' ? 'rope around waist' : 'bound wrists';
  const T: Record<string, string[]> = {
    rope: ['rope', ...part.split(', ')], silk_cord: ['rope', 'silk cord', ...part.split(', ')],
    chain: ['chain', 'chained'], ornate_chain: ['chain', 'chained', 'gold chain'],
    light_chains: ['glowing chain', 'chain', 'light particles'],
    cuffs: [bindId === 'ankles' ? 'shackles' : 'handcuffs'],
    straps: ['leather straps', 'restraints'],
    ribbon: ['ribbon', 'large bow', 'wrists tied with ribbon'],
    bandage: ['bandages', 'bandaged arm', ...part.split(', ')],
    tentacles: ['tentacles', 'restrained by tentacles'], shadow_tentacles: ['tentacles', 'black tentacles', 'restrained by tentacles', 'dark aura'],
    vines: ['vines', 'entangled in vines'], rose_vines: ['vines', 'roses', 'entangled in vines']
  };
  const tags = [...(T[restraintId] ?? []), ...(bindId === 'chair_back' ? CHAIR_BACK_TAGS[restraintId] ?? [] : [])];
  return ROPE_LIKE.has(restraintId) ? tags : tags.filter((x) => !/^bound /.test(x));
}
/** 椅子の背もたれに縛りつけるとき、素材ごとに足すタグ（縄・組紐だけ） */
const CHAIR_BACK_TAGS: Record<string, string[]> = { rope: ['tied to chair'], silk_cord: ['tied to chair'] };
/** タグ形式で重みを付ける要のタグ（5回目の実機確認：革ベルト・包帯が出ない／固定されない） */
export function keyTags(restraintId: string, bindId: string): string[] {
  const mat = materialTags(restraintId, bindId);
  return [mat[0], ...mat.filter((t) => /^bound |to chair$|around waist$|^leather cuffs$/.test(t)), ...(bindId === 'wrists_front' ? ['own hands together'] : [])].filter(Boolean);
}
/** 拘束位置のタグ（素材を問わない語だけ） */
export const BIND_TAGS: Record<string, string[]> = {
  wrists_front: ['restrained', 'own hands together'], wrists_behind: ['restrained', 'arms behind back'], wrists_overhead: ['restrained', 'arms up'],
  one_wrist: ['restrained'], chair_back: ['restrained', 'sitting', 'chair', 'arms behind back'], ankles: [], torso_arms: ['restrained']
};
export const ANCHOR_TAGS: Record<string, string[]> = { wall: ['against wall'], pillar: ['against pillar'], chair: ['chair'], overhead: [] };
/** 鎖・装飾鎖のときだけ足す固定先のタグ（ほかの素材に「chained」を混ぜない） */
export const CHAIN_ANCHOR_TAGS: Record<string, string[]> = { wall: ['chained to wall'], pillar: ['chained to pillar'] };
/** 「する側」が手に持つ・操るときのタグ */
export function heldTags(restraintId: string): string[] {
  const H: Record<string, string[]> = {
    rope: ['holding rope'], silk_cord: ['holding rope'], chain: ['holding chain'], ornate_chain: ['holding chain', 'gold chain'], light_chains: ['glowing chain', 'outstretched hand', 'magic'],
    cuffs: ['holding handcuffs', 'open handcuffs', 'handcuffs in hand'], straps: ['holding leather strap'], ribbon: ['holding ribbon'], bandage: ['holding bandages'],
    tentacles: ['tentacles', 'outstretched hand', 'magic'], shadow_tentacles: ['tentacles', 'black tentacles', 'outstretched hand', 'dark aura'],
    vines: ['vines', 'outstretched hand', 'magic'], rose_vines: ['vines', 'roses', 'outstretched hand', 'magic']
  };
  return H[restraintId] ?? [];
}
export const BLIND_TAGS: Record<string, string[]> = {
  cloth: ['blindfold', 'covered eyes', 'black blindfold'], leather: ['blindfold', 'covered eyes', 'leather blindfold'],
  ribbon: ['blindfold', 'covered eyes', 'ribbon blindfold'], lace: ['blindfold', 'covered eyes', 'lace blindfold'],
  silk: ['blindfold', 'covered eyes', 'white blindfold'], bandage_eyes: ['covered eyes', 'bandage over eyes'],
  hood_low: ['hood up', 'hood pulled low', 'shaded face'], one_eye: ['bandage over one eye'], veil: ['veil', 'see-through veil'],
  masquerade: ['masquerade mask'], downcast: ['looking down'], eyes_closed: ['closed eyes']
};
