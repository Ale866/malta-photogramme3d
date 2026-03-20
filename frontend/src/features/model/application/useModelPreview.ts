import { onBeforeUnmount } from 'vue'
import { ModelPreviewScene } from '@/features/model/infrastructure/ModelPreviewScene'

export function useModelPreview() {
  const scene = new ModelPreviewScene()

  function mount(element: HTMLElement | null) {
    if (!element) return
    scene.mount(element)
  }

  function unmount() {
    scene.unmount()
  }

  onBeforeUnmount(() => {
    unmount()
  })

  return {
    mount,
    unmount,
  }
}
