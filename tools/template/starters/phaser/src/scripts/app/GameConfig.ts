/**
 * All tunable values for the game (sample). Keep numbers, colors and names
 * here rather than in code, so tuning never touches logic.
 *
 * Lengths/velocities are in pixels at the reference height (design.refHeight);
 * scenes multiply by `gameHeight / refHeight` so the feel is the same on every
 * screen. Velocities are px per physics step (60 steps/sec).
 */
export const GameConfig = {
    design: {
        // Reference portrait height the values below are tuned against.
        refHeight: 1280,
        // Max play-field aspect ratio (width / height). Wider viewports are
        // letterboxed into a centered portrait column. 0 = no cap.
        maxAspect: 0.6,
    },

    physics: {
        // Matter world gravity (1.0 = Matter standard).
        gravityY: 2.0,
        // Upward velocity set on tap (vy is overwritten, vx is preserved).
        jumpVelocity: 13,
        // Constant horizontal speed; the ball ping-pongs between the walls.
        horizontalSpeed: 3.4,
        // Restitution for ball / walls (1 = fully elastic).
        restitution: 1,
        // Static wall body thickness (thick to avoid tunneling).
        wallThickness: 90,
    },

    ball: {
        radius: 24,
        spawnXRatio: 0.5,
        spawnYRatio: 0.3,
    },

    ui: {
        // Use a bundled web font by declaring @font-face in index.html and
        // re-applying text styles after core/fonts.ts loadFonts() resolves.
        fontFamily: "sans-serif",
        showBest: true,
    },

    flow: {
        // Ignore taps on the result screen for this long (avoid accidental retry).
        retryLockMs: 600,
    },

    save: {
        // localStorage key prefix. Change per game so saves never collide.
        namespace: "game",
    },

    colors: {
        background: 0x0a0a1c,
        wall: 0x27e6ff,
        ball: 0xfff2a8,
        text: "#ffffff",
        hint: "#9ad0ff",
    },

    // Runtime flag: true only while the ?demo=1 profile is active.
    demoActive: false,
};
