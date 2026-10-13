# 引き継ぎ資料（2026-10-14）

新しい会話では、このファイルを最初に読んでから作業を始めてください。

## 1. 概要

| 項目 | 内容 |
|---|---|
| アプリ名 | 美青年錬成ガチャ 〜イケメンとの出会いは一期一会〜 |
| リポジトリ | `nyuriwossan/bishounen-prompt-gacha`（`main` が開発、`gh-pages` が公開物） |
| 公開URL | https://nyuriwossan.github.io/bishounen-prompt-gacha/ |
| 構成 | Vite 6 + TypeScript 5.8 + Preact 10.29.8／Vitest 3.2／playwright-core 1.56（`/opt/pw-browsers` の Chromium） |
| 公開方式 | `main` に push すると GitHub Actions が型検査・lint・テスト・ビルドを行い、`dist/` を `gh-pages` へ force-push する。Pages API はこの環境から使えないため、この方式にしている |
| 最新コミット | `67f2a57` 候補選択シートの修正（iPhoneで×が隠れる問題）。ユーザーが実機で修正を確認済み |
| git の作者 | `user.name nyuriwossan` / `user.email nyuriwo@gmail.com`（リポジトリのローカル設定） |

コミットメッセージの末尾には、次の2行を付けています。

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014Vqw7hJivBoE4cqdqf2WEV
```

新しい会話では、セッションURLをその会話のものに差し替えてください。

## 2. 作業の流れ（変更するたびに実施）

```bash
npm run typecheck && npm run lint && npm test   # 130件、約60秒
npm run build
npm run test:browser                            # 79項目。docs/screenshots と browser-report.json も更新される
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

## 4. 未解決：衣装の行にある色の◯ふたつ

ユーザーからの質問：「衣装を変えても◯の色が変わらないのは仕様？」

### 回答済みの内容

- 2つの◯は、衣装メインカラー（`mainColor`）と差し色（`accentColor`）。
  - 表示しているのは `ForgeView.tsx` の FieldRow（`field === 'outfit'` の分岐）。
- 色は衣装とは別の項目。衣装を手動で選び直しても色は残る（意図した仕様）。
- 色ごと変える方法：
  - 「服だけ着せ替え」で、衣装と2色をまとめて引き直す（`GROUPS.outfit`）
  - 「詳細な調合 → 職業・雰囲気・色彩」で個別に選ぶ

### 改善案（ユーザーの返事待ち）

1. **◯に名前を付ける**
   - 「メイン・差し色」と小さく表示する。
   - ◯をタップすると、その色の候補シートが開くようにする案もある。
2. **服を手で選んだら、固定していない色を新しい服に合わせて引き直す**
   - 固定中の色は残す。
   - 「色を残したい」人もいるので、好みが分かれる。
3. **その服が実際に使う色だけ◯を出す**
   - 調査結果：132件中、`{c2}` を使わないのは `doctor_scrubs` の1件だけ。
   - `white_shirt` は差し色を下半身にしか使わない。寄りの画角では下半身を省くため、差し色がプロンプトに出ない。
   - そのため、画角も考慮して「実際にプロンプトへ出る色」で判定するのが正確。

推奨として伝えたのは「1 + 3」。2 は好みが分かれると伝えた。

### 実装時の注意

- 1 を入れる場合：ブラウザ検証に「◯のラベル表示」「タップで色の候補が開く」を追加する。
- 2 を入れる場合：手動採用（`adopt`）のあと、固定されていない `mainColor` / `accentColor` を `drawWithin` などで引き直す。
  - `engine.test.ts` に「固定した色は変わらない」「固定していない色は変わりうる」を追加する。
- 3 を入れる場合：`build.ts` の outfitParts と同じ判定（寄りの画角では下半身を省く）を共有関数にまとめ、表示と出力で判定がずれないようにする。

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
