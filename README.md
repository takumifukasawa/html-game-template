# html-game-template

スマホブラウザ向け HTML ゲームのテンプレート（vite + TypeScript）。
2D は Phaser、3D は Three.js + Rapier または Babylon.js + Havok を想定（ライブラリ選定やエージェント向けの指示は `AGENTS.md`。`CLAUDE.md` はそれを読み込むだけ）。

## Quick start

```sh
npm install
npm run dev        # http://localhost:5173/  (?demo=1 で録画用プロファイル)
npm run build
npm run typecheck
```

サンプルとして「落ちるボールをタップで跳ねさせて生き延びる」だけのシーンが入っている。`src/scripts/app/` を書き換えてゲームにする。

## 新しいゲームを作る / テンプレートと同期する

```sh
npm run template:new -- my-game ../my-game git@github.com:you/my-game.git
```

以降の運用（取り込み `npm run template:pull`、書き戻し `npm run template:push`）は `docs/TEMPLATE.md` を参照。

## 構成

```
src/main.ts                 エントリ（canvas 生成 → App）。触らない
src/scripts/core/           テンプレート共通実装（PhaserApp, LocalStore, configOverride, ...）
src/scripts/utilities/      汎用ユーティリティ（logger, TimeAccumulator, FingerTapIndicator, babylon/）
src/scripts/app/            ゲーム本体（App / GameConfig / DemoProfile / MainScene）← ここを書く
tools/capture/              実プレイ録画（capture-video.cjs 汎用 / autopilot.cjs ゲーム固有）
tools/template/             テンプレート同期スクリプト
docs/GAME.md                ゲーム仕様（雛形）
docs/TEMPLATE.md            テンプレート運用ガイド
```

## 録画

```sh
npm run dev                          # 別ターミナルで
npm run capture -- 40 auto normal    # 秒数 / auto|manual / pro|normal|noob
```

Playwright（`npx playwright install chromium`）と ffmpeg が必要。出力は `store-assets/video/`（gitignore 済み）。
