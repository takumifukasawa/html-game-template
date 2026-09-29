/**
 * Game hooks for tools/capture/capture-video.cjs (GAME-OWNED; this is the
 * version for the three.js starter App -- rewrite it for your game).
 *
 * Both functions are serialised by Playwright and run IN THE BROWSER, so they
 * must be self-contained: no Node APIs, no references to anything outside
 * their own body. They talk to the game through the dev global the starter
 * App sets (window.__game) and its public members.
 */
module.exports = {
  // True once physics is initialised.
  isReady: () => !!(window.__game && window.__game.ready),

  // Drive the sample: tap on a fixed cadence. skill only changes the cadence.
  start: ({ skill }) => {
    const cd = ({ pro: 450, normal: 700, noob: 1100 })[skill] || 700;
    window.__ap = setInterval(() => {
      const g = window.__game;
      if (g && g.ready) g.onTap();
    }, cd);
  },
};
