/* 呼び名候補（画像プロンプトには出力しない。日本語設定・保存名用）
 * creative-oc-maker の nameData（現代日本・和風・欧風・中華・砂漠・SF）から、男性名と中性名だけを移植。
 * 世界観の nameSystem と一致する系統を優先して抽選する。
 */
import type { Category, Option } from '../types';
import names from './imported/names.json';

type Given = { ja: string; reading?: string; roman: string; tags: string[] };
const SYSTEM_JA: Record<string, string> = { japanese: '現代日本', wafu: '和風', western: '欧風・ファンタジー', chinese: '中華', desert: '砂漠・西アジア風', scifi: 'SF・コードネーム' };

export const NAME: Option[] = Object.entries(names.systems as Record<string, { given: Given[] }>).flatMap(([system, v]) =>
  v.given.map((g, i): Option => ({
    id: `${system}_${String(i).padStart(3, '0')}`,
    ja: g.reading ? `${g.ja}（${g.reading}）` : `${g.ja}（${g.roman}）`,
    en: [],
    cat: system,
    nameSystem: system,
    tags: g.tags,
    desc: g.roman,
    src: 'oc:nameData'
  }))
);

export const NAME_CATS: Category[] = Object.keys(SYSTEM_JA).map((id) => ({ id, ja: SYSTEM_JA[id] }));
