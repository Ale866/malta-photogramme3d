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
    return this.goToUTM(easting, northing)
  }

  goToUTM(easting: number, northing: number): T.Vector3 {
    const local = this.coordinateMapper.utmToLocal(easting, northing, 0)
    local.y = this.terrainService.sampleHeight(local.x, local.z)
    this.createMarkerAndFlyTo(local)
    return local.clone()
  }

  goToPosition(position: T.Vector3): T.Vector3 {
    this.createMarkerAndFlyTo(position)
    return position.clone()
  }

  private createMarkerAndFlyTo(position: T.Vector3) {
    this.markerRenderer.createMarker(position)
    this.cameraController.flyTo(position)
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
