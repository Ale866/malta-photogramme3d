import * as T from 'three'
import { disposeObject3D, loadDeliveredModel } from '@/features/model/infrastructure/texturedPlyModel'

type ModelPreviewSceneOptions = {
  interactive?: boolean
  meshUrl?: string | null
  textureUrl?: string | null
  orientation?: { x: number; y: number; z: number } | null
  dragMode?: 'orbit' | 'roll'
  onOrientationChange?: (orientation: { x: number; y: number; z: number }) => void
  onLoaded?: () => void
  onError?: () => void
}

type DragState = {
  pointerId: number | null
  lastX: number
  lastY: number
  mode: 'rotate' | 'pan' | 'pinch'
}

const DEFAULT_ZOOM_SCALE = 0.72

export class ModelPreviewScene {
  private sceneElement: HTMLElement | null = null
  private renderer: T.WebGLRenderer | null = null
  private scene: T.Scene | null = null
  private camera: T.PerspectiveCamera | null = null
  private previewObject: T.Object3D | null = null
  private resizeObserver: ResizeObserver | null = null
  private frameId: number | null = null
  private readonly interactive: boolean
  private readonly meshUrl: string | null
  private readonly textureUrl: string | null
  private readonly onOrientationChange?: (orientation: { x: number; y: number; z: number }) => void
  private readonly onLoaded?: () => void
  private readonly onError?: () => void
  private baseOrientation = { x: 0.3, y: 0.45, z: 0.08 }
  private dragMode: 'orbit' | 'roll'
  private loadToken = 0
  private frameCenter: T.Vector3 | null = null
  private frameOffset = new T.Vector3()
  private panInput = new T.Vector2()
  private activeTouchPoints = new Map<number, { x: number; y: number }>()
  private pinchDistance: number | null = null
  private cameraUp = new T.Vector3(0, 1, 0)
  private cameraForward = new T.Vector3()
  private cameraRight = new T.Vector3()
  private baseCameraDistance = 5.2
  private zoomScale = DEFAULT_ZOOM_SCALE
  private dragState: DragState = {
    pointerId: null,
    lastX: 0,
    lastY: 0,
    mode: 'rotate',
  }

  constructor(options: ModelPreviewSceneOptions = {}) {
    this.interactive = options.interactive ?? true
    this.meshUrl = options.meshUrl ?? null
    this.textureUrl = options.textureUrl ?? null
    this.dragMode = options.dragMode ?? 'orbit'
    if (options.orientation) {
      this.baseOrientation = { ...options.orientation }
    }
    this.onOrientationChange = options.onOrientationChange
    this.onLoaded = options.onLoaded
    this.onError = options.onError
  }

  setOrientation(orientation: { x: number; y: number; z: number }) {
    this.baseOrientation = this.normalizeOrientation(orientation)
  }

  setDragMode(mode: 'orbit' | 'roll') {
    this.dragMode = mode
  }

  zoomIn() {
    this.setZoomScale(this.zoomScale * 0.88)
  }

  zoomOut() {
    this.setZoomScale(this.zoomScale * 1.12)
  }

  resetZoom() {
    this.setZoomScale(DEFAULT_ZOOM_SCALE)
  }

  panLeft() {
    this.panByScreenDelta(-30, 0)
  }

  panRight() {
    this.panByScreenDelta(30, 0)
  }

  panUp() {
    this.panByScreenDelta(0, -30)
  }

  panDown() {
    this.panByScreenDelta(0, 30)
  }

  resetView() {
    this.frameOffset.set(0, 0, 0)
    this.setZoomScale(DEFAULT_ZOOM_SCALE)
  }

  setPanInput(input: { x: number; y: number }) {
    this.panInput.set(input.x, input.y)
  }

  mount(sceneElement: HTMLElement) {
    this.unmount()
    this.sceneElement = sceneElement

    const scene = new T.Scene()

    const camera = new T.PerspectiveCamera(36, 1, 0.1, 100)
    camera.position.set(0, 0.2, 5.2)
    camera.lookAt(0, 0, 0)

    const renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor('#000000', 0)
    renderer.outputColorSpace = T.SRGBColorSpace
    renderer.shadowMap.enabled = false

    sceneElement.replaceChildren(renderer.domElement)

    const ambientLight = new T.AmbientLight(0xffffff, 1.35)

    const keyLight = new T.DirectionalLight(0xffffff, 0.7)
    keyLight.position.set(3.2, 3.6, 4.4)

    const fillLight = new T.DirectionalLight(0xffffff, 0.28)
    fillLight.position.set(-2.2, 1.8, 2.2)

    scene.add(ambientLight, keyLight, fillLight)

    this.scene = scene
    this.camera = camera
    this.renderer = renderer

    this.syncSize()

    this.resizeObserver = new ResizeObserver(() => {
      this.syncSize()
    })
    this.resizeObserver.observe(sceneElement)

    if (this.interactive) {
      sceneElement.addEventListener('pointerdown', this.handlePointerDown)
      sceneElement.addEventListener('pointermove', this.handlePointerMove)
      sceneElement.addEventListener('pointerup', this.handlePointerUp)
      sceneElement.addEventListener('pointerleave', this.handlePointerUp)
      sceneElement.addEventListener('pointercancel', this.handlePointerUp)
      sceneElement.addEventListener('contextmenu', this.handleContextMenu)
      sceneElement.addEventListener('wheel', this.handleWheel)
    }

    void this.loadPreviewObject()
    this.animate()
  }

  unmount() {
    if (this.sceneElement) {
      this.sceneElement.removeEventListener('pointerdown', this.handlePointerDown)
      this.sceneElement.removeEventListener('pointermove', this.handlePointerMove)
      this.sceneElement.removeEventListener('pointerup', this.handlePointerUp)
      this.sceneElement.removeEventListener('pointerleave', this.handlePointerUp)
      this.sceneElement.removeEventListener('pointercancel', this.handlePointerUp)
      this.sceneElement.removeEventListener('contextmenu', this.handleContextMenu)
      this.sceneElement.removeEventListener('wheel', this.handleWheel)
    }

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }

    this.resizeObserver?.disconnect()
    this.resizeObserver = null

    this.loadToken += 1

    if (this.previewObject) {
      disposeObject3D(this.previewObject)
      this.scene?.remove(this.previewObject)
      this.previewObject = null
    }

    this.scene = null
    this.camera = null

    if (this.renderer) {
      this.renderer.dispose()
      this.renderer.domElement.remove()
      this.renderer = null
    }

    this.dragState.pointerId = null
    this.dragState.mode = 'rotate'
    this.panInput.set(0, 0)
    this.activeTouchPoints.clear()
    this.pinchDistance = null
    this.sceneElement = null
  }

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return

    if (this.previewObject) {
      if (this.interactive) {
        this.previewObject.rotation.x = this.baseOrientation.x
        this.previewObject.rotation.y = this.baseOrientation.y
        this.previewObject.rotation.z = this.baseOrientation.z
      } else {
        this.previewObject.rotation.x = this.baseOrientation.x
        this.previewObject.rotation.y += 0.01
        this.previewObject.rotation.z = this.baseOrientation.z
      }
    }

    this.applyPanInput()

    this.renderer.render(this.scene, this.camera)
    this.frameId = requestAnimationFrame(this.animate)
  }

  private syncSize() {
    if (!this.sceneElement || !this.renderer || !this.camera) return

    const width = Math.max(this.sceneElement.clientWidth, 1)
    const height = Math.max(this.sceneElement.clientHeight, 1)

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.sceneElement) return

    if (event.pointerType === 'touch') {
      this.activeTouchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (this.activeTouchPoints.size === 2) {
        this.dragState.pointerId = null
        this.dragState.mode = 'pinch'
        this.pinchDistance = this.getTouchDistance()
        return
      }
    }

    this.dragState.pointerId = event.pointerId
    this.dragState.lastX = event.clientX
    this.dragState.lastY = event.clientY
    this.dragState.mode =
      event.pointerType === 'mouse' && (event.button === 1 || event.button === 2 || event.ctrlKey || event.metaKey)
        ? 'pan'
        : 'rotate'
    this.sceneElement.setPointerCapture(event.pointerId)
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch' && this.activeTouchPoints.has(event.pointerId)) {
      this.activeTouchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (this.activeTouchPoints.size === 2) {
        const nextDistance = this.getTouchDistance()
        if (this.pinchDistance !== null && nextDistance !== null && this.pinchDistance > 0) {
          this.setZoomScale(this.zoomScale * (this.pinchDistance / nextDistance))
        }
        this.pinchDistance = nextDistance
        this.dragState.mode = 'pinch'
        return
      }
    }

    if (this.dragState.pointerId !== event.pointerId) return

    const deltaX = event.clientX - this.dragState.lastX
    const deltaY = event.clientY - this.dragState.lastY

    if (this.dragState.mode === 'pan') {
      this.panByScreenDelta(deltaX, deltaY)
    } else {
      const rotateRoll = this.dragMode === 'roll' || event.shiftKey

      if (rotateRoll) {
        this.baseOrientation = {
          ...this.baseOrientation,
          z: this.normalizeAngle(this.baseOrientation.z + deltaX * 0.006),
        }
      } else {
        this.baseOrientation = {
          ...this.baseOrientation,
          x: this.normalizeAngle(this.baseOrientation.x + deltaY * 0.005),
          y: this.normalizeAngle(this.baseOrientation.y + deltaX * 0.006),
        }
      }
      this.onOrientationChange?.({ ...this.baseOrientation })
    }
    this.dragState.lastX = event.clientX
    this.dragState.lastY = event.clientY
  }

  private handlePointerUp = (event: PointerEvent) => {
    if (!this.sceneElement) return

    if (event.pointerType === 'touch') {
      this.activeTouchPoints.delete(event.pointerId)

      if (this.activeTouchPoints.size < 2) {
        this.pinchDistance = null
        if (this.dragState.mode === 'pinch') {
          this.dragState.mode = 'rotate'
        }
      }
    }

    if (this.dragState.pointerId !== event.pointerId) return

    if (this.sceneElement.hasPointerCapture(event.pointerId)) {
      this.sceneElement.releasePointerCapture(event.pointerId)
    }

    this.dragState.pointerId = null
    this.dragState.mode = 'rotate'
  }

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault()

    const direction = event.deltaY > 0 ? 1.08 : 0.92
    this.setZoomScale(this.zoomScale * direction)
  }

  private handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
  }

  private async loadPreviewObject() {
    if (!this.scene || !this.camera || !this.meshUrl) {
      this.onError?.()
      return
    }

    const currentToken = ++this.loadToken

    try {
      const previewObject = await loadDeliveredModel({
        meshUrl: this.meshUrl,
        textureUrl: this.textureUrl,
      })

      if (currentToken !== this.loadToken || !this.scene || !this.camera) {
        disposeObject3D(previewObject)
        return
      }

      this.centerPreviewObject(previewObject)
      previewObject.rotation.set(this.baseOrientation.x, this.baseOrientation.y, this.baseOrientation.z)
      this.scene.add(previewObject)
      this.previewObject = previewObject
      this.framePreviewObject(previewObject)
      this.onLoaded?.()
    } catch (error) {
      console.error('Failed to load model preview asset', error)
      this.onError?.()
    }
  }

  private framePreviewObject(object: T.Object3D) {
    if (!this.camera) return

    const box = new T.Box3().setFromObject(object)
    const center = box.getCenter(new T.Vector3())
    const size = box.getSize(new T.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z, 1)
    const distance = maxDimension / (2 * Math.tan((this.camera.fov * Math.PI) / 360))
    this.frameCenter = center
    this.baseCameraDistance = distance * 1.16
    this.applyCameraFrame()
  }

  private centerPreviewObject(object: T.Object3D) {
    const box = new T.Box3().setFromObject(object)
    const center = box.getCenter(new T.Vector3())
    object.position.sub(center)
  }

  private setZoomScale(scale: number) {
    this.zoomScale = T.MathUtils.clamp(scale, 0.42, 1.9)
    this.applyCameraFrame()
  }

  private applyCameraFrame() {
    if (!this.camera || !this.frameCenter) return

    const framedDistance = this.baseCameraDistance * this.zoomScale
    const target = this.frameCenter.clone().add(this.frameOffset)

    this.camera.position.set(
      target.x + framedDistance * 0.18,
      target.y + framedDistance * 0.12,
      target.z + framedDistance * 1.42,
    )
    this.camera.lookAt(target)
    this.camera.updateProjectionMatrix()
  }

  private panByScreenDelta(deltaX: number, deltaY: number) {
    if (!this.camera || !this.frameCenter) return

    const target = this.frameCenter.clone().add(this.frameOffset)
    const distance = this.camera.position.distanceTo(target)
    const panScale = Math.max(distance * 0.0018, 0.0025)

    this.cameraForward.copy(target).sub(this.camera.position).normalize()
    this.cameraRight.crossVectors(this.cameraForward, this.cameraUp).normalize()

    this.frameOffset
      .addScaledVector(this.cameraRight, -deltaX * panScale)
      .addScaledVector(this.cameraUp, deltaY * panScale)

    this.applyCameraFrame()
  }

  private applyPanInput() {
    if (this.panInput.lengthSq() < 1e-4) return

    this.panByScreenDelta(this.panInput.x * 10, -this.panInput.y * 10)
  }

  private getTouchDistance() {
    if (this.activeTouchPoints.size < 2) return null

    const points = Array.from(this.activeTouchPoints.values())
    const first = points[0]
    const second = points[1]
    if (!first || !second) return null

    return Math.hypot(second.x - first.x, second.y - first.y)
  }

  private normalizeOrientation(orientation: { x: number; y: number; z: number }) {
    return {
      x: this.normalizeAngle(orientation.x),
      y: this.normalizeAngle(orientation.y),
      z: this.normalizeAngle(orientation.z),
    }
  }

  private normalizeAngle(angle: number) {
    const fullTurn = Math.PI * 2
    let normalized = angle % fullTurn
    if (normalized <= -Math.PI) normalized += fullTurn
    if (normalized > Math.PI) normalized -= fullTurn
    return normalized
  }
}
