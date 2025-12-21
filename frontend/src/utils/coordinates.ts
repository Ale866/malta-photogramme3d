export function latLonToUTM(lat: number, lon: number) {
  const a = 6378137.0
  const f = 1 / 298.257223563
  const k0 = 0.9996

  const e = Math.sqrt(f * (2 - f))
  const eSq = e * e
  const ePrimeSq = eSq / (1 - eSq)

  const zone = Math.floor((lon + 180) / 6) + 1
  const lonOrigin = (zone - 1) * 6 - 180 + 3

  const degToRad = (deg: number) => deg * Math.PI / 180

  const latRad = degToRad(lat)
  const lonRad = degToRad(lon)
  const lonOriginRad = degToRad(lonOrigin)

  const N = a / Math.sqrt(1 - eSq * Math.sin(latRad) ** 2)
  const T = Math.tan(latRad) ** 2
  const C = ePrimeSq * Math.cos(latRad) ** 2
  const A = Math.cos(latRad) * (lonRad - lonOriginRad)

  const M =
    a *
    ((1 -
      eSq / 4 -
      (3 * eSq ** 2) / 64 -
      (5 * eSq ** 3) / 256) *
      latRad -
      ((3 * eSq) / 8 +
        (3 * eSq ** 2) / 32 +
        (45 * eSq ** 3) / 1024) *
      Math.sin(2 * latRad) +
      ((15 * eSq ** 2) / 256 +
        (45 * eSq ** 3) / 1024) *
      Math.sin(4 * latRad) -
      ((35 * eSq ** 3) / 3072) *
      Math.sin(6 * latRad))

  let easting =
    k0 *
    N *
    (A +
      ((1 - T + C) * A ** 3) / 6 +
      ((5 -
        18 * T +
        T ** 2 +
        72 * C -
        58 * ePrimeSq) *
        A ** 5) /
      120) +
    500000

  let northing =
    k0 *
    (M +
      N *
      Math.tan(latRad) *
      ((A ** 2) / 2 +
        ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
        ((61 -
          58 * T +
          T ** 2 +
          600 * C -
          330 * ePrimeSq) *
          A ** 6) /
        720))

  if (lat < 0) northing += 10000000

  return {
    easting,
    northing,
    z: 0,
  }
}
