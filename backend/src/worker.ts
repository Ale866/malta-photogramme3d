import { processNextQueuedModelJob } from "./modules/pipeline/application/processNextQueuedModelJob";
import {
  runDensePreparation,
  runDenseStereo,
  runFeatureExtraction,
  runFeatureMatching,
  runFusion,
  runMeshing,
  runSimplification,
  runSparseMapping,
  runTexturing,
} from "./modules/pipeline/infrastructure/colmap";
import { verifyColmapBinary } from "./modules/pipeline/infrastructure/colmapRunner";
import { modelRepo } from "./modules/model/infrastructure/modelRepo";
import { modelJobRepo } from "./modules/model-jobs/infrastructure/modelJobRepo";
import { config } from "./shared/config/env";
import { ensureStorageDirectories } from "./shared/config/storage";
import { connectDb, disconnectDb } from "./shared/db/mongoConnection";

const POLL_INTERVAL_MS = 3000;
const workerDependencies = {
  modelJobs: modelJobRepo,
  models: modelRepo,
  pipeline: {
    runFeatureExtraction,
    runFeatureMatching,
    runSparseMapping,
    runDensePreparation,
    runDenseStereo,
    runFusion,
    runMeshing,
    runSimplification,
    runTexturing,
  },
};

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function startWorker(): Promise<void> {
  ensureStorageDirectories();
  verifyColmapBinary();
  await connectDb();
  console.log(`COLMAP binary ready: ${config.COLMAP_BIN}`);
  console.log("Model job worker started");

  let keepRunning = true;

  const stopWorker = () => {
    keepRunning = false;
  };

  process.on("SIGINT", stopWorker);
  process.on("SIGTERM", stopWorker);

  while (keepRunning) {
    try {
      const processedJob = await processNextQueuedModelJob(workerDependencies);
      if (!processedJob) {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      console.error("Worker iteration failed:", error);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  await disconnectDb();
  console.log("Model job worker stopped");
}

void startWorker().catch((error) => {
  console.error("Failed to start worker:", error);
  process.exit(1);
});
