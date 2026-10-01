# knowledge — ゲームに依存しない知見

テンプレートから作るどのゲームでも効く、技術的な知見と落とし穴。ゲーム固有の名前・値・素材は書かない（ゲーム固有のことは各ゲームの docs に書く）。

| 文書 | 内容 |
|---|---|
| [three-bloom-flicker.md](three-bloom-flicker.md) | three.js の UnrealBloomPass が細い光の周りでチカチカする原因と対策、効いたかの測り方。対策のコードは `src/scripts/core/three/StableBloom.ts` |
| [three-shader-pitfalls.md](three-shader-pitfalls.md) | シェーダーと描画の落とし穴: uniform 名の衝突、折り返しの継ぎ目、`pow` の負の引数、細すぎる点や線のちらつき |
