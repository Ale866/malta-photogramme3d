import type { Server, Socket } from "socket.io";
import { authServices } from "../../../auth/infrastructure/authServices";
import { toModelJobStatusDto, type ModelJobStatusDto } from "../../application/jobStatusDto";
import { modelJobServices } from "../modelJobServices";

let ioRef: Server | null = null;

function jobRoom(jobId: string): string {
  return `job:${jobId}`;
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
      socket.emit("job:snapshot", toModelJobStatusDto(job));
    });
  });
}

export function emitModelJobUpdate(update: ModelJobStatusDto): void {
  ioRef?.to(jobRoom(update.jobId)).emit("job:update", update);
}
