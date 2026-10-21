/* 人物の一括固定
 * 「この人物を固定」は、人物（外見・個体）を決める項目の既存の鍵をまとめて掛けるだけ。値・出力・保存は変えない。
 * 固定の情報は各項目の鍵（ForgeState.fields[f].locked）だけで、別の固定情報は持たない（食い違いが起きない）。
 */
import type { FieldId, ForgeState } from '../types';
import { cloneState, isActive } from './state';

/** 一括固定の初期対象：外見と個体を決める項目（表情・衣装・衣装の色・ポーズ・構図・背景・光は含めない） */
export const PERSON_FIELDS: FieldId[] = [
  'age', 'archetype', 'presentation', 'build',
  'hairLength', 'hairStyle', 'hairColor', 'hairAccent', 'hairAccentColor',
  'eyeShape', 'eyeColor', 'face', 'skin',
  'marks', 'glasses', 'facialHair',
  'kemonoSpecies', 'kemonoLevel'
];
/** 必要に応じて固定範囲に足せる項目（一括固定では掛けない。衣装3案ではもともと変えない） */
export const PERSON_EXTRA_FIELDS: FieldId[] = ['world', 'occupation', 'name'];

/** 一括固定で鍵を掛ける項目：人物の項目のうち、いま有効なもの。
 * OFFの任意機能（眼鏡など）・辞書・抽選設定でOFFの項目には掛けない（ONにしたとき補充されなくなるのを防ぎ、スイッチも変えない） */
export function personLockTargets(state: ForgeState): FieldId[] {
  return PERSON_FIELDS.filter((f) => isActive(state, f) && !!state.fields[f].id);
}

/** 人物をまとめて固定する。既に固定している項目はそのまま。added は今回新しく鍵を掛けた項目 */
export function lockPerson(state: ForgeState): { state: ForgeState; added: FieldId[] } {
  const added = personLockTargets(state).filter((f) => !state.fields[f].locked);
  if (!added.length) return { state, added };
  const s = cloneState(state);
  for (const f of added) s.fields[f] = { ...s.fields[f], locked: true };
  return { state: s, added };
}

/** 人物の固定状況（いま有効な人物の項目のうち、固定しているもの） */
export function personLockStatus(state: ForgeState): { locked: FieldId[]; targets: FieldId[] } {
  const targets = personLockTargets(state);
  return { targets, locked: targets.filter((f) => state.fields[f].locked) };
}
