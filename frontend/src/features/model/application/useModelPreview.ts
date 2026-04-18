import { onBeforeUnmount } from 'vue'
import { ModelPreviewScene } from '@/features/model/infrastructure/ModelPreviewScene'

type UseModelPreviewOptions = {
  interactive?: boolean
  meshUrl?: string | null
  textureUrl?: string | null
  orientation?: { x: number; y: number; z: number } | null
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
    setPanInput,
  }
}
