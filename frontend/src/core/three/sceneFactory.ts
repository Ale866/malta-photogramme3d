import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

class SceneFactory {
  private static instance: SceneFactory
  private scene: T.Scene
  private camera: T.PerspectiveCamera
  private renderer: T.WebGLRenderer
  private controls: OrbitControls | null = null
  private container: HTMLElement | null = null
  private mapOffset = new T.Vector2()

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
    const dir = new T.DirectionalLight(0xffffff, 0.8)
    dir.position.set(1000, 1000, 2000)
    this.scene.add(dir)

    await this.loadMaltaGeoJSON()
    this.setupClickHandler()

    this.animate()
  }

  private async loadMaltaGeoJSON() {
    const response = await fetch('/malta_terrain.geojson')
    const geojson = await response.json()

    const shapes: T.Shape[] = []
    const allPoints: T.Vector2[] = []

    for (const feature of geojson.features) {
      if (!feature.geometry) continue

      const geom = feature.geometry
      const polygons =
        geom.type === 'Polygon'
          ? [geom.coordinates]
          : geom.type === 'MultiPolygon'
            ? geom.coordinates
            : []

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
    this.mapOffset.copy(center)

    const geometry = new T.ExtrudeGeometry(shapes, {
      depth: 20,
      bevelEnabled: false
    })

    geometry.translate(-center.x, -center.y, 0)

    const island = new T.Mesh(
      geometry,
      new T.MeshStandardMaterial({ color: 0x4caf50 })
    )

    this.scene.add(island)

    this.addVallettaMarker()
    this.addPietaMarker()
  }

  private addVallettaMarker() {
    const vallettaE = 455945.591
    const vallettaN = 3972662.670

    const x = vallettaE - this.mapOffset.x
    const y = vallettaN - this.mapOffset.y

    const marker = new T.Mesh(
      new T.SphereGeometry(40, 32, 32),
      new T.MeshStandardMaterial({ color: 0xff0000 })
    )

    marker.position.set(x, y, 30)
    this.scene.add(marker)
  }

  private addPietaMarker() {
    const east = 454094.313
    const north = 3972068.613

    const x = east - this.mapOffset.x
    const y = north - this.mapOffset.y

    const marker = new T.Mesh(
      new T.SphereGeometry(40, 32, 32),
      new T.MeshStandardMaterial({ color: 0xff0000 })
    )

    marker.position.set(x, y, 30)
    this.scene.add(marker)
  }

  private setupClickHandler() {
    if (!this.renderer) return

    let isDragging = false
    const canvas = this.renderer.domElement

    canvas.addEventListener('mousedown', () => { isDragging = false })
    canvas.addEventListener('mousemove', () => { isDragging = true })
    canvas.addEventListener('mouseup', (event) => {
      if (!isDragging) this.handleClick(event)
    })
  }

  handleClick(event: MouseEvent) {
    if (!this.renderer) return

    const rect = this.renderer.domElement.getBoundingClientRect()
    const mouse = new T.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new T.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)
    const intersects = raycaster.intersectObjects(this.scene.children)

    if (intersects && intersects.length > 0) {
      const intersect = intersects[0]!
      const point = intersect.point.clone()

      point.project(this.camera)

      const canvas = this.renderer.domElement
      const clientX = ((point.x + 1) / 2) * canvas.clientWidth
      const clientY = ((-point.y + 1) / 2) * canvas.clientHeight

      console.log('Clicked point on object in screen coords:', clientX, clientY)

    }
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
