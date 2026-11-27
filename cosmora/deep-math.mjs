export const qualityProfiles = Object.freeze({
  low: Object.freeze({particles: 1300, layers: 2, detail: 18, pixelRatio: 1, background: 1800}),
  medium: Object.freeze({particles: 3100, layers: 3, detail: 30, pixelRatio: 1.35, background: 4200}),
  high: Object.freeze({particles: 6200, layers: 5, detail: 48, pixelRatio: 1.8, background: 8500})
});
export const qualityProfile = level => Object.hasOwn(qualityProfiles, level) ? qualityProfiles[level] : qualityProfiles.medium;
export const minimumDistance = category => ({'Galaksi': 9, 'Bulutsu': 7, 'Kara delik': 3.1, 'Yıldız': 3.5})[category] ?? 4;
export const isDeepMode = mode => mode === 'deep';
export const smoothProgress = value => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
export function cameraDirection(offset) {
  const length = Math.hypot(...offset);
  return length > 1e-8 ? offset.map(value => value / length) : [0, 0, 1];
}
export function constrainCamera(previous, desired, center, minimum) {
  const start = previous.map((value, index) => value - center[index]);
  const end = desired.map((value, index) => value - center[index]);
  const delta = end.map((value, index) => value - start[index]);
  const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
  const a = dot(delta, delta);
  const b = dot(start, delta);
  const c = dot(start, start) - minimum ** 2;
  const discriminant = b ** 2 - a * c;
  if (a > 0 && c >= -1e-8 && b < 0 && discriminant > 0) {
    const hit = (-b - Math.sqrt(discriminant)) / a;
    if (hit <= 1) {
      return previous.map((value, index) => value + Math.max(0, hit - 1e-6) * delta[index]);
    }
  }
  if (Math.hypot(...end) >= minimum) return desired;
  const direction = cameraDirection(Math.hypot(...end) > 1e-8 ? end : start);
  return center.map((value, index) => value + direction[index] * minimum);
}
export function planTravel(position, currentLook, target, distance) {
  const direction = cameraDirection(position.map((value, index) => value - target[index]));
  return {
    start: [...position], startLook: [...currentLook], target: [...target],
    end: target.map((value, index) => value + direction[index] * distance)
  };
}
