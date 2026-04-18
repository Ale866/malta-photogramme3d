import gsap from 'gsap'
import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type CameraFocusRestoreState = {
  position: T.Vector3
  target: T.Vector3
  near: number
  far: number
  minDistance: number
  maxDistance: number
  minPolarAngle: number
  maxPolarAngle: number
  enablePan: boolean
  screenSpacePanning: boolean
}

export class CameraController {
  private controls: OrbitControls
  private camera: T.PerspectiveCamera
  private mobileMoveInput = new T.Vector2()
  private lastUpdateTs = 0
  private readonly defaultMaxPolarAngle = Math.PI / 2.35
  private readonly closeRangeMaxPolarAngle = Math.PI / 3.15
  private readonly defaultMinZoomDistance = 24
  private maxZoomDistance = 260
  private minZoomDistance = this.defaultMinZoomDistance
  private movementBounds: {
    minX: number
    minZ: number
    maxX: number
    maxZ: number
  } | null = null
  private forward = new T.Vector3()
  private right = new T.Vector3()
  private move = new T.Vector3()
  private focusRestoreState: CameraFocusRestoreState | null = null
  private cameraInterpolation: gsap.core.Timeline | null = null
  private focusBox = new T.Box3()
  private focusCenter = new T.Vector3()
  private focusSize = new T.Vector3()
  private focusForward = new T.Vector3()
  private focusQuaternion = new T.Quaternion()
  private focusSphere = new T.Sphere()
  private focusChildBox = new T.Box3()
  private isFocusModeActive = false

  constructor(camera: T.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.controls = new OrbitControls(camera, domElement)
    this.controls.minDistance = this.minZoomDistance
    this.controls.maxDistance = this.maxZoomDistance
    this.controls.maxPolarAngle = this.defaultMaxPolarAngle
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
    this.applyMainViewConstraints()
    this.controls.update()
    this.restrictMovements()
  }

  setMobileMoveInput(input: { x: number; y: number }) {
    this.mobileMoveInput.set(input.x, input.y)
  }

  setBounds(
    bounds: {
      minX: number
      minZ: number
      maxX: number
      maxZ: number
    },
    padding = 0
  ) {
    this.movementBounds = {
      minX: Math.min(bounds.minX, bounds.maxX) - padding,
      minZ: Math.min(bounds.minZ, bounds.maxZ) - padding,
      maxX: Math.max(bounds.minX, bounds.maxX) + padding,
      maxZ: Math.max(bounds.minZ, bounds.maxZ) + padding,
    }

    const spanX = this.movementBounds.maxX - this.movementBounds.minX
    const spanZ = this.movementBounds.maxZ - this.movementBounds.minZ
    const halfDiagonal = Math.sqrt(spanX * spanX + spanZ * spanZ) * 0.5
    this.maxZoomDistance = Math.min(320, Math.max(180, halfDiagonal * 0.42))
    this.controls.maxDistance = this.maxZoomDistance

    this.restrictMovements()
  }

  clearMovementBounds() {
    this.movementBounds = null
    this.maxZoomDistance = 260
    this.controls.maxDistance = this.maxZoomDistance
    this.applyMainViewConstraints()
  }

  frameObject(object: T.Object3D, yRange?: { min: number; max: number }) {
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
    this.controls.maxDistance = this.maxZoomDistance
    this.camera.updateProjectionMatrix()

    this.controls.update()
  }

  focusObject(
    object: T.Object3D,
    options?: {
      duration?: number
    },
  ) {
    object.updateWorldMatrix(true, true)

    const box = this.measureFocusableBounds(object)
    if (box.isEmpty()) return

    const isEnteringFocusMode = !this.focusRestoreState
    if (isEnteringFocusMode) {
      this.focusRestoreState = this.captureCameraState()
    }

    this.isFocusModeActive = true

    box.getCenter(this.focusCenter)
    box.getSize(this.focusSize)
    box.getBoundingSphere(this.focusSphere)

    const duration = options?.duration ?? 0.95
    const radius = Math.max(this.focusSphere.radius, 2)
    const verticalFov = T.MathUtils.degToRad(this.camera.fov)
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect)
    const distanceForHeight = radius / Math.sin(verticalFov / 2)
    const distanceForWidth = radius / Math.sin(horizontalFov / 2)
    const distance = Math.max(distanceForHeight, distanceForWidth) * 1.02
    const lift = Math.max(this.focusSize.y * 0.12, radius * 0.18)

    object.getWorldQuaternion(this.focusQuaternion)
    this.focusForward.set(0, 0, 1).applyQuaternion(this.focusQuaternion).setY(0)

    if (this.focusForward.lengthSq() < 1e-6) {
      this.focusForward
        .copy(this.focusCenter)
        .sub(this.camera.position)
        .setY(0)
        .multiplyScalar(-1)
    }

    if (this.focusForward.lengthSq() < 1e-6) {
      this.focusForward.set(0, 0, 1)
    }

    this.focusForward.normalize()

    const focusTarget = this.focusCenter.clone()
    focusTarget.y += this.focusSize.y * 0.08

    const cameraTargetPos = focusTarget
      .clone()
      .addScaledVector(this.focusForward, distance)
    cameraTargetPos.y += lift

    const near = Math.max(0.1, distance / 120)
    const far = Math.max(distance * 18, radius * 36)
    const focusMinDistance = Math.max(radius * 0.9, 5)
    const focusMaxDistance = Math.max(distance * 1.55, focusMinDistance + 4)
    const currentDistance = this.camera.position.distanceTo(this.controls.target)

    this.controls.enablePan = false
    this.controls.screenSpacePanning = false
    this.controls.minDistance = Math.min(this.controls.minDistance, focusMinDistance)
    this.controls.maxDistance = Math.max(this.controls.maxDistance, focusMaxDistance, currentDistance)
    this.controls.minPolarAngle = Math.PI / 7
    this.controls.maxPolarAngle = Math.PI / 1.85

    if (!isEnteringFocusMode) {
      this.camera.near = near
      this.camera.far = far
      this.camera.updateProjectionMatrix()
    }

    this.animateCamera(cameraTargetPos, focusTarget, {
      duration,
      onComplete: () => {
        this.camera.near = near
        this.camera.far = far
        this.camera.updateProjectionMatrix()
        this.controls.minDistance = focusMinDistance
        this.controls.maxDistance = focusMaxDistance
        this.controls.update()
      },
    })
  }

  restoreFocusView(options?: { duration?: number }) {
    const restoreState = this.focusRestoreState
    if (!restoreState) return

    this.focusRestoreState = null
    this.isFocusModeActive = false

    this.controls.enablePan = restoreState.enablePan
    this.controls.screenSpacePanning = restoreState.screenSpacePanning
    this.controls.minDistance = restoreState.minDistance
    this.controls.maxDistance = restoreState.maxDistance
    this.controls.minPolarAngle = restoreState.minPolarAngle
    this.controls.maxPolarAngle = restoreState.maxPolarAngle
    this.camera.near = restoreState.near
    this.camera.far = restoreState.far
    this.camera.updateProjectionMatrix()

    this.animateCamera(restoreState.position, restoreState.target, {
      duration: options?.duration ?? 0.9,
    })
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

    const distance = height / Math.cos(angleX)
    const offset = new T.Vector3(
      Math.sin(angleY) * Math.sin(-angleX) * distance,
      Math.cos(-angleX) * distance,
      Math.cos(angleY) * Math.sin(-angleX) * distance
    )

    const cameraTargetPos = target.clone().add(offset)
    const focusTarget = new T.Vector3(target.x, target.y + targetYOffset, target.z)

    this.animateCamera(cameraTargetPos, focusTarget, { duration })
  }

  getControls() {
    return this.controls
  }

  hasFocusView() {
    return this.focusRestoreState !== null
  }

  onChange(handler: () => void) {
    const callback = () => handler()
    this.controls.addEventListener('change', callback)
    return () => {
      this.controls.removeEventListener('change', callback)
    }
  }

  dispose() {
    this.stopCameraInterpolation()
    this.mobileMoveInput.set(0, 0)
    this.lastUpdateTs = 0
    this.movementBounds = null
    this.focusRestoreState = null
    this.isFocusModeActive = false
    this.controls.dispose()
  }

  private applyMobileMovement(deltaSeconds: number) {
    if (this.isFocusModeActive) return

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

  private applyMainViewConstraints() {
    if (this.isFocusModeActive) return

    this.controls.minDistance = this.minZoomDistance
    this.controls.maxDistance = this.maxZoomDistance

    const distanceToTarget = this.camera.position.distanceTo(this.controls.target)
    const distanceRange = Math.max(this.maxZoomDistance - this.minZoomDistance, 1)
    const distanceProgress = T.MathUtils.clamp(
      (distanceToTarget - this.minZoomDistance) / distanceRange,
      0,
      1,
    )

    this.controls.maxPolarAngle = T.MathUtils.lerp(
      this.closeRangeMaxPolarAngle,
      this.defaultMaxPolarAngle,
      distanceProgress,
    )
  }

  private restrictMovements() {
    const bounds = this.movementBounds
    if (!bounds) return

    const target = this.controls.target
    const position = this.camera.position

    const clampedTargetX = Math.min(bounds.maxX, Math.max(bounds.minX, target.x))
    const clampedTargetZ = Math.min(bounds.maxZ, Math.max(bounds.minZ, target.z))
    const deltaX = clampedTargetX - target.x
    const deltaZ = clampedTargetZ - target.z

    if (deltaX === 0 && deltaZ === 0) return

    target.x = clampedTargetX
    target.z = clampedTargetZ
    position.x += deltaX
    position.z += deltaZ
    this.controls.update()
  }

  private captureCameraState(): CameraFocusRestoreState {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      near: this.camera.near,
      far: this.camera.far,
      minDistance: this.controls.minDistance,
      maxDistance: this.controls.maxDistance,
      minPolarAngle: this.controls.minPolarAngle,
      maxPolarAngle: this.controls.maxPolarAngle,
      enablePan: this.controls.enablePan,
      screenSpacePanning: this.controls.screenSpacePanning,
    }
  }

  private animateCamera(
    cameraTargetPos: T.Vector3,
    focusTarget: T.Vector3,
    options: {
      duration: number
      onComplete?: () => void
    },
  ) {
    this.stopCameraInterpolation()
    this.controls.enabled = false

    const timeline = gsap.timeline({
      defaults: {
        duration: options.duration,
        ease: 'power3.inOut',
      },
      onComplete: () => {
        if (this.cameraInterpolation === timeline) {
          this.cameraInterpolation = null
        }
        this.controls.enabled = true
        options.onComplete?.()
      },
    })

    timeline.to(this.controls.target, {
      x: focusTarget.x,
      y: focusTarget.y,
      z: focusTarget.z,
    }, 0)

    timeline.to(this.camera.position, {
      x: cameraTargetPos.x,
      y: cameraTargetPos.y,
      z: cameraTargetPos.z,
      onUpdate: () => {
        this.controls.update()
      },
    }, 0)

    this.cameraInterpolation = timeline
  }

  private stopCameraInterpolation() {
    if (!this.cameraInterpolation) return

    this.cameraInterpolation.kill()
    this.cameraInterpolation = null
    this.controls.enabled = true
  }

  private measureFocusableBounds(object: T.Object3D) {
    this.focusBox.makeEmpty()

    object.traverse((child) => {
      if (child.userData?.excludeFromFocusBounds) return

      const isMeshLike = (child as T.Mesh).isMesh || (child as T.Sprite).isSprite
      if (!isMeshLike) return

      this.focusChildBox.setFromObject(child)
      if (!this.focusChildBox.isEmpty()) {
        this.focusBox.union(this.focusChildBox)
      }
    })

    return this.focusBox
  }

}
