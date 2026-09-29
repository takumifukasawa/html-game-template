/**
 * All tunable values for the game (sample). Keep numbers, colors and names
 * here rather than in code, so tuning never touches logic.
 *
 * Units are meters / seconds (Havok defaults).
 */
export const GameConfig = {
    design: {
        // Max play-field aspect ratio (width / height). Wider viewports are
        // letterboxed into a centered portrait column. 0 = no cap.
        maxAspect: 0.6,
    },

    camera: {
        fovDeg: 50,
        position: {x: 0, y: 4, z: -9},
        lookAt: {x: 0, y: 1, z: 0},
    },

    physics: {
        gravity: 9.81,
        restitution: 0.4,
        // Impulse applied on tap (the box has mass 1, so this is a velocity change).
        tapImpulseUp: 6,
        tapImpulseSide: 2,
        // Tap impulses are applied this far off-center so the box also spins.
        tapOffset: 0.3,
    },

    floor: {
        size: 6,
        thickness: 0.5,
    },

    box: {
        size: 1,
        spawnHeight: 4,
        // Respawn when it falls off the floor below this height.
        resetBelowY: -6,
    },

    save: {
        // localStorage key prefix. Change per game so saves never collide.
        namespace: "game",
    },

    colors: {
        background: "#0a0a1c",
        floor: "#27e6ff",
        box: "#fff2a8",
    },

    // Runtime flag: true only while the ?demo=1 profile is active.
    demoActive: false,
};
