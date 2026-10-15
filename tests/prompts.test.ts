import { describe, expect, it } from 'vitest';
import { draw } from '../src/engine/draw';
import { cloneState, emptyState } from '../src/engine/state';
import { buildPrompt, checkFreeTags, outfitColorUse, outfitParts, parseFree, titleOf, toMarkdown } from '../src/prompts/build';
import { FIELDS, optionOf } from '../src/data/fields';
import type { FieldId, ForgeState, OutputTarget } from '../src/types';

const make = (seed: string, patch: Partial<Record<FieldId, string>> = {}, mods: Partial<ForgeState['optionalModules']> = {}) => {
  let s = emptyState();
  Object.assign(s.optionalModules, mods);
  for (const [f, id] of Object.entries(patch)) s.fields[f as FieldId] = { id: id!, source: 'manual', locked: true };
  const r = draw(s, { seed });
  expect(r.ok, JSON.stringify(r.conflicts)).toBe(true);
  s = r.state;
  return s;
};
const TARGETS: OutputTarget[] = ['pixai', 'novelai', 'genericTags', 'naturalEnglish', 'japanese'];

describe('出力：男性1名・美形アンカー', () => {
  it('タグ形式は 1boy・solo・male focus・handsome を必ず含む', () => {
    for (let i = 0; i < 40; i++) {
      const s = make('a' + i);
      for (const t of ['pixai', 'novelai', 'genericTags'] as OutputTarget[]) {
        const p = buildPrompt(s, t).positive.split(', ');
        for (const tag of ['1boy', 'solo', 'male focus', 'handsome']) expect(p, `${t}:${tag}`).toContain(tag);
      }
    }
  });
  it('「女性的な美形」でも男性指定を保ち、女性タグを出さない', () => {
    const s = make('fem', { presentation: 'fem', hairLength: 'very_long' });
    for (const t of TARGETS) {
      const p = buildPrompt(s, t).positive;
      expect(p).not.toMatch(/\b(1girl|female|woman|girl)\b/i);
    }
    expect(buildPrompt(s, 'pixai').positive).toContain('male focus');
    expect(buildPrompt(s, 'naturalEnglish').positive).toMatch(/\bhe\b|\bHe\b/);
  });
  it('"adult" を既定出力に強制挿入しない／未成年を示す語を出さない', () => {
    for (let i = 0; i < 40; i++) {
      const s = make('ad' + i);
      for (const t of TARGETS) {
        const p = buildPrompt(s, t).positive;
        expect(p).not.toMatch(/\badult\b/i);
        expect(p).not.toMatch(/\b(child|kid|teen|teenager|shota|loli|schoolboy|boyish)\b/i);
      }
    }
  });
  it('handsome は連呼しない（タグ列中の handsome を含むタグは2個以下）', () => {
    for (let i = 0; i < 60; i++) {
      const tags = buildPrompt(make('h' + i), 'pixai').positive.split(', ');
      expect(tags.filter((t) => /handsome/.test(t)).length).toBeLessThanOrEqual(2);
      expect(new Set(tags.map((t) => t.toLowerCase())).size).toBe(tags.length); // 重複タグなし
    }
  });
  it('1boy を外す設定では solo, male focus が残る', () => {
    const s = make('noboy'); s.settings.boyTag = 'none';
    const p = buildPrompt(s, 'pixai').positive;
    expect(p).not.toContain('1boy');
    expect(p).toContain('solo, male focus');
  });
});

describe('出力：画角・背景・モジュール', () => {
  it('寄りの構図では下半身・靴の描写を出さない（値は保持）', () => {
    const s = make('close', { shot: 'portrait', outfit: 'three_piece' });
    const p = buildPrompt(s, 'pixai').positive;
    expect(p).not.toContain('leather shoes');
    expect(p).not.toContain('tailored trousers');
    expect(s.fields.outfit.id).toBe('three_piece');
    const full = make('full', { shot: 'full_body', outfit: 'three_piece' });
    expect(buildPrompt(full, 'pixai').positive).toContain('leather shoes');
  });
  it('衣装の色は対象に結び付けて出力する', () => {
    const r = outfitParts(optionOf('outfit', 'three_piece'), optionOf('mainColor', 'jet_black'), optionOf('accentColor', 'deep_crimson'), 5);
    expect(r.tags[0]).toBe('jet black three-piece suit');
    expect(r.tags).toContain('deep crimson necktie');
    expect(r.ja).toBe('スリーピーススーツ［漆黒×深紅］');
  });
  it('実際に出る衣装の色は画角で決まる（画面の◯と同じ判定）', () => {
    const use = (id: string, lv: number) => outfitColorUse(optionOf('outfit', id), lv);
    expect(use('three_piece', 5)).toEqual({ main: true, accent: true });
    expect(use('three_piece', 0)).toEqual({ main: true, accent: false });
    expect(use('white_shirt', 2)).toEqual({ main: true, accent: false });
    expect(use('white_shirt', 3)).toEqual({ main: true, accent: true });
    expect(use('white_shirt', 0)).toEqual({ main: false, accent: false });
    for (const lv of [0, 1, 2, 3, 4, 5]) expect(use('doctor_scrubs', lv).accent).toBe(false);
    expect(outfitColorUse(undefined, 2)).toEqual({ main: false, accent: false });
  });
  it('◯の判定と出力タグ・日本語表記が全衣装・全画角で一致する', () => {
    const c1 = optionOf('mainColor', 'jet_black')!, c2 = optionOf('accentColor', 'deep_crimson')!;
    const outfits = FIELDS.find((f) => f.id === 'outfit')!.options;
    for (const o of outfits) {
      for (const lv of [0, 1, 2, 3, 4, 5]) {
        const use = outfitColorUse(o, lv);
        const r = outfitParts(o, c1, c2, lv);
        const text = r.tags.join(', ');
        expect(text.includes(c1.en[0]), `${o.id}@${lv}:main`).toBe(use.main);
        expect(text.includes(c2.en[0]), `${o.id}@${lv}:accent`).toBe(use.accent);
        expect(r.ja.includes(c1.ja), `${o.id}@${lv}:ja main`).toBe(use.main);
        expect(r.ja.includes(c2.ja), `${o.id}@${lv}:ja accent`).toBe(use.accent);
      }
    }
  });
  it('シンプル背景では時間帯を出力しない／背景OFFでは背景を出さない', () => {
    const s = make('simple', { scene: 'simple_white', time: 'night' });
    expect(buildPrompt(s, 'pixai').positive).not.toMatch(/\bnight\b/);
    const off = make('bgoff', {}, { backgroundEnabled: false });
    const sec = buildPrompt(off, 'pixai').sections.find((x) => x.id === 'scene')!;
    expect(sec.tags).toEqual([]);
  });
  it('獣人モードOFFでは耳・尾を出さず、ONでは種族の部位を出す', () => {
    const s = make('k1');
    expect(buildPrompt(s, 'pixai').positive).not.toMatch(/\b(ears|tail)\b/);
    const on = make('k2', { kemonoSpecies: 'wolf', kemonoLevel: 'lv1' }, { kemonoEnabled: true });
    const p = buildPrompt(on, 'pixai').positive;
    expect(p).toContain('wolf ears');
    expect(p).toContain('wolf tail');
    expect(titleOf(on)).toContain('狼耳');
  });
  it('ひげはモジュールOFFなら出力しない', () => {
    const s = make('beard', { facialHair: 'full_beard' });
    expect(buildPrompt(s, 'pixai').positive).not.toContain('full beard');
    const on = cloneState(s); on.optionalModules.facialHairEnabled = true;
    expect(buildPrompt(on, 'pixai').positive).toContain('full beard');
  });
  it('「指定しない」の職業・肌は出力しない（勝手に補完しない）', () => {
    const s = make('none', { occupation: 'none', skin: 'unspecified', glasses: 'none', marks: 'none', prop: 'none' });
    const ja = buildPrompt(s, 'japanese');
    expect(buildPrompt(s, 'pixai').positive).not.toMatch(/undefined|null/);
    expect(ja.japanese).not.toContain('であるの');
  });
});

describe('出力：5形式・ネガティブ・内訳', () => {
  it('5形式すべてが空でなく、同じ状態から矛盾なく作られる', () => {
    const s = make('formats', { hairColor: 'silver', eyeColor: 'gold' });
    for (const t of TARGETS) {
      const p = buildPrompt(s, t);
      expect(p.positive.length).toBeGreaterThan(20);
      expect(p.compact.length).toBeGreaterThan(10);
      expect(p.compact.length).toBeLessThan(p.positive.length);
      expect(p.title).toBe(titleOf(s));
    }
    expect(buildPrompt(s, 'pixai').positive).toContain('silver hair');
    expect(buildPrompt(s, 'naturalEnglish').positive).toContain('silver hair');
    expect(buildPrompt(s, 'japanese').positive).toContain('銀髪');
  });
  it('ネガティブは初期OFF、ONで別欄に出し、Positiveに否定語を混ぜない', () => {
    const s = make('neg');
    expect(buildPrompt(s, 'pixai').negative).toBe('');
    s.settings.negative = true;
    const p = buildPrompt(s, 'pixai');
    expect(p.negative).toContain('1girl');
    expect(p.positive).not.toContain('lowres');
  });
  it('品質タグ・強調・LoRA・自由タグの反映', () => {
    const s = make('opts');
    s.settings.quality = true; s.settings.emphasis = true; s.settings.loraText = 'mychara'; s.settings.freeTags = 'night sky, cinematic';
    const pix = buildPrompt(s, 'pixai').positive;
    expect(pix.startsWith('masterpiece, best quality, mychara')).toBe(true);
    expect(pix).toContain('(handsome:1.15)');
    expect(pix).toContain('cinematic');
    expect(buildPrompt(s, 'novelai').positive).toContain('{handsome}');
    expect(buildPrompt(s, 'genericTags').positive).not.toContain('masterpiece');
  });
  it('内訳は顔／髪・体／衣装／ポーズ／背景・光に分かれる', () => {
    const p = buildPrompt(make('sec'), 'pixai');
    expect(p.sections.map((x) => x.id)).toEqual(['face', 'hairBody', 'outfit', 'pose', 'scene', 'meta']);
    expect(p.sections.find((x) => x.id === 'face')!.tags).toContain('handsome');
  });
  it('Markdownに日本語設定・各形式・seed・データ版を含む', () => {
    const md = toMarkdown(make('md'));
    expect(md).toMatch(/^# /);
    expect(md).toContain('PixAI向けタグ');
    expect(md).toContain('自然な英文');
    expect(md).toContain('seed: `md`');
  });
});

describe('自由タグの警告', () => {
  const s = make('free', { hairLength: 'short', pose: 'standing_relaxed' });
  it('重複・性別反転・未成年・人数・髪の長さの相反を警告', () => {
    const w = checkFreeTags(parseFree('1boy, 1girl, child, 2boys, long hair, closed eyes'), s, ['1boy']);
    expect(w.join('\n')).toMatch(/重複/);
    expect(w.join('\n')).toMatch(/性別/);
    expect(w.join('\n')).toMatch(/成人/);
    expect(w.join('\n')).toMatch(/人数/);
    expect(w.join('\n')).toMatch(/髪の長さ/);
    expect(w.join('\n')).toMatch(/閉じた目/);
  });
  it('問題のないタグは警告しない', () => {
    expect(checkFreeTags(parseFree('cinematic, depth of field'), s, ['1boy'])).toEqual([]);
  });
});

describe('禁断の調合（アンリミテッドモード）', () => {
  const on = (seed: string, patch: Partial<Record<FieldId, string>> = {}) => make(seed, patch, { unlimitedEnabled: true });
  it('OFFのときは、項目に値が残っていても一切出力しない', () => {
    const s = make('fb-off');
    s.fields.restraint = { id: 'rope', source: 'manual', locked: false };
    s.fields.bindPos = { id: 'wrists_front', source: 'manual', locked: false };
    s.fields.blindfold = { id: 'lace', source: 'manual', locked: false };
    for (const t of TARGETS) {
      const p = buildPrompt(s, t);
      expect(p.positive, t).not.toMatch(/rope|blindfold|bound|拘束|目隠し/);
      expect(p.sections.some((x) => x.id === 'forbidden')).toBe(false);
    }
  });
  it('目が隠れる目隠しでは、こちらを見る・目元・瞳の色を出さない', () => {
    for (let i = 0; i < 30; i++) {
      const s = on('fb-blind' + i, { blindfold: 'lace' });
      const p = buildPrompt(s, 'pixai').positive;
      expect(p).toContain('lace blindfold');
      expect(p).not.toMatch(/looking at viewer|eye contact/);
      for (const f of ['eyeShape', 'eyeColor'] as const) for (const t of optionOf(f, s.fields[f].id)!.en) expect(p.split(', '), `${f}:${t}`).not.toContain(t);
      expect(buildPrompt(s, 'naturalEnglish').positive).toContain('eyes are hidden');
    }
  });
  it('拘束の出力は対象部位・素材・固定先を結び付け、首への拘束や画像サービスで弾かれやすい語を出さない', () => {
    const s = on('fb-bind', { role: 'captive', restraint: 'chain', bindPos: 'wrists_overhead', anchor: 'overhead', tightness: 'secured' });
    const p = buildPrompt(s, 'pixai');
    const tags = p.sections.find((x) => x.id === 'forbidden')!.tags;
    // タグ形式は短いタグ。鎖では素材を問わない「bound」を使わず、相手役を呼ぶ立場の語も出さない
    expect(tags).toEqual(expect.arrayContaining(['restrained', 'arms up', 'chain', 'chained']));
    expect(tags.join(', ')).not.toMatch(/\bbound\b|captive|dominant|prisoner/);
    const nat = buildPrompt(s, 'naturalEnglish').positive;
    expect(nat).toContain('chains around the wrists');
    expect(nat).toContain('attached to an overhead fixture');
    expect(p.positive).not.toMatch(/\b(adult|nsfw|bondage|bdsm|nude|naked)\b/i);
    expect(tags.join(', ')).not.toMatch(/\bneck\b/i);
    const neg = buildPrompt({ ...s, settings: { ...s.settings, negative: true } }, 'pixai').negative;
    expect(neg).toContain('restraints around neck');
    expect(buildPrompt(s, 'japanese').positive).toContain('拘束：鎖／両手首を頭上');
  });
  it('拘束具が混ざらないよう、選ばなかった素材をネガティブに入れる（正の側に出ている語は入れない）', () => {
    const s = on('fb-neg', { role: 'captive', restraint: 'rope', bindPos: 'wrists_front', hairStyle: 'ribbon_tied', hairLength: 'long' });
    s.settings.negative = true;
    const neg = buildPrompt(s, 'pixai').negative.split(', ');
    expect(neg).toEqual(expect.arrayContaining(['chains', 'handcuffs', 'tentacles', 'vines']));
    expect(neg).not.toContain('rope');
    expect(neg).not.toContain('ribbon');
    expect(buildPrompt(s, 'naturalEnglish').positive).toContain('one clear restraint setup');
    expect(buildPrompt(s, 'pixai').positive).toContain('bound wrists');
  });
  it('「する側」は拘束具を手に持つ・操る（触手は操る）', () => {
    const s = on('fb-held', { role: 'ruler', restraint: 'tentacles', bindPos: 'held', world: 'dark_fantasy' });
    expect(buildPrompt(s, 'pixai').positive).toContain('tentacles');
    expect(buildPrompt(s, 'naturalEnglish').positive).toContain('controlling tentacles');
    const r = on('fb-held2', { role: 'binder', restraint: 'rope', bindPos: 'held' });
    expect(buildPrompt(r, 'pixai').positive).toContain('holding rope');
  });
  it('衣装の乱れと状態は衣装の欄に入り、自然文と日本語にも出る', () => {
    const s = on('fb-wear', { outfit: 'three_piece', disarray: 'tie_loosened', wear1: 'rain_soaked', wear2: 'frayed' });
    const outfitTags = buildPrompt(s, 'pixai').sections.find((x) => x.id === 'outfit')!.tags;
    expect(outfitTags).toEqual(expect.arrayContaining(['loosened necktie', 'rain-soaked clothes', 'frayed clothes']));
    expect(buildPrompt(s, 'naturalEnglish').positive).toContain('Clothing details: loosened necktie');
    expect(buildPrompt(s, 'japanese').positive).toContain('衣装の状態：雨に濡れている・ほつれ');
  });
});

describe('目隠し・目を閉じる・伏し目と目の描写', () => {
  const EYE = /\b(eyes?|[a-z]+-eyed|gaze|gazing|glance|glare|stare|staring|eye contact|eyelash(es)?|lashes|eyelids?|sanpaku|jitome|looking (at|down at|up at) viewer)\b/i;
  const OWN = /(blindfold|over (the |one )?eyes?|closed eyes|downcast eyes)/i;
  const run = (bf: string, i: number, mode: 'coherent' | 'balanced' | 'wild') => {
    const s0 = emptyState(); s0.settings.coherence = mode; s0.optionalModules.unlimitedEnabled = true;
    s0.fields.blindfold = { id: bf, source: 'manual', locked: true };
    const r = draw(s0, { seed: `eye-${bf}-${i}` });
    expect(r.ok).toBe(true);
    return r.state;
  };
  it('目が隠れる目隠しと「目を閉じる」では、顔・ポーズ・自然文に目と視線の語を出さない（各60回）', () => {
    for (const bf of ['lace', 'cloth', 'leather', 'ribbon', 'silk', 'bandage_eyes', 'hood_low', 'eyes_closed']) {
      for (let i = 0; i < 60; i++) {
        const s = run(bf, i, (['coherent', 'balanced', 'wild'] as const)[i % 3]);
        const out = buildPrompt(s, 'pixai');
        for (const id of ['face', 'pose'] as const) for (const t of out.sections.find((x) => x.id === id)!.tags) if (!OWN.test(t)) expect(t, `${bf}#${i} ${id}`).not.toMatch(EYE);
        const sentences = buildPrompt(s, 'naturalEnglish').positive.split(/(?<=\.)\s/).filter((x) => !/^His .* hair is styled/.test(x) && !OWN.test(x));
        for (const x of sentences) expect(x, `${bf}#${i}`).not.toMatch(EYE);
        expect(buildPrompt(s, 'japanese').positive).toContain('目元・瞳：（目隠し・閉じた目のため出力しない）');
      }
    }
  });
  it('伏し目では目の色は残し、視線の語（こちらを見る・眼差しなど）だけ外す', () => {
    const GAZE = /\b(gaze|gazing|glance|glare|stare|staring|eye contact|looking (at|down at|up at) viewer)\b/i;
    for (let i = 0; i < 60; i++) {
      const s = run('downcast', i, (['coherent', 'balanced', 'wild'] as const)[i % 3]);
      const p = buildPrompt(s, 'pixai').positive;
      expect(p).not.toMatch(GAZE);
      expect(p.split(', ')).toEqual(expect.arrayContaining(optionOf('eyeColor', s.fields.eyeColor.id)!.en));
    }
  });
});

describe('禁断の調合のタグ形式（PixAI SDXL での実機確認を反映）', () => {
  it('相手役を呼ぶ立場の語を出さず、縄・組紐以外では「bound」を使わない（3モード×各60回）', () => {
    for (const mode of ['coherent', 'balanced', 'wild'] as const) {
      let s = emptyState(); s.settings.coherence = mode; s.optionalModules.unlimitedEnabled = true;
      for (let i = 0; i < 60; i++) {
        s = draw(s, { seed: `sdxl-${mode}-${i}` }).state;
        const out = buildPrompt(s, 'pixai');
        expect(out.positive, `${mode}#${i}`).not.toMatch(/\b(captive|prisoner|dominant|watchful|predatory)\b/);
        const fb = out.sections.find((x) => x.id === 'forbidden')?.tags ?? [];
        if (!['rope', 'silk_cord', 'bandage'].includes(s.fields.restraint.id!)) expect(fb.join(', '), `${mode}#${i} ${s.fields.restraint.id}`).not.toMatch(/\bbound\b/);
        // 長い説明の句はタグ形式に入れない
        for (const t of fb) expect(t.split(' ').length, t).toBeLessThanOrEqual(4);
      }
    }
  });
  it('寝室でうつ伏せなら「ベッドの上」にして、床の語を入れない', () => {
    const s = make('bed', { role: 'captive', restraint: 'rope', bindPos: 'wrists_behind', pose: 'prone_behind', scene: 'canopy_bedroom', shot: 'full_body' }, { unlimitedEnabled: true });
    const tags = buildPrompt(s, 'pixai').positive.split(', ');
    expect(tags).toContain('on bed');
    expect(tags.some((t) => /floor/.test(t))).toBe(false);
  });
  it('項垂れるポーズでは、視線の語（眼差し・こちらを見る）を外す', () => {
    const s = make('head', { role: 'captive', restraint: 'rope', bindPos: 'wrists_behind', pose: 'kneel_head_down', expression: 'intense_stare', shot: 'cowboy_shot' }, { unlimitedEnabled: true });
    const p = buildPrompt(s, 'pixai').positive;
    expect(p).toContain('head down');
    expect(p).not.toMatch(/\b(stare|gaze|looking at viewer)\b/);
  });
});

describe('禁断の調合：3回目の実機確認（ネガティブあり）を反映', () => {
  it('椅子に腰を縄で縛りつける（肘掛けへの固定は廃止し、古い保存は置き換える）', () => {
    const s = make('chair', { role: 'captive', restraint: 'rope', bindPos: 'chair_back', anchor: 'chair', pose: 'bound_chair', shot: 'cowboy_shot' }, { unlimitedEnabled: true });
    const tags = buildPrompt(s, 'pixai').positive.split(', ');
    expect(tags).toEqual(expect.arrayContaining(['(rope:1.2)', '(rope around waist:1.2)', '(tied to chair:1.2)', 'chair', 'arms behind back']));
    s.settings.negative = true;
    expect(buildPrompt(s, 'pixai').negative).not.toContain('rope belt');
    expect(tags.join(', ')).not.toMatch(/armrest|armchair/);
  });
  it('フードでは、目の語に加えて頭の向き・視線の語（looking …）も出さない', () => {
    const s = make('hoodgaze', { role: 'captive', restraint: 'rope', bindPos: 'wrists_behind', blindfold: 'hood_low', pose: 'bound_behind_lookback', shot: 'cowboy_shot', angle: 'eye_level' }, { unlimitedEnabled: true });
    const p = buildPrompt(s, 'pixai').positive;
    // 髪型の「hair over one eye」は髪の形なので対象外
    expect(p.replace(/hair over (one|both) eyes?/g, '')).not.toMatch(/\blooking\b|\beyes?\b|glance/);
    expect(p).toContain('hood pulled low');
  });
  it('ONのときは「人物 → ポーズ・構図 → 禁断演出 → 顔」の順にし、拘束具の要のタグに重みを付ける', () => {
    const s = make('front', { role: 'ruler', restraint: 'shadow_tentacles', bindPos: 'held', pose: 'beckoning', shot: 'upper_body', angle: 'eye_level' }, { unlimitedEnabled: true });
    const tags = buildPrompt(s, 'pixai').positive.split(', ');
    const i = tags.indexOf('male focus');
    expect(tags.slice(i + 1, i + 7)).toEqual(['beckoning', 'looking at viewer', 'upper body', 'tentacles', 'black tentacles', 'outstretched hand']);
    const b = make('ropefront', { role: 'captive', restraint: 'rope', bindPos: 'wrists_front', pose: 'bound_front_stand', shot: 'cowboy_shot', angle: 'eye_level' }, { unlimitedEnabled: true });
    const bt = buildPrompt(b, 'pixai').positive.split(', ');
    const j = bt.indexOf('cowboy shot');
    expect(bt.slice(j + 1, j + 4)).toEqual(['(rope:1.2)', '(bound wrists:1.2)', 'restrained']);
    expect(bt).toContain('(own hands together:1.2)');
    expect(buildPrompt(b, 'novelai').positive).toContain('{bound wrists}');
    expect(buildPrompt(b, 'genericTags').positive).not.toMatch(/[({]/);
  });
  it('触手で縛るときは禁断演出を衣装の後ろに置き、重みを付けず、妖艶さを強める語を外す', () => {
    const s = make('tent', { role: 'captive', restraint: 'tentacles', bindPos: 'wrists_overhead', pose: 'bound_overhead_stand', archetype: 'nocturnal_tempter', scene: 'tentacle_lair', shot: 'full_body' }, { unlimitedEnabled: true });
    const p = buildPrompt(s, 'pixai').positive;
    const tags = p.split(', ');
    expect(tags.indexOf('tentacles')).toBeGreaterThan(tags.indexOf('handsome'));
    expect(p).not.toMatch(/:1\.2\)/);
    expect(p).not.toMatch(/alluring|seduct|tempt/i);
  });
  it('フードは「目隠し」を呼ばないタグにして、ネガティブに blindfold を入れる', () => {
    const s = make('hood', { role: 'captive', restraint: 'rope', bindPos: 'wrists_front', blindfold: 'hood_low', pose: 'bound_front_kneel', shot: 'full_body', angle: 'eye_level' }, { unlimitedEnabled: true });
    s.settings.negative = true;
    const out = buildPrompt(s, 'pixai');
    expect(out.positive).toContain('hood pulled low');
    expect(out.positive).not.toMatch(/covered eyes|blindfold/);
    expect(out.positive).not.toContain('hands on lap');
    expect(out.negative.split(', ')).toContain('blindfold');
  });
  it('影の触手を操るときは、触手と外へ向けた手のタグを出し、自分の首に手を当てない', () => {
    const s = make('shadow', { role: 'ruler', restraint: 'shadow_tentacles', bindPos: 'held' }, { unlimitedEnabled: true });
    const p = buildPrompt(s, 'pixai').positive;
    expect(p).toMatch(/\btentacles\b/);
    expect(p).toContain('outstretched hand');
    expect(p).not.toContain('own neck');
  });
  it('うつ伏せ（後ろ手）は横顔寄りにし、足首だけの拘束は腕輪をネガティブに入れる', () => {
    const prone = make('prone', { role: 'captive', restraint: 'rope', bindPos: 'wrists_behind', pose: 'prone_behind', shot: 'full_body', blindfold: 'none' }, { unlimitedEnabled: true });
    prone.settings.negative = true;
    expect(buildPrompt(prone, 'pixai').positive).toContain('sideways glance');
    const pr = buildPrompt(prone, 'pixai');
    // 衣装にベルトがあれば、ネガティブの rope belt は外す
    if (!/\bbelt\b/.test(pr.positive)) expect(pr.negative.split(', ')).toContain('rope belt');
    const ank = make('ank', { role: 'captive', restraint: 'rope', bindPos: 'ankles', pose: 'prone_ankles', shot: 'full_body' }, { unlimitedEnabled: true });
    ank.settings.negative = true;
    expect(buildPrompt(ank, 'pixai').negative.split(', ')).toEqual(expect.arrayContaining(['bound wrists', 'bracelet']));
  });
});

describe('禁断の調合：素材の語を混ぜない', () => {
  it('鎖・装飾鎖以外では chain / chained を出さない（3モード×各60回）', () => {
    for (const mode of ['coherent', 'balanced', 'wild'] as const) {
      let s = emptyState(); s.settings.coherence = mode; s.optionalModules.unlimitedEnabled = true;
      for (let i = 0; i < 60; i++) {
        s = draw(s, { seed: `mat-${mode}-${i}` }).state;
        const fb = buildPrompt(s, 'pixai').sections.find((x) => x.id === 'forbidden')?.tags ?? [];
        if (!['chain', 'ornate_chain', 'light_chains'].includes(s.fields.restraint.id!)) expect(fb.join(', '), `${mode}#${i} ${s.fields.restraint.id}`).not.toMatch(/\bchain(ed|s)?\b/);
      }
    }
  });
});
