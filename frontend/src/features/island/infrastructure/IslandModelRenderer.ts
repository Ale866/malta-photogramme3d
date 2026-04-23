import * as T from 'three'
import gsap from 'gsap'
import { disposeObject3D, loadDeliveredModel } from '@/features/model/infrastructure/texturedPlyModel'
import { isConservativeGraphicsDevice } from '@/core/device/performance'

type IslandModelRenderInput = {
  id: string
  coordinates: { x: number; y: number; z: number }
  orientation: { x: number; y: number; z: number }
  meshAssetUrl: string | null
  textureAssetUrl: string | null
}

type IslandModelRendererOptions = {
  onLoadingStateChange?: (state: { pending: number; loading: number }) => void
}

const HOVER_EMISSIVE = 0xffffff
const TARGET_MODEL_HEIGHT = 4
const SELECTED_LIFT = 0.45
const SELECTED_SCALE = 1.14
const DEEMPHASIZED_SCALE = 0.97
const DEEMPHASIZED_OPACITY = 0.38
const INTERACTION_TARGET_MIN_SIZE = 1.5
const DEFAULT_INTERACTION_SIZE = new T.Vector3(2.2, TARGET_MODEL_HEIGHT, 2.2)
const INITIAL_PRIORITY_LOAD_COUNT = isConservativeGraphicsDevice() ? 2 : 8
const MAX_CONCURRENT_LOADS = isConservativeGraphicsDevice() ? 1 : 2
const PRIORITY_LOAD_DISTANCE = 110
const MIN_MODEL_SCALE = 0.45
const MAX_MODEL_SCALE = 2.4
let loadingSpinnerTexture: T.CanvasTexture | null = null

type ObjectFocusState = {
  position: T.Vector3
  scale: T.Vector3
  rotation: T.Euler
  opacity: number
}

type ModelRenderEntry = {
  model: IslandModelRenderInput
  root: T.Group
  modelGroup: T.Group
  loadingMarker: T.Group
  interactionTarget: T.Mesh
  meshObject: T.Object3D | null
  loadState: 'idle' | 'loading' | 'loaded' | 'failed'
}

export class IslandModelRenderer {
  private readonly scene: T.Scene
  private readonly camera: T.PerspectiveCamera
  private readonly group = new T.Group()
  private readonly objectsByModelId = new Map<string, T.Object3D>()
  private readonly interactionTargetsByModelId = new Map<string, T.Object3D>()
  private readonly coordinatesByModelId = new Map<string, { x: number; y: number; z: number }>()
  private readonly originalStatesByModelId = new Map<string, ObjectFocusState>()
  private readonly entriesByModelId = new Map<string, ModelRenderEntry>()
  private hoveredModelId: string | null = null
  private selectedModelId: string | null = null
  private focusTimeline: gsap.core.Timeline | null = null
  private loadToken = 0
  private pendingLoadOrder: string[] = []
  private activeLoads = 0

  private readonly onLoadingStateChange?: (state: { pending: number; loading: number }) => void

  constructor(scene: T.Scene, camera: T.PerspectiveCamera, options: IslandModelRendererOptions = {}) {
    this.scene = scene
    this.camera = camera
    this.onLoadingStateChange = options.onLoadingStateChange
    this.group.name = 'island-models'
    this.scene.add(this.group)
  }

  async setModels(models: readonly IslandModelRenderInput[]) {
    this.clear()
    const currentToken = ++this.loadToken

    const loadableModels = models.filter((model) => Boolean(model.meshAssetUrl))
    const sortedModels = [...loadableModels].sort((left, right) =>
      this.getDistanceToCamera(left.coordinates) - this.getDistanceToCamera(right.coordinates),
    )

    for (const model of sortedModels) {
      const entry = this.createEntry(model)
      this.entriesByModelId.set(model.id, entry)
      this.objectsByModelId.set(model.id, entry.root)
      this.interactionTargetsByModelId.set(model.id, entry.interactionTarget)
      this.coordinatesByModelId.set(model.id, model.coordinates)
      this.originalStatesByModelId.set(model.id, {
        position: entry.root.position.clone(),
        scale: entry.root.scale.clone(),
        rotation: entry.root.rotation.clone(),
        opacity: 1,
      })
      this.group.add(entry.root)
    }

    this.pendingLoadOrder = sortedModels.map((model) => model.id)
    this.emitLoadingState()

    for (let index = 0; index < Math.min(INITIAL_PRIORITY_LOAD_COUNT, this.pendingLoadOrder.length); index += 1) {
      const modelId = this.pendingLoadOrder[index]
      if (modelId) {
        void this.ensureModelLoaded(modelId, currentToken)
      }
    }

    this.refreshLoadingPriorities()
  }

  refreshLoadingPriorities() {
    const prioritizedModelIds = Array.from(this.entriesByModelId.values())
      .filter((entry) => entry.loadState === 'idle')
      .sort((left, right) => this.getLoadPriority(left) - this.getLoadPriority(right))
      .map((entry) => entry.model.id)

    this.pendingLoadOrder = prioritizedModelIds
    this.emitLoadingState()
    this.processLoadQueue(this.loadToken)
  }

  getInteractiveObjects(): T.Object3D[] {
    return Array.from(this.interactionTargetsByModelId.values())
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

    if (this.hoveredModelId) {
      this.setObjectHighlight(this.hoveredModelId, false)
    }

    this.selectedModelId = modelId
    this.hoveredModelId = null
    void this.ensureModelLoaded(modelId, this.loadToken, true)
    this.refreshLoadingPriorities()
    this.animateFocusState()
  }

  clearFocus() {
    if (!this.selectedModelId) return

    this.selectedModelId = null
    this.refreshLoadingPriorities()
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
      if (this.hoveredModelId) {
        this.setObjectHighlight(this.hoveredModelId, false)
        this.hoveredModelId = null
      }
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
    this.loadToken += 1
    this.pendingLoadOrder = []
    this.activeLoads = 0
    this.emitLoadingState()

    for (const entry of this.entriesByModelId.values()) {
      if (entry.meshObject) {
        disposeObject3D(entry.meshObject)
      }
      this.stopLoadingMarkerAnimation(entry.loadingMarker)
      entry.interactionTarget.geometry.dispose()
      const interactionTargetMaterial = entry.interactionTarget.material
      if (Array.isArray(interactionTargetMaterial)) {
        for (const material of interactionTargetMaterial) {
          material.dispose()
        }
      } else {
        interactionTargetMaterial.dispose()
      }
    }

    this.group.clear()
    this.entriesByModelId.clear()
    this.objectsByModelId.clear()
    this.interactionTargetsByModelId.clear()
    this.coordinatesByModelId.clear()
    this.originalStatesByModelId.clear()
  }

  dispose() {
    this.clear()
    this.scene.remove(this.group)
  }

  private createEntry(model: IslandModelRenderInput): ModelRenderEntry {
    const root = new T.Group()
    root.userData.modelId = model.id
    root.rotation.order = 'YXZ'
    root.position.set(model.coordinates.x, model.coordinates.y, model.coordinates.z)

    const modelGroup = new T.Group()
    modelGroup.rotation.order = 'YXZ'
    modelGroup.rotation.set(model.orientation.x, model.orientation.y, model.orientation.z)

    const loadingMarker = this.createLoadingMarker(model.id)
    const interactionTarget = this.createInteractionTarget(
      model.id,
      DEFAULT_INTERACTION_SIZE,
      new T.Vector3(0, TARGET_MODEL_HEIGHT * 0.5, 0),
    )

    root.add(loadingMarker, modelGroup, interactionTarget)

    return {
      model,
      root,
      modelGroup,
      loadingMarker,
      interactionTarget,
      meshObject: null,
      loadState: 'idle',
    }
  }

  private createLoadingMarker(modelId: string) {
    const marker = new T.Group()
    marker.userData.modelId = modelId

    const spinner = new T.Sprite(
      new T.SpriteMaterial({
        map: getLoadingSpinnerTexture(),
        color: 0x5f98ff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    )
    spinner.position.y = 0.96
    spinner.scale.set(1.42, 1.42, 1)

    const pulse = new T.Mesh(
      new T.RingGeometry(0.18, 0.3, 28),
      new T.MeshStandardMaterial({
        color: 0xd8e7ff,
        emissive: new T.Color(0x4f8dff),
        emissiveIntensity: 0.22,
        roughness: 0.34,
        metalness: 0.02,
        transparent: true,
        opacity: 0.18,
        side: T.DoubleSide,
      }),
    )
    pulse.position.y = -0.02

    marker.add(spinner, pulse)
    marker.userData.spinner = spinner
    marker.userData.pulse = pulse
    this.startLoadingMarkerAnimation(marker)
    return marker
  }

  private startLoadingMarkerAnimation(marker: T.Group) {
    const spinner = marker.userData.spinner as T.Object3D | undefined
    const pulse = marker.userData.pulse as T.Object3D | undefined
    if (!spinner || !pulse) return

    const spinnerMaterial = (spinner as T.Sprite).material
    gsap.to(spinnerMaterial, {
      rotation: Math.PI * 2,
      duration: 1.1,
      repeat: -1,
      ease: 'none',
    })

    gsap.to(pulse.scale, {
      x: 1.35,
      y: 1.35,
      z: 1.35,
      duration: 0.9,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })

    gsap.to((pulse as T.Mesh).material as T.MeshStandardMaterial, {
      opacity: 0.05,
      duration: 0.9,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
  }

  private stopLoadingMarkerAnimation(marker: T.Group) {
    const spinner = marker.userData.spinner as T.Object3D | undefined
    const pulse = marker.userData.pulse as T.Object3D | undefined

    if (spinner) {
      gsap.killTweensOf((spinner as T.Sprite).material)
    }
    if (pulse) {
      gsap.killTweensOf(pulse.scale)
      const pulseMaterial = (pulse as T.Mesh).material
      if (pulseMaterial instanceof T.Material) {
        gsap.killTweensOf(pulseMaterial)
      }
    }
  }

  private async ensureModelLoaded(modelId: string, token: number, prioritize = false) {
    const entry = this.entriesByModelId.get(modelId)
    if (!entry || !entry.model.meshAssetUrl) return
    if (entry.loadState === 'loaded' || entry.loadState === 'loading') return

    if (prioritize) {
      this.pendingLoadOrder = [
        modelId,
        ...this.pendingLoadOrder.filter((queuedModelId) => queuedModelId !== modelId),
      ]
    }

    if (this.activeLoads >= MAX_CONCURRENT_LOADS) return

    this.activeLoads += 1
    entry.loadState = 'loading'
    this.emitLoadingState()

    try {
      const meshObject = await loadDeliveredModel({
        meshUrl: entry.model.meshAssetUrl,
        textureUrl: entry.model.textureAssetUrl,
      })

      if (token !== this.loadToken || !this.entriesByModelId.has(modelId)) {
        disposeObject3D(meshObject)
        return
      }

      meshObject.rotation.order = 'YXZ'
      entry.modelGroup.add(meshObject)
      entry.meshObject = meshObject
      entry.loadState = 'loaded'
      entry.loadingMarker.visible = false

      const scale = this.computeNormalizedModelScale(meshObject)
      entry.modelGroup.scale.setScalar(scale)
      entry.root.position.copy(this.getGroundedPosition(entry.model.coordinates, entry.modelGroup))

      const scaledBounds = new T.Box3().setFromObject(entry.modelGroup)
      const scaledSize = scaledBounds.getSize(new T.Vector3())
      const scaledCenter = scaledBounds.getCenter(new T.Vector3()).sub(entry.root.position)

      entry.interactionTarget.geometry.dispose()
      entry.interactionTarget.geometry = new T.BoxGeometry(
        Math.max(scaledSize.x * 1.08, INTERACTION_TARGET_MIN_SIZE),
        Math.max(scaledSize.y * 1.08, INTERACTION_TARGET_MIN_SIZE),
        Math.max(scaledSize.z * 1.08, INTERACTION_TARGET_MIN_SIZE),
      )
      entry.interactionTarget.position.copy(scaledCenter)

      this.originalStatesByModelId.set(modelId, {
        position: entry.root.position.clone(),
        scale: entry.root.scale.clone(),
        rotation: entry.root.rotation.clone(),
        opacity: 1,
      })
    } catch (error) {
      entry.loadState = 'failed'
      console.error(`Failed to load island model asset for ${modelId}`, error)
    } finally {
      this.activeLoads = Math.max(0, this.activeLoads - 1)
      this.pendingLoadOrder = this.pendingLoadOrder.filter((queuedModelId) => queuedModelId !== modelId)
      this.emitLoadingState()
      this.processLoadQueue(token)
    }
  }

  private processLoadQueue(token: number) {
    if (token !== this.loadToken) return

    while (this.activeLoads < MAX_CONCURRENT_LOADS) {
      const nextModelId = this.pendingLoadOrder[0]
      if (!nextModelId) break
      void this.ensureModelLoaded(nextModelId, token)
      this.pendingLoadOrder = this.pendingLoadOrder.filter((queuedModelId) => queuedModelId !== nextModelId)
    }
    this.emitLoadingState()
  }

  private emitLoadingState() {
    this.onLoadingStateChange?.({
      pending: this.pendingLoadOrder.length,
      loading: this.activeLoads,
    })
  }

  private getLoadPriority(entry: ModelRenderEntry) {
    if (this.selectedModelId === entry.model.id) return -10_000

    const distance = this.getDistanceToCamera(entry.model.coordinates)
    if (distance <= PRIORITY_LOAD_DISTANCE) return distance
    return PRIORITY_LOAD_DISTANCE + distance
  }

  private getDistanceToCamera(coordinates: { x: number; y: number; z: number }) {
    return this.camera.position.distanceTo(new T.Vector3(coordinates.x, coordinates.y, coordinates.z))
  }

  private getGroundedPosition(
    coordinates: { x: number; y: number; z: number },
    content: T.Object3D,
  ) {
    const position = new T.Vector3(coordinates.x, coordinates.y, coordinates.z)
    const box = new T.Box3().setFromObject(content)
    if (box.isEmpty()) {
      return position
    }

    position.y -= box.min.y
    return position
  }

  private computeNormalizedModelScale(content: T.Object3D) {
    const bounds = new T.Box3().setFromObject(content)
    const size = bounds.getSize(new T.Vector3())
    const sphere = bounds.getBoundingSphere(new T.Sphere())
    const footprint = Math.max(size.x, size.z, 1e-6)
    const overallSize = Math.max(size.y, sphere.radius * 2, footprint * 1.35, 1e-6)
    const scale = TARGET_MODEL_HEIGHT / overallSize
    return T.MathUtils.clamp(scale, MIN_MODEL_SCALE, MAX_MODEL_SCALE)
  }

  private setObjectHighlight(modelId: string, highlighted: boolean) {
    const object = this.objectsByModelId.get(modelId)
    if (!object) return

    object.traverse((child) => {
      const mesh = child as T.Mesh
      if (!mesh.isMesh) return
      if (mesh.userData?.isInteractionTarget) return

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        const standardMaterial = material as T.MeshStandardMaterial
        if (!standardMaterial.emissive) continue
        standardMaterial.emissive.setHex(highlighted ? HOVER_EMISSIVE : 0x000000)
        standardMaterial.emissiveIntensity = highlighted ? 0.16 : 0
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
        ? originalState.scale.x * SELECTED_SCALE
        : hasFocusedModel
          ? originalState.scale.x * DEEMPHASIZED_SCALE
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
      if (mesh.userData?.isInteractionTarget) return
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      opacity = (material as T.MeshStandardMaterial).opacity
    })

    return opacity
  }

  private setObjectOpacity(object: T.Object3D, opacity: number) {
    object.traverse((child) => {
      const mesh = child as T.Mesh
      if (!mesh.isMesh) return
      if (mesh.userData?.isInteractionTarget) return

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        const standardMaterial = material as T.MeshStandardMaterial
        standardMaterial.transparent = true
        standardMaterial.opacity = opacity
      }
    })
  }

  private createInteractionTarget(modelId: string, size: T.Vector3, center: T.Vector3) {
    const target = new T.Mesh(
      new T.BoxGeometry(
        Math.max(size.x * 1.08, INTERACTION_TARGET_MIN_SIZE),
        Math.max(size.y * 1.08, INTERACTION_TARGET_MIN_SIZE),
        Math.max(size.z * 1.08, INTERACTION_TARGET_MIN_SIZE),
      ),
      new T.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    )

    target.position.copy(center)
    target.userData.modelId = modelId
    target.userData.isInteractionTarget = true
    target.userData.excludeFromFocusBounds = true
    return target
  }
}

function getLoadingSpinnerTexture() {
  if (loadingSpinnerTexture) return loadingSpinnerTexture

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to create loading spinner texture context.')
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.translate(canvas.width / 2, canvas.height / 2)
  context.lineCap = 'round'
  context.lineWidth = 18

  const radius = 68
  const segmentLength = 34
  for (let index = 0; index < 12; index += 1) {
    const alpha = 0.18 + (index / 11) * 0.82
    context.save()
    context.rotate((index / 12) * Math.PI * 2)
    context.strokeStyle = `rgba(255, 255, 255, ${alpha})`
    context.beginPath()
    context.moveTo(0, -radius)
    context.lineTo(0, -(radius + segmentLength))
    context.stroke()
    context.restore()
  }

  loadingSpinnerTexture = new T.CanvasTexture(canvas)
  loadingSpinnerTexture.colorSpace = T.SRGBColorSpace
  loadingSpinnerTexture.needsUpdate = true
  return loadingSpinnerTexture
}
