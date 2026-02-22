import * as T from 'three'

export class InteractionHandler {
  private camera: T.PerspectiveCamera
  private canvas: HTMLCanvasElement
  private isDragging = false
  private pointerDownClient: { x: number; y: number } | null = null

  constructor(camera: T.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera
    this.canvas = canvas
  }

  setupClickHandler(onClick: (point: T.Vector3) => void, scene: T.Scene, terrainObject?: T.Object3D) {
    this.canvas.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary) return
      if (event.pointerType === 'mouse' && event.button !== 0) return

      this.isDragging = false
      this.pointerDownClient = { x: event.clientX, y: event.clientY }
    })

    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.pointerDownClient) return

      const dx = event.clientX - this.pointerDownClient.x
      const dy = event.clientY - this.pointerDownClient.y
      if (Math.hypot(dx, dy) > 4) {
        this.isDragging = true
      }
    })

    this.canvas.addEventListener('pointerup', (event) => {
      if (!event.isPrimary) return
      if (!this.isDragging && this.pointerDownClient) {
        const point = this.raycastClick(event.clientX, event.clientY, scene, terrainObject)
        if (point) {
          onClick(point)
        }
      }
      this.pointerDownClient = null
      this.isDragging = false
    })

    this.canvas.addEventListener('pointercancel', () => {
      this.pointerDownClient = null
      this.isDragging = false
    })
  }

  private raycastClick(
    clientX: number,
    clientY: number,
    scene: T.Scene,
    terrainObject?: T.Object3D
  ): T.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect()
    const mouse = new T.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
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
