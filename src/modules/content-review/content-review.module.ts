import { workflowRepository, workflowContext } from "../shared/shared.module"
import type { IWorkflowRepository } from "../shared/interfaces/workflow.repository.interface"
import { WorkflowContextService } from "../shared/context.service"
import { DraftService } from "./draft.service"
import { DraftController } from "./draft.controller"

export function createContentReviewModule(
    repository: IWorkflowRepository = workflowRepository,
    context: WorkflowContextService = workflowContext
) {
    return { draftController: new DraftController(new DraftService(repository, context)) }
}

export const { draftController } = createContentReviewModule()
