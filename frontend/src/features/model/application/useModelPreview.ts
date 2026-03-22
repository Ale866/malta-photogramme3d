import { onBeforeUnmount } from 'vue'
import { ModelPreviewScene } from '@/features/model/infrastructure/ModelPreviewScene'

type UseModelPreviewOptions = {
  interactive?: boolean
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

  onBeforeUnmount(() => {
    unmount()
  })

  return {
    mount,
    unmount,
  }
}
