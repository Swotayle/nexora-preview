export function horizonCartesian(azimuth, altitude, radius) {
  const az = azimuth * Math.PI / 180;
  const alt = altitude * Math.PI / 180;
  const horizontal = Math.cos(alt) * radius;
  return [
    Math.sin(az) * horizontal,
    Math.sin(alt) * radius,
    -Math.cos(az) * horizontal
  ];
}
