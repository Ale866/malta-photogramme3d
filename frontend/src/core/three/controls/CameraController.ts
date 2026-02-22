import gsap from 'gsap'
import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class CameraController {
  private controls: OrbitControls
  private camera: T.PerspectiveCamera

  constructor(camera: T.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.controls = new OrbitControls(camera, domElement)
    this.controls.enableDamping = true
    this.controls.screenSpacePanning = true
  }

  update() {
    this.controls.update()
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
    this.controls.dispose()
  }
}
