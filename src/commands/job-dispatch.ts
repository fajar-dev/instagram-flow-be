import { jobDispatcher, jobNotifications } from "../modules/ai-job/ai-job.module"
import { runWorker } from "./run-worker"

await runWorker(async () => {
    await jobNotifications.tick()
    await jobDispatcher.tick()
}, "Job or notification dispatcher tick failed; inspect database availability")
