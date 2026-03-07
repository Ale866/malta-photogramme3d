import * as T from 'three'

type IslandModelRenderInput = {
  id: string;
  coordinates: { x: number; y: number; z: number };
}

const DEFAULT_COLOR = 0x1f7a8c
const HOVER_EMISSIVE = 0x0d79ff

export class IslandModelRenderer {
  private readonly scene: T.Scene
  private readonly group = new T.Group()
  private readonly boxGeometry = new T.BoxGeometry(4, 4, 4)
  private readonly meshesByModelId = new Map<string, T.Mesh<T.BoxGeometry, T.MeshStandardMaterial>>()
  private readonly coordinatesByModelId = new Map<string, { x: number; y: number; z: number }>()
  private hoveredModelId: string | null = null

  constructor(scene: T.Scene) {
    this.scene = scene
    this.group.name = 'island-model-placeholders'
    this.scene.add(this.group)
  }

  setModels(models: readonly IslandModelRenderInput[]) {
    this.clear()

    for (const model of models) {
      const material = new T.MeshStandardMaterial({
        color: DEFAULT_COLOR,
        emissive: 0x000000,
        emissiveIntensity: 0,
      })
      const mesh = new T.Mesh(this.boxGeometry, material)
      mesh.position.set(
        model.coordinates.x,
        model.coordinates.y + 2,
        model.coordinates.z,
      )
      mesh.userData.modelId = model.id
      this.group.add(mesh)
      this.meshesByModelId.set(model.id, mesh)
      this.coordinatesByModelId.set(model.id, model.coordinates)
    }
  }

  getInteractiveObjects(): T.Object3D[] {
    return Array.from(this.meshesByModelId.values())
  }

  getModelIdFromObject(object: T.Object3D | null): string | null {
    let current: T.Object3D | null = object
    while (current) {
      const modelId = current.userData?.modelId
      if (typeof modelId === 'string') return modelId
      current = current.parent
    }
    return null
  }

  getCoordinates(modelId: string) {
    return this.coordinatesByModelId.get(modelId) ?? null
  }

  setHoveredModel(modelId: string | null) {
    if (this.hoveredModelId === modelId) return

    if (this.hoveredModelId) {
      this.setMeshHighlight(this.hoveredModelId, false)
    }

    this.hoveredModelId = modelId

    if (this.hoveredModelId) {
      this.setMeshHighlight(this.hoveredModelId, true)
    }
  }

  clear() {
    this.setHoveredModel(null)
    for (const mesh of this.meshesByModelId.values()) {
      const material = mesh.material
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose())
      } else {
        material.dispose()
      }
    }
    this.group.clear()
    this.meshesByModelId.clear()
    this.coordinatesByModelId.clear()
  }

  dispose() {
    this.clear()
    this.scene.remove(this.group)
    this.boxGeometry.dispose()
  }

  private setMeshHighlight(modelId: string, highlighted: boolean) {
    const mesh = this.meshesByModelId.get(modelId)
    if (!mesh) return

    const material = mesh.material
    material.emissive.setHex(highlighted ? HOVER_EMISSIVE : 0x000000)
    material.emissiveIntensity = highlighted ? 0.85 : 0
  }
}
