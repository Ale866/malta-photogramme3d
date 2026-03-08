import { pipelineQueueRunner } from "./modules/pipeline/infrastructure/pipelineServices";
import { connectDb } from "./shared/db/mongoConnection";

const POLL_INTERVAL_MS = 3000;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function startWorker(): Promise<void> {
  await connectDb();
  console.log("Model job worker started");

  let keepRunning = true;

  const stopWorker = () => {
    keepRunning = false;
  };

  process.on("SIGINT", stopWorker);
  process.on("SIGTERM", stopWorker);

  while (keepRunning) {
    try {
      const processedJob = await pipelineQueueRunner.processNextQueuedModelJob();
      if (!processedJob) {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      console.error("Worker iteration failed:", error);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  console.log("Model job worker stopped");
}

void startWorker().catch((error) => {
  console.error("Failed to start worker:", error);
  process.exit(1);
});
