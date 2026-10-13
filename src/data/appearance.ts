/* 容姿辞書
 * 髪色48・瞳色40・肌色12は character-appearance-prompt-workshop（imported/caw.json）から移植。
 * 年齢・容姿傾向・体格・顔立ち・目元・髪型は、同工房の語彙（顔型・顎線・眉・目の形・カット）を
 * 男性キャラクター向けに再構成した新規データ。
 * 年齢表現は同工房の方針に合わせ、単独の "adult" を使わない。
 */
import type { Category, Option } from '../types';
import { o } from './helpers';
import caw from './imported/caw.json';

type CawOpt = { id: string; ja: string; en: string; hex?: string };
const cawField = (id: string): CawOpt[] => (caw.fields as Record<string, CawOpt[]>)[id] || [];

// ---------------- 年齢層（成人のみ） ----------------
export const AGE: Option[] = [
  o('a18_24', '18〜24歳｜青年', 'young man', { nat: 'a young man in his early twenties', ageMin: 18, tags: ['young'], desc: '若々しさの残る青年。未成年に見える語は使いません。' }),
  o('a25_34', '25〜34歳｜若き大人', 'man in his late 20s', { nat: 'a man in his late twenties to early thirties', ageMin: 25, tags: ['prime'], desc: 'もっとも王道の「美青年」帯。' }),
  o('a35_44', '35〜44歳｜成熟', 'mature male, man in his late 30s', { nat: 'a mature man in his late thirties to early forties', ageMin: 35, tags: ['mature'], desc: '色気と余裕が出る成熟美形。' }),
  o('a45_59', '45〜59歳｜壮年', 'mature male, middle-aged man', { nat: 'a distinguished middle-aged man in his fifties', ageMin: 45, tags: ['mature', 'senior'], w: 0.7, desc: '渋みと威厳のある壮年の美形。' }),
  o('a60p', '60歳以上｜老紳士', 'old man, elderly gentleman', { nat: 'a dignified elderly gentleman in his sixties or older', ageMin: 60, tags: ['senior'], w: 0.45, desc: '気品ある老年の美形。' })
];

// ---------------- 容姿傾向（外見の印象。性別は変えない） ----------------
export const PRESENTATION: Option[] = [
  o('masc', '男性的', 'masculine features', { nat: 'with distinctly masculine features', tags: ['masc'], desc: '骨格や輪郭がはっきり男性的。' }),
  o('slight_masc', 'やや男性寄り', 'subtly masculine features', { nat: 'with subtly masculine, well-balanced features', tags: ['masc'], w: 1.2 }),
  o('andro', '中性的', 'androgynous features', { nat: 'with androgynous features', tags: ['andro'], w: 1.1 }),
  o('slight_fem', 'やや女性寄り', 'delicate androgynous features, soft facial features', { nat: 'with delicate, softly androgynous features', tags: ['andro', 'fem'], w: 0.9 }),
  o('fem', '女性的な美形', 'feminine facial features, pretty face', { nat: 'with a feminine, beautiful face while clearly remaining a man', tags: ['fem'], w: 0.7, desc: '女性的な顔立ちの男性。人物の性別タグは男性のまま維持します。' })
];

// ---------------- 体格 ----------------
export const BUILD: Option[] = [
  o('delicate', '華奢', 'slender delicate build, narrow shoulders', { nat: 'a slender, delicate build', tags: ['slim', 'delicate'], cat: 'slim' }),
  o('slim', '細身', 'slim build', { nat: 'a slim build', tags: ['slim'], cat: 'slim', w: 1.3 }),
  o('tall_slim', '長身細身', 'tall, slim build, long legs', { nat: 'a tall, slim figure with long legs', tags: ['slim', 'tall'], cat: 'slim', w: 1.3 }),
  o('average', '標準', 'average build', { nat: 'an average build', tags: ['average'], cat: 'average' }),
  o('toned', '引き締まった体', 'toned body, lean muscular build', { nat: 'a lean, toned body', tags: ['fit'], cat: 'fit', w: 1.3 }),
  o('athletic', '均整のとれた筋肉', 'athletic build, broad shoulders', { nat: 'an athletic build with broad shoulders', tags: ['fit', 'broad'], cat: 'fit', w: 1.1 }),
  o('muscular', '筋肉質', 'muscular male, broad shoulders, thick arms', { nat: 'a muscular build with broad shoulders and strong arms', tags: ['muscle', 'broad'], cat: 'muscle' }),
  o('burly', '大柄・重厚', 'large burly build, tall, broad chest', { nat: 'a tall, burly frame with a broad chest', tags: ['muscle', 'broad', 'tall'], cat: 'muscle', w: 0.7 }),
  o('huge', '筋骨隆々', 'extremely muscular build, massive shoulders', { nat: 'an extremely muscular, imposing physique', tags: ['muscle', 'broad'], cat: 'muscle', w: 0.5 })
];
export const BUILD_CATS: Category[] = [
  { id: 'slim', ja: '細身系' }, { id: 'average', ja: '標準' }, { id: 'fit', ja: '引き締まった系' }, { id: 'muscle', ja: '筋肉・大柄' }
];

// ---------------- 顔立ち（骨格・眉・鼻・口） ----------------
export const FACE: Option[] = [
  o('sharp_jaw', 'シャープな顎線', 'sharp jawline, defined cheekbones', { cat: 'sharp', tags: ['masc', 'sharp'] }),
  o('high_cheek', '高い頬骨とこけた頬', 'high cheekbones, hollow cheeks', { cat: 'sharp', tags: ['sharp', 'decadent'] }),
  o('aquiline', '鷲鼻の凛とした横顔', 'aquiline nose, strong profile', { cat: 'sharp', tags: ['masc', 'noble'] }),
  o('straight_nose', '通った鼻筋', 'straight nose bridge, defined jawline', { cat: 'refined', tags: ['refined'] }),
  o('oval_refined', '卵型の端正な顔', 'oval face, refined features', { cat: 'refined', tags: ['andro', 'refined'] }),
  o('sculpted', '彫刻のような左右対称', 'symmetrical face, sculpted features', { cat: 'refined', tags: ['refined', 'noble'] }),
  o('aristocratic', '高貴な顔立ち', 'aristocratic features, high nose bridge', { cat: 'refined', tags: ['noble', 'refined'] }),
  o('long_elegant', '面長で上品', 'long face, elegant features', { cat: 'refined', tags: ['refined'] }),
  o('deep_set', '彫りの深い顔', 'deep-set eyes, strong brow ridge, angular face', { cat: 'strong', tags: ['masc', 'strong'] }),
  o('square_jaw', '力強い角顎', 'square jaw, strong chin', { cat: 'strong', tags: ['masc', 'strong'] }),
  o('cleft_chin', '割れ顎', 'cleft chin, strong jaw', { cat: 'strong', tags: ['masc', 'strong'], w: 0.6 }),
  o('rugged', '野性味のある顔', 'rugged features, strong nose', { cat: 'strong', tags: ['masc', 'wild'] }),
  o('broad_face', '精悍な幅広の顔', 'broad face, strong cheekbones', { cat: 'strong', tags: ['masc', 'wild'], w: 0.7 }),
  o('weathered', '年輪を刻んだ顔', 'weathered handsome face, fine lines around the eyes', { cat: 'strong', tags: ['mature'], w: 0.6 }),
  o('thick_brows', '凛々しい太眉', 'thick eyebrows, straight eyebrows', { cat: 'brow', tags: ['masc'] }),
  o('low_brows', '低い直線眉と強い眼差し', 'low straight eyebrows, intense brow', { cat: 'brow', tags: ['masc', 'sharp'] }),
  o('arched_brows', '細く整った眉', 'thin arched eyebrows', { cat: 'brow', tags: ['refined', 'fem'] }),
  o('worried_brows', '困り眉', 'slightly drooping eyebrows', { cat: 'brow', tags: ['soft'] }),
  o('small_delicate', '小顔で繊細', 'small face, delicate features', { cat: 'soft', tags: ['fem', 'delicate'] }),
  o('soft_contour', '柔らかな輪郭', 'soft facial contours, gentle features', { cat: 'soft', tags: ['soft', 'andro'] }),
  o('pointed_chin', '逆三角の美形', 'inverted triangular face, pointed chin', { cat: 'soft', tags: ['andro', 'refined'] }),
  o('ethereal', '妖精めいた繊細な顔', 'ethereal features, fine features', { cat: 'soft', tags: ['ethereal', 'fem'] }),
  o('gentle_long', '優しい面長', 'gentle long face, soft jaw', { cat: 'soft', tags: ['soft'] }),
  o('full_lips', '色気のある厚めの唇', 'full lips, defined lips', { cat: 'mouth', tags: ['alluring'] }),
  o('thin_lips', '薄く冷ややかな唇', 'thin lips, refined mouth', { cat: 'mouth', tags: ['cold'] }),
  o('upturned_mouth', '口角の上がった口元', 'slightly upturned mouth corners', { cat: 'mouth', tags: ['warm'] }),
  o('dimples', 'えくぼ', 'dimples, gentle smile lines', { cat: 'mouth', tags: ['warm'], w: 0.7 }),
  o('gaunt', '痩せた頬の退廃美', 'gaunt cheeks, sharp cheekbones, pale face', { cat: 'sharp', tags: ['decadent', 'sharp'], w: 0.6 })
];
export const FACE_CATS: Category[] = [
  { id: 'sharp', ja: 'シャープ' }, { id: 'refined', ja: '端正・上品' }, { id: 'strong', ja: '精悍・力強い' },
  { id: 'soft', ja: '柔らか・繊細' }, { id: 'brow', ja: '眉の印象' }, { id: 'mouth', ja: '口元の印象' }
];

// ---------------- 目元・目つき ----------------
export const EYE_SHAPE: Option[] = [
  o('narrow_long', '切れ長', 'elongated eyes, narrow eyes', { cat: 'cool', tags: ['cool', 'sharp'] }),
  o('sharp', '鋭い目つき', 'sharp eyes, intense gaze', { cat: 'cool', tags: ['sharp', 'danger'] }),
  o('tsurime', 'つり目', 'upturned eyes', { cat: 'cool', tags: ['sharp'] }),
  o('piercing', '射抜くような眼差し', 'piercing gaze', { cat: 'cool', tags: ['sharp', 'danger'] }),
  o('cold_eyes', '冷ややかな目', 'cold eyes', { cat: 'cool', tags: ['cold'] }),
  o('sanpaku', '三白眼', 'sanpaku', { cat: 'cool', tags: ['danger', 'wild'], w: 0.7 }),
  o('jitome', 'ジト目', 'jitome', { cat: 'cool', tags: ['aloof'], w: 0.6 }),
  o('tareme', 'たれ目', 'downturned eyes, gentle eyes', { cat: 'soft', tags: ['soft', 'warm'] }),
  o('calm', '穏やかな目元', 'calm eyes, soft gaze', { cat: 'soft', tags: ['soft', 'warm'] }),
  o('large_clear', '大きく澄んだ目', 'large clear eyes', { cat: 'soft', tags: ['pure'] }),
  o('smiling_eyes', '笑うと細くなる目', 'smiling eyes', { cat: 'soft', tags: ['warm'] }),
  o('sparkling', '星を宿した瞳', 'sparkling eyes', { cat: 'soft', tags: ['pure', 'sunny'] }),
  o('almond', 'アーモンド型', 'almond-shaped eyes', { cat: 'shape', tags: ['refined'] }),
  o('double', 'くっきり二重', 'double eyelids, defined eyes', { cat: 'shape', tags: ['refined'] }),
  o('monolid', '一重の涼しい目元', 'monolid eyes', { cat: 'shape', tags: ['cool'] }),
  o('hooded', '奥二重', 'hooded eyes', { cat: 'shape', tags: ['cool'] }),
  o('deep_set_eyes', '彫りの深い目元', 'deep-set eyes', { cat: 'shape', tags: ['strong'] }),
  o('long_lashes', '長いまつ毛', 'long eyelashes', { cat: 'shape', tags: ['alluring', 'fem'] }),
  o('half_lidded', '半目がちで気だるげ', 'half-closed eyes, heavy-lidded eyes', { cat: 'mood', tags: ['alluring', 'decadent'] }),
  o('sleepy', '眠たげな目', 'sleepy eyes', { cat: 'mood', tags: ['aloof'] }),
  o('melancholic', '憂いを帯びた目', 'melancholic eyes', { cat: 'mood', tags: ['fragile'] }),
  o('tired', '隈のある目', 'dark circles under eyes, tired eyes', { cat: 'mood', tags: ['decadent', 'intellect'], w: 0.7 }),
  o('fierce', '獰猛な目つき', 'fierce eyes', { cat: 'mood', tags: ['wild', 'danger'] }),
  o('glowing', '光を帯びた瞳', 'glowing eyes', { cat: 'inhuman', tags: ['inhuman'], w: 0.6 }),
  o('slit_pupils', '縦長の瞳孔', 'slit pupils', { cat: 'inhuman', tags: ['inhuman'], w: 0.6 }),
  o('ringed', '輪を宿す神秘の瞳', 'ringed eyes', { cat: 'inhuman', tags: ['inhuman'], w: 0.4 })
];
export const EYE_SHAPE_CATS: Category[] = [
  { id: 'cool', ja: 'クール・鋭い' }, { id: 'soft', ja: '優しい・澄んだ' }, { id: 'shape', ja: '形・まぶた' },
  { id: 'mood', ja: '雰囲気のある目' }, { id: 'inhuman', ja: '人ならざる瞳' }
];

// ---------------- 瞳の色（移植：40色） ----------------
const NATURAL_EYES = new Set(['black', 'dark_brown', 'brown', 'amber', 'hazel', 'gray', 'blue_gray', 'sky_blue', 'blue', 'green', 'olive', 'gray_green', 'steel_blue', 'honey', 'gold_brown', 'pale_gray', 'navy', 'ice_blue']);
const eyeFamily = (id: string): string => {
  if (/black|brown|amber|hazel|honey|copper/.test(id)) return 'warm';
  if (/gold|yellow/.test(id)) return 'gold';
  if (/gray|silver|white/.test(id)) return 'mono';
  if (/blue|navy|sapphire|cyan|sky/.test(id)) return 'blue';
  if (/green|teal|emerald|mint|turquoise|seafoam|olive/.test(id)) return 'green';
  if (/red|crimson|burgundy|rose|pink|peach/.test(id)) return 'red';
  if (/violet|lavender|amethyst|lilac/.test(id)) return 'purple';
  return 'special';
};
export const EYE_COLOR: Option[] = cawField('irisColor').map((c) =>
  o(c.id, c.id === 'heterochromatic' ? 'オッドアイ（左右で異なる瞳色）' : c.ja, c.en, {
    hex: c.hex, cat: eyeFamily(c.id), natural: NATURAL_EYES.has(c.id), src: 'caw:irisColor',
    w: c.id === 'heterochromatic' ? 0.4 : c.id === 'white' ? 0.4 : 1,
    tags: [NATURAL_EYES.has(c.id) ? 'natural' : 'fantasy']
  })
);
export const EYE_COLOR_CATS: Category[] = [
  { id: 'warm', ja: '黒・茶・琥珀' }, { id: 'gold', ja: '金・黄' }, { id: 'mono', ja: '灰・銀・白' }, { id: 'blue', ja: '青系' },
  { id: 'green', ja: '緑系' }, { id: 'red', ja: '赤・桃系' }, { id: 'purple', ja: '紫系' }, { id: 'special', ja: '特殊' }
];

// ---------------- 髪の長さ ----------------
export const HAIR_LENGTH: Option[] = [
  o('very_short', 'ベリーショート', 'very short hair', { w: 0.6 }),
  o('short', 'ショート', 'short hair', { w: 1.5 }),
  o('medium', 'ミディアム', 'medium hair', { w: 1.3 }),
  o('long', 'ロング', 'long hair', { w: 1 }),
  o('very_long', '超ロング', 'very long hair', { w: 0.6 })
];

// ---------------- 髪型（長さ別の制約つき） ----------------
const VS = 'very_short', S = 'short', M = 'medium', L = 'long', VL = 'very_long';
const hs = (id: string, ja: string, en: string, lengths: string[], extra: Partial<Option> = {}) => o(id, ja, en, { lengths, ...extra });
export const HAIR_STYLE: Option[] = [
  // 短い
  hs('buzz_cut', '坊主風の刈り込み', 'buzz cut', [VS], { cat: 'short', tags: ['wild', 'military'], w: 0.6 }),
  hs('crew_cut', 'クルーカット', 'crew cut', [VS], { cat: 'short', tags: ['military', 'masc'] }),
  hs('textured_crop', 'テクスチャークロップ', 'textured crop haircut', [VS, S], { cat: 'short', tags: ['modern', 'street'] }),
  hs('fade_undercut', 'フェードのアンダーカット', 'undercut, fade haircut', [VS, S], { cat: 'short', tags: ['modern', 'street', 'danger'] }),
  hs('two_block', 'ツーブロック', 'two-block haircut', [VS, S], { cat: 'short', tags: ['modern'] }),
  hs('spiky_short', 'ツンツンの短髪', 'spiked hair', [VS, S], { cat: 'short', tags: ['wild', 'sunny'] }),
  hs('side_part', '七三分け', 'side part, neat hair', [S], { cat: 'short', tags: ['formal', 'intellect'] }),
  hs('comma_bangs', 'カンマヘア', 'swept bangs, curled bangs', [S], { cat: 'short', tags: ['modern', 'idol'] }),
  hs('mash', 'マッシュ', 'mushroom cut', [S], { cat: 'short', tags: ['modern', 'soft'] }),
  hs('center_part_short', 'センターパート', 'center part, short hair', [S], { cat: 'short', tags: ['modern'] }),
  hs('quiff', 'クイッフ', 'quiff', [S], { cat: 'short', tags: ['modern', 'formal'] }),
  hs('pompadour', 'ポンパドール', 'pompadour', [S], { cat: 'short', tags: ['retro'], w: 0.6 }),
  hs('wavy_short', 'ゆるいウェーブの短髪', 'short wavy hair', [S], { cat: 'short', tags: ['soft'] }),
  hs('curly_short', '癖毛の短髪', 'short curly hair', [S], { cat: 'short', tags: ['soft', 'warm'] }),
  hs('cornrows', 'コーンロウ', 'cornrows', [VS, S], { cat: 'short', tags: ['street'], w: 0.5 }),
  hs('afro', 'アフロ', 'afro', [S, M], { cat: 'short', tags: ['street', 'retro'], w: 0.4 }),
  // 長さを問わず使える前髪・まとまり
  hs('slicked_back', 'オールバック', 'slicked back hair', [S, M], { cat: 'swept', tags: ['formal', 'danger', 'noble'] }),
  hs('slicked_back_loose', '崩したオールバック', 'slicked back hair, loose strands, hair strand', [S, M, L], { cat: 'swept', tags: ['alluring', 'danger'] }),
  hs('messy_short', '無造作ヘア', 'messy hair', [S, M], { cat: 'swept', tags: ['casual'] }),
  hs('spiky_wild', '跳ねた癖っ毛', 'spiky hair, messy hair', [S, M], { cat: 'swept', tags: ['wild', 'sunny'] }),
  hs('bangs_eyes', '目にかかる前髪', 'hair between eyes', [S, M, L], { cat: 'swept', tags: ['cool', 'fragile'] }),
  hs('side_swept', '流した前髪', 'side-swept bangs', [S, M, L], { cat: 'swept', tags: ['refined'] }),
  hs('one_eye_covered', '片目隠れ', 'hair over one eye', [S, M, L, VL], { cat: 'swept', tags: ['mysterious', 'fragile'] }),
  hs('parted_bangs', '分けた前髪', 'parted bangs', [S, M, L, VL], { cat: 'swept', tags: ['refined'] }),
  hs('tucked', '耳かけ', 'hair behind ear', [M, L], { cat: 'swept', tags: ['refined', 'soft'] }),
  // ミディアム
  hs('wolf_cut', 'ウルフカット', 'wolf cut', [M], { cat: 'medium', tags: ['wild', 'modern'] }),
  hs('mullet', 'マレット', 'mullet', [S, M], { cat: 'medium', tags: ['wild', 'street'], w: 0.6 }),
  hs('shaggy', 'シャギー', 'shaggy hair', [M], { cat: 'medium', tags: ['casual', 'wild'] }),
  hs('curtain_bangs', 'カーテンバング', 'curtain bangs, center part', [M], { cat: 'medium', tags: ['modern', 'soft'] }),
  hs('nape_long', '襟足長め', 'long nape hair', [S, M], { cat: 'medium', tags: ['cool'] }),
  hs('tousled_medium', 'ふんわり無造作ミディアム', 'tousled hair', [M], { cat: 'medium', tags: ['soft', 'casual'] }),
  hs('wavy_medium', 'ウェーブのミディアム', 'wavy hair', [M, L], { cat: 'medium', tags: ['soft', 'alluring'] }),
  hs('short_ponytail', '短い結び髪', 'short ponytail', [M], { cat: 'medium', tags: ['casual'] }),
  hs('half_up_small', '小さなハーフアップ', 'half updo', [M, L], { cat: 'medium', tags: ['soft', 'modern'] }),
  hs('braided_side', 'サイドの編み込み', 'braided hair, side braid', [M, L], { cat: 'medium', tags: ['fantasy', 'refined'] }),
  hs('dreadlocks', 'ドレッドロックス', 'dreadlocks', [M, L], { cat: 'medium', tags: ['street', 'wild'], w: 0.4 }),
  // ロング
  hs('low_ponytail', '低い位置の一つ結び', 'low ponytail', [M, L, VL], { cat: 'long', tags: ['refined', 'noble'] }),
  hs('high_ponytail', '高いポニーテール', 'high ponytail', [L, VL], { cat: 'long', tags: ['warrior'] }),
  hs('topknot', '総髪の髷', 'topknot', [L, VL], { cat: 'long', tags: ['eastern', 'warrior'], w: 0.6 }),
  hs('half_up_long', '長髪ハーフアップ', 'half updo, long hair', [L, VL], { cat: 'long', tags: ['noble', 'refined'] }),
  hs('long_straight', '流れるストレート', 'long straight hair', [L, VL], { cat: 'long', tags: ['refined', 'ethereal'] }),
  hs('ribbon_tied', 'リボンで結んだ長髪', 'hair ribbon, low-tied long hair', [L, VL], { cat: 'long', tags: ['noble', 'refined'] }),
  hs('single_braid', '背中の一本三つ編み', 'single braid', [L, VL], { cat: 'long', tags: ['refined', 'fantasy'] }),
  hs('side_braid_long', '肩に流した三つ編み', 'braid over shoulder', [L, VL], { cat: 'long', tags: ['soft', 'fantasy'] }),
  hs('long_wavy', '長いウェーブ', 'long wavy hair', [L, VL], { cat: 'long', tags: ['alluring', 'noble'] }),
  hs('messy_long', '無造作な長髪', 'messy long hair', [L], { cat: 'long', tags: ['wild', 'decadent'] }),
  hs('hair_bun', 'まとめ髪', 'hair bun', [M, L, VL], { cat: 'long', tags: ['eastern', 'refined'] }),
  hs('crown_bun', '冠でまとめた髪', 'hair bun, hair crown', [L, VL], { cat: 'long', tags: ['eastern', 'noble'], w: 0.6 }),
  hs('long_layered', '段の入った長髪', 'long layered hair', [L], { cat: 'long', tags: ['modern', 'alluring'] }),
  // 超ロング
  hs('very_long_straight', '腰まで届くストレート', 'very long straight hair', [VL], { cat: 'very_long', tags: ['ethereal', 'noble'] }),
  hs('floor_length', '床まで届く長髪', 'absurdly long hair', [VL], { cat: 'very_long', tags: ['ethereal', 'inhuman'], w: 0.6 }),
  hs('flowing', '風になびく長髪', 'flowing hair, floating hair', [L, VL], { cat: 'very_long', tags: ['ethereal', 'dynamic'] }),
  hs('very_long_low_tail', '長い一つ結び', 'very long ponytail, low ponytail', [VL], { cat: 'very_long', tags: ['refined', 'warrior'] }),
  hs('twin_braids_long', '二本の長い三つ編み', 'twin braids', [L, VL], { cat: 'very_long', tags: ['fantasy'], w: 0.5 })
];
export const HAIR_STYLE_CATS: Category[] = [
  { id: 'short', ja: '短髪スタイル' }, { id: 'swept', ja: '前髪・流れ' }, { id: 'medium', ja: 'ミディアム' },
  { id: 'long', ja: 'ロング・結び' }, { id: 'very_long', ja: '超ロング' }
];

// ---------------- 髪色（移植：48色） ----------------
const NATURAL_HAIR = new Set(['black', 'blue_black', 'soft_black', 'dark_brown', 'brown', 'light_brown', 'ash_brown', 'chestnut', 'auburn', 'copper', 'gold', 'blonde', 'platinum', 'white', 'gray', 'ash_blonde', 'honey_blonde', 'strawberry_blonde', 'champagne', 'charcoal', 'smoky_gray', 'red']);
const hairFamily = (id: string): string => {
  if (/black|charcoal/.test(id) && !/blue_black/.test(id)) return 'black';
  if (id === 'blue_black') return 'black';
  if (/brown|chestnut|auburn|beige/.test(id)) return 'brown';
  if (/blonde|gold|champagne|platinum/.test(id)) return 'blonde';
  if (/silver|white|gray|pearl/.test(id)) return 'silver';
  if (/red|crimson|copper|orange|burgundy/.test(id)) return 'red';
  if (/blue|navy|cyan|teal/.test(id)) return 'blue';
  if (/green|olive|mint/.test(id)) return 'green';
  if (/purple|lavender|lilac/.test(id)) return 'purple';
  return 'pink';
};
export const HAIR_COLOR: Option[] = cawField('hairColor').map((c) =>
  o(c.id, c.ja, c.en, {
    hex: c.hex, cat: hairFamily(c.id), natural: NATURAL_HAIR.has(c.id), src: 'caw:hairColor',
    tags: [NATURAL_HAIR.has(c.id) ? 'natural' : 'fantasy', hairFamily(c.id)],
    w: ['black', 'silver', 'white', 'blonde', 'dark_brown', 'blue_black'].includes(c.id) ? 1.4 : 1
  })
);
export const HAIR_COLOR_CATS: Category[] = [
  { id: 'black', ja: '黒髪系' }, { id: 'brown', ja: '茶髪系' }, { id: 'blonde', ja: '金髪系' }, { id: 'silver', ja: '銀・白・灰' },
  { id: 'red', ja: '赤・橙' }, { id: 'blue', ja: '青系' }, { id: 'green', ja: '緑系' }, { id: 'purple', ja: '紫系' }, { id: 'pink', ja: '桃・ローズ' }
];
/** 短い日本語（タイトル用）："銀髪" "黒髪" など */
export function hairColorShort(opt: Option): string {
  return opt.ja.replace(/の髪$/, '髪').replace(/^(.+)の(.+)髪$/, '$1$2髪');
}

// ---------------- 髪の配色拡張（任意） ----------------
export const HAIR_ACCENT: Option[] = [
  o('none', '単色', [], { w: 0.6 }),
  o('gradient', 'グラデーション', 'gradient hair', { desc: '根元から毛先へ' }),
  o('tips', '毛先だけ別色', 'colored tips'),
  o('streaks', 'メッシュ', 'streaked hair'),
  o('inner', 'インナーカラー', 'colored inner hair'),
  o('two_tone', 'ツートン', 'two-tone hair'),
  o('split', '左右で別色', 'split-color hair', { w: 0.5 })
];

// ---------------- 肌（移植：12色＋指定なし） ----------------
export const SKIN: Option[] = [
  o('unspecified', '指定しない', [], { w: 5, desc: 'モデルの既定に任せます。' }),
  ...cawField('skinTone').map((c) => o(c.id, c.ja, c.en, { src: 'caw:skinTone' }))
];

// ---------------- 固有の特徴 ----------------
export const MARKS: Option[] = [
  o('none', 'なし', [], { w: 10 }),
  o('mole_under_eye', '泣きぼくろ', 'mole under eye', { tags: ['alluring'], w: 2 }),
  o('mole_mouth', '口元のほくろ', 'mole under mouth', { tags: ['alluring'] }),
  o('mole_neck', '首筋のほくろ', 'mole on neck', { tags: ['alluring'], w: 0.6 }),
  o('freckles', 'そばかす', 'freckles', { tags: ['warm'], w: 0.6 }),
  o('scar_eye', '目元を横切る傷', 'scar across eye', { tags: ['warrior', 'danger'] }),
  o('scar_cheek', '頬の古傷', 'scar on cheek', { tags: ['warrior'] }),
  o('scar_nose', '鼻筋の傷', 'scar on nose', { tags: ['warrior', 'wild'], w: 0.6 }),
  o('eyepatch', '眼帯', 'eyepatch', { tags: ['danger', 'warrior'], w: 0.6 }),
  o('earrings', '耳飾り', 'earrings', { tags: ['alluring', 'noble'] }),
  o('single_earring', '片耳のピアス', 'single earring', { tags: ['street', 'danger'] }),
  o('ear_piercings', '耳に複数のピアス', 'ear piercing', { tags: ['street'], w: 0.7 }),
  o('ear_cuff', 'イヤーカフ', 'ear cuff', { tags: ['modern'] }),
  o('facial_mark', '目元の紋様', 'facial mark', { tags: ['mystic', 'inhuman'], w: 0.6 }),
  o('forehead_mark', '額の紋', 'forehead mark', { tags: ['mystic', 'sacred'], w: 0.6 }),
  o('pointy_ears', '尖った耳（エルフ風）', 'pointy ears', { tags: ['inhuman', 'fantasy'], w: 0.7 }),
  o('bandage', '頬の絆創膏', 'bandaid on face', { tags: ['casual', 'sunny'], w: 0.5 }),
  o('neck_tattoo', '首筋のタトゥー', 'neck tattoo', { tags: ['danger', 'street'], w: 0.5 })
];

// ---------------- 眼鏡 ----------------
export const GLASSES: Option[] = [
  o('none', 'なし', [], { w: 10 }),
  o('round', '丸眼鏡', 'round eyewear', { tags: ['intellect', 'soft'], src: 'caw:glassesShape' }),
  o('rectangular', '角ばった眼鏡', 'rectangular eyewear', { tags: ['intellect'], src: 'caw:glassesShape' }),
  o('thin_metal', '細いメタルフレーム', 'thin-framed eyewear', { tags: ['intellect', 'cold'] }),
  o('rimless', 'リムレス', 'rimless eyewear', { tags: ['intellect', 'cold'], src: 'caw:glassesShape' }),
  o('half_rim', 'ハーフリム', 'semi-rimless eyewear', { tags: ['intellect'] }),
  o('black_frame', '黒縁眼鏡', 'black-framed eyewear', { tags: ['intellect', 'casual'] }),
  o('browline', 'ブローライン', 'browline eyewear', { tags: ['intellect', 'retro'], src: 'caw:glassesShape' }),
  o('monocle', '片眼鏡', 'monocle', { tags: ['noble', 'retro', 'intellect'], w: 0.6 }),
  o('sunglasses', 'サングラス', 'sunglasses', { tags: ['danger', 'street'], w: 0.7 }),
  o('tinted', '色付きレンズ', 'tinted eyewear', { tags: ['danger', 'alluring'], w: 0.6 })
];

// ---------------- ひげ（任意・既定OFF） ----------------
export const FACIAL_HAIR: Option[] = [
  o('none', 'なし', [], { w: 2 }),
  o('stubble', '無精ひげ', 'stubble', { tags: ['wild', 'mature'] }),
  o('short_beard', '短く整えた顎ひげ', 'short beard', { tags: ['mature'] }),
  o('goatee', '顎先のひげ', 'goatee', { tags: ['danger'] }),
  o('mustache', '口ひげ', 'mustache', { tags: ['mature', 'noble'] }),
  o('full_beard', '豊かなひげ', 'full beard', { tags: ['mature', 'wild'], w: 0.7 }),
  o('sideburns', 'もみあげ', 'sideburns', { tags: ['retro'] })
];
