import * as T from 'three'
import { disposeObject3D, loadTexturedPlyModel } from '@/features/model/infrastructure/texturedPlyModel'

type ModelPreviewSceneOptions = {
  interactive?: boolean
  meshUrl?: string | null
  textureUrl?: string | null
}

type DragState = {
  pointerId: number | null
  lastX: number
  lastY: number
  rotationX: number
  rotationY: number
}

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
  private loadToken = 0
  private dragState: DragState = {
    pointerId: null,
    lastX: 0,
    lastY: 0,
    rotationX: 0.3,
    rotationY: 0.45,
  }

  constructor(options: ModelPreviewSceneOptions = {}) {
    this.interactive = options.interactive ?? true
    this.meshUrl = options.meshUrl ?? null
    this.textureUrl = options.textureUrl ?? null
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
    this.sceneElement = null
  }

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera || !this.previewObject) return

    if (this.interactive) {
      this.previewObject.rotation.x = this.dragState.rotationX
      this.previewObject.rotation.y = this.dragState.rotationY
    } else {
      this.previewObject.rotation.x = 0.42
      this.previewObject.rotation.y += 0.01
    }

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

    this.dragState.pointerId = event.pointerId
    this.dragState.lastX = event.clientX
    this.dragState.lastY = event.clientY
    this.sceneElement.setPointerCapture(event.pointerId)
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (this.dragState.pointerId !== event.pointerId) return

    const deltaX = event.clientX - this.dragState.lastX
    const deltaY = event.clientY - this.dragState.lastY

    this.dragState.rotationY += deltaX * 0.006
    this.dragState.rotationX = Math.max(-0.8, Math.min(0.8, this.dragState.rotationX + deltaY * 0.005))
    this.dragState.lastX = event.clientX
    this.dragState.lastY = event.clientY
  }

  private handlePointerUp = (event: PointerEvent) => {
    if (!this.sceneElement || this.dragState.pointerId !== event.pointerId) return

    if (this.sceneElement.hasPointerCapture(event.pointerId)) {
      this.sceneElement.releasePointerCapture(event.pointerId)
    }

    this.dragState.pointerId = null
  }

  private async loadPreviewObject() {
    if (!this.scene || !this.camera || !this.meshUrl) return

    const currentToken = ++this.loadToken

    try {
      const previewObject = await loadTexturedPlyModel({
        meshUrl: this.meshUrl,
        textureUrl: this.textureUrl,
      })

      if (currentToken !== this.loadToken || !this.scene || !this.camera) {
        disposeObject3D(previewObject)
        return
      }

      previewObject.rotation.set(this.dragState.rotationX, this.dragState.rotationY, 0.08)
      this.scene.add(previewObject)
      this.previewObject = previewObject
      this.framePreviewObject(previewObject)
    } catch (error) {
      console.error('Failed to load model preview asset', error)
    }
  }

  private framePreviewObject(object: T.Object3D) {
    if (!this.camera) return

    const box = new T.Box3().setFromObject(object)
    const center = box.getCenter(new T.Vector3())
    const size = box.getSize(new T.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z, 1)
    const distance = maxDimension / (2 * Math.tan((this.camera.fov * Math.PI) / 360))

    this.camera.position.set(center.x + distance * 0.3, center.y + distance * 0.18, center.z + distance * 1.4)
    this.camera.lookAt(center)
    this.camera.updateProjectionMatrix()
  }
}
