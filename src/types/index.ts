/* 美青年錬成ガチャ — 共通スキーマ
 * データ（辞書）とエンジンはこの型だけで結合する。
 */

export type Mode = 'coherent' | 'balanced' | 'wild';
export type OutputTarget = 'pixai' | 'novelai' | 'genericTags' | 'naturalEnglish' | 'japanese';

/** 構図の広さ（小さいほど寄り）。ポーズの最低限の画角と比較する。 */
export type ShotLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** 辞書の1候補。フィールド固有の属性は任意プロパティとして持つ。 */
export interface Option {
  id: string;
  ja: string;
  /** 英語タグ（タグ形式で使う。カンマで分けない単位） */
  en: string[];
  /** 自然文で使う英語句（省略時は en を連結） */
  nat?: string;
  /** 大分類 */
  cat?: string;
  /** 小分類 */
  sub?: string;
  /** 日本語の短い説明 */
  desc?: string;
  /** 基本の重み（省略時1） */
  w?: number;
  /** 意味タグ（相性判定・プリセット用） */
  tags?: string[];
  /** 色見本 */
  hex?: string;
  /** 出典メモ（移植元） */
  src?: string;

  // ---- フィールド固有 ----
  /** 世界観との相性（soft）。空なら全世界観で中立 */
  worlds?: string[];
  /** 髪型：使える長さ */
  lengths?: string[];
  /** ポーズ：必要な最小画角 */
  minShot?: ShotLevel;
  /** ポーズ：自由に使える手の数 / 持ち物：必要な手の数 */
  hands?: number;
  /** ポーズ：視線がこちら向き */
  gazeViewer?: boolean;
  /** ポーズ：姿勢 */
  posture?: string;
  /** 表情：目を閉じる */
  eyesClosed?: boolean;
  /** 構図：画角レベル */
  level?: ShotLevel;
  /** 背景：屋内／屋外／半屋外／シンプル */
  place?: 'indoor' | 'outdoor' | 'semi' | 'simple';
  /** 時間帯：昼／夜 */
  daylight?: 'day' | 'night' | 'twilight';
  /** 天候：屋外でのみ成立 */
  outdoorOnly?: boolean;
  /** 光：成立する時間帯 */
  needs?: Array<'day' | 'night' | 'twilight'>;
  /** 衣装：伝統衣装としての文化圏（文化モチーフとの hard 制約） */
  culture?: string;
  /** 衣装：上半身側の描写（寄りの構図で使う） */
  upper?: string;
  /** 衣装：下半身・足元の描写（寄りの構図では省略） */
  lower?: string;
  /** 衣装：自然文 */
  outfitNat?: string;
  /** 色：自然色か（髪色） */
  natural?: boolean;
  /** 獣人：種族データ */
  kemono?: KemonoSpecies;
  /** 年齢：年齢の下限（年齢層） */
  ageMin?: number;
  /** 美形アーキタイプ：好みの傾向 */
  prefs?: Partial<Record<FieldId, string[]>>;
  /** 職業：衣装の好み（#tag or id） */
  outfitPrefs?: string[];
  /** 名前候補の系統 */
  nameSystem?: string;
  /**
   * 成立に必要な他項目（hard）。'field:#tag'（タグを持つ）/ 'field:id' / 'field:!none'（なし以外）。
   * 例：眼鏡を押し上げるポーズ → ['glasses:!none']
   */
  requires?: string[];
}

export interface KemonoSpecies {
  group: 'mammal' | 'bird' | 'reptile' | 'aquatic';
  /** 獣化レベル別の英語タグ（1:ケモミミ 2:軽度 3:標準） */
  lv: Record<1 | 2 | 3, string[]>;
  /** 日本語の部位説明（レベル別） */
  partsJa: Record<1 | 2 | 3, string[]>;
}

export interface Category {
  id: string;
  ja: string;
  subs?: Array<{ id: string; ja: string }>;
}

export type FieldGroup = 'basic' | 'face' | 'role' | 'pose' | 'scene' | 'kemono' | 'style';
export type ModuleId = 'pose' | 'background' | 'kemono' | 'facialHair' | 'hairAccent' | 'name';

export const FIELD_IDS = [
  'age', 'archetype', 'presentation', 'build', 'world', 'culture',
  'hairLength', 'hairStyle', 'hairColor', 'eyeShape', 'eyeColor', 'outfit', 'expression',
  'face', 'skin', 'marks', 'glasses', 'facialHair', 'hairAccent', 'hairAccentColor',
  'occupation', 'aura', 'mainColor', 'accentColor',
  'pose', 'prop', 'shot', 'angle',
  'scene', 'time', 'light',
  'kemonoSpecies', 'kemonoLevel',
  'artStyle', 'name'
] as const;
export type FieldId = (typeof FIELD_IDS)[number];

export interface FieldDef {
  id: FieldId;
  ja: string;
  short?: string;
  icon: string;
  group: FieldGroup;
  module?: ModuleId;
  options: Option[];
  categories?: Category[];
  /** false なら通常の抽選対象外（手動で選ぶ設定値） */
  randomizable?: boolean;
  /** 説明 */
  hint?: string;
}

export interface Selection {
  id: string | null;
  source: 'random' | 'manual' | 'preset';
  locked: boolean;
}

export interface ForgeSettings {
  coherence: Mode;
  outputTarget: OutputTarget;
  /** 固定シード（空なら毎回ランダム） */
  seed: string;
  keepRecentCount: number;
  compact: boolean;
  negative: boolean;
  quality: boolean;
  emphasis: boolean;
  freeTags: string;
  loraText: string;
  boyTag: '1boy' | 'none';
}

export interface ForgeModules {
  kemonoEnabled: boolean;
  backgroundEnabled: boolean;
  poseEnabled: boolean;
  facialHairEnabled: boolean;
  hairAccentEnabled: boolean;
  nameEnabled: boolean;
}

/** おまかせスタイル（抽選の方向性。選ぶだけでは結果を変えない） */
export interface StylePreset {
  id: string;
  ja: string;
  desc: string;
  icon: string;
  /** 抽選時に候補を絞る条件。id / #タグ / cat:大分類 */
  filters: Partial<Record<FieldId, string[]>>;
  /** 抽選前に有効化する任意モジュール */
  modules?: Partial<ForgeModules>;
}

export interface ForgeState {
  schemaVersion: number;
  dataVersion: string;
  fields: Record<FieldId, Selection>;
  settings: ForgeSettings;
  optionalModules: ForgeModules;
  /** 直前の抽選に使ったシード */
  lastSeed: string;
  /** 抽選回数（表示用） */
  drawCount: number;
}

export type ConstraintLevel = 'hard' | 'soft' | 'suggestion';

export interface Issue {
  id: string;
  level: ConstraintLevel;
  fields: FieldId[];
  titleJa: string;
  messageJa: string;
}

export interface DrawConflict {
  fields: FieldId[];
  reasonJa: string;
  /** 解除候補（ロック中の項目） */
  unlockCandidates: FieldId[];
}

export interface DrawResult {
  ok: boolean;
  state: ForgeState;
  notices: string[];
  conflicts: DrawConflict[];
  changed: FieldId[];
}
