import * as T from 'three'

export class InteractionHandler {
  private camera: T.PerspectiveCamera
  private canvas: HTMLCanvasElement
  private isDragging = false

  constructor(camera: T.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera
    this.canvas = canvas
  }

  setupClickHandler(onClick: (point: T.Vector3) => void, scene: T.Scene, terrainObject?: T.Object3D) {
    this.canvas.addEventListener('mousedown', () => {
      this.isDragging = false
    })

    this.canvas.addEventListener('mousemove', () => {
      this.isDragging = true
    })

    this.canvas.addEventListener('mouseup', (event) => {
      if (!this.isDragging) {
        const point = this.raycastClick(event, scene, terrainObject)
        if (point) {
          onClick(point)
        }
      }
    })
  }

  private raycastClick(
    event: MouseEvent,
    scene: T.Scene,
    terrainObject?: T.Object3D
  ): T.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect()
    const mouse = new T.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new T.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)

    const targets = terrainObject ? [terrainObject] : scene.children
    const intersects = raycaster.intersectObjects(targets, true)

    if (intersects.length > 0) {
      return intersects[0]!.point
    }

    return null
  }
}
