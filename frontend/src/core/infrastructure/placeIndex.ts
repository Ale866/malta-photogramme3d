import { MALTA_TERRAIN_LOCAL_BBOX, MALTA_TERRAIN_UTM_BBOX } from '@/core/config/maltaTerrainBounds'
import type { LocalCoordinates } from '@/core/domain/Coordinates'
import { latLonToUTM } from '@/utils/coordinates'

type IndexedSearchEntry = SearchEntry & {
  easting: number
  northing: number
}

const SEARCH_INDEX_URL = '/search/malta_search_index.json'

let searchIndexPromise: Promise<IndexedSearchEntry[]> | null = null

function loadSearchIndex() {
  if (!searchIndexPromise) {
    searchIndexPromise = fetch(SEARCH_INDEX_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load place index')
        }

        return response.json() as Promise<SearchEntry[]>
      })
      .then((entries) =>
        entries.map((entry) => {
          const utm = latLonToUTM(entry.lat, entry.lon)
          return {
            ...entry,
            easting: utm.easting,
            northing: utm.northing,
          }
        })
      )
      .catch((error) => {
        searchIndexPromise = null
        throw error
      })
  }

  return searchIndexPromise
}

function toUtmCoordinates(coordinates: LocalCoordinates) {
  const u = (coordinates.x - MALTA_TERRAIN_LOCAL_BBOX.minX) / (MALTA_TERRAIN_LOCAL_BBOX.maxX - MALTA_TERRAIN_LOCAL_BBOX.minX)
  const v = (MALTA_TERRAIN_LOCAL_BBOX.maxZ - coordinates.z) / (MALTA_TERRAIN_LOCAL_BBOX.maxZ - MALTA_TERRAIN_LOCAL_BBOX.minZ)

  return {
    easting: MALTA_TERRAIN_UTM_BBOX.minE + u * (MALTA_TERRAIN_UTM_BBOX.maxE - MALTA_TERRAIN_UTM_BBOX.minE),
    northing: MALTA_TERRAIN_UTM_BBOX.minN + v * (MALTA_TERRAIN_UTM_BBOX.maxN - MALTA_TERRAIN_UTM_BBOX.minN),
  }
}

function getSquaredDistance(left: { easting: number; northing: number }, right: { easting: number; northing: number }) {
  const deltaE = left.easting - right.easting
  const deltaN = left.northing - right.northing
  return deltaE * deltaE + deltaN * deltaN
}

function formatPlaceLabel(entry: SearchEntry) {
  if (!entry.city || entry.city === entry.name) {
    return entry.name
  }

  return `${entry.name}, ${entry.city}`
}

function findNearestEntry(entries: IndexedSearchEntry[], target: { easting: number; northing: number }) {
  let nearestOverall: IndexedSearchEntry | null = null
  let nearestOverallDistance = Number.POSITIVE_INFINITY

  for (const entry of entries) {
    const distance = getSquaredDistance(entry, target)

    if (distance < nearestOverallDistance) {
      nearestOverall = entry
      nearestOverallDistance = distance
    }
  }

  return nearestOverall
}

export async function resolvePlaceLabelForLocalCoordinates(coordinates: LocalCoordinates) {
  return loadSearchIndex().then((entries) => {
    const nearestEntry = findNearestEntry(entries, toUtmCoordinates(coordinates))
    return nearestEntry ? formatPlaceLabel(nearestEntry) : 'Unknown area'
  })
}
