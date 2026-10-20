import { instagramService } from "../instagram.module"
import { GraphInstagramClient } from "../adapters/graph-client"
import { TypeOrmWorkflowRepository } from "../../shared/repositories/workflow.repository"
import { InstagramAnalyticsAdapter } from "./analytics.adapter"
import { InstagramAnalyticsService } from "./analytics.service"
import { InstagramAnalyticsController } from "./analytics.controller"

export const instagramAnalyticsService = new InstagramAnalyticsService(
    new InstagramAnalyticsAdapter(new GraphInstagramClient(instagramService), instagramService),
    instagramService,
    new TypeOrmWorkflowRepository()
)

export const instagramAnalyticsController = new InstagramAnalyticsController(
    instagramAnalyticsService
)
