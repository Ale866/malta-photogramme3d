import * as T from 'three'

type ModelPreviewSceneOptions = {
  interactive?: boolean
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
  private previewMesh: T.Mesh<T.BoxGeometry, T.MeshStandardMaterial> | null = null
  private resizeObserver: ResizeObserver | null = null
  private frameId: number | null = null
  private readonly interactive: boolean
  private dragState: DragState = {
    pointerId: null,
    lastX: 0,
    lastY: 0,
    rotationX: 0.3,
    rotationY: 0.45,
  }

  constructor(options: ModelPreviewSceneOptions = {}) {
    this.interactive = options.interactive ?? true
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

    const geometry = new T.BoxGeometry(1.18, 1.18, 1.18)
    const material = new T.MeshStandardMaterial({
      color: '#1f7a8c',
      emissive: '#1f7a8c',
      emissiveIntensity: 0.08,
      roughness: 0.72,
      metalness: 0,
    })

    const previewMesh = new T.Mesh(geometry, material)
    previewMesh.position.set(0, 0, 0)
    previewMesh.rotation.set(this.dragState.rotationX, this.dragState.rotationY, 0.08)

    scene.add(ambientLight, keyLight, fillLight, previewMesh)

    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.previewMesh = previewMesh

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

    if (this.previewMesh) {
      this.previewMesh.geometry.dispose()
      this.previewMesh.material.dispose()
      this.previewMesh = null
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
    if (!this.renderer || !this.scene || !this.camera || !this.previewMesh) return

    if (this.interactive) {
      this.previewMesh.rotation.x = this.dragState.rotationX
      this.previewMesh.rotation.y = this.dragState.rotationY
    } else {
      this.previewMesh.rotation.x = 0.42
      this.previewMesh.rotation.y += 0.01
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
}
