export interface BrowseFilters {
    page: number
    limit: number
    q?: string
    status?: string
    days?: number
    batchId?: string
    output?: string
    uploaderId?: number
}

export interface IReportingRepository {
    browse(
        kind: "job" | "asset" | "draft" | "auditLog" | "batch",
        filters: BrowseFilters
    ): Promise<{
        data: unknown[]
        total: number
    }>
    contentCounts(days?: number): Promise<Record<string, number>>
    overview(days?: number): Promise<Record<string, number>>
}
