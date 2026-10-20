import { contentMedia } from "../content/content.module"
import { instagramApi, instagramService } from "../instagram/instagram.module"
import { workflowContext } from "../shared/shared.module"
import { TypeOrmPublishingRepository } from "./repositories/publishing.repository"
import { PublicationMediaService } from "./publication-media.service"
import { PublishingService } from "./publishing.service"
import { PublicationWorker } from "./publication-worker.service"
import { PublishingController } from "./publishing.controller"

export const publishingRepository = new TypeOrmPublishingRepository()

export const publicationMedia = new PublicationMediaService(contentMedia)

export const publishingService = new PublishingService(
    publishingRepository,
    instagramService,
    publicationMedia,
    workflowContext
)

export const publishingController = new PublishingController(publishingService)

export const publicationWorker = new PublicationWorker(
    publishingRepository,
    instagramApi,
    instagramService,
    publicationMedia
)
