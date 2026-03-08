import type { ExecuteModelJobServices } from "../application/executeModelJob";
import type { ModelJobStatusDto } from "../../model-jobs/application/jobStatusDto";
import { modelServices } from "../../model/infrastructure/modelService";
import { modelJobServices } from "../../model-jobs/infrastructure/modelJobServices";
import { emitModelJobUpdate } from "../../model-jobs/infrastructure/socket/modelJobSocketGateway";
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
  jobRealtime: {
    emitUpdate: emitModelJobUpdate,
  },
};

type ProcessNextQueuedModelJobRunner = {
  processNextQueuedModelJob: () => Promise<void>;
};

const pipelineProcessServices: ExecuteModelJobServices & {
  jobRealtime: {
    emitUpdate: (job: ModelJobStatusDto) => void;
  };
} = {
  ...pipelineExecutionServices,
  jobRealtime: {
    emitUpdate: emitModelJobUpdate,
  },
};

export const pipelineQueueRunner: ProcessNextQueuedModelJobRunner = {
  processNextQueuedModelJob: () => processNextQueuedModelJob(pipelineProcessServices),
};
