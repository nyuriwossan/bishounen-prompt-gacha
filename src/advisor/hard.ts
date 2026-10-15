/* hard 制約：物理的・意味的に明白な矛盾。抽選は必ずこれを守り、ロック済みの値は黙って変えない。
 * 参考：character-appearance（髪の長さとカットの競合）、pose-composition（閉じた目と視線、手の数）、
 * background（夜と直射日光）、outfit（同層の衝突）の各工房の hard ルール。
 */
import { fieldDef } from '../data/fields';
import { matchRef } from '../engine/match';
import { JOYFUL_EXPRESSIONS, PLEASURE_EXPRESSIONS } from '../data/forbidden';
import type { FieldId, Option } from '../types';

export type Values = Partial<Record<FieldId, Option>>;
export interface Violation { rule: string; fields: FieldId[]; reasonJa: string }

interface PairRule { id: string; fields: [FieldId, FieldId]; check: (v: Values) => string | null }

/** 拘束位置が画面に入る最小の画角（0 顔アップ〜5 全身） */
const BIND_MIN_SHOT: Record<string, number> = { held: 1, wrists_front: 2, wrists_behind: 2, wrists_overhead: 2, one_wrist: 1, chair_back: 3, ankles: 4, torso_arms: 1 };
/** 椅子に座っているポーズ（固定先「椅子」と両立する） */
const CHAIR_POSES = new Set(['sitting_chair', 'crossed_legs', 'backwards_chair', 'chin_on_hand_table', 'throne_lounge', 'bound_chair']);
/** 手を外へ向けるポーズ（片手でも、触手などを操る手として描ける） */
const OUTWARD_POSES = new Set(['casting_spell', 'offer_hand', 'beckoning', 'pointing']);
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
  },
  // ---- 禁断の調合（アンリミテッドモード）。OFFの間は全項目が「なし」なので、どれも成立したまま ----
  {
    id: 'restraint_bind', fields: ['restraint', 'bindPos'],
    check: ({ restraint: r, bindPos: b }) => {
      if (!r || !b) return null;
      if (r.id === 'none' && b.id !== 'none') return `拘束具がないのに、拘束位置「${b.ja}」が指定されています`;
      if (r.id !== 'none' && b.id === 'none') return `拘束具「${r.ja}」の使い方（拘束位置）が必要です`;
      if (r.id === 'cuffs' && b.id === 'torso_arms') return '手錠は腕と胴体には巻けません';
      if (b.id === 'chair_back' && !['rope', 'silk_cord'].includes(r.id)) return `椅子の背もたれに縛りつけるのは縄・組紐だけです（現在：${r.ja}）`;
      return null;
    }
  },
  {
    id: 'role_bind', fields: ['role', 'bindPos'],
    check: ({ role: ro, bindPos: b }) => {
      if (!ro || !b) return null;
      if (onlySide(ro, 'captor') && isBound(b)) return `「${ro.ja}」が自分で縛られています`;
      if (onlySide(ro, 'captive') && b.id === 'held') return `「${ro.ja}」が拘束具を手に持っています`;
      return null;
    }
  },
  {
    id: 'bind_pose', fields: ['bindPos', 'pose'],
    check: ({ bindPos: b, pose: p }) => {
      if (!b || !p || b.id === 'none') return null;
      const bound = has(p, 'bound'), hands = p.hands ?? 2;
      // 持ち物を前提にするポーズ（花を差し出す・銃を構えるなど）は、手を縛る・拘束具を持つときは不可
      if (b.id !== 'ankles' && p.requires?.some((r) => r.startsWith('prop:'))) return `拘束中は、持ち物を使うポーズ「${p.ja}」はできません`;
      if (b.id === 'held') return !bound && hands >= 1 ? null : `拘束具を持つ手が、ポーズ「${p.ja}」では空いていません`;
      if (b.id === 'ankles') return ['walking', 'running', 'jumping'].includes(p.posture ?? '') ? `足首を縛ったまま「${p.ja}」はできません` : null;
      if (bound) return null; // 拘束の構図は requires で拘束位置と対応済み
      if (b.id === 'one_wrist') return hands >= 1 ? null : `片手首を縛ると、ポーズ「${p.ja}」に必要な手が足りません`;
      if (hands < 2) return `両手を縛ったまま、手を使うポーズ「${p.ja}」はできません`;
      if (b.id === 'wrists_overhead' && p.posture !== 'standing') return `頭上で固定したまま「${p.ja}」はできません`;
      if (b.id === 'chair_back' && p.posture !== 'sitting') return `椅子に縛りつけるには座るポーズが必要です（現在：${p.ja}）`;
      return null;
    }
  },
  {
    // 触手・蔓・光の鎖を「操る」ときは、手を外へ向けるポーズに限る（首や顔に手を当てると触手が出ない：3回目の実機確認）
    id: 'held_summoned_pose', fields: ['bindPos', 'pose'],
    check: ({ bindPos: b, pose: p, restraint: r }) => {
      if (!b || !p || !r || b.id !== 'held' || !has(r, 'summoned')) return null;
      return (p.hands ?? 2) >= 2 || OUTWARD_POSES.has(p.id) ? null : `「${r.ja}」を操るには、ポーズ「${p.ja}」では手が塞がっています`;
    }
  },
  {
    // 檻の中にいるのは囚われる側だけ（する側だけの立場に「in cage」を付けない）
    id: 'role_cage', fields: ['role', 'scene'],
    check: ({ role: ro, scene: s }) => (ro && s && onlySide(ro, 'captor') && /\bin cage\b/.test(s.en.join(' ')) ? `「${ro.ja}」が「${s.ja}」の檻の中に入っています` : null)
  },
  {
    // 椅子に緩く巻くと、固定されていない絵になりやすい
    id: 'chair_tightness', fields: ['bindPos', 'tightness'],
    check: ({ bindPos: b, tightness: t }) => (b && t && b.id === 'chair_back' && t.id !== 'secured' ? `椅子への縛りつけは「しっかり固定」だけにします（現在：${t.ja}）` : null)
  },
  {
    id: 'bind_shot', fields: ['bindPos', 'shot'],
    check: (v) => {
      const { bindPos: b, shot: s } = v;
      if (!b || !s) return null;
      // 触手・蔓・光の鎖を操るときは、操る手と周りの触手まで入る画角にする（胸上では触手が消えやすい）
      const min = b.id === 'held' && v.restraint && has(v.restraint, 'summoned') ? 2 : BIND_MIN_SHOT[b.id] ?? 0;
      return (s.level ?? 5) >= min ? null : `拘束位置「${b.ja}」は、構図「${s.ja}」では画面に入りません`;
    }
  },
  {
    id: 'anchor_shot', fields: ['anchor', 'shot'],
    check: ({ anchor: a, shot: s }) => (a && s && a.id === 'chair' && (s.level ?? 5) < 3 ? `椅子への固定は、構図「${s.ja}」では画面に入りません` : null)
  },
  {
    id: 'bind_prop', fields: ['bindPos', 'prop'],
    check: ({ bindPos: b, prop: pr }) => {
      if (!b || !pr || pr.id === 'none' || b.id === 'none') return null;
      const need = pr.hands ?? 0;
      if (b.id === 'one_wrist') return need <= 1 ? null : `片手首を縛ると、持ち物「${pr.ja}」を持てません`;
      if (b.id === 'ankles') return null;
      return need === 0 ? null : `拘束中は持ち物「${pr.ja}」を持てません`;
    }
  },
  {
    // 触手・蔓・光の鎖は、それ自体が相手を捕らえるので固定先を持たない
    id: 'restraint_anchor', fields: ['restraint', 'anchor'],
    check: ({ restraint: r, anchor: a }) => (r && a && a.id !== 'none' && has(r, 'summoned') ? `「${r.ja}」は固定先なしで描きます` : null)
  },
  {
    // 手錠は締め具合を変えられない
    id: 'restraint_tightness', fields: ['restraint', 'tightness'],
    check: ({ restraint: r, tightness: t }) => (r && t && r.id === 'cuffs' && t.id !== 'secured' ? '手錠の締め方は「しっかり固定」だけです' : null)
  },
  {
    id: 'anchor_bind', fields: ['anchor', 'bindPos'],
    check: ({ anchor: a, bindPos: b }) => {
      if (!a || !b) return null;
      if (b.id === 'chair_back' && a.id !== 'chair') return '椅子に縛りつけるときは、固定先を椅子にしてください';
      if (a.id === 'none') return null;
      if (!isBound(b)) return `固定先「${a.ja}」は、縛っているときだけ指定できます`;
      if (a.id === 'overhead' && b.id !== 'wrists_overhead') return '頭上の固定具は、両手首を頭上で固定するときだけ使えます';
      if (a.id === 'chair' && !['chair_back', 'wrists_behind', 'torso_arms', 'ankles'].includes(b.id)) return `椅子への固定と拘束位置「${b.ja}」は合いません`;
      return null;
    }
  },
  {
    id: 'anchor_pose', fields: ['anchor', 'pose'],
    check: ({ anchor: a, pose: p }) => {
      if (!a || !p || a.id === 'none') return null;
      if (a.id === 'chair' && !CHAIR_POSES.has(p.id)) return `椅子に固定したまま「${p.ja}」はできません`;
      if (a.id === 'overhead' && !['standing', 'kneeling'].includes(p.posture ?? '')) return `頭上の固定具につながれたまま「${p.ja}」はできません`;
      if (['wall', 'pillar'].includes(a.id) && ['walking', 'running', 'jumping', 'floating', 'lying'].includes(p.posture ?? '')) return `${a.ja}につながれたまま「${p.ja}」はできません`;
      if (a.id === 'pillar' && p.id === 'leaning_wall') return '柱につながれたまま、壁にもたれることはできません';
      return null;
    }
  },
  {
    // 上から吊る拘束は、天井や梁のある屋内（またはシンプル背景）だけ
    id: 'bind_scene', fields: ['bindPos', 'scene'],
    check: ({ bindPos: b, scene: s }) => (b && s && b.id === 'wrists_overhead' && !['indoor', 'simple'].includes(s.place ?? '') ? `頭上での拘束は屋内の背景だけです（現在：${s.ja}）` : null)
  },
  {
    id: 'anchor_scene', fields: ['anchor', 'scene'],
    check: ({ anchor: a, scene: s }) => (a && s && a.id === 'overhead' && !['indoor', 'simple'].includes(s.place ?? '') ? `頭上の固定具は屋内の背景だけです（現在：${s.ja}）` : null)
  },
  {
    // 衣装の鎖・ハーネスと別の拘束具が同時に描かれて混ざらないように
    id: 'restraint_outfit', fields: ['restraint', 'outfit'],
    check: ({ restraint: r, outfit: o }) => {
      if (!r || !o || r.id === 'none') return null;
      if (has(o, 'f_chain') && !['chain', 'ornate_chain'].includes(r.id)) return `衣装「${o.ja}」の鎖と、拘束具「${r.ja}」が混ざります`;
      if (has(o, 'f_strap') && r.id !== 'straps') return `衣装「${o.ja}」のベルト類と、拘束具「${r.ja}」が混ざります`;
      return null;
    }
  },
  {
    id: 'disarray_pose', fields: ['disarray', 'pose'],
    check: ({ disarray: d, pose: p }) => (d && p && has(d, 'arms_up') && !has(p, 'arms_up') ? `「${d.ja}」は腕を上げるポーズのときだけです（現在：${p.ja}）` : null)
  },
  {
    // 拘束される側は喜んだ表情にしない／拘束する側は嬉しそう・愉悦の笑み
    id: 'role_expression', fields: ['role', 'expression'],
    check: ({ role: ro, expression: e }) => {
      if (!ro || !e) return null;
      if (onlySide(ro, 'captive') && JOYFUL_EXPRESSIONS.has(e.id)) return `「${ro.ja}」に喜んだ表情「${e.ja}」は合いません`;
      if (onlySide(ro, 'captor') && !PLEASURE_EXPRESSIONS.has(e.id)) return `「${ro.ja}」は愉悦を感じている笑みにします（現在：${e.ja}）`;
      return null;
    }
  },
  {
    id: 'bind_expression', fields: ['bindPos', 'expression'],
    check: ({ bindPos: b, expression: e }) => (b && e && isBound(b) && JOYFUL_EXPRESSIONS.has(e.id) ? `縛られている人物に喜んだ表情「${e.ja}」は合いません` : null)
  },
  {
    // 光の鎖と魔法陣は混ざって描かれるので同時に出さない
    id: 'lightchain_scene', fields: ['restraint', 'scene'],
    check: ({ restraint: r, scene: s }) => (r && s && r.id === 'light_chains' && s.id === 'ritual_altar' ? '光の鎖は魔法陣と混ざるため、祭壇の背景とは組み合わせません' : null)
  },
  {
    // うつ伏せは下から煽ると仰向けに描かれやすい
    id: 'prone_angle', fields: ['pose', 'angle'],
    check: ({ pose: p, angle: a }) => (p && a && p.posture === 'lying' && p.tags?.includes('bound') && ['from_below', 'slightly_below', 'dutch'].includes(a.id) ? `うつ伏せの拘束と「${a.ja}」は合いません` : null)
  },
  {
    // フードを被って見上げると、顔の下側が見えて目が描かれる（6回目の実機確認での指摘）
    id: 'hood_pose', fields: ['blindfold', 'pose'],
    check: ({ blindfold: f, pose: p }) => (f && p && has(f, 'hood') && /\blooking up\b/.test(p.en.join(' ')) ? `フードを被ったまま見上げるポーズ「${p.ja}」では目元が隠れません` : null)
  },
  {
    // フードの陰は、下から煽ると顔の下側が見えて目元が隠れない
    id: 'hood_angle', fields: ['blindfold', 'angle'],
    check: ({ blindfold: f, angle: a }) => (f && a && has(f, 'hood') && ['from_below', 'slightly_below'].includes(a.id) ? `フードの陰は「${a.ja}」では目元を隠せません` : null)
  },
  {
    id: 'blind_glasses', fields: ['blindfold', 'glasses'],
    check: ({ blindfold: f, glasses: g }) => (f && g && g.id !== 'none' && (has(f, 'covered') || has(f, 'one_eye')) ? `目隠し「${f.ja}」と眼鏡は同時に描けません` : null)
  },
  {
    id: 'blind_marks', fields: ['blindfold', 'marks'],
    check: ({ blindfold: f, marks: m }) => (f && m && m.id === 'eyepatch' && (has(f, 'covered') || has(f, 'one_eye')) ? `目隠し「${f.ja}」と眼帯は同時に描けません` : null)
  },
  {
    id: 'blind_outfit', fields: ['blindfold', 'outfit'],
    check: ({ blindfold: f, outfit: o }) => (f && o && has(f, 'hood') && has(o, 'f_headwear') ? `フードと、衣装「${o.ja}」の頭飾りは同時に描けません` : null)
  },
  {
    id: 'blind_hair', fields: ['blindfold', 'hairStyle'],
    check: ({ blindfold: f, hairStyle: h }) => (f && h && has(f, 'hood') && /crown/.test(h.en.join(' ')) ? `フードと、髪型「${h.ja}」の冠は同時に描けません` : null)
  },
  {
    id: 'blind_role', fields: ['blindfold', 'role'],
    check: ({ blindfold: f, role: ro }) => (f && ro && has(f, 'covered') && onlySide(ro, 'captor') ? `「${ro.ja}」が目隠しをしています` : null)
  },
  {
    id: 'blind_expression', fields: ['blindfold', 'expression'],
    check: ({ blindfold: f, expression: e }) => (f && e && has(f, 'covered') && ['cold_glare', 'intense_stare'].includes(e.id) ? `目隠しをしたまま、視線の表情「${e.ja}」は描けません` : null)
  },
  {
    id: 'disarray_outfit', fields: ['disarray', 'outfit'],
    check: ({ disarray: d, outfit: o }) => {
      if (!d || !o || d.id === 'none') return null;
      if (has(o, 'exposed')) return `衣装「${o.ja}」はこれ以上着崩しません`;
      const need = d.outfitNeeds ?? '';
      if (!need) return null;
      if (need === 'sleeves') return has(o, 'f_sleeveless') ? `衣装「${o.ja}」には袖がありません` : null;
      return has(o, need) ? null : `衣装「${o.ja}」には「${d.ja}」に必要な部分がありません`;
    }
  },
  { id: 'wear1_outfit', fields: ['wear1', 'outfit'], check: ({ wear1: w, outfit: o }) => wearOutfit(w, o) },
  { id: 'wear2_outfit', fields: ['wear2', 'outfit'], check: ({ wear2: w, outfit: o }) => wearOutfit(w, o) },
  {
    id: 'wear_pair', fields: ['wear1', 'wear2'],
    check: ({ wear1: a, wear2: b }) => {
      if (!a || !b || b.id === 'none') return null;
      if (a.id === 'none') return '衣装の状態は①から使ってください';
      if (a.id === b.id) return '衣装の状態①と②が同じです';
      if (a.cat === 'wet' && b.cat === 'wet') return '濡れの状態は1件までです';
      if (has(a, 'heavy_tear') && has(b, 'heavy_tear')) return '大きな破れは1件までです';
      return null;
    }
  }
];

function has(o: Option | undefined, tag: string): boolean { return !!o && (o.tags?.includes(tag) || o.cat === tag); }
/** 立場がその側だけか（どちらとも取れる立場は両方の側を持つ） */
function onlySide(role: Option, side: 'captive' | 'captor'): boolean {
  const other = side === 'captive' ? 'captor' : 'captive';
  return has(role, side) && !has(role, other);
}
/** 実際に体を縛っているか（手に持つ・なし以外） */
const isBound = (b: Option) => !['none', 'held'].includes(b.id);
function wearOutfit(w: Option | undefined, o: Option | undefined): string | null {
  if (!w || !o || w.id === 'none') return null;
  if (has(w, 'tear') && (o.cat === 'armor' || has(o, 'armor'))) return `衣装「${o.ja}」は硬い装備なので「${w.ja}」は使えません`;
  if (has(w, 'heavy_tear') && has(o, 'exposed')) return `衣装「${o.ja}」に大きな破れは重ねません`;
  return null;
}

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
