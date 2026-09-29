/**
 * Tunable values for the placeholder app. Real games keep every number, color
 * and name in this file (see the engine starters) so tuning never touches logic.
 */
export const GameConfig = {
    design: {
        // Reference portrait height the sizes below are tuned against.
        refHeight: 1280,
    },

    placeholder: {
        fontSize: 34,
        fontFamily: "monospace",
        lines: [
            "No engine selected",
            "npm run engine -- phaser",
            "npm run engine -- three",
            "npm run engine -- babylon",
        ],
    },

    colors: {
        background: "#0a0a1c",
        text: "#ffffff",
        hint: "#9ad0ff",
    },
};
