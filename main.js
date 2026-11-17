import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  COLORS,
  FINISHES,
  FILTERS,
  INITIAL_STATE,
  MOODS,
  CAMERA_PRESETS
} from './config.js';
import {
  buildStudioEnvironment,
  createContactShadows,
  createDust,
  createFloor,
  createLights,
  createPlinth,
  createSky,
  PLINTH_TOP
} from './environment.js';
import { buildTeapot } from './teapot.js';
import { createPostPipeline } from './post.js';

const $ = (selector) => document.querySelector(selector);
const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const initialColor = COLORS.find((item) => item.hex === INITIAL_STATE.color) || COLORS[0];
const initialFinish = FINISHES.find((item) => item.id === INITIAL_STATE.finish) || FINISHES[0];
const initialMood = MOODS.find((item) => item.id === INITIAL_STATE.mood) || MOODS[0];
const initialFilter = FILTERS.find((item) => item.id === INITIAL_STATE.filter) || FILTERS[0];

const state = {
  color: initialColor.hex,
  colorName: initialColor.name,
  isCustom: false,
  finish: initialFinish,
  mood: initialMood,
  filter: initialFilter,
  camera: INITIAL_STATE.camera,
  autoRotate: !reducedMotion
};

let renderer;
let scene;
let camera;
let controls;
let post;
let lastFrameTime = 0;
let sky;
let lights;
let floor;
let plinth;
let contactShadows;
let dust;
let teapot;

let elapsed = 0;
let cameraTween = null;
let moodTarget = null;
let colorTarget = new THREE.Color(state.color);
let finishTarget = { ...initialFinish.params };
let toastTimer = null;
let prefersMobile = false;

const pointer = new THREE.Vector2();

init();

async function init() {
  try {
    await waitForFonts();

    createScene();
    buildInterface();
    bindInterface();
    bindGlobalEvents();
    setMood(initialMood, true);
    setColor(initialColor.hex, { instant: true });
    setFinish(initialFinish, { instant: true });
    setFilter(initialFilter);
    setAutoRotate(!reducedMotion, { silent: true });
    setCameraPreset(INITIAL_STATE.camera, true);

    resize();
    applyMoodInstant(initialMood);

    const bootStatus = $('#bootStatus');
    if (bootStatus) bootStatus.textContent = 'Işık dokusu işleniyor';

    // Warm the shader cache before lifting the curtain.
    try {
      await Promise.race([
        renderer.compileAsync(scene, camera),
        new Promise((resolve) => setTimeout(resolve, 2200))
      ]);
    } catch (error) {
      console.warn('Shader warmup skipped', error);
    }

    post.composer.render();
    lastFrameTime = performance.now();
    requestAnimationFrame(animate);

    if (bootStatus) bootStatus.textContent = 'Atölye hazır';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.body.classList.add('is-ready'));
    });
  } catch (error) {
    console.error(error);
    const bootStatus = $('#bootStatus');
    if (bootStatus) {
      bootStatus.textContent = 'Sahne başlatılamadı · WebGL / donanım hızlandırma gerekli';
      bootStatus.style.color = 'rgba(226, 171, 132, 0.88)';
    }
  }
}

function waitForFonts() {
  if (!document.fonts || !document.fonts.ready) return Promise.resolve();
  return Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 1400))
  ]);
}

function getPixelRatio() {
  const cap = window.innerWidth <= 940 ? 1.7 : 1.85;
  const budgetDpr = Math.sqrt(4_000_000 / (window.innerWidth * window.innerHeight));
  return Math.max(1, Math.min(window.devicePixelRatio || 1, cap, budgetDpr));
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 940px)').matches;
}

function createScene() {
  prefersMobile = isMobileViewport();

  const stage = $('#stage');
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false
  });
  renderer.setPixelRatio(getPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = initialMood.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.domElement.id = 'teapot-canvas';
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute(
    'aria-label',
    'Aurelia porselen çaydanlık sahnesi. Sürükleyerek döndürebilir, kaydırarak yakınlaşabilirsiniz.'
  );
  renderer.domElement.tabIndex = 0;
  stage.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(new THREE.Color(initialMood.fog), initialMood.fogDensity);
  scene.environment = buildStudioEnvironment(renderer);
  scene.environmentIntensity = initialMood.envIntensity;

  sky = createSky(initialMood);
  scene.add(sky.mesh);

  floor = createFloor(initialMood);
  scene.add(floor.mesh);

  plinth = createPlinth();
  scene.add(plinth.group);

  teapot = buildTeapot();
  teapot.group.position.y = PLINTH_TOP;
  scene.add(teapot.group);

  contactShadows = createContactShadows();
  scene.add(contactShadows.group);

  lights = createLights();
  scene.add(
    lights.key,
    lights.key.target,
    lights.fill,
    lights.fill.target,
    lights.rim,
    lights.rim.target,
    lights.hemi,
    lights.areaFill,
    lights.topSoftbox,
    lights.spotPool,
    lights.spotPool.target
  );

  dust = createDust(initialMood);
  scene.add(dust.points);

  if (prefersMobile) {
    camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 150);
    camera.position.set(3.15, 2.95, 8.35);
  } else {
    camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 150);
    camera.position.set(3.55, 2.55, 4.25);
  }

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = prefersMobile ? 3.2 : 2.5;
  controls.maxDistance = prefersMobile ? 13.5 : 8.5;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI / 2 - 0.018;
  controls.autoRotateSpeed = 0.55;
  controls.target.set(0, prefersMobile ? 0.52 : 1.12, 0);
  controls.update(0);

  post = createPostPipeline(renderer, scene, camera);

  // Useful for the included visual smoke tests and for live art-direction tweaks.
  window.__AURELIA__ = {
    renderer,
    scene,
    camera,
    controls,
    post,
    lights,
    teapot,
    floor,
    plinth,
    dust,
    sky,
    state,
    getMoodTarget: () => moodTarget
  };
}

function bakeMoodTarget(mood) {
  const fillColor = new THREE.Color(mood.fill.color);
  const areaColor = fillColor.clone().lerp(new THREE.Color('#d9e9ff'), 0.38);
  const topColor = new THREE.Color('#fff5e8').lerp(new THREE.Color(mood.key.color), 0.24);
  return {
    keyColor: new THREE.Color(mood.key.color),
    fillColor,
    rimColor: new THREE.Color(mood.rim.color),
    hemiSky: new THREE.Color(mood.hemi.sky),
    hemiGround: new THREE.Color(mood.hemi.ground),
    areaColor,
    topColor,
    spotColor: new THREE.Color(mood.key.color),
    dustColor: new THREE.Color(mood.dust),
    fogColor: new THREE.Color(mood.fog),
    floorColor: new THREE.Color(mood.floor.color),
    skyTop: new THREE.Color(mood.sky.top),
    skyBottom: new THREE.Color(mood.sky.bottom),
    skyGlow: new THREE.Color(mood.sky.glow),
    glowDirection: new THREE.Vector3(...mood.sky.glowDirection).normalize(),
    keyPosition: new THREE.Vector3(...mood.key.position),
    fillPosition: new THREE.Vector3(...mood.fill.position),
    rimPosition: new THREE.Vector3(...mood.rim.position),
    keyIntensity: mood.key.intensity,
    fillIntensity: mood.fill.intensity,
    rimIntensity: mood.rim.intensity,
    hemiIntensity: mood.hemi.intensity,
    areaIntensity: 0.28 + mood.fill.intensity * 1.15,
    topIntensity: 0.05 + mood.key.intensity * 0.05,
    spotIntensity: 7 + mood.key.intensity * 12,
    exposure: mood.exposure,
    envIntensity: mood.envIntensity,
    fogDensity: mood.fogDensity,
    glowStrength: mood.sky.glowStrength,
    horizonStrength: mood.sky.horizonStrength,
    floorRoughness: mood.floor.roughness,
    floorClearcoat: mood.floor.clearcoat,
    floorClearcoatRoughness: mood.floor.clearcoatRoughness,
    dustOpacity: mood.dustOpacity
  };
}

function applyMoodInstant(mood) {
  if (!moodTarget) return;
  lights.key.color.copy(moodTarget.keyColor);
  lights.fill.color.copy(moodTarget.fillColor);
  lights.rim.color.copy(moodTarget.rimColor);
  lights.hemi.color.copy(moodTarget.hemiSky);
  lights.hemi.groundColor.copy(moodTarget.hemiGround);
  lights.areaFill.color.copy(moodTarget.areaColor);
  lights.topSoftbox.color.copy(moodTarget.topColor);
  lights.spotPool.color.copy(moodTarget.spotColor);
  lights.key.position.copy(moodTarget.keyPosition);
  lights.fill.position.copy(moodTarget.fillPosition);
  lights.rim.position.copy(moodTarget.rimPosition);
  lights.key.intensity = moodTarget.keyIntensity;
  lights.fill.intensity = moodTarget.fillIntensity;
  lights.rim.intensity = moodTarget.rimIntensity;
  lights.hemi.intensity = moodTarget.hemiIntensity;
  lights.areaFill.intensity = moodTarget.areaIntensity;
  lights.topSoftbox.intensity = moodTarget.topIntensity;
  lights.spotPool.intensity = moodTarget.spotIntensity;

  sky.uniforms.uTop.value.copy(moodTarget.skyTop);
  sky.uniforms.uBottom.value.copy(moodTarget.skyBottom);
  sky.uniforms.uGlow.value.copy(moodTarget.skyGlow);
  sky.uniforms.uGlowDirection.value.copy(moodTarget.glowDirection);
  sky.uniforms.uGlowStrength.value = moodTarget.glowStrength;
  sky.uniforms.uHorizonStrength.value = moodTarget.horizonStrength;

  scene.fog.color.copy(moodTarget.fogColor);
  scene.fog.density = moodTarget.fogDensity;
  scene.environmentIntensity = moodTarget.envIntensity;
  renderer.toneMappingExposure = moodTarget.exposure;

  floor.material.color.copy(moodTarget.floorColor);
  floor.material.roughness = moodTarget.floorRoughness;
  floor.material.clearcoat = moodTarget.floorClearcoat;
  floor.material.clearcoatRoughness = moodTarget.floorClearcoatRoughness;

  dust.uniforms.uColor.value.copy(moodTarget.dustColor);
  dust.uniforms.uOpacity.value = moodTarget.dustOpacity;
}

function setMood(mood, instant = false) {
  state.mood = mood;
  moodTarget = bakeMoodTarget(mood);
  if (instant) applyMoodInstant(mood);
  const moodNote = $('#moodNote');
  if (moodNote) moodNote.textContent = mood.note;
  document.querySelectorAll('[data-mood]').forEach((button) => {
    const active = button.dataset.mood === mood.id;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function setColor(hex, { instant = false, custom = false } = {}) {
  const normalized = String(hex).toUpperCase();
  const match = COLORS.find((item) => item.hex.toUpperCase() === normalized);
  state.color = normalized;
  state.colorName = match ? match.name : 'Özel Ton';
  state.isCustom = custom || !match;
  colorTarget = new THREE.Color(normalized);

  if (instant) teapot.materials.porcelain.color.copy(colorTarget);

  const colorName = $('#colorName');
  const colorHex = $('#colorHex');
  const activeSwatch = $('#activeSwatch');
  const customRow = $('#customRow');
  const customColor = $('#customColor');

  if (colorName) colorName.textContent = state.colorName;
  if (colorHex) colorHex.textContent = normalized;
  if (activeSwatch) activeSwatch.style.background = normalized;
  if (customRow) customRow.classList.toggle('is-active', state.isCustom);
  if (customColor) customColor.value = normalized;
  document.documentElement.style.setProperty('--selected', normalized);

  document.querySelectorAll('[data-swatch]').forEach((button) => {
    const active = button.dataset.swatch.toUpperCase() === normalized;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function setFinish(finish, instant = false) {
  state.finish = finish;
  finishTarget = { ...finish.params };

  const porcelain = teapot.materials.porcelain;
  const targetHasIridescence = finish.params.iridescence > 0;
  if (targetHasIridescence && porcelain.iridescence === 0) {
    porcelain.iridescence = 0.00001;
    porcelain.needsUpdate = true;
  }

  if (instant) {
    porcelain.roughness = finish.params.roughness;
    porcelain.clearcoat = finish.params.clearcoat;
    porcelain.clearcoatRoughness = finish.params.clearcoatRoughness;
    porcelain.metalness = finish.params.metalness;
    porcelain.sheen = finish.params.sheen;
    porcelain.sheenRoughness = finish.params.sheenRoughness;
    porcelain.iridescence = finish.params.iridescence;
    porcelain.iridescenceIOR = finish.params.iridescenceIOR;
    porcelain.envMapIntensity = finish.params.envMapIntensity;
    porcelain.bumpScale = finish.id === 'matte' ? 0.006 : 0.0025;
  }

  document.querySelectorAll('[data-finish]').forEach((button) => {
    const active = button.dataset.finish === finish.id;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const finishNote = $('#finishNote');
  if (finishNote) finishNote.textContent = finish.name;
}

function setFilter(filter) {
  state.filter = filter;
  post.setFilter(filter);
  const filterName = $('#filterPillName');
  const filterCode = $('#filterPillCode');
  const filterCounter = $('#filterCounter');
  if (filterName) filterName.textContent = filter.name;
  if (filterCode) filterCode.textContent = filter.code;
  if (filterCounter) filterCounter.textContent = `${filter.code} / ${String(FILTERS.length).padStart(2, '0')}`;

  document.querySelectorAll('[data-filter]').forEach((button) => {
    const active = button.dataset.filter === filter.id;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function setAutoRotate(enabled, { silent = false } = {}) {
  if (!controls) return;
  state.autoRotate = enabled;
  controls.autoRotate = enabled;
  const button = $('#autoRotateButton');
  if (button) {
    button.classList.toggle('is-on', enabled);
    button.setAttribute('aria-checked', String(enabled));
  }
  if (!silent) {
    showToast(enabled ? 'Sinematik tur açık' : 'Sinematik tur kapalı');
  }
}

function getPresetFraming(preset) {
  const target = new THREE.Vector3(...preset.target);
  const position = new THREE.Vector3(...preset.position);

  if (isMobileViewport()) {
    const mobileTarget = new THREE.Vector3(target.x, 0.52, target.z);
    const offset = position.clone().sub(target).multiplyScalar(1.55);
    mobileTarget.y = 0.52;
    return { target: mobileTarget, position: mobileTarget.clone().add(offset) };
  }
  return { target, position };
}

function setCameraPreset(id, instant = false) {
  const preset = CAMERA_PRESETS.find((item) => item.id === id) || CAMERA_PRESETS[1];
  state.camera = preset.id;
  const framing = getPresetFraming(preset);
  const currentTarget = controls.target.clone();

  if (instant) {
    cameraTween = null;
    camera.position.copy(framing.position);
    controls.target.copy(framing.target);
    controls.update(0);
  } else {
    setAutoRotate(false, { silent: true });
    cameraTween = {
      time: 0,
      duration: 1.15,
      fromPosition: camera.position.clone(),
      toPosition: framing.position,
      fromTarget: currentTarget,
      toTarget: framing.target
    };
  }

  document.querySelectorAll('[data-camera]').forEach((button) => {
    const active = button.dataset.camera === preset.id;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function buildInterface() {
  buildSwatches();
  buildFinishes();
  buildMoods();
  buildFilters();
  buildCameraButtons();
  document.body.dataset.mobileTab = 'material';
}

function buildSwatches() {
  const grid = $('#swatchGrid');
  if (!grid) return;
  const fragment = document.createDocumentFragment();

  COLORS.forEach((color, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.dataset.swatch = color.hex;
    button.style.setProperty('--swatch', color.hex);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `${color.name} — ${color.note}`);
    button.setAttribute('aria-keyshortcuts', index === 9 ? '0' : String(index + 1));
    button.title = `${color.name} · ${color.note}`;
    button.innerHTML = '<span class="swatch-chip" aria-hidden="true"></span>';
    button.addEventListener('click', () => setColor(color.hex));
    fragment.appendChild(button);
  });

  grid.appendChild(fragment);
}

function buildFinishes() {
  const grid = $('#finishGrid');
  if (!grid) return;
  const fragment = document.createDocumentFragment();

  FINISHES.forEach((finish) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'finish-button';
    button.dataset.finish = finish.id;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `${finish.name} — ${finish.note}`);
    button.style.setProperty('--finish-preview', finish.preview);
    button.innerHTML = `
      <span class="finish-preview" aria-hidden="true"></span>
      <span class="finish-name">${finish.name}</span>
    `;
    button.addEventListener('click', () => {
      setFinish(finish);
      showToast(`Yüzey · ${finish.name}`);
    });
    fragment.appendChild(button);
  });

  grid.appendChild(fragment);
}

function buildMoods() {
  const grid = $('#moodGrid');
  if (!grid) return;
  const fragment = document.createDocumentFragment();

  MOODS.forEach((mood) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mood-button';
    button.dataset.mood = mood.id;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `${mood.name} — ${mood.note}`);
    button.title = mood.note;
    button.innerHTML = `
      <span class="mood-image" aria-hidden="true" style="--mood-a:${mood.preview[0]};--mood-b:${mood.preview[1]}"></span>
      <span class="mood-scrim" aria-hidden="true"></span>
      <span class="mood-name">${mood.name}</span>
      <span class="mood-check" aria-hidden="true"></span>
    `;
    button.addEventListener('click', () => {
      setMood(mood);
      showToast(`Atmosfer · ${mood.name}`);
    });
    fragment.appendChild(button);
  });

  grid.appendChild(fragment);
}

function buildFilters() {
  const grid = $('#filterGrid');
  if (!grid) return;
  const fragment = document.createDocumentFragment();

  FILTERS.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-button';
    button.dataset.filter = filter.id;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `${filter.name} — ${filter.description}`);
    button.title = filter.description;
    button.innerHTML = `
      <span class="filter-preview" aria-hidden="true" style="--filter-a:${filter.preview[0]};--filter-b:${filter.preview[1]};--filter-c:${filter.preview[2]}"></span>
      <span class="filter-name">${filter.name}</span>
    `;
    button.addEventListener('click', () => {
      setFilter(filter);
      showToast(`Görüntü · ${filter.name}`);
    });
    fragment.appendChild(button);
  });

  grid.appendChild(fragment);
}

function buildCameraButtons() {
  const container = $('#cameraButtons');
  if (!container) return;
  const fragment = document.createDocumentFragment();

  CAMERA_PRESETS.forEach((preset) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'camera-button';
    button.dataset.camera = preset.id;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `${preset.name} kamera açısı`);
    button.textContent = preset.name;
    button.addEventListener('click', () => setCameraPreset(preset.id));
    fragment.appendChild(button);
  });

  container.appendChild(fragment);
}

function bindInterface() {
  const customColor = $('#customColor');
  if (customColor) {
    customColor.addEventListener('input', (event) => {
      setColor(event.target.value, { custom: true });
    });
  }

  const autoButton = $('#autoRotateButton');
  if (autoButton) {
    autoButton.addEventListener('click', () => setAutoRotate(!controls.autoRotate));
  }

  const screenshotButton = $('#screenshotButton');
  if (screenshotButton) screenshotButton.addEventListener('click', captureFrame);

  const resetButton = $('#resetButton');
  if (resetButton) resetButton.addEventListener('click', resetScene);

  document.querySelectorAll('.mobile-tabs button').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      document.body.dataset.mobileTab = tab;
      document.querySelectorAll('.mobile-tabs button').forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
    });
  });
}

function bindGlobalEvents() {
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(resize, 160);
  });

  controls.addEventListener('start', () => {
    cameraTween = null;
    const hint = $('#hint');
    if (hint) hint.classList.add('is-hidden');
    if (controls.autoRotate) setAutoRotate(false, { silent: true });
  });

  const canvas = renderer.domElement;
  const nudgeActive = (event) => {
    const hint = $('#hint');
    if (hint) hint.classList.add('is-hidden');
    if (event.pointerType !== 'mouse') {
      // Touch users get a quieter interface while exploring.
      document.documentElement.style.setProperty('--ui-dim', '0.82');
    }
  };
  canvas.addEventListener('pointerdown', nudgeActive, { passive: true });
  canvas.addEventListener('wheel', () => {
    const hint = $('#hint');
    if (hint) hint.classList.add('is-hidden');
  }, { passive: true });

  window.addEventListener('keydown', handleKeyboard);

  document.addEventListener('visibilitychange', () => {
    lastFrameTime = performance.now();
  });
}

function handleKeyboard(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const tag = event.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const digitIndex = '1234567890'.indexOf(event.key);
  if (digitIndex >= 0 && COLORS[digitIndex]) {
    event.preventDefault();
    setColor(COLORS[digitIndex].hex);
    return;
  }

  if (event.key.toLowerCase() === 'r') {
    event.preventDefault();
    resetScene();
    return;
  }

  if (event.code === 'Space' && tag !== 'BUTTON') {
    event.preventDefault();
    setAutoRotate(!controls.autoRotate);
  }
}

function captureFrame() {
  if (!post || !renderer) return;
  try {
    post.composer.render();
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const slug = state.colorName
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `aurelia-${slug || 'teapot'}-${state.color.replace('#', '')}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    const flash = $('#captureFlash');
    if (flash) {
      flash.classList.remove('is-active');
      void flash.offsetWidth;
      flash.classList.add('is-active');
    }
    showToast(`Kare kaydedildi · ${state.filter.name}`);
  } catch (error) {
    console.error(error);
    showToast('Kare kaydedilemedi');
  }
}

function resetScene() {
  setColor(COLORS[0].hex);
  setFinish(FINISHES[0]);
  setMood(MOODS[0]);
  setFilter(FILTERS[0]);
  setCameraPreset('three-quarter', true);
  setAutoRotate(true, { silent: true });
  showToast('Sahne başlangıç ayarlarına döndü');
}

function showToast(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2100);
}

function resize() {
  if (!renderer || !camera || !post) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = getPixelRatio();
  prefersMobile = isMobileViewport();

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = prefersMobile ? 36 : 32;
  camera.updateProjectionMatrix();
  post.setSize(width, height, pixelRatio);
  if (dust) dust.uniforms.uPixelRatio.value = pixelRatio;
}

function updateCamera(dt) {
  if (!cameraTween) return;
  cameraTween.time = Math.min(cameraTween.time + dt, cameraTween.duration);
  const t = cameraTween.time / cameraTween.duration;
  const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
  if (t >= 1) cameraTween = null;
}

function updateMoodTransitions(dt) {
  if (!moodTarget) return;
  const colorEase = 1 - Math.exp(-2.7 * dt);
  const scalarEase = 3.6;

  lights.key.color.lerp(moodTarget.keyColor, colorEase);
  lights.fill.color.lerp(moodTarget.fillColor, colorEase);
  lights.rim.color.lerp(moodTarget.rimColor, colorEase);
  lights.hemi.color.lerp(moodTarget.hemiSky, colorEase);
  lights.hemi.groundColor.lerp(moodTarget.hemiGround, colorEase);
  lights.areaFill.color.lerp(moodTarget.areaColor, colorEase);
  lights.topSoftbox.color.lerp(moodTarget.topColor, colorEase);
  lights.spotPool.color.lerp(moodTarget.spotColor, colorEase);

  lights.key.position.lerp(moodTarget.keyPosition, colorEase);
  lights.fill.position.lerp(moodTarget.fillPosition, colorEase);
  lights.rim.position.lerp(moodTarget.rimPosition, colorEase);

  lights.key.intensity = damp(lights.key.intensity, moodTarget.keyIntensity, scalarEase, dt);
  lights.fill.intensity = damp(lights.fill.intensity, moodTarget.fillIntensity, scalarEase, dt);
  lights.rim.intensity = damp(lights.rim.intensity, moodTarget.rimIntensity, scalarEase, dt);
  lights.hemi.intensity = damp(lights.hemi.intensity, moodTarget.hemiIntensity, scalarEase, dt);
  lights.areaFill.intensity = damp(lights.areaFill.intensity, moodTarget.areaIntensity, scalarEase, dt);
  lights.topSoftbox.intensity = damp(lights.topSoftbox.intensity, moodTarget.topIntensity, scalarEase, dt);
  lights.spotPool.intensity = damp(lights.spotPool.intensity, moodTarget.spotIntensity, scalarEase, dt);

  sky.uniforms.uTop.value.lerp(moodTarget.skyTop, colorEase);
  sky.uniforms.uBottom.value.lerp(moodTarget.skyBottom, colorEase);
  sky.uniforms.uGlow.value.lerp(moodTarget.skyGlow, colorEase);
  sky.uniforms.uGlowDirection.value.lerp(moodTarget.glowDirection, colorEase).normalize();
  sky.uniforms.uGlowStrength.value = damp(
    sky.uniforms.uGlowStrength.value,
    moodTarget.glowStrength,
    scalarEase,
    dt
  );
  sky.uniforms.uHorizonStrength.value = damp(
    sky.uniforms.uHorizonStrength.value,
    moodTarget.horizonStrength,
    scalarEase,
    dt
  );

  scene.fog.color.lerp(moodTarget.fogColor, colorEase);
  scene.fog.density = damp(scene.fog.density, moodTarget.fogDensity, 2.6, dt);
  scene.environmentIntensity = damp(scene.environmentIntensity, moodTarget.envIntensity, 2.6, dt);
  renderer.toneMappingExposure = damp(renderer.toneMappingExposure, moodTarget.exposure, 2.8, dt);

  floor.material.color.lerp(moodTarget.floorColor, colorEase);
  floor.material.roughness = damp(floor.material.roughness, moodTarget.floorRoughness, scalarEase, dt);
  floor.material.clearcoat = damp(floor.material.clearcoat, moodTarget.floorClearcoat, scalarEase, dt);
  floor.material.clearcoatRoughness = damp(
    floor.material.clearcoatRoughness,
    moodTarget.floorClearcoatRoughness,
    scalarEase,
    dt
  );

  dust.uniforms.uColor.value.lerp(moodTarget.dustColor, colorEase);
  dust.uniforms.uOpacity.value = damp(
    dust.uniforms.uOpacity.value,
    moodTarget.dustOpacity,
    scalarEase,
    dt
  );
}

function updateMaterialTransitions(dt) {
  const porcelain = teapot.materials.porcelain;
  porcelain.color.lerp(colorTarget, 1 - Math.exp(-7.5 * dt));

  const speed = 4.4;
  porcelain.roughness = damp(porcelain.roughness, finishTarget.roughness, speed, dt);
  porcelain.clearcoat = damp(porcelain.clearcoat, finishTarget.clearcoat, speed, dt);
  porcelain.clearcoatRoughness = damp(
    porcelain.clearcoatRoughness,
    finishTarget.clearcoatRoughness,
    speed,
    dt
  );
  porcelain.metalness = damp(porcelain.metalness, finishTarget.metalness, speed, dt);
  porcelain.sheen = damp(porcelain.sheen, finishTarget.sheen, speed, dt);
  porcelain.sheenRoughness = damp(porcelain.sheenRoughness, finishTarget.sheenRoughness, speed, dt);
  porcelain.iridescence = damp(porcelain.iridescence, finishTarget.iridescence, speed, dt);
  porcelain.envMapIntensity = damp(
    porcelain.envMapIntensity,
    finishTarget.envMapIntensity,
    speed,
    dt
  );

  const bumpTarget = state.finish.id === 'matte' ? 0.006 : 0.0025;
  porcelain.bumpScale = damp(porcelain.bumpScale, bumpTarget, speed, dt);
}

function animate(now) {
  requestAnimationFrame(animate);
  if (!lastFrameTime) {
    lastFrameTime = now;
    return;
  }

  const rawDt = (now - lastFrameTime) / 1000;
  const dt = clamp(rawDt, 0, 0.05);
  lastFrameTime = now;
  elapsed += dt;

  updateMoodTransitions(dt);
  updateMaterialTransitions(dt);
  updateCamera(dt);
  controls.update(dt);

  dust.uniforms.uTime.value = elapsed;
  post.update(dt, elapsed);
  post.composer.render();
}
