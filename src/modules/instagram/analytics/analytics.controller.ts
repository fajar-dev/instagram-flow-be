import type { AnalyticsPeriod } from "./interfaces/analytics.interface"
import type { Context } from "hono"
import { ApiResponse } from "../../../core/helpers/response"
import type { InstagramAnalyticsService } from "./analytics.service"

export class InstagramAnalyticsController {
    constructor(private readonly service: InstagramAnalyticsService) {}

    async account(c: Context) {
        const query = c.req.valid("query" as never) as { period: AnalyticsPeriod }
        return ApiResponse.success(
            c,
            await this.service.account(c.req.param("accountKey")!, query.period)
        )
    }

    async posts(c: Context) {
        const query = c.req.valid("query" as never) as { after?: string }
        return ApiResponse.success(
            c,
            await this.service.posts(c.req.param("accountKey")!, query.after)
        )
    }

    async topPosts(c: Context) {
        const query = c.req.valid("query" as never) as { after?: string }
        return ApiResponse.success(
            c,
            await this.service.topPosts(c.req.param("accountKey")!, query.after)
        )
    }

    async media(c: Context) {
        return ApiResponse.success(
            c,
            await this.service.media(c.req.param("accountKey")!, c.req.param("mediaId")!)
        )
    }

    async publication(c: Context) {
        return ApiResponse.success(c, await this.service.publication(c.req.param("publicationId")!))
    }
}
