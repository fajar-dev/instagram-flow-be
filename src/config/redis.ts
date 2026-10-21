import Redis from "ioredis"
import { config } from "./config"
import { logger } from "../core/helpers/logger"

export function createRedisClient() {
    const client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        tls: config.redis.tls ? {} : undefined,
        lazyConnect: true,
        connectTimeout: 1500,
        commandTimeout: 2000,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null
    })
    let lastWarning = 0
    client.on("error", () => {
        if (Date.now() - lastWarning > 60000) {
            lastWarning = Date.now()
            logger.warn("Redis analytics cache unavailable; using provider fallback")
        }
    })
    return client
}
