# AGENTS

AI コーディングエージェント（Claude Code, Codex など）向けのプロジェクト指示。エージェントの種類に依存しない内容をここに置く。
`CLAUDE.md` はこのファイルを読み込むだけの薄いファイル（`@AGENTS.md`）にし、指示の正はここ1箇所にする。

このファイルはエージェントが編集してはいけない。

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
- /src/scripts/app … ゲーム本体（エージェント編集可）
- 数値や色など、調整用の項目は可能な限り別ファイル（/src/scripts/app/GameConfig.ts など）として切り出す

- エージェントが編集してはならない typescript
    - /src/main.ts
    - /src/scripts/utilities/*.*

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

※ 現在このリポジトリに systemService は含まれていない。必要になった時に /src/scripts/utilities 以下へ追加する。

## 仕様

- /docs 以下に markdown を配置。エージェント起動時に参照

- 仕様の markdown についてはエージェントが編集してもよい

- canvas は main.ts で生成したものを必ず使うこと

## エージェントからの質問

仕様を更新する際、「エージェントからの質問 / ユーザーからの答え」を使ってエージェントからの仕様への質問を受けつける。

### エージェントからの質問 / ユーザーからの答え

エージェントからの疑問があった場合、以下のルールに則って仕様の markdown を編集可能。

- 「エージェントからの質問リスト」を追加
- 以下のフォーマットに従い、質問内容を追加する
- ユーザーの回答を待つ

```
- Q. [エージェント質問欄]
  - [ユーザー回答欄]
```

### エージェントからの質問リスト

以下に記載。
