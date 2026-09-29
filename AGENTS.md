# AGENTS

AI コーディングエージェント（Claude Code, Codex など）向けのプロジェクト指示。エージェントの種類に依存しない内容をここに置く。

指示は2ファイルに分かれている。エージェントは起動時に両方読む。

| ファイル | 内容 | エージェントの編集 |
|---|---|---|
| `AGENTS.md`（このファイル） | 人が決めるルール。ライブラリ選定、編集してよい範囲、計測、仕様の扱い | **不可**。ユーザーから明示的に頼まれた時だけ編集する。変えたいことがあれば `docs/AGENTS_NOTES.md` の質問リストに書く |
| `docs/AGENTS_NOTES.md` | 開発しながら育つ補足。現状、慣習、ハマりどころ、エージェントからの質問 | **可**。ただしこのファイルのルールと矛盾する内容は書かない |

`CLAUDE.md` はこの2ファイルを読み込むだけの薄いファイル（`@AGENTS.md` / `@docs/AGENTS_NOTES.md`）にし、指示の本文は書かない。

## 選定ライブラリ

### 3Dコンテンツの場合

以下の2択

1. Three.js
    - 物理を使うなら Rapier
    - https://github.com/dimforge/rapier
2. Babylonjs
    - 物理を使うなら Havok

基本的には Three.js + Rapier を推奨。<br/>
ただし、以下の場合は Babylonjs + Havok を推奨。

- 複雑な物理挙動
    - 比較的数の多い物理演算
    - ラグドール
    - ジョイント
    - 布などのクロスシミュレーション
    - ソフトボディ
    - 車の挙動
    - 破壊挙動
    - 物理パズル

- 高度なグラフィクス
    - 広大なシーン
    - より精緻なライティング

### 2Dコンテンツの場合

- Phaser.js

## 実装ガイドライン

### 環境

- vite + typescript
- 外部ライブラリは npm install でインストールする
    - 外部ライブラリも含めてjsにbundleするため
    - CDNも使わない
- ゲームエンジン（Phaser / Three.js + Rapier / Babylon.js + Havok）は package.json に最初から入っていない。`npm run engine -- <phaser|three|babylon>` で1つ選んで入れる（選ばなかったエンジンは入れない）。手順は /docs/TEMPLATE.md

### 対象端末

- 基本的にはモバイルブラウザ
    - 低スペック端末を想定できているとなおよい
    - iOS Safari, Android Chrome
    - つまりポートレートモードの画面レイアウトが理想だが、ランドスケープモードも対応できているとなおよい

### ファイル構成

- /src/scripts 以下に typescript を配置
- /src/assets 以下に静的ファイルを配置
    - ただし、fetch など動的取得する場合は /public
- アプリケーションのルートファイルは /src/scripts/app/App.ts
    - class 想定。main.ts で new して使う
- /src/scripts/core … テンプレート共通実装（エージェント編集可。ゲーム固有の名前・値・色は入れない）
- /src/scripts/core/<engine> … エンジン別の共通実装（phaser / three / babylon）。選択中のエンジン分だけ typecheck される
- /src/scripts/app … ゲーム本体（エージェント編集可）
- 数値や色など、調整用の項目は可能な限り別ファイル（/src/scripts/app/GameConfig.ts など）として切り出す

- エージェントが編集してはならないファイル
    - /src/main.ts
    - /src/scripts/utilities/*.*
    - /AGENTS.md（このファイル）
    - /tsconfig.engine.json（npm run engine が生成する）

### テンプレート運用

- このリポジトリはテンプレート。ゲームは clone して別リポジトリで作る。
- 領域区分（template / shared / game）と同期手順は /docs/TEMPLATE.md と /tools/template/paths.txt を正とする。
- テンプレート領域を触るコミットに、ゲーム領域の変更を混ぜない。

## 計測

- src/scripts/utilities/systemService にて計測できるようにする
    - start ... ゲーム開始時に必ず呼ぶ
    - update ... 毎フレーム必ず呼ぶ。デフォルトでは30秒ごとにプレイタイムを計測するイベントを飛ばす
    - startLevel ... レベル開始時に呼ぶ
    - endLevel ... レベル終了時に呼ぶ. 引数に応じてループ時かどうかを判別

start, update は src/main.ts で呼ぶ。startLevel, endLevel は App などで実装する。

systemService が導入済みかどうかは /docs/AGENTS_NOTES.md の「現状」を見る。

## 仕様

- /docs 以下に markdown を配置。エージェント起動時に参照

- 仕様の markdown についてはエージェントが編集してもよい

- canvas は main.ts で生成したものを必ず使うこと

## エージェントからの質問

エージェントに疑問があった場合、該当する markdown の「エージェントからの質問リスト」に以下のフォーマットで質問を追加し、ユーザーの回答を待つ。

- 仕様（ゲームの挙動など）への質問 … その仕様の markdown（/docs/GAME.md など）
- このファイルのルールやテンプレート全体への質問 … /docs/AGENTS_NOTES.md

リストが無ければ「## エージェントからの質問リスト」を末尾に追加してよい。

```
- Q. [エージェント質問欄]
  - [ユーザー回答欄]
```
