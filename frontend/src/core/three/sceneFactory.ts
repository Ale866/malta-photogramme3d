import gsap from 'gsap'
import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { loadTerrainModelGLB } from '@/utils/terrainModel'
import { latLonToUTM } from '@/utils/coordinates'

class SceneFactory {
  private static instance: SceneFactory
  private scene: T.Scene
  private camera: T.PerspectiveCamera
  private renderer: T.WebGLRenderer
  private marker: T.Mesh | null = null
  private controls: OrbitControls | null = null
  private container: HTMLElement | null = null
  private terrain: T.Object3D | null = null

  private origin = new T.Vector2()
  private utmBbox: { minE: number; minN: number; maxE: number; maxN: number } | null = null
  private modelBboxXZ: { minX: number; minZ: number; maxX: number; maxZ: number } | null = null

  private constructor() {
    this.scene = new T.Scene()
    this.scene.background = new T.Color(0xe6f0ff)
    this.scene.fog = new T.Fog(0xe6f0ff, 300, 1_000)

    this.camera = new T.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5_000_000)

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

  public setUtmBbox(b: { minE: number; minN: number; maxE: number; maxN: number }) {
    this.utmBbox = b
  }

  public utmToLocal(e: number, n: number, y = 0) {
    if (!this.utmBbox || !this.modelBboxXZ) return new T.Vector3(0, y, 0)

    const { minE, minN, maxE, maxN } = this.utmBbox
    const { minX, minZ, maxX, maxZ } = this.modelBboxXZ

    const u = (e - minE) / (maxE - minE)
    const v = (n - minN) / (maxN - minN)

    const x = minX + u * (maxX - minX)
    const z = minZ + v * (maxZ - minZ)

    return new T.Vector3(x, y, z)
  }

  async init(container: HTMLElement) {
    this.container = container
    container.appendChild(this.renderer.domElement)
    this.renderer.setSize(container.clientWidth, container.clientHeight)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.screenSpacePanning = true

    this.scene.add(new T.HemisphereLight(0xffffff, 0x6b7a99, 0.95))
    this.scene.add(new T.AmbientLight(0xffffff, 0.18))

    const dir = new T.DirectionalLight(0xffffff, 1.05)
    dir.position.set(22000, 26000, 12000)
    dir.castShadow = true
    dir.shadow.bias = -0.0005
    dir.shadow.normalBias = 0.2
    this.scene.add(dir)

    const { root, bboxLocalXZ, yRange } = await loadTerrainModelGLB({
      url: '/terrain/malta.glb',
      origin: this.origin,
      scale: 1,
      verticalExaggeration: 1.0,
      altitudeColors: true,
      rotateY: 0,
    })

    this.modelBboxXZ = bboxLocalXZ

    this.terrain = root
    this.scene.add(root)

    const oceanMat = new T.MeshStandardMaterial({
      color: 0x2a6fb0,
      roughness: 0.35,
      metalness: 0.05,
      side: T.DoubleSide,
    })

    const ocean = new T.Mesh(
      new T.PlaneGeometry(
        (bboxLocalXZ.maxX - bboxLocalXZ.minX) * 1.6,
        (bboxLocalXZ.maxZ - bboxLocalXZ.minZ) * 1.6
      ),
      oceanMat
    )

    ocean.rotation.x = -Math.PI / 2
    ocean.position.set(0, -2, 0)
    ocean.receiveShadow = false
    this.scene.add(ocean)

    this.frameObject(root, yRange)

    this.setupClickHandler()
    this.animate()
  }

  public goToLatLon(lat: number, lon: number) {
    const { easting, northing } = latLonToUTM(lat, lon)
    this.goToUTM(easting, northing)
  }

  public goToUTM(easting: number, northing: number) {
    const local = this.utmToLocal(easting, northing, 0)
    local.y = this.sampleTerrainHeightLocal(local.x, local.z)
    this.createMarker(local)
  }

  private sampleTerrainHeightLocal(x: number, z: number) {
    if (!this.terrain) return 0

    const raycaster = new T.Raycaster()
    const from = new T.Vector3(x, 2_000_000, z)
    const dir = new T.Vector3(0, -1, 0)
    raycaster.set(from, dir)

    const hits = raycaster.intersectObject(this.terrain, true)
    if (!hits.length) return 0
    return hits[0]!.point.y
  }

  private frameObject(obj: T.Object3D, yRange?: { min: number; max: number }) {
    if (!this.controls) return

    const box = new T.Box3().setFromObject(obj)
    const center = new T.Vector3()
    const size = new T.Vector3()
    box.getCenter(center)
    box.getSize(size)

    const maxDim = Math.max(size.x, size.z)
    const fov = this.camera.fov * (Math.PI / 180)
    const dist = (maxDim / 2) / Math.tan(fov / 2)

    const lift = yRange ? (yRange.max - yRange.min) * 0.15 : 0
    this.controls.target.set(center.x, center.y + lift, center.z)

    this.camera.position.set(center.x, center.y + dist * 1.15, center.z)

    this.camera.near = Math.max(0.1, dist / 800)
    this.camera.far = dist * 6
    this.camera.updateProjectionMatrix()
    this.controls.update()
  }

  createMarker(target: T.Vector3) {
    if (this.marker) this.scene.remove(this.marker)

    this.marker = new T.Mesh(
      new T.SphereGeometry(1, 24, 24),
      new T.MeshStandardMaterial({ color: 0xff2d2d })
    )

    this.marker.position.set(target.x, target.y + 1, target.z)
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
      height = 50,
      angleX = -Math.PI / 7,
      angleY = -Math.PI / 6,
      duration = 2.2
    } = options || {}

    this.controls.enabled = false

    const distance = height / Math.cos(angleX)
    const offset = new T.Vector3(
      Math.sin(angleY) * Math.sin(-angleX) * distance,
      Math.cos(-angleX) * distance,
      Math.cos(angleY) * Math.sin(-angleX) * distance
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

  resize = () => {
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