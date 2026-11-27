import { constrainCamera, smoothProgress } from './deep-math.mjs';

export const flightStep = seconds => Number.isFinite(seconds) ? Math.min(.05, Math.max(0, seconds)) : 0;
export const validPosition = point => Array.isArray(point) && point.length === 3 && point.every(Number.isFinite);
const distance = (a,b) => Math.hypot(...a.map((value,index) => value-b[index]));
export const scaledRadius = (radius, scale = 1) => Number.isFinite(radius * scale) && radius > 0 && scale > 0 ? radius * scale + .35 : 0;
export const travelDuration = (distance, speed) => Math.min(6, Math.max(.55, Math.sqrt(Math.max(0,distance)) / Math.max(1,speed) * 1.4));
export const movementSpeed = (base, keys) => base * (keys.has('control') ? .25 : keys.has('shift') ? 2.5 : 1);
export function flightMode({travel, cinematic, orbit, tracking}) {
  return travel ? 'Yolculuk' : cinematic ? 'Sinematik' : orbit ? 'Yörünge' : tracking ? 'Takip' : 'Serbest';
}

export function integrateFlight(velocity, intent, seconds, response = 5.5) {
  const dt = flightStep(seconds);
  const weight = -Math.expm1(-response * dt);
  return {
    velocity: velocity.map((value,index) => value + (intent[index]-value) * weight),
    displacement: velocity.map((value,index) => intent[index]*dt + (value-intent[index])*weight/response)
  };
}

export function createJourney(start, look, end, target, speed) {
  if (![start,look,end,target].every(validPosition)) return null;
  return {start:[...start], look:[...look], end:[...end], target:[...target],
    duration:travelDuration(distance(start,end),speed), elapsed:0};
}

export function advanceJourney(journey, seconds, movingTarget = journey.target) {
  if (!validPosition(movingTarget)) movingTarget = journey.target;
  const elapsed = Math.min(journey.duration,journey.elapsed + flightStep(seconds));
  const progress = elapsed / journey.duration;
  const amount = smoothProgress(progress);
  return {
    elapsed, progress, done: progress >= 1,
    position: journey.start.map((start,index) => start+(journey.end[index]+movingTarget[index]-journey.target[index]-start)*amount),
    look: journey.look.map((start,index) => start+(movingTarget[index]-start)*amount)
  };
}

export function resolveFlight(previous, desired, colliders, fallback = [0,7,90]) {
  const start = validPosition(previous) ? previous : fallback;
  const candidate = validPosition(desired) ? desired : start;
  let end = candidate;
  for (const {center,radius} of colliders) {
    if (!validPosition(center) || !Number.isFinite(radius) || radius <= 0) continue;
    if (distance(start,center) < radius) continue;
    const hit = constrainCamera(start,candidate,center,radius);
    if (distance(start,hit) < distance(start,end)) end = hit;
  }
  const validColliders = colliders.filter(({center,radius}) => validPosition(center) && Number.isFinite(radius) && radius > 0);
  const outside = point => validColliders.every(({center,radius}) => distance(point,center) >= radius-1e-7);
  for (let pass=0;pass<4 && !outside(end);pass++) {
    for (const {center,radius} of validColliders) {
      if (distance(end,center) < radius-1e-7) end = constrainCamera(end,end,center,radius);
    }
  }
  return outside(end) ? end : outside(start) ? start : fallback;
}

