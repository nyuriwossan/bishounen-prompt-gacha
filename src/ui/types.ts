import type { GROUPS } from '../engine/draw';
import type { DrawConflict, FieldId, ForgeModules, ForgeState, StylePreset } from '../types';

export type Tab = 'forge' | 'prompt' | 'saved' | 'help' | 'dict';
export interface Toast { text: string; action?: { label: string; run: () => void } }
export interface ConflictView { notices: string[]; conflicts: DrawConflict[]; stuck: FieldId[]; prefsFields?: FieldId[]; prefsKind?: 'zero' | 'preset' | 'stuck' | 'off' }

export interface AppActions {
  forgeAll: () => void;
  drawGroup: (g: keyof typeof GROUPS) => void;
  reroll: (f: FieldId) => void;
  toggleLock: (f: FieldId) => void;
  unlockAll: () => void;
  undo: () => void;
  redo: () => void;
  adopt: (f: FieldId, id: string, lock: boolean) => void;
  drawWithin: (f: FieldId, ids: string[], lock: boolean) => void;
  setSettings: (patch: Partial<ForgeState['settings']>) => void;
  setModule: (key: keyof ForgeModules, on: boolean) => void;
  redrawRelated: (fields: FieldId[]) => void;
  unlockAndRetry: (fields: FieldId[]) => void;
  load: (s: ForgeState, message: string) => void;
  copy: (text: string, label?: string) => Promise<void>;
  choosePreset: (p: StylePreset | null) => void;
  openPicker: (f: FieldId) => void;
  /** 辞書・抽選設定を開く（項目を指定すると、その候補一覧から） */
  openDict: (f?: FieldId) => void;
  toast: (t: Toast | string, ms?: number) => void;
}
