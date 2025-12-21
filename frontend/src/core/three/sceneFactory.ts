import gsap from 'gsap'
import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

class SceneFactory {
  private static instance: SceneFactory
  private scene: T.Scene
  private camera: T.PerspectiveCamera
  private renderer: T.WebGLRenderer
  private marker: T.Mesh | null = null
  private controls: OrbitControls | null = null
  private container: HTMLElement | null = null

  private origin = new T.Vector2()

  private constructor() {
    this.scene = new T.Scene()
    this.scene.background = new T.Color(0xe6f0ff)

    this.camera = new T.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 5_000_000)
    this.renderer = new T.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  static getInstance(): SceneFactory {
    if (!SceneFactory.instance) SceneFactory.instance = new SceneFactory()
    return SceneFactory.instance
  }

  async init(container: HTMLElement) {
    this.container = container
    container.appendChild(this.renderer.domElement)
    this.renderer.setSize(container.clientWidth, container.clientHeight)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.screenSpacePanning = true

    this.camera.position.set(0, 0, 6000)
    this.camera.lookAt(0, 0, 0)

    this.scene.add(new T.AmbientLight(0xffffff, 0.6))
    const axesHelper = new T.AxesHelper(5_000_000);
    axesHelper.setColors(
      new T.Color(0xff0000),
      new T.Color(0x00ff00),
      new T.Color(0x0000ff)
    );
    this.scene.add(axesHelper);

    const dir = new T.DirectionalLight(0xffffff, 0.8)
    dir.position.set(1000, 1000, 2000)
    this.scene.add(dir)

    await this.loadMaltaGeoJSON()
    this.setupClickHandler()
    this.animate()
  }

  private async loadMaltaGeoJSON() {
    const response = await fetch('/terrain/malta_terrain.geojson')
    const geojson = await response.json()

    const shapes: T.Shape[] = []
    const allPoints: T.Vector2[] = []

    for (const feature of geojson.features) {
      if (!feature.geometry) continue

      const polygons = feature.geometry.coordinates

      for (const polygon of polygons) {
        const outerRing = polygon[0]
        const shape = new T.Shape()

        outerRing.forEach(([e, n]: number[], i: number) => {
          const p = new T.Vector2(e, n)
          allPoints.push(p)
          if (!e || !n) return;
          i === 0 ? shape.moveTo(e, n) : shape.lineTo(e, n)
        })

        shapes.push(shape)
      }
    }

    const box = new T.Box2().setFromPoints(allPoints)
    const center = box.getCenter(new T.Vector2())
    this.origin.copy(center)

    const geometry = new T.ExtrudeGeometry(shapes, {
      depth: 200,
      bevelEnabled: false
    })

    geometry.translate(-this.origin.x, -this.origin.y, 0)

    const island = new T.Mesh(
      geometry,
      new T.MeshStandardMaterial({ color: 0x4caf50 })
    )

    this.scene.add(island)
  }

  utmToLocal(e: number, n: number, z = 0) {
    return new T.Vector3(
      e - this.origin.x,
      n - this.origin.y,
      z
    )
  }

  createMarker(target: T.Vector3) {
    if (this.marker) this.scene.remove(this.marker)
    this.marker = new T.Mesh(
      new T.SphereGeometry(50, 32, 32),
      new T.MeshStandardMaterial({ color: 0xff0000 })
    )
    this.marker.position.copy({ ...target, z: 300 })
    this.scene.add(this.marker)
    this.flyTo(target)
  }

  flyTo(
    target: T.Vector3,
    options?: {
      height?: number
      angleX?: number
      angleY?: number
      duration?: number
    }
  ) {
    if (!this.controls) return

    const {
      height = 2500,
      angleX = -Math.PI / 6,
      angleY = -Math.PI / 6,
      duration = 2.5
    } = options || {}

    this.controls.enabled = false

    const distance = height / Math.cos(angleX)

    const offset = new T.Vector3(
      Math.sin(angleY) * Math.sin(angleX) * distance,
      Math.cos(angleY) * Math.sin(angleX) * distance,
      Math.cos(angleX) * distance
    )

    const cameraTargetPos = target.clone().add(offset)

    gsap.to(this.controls.target, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration,
      ease: 'power3.inOut'
    })

    gsap.to(this.camera.position, {
      x: cameraTargetPos.x,
      y: cameraTargetPos.y,
      z: cameraTargetPos.z,
      duration,
      ease: 'power3.inOut',
      onUpdate: () => { this.controls!.update() },
      onComplete: () => {
        this.controls!.enabled = true
      }
    })
  }

  private setupClickHandler() {
    if (!this.renderer) return
    const canvas = this.renderer.domElement
    let isDragging = false

    canvas.addEventListener('mousedown', () => isDragging = false)
    canvas.addEventListener('mousemove', () => isDragging = true)
    canvas.addEventListener('mouseup', (event) => {
      if (!isDragging) this.handleClick(event)
    })
  }

  private handleClick(event: MouseEvent) {
    if (!this.renderer) return
    const rect = this.renderer.domElement.getBoundingClientRect()

    const mouse = new T.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new T.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)

    const intersects = raycaster.intersectObjects(this.scene.children, true)
    if (!intersects.length) return

    const worldPoint = intersects[0]!.point
    this.createMarker(worldPoint)
  }

  private animate = () => {
    requestAnimationFrame(this.animate)
    this.controls!.update()
    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    if (!this.container) return
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  setVisible(show: boolean) {
    this.renderer.domElement.style.display = show ? 'block' : 'none'
  }
}

export const sceneFactory = SceneFactory.getInstance()
