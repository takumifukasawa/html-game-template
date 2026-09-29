import {PhaserApp} from "@/src/scripts/core/phaser/PhaserApp.ts";
import {applyDemoProfile} from "./DemoProfile.ts";
import {GameConfig} from "./GameConfig.ts";
import {MainScene} from "./MainScene.ts";

export type AppArgs = {
    canvas: HTMLCanvasElement;
    ratio: number;
};

/**
 * Application root, created by src/main.ts with the canvas it made.
 * Wires the game (config, scenes, physics) into the template's PhaserApp.
 */
export class App {
    private readonly phaser: PhaserApp;

    constructor(args: AppArgs) {
        // Recording-friendly overrides, only with ?demo=1. Must run before the
        // scene reads GameConfig.
        applyDemoProfile();

        this.phaser = new PhaserApp({
            canvas: args.canvas,
            ratio: args.ratio,
            maxAspect: GameConfig.design.maxAspect,
            config: {
                backgroundColor: GameConfig.colors.background,
                physics: {
                    default: "matter",
                    matter: {
                        gravity: {x: 0, y: GameConfig.physics.gravityY},
                        // Fixed 60 Hz timestep so bounces are reproducible on
                        // devices that drop frames.
                        runner: {fps: 60, frameDeltaSmoothing: false},
                        debug: false,
                    },
                },
                scene: [MainScene],
            },
        });
    }

    setSize(width: number, height: number): void {
        this.phaser.setSize(width, height);
    }
}
