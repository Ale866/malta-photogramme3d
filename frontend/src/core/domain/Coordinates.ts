export type LocalCoordinates = {
  x: number
  y: number
  z: number
}

export type UtmCoordinates = {
  easting: number
  northing: number
  altitude: number
}

export type MappedCoordinates = {
  local: LocalCoordinates
  utm: UtmCoordinates
}
