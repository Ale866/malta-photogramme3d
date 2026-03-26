import { createModelFromJob } from "../../model/application/createModelFromJob";
import {
  setModelJobFailed,
  setModelJobCompleted,
  setModelJobStageCompleted,
  setModelJobStageRunning,
  updateModelJobRuntime,
} from "../../model-jobs/application/jobLifecycle";
import { MODEL_JOB_STATUS, type ModelJobRepository, type ModelJobStatus } from "../../model-jobs/domain/modelJobRepository";
import type { ModelRepository } from "../../model/domain/modelRepository";
import type { PipelineServices } from "./ports";
import type { PipelineStage } from "./ports";
import { badRequest, notFound, } from "../../../shared/errors/applicationError";

export type ExecuteModelJobInput = {
  jobId: string;
};

export type ExecuteModelJobServices = {
  modelJobs: ModelJobRepository;
  models: ModelRepository;
  pipeline: PipelineServices;
};

const JOB_UPDATE_THROTTLE_MS = 1000;

type SparsePipelineStage = {
  key: PipelineStage;
  runningStatus: Extract<ModelJobStatus, `${string}_running`>;
  completedStatus: Extract<ModelJobStatus, `${string}_completed`>;
  runningStageLabel: string;
  completedStageLabel: string;
  startProgress: number;
  completedProgress: number;
  run: (
    services: PipelineServices,
    job: { inputFolder: string; outputFolder: string },
    onProgress: (stage: PipelineStage, progress: number) => void
  ) => Promise<void>;
};

const SPARSE_PIPELINE_STAGES: readonly SparsePipelineStage[] = [
  {
    key: "feature_extraction",
    runningStatus: MODEL_JOB_STATUS.FEATURE_EXTRACTION_RUNNING,
    completedStatus: MODEL_JOB_STATUS.FEATURE_EXTRACTION_COMPLETED,
    runningStageLabel: MODEL_JOB_STATUS.FEATURE_EXTRACTION_RUNNING,
    completedStageLabel: MODEL_JOB_STATUS.FEATURE_EXTRACTION_COMPLETED,
    startProgress: 1,
    completedProgress: 30,
    run: async (services, job, onProgress) => {
      await services.runFeatureExtraction(job.inputFolder, job.outputFolder, {
        onProgress: (event) => onProgress(event.stage, event.progress),
      });
    },
  },
  {
    key: "feature_matching",
    runningStatus: MODEL_JOB_STATUS.FEATURE_MATCHING_RUNNING,
    completedStatus: MODEL_JOB_STATUS.FEATURE_MATCHING_COMPLETED,
    runningStageLabel: MODEL_JOB_STATUS.FEATURE_MATCHING_RUNNING,
    completedStageLabel: MODEL_JOB_STATUS.FEATURE_MATCHING_COMPLETED,
    startProgress: 31,
    completedProgress: 60,
    run: async (services, job, onProgress) => {
      await services.runFeatureMatching(job.outputFolder, {
        onProgress: (event) => onProgress(event.stage, event.progress),
      });
    },
  },
  {
    key: "sparse_mapping",
    runningStatus: MODEL_JOB_STATUS.SPARSE_MAPPING_RUNNING,
    completedStatus: MODEL_JOB_STATUS.SPARSE_MAPPING_COMPLETED,
    runningStageLabel: MODEL_JOB_STATUS.SPARSE_MAPPING_RUNNING,
    completedStageLabel: MODEL_JOB_STATUS.SPARSE_MAPPING_COMPLETED,
    startProgress: 61,
    completedProgress: 95,
    run: async (services, job, onProgress) => {
      await services.runSparseMapping(job.inputFolder, job.outputFolder, {
        onProgress: (event) => onProgress(event.stage, event.progress),
      });
    },
  },
];

export async function executeModelJob(services: ExecuteModelJobServices, input: ExecuteModelJobInput): Promise<void> {
  const jobId = requireJobId(input.jobId);
  const job = await services.modelJobs.findById(jobId);
  if (!job) throw notFound("Job not found", "job_not_found");
  if (!job.coordinates) throw badRequest("Missing job coordinates", "job_coordinates_required");

  let stage: string = MODEL_JOB_STATUS.QUEUED;
  let progress = 0;
  const persistRuntime = async () => {
    await updateModelJobRuntime({ modelJobs: services.modelJobs }, job.id, {
      stage,
      progress,
    });
  };

  const interval = setInterval(() => {
    persistRuntime();
  }, JOB_UPDATE_THROTTLE_MS);

  const captureRuntime = (next: { stage?: string; progress?: number }) => {
    if (typeof next.stage === "string" && next.stage.trim()) {
      stage = next.stage.trim();
    }

    if (typeof next.progress === "number" && Number.isFinite(next.progress)) {
      progress = Math.max(progress, Math.round(next.progress));
    }
  };

  try {
    for (const pipelineStage of SPARSE_PIPELINE_STAGES) {
      await setModelJobStageRunning(
        { modelJobs: services.modelJobs },
        job.id,
        {
          status: pipelineStage.runningStatus,
          stage: pipelineStage.runningStageLabel,
          progress: pipelineStage.startProgress,
        }
      );

      captureRuntime({
        stage: pipelineStage.runningStageLabel,
        progress: pipelineStage.startProgress,
      });

      await persistRuntime();

      try {
        await pipelineStage.run(
          services.pipeline,
          {
            inputFolder: job.inputFolder,
            outputFolder: job.outputFolder,
          },
          (eventStage, eventProgress) => {
            captureRuntime({
              stage: pipelineStage.runningStageLabel,
              progress: mapStageProgress(eventStage, eventProgress),
            });
          }
        );
      } catch (error) {
        captureRuntime({
          stage: `${pipelineStage.key}_failed`,
          progress,
        });

        await persistRuntime();

        throw new Error(`${pipelineStage.key} failed: ${toErrorMessage(error)}`);
      }

      await setModelJobStageCompleted(
        { modelJobs: services.modelJobs },
        job.id,
        {
          status: pipelineStage.completedStatus,
          stage: pipelineStage.completedStageLabel,
          progress: pipelineStage.completedProgress,
        }
      );

      captureRuntime({
        stage: pipelineStage.completedStageLabel,
        progress: pipelineStage.completedProgress,
      });

      await persistRuntime();
    }

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

    await setModelJobCompleted({ modelJobs: services.modelJobs }, job.id, {
      modelId: model.id,
    });
  } catch (error) {
    await setModelJobFailed({ modelJobs: services.modelJobs }, job.id, {
      error: toErrorMessage(error),
      stage: stage.endsWith("_failed") ? stage : `${stage}_failed`,
      progress,
    });
  } finally {
    clearInterval(interval);
  }
}

function mapStageProgress(stage: string, stageProgress: number): number {
  const normalized = clampStageProgress(stageProgress);

  switch (stage) {
    case "feature_extraction":
      return Math.round((normalized / 100) * 30);
    case "feature_matching":
      return 30 + Math.round((normalized / 100) * 30);
    case "sparse_mapping":
      return 60 + Math.round((normalized / 100) * 35);
    default:
      return normalized;
  }
}

function clampStageProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function requireJobId(jobId: string): string {
  const normalized = typeof jobId === "string" ? jobId.trim() : "";
  if (!normalized) throw badRequest("Missing jobId", "job_id_required");
  return normalized;
}

function toErrorMessage(error: any): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return "Pipeline failed";
}
