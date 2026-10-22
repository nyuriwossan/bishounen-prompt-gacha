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
    check: ({ expression: e, pose: p, gaze: g }) => {
      if (!e || !p) return null;
      // 「視線」を指定しているときは、視線を決めないポーズの looking at viewer は出力で置き換わる（視線との矛盾は gaze_expression で判定）
      const viewer = isSet(g) && !p.gazeFit ? false : !!p.gazeViewer;
      if (e.eyesClosed && viewer) return `目を閉じた表情「${e.ja}」と、こちらを見るポーズ「${p.ja}」は両立しません`;
      if (e.tags?.includes('gaze_away') && viewer) return `目を逸らす表情「${e.ja}」と、こちらを見るポーズ「${p.ja}」は両立しません`;
      if (p.eyesClosed && !CALM_CLOSED.has(e.id)) return `目を閉じるポーズ「${p.ja}」と表情「${e.ja}」は両立しません`;
      return null;
    }
  },
  {
    id: 'light_time', fields: ['light', 'time'],
    check: ({ light: l, time: t }) => (l && t && l.needs && t.daylight && !l.needs.includes(t.daylight) ? `光「${l.ja}」は時間帯「${t.ja}」には存在しません` : null)
  },
  {
    // 屋内の光源（卓上灯・天窓・展示室の光。2026-10 増築）は屋外・半屋外（中庭・テラスなど）の背景では描けない
    id: 'light_indoor_only', fields: ['light', 'scene'],
    check: ({ light: l, scene: s }) => (l && s && l.tags?.includes('indoor_only') && (s.place === 'outdoor' || s.place === 'semi') ? `光「${l.ja}」は屋外・半屋外の背景「${s.ja}」では描けません` : null)
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
    id: 'outfit_ears_kemono', fields: ['outfit', 'kemonoSpecies'],
    check: ({ outfit: o, kemonoSpecies: k }) => (o && k && has(o, 'f_ears') ? `衣装「${o.ja}」の耳と、獣人の耳は同時に付けられません` : null)
  },
  // コスプレのセーラー服は、禁断の調合（立場・拘束・目隠し・着崩し・衣装の状態）と同時に出さない
  ...(['role', 'restraint', 'blindfold', 'disarray', 'wear1'] as FieldId[]).map((g): PairRule => ({
    id: `outfit_no_forbidden_${g}`, fields: ['outfit', g],
    check: (v) => {
      const o = v.outfit, x = v[g];
      return o && x && x.id !== 'none' && has(o, 'no_forbidden') ? `衣装「${o.ja}」は、禁断の調合と組み合わせません` : null;
    }
  })),
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
      // 包帯で手首を縛ると、巻いてあるだけの包帯になる（7回目の実機確認）。包帯は腕と胴体だけ
      if (r.id === 'bandage' && b.id !== 'torso_arms' && b.id !== 'held') return `包帯は「腕と胴体」に巻くときだけ使えます（現在：${b.ja}）`;
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
      if (has(o, 'f_ribbon') && r.id === 'ribbon') return `衣装「${o.ja}」のリボンと、拘束具のリボンが混ざります`;
      // 警官の衣装は手錠を呼び込み、自分に掛かってしまう（実機確認）
      if (has(o, 'police') && r.id === 'cuffs') return `衣装「${o.ja}」と手錠は、手錠が自分に掛かりやすいため組み合わせません`;
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
  // ---- 2026-10 増築の任意項目（OFFの間は「なし」なので、どれも成立したまま）----
  {
    id: 'hair_length_texture', fields: ['hairLength', 'hairTexture'],
    check: ({ hairLength: l, hairTexture: t }) => (l && isSet(t) && t.lengths && !t.lengths.includes(l.id) ? `髪質「${t.ja}」は「${l.ja}」では描けません` : null)
  },
  {
    id: 'hair_style_texture', fields: ['hairStyle', 'hairTexture'],
    check: ({ hairStyle: h, hairTexture: t }) => (h && isSet(t) && h.curl && t.curl && h.curl !== t.curl ? `髪型「${h.ja}」と髪質「${t.ja}」は質感が食い違います` : null)
  },
  {
    id: 'hair_length_fringe', fields: ['hairLength', 'fringe'],
    check: ({ hairLength: l, fringe: f }) => (l && isSet(f) && f.lengths && !f.lengths.includes(l.id) ? `前髪「${f.ja}」は「${l.ja}」では描けません` : null)
  },
  {
    id: 'hair_style_fringe', fields: ['hairStyle', 'fringe'],
    check: ({ hairStyle: h, fringe: f }) => (h && isSet(f) && h.fringeFixed ? `髪型「${h.ja}」は前髪・分け目まで決まっているため、「${f.ja}」は重ねません` : null)
  },
  {
    // 視線と表情：目を閉じる表情と開いた視線、目を逸らす表情とこちらを見る視線、見下ろす表情と上を見る視線
    id: 'gaze_expression', fields: ['gaze', 'expression'],
    check: ({ gaze: g, expression: e }) => {
      if (!isSet(g) || !e) return null;
      if (g!.eyesClosed) return CALM_CLOSED.has(e.id) ? null : `目を閉じる視線と、表情「${e.ja}」は両立しません`;
      if (e.eyesClosed) return `目を閉じた表情「${e.ja}」と、視線「${g!.ja}」は両立しません`;
      const text = e.en.join(' ');
      if (g!.gazeViewer && (e.tags?.includes('gaze_away') || /\blooking (away|down)\b/.test(text))) return `目を逸らす・伏せる表情「${e.ja}」と、こちらを見る視線は両立しません`;
      if (/\blooking down\b/.test(text) && g!.cat === 'up') return `見下ろす表情「${e.ja}」と、上を見る視線は両立しません`;
      return null;
    }
  },
  {
    // 視線とポーズ：視線そのものを決めるポーズ（横顔・見下ろす・読書など）は合う視線だけ。目を閉じるポーズは閉じた目だけ。拘束の構図は視線を指定しない
    id: 'gaze_pose', fields: ['gaze', 'pose'],
    check: ({ gaze: g, pose: p }) => {
      if (!isSet(g) || !p) return null;
      if (has(p, 'bound')) return `拘束の構図「${p.ja}」では、視線を指定しません`;
      if (p.eyesClosed && !g!.eyesClosed) return `目を閉じるポーズ「${p.ja}」と、視線「${g!.ja}」は両立しません`;
      if (p.gazeFit && !p.gazeFit.includes(g!.id)) return `ポーズ「${p.ja}」は視線が決まっているため、「${g!.ja}」とは組みません`;
      return null;
    }
  },
  {
    id: 'head_pose', fields: ['headPose', 'pose'],
    check: ({ headPose: h, pose: p }) => {
      if (!isSet(h) || !p) return null;
      if (has(p, 'bound')) return `拘束の構図「${p.ja}」では、頭の向きを指定しません`;
      if (p.headFit && !p.headFit.includes(h!.id)) return `ポーズ「${p.ja}」は頭の向きが決まっているため、「${h!.ja}」とは組みません`;
      return null;
    }
  },
  // 禁断の調合（拘束・目隠し）は実機確認を重ねた出力なので、視線・頭の向きを重ねない
  ...(['blindfold', 'restraint'] as FieldId[]).flatMap((x): PairRule[] => [
    { id: `gaze_${x}`, fields: ['gaze', x], check: (v) => (isSet(v.gaze) && isSet(v[x]) ? `「${v[x]!.ja}」の間は、視線を指定しません（目元と視線は禁断演出に任せます）` : null) },
    { id: `head_${x}`, fields: ['headPose', x], check: (v) => (isSet(v.headPose) && isSet(v[x]) ? `「${v[x]!.ja}」の間は、頭の向きを指定しません（構図は禁断演出に任せます）` : null) }
  ]),
  {
    // 衣装の細部：親の衣装に部位があること・同じ部位が既にないこと。コスプレ衣装には重ねない
    id: 'detail_outfit', fields: ['outfitDetail', 'outfit'],
    check: ({ outfitDetail: d, outfit: o }) => {
      if (!isSet(d) || !o) return null;
      if (o.cat === 'cosplay') return `コスプレ衣装「${o.ja}」には、衣装の細部を重ねません`;
      const text = outfitText(o);
      if (d!.parentTags && !d!.parentTags.some((t) => has(o, t))) return `衣装「${o.ja}」には「${d!.ja}」を付ける部位がありません`;
      if (d!.needsText && !new RegExp(d!.needsText, 'i').test(text)) return `衣装「${o.ja}」には「${d!.ja}」を付ける部位がありません`;
      if (d!.clashText && new RegExp(d!.clashText, 'i').test(text)) return `衣装「${o.ja}」には、「${d!.ja}」と同じ部位が既にあります`;
      if (d!.en.some((w) => text.toLowerCase().includes(w.toLowerCase()))) return `衣装「${o.ja}」に「${d!.ja}」が既に含まれています`;
      return null;
    }
  },
  {
    id: 'detail_shot', fields: ['outfitDetail', 'shot'],
    check: ({ outfitDetail: d, shot: s }) => (isSet(d) && s && (d!.minShot ?? 0) > (s.level ?? 5) ? `衣装の細部「${d!.ja}」は、構図「${s.ja}」では画面に入りません` : null)
  },
  {
    // 素材：主な服の素材が決まっている衣装（レザージャケット・リネンシャツなど）は、その素材と合うものだけ。鎧・ボディスーツ・コスプレには付けない
    id: 'fabric_outfit', fields: ['fabric', 'outfit'],
    check: ({ fabric: f, outfit: o }) => {
      if (!isSet(f) || !o) return null;
      if (o.cat === 'cosplay') return `コスプレ衣装「${o.ja}」には、素材を重ねません`;
      const allowed = fabricAllowed(o);
      return allowed && !allowed.includes(f!.mat ?? '') ? `衣装「${o.ja}」の素材と「${f!.ja}」は食い違います` : null;
    }
  },
  // 衣装の細部・素材も、禁断演出（拘束・着崩し・衣装の状態）とは重ねない（実機確認を重ねた出力を保つ）
  ...(['restraint', 'disarray', 'wear1'] as FieldId[]).flatMap((x): PairRule[] => [
    { id: `detail_${x}`, fields: ['outfitDetail', x], check: (v) => (isSet(v.outfitDetail) && isSet(v[x]) ? `「${v[x]!.ja}」の間は、衣装の細部を重ねません` : null) },
    { id: `fabric_${x}`, fields: ['fabric', x], check: (v) => (isSet(v.fabric) && isSet(v[x]) ? `「${v[x]!.ja}」の間は、素材を重ねません` : null) }
  ]),
  {
    id: 'pose_sleeves', fields: ['pose', 'outfit'],
    check: ({ pose: p, outfit: o }) => (p && o && has(p, 'needs_sleeves') && (has(o, 'f_sleeveless') || /\b(t-shirt|tank top|bare arms|bikini|swimsuit)\b/i.test(outfitText(o))) ? `衣装「${o.ja}」には、まくる袖がありません` : null)
  },
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
/** 「なし」以外の値か */
function isSet(o: Option | undefined): o is Option { return !!o && o.id !== 'none'; }
function outfitText(o: Option): string { return `${o.upper ?? ''} ${o.lower ?? ''}`; }
/** 主な服（衣装の最初の語）の素材語と、合う素材（null は素材語なし＝どの素材も可） */
const MAT_WORDS: Array<[RegExp, string[]]> = [
  [/\btweed\b/, ['tweed', 'wool']], [/\b(wool|woolen|woollen)\b/, ['wool', 'tweed']], [/\b(knit|sweater|cardigan|turtleneck|sweatshirt|hoodie)\b/, ['wool', 'cotton']],
  [/\bvelvet\b/, ['velvet']], [/\b(silk|satin)\b/, ['silk', 'brocade']], [/\blinen\b/, ['linen', 'cotton']], [/\b(cotton|denim|chambray|t-shirt)\b/, ['cotton', 'canvas']],
  [/\bcanvas\b/, ['canvas', 'cotton']], [/\bleather\b/, ['leather', 'suede']], [/\bsuede\b/, ['suede', 'leather']], [/\bbrocade\b/, ['brocade', 'silk']],
  // 素材を足さない服（毛皮・透ける生地・ボディスーツ・鎧・医療着）
  [/\b(fur|sheer|lace|mesh|latex|bodysuit|armor|armour|plate|scrubs|bathrobe)\b/, []]
];
export function fabricAllowed(o: Option): string[] | null {
  const main = (o.upper ?? '').split(/\s*,\s*/)[0]?.toLowerCase() ?? '';
  const hits = MAT_WORDS.filter(([re]) => re.test(main));
  if (has(o, 'armor') && !hits.length) return [];
  if (!hits.length) return null;
  if (hits.some(([, m]) => !m.length)) return [];
  return [...new Set(hits.flatMap(([, m]) => m))];
}
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
