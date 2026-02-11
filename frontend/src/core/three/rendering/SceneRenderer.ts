import * as T from 'three'

export class SceneRenderer {
  private scene: T.Scene
  private camera: T.PerspectiveCamera
  private renderer: T.WebGLRenderer
  private container: HTMLElement | null = null
  private animationFrameId: number | null = null

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
    if (!this.container) return

    const w = this.container.clientWidth
    const h = this.container.clientHeight

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

  dispose() {
    this.stopRenderLoop()
    this.renderer.dispose()
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
