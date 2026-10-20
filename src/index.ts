import { createApp } from "./app"
import { AppDataSource } from "./config/database"
import { config } from "./config/config"
import { logger } from "./core/helpers/logger"

AppDataSource.initialize()
    .then(() => logger.info("Database connected successfully"))
    .catch((err) => logger.error("Database connection failed", { err }))

export default {
    port: config.app.port,
    fetch: createApp().fetch
}
