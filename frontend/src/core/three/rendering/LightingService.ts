import * as T from 'three'

export class LightingService {
  private lights: T.Light[] = []

  createTerrainLighting() {
    this.lights = []

    const hemisphereLight = new T.HemisphereLight(0xffffff, 0x6b7a99, 0.95)
    this.lights.push(hemisphereLight)

    const ambientLight = new T.AmbientLight(0xffffff, 0.18)
    this.lights.push(ambientLight)

    const directionalLight = new T.DirectionalLight(0xffffff, 1.05)
    directionalLight.position.set(72000, 26000, 12000)
    directionalLight.castShadow = true
    directionalLight.shadow.bias = -0.0005
    directionalLight.shadow.normalBias = 0.2
    this.lights.push(directionalLight)

    return this.lights
  }

  getLights() {
    return this.lights
  }

  dispose() {
    this.lights.forEach(light => {
      if (light.parent) {
        light.parent.remove(light)
      }
    })
    this.lights = []
  }
}
