type CoordinatePair = {
  lat: number
  lon: number
}

const MALTA_LAT_RANGE = {
  min: 35.79,
  max: 36.09,
}

const MALTA_LON_RANGE = {
  min: 14.18,
  max: 14.61,
}

function isInMaltaBounds(lat: number, lon: number) {
  return (
    lat >= MALTA_LAT_RANGE.min &&
    lat <= MALTA_LAT_RANGE.max &&
    lon >= MALTA_LON_RANGE.min &&
    lon <= MALTA_LON_RANGE.max
  )
}

function toCoordinatePair(first: number, second: number): CoordinatePair | null {
  if (isInMaltaBounds(first, second)) {
    return { lat: first, lon: second }
  }

  if (isInMaltaBounds(second, first)) {
    return { lat: second, lon: first }
  }

  return null
}

function formatCoordinateValue(value: number) {
  return value.toFixed(6).replace(/\.?0+$/, '')
}

function formatCoordinateLabel(lat: number, lon: number) {
  return `${formatCoordinateValue(lat)}, ${formatCoordinateValue(lon)}`
}

export function createCoordinateSearchEntry(lat: number, lon: number): SearchEntry | null {
  if (!isInMaltaBounds(lat, lon)) {
    return null
  }

  const label = formatCoordinateLabel(lat, lon)

  return {
    id: `coordinates:${lat}:${lon}`,
    name: 'Coordinates',
    city: label,
    type: 'coordinates',
    lat,
    lon,
  }
}

export function toCoordinateSearchEntry(query: string): SearchEntry | null {
  const values = query.match(/[+-]?\d+(?:\.\d+)?/g)
  if (!values || values.length !== 2) {
    return null
  }

  const first = Number(values[0])
  const second = Number(values[1])
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null
  }

  const coordinates = toCoordinatePair(first, second)
  if (!coordinates) {
    return null
  }

  return createCoordinateSearchEntry(coordinates.lat, coordinates.lon)
}
