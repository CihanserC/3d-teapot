import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  makeContactShadowTexture,
  makeFloorBumpTexture,
  makeGlazeTexture,
  makeMarbleTexture
} from './textures.js';

export const PLINTH_TOP = 0.38;

export function buildStudioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();

  const room = new THREE.Mesh(
    new THREE.BoxGeometry(34, 22, 34),
    new THREE.MeshBasicMaterial({ color: 0x0b0a08, side: THREE.BackSide })
  );
  envScene.add(room);

  const emissivePanel = (color, intensity, width, height, position) => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.set(...position);
    mesh.lookAt(0, 1.2, 0);
    envScene.add(mesh);
    return mesh;
  };

  // Broad overhead silk, warm key softbox, cool fill, and two rim strips.
  emissivePanel('#fff7ea', 12, 8.5, 7.5, [0.4, 8.2, 1.2]);
  emissivePanel('#ffd3a0', 13, 5.7, 7.2, [-6.2, 4.3, 5.4]);
  emissivePanel('#b8d8ff', 8, 4.2, 6.4, [7.1, 3.5, 4.2]);
  emissivePanel('#fff3de', 18, 1.75, 9.4, [0.2, 4.9, -7.4]);
  emissivePanel('#ff9a54', 5.4, 3.1, 4.2, [-4.4, 1.9, -5.9]);
  emissivePanel('#f6e2c2', 2.4, 9, 3.4, [0, 1.1, 9.2]);
  emissivePanel('#c9d9eb', 3.4, 8, 0.45, [0.3, 0.35, -6.8]);

  const floorBounce = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#3b2c20').multiplyScalar(0.55),
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  floorBounce.rotation.x = -Math.PI / 2;
  floorBounce.position.y = -4.2;
  envScene.add(floorBounce);

  const target = pmrem.fromScene(envScene, 0.018);
  const texture = target.texture;

  envScene.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
      child.material.dispose();
    }
  });
  pmrem.dispose();

  return texture;
}

export function createSky(mood) {
  const uniforms = {
    uTop: { value: new THREE.Color(mood.sky.top) },
    uBottom: { value: new THREE.Color(mood.sky.bottom) },
    uGlow: { value: new THREE.Color(mood.sky.glow) },
    uGlowDirection: { value: new THREE.Vector3(...mood.sky.glowDirection).normalize() },
    uGlowStrength: { value: mood.sky.glowStrength },
    uHorizonY: { value: mood.sky.horizonY },
    uHorizonStrength: { value: mood.sky.horizonStrength }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uBottom;
      uniform vec3 uGlow;
      uniform vec3 uGlowDirection;
      uniform float uGlowStrength;
      uniform float uHorizonY;
      uniform float uHorizonStrength;
      varying vec3 vDirection;

      void main() {
        vec3 dir = normalize(vDirection);
        float heightMix = smoothstep(-0.48, 0.78, dir.y);
        vec3 color = mix(uBottom, uTop, heightMix);

        float source = max(dot(dir, normalize(uGlowDirection)), 0.0);
        float glow = pow(source, 9.0) * uGlowStrength;
        glow += pow(source, 3.0) * uGlowStrength * 0.06;
        color += uGlow * glow;

        float horizon = exp(-pow((dir.y - uHorizonY) * 8.5, 2.0));
        color += uGlow * horizon * uHorizonStrength;

        // A barely-there luminous veil just above the floor line.
        color += uGlow * smoothstep(-0.16, 0.02, dir.y) * 0.014 * uGlowStrength;

        gl_FragColor = vec4(color, 1.0);
      }
    `
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(62, 64, 40), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  mesh.name = 'AtelierBackdrop';
  return { mesh, uniforms };
}

export function createLights() {
  RectAreaLightUniformsLib.init();

  const key = new THREE.DirectionalLight('#ffe3bf', 2.5);
  key.position.set(3.4, 5.4, 3.3);
  key.target.position.set(0, 0.9, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(3072, 3072);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -4.2;
  key.shadow.camera.right = 4.2;
  key.shadow.camera.top = 6.2;
  key.shadow.camera.bottom = -2.2;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 7;
  key.shadow.blurSamples = 18;

  const fill = new THREE.DirectionalLight('#9ebddd', 0.62);
  fill.position.set(-4.2, 3.0, 2.4);
  fill.target.position.set(0, 1.0, 0);

  const rim = new THREE.DirectionalLight('#ffb672', 2.2);
  rim.position.set(-3.2, 3.8, -4.2);
  rim.target.position.set(0, 1.25, 0);

  const hemi = new THREE.HemisphereLight('#e4cfb2', '#241a10', 0.3);

  const areaFill = new THREE.RectAreaLight('#b7d4ef', 0.75, 5.2, 4.2);
  areaFill.position.set(-3.4, 3.0, 2.8);
  areaFill.lookAt(0, 1.2, 0);

  const topSoftbox = new THREE.RectAreaLight('#fff1df', 1.6, 4.6, 2.4);
  topSoftbox.position.set(0.55, 4.8, 1.1);
  topSoftbox.lookAt(0, 1.35, 0);

  const spotPool = new THREE.SpotLight('#ffe0ba', 18, 0, 0.72, 1, 2);
  spotPool.position.set(3.8, 5.8, 3.6);
  spotPool.target.position.set(0, 0.85, 0);

  return { key, fill, rim, hemi, areaFill, topSoftbox, spotPool };
}

export function createFloor(mood) {
  const roughnessMap = makeGlazeTexture(256, { base: 210, contrast: 45 });
  roughnessMap.repeat.set(7, 7);
  const bumpMap = makeFloorBumpTexture();

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(mood.floor.color),
    roughness: mood.floor.roughness,
    clearcoat: mood.floor.clearcoat,
    clearcoatRoughness: mood.floor.clearcoatRoughness,
    metalness: 0.06,
    roughnessMap,
    bumpMap,
    bumpScale: 0.018,
    envMapIntensity: 0.12
  });

  const mesh = new THREE.Mesh(new THREE.CircleGeometry(46, 160), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.name = 'PolishedFloor';
  return { mesh, material };
}

export function createPlinth() {
  const marble = makeMarbleTexture(1024);
  const profile = [
    [0.001, 0.0],
    [1.58, 0.0],
    [1.65, 0.018],
    [1.69, 0.065],
    [1.7, 0.23],
    [1.665, 0.32],
    [1.6, PLINTH_TOP],
    [0.001, PLINTH_TOP]
  ].map(([x, y]) => new THREE.Vector2(x, y));

  const geometry = new THREE.LatheGeometry(profile, 160);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: marble,
    roughness: 0.26,
    metalness: 0.02,
    clearcoat: 0.7,
    clearcoatRoughness: 0.22,
    envMapIntensity: 0.45
  });

  const plinth = new THREE.Mesh(geometry, material);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  plinth.name = 'MarblePlinth';

  const goldMaterial = new THREE.MeshPhysicalMaterial({
    color: '#c9a76a',
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: 1.5
  });

  const inlay = new THREE.Mesh(new THREE.TorusGeometry(1.46, 0.008, 16, 192), goldMaterial);
  inlay.rotation.x = Math.PI / 2;
  inlay.position.y = PLINTH_TOP + 0.001;
  inlay.castShadow = false;
  inlay.receiveShadow = true;

  const floorRing = new THREE.Mesh(new THREE.TorusGeometry(1.705, 0.011, 16, 192), goldMaterial);
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = 0.009;
  floorRing.castShadow = false;
  floorRing.receiveShadow = true;

  const group = new THREE.Group();
  group.add(plinth, inlay, floorRing);
  group.name = 'PlinthGroup';

  return { group, plinth, goldMaterial, marble };
}

export function createContactShadows() {
  const texture = makeContactShadowTexture(512, 0.8);
  const group = new THREE.Group();

  const underTeapot = new THREE.Mesh(
    new THREE.PlaneGeometry(2.55, 2.55),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -1
    })
  );
  underTeapot.rotation.x = -Math.PI / 2;
  underTeapot.position.y = PLINTH_TOP + 0.003;
  underTeapot.renderOrder = 2;

  const underPlinth = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 5.5),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      toneMapped: false
    })
  );
  underPlinth.rotation.x = -Math.PI / 2;
  underPlinth.position.y = 0.004;
  underPlinth.renderOrder = 1;

  group.add(underTeapot, underPlinth);
  group.name = 'ContactShadows';
  return { group, underTeapot, underPlinth };
}

export function createDust(mood) {
  const count = 150;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const random = (() => {
    let seed = 1234567;
    return () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  })();

  for (let i = 0; i < count; i++) {
    const radius = 0.7 + Math.pow(random(), 0.7) * 3.3;
    const angle = random() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius * (0.5 + random() * 0.55);
    positions[i * 3 + 1] = 0.25 + random() * 3.25;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    sizes[i] = 0.32 + Math.pow(random(), 2) * 1.55;
    phases[i] = random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const uniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(mood.dust) },
    uOpacity: { value: mood.dustOpacity },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;

      void main() {
        vec3 p = position;
        p.x += cos(uTime * 0.11 + aPhase * 1.7) * 0.09;
        p.y += sin(uTime * 0.16 + aPhase) * 0.12;
        p.z += sin(uTime * 0.09 + aPhase * 2.1) * 0.07;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * uPixelRatio * (23.0 / max(0.6, -mvPosition.z));
        float depthFade = 1.0 - smoothstep(4.3, 13.0, -mvPosition.z);
        float proximityFade = smoothstep(1.1, 2.6, -mvPosition.z);
        vAlpha = depthFade * proximityFade * (0.24 + 0.76 * (0.5 + 0.5 * sin(aPhase + uTime * 0.22)));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;

      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.02, dist);
        alpha *= vAlpha * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 3;
  points.name = 'AtelierDust';
  return { points, uniforms, material };
}
