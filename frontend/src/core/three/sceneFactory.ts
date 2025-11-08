import * as T from 'three'

class SceneFactory {
  private static instance: SceneFactory
  private scene: T.Scene
  private camera: T.PerspectiveCamera
  private renderer: T.WebGLRenderer
  private cube: T.Mesh | null = null
  private container: HTMLElement | null = null

  private constructor() {
    this.scene = new T.Scene()
    this.camera = new T.PerspectiveCamera(75, 1, 0.1, 1000)
    this.renderer = new T.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
  }

  static getInstance(): SceneFactory {
    if (!SceneFactory.instance) {
      SceneFactory.instance = new SceneFactory()
    }
    return SceneFactory.instance
  }

  init(container: HTMLElement) {
    this.container = container
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    this.camera.aspect = container.clientWidth / container.clientHeight
    this.camera.updateProjectionMatrix()
    this.camera.position.z = 3

    const geometry = new T.BoxGeometry()
    const material = new T.MeshStandardMaterial({ color: 0x0077ff })
    this.cube = new T.Mesh(geometry, material)
    this.scene.add(this.cube)

    const light = new T.DirectionalLight(0xffffff, 1)
    light.position.set(5, 5, 5)
    this.scene.add(light)

    this.animate()
  }

  private animate = () => {
    requestAnimationFrame(this.animate)
    if (this.cube) {
      this.cube.rotation.x += 0.01
      this.cube.rotation.y += 0.01
    }
    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    if (!this.container) return
    const { clientWidth, clientHeight } = this.container
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(clientWidth, clientHeight)
  }
}

export const sceneFactory = SceneFactory.getInstance()
