import { io, type Socket } from "socket.io-client";
import type { ModelJobSnapshot } from "../domain/ModelJob";
import { runtimeConfig } from "@/core/config/runtime";

type JobSocketHandlers = {
  onSnapshot: (snapshot: ModelJobSnapshot) => void;
  onUpdate: (update: ModelJobSnapshot) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (message: string) => void;
};

export type JobSocketClient = {
  subscribe: (jobId: string) => void;
  disconnect: () => void;
};

export function createJobSocketClient(token: string, handlers: JobSocketHandlers): JobSocketClient {
  const socket: Socket = io(runtimeConfig.socketUrl, {
    auth: { token },
  });

  socket.on("connect", () => {
    handlers.onConnect?.();
  });

  socket.on("job:snapshot", (payload: ModelJobSnapshot) => {
    handlers.onSnapshot(payload);
  });

  socket.on("job:update", (payload: ModelJobSnapshot) => {
    handlers.onUpdate(payload);
  });

  socket.on("connect_error", (error: Error) => {
    handlers.onError?.(error.message);
  });

  socket.on("disconnect", (reason: string) => {
    handlers.onDisconnect?.(reason);
  });

  return {
    subscribe(jobId: string) {
      const normalizedJobId = typeof jobId === "string" ? jobId.trim() : "";
      if (!normalizedJobId) return;
      socket.emit("job:subscribe", { jobId: normalizedJobId });
    },
    disconnect() {
      socket.disconnect();
    },
  };
}
