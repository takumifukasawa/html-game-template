import {
    Scene,
    SceneLoader,
    Ragdoll,
    Vector3,
    PhysicsViewer,
    ShadowGenerator
} from "@babylonjs/core";
import { Button } from "@babylonjs/gui";
import { mixamoRagdollConfig } from "./RagdollConfig.ts";
// import { getPhysicsParamsForBone } from "./PhysicsConfig.ts";

export class RagdollLoader {
    private scene: Scene;
    private ragdoll: Ragdoll | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    async load(modelPath: string): Promise<Ragdoll | null> {
        try {
            const result = await SceneLoader.ImportMeshAsync(
                "",
                "/models/",
                modelPath,
                this.scene
            );

            const skeleton = result.skeletons[0];
            if (!skeleton) {
                console.error("Skeleton not found");
                return null;
            }

            // アニメーション開始（TPoseモデルのためアニメーションがない可能性）
            if (skeleton.animations && skeleton.animations.length > 0) {
                this.scene.beginAnimation(skeleton, 0, 10, true, 1.0);
            }

            // デバッグ情報
            console.log("Available meshes:", result.meshes.map(m => m.name));
            console.log("Available transformNodes:", result.transformNodes.map(n => n.name));

            // ルートノードを取得（サンプルと同様の方法で探す）
            let rootNode = this.scene.getTransformNodeByName("RootNode") ||
                          this.scene.getTransformNodeByName("Armature") ||
                          result.transformNodes[0] ||
                          result.meshes[0];

            console.log("Selected rootNode:", rootNode?.name);

            if (rootNode) {
                rootNode.position = new Vector3(0, 1, 0);
            }

            // Ragdoll作成
            this.ragdoll = new Ragdoll(skeleton, rootNode, mixamoRagdollConfig);

            // // 物理パラメーターを適用
            // this.applyPhysicsParameters();

            return this.ragdoll;

        } catch (error) {
            console.error("Model loading failed:", error);
            return null;
        }
    }

    addShadowCasters(shadowGenerator: ShadowGenerator) {
        // ラグドールメッシュに影を設定
        this.scene.meshes.forEach(mesh => {
            if (!mesh.name.includes("ground")) {
                mesh.receiveShadows = true;
                shadowGenerator.addShadowCaster(mesh, true);
            }
        });
    }

    setupButtons(buttonRagdoll: Button, buttonImpulse: Button, physicsViewer: PhysicsViewer | null) {
        if (!this.ragdoll) return;

        buttonRagdoll.onPointerClickObservable.add(() => {
            if (this.ragdoll) {
                this.ragdoll.ragdoll();

                // ラグドール開始後に物理ボディを再検索
                setTimeout(() => {
                    if (physicsViewer) {
                        this.scene.transformNodes.forEach((node) => {
                            if (node.physicsBody) {
                                physicsViewer.showBody(node.physicsBody);
                            }
                        });
                    }
                }, 100);
            }
        });

        buttonImpulse.onPointerClickObservable.add(() => {
            if (this.ragdoll) {
                const aggregate = this.ragdoll.getAggregate(0);
                if (aggregate && aggregate.body) {
                    aggregate.body.applyImpulse(new Vector3(200, 200, 200), Vector3.ZeroReadOnly);
                }
            }
        });
    }

    setupPhysicsViewer(physicsViewer: PhysicsViewer) {
        // PhysicsViewer設定
        this.scene.transformNodes.forEach((node) => {
            if (node.physicsBody) {
                physicsViewer.showBody(node.physicsBody);
            }
        });
    }

    getRagdoll(): Ragdoll | null {
        return this.ragdoll;
    }

    // 使用されていないため、一時的にコメントアウト
    /*
    private _applyPhysicsParameters() {
        if (!this.ragdoll) return;

        // 各ボーンの物理パラメーターを設定
        mixamoRagdollConfig.forEach((config, index) => {
            config.bones.forEach((boneName: string) => {
                const aggregate = this.ragdoll!.getAggregate(index);
                if (aggregate && aggregate.body && aggregate.shape) {
                    const physicsParams = getPhysicsParamsForBone(boneName);
                    
                    // 質量の設定
                    if (physicsParams.mass !== undefined) {
                        aggregate.body.setMassProperties({ 
                            mass: physicsParams.mass
                        });
                    }
                    
                    // マテリアル（摩擦と反発係数）の設定
                    if (physicsParams.friction !== undefined || physicsParams.restitution !== undefined) {
                        aggregate.shape.material = {
                            friction: physicsParams.friction || 0.5,
                            restitution: physicsParams.restitution || 0.2
                        };
                    }
                    
                    // 減衰の設定
                    if (physicsParams.linearDamping !== undefined) {
                        aggregate.body.setLinearDamping(physicsParams.linearDamping);
                    }
                    if (physicsParams.angularDamping !== undefined) {
                        aggregate.body.setAngularDamping(physicsParams.angularDamping);
                    }
                }
            });
        });
    }
    */
}