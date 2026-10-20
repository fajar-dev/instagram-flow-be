import { AppDataSource } from "../config/database"
import { logger } from "../core/helpers/logger"

/** Shared CLI lifecycle; a tick finishes before the connection pool is closed. */
export async function runWorker(tick: () => Promise<void>, failureMessage: string) {
    let running = true
    const stop = () => {
        running = false
    }
    process.on("SIGTERM", stop)
    process.on("SIGINT", stop)
    try {
        await AppDataSource.initialize()
        do {
            try {
                await tick()
            } catch {
                logger.error(failureMessage)
            }
            if (!running || process.argv.includes("--once")) {
                break
            }
            await Bun.sleep(3000)
        } while (running)
    } finally {
        process.off("SIGTERM", stop)
        process.off("SIGINT", stop)
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy()
        }
    }
}
