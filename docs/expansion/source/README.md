# 増築の入力資料（2026-10-22 受領）

ユーザーから受け取った増築資料をそのまま保存したもの。内容は変更していない（大きいものは gzip で圧縮）。
`SHA256SUMS.txt` は圧縮前・改名前のファイルのハッシュ（`phase1_high_priority_draft.ts.txt` の元の名前は `phase1_high_priority_draft.ts`。ビルド・lint の対象にならないよう拡張子を変えた）。

| ファイル | 内容 |
|---|---|
| `expansion_candidates.json.gz` | 394候補（再構成版。全件 `reconstruction: true`）。監査の起点 |
| `expansion_candidates.csv.gz` | 同じ394候補のCSV（JSONとの一致は `scripts/expansion/audit.ts` で検査） |
| `phase1_high_priority_draft.ts.txt.gz` | Phase 1 草案146件（参考。本番コードには直接使っていない） |
| `theme_sets.json` | テーマ25件（素材の組み合わせ例） |
| `candidate_allocation.csv` | カテゴリ別の配分 |
| `implementation_notes.md` | 再構成版の引継ぎメモ |
| `deep-research-report.md` | Deep Research の調査報告（2026-10-22） |
| `claude_gacha_upgrade.md` | 実装依頼書 |

**注意**：394候補は Deep Research 原本ではなく、報告書から再構成されたデータ。個別のタグが PixAI / NovelAI で効くことは確認されていない。
採否と理由は `docs/EXPANSION-AUDIT.md`（台帳は `scripts/expansion/ledger.ts`）を参照。
