import { CameraController } from '@/core/three/controls/CameraController'
import { SceneRenderer } from '@/core/three/rendering/SceneRenderer'
import type {
  LocalPoint,
  ScreenPoint,
  ViewportProjectionPort,
} from '@/features/island/domain/ViewportProjectionPort'

export class ThreeViewportProjectionAdapter implements ViewportProjectionPort {
  private sceneRenderer: SceneRenderer
  private cameraController: CameraController

  constructor(sceneRenderer: SceneRenderer, cameraController: CameraController) {
    this.sceneRenderer = sceneRenderer
    this.cameraController = cameraController
  }

  projectPoint(local: LocalPoint, out?: ScreenPoint) {
    return this.sceneRenderer.projectWorldToScreen(
      {
        x: local.x,
        y: local.y + 1,
        z: local.z,
      },
      out
    )
  }

  onViewportChange(handler: () => void) {
    return this.cameraController.onChange(handler)
  }
}
