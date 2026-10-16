# knowledge — ゲームに依存しない知見

テンプレートから作るどのゲームでも効く、技術的な知見と落とし穴。ゲーム固有の名前・値・素材は書かない（ゲーム固有のことは各ゲームの docs に書く）。

音のぶつぶつと描画の重さを切り分ける手順と道具は skill `mobile-audio-render`（[agent-skills](https://github.com/takumifukasawa/agent-skills) の `gamedev/`。`scripts/` に記録の道具とテストページがある）。

| 文書 | 内容 |
|---|---|
| [three-bloom-flicker.md](three-bloom-flicker.md) | three.js の UnrealBloomPass が細い光の周りでチカチカする原因と対策、効いたかの測り方。対策のコードは `src/scripts/core/three/StableBloom.ts` |
| [three-shader-pitfalls.md](three-shader-pitfalls.md) | シェーダーと描画の落とし穴: uniform 名の衝突、折り返しの継ぎ目、`pow` の負の引数、細すぎる点や線のちらつき |
| [webaudio-android-crackle.md](webaudio-android-crackle.md) | Web Audio が Android の Chrome でだけぶつぶつする: 鳴り終わった音の部品をつないだままにする罠、`latencyHint`、実機を USB でつないで音の処理時間を記録する調べ方、音が小さくてスピーカーで割れる件、処理が間に合っているのにぶつっと鳴る原因（立ち上がり・値の跳び・コンプレッサー・残響への送り） |
| [three-render-cost.md](three-render-cost.md) | three.js の描画を低スペックのスマホ向けに軽くする: 後処理を使うならキャンバスの antialias は切る、解像度・MSAA・bloom の解像度・preserveDrawingBuffer |
