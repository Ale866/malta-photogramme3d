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
  resolveStrictMeshForTexturing,
  runOpenMvsDensify,
  runOpenMvsInterface,
  runOpenMvsMeshing,
  runOpenMvsTexturing,
  runOpenMvsTexturingWithMesh,
  runStrictMeshFocusCleanup,
} from "./openmvs";

function createColmapPipelineServices(profile: PipelineProfile): PipelineServices {
  const runProfiledOpenMvsMeshing: PipelineServices["runOpenMvsMeshing"] = async (outputFolder, hooks) => {
    await runOpenMvsMeshing(outputFolder, hooks);

    if (profile !== "strict") {
      return;
    }

    try {
      await runStrictMeshFocusCleanup(outputFolder, hooks);
    } catch (error) {
      console.warn("[OpenMVS focus_cleanup] Strict mesh cleanup failed; falling back to raw mesh", error);
    }
  };

  const runProfiledOpenMvsTexturing: PipelineServices["runOpenMvsTexturing"] = async (outputFolder, hooks) => {
    if (profile !== "strict") {
      await runOpenMvsTexturing(outputFolder, hooks);
      return;
    }

    const meshPath = resolveStrictMeshForTexturing(outputFolder);
    await runOpenMvsTexturingWithMesh(outputFolder, meshPath, hooks);
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
