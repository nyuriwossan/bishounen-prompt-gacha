# 美青年錬成ガチャ｜辞書拡張・再構成成果物の実装引継ぎメモ

作成日：2026-10-22（JST）  
監査時の基準コミット：`854bdde922543a509a64418286222c5357fe4380`  
公開サイト：https://nyuriwossan.github.io/bishounen-prompt-gacha/  
GitHub：https://github.com/nyuriwossan/bishounen-prompt-gacha

## 重要：この一括ファイルの由来

**この6ファイルは、Deep Researchが以前表示したリンク先の原本を再添付したものではなく、当該報告書に基づいて新規に再構成した版です。**
元の `sandbox:/mnt/data/bishounen_deep_research_handoff_2026-10-22.zip` と各原本の実体は、今回アクセスできるチャット実行環境・検索対象ファイルライブラリから回収できませんでした。したがって**原本とのバイト同一性・全行の完全一致は保証しません。** 見かけの件数だけを合わせたダミーではなく、独立した名前・英語表現・説明を持つ394候補を記入していますが、個別語句やIDは再構成案です。

原調査の報告書の配分（既存フィールド292件／新規7フィールド102件）と25テーマという要件は再現・検証しています。各候補に `reconstruction: true` を明記。あくまで**実装前の選考・検証用データ**です。原本の全項目や判定は復元できません。

## このZIPの中身

- `expansion_candidates.csv`：Excel等で閲覧しやすい UTF-8 BOM の候補台帳（ヘッダー＋394行）。English欄は複数句を `; ` 区切り。
- `expansion_candidates.json`：394候補の構造化原本。`en` は英語句の配列、`compatibility` は hard / soft / requires を分離。
- `phase1_high_priority_draft.ts`：現行フィールドへの追加候補のみ **146件** の TypeScript 草案（直接のアプリ差し替えは非推奨）。
- `theme_sets.json`：25セット、候補ID参照と英語タグ・自然文の具体例。
- `candidate_allocation.csv`：24カテゴリの予定件数・実数・phase/priority配分・総計。
- `implementation_notes.md`：本ファイル。互換性と実装段階、注意事項。

## カテゴリ別件数

| FieldId案 | 日本語 | 件数 | 増築先 |
|---|---|---:|---|
| `archetype` | 美形タイプ | 24 | existing |
| `face` | 顔立ち | 26 | existing |
| `eyeShape` | 目元 | 16 | existing |
| `feature` | 特徴 | 14 | existing |
| `beard` | ひげ | 8 | existing |
| `build` | 体格 | 12 | existing |
| `hairStyle` | 髪型 | 26 | existing |
| `expression` | 表情 | 16 | existing |
| `vibe` | 雰囲気 | 10 | existing |
| `world` | 世界観 | 16 | existing |
| `occupation` | 職業 | 24 | existing |
| `outfit` | 衣装 | 28 | existing |
| `pose` | ポーズ | 24 | existing |
| `prop` | 持ち物 | 14 | existing |
| `scene` | 背景 | 22 | existing |
| `weather` | 時間・天候 | 6 | existing |
| `lighting` | 光 | 6 | existing |
| `ageCue` | 年齢を示す視覚要素 | 18 | new |
| `hairTexture` | 髪質 | 14 | new |
| `fringe` | 前髪・分け目 | 12 | new |
| `gaze` | 視線 | 14 | new |
| `headPose` | 頭部・首の向き | 12 | new |
| `outfitDetail` | 衣装の細部 | 20 | new |
| `fabric` | 素材・生地 | 12 | new |
| **TOTAL** | **総計** | **394** | **既存292・新規102** |

## 394候補のデータ列

`id` 一意な仮ID (`x_<category>_<key>`) ／ `ja` 日本語表示名 ／ `category` FieldId案 ／ `en` タグ候補配列 ／ `nat` 自然文候補 ／ `description` 狙い ／ `compatibility.requires` 前提 ／ `compatibility.hard_conflicts` 物理・構造矛盾候補 ／ `compatibility.soft_cautions` あえて許す意外性や注意点 ／ `delta_from_existing` 現状との差分 ／ `confidence` A/B/C（言語の明瞭度、**実機での成功保証ではない**） ／ `priority` high/medium/low ／ `phase` 1/2/3 ／ `source` ／ `source_urls` ／ `model_guidance`。

CSVとJSONには同じ394件を保存している。`en` / `nat` の再構成英文はすべて**PixAI SDXL / Tsubaki/DiT / NovelAI V5 / V4 の各モデルで未A/Bテスト**。PixAIの旧SDXL系は短いタグ、DiT系は読みやすい自然英文を優先するという方針は元報告書に基づくが、効果は実機比較で確認すること。

## 現行実装の保護条件（最優先）

1. `src/data/fields.ts`・`src/types/index.ts` にある現在の `FieldId` と `Option` を**まず読み直す**。今回の `category` は報告書に記された参照名であり、実際のキーが変化していたらマッピングする。
2. `src/engine/draw.ts` / `weights.ts` / `compat.ts` などの抽選・hard/soft判定を維持する。**固定済みフィールドを勝手に変えない**。整合不能時は既存の拒否挙動を踏襲する。
3. 現行辞書と `id` / normalized英語句 / 意味が重複しないか個別照合する。`x_` は仮IDの名前空間であり、本番登録前にコードから全ID衝突を再検査。
4. 「太い眉 × 柔らかな雰囲気」「中性的顔 × 筋骨隆々」「60歳以上 × 黒髪」は**softで許可**。絶対に一律禁止へ寄せない。
5. 一方、「閉眼 × viewerを見つめる」「ネクタイ無し × タイバー」「胸元が写らない × ポケットチーフ」「手が塞がったポーズ × 持ち物」等はhardまたは事前条件で扱う。
6. 世界観・文化モチーフを肌色・人種・顔貌と自動結合しない。現実文化への参照を正確に、架空世界は`-inspired`などを明記。
7. 年齢を18歳以上に限定。`ageCue` を新導入する場合、35～44／45～59／60+は一律で皺・銀髪・薄毛を強制せず、出現確率と相性を選ぶ。
8. `gaze`、`headPose` を追加する際は、既存 `pose` に埋め込まれた `looking at viewer` 等を整理しないと重複や矛盾になる。既存ポーズは残し、出力時の重複除去と互換レイヤーで扱う。
9. 既存お気に入り・履歴のIDを削除・改名しない。未知IDは保持して移行時にレポートする現行方式を維持。新FieldIdは旧保存データでデフォルトOFF/noneとし、開くだけで外見が変わる事故を防ぐ。
10. 同一seedの未来の再抽選結果は辞書増築で変わり得る。`DATA_VERSION` と保存データの取り扱いを明確化する。辞書除外ID方式では新候補が未除外として現れる点を通知。

## Phase 1｜追加のみ・低リスク

- このファイルと `phase1_high_priority_draft.ts` の 146件から、**現行の `Option` に対応し、明示的な矛盾を起こさないものだけを導入**。
- 顔部位・目元・成熟肌・髪型・体格・生活職・職人用服・動作・生活空間を優先。
- 各候補の `requires` と `hard_conflicts` は**説明的メタデータ**。現在のエンジンが文字列をそのまま理解するわけではない。現行 `lengths`、`minShot`、`hands`、`worlds`、`tags`、`prefs` 等の定義済みスキーマへレビュー後に翻訳。
- PixAI SDXLとDiT/Tsubaki、NovelAI V5とV4/V4.5の出力方式を、辞書重複作成より出力プロファイル側で分離する。既存プリセットの無条件置換は避け、互換性テストを追加。
- 変更前後で既存 seed・固定・保存の回帰テストを実行。辞書追加前後で全出力のバイト一致は要求しない。

## Phase 2｜重み・組合せ・安全な増築

- `prefs`で職業⇔服⇔小物⇔背景を結び、テーマセットを成立させる。例：建築家⇔設計図⇔設計事務所、木工職⇔工具⇔木工房。
- soft条件を維持しつつ、制約追加後の `stuck` 率を測定。既存4,200回サンプルで保持9件＝約0.21%という原調査の記録が基準値。
- normalized重複検査、`freeTags` のsemantic lint（警告優先）、光源⇔時刻、屋内⇔天候、文化⇔衣装を検査。
- `age × presentation × build × face × eyeShape × hairStyle × outfit × pose` の複合署名とShannon entropyで実効多様性を評価。

## Phase 3｜新FieldId 102候補の扱い

推奨導入順：`ageCue` (18) → `gaze` (14) + `headPose` (12) → `hairTexture` (14) + `fringe` (12) → `outfitDetail` (20) + `fabric` (12)。

- 旧お気に入りの新フィールドは既定OFF。明示的にユーザーが有効化するまで顔や髪に変更を加えない。
- 画角外の小物・表情・全身動作は出力しない。特に片目を覆う前髪、閉眼、俯き、横顔の相性を検証。
- UIは最初から24以上のカテゴリを全表示せず、「顔の細部」「髪の細部」「衣装の質感」等を折り畳み形式の任意セクションにする。
- 後続課題として顔の完全分割 `faceShape` / `jawChin` / `nose` / `brows` / `mouth` を検討。ただし今回の394候補にはこれら5フィールドの完全設計は含めていない。

## 推奨テスト

- CSV/JSONの件数：394、ID全件ユニーク、既存292・新規102、24カテゴリ、25テーマ、すべてのテーマIDがJSON内に存在する。
- 同カテゴリ内の英語表現の正規化重複ゼロ。カテゴリ間（例：featureとageCue）で意味近接があればレビュー対象として出す。
- 成人男性アンカーを最終出力から落とさない。`eyes closed` と `looking at viewer` は同時出力しない。
- 髪長×髪型、画角×ポーズ、required hands、屋内天候、文化衣装、主色と差し色、blindfold時の目の詳細を確認。
- ロック0/5/10/15件・3抽選モードの分布、保存・読込・共有URL・インポートの回帰を検証。
- 各年齢帯と容姿方向で100～200件程度の画像A/Bを実施し、年齢一致・識別性・美形維持・不自然さ・プロンプト一致度を人間が評価。

## 25テーマの取扱い

テーマには既存の1フィールドで2つの候補を同時適用したい場合や、職業に対して新世界観がない等の**未解決部分**が残る。`selected_option_ids` はあくまで材料の組合せ提案であって、「現在のアプリがそのまま同時選択可能」の保証ではない。`new_field_option_ids` もPhase 3までは直接使えない。`usage_note` と `compatibility_note` を必ず確認して実装すること。

## 原調査とモデル仕様への参照

- 原調査：『美青年錬成ガチャ｜既存システム分析・不足要素発掘・大規模辞書拡張調査』（2026-10-22）。現行候補1,727件、既存266件Vitest、202件ブラウザ検証、4,200回の抽選artifactは**調査レポートが引用した既存結果**であり、この再構成処理では再実行していない。
- NovelAI models：https://docs.novelai.net/en/image/models/
- NovelAI tags：https://docs.novelai.net/en/image/tags/
- NovelAI quality tags：https://docs.novelai.net/en/image/qualitytags/
- PixAI prompts：https://support.pixai.art/en/articles/11822794-general-guide-of-writing-prompts
- PixAI DiT prompts：https://blog.pixai.art/en/dit-model-prompt-writing-guide/

**この復元成果物ではソースコードの変更・コミット・デプロイを行っていない。**
