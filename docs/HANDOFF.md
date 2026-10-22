# 引き継ぎ資料（2026-10-22 更新・大規模増築）

新しい会話では、このファイルを最初に読んでから作業を始めてください。

## 1. 概要

| 項目 | 内容 |
|---|---|
| アプリ名 | 美青年錬成ガチャ 〜イケメンとの出会いは一期一会〜 |
| リポジトリ | `nyuriwossan/bishounen-prompt-gacha`（`main` が開発、`gh-pages` が公開物） |
| 公開URL | https://nyuriwossan.github.io/bishounen-prompt-gacha/ |
| 構成 | Vite 6 + TypeScript 5.8 + Preact 10.29.8／Vitest 3.2／playwright-core 1.56（`/opt/pw-browsers` の Chromium） |
| 公開方式 | `main` に push すると GitHub Actions が型検査・lint・テスト・ビルドを行い、`dist/` を `gh-pages` へ force-push する。Pages API はこの環境から使えないため、この方式にしている |
| 最新の変更 | **2026-10 の大規模増築**（§7.8、辞書の版 `2026.10.13`）：任意の新項目7つ（年齢の表れ・髪質・前髪・視線・頭の向き・衣装の細部・素材、既定OFF）、Deep Research 394候補の監査と既存項目への267件の追加、PixAI・NovelAI のモデル別出力、辞書の更新のお知らせ。その前に履歴の上限を50件に戻した（§7.7 末尾、2026-10-22）。その前に人物の一括固定・衣装3案・元キャラ／派生の保存・履歴の整備（§7.7、2026-10-22）。その前に辞書・抽選設定（§7.6、2026-10-22）。その前にサービスワーカーのキャッシュ削除範囲の修正（§7.5、2026-10-21）。その前にコスプレ衣装（§7）。その前に禁断の調合（§6）、眼鏡・特徴・持ち物の既定OFFと現代・日常の系統（§5）。コスプレは PixAI アプリ版での確認がまだ |
| git の作者 | `user.name nyuriwossan` / `user.email nyuriwo@gmail.com`（リポジトリのローカル設定） |

コミットメッセージの末尾には、次の2行を付けています。

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012Yhr42sTTTR7JgwykFvQRm
```

新しい会話では、セッションURLをその会話のものに差し替えてください。

## 2. 作業の流れ（変更するたびに実施）

```bash
npm run typecheck && npm run lint && npm test   # 324件、約10分（大量抽選5,400回が約6分）
npm run build
npm run test:browser                            # 230項目。docs/screenshots と browser-report.json も更新される
git add -A && git commit && git push origin main  # 公開は CI が自動で行う
```

- 作業用のデバッグスクリプトは `.dbg/` に置く（gitignore 済み）。
- 大量抽選テストは長い同期処理なので、100回ごとに `setImmediate` で制御を返している。外すと CI で vitest の RPC タイムアウト（`Timeout calling "onTaskUpdate"`）になる。CI のログはこの環境から取れないので、失敗したら新しい clone で `CI=true npx vitest run` を試す。
- 文書の再生成：`npm run report:examples`（EXAMPLES.md）、`npm run report:catalog`（DATA-CATALOG.md）、`npm run report:verify`（禁断の実機確認セット）、`npm run report:verify-cosplay`（コスプレの実機確認セット）。
- 公開確認：この環境からは github.io を開けない。`gh run list` と、`gh-pages` の配信ファイルのハッシュで確認する。

## 3. 構造の要点

### データ（`src/data/`）

| 項目 | 件数 |
|---|---:|
| 美形タイプ | 145（13分類） |
| 衣装 | 174（うちコスプレ15） |
| 色 | 128 |
| 職業 | 113 |
| ポーズ | 92 |
| 背景 | 116（うち囚われの場所8） |
| 呼び名 | 224 |
| 世界観 | 42 |
| 文化 | 22 |
| おまかせスタイル | 25（4分類＋完全ランダム）＋禁断5 |
| 獣人（種族） | 29 |

- 項目は全51（`FIELD_IDS`。うち9つが禁断の調合、7つが 2026-10 増築の任意項目）。辞書の候補は全2,002件。
- 項目の定義、抽選順、`DATA_VERSION`（`2026.10.13`）は `fields.ts` にある。2026-10 増築で足した候補には `since: '2026.10.13'`（`helpers.ts` の `added()`）。
- 衣装のテンプレートでは `{c1}` をメインカラー、`{c2}` を差し色として扱う。

### 抽選（`src/engine/`）

- 乱数はシード付き：FNV-1a + mulberry32。
- 確率はおおまかに次の順で決まる。
  1. 好みによる重み付け（`weights.ts`）
  2. 群ごとの確率の下限（`shareBoosts` / `applyShares`）
  3. 裾切り（min-p と top-p）
  4. 直近の重複回避（段階的に緩める）
- 3モードの差（世界観に合う衣装の割合／美形タイプの好みに合う割合。おまかせスタイルなし・コスプレOFFの各44件）：

| モード | 世界観に合う衣装 | 好みに合う項目 |
|---|---:|---:|
| まとまり重視（coherent） | 95.5% | 83.0% |
| バランス（balanced） | 86.4% | 47.9% |
| カオス（wild） | 36.4% | 7.2% |

### 組み合わせ制約（`src/advisor/`）

- `hard.ts`：両立しない組（髪の長さ×髪型、画角×ポーズ、同色の禁止など）と、`requires` による要求。
- `advisor.ts`：画面に出す注意。

### その他

- `src/prompts/build.ts`：5形式の出力（PixAI / NovelAI / 汎用タグ / 英語文 / 日本語）。
- `src/storage/storage.ts`：localStorage（`bpg:v1:*`）、JSON の書き出し・読み込み、共有URL（`#s=`）。辞書・抽選設定は `bpg:v1:drawPrefs`（§7.6）。
- `src/engine/person.ts`：人物の一括固定（§7.7）。`src/engine/wardrobe.ts`：衣装3案（§7.7）。
- `src/engine/prefs.ts`：辞書・抽選設定（候補の除外・項目のOFF）。エンジンはモジュール内の現在値を参照する（`setDrawPrefs`）。
- `src/ui/`：
  - App.tsx：状態、戻す・進む
  - ForgeView.tsx：錬成画面、FieldRow
  - Picker.tsx：候補選択シート
  - PromptView / SavedView / HelpView / DictView（辞書・抽選設定）/ WardrobeSheet（衣装3案）
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
- 追加（同日）：実機確認セット `npm run report:verify`（`scripts/verify-set.ts` → `docs/VERIFY-SET.md` と `docs/test-artifacts/verify-set.json`）。20例を固定＋シードで再現し、共有URL・PixAIタグ・ネガティブ・確かめる点を出す。ユーザー向けのチェックリストは claude.ai のアーティファクト（会話内）。作成時の見直しで、触手・蔓・光の鎖は固定先なし（`restraint_anchor`）、うつ伏せは壁・柱に固定しない、手錠の締め方は「しっかり」だけ（`restraint_tightness`）、衣装の鎖と一緒に出せるのは鎖・装飾鎖だけ、を追加。
- 実機確認1回目（PixAI SDXL、ネガティブなし）：20例中OK 5。主因は (1) ポーズ構図工房由来の長い英語の句がタグ形式では効かない、(2) 素材を問わない「bound」が縄を呼ぶ、(3) captive / dominant が相手役を呼ぶ（人物が2人に分裂）。対応：タグ形式は danbooru 風の短いタグ（`forbidden.ts` の `materialTags` / `BIND_TAGS` / `BLIND_TAGS` / `ANCHOR_TAGS` / `heldTags`）にし、長い句は自然な英文だけに残す。縄・組紐以外では bound を使わない。立場の語はタグ形式に出さない。囚われの場所に `indoors` と固有の世界観ID、うつ伏せ×寝室は `on bed`、項垂れるポーズは視線の語を外す、フード×冠の髪型を禁止、柱×壁にもたれるを禁止。「下のボタンが外れて腹がのぞく」は SDXL で描けず `midriff_peek` へ統合（`ID_RENAMES`）。`DATA_VERSION` 2026.10.5。モジュールの説明にネガティブ併用を案内。
- 実機確認2回目：判定19例中OK 12。対応：肘掛けは `armchair, hands on armrests`、うつ伏せは `on stomach, lying on stomach, prone` で下からのアングルを禁止（`prone_angle`）、足首だけのときは `restrained` を出さずネガティブに `bound wrists`、鳥籠は `in cage, caged, inside giant birdcage`、光の鎖×魔法陣の祭壇を禁止、手錠を持つは `open handcuffs, handcuffs in hand`＋ネガティブに `bound wrists, handcuffed`、`chained to wall/pillar` は鎖・装飾鎖のときだけ。持ち物を前提にするポーズは拘束中に出さない。表情：拘束される側（される側だけの立場、または実際に縛られている）は喜んだ表情を出さない（`JOYFUL_EXPRESSIONS`）、する側だけの立場は愉悦の笑みに限る（`PLEASURE_EXPRESSIONS`、新表情「愉悦の笑み」「嬉しそうに見下ろす笑み」）。壁に鎖でつなぐ描写は SDXL では難しいまま。`DATA_VERSION` 2026.10.6。
- 実機確認3回目（ネガティブあり）：20例中OK 17。対応：肘掛けは「しっかり固定」だけ（`armrest_tightness`）で、素材ごとに `strapped to chair, wrist cuffs` / `tied to chair` などを足す（`ARMREST_TAGS`）。フードは `hood up, hood over eyes, shaded face`（`covered eyes` が布の目隠しを呼んだ）＋ネガティブに `blindfold`、下から煽るアングルを禁止（`hood_angle`）。前で縛った膝立ちは `hands on lap` をやめ `upright kneeling, own hands together`。触手・蔓・光の鎖を操るときは両手が空くか手を外へ向けるポーズに限り（`held_summoned_pose`）、胸上より引き、`outstretched hand` を足す。影の触手は `black tentacles`（`shadow` が触手を消した）。後ろ手のうつ伏せは `head turned, sideways glance`。縄で手首を縛るときはネガティブに `rope belt`、足首だけのときは `bracelet`。する側だけの立場は鳥籠・座敷牢（`in cage`）に入れない（`role_cage`）。確認ページは再確認3例＋任意3例に絞る表示を追加。`DATA_VERSION` 2026.10.7。
- 実機確認4回目：V04（革ベルトが出ない）・V11（包帯が手首を縛らない）・V20（影の触手が出ない）が残った。対応：タグ形式では禁断演出のタグを `1boy, solo, male focus` の直後へ移し、素材のタグを拘束位置のタグより先にした（強調ONなら最初の素材タグも強調）。包帯は `bound wrists` を使ってよい素材に加え、`bandages, bandaged wrist, bound wrists`。肘掛け×革ベルトに `leather cuffs`。`DATA_VERSION` 2026.10.8。
- 実機確認5回目：V20 OK。V04・V11 は固定されず、V12（触手×夜の誘惑者）がアプリで弾かれた。対応：禁断の調合ONのタグ形式は「人物 → ポーズ・構図 → 禁断演出 → 顔・髪・衣装 → 背景」の順（ユーザー提案：構図を先頭に）。拘束具の要のタグ（`keyTags`：最初の素材タグ、`bound …`、`… to chair`、`leather cuffs`、前で縛るときの `own hands together`）に、強調の設定にかかわらず重みを付ける（PixAI `(tag:1.2)`、NovelAI `{tag}`、汎用タグは付けない）。触手・影の触手で縛るときだけは、禁断演出を衣装の後ろに置き、重みを付けず、`alluring / seductive / provocative` などの語をタグ形式から外す（`calm`）。前で縛るときは `own hands together`。`DATA_VERSION` 2026.10.9。
- 実機確認6回目：V01・V12・V15・V20 OK（V20 は2回に1回触手が出ないが、ユーザー判断でここまで）。V04 はユーザーの希望で、拘束位置「椅子の肘掛け（armrests）」を廃止し「椅子の背もたれに縛りつける（chair_back）」へ置き換え（縄・組紐だけ、固定先は椅子、しっかり固定。タグ `rope, bound torso, bound arms, tied to chair, chair, arms behind back`。保存・共有URLの armrests は chair_back へ読み替え）。フード：見上げるポーズを禁止（`hood_pose`）、タグ形式で `looking …` / `sideways glance` を外す、`hood over eyes` を `hood pulled low` に（「eyes」の語で目が描かれる懸念）。`DATA_VERSION` 2026.10.10。
- 実機確認7回目：V04 は背もたれが低い椅子で描かれたため `chair` を `high-back chair` に。V11 は包帯が手首に巻かれるだけで縛れず、ユーザーの判断で「包帯で手首を縛る」をやめ、包帯は「腕と胴体」だけ（`restraint_bind`）。確認セットの V11 は縄に変更。フードは陰になるが目は見えることがある（SDXL の限界の可能性。未解決）。抽選の修復（`adopt`）は、関連の関連で組めないとき、もう一段だけ広げる（服のずり上がり → ポーズ → 拘束位置 → 拘束具・立場）。`DATA_VERSION` 2026.10.11。
- 実機確認8回目：V11 OK（フードの陰でも目が見えるのは、ユーザー判断で許容）。V04 は背もたれの長さが描けないため、胸ではなく腰を縄で椅子に縛りつける形へ（ユーザー案。`chair_back` の id はそのまま、タグ `rope, rope around waist, tied to chair, chair, arms behind back`、この形ではネガティブに `rope belt` を入れない）。`DATA_VERSION` 2026.10.12。
- ユーザーの所見：PixAI の SDXL でも、モデルによって拘束が描けるかどうかが変わる。確認結果はモデル依存。
- 画像での見え方（触手・リボンの巻き方など）は未確認。PixAI アプリ版で弾かれる語の一覧は公開されていないため、ユーザーの実機確認に頼る。

## 7. 2026-10-15 の変更：コスプレ衣装

ユーザーの要望（メイド服・男性用ビキニ・ミニスカナース・セーラー服、逆バニー・ミニスカチャイナ・ミニスカポリス・ミニスカサンタ）に、Manus の案（バニーボーイ・水着と開襟シャツ・ハーネスと開襟シャツ・バレエダンサー・サーカス団長・チアリーダー）から選んで加えた。置き場所はユーザーの選択で「新しい分類＋専用スイッチ、ONなら100%コスプレ枠」。

- ユーザーの実機確認（実装前）：PixAI アプリ版で、男性に女性用の `bikini` / `string bikini` を着せても「センシティブ」判定で通った。
- データ：`outfits.ts` の cat `cosplay` に15種（当初16種。バレエダンサーは実機確認1回目で描けず、ユーザー判断で廃止）。`worlds` は空（世界観を問わず重み中立）、`w` はすべて1。露出の多いもの（ビキニ・紐ビキニ・水着・バニー・逆バニー・チア）は `exposed`（着崩し・大きな破れを重ねない）。兎耳の衣装は特徴タグ `f_ears`（`bunny ears` から自動付与）。セーラー服は `no_forbidden`。
  - 語の方針：`male maid` を使う。セーラー服は `school` / `serafuku` を使わず `sailor collar blouse, neckerchief, pleated skirt`。逆バニーは股間の露出でアプリ版の判定が上がらないよう `{c2} briefs` を足した（未確認）。`nsfw / nude / shirtless / lingerie` などは使わない（`data.test.ts` で検査）。性別はタグの `1boy, solo, male focus` とネガティブの `1girl, female, breasts` で保つ。
- スイッチ：`ForgeModules.cosplayEnabled`（既定 false、ModuleId `cosplay`、項目を持たないモジュール）。画面は詳細な調合の「コスプレ衣装（任意）」。共有URLのフラグ `y`。記録のない保存データ・共有URLは、衣装がコスプレならON（`storage.ts`）。
- エンジン（`draw.ts` の `outfitPool`）：
  - OFF：コスプレ衣装は抽選・一覧から引く・手で選ぶ、のどれにも出ない（`checkAdopt().blockingCosplay`、候補シートでは「コスプレ」の分類チップも隠す）。
  - ON：自動の抽選はコスプレ枠だけ。おまかせスタイルの衣装の条件は無視する（コスプレ優先）。獣人ONでは `f_ears`、禁断ONでは `no_forbidden` を自動の抽選から外す。固定中の項目と両立するコスプレ衣装がなければ通常の衣装から選び、通知する（例：着崩し「コートの前を開ける」を固定）。
  - ONでも、通常の衣装は手で選べ、「この中から引く」は一覧に従う。
  - ONにした直後は未固定の衣装と自動の色を引き直す（`fillModule`）。OFFにすると未固定のコスプレ衣装を通常の衣装へ戻す（`repairAfterModuleOff`）。固定中の衣装は変えない。
- hard（`hard.ts`）：`outfit_ears_kemono`（衣装の兎耳×獣人の耳）、`outfit_no_forbidden_{role,restraint,blindfold,disarray,wear1}`（セーラー服×禁断演出）。
- `DATA_VERSION` は据え置き（2026.10.12）。OFFの抽選はコスプレ衣装を候補から外すので、同じシードの結果が変わらない。EXAMPLES.md・VERIFY-SET.md の再生成で差分なしを確認済み。
- テスト：engine 8件、storage 1件、data 1件（通常の衣装に水着・兎耳を入れない検査はコスプレ以外に限定）、mass-draw に条件「コスプレON」（漏れ・ON時にコスプレ以外・兎耳×獣人・セーラー服×禁断を検査）、ブラウザ4項目。スクリーンショット `cosplay-outfit-390.jpg`。

- 実機確認1回目（PixAI アプリ版、19例判定）：OK 12、要修正 7、弾かれた 0。逆バニー・バニーボーイ・ビキニ・紐ビキニ・チアは弾かれず、ミニスカメイド×女性的な美形も女性化しなかった。対応：
  - 衣装ごとのネガティブ `Option.neg`（`build.ts` でネガティブONのとき足す。正の側に同じ語があれば足さない）。ミニスカ5種に `long skirt`、ビキニに `swim trunks, male swimwear, loincloth, tribal`（筋肉質×ビキニが民族衣装風になった）、紐ビキニに `swim trunks, male swimwear, shorts`（下が海パンになった）、チャイナに `long dress, long skirt, long sleeves`。
  - セーラー服をミニ丈に（名前「ミニスカセーラー服」、`pleated miniskirt`）。チャイナはノースリーブ＋`short dress`（長い丈になった）。ビキニに `swimsuit`、紐ビキニの下を `side-tie bikini bottom`。
  - hard：衣装のリボン（特徴タグ `f_ribbon`。メイド2種・道袍）×拘束具のリボン（メイド×リボンで手首に巻けたのが1/4）、警官の衣装（タグ `police`）×手錠（手に持つ手錠が2つになり1つが自分に掛かった）。どちらも `restraint_outfit` に追加。
  - バレエダンサー（`ballet_dancer`）を削除。保存データ・共有URLに残っていれば、辞書から消えた候補として引き直される。`DATA_VERSION` は据え置き（OFFの抽選・禁断の確認セット・EXAMPLES は再生成で差分なし）。
  - 確認セットは2回目（再確認 C04・C06・C07・C12・C18・C19・C20、余裕があれば未判定の C02）。C19 は組紐、C20 は鎖を手に持つ形に変更。
- 実機確認2回目（ネガティブなし）：C02・C04・C06・C07・C12・C19・C20 OK。効いたのは正の側のタグの修正（ミニ丈・紐ビキニの下を明示など）。C18（筋肉質の成熟した美形×ビキニ）は2回とも民族衣装・腰布風になった。ユーザーの見立ては SDXL の限界。ネガティブの `loincloth, tribal` はまだ試していない。

## 7.5 2026-10-21 の修正：サービスワーカーが他アプリのキャッシュを消していた

- 不具合：`public/sw.js` の activate が「自分のキャッシュ以外をすべて削除」していた。Cache Storage はオリジン（`nyuriwossan.github.io`）全体で共有されるため、同じオリジンの他の自作アプリ（font-logo-workshop の Workbox キャッシュなど）のオフライン用キャッシュまで消え、そのアプリは次にオンラインで開くまでオフライン起動できなくなっていた。fetch も `caches.match`（オリジン全体の検索）で、他アプリのキャッシュから返す可能性があった。
- 修正：キャッシュ名を `PREFIX = 'bpg-'` ＋版（`CACHE = PREFIX + 'v2'`）にした。activate は「`bpg-` で始まり、`CACHE` と異なるもの」だけを削除する。fetch のキャッシュ参照（オフライン時の `./index.html` フォールバックを含む）は `caches.open(CACHE)` 経由で自分のキャッシュだけを見る。HTML はネットワーク優先・その他はキャッシュ優先・同一オリジンの GET だけ、は変えていない。
- 運用ルール：**キャッシュ名は必ず `bpg-` で始める。中身を変えたら版を上げる**（`bpg-v2` → `bpg-v3`）。版を上げると、古い `bpg-` の版は次の activate で片付く。`bpg-` 以外の名前を作ったり消したりしない。localStorage の `bpg:v1:*` とは別物。
- テスト：`tests/sw.test.ts`（10件。sw.js を node:vm で偽の Cache Storage 上に読み込んで install・activate・fetch を発火）と、ブラウザ検証の6項目（実際の Chromium で他アプリのキャッシュを作ってから activate、オフライン再読み込み、未保存URLのフォールバック）。どちらも修正前の sw.js で失敗することを確認済み。
- 既に修正前の版で消されたキャッシュは戻せない。消された側のアプリは、オンラインで一度開けば元に戻る。
- 他の自作アプリ（同じオリジン）の sw.js が同じ書き方をしていないかは未確認。同じ書き方なら、こちらの `bpg-v2` が消される側になる。

## 7.6 2026-10-22 の変更：辞書・抽選設定

ユーザーの依頼書（`bishounen-gacha-dictionary-settings-claude-spec.md`、会話に添付）を実装した。ヘルプにあった辞書件数の表を「辞書・抽選設定」画面（`src/ui/DictView.tsx`、App の tab `dict`。下部タブは増やしていない）へ移し、設定できる一覧にした。入口は錬成画面の「辞書・抽選設定」（設定ありなら「好み設定あり：…」の要約と「設定を開く」）、ヘルプのボタン、成立しなかった抽選のシート。

- **データの持ち方**（`src/engine/prefs.ts`）：`DrawPrefs = { version, excluded: {項目: 除外ID[]}, disabled: 項目[] }`。候補は既存の `id` で管理し、除外IDだけを保存（辞書に足した候補は自動で抽選対象）。ForgeState には入れない → 戻す／進む・お気に入り・履歴・共有URLの対象外。保存キーは `bpg:v1:drawPrefs`（`KEYS` とは別。「保存データをすべて削除」では消えない）。改名IDは `ID_RENAMES` で読み替え、未知IDは保持するが数えない。形が壊れていれば設定だけ初期化。
- **項目のOFF**：モジュールのない項目だけ `disabled` に持つ（`OFFABLE_FIELDS`。17項目）。眼鏡・背景・獣人・禁断などは既存の `optionalModules` のスイッチを共有（画面の説明つき。切り替えの動きも既存のまま＝ONで補充・OFFで依存値の修復）。年齢層・美形タイプ・構図は必須でスイッチなし（`REQUIRED_FIELDS`）。画風は自動抽選しないので除外設定なし。衣装OFFに連動して衣装の色・文化の意匠・着崩し・衣装の状態もOFF（`DISABLED_WITH`。文化の意匠は衣装のタグ欄に出るため、テストで漏れを見つけて追加）。
- **OFFの仕組み**：`isActive` の先頭で `isPrefOff` を見る。これで抽選対象（`drawableFields`）・判定（`valuesOf` は OFF_AS_NONE の項目なら「なし」、他は欠落）・出力（5形式・日本語・Markdown・タイトル・ラベル）が既存の経路でそろう。`build.ts` は既定の語（short hair・loose hair・a balanced build・表情「—」など）で埋めないよう、OFFのときだけ別の組み立てにした（未設定の出力は不変）。OFFの項目を前提にする候補（髪の色OFFの黒髪クール、衣装OFFのネクタイを緩める）は自動の抽選に出さず、手でも選べない（`requiresOffFields` → `checkAdopt().blockingOff`）。
- **除外の適用**（`draw.ts`）：`pickFor` の候補集合を `poolFor` に分け、最初に `allowedOf`（除外とOFF前提を外す）。先読み（`leavesRoom`）・`requiresFitPreset`・コスプレ枠（`outfitPool`）も除外後の集合で判断する。手で選ぶ（`adopt`）は除外を無視、「この中から引く」（`drawWithin`）は自動の抽選なので除外を適用。
- **成立しないとき**：`draw` の先頭で `prefsPrecheck`（対象項目の抽選対象が0件 → `prefsKind: 'zero'`、おまかせスタイルの条件に合う候補をすべて除外 → `'preset'`。画面でも `presetPrefsConflicts` で実行前に説明）。抽選中に候補が尽き、除外がなければ候補があった場合は `'stuck'`（原因の固定項目を挙げる）。どれも `ok:false`・`state` は入力のまま・`recent` も入力のまま → 履歴に積まず、部分的な変更も残らない。除外と無関係に行き詰まった項目は従来どおり（元の値を保って通知）。コスプレONで両立するコスプレ衣装を全部除外しているときは、通常の衣装へ逃がさない。
- **未設定では従来と同じ**：作業中に 3モード×40ケース（全体・各グループ・手動採用・一覧から引く・ONの補充・5形式・Markdown）の出力を変更前後で比較し、完全一致を確認。EXAMPLES・DATA-CATALOG・VERIFY-SET・VERIFY-COSPLAY の再生成も差分なし。`DATA_VERSION` は据え置き。
- **JSON**：全データJSONに `drawPrefs` を追加。読み込みは、設定を含むファイルのときだけ「抽選設定も復元する」（初期OFF）を確認し、選んだときだけ置き換える（`importBackup` 自体は保存しない）。古いJSONはそのまま読める。
- テスト：`tests/prefs.test.ts`（33件。900回の大量抽選で全経路の漏れ0、1件だけ許可した候補集合での確定、直近回避の緩和、コスプレ、固定との関係、0件・固定衝突・スタイル衝突・一覧から引くの取り消し、手動選択、OFFの出力と復帰、衣装OFFの連動、複合タグの漏れ、保存・壊れたデータ・改名・未知ID、JSON・共有URL）。ブラウザ検証に48項目（`2c`・`2d` と保存失敗）。スクリーンショット `dict-390.jpg`・`dict-outfit-390.jpg`・`forge-prefs-390.jpg`。
- 未対応・残り：除外が原因かどうかを判定しているのは「候補が尽きた項目」まで。修復段階（全体検査）で組めなかった場合は従来のメッセージに「除外が影響している可能性があります」を添えるだけ。Safari 実機での操作確認は未実施。

## 7.7 2026-10-22 の変更：人物の一括固定・衣装3案・元キャラ／派生・履歴の整備

ユーザーの依頼書（`bishounen-gacha-character-wardrobe-history-claude-spec.md`、会話に添付）を実装した。下部タブは増やさず、錬成画面と保存画面を拡張した。

- **履歴（`storage.ts`）**：`MAX_HISTORY` を一度 50 → 10 にした（同日に50へ戻した。この節の末尾を参照）。記録は `recordHistory(prev, next, titleOf)` だけが行う。置き換える前の結果が最新の履歴と違えば先に退避し（最初の結果・手で選んだ結果を失わない）、最新と同じ結果は追加しない。同じ結果の判定 `sameResult` は項目の値と任意モードだけ（鍵・出所・シードは比べない）。
  - 記録する：`App.tsx` の `handleOutcome(r, { kind: 'draw' })`（全体・方向性・部分・サイコロ・スタイル・この中から引く・関連の引き直し・固定を外して錬成）と、衣装3案の採用。
  - 記録しない：手で選ぶ（`kind: 'manual'`）、任意スイッチの切り替え、呼び出し、戻す／進む、失敗。
  - 旧データ（10件超）は起動時の `migrateHistory()` で11件目以降を `bpg:v1:historyLegacy`（以前の履歴、上限100）へ移す。以前の履歴を先に書き、成功したときだけ通常の履歴を縮める。保存画面の「以前の履歴」から、書き出し・お気に入り保存・削除ができる。
- **人物の一括固定（`engine/person.ts`）**：`PERSON_FIELDS`（18項目）のうち、`isActive` で値のある項目に既存の鍵を掛けるだけ。別の固定情報は持たないので食い違わない。OFFの項目には掛けない（ONにしたとき補充されなくなるのを防ぐ）。「固定する項目を調整」は各項目の鍵を直接切り替える。世界観・職業・呼び名（`PERSON_EXTRA_FIELDS`）はここで足せる。専用の一括解除は作らず、戻す／進むと個別の鍵で調整する（依頼書が許容した形）。「ロック全解除」の意味は変えていない。
- **衣装3案（`engine/wardrobe.ts`・`ui/WardrobeSheet.tsx`）**：`draw` を `targets: outfit＋未固定の色` に絞って使う（抽選モード・除外・OFF・hard・コスプレ／禁断の状態がそのまま効き、他の項目は変えない）。`DrawOptions.avoid` で今の衣装と出した衣装を避け、衣装違いを優先する。足りなければ、出力される色だけの色違いで補う（`colorOnly`。カードに「色違い」）。重複は見た目のキー（衣装＋その画角で出る色）で判定。試行は最大8回。プレビュー専用のシード（`wardrobe|lastSeed|drawCount|回数`）を使い、状態・直近履歴・保存には触れない。採用時は `canAdoptCard` で作成時の版（値・鍵・任意モード・抽選モード・辞書・抽選設定）と比べ、違えば古い案として拒否する。`applyCard` は衣装と色だけを反映し、錬成番号を1つ進め、履歴に1件記録する。
- **元キャラ／派生（`storage.ts`・`SavedView.tsx`）**：`SavedForge.rootId`（ルートの元キャラID）を追加。派生から派生を作ってもルートへ紐づく。派生は state に全設定を持つ。元を削除すると、派生の rootId を外して独立した保存にする。元が見つからない rootId は読み込み時に外す。`saveFavoritePair` は空き2件を確認してから1回で書く（片方だけにならない）。
  - 着せ替えの元は `WardrobeSession`（`bpg:v1:wardrobe`）に保存する。お気に入りの「呼び出す」と「この人物で着せ替え」で、その保存が元になる。未登録なら「衣装を3案見る」を開いた時点の結果が元になる。人物の項目が変わる抽選をすると外れる。手で選んだだけでは外れない。
  - 既存の「別衣装版」は派生として保存するようにした（二重実装を避けた）。
- **JSON**：全データに `rootId`・`historyLegacy` が入る。お気に入りは、同じIDで同じ内容ならスキップし、内容が違えば新しいIDを振って同じファイル内の参照を付け替える。履歴は「履歴も復元する」（初期OFF）のときだけ取り込む。ID重複を除いて日時順に統合し、直近10件より前は以前の履歴へ入れる。**以前は読み込みのたびに履歴を無条件で統合していたが、選んだときだけに変えた。**
- テスト：`tests/wardrobe.test.ts`（26件）。ブラウザ検証に48項目（2e と、失敗した抽選で履歴が増えない確認）。スクリーンショット `wardrobe-390.jpg`・`wardrobe-320.jpg`。
- **履歴の上限を50件に戻した（同日、9f47267 の後）**：依頼書どおり10件にしたが、ユーザーから「前は50件見られた。戻したほうがいい」と指摘があり、`MAX_HISTORY` を50に戻した。退避・重複判定・記録する経路は10件版のまま。
  - 10件版（9f47267）を開いた利用者は、11〜50件目が以前の履歴へ移っている。`migrateHistory()` を「通常と以前の履歴を新しい順に並べ直し、通常に50件・残りを以前の履歴へ」に変え、起動時に通常の履歴へ戻すようにした。戻した件数を `restored` として返し、通知も出す。
  - 書き込みは増える側を先に行うので、途中で失敗しても消えない。以前の履歴は、50件を超えた分（JSON読込のはみ出しなど）の置き場として残している。
- 未確認：iPhone/Safari 実機。開いた案が古くなる状況は、シートが開いている間は画面操作できないため、ブラウザではなく単体テスト（`canAdoptCard`）で確かめた。

## 7.8 2026-10 の大規模増築（辞書の版 `2026.10.13`）

詳しくは [EXPANSION-IMPLEMENTATION.md](EXPANSION-IMPLEMENTATION.md)（実装）と [EXPANSION-AUDIT.md](EXPANSION-AUDIT.md)（394候補の採否・テーマ25件）。ここには、次に触る人が知っておくべきことだけを書く。

- **保存互換のゴールデン**：`tests/fixtures/legacy-2026.10.12.json.gz`（増築前のコードで作った180通りの状態と5形式の出力）。`tests/legacy-compat.test.ts` がこれと1文字でも違えば落ちる。既存の候補の `en`・`nat`・出力の組み立てを変えるときは、旧データの見え方が変わることを意味するので、変える理由をはっきりさせてから fixture を作り直す（`scripts/expansion/legacy-fixtures.ts` は**増築前のコード**で実行する前提。作り直すなら、変更前のコミットを worktree に出して実行する）。
- **辞書IDの一覧**：`tests/fixtures/dictionary-ids-2026.10.12.json`（増築前の全ID）。`tests/expansion.test.ts` が「IDの削除なし」「`since` は新しい候補だけ」「台帳にない追加なし」を検査する。次に候補を足すときは `since` に新しい版を付け、この一覧を新しい版の分も作る。
- **台帳**：`scripts/expansion/ledger.ts`。`npx vite-node scripts/expansion/audit.ts && npx vite-node scripts/expansion/report.ts` で EXPANSION-AUDIT.md を作り直す（手で書き足さない）。
- **新しい7項目**はモジュール（`ageCueEnabled` など）で既定OFF。OFF・「なし」のときは hard 制約もすべて成立したまま・出力も増築前と同じ、を崩さない。抽選順の最後寄りに置いて、既存の項目の乱数の消費を変えていない。
- **視線の置き換え**：`build.ts` の `POSE_GAZE_WORDS`／`EXPR_GAZE_WORDS`。視線が「なし」以外のときだけ、ポーズ・表情から視線の語を外す。視線を決めるポーズは `Option.gazeFit`（`pose.ts` の `POSE_FIT`）。
- **先読み**（`draw.ts` の `leavesRoom`）：候補の `requires` が名指しする未抽選の項目、髪の長さ→髪型、ポーズ→持ち物、特徴→獣人の種族。固定した新項目（前髪・ごま塩のひげ・本を見る視線）と食い違う候補を先に選ぶ行き詰まりを防ぐ。
- **辞書の更新のお知らせ**：`bpg:v1:dictSeen`（確認した版）。除外の設定がある項目に `since === DATA_VERSION` の候補があるときだけ出す。除外の設定は書き換えない（`prefs.ts` の `addedIntoExcluded`／`excludeAdded`／`includeAdded`）。
- **出力の系統**：`settings.pixaiProfile`（`sdxl`／`dit`）・`settings.novelaiProfile`（`v4`／`v5`）。既定は従来の出力。
- **指標**：`npx vite-node scripts/expansion/metrics.ts -- <出力JSON>`（3モード×固定0〜15項目×250回。行き詰まり率・同じ美形タイプの似通い・「こちらを見る」の割合・項目ごとのエントロピー）。増築前後は `docs/test-artifacts/expansion-metrics-{before,after}.json`。
- 未確認：PixAI・NovelAI の実機（年齢の表れの強さ・視線・小さな細部・自然文の出力）、iPhone Safari 実機。テーマ5件は「要調整」、候補の保留6件・不採用3件。

## 8. 次にやること（2026-10-15 時点の未着手）

- **コスプレ C18（筋肉質×ビキニ）**：ネガティブONで1回試す。それでも民族衣装風なら、ユーザーに選んでもらう（制限として許容する／ビキニ・紐ビキニを筋肉質・大柄の体格では自動で引かない）。確認セットは `npm run report:verify-cosplay`、チェックリストは claude.ai の Artifact「コスプレ衣装 確認セット」。
- 実機確認セット V04（腰を縄で椅子に縛りつける）の再確認。
- ChatGPT 指示書の §6（このタイプで錬成）・§7（分類限定）は保留のまま。

## 9. 既知の制限

- Safari/WebKit の自動検証は未実施。ただし、iPhone 実機でユーザーが候補シートの修正を確認済み。
- NAI / PixAI での生成結果の品質は、ユーザーの実地確認に頼っている。
  - 6枚生成して好評だった。
- 開発用依存に `npm audit` の指摘が残る（配信物は0件）。

## 10. これまでに作ったもの（会話内のみ・リポジトリ外）

- SNS告知用：ChatGPT 向けの「使い方説明画像」の指示書を2種類。
  - 1枚版
  - 5枚カルーセル版（共通ルール＋各画像の指示）
- 必要であれば、新しい会話で作り直せる。
- 実機確認のチェックリスト（claude.ai の Artifact「禁断の調合 確認セット」と「コスプレ衣装 確認セット」。後者は前者と同じ作りで、`verify-cosplay.json` を埋め込み、2回目からは前者と同じく「今回の再確認」で絞る）。`docs/test-artifacts/verify-set.json` の内容を埋め込んだ単一 HTML。新しい会話では Artifact の一覧から URL を探し、read してから更新する。
