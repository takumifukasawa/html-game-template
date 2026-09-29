#!/usr/bin/env node
/**
 * Live gameplay VIDEO capture (template tool, game-agnostic).
 *
 * Records the REAL running game (real physics + WebGL postFX) as one
 * continuous clip and transcodes it to mp4 for editing (After Effects etc.).
 *
 *   node tools/capture/capture-video.cjs [seconds] [auto|manual] [skill]
 *   npm run capture -- 40 auto pro
 *
 * Env overrides:
 *   CAP_URL        dev server URL (http://localhost:5173/). Add ?demo=1 for the demo profile.
 *   CAP_SECONDS    time cap (35)
 *   CAP_W, CAP_H   capture size = ad size (1080x1920)
 *   CAP_DISPLAY_H  on-screen preview window height (760); width follows the aspect
 *   CAP_BITRATE    VP9 bitrate (40 Mbps)
 *   CAP_MODE       "auto" (autopilot) | "manual" (you play the window by hand)
 *   CAP_SKILL      autopilot skill passed to the game hooks ("pro" | "normal" | "noob")
 *   CAP_GLOBAL     dev global holding the Phaser.Game ("__game", see PhaserApp.devGlobalName)
 *   CAP_AUTOPILOT  path to the game hooks (tools/capture/autopilot.cjs)
 *
 * How it works:
 *  - HEADED Chromium: WebGL postFX can stall the physics loop when headless.
 *  - `canvas.captureStream(60)` + MediaRecorder record ONLY the canvas backing
 *    buffer, so DOM overlays (the dev finger cursor etc.) never appear. Chunks
 *    stream to disk every second, so Ctrl-C or closing the window still leaves
 *    a valid clip.
 *  - Capture resolution is decoupled from the window: the game's internal
 *    render size is bumped to CAP_W x CAP_H, the first scene is restarted so
 *    it re-lays out, and the on-screen canvas is kept small (CAP_DISPLAY_H).
 *  - Requires the dev server (`npm run dev`), Playwright with Chromium
 *    (`npx playwright install chromium`) and ffmpeg on PATH.
 *
 * GAME HOOKS -- tools/capture/autopilot.cjs (optional, game-owned):
 *
 *   module.exports = {
 *     // true once the first scene is playable (default: scene 0 is active)
 *     isReady: () => boolean,
 *     // mode "auto" only: drive the game. Store any interval in window.__ap
 *     // so it is cleared before the recording is finalised.
 *     start: ({ skill }) => void,
 *   };
 *
 * Both functions are serialised and run IN THE BROWSER, so they must be
 * self-contained: no Node APIs, no references to other module-level values.
 * Without a `start` hook only mode "manual" is available.
 *
 * AUDIO: video-only. For a game with sound, mix the WebAudio graph into the
 * stream (AudioContext -> MediaStreamDestination, add its track) and drop `-an`.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// ---- Config -------------------------------------------------------------
const URL = process.env.CAP_URL || "http://localhost:5173/";
const SECONDS = Number(process.argv[2] || process.env.CAP_SECONDS || 35);
const TARGET = {
  width: Number(process.env.CAP_W || 1080),
  height: Number(process.env.CAP_H || 1920),
};
const DISPLAY_H = Number(process.env.CAP_DISPLAY_H || 760);
const DISPLAY = {
  width: Math.round((TARGET.width / TARGET.height) * DISPLAY_H),
  height: DISPLAY_H,
};
const BITRATE = Number(process.env.CAP_BITRATE || 40_000_000);
const FPS = 60;
const MODE = process.argv[3] || process.env.CAP_MODE || "auto";
const SKILL = (process.argv[4] || process.env.CAP_SKILL || "normal").toLowerCase();
const GLOBAL = process.env.CAP_GLOBAL || "__game";
const AUTOPILOT_PATH = path.resolve(process.env.CAP_AUTOPILOT || path.join(__dirname, "autopilot.cjs"));
const OUT_DIR = path.resolve(__dirname, "..", "..", "store-assets", "video"); // gitignored
// ------------------------------------------------------------------------

function loadPlaywright() {
  try { return require(require.resolve("playwright", { paths: [process.cwd()] })); } catch {}
  try {
    const npx = path.join(process.env.HOME || "", ".npm", "_npx");
    for (const h of fs.readdirSync(npx)) {
      const p = path.join(npx, h, "node_modules", "playwright");
      if (fs.existsSync(p)) return require(p);
    }
  } catch {}
  try { return require("playwright"); } catch {}
  console.error("[capture] Playwright not found. Run: npx playwright install chromium");
  process.exit(1);
}

function loadAutopilot() {
  if (!fs.existsSync(AUTOPILOT_PATH)) return {};
  const hooks = require(AUTOPILOT_PATH);
  if (hooks.isReady && typeof hooks.isReady !== "function") throw new Error("autopilot.isReady must be a function");
  if (hooks.start && typeof hooks.start !== "function") throw new Error("autopilot.start must be a function");
  return hooks;
}

// Default readiness: the first scene exists and is running. Runs in the browser.
const defaultIsReady = (globalName) => {
  const g = window[globalName];
  const s = g && g.scene && g.scene.scenes && g.scene.scenes[0];
  return !!(s && s.sys && s.sys.isActive());
};

const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);

(async () => {
  const autopilot = loadAutopilot();
  if (MODE === "auto" && !autopilot.start) {
    console.error(`[capture] mode "auto" needs a start() hook in ${path.relative(process.cwd(), AUTOPILOT_PATH)}; use mode "manual" or add one.`);
    process.exit(1);
  }
  const waitReady = (page, timeout) =>
    (autopilot.isReady
      ? page.waitForFunction(autopilot.isReady, null, { timeout })
      : page.waitForFunction(defaultIsReady, GLOBAL, { timeout }));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const webmPath = path.join(OUT_DIR, `gameplay-${stamp}.webm`);
  const mp4Path = path.join(OUT_DIR, `gameplay-${stamp}.mp4`);
  fs.writeFileSync(webmPath, Buffer.alloc(0)); // truncate/create

  const { chromium } = loadPlaywright();
  // handleSIGINT/TERM/HUP:false -> Playwright will NOT install its own signal
  // handlers (which otherwise close the browser and exit on Ctrl-C, killing us
  // before we transcode). We handle Ctrl-C ourselves below.
  const browser = await chromium.launch({
    headless: false,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
  });
  const page = await browser.newPage({ viewport: DISPLAY, deviceScaleFactor: 1 });

  // Node-side sink: append base64 chunks (sent in order) to the webm file.
  await page.exposeFunction("__recSink", (b64) => {
    fs.appendFileSync(webmPath, Buffer.from(b64, "base64"));
  });

  await page.goto(URL, { waitUntil: "load", timeout: 20000 });
  await waitReady(page, 20000).catch(() => {
    console.error(`[capture] game never became ready (is window.${GLOBAL} set? is the dev server running at ${URL}?)`);
    process.exit(1);
  });
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});

  // Decouple capture resolution from the window: bump the internal render size
  // to TARGET (the canvas backing buffer is what captureStream records), restart
  // the first scene so it re-lays out for the new size, then keep the on-screen
  // canvas small and refresh() so pointer taps still map correctly (manual play).
  await page.evaluate(({ globalName, tw, th }) => {
    const g = window[globalName];
    g.scale.resize(tw, th);
    g.scene.scenes[0].scene.restart();
  }, { globalName: GLOBAL, tw: TARGET.width, th: TARGET.height });
  await waitReady(page, 20000).catch(() => { console.error("[capture] scene not ready after resize"); process.exit(1); });
  await page.evaluate(({ globalName, dw, dh }) => {
    const g = window[globalName];
    g.canvas.style.width = dw + "px";
    g.canvas.style.height = dh + "px";
    g.scale.refresh();
  }, { globalName: GLOBAL, dw: DISPLAY.width, dh: DISPLAY.height });

  // Set up the recorder in the page.
  await page.evaluate(({ bitrate, fps }) => {
    const canvas = document.querySelector("#wrapper canvas");
    const stream = canvas.captureStream(fps);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9" : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
    window.__rec = rec;

    // Stream each 1s chunk straight to disk (in order) as it arrives, so an
    // early stop still leaves a valid, near-complete recording.
    const blobToB64 = (blob) => new Promise((res) => {
      const r = new FileReader();
      r.onloadend = () => res(String(r.result).split(",")[1]);
      r.readAsDataURL(blob);
    });
    let sendChain = Promise.resolve();
    let sent = 0;
    rec.ondataavailable = (e) => {
      if (!e.data || !e.data.size) return;
      sendChain = sendChain.then(async () => { await window.__recSink(await blobToB64(e.data)); sent++; });
    };
    // Graceful finalize: stop the autopilot + recorder, flush the tail, report count.
    window.__finish = async () => {
      if (window.__ap) clearInterval(window.__ap);
      await new Promise((res) => { rec.onstop = res; try { rec.stop(); } catch { res(); } });
      await sendChain;
      return sent;
    };
    rec.start(1000); // 1s timeslice -> streamable webm chunks
  }, { bitrate: BITRATE, fps: FPS });

  if (MODE === "auto") {
    await page.evaluate(autopilot.start, { skill: SKILL });
  }

  console.log(`[capture] recording up to ${SECONDS}s (capture ${TARGET.width}x${TARGET.height}, window ${DISPLAY.width}x${DISPLAY.height}, mode=${MODE}${MODE === "auto" ? `/${SKILL}` : ""})...`);
  if (MODE === "manual") {
    console.log("[capture] MANUAL: play the opened window by hand.");
  }
  console.log("[capture] Stop early anytime with Ctrl-C (or just close the window); the clip is saved either way.");

  // Finish on whichever comes first: the time cap, Ctrl-C, or the window closing.
  // A PERSISTENT SIGINT listener (not `once`) keeps Node alive through repeat
  // Ctrl-C so the mp4 transcode always completes.
  let resolveStop;
  const stopped = new Promise((r) => (resolveStop = r));
  let done = false;
  const timer = setTimeout(() => { if (!done) { done = true; resolveStop("time cap"); } }, SECONDS * 1000);
  const trigger = (why) => {
    if (done) { console.log("[capture] finishing -- please wait (webm already saved)..."); return; }
    done = true;
    resolveStop(why);
  };
  process.on("SIGINT", () => trigger("Ctrl-C"));
  page.once("close", () => trigger("window closed"));
  browser.once("disconnected", () => trigger("window closed"));
  const reason = await stopped;
  clearTimeout(timer);
  console.log(`[capture] stopping (${reason})...`);

  // If the page is still alive, stop the recorder cleanly and flush the tail.
  // If the window was closed, the streamed webm already holds everything up
  // to ~1s before the close.
  let sent = "streamed";
  if (reason !== "window closed") {
    sent = await page.evaluate(() => window.__finish()).catch(() => "streamed");
  }
  await browser.close().catch(() => {});

  const bytes = fs.existsSync(webmPath) ? fs.statSync(webmPath).size : 0;
  if (bytes === 0) { console.error("[capture] nothing was recorded (stopped too early?)"); process.exit(1); }
  console.log(`[capture] wrote ${webmPath} (${sent} chunks, ${(bytes / 1e6).toFixed(1)} MB)`);

  // Transcode to mp4 (CFR 60, yuv420p, faststart, no audio).
  console.log("[capture] transcoding -> mp4 ...");
  execFileSync("ffmpeg", [
    "-y", "-i", webmPath,
    "-r", String(FPS),
    // H.264 needs even dimensions; the backing buffer can be odd.
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
    mp4Path,
  ], { stdio: "inherit" });

  console.log(`\n[capture] done`);
  console.log(`  webm (master): ${webmPath}`);
  console.log(`  mp4  (edit):   ${mp4Path}`);
})();
