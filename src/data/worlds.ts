/* 世界観（作品舞台）と文化・意匠モチーフ（視覚意匠）。
 * 2つは独立した次元として扱う。世界観は outfit-prompt-workshop の worldviews 8種を土台に、
 * 男性キャラクター創作で需要の多い舞台へ拡張した。
 * 文化モチーフは concept-fashion-workshop / outfit の地域区分（東アジア・南アジア・西アジア…）を細分化し、
 * 「〜風の意匠」として衣装・装飾にだけ作用させる（肌色・人種とは結び付けない）。
 */
import type { Category, Option } from '../types';
import { added, o } from './helpers';

export const WORLD: Option[] = [
  // 現代
  o('modern', '現代日常', [], { cat: 'modern', tags: ['modern'], nat: 'in a contemporary everyday setting', nameSystem: 'japanese', w: 1.4 }),
  o('urban_night', '現代都会・夜', 'city', { cat: 'modern', tags: ['modern', 'urban', 'night'], nat: 'in a modern city after dark', nameSystem: 'japanese' }),
  o('business', '現代ビジネス', 'office', { cat: 'modern', tags: ['modern', 'urban', 'business'], nat: 'in a sleek modern business world', nameSystem: 'japanese' }),
  o('supernatural', '現代異能', 'urban fantasy', { cat: 'modern', tags: ['modern', 'supernatural', 'urban'], nat: 'in an urban fantasy world of hidden supernatural powers', nameSystem: 'japanese' }),
  o('noir', '裏社会ノワール', 'film noir', { cat: 'modern', tags: ['modern', 'urban', 'noir', 'dark'], nat: 'in a shadowy noir underworld', nameSystem: 'western' }),
  o('entertainment', '芸能・ステージ', 'stage', { cat: 'modern', tags: ['modern', 'stage'], nat: 'in the glamorous world of entertainment', nameSystem: 'japanese', w: 0.7 }),
  // 和・中華
  o('taisho', '大正浪漫', 'taisho era', { cat: 'eastern', tags: ['japan', 'retro', 'historical'], nat: 'in a romantic Taisho-era Japan', nameSystem: 'wafu', w: 0.8 }),
  o('japanese_historical', '和風時代劇', 'feudal japan', { cat: 'eastern', tags: ['japan', 'historical', 'eastern'], nat: 'in feudal-era Japan', nameSystem: 'wafu' }),
  o('wafu_fantasy', '和風ファンタジー', 'japanese fantasy', { cat: 'eastern', tags: ['japan', 'eastern', 'fantasy'], nat: 'in a mystical Japanese-inspired fantasy world', nameSystem: 'wafu', w: 1.3 }),
  o('chinese_court', '中華宮廷', 'chinese palace', { cat: 'eastern', tags: ['china', 'eastern', 'historical', 'court'], nat: 'in an opulent Chinese-inspired imperial court', nameSystem: 'chinese' }),
  o('wuxia', '中華武侠ファンタジー', 'wuxia', { cat: 'eastern', tags: ['china', 'eastern', 'fantasy', 'martial'], nat: 'in a wuxia fantasy world of wandering martial artists', nameSystem: 'chinese' }),
  // 西洋
  o('high_fantasy', 'ハイファンタジー', 'fantasy', { cat: 'western', tags: ['western', 'fantasy'], nat: 'in a classic high fantasy world', nameSystem: 'western', w: 1.4 }),
  o('dark_fantasy', 'ダークファンタジー', 'dark fantasy', { cat: 'western', tags: ['western', 'fantasy', 'dark'], nat: 'in a grim dark fantasy world', nameSystem: 'western', w: 1.2 }),
  o('gothic', 'ゴシック・吸血鬼', 'gothic', { cat: 'western', tags: ['western', 'dark', 'gothic', 'historical'], nat: 'in a gothic world of old castles and vampires', nameSystem: 'western' }),
  o('european_court', '近世ヨーロッパ宮廷', 'baroque', { cat: 'western', tags: ['western', 'historical', 'court'], nat: 'in an opulent early-modern European royal court', nameSystem: 'western' }),
  o('victorian', 'ヴィクトリア朝', 'victorian', { cat: 'western', tags: ['western', 'historical', 'retro'], nat: 'in Victorian-era London', nameSystem: 'western' }),
  o('steampunk', 'スチームパンク', 'steampunk', { cat: 'western', tags: ['western', 'retro', 'steampunk'], nat: 'in a brass-and-steam steampunk world', nameSystem: 'western', w: 0.8 }),
  o('northern', '北方・極北の王国', 'nordic fantasy', { cat: 'western', tags: ['north', 'fantasy', 'historical'], nat: 'in a cold northern kingdom of fjords and snow', nameSystem: 'western', w: 0.7 }),
  // 異国・神話
  o('desert_fantasy', '砂漠の王国', 'desert fantasy', { cat: 'exotic', tags: ['desert', 'fantasy', 'historical'], nat: 'in a desert kingdom of palaces and caravans', nameSystem: 'desert', w: 0.8 }),
  o('mythic', '神話・神域', 'mythology', { cat: 'exotic', tags: ['myth', 'fantasy', 'sacred'], nat: 'in a mythic realm of gods and spirits', nameSystem: 'western', w: 0.8 }),
  // 軍・SF
  o('military', '架空の軍隊', 'military', { cat: 'sf', tags: ['military', 'modern'], nat: 'in a fictional military setting', nameSystem: 'western', w: 0.8 }),
  o('near_future', '近未来SF', 'science fiction', { cat: 'sf', tags: ['sf', 'urban'], nat: 'in a sleek near-future science-fiction world', nameSystem: 'scifi' }),
  o('cyberpunk', 'サイバーパンク', 'cyberpunk', { cat: 'sf', tags: ['sf', 'urban', 'night', 'street'], nat: 'in a neon-soaked cyberpunk megacity', nameSystem: 'scifi' }),
  o('space_opera', 'スペースオペラ', 'space opera', { cat: 'sf', tags: ['sf', 'space'], nat: 'in a grand space opera', nameSystem: 'scifi', w: 0.8 }),
  o('post_apocalyptic', '終末世界', 'post-apocalypse', { cat: 'sf', tags: ['sf', 'wasteland', 'dark'], nat: 'in a desolate post-apocalyptic world', nameSystem: 'scifi', w: 0.6 }),
  // ミックス
  o('world_mix', '世界観ミックス', [], { cat: 'mix', tags: ['mix'], nat: 'in an eclectic world where eras and genres intentionally blend', nameSystem: 'mixed', w: 0.5, desc: '時代やジャンルの混在を意図的に楽しむ舞台。衣装・背景の相性判定が中立になります。' }),
  // ---- 2026-10 増築：文化モチーフを「生活の舞台」にする地域の世界観・時代・明るいSF ----
  // 実在の文化は「〜風（-inspired）」の架空の舞台として扱い、肌の色・顔立ちとは結び付けない。
  ...[
    o('korean_city', '現代韓国風の都市', 'modern korean-inspired city', { cat: 'world_city', tags: ['modern', 'urban', 'korea', 'regional'], nat: 'in a contemporary Korean-inspired city', nameSystem: 'mixed', w: 0.5 }),
    o('south_asian_metropolis', '南アジア風の大都市', 'south asian-inspired metropolis', { cat: 'world_city', tags: ['modern', 'urban', 'south_asia', 'regional'], nat: 'in a bustling South Asian-inspired metropolis', nameSystem: 'mixed', w: 0.45 }),
    o('southeast_asian_port', '東南アジア風の港町', 'southeast asian-inspired port city', { cat: 'world_city', tags: ['modern', 'water', 'tropical', 'regional'], nat: 'in a Southeast Asian-inspired port city', nameSystem: 'mixed', w: 0.45 }),
    o('central_asian_steppe', '中央アジア風の草原', 'central asian-inspired steppe', { cat: 'world_city', tags: ['steppe', 'historical', 'nomad', 'regional'], nat: 'on a Central Asian-inspired steppe', nameSystem: 'mixed', w: 0.45 }),
    o('silk_road_city', 'シルクロード風の交易都市', 'silk road-inspired trade city', { cat: 'world_city', tags: ['desert', 'historical', 'trade'], nat: 'in a Silk Road-inspired trading city', nameSystem: 'desert', w: 0.45 }),
    o('west_african_city', '西アフリカ風の幻想都市', 'west african-inspired fantasy city', { cat: 'world_city', tags: ['fantasy', 'west_africa_city', 'regional'], nat: 'in a fictional West African-inspired fantasy city', nameSystem: 'mixed', w: 0.4 }),
    o('east_african_coast', '東アフリカ風の沿岸交易都市', 'east african-inspired coastal trade city', { cat: 'world_city', tags: ['historical', 'water', 'trade', 'regional'], nat: 'in an East African-inspired coastal trading city', nameSystem: 'mixed', w: 0.4 }),
    o('andean_highland', 'アンデス風の高地', 'andean-inspired highlands', { cat: 'world_city', tags: ['fantasy', 'highland', 'regional'], nat: 'in Andean-inspired highlands', nameSystem: 'mixed', w: 0.4 }),
    o('mesoamerican_city', 'メソアメリカ風の神話都市', 'mesoamerican-inspired mythic city', { cat: 'world_city', tags: ['myth', 'fantasy', 'regional'], nat: 'in a Mesoamerican-inspired mythic city', nameSystem: 'mixed', w: 0.4 }),
    o('medieval_city', '中世ヨーロッパの街', 'medieval european city', { cat: 'western', tags: ['western', 'historical', 'medieval'], nat: 'in a medieval European city', nameSystem: 'western', w: 0.5 }),
    o('renaissance_court', 'ルネサンス宮廷', 'renaissance court', { cat: 'western', tags: ['western', 'historical', 'court'], nat: 'in a Renaissance court', nameSystem: 'western', w: 0.5 }),
    o('belle_epoque', 'ベル・エポックの街', 'belle epoque city', { cat: 'western', tags: ['western', 'retro', 'historical'], nat: 'in a Belle Époque city', nameSystem: 'western', w: 0.5 }),
    o('art_nouveau', 'アール・ヌーヴォーの都市', 'art nouveau city', { cat: 'western', tags: ['western', 'retro'], nat: 'in an Art Nouveau city of curving ironwork', nameSystem: 'western', w: 0.45 }),
    o('dieselpunk', 'ディーゼルパンク', 'dieselpunk', { cat: 'sf', tags: ['retro', 'military', 'industrial'], nat: 'in a dieselpunk world of airships and engines', nameSystem: 'western', w: 0.5 }),
    o('solarpunk', 'ソーラーパンク', 'solarpunk', { cat: 'sf', tags: ['sf', 'near_future', 'nature', 'bright'], nat: 'in an optimistic solarpunk future', nameSystem: 'scifi', w: 0.5 }),
    o('deep_sea_future', '海洋・深海SF', 'underwater science fiction city', { cat: 'sf', tags: ['sf', 'water', 'ocean', 'future'], nat: 'in an underwater science-fiction city', nameSystem: 'scifi', w: 0.45 })
  ].map(added)
];
export const WORLD_CATS: Category[] = [
  { id: 'modern', ja: '現代' }, { id: 'eastern', ja: '和・中華' }, { id: 'western', ja: '西洋' },
  { id: 'exotic', ja: '異国・神話' }, { id: 'world_city', ja: '世界の生活舞台' }, { id: 'sf', ja: '軍・SF' }, { id: 'mix', ja: 'ミックス' }
];

// ---------------- 文化・意匠モチーフ（任意） ----------------
const c = (id: string, ja: string, en: string, region: string, worlds: string[], extra: Partial<Option> = {}) =>
  o(id, ja, en, { cat: region, worlds, ...extra });
export const CULTURE: Option[] = [
  o('none', '指定なし', [], { w: 14, cat: 'none', desc: '世界観と衣装に任せます。' }),
  c('japan', '和', 'japanese-inspired motifs, asanoha pattern', 'east_asia', ['japan'], { nat: 'Japanese-inspired motifs such as asanoha patterns and family crests' }),
  c('ryukyu', '琉球', 'ryukyuan-inspired motifs, bingata pattern', 'east_asia', ['japan'], { w: 0.5, nat: 'Ryukyuan-inspired bingata textile motifs' }),
  c('china', '中華', 'chinese-inspired motifs, cloud pattern embroidery', 'east_asia', ['china'], { nat: 'Chinese-inspired cloud and dragon embroidery' }),
  c('korea', '韓', 'korean-inspired motifs, hanbok-style details', 'east_asia', ['eastern', 'court', 'chinese_court', 'wuxia', 'korean_city'], { w: 0.7, nat: 'Korean-inspired hanbok-style details' }),
  c('mongolia', '草原（モンゴル）', 'mongolian-inspired motifs, deel-style collar', 'central', ['north', 'wuxia', 'desert', 'central_asian_steppe'], { w: 0.5, nat: 'Mongolian steppe-inspired deel collars and knotwork' }),
  c('central_asia', 'シルクロード（中央アジア）', 'central asian-inspired motifs, ikat pattern', 'central', ['desert', 'wuxia', 'central_asian_steppe', 'silk_road_city'], { w: 0.6, nat: 'Silk Road ikat textiles and suzani embroidery' }),
  c('south_asia', '南アジア', 'south asian-inspired motifs, paisley embroidery', 'south', ['desert', 'mythic', 'south_asian_metropolis'], { w: 0.7, nat: 'South Asian-inspired paisley embroidery and draped fabric' }),
  c('southeast_asia', '東南アジア', 'southeast asian-inspired motifs, batik pattern', 'south', ['mythic', 'wuxia', 'southeast_asian_port'], { w: 0.6, nat: 'Southeast Asian batik and songket motifs' }),
  c('persia', 'ペルシア', 'persian-inspired motifs, arabesque pattern', 'west_asia', ['desert'], { w: 0.7, nat: 'Persian-inspired arabesque and miniature-painting motifs' }),
  c('arabia', 'アラビア', 'arabian-inspired motifs, geometric pattern', 'west_asia', ['desert'], { w: 0.7, nat: 'Arabian-inspired geometric patterns and flowing robes' }),
  c('ottoman', 'アナトリア（オスマン）', 'ottoman-inspired motifs, tulip pattern', 'west_asia', ['desert', 'european_court'], { w: 0.5, nat: 'Ottoman-inspired tulip patterns and kaftan details' }),
  c('maghreb', '北アフリカ（マグレブ）', 'north african-inspired motifs, zellige pattern', 'africa', ['desert'], { w: 0.5, nat: 'Maghrebi-inspired zellige patterns and hooded cloaks' }),
  c('west_africa', '西アフリカ', 'west african-inspired motifs, kente pattern', 'africa', ['mythic', 'desert', 'west_african_city'], { w: 0.5, nat: 'West African-inspired kente-style woven patterns' }),
  c('east_africa', '東アフリカ', 'east african-inspired motifs, beadwork', 'africa', ['mythic', 'desert', 'east_african_coast'], { w: 0.4, nat: 'East African-inspired beadwork and wrapped shuka cloth' }),
  c('nordic', '北欧', 'norse-inspired motifs, knotwork', 'europe', ['north'], { w: 0.7, nat: 'Norse-inspired knotwork and runic trim' }),
  c('celtic', 'ケルト', 'celtic-inspired motifs, celtic knot', 'europe', ['north', 'high_fantasy'], { w: 0.6, nat: 'Celtic knot motifs and woven tartan' }),
  c('slavic', 'スラヴ', 'slavic-inspired motifs, folk embroidery', 'europe', ['north', 'dark_fantasy'], { w: 0.6, nat: 'Slavic folk embroidery and fur-trimmed layers' }),
  c('mediterranean', '地中海・古典古代', 'greco-roman-inspired motifs, meander pattern', 'europe', ['myth'], { w: 0.6, nat: 'Greco-Roman meander borders and draped himation' }),
  c('western_court', '西欧宮廷', 'baroque-inspired motifs, damask pattern', 'europe', ['european_court', 'gothic', 'victorian', 'renaissance_court'], { w: 0.8, nat: 'Baroque damask and gold braid ornamentation' }),
  c('andes', 'アンデス', 'andean-inspired motifs, woven geometric pattern', 'america', ['mythic', 'andean_highland'], { w: 0.4, nat: 'Andean-inspired woven geometric textiles' }),
  c('mesoamerica', 'メソアメリカ', 'mesoamerican-inspired motifs, stepped fret pattern', 'america', ['myth', 'mesoamerican_city'], { w: 0.4, nat: 'Mesoamerican-inspired stepped fret patterns and featherwork' })
];
export const CULTURE_CATS: Category[] = [
  { id: 'none', ja: '指定なし' }, { id: 'east_asia', ja: '東アジア' }, { id: 'central', ja: '中央アジア・草原' },
  { id: 'south', ja: '南・東南アジア' }, { id: 'west_asia', ja: '西アジア' }, { id: 'africa', ja: 'アフリカ' },
  { id: 'europe', ja: 'ヨーロッパ' }, { id: 'america', ja: '中南米' }
];
