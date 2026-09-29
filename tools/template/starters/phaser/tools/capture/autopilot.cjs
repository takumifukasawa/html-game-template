/**
 * Game hooks for tools/capture/capture-video.cjs (GAME-OWNED; this is the
 * version for the template's sample MainScene -- rewrite it for your game).
 *
 * Both functions are serialised by Playwright and run IN THE BROWSER, so they
 * must be self-contained: no Node APIs, no references to anything outside
 * their own body. They talk to the game through the dev global set by
 * PhaserApp (window.__game) and the scene's public members.
 */
module.exports = {
  // True once the first scene is playable.
  isReady: () => {
    const s = window.__game && window.__game.scene && window.__game.scene.scenes[0];
    return !!(s && s.sys && s.sys.isActive() && s.ball && s.ball.body);
  },

  // Drive the sample: hop whenever the ball drops below a line while falling.
  // skill only changes how late it reacts (noob = falls more often).
  start: ({ skill }) => {
    const SK = ({
      pro:    { line: 0.45, cd: 120 },
      normal: { line: 0.60, cd: 180 },
      noob:   { line: 0.75, cd: 260 },
    })[skill] || { line: 0.60, cd: 180 };
    let lastTap = 0;
    window.__ap = setInterval(() => {
      const s = window.__game && window.__game.scene && window.__game.scene.scenes[0];
      if (!s || !s.ball || !s.ball.body) return;
      const now = performance.now();
      if (s.state !== "playing") {
        // ready -> start, gameover -> retry (onTap enforces its own retry lock).
        if (now - lastTap > 700) { s.onTap(); lastTap = now; }
        return;
      }
      const falling = s.ball.body.velocity.y > 0;
      if (falling && s.ball.y > s.scale.height * SK.line && now - lastTap > SK.cd) {
        s.onTap();
        lastTap = now;
      }
    }, 25);
  },
};
