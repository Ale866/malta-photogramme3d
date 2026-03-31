import { computed, ref, type ComputedRef } from 'vue'
import { use3dModel } from '@/features/model/application/useModel'
import type { ModelCardViewModel } from '@/features/model/application/presenters/modelCardPresenter'

type UseModelDeletionOptions = {
  isEnabled: ComputedRef<boolean>
  reload: () => Promise<void>
}

export function useModelDeletion(options: UseModelDeletionOptions) {
  const { deleteFailedModelJob, deleteModel } = use3dModel()
  const deleteTarget = ref<ModelCardViewModel | null>(null)
  const deleteErrorMessage = ref<string | null>(null)
  const isDeleting = ref(false)

  const deleteDialogTitle = computed(() => {
    if (!deleteTarget.value) return ''
    return deleteTarget.value.type === 'model' ? 'Delete model?' : 'Delete failed job?'
  })

  const deleteDialogDescription = computed(() => {
    if (!deleteTarget.value) return ''

    return deleteTarget.value.type === 'model'
      ? 'If you proceed, this model will be permanently deleted and removed from the active catalog.'
      : 'If you proceed, this failed job and its uploaded/generated files will be permanently deleted.'
  })

  function requestDelete(card: ModelCardViewModel) {
    if (!options.isEnabled.value) return
    if (card.type !== 'model' && card.status !== 'failed') return

    deleteTarget.value = card
    deleteErrorMessage.value = null
  }

  function closeDeleteDialog() {
    if (isDeleting.value) return
    deleteTarget.value = null
    deleteErrorMessage.value = null
  }

  async function confirmDelete() {
    if (!deleteTarget.value || isDeleting.value) return

    isDeleting.value = true
    deleteErrorMessage.value = null

    try {
      if (deleteTarget.value.type === 'model') {
        await deleteModel(deleteTarget.value.id)
      } else {
        await deleteFailedModelJob(deleteTarget.value.id)
      }

      deleteTarget.value = null
      await options.reload()
    } catch (error) {
      deleteErrorMessage.value = error instanceof Error ? error.message : 'Delete failed'
    } finally {
      isDeleting.value = false
    }
  }

  return {
    deleteDialogDescription,
    deleteDialogTitle,
    deleteErrorMessage,
    deleteTarget,
    isDeleting,
    requestDelete,
    closeDeleteDialog,
    confirmDelete,
  }
}
