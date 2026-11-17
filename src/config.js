/**
 * AURELIA — art direction data
 * Every option is tuned in display space so filters read predictably.
 */

export const COLORS = [
  { name: 'Fildişi', hex: '#E8DCC8', note: 'Sıcak kemik porselen' },
  { name: 'Seladon', hex: '#AFC6B6', note: 'Antik yeşim sırı' },
  { name: 'Yeşim', hex: '#3F7B68', note: 'Derin adaçayı yeşili' },
  { name: 'Kobalt', hex: '#294D8C', note: 'Ming kobalt mavisi' },
  { name: 'Gök Mavisi', hex: '#7FA8BC', note: 'Yumuşak gök tonu' },
  { name: 'Terakota', hex: '#B65E44', note: 'Pişmiş toprak kızılı' },
  { name: 'Pudra', hex: '#D9A49C', note: 'Toz pembe porselen' },
  { name: 'Bordo', hex: '#6A2533', note: 'Kadife bordo' },
  { name: 'Obsidyen', hex: '#202426', note: 'Gece siyahı sır' },
  { name: 'Kum', hex: '#C3A77E', note: 'Çöl kumu tonu' }
];

export const FINISHES = [
  {
    id: 'porcelain',
    name: 'İpek Porselen',
    short: 'Porselen',
    note: 'Ayna parlaklığında sır',
    preview: 'radial-gradient(circle at 34% 28%, #fffdf8 0%, #e8e0d1 26%, #bba98d 64%, #6b5b46 100%)',
    params: {
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.045,
      metalness: 0,
      sheen: 0.18,
      sheenRoughness: 0.55,
      iridescence: 0,
      iridescenceIOR: 1.3,
      envMapIntensity: 1.35
    }
  },
  {
    id: 'matte',
    name: 'Mat Seramik',
    short: 'Mat',
    note: 'İpeksi, dokulu yüzey',
    preview: 'radial-gradient(circle at 34% 28%, #fffaf0 0%, #d6c9b6 38%, #8f7f69 72%, #5b4c3a 100%)',
    params: {
      roughness: 0.62,
      clearcoat: 0.08,
      clearcoatRoughness: 0.72,
      metalness: 0,
      sheen: 0.42,
      sheenRoughness: 0.72,
      iridescence: 0,
      iridescenceIOR: 1.3,
      envMapIntensity: 0.85
    }
  },
  {
    id: 'pearl',
    name: 'Sedef',
    short: 'Sedef',
    note: 'Katmanlı, yanardöner parıltı',
    preview: 'linear-gradient(135deg, #fff8ed 0%, #b9d6cc 28%, #d7b3c8 54%, #c6d3e7 78%, #8d7457 100%)',
    params: {
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.07,
      metalness: 0.02,
      sheen: 0.45,
      sheenRoughness: 0.4,
      iridescence: 1,
      iridescenceIOR: 1.42,
      envMapIntensity: 1.45
    }
  },
  {
    id: 'metal',
    name: 'Saten Metal',
    short: 'Metal',
    note: 'Fırçalanmış asil metal',
    preview: 'linear-gradient(135deg, #fff3d0 0%, #9c7b43 22%, #f3dfa9 46%, #6d5329 68%, #d0ae68 86%, #4d3b20 100%)',
    params: {
      roughness: 0.27,
      clearcoat: 0.28,
      clearcoatRoughness: 0.34,
      metalness: 0.88,
      sheen: 0,
      sheenRoughness: 0.5,
      iridescence: 0,
      iridescenceIOR: 1.3,
      envMapIntensity: 1.55
    }
  }
];

export const MOODS = [
  {
    id: 'atelier',
    name: 'Atölye',
    note: 'Sıcak stüdyo ışığı',
    preview: ['#6b5337', '#deb376'],
    sky: {
      top: '#1b1a15',
      bottom: '#040403',
      glow: '#814d27',
      glowDirection: [-0.35, 0.2, -1],
      glowStrength: 0.95,
      horizonY: 0.08,
      horizonStrength: 0.12
    },
    fog: '#050403',
    fogDensity: 0.026,
    exposure: 0.96,
    envIntensity: 0.16,
    key: { color: '#ffe3bf', intensity: 1.15, position: [3.4, 5.4, 3.3] },
    fill: { color: '#9ebddd', intensity: 0.22, position: [-4.2, 3.0, 2.4] },
    rim: { color: '#ffb672', intensity: 0.55, position: [-3.2, 3.8, -4.2] },
    hemi: { sky: '#e4cfb2', ground: '#241a10', intensity: 0.04 },
    floor: { color: '#070605', roughness: 0.62, clearcoat: 0.16, clearcoatRoughness: 0.72 },
    dust: '#ffd9a8',
    dustOpacity: 0.26
  },
  {
    id: 'golden',
    name: 'Altın Saat',
    note: 'Alçak, ateşli güneş',
    preview: ['#9a461f', '#ffc06b'],
    sky: {
      top: '#2b190f',
      bottom: '#050302',
      glow: '#f06d2e',
      glowDirection: [-0.5, 0.12, -1],
      glowStrength: 1.5,
      horizonY: 0.04,
      horizonStrength: 0.2
    },
    fog: '#080402',
    fogDensity: 0.024,
    exposure: 1.0,
    envIntensity: 0.18,
    key: { color: '#ffd0a0', intensity: 1.45, position: [4.5, 4.2, 2.1] },
    fill: { color: '#7385a8', intensity: 0.12, position: [-3.2, 2.2, 3.2] },
    rim: { color: '#ff9a58', intensity: 0.9, position: [-3.8, 2.4, -4.4] },
    hemi: { sky: '#ffc28b', ground: '#2a1408', intensity: 0.035 },
    floor: { color: '#080403', roughness: 0.56, clearcoat: 0.2, clearcoatRoughness: 0.6 },
    dust: '#ffc78e',
    dustOpacity: 0.4
  },
  {
    id: 'midnight',
    name: 'Gece Yarısı',
    note: 'Ay ışığı ve soğuk cila',
    preview: ['#0a1726', '#7ca6cf'],
    sky: {
      top: '#08121f',
      bottom: '#020305',
      glow: '#28557e',
      glowDirection: [0.45, 0.3, -1],
      glowStrength: 0.9,
      horizonY: 0.06,
      horizonStrength: 0.1
    },
    fog: '#030508',
    fogDensity: 0.028,
    exposure: 0.98,
    envIntensity: 0.13,
    key: { color: '#c4dcff', intensity: 1.0, position: [2.8, 5.5, 3.6] },
    fill: { color: '#365b91', intensity: 0.18, position: [-4.0, 2.4, 2.6] },
    rim: { color: '#8ac9ff', intensity: 1.0, position: [-2.8, 3.2, -4.4] },
    hemi: { sky: '#a9c9ed', ground: '#080d14', intensity: 0.03 },
    floor: { color: '#030507', roughness: 0.6, clearcoat: 0.2, clearcoatRoughness: 0.62 },
    dust: '#c7e3ff',
    dustOpacity: 0.3
  },
  {
    id: 'gallery',
    name: 'Galeri',
    note: 'Yüksek, temiz gün ışığı',
    preview: ['#8c8578', '#f3e7d2'],
    sky: {
      top: '#5f5a51',
      bottom: '#191714',
      glow: '#f0dfc8',
      glowDirection: [0.2, 0.55, -1],
      glowStrength: 0.4,
      horizonY: 0.04,
      horizonStrength: 0.22
    },
    fog: '#1e1b17',
    fogDensity: 0.026,
    exposure: 0.9,
    envIntensity: 0.28,
    key: { color: '#fff5e7', intensity: 1.7, position: [2.7, 5.8, 4.1] },
    fill: { color: '#dce9f3', intensity: 0.45, position: [-4.0, 3.0, 3.0] },
    rim: { color: '#f7ddba', intensity: 0.65, position: [-3.2, 4.1, -4.0] },
    hemi: { sky: '#f2e8da', ground: '#49443c', intensity: 0.1 },
    floor: { color: '#14120f', roughness: 0.64, clearcoat: 0.18, clearcoatRoughness: 0.7 },
    dust: '#fff0d6',
    dustOpacity: 0.2
  }
];

export const FILTERS = [
  {
    id: 'natural',
    name: 'Doğal',
    code: '01',
    description: 'Stüdyonun gerçek renkleri',
    preview: ['#dbcdb8', '#6d7b82', '#171512'],
    uniforms: {
      contrast: 1.02,
      saturation: 1.02,
      brightness: 1.0,
      temperature: 0.0,
      lift: 0.0,
      fade: 0.0,
      vignette: 0.16,
      grain: 0.012,
      aberration: 0.0002,
      sharpness: 0.08,
      bloom: 0.14,
      shadowTint: [0.0, 0.0, 0.0],
      highlightTint: [0.0, 0.0, 0.0],
      split: 0.0
    }
  },
  {
    id: 'cinematic',
    name: 'Sinematik',
    code: '02',
    description: 'Derin gölge, sıcak highlight',
    preview: ['#1a2933', '#b58d63', '#e4d4bb'],
    uniforms: {
      contrast: 1.13,
      saturation: 0.9,
      brightness: 0.985,
      temperature: 0.08,
      lift: -0.004,
      fade: 0.018,
      vignette: 0.36,
      grain: 0.028,
      aberration: 0.0008,
      sharpness: 0.2,
      bloom: 0.18,
      shadowTint: [-0.008, 0.002, 0.024],
      highlightTint: [0.026, 0.011, -0.012],
      split: 0.8
    }
  },
  {
    id: 'golden',
    name: 'Altın Film',
    code: '03',
    description: 'Sıcak, lüks bir film tonu',
    preview: ['#6b3b1d', '#d3974e', '#ffe0a9'],
    uniforms: {
      contrast: 1.07,
      saturation: 1.11,
      brightness: 1.025,
      temperature: 0.23,
      lift: 0.005,
      fade: 0.014,
      vignette: 0.24,
      grain: 0.018,
      aberration: 0.0005,
      sharpness: 0.15,
      bloom: 0.22,
      shadowTint: [0.018, 0.006, -0.012],
      highlightTint: [0.025, 0.012, -0.018],
      split: 0.5
    }
  },
  {
    id: 'arctic',
    name: 'Buz',
    code: '04',
    description: 'Berrak, soğuk ve mineral',
    preview: ['#8aa6b8', '#d6e7ef', '#1e2d39'],
    uniforms: {
      contrast: 1.09,
      saturation: 0.85,
      brightness: 1.01,
      temperature: -0.22,
      lift: 0.002,
      fade: 0.008,
      vignette: 0.25,
      grain: 0.012,
      aberration: 0.00035,
      sharpness: 0.17,
      bloom: 0.18,
      shadowTint: [-0.012, 0.002, 0.028],
      highlightTint: [-0.004, 0.012, 0.02],
      split: 0.65
    }
  },
  {
    id: 'noir',
    name: 'Noir',
    code: '05',
    description: 'Yüksek kontrast, monokrom',
    preview: ['#0c0c0c', '#7b7b7b', '#f1eee8'],
    uniforms: {
      contrast: 1.34,
      saturation: 0.0,
      brightness: 0.95,
      temperature: 0.0,
      lift: -0.006,
      fade: 0.0,
      vignette: 0.46,
      grain: 0.052,
      aberration: 0.0011,
      sharpness: 0.3,
      bloom: 0.14,
      shadowTint: [0.0, 0.0, 0.0],
      highlightTint: [0.0, 0.0, 0.0],
      split: 0.0
    }
  },
  {
    id: 'vintage',
    name: 'Vintage',
    code: '06',
    description: 'Yıpranmış, sıcak analog',
    preview: ['#584b38', '#b89a72', '#e3cfad'],
    uniforms: {
      contrast: 0.95,
      saturation: 0.78,
      brightness: 1.03,
      temperature: 0.15,
      lift: 0.01,
      fade: 0.045,
      vignette: 0.38,
      grain: 0.046,
      aberration: 0.0014,
      sharpness: 0.1,
      bloom: 0.14,
      shadowTint: [0.016, 0.007, -0.002],
      highlightTint: [0.02, 0.008, -0.02],
      split: 0.55
    }
  },
  {
    id: 'dream',
    name: 'Rüya',
    code: '07',
    description: 'Yumuşak, ışıltılı bir sis',
    preview: ['#7f8ba6', '#d9c7d8', '#f8ebd8'],
    uniforms: {
      contrast: 0.92,
      saturation: 1.03,
      brightness: 1.055,
      temperature: 0.045,
      lift: 0.013,
      fade: 0.026,
      vignette: 0.2,
      grain: 0.01,
      aberration: 0.0012,
      sharpness: 0.04,
      bloom: 0.4,
      shadowTint: [-0.004, 0.005, 0.018],
      highlightTint: [0.022, 0.008, 0.016],
      split: 0.35
    }
  },
  {
    id: 'vivid',
    name: 'Canlı',
    code: '08',
    description: 'Doygun, editorial renkler',
    preview: ['#0b7d76', '#d8493f', '#f6d36d'],
    uniforms: {
      contrast: 1.1,
      saturation: 1.26,
      brightness: 1.015,
      temperature: 0.025,
      lift: 0.001,
      fade: 0.0,
      vignette: 0.18,
      grain: 0.009,
      aberration: 0.0004,
      sharpness: 0.24,
      bloom: 0.2,
      shadowTint: [-0.002, 0.0, 0.006],
      highlightTint: [0.008, 0.003, -0.002],
      split: 0.25
    }
  }
];

export const CAMERA_PRESETS = [
  { id: 'front', name: 'Ön', position: [0.15, 2.05, 5.7], target: [0, 1.1, 0] },
  { id: 'three-quarter', name: '3/4', position: [3.55, 2.55, 4.25], target: [0, 1.12, 0] },
  { id: 'close', name: 'Yakın', position: [2.1, 1.8, 2.9], target: [0.18, 1.2, 0] },
  { id: 'top', name: 'Tepe', position: [1.9, 4.55, 2.7], target: [0, 0.98, 0] }
];

export const INITIAL_STATE = {
  color: COLORS[0].hex,
  finish: FINISHES[0].id,
  mood: MOODS[0].id,
  filter: FILTERS[0].id,
  camera: 'three-quarter',
  autoRotate: true
};
