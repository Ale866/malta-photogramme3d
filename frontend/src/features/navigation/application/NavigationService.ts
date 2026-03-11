import * as T from 'three'
import { CameraController } from '@/core/three/controls/CameraController'
import { MarkerRenderer } from '@/core/three/objects/MarkerRenderer'
import { CoordinateMapper } from '@/features/terrain/domain/CoordinateMapper'
import { TerrainService } from '@/features/terrain/application/TerrainService'
import { latLonToUTM } from '@/utils/coordinates'

export class NavigationService {
  private cameraController: CameraController
  private markerRenderer: MarkerRenderer
  private coordinateMapper: CoordinateMapper
  private terrainService: TerrainService

  constructor(
    cameraController: CameraController,
    markerRenderer: MarkerRenderer,
    coordinateMapper: CoordinateMapper,
    terrainService: TerrainService
  ) {
    this.cameraController = cameraController
    this.markerRenderer = markerRenderer
    this.coordinateMapper = coordinateMapper
    this.terrainService = terrainService
  }

  goToLatLon(lat: number, lon: number): T.Vector3 {
    const { easting, northing } = latLonToUTM(lat, lon)
    const local = this.coordinateMapper.utmToLocal(easting, northing, 0)
    local.y = this.terrainService.sampleHeight(local.x, local.z)
    this.selectTerrainCoordinates(local)
    return local.clone()
  }

  selectTerrainCoordinates(coordinates: { x: number; y: number; z: number }) {
    const target = new T.Vector3(coordinates.x, coordinates.y, coordinates.z)
    this.markerRenderer.createMarker(target)
    this.cameraController.flyTo(target, {
      height: 34,
      angleX: -Math.PI / 6.2,
      angleY: -Math.PI / 7,
      duration: 1.7,
      targetYOffset: -8,
    })
  }

  focusCoordinates(coordinates: { x: number; y: number; z: number }) {
    const target = new T.Vector3(coordinates.x, coordinates.y, coordinates.z)
    this.cameraController.flyTo(target, {
      height: 18,
      angleX: -Math.PI / 10,
      angleY: 0,
      duration: 1.4,
      targetYOffset: 0,
    })
  }

  getMarkerPosition() {
    return this.markerRenderer.getMarkerPosition()
  }

  removeMarker() {
    this.markerRenderer.removeMarker()
  }

  dispose() {
    this.markerRenderer.dispose()
  }
}
