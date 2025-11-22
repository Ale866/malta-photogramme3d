import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

class SceneFactory {
  private static instance: SceneFactory
  private scene: T.Scene
  private camera: T.PerspectiveCamera
  private renderer: T.WebGLRenderer
  private cube: T.Mesh | null = null
  private controls: OrbitControls | null = null
  private container: HTMLElement | null = null

  private constructor() {
    this.scene = new T.Scene()
    this.camera = new T.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.renderer = new T.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  static getInstance(): SceneFactory {
    if (!SceneFactory.instance) SceneFactory.instance = new SceneFactory()
    return SceneFactory.instance
  }

  init(container: HTMLElement) {
    this.container = container
    container.appendChild(this.renderer.domElement)

    this.renderer.setSize(container.clientWidth, container.clientHeight)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true

    this.camera.aspect = container.clientWidth / container.clientHeight
    this.camera.position.set(0, 0, 3)
    this.camera.updateProjectionMatrix()

    const geometry = new T.BoxGeometry()
    const material = new T.MeshStandardMaterial({ color: 0x0077ff })
    this.cube = new T.Mesh(geometry, material)
    this.scene.add(this.cube)

    const light = new T.DirectionalLight(0xffffff, 1)
    light.position.set(3, 3, 5)
    this.scene.add(light)

    this.animate()
  }

  private animate = () => {
    requestAnimationFrame(this.animate)
    this.controls?.update()
    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    if (!this.container) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.renderer.render(this.scene, this.camera) // ensure it re-renders immediately
  }

  setVisible(show: boolean) {
    if (!this.renderer?.domElement) return
    this.renderer.domElement.style.display = show ? 'block' : 'none'
  }
}

export const sceneFactory = SceneFactory.getInstance()
