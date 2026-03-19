import * as T from 'three'
import gsap from 'gsap'

type IslandModelRenderInput = {
  id: string;
  coordinates: { x: number; y: number; z: number };
}

const DEFAULT_COLOR = 0x1f7a8c
const HOVER_EMISSIVE = 0x0d79ff
const SELECTED_LIFT = 1.2
const SELECTED_SCALE = 1.06
const DEEMPHASIZED_SCALE = 0.97
const DEEMPHASIZED_OPACITY = 0.38

type MeshFocusState = {
  position: T.Vector3
  scale: T.Vector3
  rotation: T.Euler
  opacity: number
}

export class IslandModelRenderer {
  private readonly scene: T.Scene
  private readonly group = new T.Group()
  private readonly boxGeometry = new T.BoxGeometry(4, 4, 4)
  private readonly meshesByModelId = new Map<string, T.Mesh<T.BoxGeometry, T.MeshStandardMaterial>>()
  private readonly coordinatesByModelId = new Map<string, { x: number; y: number; z: number }>()
  private readonly originalStatesByModelId = new Map<string, MeshFocusState>()
  private hoveredModelId: string | null = null
  private selectedModelId: string | null = null
  private focusTimeline: gsap.core.Timeline | null = null

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
        transparent: true,
        opacity: 1,
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
      this.originalStatesByModelId.set(model.id, {
        position: mesh.position.clone(),
        scale: mesh.scale.clone(),
        rotation: mesh.rotation.clone(),
        opacity: material.opacity,
      })
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

  getModelObject(modelId: string) {
    return this.meshesByModelId.get(modelId) ?? null
  }

  getSelectedModelId() {
    return this.selectedModelId
  }

  hasFocusedModel() {
    return this.selectedModelId !== null
  }

  focusModel(modelId: string) {
    if (!this.meshesByModelId.has(modelId)) return

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

    const mesh = this.meshesByModelId.get(this.selectedModelId)
    const originalState = this.originalStatesByModelId.get(this.selectedModelId)
    if (!mesh || !originalState) return

    const yawStep = deltaX * 0.01
    const pitchStep = deltaY * 0.0055
    const minPitch = originalState.rotation.x - 0.45
    const maxPitch = originalState.rotation.x + 0.45

    mesh.rotation.y += yawStep
    mesh.rotation.x = T.MathUtils.clamp(mesh.rotation.x + pitchStep, minPitch, maxPitch)
  }

  setHoveredModel(modelId: string | null) {
    if (this.selectedModelId) {
      if (this.hoveredModelId) {
        this.hoveredModelId = null
      }
      return
    }

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
    this.stopFocusAnimation()
    this.setHoveredModel(null)
    this.selectedModelId = null
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
    this.originalStatesByModelId.clear()
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

    for (const [modelId, mesh] of this.meshesByModelId.entries()) {
      const originalState = this.originalStatesByModelId.get(modelId)
      if (!originalState) continue

      const material = mesh.material
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
      const targetEmissive = new T.Color(0x000000)
      const targetEmissiveIntensity = 0

      timeline.to(mesh.position, {
        x: originalState.position.x,
        y: originalState.position.y + (isSelected ? SELECTED_LIFT : 0),
        z: originalState.position.z,
      }, 0)

      timeline.to(mesh.scale, {
        x: targetScale,
        y: targetScale,
        z: targetScale,
      }, 0)

      timeline.to(mesh.rotation, {
        x: originalState.rotation.x,
        y: originalState.rotation.y,
        z: originalState.rotation.z,
      }, 0)

      timeline.to(material, {
        opacity: targetOpacity,
        emissiveIntensity: targetEmissiveIntensity,
      }, 0)

      timeline.to(material.emissive, {
        r: targetEmissive.r,
        g: targetEmissive.g,
        b: targetEmissive.b,
      }, 0)
    }

    this.focusTimeline = timeline
  }

  private stopFocusAnimation() {
    if (this.focusTimeline) {
      this.focusTimeline.kill()
      this.focusTimeline = null
    }

    for (const mesh of this.meshesByModelId.values()) {
      gsap.killTweensOf(mesh.position)
      gsap.killTweensOf(mesh.scale)
      gsap.killTweensOf(mesh.rotation)
      gsap.killTweensOf(mesh.material)
      gsap.killTweensOf(mesh.material.emissive)
    }
  }
}
