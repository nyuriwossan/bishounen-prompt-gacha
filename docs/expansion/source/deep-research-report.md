# 美青年錬成ガチャ｜既存システム分析・不足要素発掘・大規模辞書拡張調査

## 調査範囲と総合結論

### 調査対象

調査日は **2026年10月22日（JST）**。GitHub の `main` を追い、確認した最新コミットは **`854bdde922543a509a64418286222c5357fe4380`**、コミット時刻は 2026年10月22日 08:55:20 JST、内容は「履歴の上限を50件に戻す」です。fileciteturn32file0L3-L6 fileciteturn32file8L118-L122

READMEだけではなく、`src/data/`、`src/engine/`、`src/advisor/`、`src/prompts/`、`src/storage/`、`src/types/`、`tests/`、`docs/DATA-CATALOG.md`、`docs/SOURCE-AUDIT.md`、`docs/TEST-REPORT.md`、`docs/EXAMPLES.md`、大量抽選結果まで確認した。現行のフィールド登録・抽選順・型は `fields.ts` と `types/index.ts` に集約され、データ・エンジンが共通 `Option` 型で接続される構成になっている。fileciteturn23file0L2-L2 fileciteturn24file0L2-L2

今回、俺が最初に押さえておきたい結論は明快だ。

**現行システムは「候補不足の未完成品」ではない。むしろ、抽選・固定・矛盾回避・保存互換・男性美形アンカーという土台は相当に完成度が高い。次の課題は候補を闇雲に増やすことではなく、「互いに独立して変化できる視覚軸」を増やすことだ。**

現行辞書は、共有色の重複計上を含めて **1,727候補**。美形タイプ124、髪型54、衣装157、職業96、ポーズ80、背景94など、単純な件数は既に十分大きい。fileciteturn4file0L2-L71

さらにコミット済みテスト報告では、型検査・lintがゼロエラー、Vitest **266/266**、ブラウザ検証 **202/202**、大量抽選 **4,200回**で hard 違反、女性・未成年語、美形アンカー欠落、ロック変更、完全重複はいずれもゼロとされている。597件のロック矛盾ケースもすべて状態を変えず拒否できている。fileciteturn6file0L2-L66

ただし、俺自身が今回ローカルで `npm test` や4,200回の抽選を再実行したわけではない。**ソースコードの静的監査と、リポジトリにコミットされたテストコード・TEST-REPORT・mass-draw artifact の再解析**を行った。この点は検証済み事実と今回の推論を区別するため明記しておく。

### 最も大きい不足

優先順位としては、こうなる。

| 領域 | 現状評価 | 増築効果 | 理由 |
|---|---|---:|---|
| 年齢の視覚表現 | **不足大** | 極大 | 5段階の年齢語だけでは45歳以上を顔として描き分けにくい |
| 顔の微細構造 | **不足大** | 極大 | 28候補あるが、顎・鼻・眉・口が同じ1フィールドを奪い合う |
| 視線・頭部角度 | **構造的不足** | 極大 | 80ポーズの多くが身体姿勢と `looking at viewer` を一体化 |
| 髪の質感・前髪 | **構造的不足** | 大 | 54髪型は多いが、形状・質感・前髪・結び方が同一軸 |
| 成熟男性の体格・髭 | 不足 | 大 | 体格9、髭7では35～60+の差が弱い |
| 生活職・手仕事 | やや不足 | 大 | 王侯・武人・魔術・知識職が強く、職人的日常像の伸びしろが大きい |
| 世界観の地域別生活空間 | 不足 | 大 | 文化モチーフ21に対し、それを生活舞台化する世界観が少ない |
| 衣装一式 | **既に強い** | 中 | 157件。むしろ素材・装飾を独立させる方が効率的 |
| 背景 | 強い | 中～大 | 94件あるが、職業生活空間・地域都市・明るいSFが弱い |
| 美形タイプ | 強い | 中 | 124件。今後は名称追加より視覚化の精度が重要 |

この判断は「件数」だけではなく、フィールド構造を見た結果だ。たとえば顔立ちは28件あるが、同一の `face` から一つしか選ばれないので、「強い眉骨＋ローマ鼻＋丸い顎」のような複数軸の組合せを作れない。逆に髪色48、瞳色40、衣装157、配色128×2などは、今以上に増やしても限界効用は小さい。fileciteturn4file0L2-L71

### 作成した増築資料

今回、単なるアイデア集ではなく、後でClaude等に渡せる構造化資料として、**394候補**を作成した。そのうち **292件は既存FieldIdへ追加可能な案、102件は新フィールド候補**である。さらに連動テーマを **25セット**作成した。

[調査成果物一括ZIPをダウンロード](sandbox:/mnt/data/bishounen_deep_research_handoff_2026-10-22.zip)

個別ファイルは以下。

[増築候補CSV・394件](sandbox:/mnt/data/bishounen_deep_research_2026-10-22/expansion_candidates.csv)

[増築候補JSON・394件](sandbox:/mnt/data/bishounen_deep_research_2026-10-22/expansion_candidates.json)

[Phase 1高優先候補 TypeScript 下書き](sandbox:/mnt/data/bishounen_deep_research_2026-10-22/phase1_high_priority_draft.ts)

[テーマ別セット案・25テーマ](sandbox:/mnt/data/bishounen_deep_research_2026-10-22/theme_sets.json)

[候補数配分CSV](sandbox:/mnt/data/bishounen_deep_research_2026-10-22/candidate_allocation.csv)

[実装引継ぎメモ](sandbox:/mnt/data/bishounen_deep_research_2026-10-22/implementation_notes.md)

仮IDはすべて `x_<category>_*` に名前空間化した。現行コードで `x_` を検索した範囲では既存IDとの明白な衝突は確認されていない。ただし、394件すべてについて「英語句の意味上の近似」まで機械的に全候補比較したわけではないため、実装時には後述する正規化重複テストを必須にした方がいい。

## 現行システムの量的・質的分析

### 辞書全体の棚卸し

現行 `DATA-CATALOG` は辞書版 `2026.10.12` を自動集計している。主な全フィールドは以下の通り。fileciteturn4file0L2-L71

| フィールド | 件数 | 質的評価・主な増築判断 |
|---|---:|---|
| 年齢層 | 5 | **不足**。数値帯は十分だが視覚的老化・成熟差が弱い |
| 美形タイプ | 124 | 強い。追加より各タイプの視覚prefs改善を優先 |
| 容姿傾向 | 5 | 適切。男性～中性～女性寄りを連続的に持つ |
| 体格 | 9 | **不足気味**。筋量中心で、骨格・低重心・手足比率などを追加したい |
| 世界観 | 26 | 強いが地域生活世界に偏りあり |
| 文化・意匠 | 22 | 非常に良い設計。肌・顔と切り離している |
| 髪の長さ | 5 | 十分 |
| 髪型 | 54 | 数は強い。質感・前髪・分け目を別軸にすべき |
| 髪色 | 48 | 十分以上 |
| 目元 | 26 | 中程度。配置・まぶた・年齢差を追加できる |
| 瞳色 | 40 | 十分 |
| 衣装 | 157 | **非常に強い**。一式追加の優先度は低め |
| 表情 | 44 | 強いが、微表情を追加する価値あり |
| 顔立ち | 28 | **構造的不足**。複数部位が単一フィールド |
| 肌 | 13 | 数量より質感軸の不足が問題 |
| 特徴 | 18 | 年齢サイン・肌特徴を増やす余地あり |
| 眼鏡 | 11 | 概ね十分 |
| ひげ | 7 | **不足**。成熟男性の差別化に効く |
| 髪の配色 | 7 | 十分 |
| 職業 | 96 | 強いが生活職・職人・公共職を増やせる |
| 雰囲気 | 22 | 数は適切。抽象語の視覚化が重要 |
| メイン色 | 128 | 十分以上 |
| 差し色 | 128 | 十分以上 |
| 画角 | 7 | 十分 |
| アングル | 7 | 中程度。首・頭部とは独立させたい |
| ポーズ | 80 | 数は非常に多いが視線が結合している |
| 持ち物 | 39 | 中程度。職業拡張に合わせて増築 |
| 背景 | 94 | 強い。生活職の作業場を追加 |
| 時間・天候 | 16 | 十分だが中間状態追加は有効 |
| 光 | 21 | 十分だが生活光源を増やせる |
| 獣人種族 | 29 | 本件の中心課題ではない |
| 獣化度 | 3 | 現行の美形保持方針上、妥当 |
| 禁断：立場 | 11 | 本件での優先追加不要 |
| 拘束具 | 14 | 同上 |
| 拘束位置 | 9 | 同上 |
| 固定先 | 5 | 同上 |
| 締め方 | 3 | 同上 |
| 目隠し | 13 | 同上 |
| 衣装の乱れ | 16 | 同上 |
| 衣装状態 | 28×2 | 十分 |
| 画風 | 9 | 本件では低優先 |
| 名前 | 224 | 画像多様性には直接影響しない |

ここで資料上の小さな不整合も見つかった。`DATA-CATALOG` 上部の要約は職業を95と記す一方、項目別表は96。TEST-REPORTの大量抽選要約には衣装158/158という記載がある一方、実際の `mass-draw-report.json` は **157/157** である。実データに近い項目別表とJSON artifactを優先して、今回は職業96・衣装157として扱った。fileciteturn4file0L2-L71 fileciteturn11file0L2-L2

**これはコードの不具合ではなく、ドキュメント生成値の不一致だが、今後大規模増築するなら放置しない方がいい。** `report:catalog` と TEST-REPORT が同一の集計関数を使うよう統一するのが望ましい。

### 現行抽選の強み

抽選順は、世界観→文化→美形タイプ→人物→髪→衣装→表情・構図→背景という上位概念から下位へ降りる構造で、hard互換候補だけを残しつつ soft weight で選ぶ。固定どうしが矛盾すれば黙って変更せず拒否する。これは今回の増築で**絶対に壊すべきでない長所**だ。fileciteturn23file0L2-L2

現行の3モードは単なる乱数強度違いでもない。まとまり重視は prefs の優先度や候補の裾切りが強く、バランスはそれを緩め、カオスは基本重みを平たくして意外性を残す設計になっている。4,200回の既存検証では、おまかせスタイルなし等に絞った各44件のサンプルで「世界観に合う衣装」がまとまり重視95.5%、バランス86.4%、カオス36.4%、アーキタイプprefs命中は83.0%、47.9%、7.2%だった。サンプル数が各44と小さいため精密な母比率とは扱えないが、**モードが実際に異なる分布を作っている**ことは確認できる。fileciteturn11file0L159-L229

また、文化モチーフと世界観を分離し、文化は衣服・装飾だけに作用して**肌色・顔立ちとは結び付けない**のは非常に良い。日本、韓、中央アジア、南・東南アジア、西アジア、アフリカ、アンデス、メソアメリカ等を持ちつつ、人種を自動決定しない。これは今後の文化拡張でも踏襲すべき原則だ。fileciteturn13file0L2-L87

### 抽選分布で見える偏り

大量抽選結果の年齢分布は、25～34歳が27.29%、18～24歳が24.79%、35～44歳が22.90%、45～59歳が15.64%、60歳以上が9.38%。つまり45歳以上は合わせて約25%に達するものの、60歳以上単独は25～34歳の約34%の頻度しかない。fileciteturn11file0L40-L159

これは偶然ではない。年齢候補そのものに、45～59歳 `w: 0.7`、60歳以上 `w: 0.45` が設定され、若年～44歳は基本1.0になっている。fileciteturn8file0L2-L56

俺は**「60+を必ず同率にするべき」とは考えない**。美青年ガチャとして若年成人を厚めにするのは合理的だからだ。問題は頻度ではなく、60+が引かれた時に「数値上60歳以上なのに若い顔」へ戻りやすいことだ。

現行AGEの英語は、

`young man`  
`man in his late 20s`  
`mature male`  
`middle-aged man`  
`old man, elderly gentleman`

が中心で、45+専用の「目尻の線」「こめかみの白髪」「成熟した肌理」「重いまぶた」「笑い皺」等は年齢フィールド自体にはない。fileciteturn8file0L2-L56

**したがって、年齢分布を先にいじるより「その年齢を引いた時の視覚的再現率」を上げる方が先だ。**

容姿傾向は男性的20.76%、やや男性寄り24.50%、中性的21.93%、やや女性寄り18.29%、女性的14.52%で、かなり健全な広がりがある。女性寄りを選んでも男性キャラクターの指定は維持する設計なので、この軸を改造する必要は薄い。fileciteturn11file0L40-L159

髪の長さも短27.93%、中25.17%、長20.48%、超長14.07%、超短12.36%で、**「長髪しか出ない」ような量的偏りは確認できない**。fileciteturn11file0L159-L229

ただし質的には別問題だ。短髪と長髪の件数ではなく、同じ長さの中で「カール」「コイル」「ウェーブ」「前髪」「分け目」「濡れ感」「整髪感」を独立に変更できない。このため、見かけ上の髪型組合せ空間は54という数字ほど大きくない。

### ポーズの構造的なボトルネック

今回最もはっきりした構造上の偏りはここだ。

現行ポーズは80種類ある。しかし `standing_relaxed` が `standing, looking at viewer`、`three_quarter` も `looking at viewer`、片手ポケット、腕組み、腰に手、顎に手、髪をかき上げる、眼鏡を上げる等、多くの完成ポーズが**身体の状態と視線を一つの候補として持っている**。fileciteturn16file0L2-L81

これはhard整合性には強い。だが、

> 同じ「腕組み」で、こちらを見る／横を見る／伏し目／遠くを見る  
> 同じ「椅子に座る」で、顎を上げる／首を傾ける／横顔になる

といった差分を出しにくい。

したがってユーザーが指摘した「顔の角度・首の角度・視線・手の動作が似通う問題」は、**候補数不足ではなく「ポーズの原子性が低い」ことが本体**だ。

これはPhase 3で `gaze` と `headPose` を独立フィールドにする価値が非常に高い。

### 現行テストで既に守れているもの

既存テストはかなり広い。ID重複、未定義参照、成人限定、女性・未成年語、髪型長さ、衣装プレースホルダー、画角外衣装の除外、固定の保持、手動採用、候補ゼロ、文化×衣装、夜×日光、屋内×雨雪、保存・JSON・共有URLなどが既に検査されている。fileciteturn6file0L2-L66

大量抽選では4,200件中「他項目と両立する候補がなく元値を保持」が9件あり、率にすると約 **0.21%** だが、hard違反には至っていない。fileciteturn11file0L2-L2

この「stuck率」は、今後新しい相性条件を増やす時の良い健康指標になる。hardを増やしすぎると、見かけ上辞書が豊富でもロック後に引ける候補が減るからだ。

## 不足領域と追加辞書の設計

### 美形タイプは「性格名」より「見える翻訳」を増やす

現行の124アーキタイプは既に11分類に渡っているため、「傲慢」「狡猾」「慈愛深い」など抽象性格を大量追加するだけでは、似た顔を増やす恐れがある。アーキタイプには表情・目・顔・体格・衣装・ポーズ・世界観等への `prefs` を持たせられるため、**性格を視覚特徴へ翻訳する設計**を続けるべきだ。`Option` も `prefs?: Partial<Record<FieldId,string[]>>` を正式に持っている。fileciteturn24file0L2-L2

今回の高優先新規例は次のようにした。

| 日本語名 | 英語アンカー候補 | 見た目への翻訳 |
|---|---|---|
| 年輪を刻んだ職人美 | `rugged handsome craftsman, weathered elegance` | 張った頬骨、笑い皺、ワークウェア、手仕事 |
| 銀髪の外交官 | `distinguished silver-haired gentleman, diplomatic poise` | 60+、端正なスーツ、柔らかな権威 |
| 疲れた名探偵 | `world-weary handsome detective, tired sharp eyes` | 重いまぶた、伏し目、雨、トレンチ |
| 洒脱なダンディ | `dashing mature gentleman, sartorial elegance` | 壮年～老年、良質な仕立て、余裕 |
| 草原の鷹匠 | `windswept rugged handsome, steppe elegance` | 風になびく髪、長衣、革手袋、草原 |
| ソーラーパンク技師 | `optimistic tech handsome, natural warmth` | 明るい未来服、植物、清潔な自然光 |
| 軌道都市の外交官 | `futuristic distinguished handsome, composed authority` | 成熟×SF×礼装 |
| アール・ヌーヴォーの神秘家 | `ornate ethereal handsome, art nouveau elegance` | 曲線装飾、ステンドグラス、耽美 |

「傲慢」なら `raised eyebrow`, `chin raised`, `looking down at viewer`、「慈愛深い」なら `gentle concern`, `soft eyes`, `relaxed shoulders` のように、**抽象語はsoft意味タグとして持ち、出力本文はなるべく視覚語へ落とす**のが正解だ。

### 年齢は新しい視覚軸を持たせる

俺の提案は、年齢帯そのものを7段階、8段階に細かくすることではない。

今の5段階を維持し、必要なら新規任意フィールド `ageCue` を導入する。

今回の辞書案には18候補を入れた。

| 年齢方向 | 例 |
|---|---|
| 35～44 | `very subtle expression lines near the eyes`, `mature defined jaw` |
| 45～59 | `subtle crow's feet`, `fine smile lines`, `gray at temples`, `mature skin texture`, `slightly heavy eyelids` |
| 60+ | `silver temples`, `forehead lines`, `deep smile lines`, `weathered but dignified mature features`, `gray eyebrows` |
| 60+内の差 | `slightly thinning but neatly styled hair`, `predominantly silver hair with darker strands` |

ここは設計を間違えると、「老人＝白髪＋深い皺＋禿げ＋髭」を毎回強制する雑な辞書になる。

したがって、

**年齢はhard、老化サインの組合せは確率的**にする。

60+だから必ず白髪である必要はない。45歳で完全な黒髪でも構わない。`ageCue` は一度に1～2個だけ採り、髪色とは独立させるべきだ。

これなら「黒髪の60代美丈夫」「長髪の70代の王」「筋骨隆々の老騎士」も殺さない。

### 顔は分割した方が伸びる

現行 `face` 28件の代表例には、シャープな顎線、高い頬骨、鷲鼻、直線的な鼻筋、卵型などがすでにある。fileciteturn8file0L2-L56

問題は候補の質ではなく、**顎・頬骨・鼻・眉・口が互いに排他的**なことだ。

短期は既存 `face` に以下を追加できる。

`diamond-shaped face`  
`rectangular face`  
`prominent cheekbones`  
`Roman nose`  
`broad nose`  
`prominent brow ridge`  
`thick angled eyebrows`  
`soft straight eyebrows`  
`bow-shaped lips`  
`wide mouth`  
`rounded chin`  
`prominent chin`  
`subtle facial asymmetry`

長期的には、

`faceShape`  
`jawChin`  
`nose`  
`brows`  
`mouth`

を独立させた方が組合せ数は桁違いに増える。

ただしUIが急激に肥大化するので、俺なら最初から全部をユーザーに見せない。**「顔の細部」モジュールとして折り畳み、基本ガチャでは内部抽選、固定したい人だけ開く**構造にする。

### 髪は「髪型」より質感と前髪を足す

今回、既存 `hairStyle` に入れられる候補として、

`ivy league haircut`  
`French crop`  
`Caesar cut`  
`short quiff`  
`modern pompadour`  
`comma hair`  
`curtain bangs`  
`bro flow`  
`shag haircut`  
`modern mullet`  
`short curly crop`  
`shoulder-length wavy hair`  
`half-up bun`  
`undercut ponytail`  
`short coiled hair`  
`locs tied back`

など26件を提案した。

さらにPhase 3用として、独立 `hairTexture` を14件、`fringe` を12件用意した。

これを分割すると、

> 長髪 × 粗いウェーブ × 額を出す × 低い一つ結び  
> 短髪 × コイル状 × 前髪なし × フェード  
> 肩髪 × 絹のような直毛 × カーテン前髪

といった組合せができる。

重要なのは、**髪質と文化・肌色をhard連動させないこと**だ。現行の文化設計と同じ原則を守る。

### 世界観は文化モチーフを「生活」に落とす

現行世界観は現代、夜都市、ビジネス、大正、和風、中華宮廷、武侠、ハイ／ダークファンタジー、ゴシック、欧州宮廷、ヴィクトリア、スチームパンク、北方、砂漠、神話、軍、近未来、サイバーパンク、宇宙、終末等まで持つ。fileciteturn13file0L2-L87

一方、文化モチーフには韓、中央アジア、南アジア、東南アジア、西・東アフリカ、アンデス、メソアメリカ等が既に存在する。fileciteturn13file0L2-L87

つまり不足しているのは文化タグそのものではなく、**「その意匠の人物がどこで何をして暮らしているか」**だ。

今回の世界観候補は、そこを埋めた。

`contemporary Korean-inspired city`  
`South Asian-inspired metropolis`  
`Southeast Asian-inspired port city`  
`Central Asian-inspired steppe`  
`Silk Road-inspired trade city`  
`West African-inspired fantasy city`  
`East African-inspired coastal trade city`  
`Andean-inspired highland fantasy`  
`Mesoamerican-inspired mythic city`

さらに欧州史・SF側には、

`medieval European city`  
`Renaissance court`  
`Belle Époque city`  
`Art Nouveau city`  
`dieselpunk`  
`solarpunk`  
`underwater science fiction city`

を追加案とした。

実在文化を扱う時は「historically exact」と「fictional inspired」を分けるべきだ。今回のファイルでは、特にアフリカ・中南米等について、安易な「民族＝特定の顔・肌」とならないよう fictional/inspired の表現を基本にした。

### 職業と衣装は「日常生活」を厚くする

現行SOURCE-AUDITを見ると、職業は王侯、武人、魔術、聖職、知識、芸能などをかなり広く再設計している。fileciteturn5file0L2-L101

増築では、さらに冒険職を増やすより、

建築家、木工職人、料理人、パン職人、写真家、学芸員、理髪師、仕立屋、宝飾職人、陶芸家、漁師、農園主、記者、編集者、翻訳家、外交官、消防士、救急救命士、整備士、パイロット、船長、山岳ガイド、鷹匠、植物学者

のような「働いている成人男性」を24件提案した。

職業は現行UI自身が「画像には直接描きにくいため、衣装と持ち物の傾向に使う」と明示している。fileciteturn23file0L2-L2

だから職業名を出力するより、

`architect` → ミニマルジャケット、設計図、設計事務所  
`carpenter` → チョアジャケット、工具、木工房  
`curator` → 端正なシャツ、展覧会カタログ、美術館  
`botanist` → 植物標本、温室

というprefsを作る方が効く。

衣装は現行157件あるため、俺は大量に一式を増やす方向には振っていない。新規28件も、主に不足世界・生活職・成熟現代服へ絞った。

さらに新フィールド候補として `outfitDetail` 20件、`fabric` 12件を用意した。

たとえば同じ三つ揃いスーツでも、

`pocket square`  
`lapel pin`  
`tie bar`  
`silk neck scarf`  
`signet ring`

と、

`fine wool`  
`tweed`  
`velvet`  
`raw silk`

を変えれば、セットを何十着も水増しせず見た目を変えられる。

これは衣装157件を200、250と増やすより費用対効果が高い。

## 画像生成プロンプトとしての品質評価

### 現行の英語出力は良い。ただし「PixAI」「NovelAI」の粒度が粗くなった

現行 `build.ts` は5形式を同じ正規化済み状態から生成し、男性1名・美形アンカーを維持する一方、寄り構図では下半身衣装を省略し、目隠し等では目や視線の語も取り除く。これはかなり良い構造だ。fileciteturn21file0L2-L2

ただし、**2026年10月時点ではモデル側が変化している。**

NovelAIの公式ドキュメントでは現在の最新画像モデルは **NovelAI Diffusion V5 Full / Curated** で、V5は自然言語理解や日本語を含む多言語プロンプト対応を強化している。citeturn3search0turn3search5

NovelAIは現在も既知タグを重視し、入力中にモデルのタグ知識を表示する一方、「既知タグのみ必須」ではなく、自然言語も利用できる。citeturn2search1turn3search3

そして重要なのが品質タグだ。

現行コードの NovelAI 品質プリセットは、

`best quality, very aesthetic, absurdres`

である。fileciteturn21file0L2-L2

これはNovelAI公式ドキュメント上ではV4 Full系に近い。一方、現在のV5 Full/CuratedのStandard Quality Tagsは、

`very aesthetic, masterpiece, no text`

が自動付与される。citeturn2search0turn3search1

したがって、**現行の「novelai」という一つの出力先を最新全モデル共通とみなすのは、もう少し粗い。**

俺なら、

`NovelAI V5`  
`NovelAI V4/V4.5`

を分けるか、少なくとも品質タグを「サービス側Quality Tags使用／アプリ側で付与」から選べるようにする。

V5では公式に `attractive male` という専用タグも案内されている。これは現行の `handsome` を即置き換える根拠にはならないが、V5専用プロファイルで実機A/Bする価値は高い。citeturn3search2

PixAIも同様だ。PixAI公式Helpは通常モデルについて、自然文または短いタグ・フレーズが使え、カンマ区切りの記述を推奨している。citeturn2search4

しかしTsubaki/Serin系のDiTについては、PixAI自身が**SDXLとはプロンプト流儀が異なり、自然な英文を強く好む**と案内し、Prompt Helperを使わず直接書く場合は概ね30～150語程度の説明文を推奨している。citeturn2search5turn2search10turn2search11

つまり、

**PixAI SDXL → 現行のタグ形式が得意**  
**PixAI Tsubaki/Serin → 現行 `naturalEnglish` に近い形式が得意**

である。

ここはPhase 1～2でもかなり効果が大きい。

### タグ確度の持たせ方

394候補には、確度をA/B/Cで付けた。

**A** は `Roman nose`, `curtain bangs`, `crossed arms`, `camera`, `salt-and-pepper beard` のような、意味が直接視覚的で短い一般表現。

**B** は `bandhgala-inspired suit`, `solarpunk utility jacket`, `weathered mature features` のように、自然文・短句としては明瞭だが、各モデルの「既知タグ」として個別検証していないもの。

**C** は `world-weary atmosphere`, `artisan confidence` など、単独タグとしての再現性より、soft prefsや自然文で使う方が適切な抽象語。

NovelAI自身もタグ候補UIで「モデルがどれだけそのタグを知っているか」を表示しているので、**全候補を「確実に効くタグ」と断定する設計自体が正しくない**。citeturn2search1

そこで実装時は、

```ts
en: ['short curly hair']
nat: 'short hair with clearly defined natural curls'
```

のように、**タグ形式と自然文の双方を維持**するのが安全だ。

将来どうしてもモデル別差が増えるなら、

```ts
enByTarget?: Partial<Record<OutputTarget, string[]>>
```

のようなフィールドを足せるが、俺ならまだPhase 1では入れない。モデル固有データを394件に散らすと保守が重くなる。

まずは prompt builder 側の「出力ポリシー」で吸収するべきだ。

### hardとsoftを分ける基準

現行hard制約はよくできている。短髪×長髪専用髪型、画角外ポーズ、手数不足、閉眼×viewer視線、夜×日光、屋内×天候、文化×別文化伝統衣装、同色の主色/差し色等を処理している。fileciteturn20file0L1-L2

増築後も、次を**hard**にすべきだ。

| 条件 | 扱い |
|---|---|
| 目を閉じる × こちらを見る | hard |
| 目隠し × 瞳色・eye detail出力 | hard |
| 髪の長さ × 成立しない髪型 | hard |
| 必要な手数 > ポーズの空き手 | hard |
| 全身必須動作 × 顔アップ | hard |
| tie bar × ネクタイのない衣装 | hard |
| pocket square × ポケットのない服 | hardまたはrequires |
| 屋外専用天候 × indoor | hard |
| 明示的伝統衣装A × 別文化B | hard |
| 新 `gaze=closed` × viewer gaze | hard |

一方、以下は**soft**だ。

中性的な顔×筋骨隆々  
男性的骨格×腰までの長髪  
老紳士×鮮やかな髪色  
吸血鬼×現代スーツ  
近未来×東洋意匠  
武人×柔らかな微笑み  
王族×作業着  
細身×強い顎

これらまで禁止したら、このガチャの面白さを自分で削ることになる。

### 自由入力のsemantic lintは追加価値が高い

構造化辞書内では、肌色のような単一フィールドは同時に2候補選べないため「色白＋濃褐色」のような矛盾は起こりにくい。

しかし `freeTags` が存在するので、最終文字列には外部から矛盾を持ち込める。ストレージでも自由タグは保存対象であり、現行テストは性別反転、未成年、人数、髪長、閉じた目等に対する警告を既に持つ。fileciteturn6file0L2-L66

ここは、

`eyes closed` ↔ `looking at viewer`  
`bald` ↔ `very long hair`  
`clean-shaven` ↔ `full beard`  
`dark skin` ↔ `pale skin`  
`barefoot` ↔ `boots`

のような**意味グループlint**へ拡張できる。

ただし、削除ではなく警告が基本だ。

「soft矛盾を自動修正しない」という今の思想を守る方がいい。

## 増築候補辞書とテーマセット

### 候補の配分

作成した394件は以下の配分。

**既存フィールドへ追加可能：292件**

| カテゴリ | 新規候補 |
|---|---:|
| 美形タイプ | 24 |
| 顔立ち | 26 |
| 目元 | 16 |
| 特徴 | 14 |
| ひげ | 8 |
| 体格 | 12 |
| 髪型 | 26 |
| 表情 | 16 |
| 雰囲気 | 10 |
| 世界観 | 16 |
| 職業 | 24 |
| 衣装 | 28 |
| ポーズ | 24 |
| 持ち物 | 14 |
| 背景 | 22 |
| 時間・天候 | 6 |
| 光 | 6 |

**新規フィールド案：102件**

| 新規カテゴリ | 候補 |
|---|---:|
| `ageCue` | 18 |
| `hairTexture` | 14 |
| `fringe` | 12 |
| `gaze` | 14 |
| `headPose` | 12 |
| `outfitDetail` | 20 |
| `fabric` | 12 |

重要なのは、**394件全部を一度に実装すべきだという意味ではない。**

むしろ、そのやり方は悪い。

Phase 1では既存フィールドだけに絞り、その中でも高効果の100～150件程度から始めた方がいい。新フィールドは、実画像評価を見てからだ。

### 特に価値の高い候補例

| 仮ID | 日本語名 | 実装先 | 英語候補 | 優先 |
|---|---|---|---|---|
| `x_face_diamond_face` | ダイヤ型の輪郭 | face | `diamond-shaped face, defined cheekbones` | 高 |
| `x_face_roman_nose` | ローマ鼻 | face | `Roman nose, strong profile` | 高 |
| `x_face_strong_brow_ridge` | 強い眉骨 | face | `prominent brow ridge` | 高 |
| `x_eyeShape_crow_feet_eyes` | 目尻の笑い皺 | eyeShape | `crow's feet, smiling eyes` | 高 |
| `x_build_stocky` | がっしりした中背 | build | `stocky build, broad torso` | 高 |
| `x_build_wiry` | 細く硬い筋肉 | build | `wiry build, lean muscle` | 高 |
| `x_hairStyle_ivy_league_cut` | アイビーリーグカット | hairStyle | `ivy league haircut` | 高 |
| `x_hairStyle_curly_crop` | 短いカーリークロップ | hairStyle | `short curly crop` | 高 |
| `x_hairStyle_undercut_ponytail` | アンダーカットの一つ結び | hairStyle | `undercut ponytail` | 高 |
| `x_hairStyle_coiled_short_hair` | 短いコイル状の髪 | hairStyle | `short coiled hair` | 高 |
| `x_archetype_weathered_craftsman` | 年輪を刻んだ職人美 | archetype | `rugged handsome craftsman` | 高 |
| `x_archetype_silver_diplomat` | 銀髪の外交官 | archetype | `distinguished silver-haired gentleman` | 高 |
| `x_world_solarpunk` | ソーラーパンク | world | `solarpunk` | 高 |
| `x_world_oceanic_future` | 海洋・深海SF | world | `underwater science fiction city` | 高 |
| `x_occupation_architect` | 建築家 | occupation | `architect` | 高 |
| `x_occupation_carpenter` | 木工職人 | occupation | `carpenter` | 高 |
| `x_outfit_workwear_chore` | チョアジャケットのワークウェア | outfit | `chore jacket, work shirt` | 高 |
| `x_pose_eyes_only_side` | 顔は正面・目だけ横へ | pose | `facing viewer, eyes looking to side` | 高 |
| `x_pose_seated_forward_elbows` | 前傾して肘を膝へ | pose | `sitting, leaning forward, elbows on knees` | 高 |
| `x_scene_architecture_studio` | 建築設計事務所 | scene | `architecture studio, drafting table` | 高 |

全394件には、要求された

仮ID、日本語名、カテゴリ、説明、英語タグ候補、自然文候補、相性、避けたい組合せ、既存との差分、根拠・確度、優先度

を収録してある。

### テーマ別セット

25テーマを作成した。完成プロンプトは [theme_sets.json](sandbox:/mnt/data/bishounen_deep_research_2026-10-22/theme_sets.json) に全件入れてある。

| テーマ | 既存のみでの成立 | 主な新要素 |
|---|---|---|
| 静謐な現代建築家 | 一部可 | 建築家、設計事務所、ミニマル服 |
| 年輪を刻んだ木工職人 | 不十分 | 職人美、木工房、ワークウェア |
| 銀髪の老外交官 | 一部可 | 外交官、成熟顔cue |
| 夜更けのジャズマン | かなり可 | 微表情・脱力座り |
| 雨夜の疲れた探偵 | かなり可 | 雨の生活道路、首角度 |
| 草原の鷹匠 | 不十分 | 草原世界、鷹匠、長衣 |
| シルクロードの星読み学者 | 不十分 | 交易都市、隊商宿 |
| 南アジア風都市の外交官 | 不十分 | 現代地域世界、バンドガラ風服 |
| 東南アジア風港湾都市の学芸員 | 不十分 | 港湾都市、学芸員 |
| 西アフリカ意匠の幻想都市の儀礼官 | 不十分 | 生活世界、礼装 |
| アンデス高地の山岳ガイド | 不十分 | 高地世界、山岳職 |
| ルネサンス工房の発明家 | 不十分 | ルネサンス世界、ダブレット |
| アール・ヌーヴォーの神秘家 | 不十分 | Art Nouveau世界・背景 |
| ベル・エポックの写真家 | 不十分 | 時代世界、写真家 |
| ディーゼルパンクの飛行船長 | 不十分 | dieselpunk |
| ソーラーパンクの植物学者 | 不十分 | solarpunk、植物職 |
| 軌道都市の壮年外交官 | 一部可 | 成熟SFフォーマル |
| 深海探査員 | 不十分 | 海洋SF |
| 50代の穏やかな名医 | かなり可 | 年齢cue中心 |
| 60代の洒脱なダンディ | かなり可 | 年齢cue、成熟服 |
| 陽だまりの壮年農園主 | 不十分 | 農園職・葡萄畑 |
| クラシック理髪師 | 不十分 | 理髪師・店内 |
| 雨の日の物静かな編集者 | かなり可 | 編集者・微姿勢 |
| 幻想宮廷の儀礼護衛官 | かなり可 | 儀礼表現 |
| 現代韓国風都市のモードモデル | 一部可 | 地域都市世界 |

例えば「60代の洒脱なダンディ」は、年齢を `elderly gentleman` だけで済ませず、

`subtle crow's feet`  
`fine-knit polo shirt`  
`tailored trousers`  
`warm lounge lighting`  
`sitting sideways on chair`

まで結び、**「老い」を皺だけではなく、仕立て・所作・余裕で描く**構造にしてある。

これは35歳以上の美形拡張で特に重要だ。

## 実装仕様・互換性・テスト設計

### 既存構造を壊さない追加方法

Phase 1候補は現行の `Option` でほぼ表現できる。

```ts
interface Option {
  id: string
  ja: string
  en: string[]
  nat?: string
  cat?: string
  desc?: string
  w?: number
  tags?: string[]
  worlds?: string[]
  lengths?: string[]
  minShot?: ShotLevel
  hands?: number
  gazeViewer?: boolean
  prefs?: Partial<Record<FieldId, string[]>>
  outfitPrefs?: string[]
  requires?: string[]
}
```

これは現行スキーマに既に存在する能力だ。fileciteturn24file0L2-L2

したがって、

**顔・目・髪型・体格・美形タイプ・世界観・職業・衣装・ポーズ・背景の追加だけなら、抽選エンジン本体を大幅に触る必要はない。**

たとえば新しい髪型なら `lengths`、ポーズなら `minShot / hands / gazeViewer / requires`、アーキタイプなら `prefs`、衣装なら `worlds / upper / lower / culture` を既存方式で埋める。

ここは無理に新しいメタデータ規格を作らない方がいい。

### 新フィールドを増やす順番

新フィールドは以下の順で優先したい。

**最優先：`ageCue`**

理由は45+の再現性。UI上は任意モジュールでもよい。

**次点：`gaze` と `headPose`**

これはポーズ80件を再利用したまま組合せ空間を一気に拡大できる。

**その次：`hairTexture` と `fringe`**

髪型54を何倍にも再利用できる。

**その後：`outfitDetail` と `fabric`**

衣装157を再利用する乗算軸。

顔を `jaw / nose / brows / mouth` に完全分割する案は効果こそ最大級だが、UIと保存状態を大きく変える。Phase 3後半でよい。

### 保存データへの影響

保存設計は増築に強い。

現行は**生成済み文章ではなく「選択ID＋固定状態＋設定」を正本**として保存し、未知・削除済みIDは落とさず移行報告を返す。ID改名は `ID_RENAMES` を通せる。fileciteturn22file0L1-L2

したがって、既存フィールドへ候補を**追加するだけなら、お気に入り・履歴の値は基本的に壊れない。**

逆に、既存IDを削除・改名するのは慎重にする。

今回の候補は新規IDだけにしているのもそのためだ。

ただし、見落としやすい問題が一つある。

辞書・抽選設定は「許可候補のホワイトリスト」ではなく、基本的に**除外IDを保存する方式**である。fileciteturn22file0L1-L2

つまり新候補を追加すると、既存ユーザーが以前そのフィールドをかなり絞り込んでいたとしても、**新候補は原則『未除外＝抽選可能』になる。**

これはデータ破損ではないが、ユーザーの意図を外す可能性がある。

俺ならPhase 2で、

「辞書が更新され、○件の新候補が抽選対象に追加されました」

という通知を出す。

既存設定から勝手に「この人は新候補を嫌うだろう」と推測して自動除外するのはやめた方がいい。

### 新FieldIdの互換性

`ageCue` 等を `FIELD_IDS` へ追加する場合は事情が変わる。

旧お気に入りにはその値が存在しないため、

**旧データでは新フィールドを既定OFFまたは `none` として復元し、旧キャラクターの見た目を変えない**

のが原則だ。

つまり新カテゴリは可能なら、

```ts
optionalModules.ageCueEnabled = false
```

のような移行で始める。

その後、ユーザーが新機能を有効化した時だけ値を抽選する。

これならお気に入りを開いただけで突然皺や前髪が足される事故を防げる。

### seedについて

READMEも、同じseedの再現条件として「同じ辞書の版・同じ固定と設定」を前提にしている。fileciteturn25file0L2-L2

したがって候補追加で抽選母集団が変われば、**同じseedから以前と同じ人物が出続けることは保証すべきでない。**

お気に入り・履歴はIDを保存しているので守れるが、seedによる未来の再抽選は辞書版依存と考えるべきだ。

俺なら候補の追加でも `DATA_VERSION` を上げる。現行コメントは削除・改名時を明示しているが、大規模追加も乱数結果を変える以上、再現性管理の観点では版更新対象にした方が整理がいい。fileciteturn23file0L2-L2

### モデル別出力の実装案

新しい候補ごとにPixAI版、NovelAI版を大量に二重登録するより、まず出力ポリシーを分離する。

概念的には、

```ts
type PromptProfile =
  | 'pixai_sdxl'
  | 'pixai_dit'
  | 'novelai_v5'
  | 'novelai_v4'
  | 'generic_tags'
  | 'natural_english'
```

とする。

そして候補データは今まで通り、

```ts
en: [...]
nat: '...'
```

を正本にする。

`pixai_sdxl` は `en` 中心。  
`pixai_dit` は `nat` を組み立てた自然英文中心。  
`novelai_v5` は既知の短タグ＋必要な自然文。  
`novelai_v4` は従来タグを強める。

この方式なら、辞書をサービス仕様変更のたびに全面書換えしなくて済む。

### 新しく必要なテスト

既存テストで既にカバーされているのは、ID重複、参照整合、固定保持、手動採用、候補不足、モード差、保存復元、旧データ、モデル別5形式、hard矛盾などだ。fileciteturn6file0L2-L66

追加すべきなのは、件数テストではなく**意味と分布のテスト**だ。

| 新規テスト | 目的 |
|---|---|
| normalized English duplicate | `side-swept hair` と綴り違い等の実質重複を検出 |
| semantic group conflict | closed/open eyes、clean-shaven/beard等 |
| ageCue compatibility | 年齢フィールドとの適合 |
| headPose × pose | 後ろ向き＋正面顔等の不可能組合せ |
| gaze × expression | 閉眼、目隠し、viewer gaze |
| outfitDetail requires | tie bar、lapel pin等の親衣装条件 |
| fabric compatibility | 鎧にリネン等の無意味な適用を防ぐ |
| lock-depth stress | 固定数0/5/10/15等でstuck率を測定 |
| joint-signature collision | 年齢＋顔＋目＋髪＋体格等の完全同型率 |
| normalized entropy | 各カテゴリの実効候補数を見る |
| age visual coverage | 45+で年齢cueが一定確率で付くか |
| model-profile golden | PixAI SDXL/DiT、NovelAI V5/V4の出力構造 |
| frame visibility | accessoryや手動作が画角外なら出さない |
| prefs dictionary update | 新候補追加後の既存除外設定挙動 |
| docs single-source | DATA-CATALOG/TEST-REPORT/artifactの件数一致 |

特に**Shannon entropy / effective number of options**を測るとよい。

候補が100個あっても10個に確率が集中していれば、実効候補数は小さい。これは「件数が多いのに同じ美青年に見える」を検出するのに単純coverageより適している。

さらに、アーキタイプ単独ではなく、

`age × presentation × build × face × eyeShape × hairStyle × outfit × pose`

の署名を取り、50,000回程度で衝突率を見る。

これなら「124アーキタイプ全部に到達した」という現在の良い検証を、**見た目の組合せ多様性**まで一段進められる。

### 自動評価と実画像評価を分ける

自動テストで保証できるのは、

男性1名  
成人指定  
hard矛盾ゼロ  
候補到達  
分布  
プロンプト構造  
画角整合  
保存互換

までだ。

「美しいか」「60代にちゃんと見えるか」「同じタイプでも別人に見えるか」は最終的に画像評価が必要だ。

そこで改修前後で固定seed・固定条件を使い、

18～24  
25～34  
35～44  
45～59  
60+  
男性的  
中性的  
女性寄り

などを層別化した100～200ケースを生成し、

**魅力度**  
**人物間の識別性**  
**年齢一致度**  
**プロンプト一致度**  
**不自然さ**

を5段階またはペア比較で評価するのがよい。

これは自動テストと競合しない。役割が違う。

## 増築ロードマップと最終優先順位

### Phase 1：低リスク・高効果

**既存データ型と既存FieldIdを維持する。**

対象は、

顔26  
目16  
体格12  
髪型26  
ひげ8  
特徴14  
微表情16  
美形タイプのうち生活・成熟系  
職業24  
世界観の一部  
生活衣装  
ポーズ24  
背景22

など。

加えて、

**NovelAI品質タグをV5前提で再検討**  
**PixAI SDXLとTsubaki/DiTの出力方針を分ける**

この二つは辞書追加以上に即効性がある。現在のNovelAI V5の公式Quality Tagsと現行アプリのNovelAI quality presetには差があり、PixAI側もSDXLとDiTで推奨プロンプト形式が異なるためだ。citeturn3search1turn2search10

**期待効果：高～極高**  
**実装難度：低～中**  
**既存保存への影響：ほぼなし**  
**推奨リリース単位：100～150件程度**

### Phase 2：組合せ強化

辞書件数より、`prefs / tags / worlds / requires / w` を調整する。

重点は、

成熟アーキタイプ↔年齢  
職業↔衣装↔小物↔背景  
世界観↔生活空間  
文化↔衣装装飾  
視線のviewer偏重緩和  
60+の出現率ではなく年齢再現率  
新規候補が少数へ偏らない重み調整  
semantic lint

である。

また既存 `mass-draw-report` の scene が `95/94` になっているのは、背景モジュールOFF時の `-` が到達候補として数えられているためで、辞書coverage指標としては分離した方がいい。実データ自体は94背景である。fileciteturn11file0L2-L2

**期待効果：極高**  
**実装難度：中**  
**既存保存への影響：小**  
**注意：hard条件を増やしすぎずstuck率を監視**

### Phase 3：新機能・新カテゴリ

ここで初めて、

`ageCue`  
`hairTexture`  
`fringe`  
`gaze`  
`headPose`  
`outfitDetail`  
`fabric`

を入れる。

特に `gaze` と `headPose` は、現行80ポーズを捨てずに組合せを乗算できるので非常に強い。

仮に身体ポーズ80、視線14、頭部角度12を完全独立にした場合、理論上の組合せ空間は大幅に増える。ただし実際には互換条件で絞られるため、件数の掛け算をそのまま「実効多様性」とは扱わないこと。

顔の完全分解、

`faceShape / jawChin / nose / brows / mouth`

はさらに先でいい。

**期待効果：極高**  
**実装難度：中～高**  
**保存互換への影響：中～大**  
**旧データでは新フィールド既定OFFを推奨**

### 効果が大きい増築案の最終優先順位

最後に、実装効果順で20件に絞る。

| 優先 | 増築案 | Phase | 効果 | 難度 | 判断 |
|---:|---|---|---|---|---|
| **1** | 45～60+の視覚的年齢cueを強化 | 1→3 | 極高 | 中 | 年齢数値だけ若返る問題へ直撃 |
| **2** | `gaze` を身体ポーズから独立 | 3 | 極高 | 中 | viewer視線偏重を根本解決 |
| **3** | `headPose` を独立 | 3 | 極高 | 中 | 顔・首角度の同質化を解消 |
| **4** | 顔立ちへ鼻・眉・顎・輪郭26候補追加 | 1 | 極高 | 低 | 最小変更で顔差が増える |
| **5** | `hairTexture` 独立 | 3 | 高 | 中 | 54髪型を再利用して乗算 |
| **6** | `fringe` 独立 | 3 | 高 | 中 | 前髪・分け目の差を増やす |
| **7** | 現行ポーズへviewerを見ない24候補追加 | 1 | 高 | 低 | Phase 3前でも効く |
| **8** | 成熟向け髭8候補・肌年齢特徴追加 | 1 | 高 | 低 | 35～60+の識別性を増やす |
| **9** | 体格を骨格・シルエット方向へ12候補追加 | 1 | 高 | 低 | slim↔muscular一本道を緩和 |
| **10** | 職人・生活職・公共職24候補追加 | 1 | 高 | 低 | 現代成人男性の生活像を広げる |
| **11** | 職業と衣装・小物・背景のprefs強化 | 2 | 高 | 中 | 「職業名だけ」問題を防ぐ |
| **12** | 地域文化モチーフに対応する生活世界を追加 | 1→2 | 高 | 中 | 既存文化21種を活かせる |
| **13** | ソーラーパンク・深海SF・ディーゼルパンク | 1 | 高 | 低 | SFの暗色都市偏重を緩和 |
| **14** | 現代成熟男性用ワークウェア・きれいめ服 | 1 | 高 | 低 | 若者服／礼装の間を埋める |
| **15** | `outfitDetail` の独立化 | 3 | 高 | 中 | 157衣装を水増しせず再利用 |
| **16** | `fabric` の独立化 | 3 | 中～高 | 中 | 同じ衣装の質感差が増える |
| **17** | PixAI SDXLとDiT/Tsubakiの出力プロファイル分離 | 1→2 | 極高 | 中 | 現行モデル事情に直接対応 |
| **18** | NovelAI V5/V4プロファイル分離 | 1→2 | 高 | 中 | 最新V5と従来quality tagの差を解消 |
| **19** | semantic lintをhard/soft別に拡張 | 2 | 高 | 中 | 自由入力・新フィールドの矛盾を管理 |
| **20** | entropy・joint-signature・lock-depthテスト導入 | 2 | 高 | 中 | 「件数だけ増えて実質同じ」を検出 |

最終的な判断として、**Phase 1でいきなり394件を全部入れるのは勧めない。**

現行システムの強みは、「大量の素材」ではなく、**固定した要素を守り、矛盾を回避しながら、それでも意外な組合せを許す抽選設計**にある。短髪・画角・手数・文化・光等のhard制約と、アーキタイプ・世界観等のsoft weightingが既に分離されていることが、その土台になっている。fileciteturn20file0L1-L2

だから最良の増築は、

**候補数を倍にすることではない。  
今ある54髪型を、質感と前髪で何倍にも使えるようにする。  
今ある80ポーズを、視線と首角度で何倍にも使えるようにする。  
今ある157衣装を、素材と装飾で何倍にも使えるようにする。  
そして35歳、50歳、70歳が「年齢タグだけ違う同じ青年顔」にならないようにする。**

そこまでやれば、「一期一会」というサブタイトルが、辞書件数ではなく**生成される人物そのものの差**として効いてくる。