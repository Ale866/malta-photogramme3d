import type { ExecuteModelJobServices } from "../application/executeModelJob";
import { modelServices } from "../../model/infrastructure/modelService";
import { modelJobServices } from "../../model-jobs/infrastructure/modelJobServices";
import { processNextQueuedModelJob } from "../application/processNextQueuedModelJob";
import type { PipelineServices } from "../application/ports";
import { runMeshroom } from "./meshroomRunner";

export const pipelineServices: PipelineServices = {
  runMeshroom,
};

export const pipelineExecutionServices: ExecuteModelJobServices = {
  modelJobs: modelJobServices.modelJobs,
  models: modelServices.models,
  pipeline: pipelineServices,
};

type ProcessNextQueuedModelJobRunner = {
  processNextQueuedModelJob: () => Promise<boolean>;
};

export const pipelineQueueRunner: ProcessNextQueuedModelJobRunner = {
  processNextQueuedModelJob: () => processNextQueuedModelJob(pipelineExecutionServices),
};
