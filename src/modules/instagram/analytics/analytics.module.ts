import { config } from "../../../config/config"
import { createRedisClient } from "../../../config/redis"
import { RedisCache } from "../../../core/cache/redis-cache"
import { instagramService } from "../instagram.module"
import { GraphInstagramClient } from "../adapters/graph-client"
import { TypeOrmWorkflowRepository } from "../../shared/repositories/workflow.repository"
import { InstagramAnalyticsAdapter } from "./analytics.adapter"
import { InstagramAnalyticsService } from "./analytics.service"
import { InstagramAnalyticsController } from "./analytics.controller"

const redis = createRedisClient()
let connecting: Promise<void> | undefined

const analyticsCache = new RedisCache(async (...args) => {
    if (redis.status === "wait" || redis.status === "end") {
        connecting ??= redis.connect().finally(() => {
            connecting = undefined
        })
    }
    if (connecting) {
        await connecting
    }
    return redis.call(args[0]!, ...args.slice(1))
}, `ig-flow:${config.app.env}:analytics:v1`)

export const instagramAnalyticsService = new InstagramAnalyticsService(
    new InstagramAnalyticsAdapter(new GraphInstagramClient(instagramService), instagramService),
    instagramService,
    new TypeOrmWorkflowRepository(),
    analyticsCache
)

export const instagramAnalyticsController = new InstagramAnalyticsController(
    instagramAnalyticsService
)
