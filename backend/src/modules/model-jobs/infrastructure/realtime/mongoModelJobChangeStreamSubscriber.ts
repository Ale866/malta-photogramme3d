import { toModelJobStatusDto, type ModelJobStatusDto } from "../../application/jobStatusDto";
import { ModelJobSchema } from "../db/ModelJobSchema";
import { toModelJobDomain } from "../modelJobMapper";

const RECONNECT_DELAY_MS = 1000;
const WATCHED_OPERATION_TYPES = ["insert", "replace", "update"] as const;
const JOB_UPDATE_FIELDS = new Set([
  "status",
  "stage",
  "progress",
  "error",
  "modelId",
  "startedAt",
  "finishedAt",
]);

type JobUpdateListener = (update: ModelJobStatusDto) => void;

export class MongoModelJobChangeStreamSubscriber {
  private stream: ReturnType<typeof ModelJobSchema.watch> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private active = false;

  constructor(private readonly onJobUpdate: JobUpdateListener) {}

  async start(): Promise<void> {
    if (this.active) return;

    this.active = true;
    this.openStream();
  }

  async stop(): Promise<void> {
    this.active = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const stream = this.stream;
    this.stream = null;

    if (stream) {
      stream.removeAllListeners();
      await stream.close().catch((error: unknown) => {
        console.error("Failed to close model job change stream:", error);
      });
    }
  }

  private openStream(): void {
    if (!this.active || this.stream) return;

    const stream = ModelJobSchema.watch(
      [
        {
          $match: {
            operationType: { $in: [...WATCHED_OPERATION_TYPES] },
          },
        },
      ],
      {
        fullDocument: "updateLookup",
      }
    );

    this.stream = stream;

    stream.on("change", (change: any) => {
      if (!isRelevantJobUpdate(change)) return;
      if (!change.fullDocument) return;

      this.onJobUpdate(toModelJobStatusDto(toModelJobDomain(change.fullDocument)));
    });

    stream.on("error", (error: unknown) => {
      console.error("Model job change stream error:", error);
      void this.resetStream(stream);
    });

    stream.on("close", () => {
      void this.resetStream(stream);
    });

    stream.on("end", () => {
      void this.resetStream(stream);
    });
  }

  private async resetStream(stream: NonNullable<MongoModelJobChangeStreamSubscriber["stream"]>): Promise<void> {
    if (this.stream !== stream) return;

    this.stream = null;
    stream.removeAllListeners();

    await stream.close().catch(() => {
      return undefined;
    });

    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (!this.active || this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openStream();
    }, RECONNECT_DELAY_MS);
  }
}

function isRelevantJobUpdate(change: any): boolean {
  if (change.operationType === "insert" || change.operationType === "replace") {
    return true;
  }

  if (change.operationType !== "update") {
    return false;
  }

  const updatedFields = Object.keys(change.updateDescription?.updatedFields ?? {});
  const removedFields = Array.isArray(change.updateDescription?.removedFields)
    ? change.updateDescription.removedFields
    : [];

  return [...updatedFields, ...removedFields].some((field) => JOB_UPDATE_FIELDS.has(field.split(".")[0]));
}
