import gsap from 'gsap'
import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { makeTerrainFromGeoTIFF, makeAlphaMaskFromGeoJSON } from '@/utils/demTerrain'
import { latLonToUTM } from '@/utils/coordinates'

class SceneFactory {
  private static instance: SceneFactory
  private scene: T.Scene
  private camera: T.PerspectiveCamera
  private renderer: T.WebGLRenderer
  private marker: T.Mesh | null = null
  private controls: OrbitControls | null = null
  private container: HTMLElement | null = null
  private terrain: T.Mesh | null = null
  private origin = new T.Vector2()

  private constructor() {
    this.scene = new T.Scene()
    this.scene.background = new T.Color(0xe6f0ff)
    this.scene.fog = new T.Fog(0xe6f0ff, 5000, 120000)

    this.camera = new T.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 5_000_000)

    this.renderer = new T.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = T.PCFSoftShadowMap
    this.renderer.outputColorSpace = T.SRGBColorSpace
    this.renderer.toneMapping = T.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
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

    this.scene.add(new T.HemisphereLight(0xffffff, 0x6b7a99, 0.55))

    const dir = new T.DirectionalLight(0xffffff, 1.05)
    dir.position.set(15000, -12000, 22000)
    dir.castShadow = true
    dir.shadow.mapSize.width = 2048
    dir.shadow.mapSize.height = 2048
    dir.shadow.camera.near = 1
    dir.shadow.camera.far = 120_000
    dir.shadow.camera.left = -60_000
    dir.shadow.camera.right = 60_000
    dir.shadow.camera.top = 60_000
    dir.shadow.camera.bottom = -60_000
    this.scene.add(dir)

    const { mesh, bbox, zRange } = await makeTerrainFromGeoTIFF({
      url: '/terrain/dtm_1m_2018_32.tiff',
      origin: this.origin,
      segments: 256,
      zScale: 2.2,
      seaLevel: 0,
    })

    const alphaMask = await makeAlphaMaskFromGeoJSON({
      url: '/terrain/malta_terrain.geojson',
      bbox,
      size: 2048,
    })

    const mat = mesh.material as T.MeshStandardMaterial
    mat.transparent = true
    mat.alphaMap = alphaMask
    mat.alphaTest = 0.55
    mat.needsUpdate = true

    this.terrain = mesh
    this.scene.add(mesh)

    const ocean = new T.Mesh(
      new T.PlaneGeometry((bbox.maxX - bbox.minX) * 1.4, (bbox.maxY - bbox.minY) * 1.4),
      new T.MeshStandardMaterial({
        color: 0x2a6fb0,
        roughness: 0.35,
        metalness: 0.05,
        transparent: true,
        opacity: 0.9,
        side: T.DoubleSide,
      })
    )
    ocean.position.set(0, 0, -25)
    ocean.receiveShadow = true
    this.scene.add(ocean)

    this.frameObject(mesh, zRange)

    this.setupClickHandler()
    this.animate()
  }

  public goToLatLon(lat: number, lon: number) {
    const { easting, northing } = latLonToUTM(lat, lon)
    this.goToUTM(easting, northing)
  }

  public goToUTM(easting: number, northing: number) {
    const local = this.utmToLocal(easting, northing, 0)
    local.z = this.sampleTerrainHeightLocal(local.x, local.y)
    this.createMarker(local)
  }

  public utmToLocal(e: number, n: number, z = 0) {
    return new T.Vector3(e - this.origin.x, n - this.origin.y, z)
  }

  private sampleTerrainHeightLocal(x: number, y: number) {
    if (!this.terrain) return 0

    const raycaster = new T.Raycaster()
    const from = new T.Vector3(x, y, 2_000_000)
    const dir = new T.Vector3(0, 0, -1)
    raycaster.set(from, dir)

    const hits = raycaster.intersectObject(this.terrain, true)
    if (!hits.length) return 0
    return hits[0]!.point.z
  }

  private frameObject(obj: T.Object3D, zRange?: { min: number; max: number }) {
    if (!this.controls) return

    const box = new T.Box3().setFromObject(obj)
    const center = new T.Vector3()
    const size = new T.Vector3()
    box.getCenter(center)
    box.getSize(size)

    const maxDim = Math.max(size.x, size.y)
    const fov = this.camera.fov * (Math.PI / 180)
    const dist = (maxDim / 2) / Math.tan(fov / 2)

    const lift = zRange ? (zRange.max - zRange.min) * 0.25 : 0
    this.controls.target.set(center.x, center.y, center.z + lift)

    this.camera.position.set(center.x + dist * 0.55, center.y - dist * 0.65, center.z + dist * 0.95)
    this.camera.near = Math.max(1, dist / 200)
    this.camera.far = dist * 250
    this.camera.updateProjectionMatrix()
    this.controls.update()
  }

  createMarker(target: T.Vector3) {
    if (this.marker) this.scene.remove(this.marker)

    this.marker = new T.Mesh(
      new T.SphereGeometry(50, 32, 32),
      new T.MeshStandardMaterial({ color: 0xff2d2d })
    )

    this.marker.position.set(target.x, target.y, target.z + 300)
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
      height = 3500,
      angleX = -Math.PI / 7,
      angleY = -Math.PI / 6,
      duration = 2.2
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
      onComplete: () => { this.controls!.enabled = true }
    })
  }

  private setupClickHandler() {
    const canvas = this.renderer.domElement
    let isDragging = false

    canvas.addEventListener('mousedown', () => isDragging = false)
    canvas.addEventListener('mousemove', () => isDragging = true)
    canvas.addEventListener('mouseup', (event) => {
      if (!isDragging) this.handleClick(event)
    })
  }

  private handleClick(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const mouse = new T.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new T.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)

    const targets = this.terrain ? [this.terrain] : this.scene.children
    const intersects = raycaster.intersectObjects(targets, true)
    if (!intersects.length) return

    const worldPoint = intersects[0]!.point
    this.createMarker(worldPoint)
  }

  private animate = () => {
    requestAnimationFrame(this.animate)
    this.controls?.update()
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