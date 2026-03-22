import { computed, ref, type ComputedRef } from 'vue'
import { useAuth } from '@/features/auth/application/useAuth'
import { use3dModel } from '@/features/model/application/useModel'
import type { ModelSummary, ModelVoteState } from '@/features/model/domain/ModelSummary'

type UseModelDetailVotingOptions = {
  detailSource: ComputedRef<'catalog' | 'list'>
  modelDetails: ComputedRef<ModelSummary | null>
  applyVoteState: (voteState: ModelVoteState) => void
  setErrorMessage: (message: string | null) => void
}

export function useModelDetailVoting(options: UseModelDetailVotingOptions) {
  const auth = useAuth()
  const { voteForModel, unvoteForModel } = use3dModel()
  const isSubmitting = ref(false)

  const showVoting = computed(() => options.detailSource.value === 'catalog' && !!options.modelDetails.value)
  const isVoteDisabled = computed(() => {
    const model = options.modelDetails.value

    return !showVoting.value
      || !model
      || !auth.isAuthenticated.value
      || auth.user.value?.id === model.ownerId
      || isSubmitting.value
  })

  async function toggleVote() {
    const model = options.modelDetails.value
    if (!model || !showVoting.value || isSubmitting.value) return

    isSubmitting.value = true
    options.setErrorMessage(null)

    try {
      const voteState = model.hasVoted
        ? await unvoteForModel(model.id)
        : await voteForModel(model.id)

      options.applyVoteState(voteState)
    } catch (error) {
      options.setErrorMessage(error instanceof Error ? error.message : 'Failed to update vote')
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    showVoting,
    isVoteDisabled,
    toggleVote,
  }
}
