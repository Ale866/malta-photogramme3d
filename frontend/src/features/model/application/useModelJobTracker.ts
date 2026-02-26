import { onUnmounted, ref } from "vue";
import type { ModelJobSnapshot } from "../domain/ModelJob";
import { use3dModel } from "./useModel";
import { useModelJobRealtime } from "./useModelJobRealtime";

const DEFAULT_POLL_INTERVAL_MS = 5000;

function isTerminal(status: ModelJobSnapshot["status"]): boolean {
  return status === "succeeded" || status === "failed";
}

export function useModelJobTracker() {
  const { getModelJobStatus } = use3dModel();
  const realtime = useModelJobRealtime();

  const job = ref<ModelJobSnapshot | null>(null);
  const trackingError = ref<string | null>(null);
  const isTracking = ref(false);

  let activeJobId: string | null = null;
  let pollTimer: number | null = null;
  let socketConnected = false;

  const applySnapshot = (snapshot: ModelJobSnapshot) => {
    if (!activeJobId || snapshot.jobId !== activeJobId) return;
    job.value = snapshot;
    if (isTerminal(snapshot.status)) {
      stop();
    }
  };

  const pollOnce = async () => {
    if (!activeJobId) return;
    try {
      const snapshot = await getModelJobStatus(activeJobId);
      applySnapshot(snapshot);
      trackingError.value = null;
    } catch (error) {
      trackingError.value = error instanceof Error ? error.message : "Failed to fetch job status";
    }
  };

  const stop = () => {
    stopPolling();
    activeJobId = null;
    realtime.disconnect();
    socketConnected = false;
    isTracking.value = false;
  };

  const startPolling = (pollIntervalMs: number) => {
    if (pollTimer !== null) return;
    pollTimer = window.setInterval(() => {
      void pollOnce();
    }, pollIntervalMs);
  };

  const stopPolling = () => {
    if (pollTimer === null) return;
    window.clearInterval(pollTimer);
    pollTimer = null;
  };

  const start = async (jobId: string, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS) => {
    const normalizedJobId = jobId.trim();
    if (!normalizedJobId) throw new Error("Job ID is required");

    stop();
    activeJobId = normalizedJobId;
    isTracking.value = true;
    trackingError.value = null;

    await pollOnce();

    try {
      await realtime.connect({
        onSnapshot: applySnapshot,
        onUpdate: applySnapshot,
        onConnect: () => {
          socketConnected = true;
          trackingError.value = null;
          stopPolling();
          if (activeJobId) {
            realtime.subscribe(activeJobId);
          }
        },
        onDisconnect: () => {
          socketConnected = false;
          if (activeJobId) {
            startPolling(pollIntervalMs);
          }
        },
        onError: (message) => {
          trackingError.value = message;
          if (!socketConnected && activeJobId) {
            startPolling(pollIntervalMs);
          }
        },
      });
      if (!socketConnected) {
        startPolling(pollIntervalMs);
      }
    } catch (error) {
      trackingError.value = error instanceof Error ? error.message : "Realtime connection failed";
      startPolling(pollIntervalMs);
    }
  };

  onUnmounted(() => {
    stop();
  });

  return {
    job,
    isTracking,
    trackingError,
    start,
    stop,
  };
}
