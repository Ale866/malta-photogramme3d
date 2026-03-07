import * as T from 'three'
import { IslandModelRenderer } from './IslandModelRenderer'

type IslandModelInteractorOptions = {
  onModelClick?: (modelId: string) => void;
}

export class IslandModelInteractor {
  private readonly camera: T.PerspectiveCamera
  private readonly canvas: HTMLCanvasElement
  private readonly renderer: IslandModelRenderer
  private readonly onModelClick: ((modelId: string) => void) | null
  private readonly raycaster = new T.Raycaster()
  private readonly pointer = new T.Vector2()
  private pointerDownClient: { x: number; y: number } | null = null
  private isDragging = false

  constructor(
    camera: T.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    renderer: IslandModelRenderer,
    options?: IslandModelInteractorOptions,
  ) {
    this.camera = camera
    this.canvas = canvas
    this.renderer = renderer
    this.onModelClick = options?.onModelClick ?? null

    this.canvas.addEventListener('pointerdown', this.handlePointerDown)
    this.canvas.addEventListener('pointermove', this.handlePointerMove)
    this.canvas.addEventListener('pointerup', this.handlePointerUp)
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave)
    this.canvas.addEventListener('pointercancel', this.handlePointerLeave)
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    this.canvas.removeEventListener('pointercancel', this.handlePointerLeave)

    this.pointerDownClient = null
    this.isDragging = false
    this.renderer.setHoveredModel(null)
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    this.pointerDownClient = { x: event.clientX, y: event.clientY }
    this.isDragging = false
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (this.pointerDownClient) {
      const dx = event.clientX - this.pointerDownClient.x
      const dy = event.clientY - this.pointerDownClient.y
      if (Math.hypot(dx, dy) > 4) {
        this.isDragging = true
      }
    }

    this.renderer.setHoveredModel(this.pickModelId(event.clientX, event.clientY))
  }

  private readonly handlePointerUp = (event: PointerEvent) => {
    if (!event.isPrimary) return

    if (!this.isDragging) {
      const modelId = this.pickModelId(event.clientX, event.clientY)
      if (modelId) {
        this.onModelClick?.(modelId)
      }
    }

    this.pointerDownClient = null
    this.isDragging = false
  }

  private readonly handlePointerLeave = () => {
    this.pointerDownClient = null
    this.isDragging = false
    this.renderer.setHoveredModel(null)
  }

  private pickModelId(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )

    this.raycaster.setFromCamera(this.pointer, this.camera)
    const intersects = this.raycaster.intersectObjects(this.renderer.getInteractiveObjects(), true)
    const firstHit = intersects[0]?.object ?? null
    return this.renderer.getModelIdFromObject(firstHit)
  }
}
