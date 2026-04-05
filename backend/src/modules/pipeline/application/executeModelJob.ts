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
    job: { inputFolder: string; outputFolder: string }
  ) => Promise<void>;
};

const PIPELINE_STAGES: readonly PipelineExecutionStage[] = [
  {
    key: "feature_extraction",
    activeStatus: MODEL_JOB_STATUS.FEATURE_EXTRACTION,
    activeStageLabel: MODEL_JOB_STATUS.FEATURE_EXTRACTION,
    run: async (services, job) => {
      await services.runFeatureExtraction(job.inputFolder, job.outputFolder);
    },
  },
  {
    key: "feature_matching",
    activeStatus: MODEL_JOB_STATUS.FEATURE_MATCHING,
    activeStageLabel: MODEL_JOB_STATUS.FEATURE_MATCHING,
    run: async (services, job) => {
      await services.runFeatureMatching(job.outputFolder);
    },
  },
  {
    key: "sparse_mapping",
    activeStatus: MODEL_JOB_STATUS.SPARSE_MAPPING,
    activeStageLabel: MODEL_JOB_STATUS.SPARSE_MAPPING,
    run: async (services, job) => {
      await services.runSparseMapping(job.inputFolder, job.outputFolder);
    },
  },
  {
    key: "dense_preparation",
    activeStatus: MODEL_JOB_STATUS.DENSE_PREPARATION,
    activeStageLabel: MODEL_JOB_STATUS.DENSE_PREPARATION,
    run: async (services, job) => {
      await services.runDensePreparation(job.inputFolder, job.outputFolder);
    },
  },
  {
    key: "dense_stereo",
    activeStatus: MODEL_JOB_STATUS.DENSE_STEREO,
    activeStageLabel: MODEL_JOB_STATUS.DENSE_STEREO,
    run: async (services, job) => {
      await services.runDenseStereo(job.outputFolder);
    },
  },
  {
    key: "fusion",
    activeStatus: MODEL_JOB_STATUS.FUSION,
    activeStageLabel: MODEL_JOB_STATUS.FUSION,
    run: async (services, job) => {
      await services.runFusion(job.outputFolder);
    },
  },
  {
    key: "meshing",
    activeStatus: MODEL_JOB_STATUS.MESHING,
    activeStageLabel: MODEL_JOB_STATUS.MESHING,
    run: async (services, job) => {
      await services.runOpenMvsInterface(job.outputFolder);
      await services.runOpenMvsDensify(job.outputFolder);
      await services.runOpenMvsMeshing(job.outputFolder);
    },
  },
  {
    key: "texturing",
    activeStatus: MODEL_JOB_STATUS.TEXTURING,
    activeStageLabel: MODEL_JOB_STATUS.TEXTURING,
    run: async (services, job) => {
      await services.runOpenMvsTexturing(job.outputFolder);
    },
  },
];

export async function executeModelJob(services: ExecuteModelJobServices, input: ExecuteModelJobInput): Promise<void> {
  const jobId = requireJobId(input.jobId);
  const job = await services.modelJobs.findById(jobId);
  if (!job) throw notFound("Job not found", "job_not_found");
  if (!job.coordinates) throw badRequest("Missing job coordinates", "job_coordinates_required");

  let stage: string = MODEL_JOB_STATUS.QUEUED;
  const persistRuntime = async () => {
    await updateModelJobRuntime({ modelJobs: services.modelJobs }, job.id, {
      stage,
    });
  };

  const interval = setInterval(() => {
    persistRuntime();
  }, JOB_UPDATE_THROTTLE_MS);

  const captureRuntime = (next: { stage?: string }) => {
    if (typeof next.stage === "string" && next.stage.trim()) {
      stage = next.stage.trim();
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
        }
      );

      captureRuntime({
        stage: pipelineStage.activeStageLabel,
      });

      await persistRuntime();

      try {
        await pipelineStage.run(
          services.pipeline,
          {
            inputFolder: job.inputFolder,
            outputFolder: job.outputFolder,
          }
        );
      } catch (error) {
        captureRuntime({
          stage: `${pipelineStage.key}_failed`,
        });

        await persistRuntime();

        throw new Error(`${pipelineStage.key} failed: ${toErrorMessage(error)}`);
      }

      captureRuntime({
        stage: pipelineStage.activeStageLabel,
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
    });
  } finally {
    clearInterval(interval);
  }
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
