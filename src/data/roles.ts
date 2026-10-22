/* 職業・立場／雰囲気／表情
 * 職業は outfit-prompt-workshop の roles 16種と creative-oc-maker の occupationPools（世界観別）を参考に、
 * 男性キャラクター向けに再編・拡張した新規データ。
 * 表情は pose-composition-workshop の expressions（27種）から男性美形に合う語を移植し、冷笑・不敵などを追加。
 */
import type { Category, Option } from '../types';
import { FORBIDDEN_EXPRESSIONS } from './forbidden';
import { added, o } from './helpers';

const job = (id: string, ja: string, en: string, cat: string, worlds: string[], outfitPrefs: string[], extra: Partial<Option> = {}) =>
  o(id, ja, en, { cat, worlds, outfitPrefs, ...extra });

export const OCCUPATION: Option[] = [
  o('none', '指定しない', [], { w: 3, cat: 'none', desc: '立場を決めずに外見だけで勝負。' }),
  // 王侯・貴族
  job('king', '若き国王', 'king', 'royal', ['court', 'fantasy', 'western', 'north'], ['#royal', '#crown'], { tags: ['royal'] }),
  job('crown_prince', '王太子', 'prince', 'royal', ['court', 'fantasy', 'western', 'desert'], ['#royal'], { tags: ['royal'] }),
  job('emperor', '皇帝', 'emperor', 'royal', ['court', 'china', 'fantasy'], ['#royal', '#crown'], { ageMin: 25, tags: ['royal'], w: 0.7 }),
  job('duke', '公爵家の当主', 'duke', 'royal', ['court', 'victorian', 'gothic', 'western'], ['#noble', '#royal'], { tags: ['noble'] }),
  job('young_master', '名家の若様', 'young master', 'royal', ['japan', 'china', 'taisho', 'modern'], ['#traditional', '#noble'], { tags: ['noble'] }),
  job('heir_ceo', '財閥の御曹司', 'heir', 'royal', ['modern', 'business', 'urban'], ['#suit', '#luxury'], { tags: ['noble'] }),
  job('vampire_lord', '夜の一族の当主', 'vampire', 'royal', ['gothic', 'dark', 'urban'], ['#gothic', '#noble', 'vampire_noble'], { tags: ['inhuman', 'noble'], w: 0.8 }),
  job('demon_king', '魔王', 'demon lord', 'royal', ['dark', 'fantasy'], ['demon_lord', '#dark'], { tags: ['inhuman', 'danger'], w: 0.7 }),
  job('sultan', '砂漠の王', 'sultan', 'royal', ['desert'], ['desert_prince', 'bisht', 'persian_prince', '#royal'], { tags: ['royal'], w: 0.6 }),
  // 武人
  job('knight', '騎士', 'knight', 'warrior', ['fantasy', 'western', 'court'], ['#knight', '#armor'], { tags: ['warrior'] }),
  job('paladin', '聖騎士', 'paladin', 'warrior', ['fantasy', 'western', 'sacred'], ['holy_knight', '#knight'], { tags: ['warrior', 'sacred'] }),
  job('commander', '将軍', 'general', 'warrior', ['military', 'fantasy', 'china', 'western'], ['#officer', '#military', '#armor'], { ageMin: 25, tags: ['warrior'] }),
  job('officer', '軍の将校', 'military officer', 'warrior', ['military', 'western', 'modern', 'sf'], ['#officer', '#military'], { tags: ['warrior'] }),
  job('samurai', '侍', 'samurai', 'warrior', ['japan'], ['samurai', 'montsuki', 'kimono_haori'], { tags: ['warrior'] }),
  job('ronin', '流浪の剣客', 'wandering swordsman', 'warrior', ['japan', 'china', 'fantasy'], ['ronin', 'wuxia_swordsman', '#travel'], { tags: ['warrior'] }),
  job('swordmaster', '剣の師範', 'swordmaster', 'warrior', ['china', 'japan', 'fantasy', 'martial'], ['wuxia_swordsman', 'samurai'], { tags: ['warrior'] }),
  job('mercenary', '傭兵', 'mercenary', 'warrior', ['fantasy', 'wasteland', 'western'], ['mercenary', '#rugged'], { tags: ['warrior', 'wild'] }),
  job('gladiator', '剣闘士', 'gladiator', 'warrior', ['myth', 'fantasy'], ['gladiator'], { tags: ['warrior', 'wild'], w: 0.5 }),
  job('bodyguard', '護衛', 'bodyguard', 'warrior', ['modern', 'noir', 'court', 'fantasy'], ['#suit', '#armor'], { tags: ['warrior'] }),
  job('dragon_knight', '竜騎士', 'dragoon', 'warrior', ['fantasy'], ['#armor', '#knight'], { tags: ['warrior'], w: 0.6 }),
  // 裏社会・危険
  job('assassin', '暗殺者', 'assassin', 'shadow', ['fantasy', 'dark', 'desert', 'japan'], ['assassin', 'shinobi', '#assassin'], { tags: ['danger'] }),
  job('ninja', '忍', 'ninja', 'shadow', ['japan'], ['shinobi'], { tags: ['danger'] }),
  job('mafia_boss', 'マフィアのボス', 'mafia boss', 'shadow', ['noir', 'modern', 'urban'], ['mafia_coat', 'double_breasted', '#suit'], { ageMin: 25, tags: ['danger', 'noble'] }),
  job('yakuza', '若頭', 'yakuza', 'shadow', ['modern', 'urban', 'noir'], ['#suit', 'loose_kimono'], { tags: ['danger'] }),
  job('gambler', '賭博師', 'gambler', 'shadow', ['noir', 'urban', 'western', 'retro'], ['#suit', 'waistcoat_shirt'], { tags: ['danger', 'playful'] }),
  job('spy', '諜報員', 'spy', 'shadow', ['modern', 'noir', 'military', 'retro'], ['#suit', 'trench_suit'], { tags: ['danger', 'cool'] }),
  job('thief', '怪盗', 'phantom thief', 'shadow', ['modern', 'victorian', 'urban'], ['magician', 'tuxedo', 'masquerade'], { tags: ['playful'], w: 0.7 }),
  job('pirate_captain', '海賊船長', 'pirate captain', 'shadow', ['fantasy', 'western', 'historical'], ['pirate'], { tags: ['danger', 'wild'] }),
  job('bounty_hunter', '賞金稼ぎ', 'bounty hunter', 'shadow', ['sf', 'wasteland', 'fantasy'], ['#rugged', 'scavenger', 'cyber_jacket'], { tags: ['danger'] }),
  job('hacker', 'ハッカー', 'hacker', 'shadow', ['sf', 'modern', 'urban'], ['hacker', 'cyber_jacket', '#tech'], { tags: ['intellect'] }),
  // 魔術・神秘
  job('mage', '魔術師', 'mage', 'mystic', ['fantasy', 'western'], ['#mage'], { tags: ['mystic'] }),
  job('archmage', '宮廷魔導師', 'court wizard', 'mystic', ['fantasy', 'court'], ['archmage', '#mage'], { ageMin: 25, tags: ['mystic', 'noble'] }),
  job('alchemist', '錬金術師', 'alchemist', 'mystic', ['fantasy', 'steampunk', 'western'], ['alchemist'], { tags: ['mystic', 'intellect'] }),
  job('necromancer', '死霊術師', 'necromancer', 'mystic', ['dark', 'gothic', 'fantasy'], ['necromancer', '#dark'], { tags: ['mystic', 'danger'] }),
  job('onmyoji', '陰陽師', 'onmyoji', 'mystic', ['japan', 'fantasy'], ['kariginu'], { tags: ['mystic', 'sacred'] }),
  job('taoist', '道士', 'taoist priest', 'mystic', ['china', 'fantasy'], ['taoist'], { tags: ['mystic', 'sacred'] }),
  job('exorcist', '祓い屋', 'exorcist', 'mystic', ['supernatural', 'modern', 'japan', 'gothic'], ['priest_cassock', 'kimono_haori', '#coat'], { tags: ['mystic', 'sacred'] }),
  job('fortune_teller', '占い師', 'fortune teller', 'mystic', ['fantasy', 'desert', 'modern', 'retro'], ['#robe', '#mage', '#hood'], { tags: ['mystic'] }),
  job('witch_hunter', '魔女狩り', 'witch hunter', 'mystic', ['dark', 'gothic'], ['witch_hunter'], { tags: ['danger', 'hunter'] }),
  job('sage', '賢者', 'sage', 'mystic', ['fantasy', 'myth'], ['#mage', '#robe'], { ageMin: 30, tags: ['intellect', 'mystic'] }),
  // 聖職
  job('priest', '神父', 'priest', 'sacred', ['western', 'gothic', 'modern', 'dark'], ['priest_cassock'], { tags: ['sacred'] }),
  job('cardinal', '枢機卿', 'cardinal', 'sacred', ['western', 'court', 'fantasy'], ['cardinal'], { ageMin: 35, tags: ['sacred', 'noble'], w: 0.6 }),
  job('shrine_priest', '神主', 'shinto priest', 'sacred', ['japan'], ['kariginu', '#traditional'], { tags: ['sacred'] }),
  job('monk', '僧侶', 'monk', 'sacred', ['japan', 'china'], ['monk_kesa', 'taoist'], { tags: ['sacred'], w: 0.6 }),
  job('oracle', '神託を告げる者', 'oracle', 'sacred', ['myth', 'fantasy', 'sacred'], ['oracle', 'greek_himation'], { tags: ['sacred', 'ethereal'] }),
  job('god', '神そのもの', 'deity', 'sacred', ['myth'], ['oracle', 'greek_himation', 'feather_regalia', '#sacred'], { tags: ['inhuman', 'sacred'], w: 0.5 }),
  // 知・技
  job('professor', '大学教授', 'professor', 'intellect', ['modern', 'victorian', 'retro'], ['turtleneck_jacket', 'cardigan', 'three_piece'], { ageMin: 30, tags: ['intellect'] }),
  job('researcher', '研究者', 'researcher', 'intellect', ['modern', 'sf'], ['lab_coat'], { tags: ['intellect'] }),
  job('doctor', '医師', 'doctor', 'intellect', ['modern', 'victorian'], ['lab_coat', 'doctor_scrubs'], { ageMin: 25, tags: ['intellect'] }),
  job('detective', '探偵', 'detective', 'intellect', ['modern', 'victorian', 'noir', 'taisho'], ['#detective', 'trench_suit'], { tags: ['intellect'] }),
  job('police', '刑事', 'police detective', 'intellect', ['modern', 'noir', 'urban'], ['police_detective', '#suit'], { tags: ['intellect'] }),
  job('lawyer', '弁護士', 'lawyer', 'intellect', ['modern', 'business'], ['#suit'], { ageMin: 25, tags: ['intellect'] }),
  job('librarian', '司書', 'librarian', 'intellect', ['modern', 'fantasy', 'western'], ['cardigan', 'turtleneck_jacket', '#scholar'], { tags: ['intellect', 'soft'] }),
  job('scholar', '書生', 'scholar', 'intellect', ['taisho', 'china', 'japan'], ['taisho_shosei', 'hanfu_scholar', 'hanbok_dopo'], { tags: ['intellect'] }),
  job('strategist', '軍師', 'strategist', 'intellect', ['china', 'fantasy', 'military'], ['hanfu_scholar', 'hanfu_noble', '#officer'], { ageMin: 25, tags: ['intellect'] }),
  job('engineer', 'エンジニア', 'engineer', 'intellect', ['modern', 'sf', 'steampunk'], ['steampunk_engineer', 'techwear', 'hacker'], { tags: ['intellect', 'tech'] }),
  job('clockmaker', '時計職人', 'clockmaker', 'intellect', ['victorian', 'steampunk', 'retro'], ['steampunk_engineer', 'tailor_vest'], { tags: ['intellect', 'artist'] }),
  // 芸術・芸能
  job('painter', '画家', 'painter', 'art', ['modern', 'victorian', 'retro', 'taisho'], ['artist_smock', 'cardigan'], { tags: ['artist'] }),
  job('pianist', 'ピアニスト', 'pianist', 'art', ['modern', 'victorian', 'stage'], ['tuxedo', 'tailcoat_evening', '#formal'], { tags: ['artist', 'elegant'] }),
  job('violinist', 'ヴァイオリニスト', 'violinist', 'art', ['modern', 'victorian', 'court', 'stage'], ['tuxedo', '#formal'], { tags: ['artist', 'elegant'] }),
  job('idol', 'アイドル', 'idol', 'art', ['stage', 'modern'], ['idol_stage'], { tags: ['stage', 'sunny'] }),
  job('rock_singer', 'バンドのボーカル', 'singer', 'art', ['stage', 'modern', 'urban'], ['rock_star', 'leather_jacket', 'punk'], { tags: ['stage', 'danger'] }),
  job('actor', '俳優', 'actor', 'art', ['stage', 'modern'], ['#suit', 'mode_black', 'knit_coat'], { tags: ['stage'] }),
  job('model', 'モデル', 'fashion model', 'art', ['stage', 'modern', 'urban'], ['mode_black', '#suit', '#casual'], { tags: ['stage'] }),
  job('dancer', '舞踊家', 'dancer', 'art', ['stage', 'desert', 'japan', 'fantasy'], ['dancer', 'noh_actor'], { tags: ['stage', 'elegant'] }),
  job('bard', '吟遊詩人', 'bard', 'art', ['fantasy', 'western'], ['bard'], { tags: ['stage', 'playful'] }),
  job('magician', '奇術師', 'stage magician', 'art', ['stage', 'victorian', 'steampunk'], ['magician', 'ringmaster'], { tags: ['stage', 'playful'] }),
  job('novelist', '小説家', 'novelist', 'art', ['modern', 'taisho', 'retro'], ['cardigan', 'taisho_shosei', 'kimono_haori'], { tags: ['artist', 'intellect'] }),
  job('photographer', '写真家', 'photographer', 'art', ['modern', 'urban'], ['#casual', 'leather_jacket'], { tags: ['artist'] }),
  job('perfumer', '調香師', 'perfumer', 'art', ['modern', 'victorian', 'retro', 'court'], ['waistcoat_shirt', 'turtleneck_jacket', '#elegant'], { tags: ['artist', 'elegant'] }),
  job('tea_master', '茶人', 'tea master', 'art', ['japan', 'china'], ['kimono_haori', 'montsuki', 'changshan'], { ageMin: 25, tags: ['artist', 'elegant'] }),
  job('calligrapher', '書家', 'calligrapher', 'art', ['japan', 'china'], ['#traditional'], { tags: ['artist'] }),
  // 仕える者・接客
  job('butler', '執事', 'butler', 'service', ['court', 'victorian', 'modern', 'gothic'], ['butler', 'tailcoat_evening'], { tags: ['service', 'elegant'] }),
  job('bartender', 'バーテンダー', 'bartender', 'service', ['urban', 'modern', 'noir'], ['bartender', 'waistcoat_shirt'], { tags: ['service'] }),
  job('host', 'ホスト', 'host', 'service', ['urban', 'modern'], ['host_suit'], { tags: ['service', 'alluring'], w: 0.6 }),
  job('barista', 'カフェの店主', 'barista', 'service', ['modern'], ['barista', 'white_shirt'], { tags: ['service', 'soft'] }),
  job('chef', 'シェフ', 'chef', 'service', ['modern'], ['chef'], { tags: ['service'], w: 0.6 }),
  job('florist', '花屋', 'florist', 'service', ['modern', 'fantasy'], ['barista', 'cardigan', 'linen_shirt'], { tags: ['service', 'soft'] }),
  job('tailor', '仕立て屋', 'tailor', 'service', ['modern', 'victorian', 'retro'], ['tailor_vest'], { tags: ['service', 'artist'] }),
  job('innkeeper', '宿屋の主人', 'innkeeper', 'service', ['fantasy', 'western', 'japan'], ['#casual', '#traditional'], { ageMin: 25, tags: ['service', 'warm'], w: 0.6 }),
  // 現代の仕事
  job('ceo', '若き社長', 'ceo', 'modern', ['business', 'modern', 'urban'], ['#suit'], { ageMin: 25, tags: ['noble'] }),
  job('salaryman', '会社員', 'office worker', 'modern', ['business', 'modern'], ['slim_suit', 'three_piece', 'open_collar_suit'], { tags: ['casual'] }),
  job('secretary', '秘書', 'secretary', 'modern', ['business', 'modern'], ['#suit'], { tags: ['service', 'intellect'] }),
  job('firefighter', '消防士', 'firefighter', 'modern', ['modern'], ['firefighter'], { tags: ['warrior', 'sunny'], w: 0.4 }),
  job('teacher', '教師', 'teacher', 'modern', ['modern'], ['cardigan', 'turtleneck_jacket', 'slim_suit'], { ageMin: 23, tags: ['intellect', 'soft'] }),
  job('athlete', 'アスリート', 'athlete', 'modern', ['modern'], ['sportswear'], { tags: ['sunny', 'warrior'], w: 0.5 }),
  // 旅・辺境
  job('traveler', '旅人', 'traveler', 'travel', ['fantasy', 'desert', 'western', 'japan'], ['#travel', 'cloak_mystery'], { tags: ['travel'] }),
  job('hunter', '狩人', 'hunter', 'travel', ['fantasy', 'north', 'western'], ['ranger', '#hunter'], { tags: ['wild'] }),
  job('caravan_leader', '隊商の長', 'caravan leader', 'travel', ['desert'], ['silk_road', 'burnous', 'desert_prince'], { tags: ['travel'], w: 0.6 }),
  job('merchant', '豪商', 'merchant', 'travel', ['fantasy', 'desert', 'china', 'japan', 'western'], ['#luxury', '#traditional'], { tags: ['playful'] }),
  job('sea_captain', '船長', 'sea captain', 'travel', ['western', 'historical', 'fantasy'], ['naval_uniform', 'pirate'], { ageMin: 25, tags: ['travel'], w: 0.6 }),
  job('pilot', 'パイロット', 'pilot', 'travel', ['military', 'sf', 'steampunk', 'modern'], ['pilot_jacket', 'pilot_suit'], { tags: ['travel'] }),
  job('starship_captain', '宇宙艦長', 'starship captain', 'travel', ['space', 'sf'], ['space_captain'], { ageMin: 25, tags: ['noble'] }),
  job('wanderer', '終末の放浪者', 'wanderer', 'travel', ['wasteland'], ['scavenger'], { tags: ['wild'], w: 0.6 }),
  job('android', '人型アンドロイド', 'android', 'travel', ['sf'], ['android_bodysuit'], { tags: ['inhuman'], w: 0.5 }),
  // ---- 2026-10 増築：働く成人男性（職人・生活職・公共職）。画像に職業名は出さず、衣装・持ち物の傾向に使う ----
  ...[
    job('architect', '建築家', 'architect', 'intellect', ['modern', 'business', 'urban', 'renaissance_court'], ['minimal_blazer', 'turtleneck_jacket', 'jacket_tee', '#smart'], { ageMin: 25, tags: ['intellect', 'architect', 'work'] }),
    job('curator', '学芸員', 'museum curator', 'intellect', ['modern', 'belle_epoque', 'art_nouveau', 'southeast_asian_port'], ['minimal_blazer', 'turtleneck_jacket', 'tweed_sports_coat', 'cardigan'], { tags: ['intellect', 'artist'] }),
    job('editor', '編集者', 'book editor', 'intellect', ['modern', 'business', 'taisho'], ['cardigan', 'knit_polo', 'turtleneck_jacket', 'crewneck_knit'], { tags: ['intellect'] }),
    job('translator', '翻訳家', 'literary translator', 'intellect', ['modern', 'retro'], ['cardigan', 'tweed_sports_coat', 'crewneck_knit'], { tags: ['intellect', 'soft'], w: 0.7 }),
    job('journalist', '記者', 'journalist', 'modern', ['modern', 'noir', 'urban', 'belle_epoque', 'dieselpunk'], ['utility_vest', 'wool_overcoat_scarf', 'trench_suit', 'jacket_tee'], { tags: ['intellect', 'travel'] }),
    job('diplomat', '外交官', 'diplomat', 'intellect', ['business', 'modern', 'south_asian_metropolis', 'space_opera', 'renaissance_court', 'european_court'], ['bandhgala', 'orbital_diplomat', 'double_breasted', 'three_piece', '#formal'], { ageMin: 25, tags: ['noble', 'intellect'] }),
    job('botanist', '植物学者', 'botanist', 'intellect', ['modern', 'solarpunk', 'victorian', 'fantasy'], ['solarpunk_utility', 'utility_vest', 'linen_shirt', 'lab_coat'], { tags: ['intellect', 'nature'] }),
    job('carpenter', '木工職人', 'carpenter', 'craft', ['modern', 'fantasy', 'japan', 'western'], ['chore_workwear', 'canvas_apron', '#work'], { tags: ['craft', 'work'] }),
    job('baker', 'パン職人', 'artisan baker', 'craft', ['modern', 'western', 'fantasy'], ['canvas_apron', 'chef', 'barista'], { tags: ['craft', 'service', 'warm'] }),
    job('barber', '理髪師', 'barber', 'craft', ['modern', 'retro', 'victorian', 'belle_epoque'], ['waistcoat_shirt', 'white_shirt', 'tailor_vest'], { tags: ['craft', 'service'] }),
    job('jeweler', '宝飾職人', 'jeweler', 'craft', ['modern', 'victorian', 'fantasy', 'desert', 'art_nouveau'], ['canvas_apron', 'waistcoat_shirt', 'tailor_vest'], { tags: ['craft', 'artist', 'elegant'], w: 0.7 }),
    job('potter', '陶芸家', 'potter', 'craft', ['modern', 'japan', 'fantasy'], ['canvas_apron', 'chore_workwear', 'kimono_haori', 'linen_shirt'], { tags: ['craft', 'artist'], w: 0.7 }),
    job('mechanic', '整備士', 'mechanic', 'craft', ['modern', 'sf', 'dieselpunk', 'steampunk', 'military'], ['chore_workwear', 'utility_vest', 'steampunk_engineer', '#work'], { tags: ['craft', 'tech', 'work'] }),
    job('fisherman', '漁師', 'fisherman', 'field', ['modern', 'fantasy', 'western', 'southeast_asian_port', 'east_african_coast'], ['chore_workwear', 'linen_shirt', 'knit_coat', 'utility_vest'], { tags: ['travel', 'wild'], w: 0.7 }),
    job('vineyard_keeper', '葡萄農園主', 'vineyard owner', 'field', ['modern', 'western', 'renaissance_court'], ['linen_shirt', 'knit_polo', 'chore_workwear', 'utility_vest'], { ageMin: 25, tags: ['warm', 'nature'], w: 0.7 }),
    job('mountain_guide', '山岳ガイド', 'mountain guide', 'field', ['modern', 'north', 'andean_highland', 'fantasy'], ['andean_poncho', 'utility_vest', 'mods_coat', 'ranger'], { tags: ['travel', 'wild'] }),
    job('falconer', '鷹匠', 'falconer', 'field', ['central_asian_steppe', 'desert', 'japan', 'fantasy', 'north'], ['mongol_deel', 'silk_road', 'ranger', 'riding_habit'], { tags: ['travel', 'wild'], w: 0.7 })
  ].map(added)
];
export const OCCUPATION_CATS: Category[] = [
  { id: 'none', ja: '指定なし' }, { id: 'royal', ja: '王侯・貴族' }, { id: 'warrior', ja: '武人・軍人' }, { id: 'shadow', ja: '裏社会・危険' },
  { id: 'mystic', ja: '魔術・神秘' }, { id: 'sacred', ja: '聖職・神' }, { id: 'intellect', ja: '知・技' }, { id: 'art', ja: '芸術・芸能' },
  { id: 'service', ja: '仕える・もてなす' }, { id: 'modern', ja: '現代の仕事' }, { id: 'travel', ja: '旅・辺境' },
  { id: 'craft', ja: '職人・手仕事' }, { id: 'field', ja: '海・山・畑の仕事' }
];

// ---------------- 雰囲気 ----------------
export const AURA: Option[] = [
  o('refreshing', '爽やか', 'refreshing atmosphere', { tags: ['bright'] }),
  o('pure', '清廉', 'pure, clean-cut', { tags: ['bright', 'sacred'] }),
  o('gentle', '温厚', 'gentle atmosphere', { tags: ['warm', 'bright'] }),
  o('sunny', '陽気', 'cheerful, energetic', { tags: ['bright'] }),
  o('noble', '気品', 'elegant, graceful', { tags: ['noble'] }),
  o('regal', '威厳', 'regal, commanding presence', { tags: ['noble', 'dark'] }),
  o('cool', 'クール', 'cool atmosphere, composed', { tags: ['cool'] }),
  o('aloof', '孤高', 'aloof, solitary', { tags: ['cool', 'dark'] }),
  o('stoic', '寡黙', 'stoic, quiet', { tags: ['cool'] }),
  o('sophisticated', '洗練', 'sophisticated, stylish', { tags: ['urban'] }),
  o('mysterious', 'ミステリアス', 'mysterious atmosphere', { tags: ['dark', 'mystic'] }),
  o('ethereal', '浮世離れ', 'ethereal, otherworldly', { tags: ['mystic', 'bright'] }),
  o('sacred', '神聖', 'divine aura, holy', { tags: ['sacred', 'bright'] }),
  o('melancholy', '憂い', 'melancholic atmosphere', { tags: ['dark', 'soft'] }),
  o('decadent', '退廃', 'decadent, languid', { tags: ['dark', 'urban'] }),
  o('alluring', '色気', 'alluring, sensual', { tags: ['dark', 'urban'] }),
  o('dangerous', '危険', 'dangerous aura, menacing', { tags: ['dark'] }),
  o('sinister', '不穏', 'sinister atmosphere', { tags: ['dark'] }),
  o('playful', '飄々', 'playful, carefree', { tags: ['bright'] }),
  o('rugged', '無骨', 'rugged, battle-hardened', { tags: ['wild'] }),
  o('wild', '野性', 'wild, untamed', { tags: ['wild'] }),
  o('warm_mature', '包容力', 'warm, reassuring presence', { tags: ['warm'] }),
  // ---- 2026-10 増築：成熟・仕事人の空気（抽象語なので、出力は先頭の語だけ。人物像は美形タイプの好みで描く）----
  ...[
    o('artisan_pride', '職人の誇り', 'grounded composure, artisan pride', { tags: ['warm', 'cool'] }),
    o('world_weary', '世慣れた哀愁', 'world-weary air', { tags: ['dark', 'soft'] }),
    o('understated_luxury', '控えめな上質さ', 'understated elegance, quiet luxury', { tags: ['noble', 'urban'] }),
    o('weathered_dignity', '風雪を経た気品', 'weathered dignity, mature poise', { tags: ['noble', 'warm'] })
  ].map(added)
];

// ---------------- 表情 ----------------
export const EXPRESSION: Option[] = [
  o('gentle_smile', '穏やかな微笑み', 'gentle smile', { cat: 'soft', tags: ['warm', 'gentle'], src: 'pcw:soft_smile' }),
  o('closed_smile', '口を閉じた微笑み', 'closed mouth smile', { cat: 'soft', tags: ['refined'], src: 'pcw:closed_mouth_smile' }),
  o('tender', '慈しむ眼差し', 'tender expression, loving gaze', { cat: 'soft', tags: ['warm'] }),
  o('relieved', '安堵した笑み', 'relieved smile', { cat: 'soft', tags: ['warm'], src: 'pcw:relieved_smile' }),
  o('bright_smile', '屈託のない笑顔', 'bright smile, grin', { cat: 'bright', tags: ['sunny'] }),
  o('laughing', '声を上げて笑う', 'laughing, open mouth', { cat: 'bright', tags: ['sunny'], w: 0.7 }),
  o('smile_eyes_closed', '目を細めた笑顔', 'smile, closed eyes', { cat: 'bright', tags: ['warm', 'sunny'], eyesClosed: true }),
  o('shy', 'はにかみ', 'shy smile, light blush', { cat: 'shy', tags: ['soft'], src: 'pcw:bashful_smile' }),
  o('flustered', '赤面して目を逸らす', 'flustered, blush, looking away', { cat: 'shy', tags: ['soft', 'gaze_away'], src: 'pcw:embarrassed' }),
  o('confident_smile', '余裕のある笑み', 'confident smile', { cat: 'confident', tags: ['noble', 'playful'], src: 'pcw:confident_smile' }),
  o('smirk', '不敵な笑み', 'smirk', { cat: 'confident', tags: ['danger', 'playful'] }),
  o('teasing', 'からかうような表情', 'teasing smile, raised eyebrow', { cat: 'confident', tags: ['playful'] }),
  o('knowing_smile', '含みのある微笑み', 'knowing smile', { cat: 'confident', tags: ['mystic', 'alluring'], src: 'pcw:knowing_smile' }),
  o('provocative', '挑発的な微笑み', 'provocative smile, half-closed eyes', { cat: 'confident', tags: ['alluring', 'danger'], src: 'pcw:provocative_smile' }),
  o('mischievous', 'いたずらっぽい笑み', 'mischievous grin', { cat: 'confident', tags: ['playful'], src: 'pcw:mischievous_grin' }),
  o('cold_smile', '冷たい微笑', 'cold smile', { cat: 'cold', tags: ['cold', 'danger'] }),
  o('contempt', '冷笑', 'contemptuous smile, looking down', { cat: 'cold', tags: ['cold', 'danger'] }),
  o('expressionless', '無表情', 'expressionless', { cat: 'cold', tags: ['cold', 'cool'], src: 'pcw:neutral' }),
  o('aloof', '冷淡な表情', 'aloof expression', { cat: 'cold', tags: ['cold', 'noble'] }),
  o('serious', '真剣な表情', 'serious', { cat: 'cold', tags: ['warrior', 'cool'] }),
  o('stern', '厳しい表情', 'stern expression, furrowed brow', { cat: 'cold', tags: ['warrior'] }),
  o('intense_stare', '挑むような眼差し', 'intense stare', { cat: 'cold', tags: ['danger', 'warrior'] }),
  o('determined', '決意を秘めた表情', 'determined expression', { cat: 'cold', tags: ['warrior'], src: 'pcw:determined' }),
  o('pensive', '物憂げ', 'pensive, brooding', { cat: 'sad', tags: ['fragile', 'melancholy'] }),
  o('wistful', '遠くを見る切なげな顔', 'wistful expression, looking away', { cat: 'sad', tags: ['fragile', 'gaze_away'], src: 'pcw:wistful' }),
  o('sad_smile', '寂しげな微笑み', 'sad smile', { cat: 'sad', tags: ['fragile'] }),
  o('quiet_tears', '静かな涙', 'tears, quiet expression', { cat: 'sad', tags: ['fragile'], w: 0.5, src: 'pcw:quiet_tears' }),
  o('languid', '気だるげ', 'languid expression, half-closed eyes', { cat: 'mood', tags: ['decadent', 'alluring'] }),
  o('sleepy', '眠たげ', 'sleepy, tired', { cat: 'mood', tags: ['soft', 'aloof'], w: 0.6 }),
  o('serene', '静謐', 'serene expression', { cat: 'mood', tags: ['sacred', 'mystic'] }),
  o('eyes_closed_serene', '目を閉じた静けさ', 'closed eyes, serene expression', { cat: 'mood', tags: ['sacred', 'mystic'], eyesClosed: true, w: 0.7 }),
  o('surprised', '驚いた顔', 'surprised, wide eyes', { cat: 'mood', tags: ['soft'], w: 0.5 }),
  o('annoyed', '不機嫌', 'annoyed, frown', { cat: 'mood', tags: ['cool', 'playful'], w: 0.7 }),
  o('feral_grin', '獰猛な笑み', 'feral grin', { cat: 'mood', tags: ['wild', 'danger'], w: 0.6 }),
  o('unhinged', '狂気の笑み', 'unhinged smile, wide eyes', { cat: 'mood', tags: ['danger'], w: 0.4 }),
  // ---- 2026-10 増築：笑顔／無表情の内側の微差 ----
  ...[
    o('quiet_pride', '控えめな誇り', 'subtle proud smile', { cat: 'confident', tags: ['noble', 'refined'] }),
    o('restrained_grief', 'こらえた悲しみ', 'restrained sorrow, pressed lips', { cat: 'sad', tags: ['fragile', 'melancholy'], w: 0.7 }),
    o('appraising', '値踏みする目つき', 'appraising look, slightly narrowed eyes', { cat: 'cold', tags: ['cool', 'danger'] }),
    o('soft_concern', '柔らかな気遣い', 'gentle concerned expression, soft eyes', { cat: 'soft', tags: ['warm', 'gentle'] }),
    o('attentive', '真摯に聞き入る顔', 'attentive expression, listening', { cat: 'soft', tags: ['gentle', 'refined'] }),
    o('shy_downcast', '照れ隠しの伏し目', 'shy downward glance, light blush', { cat: 'shy', tags: ['soft', 'gaze_away'] }),
    o('skeptical', '疑わしげな片眉', 'skeptical expression, raised eyebrow', { cat: 'mood', tags: ['cool', 'playful'] }),
    o('focused_squint', '作業に集中した目', 'focused expression, slight squint', { cat: 'cold', tags: ['warrior', 'cool'] }),
    o('fond_side_glance', '親しげな横目', 'fond smile, sideways glance', { cat: 'soft', tags: ['warm', 'playful', 'gaze_away'] }),
    o('weary_tender', '疲れと優しさの混じる顔', 'tired but tender smile', { cat: 'sad', tags: ['warm', 'melancholy'] }),
    o('suppressed_laugh', '笑いをこらえる顔', 'suppressing a laugh, restrained grin', { cat: 'bright', tags: ['playful', 'sunny'] })
  ].map(added),
  // 禁断の調合：立場に合わせた表情（立場がOFF＝なしでは出ない）
  ...FORBIDDEN_EXPRESSIONS.map((x) => o(x.id, x.ja, x.en, { cat: 'forbidden', tags: [x.side], requires: [`role:#${x.side}`] })),
];
export const EXPRESSION_CATS: Category[] = [
  { id: 'soft', ja: '優しい' }, { id: 'bright', ja: '明るい' }, { id: 'shy', ja: '照れ' }, { id: 'confident', ja: '余裕・挑発' },
  { id: 'cold', ja: '冷たい・真剣' }, { id: 'sad', ja: '憂い・切なさ' }, { id: 'mood', ja: '気分・その他' }, { id: 'forbidden', ja: '禁断（立場）' }
];
