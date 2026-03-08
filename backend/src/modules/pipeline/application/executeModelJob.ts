import { createModelFromJob } from "../../model/application/createModelFromJob";
import type { ModelJobStatusDto } from "../../model-jobs/application/jobStatusDto";
import { toModelJobStatusDto } from "../../model-jobs/application/jobStatusDto";
import {
  setModelJobFailed,
  setModelJobRunning,
  setModelJobSucceeded,
  updateModelJobRuntime,
} from "../../model-jobs/application/jobLifecycle";
import type { ModelJobRepository } from "../../model-jobs/domain/modelJobRepository";
import type { ModelRepository } from "../../model/domain/modelRepository";
import { runMeshroomPipeline } from "./runMeshroomPipeline";
import type { PipelineServices } from "./ports";

export type ExecuteModelJobInput = {
  jobId: string;
};

export type ExecuteModelJobServices = {
  modelJobs: ModelJobRepository;
  models: ModelRepository;
  pipeline: PipelineServices;
  jobRealtime?: {
    emitUpdate: (job: ModelJobStatusDto) => void;
  };
};

const LOG_TAIL_MAX_LINES = 200;
const JOB_UPDATE_THROTTLE_MS = 1000;

export async function executeModelJob(services: ExecuteModelJobServices, input: ExecuteModelJobInput): Promise<void> {
  const jobId = requireJobId(input.jobId);
  const job = await services.modelJobs.findById(jobId);
  if (!job) throw new Error("Job not found");
  if (!job.coordinates) throw new Error("Missing job coordinates");

  let stage = "starting";
  let progress = 1;
  let logTail: string[] = [];

  const persistRuntime = async () => {
    const updated = await updateModelJobRuntime({ modelJobs: services.modelJobs }, job.id, {
      stage,
      progress,
      logTail: [...logTail],
    });
    services.jobRealtime?.emitUpdate(toModelJobStatusDto(updated));
  };

  const interval = setInterval(() => {
    void persistRuntime();
  }, JOB_UPDATE_THROTTLE_MS);

  const captureRuntime = (next: { stage?: string; progress?: number; line?: string }) => {
    if (typeof next.stage === "string" && next.stage.trim()) {
      stage = next.stage.trim();
    }

    if (typeof next.progress === "number" && Number.isFinite(next.progress)) {
      progress = Math.max(progress, Math.round(next.progress));
    }

    if (typeof next.line === "string" && next.line.trim()) {
      logTail.push(next.line.trim());
      if (logTail.length > LOG_TAIL_MAX_LINES) {
        logTail = logTail.slice(-LOG_TAIL_MAX_LINES);
      }
    }
  };

  try {
    const runningJob = await setModelJobRunning({ modelJobs: services.modelJobs }, job.id);
    services.jobRealtime?.emitUpdate(toModelJobStatusDto(runningJob));
    captureRuntime({ stage: "starting", progress: 1 });

    await runMeshroomPipeline(
      services.pipeline,
      {
        inputFolder: job.inputFolder,
        outputFolder: job.outputFolder,
      },
      {
        onProgress: (event) => {
          captureRuntime({
            stage: event.stage,
            progress: event.progress,
            line: event.line,
          });
        },
      }
    );

    await persistRuntime();

    const model = await createModelFromJob(
      { models: services.models },
      {
        ownerId: job.ownerId,
        sourceJobId: job.id,
        outputFolder: job.outputFolder,
        title: job.title,
        coordinates: job.coordinates,
      }
    );

    const succeeded = await setModelJobSucceeded({ modelJobs: services.modelJobs }, job.id, {
      modelId: model.id,
    });
    services.jobRealtime?.emitUpdate(toModelJobStatusDto(succeeded));
  } catch (error) {
    const failed = await setModelJobFailed({ modelJobs: services.modelJobs }, job.id, {
      error: toErrorMessage(error),
    });
    services.jobRealtime?.emitUpdate(toModelJobStatusDto(failed));
  } finally {
    clearInterval(interval);
  }
}

function requireJobId(jobId: string): string {
  const normalized = typeof jobId === "string" ? jobId.trim() : "";
  if (!normalized) throw new Error("Missing jobId");
  return normalized;
}

function toErrorMessage(error: any): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return "Pipeline failed";
}
