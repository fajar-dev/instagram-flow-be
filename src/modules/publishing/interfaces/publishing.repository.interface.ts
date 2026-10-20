import type { IWorkflowRepository } from "../../shared/interfaces/workflow.repository.interface"

export interface IPublishingRepository extends IWorkflowRepository {
    duePublicationIds(): Promise<string[]>
}
