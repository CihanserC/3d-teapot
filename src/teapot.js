import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { makeGlazeTexture, makeMonogramTexture } from './textures.js';

const GOLD = '#d2ac68';
const DARK_GLAZE = '#17120d';

function smoothProfile(points, divisions = 128) {
  return new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)))
    .getPoints(divisions)
    .map((point) => new THREE.Vector2(Math.max(0.001, point.x), point.y));
}

function smoothstep(min, max, value) {
  const x = THREE.MathUtils.clamp((value - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * A tube whose radius changes along a Catmull-Rom spine.
 * Used for the hand-pulled spout and the strap handle.
 */
function taperedTube(curve, tubularSegments, radialSegments, radiusAt) {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    curve.getPoint(u, point);
    const radius = radiusAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    for (let j = 0; j <= radialSegments; j++) {
      const v = j / radialSegments;
      const angle = v * Math.PI * 2;
      const sin = Math.sin(angle);
      const cos = -Math.cos(angle);

      normal.set(0, 0, 0).addScaledVector(N, cos).addScaledVector(B, sin).normalize();
      positions.push(point.x + radius * cos * N.x + radius * sin * B.x);
      positions.push(point.y + radius * cos * N.y + radius * sin * B.y);
      positions.push(point.z + radius * cos * N.z + radius * sin * B.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(u, v);
    }
  }

  for (let i = 1; i <= tubularSegments; i++) {
    for (let j = 1; j <= radialSegments; j++) {
      const a = (radialSegments + 1) * (i - 1) + (j - 1);
      const b = (radialSegments + 1) * i + (j - 1);
      const c = (radialSegments + 1) * i + j;
      const d = (radialSegments + 1) * (i - 1) + j;
      indices.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function ringAlongCurve(curve, u, radius, tube, material) {
  const position = curve.getPointAt(u);
  const tangent = curve.getTangentAt(u).normalize();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 96), material);
  ring.position.copy(position);
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
  ring.castShadow = true;
  ring.receiveShadow = true;
  return ring;
}

function makePorcelainMaterial(glaze) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#E8DCC8'),
    roughness: 0.16,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.045,
    clearcoatRoughnessMap: glaze,
    sheen: 0.18,
    sheenRoughness: 0.55,
    ior: 1.5,
    specularIntensity: 1,
    iridescence: 0,
    iridescenceIOR: 1.3,
    iridescenceThicknessMinimum: 120,
    iridescenceThicknessMaximum: 420,
    roughnessMap: glaze,
    bumpMap: glaze,
    bumpScale: 0.0025,
    envMapIntensity: 1.35
  });
}

function makeGoldMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(GOLD),
    metalness: 1,
    roughness: 0.21,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
    envMapIntensity: 2.15
  });
}

export function buildTeapot() {
  const group = new THREE.Group();
  group.name = 'AureliaTeapot';

  const glaze = makeGlazeTexture(256, { base: 186, contrast: 54 });
  glaze.repeat.set(2.5, 2.5);

  const porcelain = makePorcelainMaterial(glaze);
  const gold = makeGoldMaterial();
  const dark = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(DARK_GLAZE),
    roughness: 0.58,
    metalness: 0.06,
    envMapIntensity: 0.7,
    side: THREE.DoubleSide
  });

  // ── Body ────────────────────────────────────────────────────────────────
  const bodyProfile = smoothProfile(
    [
      [0.001, 0.0],
      [0.34, 0.0],
      [0.46, 0.012],
      [0.485, 0.04],
      [0.485, 0.078],
      [0.53, 0.115],
      [0.64, 0.21],
      [0.74, 0.37],
      [0.8, 0.55],
      [0.815, 0.73],
      [0.8, 0.9],
      [0.748, 1.06],
      [0.665, 1.2],
      [0.57, 1.31],
      [0.49, 1.4],
      [0.44, 1.465],
      [0.425, 1.5],
      [0.4, 1.515],
      [0.35, 1.517]
    ],
    150
  );
  const bodyGeometry = new THREE.LatheGeometry(bodyProfile, 192);
  bodyGeometry.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeometry, porcelain);
  body.castShadow = true;
  body.receiveShadow = true;
  body.name = 'PorcelainBody';

  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.009, 12, 160), gold);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.064;
  baseRing.castShadow = true;
  baseRing.receiveShadow = true;

  const lipRing = new THREE.Mesh(new THREE.TorusGeometry(0.412, 0.011, 14, 192), gold);
  lipRing.rotation.x = Math.PI / 2;
  lipRing.position.y = 1.515;
  lipRing.castShadow = true;
  lipRing.receiveShadow = true;

  // ── Lid + finial ────────────────────────────────────────────────────────
  const lidProfile = smoothProfile(
    [
      [0.001, 1.497],
      [0.18, 1.497],
      [0.29, 1.501],
      [0.342, 1.512],
      [0.36, 1.527],
      [0.352, 1.544],
      [0.315, 1.56],
      [0.245, 1.585],
      [0.165, 1.64],
      [0.095, 1.71],
      [0.05, 1.762],
      [0.033, 1.79],
      [0.001, 1.795]
    ],
    96
  );
  const lidGeometry = new THREE.LatheGeometry(lidProfile, 160);
  lidGeometry.computeVertexNormals();
  const lid = new THREE.Mesh(lidGeometry, porcelain);
  lid.castShadow = true;
  lid.receiveShadow = true;
  lid.name = 'PorcelainLid';

  const lidRing = new THREE.Mesh(new THREE.TorusGeometry(0.349, 0.0085, 12, 160), gold);
  lidRing.rotation.x = Math.PI / 2;
  lidRing.position.y = 1.528;
  lidRing.castShadow = true;
  lidRing.receiveShadow = true;

  const finialProfile = smoothProfile(
    [
      [0.001, 1.784],
      [0.022, 1.788],
      [0.028, 1.806],
      [0.034, 1.82],
      [0.058, 1.838],
      [0.086, 1.859],
      [0.096, 1.881],
      [0.078, 1.905],
      [0.044, 1.925],
      [0.014, 1.936],
      [0.001, 1.939]
    ],
    64
  );
  const finial = new THREE.Mesh(new THREE.LatheGeometry(finialProfile, 96), gold);
  finial.castShadow = true;
  finial.receiveShadow = true;
  finial.name = 'GoldFinial';

  // ── Spout ───────────────────────────────────────────────────────────────
  const spoutCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.57, 0.73, 0),
      new THREE.Vector3(0.86, 0.755, 0),
      new THREE.Vector3(1.075, 0.875, 0),
      new THREE.Vector3(1.195, 1.07, 0),
      new THREE.Vector3(1.235, 1.28, 0),
      new THREE.Vector3(1.225, 1.485, 0)
    ],
    false,
    'centripetal',
    0.5
  );
  const spoutRadius = (u) =>
    0.158 - 0.096 * smoothstep(0.015, 1, u) + 0.017 * smoothstep(0.86, 1, u);
  const spoutGeometry = taperedTube(spoutCurve, 96, 48, spoutRadius);
  const spout = new THREE.Mesh(spoutGeometry, porcelain);
  spout.castShadow = true;
  spout.receiveShadow = true;
  spout.name = 'PorcelainSpout';

  const spoutCollarU = 0.17;
  const spoutCollar = ringAlongCurve(spoutCurve, spoutCollarU, spoutRadius(spoutCollarU) + 0.008, 0.012, gold);
  const spoutTip = spoutCurve.getPointAt(1);
  const spoutTipTangent = spoutCurve.getTangentAt(1).normalize();
  const spoutRim = new THREE.Mesh(
    new THREE.TorusGeometry(spoutRadius(1) + 0.001, 0.0085, 12, 80),
    gold
  );
  spoutRim.position.copy(spoutTip);
  spoutRim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spoutTipTangent);
  spoutRim.castShadow = true;
  spoutRim.receiveShadow = true;

  const spoutHole = new THREE.Mesh(new THREE.CircleGeometry(spoutRadius(1) * 0.88, 48), dark);
  spoutHole.position.copy(spoutTip).addScaledVector(spoutTipTangent, -0.018);
  spoutHole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spoutTipTangent);

  // ── Handle ──────────────────────────────────────────────────────────────
  const handleCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-0.535, 1.245, 0),
      new THREE.Vector3(-0.79, 1.345, 0),
      new THREE.Vector3(-1.0, 1.235, 0),
      new THREE.Vector3(-1.085, 1.02, 0),
      new THREE.Vector3(-1.02, 0.79, 0),
      new THREE.Vector3(-0.865, 0.645, 0),
      new THREE.Vector3(-0.625, 0.605, 0)
    ],
    false,
    'centripetal',
    0.5
  );
  const handleRadius = (u) => 0.063 + 0.016 * Math.pow(Math.abs(u * 2 - 1), 2.6);
  const handleGeometry = taperedTube(handleCurve, 120, 36, handleRadius);
  const handle = new THREE.Mesh(handleGeometry, porcelain);
  handle.castShadow = true;
  handle.receiveShadow = true;
  handle.name = 'PorcelainHandle';

  const handleFerruleTop = ringAlongCurve(handleCurve, 0.085, handleRadius(0.085) + 0.004, 0.009, gold);
  const handleFerruleBottom = ringAlongCurve(handleCurve, 0.925, handleRadius(0.925) + 0.004, 0.009, gold);

  // ── Gold maker's mark ──────────────────────────────────────────────────
  const monogram = makeMonogramTexture(512);
  const decalMaterial = new THREE.MeshPhysicalMaterial({
    map: monogram,
    transparent: true,
    alphaTest: 0.015,
    metalness: 0.92,
    roughness: 0.2,
    clearcoat: 0.5,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.8,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  });
  body.updateMatrixWorld(true);
  const decalGeometry = new DecalGeometry(
    body,
    new THREE.Vector3(0, 0.7, 0.9),
    new THREE.Euler(0, 0, 0),
    new THREE.Vector3(0.44, 0.44, 0.42)
  );
  const decal = new THREE.Mesh(decalGeometry, decalMaterial);
  decal.castShadow = false;
  decal.receiveShadow = true;
  decal.renderOrder = 2;
  decal.name = "AureliaMakerMark";

  group.add(
    body,
    baseRing,
    lipRing,
    lid,
    lidRing,
    finial,
    spout,
    spoutCollar,
    spoutRim,
    spoutHole,
    handle,
    handleFerruleTop,
    handleFerruleBottom,
    decal
  );

  // Visually balance the asymmetric silhouette on the plinth.
  group.position.x = -0.075;

  return {
    group,
    body,
    lid,
    spout,
    handle,
    decal,
    materials: { porcelain, gold, dark, decalMaterial },
    glaze,
    monogram
  };
}
