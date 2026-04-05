export type PipelineStage =
  | "feature_extraction"
  | "feature_matching"
  | "sparse_mapping"
  | "dense_preparation"
  | "dense_stereo"
  | "fusion"
  | "meshing"
  | "texturing";

export type PipelineProfile = "strict" | "relaxed";

export type PipelineProgressEvent = {
  stage: PipelineStage;
  progress: number;
};

export type RunColmapStageHooks = {
  onProgress?: (event: PipelineProgressEvent) => void;
};

export type PipelineServices = {
  runFeatureExtraction: (inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runFeatureMatching: (outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runSparseMapping: (inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runDensePreparation: (inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runDenseStereo: (outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runFusion: (outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runOpenMvsInterface: (outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runOpenMvsDensify: (outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runOpenMvsMeshing: (outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
  runOpenMvsTexturing: (outputFolder: string, hooks?: RunColmapStageHooks) => Promise<void>;
};
