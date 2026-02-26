import { requireAccessToken } from "@/features/auth/application/useAuth";
import type { ModelJobSnapshot } from "../domain/ModelJob";
import {
  createJobSocketClient,
  type JobSocketClient,
} from "../infrastructure/jobSocket";

type RealtimeHandlers = {
  onSnapshot: (snapshot: ModelJobSnapshot) => void;
  onUpdate: (update: ModelJobSnapshot) => void;
  onError?: (message: string) => void;
};

export function useModelJobRealtime() {
  let socketClient: JobSocketClient | null = null;

  const connect = async (handlers: RealtimeHandlers): Promise<void> => {
    const token = await requireAccessToken();
    socketClient?.disconnect();
    socketClient = createJobSocketClient(token, handlers);
  };

  const subscribe = (jobId: string): void => {
    socketClient?.subscribe(jobId);
  };

  const disconnect = (): void => {
    socketClient?.disconnect();
    socketClient = null;
  };

  return {
    connect,
    subscribe,
    disconnect,
  };
}
