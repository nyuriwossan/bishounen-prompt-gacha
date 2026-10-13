/* 背景・時間帯/天候・光
 * background-prompt-workshop の stages 41種（寝室は通常抽選の対象外）・times・weather・phenomena・
 * primaryLights / secondaryLights を移植し、和・中華・宮廷・夜の街などを追加した。
 * 「空間背景／シンプル背景」の切替は place:'simple' で表現する（シンプル背景では時間・天候を出力しない）。
 */
import type { Category, Option } from '../types';
import { o } from './helpers';
import bg from './imported/bg.json';

type BgOpt = { id: string; label: string; en: string };
const stageEn = new Map((bg.scene.stages as BgOpt[]).map((s) => [s.id, s.en]));
const natOf = (id: string) => stageEn.get(id);

const s = (id: string, ja: string, en: string, place: Option['place'], cat: string, worlds: string[], tags: string[] = [], extra: Partial<Option> = {}) =>
  o(id, ja, en, { place, cat, worlds, tags, nat: extra.nat ?? natOf(id), ...extra });

export const SCENE: Option[] = [
  // ---- 移植（background-prompt-workshop stages）----
  s('quiet_room', '静かな部屋', 'indoors, room', 'indoor', 'interior', ['modern'], ['calm'], { src: 'bg:stages' }),
  s('library', '図書館', 'library, bookshelf', 'indoor', 'interior', ['fantasy', 'western', 'modern', 'court', 'gothic'], ['intellect'], { src: 'bg:stages' }),
  s('laboratory', '研究室', 'laboratory', 'indoor', 'interior', ['modern', 'sf', 'steampunk'], ['intellect', 'tech'], { src: 'bg:stages' }),
  s('office', 'オフィス', 'office, window, city view', 'indoor', 'interior', ['business', 'modern'], ['business'], { src: 'bg:stages' }),
  s('theater', '劇場', 'theater, stage curtains', 'indoor', 'interior', ['stage', 'victorian', 'court'], ['stage'], { src: 'bg:stages' }),
  s('temple', '神殿', 'temple, pillars', 'indoor', 'sacred', ['myth', 'fantasy', 'sacred'], ['sacred'], { src: 'bg:stages' }),
  s('cathedral', '大聖堂', 'cathedral, stained glass', 'indoor', 'sacred', ['western', 'gothic', 'fantasy'], ['sacred'], { src: 'bg:stages' }),
  s('throne_room', '玉座の間', 'throne room', 'indoor', 'palace', ['court', 'fantasy', 'dark', 'western'], ['royal'], { src: 'bg:stages' }),
  s('palace_hall', '宮殿の大広間', 'palace, grand hall, chandelier', 'indoor', 'palace', ['court', 'western', 'fantasy'], ['royal'], { src: 'bg:stages' }),
  s('underground_facility', '地下施設', 'underground facility', 'indoor', 'sf', ['sf', 'military', 'supernatural'], ['tech', 'dark'], { src: 'bg:stages' }),
  s('abandoned_factory', '廃工場', 'abandoned factory', 'indoor', 'urban', ['modern', 'wasteland', 'noir', 'supernatural'], ['dark', 'street'], { src: 'bg:stages' }),
  s('deep_forest', '深い森', 'forest, trees', 'outdoor', 'nature', ['fantasy', 'japan', 'north', 'myth'], ['nature'], { src: 'bg:stages' }),
  s('flower_field', '花畑', 'flower field', 'outdoor', 'nature', ['fantasy', 'modern', 'myth'], ['nature', 'bright'], { src: 'bg:stages' }),
  s('seaside', '海辺', 'ocean, shore', 'outdoor', 'water', ['modern', 'fantasy', 'western'], ['nature', 'bright'], { src: 'bg:stages' }),
  s('lakeshore', '湖畔', 'lake, shore', 'outdoor', 'water', ['fantasy', 'modern', 'north'], ['nature', 'calm'], { src: 'bg:stages' }),
  s('sandy_beach', '明るい砂浜', 'beach, blue sky, ocean', 'outdoor', 'water', ['modern'], ['bright', 'nature'], { src: 'bg:stages', w: 0.6 }),
  s('rocky_coast', '岩のある海岸', 'rocky shore, ocean, waves', 'outdoor', 'water', ['fantasy', 'north', 'western'], ['nature', 'wild'], { src: 'bg:stages' }),
  s('back_alley', '路地裏', 'alley, narrow street', 'outdoor', 'urban', ['modern', 'urban', 'noir', 'cyberpunk', 'supernatural'], ['street', 'dark'], { src: 'bg:stages' }),
  s('city_street', '街路', 'city, street', 'outdoor', 'urban', ['modern', 'urban', 'business'], ['street'], { src: 'bg:stages' }),
  s('ancient_ruins', '古代遺跡', 'ruins, ancient ruins', 'outdoor', 'fantasy', ['fantasy', 'myth', 'desert'], ['mystic'], { src: 'bg:stages' }),
  s('ruined_garden', '廃庭園', 'overgrown garden, ruins', 'outdoor', 'fantasy', ['fantasy', 'gothic', 'dark'], ['melancholy'], { src: 'bg:stages' }),
  s('floating_island', '浮遊島', 'floating island, sky', 'outdoor', 'fantasy', ['fantasy', 'myth'], ['mystic', 'bright'], { src: 'bg:stages' }),
  s('crystal_valley', '水晶の谷', 'crystal, valley', 'outdoor', 'fantasy', ['fantasy', 'myth'], ['mystic'], { src: 'bg:stages' }),
  s('future_city', '未来都市', 'futuristic city, skyscraper', 'outdoor', 'sf', ['sf', 'urban'], ['tech'], { src: 'bg:stages' }),
  s('space_station', '宇宙ステーション', 'space station, window, planet', 'indoor', 'sf', ['sf', 'space'], ['tech'], { src: 'bg:stages' }),
  s('balcony', 'バルコニー', 'balcony, railing', 'semi', 'terrace', ['modern', 'court', 'western', 'urban'], ['calm'], { src: 'bg:stages' }),
  s('cloister', '回廊', 'cloister, arches, columns', 'semi', 'terrace', ['western', 'gothic', 'fantasy', 'court'], ['calm', 'sacred'], { src: 'bg:stages' }),
  s('station_platform', '駅ホーム', 'train station, platform', 'semi', 'urban', ['modern', 'taisho', 'retro'], ['melancholy'], { src: 'bg:stages' }),
  s('rooftop', '屋上', 'rooftop, city view, fence', 'outdoor', 'urban', ['modern', 'urban', 'supernatural'], ['melancholy'], { src: 'bg:stages' }),
  s('cafe', 'カフェ', 'cafe, indoors, wooden interior', 'indoor', 'interior', ['modern', 'taisho', 'retro'], ['calm', 'soft'], { src: 'bg:stages' }),
  s('classroom', '放課後の教室', 'classroom, window', 'indoor', 'interior', ['modern'], ['soft'], { src: 'bg:stages', w: 0.4 }),
  s('old_town', '古い石畳の街', 'old town, cobblestone street', 'outdoor', 'urban', ['western', 'victorian', 'fantasy', 'steampunk'], ['retro'], { src: 'bg:stages' }),
  s('cave_entrance', '洞窟の入口', 'cave entrance', 'semi', 'fantasy', ['fantasy', 'dark', 'myth'], ['dark', 'mystic'], { src: 'bg:stages' }),
  s('temple_gate', '神殿の門', 'temple gate, monumental entrance', 'outdoor', 'sacred', ['myth', 'fantasy', 'desert'], ['sacred'], { src: 'bg:stages' }),
  s('dreamscape', '夢の中', 'dreamlike, surreal', 'simple', 'surreal', [], ['mystic', 'ethereal'], { src: 'bg:stages', w: 0.6 }),
  s('memory_space', '記憶の空間', 'fragmented memories, surreal', 'simple', 'surreal', [], ['melancholy', 'mystic'], { src: 'bg:stages', w: 0.5 }),
  s('deep_space', '宇宙', 'space, stars, nebula', 'simple', 'surreal', ['sf', 'space', 'myth'], ['mystic'], { src: 'bg:stages', w: 0.6 }),
  s('other_dimension', '異次元', 'otherworldly, abstract', 'simple', 'surreal', ['myth', 'supernatural', 'dark'], ['mystic'], { src: 'bg:stages', w: 0.5 }),
  s('minimal_void', '光る抽象空間', 'abstract background, light', 'simple', 'simple', [], ['ethereal'], { src: 'bg:stages' }),
  // ---- 追加：和 ----
  s('shrine', '神社の境内', 'shrine, torii', 'outdoor', 'japan', ['japan', 'supernatural'], ['sacred'], { nat: 'the grounds of a Shinto shrine with a vermilion torii' }),
  s('bamboo_forest', '竹林', 'bamboo forest', 'outdoor', 'japan', ['japan', 'china', 'martial'], ['nature', 'calm'], { nat: 'a quiet bamboo forest' }),
  s('engawa', '縁側', 'engawa, japanese house, garden', 'semi', 'japan', ['japan', 'taisho'], ['calm', 'soft'], { nat: 'the wooden veranda of a traditional Japanese house' }),
  s('tea_room', '茶室', 'tatami, japanese room, shouji', 'indoor', 'japan', ['japan'], ['calm', 'elegant'], { nat: 'a tatami tea room with paper sliding doors' }),
  s('sakura_avenue', '桜並木', 'cherry blossoms, tree-lined path', 'outdoor', 'japan', ['japan', 'modern', 'taisho'], ['bright', 'soft'], { nat: 'an avenue of blooming cherry trees' }),
  s('red_bridge', '朱塗りの橋', 'red bridge, river', 'outdoor', 'japan', ['japan', 'china', 'fantasy'], ['elegant'], { nat: 'a vermilion arched bridge over a river' }),
  s('castle_town', '城下町', 'japanese castle, town', 'outdoor', 'japan', ['japan'], ['retro'], { nat: 'a castle town beneath a Japanese castle' }),
  s('red_light_lanterns', '提灯の灯る夜の街並み', 'paper lantern, night street, wooden buildings', 'outdoor', 'japan', ['japan', 'taisho', 'fantasy'], ['night', 'alluring'], { nat: 'a narrow old street lit by rows of paper lanterns' }),
  s('taisho_salon', '大正のカフェー', 'retro cafe, stained glass lamp', 'indoor', 'japan', ['taisho', 'retro'], ['retro', 'elegant'], { nat: 'a Taisho-era cafe with stained-glass lamps' }),
  // ---- 追加：中華 ----
  s('pavilion', '中華の楼閣', 'chinese architecture, pavilion', 'semi', 'china', ['china'], ['elegant', 'royal'], { nat: 'an ornate Chinese pavilion with curved eaves' }),
  s('lotus_pond', '蓮池', 'lotus pond, water', 'outdoor', 'china', ['china', 'japan', 'myth'], ['calm', 'sacred'], { nat: 'a still pond covered in blooming lotus' }),
  s('misty_mountains', '霧の山水', 'mountains, mist, chinese landscape', 'outdoor', 'china', ['china', 'martial', 'fantasy'], ['mystic', 'nature'], { nat: 'mist-wrapped peaks like a Chinese ink landscape' }),
  s('forbidden_palace', '紅い宮殿の回廊', 'red palace walls, chinese palace', 'outdoor', 'china', ['china', 'court'], ['royal'], { nat: 'a long corridor of red imperial palace walls' }),
  // ---- 追加：西洋・宮廷・ゴシック ----
  s('ballroom', '舞踏会の広間', 'ballroom, chandelier', 'indoor', 'palace', ['court', 'victorian', 'gothic'], ['royal', 'elegant'], { nat: 'a glittering ballroom beneath crystal chandeliers' }),
  s('rose_garden', '薔薇園', 'rose garden, roses', 'outdoor', 'palace', ['court', 'western', 'gothic', 'fantasy'], ['elegant', 'alluring'], { nat: 'a formal rose garden in full bloom' }),
  s('greenhouse', '硝子の温室', 'greenhouse, plants, glass roof', 'indoor', 'palace', ['victorian', 'modern', 'fantasy'], ['soft', 'nature'], { nat: 'a glass greenhouse full of plants' }),
  s('castle_balcony', '城のバルコニー', 'castle, balcony, distant mountains', 'semi', 'palace', ['fantasy', 'court', 'western', 'north'], ['royal'], { nat: 'a stone balcony of a castle overlooking distant mountains' }),
  s('gothic_castle', '古城', 'gothic castle, candlelight', 'indoor', 'gothic', ['gothic', 'dark'], ['dark', 'royal'], { nat: 'a dim hall inside an ancient gothic castle' }),
  s('graveyard', '墓地', 'graveyard, tombstones', 'outdoor', 'gothic', ['gothic', 'dark'], ['dark', 'melancholy'], { nat: 'a moonlit graveyard of leaning tombstones' }),
  s('study', '書斎', 'study room, desk, bookshelf', 'indoor', 'interior', ['victorian', 'modern', 'court', 'gothic'], ['intellect'], { nat: 'a wood-paneled private study' }),
  s('tavern', '酒場', 'tavern, wooden interior', 'indoor', 'interior', ['fantasy', 'western', 'north'], ['casual', 'warm'], { nat: 'a lively wooden tavern' }),
  s('battlefield', '戦場跡', 'battlefield, smoke', 'outdoor', 'fantasy', ['fantasy', 'military', 'dark', 'historical'], ['dark', 'warrior'], { nat: 'a smoke-hazed battlefield' }),
  s('harbor', '港', 'harbor, ships', 'outdoor', 'water', ['western', 'fantasy', 'modern', 'historical'], ['travel'], { nat: 'a busy harbor full of ships' }),
  s('ship_deck', '船の甲板', 'ship, deck, ocean', 'outdoor', 'water', ['fantasy', 'western', 'historical'], ['travel', 'wild'], { nat: 'the deck of a sailing ship at sea' }),
  s('snowy_peak', '雪山の峠', 'snowy mountains', 'outdoor', 'nature', ['north', 'fantasy'], ['wild', 'cold'], { nat: 'a windswept snowy mountain pass' }),
  // ---- 追加：現代の夜 ----
  s('bar_counter', 'バーカウンター', 'bar, counter, bottles', 'indoor', 'urban', ['urban', 'noir', 'modern'], ['night', 'alluring'], { nat: 'a dim bar counter lined with bottles' }),
  s('neon_street', 'ネオン街', 'neon lights, night city', 'outdoor', 'urban', ['urban', 'cyberpunk', 'modern'], ['night', 'street'], { nat: 'a street glowing with neon signs' }),
  s('penthouse', '高層階の窓辺', 'penthouse, window, night city', 'indoor', 'urban', ['business', 'urban', 'noir'], ['luxury'], { nat: 'a penthouse window overlooking the city' }),
  s('concert_stage', 'ライブステージ', 'stage, concert, stage lights', 'indoor', 'urban', ['stage'], ['stage'], { nat: 'a concert stage under bright lights' }),
  s('night_crossing', '夜の交差点', 'crosswalk, night, city lights', 'outdoor', 'urban', ['modern', 'urban'], ['night'], { nat: 'a city crossing at night' }),
  // ---- 追加：砂漠・神話・SF ----
  s('desert_dunes', '砂丘', 'desert, sand dunes', 'outdoor', 'exotic', ['desert'], ['wild'], { nat: 'golden desert dunes' }),
  s('oasis', 'オアシス', 'oasis, palm tree', 'outdoor', 'exotic', ['desert'], ['calm'], { nat: 'a palm-fringed desert oasis' }),
  s('bazaar', '市場（バザール）', 'bazaar, market, hanging lamps', 'outdoor', 'exotic', ['desert', 'fantasy'], ['lively'], { nat: 'a bustling bazaar hung with lamps' }),
  s('arabesque_palace', 'アラベスクの宮殿', 'palace, arabesque, arches', 'indoor', 'exotic', ['desert', 'court'], ['royal', 'elegant'], { nat: 'a palace hall of carved arabesque arches' }),
  s('celestial_realm', '天上界', 'heaven, clouds, light rays', 'outdoor', 'exotic', ['myth', 'sacred'], ['sacred', 'bright'], { nat: 'a celestial realm above the clouds' }),
  s('neon_alley_cyber', 'サイバー都市の裏路地', 'cyberpunk, alley, holograms', 'outdoor', 'sf', ['cyberpunk', 'sf'], ['night', 'tech'], { nat: 'a cyberpunk back alley full of holograms' }),
  s('cockpit', 'コックピット', 'cockpit, control panel', 'indoor', 'sf', ['sf', 'military', 'space'], ['tech'], { nat: 'the cockpit of a ship' }),
  s('ruined_city', '廃墟都市', 'ruined city, overgrown buildings', 'outdoor', 'sf', ['wasteland', 'sf'], ['dark', 'melancholy'], { nat: 'an overgrown ruined city' }),
  // ---- シンプル背景 ----
  s('simple_white', '白背景', 'simple background, white background', 'simple', 'simple', [], [], { nat: 'a plain white background', w: 1.2 }),
  s('simple_gray', 'グレー背景', 'simple background, grey background', 'simple', 'simple', [], [], { nat: 'a plain gray background' }),
  s('simple_dark', '暗い背景', 'simple background, dark background', 'simple', 'simple', [], ['dark'], { nat: 'a plain dark background' }),
  s('gradient_night', '夜色のグラデーション', 'gradient background, dark blue background', 'simple', 'simple', [], ['night'], { nat: 'a deep night-blue gradient background' }),
  s('gradient_warm', '暖色のグラデーション', 'gradient background, orange background', 'simple', 'simple', [], ['warm'], { nat: 'a warm sunset-toned gradient background' }),
  s('studio', 'スタジオ背景', 'studio background', 'simple', 'simple', [], [], { nat: 'a clean photo studio backdrop' }),
  s('petals_simple', '舞う花びらの単色背景', 'simple background, falling petals', 'simple', 'simple', [], ['soft'], { nat: 'a plain background with drifting petals' }),
  s('ink_abstract', '墨流しの抽象背景', 'abstract background, ink wash', 'simple', 'simple', ['japan', 'china'], ['eastern'], { nat: 'an abstract ink-wash background' }),
  s('sparkle_dark', '光の粒が舞う暗背景', 'simple background, dark background, light particles', 'simple', 'simple', [], ['mystic'], { nat: 'a dark background scattered with light particles' })
];
export const SCENE_CATS: Category[] = [
  { id: 'interior', ja: '室内' }, { id: 'palace', ja: '宮殿・庭園' }, { id: 'sacred', ja: '神殿・聖堂' }, { id: 'gothic', ja: 'ゴシック' },
  { id: 'japan', ja: '和の景色' }, { id: 'china', ja: '中華の景色' }, { id: 'nature', ja: '自然' }, { id: 'water', ja: '水辺・海' },
  { id: 'urban', ja: '都市・夜の街' }, { id: 'terrace', ja: 'テラス・回廊' }, { id: 'fantasy', ja: '幻想景観' }, { id: 'exotic', ja: '砂漠・神話' },
  { id: 'sf', ja: 'SF' }, { id: 'surreal', ja: '夢・宇宙' }, { id: 'simple', ja: 'シンプル背景' }
];

// ---------------- 時間帯・天候 ----------------
const t = (id: string, ja: string, en: string, daylight: Option['daylight'], extra: Partial<Option> = {}) => o(id, ja, en, { daylight, ...extra });
export const TIME: Option[] = [
  t('dawn', '夜明け', 'dawn', 'twilight', { src: 'bg:times', nat: 'at dawn' }),
  t('morning', '朝', 'morning', 'day', { src: 'bg:times', nat: 'in the morning' }),
  t('day', '昼', 'day', 'day', { src: 'bg:times', nat: 'during the day', w: 1.3 }),
  t('sunset', '夕暮れ', 'sunset', 'twilight', { src: 'bg:times', nat: 'at sunset', w: 1.3 }),
  t('dusk', '薄暮', 'dusk', 'twilight', { src: 'bg:times', nat: 'at dusk' }),
  t('night', '夜', 'night', 'night', { src: 'bg:times', nat: 'at night', w: 1.4 }),
  t('moonlit_night', '月夜', 'night, full moon', 'night', { nat: 'on a night with a full moon', w: 1.1 }),
  t('starry_night', '星空の夜', 'night, starry sky', 'night', { outdoorOnly: true, nat: 'beneath a starry sky' }),
  t('rainy_day', '雨の日', 'rain', 'day', { outdoorOnly: true, src: 'bg:weather', nat: 'in steady rain' }),
  t('rainy_night', '雨の夜', 'rain, night', 'night', { outdoorOnly: true, src: 'bg:weather', nat: 'on a rainy night' }),
  t('snowy_day', '雪の日', 'snowing', 'day', { outdoorOnly: true, src: 'bg:weather', nat: 'in falling snow' }),
  t('snowy_night', '雪の夜', 'snowing, night', 'night', { outdoorOnly: true, nat: 'on a snowy night' }),
  t('foggy', '霧の朝', 'fog, morning', 'day', { outdoorOnly: true, src: 'bg:phenomena', nat: 'in rolling morning fog' }),
  t('storm', '嵐', 'storm, dark clouds', 'twilight', { outdoorOnly: true, src: 'bg:weather', nat: 'during a gathering storm', w: 0.6 }),
  t('petal_wind', '花びらの舞う日', 'falling petals, wind', 'day', { outdoorOnly: true, src: 'bg:phenomena', nat: 'as petals drift on the wind' }),
  t('autumn_leaves', '落ち葉の舞う夕べ', 'autumn leaves, falling leaves', 'twilight', { outdoorOnly: true, src: 'bg:phenomena', nat: 'as autumn leaves swirl down' })
];

// ---------------- 光 ----------------
const l = (id: string, ja: string, en: string, needs: Option['needs'] | undefined, tags: string[], extra: Partial<Option> = {}) =>
  o(id, ja, en, { needs, tags, ...extra });
const DAY: Option['needs'] = ['day', 'twilight'];
export const LIGHT: Option[] = [
  l('soft_natural', '柔らかな自然光', 'soft lighting, natural light', DAY, ['bright', 'soft'], { src: 'bg:primaryLights', w: 1.3 }),
  l('window_light', '窓から差す光', 'sunlight, window light', DAY, ['bright', 'soft', 'indoor'], { src: 'bg:secondaryLights' }),
  l('golden_backlight', '夕陽の逆光', 'backlighting, golden hour', ['twilight'], ['warm', 'melancholy'], { src: 'bg:directions' }),
  l('sunbeams', '木漏れ日と光の筋', 'dappled sunlight, light rays', ['day'], ['bright', 'nature']),
  l('moonlight', '月明かり', 'moonlight', ['night'], ['cool', 'mystic', 'dark'], { src: 'bg:primaryLights' }),
  l('neon', 'ネオンの光', 'neon lights, colorful lighting', ['night', 'twilight'], ['urban', 'night'], { src: 'bg:primaryLights', worlds: ['urban', 'sf', 'night', 'stage', 'street', 'modern'] }),
  l('streetlight', '街灯', 'streetlight', ['night', 'twilight'], ['urban', 'melancholy'], { src: 'bg:secondaryLights' }),
  l('candlelight', '蝋燭の灯り', 'candlelight, warm lighting', undefined, ['warm', 'dark', 'elegant'], { src: 'bg:primaryLights' }),
  l('lantern_glow', '灯籠・提灯の灯り', 'lantern light, warm glow', undefined, ['warm', 'eastern'], { worlds: ['japan', 'china', 'eastern', 'fantasy', 'desert'] }),
  l('firelight', '炎の照り返し', 'firelight, embers', undefined, ['warm', 'wild'], { src: 'bg:secondaryLights' }),
  l('rim_light', '輪郭を縁取るリムライト', 'rim lighting', undefined, ['cool', 'dramatic'], { src: 'bg:secondaryLights', w: 1.2 }),
  l('cinematic_side', '映画的なサイドライト', 'cinematic lighting, side lighting', undefined, ['dramatic'], { w: 1.2 }),
  l('chiaroscuro', '明暗の強い光', 'chiaroscuro, dramatic lighting', undefined, ['dramatic', 'dark']),
  l('studio_soft', 'スタジオの柔らかな光', 'studio lighting, soft lighting', undefined, ['soft'], { src: 'bg:primaryLights' }),
  l('spotlight', 'スポットライト', 'spotlight', undefined, ['stage', 'dramatic'], { worlds: ['stage', 'modern', 'urban', 'noir', 'victorian'] }),
  l('stained_glass', 'ステンドグラスの光', 'stained glass light, colorful light', DAY, ['sacred', 'indoor'], { worlds: ['western', 'gothic', 'court', 'retro', 'high_fantasy', 'dark_fantasy'] }),
  l('magic_glow', '魔法の光', 'magical glow, glowing particles', undefined, ['mystic'], { src: 'bg:primaryLights', worlds: ['fantasy', 'myth', 'supernatural', 'sacred', 'dark'] }),
  l('bioluminescence', '発光する花と光の粒', 'bioluminescence, glowing flowers', ['night', 'twilight'], ['mystic', 'nature'], { worlds: ['fantasy', 'myth', 'supernatural'] }),
  l('holographic', 'ホログラムの光', 'holographic light, blue glow', undefined, ['tech', 'night'], { worlds: ['sf'] }),
  l('lightning', '稲光', 'lightning, dramatic lighting', ['night', 'twilight'], ['dark', 'dramatic'], { w: 0.5 }),
  l('overcast_soft', '曇り空の拡散光', 'overcast, diffused light', ['day', 'twilight'], ['soft', 'melancholy'], { src: 'bg:qualities' })
];
