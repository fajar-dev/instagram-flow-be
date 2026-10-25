import { config } from "../../config/config"
import { JobNotificationService } from "./notifications/notification.service"
import { TelegramTransport } from "./notifications/telegram.adapter"
import { userRepository } from "../user/user.module"
import type { IUserRepository } from "../user/interfaces/user.repository.interface"
import { RenderService } from "../content/media/render.service"
import { workflowRepository, workflowContext } from "../shared/shared.module"
import { contentMedia, mediaService } from "../content/content.module"
import { settingsService } from "../settings/settings.module"
import { N8nWebhookTransport } from "./workflow/adapters/webhook.adapter"
import type { IWorkflowRepository } from "../shared/interfaces/workflow.repository.interface"
import { WorkflowContextService } from "../shared/context.service"
import type { IContentMedia } from "../content/media/interfaces/content-media.interface"
import { MediaService } from "../content/media/media.service"
import { SettingsService } from "../settings/settings.service"
import { JobService } from "./job.service"
import { JobController } from "./job.controller"
import { WorkflowService } from "./workflow/workflow.service"
import { WorkflowController } from "./workflow/workflow.controller"
import { JobDispatcher, type IWebhookTransport } from "./dispatch.service"

export function createAiJobModule(
    repository: IWorkflowRepository = workflowRepository,
    media: IContentMedia = contentMedia,
    context: WorkflowContextService = workflowContext,
    mediaAccess: MediaService = mediaService,
    settings: SettingsService = settingsService,
    transport: IWebhookTransport = new N8nWebhookTransport(),
    users: Pick<IUserRepository, "findById"> = userRepository
) {
    const notifications = new JobNotificationService(
        repository,
        new TelegramTransport(config.telegram.botToken, media),
        config.telegram
    )
    const workflow = new WorkflowService(
        repository,
        new RenderService(media),
        context,
        mediaAccess,
        notifications
    )
    return {
        notifications,
        workflow,
        dispatcher: new JobDispatcher(repository, context, settings, transport),
        jobController: new JobController(new JobService(repository, context, users)),
        workflowController: new WorkflowController(workflow)
    }
}

export const {
    jobController,
    workflowController,
    dispatcher: jobDispatcher,
    notifications: jobNotifications
} = createAiJobModule()
