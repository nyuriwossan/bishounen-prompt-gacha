# SOURCE-AUDIT — 既存ツールの監査と再利用の記録

調査日：2026-10-13（JST）。作者 `nyuriwossan` の公開リポジトリを `git clone --depth 1` で取得し、README だけでなく実データ・ソース・テストを照合した。再利用したデータは `scripts/import-sources.mjs` で機械的に抽出して `src/data/imported/*.json` に保存しており、**アプリは実行時に他の GitHub Pages や外部サーバーへアクセスしない**。

## 1. 確認したコミット

| リポジトリ | 確認コミット | コミット日時 |
|---|---|---|
| character-appearance-prompt-workshop | `a8d2074bc58cc04eabb871640093b42cb908e954` | 2026-10-03 18:19 |
| creative-idea-gacha | `5c3f02bd5af558ea17db00d9409b998dff6b8829` | 2026-10-09 10:03 |
| outfit-prompt-workshop | `b71d1ef425df6ecb4e30381060dc975cb7953819` | 2026-10-03 11:41 |
| pose-composition-workshop | `c1def8b73b9a86c5e18301cdf3fd3b3c7c7a773a` | 2026-09-07 18:07 |
| background-prompt-workshop | `121f33553ae3dd515898d0a8de8af89c4316d514` | 2026-07-24 07:57 |
| kemono-prompt-workshop | `ac5e16fb061b44cefe4cc48732f5335c4a230cdb` | 2026-10-08 15:10 |
| concept-fashion-workshop | `f883463e3dd9f00c2de7c5e95c0855f11a0739d2` | 2026-08-17 06:27 |
| lora-training-prompt-workshop | `af3fa496e144f52fafda6e995b86f6f7ac1fd48d` | 2026-07-28 07:05 |
| creative-oc-maker | `906ae89fb85d57f90fc37a2039df682ee0178706` | 2026-10-03 15:47 |
| chat-deco-workshop | `23ea2c7b9c08750fbc546066be3d16958692bb0e` | 2026-10-08 20:17 |
| tools-and-projects | `92c676dca2a4e872fd63387ccbfb95fc89427b17` | 2026-08-22 18:26 |

各 JSON の `commit` フィールドにも抽出元のコミットを記録している。

## 2. リポジトリ別の調査結果

### character-appearance-prompt-workshop（容姿辞書・最優先）

- 読んだファイル：`data/core.js`（`addField` と `'id|日本語|英語|色'` 形式）、`data/hair.js`、`eyes.js`、`basic-face.js`、`features.js`、`skin-body.js`、`marks.js`、`appearance-details.js`、`presets.js`、`rules.js`、`advisor.js`、`storage.js`、`README.md`、`tests/`。
- 件数：Node の `vm` で読み込み、**外見候補 1,162 件**（README の記載と一致）、部分プリセット 98 件（README 記載の「114件」は顔ID等を含む別集計と思われ、`data/presets.js` 単体は 98 件）、ルール 21 件を確認。
- スキーマ：フィールド単位（`id / labelJa / category / selectionMode / options[]`）、候補は `{id, labelJa, promptEn, colorValue}`。ID は英小文字スネークケース。英語は自然な小文字の句（`silver hair`）。
- **移植**：髪の基本色 48 色（hex つき）、瞳の基本色 40 色、肌色 12 色、眼鏡形状 4 種。→ `hairColor` / `hairAccentColor` / `eyeColor` / `skin` / `glasses`。
- **再構成（参考）**：顔型・顎線・頬骨・眉・鼻・唇・目の形・まぶた・カット47種の語彙を、男性美形向けの「顔立ち28種」「目元・目つき26種」「髪型54種（長さ制約つき）」に組み直した。
- **方針の継承**：年齢語に単独の `adult` を使わない（同工房 README の方針）。選択IDを保存の正本にする。hard ルール「短髪と長髪向けカットの競合」。
- **移植しない**：`genderPresentation` の `girlish`・`boyish`、`ageImpression` の `child / early_teen / late_teen`（成人男性専用のため）、左右別の虹彩・髪色の詳細（1回のガチャでは過剰なため）、顔ID・LoRA学習用出力。

### creative-idea-gacha（ガチャの操作感）

- 読んだファイル：`js/core.js`（`weightedPick`・`weightFor`・`rollFields`）、`js/quick-reset.js`、`js/storage.js`、`js/app.js`（`copy()`）、`README.md`。
- **考え方を継承**：「固定以外を引く」「1項目だけ選び直す」「分類→小分類→個別素材」「この中からガチャ」「採用した素材を固定する（初期ON）」「ロック解除は本文を消さない」「戻す1回で元に戻せる」「候補不足は元の値を保って理由を表示」「直近候補の重みを下げる」「まとまり重視／自由に混ぜる」「コピー失敗時の手動コピー欄」。
- **移植しない**：物語素材の辞書（世界観249件・基本1,457素材など）は今回の人物画像用途と無関係。

### outfit-prompt-workshop（衣装・配色）

- 読んだファイル：`data/garments.js`（109件）、`colors.js`、`concept.js`、`presets.js`、`rules.js`、`advisor.js`、`README.md`。
- **移植**：配色 128 色（hex・系統14・トーン6・ムードつき）→ `mainColor` / `accentColor`。
- **参考**：世界観8種・役割16種・「大分類→サブタイプ→部位」構造・ルールの宣言的定義（`pair` 型）。
- **移植しない**：衣装109件の大半（ドレス・水着・ランジェリー・メイド服・バニースーツ・学生服など）は女性向け・成人向け演出・学生を含むため不採用。代わりに男性向け**衣装セット132件**を新規設計し、`{c1}`（メイン色）`{c2}`（差し色）で色と対象を結び付ける形式にした。

### pose-composition-workshop（ポーズ・構図）

- 読んだファイル：`data/postures.js`、`limbs.js`、`head-gaze.js`、`camera.js`、`composition.js`、`presets.js`、`rules.js`、`advisor.js`（35KB）、`README.md`。
- 件数：プリセット 77 件（基本15・身体表現8・拘束8・関係性/視点人物46）を確認（README と一致）。
- **移植**：画角7（`shotSizes`）、アングル5（`elevations` / `rolls`）、表情13語、ポーズ25件の要素（立ち・座り・腕組み・振り返りなど）。
- **継承した hard ルール**：閉じた目とこちらを見る視線、両腕指定の重複、手の数の超過 → `eyes_gaze` / `prop_hands` として実装。画角の最小レベル `minShot` は同工房の「画角外の身体」チェックを単純化したもの。
- **移植しない**：拘束系8件、関係性・視点人物46件（複数人・接触のため用途外）、ブリッジ等の特殊姿勢。

### background-prompt-workshop（背景・光）

- 読んだファイル：`app/lib/background-data.ts`、`advisor.ts`、`generator.ts`、`README.md`。
- **移植**：舞台 41 件のうち 39 件（`bedroom` は通常抽選の用途から外し、`deep_space` などは「夢・宇宙」に再分類）、時間6・天候5・現象9のうち13、主光源・副光源・方向・質から12。
- **継承**：空間背景／シンプル背景の切替（`place: 'simple'` では時間帯を出力しない）、`enforceExclusions` の「夜の直射日光を許さない」→ hard ルール `light_time`。
- **追加**：和（神社・竹林・縁側・茶室・桜並木…）、中華（楼閣・蓮池・霧の山水）、宮廷・ゴシック、夜の街、砂漠、神話、SF の舞台47件とシンプル背景9件。

### kemono-prompt-workshop（任意の獣人モード）

- 読んだファイル：`index.html`（単一ファイル。`GROUPS`・`SPECIES` 67種・`LEVELS` 5段階・`generate()`）。
- **移植**：`weak` でない種族から美形と両立しやすい 29 種と、分類別設定（耳・尾・体表・牙・爪・翼）を抽出し、同工房の `generate()` と同じ規則で部位タグを組み立てる（`src/data/kemono.ts`）。
- **移植しない**：獣化 Lv.4（マズル・獣の脚）と Lv.5（アンソロ）。頭部まで動物になり「美形の顔」アンカーと両立しないため。模様・体表色の細かな指定も省略。

### concept-fashion-workshop（文化モチーフ）

- 読んだファイル：`app/prompt-engine.js`、`app/extended-options.js`、`README.md`。outfit 工房内の `conceptFashion`（地域8区分・伝統衣装14種）も確認。
- **参考**：文化を「〜風の意匠」として衣装に変換する考え方、地域区分。今回は地域をさらに細分化した **文化・意匠モチーフ 21 種**（東アジア／中央アジア・草原／南・東南アジア／西アジア／アフリカ／ヨーロッパ／中南米）を新規作成。
- **方針**：文化モチーフは衣装・装飾にだけ作用させ、肌色・顔立ちとは結び付けない。伝統衣装は `culture` を持ち、別の文化モチーフと同時に採用しない（hard）。
- **移植しない**：露出度の段階指定（用途外）。

### lora-training-prompt-workshop（シード・配分）

- 読んだファイル：`src/core.mjs`（`hashSeed`・`seededRandom`・`removePromptConflicts`）、`LICENSE`（MIT）、`README.md`。
- **移植**：`hashSeed`（FNV-1a）と `seededRandom`（mulberry32）をそのまま `src/engine/rng.ts` へ（MIT、出典をコメントに記載）。
- **参考**：プロンプト内の矛盾除去（閉じた目×視線、短髪×長髪、寄り構図×上半身）→ hard ルールと「画角外の衣装を省略」に反映。

### creative-oc-maker（名前）

- 読んだファイル：`index.html`（643KB。`nameData`・`occupationPools`・外見素材）、`NAMING.md`、`data/names-v1.4.json`。
- **移植**：`nameData` から男性名・中性名 224 件（現代日本70・和風32・欧風40・中華32・砂漠32・SF18）→ 呼び名（画像プロンプトには出力しない）。
- **参考**：世界観別の職業プール（`occupationPools`）→ 職業・立場 95 種の新規作成時に参照。
- **移植しない**：女性名、姓（表示を簡潔にするため）、漢字神話データ・医療科学データ。

### chat-deco-workshop / tools-and-projects

- chat-deco-workshop：`index.html` のコピー・トースト・モバイル表示を参考にした（コード移植なし）。
- tools-and-projects：`app/data.ts` のツール登録形式を確認。**既存のまとめは更新していない**（作者の判断に委ねる）。

## 3. 新規制作したもの

美形アーキタイプ 112 種（10分類、各タイプに英語アンカーと好みの傾向）、年齢層5、容姿傾向5、体格9、世界観26、文化モチーフ22、髪型54、顔立ち28、目元26、衣装セット132、職業96、雰囲気22、表情22語、持ち物39、ポーズ40、背景47、おまかせスタイル19、制約付き抽選エンジン、5形式のプロンプト生成、UI一式。

## 4. ライセンス・出典表示

- 移植元はすべて同じ作者のリポジトリ。LoRA学習プロンプト工房のみ `LICENSE`（MIT）があり、移植した乱数関数に出典コメントを残した。他のリポジトリにはライセンスファイルがない（作者自身による再利用として扱った）。
- このリポジトリにはライセンスファイルを置いていない。公開範囲・ライセンスは作者が決める。
- JSONバックアップには出典（本ドキュメントへのリンク）を含める。

## 5. 競合した箇所と解消策

| 競合 | 解消 |
|---|---|
| 外見工房の年齢語（`young person` 等）と、男性指定が必要な本アプリ | 年齢は `young man`／`mature male`／`old man` で表し、単独の `adult` は使わない |
| 外見工房の髪型は長さと独立した多重選択 | 髪型1つ＋`lengths` の hard 制約に変更 |
| 衣装工房は部位を積み上げる設計（ガチャ1回で成立しにくい） | 一式コーディネート＋色プレースホルダーに再設計 |
| ポーズ工房は姿勢・腕・頭・視線を別々に選ぶ | 完成ポーズ65件にまとめ、`minShot`・`hands`・`gazeViewer`・`requires` で整合性を表現 |
| 背景工房の世界観5種と本アプリの世界観26種 | 背景候補に `worlds`（世界観IDまたはタグ）を新たに付与 |
| 獣人工房の Lv.4〜5 と美形アンカー | Lv.1〜3 のみ採用 |
| 色の命名：外見工房（髪・瞳）と衣装工房（服）で同名の色 | フィールドごとに辞書を分け、ID衝突を回避 |
