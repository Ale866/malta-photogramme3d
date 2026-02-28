import gsap from 'gsap'
import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class CameraController {
  private controls: OrbitControls
  private camera: T.PerspectiveCamera
  private mobileMoveInput = new T.Vector2()
  private lastUpdateTs = 0
  private forward = new T.Vector3()
  private right = new T.Vector3()
  private move = new T.Vector3()

  constructor(camera: T.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.controls = new OrbitControls(camera, domElement)
    this.controls.minDistance = 10
    this.controls.maxDistance = 200
    this.controls.enableDamping = true
    this.controls.screenSpacePanning = true
  }

  update() {
    const now = performance.now()
    const deltaSeconds =
      this.lastUpdateTs > 0
        ? Math.min((now - this.lastUpdateTs) / 1000, 0.05)
        : 1 / 60
    this.lastUpdateTs = now

    this.applyMobileMovement(deltaSeconds)
    this.controls.update()
  }

  setMobileMoveInput(input: { x: number; y: number }) {
    this.mobileMoveInput.set(input.x, input.y)
  }

  frameObject(
    object: T.Object3D,
    yRange?: { min: number; max: number }
  ) {
    const box = new T.Box3().setFromObject(object)
    const center = new T.Vector3()
    const size = new T.Vector3()

    box.getCenter(center)
    box.getSize(size)

    const maxDim = Math.max(size.x, size.z)
    const fov = this.camera.fov * (Math.PI / 180)
    const dist = maxDim / 2 / Math.tan(fov / 2)

    const lift = yRange ? (yRange.max - yRange.min) * 0.15 : 0
    this.controls.target.set(center.x, center.y + lift, center.z)

    this.camera.position.set(center.x, center.y + dist * 1.15, center.z)

    this.camera.near = Math.max(0.1, dist / 800)
    this.camera.far = dist * 6
    this.camera.updateProjectionMatrix()

    this.controls.update()
  }

  flyTo(
    target: T.Vector3,
    options?: {
      height?: number
      angleX?: number
      angleY?: number
      duration?: number
      targetYOffset?: number
    }
  ) {
    const {
      height = 50,
      angleX = -Math.PI / 7,
      angleY = -Math.PI / 6,
      duration = 2.2,
      targetYOffset = height * 0.62,
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
      y: target.y + targetYOffset,
      z: target.z,
      duration,
      ease: 'power3.inOut',
    })

    gsap.to(this.camera.position, {
      x: cameraTargetPos.x,
      y: cameraTargetPos.y,
      z: cameraTargetPos.z,
      duration,
      ease: 'power3.inOut',
      onUpdate: () => {
        this.controls.update()
      },
      onComplete: () => {
        this.controls.enabled = true
      },
    })
  }

  getControls() {
    return this.controls
  }

  onChange(handler: () => void) {
    const callback = () => handler()
    this.controls.addEventListener('change', callback)
    return () => {
      this.controls.removeEventListener('change', callback)
    }
  }

  dispose() {
    this.mobileMoveInput.set(0, 0)
    this.lastUpdateTs = 0
    this.controls.dispose()
  }

  private applyMobileMovement(deltaSeconds: number) {
    const inputMagnitude = this.mobileMoveInput.length()
    if (inputMagnitude < 0.01) return

    this.forward
      .copy(this.controls.target)
      .sub(this.camera.position)
      .setY(0)

    if (this.forward.lengthSq() < 1e-6) {
      const azimuth = this.controls.getAzimuthalAngle()
      this.forward.set(-Math.sin(azimuth), 0, -Math.cos(azimuth))
    }

    if (this.forward.lengthSq() < 1e-6) return

    this.forward.normalize()
    this.right.set(-this.forward.z, 0, this.forward.x)

    this.move
      .copy(this.forward)
      .multiplyScalar(this.mobileMoveInput.y)
      .addScaledVector(this.right, this.mobileMoveInput.x)

    if (this.move.lengthSq() < 1e-6) return

    this.move.normalize()

    const distanceToTarget = this.camera.position.distanceTo(this.controls.target)
    const movementSpeed = Math.max(4, distanceToTarget * 0.6)
    const movementDistance =
      movementSpeed * deltaSeconds * Math.min(1, inputMagnitude)

    this.move.multiplyScalar(movementDistance)
    this.camera.position.add(this.move)
    this.controls.target.add(this.move)
  }
}
