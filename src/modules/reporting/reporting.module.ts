import { TypeOrmReportingRepository } from './repositories/reporting.repository'
import type { IReportingRepository } from './interfaces/reporting.repository.interface'
import { ReportingService } from './reporting.service'
import { ReportingController } from './reporting.controller'

export function createReportingModule(repository: IReportingRepository = new TypeOrmReportingRepository()) {
    return { reportingController: new ReportingController(new ReportingService(repository)) }
}

export const { reportingController } = createReportingModule()
