# 引き継ぎ資料（2026-10-15 更新）

新しい会話では、このファイルを最初に読んでから作業を始めてください。

## 1. 概要

| 項目 | 内容 |
|---|---|
| アプリ名 | 美青年錬成ガチャ 〜イケメンとの出会いは一期一会〜 |
| リポジトリ | `nyuriwossan/bishounen-prompt-gacha`（`main` が開発、`gh-pages` が公開物） |
| 公開URL | https://nyuriwossan.github.io/bishounen-prompt-gacha/ |
| 構成 | Vite 6 + TypeScript 5.8 + Preact 10.29.8／Vitest 3.2／playwright-core 1.56（`/opt/pw-browsers` の Chromium） |
| 公開方式 | `main` に push すると GitHub Actions が型検査・lint・テスト・ビルドを行い、`dist/` を `gh-pages` へ force-push する。Pages API はこの環境から使えないため、この方式にしている |
| 最新の変更 | 禁断の調合（アンリミテッドモード、§6）。その前に眼鏡・特徴・持ち物の既定OFFと現代・日常の系統（§5）。どちらも iPhone 実機での確認はまだ |
| git の作者 | `user.name nyuriwossan` / `user.email nyuriwo@gmail.com`（リポジトリのローカル設定） |

コミットメッセージの末尾には、次の2行を付けています。

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015Hxd36561ZqUmFyAM3FPr5
```

新しい会話では、セッションURLをその会話のものに差し替えてください。

## 2. 作業の流れ（変更するたびに実施）

```bash
npm run typecheck && npm run lint && npm test   # 174件、約105秒
npm run build
npm run test:browser                            # 95項目。docs/screenshots と browser-report.json も更新される
git add -A && git commit && git push origin main  # 公開は CI が自動で行う
```

- 作業用のデバッグスクリプトは `.dbg/` に置く（gitignore 済み）。
- 大量抽選テストは約75秒の同期処理なので、100回ごとに `setImmediate` で制御を返している。外すと CI で vitest の RPC タイムアウト（`Timeout calling "onTaskUpdate"`）になる。CI のログはこの環境から取れないので、失敗したら新しい clone で `CI=true npx vitest run` を試す。
- 文書の再生成：`npm run report:examples`（EXAMPLES.md）、`npm run report:catalog`（DATA-CATALOG.md）。
- 公開確認：この環境からは github.io を開けない。`gh run list` と、`gh-pages` の配信ファイルのハッシュで確認する。

## 3. 構造の要点

### データ（`src/data/`）

| 項目 | 件数 |
|---|---:|
| 美形タイプ | 124（11分類） |
| 衣装 | 142 |
| 色 | 128 |
| 職業 | 96 |
| ポーズ | 65 |
| 背景 | 94（うち囚われの場所8） |
| 呼び名 | 224 |
| 世界観 | 26 |
| 文化 | 22 |
| おまかせスタイル | 22（4分類＋完全ランダム）＋禁断5 |
| 獣人（種族） | 29 |

- 項目は全44（`FIELD_IDS`。うち9つが禁断の調合）。
- 項目の定義、抽選順、`DATA_VERSION`（`2026.10.4`）は `fields.ts` にある。
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
| まとまり重視（coherent） | 96.7% | 82.0% |
| バランス（balanced） | 86.9% | 43.5% |
| カオス（wild） | 41.0% | 7.6% |

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

## 4. 解決済み：衣装の行にある色の◯（2026-10-14、案1＋2＋3を実装）

ユーザーからの質問「衣装を変えても◯の色が変わらないのは仕様？」を受け、ユーザーの選択でまず案1＋3を入れ、実機で「どの服を選んでも色が同じ」と指摘を受けて、案2を線引きを変えて追加した。

- **案1**：衣装の行の下に、色を名前付きのチップで出す（「◯ メイン 漆黒」「◯ 差し色 深紅」）。タップでその色の候補シートが開く。固定中の色はチップの枠が金になり、錠前が付く。
  - `ForgeView.tsx` の FieldRow（`field === 'outfit'`）。CSS は `.fcolors` / `.cchip`。
- **案3**：その服・その画角で実際にプロンプトへ出る色だけチップを出す。
  - 判定は `build.ts` の `outfitColorUse(outfit, shotLevel)`。`outfitParts` も同じ内部関数（`visibleOutfitSegments`）を使うので、表示と出力がずれない。`shotLevelOf(state)` も共有。
  - 日本語表記（`スリーピーススーツ［漆黒×深紅］`）も同じ判定に揃えた。以前は画角に関係なく両色を書いていた。
  - 調査結果：顔アップ（level 0）では132件中129件で差し色が出ず、`white_shirt`・`bartender` はメインも出ない。`doctor_scrubs` は全画角で差し色なし。
- **案2（線引き版）**：衣装を手で選ぶ（`adopt`）か一覧から引く（`drawWithin`）と、**自動で出た色だけ**を新しい服に合わせて引き直す。固定した色と、手で選んだ色（`source: 'manual'`）は残す。
  - 判定は `draw.ts` の `followColors`。引き直しは通常の `draw` なので「衣装→色」の重み付けがそのまま効く。色だけ合わせられなかった場合は、色を変えずに採用する。
  - 通知：「自動で出た衣装の色を、選んだ服に合わせて引き直しました。」
- テスト：`engine.test.ts` に案2の3件、`prompts.test.ts` に判定の2件（全衣装×全画角で表示判定と出力タグ・日本語表記が一致）、ブラウザ検証に5項目（手で選ぶと色を引き直す通知、ラベル表示、タップで差し色の候補が開き反映、顔アップで差し色の◯が消える、顔アップの白シャツで◯なし）。スクリーンショット `outfit-colors-390.jpg`。

## 5. 2026-10-15 の変更：装飾の既定OFFと、現代・日常の系統

ユーザーの指摘「持ち物・眼鏡・装飾系の場所が分かりにくい」と、ChatGPT が書いた改修指示書（§2〜5、データ追加とスタイル分類）を実装した。指示書の §6「このタイプで錬成」と §7「分類を限定して引く」は、既存の「固定して錬成」や新しいおまかせスタイルと重なるため、触ってから要否を決めることにして**未実装**。

### 眼鏡・特徴・持ち物のスイッチ（既定OFF）
- 実測：変更前の既定では、眼鏡49%・特徴46%・持ち物67%の確率でプロンプトに入っていた（閉じた「詳細な調合」の中にあるのに）。
- `ForgeModules` に `glassesEnabled` / `marksEnabled` / `propEnabled`（既定 false）。トグルは「顔・肌・装身具」と「ポーズ・構図」。持ち物はポーズの出力がONのときだけ有効（`MODULE_PARENT`）。
- OFFの項目は `valuesOf` で「なし」として扱う（`OFF_AS_NONE`）。これで「眼鏡を押し上げる」「抜刀」「本を読む」など前提のあるポーズが出ない。以前は無効な項目の requires を判定せず素通りしていた。
- 手で選ぶとき：OFFの項目を前提にする候補は `checkAdopt().blockingOff` で選べなくし、「ONにすると選べます」と案内（勝手にONにしない）。
- ONにした直後は「なし」以外から引く（`fillModule`）。以降の錬成では「なし」も出る。
- 「眼鏡の知性派」は `glasses:!none` を hard 条件にした（眼鏡OFFでは自動抽選に出ない）。
- 保存の移行（`storage.ts`）：キーのない旧データは、お気に入り・履歴・JSON・共有URL（v=1）では値が「なし」以外ならON（見た目を保つ）、自動保存の現在の状態は新しい既定のOFF（固定中の値だけON）。共有URLは v=2 でフラグ g/x/o を追加。

### 現代・日常の系統
- 美形タイプの新分類 `contemporary`（現代・日常・ファッション）に12種：ダウナー系、アンニュイな色男、塩顔ミニマル、きれいめカジュアル、黒髪クール、柔らかなマッシュ系、ウルフヘアの気だるい美形、ジェンダーレス・モード、人懐っこい犬系、気まぐれな猫系、無造作な休日イケメン、大人の余裕カジュアル。職業は「指定しない」。英語アンカーには目・髪・表情の語を入れず（他項目と矛盾しないように）、具体的な見た目は prefs で各項目に振る。
- 名前に髪を含むタイプは hard 条件：黒髪クール＝髪色 `#black`、ウルフ＝`wolf_cut`＋`medium`、マッシュ＝`mash`＋`short`（髪の長さは髪型より先に引くので長さも条件にした）。大人の余裕カジュアルは年齢 25歳以上。
- 衣装の新分類 `daily`（日常着・きれいめ）に10種。チェーン・ネックレス・耳飾りは付けない。指示書の「開襟シャツ＋細いネックレス」は、この方針に合わせて「開襟シャツとTシャツ」にした。
- おまかせスタイル3種：現代・日常のイケメン／ダウナー・気だるい／きれいめカジュアル。全スタイルに `group`（contemporary / fantasy / beauty / looks）。画面では分類チップで切り替える（切り替えだけでは錬成しない）。
- エンジン：おまかせスタイルの条件と、まだ決まっていない項目への requires が両立しない候補を先に外す（`requiresFitPreset`。例：銀髪特集で黒髪クールを引かない）。
- `DATA_VERSION` を `2026.10.2` に上げた（候補の追加で同じシードの結果が変わるため）。

## 6. 2026-10-15 の変更：禁断の調合（アンリミテッドモード）

ChatGPT の指示書（立場・拘束具・拘束位置・固定先・締め方・目隠し・衣装の乱れ・衣装の状態・構図・表情）に、ユーザーの希望（リボン・触手・レースの目隠しなどの追加、`adult` は PixAI のアプリ版で弾かれるので出さない）を加えて実装した。参考：pose-composition-workshop の `data/restraint.js`・`generator.js`（拘束の句と安定化、首に巻かない・非流血）、outfit-prompt-workshop の `data/conditions.js`（状態の英語）・`data/styling.js`（着こなしと requiresFeature）。

- データ：`src/data/forbidden.ts`。項目は `role / restraint / bindPos / anchor / tightness / blindfold / disarray / wear1 / wear2`（group `forbidden`、module `unlimited`、既定OFF）。
  - 拘束具13種＋なし：縄・鎖・手錠・革ベルト・装飾鎖・ラッピングのリボン・絹の組紐・包帯・触手・影の触手・蔓草・薔薇の蔓（棘なし）・光の鎖。幻想系は `worlds` で世界観に寄せる。
  - 目隠し12種＋なし：布・革・リボン・レース・シルク・包帯・フード・片目・ベール・目元の仮面・伏し目・目を閉じる。
  - 拘束位置に「手に持つ・操る」を足し、「する側」はこれになる（触手などは controlling）。
  - 構図8種は POSE に `cat: 'bound'` で追加し、`requires: bindPos:…` で拘束位置と対応。表情7種は EXPRESSION に `cat: 'forbidden'` で追加し、`requires: role:#captive|#captor`。
  - 衣装の特徴タグ `f_shirt / f_collar / f_jacket / f_coat / f_hood / f_headwear / f_layered / f_sleeveless` を upper/lower の語から機械的に付与（`outfits.ts`）。着崩しはこれで判定。
- OFFの扱い：`OFF_AS_NONE` に9項目を追加。OFFなら判定・出力とも「なし」。大量抽選で漏れ0件を検査している。
- hard ルール（`hard.ts`）：拘束具と拘束位置、立場と拘束位置、拘束位置×ポーズ（手・姿勢）・画角・持ち物、固定先×拘束位置・ポーズ・画角、目隠し×眼鏡・眼帯・頭飾り・立場・視線の表情、着崩し×衣装の特徴（露出のある衣装は着崩さない）、状態×衣装（鎧は破れない・露出衣装に大きな破れを重ねない）、状態①②（②は①があるとき、濡れは1件、同じものは不可）。
- エンジン：禁断の連鎖（立場→拘束具→拘束位置→固定先→画角→ポーズ・持ち物）だけ1手先読み（`LOOKAHEAD`）。手動採用で直接の衝突項目だけで直せないときは、関連の関連まで広げてシードを変えて最大8回試す。
- 出力：目が隠れる目隠しと「目を閉じる」では、目元・瞳の色・目と視線の語（美形タイプ・顔立ち・表情・ポーズの英語、自然文の句も含む）を外す（`eyeSafe` / `eyeSafeNat`）。日本語設定の目元・瞳の行と説明文も伏せる。「伏し目」は視線の語だけ外し、目の色は残す。髪型の `hair over one eye` などは髪の描写なので残している。拘束時は `clean uninjured skin` と、ネガティブ（ONのとき）に `blood, wounds, bruises, restraints around neck` など。`adult`・`nsfw`・`bondage` などは出さない（大量抽選で検査）。
- UI：「禁断の調合（アンリミテッド）」のトグル。ONのときだけ9項目と「禁断演出だけ引き直す」（`GROUPS.forbidden`）を表示。共有URLのフラグ `u`。
- 追加（同日）：膝立ち4種・うつ伏せ3種の拘束構図（`BOUND_POSES` の `bind` は配列で複数の拘束位置に対応）、腹がちらりと見える着崩し3種（`f_top` が必要、「ずり上がる」は腕を上げるポーズ `arms_up` のときだけ）。頭上の拘束・固定具は屋内かシンプル背景だけ（`bind_scene` / `anchor_scene`）。衣装に鎖・ハーネス類（`f_chain` / `f_strap`）があると別の拘束具は選ばない（`restraint_outfit`）。ネガティブに選ばなかった素材（正の側に出ている語は除く）と、正の側に `one clear restraint setup`。先読みを着崩し・表情→ポーズにも広げ、ポーズが決まらない抽選を0にした。
- 追加（同日）：囚われの場所の背景8種（`scene.ts` の cat `captivity`、`requires: role:!none` で禁断ONのときだけ。触手の巣は触手のときだけ）。縛っている・囚われ側では出やすくする（`forbiddenScene`、世界観の一致は従来どおり優先）。モジュールをOFFにしたとき、OFFの項目を前提にしていた未固定の値を引き直す（`repairAfterModuleOff`）。`DATA_VERSION` 2026.10.4。
- 追加（同日）：おまかせスタイルの分類「禁断」に5種（囚われの王子・触手の森・鎖と地下牢・リボンの贈り物・支配する側。`group: 'forbidden'`）。画面では禁断ONのときだけ分類とスタイルを出し、OFFにすると選択も外す（`App.tsx` の useEffect）。先読みをスタイルの条件に合わせて判断するようにし（`leavesRoom` の preset）、衣装→拘束具も先読みに追加。禁断ONのときは「候補が少なめ」の通知を出さない。
- 画像での見え方（触手・リボンの巻き方など）は未確認。PixAI アプリ版で弾かれる語の一覧は公開されていないため、ユーザーの実機確認に頼る。

## 7. 既知の制限

- Safari/WebKit の自動検証は未実施。ただし、iPhone 実機でユーザーが候補シートの修正を確認済み。
- NAI / PixAI での生成結果の品質は、ユーザーの実地確認に頼っている。
  - 6枚生成して好評だった。
- 開発用依存に `npm audit` の指摘が残る（配信物は0件）。

## 8. これまでに作ったもの（会話内のみ・リポジトリ外）

- SNS告知用：ChatGPT 向けの「使い方説明画像」の指示書を2種類。
  - 1枚版
  - 5枚カルーセル版（共通ルール＋各画像の指示）
- 必要であれば、新しい会話で作り直せる。
