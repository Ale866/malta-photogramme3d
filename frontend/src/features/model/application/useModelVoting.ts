import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useAuth } from '@/features/auth/application/useAuth'
import { use3dModel } from '@/features/model/application/useModel'
import type { ModelCardViewModel } from '@/features/model/application/presenters/modelCardPresenter'
import type { ModelLibrary } from '@/features/model/domain/ModelLibrary'
import { applyVoteStateToModel, type ModelVoteState } from '@/features/model/domain/ModelSummary'

type UseModelVotingOptions = {
  library: Ref<ModelLibrary | null>
  isVotingEnabled: ComputedRef<boolean>
  setErrorMessage: (message: string | null) => void
}

export function useModelVoting(options: UseModelVotingOptions) {
  const auth = useAuth()
  const { voteForModel, unvoteForModel } = use3dModel()
  const votingModelId = ref<string | null>(null)
  const isAuthenticated = computed(() => auth.isAuthenticated.value)

  function applyVoteStateToLibrary(voteState: ModelVoteState) {
    if (!options.library.value) return

    options.library.value = {
      ...options.library.value,
      models: options.library.value.models.map((model) => applyVoteStateToModel(model, voteState)),
    }
  }

  function isVoteDisabled(card: ModelCardViewModel) {
    return !options.isVotingEnabled.value
      || card.type !== 'model'
      || !isAuthenticated.value
      || auth.user.value?.id === card.ownerId
      || votingModelId.value === card.id
  }

  async function toggleVote(card: ModelCardViewModel) {
    if (card.type !== 'model' || !options.isVotingEnabled.value) return
    if (votingModelId.value) return

    votingModelId.value = card.id
    options.setErrorMessage(null)

    try {
      const voteState = card.hasVoted
        ? await unvoteForModel(card.id)
        : await voteForModel(card.id)

      applyVoteStateToLibrary(voteState)
    } catch (error) {
      options.setErrorMessage(error instanceof Error ? error.message : 'Failed to update vote')
    } finally {
      votingModelId.value = null
    }
  }

  return {
    isAuthenticated,
    isVoteDisabled,
    toggleVote,
  }
}
