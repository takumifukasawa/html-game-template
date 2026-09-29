import Phaser from "phaser";

export type PhaserAppOptions = {
    /** The canvas created by src/main.ts. Phaser renders into it and never creates its own. */
    canvas: HTMLCanvasElement;
    /** Internal render size = CSS size * ratio, so the game stays crisp on high-DPI screens. */
    ratio: number;
    /**
     * Max play-field aspect ratio (width / height). Wider viewports (desktop,
     * landscape) are letterboxed to a centered portrait column so the layout
     * and difficulty stay consistent. Narrower viewports use the full width.
     * 0 = no cap.
     */
    maxAspect?: number;
    /** Renderer. A custom canvas needs an explicit one (Phaser.AUTO is rejected). Default "webgl". */
    renderer?: "webgl" | "canvas";
    /** Game-specific Phaser config: scenes, physics, backgroundColor, ... */
    config?: Omit<Phaser.Types.Core.GameConfig, "canvas" | "width" | "height" | "type" | "scale">;
    /**
     * Name of a dev-only global that holds the Phaser.Game (for debugging and
     * tools such as tools/capture). Only set when import.meta.env.DEV.
     * Default "__game"; null disables it.
     */
    devGlobalName?: string | null;
};

/**
 * Boots Phaser on the canvas created by src/main.ts and owns the sizing:
 * portrait letterboxing, high-DPI render scale, and resize handling.
 * Game code (scenes, physics, colors) is passed in via `config`.
 */
export class PhaserApp {
    readonly game: Phaser.Game;
    readonly canvas: HTMLCanvasElement;
    private readonly ratio: number;
    private readonly maxAspect: number;
    private pendingSize: {width: number; height: number} | null = null;

    constructor(options: PhaserAppOptions) {
        this.canvas = options.canvas;
        this.ratio = options.ratio;
        this.maxAspect = options.maxAspect ?? 0;

        // Kill the mobile browser's tap delay / gesture handling so pointerdown
        // fires immediately (no ~300ms wait, no double-tap zoom / scroll steal).
        this.canvas.style.touchAction = "none";
        (this.canvas.style as unknown as Record<string, string>).webkitTapHighlightColor = "transparent";
        this.canvas.style.userSelect = "none";

        const {pw, ph} = PhaserApp.playSize(window.innerWidth, window.innerHeight, this.maxAspect);
        this.canvas.style.width = `${pw}px`;
        this.canvas.style.height = `${ph}px`;

        this.game = new Phaser.Game({
            ...options.config,
            type: options.renderer === "canvas" ? Phaser.CANVAS : Phaser.WEBGL,
            canvas: this.canvas,
            width: Math.max(1, Math.floor(pw * this.ratio)),
            height: Math.max(1, Math.floor(ph * this.ratio)),
            scale: {mode: Phaser.Scale.NONE},
        });

        const devGlobalName = options.devGlobalName === undefined ? "__game" : options.devGlobalName;
        if (import.meta.env.DEV && devGlobalName) {
            (window as unknown as Record<string, unknown>)[devGlobalName] = this.game;
        }

        this.game.events.once(Phaser.Core.Events.READY, () => {
            if (this.pendingSize) {
                this.applySize(this.pendingSize.width, this.pendingSize.height);
                this.pendingSize = null;
            }
        });
    }

    /** Call with the viewport size in CSS px (src/main.ts does this on resize). */
    setSize(width: number, height: number): void {
        if (!this.game.isBooted) {
            this.pendingSize = {width, height};
            return;
        }
        this.applySize(width, height);
    }

    private applySize(width: number, height: number): void {
        const {pw, ph} = PhaserApp.playSize(width, height, this.maxAspect);
        this.game.scale.resize(Math.max(1, Math.floor(pw * this.ratio)), Math.max(1, Math.floor(ph * this.ratio)));
        this.canvas.style.width = `${pw}px`;
        this.canvas.style.height = `${ph}px`;
        // Make sure pointer coordinates map to the CSS-scaled canvas.
        this.game.scale.refresh();
    }

    /** Clamp a viewport (CSS px) to the max play-field aspect ratio. */
    static playSize(cssW: number, cssH: number, maxAspect: number): {pw: number; ph: number} {
        let pw = cssW;
        const ph = cssH;
        if (maxAspect > 0 && pw / ph > maxAspect) {
            pw = Math.round(ph * maxAspect);
        }
        return {pw, ph};
    }
}
