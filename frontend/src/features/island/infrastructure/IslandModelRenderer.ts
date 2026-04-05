import * as T from 'three'
import gsap from 'gsap'
import { disposeObject3D, loadTexturedPlyModel } from '@/features/model/infrastructure/texturedPlyModel'

type IslandModelRenderInput = {
  id: string
  coordinates: { x: number; y: number; z: number }
  orientation: { x: number; y: number; z: number }
  meshAssetUrl: string | null
  textureAssetUrl: string | null
}

const HOVER_EMISSIVE = 0x0d79ff
const TARGET_MODEL_HEIGHT = 4
const SELECTED_LIFT = 0.45
const SELECTED_SCALE = 1.06
const DEEMPHASIZED_SCALE = 0.97
const DEEMPHASIZED_OPACITY = 0.38

type ObjectFocusState = {
  position: T.Vector3
  scale: T.Vector3
  rotation: T.Euler
  opacity: number
}

export class IslandModelRenderer {
  private readonly scene: T.Scene
  private readonly group = new T.Group()
  private readonly objectsByModelId = new Map<string, T.Object3D>()
  private readonly coordinatesByModelId = new Map<string, { x: number; y: number; z: number }>()
  private readonly originalStatesByModelId = new Map<string, ObjectFocusState>()
  private hoveredModelId: string | null = null
  private selectedModelId: string | null = null
  private focusTimeline: gsap.core.Timeline | null = null

  constructor(scene: T.Scene) {
    this.scene = scene
    this.group.name = 'island-models'
    this.scene.add(this.group)
  }

  async setModels(models: readonly IslandModelRenderInput[]) {
    this.clear()

    for (const model of models) {
      if (!model.meshAssetUrl) continue

      try {
        const object = await loadTexturedPlyModel({
          meshUrl: model.meshAssetUrl,
          textureUrl: model.textureAssetUrl,
        })

        const box = new T.Box3().setFromObject(object)
        const size = box.getSize(new T.Vector3())
        const height = Math.max(size.y, 1e-6)
        const scale = TARGET_MODEL_HEIGHT / height
        object.scale.setScalar(scale)
        object.rotation.set(model.orientation.x, model.orientation.y, model.orientation.z)

        const scaledBox = new T.Box3().setFromObject(object)
        object.position.set(
          model.coordinates.x,
          model.coordinates.y - scaledBox.min.y,
          model.coordinates.z,
        )

        object.userData.modelId = model.id
        this.setObjectOpacity(object, 1)
        this.group.add(object)
        this.objectsByModelId.set(model.id, object)
        this.coordinatesByModelId.set(model.id, model.coordinates)
        this.originalStatesByModelId.set(model.id, {
          position: object.position.clone(),
          scale: object.scale.clone(),
          rotation: object.rotation.clone(),
          opacity: 1,
        })
      } catch (error) {
        console.error(`Failed to load island model asset for ${model.id}`, error)
      }
    }
  }

  getInteractiveObjects(): T.Object3D[] {
    return Array.from(this.objectsByModelId.values())
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

  getModelObject(modelId: string) {
    return this.objectsByModelId.get(modelId) ?? null
  }

  getSelectedModelId() {
    return this.selectedModelId
  }

  hasFocusedModel() {
    return this.selectedModelId !== null
  }

  focusModel(modelId: string) {
    if (!this.objectsByModelId.has(modelId)) return
    if (this.selectedModelId === modelId) return

    this.selectedModelId = modelId
    this.hoveredModelId = null
    this.animateFocusState()
  }

  clearFocus() {
    if (!this.selectedModelId) return

    this.selectedModelId = null
    this.animateFocusState()
  }

  rotateFocusedModel(deltaX: number, deltaY: number) {
    if (!this.selectedModelId) return

    const object = this.objectsByModelId.get(this.selectedModelId)
    const originalState = this.originalStatesByModelId.get(this.selectedModelId)
    if (!object || !originalState) return

    const yawStep = deltaX * 0.01
    const pitchStep = deltaY * 0.0055
    const minPitch = originalState.rotation.x - 0.45
    const maxPitch = originalState.rotation.x + 0.45

    object.rotation.y += yawStep
    object.rotation.x = T.MathUtils.clamp(object.rotation.x + pitchStep, minPitch, maxPitch)
  }

  setHoveredModel(modelId: string | null) {
    if (this.selectedModelId) {
      if (this.hoveredModelId) this.hoveredModelId = null
      return
    }

    if (this.hoveredModelId === modelId) return

    if (this.hoveredModelId) {
      this.setObjectHighlight(this.hoveredModelId, false)
    }

    this.hoveredModelId = modelId

    if (this.hoveredModelId) {
      this.setObjectHighlight(this.hoveredModelId, true)
    }
  }

  clear() {
    this.stopFocusAnimation()
    this.setHoveredModel(null)
    this.selectedModelId = null

    for (const object of this.objectsByModelId.values()) {
      disposeObject3D(object)
    }

    this.group.clear()
    this.objectsByModelId.clear()
    this.coordinatesByModelId.clear()
    this.originalStatesByModelId.clear()
  }

  dispose() {
    this.clear()
    this.scene.remove(this.group)
  }

  private setObjectHighlight(modelId: string, highlighted: boolean) {
    const object = this.objectsByModelId.get(modelId)
    if (!object) return

    object.traverse((child) => {
      const mesh = child as T.Mesh
      if (!mesh.isMesh) return

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        const standardMaterial = material as T.MeshStandardMaterial
        standardMaterial.emissive.setHex(highlighted ? HOVER_EMISSIVE : 0x000000)
        standardMaterial.emissiveIntensity = highlighted ? 0.6 : 0
      }
    })
  }

  private animateFocusState() {
    this.stopFocusAnimation()

    const timeline = gsap.timeline({
      defaults: {
        duration: 0.65,
        ease: 'power2.out',
      },
      onComplete: () => {
        if (this.focusTimeline === timeline) {
          this.focusTimeline = null
        }
      },
    })

    for (const [modelId, object] of this.objectsByModelId.entries()) {
      const originalState = this.originalStatesByModelId.get(modelId)
      if (!originalState) continue

      const isSelected = this.selectedModelId === modelId
      const hasFocusedModel = this.selectedModelId !== null
      const targetScale = isSelected
        ? SELECTED_SCALE
        : hasFocusedModel
          ? DEEMPHASIZED_SCALE
          : originalState.scale.x
      const targetOpacity = hasFocusedModel
        ? (isSelected ? originalState.opacity : DEEMPHASIZED_OPACITY)
        : originalState.opacity

      timeline.to(object.position, {
        x: originalState.position.x,
        y: originalState.position.y + (isSelected ? SELECTED_LIFT : 0),
        z: originalState.position.z,
      }, 0)

      timeline.to(object.scale, {
        x: targetScale,
        y: targetScale,
        z: targetScale,
      }, 0)

      timeline.to(object.rotation, {
        x: originalState.rotation.x,
        y: originalState.rotation.y,
        z: originalState.rotation.z,
      }, 0)

      const opacityState = { value: this.getObjectOpacity(object) }
      timeline.to(opacityState, {
        value: targetOpacity,
        onUpdate: () => {
          this.setObjectOpacity(object, opacityState.value)
        },
      }, 0)
    }

    this.focusTimeline = timeline
  }

  private stopFocusAnimation() {
    if (this.focusTimeline) {
      this.focusTimeline.kill()
      this.focusTimeline = null
    }

    for (const object of this.objectsByModelId.values()) {
      gsap.killTweensOf(object.position)
      gsap.killTweensOf(object.scale)
      gsap.killTweensOf(object.rotation)
    }
  }

  private getObjectOpacity(object: T.Object3D) {
    let opacity = 1

    object.traverse((child) => {
      const mesh = child as T.Mesh
      if (!mesh.isMesh) return
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      opacity = (material as T.MeshStandardMaterial).opacity
    })

    return opacity
  }

  private setObjectOpacity(object: T.Object3D, opacity: number) {
    object.traverse((child) => {
      const mesh = child as T.Mesh
      if (!mesh.isMesh) return

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        const standardMaterial = material as T.MeshStandardMaterial
        standardMaterial.transparent = true
        standardMaterial.opacity = opacity
      }
    })
  }
}
