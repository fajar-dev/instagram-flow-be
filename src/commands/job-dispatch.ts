import { AppDataSource } from "../config/database"
import { jobDispatcher } from "../modules/ai-job/ai-job.module"
import { logger } from "../core/helpers/logger"

let running = true
process.on("SIGTERM", () => {
    running = false
})
process.on("SIGINT", () => {
    running = false
})
await AppDataSource.initialize()
try {
    do {
        try {
            await jobDispatcher.tick()
        } catch {
            logger.error("Job dispatcher tick failed; inspect database availability")
        }
        if (process.argv.includes("--once")) {
            break
        }
        await Bun.sleep(3000)
    } while (running)
} finally {
    await AppDataSource.destroy()
}
