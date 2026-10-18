import type { IReportingRepository, BrowseFilters } from './interfaces/reporting.repository.interface';
export class ReportingService {
    constructor(private readonly repository: IReportingRepository) { }
    async browse(kind: 'job' | 'asset' | 'draft' | 'auditLog' | 'batch', filters: BrowseFilters) {

        return this.repository.browse(kind, filters);
    }
    contentCounts(days: number) { return this.repository.contentCounts(days); }
    overview(days: number) { return this.repository.overview(days); }
}
