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
import { added, o } from './helpers';

const p = (id: string, ja: string, en: string, posture: string, hands: number, minShot: ShotLevel, gazeViewer: boolean, tags: string[], extra: Partial<Option> = {}) =>
  o(id, ja, en, { cat: posture, posture, hands, minShot, gazeViewer, tags, ...extra });
/** こちらを見ない視線（視線を外すポーズと組み合わせてよい「視線」） */
const AWAY = ['side', 'downward', 'down_side', 'up_side', 'afar', 'unfocused', 'closed'];
/** 本を読む視線 */
const READ = ['downward', 'at_book', 'down_side', 'closed'];
/** 横顔・横を向くポーズの頭の向き */
const SIDE_HEAD = ['profile', 'head_turned', 'head_tilt', 'chin_up', 'chin_down', 'head_bowed'];
/** 手元・机を見るポーズの頭の向き */
const DOWN_HEAD = ['head_bowed', 'chin_down', 'head_tilt'];

const POSE_BASE: Option[] = [
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
  p('stretching', '伸びをする', 'stretching, arms up', 'standing', 0, 2, false, ['casual', 'sunny', 'arms_up'], { src: 'pcw:arms_up' }),
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
  ...BOUND_POSES.map((b) => p(b.id, b.ja, b.en, b.posture, 0, b.minShot as ShotLevel, b.gaze, ['bound', ...(b.armsUp ? ['arms_up'] : []), ...(b.headDown ? ['head_down'] : [])], { cat: 'bound', requires: [`bindPos:${b.bind.join('|')}`] })),
  // ---- 2026-10 増築：こちらを見ない所作・座り方・仕事の動き（視線は「視線」の項目と組み合わせる）----
  ...[
    p('seated_elbows_on_knees', '前傾して肘を膝に', 'sitting, leaning forward, elbows on knees', 'sitting', 0, 4, false, ['casual', 'cool', 'melancholy']),
    p('arms_crossed_look_away', '腕組みで視線を外す', 'crossed arms, looking away', 'standing', 0, 2, false, ['cool', 'aloof'], { gazeFit: AWAY }),
    p('wall_lean_profile', '壁にもたれる横顔', 'leaning against wall, profile', 'leaning', 2, 2, false, ['cool', 'melancholy'], { gazeFit: AWAY, headFit: SIDE_HEAD }),
    p('pocket_look_back', '片手をポケットに振り向く', 'hand in pocket, looking over shoulder', 'standing', 1, 3, false, ['cool', 'elegant'], { gazeFit: ['at_viewer', 'side', 'down_side'], headFit: ['over_shoulder', 'head_turned', 'head_tilt'] }),
    p('reading_seated', '座って読書に没頭', 'sitting, reading', 'sitting', 2, 2, false, ['intellect', 'soft'], { requires: ['prop:#book'], gazeFit: READ, headFit: DOWN_HEAD }),
    p('gazing_out_window', '窓の外を眺める', 'standing by window, looking outside', 'standing', 2, 1, false, ['melancholy', 'soft'], { gazeFit: AWAY, headFit: SIDE_HEAD }),
    p('sideways_on_chair', '椅子に横向きに座る', 'sitting sideways on chair', 'sitting', 2, 3, false, ['casual', 'elegant']),
    p('checking_watch', '腕時計を確かめる', 'checking wristwatch, wristwatch', 'standing', 0, 2, false, ['formal', 'casual'], { gazeFit: ['downward', 'at_hands', 'down_side'], headFit: DOWN_HEAD }),
    p('jacket_over_shoulder', '上着を肩に掛ける', 'jacket over shoulder, holding jacket', 'standing', 1, 2, false, ['casual', 'cool', 'confident']),
    p('kneeling_work', '片膝をついて作業する', 'kneeling on one knee, working with hands', 'kneeling', 0, 4, false, ['craft', 'work'], { gazeFit: ['downward', 'at_hands', 'down_side', 'at_viewer'] }),
    p('rolling_sleeves', '袖をまくる', 'rolling up sleeves', 'standing', 0, 2, false, ['craft', 'work', 'confident', 'needs_sleeves']),
    p('leaning_over_table', '机上を覗き込む', 'leaning over table, looking down', 'standing', 1, 2, false, ['intellect', 'work'], { gazeFit: ['downward', 'at_hands', 'down_side', 'at_book'], headFit: DOWN_HEAD })
  ].map(added)
];
/* 視線・頭の向きを決めるポーズ（既存）。ここに無いポーズの looking at viewer などは、「視線」を指定するとその指定で置き換わる。 */
const POSE_FIT: Record<string, Pick<Option, 'gazeFit' | 'headFit'>> = {
  looking_down: { gazeFit: ['at_viewer'], headFit: ['chin_down', 'facing_front', 'head_tilt'] },
  over_glasses: { gazeFit: ['at_viewer'] },
  looking_back: { gazeFit: ['at_viewer'], headFit: ['over_shoulder', 'head_turned'] },
  walking_away: { headFit: ['over_shoulder', 'head_turned'] },
  back_turned: { gazeFit: [], headFit: ['over_shoulder', 'head_bowed'] },
  side_profile: { gazeFit: [...AWAY, 'upward', 'up_side', 'closed'], headFit: SIDE_HEAD },
  looking_up_sky: { gazeFit: ['upward', 'up_side', 'afar', 'closed'], headFit: ['chin_up', 'head_tilt', 'profile', 'head_turned'] },
  sitting_window: { gazeFit: AWAY, headFit: SIDE_HEAD },
  hand_on_neck: { gazeFit: AWAY, headFit: ['head_turned', 'head_tilt', 'chin_down', 'head_bowed', 'turned_away', 'profile'] },
  meditating: { gazeFit: ['closed'], headFit: ['facing_front', 'head_bowed', 'chin_down', 'head_tilt'] },
  reading: { gazeFit: READ, headFit: DOWN_HEAD },
  bow: { headFit: ['head_bowed', 'chin_down'] },
  lying_down: { headFit: ['head_tilt', 'head_turned', 'facing_front'] }
};
export const POSE: Option[] = POSE_BASE.map((x) => (POSE_FIT[x.id] ? { ...x, ...POSE_FIT[x.id] } : x));
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
  prop('black_cat', '黒猫を抱く', 'holding cat, black cat', 2, ['soft', 'mystic'], []),
  // ---- 2026-10 増築：職業と行動を画面で見分ける携行品 ----
  ...[
    prop('blueprints', '建築図面', 'holding blueprints, architectural drawings', 1, ['intellect', 'work', 'architect'], ['modern', 'business', 'urban', 'renaissance_court']),
    prop('folding_ruler', '折尺', 'holding folding ruler', 1, ['craft', 'work'], ['modern', 'retro', 'renaissance_court']),
    prop('vintage_camera', 'クラシックカメラ', 'holding vintage camera', 1, ['artist', 'retro'], ['modern', 'urban', 'retro', 'belle_epoque', 'taisho']),
    prop('sketchbook', 'スケッチブック', 'holding sketchbook', 1, ['artist', 'intellect'], []),
    prop('plant_specimen', '植物標本', 'holding plant specimen, pressed leaves', 1, ['intellect', 'nature'], ['modern', 'victorian', 'solarpunk', 'fantasy']),
    prop('tool_roll', '革の工具巻き', 'holding leather tool roll', 1, ['craft', 'work'], ['modern', 'retro', 'steampunk', 'dieselpunk']),
    prop('saxophone', 'サックス', 'saxophone', 2, ['instrument', 'stage'], ['modern', 'urban', 'noir', 'stage', 'retro']),
    prop('falcon_glove', '鷹を乗せた革手袋', 'falcon perched on gloved hand, falconry glove', 1, ['nature', 'wild'], ['central_asian_steppe', 'fantasy', 'north', 'desert', 'historical']),
    prop('binoculars', '双眼鏡', 'holding binoculars', 2, ['travel', 'nature'], ['modern', 'military', 'wasteland', 'andean_highland']),
    prop('old_map', '古い地図', 'holding old map', 1, ['travel', 'intellect'], ['fantasy', 'western', 'historical', 'desert', 'silk_road_city']),
    prop('fountain_pen', '万年筆', 'holding fountain pen', 1, ['intellect', 'retro'], ['modern', 'business', 'retro', 'taisho', 'belle_epoque'])
  ].map(added)
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

// ---------------- 2026-10 増築：視線（任意・既定OFF。ポーズを出力するときだけ）----------------
/* 身体のポーズと独立に視線を決める。「ポーズに任せる」以外を選ぶと、ポーズの looking at viewer などをこの指定で置き換える（同時に2つの視線を出さない）。
 * 視線そのものを決めるポーズ（横顔・見下ろす・空を見上げる・読書など）は、合う視線だけを選ぶ（gazeFit）。目を閉じた表情・目隠しとは組まない。 */
const g = (id: string, ja: string, en: string, nat: string, extra: Partial<Option> = {}) => added(o(id, ja, en, { nat, ...extra }));
export const GAZE: Option[] = [
  added(o('none', 'ポーズに任せる', [], { w: 2, desc: 'ポーズに含まれる視線（こちらを見る など）をそのまま使います。' })),
  g('at_viewer', 'こちらを見る', 'looking at viewer', 'looking straight at the viewer', { gazeViewer: true, cat: 'viewer', w: 1.2 }),
  g('side', '横へ視線を流す', 'looking to the side', 'glancing off to the side', { cat: 'away' }),
  g('downward', '伏し目', 'looking down, downcast eyes', 'looking down with downcast eyes', { cat: 'down' }),
  g('down_side', '斜め下を見る', 'looking down, looking to the side', 'looking down and to the side', { cat: 'down' }),
  g('upward', '上を見る', 'looking up', 'looking upward', { cat: 'up' }),
  g('up_side', '斜め上を見る', 'looking up, looking to the side', 'looking up and off to the side', { cat: 'up', w: 0.8 }),
  g('afar', '遠くを見る', 'looking afar', 'gazing into the distance', { cat: 'away' }),
  g('unfocused', '焦点の合わない視線', 'unfocused gaze, distant look', 'gazing softly into nothing', { cat: 'away', w: 0.7 }),
  g('at_hands', '手元を見る', 'looking at hands', 'looking down at his hands', { cat: 'down', w: 0.7 }),
  g('at_book', '本に目を落とす', 'looking at book', 'reading with his eyes on the page', { cat: 'down', requires: ['prop:#book'] }),
  g('closed', '目を閉じる', 'closed eyes', 'keeping his eyes closed', { eyesClosed: true, cat: 'closed', w: 0.6 })
];
export const GAZE_CATS: Category[] = [{ id: 'viewer', ja: 'こちら' }, { id: 'away', ja: '外す・遠く' }, { id: 'down', ja: '下' }, { id: 'up', ja: '上' }, { id: 'closed', ja: '閉じる' }];

// ---------------- 2026-10 増築：頭の向き（任意・既定OFF。ポーズを出力するときだけ）----------------
/* 人物の頭・首の向き。カメラの「アングル」とは別物。左右は画像生成で確実に描き分けられないため、まとめた。 */
const h = (id: string, ja: string, en: string, nat: string, extra: Partial<Option> = {}) => added(o(id, ja, en, { nat, ...extra }));
export const HEAD_POSE: Option[] = [
  added(o('none', 'ポーズに任せる', [], { w: 2, desc: 'ポーズの頭の向きをそのまま使います。' })),
  h('facing_front', '正面を向く', 'facing viewer', 'facing forward'),
  h('head_turned', '顔を少し横へ向ける', 'head turned to the side', 'turning his head slightly to the side'),
  h('profile', '横顔', 'profile', 'shown in profile', { w: 0.8 }),
  h('head_tilt', '首を傾ける', 'head tilt', 'tilting his head'),
  h('chin_up', '顎を上げる', 'raised chin, head tilted up', 'raising his chin'),
  h('chin_down', '顎を引く', 'lowered chin', 'lowering his chin slightly'),
  h('over_shoulder', '肩越しに振り返る', 'looking over shoulder', 'looking back over his shoulder', { w: 0.8 }),
  h('head_bowed', '軽くうつむく', 'head down, bowed head', 'bowing his head gently', { w: 0.8 }),
  h('turned_away', '顔を背ける', 'head turned away', 'turning his face away', { w: 0.6 })
];
