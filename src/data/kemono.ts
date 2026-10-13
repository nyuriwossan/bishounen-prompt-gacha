/* 任意の獣人モード（既定OFF）
 * kemono-prompt-workshop の SPECIES / GROUPS（imported/kemono.json）から、
 * 美青年の顔立ちを保てる種族を選び、同工房の generate() と同じ規則で部位タグを組み立てる。
 * 美形アンカー（人の顔）を保つため、獣化レベルは同工房の Lv.1〜3 のみを採用し、
 * 頭部まで動物になる Lv.4〜5 は移植していない。
 */
import type { KemonoSpecies, Option } from '../types';
import { o } from './helpers';
import kemono from './imported/kemono.json';

type Group = { cover: string; coverJa: string; head: string; tailNoun: string; tailJa: string; kin: string; partial: string; lv3cover: string; claws?: string | null; teeth?: string | null; wings?: boolean; noTail?: boolean };
type Species = { id: string; ja: string; en: string; g: KemonoSpecies['group']; ears?: string[]; tails?: string[]; feat?: Array<{ en: string; ja: string; min: number }>; o?: Partial<Group> };

const GROUPS = kemono.groups as unknown as Record<string, Group>;
const SPECIES = kemono.species as unknown as Species[];

const PICK = ['wolf', 'fox', 'dog', 'cat', 'tiger', 'leopard', 'panther', 'snowleopard', 'lion', 'bear', 'tanuki', 'rabbit', 'deer', 'sheep',
  'goat', 'horse', 'bat', 'otter', 'hawk', 'owl', 'crow', 'peacock', 'swan', 'dove', 'snake', 'dragon', 'eastdragon', 'shark', 'orca'];

const EAR_EN: Record<string, string> = { pointed: 'pointed', floppy: 'floppy', round: 'round', big: 'large', small: 'small', long: 'long' };
const HEAD_EN: Record<string, string> = { crest: 'feather crest', tufts: 'feather ear tufts', headwings: 'head wings', horns: 'horns', spines: 'head spines', finears: 'fin-shaped ears' };
const fill = (tpl: string, v: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

function build(sp: Species): KemonoSpecies {
  const C: Group = { ...GROUPS[sp.g], ...(sp.o || {}) };
  const s = sp.en, lv: KemonoSpecies['lv'] = { 1: [], 2: [], 3: [] }, ja: KemonoSpecies['partsJa'] = { 1: [], 2: [], 3: [] };
  for (const level of [1, 2, 3] as const) {
    const T: string[] = [], J: string[] = [];
    if (level === 3) T.push(fill(C.kin, { s }));
    // 頭部
    const first = sp.ears?.[0];
    if (C.head === 'ears') { T.push([first ? EAR_EN[first] : '', s, 'ears'].filter(Boolean).join(' ')); J.push(`${sp.ja}の耳`); }
    else if (first && HEAD_EN[first]) { T.push(HEAD_EN[first]); J.push(first === 'finears' ? 'ひれ耳' : first === 'crest' ? '冠羽' : first === 'tufts' ? '羽角' : '頭の飾り'); }
    // 固有パーツ
    for (const f of sp.feat || []) if (f.min <= level) { T.push(f.en); J.push(f.ja); }
    if (C.wings) { T.push('feathered wings'); J.push('翼'); }
    // 尾
    if (!C.noTail) {
      const mod = (sp.tails || []).find((t) => t !== 'multi');
      T.push([mod && mod !== 'fan' && mod !== 'ornate' ? mod : '', s, C.tailNoun].filter(Boolean).join(' '));
      J.push(`${sp.ja}の${C.tailJa}`);
    }
    // 牙・爪・体表
    if (level >= 2) {
      if (C.teeth) { T.push(C.teeth); J.push('牙'); }
      if (C.claws) { T.push(C.claws); J.push('爪'); }
      if (level === 2) { T.push(fill(C.partial, { c: '', cov: C.cover })); J.push(`部分的な${C.coverJa}`); }
      else { T.push(fill(C.lv3cover, { cov: C.cover })); J.push(`見える${C.coverJa}`); }
    }
    lv[level] = [...new Set(T.filter(Boolean))];
    ja[level] = [...new Set(J)];
  }
  return { group: sp.g, lv, partsJa: ja };
}

export const KEMONO_SPECIES: Option[] = SPECIES.filter((sp) => PICK.includes(sp.id)).map((sp) =>
  o(sp.id, sp.ja, [], { cat: sp.g, kemono: build(sp), src: 'kemono:SPECIES', w: ['wolf', 'fox', 'cat', 'dragon', 'snowleopard', 'crow'].includes(sp.id) ? 1.5 : 1 })
);

export const KEMONO_LEVEL: Option[] = [
  o('lv1', 'ケモミミ（耳と尾だけ）', [], { w: 3, desc: '顔と体は人間のまま。獣の耳と尾が付く。', src: 'kemono:LEVELS[0]' }),
  o('lv2', '軽度獣人（牙・爪・部分的な毛並み）', [], { w: 2, desc: '人間ベースに牙や爪、部分的な体表が加わる。', src: 'kemono:LEVELS[1]' }),
  o('lv3', '標準獣人（顔は人に近い）', [], { w: 1, desc: 'ひと目で獣人と分かるが、顔は人に近いまま。', src: 'kemono:LEVELS[2]' })
];

export const KEMONO_CATS = [
  { id: 'mammal', ja: '哺乳類' }, { id: 'bird', ja: '鳥類' }, { id: 'reptile', ja: '爬虫類・竜' }, { id: 'aquatic', ja: '水棲' }
];
