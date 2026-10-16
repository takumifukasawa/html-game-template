import {Engine, type EngineOptions} from "@babylonjs/core";
import {playSize, prepareCanvas} from "@/src/scripts/core/viewport.ts";

export type BabylonAppOptions = {
    /** The canvas created by src/main.ts. The engine draws into it and never creates its own. */
    canvas: HTMLCanvasElement;
    /** Internal render size = CSS size * ratio, so the game stays crisp on high-DPI screens. */
    ratio: number;
    /** Max play-field aspect ratio (width / height); wider viewports are letterboxed. 0 = no cap. See core/viewport.ts. */
    maxAspect?: number;
    /** Default true. */
    antialias?: boolean;
    /** Extra Engine options (adaptToDeviceRatio is managed by BabylonApp via `ratio`). */
    engineOptions?: Omit<EngineOptions, "adaptToDeviceRatio">;
};

export type ResizeListener = (width: number, height: number) => void;

/**
 * Boots a Babylon.js Engine on the canvas created by src/main.ts and owns the
 * sizing: portrait letterboxing, high-DPI render scale, resize handling and
 * the render loop. Scenes, cameras and physics stay in game code.
 */
export class BabylonApp {
    readonly engine: Engine;
    readonly canvas: HTMLCanvasElement;
    /** Current play-field size in CSS px (after letterboxing). */
    width = 1;
    height = 1;
    private readonly maxAspect: number;
    private readonly resizeListeners: ResizeListener[] = [];

    constructor(options: BabylonAppOptions) {
        this.canvas = options.canvas;
        this.maxAspect = options.maxAspect ?? 0;
        prepareCanvas(this.canvas);
        this.engine = new Engine(this.canvas, options.antialias ?? true, {
            stencil: true,
            ...options.engineOptions,
            adaptToDeviceRatio: false,
        });
        // Babylon's hardware scaling is the inverse of a pixel ratio (1 = CSS size).
        this.engine.setHardwareScalingLevel(1 / options.ratio);
        this.setSize(window.innerWidth, window.innerHeight);
    }

    /** Call with the viewport size in CSS px (src/main.ts does this on resize). */
    setSize(width: number, height: number): void {
        const {pw, ph} = playSize(width, height, this.maxAspect);
        this.width = pw;
        this.height = ph;
        this.canvas.style.width = `${pw}px`;
        this.canvas.style.height = `${ph}px`;
        // Re-reads the CSS size and applies the hardware scaling level.
        this.engine.resize();
        for (const listener of this.resizeListeners) {
            listener(pw, ph);
        }
    }

    /** Runs `listener` now and after every resize. Returns a remover. */
    onResize(listener: ResizeListener): () => void {
        this.resizeListeners.push(listener);
        listener(this.width, this.height);
        return () => {
            const i = this.resizeListeners.indexOf(listener);
            if (i >= 0) {
                this.resizeListeners.splice(i, 1);
            }
        };
    }

    /** Start the render loop (typically `() => scene.render()`). */
    run(render: () => void): void {
        this.engine.runRenderLoop(render);
    }

    stop(): void {
        this.engine.stopRenderLoop();
    }
}
