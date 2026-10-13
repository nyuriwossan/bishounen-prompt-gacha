/* hard 制約：物理的・意味的に明白な矛盾。抽選は必ずこれを守り、ロック済みの値は黙って変えない。
 * 参考：character-appearance（髪の長さとカットの競合）、pose-composition（閉じた目と視線、手の数）、
 * background（夜と直射日光）、outfit（同層の衝突）の各工房の hard ルール。
 */
import { fieldDef } from '../data/fields';
import { matchRef } from '../engine/match';
import type { FieldId, Option } from '../types';

export type Values = Partial<Record<FieldId, Option>>;
export interface Violation { rule: string; fields: FieldId[]; reasonJa: string }

interface PairRule { id: string; fields: [FieldId, FieldId]; check: (v: Values) => string | null }

const CALM_CLOSED = new Set(['serene', 'eyes_closed_serene', 'gentle_smile', 'closed_smile', 'expressionless', 'smile_eyes_closed', 'sad_smile', 'pensive', 'quiet_tears']);

export const PAIR_RULES: PairRule[] = [
  {
    id: 'hair_length_style', fields: ['hairLength', 'hairStyle'],
    check: ({ hairLength: l, hairStyle: s }) => (l && s && s.lengths && !s.lengths.includes(l.id) ? `髪型「${s.ja}」は「${l.ja}」では成立しません` : null)
  },
  {
    id: 'pose_shot', fields: ['pose', 'shot'],
    check: ({ pose: p, shot: s }) => (p && s && (p.minShot ?? 0) > (s.level ?? 5) ? `ポーズ「${p.ja}」は構図「${s.ja}」では主要な動きが画面外になります` : null)
  },
  {
    id: 'prop_hands', fields: ['prop', 'pose'],
    check: ({ prop: pr, pose: p }) => (pr && p && (pr.hands ?? 0) > (p.hands ?? 2) ? `持ち物「${pr.ja}」に必要な手が、ポーズ「${p.ja}」では空いていません` : null)
  },
  {
    id: 'eyes_gaze', fields: ['expression', 'pose'],
    check: ({ expression: e, pose: p }) => {
      if (!e || !p) return null;
      if (e.eyesClosed && p.gazeViewer) return `目を閉じた表情「${e.ja}」と、こちらを見るポーズ「${p.ja}」は両立しません`;
      if (e.tags?.includes('gaze_away') && p.gazeViewer) return `目を逸らす表情「${e.ja}」と、こちらを見るポーズ「${p.ja}」は両立しません`;
      if (p.eyesClosed && !CALM_CLOSED.has(e.id)) return `目を閉じるポーズ「${p.ja}」と表情「${e.ja}」は両立しません`;
      return null;
    }
  },
  {
    id: 'light_time', fields: ['light', 'time'],
    check: ({ light: l, time: t }) => (l && t && l.needs && t.daylight && !l.needs.includes(t.daylight) ? `光「${l.ja}」は時間帯「${t.ja}」には存在しません` : null)
  },
  {
    id: 'weather_indoor', fields: ['time', 'scene'],
    check: ({ time: t, scene: s }) => (t && s && t.outdoorOnly && s.place === 'indoor' ? `「${t.ja}」は屋内の背景「${s.ja}」では描けません` : null)
  },
  {
    id: 'culture_outfit', fields: ['culture', 'outfit'],
    check: ({ culture: c, outfit: o }) => (c && o && c.id !== 'none' && o.culture && o.culture !== c.id ? `伝統衣装「${o.ja}」は、文化モチーフ「${c.ja}」と根拠なく混ぜられません` : null)
  },
  {
    id: 'color_duplicate', fields: ['mainColor', 'accentColor'],
    check: ({ mainColor: m, accentColor: a }) => (m && a && m.id === a.id ? '差し色がメインカラーと同じです' : null)
  },
  {
    id: 'hair_accent_duplicate', fields: ['hairColor', 'hairAccentColor'],
    check: (v) => (v.hairColor && v.hairAccentColor && v.hairAccent && v.hairAccent.id !== 'none' && v.hairColor.id === v.hairAccentColor.id ? '髪の差し色が髪色と同じです' : null)
  },
  {
    id: 'ears_kemono', fields: ['marks', 'kemonoSpecies'],
    check: ({ marks: m, kemonoSpecies: k }) => (m && k && m.id === 'pointy_ears' ? '尖った人の耳と、獣人の耳は同時に付けられません' : null)
  },
  {
    id: 'eyepatch_monocle', fields: ['marks', 'glasses'],
    check: ({ marks: m, glasses: g }) => (m && g && m.id === 'eyepatch' && g.id === 'monocle' ? '眼帯と片眼鏡は同時に描けません' : null)
  }
];

/** requires（'field:ref'）の分解 */
function parseRequire(req: string): { field: FieldId; ref: string } {
  const i = req.indexOf(':');
  return { field: req.slice(0, i) as FieldId, ref: req.slice(i + 1) };
}

function requireViolations(owner: FieldId, opt: Option, v: Values): Violation[] {
  const out: Violation[] = [];
  for (const req of opt.requires || []) {
    const { field, ref } = parseRequire(req);
    const target = v[field];
    if (!target) continue; // 未決定・無効の項目は判定しない
    if (!ref.split('|').some((r) => matchRef(target, r))) {
      out.push({ rule: 'requires', fields: [owner, field], reasonJa: `「${opt.ja}」には${fieldDef(field).ja}の条件（${describeRef(ref)}）が必要です（現在：${target.ja}）` });
    }
  }
  return out;
}

function describeRef(ref: string): string {
  if (ref === '!none') return 'なし以外';
  const map: Record<string, string> = { '#tie': 'ネクタイ類のある衣装', '#gloves': '手袋のある衣装', '#formal': 'フォーマルな衣装', '#coat': 'コート', '#cape': 'マント', '#blade': '刀剣', '#book': '本', '#cup': 'カップ', '#glass': 'グラス', '#umbrella': '傘', '#flower': '花', '#instrument': '楽器', '#gun': '銃' };
  if (ref.includes('|')) return ref.split('|').map((r) => describeRef(r)).join(' または ');
  const AGE: Record<string, string> = { a18_24: '18〜24歳', a25_34: '25〜34歳', a35_44: '35〜44歳', a45_59: '45〜59歳', a60p: '60歳以上' };
  return map[ref] ?? AGE[ref] ?? ref;
}

/** 値の集合全体の違反（判定は決定済み・有効な項目だけ） */
export function allViolations(v: Values): Violation[] {
  const out: Violation[] = [];
  for (const r of PAIR_RULES) {
    if (!r.fields.every((f) => v[f])) continue;
    const reason = r.check(v);
    if (reason) out.push({ rule: r.id, fields: [...r.fields], reasonJa: reason });
  }
  for (const [f, opt] of Object.entries(v) as Array<[FieldId, Option]>) out.push(...requireViolations(f, opt, v));
  return out;
}

/** 候補 cand を field に置いたとき、決定済みの値 v と衝突する違反 */
export function candidateViolations(field: FieldId, cand: Option, v: Values): Violation[] {
  const next: Values = { ...v, [field]: cand };
  const out: Violation[] = [];
  for (const r of PAIR_RULES) {
    if (!r.fields.includes(field) && !(r.id === 'hair_accent_duplicate' && field === 'hairAccent')) continue;
    if (!r.fields.every((f) => next[f])) continue;
    const reason = r.check(next);
    if (reason) out.push({ rule: r.id, fields: [...r.fields], reasonJa: reason });
  }
  out.push(...requireViolations(field, cand, next));
  for (const [g, opt] of Object.entries(next) as Array<[FieldId, Option]>) {
    if (g === field || !opt.requires) continue;
    for (const viol of requireViolations(g, opt, next)) if (viol.fields.includes(field)) out.push(viol);
  }
  return out;
}
