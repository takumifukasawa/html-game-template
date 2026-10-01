# テンプレート運用ガイド

このリポジトリはスマホブラウザ向け HTML ゲームのテンプレート（vite + TypeScript）。エンジンは Phaser（2D）/ Three.js + Rapier / Babylon.js + Havok から `npm run engine` で1つ選ぶ。選ばなかったエンジンはインストールされない。
新しいゲームはここを clone して作り、**別リポジトリ**にコミットする。ゲーム側で行ったテンプレート領域の改善は、テンプレートへ書き戻せる。

## ゲームに依存しない知見

`docs/knowledge/` に、どのゲームでも効く技術的な知見と落とし穴を置く（索引: `docs/knowledge/README.md`）。ゲーム固有の名前・値・素材は書かない。ゲームで得た知見は、ゲームから切り離した形でここへ書き戻す。

## 領域の区分

どのパスが誰のものかは `tools/template/paths.txt` が正。スクリプトはこのファイルだけを見る。

| 区分 | 主なパス | 取り込み（template → game） | 書き戻し（game → template） |
|---|---|---|---|
| **template** | `src/main.ts`, `src/scripts/core/`, `src/scripts/utilities/`, `tools/capture/capture-video.cjs`, `tools/template/`, `AGENTS.md`, `CLAUDE.md`, `docs/TEMPLATE.md`, `docs/knowledge/` | merge される | この領域**だけ**を触ったコミットを自動で送れる |
| **shared** | `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `.gitignore` | 3-way merge（衝突は手で解決） | 自動では送らない（手で cherry-pick） |
| **game**（それ以外） | `src/scripts/app/`, `tools/capture/autopilot.cjs`, `tsconfig.engine.json`, `docs/GAME.md`, `docs/AGENTS_NOTES.md`, `public/`, `README.md` | テンプレート側の変更は**捨てる** | 送らない |

### ディレクトリの役割

- `src/main.ts` … エントリ。canvas を生成して `App` に渡す。触らない。
- `src/scripts/core/` … テンプレートが育てる共通実装。エージェント（Claude Code, Codex など）が編集してよい領域。
    - `viewport.ts` … 縦長レターボックスの計算（`playSize`）と canvas のタップ遅延対策。3つの *App が共有
    - `phaser/PhaserApp.ts` … 既存 canvas への Phaser 起動、DPI、レターボックス、リサイズ、開発用グローバル `window.__game`
    - `three/ThreeApp.ts` … 同じく three.js（WebGLRenderer、pixel ratio、リサイズ、アニメーションループ）
    - `babylon/BabylonApp.ts` … 同じく Babylon.js（Engine、hardware scaling、リサイズ、レンダーループ）
    - `<engine>/` は選択中のエンジン分だけ typecheck される（`tsconfig.engine.json`）
    - `LocalStore.ts` … 名前空間つき localStorage（Safari プライベートモード等で例外を吸収）
    - `configOverride.ts` … `applyOverrides` / `DeepPartial`（`?demo=1` プロファイルの土台）
    - `query.ts` … URL クエリ（`hasQueryFlag("demo")` など）
    - `globalTap.ts` … canvas 外（レターボックスの黒帯）のタップ拾い
    - `fonts.ts` … Web フォント読込待ち
- `src/scripts/utilities/` … 汎用ユーティリティ（logger, TimeAccumulator, FingerTapIndicator, babylon/ …）。AGENTS.md によりエージェント編集禁止。
- `src/scripts/app/` … **ゲーム本体**。テンプレートにはエンジンなしのプレースホルダだけが入っている。`npm run engine -- <engine>` でそのエンジンのスターター（`tools/template/starters/<engine>/`）に置き換わる。ゲームごとに書き換える。
- `tools/capture/` … 実プレイ録画ツール。`capture-video.cjs` は汎用、`autopilot.cjs` はゲームごとの自動操作フック（スターターに付属。ゲーム領域）。
- `tools/template/` … 本ガイドの同期スクリプト、`engine.sh`（エンジン選択）、`starters/<engine>/`（エンジン別サンプル。リポジトリのルート構成をミラーし、`src/scripts/app/` と `tools/capture/autopilot.cjs` を持つ）。
- `docs/GAME.md` … ゲーム仕様。テンプレートには雛形のみ。
- `docs/AGENTS_NOTES.md` … エージェント向けの補足メモ（現状・慣習・ハマりどころ・質問）。エージェント編集可。テンプレートには雛形のみ。ルール本体は `AGENTS.md`（エージェント編集不可）。
- `tsconfig.engine.json` … `npm run engine` が生成する。typecheck の include / exclude だけを持つ（`tsconfig.json` が extends する）。手で編集しない。

## 新しいゲームを作る

```sh
npm run template:new -- my-game ../my-game git@github.com:you/my-game.git --engine phaser
cd ../my-game && npm run dev
```

`--engine`（phaser | three | babylon）を付けると clone 直後にエンジンを入れてスターターを置く（`npm install` 込み）。省略すると engine なしで作られるので、後で `npm run engine -- <engine>` を実行する。

手動でやる場合は同じことをする：

```sh
git clone <template-url> my-game && cd my-game
git remote rename origin template          # pull.sh / push.sh はこの remote 名を前提にする
git remote add origin <my-game-url>
npm install && npm run engine -- phaser
```

GitHub の「Use this template」は履歴が切れて merge できなくなるので使わず、clone する。

## エンジンを選ぶ

エンジンのパッケージは package.json に最初から入っていない（Phaser のゲームに Babylon を入れないため）。

```sh
npm run engine                      # 現在のエンジンを表示
npm run engine -- phaser            # phaser | three | babylon | none
npm run engine -- three --starter   # src/scripts/app/ をそのエンジンのスターターで上書きする
npm run engine -- all               # テンプレート保守用: 全エンジンを入れて、エンジン別コードとスターターを全部 typecheck
```

`npm run engine -- <engine>` がやること：

1. 他エンジンのパッケージを `npm uninstall`、選んだエンジンのパッケージを `npm install`（package.json / package-lock.json が変わる）。
2. `tsconfig.engine.json` を生成し、選んでいないエンジンの `src/scripts/{core,utilities}/<engine>/` を typecheck から外す。vite は `src/main.ts` から辿れるものしか bundle しないので、build には影響しない。
3. package.json の `config.engine` に記録する。
4. スターターを置く。`src/scripts/app/` がまだ手つかず（プレースホルダか、どれかのスターターと同一）なら自動で `tools/template/starters/<engine>/` の内容（`src/scripts/app/` と `tools/capture/autopilot.cjs`）に置き換える。自分のコードが入っていれば触らない。置き換えたいときは `--starter`（上書きなので注意）。

スターターはどれも「箱（ボール）が落ちる。タップで跳ねる」だけの最小構成で、`PhaserApp` / `ThreeApp` / `BabylonApp` の使い方、非同期の物理初期化（Rapier / Havok）、`GameConfig` と `?demo=1`、capture 用の `window.__game` を示す。

`tsconfig.engine.json` はゲーム領域（テンプレートから流れてこない）。`npm run template:pull` で `engine.sh` が更新されたら、同じエンジンで `npm run engine -- <engine>` を再実行して生成し直す（pull.sh が案内を出す）。

## テンプレートの更新を取り込む（template → game）

```sh
npm run template:pull
```

- `template/main` を `--no-ff` で merge する。
- game 領域へのテンプレート側変更（サンプル `src/scripts/app/` など）は捨てて、この repo の版を残す。
- template / shared 領域で衝突したら止まる。解決して `git add` → `git commit`。
- `package.json` が変わったら `npm install` してロックファイルをコミット。

## ゲーム側の改善をテンプレートへ戻す（game → template）

1. テンプレート領域**だけ**を触るコミットを、ゲームの変更と分けて作る。件名に `[template]` を付けておくと後で見分けやすい。
2. `npm run template:list` で分類を確認する（`template` / `game` / `mixed`）。
3. `npm run template:push` で `template` 分類のコミットが template remote に `sync/<repo>-<日時>` ブランチとして push される（この repo の履歴は変わらない）。
4. テンプレート repo で merge する（PR でもよい）。
5. 取り込んだ後、ゲーム側で `npm run template:pull` すると同じ変更が merge 済みとして揃う（cherry-pick なので重複コミットにはなるが内容は衝突しない）。

`mixed` のコミットは `git rebase -i` や `git add -p` で分割してから。

## ルール

- テンプレート領域を触るコミットに、ゲーム領域の変更を混ぜない。
- テンプレート側の `src/scripts/app/` はエンジンなしのプレースホルダのまま。エンジン別サンプルは `tools/template/starters/<engine>/` で育てる（適用済みのゲームの app には伝わらない）。共通化したいものは `src/scripts/core/` へ。
- テンプレート側で `src/scripts/core/<engine>/` や starters を触るときは `npm run engine -- all` で全エンジンを入れて typecheck する。コミット前に `npm run engine -- none` に戻し、package.json にエンジンを残さない。
- ゲームごとの名前・色・数値は `src/scripts/app/GameConfig.ts` と `index.html`（title, font）に寄せ、core には入れない。
- `LocalStore` の名前空間（`GameConfig.save.namespace`）はゲームごとに変える。
- 新しいゲームでテンプレート領域のパスを増減したら `tools/template/paths.txt` も更新し、そのコミットをテンプレートへ戻す。
