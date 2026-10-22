# EXPANSION-AUDIT — Deep Research 394候補の監査と採否

辞書の版：`2026.10.13`（増築前は `2026.10.12`）。この文書は `scripts/expansion/report.ts` で生成している（台帳：`scripts/expansion/ledger.ts`、機械監査：`docs/expansion/audit-machine.json`、テーマ判定：`scripts/expansion/themes.ts`）。

## 1. 結論

- 394件すべてを台帳に記録した：採用 189件・修正して採用 78件・統合 118件・保留 6件・不採用 3件。
- 新しい候補は「採用」「修正して採用」の 267件（候補IDは `x_<分類>_` を外して既存の命名に合わせた）と、統合で作った 1件（`ageCue:soft_eye_bags`：別分類の候補を移してまとめたもの）。ほかの「統合」は、既存の候補や増築の別候補へまとめたもの。新しい7項目の「指定しない／ポーズに任せる」を加え、辞書は 1727件 → 2002件。
- 入力は再構成データ（全件 `reconstruction: true`）で、出典URLは一般的な辞書・タグ解説に留まる。採否はタグとしての描きやすさ・既存の辞書との重複・制約の矛盾・方針（成人男性1名の美形、文化を肌や顔立ちと結び付けない）で判断した。画像での確認はしていない（§6）。
- テーマ25件：現行で成立 0件・候補修正で成立 11件・新機能後に成立 9件・要調整 5件・保留 0件。

## 2. 入力の確認

- 件数 394・ID重複なし（一意 394）・CSV 394行とJSONの一致：一致。既存項目向け 292件・新項目向け 102件。
- 段階：Phase 1 146件・Phase 2 146件・Phase 3 102件。優先度：high 146・medium 235・low 13。確度：B 133・A 251・C 10。
- 原本は `docs/expansion/source/`（gzip と SHA-256。`tests/expansion.test.ts` が件数・CSVとの一致・台帳の網羅を検査）。

## 3. 機械監査の要約

増築前の辞書（`tests/fixtures/dictionary-ids-2026.10.12.json`、1727件）と照合した。英語句は小文字化・記号除去・語末の s を揃えて比較している。

| 観点 | 件数 | 扱い |
|---|---:|---|
| 既存の候補と英語句が一致 | 32 | 原則「統合」。語が同じでも意味が違うもの（別項目の同語）は個別に判断 |
| 同じ項目で語が大きく重なる（Jaccard ≥ 0.34） | 51 | 差分が画像で描き分けられるかで判断 |
| 日本語名が既存と一致 | 6 | 名前を変えるか統合 |
| 候補ID（`x_` を除く）が既存と衝突 | 9 | 既存IDは変えず、新しいIDを付け直すか統合 |
| 候補どうしの重複 | 22 | 1つにまとめる |
| 自然文がカテゴリごとの定型文 | 284 | 採用分はすべて自然文を書き直し（"adult" を含めない） |
| 確度C（抽象語） | 10 | 描ける語へ言い換えるか、保留・不採用 |

## 4. 分類ごとの採否

| 分類 | 反映先 | 件数 | 採用 | 修正採用 | 統合 | 保留 | 不採用 |
|---|---|---:|---:|---:|---:|---:|---:|
| archetype | `archetype` | 24 | 12 | 9 | 2 | 1 | 0 |
| face | `face` | 26 | 6 | 11 | 9 | 0 | 0 |
| eyeShape | `eyeShape` | 16 | 2 | 2 | 11 | 1 | 0 |
| feature | `marks` | 14 | 0 | 0 | 11 | 2 | 1 |
| beard | `facialHair` | 8 | 1 | 3 | 4 | 0 | 0 |
| build | `build` | 12 | 5 | 2 | 5 | 0 | 0 |
| hairStyle | `hairStyle` | 26 | 8 | 3 | 15 | 0 | 0 |
| expression | `expression` | 16 | 3 | 8 | 5 | 0 | 0 |
| vibe | `aura` | 10 | 2 | 2 | 6 | 0 | 0 |
| world | `world` | 16 | 13 | 3 | 0 | 0 | 0 |
| occupation | `occupation` | 24 | 17 | 0 | 6 | 1 | 0 |
| outfit | `outfit` | 28 | 13 | 4 | 11 | 0 | 0 |
| pose | `pose` | 24 | 9 | 3 | 12 | 0 | 0 |
| prop | `prop` | 14 | 10 | 1 | 3 | 0 | 0 |
| scene | `scene` | 22 | 18 | 4 | 0 | 0 | 0 |
| weather | `time` | 6 | 2 | 1 | 3 | 0 | 0 |
| lighting | `light` | 6 | 3 | 1 | 2 | 0 | 0 |
| ageCue | `ageCue` | 18 | 11 | 4 | 3 | 0 | 0 |
| hairTexture | `hairTexture` | 14 | 11 | 3 | 0 | 0 | 0 |
| fringe | `fringe` | 12 | 6 | 2 | 4 | 0 | 0 |
| gaze | `gaze` | 14 | 8 | 3 | 3 | 0 | 0 |
| headPose | `headPose` | 12 | 6 | 3 | 3 | 0 | 0 |
| outfitDetail | `outfitDetail` | 20 | 13 | 6 | 0 | 0 | 1 |
| fabric | `fabric` | 12 | 10 | 0 | 0 | 1 | 1 |
| 計 | | 394 | 189 | 78 | 118 | 6 | 3 |

## 5. 保留・不採用

| 候補 | 名前 | 判定 | 理由 |
|---|---|---|---|
| `x_archetype_urban_cyclist` | 都市生活の自転車乗り | 保留 | 自転車の持ち物・乗車ポーズが辞書になく、英語句だけでは既存の爽やか系と描き分けられない。自転車と合わせて再設計する |
| `x_eyeShape_asymmetrical_eyelids` | 左右差のあるまぶた | 保留 | まぶたの左右差は崩れとして描かれやすい。美形方針を保てるか画像での確認が必要 |
| `x_feature_faint_acne_scars` | 淡いニキビ跡 | 保留 | ニキビ跡として崩れて描かれる恐れがあり、美形方針を保てるか画像での確認が必要 |
| `x_feature_subtle_facial_asymmetry` | 微細な顔の左右差 | 保留 | 顔の左右差は崩れとして描かれやすい。画像での確認が必要 |
| `x_feature_faint_sunspots` | 日差しによる薄い色斑 | 不採用 | sunspots は天体の黒点と紛れ、肌の表現として不明瞭。既存のそばかすで足りる |
| `x_occupation_paramedic` | 救急救命士 | 保留 | 救急隊の制服が衣装の辞書になく、職業名は画像に出力しないため描き分けられない。制服と合わせて追加する |
| `x_outfitDetail_stitched_leather_strap` | 縫い目のある革ストラップ | 不採用 | 何のストラップか曖昧で、ハーネス（拘束具・衣装のベルト類）と紛れる |
| `x_fabric_technical_mesh` | 機能性メッシュ | 保留 | mesh が透ける生地として描かれる恐れ（露出の方針）。画像での確認が必要 |
| `x_fabric_recycled_textile` | 再生繊維の風合い | 不採用 | 再生繊維かどうかは画像で見分けられない |

## 6. 未確認のこと

- 画像生成（PixAI・NovelAI）での見え方は確認していない。特に、年齢の表れ（皺・白髪の強さ）、視線と頭の向きの組み合わせ、衣装の細部（小さな装身具）は、モデルによって無視・誇張されることがある。
- 地域の世界観（韓国の都市・南アジアの大都市など）は、肌の色・顔立ちと結び付けていない（抽選上も独立）。描かれ方の偏りは画像で確かめていない。
- 確度B・Cの候補の語は、一般的なタグ解説と既存の辞書の語に合わせて直したが、各サービスの公式タグ一覧との照合はしていない。

## 7. テーマ25件の判定

テーマは「素材の組み合わせ例」として扱い、台帳で候補を実際の辞書IDへ読み替えて、それらを固定して1人分を錬成できるかを判定した（`tests/expansion.test.ts` で15件以上の成立を検査）。

- 「現行で成立」が0件なのは、どのテーマにも増築で足した候補が1つ以上含まれるため（増築前の辞書だけで成立するテーマはない）。
- 読み替えは原資料の候補をそのまま辞書IDへ写したもの。テーマ08・24の美形タイプ（軌道都市の外交官）や10（アール・ヌーヴォーの神秘家）は原資料の指定で、テーマの世界観とはずれるが、判定では原資料のまま扱った。アプリでは美形タイプを固定しなければ、世界観に合うタイプが選ばれる。
- 「要調整」は、同じ項目に2つの候補がある（単一選択）か、ポーズと持ち物の手の数・衣装に既にある部位など hard 制約で両立しないもの。どれか1つを外せば成立する。

| ID | テーマ | 判定 | 読み替え | 注記 |
|---|---|---|---|---|
| theme_01_quiet_architect | 静謐な現代建築家 | 候補修正で成立 | 美形タイプ:思索する建築家、職業:建築家、衣装:ミニマルなジャケットの装い、持ち物:建築図面、背景:建築設計事務所、ポーズ:机上を覗き込む、光:天窓の柔らかな光 | — |
| theme_02_weathered_carpenter | 年輪を刻んだ木工職人 | 要調整 | 美形タイプ:年輪を刻んだ職人美、職業:木工職人、衣装:チョアジャケットのワークウェア、持ち物:折尺、背景:木工房、ポーズ:袖をまくる、年齢の表れ:薄い笑い皺 | 両立しない：持ち物「折尺」に必要な手が、ポーズ「袖をまくる」では空いていません ／ 固定中の項目どうしが矛盾しているため、錬成を中止しました。どちらかの固定を外してください。 |
| theme_03_silver_diplomat | 銀髪の老外交官 | 新機能後に成立 | 美形タイプ:銀髪の外交官、職業:外交官、年齢の表れ:こめかみの白髪、衣装:ダブルのスーツ、ポーズ:後ろ手に組む、背景:軌道都市の外交ホール、頭:顔を少し横へ向ける | — |
| theme_04_midnight_jazz | 夜更けのジャズマン | 候補修正で成立 | 美形タイプ:内省的なジャズ奏者、衣装:ノーネクタイの三つ揃い、持ち物:サックス、背景:薄暗いジャズクラブ、表情:寂しげな微笑み、ポーズ:椅子に横向きに座る、光:卓上灯の暖かな光 | — |
| theme_05_rainy_detective | 雨夜の疲れた探偵 | 新機能後に成立 | 美形タイプ:疲れた名探偵、年齢の表れ:風雪を経た品格、衣装:長いウールコートとマフラー、背景:雨の日の探偵事務所、時間:雨上がりのブルーアワー、視線:伏し目、表情:疲れと優しさの混じる顔 | — |
| theme_06_steppe_falconer | 草原の鷹匠 | 候補修正で成立 | 美形タイプ:草原の鷹匠、世界観:中央アジア風の草原、職業:鷹匠、衣装:デール（草原の装束）、持ち物:鷹を乗せた革手袋、背景:草原の野営地、時間:夜明け | — |
| theme_07_silk_road_astronomer | シルクロードの星読み学者 | 要調整 | 美形タイプ:学究肌の天文学者、世界観:シルクロード風の交易都市、衣装:シルクロードの旅装、持ち物:古い地図、背景:隊商宿の中庭、ポーズ:座って読書に没頭、光:卓上灯の暖かな光 | 両立しない：光「卓上灯の暖かな光」は屋外・半屋外の背景「隊商宿の中庭」では描けません ／ 両立しない：「座って読書に没頭」には持ち物の条件（本）が必要です（現在：古い地図） ／ 固定中の項目どうしが矛盾しているため、錬成を中止しました。どちらかの固定を外してください。 |
| theme_08_south_asian_diplomat | 南アジア風都市の外交官 | 候補修正で成立 | 世界観:南アジア風の大都市、職業:外交官、衣装:バンドガラ、背景:南アジア風の市庁舎、ポーズ:袖口を整える、美形タイプ:軌道都市の外交官 | — |
| theme_09_southeast_asian_curator | 東南アジア風港湾都市の学芸員 | 新機能後に成立 | 世界観:東南アジア風の港町、職業:学芸員、衣装:リネンシャツ、背景:南国の港の埠頭、持ち物:スケッチブック、視線:遠くを見る | — |
| theme_10_west_african_officiant | 西アフリカ意匠の幻想都市の儀礼官 | 新機能後に成立 | 世界観:西アフリカ風の幻想都市、衣装:織りのマントと重ねたチュニック、背景:西アフリカ意匠の中庭、細部:礼装の飾り緒、ポーズ:後ろ手に組む、美形タイプ:アール・ヌーヴォーの神秘家 | — |
| theme_11_andean_guide | アンデス高地の山岳ガイド | 候補修正で成立 | 世界観:アンデス風の高地、職業:山岳ガイド、衣装:アンデスのポンチョ、背景:高地の山道、時間:夜明け、美形タイプ:山岳案内人 | — |
| theme_12_renaissance_inventor | ルネサンス工房の発明家 | 候補修正で成立 | 世界観:ルネサンス宮廷、美形タイプ:ルネサンス工房の発明家、衣装:ルネサンスのダブレット、背景:ルネサンスの工房、持ち物:折尺、ポーズ:机上を覗き込む | — |
| theme_13_art_nouveau_mystic | アール・ヌーヴォーの神秘家 | 新機能後に成立 | 世界観:アール・ヌーヴォーの都市、美形タイプ:アール・ヌーヴォーの神秘家、衣装:曲線意匠の礼服、背景:アール・ヌーヴォーの吹き抜け、視線:遠くを見る、光:窓から差す光 | — |
| theme_14_belle_epoque_photographer | ベル・エポックの写真家 | 要調整 | 世界観:ベル・エポックの街、職業:写真家、衣装:ベル・エポックのスーツ、持ち物:クラシックカメラ、背景:ベル・エポックの写真館、ポーズ:袖口を整える | 両立しない：持ち物「クラシックカメラ」に必要な手が、ポーズ「袖口を整える」では空いていません ／ 固定中の項目どうしが矛盾しているため、錬成を中止しました。どちらかの固定を外してください。 |
| theme_15_dieselpunk_airship_captain | ディーゼルパンクの飛行船長 | 新機能後に成立 | 世界観:ディーゼルパンク、美形タイプ:潮風を受けた船長、職業:船長、衣装:ディーゼルパンクの飛行服、背景:飛行船の格納庫、頭:横顔 | — |
| theme_16_solarpunk_botanist | ソーラーパンクの植物学者 | 候補修正で成立 | 世界観:ソーラーパンク、職業:植物学者、美形タイプ:ソーラーパンク技師、衣装:ソーラーパンクの作業服、背景:ソーラーパンクの温室、持ち物:植物標本 | — |
| theme_17_orbital_diplomat | 軌道都市の壮年外交官 | 新機能後に成立 | 美形タイプ:軌道都市の外交官、職業:外交官、衣装:軌道都市の外交官礼装、背景:軌道都市の外交ホール、頭:顔を少し横へ向ける | — |
| theme_18_deep_sea_explorer | 深海探査員 | 候補修正で成立 | 世界観:海洋・深海SF、衣装:深海探査隊の制服、背景:深海観測室、光:水面の反射光、ポーズ:窓の外を眺める | — |
| theme_19_gentle_fifty_physician | 50代の穏やかな名医 | 要調整 | 美形タイプ:穏やかな壮年医師、年齢の表れ:薄い笑い皺、年齢の表れ:少し重いまぶた、表情:柔らかな気遣い、衣装:上質なニットポロ、視線:こちらを見る | 「年齢の表れ」に2つ（薄い笑い皺／少し重いまぶた）。単一選択のため先の1つで判定 |
| theme_20_dandy_sixties | 60代の洒脱なダンディ | 新機能後に成立 | 美形タイプ:洒脱なダンディ、年齢の表れ:浅い目尻の皺、衣装:上質なニットポロ、細部:シルクのネックスカーフ、ポーズ:椅子に横向きに座る、光:卓上灯の暖かな光 | — |
| theme_21_warm_vineyard_owner | 陽だまりの壮年農園主 | 候補修正で成立 | 職業:葡萄農園主、背景:葡萄農園、衣装:リネンシャツ、時間:冬の晴れた午後、表情:柔らかな気遣い | — |
| theme_22_classic_barber | クラシック理髪師 | 新機能後に成立 | 職業:理髪師、美形タイプ:クラシックな理髪師、衣装:ベストとシャツ、背景:古い理髪店、持ち物:懐中時計、頭:首を傾ける | — |
| theme_23_rainy_editor | 雨の日の物静かな編集者 | 候補修正で成立 | 美形タイプ:物静かな編集者、職業:編集者、背景:出版社の編集室、衣装:カーディガンとシャツ、ポーズ:座って読書に没頭、時間:雨上がりのブルーアワー、光:卓上灯の暖かな光 | — |
| theme_24_fantasy_ceremonial_guard | 幻想宮廷の儀礼護衛官 | 要調整 | 世界観:ルネサンス宮廷、衣装:軍の礼装、細部:礼装の飾り緒、ポーズ:後ろ手に組む、美形タイプ:軌道都市の外交官、視線:遠くを見る | 両立しない：衣装「軍の礼装」には、「礼装の飾り緒」と同じ部位が既にあります ／ 固定中の項目どうしが矛盾しているため、錬成を中止しました。どちらかの固定を外してください。 |
| theme_25_korean_fashion_model | 現代韓国風都市のモードモデル | 候補修正で成立 | 世界観:現代韓国風の都市、衣装:ミニマルなジャケットの装い、髪型:カンマヘア、表情:値踏みする目つき、ポーズ:壁にもたれる横顔、背景:静かな美術館 | — |

### 成立したテーマの出力例（PixAI・SDXL系、既定の設定。固定していない項目は抽選）

- **theme_01_quiet_architect 静謐な現代建築家**：`masterpiece, best quality, 1boy, solo, male focus, man in his late 20s, handsome, bishounen, thoughtful modern architect, refined handsome features, delicate androgynous features, soft facial features, smooth brow, soft forehead, sanpaku, honey-colored eyes, olive skin, attentive expression, listening, long hair, messy long hair, strawberry blonde hair, wiry build, lean muscle, peach minimalist blazer, antique gold crew-neck top, straight-cut trousers, leather shoes, leaning over table, looking down, holding blueprints, architectural drawings, full body, architecture studio, drafting table, architectural models, dawn, skylight, soft overhead light, pure`
- **theme_03_silver_diplomat 銀髪の老外交官**：`masterpiece, best quality, 1boy, solo, male focus, mature male, middle-aged man, handsome, silver-haired statesman, diplomatic poise, subtly masculine features, aquiline nose, strong profile, graying hair at the temples, double eyelids, defined eyes, hazel eyes, closed mouth smile, long hair, high ponytail, silver hair, athletic build, broad shoulders, mauve double-breasted suit, bright gold pocket square, pleated trousers, hands behind back, standing, head turned to the side, cowboy shot, from above, space station, grand hall, panoramic window, planet, night, rim lighting, weathered dignity, south asian-inspired metropolis`
- **theme_04_midnight_jazz 夜更けのジャズマン**：`masterpiece, best quality, 1boy, solo, male focus, man in his late 20s, handsome, bishounen, melancholic jazz musician, effortless charm, androgynous features, high cheekbones, hollow cheeks, aegyo sal, amber eyes, sad smile, very long hair, braid over shoulder, golden blonde hair, athletic build, broad shoulders, gunmetal gray three-piece suit, waistcoat, open-collar cherry red shirt, tailored trousers, leather shoes, sitting sideways on chair, saxophone, feet out of frame, jazz club, small stage, bar, night, desk lamp, warm lighting, pool of light, world-weary air, city`
- **theme_05_rainy_detective 雨夜の疲れた探偵**：`masterpiece, best quality, 1boy, solo, male focus, mature male, middle-aged man, handsome, world-weary handsome detective, tired sharp eyes, subtly masculine features, slightly upturned mouth corners, weathered dignified features, elongated eyes, narrow eyes, golden eyes, beige skin, tired but tender smile, long hair, half updo, hair bun, light brown hair, large burly build, tall, broad chest, ivy green long wool overcoat, celadon wool scarf, dark trousers, leather boots, kneeling on one knee, working with hands, looking down, downcast eyes, full body, detective office, window blinds, rain on window, blue hour, after rain, cinematic lighting, side lighting, world-weary air, victorian`
- **theme_06_steppe_falconer 草原の鷹匠**：`masterpiece, best quality, 1boy, solo, male focus, mature male, man in his late 30s, handsome, windswept rugged handsome, steppe elegance, androgynous features, straight nose bridge, defined jawline, hooded eyes, red eyes, light skin, serious, very short hair, ivy league haircut, silver-lavender hair, slender delicate build, narrow shoulders, oxidized silver deel robe, plum purple sash, fur hat, leather boots, mongolian-inspired motifs, deel-style collar, bowing, hand on own chest, falcon perched on gloved hand, falconry glove, full body, grassland, steppe, yurt, dawn, chiaroscuro, dramatic lighting, wild, central asian-inspired steppe`
- **theme_08_south_asian_diplomat 南アジア風都市の外交官**：`masterpiece, best quality, 1boy, solo, male focus, mature male, man in his late 30s, handsome, futuristic distinguished handsome, composed authority, feminine facial features, pretty face, small face, delicate features, sharp eyes, intense gaze, crimson eyes, subtle proud smile, long hair, low bun, messy hair, loose strands, navy blue hair, slim build, mustard yellow bandhgala jacket with a high mandarin collar, denim blue buttons, adjusting cuffs, upper body, grand hall, carved arches, south asian-inspired architecture, night, chiaroscuro, dramatic lighting, regal, south asian-inspired metropolis`

## 8. 全候補の台帳

「反映先」は採用・修正採用なら新しい候補、統合ならまとめた先。機械監査の列は、既存と英語句が一致（=）・同じ項目で語が重なる（≈）・候補どうしの重複（⇄）・定型文（定）・確度C（C）。

### archetype（24件 → `archetype`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_archetype_weathered_craftsman` | 年輪を刻んだ職人美 | 修正して採用 | `archetype:weathered_craftsman`（年輪を刻んだ職人美） | 名前の「年輪」に合わせ35歳以上を hard 条件に。好みを職人の衣装・工房・所作・年齢の表れへ翻訳 | 定 |
| `x_archetype_silver_diplomat` | 銀髪の外交官 | 修正して採用 | `archetype:silver_diplomat`（銀髪の外交官） | 英語アンカーが既存「銀髪の老紳士」と同一（distinguished silver-haired gentleman）だったため statesman に変更。名前の銀髪・外交官に合わせ、髪色（銀・白・灰系）と45歳以上を hard 条件 | =archetype:silver_gentleman ≈ 定 |
| `x_archetype_world_weary_detective` | 疲れた名探偵 | 採用 | `archetype:weary_detective`（疲れた名探偵） | 既存の名探偵・ハードボイルドと別の「くたびれた」軸。好みを伏し目・重いまぶた・雨の事務所へ | 定 |
| `x_archetype_sartorial_dandy` | 洒脱なダンディ | 修正して採用 | `archetype:sartorial_dandy`（洒脱なダンディ） | ダンディ＝成熟として35歳以上を hard 条件。老いを皺だけでなく仕立て・細部・所作で描く好みに | 定 |
| `x_archetype_steppe_falconer` | 草原の鷹匠 | 採用 | `archetype:steppe_falconer`（草原の鷹匠） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_archetype_solarpunk_engineer` | ソーラーパンク技師 | 採用 | `archetype:solarpunk_engineer`（ソーラーパンク技師） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_archetype_orbital_diplomat` | 軌道都市の外交官 | 採用 | `archetype:orbital_diplomat`（軌道都市の外交官） | 軌道都市の世界観は作らず、既存のスペースオペラ・近未来SFを好む形に | 定 |
| `x_archetype_art_nouveau_mystic` | アール・ヌーヴォーの神秘家 | 採用 | `archetype:art_nouveau_mystic`（アール・ヌーヴォーの神秘家） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_archetype_gentle_physician` | 穏やかな壮年医師 | 修正して採用 | `archetype:gentle_physician`（穏やかな壮年医師） | 名前の「壮年」に合わせ35〜59歳を hard 条件 | 定 |
| `x_archetype_reserved_editor` | 物静かな編集者 | 採用 | `archetype:reserved_editor`（物静かな編集者） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_archetype_urbane_barber` | 都会派クラシック理髪師 | 修正して採用 | `archetype:urbane_barber`（クラシックな理髪師） | 日本語名を「クラシックな理髪師」に短縮。英語の mature を外し年齢を限定しない（barber を補う） | 定 |
| `x_archetype_renaissance_inventor` | ルネサンス工房の発明家 | 修正して採用 | `archetype:renaissance_inventor`（ルネサンス工房の発明家） | renaissance workshop elegance は背景と重なるため renaissance elegance に | 定 |
| `x_archetype_scholarly_astronomer` | 学究肌の星読み | 修正して採用 | `archetype:scholarly_astronomer`（学究肌の天文学者） | 既存「星読み」（占星術師寄り）と名前が重なるため「学究肌の天文学者」に | 定 |
| `x_archetype_introspective_jazzman` | 内省的なジャズ奏者 | 採用 | `archetype:jazz_saxophonist`（内省的なジャズ奏者） | 既存「ジャズピアニスト」と楽器・表情で描き分ける | 定 |
| `x_archetype_stoic_firefighter` | 寡黙な消防士 | 採用 | `archetype:stoic_firefighter`（寡黙な消防士） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_archetype_coastal_fisherman` | 海辺の漁師 | 採用 | `archetype:coastal_fisherman`（海辺の漁師） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_archetype_thoughtful_architect` | 思索する建築家 | 採用 | `archetype:thoughtful_architect`（思索する建築家） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_archetype_botanical_researcher` | 植物採集家の優しい知性 | 修正して採用 | `archetype:plant_hunter`（植物採集家） | 日本語名を「植物採集家」に短縮 | 定 |
| `x_archetype_mountain_guide` | 山岳案内人の精悍さ | 修正して採用 | `archetype:rugged_guide`（山岳案内人） | 日本語名を「山岳案内人」に短縮（職業「山岳ガイド」とIDを分ける） | 定 |
| `x_archetype_quiet_tailor` | 寡黙な仕立て職人 | 統合 | `archetype:silent_craftsman`（寡黙な職人） | 既存「寡黙な職人」が仕立て屋・時計職人を好む同型のタイプ | 定 |
| `x_archetype_enigmatic_curator` | 謎めいた学芸員 | 採用 | `archetype:enigmatic_curator`（謎めいた学芸員） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_archetype_weathered_captain` | 潮風を受けた船長 | 採用 | `archetype:weathered_captain`（潮風を受けた船長） | 語句をそのまま採用（自然文を書き直し） | ⇄ 定 |
| `x_archetype_urban_cyclist` | 都市生活の自転車乗り | 保留 | — | 自転車の持ち物・乗車ポーズが辞書になく、英語句だけでは既存の爽やか系と描き分けられない。自転車と合わせて再設計する | 定 |
| `x_archetype_melancholic_poet` | 憂いを帯びた詩人 | 統合 | `archetype:moonlit_poet`（月下の詩人） | 既存「月下の詩人」と同じ人物像（憂い・詩人） | 定 |

### face（26件 → `face`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_face_diamond_face` | ダイヤ型の輪郭 | 修正して採用 | `face:diamond_face`（ダイヤ型の輪郭） | defined cheekbones は既存「シャープな顎線」と重複するため削除 | =face:sharp_jaw 定 |
| `x_face_rectangular_face` | 長方形の輪郭 | 修正して採用 | `face:rectangular_face`（長方形の輪郭） | defined jawline は既存「通った鼻筋」と重複するため削除 | =face:straight_nose 定 |
| `x_face_wide_oval_face` | 幅のある卵型輪郭 | 採用 | `face:broad_oval_face`（幅のある卵型の輪郭） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_face_heart_face_male` | 額が広い逆三角輪郭 | 統合 | `face:pointed_chin`（逆三角の美形） | 既存「逆三角の美形」（inverted triangular face）と同じ輪郭 | 定 |
| `x_face_square_soft_edges` | 角が柔らかな四角顔 | 修正して採用 | `face:soft_square_face`（角の柔らかな四角顔） | rounded jaw corners を rounded jaw に簡潔化 | ≈ 定 |
| `x_face_elongated_face` | 縦長の面長顔 | 統合 | `face:long_elegant`（面長で上品） | 既存「面長で上品」と同じ | 定 |
| `x_face_prominent_cheekbones` | 際立った頬骨 | 採用 | `face:prominent_cheekbones`（際立った頬骨） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_face_high_zygomatic_arch` | 高い頬骨弓 | 統合 | `face:prominent_cheekbones`（際立った頬骨） | high cheekbones は既存「高い頬骨とこけた頬」と重複、zygomatic arch は専門語。際立った頬骨にまとめた | =face:high_cheek 定 |
| `x_face_hollow_cheeks` | 少しこけた頬 | 統合 | `face:high_cheek`（高い頬骨とこけた頬） | 既存「高い頬骨とこけた頬」（hollow cheeks）と同じ | ≈ 定 |
| `x_face_full_cheeks` | ふっくらした頬 | 修正して採用 | `face:full_cheeks`（ふっくらした頬） | soft facial fullness を soft round face に | 定 |
| `x_face_roman_nose` | ローマ鼻 | 修正して採用 | `face:roman_nose`（ローマ鼻） | strong profile は既存「鷲鼻の凛とした横顔」と同一のため削除 | =face:aquiline ≈ 定 |
| `x_face_aquiline_nose` | 鷲鼻 | 統合 | `face:aquiline`（鷲鼻の凛とした横顔） | 既存の候補と同じ語・同じ意味（機械監査で一致） | =face:aquiline 定 |
| `x_face_straight_nose_bridge` | まっすぐな鼻梁 | 統合 | `face:straight_nose`（通った鼻筋） | 既存の候補と同じ語・同じ意味（機械監査で一致） | 定 |
| `x_face_broad_nose` | 幅広の鼻 | 修正して採用 | `face:broad_nose`（幅広の鼻） | natural nasal width は描画に効かない説明語のため削除 | 定 |
| `x_face_rounded_nose_tip` | 丸みのある鼻先 | 採用 | `face:rounded_nose_tip`（丸みのある鼻先） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_face_subtly_bent_nose` | わずかに曲がった鼻筋 | 修正して採用 | `face:crooked_nose`（わずかに曲がった鼻筋） | subtle asymmetry は崩れとして描かれやすいので外し、重みを0.5に | 定 |
| `x_face_strong_brow_ridge` | 強い眉骨 | 統合 | `face:deep_set`（彫りの深い顔） | 既存「彫りの深い顔」が strong brow ridge を含む | 定 |
| `x_face_smooth_brow_line` | なだらかな眉骨 | 修正して採用 | `face:smooth_brow`（なだらかな眉骨） | forehead profile などの説明語を、smooth brow, soft forehead に | 定 |
| `x_face_thick_angled_eyebrows` | 太く角度のある眉 | 採用 | `face:angled_brows`（太く角度のある眉） | 既存の太眉（直線）と角度で描き分ける | ≈ 定 |
| `x_face_soft_straight_brows` | 柔らかい直線眉 | 採用 | `face:soft_straight_brows`（柔らかい直線眉） | 既存の太眉・低い直線眉と太さで描き分ける | ≈ 定 |
| `x_face_arched_brows` | 高めの弓形眉 | 統合 | `face:arched_brows`（細く整った眉） | 既存の同じID・同じ意味の候補（細く整った眉） | ≈ 定 |
| `x_face_wide_mouth` | 横幅のある口 | 修正して採用 | `face:wide_mouth`（横幅のある口） | broad smile line は表情と重なるため削除 | 定 |
| `x_face_bow_shaped_lips` | 弓形の唇 | 修正して採用 | `face:cupid_bow_lips`（弓形の唇） | 一般的な cupid's bow lips に | 定 |
| `x_face_full_lower_lip` | ふっくらした下唇 | 統合 | `face:full_lips`（色気のある厚めの唇） | 既存「色気のある厚めの唇」と画像上ほぼ区別できない | ≈ 定 |
| `x_face_rounded_chin` | 丸みのある顎先 | 採用 | `face:rounded_chin`（丸みのある顎先） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_face_prominent_chin` | 前に出た顎先 | 修正して採用 | `face:prominent_chin`（前に出た顎先） | defined chin projection は説明語のため削除 | 定 |

### eyeShape（16件 → `eyeShape`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_eyeShape_crow_feet_eyes` | 目尻の笑い皺 | 統合 | `ageCue:crows_feet`（浅い目尻の皺） | 年齢の表れ（ageCue）へ一本化。年齢層に応じた出やすさ・下限を一か所で管理するため。smiling eyes は既存「笑うと細くなる目」と重複 | =eyeShape:smiling_eyes |
| `x_eyeShape_deep_set_eyes` | 彫りの深い目 | 統合 | `eyeShape:deep_set_eyes`（彫りの深い目元） | 既存の同じID・同じ語 | =eyeShape:deep_set_eyes,face:deep_set ≈ |
| `x_eyeShape_hooded_eyelids` | 被さり気味のまぶた | 統合 | `eyeShape:hooded`（奥二重） | 既存「奥二重」（hooded eyes）と同じ | ≈ |
| `x_eyeShape_slightly_heavy_eyelids` | 少し重いまぶた | 統合 | `ageCue:heavy_eyelids`（少し重いまぶた） | 年齢の表れ（ageCue）へ一本化。年齢層に応じた出やすさ・下限を一か所で管理するため | ⇄ |
| `x_eyeShape_wide_set_eyes` | 離れ気味の目 | 採用 | `eyeShape:wide_set_eyes`（離れ気味の目） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_eyeShape_close_set_eyes` | 寄り気味の目 | 採用 | `eyeShape:close_set_eyes`（寄り気味の目） | 採用（重み0.6） |  |
| `x_eyeShape_downturned_outer_corners` | 目尻が下がった目 | 統合 | `eyeShape:tareme`（たれ目） | 既存「たれ目」と同じ |  |
| `x_eyeShape_upturned_outer_corners` | 目尻が上がった目 | 統合 | `eyeShape:tsurime`（つり目） | 既存「つり目」と同じ |  |
| `x_eyeShape_narrow_almond_eyes` | 細いアーモンド形の目 | 統合 | `eyeShape:almond`（アーモンド型） | 既存「アーモンド型」と画像上ほぼ区別できない | ≈ |
| `x_eyeShape_rounded_almond_eyes` | 丸みのあるアーモンド形 | 統合 | `eyeShape:almond`（アーモンド型） | 既存「アーモンド型」と画像上ほぼ区別できない | ≈ |
| `x_eyeShape_asymmetrical_eyelids` | 左右差のあるまぶた | 保留 | — | まぶたの左右差は崩れとして描かれやすい。美形方針を保てるか画像での確認が必要 |  |
| `x_eyeShape_lower_lid_fullness` | ふくらみのある下まぶた | 修正して採用 | `eyeShape:aegyo_sal`（涙袋） | 一般的な「涙袋（aegyo sal）」に。疲れた印象の目の下の陰とは分けた |  |
| `x_eyeShape_long_lashes_subtle` | 控えめな長い睫毛 | 統合 | `eyeShape:long_lashes`（長いまつ毛） | 既存「長いまつ毛」と同じ | ≈ |
| `x_eyeShape_short_lower_lashes` | 短い下睫毛 | 修正して採用 | `eyeShape:lower_lashes`（下まつ毛） | 「短い」は描き分けにくいので外し、既知の語 lower eyelashes（下まつ毛）に |  |
| `x_eyeShape_gentle_eye_bags` | 柔らかな目の下の陰 | 統合 | `ageCue:soft_eye_bags`（目の下の柔らかな膨らみ） | 年齢の表れ（ageCue）へ一本化。年齢層に応じた出やすさ・下限を一か所で管理するため |  |
| `x_eyeShape_under_eye_hollows` | 目の下のくぼみ | 統合 | `eyeShape:tired`（隈のある目） | 既存「隈のある目」と同じ方向 |  |

### feature（14件 → `marks`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_feature_subtle_crows_feet` | 控えめな目尻の小皺 | 統合 | `ageCue:crows_feet`（浅い目尻の皺） | 年齢の表れ（ageCue）へ一本化。年齢層に応じた出やすさ・下限を一か所で管理するため | ⇄ |
| `x_feature_fine_smile_lines` | 細い笑い皺 | 統合 | `ageCue:smile_lines`（薄い笑い皺） | 年齢の表れ（ageCue）へ一本化。年齢層に応じた出やすさ・下限を一か所で管理するため | ⇄ |
| `x_feature_temple_gray_streaks` | こめかみの白髪 | 統合 | `ageCue:gray_temples`（こめかみの白髪） | 年齢の表れ（ageCue）へ一本化。年齢層に応じた出やすさ・下限を一か所で管理するため | ⇄ |
| `x_feature_forehead_expression_lines` | 額の表情皺 | 統合 | `ageCue:forehead_lines`（額の細い皺） | 年齢の表れ（ageCue）へ一本化。年齢層に応じた出やすさ・下限を一か所で管理するため |  |
| `x_feature_glabella_lines_subtle` | 眉間のうっすらした皺 | 統合 | `ageCue:forehead_lines`（額の細い皺） | 年齢の表れ（ageCue）へ一本化。年齢層に応じた出やすさ・下限を一か所で管理するため。glabellar は医療の専門語のため額の皺にまとめた |  |
| `x_feature_weathered_skin_texture` | 風雨を経た肌理 | 統合 | `ageCue:weathered_features`（風雪を経た品格） | 年齢の表れ（ageCue）へ一本化。年齢層に応じた出やすさ・下限を一か所で管理するため |  |
| `x_feature_mature_skin_pores` | 自然な成熟肌の肌理 | 統合 | `ageCue:mature_skin`（成熟した肌の質感） | 年齢の表れ（ageCue）へ一本化。年齢層に応じた出やすさ・下限を一か所で管理するため。pores は肌荒れとして描かれやすいので外した |  |
| `x_feature_light_freckling` | 薄いそばかす | 統合 | `marks:freckles`（そばかす） | 既存「そばかす」と同じ |  |
| `x_feature_faint_acne_scars` | 淡いニキビ跡 | 保留 | — | ニキビ跡として崩れて描かれる恐れがあり、美形方針を保てるか画像での確認が必要 |  |
| `x_feature_healed_cheek_scar` | 治癒した頬の傷跡 | 統合 | `marks:scar_cheek`（頬の古傷） | 既存「頬の古傷」と同じ | ≈ |
| `x_feature_subtle_facial_asymmetry` | 微細な顔の左右差 | 保留 | — | 顔の左右差は崩れとして描かれやすい。画像での確認が必要 |  |
| `x_feature_faint_sunspots` | 日差しによる薄い色斑 | 不採用 | — | sunspots は天体の黒点と紛れ、肌の表現として不明瞭。既存のそばかすで足りる |  |
| `x_feature_smile_dimple` | 笑うとできるえくぼ | 統合 | `face:dimples`（えくぼ） | 既存の顔立ち「えくぼ」と同じ |  |
| `x_feature_beauty_mark_by_lip` | 口元の泣きぼくろ | 統合 | `marks:mole_mouth`（口元のほくろ） | 既存「口元のほくろ」と同じ |  |

### beard（8件 → `facialHair`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_beard_salt_pepper_stubble` | 白黒混じりの無精ひげ | 修正して採用 | `facialHair:salt_pepper_stubble`（白黒まじりの無精ひげ） | 白髪まじりなので35歳以上を hard 条件 |  |
| `x_beard_trimmed_salt_pepper_beard` | 整えた白黒混じりの短いひげ | 修正して採用 | `facialHair:salt_pepper_beard`（整えた白黒まじりのひげ） | 白髪まじりなので35歳以上を hard 条件 |  |
| `x_beard_neat_goatee` | 整った山羊ひげ | 統合 | `facialHair:goatee`（顎先のひげ） | 既存「顎先のひげ」と同じ | ≈ |
| `x_beard_short_boxed_beard` | 輪郭を整えた短いひげ | 統合 | `facialHair:short_beard`（短く整えた顎ひげ） | 既存「短く整えた顎ひげ」と画像上ほぼ区別できない | ≈ |
| `x_beard_fine_mustache` | 細い口ひげ | 統合 | `facialHair:pencil_mustache`（ペンシル型の口ひげ） | 細い口ひげはペンシル型と同じ |  |
| `x_beard_pencil_mustache` | ペンシル型の口ひげ | 採用 | `facialHair:pencil_mustache`（ペンシル型の口ひげ） | 語句をそのまま採用（自然文を書き直し） | ≈ |
| `x_beard_silver_sideburns` | 銀混じりのもみあげ | 修正して採用 | `facialHair:graying_sideburns`（白髪まじりのもみあげ） | 白髪まじりなので35歳以上を hard 条件。silver を graying に | ≈ |
| `x_beard_sparse_chin_stubble` | まばらな顎の剃り残し | 統合 | `facialHair:stubble`（無精ひげ） | 既存「無精ひげ」と同じ |  |

### build（12件 → `build`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_build_stocky` | がっしりした中背 | 採用 | `build:stocky`（がっしりした中背） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_build_wiry` | 細く硬い筋肉 | 採用 | `build:wiry`（細く硬い筋肉） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_build_lean_tall` | すらりとした長身 | 統合 | `build:tall_slim`（長身細身） | 既存「長身細身」と同じ |  |
| `x_build_broad_shoulders_narrow_waist` | 肩幅が広い逆三角体型 | 採用 | `build:v_taper`（肩幅の広い逆三角体型） | 既存の筋肉質系（broad shoulders を含む）と、腰の細さで描き分ける | =build:athletic,build:muscular |
| `x_build_compact_athletic` | 小柄で引き締まった体 | 採用 | `build:compact_athletic`（小柄で引き締まった体） | 語句をそのまま採用（自然文を書き直し） | ≈ |
| `x_build_long_limbed` | 手足の長い骨格 | 統合 | `build:tall_slim`（長身細身） | 既存「長身細身」（long legs）と同じ方向 |  |
| `x_build_barrel_chested` | 厚い胸郭 | 修正して採用 | `build:barrel_chest`（厚い胸板） | substantial ribcage を broad chest に |  |
| `x_build_thick_neck` | 太く力強い首 | 統合 | `build:muscular`（筋肉質） | 体の一部分で、体格の単一選択と競合する。筋肉質に含まれる |  |
| `x_build_sloped_shoulders` | なだらかな肩 | 修正して採用 | `build:sloped_shoulders`（なで肩の細身） | 肩だけでは体格を成さないので slender build を補った |  |
| `x_build_sturdy_lower_body` | 下半身がどっしりした体型 | 統合 | `build:stocky`（がっしりした中背） | 下半身は多くの画角で写らないため、がっしりした中背にまとめた |  |
| `x_build_slender_boned` | 華奢な骨格 | 統合 | `build:delicate`（華奢） | 既存「華奢」と同じ |  |
| `x_build_soft_heavyset` | 柔らかく豊かな体格 | 採用 | `build:soft_heavyset`（ふくよかで柔らかな体格） | 採用（重み0.4） |  |

### hairStyle（26件 → `hairStyle`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_hairStyle_ivy_league_cut` | アイビーリーグカット | 採用 | `hairStyle:ivy_league`（アイビーリーグカット） | 採用（ベリーショート・ショート。前髪まで決まる髪型） | 定 |
| `x_hairStyle_french_crop` | フレンチクロップ | 修正して採用 | `hairStyle:french_crop`（フレンチクロップ） | 前髪の型を示す short fringe を補った | ≈ 定 |
| `x_hairStyle_caesar_cut` | シーザーカット | 採用 | `hairStyle:caesar_cut`（シーザーカット） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairStyle_short_quiff` | 短いクイッフ | 統合 | `hairStyle:quiff`（クイッフ） | 既存の候補と同じ語・同じ意味（機械監査で一致） | 定 |
| `x_hairStyle_modern_pompadour` | モダンポンパドール | 統合 | `hairStyle:pompadour`（ポンパドール） | 既存の候補と同じ語・同じ意味（機械監査で一致） | ≈ 定 |
| `x_hairStyle_comma_hair` | コンマヘア | 統合 | `hairStyle:comma_bangs`（カンマヘア） | 既存「カンマヘア」と同じ | 定 |
| `x_hairStyle_curtain_bangs` | センターパートのカーテン前髪 | 統合 | `hairStyle:curtain_bangs`（カーテンバング） | 既存の同じID・同じ語 | =hairStyle:center_part_short,hairStyle:curtain_bangs ≈ ⇄ 定 |
| `x_hairStyle_bro_flow` | 自然なブローフロー | 統合 | `hairStyle:swept_back_waves`（流し上げたウェーブ） | bro flow は画像生成の既知の語ではない。流し上げたウェーブにまとめた | 定 |
| `x_hairStyle_shag_cut` | レイヤーの入ったシャグ | 統合 | `hairStyle:shaggy`（シャギー） | 既存「シャギー」と同じ | 定 |
| `x_hairStyle_modern_mullet` | 控えめなモダンマレット | 統合 | `hairStyle:mullet`（マレット） | 既存「マレット」と同じ | 定 |
| `x_hairStyle_curly_crop` | 短いカーリークロップ | 統合 | `hairStyle:curly_short`（癖毛の短髪） | 既存「癖毛の短髪」と画像上ほぼ同じ。巻きの強さは髪質の項目で変えられる | ≈ 定 |
| `x_hairStyle_wavy_shoulder` | 肩丈のウェーブ | 統合 | `hairStyle:wavy_medium`（ウェーブのミディアム） | 既存「ウェーブのミディアム」と同じ | 定 |
| `x_hairStyle_half_up_bun` | ハーフアップのお団子 | 採用 | `hairStyle:half_up_bun`（ハーフアップのお団子） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairStyle_undercut_ponytail` | アンダーカットの一つ結び | 採用 | `hairStyle:undercut_ponytail`（アンダーカットの一つ結び） | 採用（タグを undercut, ponytail に分けた） | 定 |
| `x_hairStyle_coiled_short_hair` | 短いコイル状の髪 | 採用 | `hairStyle:short_coils`（短いコイルヘア） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairStyle_locs_tied_back` | 後ろでまとめたロックス | 修正して採用 | `hairStyle:locs_tied_back`（後ろでまとめたロックス） | 既知の語 dreadlocks, tied back に | 定 |
| `x_hairStyle_slick_side_part` | 艶のあるサイドパート | 統合 | `hairStyle:side_part`（七三分け） | 既存「七三分け」と同じ。艶は髪質の項目で変えられる | ≈ 定 |
| `x_hairStyle_textured_crew_cut` | 質感のあるクルーカット | 統合 | `hairStyle:crew_cut`（クルーカット） | 既存「クルーカット」と同じ | ≈ 定 |
| `x_hairStyle_tapered_afro` | テーパードアフロ | 修正して採用 | `hairStyle:tapered_afro`（テーパードアフロ） | 既知の語 short afro, tapered sides に | 定 |
| `x_hairStyle_swept_back_wave` | 流し上げた波打つ髪 | 採用 | `hairStyle:swept_back_waves`（流し上げたウェーブ） | 採用（bro flow を統合） | 定 |
| `x_hairStyle_low_messy_bun` | 低い位置の無造作お団子 | 採用 | `hairStyle:low_messy_bun`（低い位置の無造作お団子） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairStyle_middle_part_tucked` | 耳に掛けるセンターパート | 統合 | `hairStyle:tucked`（耳かけ） | 既存「耳かけ」と同じ。中央分けは前髪・分け目の項目で指定できる | ≈ 定 |
| `x_hairStyle_layered_wolf_cut` | レイヤーのウルフカット | 統合 | `hairStyle:wolf_cut`（ウルフカット） | 既存の候補と同じ語・同じ意味（機械監査で一致） | ≈ 定 |
| `x_hairStyle_disconnected_undercut` | 段差のあるアンダーカット | 統合 | `hairStyle:fade_undercut`（フェードのアンダーカット） | 既存「フェードのアンダーカット」と画像上ほぼ同じ | 定 |
| `x_hairStyle_collar_length_curls` | 襟足までの巻き髪 | 採用 | `hairStyle:collar_curls`（襟足までの巻き髪） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairStyle_thinning_hair_swept_back` | 薄毛を整えたオールバック | 統合 | `ageCue:thinning_hair`（薄くなり始めた頭髪） | 年齢の表れ（ageCue）へ一本化。年齢層に応じた出やすさ・下限を一か所で管理するため。髪型として置くと若い年齢層でも出てしまう | 定 |

### expression（16件 → `expression`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_expression_quiet_pride` | 控えめな誇り | 採用 | `expression:quiet_pride`（控えめな誇り） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_expression_restrained_grief` | こらえた悲しみ | 修正して採用 | `expression:restrained_grief`（こらえた悲しみ） | tightened lips を pressed lips に |  |
| `x_expression_sardonic_half_smile` | 皮肉げな片笑み | 統合 | `expression:smirk`（不敵な笑み） | 既存「不敵な笑み」と画像上ほぼ同じ | ≈ |
| `x_expression_sleepy_half_lidded` | 眠たげな半眼 | 統合 | `expression:sleepy`（眠たげ） | 既存「眠たげ」と同じ |  |
| `x_expression_appraising_glance` | 値踏みする視線 | 修正して採用 | `expression:appraising`（値踏みする目つき） | 抽象語 appraising expression に、見える語（slightly narrowed eyes）を足した |  |
| `x_expression_soft_concern` | 柔らかな気遣い | 修正して採用 | `expression:soft_concern`（柔らかな気遣い） | gentle concerned expression, soft eyes に |  |
| `x_expression_earnest_attention` | 真摯に聞き入る顔 | 修正して採用 | `expression:attentive`（真摯に聞き入る顔） | attentive expression, listening に |  |
| `x_expression_embarrassed_downlook` | 照れ隠しの伏し目 | 採用 | `expression:shy_downcast`（照れ隠しの伏し目） | 採用（目を逸らす表情として、こちらを見るポーズ・視線と組まない） |  |
| `x_expression_quiet_resolve` | 静かな決意 | 統合 | `expression:determined`（決意を秘めた表情） | 既存「決意を秘めた表情」と同じ |  |
| `x_expression_relieved_exhale` | 安堵して息を吐く | 統合 | `expression:relieved`（安堵した笑み） | 既存「安堵した笑み」と同じ |  |
| `x_expression_disbelieving_brow` | 信じられないという眉 | 修正して採用 | `expression:skeptical`（疑わしげな片眉） | skeptical expression, raised eyebrow に | ≈ |
| `x_expression_bittersweet_smile` | ほろ苦い微笑み | 統合 | `expression:sad_smile`（寂しげな微笑み） | 既存「寂しげな微笑み」と画像上ほぼ同じ |  |
| `x_expression_focused_squint` | 作業に集中した細目 | 採用 | `expression:focused_squint`（作業に集中した目） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_expression_affectionate_side_glance` | 親しげな横目 | 修正して採用 | `expression:fond_side_glance`（親しげな横目） | fond smile, sideways glance に（目を逸らす表情として扱う） |  |
| `x_expression_weary_tenderness` | 疲れと優しさの混じる表情 | 修正して採用 | `expression:weary_tender`（疲れと優しさの混じる顔） | tired but tender smile に |  |
| `x_expression_suppressed_laughter` | 笑いをこらえる顔 | 修正して採用 | `expression:suppressed_laugh`（笑いをこらえる顔） | suppressing a laugh, restrained grin に |  |

### vibe（10件 → `aura`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_vibe_artisan_confidence` | 職人の自信 | 修正して採用 | `aura:artisan_pride`（職人の誇り） | 日本語名を「職人の誇り」に。出力は先頭の語だけ（雰囲気の既存の仕様）なので grounded composure を先頭に | C |
| `x_vibe_world_weary` | 世慣れた哀愁 | 採用 | `aura:world_weary`（世慣れた哀愁） | 語句をそのまま採用（自然文を書き直し） | C |
| `x_vibe_sunlit_optimism` | 陽だまりの楽天性 | 統合 | `aura:sunny`（陽気） | 既存「陽気」と同じ方向 | C |
| `x_vibe_diplomatic_gravity` | 外交官の重み | 統合 | `aura:regal`（威厳） | 既存「威厳」と同じ方向 | C |
| `x_vibe_understated_luxury` | 控えめな高級感 | 修正して採用 | `aura:understated_luxury`（控えめな上質さ） | understated elegance, quiet luxury に | C |
| `x_vibe_intellectual_solitude` | 知的な孤独 | 統合 | `aura:aloof`（孤高） | 既存「孤高」と同じ方向 | C |
| `x_vibe_weathered_dignity` | 風雪を経た気品 | 採用 | `aura:weathered_dignity`（風雪を経た気品） | 語句をそのまま採用（自然文を書き直し） | ⇄ C |
| `x_vibe_urban_ease` | 都会的な自然体 | 統合 | `aura:sophisticated`（洗練） | 既存「洗練」と同じ方向 | C |
| `x_vibe_old_world_courtesy` | 古風な礼節 | 統合 | `aura:noble`（気品） | 既存「気品」と同じ方向 | C |
| `x_vibe_playful_irony` | いたずらな皮肉 | 統合 | `aura:playful`（飄々） | 既存「飄々」と同じ方向 | C |

### world（16件 → `world`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_world_contemporary_korean_city` | 現代韓国風の都市 | 修正して採用 | `world:korean_city`（現代韓国風の都市） | 英語を modern korean-inspired city に（文化モチーフ「韓」の舞台） | 定 |
| `x_world_south_asian_metropolis` | 南アジア風の大都市 | 採用 | `world:south_asian_metropolis`（南アジア風の大都市） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_world_southeast_asian_port` | 東南アジア風の港湾都市 | 採用 | `world:southeast_asian_port`（東南アジア風の港町） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_world_central_asian_steppe` | 中央アジア風の草原世界 | 採用 | `world:central_asian_steppe`（中央アジア風の草原） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_world_silk_road_trade_city` | シルクロード風の交易都市 | 採用 | `world:silk_road_city`（シルクロード風の交易都市） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_world_west_african_fantasy_city` | 西アフリカ意匠の幻想都市 | 採用 | `world:west_african_city`（西アフリカ風の幻想都市） | 採用（架空の都市として。特定の民族とは結び付けない） | 定 |
| `x_world_east_african_coast` | 東アフリカ風の沿岸交易都市 | 採用 | `world:east_african_coast`（東アフリカ風の沿岸交易都市） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_world_andean_highland` | アンデス風の高地幻想 | 修正して採用 | `world:andean_highland`（アンデス風の高地） | fantasy を外し andean-inspired highlands に | 定 |
| `x_world_mesoamerican_mythic_city` | メソアメリカ風の神話都市 | 採用 | `world:mesoamerican_city`（メソアメリカ風の神話都市） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_world_medieval_european_city` | 中世ヨーロッパの都市 | 採用 | `world:medieval_city`（中世ヨーロッパの街） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_world_renaissance_court` | ルネサンス宮廷 | 採用 | `world:renaissance_court`（ルネサンス宮廷） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_world_belle_epoque` | ベル・エポックの街 | 修正して採用 | `world:belle_epoque`（ベル・エポックの街） | アクセント記号のない belle epoque city に（トークンの揺れを避ける） | 定 |
| `x_world_art_nouveau` | アール・ヌーヴォーの都市 | 採用 | `world:art_nouveau`（アール・ヌーヴォーの都市） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_world_dieselpunk` | ディーゼルパンク | 採用 | `world:dieselpunk`（ディーゼルパンク） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_world_solarpunk` | ソーラーパンク | 採用 | `world:solarpunk`（ソーラーパンク） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_world_oceanic_future` | 海洋・深海SF | 採用 | `world:deep_sea_future`（海洋・深海SF） | 語句をそのまま採用（自然文を書き直し） | ≈ 定 |

### occupation（24件 → `occupation`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_occupation_architect` | 建築家 | 採用 | `occupation:architect`（建築家） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_carpenter` | 木工職人 | 採用 | `occupation:carpenter`（木工職人） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_chef` | 料理人 | 統合 | `occupation:chef`（シェフ） | 既存の同じID（シェフ） | ≈ 定 |
| `x_occupation_baker` | パン職人 | 採用 | `occupation:baker`（パン職人） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_photographer` | 写真家 | 統合 | `occupation:photographer`（写真家） | 既存の候補と同じ語・同じ意味（機械監査で一致） | =occupation:photographer ≈ 定 |
| `x_occupation_curator` | 学芸員 | 採用 | `occupation:curator`（学芸員） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_barber` | 理髪師 | 採用 | `occupation:barber`（理髪師） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_tailor` | 仕立て屋 | 統合 | `occupation:tailor`（仕立て屋） | 既存の候補と同じ語・同じ意味（機械監査で一致） | =occupation:tailor ≈ 定 |
| `x_occupation_jeweler` | 宝飾職人 | 採用 | `occupation:jeweler`（宝飾職人） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_potter` | 陶芸家 | 採用 | `occupation:potter`（陶芸家） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_fisherman` | 漁師 | 採用 | `occupation:fisherman`（漁師） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_vineyard_keeper` | 葡萄農園主 | 採用 | `occupation:vineyard_keeper`（葡萄農園主） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_journalist` | 記者 | 採用 | `occupation:journalist`（記者） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_editor` | 編集者 | 採用 | `occupation:editor`（編集者） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_translator` | 翻訳家 | 採用 | `occupation:translator`（翻訳家） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_diplomat` | 外交官 | 採用 | `occupation:diplomat`（外交官） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_firefighter` | 消防士 | 統合 | `occupation:firefighter`（消防士） | 既存の候補と同じ語・同じ意味（機械監査で一致） | =occupation:firefighter ≈ 定 |
| `x_occupation_paramedic` | 救急救命士 | 保留 | — | 救急隊の制服が衣装の辞書になく、職業名は画像に出力しないため描き分けられない。制服と合わせて追加する | 定 |
| `x_occupation_mechanic` | 整備士 | 採用 | `occupation:mechanic`（整備士） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_pilot` | 操縦士 | 統合 | `occupation:pilot`（パイロット） | 既存の候補と同じ語・同じ意味（機械監査で一致） | =occupation:pilot ≈ 定 |
| `x_occupation_ship_captain` | 船長 | 統合 | `occupation:sea_captain`（船長） | 既存「船長」と同じ | 定 |
| `x_occupation_mountain_guide` | 山岳ガイド | 採用 | `occupation:mountain_guide`（山岳ガイド） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_falconer` | 鷹匠 | 採用 | `occupation:falconer`（鷹匠） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_occupation_botanist` | 植物学者 | 採用 | `occupation:botanist`（植物学者） | 語句をそのまま採用（自然文を書き直し） | 定 |

### outfit（28件 → `outfit`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_outfit_workwear_chore` | チョアジャケットのワークウェア | 採用 | `outfit:chore_workwear`（チョアジャケットのワークウェア） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_outfit_fine_knit_polo` | 上質なニットポロ | 採用 | `outfit:knit_polo`（上質なニットポロ） | 語句をそのまま採用（自然文を書き直し） | =outfit:three_piece |
| `x_outfit_minimalist_architect` | 建築家風ミニマル服 | 修正して採用 | `outfit:minimal_blazer`（ミニマルなジャケットの装い） | 職業に縛らない名前「ミニマルなジャケットの装い」に |  |
| `x_outfit_relaxed_three_piece` | くつろいだ三つ揃いスーツ | 修正して採用 | `outfit:open_three_piece`（ノーネクタイの三つ揃い） | 既存のスリーピース（ネクタイあり）と分けるため、ノーネクタイの開襟として定義 | =outfit:open_collar_suit,outfit:linen_shirt,outfit:loose_kimono |
| `x_outfit_linen_overshirt` | リネンのオーバーシャツ | 統合 | `outfit:linen_shirt`（リネンシャツ） | 既存「リネンシャツ」と画像上ほぼ同じ |  |
| `x_outfit_vintage_barber_vest` | 理髪師のクラシックベスト | 統合 | `outfit:waistcoat_shirt`（ベストとシャツ） | 既存「ベストとシャツ」（袖をまくったシャツにベスト）と同じ | ⇄ |
| `x_outfit_modern_utility_vest` | 都会派ユーティリティベスト | 採用 | `outfit:utility_vest`（都会派ユーティリティベスト） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_outfit_long_wool_overcoat` | 長いウールコート | 採用 | `outfit:wool_overcoat_scarf`（長いウールコートとマフラー） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_outfit_tweed_sports_coat` | ツイードのスポーツコート | 採用 | `outfit:tweed_sports_coat`（ツイードのジャケット） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_outfit_soft_cardigan` | 柔らかなカーディガン | 統合 | `outfit:cardigan`（カーディガンとシャツ） | 既存「カーディガンとシャツ」と同じ | ≈ |
| `x_outfit_work_apron_canvas` | 厚手エプロンと作業服 | 採用 | `outfit:canvas_apron`（厚手のエプロンと作業着） | 語句をそのまま採用（自然文を書き直し） | ⇄ |
| `x_outfit_rolled_sleeve_oxford` | 袖をまくったオックスフォードシャツ | 統合 | `outfit:white_shirt`（白シャツとスラックス） | 既存「白シャツとスラックス」（袖をまくる）と同じ | =outfit:waistcoat_shirt ≈ |
| `x_outfit_bespoke_double_breasted` | 仕立てのよいダブルスーツ | 統合 | `outfit:double_breasted`（ダブルのスーツ） | 既存「ダブルのスーツ」と同じ |  |
| `x_outfit_bandhgala_inspired` | バンドガラ風の礼装 | 修正して採用 | `outfit:bandhgala`（バンドガラ） | 南アジアの伝統的な仕立てとして文化モチーフ（南アジア）を設定（他の文化モチーフとは組まない） |  |
| `x_outfit_lightweight_tunic` | 軽やかなロングチュニック | 統合 | `outfit:kurta`（クルタ） | 既存「クルタ」と同じ方向 | =outfit:desert_prince,outfit:persian_prince,outfit:burnous,outfit:dancer |
| `x_outfit_embroidered_trade_coat` | 刺繍入りの交易商コート | 統合 | `outfit:silk_road`（シルクロードの旅装） | 既存「シルクロードの旅装」と同じ |  |
| `x_outfit_steppe_riding_coat` | 草原の乗馬コート | 統合 | `outfit:mongol_deel`（デール（草原の装束）） | 既存「デール（草原の装束）」と同じ |  |
| `x_outfit_woven_coastal_cloak` | 沿岸都市の織りマント | 採用 | `outfit:woven_coastal_cloak`（織りのマントと重ねたチュニック） | 採用（架空の沿岸都市の装いとして。特定の民族衣装とはしない） |  |
| `x_outfit_andes_wool_layers` | 高地のウール重ね着 | 統合 | `outfit:andean_poncho`（アンデスのポンチョ） | 既存「アンデスのポンチョ」と同じ |  |
| `x_outfit_renaissance_doublet` | ルネサンスのダブレット | 採用 | `outfit:renaissance_doublet`（ルネサンスのダブレット） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_outfit_belle_epoque_suit` | ベル・エポックのスーツ | 採用 | `outfit:belle_epoque_suit`（ベル・エポックのスーツ） | 語句をそのまま採用（自然文を書き直し） | =outfit:three_piece,outfit:rococo,outfit:regency,outfit:victorian_frock,outfit:ringleader |
| `x_outfit_art_nouveau_formal` | 曲線意匠の礼服 | 採用 | `outfit:art_nouveau_formal`（曲線意匠の礼服） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_outfit_dieselpunk_flight` | ディーゼルパンクの飛行服 | 修正して採用 | `outfit:dieselpunk_flight`（ディーゼルパンクの飛行服） | 既存「フライトジャケット」と分けるため brass buckles を足した | ≈ |
| `x_outfit_solarpunk_utility` | ソーラーパンクの作業服 | 採用 | `outfit:solarpunk_utility`（ソーラーパンクの作業服） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_outfit_oceanic_expedition` | 深海探査隊の制服 | 採用 | `outfit:deep_sea_suit`（深海探査隊の制服） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_outfit_orbital_diplomat_uniform` | 軌道都市の外交官礼装 | 採用 | `outfit:orbital_diplomat`（軌道都市の外交官礼装） | 語句をそのまま採用（自然文を書き直し） |  |
| `x_outfit_relaxed_mature_resort` | 大人の上品なリゾート服 | 統合 | `outfit:linen_shirt`（リネンシャツ） | 既存「リネンシャツ」と同じ方向 | =outfit:linen_shirt |
| `x_outfit_ceremonial_guard` | 宮廷の儀仗官制服 | 統合 | `outfit:military_dress`（軍の礼装） | 既存「軍の礼装」と同じ方向 |  |

### pose（24件 → `pose`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_pose_eyes_only_side` | 顔は正面・目だけ横へ | 統合 | `gaze:side`（横へ視線を流す） | 体の動きではなく視線なので、新しい「視線」の項目へ | ≈ 定 |
| `x_pose_seated_forward_elbows` | 前傾して肘を膝へ | 採用 | `pose:seated_elbows_on_knees`（前傾して肘を膝に） | 採用（膝上以上の画角） | =pose:leaning_forward,pose:sitting_chair,pose:crossed_legs,pose:chin_on_hand_table,pose:meditating,pose:bound_chair 定 |
| `x_pose_arms_folded_looking_away` | 腕組みで視線を外す | 採用 | `pose:arms_crossed_look_away`（腕組みで視線を外す） | 採用（こちらを見る視線とは組まない） | =expression:flustered,expression:wistful,pose:hand_on_neck ≈ 定 |
| `x_pose_lean_wall_profile` | 壁にもたれる横顔 | 修正して採用 | `pose:wall_lean_profile`（壁にもたれる横顔） | side profile を profile に。合う視線・頭の向きだけに限定 | =pose:leaning_wall ≈ 定 |
| `x_pose_hand_in_pocket_backward` | 片手をポケットに入れ振り向く | 採用 | `pose:pocket_look_back`（片手をポケットに振り向く） | 語句をそのまま採用（自然文を書き直し） | ≈ ⇄ 定 |
| `x_pose_reading_while_seated` | 座って読書に没頭 | 修正して採用 | `pose:reading_seated`（座って読書に没頭） | 本を持ち物の条件（hard）に | ⇄ 定 |
| `x_pose_adjusting_cuff` | 袖口を整える | 統合 | `pose:adjust_cuffs`（袖口を整える） | 既存「袖口を整える」と同じ | ≈ 定 |
| `x_pose_hands_behind_back` | 後ろで手を組んで立つ | 統合 | `pose:hands_behind_back`（後ろ手に組む） | 既存の同じID | =pose:standing_relaxed,pose:three_quarter,pose:hand_in_pocket,pose:hands_in_pockets,pose:hands_behind_back,pose:wind_coat,pose:bound_front_stand,pose:bound_overhead_stand,pose:chain_torso_stand ≈ 定 |
| `x_pose_resting_chin_in_hand` | 頬杖をついて考える | 統合 | `pose:chin_on_hand_table`（卓に頬杖） | 既存「卓に頬杖」と同じ | ⇄ 定 |
| `x_pose_looking_out_window` | 窓外に視線を向ける | 採用 | `pose:gazing_out_window`（窓の外を眺める） | 語句をそのまま採用（自然文を書き直し） | =pose:sitting_window ≈ 定 |
| `x_pose_seated_sideways_chair` | 椅子へ横向きに座る | 採用 | `pose:sideways_on_chair`（椅子に横向きに座る） | 語句をそのまま採用（自然文を書き直し） | ≈ 定 |
| `x_pose_slight_head_bow` | 軽く会釈する | 統合 | `headPose:head_bowed`（軽くうつむく） | 体の動きではなく頭の向きなので、新しい「頭の向き」の項目へ | 定 |
| `x_pose_turning_page` | ページをめくる | 統合 | `pose:reading_seated`（座って読書に没頭） | 座って読むポーズと同じ（本が必要） | ⇄ 定 |
| `x_pose_checking_wristwatch` | 腕時計を確認する | 採用 | `pose:checking_watch`（腕時計を確かめる） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_pose_hand_brushing_hair` | 髪をかき上げる | 統合 | `pose:hair_brush`（髪をかき上げる） | 既存「髪をかき上げる」と同じ | 定 |
| `x_pose_coat_over_shoulder` | 上着を肩に掛ける | 採用 | `pose:jacket_over_shoulder`（上着を肩に掛ける） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_pose_walking_mid_stride` | 歩く途中の一瞬 | 統合 | `pose:walking`（歩いてくる） | 既存「歩いてくる」と同じ | 定 |
| `x_pose_kneeling_work` | 片膝をついて作業 | 採用 | `pose:kneeling_work`（片膝をついて作業する） | 語句をそのまま採用（自然文を書き直し） | =pose:kneel_one_knee,pose:kneel_offer ≈ 定 |
| `x_pose_sleeves_rolled_work` | 袖をまくって作業する | 修正して採用 | `pose:rolling_sleeves`（袖をまくる） | 動作として rolling up sleeves に。袖のない服とは組まない（hard） | 定 |
| `x_pose_leaning_balustrade` | 手すりに寄りかかる | 統合 | `pose:leaning_railing`（手すりにもたれる） | 既存「手すりにもたれる」と同じ | =pose:leaning_railing ≈ 定 |
| `x_pose_looking_down_at_table` | 机上を覗き込む | 採用 | `pose:leaning_over_table`（机上を覗き込む） | 語句をそのまま採用（自然文を書き直し） | ⇄ 定 |
| `x_pose_gentle_wave` | 控えめに手を振る | 統合 | `pose:waving`（手を振る） | 既存「手を振る」と同じ | 定 |
| `x_pose_hands_in_coat_pockets` | コートの両ポケットに手 | 統合 | `pose:hands_in_pockets`（両手をポケットに） | 既存「両手をポケットに」と同じ | ≈ 定 |
| `x_pose_half_turn_distant_gaze` | 体を半回転して遠くを見る | 統合 | `gaze:afar`（遠くを見る） | 遠くを見る視線は新しい「視線」の項目へ（体の向きは既存の斜めの立ち姿など） | 定 |

### prop（14件 → `prop`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_prop_architect_blueprints` | 建築図面 | 採用 | `prop:blueprints`（建築図面） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_prop_folding_ruler` | 折尺 | 採用 | `prop:folding_ruler`（折尺） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_prop_vintage_camera` | クラシックカメラ | 採用 | `prop:vintage_camera`（クラシックカメラ） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_prop_sketchbook` | スケッチブック | 採用 | `prop:sketchbook`（スケッチブック） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_prop_botanical_specimen` | 植物標本 | 採用 | `prop:plant_specimen`（植物標本） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_prop_leather_tool_roll` | 革製工具巻き | 採用 | `prop:tool_roll`（革の工具巻き） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_prop_ceramic_cup` | 陶器のカップ | 統合 | `prop:tea_bowl`（茶碗） | 既存のカップ類（茶碗）と同じ | 定 |
| `x_prop_silver_pocket_watch` | 銀の懐中時計 | 統合 | `prop:pocket_watch`（懐中時計） | 既存「懐中時計」と同じ | ≈ 定 |
| `x_prop_jazz_saxophone` | サックス | 採用 | `prop:saxophone`（サックス） | 採用（楽器として「楽器を奏でる」ポーズと組める） | 定 |
| `x_prop_falconry_glove` | 鷹匠用の革手袋 | 修正して採用 | `prop:falcon_glove`（鷹を乗せた革手袋） | 手袋だけでは描かれにくいので、鷹を乗せた革手袋に | 定 |
| `x_prop_field_binoculars` | 双眼鏡 | 採用 | `prop:binoculars`（双眼鏡） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_prop_old_map` | 古い地図 | 採用 | `prop:old_map`（古い地図） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_prop_fountain_pen` | 万年筆 | 採用 | `prop:fountain_pen`（万年筆） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_prop_sea_navigation_chart` | 海図 | 統合 | `prop:old_map`（古い地図） | 古い地図と画像上ほぼ同じ | 定 |

### scene（22件 → `scene`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_scene_architecture_studio` | 建築設計事務所 | 採用 | `scene:architecture_studio`（建築設計事務所） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_carpenter_workshop` | 木工房 | 採用 | `scene:woodworking_shop`（木工房） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_old_barbershop` | 古い理髪店 | 採用 | `scene:barbershop`（古い理髪店） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_museum_gallery` | 静かな美術館 | 採用 | `scene:museum_gallery`（静かな美術館） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_editorial_office` | 出版社の編集室 | 採用 | `scene:editorial_office`（出版社の編集室） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_vinery_morning` | 朝の葡萄農園 | 修正して採用 | `scene:vineyard`（葡萄農園） | early morning は時間の項目に任せ、背景から外した | 定 |
| `x_scene_jazz_club_corner` | 薄暗いジャズクラブ | 採用 | `scene:jazz_club`（薄暗いジャズクラブ） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_rainy_detective_office` | 雨の日の探偵事務所 | 修正して採用 | `scene:detective_office_rain`（雨の日の探偵事務所） | 屋内に雨を降らせないよう、雨は窓の語（rain on window）として背景に入れた | 定 |
| `x_scene_steppe_camp` | 草原の野営地 | 修正して採用 | `scene:steppe_camp`（草原の野営地） | felt tent を既知の語 yurt に | 定 |
| `x_scene_silk_road_inn` | 隊商宿 | 採用 | `scene:caravanserai`（隊商宿の中庭） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_south_asian_civic_hall` | 南アジア風の市庁舎 | 採用 | `scene:civic_hall_south_asia`（南アジア風の市庁舎） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_southeast_asian_wharf` | 東南アジア風の埠頭 | 採用 | `scene:tropical_wharf`（南国の港の埠頭） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_west_african_courtyard` | 西アフリカ意匠の中庭 | 採用 | `scene:west_african_courtyard`（西アフリカ意匠の中庭） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_andean_mountain_path` | アンデス風の高地道 | 採用 | `scene:andean_path`（高地の山道） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_renaissance_workshop` | ルネサンス工房 | 採用 | `scene:renaissance_workshop`（ルネサンスの工房） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_art_nouveau_atrium` | アール・ヌーヴォーの吹抜け | 修正して採用 | `scene:art_nouveau_atrium`（アール・ヌーヴォーの吹き抜け） | stained glass は既存「大聖堂」と重なるため、ironwork・glass ceiling に | =scene:cathedral 定 |
| `x_scene_belle_epoque_studio` | ベル・エポックの写真館 | 採用 | `scene:belle_epoque_studio`（ベル・エポックの写真館） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_dieselpunk_hangar` | ディーゼルパンク格納庫 | 採用 | `scene:airship_hangar`（飛行船の格納庫） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_solarpunk_greenhouse` | ソーラーパンクの温室 | 採用 | `scene:solarpunk_greenhouse`（ソーラーパンクの温室） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_orbital_diplomatic_hall` | 軌道都市の外交ホール | 採用 | `scene:orbital_hall`（軌道都市の外交ホール） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_undersea_observatory` | 深海観測室 | 採用 | `scene:undersea_observatory`（深海観測室） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_scene_mountain_rescue_station` | 山岳救助基地 | 採用 | `scene:mountain_rescue_hut`（山岳救助小屋） | 語句をそのまま採用（自然文を書き直し） | 定 |

### weather（6件 → `time`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_weather_blue_hour_after_rain` | 雨上がりのブルーアワー | 修正して採用 | `time:blue_hour_after_rain`（雨上がりのブルーアワー） | 屋内の背景（窓の外）とも組めるよう、濡れた路面などの屋外の語を外し、屋外限定にしなかった |  |
| `x_weather_misty_clear_morning` | 霧が晴れ始める朝 | 統合 | `time:foggy`（霧の朝） | 既存「霧の朝」と同じ |  |
| `x_weather_sunny_winter_afternoon` | 冬の晴れた午後 | 採用 | `time:clear_winter_day`（冬の晴れた午後） | 採用（屋外限定） |  |
| `x_weather_humid_harbor_evening` | 湿った港の夕暮れ | 統合 | `time:dusk`（薄暮） | 場所（港）を含み、湿度は描けないため薄暮にまとめた |  |
| `x_weather_highland_crisp_dawn` | 高地の澄んだ夜明け | 統合 | `time:dawn`（夜明け） | 「澄んだ空気」は描けないため夜明けにまとめた |  |
| `x_weather_passing_cloud_shadows` | 流れる雲影 | 採用 | `time:partly_cloudy`（流れる雲の影） | 採用（既知の語 partly cloudy を併記。屋外限定） |  |

### lighting（6件 → `light`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_lighting_soft_skylight` | 天窓の柔らかな光 | 採用 | `light:skylight`（天窓の柔らかな光） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_lighting_warm_lamp_pool` | 卓上灯の暖かな光 | 採用 | `light:desk_lamp`（卓上灯の暖かな光） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_lighting_reflected_water_light` | 水面反射光 | 修正して採用 | `light:water_caustics`（水面の反射光） | water reflections, caustics に。水辺・水中以外では出にくくした（soft） | 定 |
| `x_lighting_window_rimlight` | 窓からの逆光 | 統合 | `light:window_light`（窓から差す光） | 既存「窓から差す光」と同じ | 定 |
| `x_lighting_cloud_filtered_sunlight` | 薄雲越しの日光 | 統合 | `light:overcast_soft`（曇り空の拡散光） | 既存「曇り空の拡散光」と同じ | 定 |
| `x_lighting_museum_track_lighting` | 美術館のスポット光 | 採用 | `light:track_lighting`（展示室のスポット光） | 採用（美術館などの屋内以外では出にくくした） | ≈ 定 |

### ageCue（18件 → `ageCue`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_ageCue_very_subtle_eye_lines` | ごく薄い目元の線 | 採用 | `ageCue:subtle_eye_lines`（ごく薄い目元の線） | 採用（25歳以上。目安35歳） | 定 |
| `x_ageCue_mature_defined_jaw` | 成熟した輪郭 | 採用 | `ageCue:mature_jaw`（成熟した輪郭） | 採用（25歳以上。目安35歳） | 定 |
| `x_ageCue_subtle_crows_feet` | 浅い目尻の皺 | 採用 | `ageCue:crows_feet`（浅い目尻の皺） | 採用（35歳以上） | ⇄ 定 |
| `x_ageCue_fine_smile_lines` | 薄い笑い皺 | 採用 | `ageCue:smile_lines`（薄い笑い皺） | 採用（35歳以上） | ⇄ 定 |
| `x_ageCue_gray_at_temples` | こめかみの白髪 | 修正して採用 | `ageCue:gray_temples`（こめかみの白髪） | temples が寺院と紛れないよう graying hair at the temples に（35歳以上・目安45歳） | ⇄ 定 |
| `x_ageCue_mature_skin_texture` | 成熟した肌理 | 採用 | `ageCue:mature_skin`（成熟した肌の質感） | 採用（35歳以上・目安45歳） | 定 |
| `x_ageCue_slightly_heavy_eyelids` | 年齢を感じる重いまぶた | 採用 | `ageCue:heavy_eyelids`（少し重いまぶた） | 採用（35歳以上・目安45歳） | ⇄ 定 |
| `x_ageCue_silver_temples` | 銀色のこめかみ | 統合 | `ageCue:gray_temples`（こめかみの白髪） | こめかみの白髪と同じ | 定 |
| `x_ageCue_fine_forehead_lines` | 額の細い皺 | 採用 | `ageCue:forehead_lines`（額の細い皺） | 採用（35歳以上・目安45歳） | 定 |
| `x_ageCue_deep_smile_lines` | 深く刻まれた笑い皺 | 採用 | `ageCue:deep_smile_lines`（深く刻まれた笑い皺） | 採用（45歳以上・目安60歳） | 定 |
| `x_ageCue_weathered_dignified_features` | 風雪を経た品格 | 採用 | `ageCue:weathered_features`（風雪を経た品格） | 採用（45歳以上・目安60歳） | 定 |
| `x_ageCue_gray_eyebrows` | 白髪の混じる眉 | 修正して採用 | `ageCue:gray_eyebrows`（白髪の混じる眉） | graying eyebrows に（45歳以上） | 定 |
| `x_ageCue_slightly_thinning_hair` | 薄くなり始めた頭髪 | 修正して採用 | `ageCue:thinning_hair`（薄くなり始めた頭髪） | 既知の語 receding hairline を併記。45歳以上・重み0.35（毎回は出さない） | 定 |
| `x_ageCue_mostly_silver_hair` | 銀髪の中に残る地毛 | 統合 | `hairColor:silver`（銀髪） | 髪の色そのものなので髪色（銀・白・灰）と髪の配色（メッシュ）で表す。年齢の表れに置くと髪色と矛盾する | 定 |
| `x_ageCue_fine_neck_lines` | 首元の浅い皺 | 採用 | `ageCue:neck_lines`（首元の浅い皺） | 採用（45歳以上・重み0.5） | 定 |
| `x_ageCue_subtle_nasolabial_folds` | 控えめなほうれい線 | 採用 | `ageCue:nasolabial`（控えめなほうれい線） | 採用（35歳以上・目安45歳） | 定 |
| `x_ageCue_softened_cheek_volume` | 年齢とともに変わる頬 | 統合 | `ageCue:mature_skin`（成熟した肌の質感） | 頬の変化は描き分けにくいため、成熟した肌の質感にまとめた | 定 |
| `x_ageCue_seasoned_gaze` | 年輪を感じるまなざし | 修正して採用 | `ageCue:experienced_eyes`（年輪を感じるまなざし） | 抽象語（mature poise）を外し calm experienced eyes に | ⇄ 定 |

### hairTexture（14件 → `hairTexture`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_hairTexture_silky_straight` | 絹のような直毛 | 採用 | `hairTexture:silky_straight`（絹のような直毛） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairTexture_coarse_straight` | 硬めの直毛 | 採用 | `hairTexture:coarse_straight`（硬めの直毛） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairTexture_loose_wave` | ゆるいうねり | 採用 | `hairTexture:loose_wave`（ゆるいうねり） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairTexture_deep_wave` | 深いウェーブ | 採用 | `hairTexture:deep_wave`（深いウェーブ） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairTexture_soft_ringlets` | 柔らかな巻き毛 | 採用 | `hairTexture:soft_ringlets`（柔らかな巻き毛） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairTexture_tight_curls` | 細かい巻き毛 | 採用 | `hairTexture:tight_curls`（細かい巻き毛） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairTexture_springy_coils` | 弾むコイル状毛 | 採用 | `hairTexture:springy_coils`（弾むコイル状の髪） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairTexture_loose_coils` | ゆるいコイル状毛 | 採用 | `hairTexture:loose_coils`（ゆるいコイル状の髪） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairTexture_slightly_frizzy` | やや広がる髪 | 採用 | `hairTexture:slightly_frizzy`（やや広がる髪） | 採用（重み0.5） | 定 |
| `x_hairTexture_fine_hair` | 細い髪質 | 修正して採用 | `hairTexture:fine_soft`（細く柔らかな髪） | fine hair strands は薄毛と紛れるため fine soft hair に | 定 |
| `x_hairTexture_thick_hair` | 毛量の多い太い髪 | 採用 | `hairTexture:thick_voluminous`（毛量の多い太い髪） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_hairTexture_matte_texture` | 艶を抑えた髪 | 修正して採用 | `hairTexture:matte_texture`（艶を抑えた髪） | matte hair に（重み0.6） | 定 |
| `x_hairTexture_wet_look` | 濡れ感のある髪 | 修正して採用 | `hairTexture:wet_look`（濡れ感のあるセット） | wet だけでは濡れた服を呼ぶ恐れがあるため wet-look hair, glossy hair に | 定 |
| `x_hairTexture_windswept_texture` | 風になびいた毛束 | 採用 | `hairTexture:windswept`（風になびいた毛束） | 採用（屋内では出にくくした） | 定 |

### fringe（12件 → `fringe`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_fringe_center_part` | 中央分け | 採用 | `fringe:center_part`（中央分け） | 語句をそのまま採用（自然文を書き直し） | =hairStyle:center_part_short,hairStyle:curtain_bangs ⇄ 定 |
| `x_fringe_side_part_left` | 左側分け | 修正して採用 | `fringe:side_part`（横分け） | 左右は画像生成で確実に描き分けられないため、1つにまとめた | 定 |
| `x_fringe_side_part_right` | 右側分け | 統合 | `fringe:side_part`（横分け） | 左右は画像生成で確実に描き分けられないため、1つにまとめた | 定 |
| `x_fringe_soft_curtain_fringe` | 柔らかなカーテン前髪 | 採用 | `fringe:curtain_fringe`（柔らかなカーテン前髪） | 採用（前髪まで決まった髪型とは重ねない） | 定 |
| `x_fringe_long_side_swept` | 長い斜め前髪 | 採用 | `fringe:long_side_swept`（長い斜め前髪） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fringe_short_textured_fringe` | 短い質感前髪 | 採用 | `fringe:short_textured`（短い質感前髪） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fringe_blunt_micro_fringe` | 短い切り揃え前髪 | 修正して採用 | `fringe:blunt`（切り揃えた前髪） | micro を外し、既知の語 blunt bangs に | 定 |
| `x_fringe_wispy_forehead_strands` | 額に落ちる細い毛束 | 採用 | `fringe:wispy`（額に落ちる細い毛束） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fringe_swept_back_no_fringe` | 前髪を上げて額を出す | 採用 | `fringe:forehead`（前髪を上げて額を出す） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fringe_one_eye_partly_covered` | 片目に少し掛かる前髪 | 統合 | `hairStyle:one_eye_covered`（片目隠れ） | 既存の髪型「片目隠れ」と同じ語（hair over one eye） | 定 |
| `x_fringe_curved_comma_lock` | カーブしたコンマ前髪 | 統合 | `hairStyle:comma_bangs`（カンマヘア） | 既存の髪型「カンマヘア」と同じ | 定 |
| `x_fringe_tucked_behind_ears` | 耳掛け前髪 | 統合 | `hairStyle:tucked`（耳かけ） | 既存の髪型「耳かけ」と同じ語（hair behind ear） | 定 |

### gaze（14件 → `gaze`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_gaze_at_viewer` | 観客を見る | 採用 | `gaze:at_viewer`（こちらを見る） | 採用（既存ポーズ34件に埋め込まれた looking at viewer を、この項目で置き換えられるようにした） | =pose:standing_relaxed,pose:three_quarter,pose:hand_in_pocket,pose:arms_crossed,pose:hand_on_hip,pose:hand_on_chest,pose:offer_hand,pose:chin_rest,pose:hair_brush,pose:finger_lips,pose:adjust_glasses,pose:over_glasses,pose:loosen_tie,pose:glove_bite,pose:beckoning,pose:waving,pose:leaning_wall,pose:leaning_forward,pose:sitting_chair,pose:crossed_legs,pose:throne_lounge,pose:chin_on_hand_table,pose:sitting_stairs,pose:crouching,pose:lying_down,pose:fighting_stance,pose:kneel_one_knee,pose:draw_sword,pose:blade_shoulder,pose:toasting,pose:under_umbrella,pose:bound_front_stand,pose:kneel_behind,pose:kneel_look_up 定 |
| `x_gaze_side_left` | 左へ視線 | 修正して採用 | `gaze:side`（横へ視線を流す） | 左右は画像生成で確実に描き分けられないため、1つにまとめた | 定 |
| `x_gaze_side_right` | 右へ視線 | 統合 | `gaze:side`（横へ視線を流す） | 左右は画像生成で確実に描き分けられないため、1つにまとめた | 定 |
| `x_gaze_downward` | 伏し目で下を見る | 採用 | `gaze:downward`（伏し目） | 語句をそのまま採用（自然文を書き直し） | ⇄ 定 |
| `x_gaze_upward` | 上を見る | 採用 | `gaze:upward`（上を見る） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_gaze_to_horizon` | 水平線・遠景を見る | 修正して採用 | `gaze:afar`（遠くを見る） | 既知の語 looking afar に | 定 |
| `x_gaze_over_shoulder` | 肩越しの視線 | 統合 | `headPose:over_shoulder`（肩越しに振り返る） | 肩越しは頭の向きなので「頭の向き」へ（視線は別に選べる） | ⇄ 定 |
| `x_gaze_to_hands` | 手元を見る | 採用 | `gaze:at_hands`（手元を見る） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_gaze_to_book` | 本を見る | 修正して採用 | `gaze:at_book`（本に目を落とす） | 本を持ち物の条件（hard）に | 定 |
| `x_gaze_to_companion_offscreen` | 画面外の相手を見る | 統合 | `gaze:side`（横へ視線を流す） | someone が2人目の人物を呼ぶ恐れがあるため（人物は1名）、横への視線にまとめた | 定 |
| `x_gaze_closed_eyes` | 閉じた目 | 採用 | `gaze:closed`（目を閉じる） | 採用（こちらを見るポーズ・開いた目の表情とは組まない） | 定 |
| `x_gaze_soft_unfocused` | 焦点を外した視線 | 採用 | `gaze:unfocused`（焦点の合わない視線） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_gaze_down_and_side` | 斜め下を見る | 採用 | `gaze:down_side`（斜め下を見る） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_gaze_up_and_side` | 斜め上を見る | 採用 | `gaze:up_side`（斜め上を見る） | 語句をそのまま採用（自然文を書き直し） | 定 |

### headPose（12件 → `headPose`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_headPose_front_neutral` | 正面の自然な頭位 | 採用 | `headPose:facing_front`（正面を向く） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_headPose_three_quarter_left` | 左斜めの顔 | 修正して採用 | `headPose:head_turned`（顔を少し横へ向ける） | 左右は画像生成で確実に描き分けられないため、1つにまとめた。カメラの「斜め45度」（three-quarter view）と区別するため head turned to the side に | 定 |
| `x_headPose_three_quarter_right` | 右斜めの顔 | 統合 | `headPose:head_turned`（顔を少し横へ向ける） | 左右は画像生成で確実に描き分けられないため、1つにまとめた | 定 |
| `x_headPose_profile_left` | 左横顔 | 修正して採用 | `headPose:profile`（横顔） | 左右は画像生成で確実に描き分けられないため、1つにまとめた | 定 |
| `x_headPose_profile_right` | 右横顔 | 統合 | `headPose:profile`（横顔） | 左右は画像生成で確実に描き分けられないため、1つにまとめた | 定 |
| `x_headPose_slight_tilt_left` | 左へ首を傾ける | 修正して採用 | `headPose:head_tilt`（首を傾ける） | 左右は画像生成で確実に描き分けられないため、1つにまとめた | 定 |
| `x_headPose_slight_tilt_right` | 右へ首を傾ける | 統合 | `headPose:head_tilt`（首を傾ける） | 左右は画像生成で確実に描き分けられないため、1つにまとめた | 定 |
| `x_headPose_chin_raised` | 顎を少し上げる | 採用 | `headPose:chin_up`（顎を上げる） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_headPose_chin_lowered` | 顎を少し引く | 採用 | `headPose:chin_down`（顎を引く） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_headPose_looking_over_shoulder` | 振り返った頭部 | 採用 | `headPose:over_shoulder`（肩越しに振り返る） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_headPose_head_bowed` | 頭を軽く下げる | 採用 | `headPose:head_bowed`（軽くうつむく） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_headPose_head_turned_away` | 顔を背ける | 採用 | `headPose:turned_away`（顔を背ける） | 語句をそのまま採用（自然文を書き直し） | 定 |

### outfitDetail（20件 → `outfitDetail`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_outfitDetail_pocket_square` | ポケットチーフ | 採用 | `outfitDetail:pocket_square`（ポケットチーフ） | 採用（スーツ・ジャケットのときだけ。既に含む衣装には重ねない） | =outfit:double_breasted 定 |
| `x_outfitDetail_lapel_pin` | ラペルピン | 採用 | `outfitDetail:lapel_pin`（ラペルピン） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_outfitDetail_tie_bar` | ネクタイピン | 修正して採用 | `outfitDetail:tie_clip`（ネクタイピン） | 一般的な tie clip に。ネクタイ（蝶ネクタイ以外）のある衣装だけ | 定 |
| `x_outfitDetail_silk_neck_scarf` | シルクのネックスカーフ | 採用 | `outfitDetail:silk_neck_scarf`（シルクのネックスカーフ） | 採用（首元にネクタイ・スカーフ・高い襟などがある衣装には重ねない） | 定 |
| `x_outfitDetail_signet_ring` | シグネットリング | 採用 | `outfitDetail:signet_ring`（シグネットリング） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_outfitDetail_rolled_cuffs` | 折り返した袖口 | 修正して採用 | `outfitDetail:rolled_cuffs`（袖をまくる） | rolled-up sleeves に。袖のない服・既に袖をまくった服には重ねない | 定 |
| `x_outfitDetail_contrast_stitching` | コントラストステッチ | 採用 | `outfitDetail:contrast_stitching`（コントラストステッチ） | 採用（重み0.6） | 定 |
| `x_outfitDetail_embroidered_collar` | 刺繍入りの襟 | 採用 | `outfitDetail:embroidered_collar`（刺繍入りの襟） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_outfitDetail_leather_elbow_patches` | 革の肘当て | 採用 | `outfitDetail:elbow_patches`（革の肘当て） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_outfitDetail_waistcoat_chain` | ベストのチェーン | 修正して採用 | `outfitDetail:watch_chain`（ベストの懐中時計の鎖） | watch chain に。ベストのある衣装だけ | 定 |
| `x_outfitDetail_asymmetric_closure` | 左右非対称の前留め | 修正して採用 | `outfitDetail:asymmetric_closure`（左右非対称の前合わせ） | asymmetrical buttoning に | 定 |
| `x_outfitDetail_brass_buttons` | 真鍮のボタン | 採用 | `outfitDetail:brass_buttons`（真鍮のボタン） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_outfitDetail_woven_belt` | 織りのベルト | 修正して採用 | `outfitDetail:woven_belt`（織りのベルト） | sash を外し woven belt に（帯・サッシュのある衣装には重ねない） | 定 |
| `x_outfitDetail_pleated_trousers` | タック入りのスラックス | 採用 | `outfitDetail:pleated_trousers`（タック入りのスラックス） | 採用（膝上以上の画角だけ） | =outfit:double_breasted 定 |
| `x_outfitDetail_high_waist_trousers` | ハイウエストのズボン | 採用 | `outfitDetail:high_waist_trousers`（ハイウエストのズボン） | 採用（腰上以上の画角だけ） | 定 |
| `x_outfitDetail_shirt_sleeve_garters` | シャツ用アームバンド | 採用 | `outfitDetail:sleeve_garters`（シャツのアームバンド） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_outfitDetail_stitched_leather_strap` | 縫い目のある革ストラップ | 不採用 | — | 何のストラップか曖昧で、ハーネス（拘束具・衣装のベルト類）と紛れる | 定 |
| `x_outfitDetail_ceremonial_braid` | 礼装の飾り紐 | 修正して採用 | `outfitDetail:aiguillette`（礼装の飾り緒） | braid が髪の三つ編みと紛れるため、既知の語 aiguillette に | 定 |
| `x_outfitDetail_minimalist_cufflinks` | 小さなカフリンクス | 採用 | `outfitDetail:cufflinks`（カフリンクス） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_outfitDetail_scarf_knot` | きれいに結んだスカーフ | 採用 | `outfitDetail:knotted_scarf`（きれいに結んだスカーフ） | 採用（スカーフ・ネッカチーフのある衣装だけ） | 定 |

### fabric（12件 → `fabric`）

| 候補 | 名前 | 判定 | 反映先 | 理由 | 監査 |
|---|---|---|---|---|---|
| `x_fabric_fine_wool` | 上質なウール | 採用 | `fabric:fine_wool`（上質なウール） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fabric_tweed` | ツイード | 採用 | `fabric:tweed`（ツイード） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fabric_velvet` | ベルベット | 採用 | `fabric:velvet`（ベルベット） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fabric_raw_silk` | 生糸風シルク | 採用 | `fabric:raw_silk`（生糸風のシルク） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fabric_washed_linen` | 洗いざらしリネン | 採用 | `fabric:washed_linen`（洗いざらしのリネン） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fabric_brushed_cotton` | 起毛コットン | 採用 | `fabric:brushed_cotton`（起毛コットン） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fabric_heavy_canvas` | 厚手キャンバス | 採用 | `fabric:heavy_canvas`（厚手のキャンバス地） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fabric_supple_leather` | しなやかな革 | 採用 | `fabric:supple_leather`（しなやかな革） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fabric_suede` | スエード | 採用 | `fabric:suede`（スエード） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fabric_brocade` | 織り柄のブロケード | 採用 | `fabric:brocade`（ブロケード） | 語句をそのまま採用（自然文を書き直し） | 定 |
| `x_fabric_technical_mesh` | 機能性メッシュ | 保留 | — | mesh が透ける生地として描かれる恐れ（露出の方針）。画像での確認が必要 | 定 |
| `x_fabric_recycled_textile` | 再生繊維の風合い | 不採用 | — | 再生繊維かどうかは画像で見分けられない | 定 |
