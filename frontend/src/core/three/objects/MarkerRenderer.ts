import * as T from 'three'

export class MarkerRenderer {
  private marker: T.Mesh | null = null
  private scene: T.Scene

  constructor(scene: T.Scene) {
    this.scene = scene
  }

  createMarker(position: T.Vector3) {
    if (this.marker) {
      this.scene.remove(this.marker)
      this.marker.geometry.dispose()
      if (Array.isArray(this.marker.material)) {
        this.marker.material.forEach(m => m.dispose())
      } else {
        this.marker.material.dispose()
      }
    }

    this.marker = new T.Mesh(
      new T.SphereGeometry(1, 24, 24),
      new T.MeshStandardMaterial({ color: 0xff2d2d })
    )

    this.marker.position.set(position.x, position.y + 1, position.z)
    this.scene.add(this.marker)
  }

  getMarkerPosition() {
    return this.marker?.position.clone() || null
  }

  removeMarker() {
    if (this.marker) {
      this.scene.remove(this.marker)
      this.marker.geometry.dispose()
      if (Array.isArray(this.marker.material)) {
        this.marker.material.forEach(m => m.dispose())
      } else {
        this.marker.material.dispose()
      }
      this.marker = null
    }
  }

  dispose() {
    this.removeMarker()
  }
}
