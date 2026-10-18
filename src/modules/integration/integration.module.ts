import { workflowRepository, workflowContext } from '../shared/shared.module'
import type { IWorkflowRepository } from '../shared/interfaces/workflow.repository.interface'
import { WorkflowContextService } from '../shared/context.service'
import { SettingsService } from './settings.service'
import { SettingsController } from './settings.controller'

export function createIntegrationModule(repository: IWorkflowRepository = workflowRepository, context: WorkflowContextService = workflowContext) {
    const settings = new SettingsService(repository, context)
    return { settings, settingsController: new SettingsController(settings) }
}

export const { settings: settingsService, settingsController } = createIntegrationModule()
