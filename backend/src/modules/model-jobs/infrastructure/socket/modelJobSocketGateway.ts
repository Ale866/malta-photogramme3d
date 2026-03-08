import type { Server, Socket } from "socket.io";
import { authServices } from "../../../auth/infrastructure/authServices";
import { toModelJobStatusDto, type ModelJobStatusDto } from "../../application/jobStatusDto";
import { modelJobServices } from "../modelJobServices";

let ioRef: Server | null = null;
let updatePoller: NodeJS.Timeout | null = null;
const lastBroadcasts = new Map<string, string>();
const JOB_UPDATE_POLL_INTERVAL_MS = 1000;
const JOB_ROOM_PREFIX = "job:";

function jobRoom(jobId: string): string {
  return `${JOB_ROOM_PREFIX}${jobId}`;
}

function extractAccessToken(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim().replace(/^Bearer\s+/i, "");
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  return null;
}

export function attachModelJobSocketGateway(io: Server) {
  if (updatePoller) {
    clearInterval(updatePoller);
    updatePoller = null;
  }

  lastBroadcasts.clear();
  ioRef = io;

  io.use((socket, next) => {
    try {
      const token = extractAccessToken(socket);
      if (!token) {
        return next(new Error("Missing access token"));
      }

      const payload = authServices.verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("job:subscribe", async (payload?: { jobId?: string }) => {
      const jobId = typeof payload?.jobId === "string" ? payload.jobId.trim() : "";
      if (!jobId) return;

      const job = await modelJobServices.modelJobs.findById(jobId);
      if (!job) return;
      if (job.ownerId !== socket.data.userId) return;

      socket.join(jobRoom(jobId));
      const snapshot = toModelJobStatusDto(job);
      lastBroadcasts.set(jobId, snapshotKey(snapshot));
      socket.emit("job:snapshot", snapshot);
    });
  });

  updatePoller = setInterval(() => {
    void broadcastTrackedJobUpdates(io);
  }, JOB_UPDATE_POLL_INTERVAL_MS);
}

export function emitModelJobUpdate(update: ModelJobStatusDto): void {
  ioRef?.to(jobRoom(update.jobId)).emit("job:update", update);
}

async function broadcastTrackedJobUpdates(io: Server): Promise<void> {
  const trackedJobIds = getTrackedJobIds(io);

  for (const jobId of [...lastBroadcasts.keys()]) {
    if (!trackedJobIds.has(jobId)) {
      lastBroadcasts.delete(jobId);
    }
  }

  for (const jobId of trackedJobIds) {
    const job = await modelJobServices.modelJobs.findById(jobId);
    if (!job) {
      lastBroadcasts.delete(jobId);
      continue;
    }

    const snapshot = toModelJobStatusDto(job);
    const nextKey = snapshotKey(snapshot);
    if (lastBroadcasts.get(jobId) === nextKey) {
      continue;
    }

    lastBroadcasts.set(jobId, nextKey);
    io.to(jobRoom(jobId)).emit("job:update", snapshot);
  }
}

function getTrackedJobIds(io: Server): Set<string> {
  const jobIds = new Set<string>();

  for (const room of io.sockets.adapter.rooms.keys()) {
    if (!room.startsWith(JOB_ROOM_PREFIX)) continue;
    jobIds.add(room.slice(JOB_ROOM_PREFIX.length));
  }

  return jobIds;
}

function snapshotKey(snapshot: ModelJobStatusDto): string {
  return JSON.stringify(snapshot);
}
