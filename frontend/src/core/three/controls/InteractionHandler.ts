import * as T from 'three'

export class InteractionHandler {
  private camera: T.PerspectiveCamera
  private canvas: HTMLCanvasElement
  private isDragging = false
  private pointerDownClient: { x: number; y: number } | null = null
  private onClick: ((point: T.Vector3) => void) | null = null
  private onMiss: (() => void) | null = null
  private scene: T.Scene | null = null
  private terrainObject: T.Object3D | undefined
  private isBound = false

  constructor(camera: T.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera
    this.canvas = canvas
  }

  setupClickHandler(
    onClick: (point: T.Vector3) => void,
    onMiss: () => void,
    scene: T.Scene,
    terrainObject?: T.Object3D,
  ) {
    this.onClick = onClick
    this.onMiss = onMiss
    this.scene = scene
    this.terrainObject = terrainObject

    if (this.isBound) return

    this.canvas.addEventListener('pointerdown', this.handlePointerDown)
    this.canvas.addEventListener('pointermove', this.handlePointerMove)
    this.canvas.addEventListener('pointerup', this.handlePointerUp)
    this.canvas.addEventListener('pointercancel', this.handlePointerCancel)
    this.isBound = true
  }

  dispose() {
    if (this.isBound) {
      this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
      this.canvas.removeEventListener('pointermove', this.handlePointerMove)
      this.canvas.removeEventListener('pointerup', this.handlePointerUp)
      this.canvas.removeEventListener('pointercancel', this.handlePointerCancel)
      this.isBound = false
    }

    this.pointerDownClient = null
    this.isDragging = false
    this.onClick = null
    this.onMiss = null
    this.scene = null
    this.terrainObject = undefined
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    this.isDragging = false
    this.pointerDownClient = { x: event.clientX, y: event.clientY }
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (!this.pointerDownClient) return

    const dx = event.clientX - this.pointerDownClient.x
    const dy = event.clientY - this.pointerDownClient.y
    if (Math.hypot(dx, dy) > 4) {
      this.isDragging = true
    }
  }

  private readonly handlePointerUp = (event: PointerEvent) => {
    if (!event.isPrimary) return
    if (!this.isDragging && this.pointerDownClient && this.scene) {
      const point = this.raycastClick(event.clientX, event.clientY, this.scene, this.terrainObject)
      if (point) {
        this.onClick?.(point)
      } else {
        this.onMiss?.()
      }
    }
    this.pointerDownClient = null
    this.isDragging = false
  }

  private readonly handlePointerCancel = () => {
    this.pointerDownClient = null
    this.isDragging = false
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
