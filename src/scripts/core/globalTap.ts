/**
 * Listen for taps anywhere on the page EXCEPT the canvas, e.g. the dark
 * letterbox bars beside a portrait play column on desktop. The engine's own
 * pointer input already handles taps on the canvas, so those are skipped to
 * avoid handling one tap twice.
 *
 * Returns a function that removes the listener (call it on scene shutdown).
 */
export function listenTapOutsideCanvas(
    canvas: HTMLCanvasElement,
    handler: (event: PointerEvent) => void,
): () => void {
    const onPointerDown = (event: PointerEvent) => {
        if (event.target === canvas) {
            return;
        }
        handler(event);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
}
