import { onBeforeUnmount } from 'vue'
import { ModelPreviewScene } from '@/features/model/infrastructure/ModelPreviewScene'

type UseModelPreviewOptions = {
  interactive?: boolean
  meshUrl?: string | null
  textureUrl?: string | null
  orientation?: { x: number; y: number; z: number } | null
  dragMode?: 'orbit' | 'roll'
  onOrientationChange?: (orientation: { x: number; y: number; z: number }) => void
  onLoaded?: () => void
  onError?: () => void
}

export function useModelPreview(options: UseModelPreviewOptions = {}) {
  const scene = new ModelPreviewScene(options)

  function mount(element: HTMLElement | null) {
    if (!element) return
    scene.mount(element)
  }

  function unmount() {
    scene.unmount()
  }

  function setOrientation(orientation: { x: number; y: number; z: number }) {
    scene.setOrientation(orientation)
  }

  function setDragMode(mode: 'orbit' | 'roll') {
    scene.setDragMode(mode)
  }

  function zoomIn() {
    scene.zoomIn()
  }

  function zoomOut() {
    scene.zoomOut()
  }

  function resetZoom() {
    scene.resetZoom()
  }

  function panLeft() {
    scene.panLeft()
  }

  function panRight() {
    scene.panRight()
  }

  function panUp() {
    scene.panUp()
  }

  function panDown() {
    scene.panDown()
  }

  function resetView() {
    scene.resetView()
  }

  function setPanInput(input: { x: number; y: number }) {
    scene.setPanInput(input)
  }

  onBeforeUnmount(() => {
    unmount()
  })

  return {
    mount,
    unmount,
    setOrientation,
    setDragMode,
    panLeft,
    panRight,
    panUp,
    panDown,
    zoomIn,
    zoomOut,
    resetZoom,
    resetView,
    setPanInput,
  }
}
