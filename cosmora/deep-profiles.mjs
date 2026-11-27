// Artistic parameters in scene units. These numbers are not astronomical measurements.
export const galaxies = {
  'milky-way': {arms: 4, twist: 4.8, bar: 5.5, bulge: 2.7, thickness: .75, tint: 0xb0caff, dust: .58},
  andromeda: {arms: 2, twist: 5.6, bar: 0, bulge: 4.0, thickness: 1.15, tint: 0xc2cfff, dust: .78},
  triangulum: {arms: 3, twist: 3.3, bar: 0, bulge: 1.15, thickness: .54, tint: 0x82cfff, dust: .38},
  sombrero: {arms: 0, twist: 0, bar: 0, bulge: 5.7, thickness: .28, tint: 0xf4d4a6, dust: .95},
  whirlpool: {arms: 2, twist: 3.7, bar: 0, bulge: 2.0, thickness: .82, tint: 0x9da7ff, dust: .56, companion: true}
};
export const nebulae = {
  'orion-nebula': {shape: 0, spread: [1.25, .78, .72], tint: 0xe59ecb, edge: 0x639dff},
  'eagle-nebula': {shape: 1, spread: [1, 1.22, .62], tint: 0xdb995a, edge: 0x74d2af},
  'crab-nebula': {shape: 2, spread: [1.08, .8, .8], tint: 0xff8c73, edge: 0x7198e9},
  'ring-nebula': {shape: 3, spread: [1, .82, .62], tint: 0x51c9de, edge: 0xff9e69},
  'horsehead-nebula': {shape: 4, spread: [1.05, 1.14, .66], tint: 0xc05875, edge: 0x936bd7}
};
export const stellarProfiles = {
  sirius: {color: 0xc6ddff, radius: 2.05, grain: 17, activity: .31, flares: 3, companion: true},
  betelgeuse: {color: 0xff8055, radius: 2.65, grain: 3.5, activity: .85, flares: 5},
  vega: {color: 0xdce9ff, radius: 2.2, grain: 13, activity: .22, flares: 2, flatten: .80},
  rigel: {color: 0x92bfff, radius: 2.55, grain: 8, activity: .49, flares: 4},
  'proxima-centauri': {color: 0xff593b, radius: 1.25, grain: 10, activity: 1.25, flares: 7},
  antares: {color: 0xff724c, radius: 2.48, grain: 5, activity: .60, flares: 6, flatten: .93}
};
export const blackHoles = {
  'sgr-a': {heat: 0xff9952, outer: 6.8, speed: 1.1, tilt: .23, jet: 0},
  'm87-star': {heat: 0xffc074, outer: 8.3, speed: .58, tilt: -.29, jet: 15},
  'cygnus-x1': {heat: 0xff794c, outer: 5.7, speed: 1.6, tilt: .42, jet: 6}
};

export function seededRandom(key) {
  let seed = 2166136261;
  for (const char of key) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function validModelProfile(profile, family) {
  const positive = value => Number.isFinite(value) && value > 0;
  const color = value => Number.isInteger(value) && value >= 0 && value <= 0xffffff;
  if (!profile) return false;
  switch (family) {
    case 'galaxy': return Number.isInteger(profile.arms) && profile.arms >= 0 && profile.arms <= 4 &&
      positive(profile.bulge) && positive(profile.thickness) && color(profile.tint) &&
      Number.isFinite(profile.twist) && Number.isFinite(profile.bar) && profile.dust >= 0 && profile.dust <= 1;
    case 'nebula': return Number.isInteger(profile.shape) && profile.shape >= 0 && profile.shape <= 4 &&
      Array.isArray(profile.spread) && profile.spread.length === 3 && profile.spread.every(positive) &&
      color(profile.tint) && color(profile.edge);
    case 'star': return positive(profile.radius) && positive(profile.grain) && positive(profile.activity) &&
      color(profile.color) && Number.isInteger(profile.flares) && profile.flares >= 0;
    case 'hole': return positive(profile.outer) && profile.outer > 3 && positive(profile.speed) &&
      Number.isFinite(profile.tilt) && Number.isFinite(profile.jet) && profile.jet >= 0 && color(profile.heat);
    default: return false;
  }
}
