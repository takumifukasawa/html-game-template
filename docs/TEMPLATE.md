# テンプレート運用ガイド

このリポジトリはスマホブラウザ向け HTML ゲームのテンプレート（vite + TypeScript。2D は Phaser、3D は Three.js + Rapier または Babylon.js + Havok）。
新しいゲームはここを clone して作り、**別リポジトリ**にコミットする。ゲーム側で行ったテンプレート領域の改善は、テンプレートへ書き戻せる。

## 領域の区分

どのパスが誰のものかは `tools/template/paths.txt` が正。スクリプトはこのファイルだけを見る。

| 区分 | 主なパス | 取り込み（template → game） | 書き戻し（game → template） |
|---|---|---|---|
| **template** | `src/main.ts`, `src/scripts/core/`, `src/scripts/utilities/`, `tools/capture/capture-video.cjs`, `tools/template/`, `AGENTS.md`, `CLAUDE.md`, `docs/TEMPLATE.md` | merge される | この領域**だけ**を触ったコミットを自動で送れる |
| **shared** | `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `.gitignore` | 3-way merge（衝突は手で解決） | 自動では送らない（手で cherry-pick） |
| **game**（それ以外） | `src/scripts/app/`, `tools/capture/autopilot.cjs`, `docs/GAME.md`, `public/`, `README.md` | テンプレート側の変更は**捨てる** | 送らない |

### ディレクトリの役割

- `src/main.ts` … エントリ。canvas を生成して `App` に渡す。触らない。
- `src/scripts/core/` … テンプレートが育てる共通実装。エージェント（Claude Code, Codex など）が編集してよい領域。
    - `phaser/PhaserApp.ts` … 既存 canvas への Phaser 起動、DPI、縦長レターボックス、リサイズ、開発用グローバル `window.__game`
    - `LocalStore.ts` … 名前空間つき localStorage（Safari プライベートモード等で例外を吸収）
    - `configOverride.ts` … `applyOverrides` / `DeepPartial`（`?demo=1` プロファイルの土台）
    - `query.ts` … URL クエリ（`hasQueryFlag("demo")` など）
    - `globalTap.ts` … canvas 外（レターボックスの黒帯）のタップ拾い
    - `fonts.ts` … Web フォント読込待ち
- `src/scripts/utilities/` … 汎用ユーティリティ（logger, TimeAccumulator, FingerTapIndicator, babylon/ …）。AGENTS.md によりエージェント編集禁止。
- `src/scripts/app/` … **ゲーム本体**。テンプレートにはサンプル（`App.ts`, `GameConfig.ts`, `DemoProfile.ts`, `MainScene.ts`）が入っている。ゲームごとに書き換える。
- `tools/capture/` … 実プレイ録画ツール。`capture-video.cjs` は汎用、`autopilot.cjs` はゲームごとの自動操作フック。
- `tools/template/` … 本ガイドの同期スクリプト。
- `docs/GAME.md` … ゲーム仕様。テンプレートには雛形のみ。

## 新しいゲームを作る

```sh
npm run template:new -- my-game ../my-game git@github.com:you/my-game.git
cd ../my-game && npm install && npm run dev
```

手動でやる場合は同じことをする：

```sh
git clone <template-url> my-game && cd my-game
git remote rename origin template          # pull.sh / push.sh はこの remote 名を前提にする
git remote add origin <my-game-url>
```

GitHub の「Use this template」は履歴が切れて merge できなくなるので使わず、clone する。

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
- テンプレート側では `src/scripts/app/` のサンプルをできるだけ触らない（各ゲームには伝わらない）。共通化したいものは `src/scripts/core/` へ。
- ゲームごとの名前・色・数値は `src/scripts/app/GameConfig.ts` と `index.html`（title, font）に寄せ、core には入れない。
- `LocalStore` の名前空間（`GameConfig.save.namespace`）はゲームごとに変える。
- 新しいゲームでテンプレート領域のパスを増減したら `tools/template/paths.txt` も更新し、そのコミットをテンプレートへ戻す。
