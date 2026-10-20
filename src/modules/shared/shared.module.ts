import { TypeOrmWorkflowRepository } from "./repositories/workflow.repository"
import { WorkflowContextService } from "./context.service"

export const workflowRepository = new TypeOrmWorkflowRepository()

export const workflowContext = new WorkflowContextService(workflowRepository)
