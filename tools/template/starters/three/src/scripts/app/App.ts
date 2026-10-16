import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type {RigidBody, World} from "@dimforge/rapier3d-compat";
import {ThreeApp} from "@/src/scripts/core/three/ThreeApp.ts";
import {listenTapOutsideCanvas} from "@/src/scripts/core/globalTap.ts";
import {applyDemoProfile} from "./DemoProfile.ts";
import {GameConfig} from "./GameConfig.ts";

export type AppArgs = {
    canvas: HTMLCanvasElement;
    ratio: number;
};

/**
 * Sample application root (three.js + Rapier) -- replace it with the real game.
 *
 * A box drops onto a floor under Rapier gravity; tap anywhere to pop it up.
 * It exists to show the template wiring in one place:
 *  - the renderer/sizing comes from core/three/ThreeApp (canvas from src/main.ts)
 *  - Rapier is initialised asynchronously and stepped with a fixed timestep
 *  - values come from GameConfig; `?demo=1` overrides come from DemoProfile
 *  - taps on the letterbox bars outside the canvas also count
 *  - `ready` / `onTap()` are public so tools/capture/autopilot.cjs can drive
 *    the game through the same code path as a real tap (via window.__game)
 */
export class App {
    private readonly three: ThreeApp;
    private readonly scene = new THREE.Scene();
    private readonly camera: THREE.PerspectiveCamera;
    private readonly box: THREE.Mesh;
    private world: World | null = null;
    private boxBody: RigidBody | null = null;
    private accumulator = 0;
    /** True once physics is initialised. */
    ready = false;

    constructor(args: AppArgs) {
        // Recording-friendly overrides, only with ?demo=1. Must run before the
        // scene reads GameConfig.
        applyDemoProfile();
        const cfg = GameConfig;

        this.three = new ThreeApp({canvas: args.canvas, ratio: args.ratio, maxAspect: cfg.design.maxAspect});
        this.scene.background = new THREE.Color(cfg.colors.background);

        this.camera = new THREE.PerspectiveCamera(cfg.camera.fovDeg, 1, 0.1, 100);
        this.camera.position.set(cfg.camera.position.x, cfg.camera.position.y, cfg.camera.position.z);
        this.camera.lookAt(cfg.camera.lookAt.x, cfg.camera.lookAt.y, cfg.camera.lookAt.z);
        this.three.onResize((width, height) => {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        });

        this.scene.add(new THREE.HemisphereLight(cfg.colors.skyLight, cfg.colors.groundLight, 1.2));
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(3, 6, 2);
        this.scene.add(sun);

        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(cfg.floor.size, cfg.floor.thickness, cfg.floor.size),
            new THREE.MeshStandardMaterial({color: cfg.colors.floor}),
        );
        floor.position.y = -cfg.floor.thickness / 2;
        this.scene.add(floor);

        this.box = new THREE.Mesh(
            new THREE.BoxGeometry(cfg.box.size, cfg.box.size, cfg.box.size),
            new THREE.MeshStandardMaterial({color: cfg.colors.box}),
        );
        this.box.position.y = cfg.box.spawnHeight;
        this.scene.add(this.box);

        args.canvas.addEventListener("pointerdown", () => this.onTap());
        listenTapOutsideCanvas(args.canvas, () => this.onTap());

        if (import.meta.env.DEV) {
            // Dev-only global for debugging and tools/capture.
            (window as unknown as Record<string, unknown>).__game = this;
        }

        void this.initPhysics();
        this.three.start((_time, dt) => this.update(dt));
    }

    setSize(width: number, height: number): void {
        this.three.setSize(width, height);
    }

    /** The single input verb. Public so the capture autopilot can call it. */
    onTap(): void {
        if (!this.boxBody) {
            return;
        }
        const p = GameConfig.physics;
        const side = () => (Math.random() - 0.5) * 2;
        this.boxBody.applyImpulse({x: side() * p.tapImpulseSide, y: p.tapImpulseUp, z: side() * p.tapImpulseSide}, true);
        this.boxBody.applyTorqueImpulse({x: side() * p.tapTorque, y: side() * p.tapTorque, z: side() * p.tapTorque}, true);
    }

    private async initPhysics(): Promise<void> {
        // rapier3d-compat embeds its wasm, so no bundler config is needed.
        await RAPIER.init();
        const cfg = GameConfig;
        const world = new RAPIER.World({x: 0, y: -cfg.physics.gravity, z: 0});
        world.timestep = cfg.physics.timestep;

        world.createCollider(
            RAPIER.ColliderDesc.cuboid(cfg.floor.size / 2, cfg.floor.thickness / 2, cfg.floor.size / 2)
                .setTranslation(0, -cfg.floor.thickness / 2, 0)
                .setRestitution(cfg.physics.restitution),
        );

        const half = cfg.box.size / 2;
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, cfg.box.spawnHeight, 0));
        world.createCollider(RAPIER.ColliderDesc.cuboid(half, half, half).setRestitution(cfg.physics.restitution), body);

        this.world = world;
        this.boxBody = body;
        this.ready = true;
    }

    private update(dt: number): void {
        if (this.world && this.boxBody) {
            // Fixed timestep: the same number of physics steps per second on every device.
            this.accumulator += dt;
            while (this.accumulator >= this.world.timestep) {
                this.world.step();
                this.accumulator -= this.world.timestep;
            }
            const p = this.boxBody.translation();
            const q = this.boxBody.rotation();
            this.box.position.set(p.x, p.y, p.z);
            this.box.quaternion.set(q.x, q.y, q.z, q.w);
            if (p.y < GameConfig.box.resetBelowY) {
                this.boxBody.setTranslation({x: 0, y: GameConfig.box.spawnHeight, z: 0}, true);
                this.boxBody.setLinvel({x: 0, y: 0, z: 0}, true);
                this.boxBody.setAngvel({x: 0, y: 0, z: 0}, true);
            }
        }
        this.three.renderer.render(this.scene, this.camera);
    }
}
