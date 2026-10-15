import { DATA_VERSION, DEFAULT_IDS, fieldDef, FIELDS } from '../data/fields';
import { FIELD_IDS, type FieldId, type ForgeModules, type ForgeSettings, type ForgeState, type ModuleId, type Selection } from '../types';

export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: ForgeSettings = {
  coherence: 'coherent',
  outputTarget: 'pixai',
  seed: '',
  keepRecentCount: 8,
  compact: false,
  negative: false,
  quality: true,
  emphasis: false,
  freeTags: '',
  loraText: '',
  boyTag: '1boy'
};

export const DEFAULT_MODULES: ForgeModules = {
  kemonoEnabled: false,
  backgroundEnabled: true,
  poseEnabled: true,
  facialHairEnabled: false,
  hairAccentEnabled: false,
  nameEnabled: true,
  glassesEnabled: false,
  marksEnabled: false,
  propEnabled: false,
  unlimitedEnabled: false,
  cosplayEnabled: false
};

export function emptyState(): ForgeState {
  const fields = {} as Record<FieldId, Selection>;
  for (const id of FIELD_IDS) fields[id] = { id: DEFAULT_IDS[id] ?? null, source: 'random', locked: false };
  return {
    schemaVersion: SCHEMA_VERSION,
    dataVersion: DATA_VERSION,
    fields,
    settings: { ...DEFAULT_SETTINGS },
    optionalModules: { ...DEFAULT_MODULES },
    lastSeed: '',
    drawCount: 0
  };
}

export function cloneState(s: ForgeState): ForgeState {
  return JSON.parse(JSON.stringify(s));
}

const MODULE_KEY: Record<ModuleId, keyof ForgeModules> = {
  pose: 'poseEnabled', background: 'backgroundEnabled', kemono: 'kemonoEnabled',
  facialHair: 'facialHairEnabled', hairAccent: 'hairAccentEnabled', name: 'nameEnabled',
  glasses: 'glassesEnabled', marks: 'marksEnabled', prop: 'propEnabled', unlimited: 'unlimitedEnabled', cosplay: 'cosplayEnabled'
};
/** 親モジュール：持ち物はポーズを出力するときだけ意味を持つ */
const MODULE_PARENT: Partial<Record<ModuleId, ModuleId>> = { prop: 'pose' };
/** OFFのとき「なし」として扱う項目（判定・出力とも）。眼鏡OFFなら「眼鏡を押し上げる」も出ない */
export const OFF_AS_NONE: FieldId[] = ['glasses', 'marks', 'prop', 'role', 'restraint', 'bindPos', 'anchor', 'blindfold', 'disarray', 'wear1', 'wear2'];
/** 禁断の調合の項目 */
export const FORBIDDEN_FIELDS: FieldId[] = ['role', 'restraint', 'bindPos', 'anchor', 'tightness', 'blindfold', 'disarray', 'wear1', 'wear2'];
export const moduleKey = (m: ModuleId) => MODULE_KEY[m];

/** 任意モジュールが有効か（モジュールに属さない項目は常に有効） */
export function isActive(state: ForgeState, field: FieldId): boolean {
  const def = fieldDef(field);
  if (!def.module) return true;
  const parent = MODULE_PARENT[def.module];
  if (parent && !state.optionalModules[MODULE_KEY[parent]]) return false;
  return !!state.optionalModules[MODULE_KEY[def.module]];
}

/** 髪の差し色は、配色が「単色」以外のときだけ意味を持つ */
export function isEffective(state: ForgeState, field: FieldId): boolean {
  if (!isActive(state, field)) return false;
  if (field === 'hairAccentColor') return !!state.fields.hairAccent.id && state.fields.hairAccent.id !== 'none';
  // 拘束位置は拘束具があるとき、固定先・締め方は実際に縛っているとき（手に持つ以外）だけ意味を持つ
  if (field === 'bindPos') return state.fields.restraint.id !== 'none';
  if (field === 'anchor' || field === 'tightness') return state.fields.restraint.id !== 'none' && !['none', 'held'].includes(state.fields.bindPos.id ?? 'none');
  return true;
}

export const ALL_FIELDS: FieldId[] = FIELDS.map((f) => f.id);
export const lockedFields = (s: ForgeState) => ALL_FIELDS.filter((f) => s.fields[f].locked);
