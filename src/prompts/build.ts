/* プロンプト生成：正規化した同じ状態から、5形式と日本語カードを作る。
 * - 男性1名・美形アンカーは常に保持。"handsome" の連呼はせず、アーキタイプ固有の美しさへ翻訳する。
 * - "adult male" を強制挿入しない（年齢は "young man" などで表す。character-appearance 工房と同じ方針）
 * - 画角外の衣装（下半身・靴）は寄りの構図で省略。値は保持する。
 * - 未固定の職業などを勝手に補完しない（指定しないは出力しない）。
 */
import { hairColorShort } from '../data/appearance';
import { optionOf } from '../data/fields';
import { valuesOf } from '../engine/draw';
import { isEffective } from '../engine/state';
import type { FieldId, ForgeState, Option, OutputTarget } from '../types';

export interface PromptSection { id: 'face' | 'hairBody' | 'outfit' | 'pose' | 'scene' | 'meta'; ja: string; tags: string[] }
export interface PromptOutput {
  target: OutputTarget;
  title: string;
  positive: string;
  compact: string;
  negative: string;
  sections: PromptSection[];
  japanese: string;
  japaneseLines: Array<[string, string]>;
  warnings: string[];
}

const NEGATIVE_BASE = ['lowres', 'worst quality', 'bad anatomy', 'bad hands', 'extra fingers', 'missing fingers', 'extra arms', 'deformed', 'blurry', 'text', 'watermark', 'signature', '1girl', 'female', 'breasts', 'multiple boys', 'child'];
const QUALITY: Partial<Record<OutputTarget, string[]>> = {
  pixai: ['masterpiece', 'best quality'],
  novelai: ['best quality', 'very aesthetic', 'absurdres']
};

const LEN_WORD: Record<string, string> = { very_short: 'very short', short: 'short', medium: 'medium-length', long: 'long', very_long: 'very long' };
const SHOT_NAT: Record<string, string> = {
  close_up: 'A close-up of his face', portrait: 'A portrait from the chest up', upper_body: 'An upper-body shot', cowboy_shot: 'A cowboy shot from the thighs up',
  knee_up: 'A shot from the knees up', full_body: 'A full-body shot', wide_full: 'A wide full-body shot'
};
const ANGLE_NAT: Record<string, string> = { from_below: 'seen from below', slightly_below: 'seen from slightly below', from_above: 'seen from above', dutch: 'with a tilted dutch angle', three_quarter_view: 'in three-quarter view', from_side: 'seen from the side' };
const EYE_NAT: Record<string, string> = {
  narrow_long: 'long, narrow {c} eyes', sharp: 'sharp {c} eyes with an intense gaze', tsurime: 'upturned {c} eyes', piercing: 'piercing {c} eyes', cold_eyes: 'cold {c} eyes',
  sanpaku: 'sanpaku {c} eyes', jitome: 'half-lidded, unimpressed {c} eyes', tareme: 'gentle, downturned {c} eyes', calm: 'calm {c} eyes with a soft gaze', large_clear: 'large, clear {c} eyes',
  smiling_eyes: 'smiling {c} eyes', sparkling: 'sparkling {c} eyes', almond: 'almond-shaped {c} eyes', double: 'defined {c} eyes with double eyelids', monolid: 'cool {c} monolid eyes',
  hooded: 'hooded {c} eyes', deep_set_eyes: 'deep-set {c} eyes', long_lashes: '{c} eyes framed by long lashes', half_lidded: 'heavy-lidded {c} eyes', sleepy: 'sleepy {c} eyes',
  melancholic: 'melancholic {c} eyes', tired: 'tired {c} eyes with faint dark circles', fierce: 'fierce {c} eyes', glowing: 'glowing {c} eyes', slit_pupils: '{c} eyes with slit pupils', ringed: 'mysterious ringed {c} eyes'
};
const EXPR_NAT: Record<string, string> = {
  gentle_smile: 'a gentle smile', closed_smile: 'a closed-mouth smile', tender: 'a tender, loving gaze', relieved: 'a relieved smile', bright_smile: 'a bright, carefree grin',
  laughing: 'an open laugh', smile_eyes_closed: 'a smile that narrows his eyes shut', shy: 'a shy smile and a light blush', flustered: 'a flustered blush as he looks away',
  confident_smile: 'a confident smile', smirk: 'a fearless smirk', teasing: 'a teasing smile and a raised eyebrow', knowing_smile: 'a knowing smile', provocative: 'a provocative, half-lidded smile',
  mischievous: 'a mischievous grin', cold_smile: 'a cold smile', contempt: 'a contemptuous smile as he looks down', expressionless: 'an expressionless face', aloof: 'an aloof expression',
  serious: 'a serious expression', stern: 'a stern, furrowed brow', intense_stare: 'an intense stare', determined: 'a determined expression', pensive: 'a pensive, brooding look',
  wistful: 'a wistful gaze into the distance', sad_smile: 'a sad smile', quiet_tears: 'quiet tears', languid: 'a languid, half-lidded expression', sleepy: 'a sleepy, tired look',
  serene: 'a serene expression', eyes_closed_serene: 'closed eyes and a serene expression', surprised: 'a surprised look', annoyed: 'an annoyed frown', feral_grin: 'a feral grin', unhinged: 'an unhinged smile'
};
const ACCENT_NOUN: Record<string, string> = { gradient: 'gradient toward the tips', tips: 'tips', streaks: 'streaks', inner: 'inner layer', two_tone: 'second tone', split: 'other half' };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const colorWord = (opt: Option | undefined, suffix: RegExp) => (opt ? opt.en[0].replace(suffix, '') : '');
const joinNat = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
function dedupe(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags.map((t) => t.trim()).filter((t) => { const k = t.toLowerCase(); if (!t || seen.has(k)) return false; seen.add(k); return true; });
}

/** 衣装の色を埋め、画角に応じて下半身を省く */
export function outfitParts(outfit: Option | undefined, c1: Option | undefined, c2: Option | undefined, shotLevel: number): { tags: string[]; nat: string; ja: string } {
  if (!outfit) return { tags: [], nat: '', ja: '' };
  const fillC = (s: string) => s.replace(/\{c1\}/g, c1?.en[0] ?? '').replace(/\{c2\}/g, c2?.en[0] ?? '').replace(/\s+/g, ' ').trim();
  let upper = (outfit.upper ?? '').split(/\s*,\s*/).map(fillC).filter(Boolean);
  const lowerAll = (outfit.lower ?? '').split(/\s*,\s*/).filter(Boolean);
  const lower = shotLevel >= 4 ? lowerAll : shotLevel === 3 ? lowerAll.slice(0, 1) : [];
  if (shotLevel === 0) upper = upper.slice(0, 1);
  const tags = [...upper, ...lower];
  const colorJa = [c1 && outfit.upper?.includes('{c1}') ? c1.ja : '', c2 && outfit.upper?.includes('{c2}') ? c2.ja : ''].filter(Boolean).join('×');
  return { tags, nat: joinNat(tags.map((t, i) => (i === 0 ? (/^[aeiou]/i.test(t) ? 'an ' : 'a ') + t : t))), ja: colorJa ? `${outfit.ja}（${colorJa}）` : outfit.ja };
}

/** タイトルを意味の切れ目ごとに分ける（画面で語の途中改行を防ぐ） */
export function titleParts(state: ForgeState): string[] {
  const hair = optionOf('hairColor', state.fields.hairColor.id);
  const arch = optionOf('archetype', state.fields.archetype.id);
  const species = state.optionalModules.kemonoEnabled ? optionOf('kemonoSpecies', state.fields.kemonoSpecies.id) : undefined;
  return [species ? `${species.ja}耳の` : '', hair ? `${hairColorShort(hair)}の` : '', arch?.ja ?? '美青年'].filter(Boolean);
}
export function titleOf(state: ForgeState): string {
  return titleParts(state).join('');
}

export function buildPrompt(state: ForgeState, target: OutputTarget = state.settings.outputTarget): PromptOutput {
  const v = valuesOf(state);
  const S = state.settings, M = state.optionalModules;
  const shotLevel = v.shot?.level ?? 2;
  const bgOn = M.backgroundEnabled;
  const simpleBg = v.scene?.place === 'simple';
  const accentOn = isEffective(state, 'hairAccentColor') && !!v.hairAccent && v.hairAccent.id !== 'none';
  const outfit = outfitParts(v.outfit, v.mainColor, v.accentColor, shotLevel);
  const kemonoLv = Number((v.kemonoLevel?.id ?? 'lv1').slice(2)) as 1 | 2 | 3;
  const kemonoTags = M.kemonoEnabled && v.kemonoSpecies?.kemono ? v.kemonoSpecies.kemono.lv[kemonoLv] ?? [] : [];
  const en = (f: FieldId) => (v[f] ? v[f]!.en : []);
  const ageId = v.age?.id ?? 'a25_34';
  const young = ['a18_24', 'a25_34'].includes(ageId);
  const muscled = v.build?.cat === 'muscle';
  const mascPres = v.presentation?.id === 'masc';

  // ---- タグ（セクション別）----
  const subject = S.boyTag === '1boy' ? ['1boy', 'solo', 'male focus'] : ['solo', 'male focus'];
  const anchor = ['handsome', ...(young && !muscled && !mascPres ? ['bishounen'] : [])];
  const face = dedupe([...en('age'), ...anchor, ...en('archetype'), ...en('presentation'), ...en('face'), ...en('eyeShape'), ...en('eyeColor'), ...en('skin'), ...en('marks'), ...en('glasses'), ...(M.facialHairEnabled ? en('facialHair') : []), ...en('expression')]);
  const hair = dedupe([...en('hairLength'), ...en('hairStyle'), ...en('hairColor'), ...(accentOn ? [...en('hairAccentColor'), ...en('hairAccent')] : []), ...en('build'), ...kemonoTags]);
  const outfitTags = dedupe([...outfit.tags, ...(v.culture && v.culture.id !== 'none' ? v.culture.en : [])]);
  const pose = dedupe(M.poseEnabled ? [...en('pose'), ...en('prop'), ...en('shot'), ...en('angle')] : [...en('shot')]);
  const scene = dedupe(bgOn ? [...en('scene'), ...(simpleBg ? [] : en('time')), ...en('light')] : []);
  const meta = dedupe([...(v.aura?.en.slice(0, 1) ?? []), ...(v.world?.en ?? []), ...(v.artStyle?.en ?? [])]);
  const sections: PromptSection[] = [
    { id: 'face', ja: '人物の顔', tags: face },
    { id: 'hairBody', ja: '髪・体', tags: hair },
    { id: 'outfit', ja: '衣装', tags: outfitTags },
    { id: 'pose', ja: 'ポーズ・構図', tags: pose },
    { id: 'scene', ja: '背景・光', tags: scene },
    { id: 'meta', ja: '雰囲気・画風', tags: meta }
  ];

  const free = parseFree(S.freeTags);
  const warnings = checkFreeTags(free, state, [...subject, ...face, ...hair, ...outfitTags, ...pose, ...scene, ...meta]);
  const lora = S.loraText.trim() ? [S.loraText.trim()] : [];
  const quality = S.quality ? QUALITY[target] ?? [] : [];
  const emph = (t: string) => {
    if (!S.emphasis) return t;
    if (target === 'pixai') return `(${t}:1.15)`;
    if (target === 'novelai') return `{${t}}`;
    return t;
  };

  let positive = '', compact = '';
  if (target === 'pixai' || target === 'novelai' || target === 'genericTags') {
    const q = target === 'genericTags' ? [] : quality;
    const all = dedupe([...q, ...lora, ...subject, ...face, ...hair, ...outfitTags, ...pose, ...scene, ...meta, ...free]);
    const emphSet = new Set(['handsome', v.archetype?.en[0]].filter(Boolean) as string[]);
    positive = all.map((t) => (emphSet.has(t) ? emph(t) : t)).join(', ');
    const short = dedupe([...q, ...lora, ...subject, ...en('age').slice(0, 1), 'handsome', ...(v.archetype?.en.slice(0, 1) ?? []),
      ...(mascPres ? [] : en('presentation').slice(0, 1)), ...en('hairLength'), ...en('hairStyle').slice(0, 1), ...en('hairColor'), ...en('eyeColor'),
      ...kemonoTags.slice(0, 2), ...outfit.tags.slice(0, 2), ...en('expression').slice(0, 1), ...en('shot').slice(0, 1),
      ...(bgOn ? en('scene').slice(0, 1) : []), ...(v.artStyle?.en ?? []), ...free]);
    compact = short.map((t) => (emphSet.has(t) ? emph(t) : t)).join(', ');
  } else if (target === 'naturalEnglish') {
    const sentences = naturalSentences(state, v, outfit.nat, kemonoTags, shotLevel);
    positive = [lora.join(' '), sentences.join(' '), free.length ? `Additional details: ${free.join(', ')}.` : ''].filter(Boolean).join(' ');
    compact = [lora.join(' '), sentences.slice(0, 3).join(' ')].filter(Boolean).join(' ');
  }

  const japaneseLines = japaneseSettings(state, v, outfit.ja);
  const japanese = japaneseProse(state, v, outfit.ja);
  if (target === 'japanese') {
    positive = `【${titleOf(state)}】\n${japanese}\n\n${japaneseLines.map(([k, val]) => `${k}：${val}`).join('\n')}`;
    compact = `【${titleOf(state)}】${japanese}`;
  }

  const negative = S.negative && target !== 'japanese' && target !== 'naturalEnglish' ? NEGATIVE_BASE.join(', ')
    : S.negative && target === 'naturalEnglish' ? `Avoid: ${NEGATIVE_BASE.join(', ')}.` : '';

  return { target, title: titleOf(state), positive, compact, negative, sections, japanese, japaneseLines, warnings };
}

function naturalSentences(state: ForgeState, v: ReturnType<typeof valuesOf>, outfitNat: string, kemonoTags: string[], shotLevel: number): string[] {
  const M = state.optionalModules;
  const out: string[] = [];
  const age = v.age?.nat ?? 'a young man';
  out.push(`${cap(age)}, strikingly handsome, ${v.archetype?.nat ?? 'with refined features'}.`);
  const pres = v.presentation?.nat?.replace(/^with\s+/, '') ?? '';
  const faceBits = [pres, ...(v.face?.en ?? [])].filter(Boolean);
  if (faceBits.length) out.push(`He has ${joinNat(faceBits)}.`);
  const eyeC = colorWord(v.eyeColor, / eyes$/);
  const eyeTpl = v.eyeShape ? EYE_NAT[v.eyeShape.id] ?? `{c} ${v.eyeShape.en.join(', ')}` : '{c} eyes';
  const extras = [...(v.skin?.en ?? []), ...(v.marks?.en ?? []), ...(v.glasses?.en ?? []), ...(M.facialHairEnabled ? v.facialHair?.en ?? [] : [])];
  out.push(`He has ${eyeTpl.replace('{c}', eyeC).replace(/\s+/g, ' ')}${extras.length ? `, ${joinNat(extras)}` : ''}.`);
  const hairC = colorWord(v.hairColor, / hair$/);
  const accentOn = isEffective(state, 'hairAccentColor') && v.hairAccent && v.hairAccent.id !== 'none';
  const accent = accentOn && v.hairAccentColor ? ` with ${colorWord(v.hairAccentColor, / hair$/)} ${ACCENT_NOUN[v.hairAccent!.id] ?? 'accents'}` : '';
  out.push(`His ${LEN_WORD[v.hairLength?.id ?? 'short'] ?? ''} ${hairC} hair${accent} is styled as ${joinNat(v.hairStyle?.en ?? ['loose hair'])}, and he has ${v.build?.nat ?? 'a balanced build'}.`.replace(/\s+/g, ' '));
  if (M.kemonoEnabled && kemonoTags.length) out.push(`He is a kemonomimi man with ${joinNat(kemonoTags)}, while keeping a handsome human face.`);
  if (outfitNat) out.push(`He wears ${outfitNat}${v.culture && v.culture.id !== 'none' ? `, adorned with ${v.culture.nat}` : ''}.`);
  const expr = v.expression ? EXPR_NAT[v.expression.id] ?? v.expression.en.join(', ') : '';
  if (M.poseEnabled && v.pose) {
    const prop = v.prop && v.prop.id !== 'none' ? `, ${v.prop.en.join(', ')}` : '';
    out.push(`He wears ${expr || 'a calm expression'}; pose: ${v.pose.en.join(', ')}${prop}.`);
  } else if (expr) out.push(`He has ${expr}.`);
  const shotNat = SHOT_NAT[v.shot?.id ?? 'upper_body'] ?? 'A portrait';
  const angle = M.poseEnabled && v.angle && ANGLE_NAT[v.angle.id] ? `, ${ANGLE_NAT[v.angle.id]}` : '';
  out.push(`${shotNat}${angle}.`);
  if (M.backgroundEnabled && v.scene) {
    const time = v.scene.place !== 'simple' && v.time?.nat ? ` ${v.time.nat}` : '';
    const light = v.light ? `, lit by ${joinNat(v.light.en)}` : '';
    out.push(`The background is ${v.scene.nat ?? v.scene.en.join(', ')}${time}${light}.`);
  }
  const mood = [v.aura?.en.join(', '), v.world?.nat].filter(Boolean).join(', ');
  if (mood) out.push(`The mood is ${mood}.`);
  if (v.artStyle?.nat) out.push(`Rendered ${v.artStyle.nat}.`);
  void shotLevel;
  return out.map((s) => s.replace(/\s+([,.])/g, '$1'));
}

function japaneseSettings(state: ForgeState, v: ReturnType<typeof valuesOf>, outfitJa: string): Array<[string, string]> {
  const M = state.optionalModules;
  const j = (f: FieldId) => v[f]?.ja ?? '—';
  const rows: Array<[string, string]> = [];
  if (M.nameEnabled && v.name) rows.push(['呼び名', v.name.ja]);
  rows.push(['年齢', j('age')], ['美形タイプ', `${j('archetype')}${v.archetype?.desc ? `｜${v.archetype.desc}` : ''}`], ['容姿傾向', j('presentation')], ['体格', j('build')],
    ['世界観', j('world')], ['文化・意匠', v.culture && v.culture.id !== 'none' ? v.culture.ja : '指定なし'],
    ['髪', [j('hairLength'), j('hairStyle'), j('hairColor')].join('・') + (isEffective(state, 'hairAccentColor') && v.hairAccent?.id !== 'none' ? `（${j('hairAccent')}：${j('hairAccentColor')}）` : '')],
    ['目元・瞳', `${j('eyeShape')}・${j('eyeColor')}`], ['顔立ち', j('face')], ['肌', j('skin')], ['特徴', j('marks')], ['眼鏡', j('glasses')]);
  if (M.facialHairEnabled) rows.push(['ひげ', j('facialHair')]);
  rows.push(['衣装', outfitJa || '—'], ['表情', j('expression')]);
  if (M.poseEnabled) rows.push(['ポーズ', j('pose')], ['持ち物', j('prop')], ['構図', `${j('shot')}・${j('angle')}`]);
  else rows.push(['構図', j('shot')]);
  if (M.backgroundEnabled) rows.push(['背景', j('scene')], ['時間・天候', v.scene?.place === 'simple' ? `${j('time')}（シンプル背景のため出力なし）` : j('time')], ['光', j('light')]);
  if (M.kemonoEnabled) rows.push(['獣人', `${j('kemonoSpecies')}・${j('kemonoLevel')}`]);
  rows.push(['雰囲気', j('aura')], ['職業・立場', j('occupation')], ['画風', j('artStyle')]);
  return rows;
}

function japaneseProse(state: ForgeState, v: ReturnType<typeof valuesOf>, outfitJa: string): string {
  const M = state.optionalModules;
  const age = v.age?.ja.split('｜')[1] ?? '青年';
  const pres = v.presentation ? `${v.presentation.ja.replace('な美形', '')}な` : '';
  const occ = v.occupation && v.occupation.id !== 'none' ? `${v.occupation.ja}である` : '';
  const kemono = M.kemonoEnabled && v.kemonoSpecies ? `${v.kemonoSpecies.ja}の耳と尾を持つ` : '';
  const s1 = `${v.age?.ja.split('｜')[0] ?? ''}、${kemono}${occ}${pres}${v.archetype?.ja ?? '美青年'}（${age}）。`;
  const eyeJa = v.eyeShape?.ja ?? '';
  const s2 = `${v.hairColor ? hairColorShort(v.hairColor) : '髪'}の${v.hairStyle?.ja ?? ''}に${v.eyeColor?.ja ?? ''}、${/(目元|目|瞳|眼差し|まつ毛)$/.test(eyeJa) ? eyeJa : `${eyeJa}の目元`}。`;
  const s3 = `${outfitJa ? `${outfitJa}をまとう。` : ''}表情は「${v.expression?.ja ?? '—'}」${M.poseEnabled && v.pose ? `、ポーズは「${v.pose.ja}」${v.prop && v.prop.id !== 'none' ? `、手には${v.prop.ja}` : ''}` : ''}。`;
  const s4 = `舞台は${v.world?.ja ?? '—'}${M.backgroundEnabled && v.scene ? `、${v.scene.ja}${v.scene.place !== 'simple' && v.time ? `の${v.time.ja}` : ''}` : ''}。`;
  return [s1, s2, s3, s4].join('');
}

// ---- 自由タグ ----
export function parseFree(text: string): string[] {
  return dedupe(String(text || '').split(/[\n,]+/).map((x) => x.trim()).filter(Boolean)).slice(0, 80).map((x) => x.slice(0, 120));
}

const GENDER_FLIP = /\b(1girl|2girls|girl|girls|female|woman|women|breasts|cleavage)\b/i;
const MINOR = /\b(child|children|kid|kids|loli|shota|teen|teens|teenager|teenage|young boy|little boy|schoolboy|underage|toddler|baby)\b/i;
const COUNT = /\b(2boys|3boys|multiple boys|multiple people|group)\b/i;
const LENGTH_WORDS: Record<string, RegExp> = {
  very_short: /\b(long hair|very long hair|absurdly long hair|medium hair)\b/i, short: /\b(long hair|very long hair|absurdly long hair)\b/i,
  medium: /\b(very short hair|very long hair|absurdly long hair)\b/i, long: /\b(very short hair|buzz cut|short hair)\b/i, very_long: /\b(very short hair|buzz cut|short hair)\b/i
};
export function checkFreeTags(free: string[], state: ForgeState, existing: string[]): string[] {
  const out: string[] = [];
  const lower = new Set(existing.map((x) => x.toLowerCase()));
  const dups = free.filter((t) => lower.has(t.toLowerCase()));
  if (dups.length) out.push(`重複：${dups.join(', ')}（出力では1回にまとめます）`);
  const flip = free.filter((t) => GENDER_FLIP.test(t));
  if (flip.length) out.push(`性別が変わる可能性のあるタグ：${flip.join(', ')}`);
  const minor = free.filter((t) => MINOR.test(t));
  if (minor.length) out.push(`このアプリは成人キャラクター専用です。未成年を示す可能性のあるタグ：${minor.join(', ')}`);
  const count = free.filter((t) => COUNT.test(t));
  if (count.length) out.push(`人数が増える可能性のあるタグ：${count.join(', ')}`);
  const len = state.fields.hairLength.id;
  const lenRe = len ? LENGTH_WORDS[len] : undefined;
  const lenClash = lenRe ? free.filter((t) => lenRe.test(t)) : [];
  if (lenClash.length) out.push(`髪の長さ（${optionOf('hairLength', len)?.ja}）と相反するタグ：${lenClash.join(', ')}`);
  if (free.some((t) => /\b(closed eyes|eyes closed)\b/i.test(t)) && optionOf('pose', state.fields.pose.id)?.gazeViewer) out.push('閉じた目のタグが、こちらを見るポーズと相反します');
  return out;
}

// ---- Markdown ----
export function toMarkdown(state: ForgeState): string {
  const ja = buildPrompt(state, 'japanese');
  const formats: OutputTarget[] = ['pixai', 'novelai', 'genericTags', 'naturalEnglish'];
  const label: Record<OutputTarget, string> = { pixai: 'PixAI向けタグ', novelai: 'NovelAI向けタグ', genericTags: '汎用タグ', naturalEnglish: '自然な英文', japanese: '日本語設定' };
  const lines = [`# ${ja.title}`, '', ja.japanese, '', '## 設定', '', ...ja.japaneseLines.map(([k, v]) => `- **${k}**：${v}`), ''];
  for (const t of formats) {
    const p = buildPrompt(state, t);
    lines.push(`## ${label[t]}`, '', '```text', p.positive, '```', '');
    if (p.negative) lines.push('Negative:', '', '```text', p.negative, '```', '');
  }
  lines.push('---', `seed: \`${state.lastSeed}\` ／ データ版: ${state.dataVersion} ／ 美青年錬成ガチャ`);
  return lines.join('\n');
}
