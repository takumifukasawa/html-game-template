# <ゲーム名>

ゲーム仕様。エージェント（Claude Code, Codex など）の起動時に参照される。確定したことはここに書き、実装はここを正とする。

## 1. 基本コンセプト

- **操作性**:
- **テーマ**:
- **ターゲット**:

## 2. コアメカニクス

- プレイヤーの操作:
- 目的 / 得点:
- 失敗条件:

## 3. 差別化・中毒性

## 4. 進行構造・難易度カーブ

## 5. 画面フロー

1. プレイ
2. 結果画面（スコア / ハイスコア / リトライ）

## 6. UI 演出

## 7. 実装メモ

- 技術構成: vite + TypeScript + <エンジン>（`npm run engine -- <phaser|three|babylon>` で選択。物理は Phaser なら Matter.js、Three.js なら Rapier、Babylon.js なら Havok）。
- canvas は `src/main.ts` が生成したものを使う（`core/<engine>/` の `PhaserApp` / `ThreeApp` / `BabylonApp` に渡す）。
- 調整値は `src/scripts/app/GameConfig.ts` に集約。`?demo=1` 用の上書きは `DemoProfile.ts`。

## 8. 実装初期値（暫定・触って調整する）

## 9. 計測

---

## エージェントからの質問リスト

- Q.
  - [ユーザー回答欄]
