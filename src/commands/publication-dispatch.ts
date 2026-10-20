import { publicationWorker } from "../modules/publishing/publishing.module"
import { runWorker } from "./run-worker"

await runWorker(
    () => publicationWorker.tick(),
    "Publication worker failed; check database availability"
)
