/* 項目レジストリ：UIのカード・抽選順・出力の起点 */
import type { FieldDef, FieldId, Option } from '../types';
import { AGE, AGE_CUE, AGE_CUE_CATS, BUILD, BUILD_CATS, EYE_COLOR, EYE_COLOR_CATS, EYE_SHAPE, EYE_SHAPE_CATS, FACE, FACE_CATS, FACIAL_HAIR, FRINGE, GLASSES, HAIR_ACCENT, HAIR_COLOR, HAIR_COLOR_CATS, HAIR_LENGTH, HAIR_STYLE, HAIR_STYLE_CATS, HAIR_TEXTURE, HAIR_TEXTURE_CATS, MARKS, PRESENTATION, SKIN } from './appearance';
import { ARCHETYPE, ARCHETYPE_CATS } from './archetypes';
import { COLOR, COLOR_CATS } from './colors';
import { KEMONO_CATS, KEMONO_LEVEL, KEMONO_SPECIES } from './kemono';
import { NAME, NAME_CATS } from './names';
import { FABRIC, OUTFIT, OUTFIT_CATS, OUTFIT_DETAIL, OUTFIT_DETAIL_CATS } from './outfits';
import { ANGLE, GAZE, GAZE_CATS, HEAD_POSE, POSE, POSE_CATS, PROP, SHOT } from './pose';
import { AURA, EXPRESSION, EXPRESSION_CATS, OCCUPATION, OCCUPATION_CATS } from './roles';
import { LIGHT, SCENE, SCENE_CATS, TIME } from './scene';
import { ART_STYLE } from './style';
import { CULTURE, CULTURE_CATS, WORLD, WORLD_CATS } from './worlds';
import { ANCHOR, BIND_POS, BLINDFOLD, DISARRAY, RESTRAINT, ROLE, TIGHTNESS, WEAR, WEAR_CATS } from './forbidden';

/** 辞書のバージョン。候補IDを削除・改名したら上げ、storage の migration に対応を書く。
 * 候補を足しただけでも同じシードの結果が変わるので上げる（2026.10.13：大規模増築。既存IDの削除・改名はなし） */
export const DATA_VERSION = '2026.10.13';

export const FIELDS: FieldDef[] = [
  // ---- 基本パネル ----
  { id: 'age', ja: '年齢層', icon: '⌛', group: 'basic', options: AGE, hint: '成人のみ。' },
  { id: 'archetype', ja: '美形タイプ', icon: '✦', group: 'basic', options: ARCHETYPE, categories: ARCHETYPE_CATS },
  { id: 'presentation', ja: '容姿傾向', icon: '◐', group: 'basic', options: PRESENTATION, hint: '男性キャラクターの見た目の印象。性別・人数は変わりません。' },
  { id: 'build', ja: '体格', icon: '⛉', group: 'basic', options: BUILD, categories: BUILD_CATS },
  { id: 'world', ja: '世界観', icon: '⌂', group: 'basic', options: WORLD, categories: WORLD_CATS },
  { id: 'culture', ja: '文化・意匠モチーフ', short: '意匠', icon: '❖', group: 'basic', options: CULTURE, categories: CULTURE_CATS, hint: '衣装・装飾の意匠にだけ反映します。肌や顔立ちとは結び付けません。' },
  { id: 'hairLength', ja: '髪の長さ', icon: '≋', group: 'basic', options: HAIR_LENGTH },
  { id: 'hairStyle', ja: '髪型', icon: '〰', group: 'basic', options: HAIR_STYLE, categories: HAIR_STYLE_CATS, hint: '髪の長さに合う髪型だけが出ます。' },
  { id: 'hairColor', ja: '髪の色', icon: '●', group: 'basic', options: HAIR_COLOR, categories: HAIR_COLOR_CATS },
  { id: 'eyeShape', ja: '目元・目つき', short: '目元', icon: '◉', group: 'basic', options: EYE_SHAPE, categories: EYE_SHAPE_CATS },
  { id: 'eyeColor', ja: '瞳の色', icon: '◎', group: 'basic', options: EYE_COLOR, categories: EYE_COLOR_CATS },
  { id: 'outfit', ja: '衣装', icon: '♜', group: 'basic', options: OUTFIT, categories: OUTFIT_CATS },
  { id: 'expression', ja: '表情', icon: '☺', group: 'basic', options: EXPRESSION, categories: EXPRESSION_CATS },
  // ---- 詳細：顔・肌 ----
  { id: 'face', ja: '顔立ち', icon: '◇', group: 'face', options: FACE, categories: FACE_CATS },
  { id: 'skin', ja: '肌の色', icon: '◍', group: 'face', options: SKIN, hint: '民族・地域とは連動させません。' },
  { id: 'marks', ja: '特徴（ほくろ・傷・耳飾り）', short: '特徴', icon: '⁘', group: 'face', module: 'marks', options: MARKS },
  { id: 'glasses', ja: '眼鏡', icon: '◫', group: 'face', module: 'glasses', options: GLASSES },
  { id: 'facialHair', ja: 'ひげ', icon: '﹌', group: 'face', module: 'facialHair', options: FACIAL_HAIR },
  { id: 'hairAccent', ja: '髪の配色', icon: '◑', group: 'face', module: 'hairAccent', options: HAIR_ACCENT },
  { id: 'hairAccentColor', ja: '髪の差し色', icon: '◒', group: 'face', module: 'hairAccent', options: HAIR_COLOR, categories: HAIR_COLOR_CATS },
  { id: 'ageCue', ja: '年齢の表れ', icon: '⌇', group: 'face', module: 'ageCue', options: AGE_CUE, categories: AGE_CUE_CATS, hint: '目尻の皺・こめかみの白髪など、年齢を感じさせる細部を1つだけ。年齢層だけで皺や白髪を強制しません。18〜24歳では付けません。' },
  // ---- 任意：髪の細部（2026-10 増築）----
  { id: 'hairTexture', ja: '髪質', icon: '≈', group: 'hair', module: 'hairTexture', options: HAIR_TEXTURE, categories: HAIR_TEXTURE_CATS, hint: '髪型・長さはそのまま、直毛・ウェーブ・巻き毛・コイルなどの質感を足します。髪型と系統が違う髪質は出ません。' },
  { id: 'fringe', ja: '前髪・分け目', short: '前髪', icon: '⌒', group: 'hair', module: 'fringe', options: FRINGE, hint: '前髪まで決まっている髪型（七三・センターパート・オールバックなど）のときは「指定しない」になります。' },
  // ---- 詳細：役割・雰囲気・色 ----
  { id: 'occupation', ja: '職業・立場', short: '職業', icon: '♔', group: 'role', options: OCCUPATION, categories: OCCUPATION_CATS, hint: '画像には直接描きにくいため、衣装と持ち物の傾向に使います。' },
  { id: 'aura', ja: '雰囲気', icon: '✧', group: 'role', options: AURA },
  { id: 'mainColor', ja: '衣装メインカラー', short: 'メイン色', icon: '■', group: 'role', options: COLOR, categories: COLOR_CATS },
  { id: 'accentColor', ja: '差し色', icon: '▪', group: 'role', options: COLOR, categories: COLOR_CATS },
  // ---- 任意：衣装の細部・素材（2026-10 増築）----
  { id: 'outfitDetail', ja: '衣装の細部', short: '細部', icon: '✣', group: 'wear', module: 'outfitDetail', options: OUTFIT_DETAIL, categories: OUTFIT_DETAIL_CATS, hint: 'ポケットチーフ・袖口・装身具など。衣装にその部位がないとき・画角で見えないときは出ません。' },
  { id: 'fabric', ja: '素材', icon: '▦', group: 'wear', module: 'fabric', options: FABRIC, hint: '同じ衣装を質感で見分けます。レザージャケットなど素材が決まっている服は、その素材だけ。鎧・コスプレ衣装には付けません。' },
  // ---- 詳細：ポーズ・構図 ----
  { id: 'shot', ja: '構図（画角）', short: '構図', icon: '▣', group: 'pose', options: SHOT },
  { id: 'angle', ja: 'アングル', icon: '⟋', group: 'pose', module: 'pose', options: ANGLE },
  { id: 'pose', ja: 'ポーズ', icon: '☍', group: 'pose', module: 'pose', options: POSE, categories: POSE_CATS },
  { id: 'prop', ja: '持ち物', icon: '⚚', group: 'pose', module: 'prop', options: PROP },
  { id: 'gaze', ja: '視線', icon: '◔', group: 'pose', module: 'gaze', options: GAZE, categories: GAZE_CATS, hint: 'ポーズと別に視線を決めます。選ぶとポーズの「こちらを見る」などを置き換え、視線のタグを2つ出しません。目を閉じた表情・目隠しとは組みません。' },
  { id: 'headPose', ja: '頭の向き', short: '頭', icon: '◑', group: 'pose', module: 'headPose', options: HEAD_POSE, hint: '人物の頭・首の向き。カメラの「アングル」とは別です。横顔や見上げるポーズでは、合う向きだけが出ます。' },
  // ---- 詳細：背景・光 ----
  { id: 'scene', ja: '背景', icon: '⛰', group: 'scene', module: 'background', options: SCENE, categories: SCENE_CATS },
  { id: 'time', ja: '時間帯・天候', short: '時間', icon: '☾', group: 'scene', module: 'background', options: TIME },
  { id: 'light', ja: '光・演出', short: '光', icon: '☀', group: 'scene', module: 'background', options: LIGHT },
  // ---- 任意：獣人 ----
  { id: 'kemonoSpecies', ja: '獣人の種族', short: '種族', icon: '🐾', group: 'kemono', module: 'kemono', options: KEMONO_SPECIES, categories: KEMONO_CATS },
  { id: 'kemonoLevel', ja: '獣化の度合い', short: '獣化', icon: '⇡', group: 'kemono', module: 'kemono', options: KEMONO_LEVEL },
  // ---- 任意：禁断の調合（アンリミテッドモード。既定OFF）----
  { id: 'role', ja: '立場', icon: '⛓', group: 'forbidden', module: 'unlimited', options: ROLE, hint: '人物は1名のまま。相手は描きません。表情と拘束の出やすさに影響します。' },
  { id: 'restraint', ja: '拘束具', icon: '➰', group: 'forbidden', module: 'unlimited', options: RESTRAINT, hint: '触手・蔓・光の鎖などは幻想系の世界観で出やすくなります。' },
  { id: 'bindPos', ja: '拘束位置', short: '位置', icon: '✋', group: 'forbidden', module: 'unlimited', options: BIND_POS, hint: '首への拘束は扱いません。「する側」は手に持つ・操るになります。' },
  { id: 'anchor', ja: '固定先', icon: '⚓', group: 'forbidden', module: 'unlimited', options: ANCHOR },
  { id: 'tightness', ja: '締め方', icon: '〰', group: 'forbidden', module: 'unlimited', options: TIGHTNESS },
  { id: 'blindfold', ja: '目隠し・視界', short: '目隠し', icon: '◡', group: 'forbidden', module: 'unlimited', options: BLINDFOLD, hint: '目が隠れる目隠しでは、目元・瞳の色と「こちらを見る」ポーズを出力しません。' },
  { id: 'disarray', ja: '衣装の乱れ', short: '着崩し', icon: '⌇', group: 'forbidden', module: 'unlimited', options: DISARRAY, hint: '衣装にネクタイ・ジャケット・フードなどがあるときだけ、その乱れが出ます。' },
  { id: 'wear1', ja: '衣装の状態①', short: '状態①', icon: '✂', group: 'forbidden', module: 'unlimited', options: WEAR, categories: WEAR_CATS, hint: '汚れ・損傷・濡れ。最大2件まで重ねられます。' },
  { id: 'wear2', ja: '衣装の状態②', short: '状態②', icon: '✂', group: 'forbidden', module: 'unlimited', options: WEAR, categories: WEAR_CATS, hint: '①があるときだけ使えます。濡れは1件までです。' },
  // ---- 任意：画風・名前 ----
  { id: 'artStyle', ja: '画風', icon: '✎', group: 'style', options: ART_STYLE, randomizable: false, hint: '通常の抽選では変わりません。選んだ画風を維持します。' },
  { id: 'name', ja: '呼び名', icon: '✐', group: 'style', module: 'name', options: NAME, categories: NAME_CATS, hint: '画像プロンプトには含めません。保存名や日本語設定に使います。' }
];

/** 抽選順（上位条件 → 人物 → 衣装 → 表情・構図 → 背景） */
export const DRAW_ORDER: FieldId[] = [
  'world', 'culture', 'archetype', 'age', 'presentation', 'build', 'occupation', 'aura',
  'face', 'eyeShape', 'eyeColor', 'skin', 'marks', 'glasses', 'facialHair',
  'hairLength', 'hairStyle', 'hairTexture', 'fringe', 'hairColor', 'hairAccent', 'hairAccentColor',
  // 年齢の表れは髪色（白髪）を見てから引く
  'ageCue',
  'outfit', 'mainColor', 'accentColor',
  'role', 'restraint', 'bindPos', 'anchor', 'tightness', 'blindfold', 'disarray',
  'expression', 'shot', 'angle', 'pose', 'prop',
  // 視線・頭の向きはポーズ・目隠しを見てから引く
  'gaze', 'headPose',
  'scene', 'time', 'light',
  // 衣装の状態は天候（雨・雪）を見てから引く
  'wear1', 'wear2',
  // 衣装の細部・素材は、衣装・画角・禁断演出（着崩し・衣装の状態）が決まってから引く
  'outfitDetail', 'fabric',
  'kemonoSpecies', 'kemonoLevel', 'artStyle', 'name'
];

export const BASIC_FIELDS = FIELDS.filter((f) => f.group === 'basic').map((f) => f.id);

const FIELD_MAP = new Map(FIELDS.map((f) => [f.id, f]));
const OPTION_MAP = new Map<FieldId, Map<string, Option>>(FIELDS.map((f) => [f.id, new Map(f.options.map((o) => [o.id, o]))]));

export function fieldDef(id: FieldId): FieldDef {
  const f = FIELD_MAP.get(id);
  if (!f) throw new Error(`unknown field ${id}`);
  return f;
}
export function optionOf(field: FieldId, id: string | null | undefined): Option | undefined {
  if (!id) return undefined;
  return OPTION_MAP.get(field)?.get(id);
}

/** 既定値（初回の抽選前の仮値。必ずすぐ抽選で上書きされる） */
export const DEFAULT_IDS: Partial<Record<FieldId, string>> = {
  role: 'none', restraint: 'none', bindPos: 'none', anchor: 'none', tightness: 'loose', blindfold: 'none', disarray: 'none', wear1: 'none', wear2: 'none',
  artStyle: 'none', hairAccent: 'none', facialHair: 'none', glasses: 'none', marks: 'none', prop: 'none', culture: 'none', occupation: 'none', skin: 'unspecified', angle: 'eye_level',
  // 2026-10 増築の任意項目。旧データでは「なし」（開いても見た目が変わらない）
  ageCue: 'none', hairTexture: 'none', fringe: 'none', gaze: 'none', headPose: 'none', outfitDetail: 'none', fabric: 'none'
};

/** 関連項目（競合の解消で「まとめて引き直す」候補） */
export const RELATED: Partial<Record<FieldId, FieldId[]>> = {
  hairLength: ['hairStyle', 'hairTexture', 'fringe'], hairStyle: ['hairLength', 'hairTexture', 'fringe'],
  pose: ['shot', 'prop', 'expression', 'glasses', 'outfit', 'gaze', 'headPose'], shot: ['pose', 'bindPos', 'anchor', 'outfitDetail'], prop: ['pose', 'bindPos', 'gaze'],
  expression: ['pose', 'gaze'], glasses: ['pose', 'blindfold'], outfit: ['culture', 'pose', 'outfitDetail', 'fabric'], culture: ['outfit'],
  // 2026-10 増築の任意項目
  ageCue: ['age', 'hairColor'], hairTexture: ['hairStyle', 'hairLength'], fringe: ['hairStyle', 'hairLength'],
  gaze: ['pose', 'expression', 'headPose'], headPose: ['pose', 'gaze'], outfitDetail: ['outfit', 'shot'], fabric: ['outfit'],
  time: ['scene', 'light'], scene: ['time'], light: ['time'],
  mainColor: ['accentColor'], accentColor: ['mainColor'],
  hairColor: ['hairAccentColor'], hairAccentColor: ['hairColor'],
  marks: ['kemonoSpecies', 'glasses'], kemonoSpecies: ['marks'],
  role: ['bindPos', 'expression', 'blindfold', 'scene'], angle: ['pose', 'blindfold'], tightness: ['bindPos'], restraint: ['bindPos', 'anchor', 'tightness'], bindPos: ['restraint', 'anchor', 'tightness', 'pose', 'prop', 'role', 'shot'], anchor: ['bindPos', 'shot', 'pose'],
  blindfold: ['pose', 'glasses', 'marks', 'hairStyle', 'angle'], disarray: ['outfit', 'pose', 'bindPos'], wear1: ['wear2', 'outfit'], wear2: ['wear1', 'outfit']
};
