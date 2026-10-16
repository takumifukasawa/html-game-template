import {GameConfig} from "./GameConfig.ts";

export type AppArgs = {
    canvas: HTMLCanvasElement;
    ratio: number;
};

/**
 * Placeholder application root: no engine is installed yet.
 *
 * Pick one with `npm run engine -- <phaser|three|babylon>`; that installs the
 * engine and replaces this directory with a runnable sample for it (see
 * docs/TEMPLATE.md). Until then this draws the hint on the canvas created by
 * src/main.ts using the 2D context, so nothing needs installing.
 */
export class App {
    private readonly canvas: HTMLCanvasElement;
    private readonly ratio: number;
    private readonly ctx: CanvasRenderingContext2D;

    constructor(args: AppArgs) {
        this.canvas = args.canvas;
        this.ratio = args.ratio;
        this.ctx = this.canvas.getContext("2d")!;
    }

    /** Call with the viewport size in CSS px (src/main.ts does this on resize). */
    setSize(width: number, height: number): void {
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.canvas.width = Math.max(1, Math.floor(width * this.ratio));
        this.canvas.height = Math.max(1, Math.floor(height * this.ratio));
        this.draw();
    }

    private draw(): void {
        const {ctx, canvas} = this;
        const cfg = GameConfig;
        const s = canvas.height / cfg.design.refHeight;
        ctx.fillStyle = cfg.colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const fontPx = Math.round(cfg.placeholder.fontSize * s);
        const lineHeight = fontPx * 1.8;
        const lines = cfg.placeholder.lines;
        const top = canvas.height / 2 - (lineHeight * (lines.length - 1)) / 2;
        lines.forEach((line, i) => {
            ctx.fillStyle = i === 0 ? cfg.colors.text : cfg.colors.hint;
            ctx.font = `${i === 0 ? "bold " : ""}${fontPx}px ${cfg.placeholder.fontFamily}`;
            ctx.fillText(line, canvas.width / 2, top + lineHeight * i);
        });
    }
}
