import { RenderService } from "../content/media/render.service"
import { workflowRepository, workflowContext } from "../shared/shared.module"
import { contentMedia, mediaService } from "../content/content.module"
import { settingsService } from "../integration/integration.module"
import { N8nWebhookTransport } from "./workflow/adapters/webhook.adapter"
import type { IWorkflowRepository } from "../shared/interfaces/workflow.repository.interface"
import { WorkflowContextService } from "../shared/context.service"
import type { IContentMedia } from "../content/media/interfaces/content-media.interface"
import { MediaService } from "../content/media/media.service"
import { SettingsService } from "../integration/settings.service"
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
    transport: IWebhookTransport = new N8nWebhookTransport()
) {
    const workflow = new WorkflowService(repository, new RenderService(media), context, mediaAccess)
    return {
        workflow,
        dispatcher: new JobDispatcher(repository, context, settings, transport),
        jobController: new JobController(new JobService(repository, context)),
        workflowController: new WorkflowController(workflow)
    }
}

export const { jobController, workflowController, dispatcher: jobDispatcher } = createAiJobModule()
