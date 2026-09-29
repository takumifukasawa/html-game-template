/**
 * Resolve once every font spec (e.g. "700 40px MyFont") has loaded, or failed.
 *
 * Canvas text created before an async @font-face is ready renders in the
 * fallback font, so re-apply the text styles in the continuation. Explicitly
 * loading the specs matters: `document.fonts.ready` can resolve before an
 * unused @font-face has even been requested. Never rejects.
 */
export async function loadFonts(specs: string[]): Promise<void> {
    const fonts = document.fonts;
    if (!fonts) {
        return;
    }
    try {
        await Promise.all(specs.map((spec) => fonts.load(spec)));
        await fonts.ready;
    } catch {
        // Font failed to load: the fallback family stays in use.
    }
}
