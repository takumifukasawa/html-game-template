import {applyOverrides, type DeepPartial} from "@/src/scripts/core/configOverride.ts";
import {hasQueryFlag} from "@/src/scripts/core/query.ts";
import {GameConfig} from "./GameConfig.ts";

/**
 * Demo / capture profile -- applied ONLY when the URL has `?demo=1`.
 *
 * Recording-friendly overrides for ad footage (bigger, calmer, more legible at
 * thumbnail size). The shipped game (no query param) keeps GameConfig
 * untouched, so the ad differs from the real game by exactly these knobs.
 * Tune here, capture, and graduate what genuinely helps into GameConfig.
 */
export const DemoProfile: DeepPartial<typeof GameConfig> = {
    ball: {radius: 32},
    ui: {showBest: false},
    demoActive: true,
};

/** Call once at boot, BEFORE the first scene is created. Returns whether it applied. */
export function applyDemoProfile(): boolean {
    if (!hasQueryFlag("demo")) {
        return false;
    }
    applyOverrides(GameConfig, DemoProfile);
    return true;
}
