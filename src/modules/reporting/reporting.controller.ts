import type { Context } from "hono"
import type { z } from "zod"
import { ApiResponse } from "../../core/helpers/response"
import { ReportingSerializer } from "./serializers/reporting.serialize"
import type { querySchema } from "../shared/validators/shared.validator"
import type { ReportingService } from "./reporting.service"

type ReportingQuery = z.infer<typeof querySchema>

export class ReportingController {
    constructor(private readonly service: ReportingService) {}

    async contentCounts(c: Context) {
        const filters = c.req.valid("query" as never) as ReportingQuery
        return ApiResponse.success(c, await this.service.contentCounts(filters.days))
    }

    async overview(c: Context) {
        const filters = c.req.valid("query" as never) as ReportingQuery
        const overview = await this.service.overview(filters.days)
        return ApiResponse.success(c, overview)
    }

    async browse(c: Context, kind: 'job' | 'asset' | 'draft' | 'auditLog' | 'batch') {
        const filters = c.req.valid("query" as never) as ReportingQuery
        const { data, total } = await this.service.browse(kind, filters)
        return ApiResponse.paginate(c, await ReportingSerializer.collection(kind, data), total, filters.page, filters.limit)
    }
}
