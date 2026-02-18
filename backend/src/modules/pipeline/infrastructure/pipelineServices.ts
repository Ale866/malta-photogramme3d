import type { PipelineServices } from "../application/ports";
import { runMeshroom } from "./meshroomRunner";

export const pipelineServices: PipelineServices = {
  runMeshroom,
};
