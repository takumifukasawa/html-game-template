// ゲーム設定ファイル
import type {PhysicsParameters} from "@/src/scripts/utilities/babylon/PhysicsConfig.ts";

// 調整可能なゲーム設定
export const RagdollPlaygroundConfig = {
    // ラグドール物理設定
    ragdollPhysics: {
        // 全体的な物理設定（個別設定で上書き可能）
        global: {
            friction: 0.5,
            restitution: 0.15,
            linearDamping: 0.1,
            angularDamping: 0.1
        } as PhysicsParameters,

        // インパルス設定
        impulse: {
            force: new Float32Array([200, 200, 200]),
            randomRange: 50  // ランダム性の範囲
        }
    },

    // 地面の物理設定
    groundPhysics: {
        friction: 0.8,
        restitution: 0.1
    },

    // カメラ設定
    camera: {
        alpha: 1.1,
        beta: 1.4,
        radius: 5,
        target: new Float32Array([0, 1, 0])
    },

    // 影の設定
    shadow: {
        mapSize: 1024,
        blurKernel: 32,
        useBlurExponentialShadowMap: true
    }
};