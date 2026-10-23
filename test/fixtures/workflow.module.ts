import type { IWorkflowRepository } from "../../src/modules/shared/interfaces/workflow.repository.interface"
import type { IContentMedia } from "../../src/modules/content/media/interfaces/content-media.interface"
import type { IWebhookTransport } from "../../src/modules/ai-job/dispatch.service"
import { WorkflowContextService } from "../../src/modules/shared/context.service"
import { createContentModule } from "../../src/modules/content/content.module"
import { createSettingsModule } from "../../src/modules/settings/settings.module"
import { createAiJobModule } from "../../src/modules/ai-job/ai-job.module"

/** Isolated test composition: no reporting or HTTP route facade. */
export function createTestWorkflow(
    repository: IWorkflowRepository,
    media: IContentMedia,
    transport: IWebhookTransport
) {
    const context = new WorkflowContextService(repository)
    const content = createContentModule(repository, media, context)
    const { settings } = createSettingsModule(repository, context)
    return {
        context,
        settings,
        ...createAiJobModule(repository, media, context, content.mediaService, settings, transport)
    }
}
