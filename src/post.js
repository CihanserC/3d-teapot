import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const ColorGradeShader = {
  name: 'AureliaColorGrade',
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uContrast: { value: 1.02 },
    uSaturation: { value: 1.02 },
    uBrightness: { value: 1 },
    uTemperature: { value: 0 },
    uLift: { value: 0 },
    uFade: { value: 0 },
    uVignette: { value: 0.16 },
    uGrain: { value: 0.012 },
    uAberration: { value: 0.0002 },
    uSharpness: { value: 0.08 },
    uSplit: { value: 0 },
    uShadowTint: { value: new THREE.Vector3(0, 0, 0) },
    uHighlightTint: { value: new THREE.Vector3(0, 0, 0) }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uBrightness;
    uniform float uTemperature;
    uniform float uLift;
    uniform float uFade;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uSharpness;
    uniform float uSplit;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    varying vec2 vUv;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float edge = dot(centered, centered);
      float ca = uAberration * edge * 3.2;

      vec3 color;
      color.r = texture2D(tDiffuse, uv + centered * ca).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - centered * ca).b;

      // Gentle clarity in display space.
      vec2 texel = 1.0 / uResolution;
      vec3 soft = texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).rgb;
      soft += texture2D(tDiffuse, uv - vec2(texel.x, 0.0)).rgb;
      soft += texture2D(tDiffuse, uv + vec2(0.0, texel.y)).rgb;
      soft += texture2D(tDiffuse, uv - vec2(0.0, texel.y)).rgb;
      soft *= 0.25;
      color += (color - soft) * uSharpness;

      // Grade: exposure, white balance, contrast, colour.
      color *= uBrightness;
      color.r *= 1.0 + uTemperature * 0.105;
      color.b *= 1.0 - uTemperature * 0.125;
      color.g += uTemperature * 0.004;

      color = (color - 0.5) * uContrast + 0.5;

      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, uSaturation);
      color += uLift;

      // Faded film stock, with a warm lifted black.
      color = mix(color, color * 0.9 + vec3(0.075, 0.062, 0.05), uFade);

      // Subtle split toning.
      float splitLuma = smoothstep(0.08, 0.82, dot(clamp(color, 0.0, 1.0), vec3(0.2126, 0.7152, 0.0722)));
      color += uShadowTint * (1.0 - splitLuma) * uSplit;
      color += uHighlightTint * splitLuma * uSplit;

      // Vignette.
      float vignette = smoothstep(0.82, 0.22, length(centered));
      color *= mix(1.0, vignette, uVignette);

      // Fine, animated film grain.
      float n1 = hash21(uv * uResolution + uTime * 14.31);
      float n2 = hash21(uv * uResolution * 0.47 - uTime * 8.17);
      float grain = (n1 + n2 - 1.0) * uGrain;
      color += grain * (0.4 + 0.6 * (1.0 - clamp(luma, 0.0, 1.0)));

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `
};

export function createPostPipeline(renderer, scene, camera) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = renderer.getPixelRatio();

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width * dpr, height * dpr),
    0.16,
    0.58,
    1.12
  );

  const outputPass = new OutputPass();
  const gradePass = new ShaderPass(ColorGradeShader);
  gradePass.material.toneMapped = false;
  gradePass.uniforms.uResolution.value.set(width * dpr, height * dpr);

  const fxaaPass = new ShaderPass(FXAAShader);
  fxaaPass.uniforms.resolution.value.set(1 / (width * dpr), 1 / (height * dpr));

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);
  composer.addPass(gradePass);
  composer.addPass(fxaaPass);

  const state = {
    contrast: 1.02,
    saturation: 1.02,
    brightness: 1,
    temperature: 0,
    lift: 0,
    fade: 0,
    vignette: 0.16,
    grain: 0.012,
    aberration: 0.0002,
    sharpness: 0.08,
    split: 0,
    bloom: 0.16,
    shadowTint: new THREE.Vector3(0, 0, 0),
    highlightTint: new THREE.Vector3(0, 0, 0)
  };
  const targets = {
    ...state,
    shadowTint: new THREE.Vector3(0, 0, 0),
    highlightTint: new THREE.Vector3(0, 0, 0)
  };

  function setFilter(filter) {
    const values = filter.uniforms;
    for (const key of [
      'contrast',
      'saturation',
      'brightness',
      'temperature',
      'lift',
      'fade',
      'vignette',
      'grain',
      'aberration',
      'sharpness',
      'split',
      'bloom'
    ]) {
      targets[key] = values[key];
    }
    targets.shadowTint.set(...values.shadowTint);
    targets.highlightTint.set(...values.highlightTint);
  }

  function update(dt, elapsed) {
    for (const key of [
      'contrast',
      'saturation',
      'brightness',
      'temperature',
      'lift',
      'fade',
      'vignette',
      'grain',
      'aberration',
      'sharpness',
      'split'
    ]) {
      state[key] = THREE.MathUtils.damp(state[key], targets[key], 7, dt);
    }
    state.shadowTint.lerp(targets.shadowTint, 1 - Math.exp(-7 * dt));
    state.highlightTint.lerp(targets.highlightTint, 1 - Math.exp(-7 * dt));
    state.bloom = THREE.MathUtils.damp(state.bloom, targets.bloom, 5, dt);

    const uniforms = gradePass.uniforms;
    uniforms.uTime.value = elapsed;
    uniforms.uContrast.value = state.contrast;
    uniforms.uSaturation.value = state.saturation;
    uniforms.uBrightness.value = state.brightness;
    uniforms.uTemperature.value = state.temperature;
    uniforms.uLift.value = state.lift;
    uniforms.uFade.value = state.fade;
    uniforms.uVignette.value = state.vignette;
    uniforms.uGrain.value = state.grain;
    uniforms.uAberration.value = state.aberration;
    uniforms.uSharpness.value = state.sharpness;
    uniforms.uSplit.value = state.split;
    uniforms.uShadowTint.value.copy(state.shadowTint);
    uniforms.uHighlightTint.value.copy(state.highlightTint);
    bloomPass.strength = state.bloom;
  }

  function setSize(w, h, pixelRatio) {
    composer.setPixelRatio(pixelRatio);
    composer.setSize(w, h);
    gradePass.uniforms.uResolution.value.set(w * pixelRatio, h * pixelRatio);
    fxaaPass.uniforms.resolution.value.set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
  }

  return {
    composer,
    renderPass,
    bloomPass,
    outputPass,
    gradePass,
    fxaaPass,
    renderTarget: composer.renderTarget1,
    setFilter,
    update,
    setSize,
    state,
    targets
  };
}
