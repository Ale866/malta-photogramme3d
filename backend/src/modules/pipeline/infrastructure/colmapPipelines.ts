import type { PipelineProfile, PipelineServices } from "../application/ports";
import {
  runDensePreparation,
  runDenseStereo,
  runFeatureExtraction,
  runFeatureMatching,
  runFusion,
  runSparseMapping,
} from "./colmap";
import {
  runOpenMvsDensify,
  runOpenMvsInterface,
  runOpenMvsMeshing,
  runOpenMvsTexturing,
} from "./openmvs";

function createColmapPipelineServices(profile: PipelineProfile): PipelineServices {
  return {
    runFeatureExtraction,
    runFeatureMatching,
    runSparseMapping: (inputFolder, outputFolder, hooks) => runSparseMapping(inputFolder, outputFolder, hooks, profile),
    runDensePreparation,
    runDenseStereo: (outputFolder, hooks) => runDenseStereo(outputFolder, hooks, profile),
    runFusion: (outputFolder, hooks) => runFusion(outputFolder, hooks, profile),
    runOpenMvsInterface,
    runOpenMvsDensify,
    runOpenMvsMeshing,
    runOpenMvsTexturing,
  };
}

export const strictColmapPipelineServices = createColmapPipelineServices("strict");
export const relaxedColmapPipelineServices = createColmapPipelineServices("relaxed");
