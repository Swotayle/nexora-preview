export const celestialHours = longitude => ((longitude % 360 + 360) % 360) / 15;

export function* constellationSegments(figures) {
  for (const [, figure] of figures) {
    for (const line of figure) {
      for (let i=1;i<line.length;i++) yield [line[i-1],line[i]];
    }
  }
}

export function makeJ2000Horizon(astronomy, date, observer) {
  const rotation=astronomy.Rotation_EQJ_HOR(date,observer);
  return (ra, dec) => {
    const eqj=astronomy.VectorFromSphere(new astronomy.Spherical(dec,ra*15,1),date);
    const horizontal=astronomy.RotateVector(rotation,eqj);
    const {lon:azimuth,lat:altitude}=astronomy.HorizonFromVector(horizontal);
    return {azimuth,altitude};
  };
}
