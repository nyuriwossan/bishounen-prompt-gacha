/* 男性キャラクター向け衣装セット（新規）。
 * outfit-prompt-workshop の「大分類→サブタイプ→部位」の考え方と worldviews / roles を参照し、
 * ガチャ1回で成立する“一式コーディネート”として再設計した。
 * {c1} = 衣装メインカラー、{c2} = 差し色。色と対象を結び付けて出力するためのプレースホルダー。
 * upper は寄りの構図でも使う上半身側、lower は画角外になりやすい下半身・足元。
 * culture を持つ衣装は伝統衣装として扱い、別の文化モチーフとは同時に採用しない（hard）。
 */
import type { Category, Option } from '../types';

const fit = (
  id: string, ja: string, cat: string, worlds: string[], upper: string, lower: string, tags: string[], extra: Partial<Option> = {}
): Option => ({ id, ja, cat, worlds, upper, lower, tags, en: [], ...extra });

const OUTFIT_BASE: Option[] = [
  // ---- スーツ・フォーマル ----
  fit('three_piece', 'スリーピーススーツ', 'suit', ['modern', 'business', 'noir', 'retro'], '{c1} three-piece suit, waistcoat, {c2} necktie', 'tailored trousers, leather shoes', ['formal', 'tie', 'suit']),
  fit('slim_suit', '細身のスーツ', 'suit', ['modern', 'business', 'urban'], '{c1} slim-fit suit jacket, white dress shirt, {c2} necktie', 'slim trousers, leather shoes', ['formal', 'tie', 'suit']),
  fit('open_collar_suit', 'ノーネクタイのスーツ', 'suit', ['modern', 'urban', 'noir'], '{c1} suit jacket, unbuttoned {c2} dress shirt, open collar', 'suit trousers, loafers', ['formal', 'suit', 'alluring']),
  fit('double_breasted', 'ダブルのスーツ', 'suit', ['modern', 'noir', 'business', 'retro'], '{c1} double-breasted suit, {c2} pocket square', 'pleated trousers, oxford shoes', ['formal', 'suit', 'luxury']),
  fit('tuxedo', 'タキシード', 'suit', ['modern', 'stage', 'noir', 'court'], '{c1} tuxedo, {c2} bow tie, satin lapels', 'tuxedo trousers, patent shoes', ['formal', 'luxury', 'tie']),
  fit('waistcoat_shirt', 'ベストとシャツ', 'suit', ['modern', 'retro', 'noir', 'steampunk'], '{c1} waistcoat over a white shirt, rolled-up sleeves, {c2} necktie', 'dark trousers', ['formal', 'tie', 'casual']),
  fit('trench_suit', 'トレンチコートとスーツ', 'suit', ['modern', 'noir', 'urban', 'retro'], '{c1} trench coat over a dark suit, {c2} scarf', 'suit trousers, leather boots', ['formal', 'coat', 'detective']),
  fit('chester_coat', 'チェスターコート', 'suit', ['modern', 'urban', 'business'], '{c1} chesterfield coat, {c2} turtleneck sweater', 'slim trousers, chelsea boots', ['formal', 'coat']),
  fit('mafia_coat', '肩掛けコートのマフィア', 'suit', ['noir', 'modern', 'urban'], '{c1} suit, overcoat draped over shoulders, {c2} shirt', 'suit trousers, polished shoes', ['formal', 'coat', 'danger', 'luxury']),
  fit('butler', '執事服', 'suit', ['court', 'victorian', 'modern', 'gothic'], '{c1} butler tailcoat, white gloves, {c2} cravat', 'pressed trousers, polished shoes', ['formal', 'gloves', 'butler', 'tie']),
  fit('tailcoat_evening', '燕尾服', 'suit', ['court', 'victorian', 'stage'], '{c1} tailcoat, white waistcoat, {c2} bow tie, white gloves', 'formal trousers', ['formal', 'gloves', 'luxury', 'tie']),
  // ---- カジュアル・ストリート ----
  fit('knit_coat', 'ニットとロングコート', 'casual', ['modern', 'urban'], '{c1} long coat, {c2} knit sweater', 'slim jeans, boots', ['casual', 'coat', 'soft']),
  fit('white_shirt', '白シャツとスラックス', 'casual', ['modern'], 'white shirt, sleeves rolled up, {c1} wristwatch strap', '{c2} slacks', ['casual', 'clean']),
  fit('linen_shirt', 'リネンシャツ', 'casual', ['modern', 'desert'], 'loose {c1} linen shirt, open collar, {c2} necklace', 'linen trousers, sandals', ['casual', 'light', 'alluring']),
  fit('cardigan', 'カーディガンとシャツ', 'casual', ['modern'], '{c1} cardigan over a {c2} collared shirt', 'chinos, loafers', ['casual', 'soft', 'scholar']),
  fit('turtleneck_jacket', 'タートルネックとジャケット', 'casual', ['modern', 'urban', 'business'], '{c1} turtleneck, {c2} tailored jacket', 'slacks', ['casual', 'smart', 'scholar']),
  fit('hoodie_street', 'パーカーのストリート', 'casual', ['modern', 'urban', 'street'], 'oversized {c1} hoodie, {c2} chain necklace', 'cargo pants, sneakers', ['casual', 'street', 'hood']),
  fit('leather_jacket', 'レザージャケット', 'casual', ['modern', 'urban', 'street', 'noir'], '{c1} leather jacket, {c2} t-shirt, silver necklace', 'black jeans, combat boots', ['casual', 'street', 'danger']),
  fit('denim_jacket', 'デニムジャケット', 'casual', ['modern'], '{c1} denim jacket over a {c2} t-shirt', 'jeans, sneakers', ['casual', 'sunny']),
  fit('mods_coat', 'モッズコート', 'casual', ['modern', 'urban', 'military'], '{c1} military parka, {c2} hoodie', 'skinny pants, boots', ['casual', 'coat', 'street']),
  fit('sweater_scarf', 'セーターとマフラー', 'casual', ['modern'], 'cozy {c1} sweater, {c2} scarf', 'wool trousers', ['casual', 'soft', 'winter']),
  fit('techwear', 'テックウェア', 'casual', ['modern', 'urban', 'sf', 'street'], '{c1} techwear jacket with straps and buckles, {c2} accents', 'tactical joggers, sneakers', ['street', 'tech']),
  fit('sportswear', 'スポーツウェア', 'casual', ['modern'], '{c1} track jacket, {c2} stripes', 'track pants, sneakers', ['casual', 'sporty', 'sunny'], { w: 0.6 }),
  fit('aloha', '開襟アロハシャツ', 'casual', ['modern'], 'open {c1} aloha shirt, {c2} tank top', 'shorts, sandals', ['casual', 'light', 'sunny'], { w: 0.6 }),
  fit('punk', 'パンクファッション', 'casual', ['modern', 'urban', 'street'], '{c1} studded jacket, ripped {c2} shirt, chains', 'tight pants, platform boots', ['street', 'danger'], { w: 0.7 }),
  fit('mode_black', 'モードな黒装束', 'casual', ['modern', 'urban', 'stage'], 'avant-garde {c1} asymmetrical coat, {c2} inner layer', 'wide-leg trousers, boots', ['mode', 'elegant', 'dark']),
  // ---- 日常着・きれいめ（装飾を足さない現代服。チェーン・耳飾りは付けない）----
  fit('oversized_tee_wide', 'オーバーサイズTシャツとワイドパンツ', 'daily', ['modern', 'urban'], 'oversized {c1} t-shirt, dropped shoulders', '{c2} wide-leg pants, sneakers', ['casual', 'daily', 'relaxed']),
  fit('crewneck_knit', 'ゆるいクルーネックニットとスラックス', 'daily', ['modern', 'urban', 'business'], 'loose {c1} crew-neck sweater', '{c2} slacks, loafers', ['casual', 'daily', 'soft', 'clean']),
  fit('zip_hoodie_tee', 'ジップパーカーと無地のTシャツ', 'daily', ['modern', 'urban'], 'unzipped {c1} zip-up hoodie, plain {c2} t-shirt', 'straight jeans, sneakers', ['casual', 'daily', 'relaxed', 'hood']),
  fit('camp_collar_shirt', '開襟シャツとTシャツ', 'daily', ['modern', 'urban'], 'relaxed {c1} camp-collar shirt, plain {c2} t-shirt underneath', 'tapered trousers, leather sneakers', ['casual', 'daily', 'light']),
  fit('jacket_tee', 'シンプルなジャケットとTシャツ', 'daily', ['modern', 'urban', 'business'], 'unstructured {c1} jacket, plain {c2} t-shirt', 'tapered trousers, white sneakers', ['casual', 'daily', 'smart', 'clean']),
  fit('drape_shirt_wide', '落ち感のあるシャツとワイドスラックス', 'daily', ['modern', 'urban'], 'flowy oversized {c1} shirt', '{c2} wide slacks, loafers', ['casual', 'daily', 'soft', 'mode']),
  fit('half_zip_knit', 'ハーフジップニットとストレートパンツ', 'daily', ['modern', 'urban'], '{c1} half-zip sweater, {c2} collar peeking out', 'straight-leg pants, sneakers', ['casual', 'daily', 'clean']),
  fit('sweat_easy', 'スウェットとイージーパンツ', 'daily', ['modern'], 'plain {c1} sweatshirt', '{c2} drawstring pants, sneakers', ['casual', 'daily', 'relaxed', 'home']),
  fit('sheer_shirt', 'シアーシャツとインナー', 'daily', ['modern', 'urban'], 'sheer {c1} long-sleeve shirt layered over a {c2} crew-neck top', 'wide trousers, loafers', ['casual', 'daily', 'soft', 'mode'], { w: 0.7 }),
  fit('short_blouson', '短丈ブルゾンと無地のインナー', 'daily', ['modern', 'urban'], 'short {c1} blouson jacket, plain {c2} t-shirt', 'wide trousers, sneakers', ['casual', 'daily', 'street']),
  // ---- 貴族・王族 ----
  fit('royal_uniform', '王族の礼装', 'court', ['court', 'fantasy', 'western', 'historical'], '{c1} royal uniform, {c2} epaulettes, gold aiguillette, sash', 'white trousers, tall boots', ['royal', 'formal', 'military', 'luxury']),
  fit('aristocrat_coat', '高襟の貴族服', 'court', ['court', 'gothic', 'western', 'historical'], '{c1} high-collared aristocratic coat, {c2} embroidery, jabot', 'breeches, riding boots', ['royal', 'noble', 'elegant']),
  fit('prince_cape', 'マントの王子服', 'court', ['court', 'fantasy', 'western'], '{c1} princely jacket, {c2} cape, golden trim', 'white trousers, boots', ['royal', 'cape', 'elegant']),
  fit('emperor_robe', '戴冠の皇帝衣', 'court', ['court', 'fantasy', 'western'], '{c1} coronation robe with ermine trim, {c2} brocade, crown', 'embroidered boots', ['royal', 'luxury', 'crown'], { w: 0.6 }),
  fit('rococo', 'ロココの貴公子', 'court', ['court', 'historical'], '{c1} brocade justaucorps, lace cravat, {c2} waistcoat', 'breeches, stockings, buckled shoes', ['royal', 'luxury', 'elegant'], { w: 0.6 }),
  fit('regency', 'リージェンシーの燕尾', 'court', ['court', 'victorian', 'historical'], '{c1} regency tailcoat, {c2} waistcoat, white cravat', 'pantaloons, hessian boots', ['noble', 'elegant', 'tie']),
  fit('victorian_frock', 'ヴィクトリアンのフロックコート', 'court', ['victorian', 'gothic', 'steampunk'], '{c1} frock coat, {c2} waistcoat, ascot', 'striped trousers, top hat', ['noble', 'formal', 'retro', 'hat']),
  fit('vampire_noble', '吸血鬼の夜会服', 'court', ['gothic', 'dark', 'court'], '{c1} victorian coat, {c2} high-collared cape, ruffled cravat', 'black trousers, boots', ['noble', 'dark', 'gothic', 'cape']),
  fit('riding_habit', '乗馬服', 'court', ['court', 'victorian', 'western', 'historical'], '{c1} riding jacket, {c2} cravat, leather gloves', 'jodhpurs, tall riding boots', ['noble', 'gloves', 'sporty']),
  // ---- 軍服・制服 ----
  fit('military_dress', '軍の礼装', 'military', ['military', 'court', 'western', 'historical'], '{c1} military dress uniform, {c2} braid, medals, white gloves', 'uniform trousers, polished boots', ['military', 'formal', 'gloves', 'officer']),
  fit('officer_coat', '将校のロングコート', 'military', ['military', 'dark', 'western'], '{c1} officer greatcoat, {c2} insignia, peaked cap', 'uniform trousers, knee boots', ['military', 'coat', 'officer', 'hat']),
  fit('field_uniform', '野戦服', 'military', ['military', 'modern', 'wasteland'], '{c1} combat fatigues, {c2} tactical vest', 'cargo pants, combat boots', ['military', 'rugged']),
  fit('naval_uniform', '海軍士官服', 'military', ['military', 'historical', 'western'], '{c1} naval officer uniform, {c2} buttons, bicorne', 'white trousers', ['military', 'officer', 'hat'], { w: 0.7 }),
  fit('gakuran_retro', '詰襟の学生服風', 'military', ['taisho', 'japan', 'retro'], '{c1} stand-collar uniform jacket, {c2} buttons, cap', 'uniform trousers', ['uniform', 'retro'], { w: 0.5 }),
  fit('police_detective', '刑事のコート', 'military', ['modern', 'noir', 'urban'], '{c1} detective coat, loosened {c2} necktie, badge', 'suit trousers', ['detective', 'coat', 'tie']),
  fit('pilot_jacket', 'フライトジャケット', 'military', ['military', 'modern', 'steampunk'], '{c1} bomber jacket, {c2} scarf, aviator goggles', 'flight trousers, boots', ['military', 'casual'], { w: 0.7 }),
  // ---- 甲冑・戦装束 ----
  fit('plate_armor', '騎士の甲冑', 'armor', ['fantasy', 'western', 'historical'], '{c1} plate armor, {c2} tabard, flowing cape', 'armored greaves', ['armor', 'knight', 'cape']),
  fit('light_armor', '軽装の騎士服', 'armor', ['fantasy', 'western'], '{c1} knight tunic, {c2} pauldron, leather gloves', 'leather trousers, boots', ['armor', 'knight', 'gloves']),
  fit('holy_knight', '聖騎士の白銀鎧', 'armor', ['fantasy', 'western', 'sacred'], '{c1} ornate paladin armor, {c2} filigree, white cape', 'armored boots', ['armor', 'knight', 'sacred', 'cape']),
  fit('dark_knight', '黒騎士の鎧', 'armor', ['dark', 'fantasy'], '{c1} spiked dark armor, {c2} tattered cape', 'armored boots', ['armor', 'dark', 'cape']),
  fit('mercenary', '傭兵の装備', 'armor', ['fantasy', 'western', 'wasteland'], '{c1} leather armor, {c2} scarf, bracers, belts', 'worn trousers, boots', ['armor', 'rugged', 'hunter']),
  fit('ranger', '森の狩人', 'armor', ['fantasy', 'western', 'north'], '{c1} hooded ranger cloak, {c2} leather jerkin', 'leggings, tall boots', ['hunter', 'hood', 'rugged']),
  fit('gladiator', '剣闘士', 'armor', ['myth', 'fantasy', 'historical'], '{c1} shoulder armor, {c2} sash, bare arms, leather straps', 'pteruges, sandals', ['armor', 'exposed', 'wild'], { w: 0.5 }),
  fit('viking', '北方の戦士', 'armor', ['north', 'fantasy'], '{c1} fur mantle, {c2} tunic, braided leather', 'wrapped trousers, boots', ['armor', 'fur', 'rugged']),
  fit('assassin', '暗殺者の装束', 'armor', ['fantasy', 'dark', 'desert'], '{c1} hooded assassin coat, {c2} sash, arm guards', 'fitted trousers, soft boots', ['assassin', 'hood', 'dark']),
  fit('pirate', '海賊船長', 'armor', ['fantasy', 'historical', 'western'], '{c1} captain coat, {c2} sash, tricorne hat', 'breeches, buckled boots', ['pirate', 'hat', 'danger']),
  // ---- 魔術・聖職 ----
  fit('mage_robe', '魔術師のローブ', 'mage', ['fantasy', 'western', 'dark'], '{c1} mage robe, {c2} runic embroidery, high collar', 'long robe hem, boots', ['mage', 'robe']),
  fit('archmage', '大魔導師の外套', 'mage', ['fantasy', 'western'], '{c1} layered archmage coat, {c2} star embroidery, ornate clasps', 'long robe, boots', ['mage', 'robe', 'luxury']),
  fit('witch_hunter', '魔女狩りの外套', 'mage', ['dark', 'gothic', 'fantasy'], '{c1} long coat, {c2} wide-brimmed hat, leather harness', 'dark trousers, boots', ['hunter', 'dark', 'hat', 'coat']),
  fit('priest_cassock', '神父のカソック', 'mage', ['western', 'gothic', 'modern', 'dark'], '{c1} cassock, white roman collar, {c2} rosary', 'cassock hem, shoes', ['sacred', 'religious', 'covered']),
  fit('cardinal', '高位聖職者の法衣', 'mage', ['western', 'fantasy', 'court', 'sacred'], '{c1} ornate vestments, {c2} stole, gold embroidery', 'long robes', ['sacred', 'religious', 'luxury']),
  fit('oracle', '神託の白衣', 'mage', ['myth', 'fantasy', 'sacred'], 'flowing {c1} ceremonial robes, {c2} sheer veil, jewelry', 'long robe, barefoot', ['sacred', 'ethereal', 'robe']),
  fit('necromancer', '死霊術師の装束', 'mage', ['dark', 'fantasy', 'gothic'], '{c1} tattered robe, {c2} bone ornaments, hood', 'long robe', ['mage', 'dark', 'hood']),
  fit('alchemist', '錬金術師のコート', 'mage', ['fantasy', 'steampunk', 'western'], '{c1} alchemist coat with many pouches, {c2} goggles on head', 'trousers, boots', ['mage', 'scholar', 'tech']),
  fit('fallen_angel', '堕天の装束', 'mage', ['myth', 'dark', 'fantasy'], '{c1} ornate dark robes, {c2} chains, feathered collar', 'long robe', ['dark', 'ethereal', 'sacred'], { w: 0.6 }),
  // ---- 和装 ----
  fit('kimono_haori', '着物と羽織', 'japanese', ['japan', 'taisho', 'modern'], '{c1} kimono, {c2} haori', 'hakama, zori', ['traditional', 'elegant'], { culture: 'japan' }),
  fit('montsuki', '紋付袴', 'japanese', ['japan', 'taisho'], '{c1} montsuki kimono with family crest, {c2} haori himo', 'striped hakama, tabi', ['traditional', 'formal'], { culture: 'japan' }),
  fit('samurai', '侍の装束', 'japanese', ['japan', 'historical'], '{c1} samurai kimono, {c2} hakama tied with obi, katana at waist', 'hakama, waraji', ['traditional', 'warrior'], { culture: 'japan' }),
  fit('yukata', '浴衣', 'japanese', ['japan', 'modern'], '{c1} yukata, {c2} obi', 'geta', ['traditional', 'casual', 'light'], { culture: 'japan' }),
  fit('loose_kimono', '着崩した着物', 'japanese', ['japan', 'fantasy', 'dark'], 'loosely worn {c1} kimono, {c2} inner layer, open collar', 'geta', ['traditional', 'alluring', 'exposed'], { culture: 'japan' }),
  fit('kariginu', '狩衣（陰陽師）', 'japanese', ['japan', 'fantasy', 'sacred'], '{c1} kariginu, {c2} sashinuki, eboshi hat', 'sashinuki trousers', ['traditional', 'mage', 'sacred', 'hat'], { culture: 'japan' }),
  fit('sokutai', '束帯（平安装束）', 'japanese', ['japan', 'court', 'historical'], '{c1} layered heian court robes, {c2} under-robes, kanmuri', 'long train', ['traditional', 'royal', 'luxury'], { culture: 'japan', w: 0.6 }),
  fit('shinobi', '忍装束', 'japanese', ['japan', 'historical', 'fantasy'], '{c1} shinobi garb, {c2} scarf, arm guards', 'tabi boots', ['traditional', 'assassin'], { culture: 'japan' }),
  fit('taisho_shosei', '大正の書生', 'japanese', ['taisho', 'japan', 'retro'], '{c1} kimono over a stand-collar shirt, {c2} hakama, bowler hat', 'hakama, boots', ['traditional', 'retro', 'scholar', 'hat'], { culture: 'japan' }),
  fit('monk_kesa', '僧衣と袈裟', 'japanese', ['japan', 'sacred', 'historical'], '{c1} monk robes, {c2} kesa', 'robe hem, sandals', ['traditional', 'religious', 'sacred'], { culture: 'japan', w: 0.6 }),
  fit('ronin', '浪人の旅装', 'japanese', ['japan', 'historical', 'fantasy'], 'worn {c1} kimono, {c2} straw hat on back', 'hakama, straw sandals', ['traditional', 'rugged', 'warrior'], { culture: 'japan' }),
  fit('ryukyu_kariyushi', 'かりゆし', 'japanese', ['japan', 'modern'], '{c1} kariyushi shirt, {c2} bingata pattern', 'slacks', ['casual', 'light'], { culture: 'ryukyu', w: 0.5 }),
  // ---- 中華・東アジア ----
  fit('hanfu_scholar', '書生の漢服', 'chinese', ['china', 'historical'], '{c1} hanfu with crossed collar, {c2} sash, wide sleeves', 'long skirt-robe, cloth shoes', ['traditional', 'scholar', 'elegant'], { culture: 'china' }),
  fit('hanfu_noble', '宮廷の華服', 'chinese', ['china', 'court'], 'layered {c1} silk hanfu, {c2} brocade, jade pendant, hair crown', 'long robes', ['traditional', 'royal', 'luxury'], { culture: 'china' }),
  fit('dragon_robe', '龍袍', 'chinese', ['china', 'court'], '{c1} imperial dragon robe, {c2} embroidery, crown', 'long robes', ['traditional', 'royal', 'luxury', 'crown'], { culture: 'china', w: 0.6 }),
  fit('wuxia_swordsman', '武侠の剣客', 'chinese', ['china', 'martial', 'fantasy'], '{c1} martial robe, {c2} sash, bracers, flowing sleeves', 'trousers, boots', ['traditional', 'warrior'], { culture: 'china' }),
  fit('changshan', '長衫', 'chinese', ['china', 'retro', 'modern'], '{c1} changshan with frog buttons, {c2} piping', 'trousers, cloth shoes', ['traditional', 'elegant'], { culture: 'china' }),
  fit('taoist', '道士の道袍', 'chinese', ['china', 'fantasy', 'sacred'], '{c1} taoist robe, {c2} yin-yang trim, fly whisk', 'long robes', ['traditional', 'mage', 'sacred'], { culture: 'china' }),
  fit('hanbok_dopo', '道袍（韓服）', 'chinese', ['eastern', 'historical'], '{c1} dopo overcoat, {c2} tie ribbon, gat hat', 'baji trousers', ['traditional', 'scholar', 'hat'], { culture: 'korea', w: 0.6 }),
  fit('mongol_deel', 'デール（草原の装束）', 'chinese', ['north', 'fantasy', 'historical'], '{c1} deel robe, {c2} sash, fur hat', 'leather boots', ['traditional', 'fur', 'rugged'], { culture: 'mongolia', w: 0.6 }),
  // ---- 世界の意匠 ----
  fit('sherwani', 'シェルワニ', 'world', ['court', 'desert', 'historical', 'modern'], '{c1} embroidered sherwani, {c2} stole, turban', 'churidar, mojari', ['traditional', 'royal', 'luxury'], { culture: 'south_asia' }),
  fit('kurta', 'クルタ', 'world', ['modern', 'historical'], '{c1} kurta, {c2} embroidery', 'pajama trousers, sandals', ['traditional', 'casual', 'light'], { culture: 'south_asia' }),
  fit('desert_prince', '砂漠の王子', 'world', ['desert', 'fantasy', 'court'], '{c1} flowing robe, {c2} gold jewelry, head scarf', 'loose trousers, sandals', ['royal', 'luxury', 'light'], { culture: 'arabia' }),
  fit('bisht', 'ビシュト', 'world', ['desert', 'court', 'modern'], '{c1} thobe, {c2} bisht cloak with gold trim, keffiyeh', 'sandals', ['traditional', 'royal', 'formal'], { culture: 'arabia' }),
  fit('persian_prince', 'ペルシアの貴公子', 'world', ['desert', 'court', 'fantasy'], '{c1} embroidered persian coat, {c2} sash, jeweled turban', 'loose trousers, slippers', ['royal', 'luxury'], { culture: 'persia' }),
  fit('ottoman_kaftan', 'オスマンのカフタン', 'world', ['court', 'historical'], '{c1} brocade kaftan, {c2} tulip pattern, sash', 'salvar trousers, boots', ['royal', 'luxury', 'traditional'], { culture: 'ottoman', w: 0.6 }),
  fit('silk_road', 'シルクロードの旅装', 'world', ['desert', 'fantasy', 'historical'], '{c1} ikat chapan coat, {c2} embroidered cap', 'trousers, riding boots', ['traditional', 'travel'], { culture: 'central_asia', w: 0.6 }),
  fit('burnous', 'フード付きバーヌース', 'world', ['desert', 'fantasy'], '{c1} hooded burnous cloak, {c2} tassels', 'loose trousers, babouche', ['traditional', 'hood', 'travel'], { culture: 'maghreb', w: 0.5 }),
  fit('agbada', 'アグバダ', 'world', ['modern', 'court', 'fantasy'], '{c1} flowing agbada robe, {c2} embroidery, fila cap', 'matching trousers', ['traditional', 'royal', 'luxury'], { culture: 'west_africa', w: 0.5 }),
  fit('kente_stole', 'ケンテ織りのストール', 'world', ['modern', 'court', 'fantasy'], '{c1} shirt, kente stole with {c2} woven pattern', 'trousers', ['traditional', 'formal'], { culture: 'west_africa', w: 0.4 }),
  fit('shuka_beads', 'シュカとビーズ装飾', 'world', ['fantasy', 'modern'], '{c1} shuka cloth wrap, {c2} beaded collar', 'sandals', ['traditional', 'light'], { culture: 'east_africa', w: 0.4 }),
  fit('batik_shirt', 'バティックシャツ', 'world', ['modern', 'fantasy'], '{c1} batik shirt, {c2} songket sash', 'trousers', ['traditional', 'casual'], { culture: 'southeast_asia', w: 0.5 }),
  fit('slavic_kaftan', 'スラヴの刺繍カフタン', 'world', ['north', 'fantasy', 'historical'], '{c1} embroidered kaftan, {c2} fur trim, belt', 'boots', ['traditional', 'fur', 'noble'], { culture: 'slavic', w: 0.6 }),
  fit('celtic_cloak', 'ケルトのマント', 'world', ['fantasy', 'north'], '{c1} woolen cloak, {c2} tartan, brooch', 'tunic, boots', ['traditional', 'rugged', 'cape'], { culture: 'celtic', w: 0.6 }),
  fit('norse_tunic', '北欧の刺繍チュニック', 'world', ['north', 'fantasy'], '{c1} tunic, {c2} knotwork trim, fur cloak', 'trousers, boots', ['traditional', 'fur', 'rugged'], { culture: 'nordic', w: 0.6 }),
  fit('greek_himation', 'ヒマティオン', 'world', ['myth', 'fantasy', 'historical'], 'draped {c1} himation, {c2} meander border, laurel wreath', 'sandals', ['traditional', 'sacred', 'light', 'exposed'], { culture: 'mediterranean', w: 0.6 }),
  fit('andean_poncho', 'アンデスのポンチョ', 'world', ['fantasy', 'modern'], '{c1} woven poncho, {c2} geometric pattern', 'trousers, boots', ['traditional', 'travel'], { culture: 'andes', w: 0.4 }),
  fit('feather_regalia', '羽飾りの儀礼装束', 'world', ['myth', 'fantasy'], '{c1} ceremonial cape with feathers, {c2} gold ornaments', 'sandals', ['traditional', 'sacred', 'royal'], { culture: 'mesoamerica', w: 0.4 }),
  // ---- ゴシック・夜 ----
  fit('gothic_coat', 'ゴシックロングコート', 'dark', ['gothic', 'dark', 'urban'], '{c1} gothic long coat, {c2} lace cravat, silver buttons', 'slim trousers, boots', ['dark', 'gothic', 'elegant', 'coat']),
  fit('host_suit', 'ホストのスーツ', 'dark', ['urban', 'modern', 'night'], 'shiny {c1} suit, open {c2} shirt, silver accessories', 'slim trousers, pointed shoes', ['alluring', 'luxury', 'suit']),
  fit('bartender', 'バーテンダー', 'dark', ['urban', 'modern', 'noir'], 'white shirt, {c1} vest, {c2} bow tie, sleeve garters', 'slacks', ['formal', 'tie', 'bartender']),
  fit('cloak_mystery', '黒い外套の旅人', 'dark', ['fantasy', 'dark', 'gothic'], '{c1} hooded cloak, {c2} clasp', 'travel boots', ['dark', 'hood', 'travel']),
  fit('masquerade', '仮面舞踏会の装い', 'dark', ['court', 'gothic', 'western'], '{c1} masquerade coat, {c2} masquerade mask, lace', 'trousers, boots', ['noble', 'luxury', 'mask'], { w: 0.5 }),
  fit('demon_lord', '魔王の装束', 'dark', ['dark', 'fantasy'], '{c1} ornate demon lord armor-robe, {c2} spiked pauldrons, flowing cape', 'armored boots', ['dark', 'royal', 'cape', 'armor']),
  // ---- SF・テック ----
  fit('cyber_jacket', 'サイバーパンクのジャケット', 'sf', ['sf', 'urban', 'street'], '{c1} cyberpunk jacket with glowing {c2} lines, high collar', 'tech pants, boots', ['tech', 'street', 'danger']),
  fit('android_bodysuit', 'アンドロイドの衣装', 'sf', ['sf'], 'sleek {c1} bodysuit, {c2} panel lines', 'armored boots', ['tech', 'sleek'], { w: 0.6 }),
  fit('space_captain', '宇宙艦長の制服', 'sf', ['sf', 'space', 'military'], '{c1} starship captain uniform, {c2} insignia, cape', 'uniform trousers, boots', ['military', 'tech', 'officer', 'cape']),
  fit('pilot_suit', 'パイロットスーツ', 'sf', ['sf', 'military', 'space'], '{c1} pilot suit, {c2} accents, helmet under arm', 'pilot suit legs', ['tech', 'sleek', 'sporty']),
  fit('scavenger', '終末の放浪者', 'sf', ['wasteland', 'sf'], 'weathered {c1} duster coat, {c2} goggles, gas mask on neck', 'patched trousers, boots', ['rugged', 'travel', 'coat']),
  fit('lab_coat', '白衣', 'sf', ['modern', 'sf', 'business'], 'white lab coat over a {c1} shirt, {c2} necktie, ID badge', 'slacks', ['scholar', 'labcoat', 'tie']),
  fit('hacker', 'ハッカーの部屋着', 'sf', ['sf', 'modern', 'urban'], 'oversized {c1} hoodie, {c2} headphones around neck', 'joggers', ['casual', 'tech', 'hood']),
  // ---- 職業服 ----
  fit('chef', 'シェフコート', 'work', ['modern'], '{c1} chef coat, {c2} neckerchief', 'apron, trousers', ['work'], { w: 0.5 }),
  fit('barista', 'カフェエプロン', 'work', ['modern'], '{c1} shirt, {c2} cafe apron', 'chinos', ['work', 'casual', 'soft']),
  fit('doctor_scrubs', '医師のスクラブ', 'work', ['modern'], '{c1} scrubs, white coat, stethoscope', 'scrub pants', ['work', 'labcoat'], { w: 0.5 }),
  fit('firefighter', '消防服', 'work', ['modern'], '{c1} firefighter jacket, {c2} reflective stripes', 'turnout pants, boots', ['work', 'rugged', 'sporty'], { w: 0.4 }),
  fit('artist_smock', '画家のスモック', 'work', ['modern', 'victorian', 'retro'], 'paint-stained {c1} smock, {c2} neckerchief', 'trousers', ['work', 'casual', 'artist'], { w: 0.5 }),
  fit('tailor_vest', '仕立て屋のベスト', 'work', ['modern', 'victorian', 'retro'], '{c1} vest, rolled shirt sleeves, {c2} measuring tape around neck', 'trousers', ['work', 'formal', 'artist'], { w: 0.5 }),
  // ---- 舞台・芸能 ----
  fit('idol_stage', 'アイドルの衣装', 'stage', ['stage', 'modern'], 'sparkling {c1} stage jacket, {c2} accents, earpiece microphone', 'slim pants, boots', ['stage', 'luxury', 'sunny']),
  fit('rock_star', 'ロックスター', 'stage', ['stage', 'modern', 'street'], '{c1} leather jacket, open {c2} shirt, chains', 'leather pants, boots', ['stage', 'danger', 'exposed']),
  fit('ringmaster', 'サーカスの団長', 'stage', ['stage', 'victorian', 'steampunk'], '{c1} ringmaster tailcoat, {c2} lapels, top hat', 'white trousers, boots', ['stage', 'hat', 'luxury'], { w: 0.5 }),
  fit('magician', '奇術師の燕尾', 'stage', ['stage', 'victorian', 'modern'], '{c1} magician tailcoat, {c2} cape lining, white gloves, top hat', 'trousers', ['stage', 'gloves', 'hat', 'cape']),
  fit('dancer', '舞踊家の衣装', 'stage', ['stage', 'desert', 'fantasy'], 'flowing {c1} dance tunic, {c2} sash, jewelry', 'loose trousers', ['stage', 'light', 'elegant'], { w: 0.6 }),
  fit('noh_actor', '能楽師の装束', 'stage', ['japan', 'stage', 'historical'], '{c1} noh costume, {c2} brocade', 'hakama', ['traditional', 'stage', 'elegant'], { culture: 'japan', w: 0.4 }),
  fit('bard', '吟遊詩人', 'stage', ['fantasy', 'western'], '{c1} feathered cap, {c2} doublet, short cape', 'tight trousers, boots', ['stage', 'hat', 'cape'], { w: 0.6 }),
  // ---- 冒険・旅 ----
  fit('adventurer', '冒険者の旅装', 'armor', ['fantasy', 'western'], '{c1} adventurer coat, {c2} scarf, belt pouches', 'trousers, boots', ['travel', 'rugged']),
  fit('detective_inverness', 'インバネスコートの探偵', 'suit', ['victorian', 'noir', 'retro'], '{c1} inverness cape coat, {c2} deerstalker hat', 'trousers, boots', ['detective', 'coat', 'hat', 'cape'], { w: 0.6 }),
  fit('steampunk_engineer', 'スチームパンクの機関士', 'sf', ['steampunk', 'retro'], '{c1} waistcoat with brass gears, {c2} goggles, leather gloves', 'trousers, boots', ['tech', 'gloves', 'retro']),
  fit('sky_pirate', '空賊の外套', 'sf', ['steampunk', 'fantasy'], '{c1} long coat, {c2} goggles, harness', 'trousers, boots', ['pirate', 'coat', 'danger'], { w: 0.6 }),
  fit('winter_noble', '毛皮の外套', 'court', ['north', 'court', 'fantasy'], '{c1} fur-lined coat, {c2} brooch, gloves', 'trousers, boots', ['noble', 'fur', 'gloves', 'winter']),
  fit('pajamas', 'くつろぎの部屋着', 'casual', ['modern'], 'loose {c1} button-up pajama shirt, {c2} piping', 'pajama pants', ['casual', 'soft', 'home'], { w: 0.4 }),
  fit('bathrobe', 'バスローブ', 'casual', ['modern', 'urban'], '{c1} bathrobe, {c2} trim, towel around neck', 'slippers', ['casual', 'alluring', 'home', 'exposed'], { w: 0.3 })
];

/* 衣装の特徴タグ（f_*）。禁断の調合の「衣装の乱れ」が、その衣装に実在する部位だけを選ぶために使う。
 * 手で付けると漏れやすいので、upper / lower の語から機械的に付ける（既存のタグとは別名にして、他の重みに影響させない）。 */
const FEATURES: Array<[string, RegExp]> = [
  ['f_shirt', /\b(shirt|blouse|dress shirt)\b/i],
  ['f_collar', /\b(shirt|collar|blouse|polo|uniform|gakuran|tunic|kimono)\b/i],
  ['f_jacket', /\b(jacket|blazer|suit|tuxedo|tailcoat|blouson|doublet)\b/i],
  ['f_coat', /\b(coat|parka|trench|overcoat|greatcoat|inverness|frock)\b/i],
  ['f_hood', /\bhood(ie|ed)?\b/i],
  ['f_headwear', /\b(crown|tiara|circlet|hat|cap|helmet|headdress|turban|kabuto|eboshi|veil|laurel|horned)\b/i],
  ['f_layered', /\b(over a|under|layered|inner|cardigan|jacket|coat|vest|waistcoat|haori|cloak|cape)\b/i],
  ['f_sleeveless', /\b(sleeveless|tank top|bare arms|bare chest|shirtless)\b/i]
];
export const OUTFIT: Option[] = OUTFIT_BASE.map((x) => {
  const text = `${x.upper ?? ''} ${x.lower ?? ''}`;
  const extra = FEATURES.filter(([, re]) => re.test(text)).map(([t]) => t);
  return extra.length ? { ...x, tags: [...(x.tags ?? []), ...extra] } : x;
});

export const OUTFIT_CATS: Category[] = [
  { id: 'suit', ja: 'スーツ・フォーマル' }, { id: 'daily', ja: '日常着・きれいめ' }, { id: 'casual', ja: 'カジュアル・ストリート' }, { id: 'court', ja: '貴族・王族' },
  { id: 'military', ja: '軍服・制服' }, { id: 'armor', ja: '甲冑・戦装束' }, { id: 'mage', ja: '魔術・聖職' },
  { id: 'japanese', ja: '和装' }, { id: 'chinese', ja: '中華・東アジア' }, { id: 'world', ja: '世界の意匠' },
  { id: 'dark', ja: 'ゴシック・夜' }, { id: 'sf', ja: 'SF・テック' }, { id: 'work', ja: '職業服' }, { id: 'stage', ja: '舞台・芸能' }
];
