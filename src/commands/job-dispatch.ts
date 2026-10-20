import { jobDispatcher } from "../modules/ai-job/ai-job.module"
import { runWorker } from "./run-worker"

await runWorker(
    () => jobDispatcher.tick(),
    "Job dispatcher tick failed; inspect database availability"
)
