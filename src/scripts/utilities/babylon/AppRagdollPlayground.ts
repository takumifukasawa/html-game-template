import {AppBase, type AppConstructor} from "@/src/scripts/utilities/AppBase.ts";
import {
    Engine,
    Scene,
    HemisphericLight,
    DirectionalLight,
    Vector3,
    ArcRotateCamera,
    Color3,
    MeshBuilder,
    ShadowGenerator,
    PhysicsViewer,
    PhysicsAggregate,
    PhysicsShapeType,
    HavokPlugin
} from "@babylonjs/core";
import "@babylonjs/loaders";
import HavokPhysics from "@babylonjs/havok";
import {AdvancedDynamicTexture, Button, Control} from "@babylonjs/gui";
import {RagdollLoader} from "@/src/scripts/utilities/babylon/RagdollLoader.ts";

export class AppRagdollPlayground extends AppBase {
    engine: Engine;
    scene: Scene;
    camera: ArcRotateCamera;
    havokPlugin: HavokPlugin | null = null;
    shadowGenerator: ShadowGenerator | null = null;
    physicsViewer: PhysicsViewer | null = null;
    advancedTexture: AdvancedDynamicTexture | null = null;
    ragdollLoader: RagdollLoader | null = null;
    private isWireframeVisible = false;

    constructor(args: AppConstructor) {
        super(args);
        this.engine = new Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true
        });

        this.scene = new Scene(this.engine);
        this.scene.useRightHandedSystem = true;

        // カメラ設定（サンプルと同じ）
        this.camera = new ArcRotateCamera("camera1", 1.1, 1.4, 5, new Vector3(0, 1, 0), this.scene);
        this.camera.attachControl(this.canvas, true);

        // ライト設定
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        const light2 = new DirectionalLight("dir01", new Vector3(-1, -0.5, -1.0), this.scene);
        light2.position = new Vector3(3, 6, 4);

        // 影
        this.shadowGenerator = new ShadowGenerator(1024, light2);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurKernel = 32;

        this.initPhysics();

        // Babylon.jsの標準レンダリングループを開始
        // 物理エンジンの更新はこちらで行われる
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    private async initPhysics() {
        const havok = await HavokPhysics({
            locateFile: () => "/HavokPhysics.wasm"
        });
        this.havokPlugin = new HavokPlugin(true, havok);
        this.scene.enablePhysics(new Vector3(0, -9.8, 0), this.havokPlugin);

        this.setupScene();
    }

    private setupScene() {
        // 地面
        const ground = MeshBuilder.CreateGround("ground", {width: 10, height: 10}, this.scene);
        const groundAggregate = new PhysicsAggregate(ground, PhysicsShapeType.BOX, {mass: 0}, this.scene);

        // 地面の物理設定（GameConfigから読み込み予定）
        if (groundAggregate.shape) {
            groundAggregate.shape.material = {
                friction: 0.8,
                restitution: 0.1
            };
        }

        // 環境設定
        const helper = this.scene.createDefaultEnvironment({enableGroundShadow: true});
        if (helper) {
            helper.setMainColor(Color3.Gray());
            helper.ground!.position.y += 0.01;
        }

        // GUI
        this.setupGUI();

        // モデル読み込み
        this.loadModel();
    }

    private setupGUI() {
        this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("button", true, this.scene);

        const createButton = (id: string, text: string, top: string): Button => {
            const button = Button.CreateSimpleButton(id, text);
            button.width = "150px";
            button.height = "50px";
            button.color = "white";
            button.background = "green";
            button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            button.top = top;
            button.left = "-10px";
            return button;
        };

        const buttonRagdoll = createButton("buttonRagdoll", "Ragdoll on", "10px");
        this.advancedTexture.addControl(buttonRagdoll);

        const buttonImpulse = createButton("buttonImpulse", "Impulse", "80px");
        this.advancedTexture.addControl(buttonImpulse);

        const buttonWireframe = createButton("buttonWireframe", "Wireframe OFF", "150px");
        this.advancedTexture.addControl(buttonWireframe);

        // ワイヤーフレームボタンのイベント設定
        buttonWireframe.onPointerClickObservable.add(() => {
            this.toggleWireframe();
            buttonWireframe.textBlock!.text = this.isWireframeVisible ? "Wireframe ON" : "Wireframe OFF";
            buttonWireframe.background = this.isWireframeVisible ? "red" : "green";
        });

        // ボタンイベントはモデル読み込み後に設定
        (window as any).buttonRagdoll = buttonRagdoll;
        (window as any).buttonImpulse = buttonImpulse;
    }

    private async loadModel() {
        // RagdollLoaderを使用
        this.ragdollLoader = new RagdollLoader(this.scene);
        const ragdoll = await this.ragdollLoader.load("BananaMan.glb");

        if (!ragdoll) {
            console.error("Failed to load ragdoll");
            return;
        }

        // ラグドールメッシュに影を設定
        if (this.shadowGenerator) {
            this.ragdollLoader.addShadowCasters(this.shadowGenerator);
        }

        // PhysicsViewerの設定（初期状態では非表示なのでnull）
        // this.physicsViewer = new PhysicsViewer();

        // ボタンイベント設定
        const buttonRagdoll = (window as any).buttonRagdoll;
        const buttonImpulse = (window as any).buttonImpulse;

        this.ragdollLoader.setupButtons(buttonRagdoll, buttonImpulse, this.physicsViewer);
    }

    // AppBaseのメソッドをオーバーライド（使用しない）
    start(time: number) {
        super.start(time);
        this.startLevel();
    }

    setSize(width: number, height: number) {
        super.setSize(width, height);

        this.canvas.width = width * this.ratio;
        this.canvas.height = height * this.ratio;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        this.engine.resize();
    }

    fixedUpdate(time: number, deltaTime: number) {
        super.fixedUpdate(time, deltaTime);
    }

    update(time: number, deltaTime: number) {
        super.update(time, deltaTime);
    }

    render(time: number, deltaTime: number) {
        super.render(time, deltaTime);
        // scene.render()はengine.runRenderLoopで処理されるため、ここでは呼ばない
    }

    private toggleWireframe() {
        this.isWireframeVisible = !this.isWireframeVisible;

        if (this.isWireframeVisible) {
            // ワイヤーフレームを表示
            if (this.physicsViewer) {
                this.physicsViewer.dispose();
            }
            this.physicsViewer = new PhysicsViewer();

            if (this.ragdollLoader) {
                this.ragdollLoader.setupPhysicsViewer(this.physicsViewer);
            }
        } else {
            // ワイヤーフレームを非表示
            if (this.physicsViewer) {
                this.physicsViewer.dispose();
                this.physicsViewer = null;
            }
        }
    }
}