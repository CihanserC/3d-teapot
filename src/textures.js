import * as THREE from 'three';

const TAU = Math.PI * 2;

function canvas(size, height = size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = height;
  return c;
}

function seededRandom(seed = 0x9e3779b9) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grayscaleNoiseLayer(size, cells, random) {
  const layer = canvas(cells);
  const ctx = layer.getContext('2d');
  const image = ctx.createImageData(cells, cells);
  for (let i = 0; i < cells * cells; i++) {
    const v = 90 + random() * 120;
    image.data[i * 4] = v;
    image.data[i * 4 + 1] = v;
    image.data[i * 4 + 2] = v;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return layer;
}

/**
 * A soft, multi-octave tile used for glaze variation and stone roughness.
 */
export function makeGlazeTexture(size = 256, { base = 176, contrast = 56, blur = true } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const random = seededRandom(7441);
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  if (blur) ctx.filter = 'blur(0.7px)';
  for (let octave = 0; octave < 5; octave++) {
    const cells = 4 * 2 ** octave;
    const layer = grayscaleNoiseLayer(size, cells, random);
    ctx.globalAlpha = 0.24 - octave * 0.028;
    ctx.drawImage(layer, 0, 0, size, size);
  }
  ctx.filter = 'none';
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 8;
  texture.repeat.set(4, 4);
  return texture;
}

/**
 * Dark, quietly veined marble for the plinth. Generated so the build stays offline.
 */
export function makeMarbleTexture(size = 1024) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const random = seededRandom(91357);

  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, '#171614');
  base.addColorStop(0.46, '#22201c');
  base.addColorStop(1, '#10100e');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Soft mineral clouds.
  for (let i = 0; i < 30; i++) {
    const x = random() * size;
    const y = random() * size;
    const r = size * (0.04 + random() * 0.2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(200,188,160,${0.018 + random() * 0.035})`);
    g.addColorStop(0.6, `rgba(135,124,105,${0.008 + random() * 0.018})`);
    g.addColorStop(1, 'rgba(10,10,8,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Long, wandering veins.
  const vein = (width, alpha, gold = false) => {
    let x = -size * 0.2 + random() * size * 1.2;
    let y = -size * 0.1 + random() * size * 1.2;
    const points = [];
    const steps = 5 + Math.floor(random() * 5);
    for (let i = 0; i < steps; i++) {
      x += size * (0.03 + random() * 0.2);
      y += size * (random() - 0.5) * 0.28;
      points.push([x, y]);
    }
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const current = points[i];
      const cx = (prev[0] + current[0]) / 2 + (random() - 0.5) * size * 0.08;
      const cy = (prev[1] + current[1]) / 2 + (random() - 0.5) * size * 0.08;
      ctx.quadraticCurveTo(cx, cy, current[0], current[1]);
    }
    const grad = ctx.createLinearGradient(points[0][0], 0, points[points.length - 1][0], size);
    grad.addColorStop(0, `rgba(230,216,188,0)`);
    grad.addColorStop(0.22, `rgba(${gold ? '180,144,89' : '224,211,185'},${alpha * 0.5})`);
    grad.addColorStop(0.52, `rgba(${gold ? '205,170,112' : '241,231,210'},${alpha})`);
    grad.addColorStop(0.78, `rgba(206,194,171,${alpha * 0.4})`);
    grad.addColorStop(1, 'rgba(200,188,160,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = width;
    ctx.filter = 'blur(0.8px)';
    ctx.stroke();
    ctx.filter = 'none';
  };
  for (let i = 0; i < 14; i++) vein(0.5 + random() * 3.5, 0.055 + random() * 0.11);
  for (let i = 0; i < 5; i++) vein(0.4 + random() * 1.6, 0.045 + random() * 0.08, true);

  // Hairline fissures and dust.
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 55; i++) {
    ctx.strokeStyle = i % 8 === 0 ? 'rgba(186,155,105,0.6)' : 'rgba(225,216,198,0.3)';
    ctx.lineWidth = random() * 0.75;
    ctx.beginPath();
    const x = random() * size;
    const y = random() * size;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 32, y + (random() - 0.5) * 32);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(1.9, 1.05);
  return texture;
}

export function makeContactShadowTexture(size = 512, strength = 0.8) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.02, size / 2, size / 2, size * 0.5);
  g.addColorStop(0, `rgba(0,0,0,${strength})`);
  g.addColorStop(0.26, `rgba(0,0,0,${strength * 0.8})`);
  g.addColorStop(0.54, `rgba(0,0,0,${strength * 0.34})`);
  g.addColorStop(0.8, `rgba(0,0,0,${strength * 0.08})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeFloorBumpTexture(size = 512) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const random = seededRandom(88421);
  ctx.fillStyle = '#8b8b8b';
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  for (let octave = 0; octave < 4; octave++) {
    const cells = 32 * 2 ** octave;
    const layer = grayscaleNoiseLayer(size, cells, random);
    ctx.globalAlpha = 0.16 - octave * 0.025;
    ctx.drawImage(layer, 0, 0, size, size);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 8;
  texture.repeat.set(24, 24);
  return texture;
}

/**
 * Gold-foil maker's mark, used as a small decal on the teapot belly.
 */
export function makeMonogramTexture(size = 512) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const center = size / 2;
  const gold = ctx.createLinearGradient(size * 0.2, size * 0.12, size * 0.82, size * 0.9);
  gold.addColorStop(0, '#fff2c8');
  gold.addColorStop(0.2, '#e7c983');
  gold.addColorStop(0.5, '#b98e48');
  gold.addColorStop(0.72, '#f4deaa');
  gold.addColorStop(1, '#876330');

  ctx.save();
  ctx.translate(center, center);
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.355, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.52;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.326, 0, TAU);
  ctx.stroke();

  ctx.globalAlpha = 0.9;
  ctx.font = `500 ${size * 0.38}px "Cormorant Garamond", Georgia, serif`;
  ctx.fillText('A', 0, -size * 0.035);

  ctx.globalAlpha = 0.82;
  ctx.font = `500 ${size * 0.046}px "Manrope", "Segoe UI", sans-serif`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * 0.012}px`;
  ctx.fillText('AURELIA', 0, size * 0.215);

  ctx.globalAlpha = 0.46;
  ctx.font = `400 ${size * 0.031}px "Manrope", "Segoe UI", sans-serif`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * 0.008}px`;
  ctx.fillText('PARIS · 1897', 0, size * 0.27);

  // Little diamond separators at the sides.
  ctx.globalAlpha = 0.65;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * size * 0.274, 0);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-size * 0.008, -size * 0.008, size * 0.016, size * 0.016);
    ctx.restore();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
