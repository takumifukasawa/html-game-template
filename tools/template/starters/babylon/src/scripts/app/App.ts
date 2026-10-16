import {
    Color3,
    DirectionalLight,
    FreeCamera,
    HavokPlugin,
    HemisphericLight,
    type Mesh,
    MeshBuilder,
    PhysicsAggregate,
    PhysicsShapeType,
    Scene,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
// The package's "exports" map hides the wasm from bare imports, so take it by
// path; vite serves it in dev and emits it as a hashed asset in the build.
import havokWasmUrl from "@/node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";
import {BabylonApp} from "@/src/scripts/core/babylon/BabylonApp.ts";
import {listenTapOutsideCanvas} from "@/src/scripts/core/globalTap.ts";
import {applyDemoProfile} from "./DemoProfile.ts";
import {GameConfig} from "./GameConfig.ts";

export type AppArgs = {
    canvas: HTMLCanvasElement;
    ratio: number;
};

/**
 * Sample application root (Babylon.js + Havok) -- replace it with the real game.
 *
 * A box drops onto a floor under Havok gravity; tap anywhere to pop it up.
 * It exists to show the template wiring in one place:
 *  - the engine/sizing comes from core/babylon/BabylonApp (canvas from src/main.ts)
 *  - Havok is initialised asynchronously from its wasm
 *  - values come from GameConfig; `?demo=1` overrides come from DemoProfile
 *  - taps on the letterbox bars outside the canvas also count
 *  - `ready` / `onTap()` are public so tools/capture/autopilot.cjs can drive
 *    the game through the same code path as a real tap (via window.__game)
 */
export class App {
    private readonly babylon: BabylonApp;
    private readonly scene: Scene;
    private readonly floor: Mesh;
    private readonly box: Mesh;
    private boxBody: PhysicsAggregate | null = null;
    /** True once physics is initialised. */
    ready = false;

    constructor(args: AppArgs) {
        // Recording-friendly overrides, only with ?demo=1. Must run before the
        // scene reads GameConfig.
        applyDemoProfile();
        const cfg = GameConfig;

        this.babylon = new BabylonApp({canvas: args.canvas, ratio: args.ratio, maxAspect: cfg.design.maxAspect});
        this.scene = new Scene(this.babylon.engine);
        this.scene.clearColor = Color3.FromHexString(cfg.colors.background).toColor4(1);

        const camera = new FreeCamera(
            "camera",
            new Vector3(cfg.camera.position.x, cfg.camera.position.y, cfg.camera.position.z),
            this.scene,
        );
        camera.setTarget(new Vector3(cfg.camera.lookAt.x, cfg.camera.lookAt.y, cfg.camera.lookAt.z));
        camera.fov = (cfg.camera.fovDeg * Math.PI) / 180;

        const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
        hemi.intensity = 0.8;
        const sun = new DirectionalLight("sun", new Vector3(-1, -2, 0.7), this.scene);
        sun.intensity = 1.2;

        this.floor = MeshBuilder.CreateBox(
            "floor",
            {width: cfg.floor.size, height: cfg.floor.thickness, depth: cfg.floor.size},
            this.scene,
        );
        this.floor.position.y = -cfg.floor.thickness / 2;
        this.floor.material = this.material("floorMat", cfg.colors.floor);

        this.box = MeshBuilder.CreateBox("box", {size: cfg.box.size}, this.scene);
        this.box.position.y = cfg.box.spawnHeight;
        this.box.material = this.material("boxMat", cfg.colors.box);

        args.canvas.addEventListener("pointerdown", () => this.onTap());
        listenTapOutsideCanvas(args.canvas, () => this.onTap());

        if (import.meta.env.DEV) {
            // Dev-only global for debugging and tools/capture.
            (window as unknown as Record<string, unknown>).__game = this;
        }

        void this.initPhysics();
        this.babylon.run(() => this.update());
    }

    setSize(width: number, height: number): void {
        this.babylon.setSize(width, height);
    }

    /** The single input verb. Public so the capture autopilot can call it. */
    onTap(): void {
        if (!this.boxBody) {
            return;
        }
        const p = GameConfig.physics;
        const side = () => (Math.random() - 0.5) * 2;
        const impulse = new Vector3(side() * p.tapImpulseSide, p.tapImpulseUp, side() * p.tapImpulseSide);
        const at = this.box.getAbsolutePosition().add(new Vector3(side() * p.tapOffset, 0, side() * p.tapOffset));
        this.boxBody.body.applyImpulse(impulse, at);
    }

    private material(name: string, hex: string): StandardMaterial {
        const m = new StandardMaterial(name, this.scene);
        m.diffuseColor = Color3.FromHexString(hex);
        return m;
    }

    private async initPhysics(): Promise<void> {
        const cfg = GameConfig;
        const havok = await HavokPhysics({locateFile: () => havokWasmUrl});
        this.scene.enablePhysics(new Vector3(0, -cfg.physics.gravity, 0), new HavokPlugin(true, havok));

        new PhysicsAggregate(this.floor, PhysicsShapeType.BOX, {mass: 0, restitution: cfg.physics.restitution}, this.scene);
        this.boxBody = new PhysicsAggregate(
            this.box,
            PhysicsShapeType.BOX,
            {mass: 1, restitution: cfg.physics.restitution},
            this.scene,
        );
        // Let the mesh transform drive the body too, so the respawn below can
        // simply move the mesh.
        this.boxBody.body.disablePreStep = false;
        this.ready = true;
    }

    private update(): void {
        if (this.boxBody && this.box.position.y < GameConfig.box.resetBelowY) {
            this.box.position.set(0, GameConfig.box.spawnHeight, 0);
            this.boxBody.body.setLinearVelocity(Vector3.Zero());
            this.boxBody.body.setAngularVelocity(Vector3.Zero());
        }
        this.scene.render();
    }
}
