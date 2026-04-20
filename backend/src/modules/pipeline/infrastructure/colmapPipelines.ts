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
  resolveMeshForTexturing,
  runOpenMvsDensify,
  runOpenMvsInterface,
  runMeshFocusCleanup,
  runOpenMvsMeshing,
  runOpenMvsTexturing,
  runOpenMvsTexturingWithMesh,
  simplifyMeshForTexturing,
} from "./openmvs";

function createColmapPipelineServices(profile: PipelineProfile): PipelineServices {
  const runProfiledOpenMvsMeshing: PipelineServices["runOpenMvsMeshing"] = async (outputFolder, hooks) => {
    await runOpenMvsMeshing(outputFolder, hooks);

    try {
      await runMeshFocusCleanup(outputFolder, hooks);
    } catch (error) {
      console.warn(`[OpenMVS focus_cleanup] ${profile} mesh cleanup failed; falling back to raw mesh`, error);
    }
  };

  const runProfiledOpenMvsTexturing: PipelineServices["runOpenMvsTexturing"] = async (outputFolder, hooks) => {
    const meshPath = resolveMeshForTexturing(outputFolder);
    const meshForTexturing = await simplifyMeshForTexturing(outputFolder, meshPath, hooks);
    await runOpenMvsTexturingWithMesh(outputFolder, meshForTexturing, hooks);
  };

  return {
    runFeatureExtraction,
    runFeatureMatching,
    runSparseMapping: (inputFolder, outputFolder, hooks) => runSparseMapping(inputFolder, outputFolder, hooks, profile),
    runDensePreparation,
    runDenseStereo: (outputFolder, hooks) => runDenseStereo(outputFolder, hooks, profile),
    runFusion: (outputFolder, hooks) => runFusion(outputFolder, hooks, profile),
    runOpenMvsInterface,
    runOpenMvsDensify,
    runOpenMvsMeshing: runProfiledOpenMvsMeshing,
    runOpenMvsTexturing: runProfiledOpenMvsTexturing,
  };
}

export const strictColmapPipelineServices = createColmapPipelineServices("strict");
export const relaxedColmapPipelineServices = createColmapPipelineServices("relaxed");
