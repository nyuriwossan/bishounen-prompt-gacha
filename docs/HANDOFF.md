# 引き継ぎ資料（2026-10-14 更新）

新しい会話では、このファイルを最初に読んでから作業を始めてください。

## 1. 概要

| 項目 | 内容 |
|---|---|
| アプリ名 | 美青年錬成ガチャ 〜イケメンとの出会いは一期一会〜 |
| リポジトリ | `nyuriwossan/bishounen-prompt-gacha`（`main` が開発、`gh-pages` が公開物） |
| 公開URL | https://nyuriwossan.github.io/bishounen-prompt-gacha/ |
| 構成 | Vite 6 + TypeScript 5.8 + Preact 10.29.8／Vitest 3.2／playwright-core 1.56（`/opt/pw-browsers` の Chromium） |
| 公開方式 | `main` に push すると GitHub Actions が型検査・lint・テスト・ビルドを行い、`dist/` を `gh-pages` へ force-push する。Pages API はこの環境から使えないため、この方式にしている |
| 最新の変更 | 衣装の色◯の改善（案1＋3、§4）。iPhone 実機での確認はまだ。その前は `67f2a57` 候補選択シートの修正（実機確認済み） |
| git の作者 | `user.name nyuriwossan` / `user.email nyuriwo@gmail.com`（リポジトリのローカル設定） |

コミットメッセージの末尾には、次の2行を付けています。

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015Hxd36561ZqUmFyAM3FPr5
```

新しい会話では、セッションURLをその会話のものに差し替えてください。

## 2. 作業の流れ（変更するたびに実施）

```bash
npm run typecheck && npm run lint && npm test   # 132件、約45秒
npm run build
npm run test:browser                            # 83項目。docs/screenshots と browser-report.json も更新される
git add -A && git commit && git push origin main  # 公開は CI が自動で行う
```

- 作業用のデバッグスクリプトは `.dbg/` に置く（gitignore 済み）。
- 文書の再生成：`npm run report:examples`（EXAMPLES.md）、`npm run report:catalog`（DATA-CATALOG.md）。
- 公開確認：この環境からは github.io を開けない。`gh run list` と、`gh-pages` の配信ファイルのハッシュで確認する。

## 3. 構造の要点

### データ（`src/data/`）

| 項目 | 件数 |
|---|---:|
| 美形タイプ | 112 |
| 衣装 | 132 |
| 色 | 128 |
| 職業 | 96 |
| ポーズ | 65 |
| 背景 | 86 |
| 呼び名 | 224 |
| 世界観 | 26 |
| 文化 | 22 |
| おまかせスタイル | 19 |
| 獣人（種族） | 29 |

- 項目は全35（`FIELD_IDS`）。
- 項目の定義、抽選順、`DATA_VERSION`（`2026.10.1`）は `fields.ts` にある。
- 衣装のテンプレートでは `{c1}` をメインカラー、`{c2}` を差し色として扱う。

### 抽選（`src/engine/`）

- 乱数はシード付き：FNV-1a + mulberry32。
- 確率はおおまかに次の順で決まる。
  1. 好みによる重み付け（`weights.ts`）
  2. 群ごとの確率の下限（`shareBoosts` / `applyShares`）
  3. 裾切り（min-p と top-p）
  4. 直近の重複回避（段階的に緩める）
- 3モードの差（世界観に合う衣装の割合／美形タイプの好みに合う割合）：

| モード | 世界観に合う衣装 | 好みに合う項目 |
|---|---:|---:|
| まとまり重視（coherent） | 96.7% | 82.8% |
| バランス（balanced） | 86.7% | 39.6% |
| カオス（wild） | 40.0% | 5.5% |

### 組み合わせ制約（`src/advisor/`）

- `hard.ts`：両立しない組（髪の長さ×髪型、画角×ポーズ、同色の禁止など）と、`requires` による要求。
- `advisor.ts`：画面に出す注意。

### その他

- `src/prompts/build.ts`：5形式の出力（PixAI / NovelAI / 汎用タグ / 英語文 / 日本語）。
- `src/storage/storage.ts`：localStorage（`bpg:v1:*`）、JSON の書き出し・読み込み、共有URL（`#s=`）。
- `src/ui/`：
  - App.tsx：状態、戻す・進む
  - ForgeView.tsx：錬成画面、FieldRow
  - Picker.tsx：候補選択シート
  - PromptView / SavedView / HelpView
- 文書（`docs/`）：SOURCE-AUDIT・DATA-CATALOG・TEST-REPORT・EXAMPLES。

## 4. 解決済み：衣装の行にある色の◯（2026-10-14、案1＋3を実装）

ユーザーからの質問「衣装を変えても◯の色が変わらないのは仕様？」を受け、ユーザーの選択で案1＋3を入れた。案2（服を手で選んだら未固定の色を引き直す）は好みが分かれるため見送り。

- **案1**：衣装の行の下に、色を名前付きのチップで出す（「◯ メイン 漆黒」「◯ 差し色 深紅」）。タップでその色の候補シートが開く。固定中の色はチップの枠が金になり、錠前が付く。
  - `ForgeView.tsx` の FieldRow（`field === 'outfit'`）。CSS は `.fcolors` / `.cchip`。
- **案3**：その服・その画角で実際にプロンプトへ出る色だけチップを出す。
  - 判定は `build.ts` の `outfitColorUse(outfit, shotLevel)`。`outfitParts` も同じ内部関数（`visibleOutfitSegments`）を使うので、表示と出力がずれない。`shotLevelOf(state)` も共有。
  - 日本語表記（`スリーピーススーツ［漆黒×深紅］`）も同じ判定に揃えた。以前は画角に関係なく両色を書いていた。
  - 調査結果：顔アップ（level 0）では132件中129件で差し色が出ず、`white_shirt`・`bartender` はメインも出ない。`doctor_scrubs` は全画角で差し色なし。
- テスト：`prompts.test.ts` に判定の2件（全衣装×全画角で表示判定と出力タグ・日本語表記が一致）、ブラウザ検証に4項目（ラベル表示、タップで差し色の候補が開き反映、顔アップで差し色の◯が消える、顔アップの白シャツで◯なし）。スクリーンショット `outfit-colors-390.jpg`。

## 5. 既知の制限

- Safari/WebKit の自動検証は未実施。ただし、iPhone 実機でユーザーが候補シートの修正を確認済み。
- NAI / PixAI での生成結果の品質は、ユーザーの実地確認に頼っている。
  - 6枚生成して好評だった。
- 開発用依存に `npm audit` の指摘が残る（配信物は0件）。

## 6. これまでに作ったもの（会話内のみ・リポジトリ外）

- SNS告知用：ChatGPT 向けの「使い方説明画像」の指示書を2種類。
  - 1枚版
  - 5枚カルーセル版（共通ルール＋各画像の指示）
- 必要であれば、新しい会話で作り直せる。
