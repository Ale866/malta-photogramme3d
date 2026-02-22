import * as T from 'three'

export class SceneRenderer {
  private scene: T.Scene
  private camera: T.PerspectiveCamera
  private renderer: T.WebGLRenderer
  private container: HTMLElement | null = null
  private animationFrameId: number | null = null
  private reusableProjected = new T.Vector3()

  constructor() {
    this.scene = new T.Scene()
    this.scene.background = new T.Color(0xe6f0ff)
    this.scene.fog = new T.Fog(0xe6f0ff, 300, 1_000)

    this.camera = new T.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      5_000_000
    )

    this.renderer = new T.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = T.PCFSoftShadowMap
    this.renderer.outputColorSpace = T.SRGBColorSpace
    this.renderer.toneMapping = T.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
  }

  initialize(container: HTMLElement) {
    this.container = container
    container.appendChild(this.renderer.domElement)
    this.resize()
    requestAnimationFrame(() => requestAnimationFrame(() => this.resize()))
    window.addEventListener('load', this.resizeOnLoad, { once: true })
  }

  add(object: T.Object3D) {
    this.scene.add(object)
  }

  remove(object: T.Object3D) {
    this.scene.remove(object)
  }

  startRenderLoop(beforeRender?: () => void) {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate)
      beforeRender?.()
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  stopRenderLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    if (w <= 0 || h <= 0) return

    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  updateCamera(params: { near?: number; far?: number }) {
    if (params.near !== undefined) this.camera.near = params.near
    if (params.far !== undefined) this.camera.far = params.far
    this.camera.updateProjectionMatrix()
  }

  setVisible(visible: boolean) {
    this.renderer.domElement.style.display = visible ? 'block' : 'none'
  }

  getScene() {
    return this.scene
  }

  getCamera() {
    return this.camera
  }

  getRenderer() {
    return this.renderer
  }

  getCanvas() {
    return this.renderer.domElement
  }

  projectWorldToScreen(
    point: { x: number; y: number; z: number },
    out: { x: number; y: number; visible: boolean } = { x: 0, y: 0, visible: false }
  ) {
    const projected = this.reusableProjected.set(point.x, point.y, point.z).project(this.camera)
    const rect = this.renderer.domElement.getBoundingClientRect()

    out.x = ((projected.x + 1) / 2) * rect.width + rect.left
    out.y = ((-projected.y + 1) / 2) * rect.height + rect.top
    out.visible =
      projected.z > -1 &&
      projected.z < 1 &&
      projected.x >= -1 &&
      projected.x <= 1 &&
      projected.y >= -1 &&
      projected.y <= 1

    return out
  }

  dispose() {
    this.stopRenderLoop()
    window.removeEventListener('load', this.resizeOnLoad)
    this.renderer.dispose()
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }

  private resizeOnLoad = () => {
    this.resize()
  }
}
