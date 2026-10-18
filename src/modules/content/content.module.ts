import { config } from '../../config/config'
import { minio } from '../../core/helpers/minio'
import { MinioMedia } from './media/adapters/minio-media.adapter'
import { workflowRepository, workflowContext } from '../shared/shared.module'
import type { IWorkflowRepository } from '../shared/interfaces/workflow.repository.interface'
import { WorkflowContextService } from '../shared/context.service'
import type { IContentMedia } from './media/interfaces/content-media.interface'
import { BatchService } from './batch.service'
import { BatchController } from './batch.controller'
import { MediaService } from './media/media.service'
import { ThumbnailService } from './media/thumbnail.service'
import { MediaController } from './media/media.controller'

export function createContentModule(repository: IWorkflowRepository = workflowRepository, media: IContentMedia = contentMedia, context: WorkflowContextService = workflowContext) {
    const mediaService = new MediaService(repository, media, context, new ThumbnailService(media))
    return {
        mediaService,
        batchController: new BatchController(new BatchService(repository, context)),
        mediaController: new MediaController(mediaService),
    }
}

export const contentMedia = new MinioMedia(minio, config.minio.bucket)
export const { batchController, mediaController, mediaService } = createContentModule()
