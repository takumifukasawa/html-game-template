import * as THREE from "three";
import type {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {FullScreenQuad} from "three/examples/jsm/postprocessing/Pass.js";
import {CopyShader} from "three/examples/jsm/shaders/CopyShader.js";

/**
 * Makes three.js's UnrealBloomPass temporally stable, so thin or small bright
 * things (lines, rings, star points) do not shimmer as they move.
 *
 * Why it shimmers: the pass extracts the bright areas with a single texture tap
 * from the full-resolution scene into a half-size buffer (half of the size the
 * pass was given), then blurs a chain of ever smaller mips. A light that moves
 * by a fraction of a pixel is caught or missed frame to frame, and every mip
 * level amplifies it. Its default threshold knee (0.01) is a hard cut on top.
 *
 * What this does (the rest of the pass is untouched):
 * 1. Bright pass = a filtered downsample: a 4x4 block (4 bilinear taps + the
 *    center), each tap weighted down by its brightness (Karis average, so one
 *    hot pixel does not dominate), then the threshold with a soft knee.
 * 2. Temporal smoothing: the composited bloom is mixed with last frame's.
 *    Bloom is soft and wide, so the short lag does not show on moving lights;
 *    too high a mix does smear small bright objects (keep it around 0.5-0.7).
 *
 * Usage, with an EffectComposer that contains the pass:
 *   const stable = new StableBloom(bloomPass);
 *   stable.setSourceSize(width * pixelRatio, height * pixelRatio); // on resize
 *   stable.beforeRender();                                         // each frame
 *   composer.render();
 *   stable.afterRender(renderer);
 * Give the pass a resolution of the full buffer (bright pass at half): at half
 * of it (a quarter of the screen) thin lights shimmer much more.
 * See docs/knowledge/three-bloom-flicker.md.
 */
export class StableBloom {
    /** Share of last frame's bloom kept each frame, at 60 fps (0 = off). */
    temporalMix = 0.65;
    private readonly bloom: UnrealBloomPass;
    private readonly history = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType, depthBuffer: false});
    private readonly copy = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms),
        vertexShader: CopyShader.vertexShader,
        fragmentShader: CopyShader.fragmentShader,
    }));
    private last = 0;

    constructor(bloom: UnrealBloomPass) {
        this.bloom = bloom;
        const internals = bloom as unknown as {materialHighPassFilter: THREE.ShaderMaterial; compositeMaterial: THREE.ShaderMaterial};
        const u = this.highPass();
        u.uSrcTexel = {value: new THREE.Vector2(1 / 1024, 1 / 1024)};
        u.smoothWidth.value = 0.3;
        const m = internals.materialHighPassFilter;
        m.fragmentShader = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec3 defaultColor;
uniform float defaultOpacity;
uniform float luminosityThreshold;
uniform float smoothWidth;
uniform vec2 uSrcTexel;
varying vec2 vUv;
vec3 tap(vec2 o, inout float wsum) {
    vec3 c = texture2D(tDiffuse, vUv + o * uSrcTexel).rgb;
    float w = 1.0 / (1.0 + luminance(c));
    wsum += w;
    return c * w;
}
void main() {
    float wsum = 0.0;
    vec3 c = tap(vec2(-1.0, -1.0), wsum) + tap(vec2(1.0, -1.0), wsum)
        + tap(vec2(-1.0, 1.0), wsum) + tap(vec2(1.0, 1.0), wsum) + tap(vec2(0.0), wsum);
    c /= wsum;
    float v = luminance(c);
    float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);
    gl_FragColor = mix(vec4(defaultColor.rgb, defaultOpacity), vec4(c, 1.0), alpha);
}
`;
        m.needsUpdate = true;
        const c = internals.compositeMaterial;
        c.uniforms.tBloomHistory = {value: this.history.texture};
        c.uniforms.uHistoryMix = {value: 0};
        c.fragmentShader = c.fragmentShader
            .replace("uniform float bloomStrength;", "uniform float bloomStrength;\nuniform sampler2D tBloomHistory;\nuniform float uHistoryMix;")
            .replace("gl_FragColor = vec4( bloom, bloomAlpha );",
                "vec4 cur = vec4( bloom, bloomAlpha );\ngl_FragColor = mix( cur, texture2D( tBloomHistory, vUv ), uHistoryMix );");
        c.needsUpdate = true;
    }

    /** Soft knee of the threshold (luminance range it eases over). The stock 0.01 is a hard cut. */
    set knee(value: number) {
        this.highPass().smoothWidth.value = value;
    }

    /** The scene buffer size in pixels (CSS size * pixel ratio). Call on resize. */
    setSourceSize(width: number, height: number): void {
        (this.highPass().uSrcTexel.value as THREE.Vector2).set(1 / Math.max(1, width), 1 / Math.max(1, height));
    }

    /** Each frame, before composer.render(): the history weight, frame-rate independent. */
    beforeRender(): void {
        const now = performance.now();
        const dt = this.last > 0 ? Math.min(0.1, (now - this.last) / 1000) : 1;
        this.last = now;
        const u = (this.bloom as unknown as {compositeMaterial: THREE.ShaderMaterial}).compositeMaterial.uniforms;
        u.tBloomHistory.value = this.history.texture;
        u.uHistoryMix.value = Math.pow(THREE.MathUtils.clamp(this.temporalMix, 0, 0.95), dt * 60);
    }

    /** Each frame, after composer.render(): keep this frame's bloom for the next one. */
    afterRender(renderer: THREE.WebGLRenderer): void {
        const target = (this.bloom as unknown as {renderTargetsHorizontal: THREE.WebGLRenderTarget[]}).renderTargetsHorizontal[0];
        if (this.history.width !== target.width || this.history.height !== target.height) {
            this.history.setSize(target.width, target.height);
        }
        (this.copy.material as THREE.ShaderMaterial).uniforms.tDiffuse.value = target.texture;
        const previous = renderer.getRenderTarget();
        renderer.setRenderTarget(this.history);
        this.copy.render(renderer);
        renderer.setRenderTarget(previous);
    }

    dispose(): void {
        this.history.dispose();
        this.copy.dispose();
    }

    private highPass(): Record<string, THREE.IUniform> {
        return this.bloom.highPassUniforms as Record<string, THREE.IUniform>;
    }
}
