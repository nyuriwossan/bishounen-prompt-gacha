/* おまかせスタイル（ルール群）。同じ美青年の固定テンプレにせず、候補の範囲だけを絞る。
 * 固定中の項目は常に優先し、条件に合わなくても書き換えない。
 */
import type { StylePreset } from '../types';

export const STYLE_PRESETS: StylePreset[] = [
  { id: 'random', ja: '完全ランダム', icon: '🎲', desc: '絞り込みなし。何が出るかは運命次第。', filters: {} },
  { id: 'classic', ja: '王道イケメン', icon: '👑', desc: '端正・爽やか・好青年の正統派。', filters: { archetype: ['cat:classic'], presentation: ['masc', 'slight_masc', 'andro'] } },
  { id: 'fragile', ja: '儚げ美青年', icon: '❄', desc: '透明感と憂い。細身で繊細。', filters: { archetype: ['cat:fragile'], build: ['delicate', 'slim', 'tall_slim'], presentation: ['andro', 'slight_fem', 'slight_masc'] } },
  { id: 'androgynous', ja: '中性的な美形', icon: '◐', desc: '性別を超えた美しさ。人物は男性のまま。', filters: { presentation: ['andro', 'slight_fem', 'fem'] } },
  { id: 'strong', ja: '男らしい強者', icon: '⚔', desc: '精悍な顔立ちと鍛えた体。', filters: { presentation: ['masc', 'slight_masc'], build: ['toned', 'athletic', 'muscular', 'burly'], archetype: ['cat:warrior', 'cat:danger', 'cat:noble'] } },
  { id: 'villain', ja: '危険な悪役', icon: '🗡', desc: '冷酷・支配者・黒幕。', filters: { archetype: ['cat:danger'] } },
  { id: 'alluring', ja: '妖艶な貴公子', icon: '🌹', desc: '色気と気品を併せ持つ夜の貴族。', filters: { archetype: ['bewitching', 'decadent_aesthete', 'vampire_count', 'haughty_aristocrat', 'nocturnal_tempter', 'fox_spirit', 'pleasure_quarter', 'mature_seducer', 'young_duke'], aura: ['alluring', 'decadent', 'noble', 'mysterious'] } },
  { id: 'suits', ja: '現代スーツ男子', icon: '👔', desc: 'ビジネス・夜の街・ノワールのスーツ姿。', filters: { world: ['business', 'urban_night', 'noir', 'modern'], outfit: ['#suit'] } },
  { id: 'wafu', ja: '和風幻想美青年', icon: '⛩', desc: '和装と和の景色、ほのかな怪異。', filters: { world: ['wafu_fantasy', 'japanese_historical', 'taisho'], culture: ['none', 'japan'], outfit: ['cat:japanese'] } },
  { id: 'exotic', ja: '異国情緒の衣装', icon: '🕌', desc: '世界各地の意匠をまとった装い。', filters: { culture: ['cat:central', 'cat:south', 'cat:west_asia', 'cat:africa', 'cat:europe', 'cat:america', 'korea', 'china'], outfit: ['cat:world', 'cat:chinese'] } },
  { id: 'muscle', ja: '筋骨隆々の美形', icon: '💪', desc: '大きく厚い体に、整った顔。', filters: { build: ['muscular', 'burly', 'huge'] } },
  { id: 'mature', ja: '40代以上の成熟美形', icon: '🍷', desc: '渋み・余裕・気品の大人たち。', filters: { age: ['a35_44', 'a45_59', 'a60p'] } },
  { id: 'silver', ja: '銀髪特集', icon: '🌙', desc: '銀・白・灰・プラチナの髪だけ。', filters: { hairColor: ['silver', 'white', 'silver_blue', 'silver_lavender', 'pearl_white', 'platinum', 'gray', 'smoky_gray'] } },
  { id: 'black', ja: '黒髪特集', icon: '🖤', desc: '黒・濡れ羽色・青みの黒髪だけ。', filters: { hairColor: ['black', 'blue_black', 'soft_black', 'charcoal'] } },
  { id: 'knight', ja: '騎士・武人', icon: '🛡', desc: '剣と誓いの男たち。', filters: { occupation: ['knight', 'paladin', 'commander', 'samurai', 'ronin', 'swordmaster', 'dragon_knight', 'officer', 'mercenary'], outfit: ['#armor', '#knight', '#military', '#warrior'] } },
  { id: 'mage', ja: '魔法使い・神官', icon: '✨', desc: '魔術師・聖職・陰陽師・道士。', filters: { occupation: ['cat:mystic', 'cat:sacred'], outfit: ['cat:mage', 'kariginu', 'taoist', 'oracle', 'monk_kesa'] } },
  { id: 'scifi', ja: '近未来・サイバー', icon: '🛰', desc: 'ネオンと宇宙とテクノロジー。', filters: { world: ['near_future', 'cyberpunk', 'space_opera', 'post_apocalyptic'], outfit: ['cat:sf', 'techwear'] } },
  { id: 'royalty', ja: '王族・貴族', icon: '⚜', desc: '玉座と宮廷の気高い美形。', filters: { archetype: ['cat:noble'], occupation: ['cat:royal'] } },
  { id: 'kemono', ja: 'ケモミミ美青年', icon: '🦊', desc: '獣人モードをONにして、耳と尾のある美青年を錬成。', filters: { kemonoLevel: ['lv1', 'lv2'] }, modules: { kemonoEnabled: true } }
];
