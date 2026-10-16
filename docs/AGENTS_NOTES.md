# AGENTS NOTES

`AGENTS.md` の補足。`AGENTS.md` が「人が決めるルール」なのに対し、ここは開発しながら育つメモ。
エージェント（Claude Code, Codex など）が編集してよい。`AGENTS.md` と矛盾することは書かず、ルールを変えたい場合は末尾の質問リストで聞く。

テンプレートの領域区分では **game**（ゲームごとのファイル）。`npm run template:pull` でテンプレート側の変更は取り込まれないので、全ゲームに効かせたい内容は `AGENTS.md` か `docs/TEMPLATE.md` に書く（人が判断する）。

## 現状

- 選択中のエンジンは `npm run engine`（引数なし）で確認する（package.json の `config.engine`）。テンプレートの初期状態は none。
- agent-harness はこのリポジトリに未導入（`.harness/`, `.agents/`, `docs/handoff.md` などは無い）。それでも `AGENTS.md` 冒頭の harness ブロックは存在しないファイルを指している（2026-10-16 時点。下の質問リスト参照）。現状はこの「現状」節を正とする。
- 2026-10-16 に公開前の漏洩監査（作業ツリー + 全履歴）を実施し、問題なし。その後 `sync/tuning-panel`（tuning panel など 3 コミット）を main に fast-forward して push 済み。
- 2026-10-16 に計測（systemService / startLevel / endLevel / engagement）の記述とコードを全履歴から削除（filter-branch で全コミットを書き換え）し、GitHub のリポジトリを削除・再作成して push し直した。計測はテンプレートの範囲外。書き換え前に clone したリポジトリは古い履歴を持つ。

## 慣習

実装しながら決めた規約（命名、ファイルの置き場、シーンの分け方など）。確定したものだけ書く。

- （まだ無し）

## ハマりどころ

環境やライブラリの注意点。再発防止になるものを書く。

- `tools/template/push.sh` は `AGENTS.md` / `CLAUDE.md` をファイル単位でテンプレート領域とみなす。ゲームリポジトリで agent-harness を入れると、その harness ブロックまでテンプレートに流れ込む（2026-10-16 に `6d3feb5` で発生）。push 前に `git diff` で AGENTS.md の差分を確認する。

## エージェントからの質問リスト

`AGENTS.md` のルールやテンプレート全体への質問。ゲーム仕様への質問は `docs/GAME.md` に書く。

- Q. `AGENTS.md` の harness ブロック（`6d3feb5` 由来）をどうするか。(1) `6d3feb5` を revert してテンプレートを harness なしに戻す（harness は使うゲームリポジトリで個別に入れる）、(2) テンプレートにも harness を導入して参照先を揃える。(1) の場合、今後の push で再流入しないよう `paths.txt` / `push.sh` 側の対策も要検討。
  - [ユーザー回答欄]
