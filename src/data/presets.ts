/* おまかせスタイル（ルール群）。同じ美青年の固定テンプレにせず、候補の範囲だけを絞る。
 * 固定中の項目は常に優先し、条件に合わなくても書き換えない。
 */
import type { PresetGroup, StylePreset } from '../types';

export const STYLE_PRESETS: StylePreset[] = [
  { id: 'random', ja: '完全ランダム', icon: '🎲', desc: '絞り込みなし。何が出るかは運命次第。', filters: {} },
  { id: 'modern_daily', group: 'contemporary', ja: '現代・日常のイケメン', icon: '☕', desc: '現代の舞台と日常着。等身大の美形を中心に。', filters: { archetype: ['cat:contemporary'], world: ['modern', 'urban_night', 'business'], outfit: ['cat:daily'] } },
  { id: 'downer_mood', group: 'contemporary', ja: 'ダウナー・気だるい', icon: '🌫', desc: '脱力と物憂さ。ダウナー・アンニュイ・ウルフ系など。', filters: { archetype: ['downer', 'ennui_charmer', 'wolf_languid', 'capricious_cat', 'off_day'], expression: ['sleepy', 'languid', 'expressionless', 'wistful', 'pensive', 'annoyed', 'knowing_smile'], world: ['modern', 'urban_night'] } },
  { id: 'kireime', group: 'contemporary', ja: 'きれいめカジュアル', icon: '🧥', desc: '塩顔・黒髪クール・マッシュ・大人の余裕。清潔感のある装い。', filters: { archetype: ['shiogao', 'kireime_casual', 'black_hair_cool', 'soft_mash', 'relaxed_adult'], outfit: ['cat:daily', 'cardigan', 'turtleneck_jacket', 'white_shirt', 'knit_coat'], world: ['modern', 'business'] } },
  { id: 'classic', group: 'beauty', ja: '王道イケメン', icon: '👑', desc: '端正・爽やか・好青年の正統派。', filters: { archetype: ['cat:classic'], presentation: ['masc', 'slight_masc', 'andro'] } },
  { id: 'fragile', group: 'beauty', ja: '儚げ美青年', icon: '❄', desc: '透明感と憂い。細身で繊細。', filters: { archetype: ['cat:fragile'], build: ['delicate', 'slim', 'tall_slim'], presentation: ['andro', 'slight_fem', 'slight_masc'] } },
  { id: 'androgynous', group: 'beauty', ja: '中性的な美形', icon: '◐', desc: '性別を超えた美しさ。人物は男性のまま。', filters: { presentation: ['andro', 'slight_fem', 'fem'] } },
  { id: 'strong', group: 'beauty', ja: '男らしい強者', icon: '⚔', desc: '精悍な顔立ちと鍛えた体。', filters: { presentation: ['masc', 'slight_masc'], build: ['toned', 'athletic', 'muscular', 'burly'], archetype: ['cat:warrior', 'cat:danger', 'cat:noble'] } },
  { id: 'villain', group: 'beauty', ja: '危険な悪役', icon: '🗡', desc: '冷酷・支配者・黒幕。', filters: { archetype: ['cat:danger'] } },
  { id: 'alluring', group: 'beauty', ja: '妖艶な貴公子', icon: '🌹', desc: '色気と気品を併せ持つ夜の貴族。', filters: { archetype: ['bewitching', 'decadent_aesthete', 'vampire_count', 'haughty_aristocrat', 'nocturnal_tempter', 'fox_spirit', 'pleasure_quarter', 'mature_seducer', 'young_duke'], aura: ['alluring', 'decadent', 'noble', 'mysterious'] } },
  { id: 'suits', group: 'contemporary', ja: '現代スーツ男子', icon: '👔', desc: 'ビジネス・夜の街・ノワールのスーツ姿。', filters: { world: ['business', 'urban_night', 'noir', 'modern'], outfit: ['#suit'] } },
  { id: 'wafu', group: 'fantasy', ja: '和風幻想美青年', icon: '⛩', desc: '和装と和の景色、ほのかな怪異。', filters: { world: ['wafu_fantasy', 'japanese_historical', 'taisho'], culture: ['none', 'japan'], outfit: ['cat:japanese'] } },
  { id: 'exotic', group: 'fantasy', ja: '異国情緒の衣装', icon: '🕌', desc: '世界各地の意匠をまとった装い。', filters: { culture: ['cat:central', 'cat:south', 'cat:west_asia', 'cat:africa', 'cat:europe', 'cat:america', 'korea', 'china'], outfit: ['cat:world', 'cat:chinese'] } },
  { id: 'muscle', group: 'looks', ja: '筋骨隆々の美形', icon: '💪', desc: '大きく厚い体に、整った顔。', filters: { build: ['muscular', 'burly', 'huge'] } },
  { id: 'mature', group: 'looks', ja: '40代以上の成熟美形', icon: '🍷', desc: '渋み・余裕・気品の大人たち。', filters: { age: ['a35_44', 'a45_59', 'a60p'] } },
  { id: 'silver', group: 'looks', ja: '銀髪特集', icon: '🌙', desc: '銀・白・灰・プラチナの髪だけ。', filters: { hairColor: ['silver', 'white', 'silver_blue', 'silver_lavender', 'pearl_white', 'platinum', 'gray', 'smoky_gray'] } },
  { id: 'black', group: 'looks', ja: '黒髪特集', icon: '🖤', desc: '黒・濡れ羽色・青みの黒髪だけ。', filters: { hairColor: ['black', 'blue_black', 'soft_black', 'charcoal'] } },
  { id: 'knight', group: 'fantasy', ja: '騎士・武人', icon: '🛡', desc: '剣と誓いの男たち。', filters: { occupation: ['knight', 'paladin', 'commander', 'samurai', 'ronin', 'swordmaster', 'dragon_knight', 'officer', 'mercenary'], outfit: ['#armor', '#knight', '#military', '#warrior'] } },
  { id: 'mage', group: 'fantasy', ja: '魔法使い・神官', icon: '✨', desc: '魔術師・聖職・陰陽師・道士。', filters: { occupation: ['cat:mystic', 'cat:sacred'], outfit: ['cat:mage', 'kariginu', 'taoist', 'oracle', 'monk_kesa'] } },
  { id: 'scifi', group: 'fantasy', ja: '近未来・サイバー', icon: '🛰', desc: 'ネオンと宇宙とテクノロジー。', filters: { world: ['near_future', 'cyberpunk', 'space_opera', 'post_apocalyptic'], outfit: ['cat:sf', 'techwear'] } },
  { id: 'royalty', group: 'fantasy', ja: '王族・貴族', icon: '⚜', desc: '玉座と宮廷の気高い美形。', filters: { archetype: ['cat:noble'], occupation: ['cat:royal'] } },
  { id: 'kemono', group: 'fantasy', ja: 'ケモミミ美青年', icon: '🦊', desc: '獣人モードをONにして、耳と尾のある美青年を錬成。', filters: { kemonoLevel: ['lv1', 'lv2'] }, modules: { kemonoEnabled: true } },
  // ---- 禁断の調合（ONのときだけ画面に出す）。拘束具・背景・立場の方向だけを決め、人物は通常どおり引く ----
  { id: 'captive_prince', group: 'forbidden', ja: '囚われの王子', icon: '🕊', desc: '高貴な美形が、鳥籠や地下牢で装飾的に拘束される。', filters: { role: ['#captive'], archetype: ['cat:noble', 'cat:fragile', 'cat:alluring'], outfit: ['cat:court', '#royal', '#noble', '#elegant'], restraint: ['ornate_chain', 'silk_cord', 'ribbon', 'chain', 'light_chains'], scene: ['giant_birdcage', 'dungeon_cell', 'canopy_bedroom', 'zashikirou'] } },
  { id: 'tentacle_forest', group: 'forbidden', ja: '触手の森', icon: '🐙', desc: '触手・影・蔓に絡め取られる幻想の囚われ。', filters: { role: ['#captive'], restraint: ['tentacles', 'shadow_tentacles', 'vines', 'rose_vines'], world: ['high_fantasy', 'dark_fantasy', 'mythic', 'supernatural', 'wafu_fantasy'], scene: ['tentacle_lair', 'deep_forest', 'ruined_garden', 'ancient_ruins', 'cave_entrance', 'ritual_altar'] } },
  { id: 'chain_dungeon', group: 'forbidden', ja: '鎖と地下牢', icon: '⛓', desc: '鎖や手錠で繋がれ、牢や尋問室に閉じ込められる。汚れや破れも出やすい。', filters: { role: ['#captive'], restraint: ['chain', 'cuffs', 'ornate_chain'], scene: ['dungeon_cell', 'prison_cell', 'interrogation_room'], wear1: ['none', 'cat:dirt', 'cat:damage'] } },
  { id: 'ribbon_gift', group: 'forbidden', ja: 'リボンの贈り物', icon: '🎀', desc: 'リボンで結ばれ、目隠しも柔らかな素材で。甘い囚われ。', filters: { role: ['captive', 'ambiguous', 'offscreen'], restraint: ['ribbon'], blindfold: ['none', 'ribbon', 'lace', 'silk'], scene: ['canopy_bedroom', 'giant_birdcage', 'cat:simple'], expression: ['flustered', 'shy', 'bewildered', 'wary', 'gentle_smile', 'knowing_smile'] } },
  { id: 'dominator', group: 'forbidden', ja: '支配する側', icon: '🗝', desc: '拘束具を手にした、余裕のある支配者・追い詰める側。', filters: { role: ['#captor'], bindPos: ['held'], expression: ['smug', 'cold_glare', 'knowing_smile', 'provocative', 'cold_smile', 'smirk'], archetype: ['cat:danger', 'cat:noble', 'cat:urban'] } }
];

/** おまかせスタイルの分類（画面で切り替える。切り替えだけでは錬成しない） */
export const PRESET_GROUPS: Array<{ id: PresetGroup | 'all'; ja: string }> = [
  { id: 'all', ja: 'すべて' }, { id: 'contemporary', ja: '現代・日常' }, { id: 'fantasy', ja: '幻想・世界観' },
  { id: 'beauty', ja: '美形・雰囲気' }, { id: 'looks', ja: '外見特集' }, { id: 'forbidden', ja: '禁断' }
];
