import * as T from 'three'
import { IslandModelRenderer } from './IslandModelRenderer'

type IslandModelInteractorOptions = {
  onModelClick?: (modelId: string) => void;
  onEmptyClick?: () => void;
  onRotationStart?: () => void;
  onRotationEnd?: () => void;
}

export class IslandModelInteractor {
  private readonly camera: T.PerspectiveCamera
  private readonly canvas: HTMLCanvasElement
  private readonly renderer: IslandModelRenderer
  private readonly onModelClick: ((modelId: string) => void) | null
  private readonly onEmptyClick: (() => void) | null
  private readonly onRotationStart: (() => void) | null
  private readonly onRotationEnd: (() => void) | null
  private readonly raycaster = new T.Raycaster()
  private readonly pointer = new T.Vector2()
  private pointerDownClient: { x: number; y: number } | null = null
  private rotatePointerId: number | null = null
  private pointerDownModelId: string | null = null
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
    this.onEmptyClick = options?.onEmptyClick ?? null
    this.onRotationStart = options?.onRotationStart ?? null
    this.onRotationEnd = options?.onRotationEnd ?? null

    this.canvas.addEventListener('pointerdown', this.handlePointerDown, { capture: true })
    this.canvas.addEventListener('pointermove', this.handlePointerMove, { capture: true })
    this.canvas.addEventListener('pointerup', this.handlePointerUp, { capture: true })
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave, { capture: true })
    this.canvas.addEventListener('pointercancel', this.handlePointerLeave, { capture: true })
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown, { capture: true })
    this.canvas.removeEventListener('pointermove', this.handlePointerMove, { capture: true })
    this.canvas.removeEventListener('pointerup', this.handlePointerUp, { capture: true })
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave, { capture: true })
    this.canvas.removeEventListener('pointercancel', this.handlePointerLeave, { capture: true })

    this.pointerDownClient = null
    this.pointerDownModelId = null
    this.rotatePointerId = null
    this.isDragging = false
    this.renderer.setHoveredModel(null)
    this.onRotationEnd?.()
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    this.pointerDownClient = { x: event.clientX, y: event.clientY }
    this.pointerDownModelId = this.pickModelId(event.clientX, event.clientY)
    this.isDragging = false

    if (this.renderer.hasFocusedModel() && this.pointerDownModelId === this.renderer.getSelectedModelId()) {
      event.stopPropagation()
      event.preventDefault()
      this.rotatePointerId = event.pointerId
      this.canvas.setPointerCapture(event.pointerId)
      this.onRotationStart?.()
    }
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (this.pointerDownClient) {
      const dx = event.clientX - this.pointerDownClient.x
      const dy = event.clientY - this.pointerDownClient.y
      if (Math.hypot(dx, dy) > 4) {
        this.isDragging = true
      }

      if (
        this.rotatePointerId === event.pointerId &&
        this.renderer.hasFocusedModel() &&
        this.pointerDownModelId === this.renderer.getSelectedModelId()
      ) {
        event.stopPropagation()
        event.preventDefault()
        this.renderer.rotateFocusedModel(dx, dy)
        this.pointerDownClient = { x: event.clientX, y: event.clientY }
        return
      }

      if (this.isDragging) {
        this.renderer.setHoveredModel(null)
        return
      }
    }

    this.renderer.setHoveredModel(this.pickModelId(event.clientX, event.clientY))
  }

  private readonly handlePointerUp = (event: PointerEvent) => {
    if (!event.isPrimary) return

    const wasFocusedRotationInteraction =
      this.rotatePointerId === event.pointerId &&
      this.renderer.hasFocusedModel() &&
      this.pointerDownModelId === this.renderer.getSelectedModelId()

    if (wasFocusedRotationInteraction) {
      event.stopPropagation()
      event.preventDefault()
      this.releaseRotatePointer(event.pointerId)
      this.pointerDownClient = null
      this.pointerDownModelId = null
      this.isDragging = false
      return
    }

    if (!this.isDragging) {
      const modelId = this.pickModelId(event.clientX, event.clientY)
      if (modelId) {
        this.onModelClick?.(modelId)
      } else {
        this.onEmptyClick?.()
      }
    }

    this.releaseRotatePointer(event.pointerId)
    this.pointerDownClient = null
    this.pointerDownModelId = null
    this.isDragging = false
  }

  private readonly handlePointerLeave = () => {
    if (this.rotatePointerId !== null) {
      this.releaseRotatePointer(this.rotatePointerId)
    }

    this.pointerDownClient = null
    this.pointerDownModelId = null
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

  private releaseRotatePointer(pointerId: number) {
    if (this.rotatePointerId !== pointerId) return

    if (this.canvas.hasPointerCapture(pointerId)) {
      this.canvas.releasePointerCapture(pointerId)
    }

    this.rotatePointerId = null
    this.onRotationEnd?.()
  }
}
