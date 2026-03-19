import { onUnmounted } from 'vue'
import type { ModelJobStatus } from '../domain/ModelJob'
import { useModelJobRealtime } from './useModelJobRealtime'

const DEFAULT_POLL_INTERVAL_MS = 5000

function isTerminal(status: ModelJobStatus): boolean {
  return status === 'succeeded' || status === 'failed'
}

export function useModelLibraryAutoRefresh(options: {
  onRefresh: () => Promise<void>
}) {
  const realtime = useModelJobRealtime()

  let trackedJobIdsKey = ''
  let trackedJobIds = new Set<string>()
  let isRealtimeConnected = false
  let pollTimer: number | null = null
  let refreshPromise: Promise<void> | null = null
  let refreshQueued = false

  async function refreshLibrary() {
    if (refreshPromise) {
      refreshQueued = true
      return refreshPromise
    }

    refreshPromise = options.onRefresh()
      .finally(async () => {
        refreshPromise = null
        if (!refreshQueued) return

        refreshQueued = false
        await refreshLibrary()
      })

    return refreshPromise
  }

  function stopPolling() {
    if (pollTimer === null) return
    window.clearInterval(pollTimer)
    pollTimer = null
  }

  function startPolling() {
    if (pollTimer !== null || trackedJobIds.size === 0) return

    pollTimer = window.setInterval(() => {
      void refreshLibrary()
    }, DEFAULT_POLL_INTERVAL_MS)
  }

  function stop() {
    stopPolling()
    trackedJobIdsKey = ''
    trackedJobIds = new Set()
    isRealtimeConnected = false
    realtime.disconnect()
  }

  async function watchJobs(jobIds: readonly string[]) {
    const normalizedJobIds = [...new Set(
      jobIds
        .map((jobId) => jobId.trim())
        .filter((jobId) => jobId.length > 0)
    )].sort()

    const nextKey = normalizedJobIds.join('|')
    if (nextKey === trackedJobIdsKey) return

    stop()
    if (normalizedJobIds.length === 0) return

    trackedJobIdsKey = nextKey
    trackedJobIds = new Set(normalizedJobIds)

    try {
      await realtime.connect({
        onSnapshot: (snapshot) => {
          if (!trackedJobIds.has(snapshot.jobId)) return
          if (isTerminal(snapshot.status)) {
            void refreshLibrary()
          }
        },
        onUpdate: (update) => {
          if (!trackedJobIds.has(update.jobId)) return
          if (isTerminal(update.status)) {
            void refreshLibrary()
          }
        },
        onConnect: () => {
          isRealtimeConnected = true
          stopPolling()
          for (const jobId of trackedJobIds) {
            realtime.subscribe(jobId)
          }
        },
        onDisconnect: () => {
          isRealtimeConnected = false
          startPolling()
        },
        onError: () => {
          if (!isRealtimeConnected) {
            startPolling()
          }
        },
      })

      if (!isRealtimeConnected) {
        startPolling()
      }
    } catch {
      startPolling()
    }
  }

  onUnmounted(() => {
    stop()
  })

  return {
    watchJobs,
    stop,
  }
}
