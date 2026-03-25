import * as T from 'three'

export class MarkerRenderer {
  private marker: T.Group | null = null
  private scene: T.Scene

  constructor(scene: T.Scene) {
    this.scene = scene
  }

  createMarker(position: T.Vector3) {
    this.removeMarker()

    this.marker = this.buildMarker()
    this.marker.position.set(position.x, position.y, position.z)
    this.scene.add(this.marker)
  }

  getMarkerPosition() {
    return this.marker?.position.clone() || null
  }

  removeMarker() {
    if (this.marker) {
      this.scene.remove(this.marker)
      this.disposeObject3D(this.marker)
      this.marker = null
    }
  }

  dispose() {
    this.removeMarker()
  }

  private buildMarker() {
    const marker = new T.Group()
    marker.name = 'terrain-selection-marker'

    const bodyMaterial = new T.MeshStandardMaterial({
      color: 0xe34d4d,
      emissive: 0x4e1717,
      emissiveIntensity: 0.26,
      roughness: 0.2,
      metalness: 0.1,
    })
    const ringMaterial = new T.MeshBasicMaterial({
      color: 0x78c0ff,
      transparent: true,
      opacity: 0.28,
      side: T.DoubleSide,
    })

    const profile = [
      new T.Vector2(0, 0),
      new T.Vector2(0.24, 0.22),
      new T.Vector2(0.56, 0.6),
      new T.Vector2(0.82, 1.14),
      new T.Vector2(0.96, 1.86),
      new T.Vector2(1, 2.48),
      new T.Vector2(0.92, 2.92),
      new T.Vector2(0.68, 3.24),
      new T.Vector2(0.34, 3.44),
      new T.Vector2(0, 3.54),
    ]
    const bodyGeometry = new T.LatheGeometry(profile, 72)
    const body = new T.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.02
    body.castShadow = true
    body.receiveShadow = true

    const highlightMaterial = new T.MeshBasicMaterial({
      color: 0xffc1c1,
      transparent: true,
      opacity: 0.42,
    })

    const highlight = new T.Mesh(new T.SphereGeometry(0.13, 18, 18), highlightMaterial)
    highlight.position.set(-0.14, 2.84, 0.36)

    const groundRing = new T.Mesh(new T.RingGeometry(0.44, 0.68, 40), ringMaterial)
    groundRing.position.y = 0.05
    groundRing.rotation.x = -Math.PI / 2

    marker.add(body, highlight, groundRing)
    marker.scale.set(0.84, 0.7, 0.84)
    return marker
  }

  private disposeObject3D(object: T.Object3D) {
    const disposedGeometries = new Set<T.BufferGeometry>()
    const disposedMaterials = new Set<T.Material>()

    object.traverse((child) => {
      if (!(child instanceof T.Mesh)) return

      if (!disposedGeometries.has(child.geometry)) {
        child.geometry.dispose()
        disposedGeometries.add(child.geometry)
      }

      if (Array.isArray(child.material)) {
        child.material.forEach((material) => {
          if (disposedMaterials.has(material)) return
          material.dispose()
          disposedMaterials.add(material)
        })
        return
      }

      if (disposedMaterials.has(child.material)) return
      child.material.dispose()
      disposedMaterials.add(child.material)
    })
  }
}
