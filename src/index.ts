import { createApp } from "./app"
import { AppDataSource } from "./config/database"
import { config } from "./config/config"
import { logger } from "./core/helpers/logger"

async function startServer() {
    try {
        await AppDataSource.initialize()
        logger.info("Database connected successfully")

        const server = Bun.serve({
            hostname: config.app.hostname,
            port: config.app.port,
            fetch: createApp().fetch
        })
        logger.info("HTTP server listening", {
            hostname: server.hostname,
            port: server.port
        })
    } catch (err) {
        logger.error("Application startup failed", { err })
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy()
        }
        process.exitCode = 1
    }
}

void startServer()
