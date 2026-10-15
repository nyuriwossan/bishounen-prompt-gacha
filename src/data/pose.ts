/* ポーズ・持ち物・構図・アングル
 * pose-composition-workshop の姿勢（postures）・腕（armActions / combinedArms）・頭と視線（headYaws / gazeTargets）・
 * 画角（shotSizes）・カメラ高さ（elevations）を、一人の男性キャラクター用の完成ポーズとして合成した。
 * 同工房の hard ルール（閉じた目とこちらを見る視線、両腕指定と片腕指定の重複、手の数の超過）を
 * minShot / hands / gazeViewer / eyesClosed として表現している。
 * 拘束・複数人・視点人物との接触系のプリセットは今回の用途外のため移植していない。
 *
 * 画角レベル：0 顔アップ / 1 胸上 / 2 上半身 / 3 腰上 / 4 膝上 / 5 全身
 */
import type { Category, Option, ShotLevel } from '../types';
import { BOUND_POSES } from './forbidden';
import { o } from './helpers';

const p = (id: string, ja: string, en: string, posture: string, hands: number, minShot: ShotLevel, gazeViewer: boolean, tags: string[], extra: Partial<Option> = {}) =>
  o(id, ja, en, { cat: posture, posture, hands, minShot, gazeViewer, tags, ...extra });

export const POSE: Option[] = [
  // 立ち
  p('standing_relaxed', '自然な立ち姿', 'standing, looking at viewer', 'standing', 2, 0, true, ['casual', 'gentle'], { w: 1.4, src: 'pcw:basic_front' }),
  p('three_quarter', '斜めに構えた立ち姿', 'standing, looking at viewer, slight turn', 'standing', 2, 1, true, ['cool', 'elegant'], { src: 'pcw:model_three_quarter' }),
  p('hand_in_pocket', '片手をポケットに', 'standing, hand in pocket, looking at viewer', 'standing', 1, 3, true, ['cool', 'casual'], { src: 'pcw:hand_in_pocket' }),
  p('hands_in_pockets', '両手をポケットに', 'standing, hands in pockets', 'standing', 0, 3, true, ['cool', 'casual', 'aloof'] ),
  p('arms_crossed', '腕組み', 'crossed arms, looking at viewer', 'standing', 0, 2, true, ['dominant', 'cool'], { src: 'pcw:crossed_bust' }),
  p('hand_on_hip', '片手を腰に', 'hand on hip, looking at viewer', 'standing', 1, 3, true, ['confident'], { src: 'pcw:hand_on_hip' }),
  p('hands_behind_back', '後ろ手に組む', 'hands behind back, standing', 'standing', 0, 2, true, ['noble', 'service', 'elegant'], { src: 'pcw:hands_behind_back' }),
  p('hand_on_chest', '胸に手を当てる', 'hand on own chest, looking at viewer', 'standing', 1, 1, true, ['noble', 'gentle', 'service'], { src: 'pcw:hand_near_chest' }),
  p('bow', '胸に手を当てて一礼', 'bowing, hand on own chest', 'standing', 1, 2, false, ['noble', 'service']),
  p('offer_hand', '手を差し伸べる', 'reaching towards viewer, outstretched hand, looking at viewer', 'standing', 1, 2, true, ['gentle', 'noble'], { src: 'pcw:reaching_forward_soft' }),
  p('chin_rest', '顎に手を添える', 'hand on own chin, looking at viewer', 'standing', 1, 1, true, ['intellect', 'cool'], { src: 'pcw:thinking' }),
  p('hair_brush', '髪をかき上げる', 'hand in own hair, looking at viewer', 'standing', 1, 1, true, ['alluring', 'cool'], { src: 'pcw:hand_in_hair' }),
  p('finger_lips', '唇に指を当てる', 'finger to own lips, looking at viewer', 'standing', 1, 0, true, ['alluring', 'playful', 'mystic']),
  p('cover_eye', '片手で顔を覆う', 'hand over own face, covering one eye', 'standing', 1, 1, true, ['dark', 'danger'], { src: 'pcw:hand_covering_eyes' }),
  p('hand_on_neck', '首の後ろに手を', 'hand on own neck, looking away', 'standing', 1, 1, false, ['shy', 'soft']),
  p('adjust_glasses', '眼鏡を押し上げる', 'adjusting eyewear, looking at viewer', 'standing', 1, 0, true, ['intellect', 'cool'], { requires: ['glasses:!none'] }),
  p('over_glasses', '眼鏡越しの視線', 'looking over eyewear, looking at viewer', 'standing', 2, 0, true, ['intellect', 'alluring'], { requires: ['glasses:!none'] }),
  p('loosen_tie', 'ネクタイを緩める', 'loosening necktie, looking at viewer', 'standing', 1, 1, true, ['alluring', 'danger'], { requires: ['outfit:#tie'] }),
  p('adjust_cuffs', '袖口を整える', 'adjusting cuffs', 'standing', 0, 2, false, ['elegant', 'noble'], { requires: ['outfit:#formal'] }),
  p('glove_bite', '手袋を口で外す', 'pulling off glove with teeth, looking at viewer', 'standing', 1, 1, true, ['alluring', 'danger'], { requires: ['outfit:#gloves'] }),
  p('pointing', 'こちらを指差す', 'pointing at viewer', 'standing', 1, 1, true, ['confident', 'playful']),
  p('beckoning', '手招き', 'beckoning, looking at viewer', 'standing', 1, 2, true, ['alluring', 'playful']),
  p('waving', '手を振る', 'waving, smile, looking at viewer', 'standing', 1, 2, true, ['sunny', 'casual']),
  p('stretching', '伸びをする', 'stretching, arms up', 'standing', 0, 2, false, ['casual', 'sunny'], { src: 'pcw:arms_up' }),
  p('looking_back', '肩越しに振り返る', 'looking back, looking at viewer over shoulder', 'standing', 2, 1, true, ['elegant', 'mystic'], { src: 'pcw:walk_turn' }),
  p('back_turned', '背を向けて佇む', 'from behind, facing away', 'standing', 2, 2, false, ['aloof', 'melancholy']),
  p('side_profile', '横顔', 'profile, looking afar', 'standing', 2, 0, false, ['melancholy', 'cool'], { src: 'pcw:side' }),
  p('looking_down', '見下ろす', 'looking down at viewer', 'standing', 2, 1, true, ['dominant', 'cold']),
  p('looking_up_sky', '空を見上げる', 'looking up, looking afar', 'standing', 2, 1, false, ['melancholy', 'sunny']),
  p('leaning_wall', '壁にもたれる', 'leaning against wall, looking at viewer', 'leaning', 2, 2, true, ['cool', 'casual', 'street'], { src: 'pcw:leaning_surface' }),
  p('leaning_railing', '手すりにもたれる', 'leaning on railing', 'leaning', 2, 3, true, ['casual', 'melancholy']),
  p('leaning_forward', '身を乗り出す', 'leaning forward, looking at viewer', 'leaning', 2, 1, true, ['playful', 'alluring'], { src: 'pcw:forward' }),
  // 座り
  p('sitting_chair', '椅子に座る', 'sitting, on chair, looking at viewer', 'sitting', 2, 3, true, ['casual', 'elegant'], { src: 'pcw:calm_seated' }),
  p('crossed_legs', '脚を組んで座る', 'sitting, crossed legs, looking at viewer', 'sitting', 2, 4, true, ['dominant', 'elegant'], { src: 'pcw:seated_crossed' }),
  p('throne_lounge', '玉座で頬杖をつく', 'sitting on throne, head rest, looking at viewer', 'sitting', 1, 3, true, ['dominant', 'royal'], { worlds: ['court', 'fantasy', 'dark'] }),
  p('chin_on_hand_table', '卓に頬杖', 'sitting, head rest, elbow on table, looking at viewer', 'sitting', 1, 2, true, ['casual', 'alluring']),
  p('backwards_chair', '椅子に逆向きに座る', 'sitting backwards on chair, arms on backrest', 'sitting', 0, 3, true, ['casual', 'playful', 'street']),
  p('sitting_floor', '床に座り片膝を立てる', 'sitting on floor, knee up, arm on knee', 'sitting', 1, 4, true, ['casual', 'wild'], { src: 'pcw:one_raised' }),
  p('sitting_stairs', '階段に腰掛ける', 'sitting on stairs, looking at viewer', 'sitting', 2, 4, true, ['casual', 'melancholy']),
  p('sitting_window', '窓辺に腰掛ける', 'sitting on windowsill, looking outside', 'sitting', 2, 3, false, ['melancholy', 'soft']),
  p('seiza', '正座', 'seiza, hands on lap', 'sitting', 0, 4, true, ['service', 'elegant'], { worlds: ['japan'] }),
  p('meditating', '瞑想', 'sitting, meditation, closed eyes', 'sitting', 0, 3, false, ['sacred', 'mystic'], { eyesClosed: true }),
  p('crouching', 'しゃがむ', 'squatting, looking at viewer', 'crouching', 2, 4, true, ['street', 'casual', 'playful'], { src: 'pcw:squatting' }),
  p('lying_down', '寝転んで見上げる', 'lying, on back, looking at viewer', 'lying', 2, 2, true, ['soft', 'alluring'], { w: 0.6, src: 'pcw:supine' }),
  // 動き
  p('walking', '歩いてくる', 'walking towards viewer', 'walking', 2, 3, true, ['casual', 'confident'], { src: 'pcw:walking_moment' }),
  p('walking_away', '振り向きながら歩く', 'walking, looking back', 'walking', 2, 3, true, ['elegant', 'mystic'], { src: 'pcw:walk_turn' }),
  p('running', '駆け出す', 'running, motion blur', 'running', 2, 4, false, ['dynamic', 'sunny']),
  p('jumping', '跳躍', 'jumping, midair', 'jumping', 2, 5, false, ['dynamic']),
  p('fighting_stance', '戦いの構え', 'fighting stance, looking at viewer', 'standing', 2, 3, true, ['dynamic', 'warrior']),
  p('wind_coat', '風にコートをなびかせる', 'standing, wind, coat flowing', 'standing', 2, 3, true, ['dynamic', 'cool'], { requires: ['outfit:#coat'] }),
  p('cape_sweep', 'マントを翻す', 'cape flowing, dramatic pose', 'standing', 1, 3, true, ['dynamic', 'royal'], { requires: ['outfit:#cape'] }),
  p('kneel_one_knee', '片膝をつく', 'kneeling on one knee, looking at viewer', 'kneeling', 2, 4, true, ['knight', 'service', 'noble'], { src: 'pcw:one_knee' }),
  p('kneel_offer', '跪いて手を差し出す', 'kneeling on one knee, reaching towards viewer', 'kneeling', 1, 4, true, ['knight', 'gentle', 'noble'], { src: 'pcw:viewer_one_knee_full' }),
  p('floating', '宙に浮かぶ', 'floating, levitation', 'floating', 2, 4, true, ['mystic', 'ethereal'], { worlds: ['fantasy', 'myth', 'supernatural', 'sacred'] }),
  p('casting_spell', '魔法を放つ', 'casting spell, glowing hand, magic circle', 'standing', 1, 2, true, ['mystic', 'dynamic'], { worlds: ['fantasy', 'supernatural', 'myth', 'dark'] }),
  // 持ち物と一体のポーズ
  p('draw_sword', '抜刀の構え', 'drawing sword, battle stance, looking at viewer', 'standing', 2, 3, true, ['warrior', 'dynamic'], { requires: ['prop:#blade'] }),
  p('sword_planted', '剣を地に突き立てる', 'hands on hilt, sword planted in ground', 'standing', 2, 3, true, ['warrior', 'noble', 'dominant'], { requires: ['prop:#blade'] }),
  p('blade_shoulder', '刀を肩に担ぐ', 'weapon over shoulder, looking at viewer', 'standing', 2, 2, true, ['warrior', 'wild'], { requires: ['prop:#blade'] }),
  p('reading', '本を読む', 'reading', 'standing', 2, 2, false, ['intellect', 'soft'], { requires: ['prop:#book'] }),
  p('sipping', 'カップを傾ける', 'drinking', 'sitting', 2, 2, true, ['elegant', 'soft'], { requires: ['prop:#cup'] }),
  p('toasting', 'グラスを掲げる', 'raising glass, looking at viewer', 'standing', 2, 1, true, ['alluring', 'noble'], { requires: ['prop:#glass'] }),
  p('under_umbrella', '傘を差す', 'sheltering under umbrella, looking at viewer', 'standing', 2, 2, true, ['melancholy', 'elegant'], { requires: ['prop:#umbrella'] }),
  p('offering_flower', '花を差し出す', 'offering flower to viewer', 'standing', 2, 1, true, ['gentle', 'alluring'], { requires: ['prop:#flower'] }),
  p('playing_music', '楽器を奏でる', 'playing instrument', 'standing', 2, 2, false, ['artist', 'elegant'], { requires: ['prop:#instrument'] }),
  p('aiming', '銃を構える', 'aiming at viewer', 'standing', 2, 2, true, ['danger', 'dynamic'], { requires: ['prop:#gun'] }),
  // 禁断の調合：拘束の構図（拘束位置を hard 条件にするので、アンリミテッドモードOFFでは出ない）。手は塞がっているので持ち物なし
  ...BOUND_POSES.map((b) => p(b.id, b.ja, b.en, b.posture, 0, b.minShot as ShotLevel, b.gaze, ['bound'], { cat: 'bound', requires: [`bindPos:${b.bind}`] })),
];
export const POSE_CATS: Category[] = [
  { id: 'standing', ja: '立ち' }, { id: 'leaning', ja: 'もたれる' }, { id: 'sitting', ja: '座る' }, { id: 'crouching', ja: 'しゃがむ' },
  { id: 'lying', ja: '寝転ぶ' }, { id: 'walking', ja: '歩く' }, { id: 'running', ja: '走る' }, { id: 'jumping', ja: '跳ぶ' },
  { id: 'kneeling', ja: '跪く' }, { id: 'floating', ja: '浮かぶ' }, { id: 'bound', ja: '拘束（禁断の調合）' }
];

// ---------------- 持ち物 ----------------
const prop = (id: string, ja: string, en: string, hands: number, tags: string[], worlds: string[] = [], extra: Partial<Option> = {}) =>
  o(id, ja, en, { hands, tags, worlds, ...extra });
export const PROP: Option[] = [
  prop('none', 'なし', '', 0, [], [], { w: 12, en: [] }),
  prop('longsword', '長剣', 'holding sword', 1, ['blade', 'weapon'], ['fantasy', 'western', 'historical']),
  prop('katana', '刀', 'holding katana', 1, ['blade', 'weapon'], ['japan', 'supernatural']),
  prop('sheathed_katana', '鞘に収めた刀', 'sheathed katana', 1, ['blade', 'weapon'], ['japan', 'supernatural']),
  prop('rapier', 'レイピア', 'holding rapier', 1, ['blade', 'weapon', 'elegant'], ['court', 'western', 'gothic']),
  prop('greatsword', '大剣', 'holding greatsword', 2, ['blade', 'weapon'], ['fantasy', 'dark']),
  prop('chinese_sword', '剣（中華）', 'holding jian', 1, ['blade', 'weapon'], ['china']),
  prop('dagger', '短剣', 'holding dagger', 1, ['blade', 'weapon', 'danger'], ['fantasy', 'dark', 'desert']),
  prop('spear', '槍', 'holding spear', 2, ['weapon'], ['fantasy', 'historical', 'myth']),
  prop('bow', '弓', 'holding bow', 2, ['weapon'], ['fantasy', 'north', 'japan']),
  prop('staff', '魔法の杖', 'holding staff', 1, ['mage'], ['fantasy', 'myth']),
  prop('grimoire', '魔導書', 'holding grimoire', 1, ['book', 'mage'], ['fantasy', 'dark', 'gothic']),
  prop('book', '本', 'holding book', 1, ['book', 'intellect'], []),
  prop('teacup', 'ティーカップ', 'holding teacup', 1, ['cup', 'elegant'], ['court', 'victorian', 'modern', 'gothic']),
  prop('coffee', 'コーヒーカップ', 'holding coffee cup', 1, ['cup', 'casual'], ['modern', 'urban', 'business']),
  prop('tea_bowl', '茶碗', 'holding tea bowl', 1, ['cup', 'elegant'], ['japan', 'china']),
  prop('wine_glass', 'ワイングラス', 'holding wine glass', 1, ['glass', 'alluring'], ['court', 'gothic', 'urban', 'noir']),
  prop('pocket_watch', '懐中時計', 'holding pocket watch', 1, ['retro', 'elegant'], ['victorian', 'steampunk', 'court', 'retro']),
  prop('rose', '一輪の薔薇', 'holding rose', 1, ['flower', 'alluring'], []),
  prop('sakura_branch', '桜の枝', 'holding cherry blossom branch', 1, ['flower', 'eastern'], ['japan']),
  prop('bouquet', '花束', 'holding bouquet', 1, ['flower', 'gentle'], ['modern', 'court', 'fantasy']),
  prop('folding_fan', '扇', 'holding folding fan', 1, ['eastern', 'elegant'], ['japan', 'china']),
  prop('paper_umbrella', '和傘', 'holding oil-paper umbrella', 1, ['umbrella', 'eastern'], ['japan', 'china', 'taisho']),
  prop('umbrella', '傘', 'holding umbrella', 1, ['umbrella'], ['modern', 'victorian', 'urban', 'noir']),
  prop('lantern', 'ランタン', 'holding lantern', 1, ['light'], ['fantasy', 'victorian', 'japan', 'dark']),
  prop('pistol', '拳銃', 'holding handgun', 1, ['gun', 'weapon', 'danger'], ['noir', 'modern', 'military', 'sf', 'urban']),
  prop('cane', 'ステッキ', 'holding cane', 1, ['elegant', 'retro'], ['victorian', 'court', 'steampunk', 'noir']),
  prop('playing_card', 'トランプ', 'holding playing card', 1, ['playful'], ['modern', 'noir', 'stage', 'gothic']),
  prop('chess_piece', 'チェスの駒', 'holding chess piece', 1, ['intellect'], []),
  prop('crystal_orb', '水晶玉', 'holding crystal ball', 1, ['mage', 'mystic'], ['fantasy', 'desert', 'myth']),
  prop('quill', '羽ペン', 'holding quill', 1, ['intellect', 'retro'], ['court', 'victorian', 'fantasy']),
  prop('kiseru', '煙管', 'holding kiseru', 1, ['eastern', 'decadent'], ['japan', 'taisho']),
  prop('mask', '仮面', 'holding mask', 1, ['mystic', 'playful'], ['court', 'gothic', 'stage', 'japan']),
  prop('microphone', 'マイク', 'holding microphone', 1, ['stage'], ['stage', 'modern']),
  prop('smartphone', 'スマートフォン', 'holding phone', 1, ['casual'], ['modern', 'urban', 'business']),
  prop('violin', 'ヴァイオリン', 'violin, bow (music)', 2, ['instrument', 'elegant'], ['court', 'victorian', 'modern', 'gothic', 'stage']),
  prop('flute', '横笛', 'transverse flute', 2, ['instrument', 'eastern'], ['japan', 'china', 'fantasy']),
  prop('bird_shoulder', '肩にとまる小鳥', 'bird on shoulder', 0, ['soft', 'nature'], ['fantasy', 'modern', 'myth']),
  prop('black_cat', '黒猫を抱く', 'holding cat, black cat', 2, ['soft', 'mystic'], [])
];

// ---------------- 構図（画角） ----------------
export const SHOT: Option[] = [
  o('close_up', '顔アップ', 'close-up, face focus', { level: 0, src: 'pcw:face_close_up', w: 0.7 }),
  o('portrait', '胸上', 'portrait', { level: 1, src: 'pcw:bust_shot', w: 1.5 }),
  o('upper_body', '上半身', 'upper body', { level: 2, src: 'pcw:upper_body', w: 1.6 }),
  o('cowboy_shot', '腰上', 'cowboy shot', { level: 3, src: 'pcw:waist_up', w: 1.3 }),
  o('knee_up', '膝上', 'feet out of frame', { level: 4, src: 'pcw:knee_up', w: 0.8 }),
  o('full_body', '全身', 'full body', { level: 5, src: 'pcw:full_body', w: 1.1 }),
  o('wide_full', '引きの全身', 'full body, wide shot', { level: 5, src: 'pcw:wide', w: 0.5 })
];

// ---------------- アングル ----------------
export const ANGLE: Option[] = [
  o('eye_level', '目線の高さ', [], { w: 3, src: 'pcw:eye_level' }),
  o('from_below', '煽り（下から）', 'from below', { src: 'pcw:low', tags: ['dominant'] }),
  o('slightly_below', 'やや下から', 'slightly from below', { src: 'pcw:slightly_low', tags: ['dominant'] }),
  o('from_above', '俯瞰（上から）', 'from above', { src: 'pcw:high', tags: ['soft'] }),
  o('dutch', '傾けた画面', 'dutch angle', { src: 'pcw:dutch', tags: ['dynamic', 'danger'], w: 0.7 }),
  o('three_quarter_view', '斜め45度', 'three-quarter view', { w: 1.5 }),
  o('from_side', '真横から', 'from side', { w: 0.6 })
];
