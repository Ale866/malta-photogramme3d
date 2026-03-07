import * as T from 'three'

type IslandModelRenderInput = {
  id: string;
  coordinates: { x: number; y: number; z: number };
}

export class IslandModelRenderer {
  private readonly scene: T.Scene
  private readonly group = new T.Group()
  private readonly boxGeometry = new T.BoxGeometry(4, 4, 4)
  private readonly material = new T.MeshStandardMaterial({ color: 0x1f7a8c })
  private readonly meshesByModelId = new Map<string, T.Mesh>()

  constructor(scene: T.Scene) {
    this.scene = scene
    this.group.name = 'island-model-placeholders'
    this.scene.add(this.group)
  }

  setModels(models: readonly IslandModelRenderInput[]) {
    this.clear()

    for (const model of models) {
      const mesh = new T.Mesh(this.boxGeometry, this.material)
      mesh.position.set(
        model.coordinates.x,
        model.coordinates.y + 2,
        model.coordinates.z,
      )
      mesh.userData.modelId = model.id
      this.group.add(mesh)
      this.meshesByModelId.set(model.id, mesh)
    }
  }

  clear() {
    this.group.clear()
    this.meshesByModelId.clear()
  }

  dispose() {
    this.clear()
    this.scene.remove(this.group)
    this.boxGeometry.dispose()
    this.material.dispose()
  }
}
