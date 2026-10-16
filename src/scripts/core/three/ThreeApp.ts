import * as THREE from "three";
import {playSize, prepareCanvas} from "@/src/scripts/core/viewport.ts";

export type ThreeAppOptions = {
    /** The canvas created by src/main.ts. The renderer draws into it and never creates its own. */
    canvas: HTMLCanvasElement;
    /** Internal render size = CSS size * ratio (the renderer's pixel ratio), so the game stays crisp on high-DPI screens. */
    ratio: number;
    /** Max play-field aspect ratio (width / height); wider viewports are letterboxed. 0 = no cap. See core/viewport.ts. */
    maxAspect?: number;
    /** Default true. */
    antialias?: boolean;
    /** Extra WebGLRenderer parameters (canvas / antialias are set by ThreeApp). */
    renderer?: Omit<THREE.WebGLRendererParameters, "canvas" | "antialias">;
};

export type ResizeListener = (width: number, height: number) => void;

/**
 * Boots a three.js WebGLRenderer on the canvas created by src/main.ts and owns
 * the sizing: portrait letterboxing, high-DPI render scale, resize handling
 * and the animation loop. Scenes, cameras and physics stay in game code.
 */
export class ThreeApp {
    readonly renderer: THREE.WebGLRenderer;
    readonly canvas: HTMLCanvasElement;
    /** Current play-field size in CSS px (after letterboxing). */
    width = 1;
    height = 1;
    private readonly maxAspect: number;
    private readonly resizeListeners: ResizeListener[] = [];

    constructor(options: ThreeAppOptions) {
        this.canvas = options.canvas;
        this.maxAspect = options.maxAspect ?? 0;
        prepareCanvas(this.canvas);
        this.renderer = new THREE.WebGLRenderer({
            powerPreference: "high-performance",
            ...options.renderer,
            canvas: this.canvas,
            antialias: options.antialias ?? true,
        });
        this.renderer.setPixelRatio(options.ratio);
        this.setSize(window.innerWidth, window.innerHeight);
    }

    /** Call with the viewport size in CSS px (src/main.ts does this on resize). */
    setSize(width: number, height: number): void {
        const {pw, ph} = playSize(width, height, this.maxAspect);
        this.width = pw;
        this.height = ph;
        // updateStyle=true: CSS size = pw x ph, drawing buffer = that * pixel ratio.
        this.renderer.setSize(pw, ph, true);
        for (const listener of this.resizeListeners) {
            listener(pw, ph);
        }
    }

    /** Runs `listener` now and after every resize (e.g. to update a camera's aspect). Returns a remover. */
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

    /**
     * Start the render loop. `time` is seconds; `dt` is the seconds since the
     * previous frame, clamped to `maxDt` so a backgrounded tab does not come
     * back with one huge step.
     */
    start(loop: (time: number, dt: number) => void, maxDt = 0.1): void {
        let last = performance.now() / 1000;
        this.renderer.setAnimationLoop(() => {
            const now = performance.now() / 1000;
            const dt = Math.min(now - last, maxDt);
            last = now;
            loop(now, dt);
        });
    }

    stop(): void {
        this.renderer.setAnimationLoop(null);
    }
}
