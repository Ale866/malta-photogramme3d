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
  run: (
    services: PipelineServices,
    job: { inputFolder: string; outputFolder: string },
    onProgress: (stage: PipelineStage, progress: number) => void
  ) => Promise<void>;
};

type PipelineProgressRange = {
  baseProgress: number;
  span: number;
};

const PIPELINE_PROGRESS_RANGES: Record<PipelineStage, PipelineProgressRange> = {
  feature_extraction: { baseProgress: 0, span: 10 },
  feature_matching: { baseProgress: 10, span: 10 },
  sparse_mapping: { baseProgress: 20, span: 25 },
  dense_preparation: { baseProgress: 45, span: 10 },
  dense_stereo: { baseProgress: 55, span: 30 },
  fusion: { baseProgress: 85, span: 5 },
  meshing: { baseProgress: 90, span: 7 },
  texturing: { baseProgress: 97, span: 3 },
};

const PIPELINE_STAGES: readonly PipelineExecutionStage[] = [
  {
    key: "feature_extraction",
    activeStatus: MODEL_JOB_STATUS.FEATURE_EXTRACTION,
    activeStageLabel: MODEL_JOB_STATUS.FEATURE_EXTRACTION,
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
    run: async (services, job, onProgress) => {
      await services.runDenseStereo(job.outputFolder, {
        onProgress: (event) => onProgress(event.stage, event.progress),
      });
    },
  },
  {
    key: "fusion",
    activeStatus: MODEL_JOB_STATUS.FUSION,
    activeStageLabel: MODEL_JOB_STATUS.FUSION,
    run: async (services, job, onProgress) => {
      await services.runFusion(job.outputFolder, {
        onProgress: (event) => onProgress(event.stage, event.progress),
      });
    },
  },
  {
    key: "meshing",
    activeStatus: MODEL_JOB_STATUS.MESHING,
    activeStageLabel: MODEL_JOB_STATUS.MESHING,
    run: async (services, job, onProgress) => {
      await services.runOpenMvsInterface(job.outputFolder, {
        onProgress: (event) => onProgress("meshing", event.progress),
      });
      await services.runOpenMvsDensify(job.outputFolder, {
        onProgress: (event) => onProgress("meshing", event.progress),
      });
      await services.runOpenMvsMeshing(job.outputFolder, {
        onProgress: (event) => onProgress("meshing", event.progress),
      });
    },
  },
  {
    key: "texturing",
    activeStatus: MODEL_JOB_STATUS.TEXTURING,
    activeStageLabel: MODEL_JOB_STATUS.TEXTURING,
    run: async (services, job, onProgress) => {
      await services.runOpenMvsTexturing(job.outputFolder, {
        onProgress: (event) => onProgress("texturing", event.progress),
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
      const stageStartProgress = getStageStartProgress(pipelineStage.key);
      const stageCompletedProgress = getStageCompletedProgress(pipelineStage.key);

      await setModelJobStageActive(
        { modelJobs: services.modelJobs },
        job.id,
        {
          status: pipelineStage.activeStatus,
          stage: pipelineStage.activeStageLabel,
          progress: stageStartProgress,
        }
      );

      captureRuntime({
        stage: pipelineStage.activeStageLabel,
        progress: stageStartProgress,
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
        progress: stageCompletedProgress,
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
  if (!(stage in PIPELINE_PROGRESS_RANGES)) return normalized;

  const range = PIPELINE_PROGRESS_RANGES[stage as PipelineStage];
  return range.baseProgress + Math.round((normalized / 100) * range.span);
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

function getStageStartProgress(stage: PipelineStage): number {
  const { baseProgress } = PIPELINE_PROGRESS_RANGES[stage];
  return baseProgress === 0 ? 1 : baseProgress + 1;
}

function getStageCompletedProgress(stage: PipelineStage): number {
  const { baseProgress, span } = PIPELINE_PROGRESS_RANGES[stage];
  return baseProgress + span;
}
