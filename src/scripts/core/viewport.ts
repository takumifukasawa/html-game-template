/**
 * Viewport helpers shared by the engine bootstrappers
 * (core/phaser/PhaserApp, core/three/ThreeApp, core/babylon/BabylonApp).
 */

/**
 * Clamp a viewport (CSS px) to a max play-field aspect ratio (width / height).
 * Wider viewports (desktop, landscape) get a centered portrait column so the
 * layout and difficulty stay consistent; narrower ones use the full width.
 * maxAspect 0 = no cap.
 */
export function playSize(cssW: number, cssH: number, maxAspect: number): {pw: number; ph: number} {
    let pw = cssW;
    const ph = cssH;
    if (maxAspect > 0 && pw / ph > maxAspect) {
        pw = Math.round(ph * maxAspect);
    }
    return {pw, ph};
}

/**
 * Kill the mobile browser's tap delay / gesture handling on the canvas so
 * pointerdown fires immediately (no ~300ms wait, no double-tap zoom, no
 * scroll steal, no long-press highlight).
 */
export function prepareCanvas(canvas: HTMLCanvasElement): void {
    canvas.style.touchAction = "none";
    (canvas.style as unknown as Record<string, string>).webkitTapHighlightColor = "transparent";
    canvas.style.userSelect = "none";
}
