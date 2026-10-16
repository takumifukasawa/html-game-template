# html-game-template

スマホブラウザ向け HTML ゲームのテンプレート（vite + TypeScript）。
エンジンは Phaser（2D）/ Three.js + Rapier / Babylon.js + Havok から `npm run engine` で1つ選ぶ。選ばなかったものはインストールされない。
ライブラリ選定やエージェント向けのルールは `AGENTS.md`、エージェントが育てる補足メモは `docs/AGENTS_NOTES.md`（`CLAUDE.md` はその2つを読み込むだけ）。

## Quick start

```sh
npm install
npm run engine -- phaser   # phaser | three | babylon
npm run dev                # http://localhost:5173/
```

スターターはどれも「落ちる箱（ボール）をタップで跳ねさせる」だけの最小構成。`src/scripts/app/` を書き換えてゲームにする。エンジン未選択のときはプレースホルダが案内を描くだけ。

## コマンド一覧

### 開発

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー（http://localhost:5173/ ）。`--host` 付きなので同じ Wi-Fi の実機からも開ける。`?demo=1` で録画用プロファイル |
| `npm run build` | 本番ビルド → `dist/` |
| `npm run preview` | `dist/` を vite で配信して確認（http://localhost:4173/ ） |
| `npm run serve` | `dist/` を python の http.server で配信（http://localhost:9000/ ） |
| `npm run typecheck` | `tsc --noEmit`。選択中のエンジンのコードだけを見る（`tsconfig.engine.json`） |

### エンジン

| コマンド | 内容 |
|---|---|
| `npm run engine` | 現在のエンジンと、入っているエンジン系パッケージを表示 |
| `npm run engine -- phaser` | Phaser を入れる（`three` / `babylon` も同様）。他エンジンのパッケージは削除。`src/scripts/app/` が手つかずならそのエンジンのスターターを置く |
| `npm run engine -- three --starter` | `src/scripts/app/` と `tools/capture/autopilot.cjs` をそのエンジンのスターターで**上書き**する（自分のコードが消えるので注意） |
| `npm run engine -- none` | エンジンを全部外す（テンプレートの初期状態） |
| `npm run engine -- all` | テンプレート保守用。全エンジンを入れて、エンジン別コードとスターターを全部 typecheck |

### 新しいゲームを作る / テンプレートと同期する

| コマンド | 内容 |
|---|---|
| `npm run template:new -- <name> [dir] [origin-url] [--engine <engine>]` | テンプレートを clone して新しいゲーム repo を作る。`--engine` 付きならエンジンのインストールとスターター配置まで済む |
| `npm run template:pull` | テンプレートの更新をゲーム repo に取り込む（template → game） |
| `npm run template:list` | テンプレートにまだ無いコミットを template / game / mixed に分類して表示 |
| `npm run template:push` | template 分類のコミットをテンプレート repo へ送る（game → template） |

```sh
npm run template:new -- my-game ../my-game git@github.com:you/my-game.git --engine phaser
cd ../my-game && npm run dev
```

領域の区分や衝突時の手順は `docs/TEMPLATE.md`。

### 録画

| コマンド | 内容 |
|---|---|
| `npm run capture -- 40 auto normal` | 実プレイを mp4 に録画。引数は 秒数 / `auto`（autopilot が遊ぶ）or `manual`（自分で遊ぶ）/ `pro` `normal` `noob`（autopilot の腕前） |

`npm run dev` を別ターミナルで動かしておく。Playwright（`npx playwright install chromium`）と ffmpeg が必要。出力は `store-assets/video/`（gitignore 済み）。

## 構成

```
src/main.ts                 エントリ（canvas 生成 → App）。触らない
src/scripts/core/           テンプレート共通実装（viewport, LocalStore, configOverride, ... / phaser, three, babylon の各 *App）
src/scripts/utilities/      汎用ユーティリティ（logger, TimeAccumulator, FingerTapIndicator, babylon/）
src/scripts/app/            ゲーム本体（App / GameConfig / DemoProfile ...）← ここを書く
tools/capture/              実プレイ録画（capture-video.cjs 汎用 / autopilot.cjs ゲーム固有、スターター付属）
tools/template/             テンプレート同期スクリプト / engine.sh / starters（エンジン別サンプル）
tsconfig.engine.json        npm run engine が生成（typecheck の対象範囲）
docs/GAME.md                ゲーム仕様（雛形）
docs/AGENTS_NOTES.md        エージェント向け補足メモ（雛形。エージェント編集可）
docs/TEMPLATE.md            テンプレート運用ガイド
```
