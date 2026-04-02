import { createModelFromJob } from "../../model/application/createModelFromJob";
import {
  setModelJobFailed,
  setModelJobCompleted,
  setModelJobStageActive,
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

type PipelineExecutionStage = {
  key: PipelineStage;
  activeStatus: ModelJobStatus;
  activeStageLabel: string;
  startProgress: number;
  completedProgress: number;
  run: (
    services: PipelineServices,
    job: { inputFolder: string; outputFolder: string },
    onProgress: (stage: PipelineStage, progress: number) => void
  ) => Promise<void>;
};

const PIPELINE_STAGES: readonly PipelineExecutionStage[] = [
  {
    key: "feature_extraction",
    activeStatus: MODEL_JOB_STATUS.FEATURE_EXTRACTION,
    activeStageLabel: MODEL_JOB_STATUS.FEATURE_EXTRACTION,
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
    activeStatus: MODEL_JOB_STATUS.FEATURE_MATCHING,
    activeStageLabel: MODEL_JOB_STATUS.FEATURE_MATCHING,
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
    activeStatus: MODEL_JOB_STATUS.SPARSE_MAPPING,
    activeStageLabel: MODEL_JOB_STATUS.SPARSE_MAPPING,
    startProgress: 61,
    completedProgress: 75,
    run: async (services, job, onProgress) => {
      await services.runSparseMapping(job.inputFolder, job.outputFolder, {
        onProgress: (event) => onProgress(event.stage, event.progress),
      });
    },
  },
  {
    key: "dense_preparation",
    activeStatus: MODEL_JOB_STATUS.DENSE_PREPARATION,
    activeStageLabel: MODEL_JOB_STATUS.DENSE_PREPARATION,
    startProgress: 76,
    completedProgress: 85,
    run: async (services, job, onProgress) => {
      await services.runDensePreparation(job.inputFolder, job.outputFolder, {
        onProgress: (event) => onProgress(event.stage, event.progress),
      });
    },
  },
  {
    key: "dense_stereo",
    activeStatus: MODEL_JOB_STATUS.DENSE_STEREO,
    activeStageLabel: MODEL_JOB_STATUS.DENSE_STEREO,
    startProgress: 86,
    completedProgress: 95,
    run: async (services, job, onProgress) => {
      await services.runDenseStereo(job.outputFolder, {
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
    for (const pipelineStage of PIPELINE_STAGES) {
      await setModelJobStageActive(
        { modelJobs: services.modelJobs },
        job.id,
        {
          status: pipelineStage.activeStatus,
          stage: pipelineStage.activeStageLabel,
          progress: pipelineStage.startProgress,
        }
      );

      captureRuntime({
        stage: pipelineStage.activeStageLabel,
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
              stage: pipelineStage.activeStageLabel,
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

      captureRuntime({
        stage: pipelineStage.activeStageLabel,
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
      return 60 + Math.round((normalized / 100) * 15);
    case "dense_preparation":
      return 75 + Math.round((normalized / 100) * 10);
    case "dense_stereo":
      return 85 + Math.round((normalized / 100) * 10);
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
