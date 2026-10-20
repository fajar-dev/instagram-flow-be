import { AppDataSource } from "../config/database"
import { publicationWorker } from "../modules/publishing/publishing.module"
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
            await publicationWorker.tick()
        } catch {
            logger.error("Publication worker failed; check database availability")
        }
        if (process.argv.includes("--once")) {
            break
        }
        await Bun.sleep(3000)
    } while (running)
} finally {
    await AppDataSource.destroy()
}
