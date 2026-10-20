import type { z } from "zod"
import {
    graphMedia,
    graphMediaPage,
    graphInsights,
    graphOwner,
    instagramPermalink
} from "../adapters/graph-response"
import { ForbiddenException } from "../../../core/exceptions/base"
import { GraphInstagramClient, InstagramApiError } from "../adapters/graph-client"
import type { InstagramService } from "../instagram.service"
import type {
    AnalyticsPeriod,
    AnalyticsRange,
    IInstagramAnalyticsApi,
    InstagramMedia,
    InsightMetric
} from "./interfaces/analytics.interface"

import { analyticsRange } from "./helpers/analytics-period"

const mediaFields = "id,caption,media_type,media_product_type,timestamp,permalink"

export class InstagramAnalyticsAdapter implements IInstagramAnalyticsApi {
    constructor(
        private readonly client: GraphInstagramClient,
        private readonly accounts: InstagramService
    ) {}

    private serialize(row: z.infer<typeof graphMedia>): InstagramMedia {
        return {
            id: String(row.id),
            caption: row.caption || "",
            type: row.media_type || "",
            product: row.media_product_type || "FEED",
            timestamp: row.timestamp || "",
            permalink: instagramPermalink(row.permalink)
        }
    }

    private async metrics(
        key: string,
        path: string,
        names: string[],
        params: Record<string, string> = {}
    ): Promise<InsightMetric[]> {
        return Promise.all(
            names.map(async (name) => {
                try {
                    const response = await this.client.request(
                        key,
                        path,
                        "GET",
                        {
                            ...params,
                            metric: name
                        },
                        graphInsights
                    )
                    const metric = response.data?.find((entry) => entry.name === name)
                    const value = metric?.total_value?.value ?? metric?.values?.[0]?.value
                    return {
                        name,
                        value: typeof value === "number" && Number.isFinite(value) ? value : null
                    }
                } catch (error) {
                    // Unsupported metrics and insufficient Story viewers are unavailable, never zero.
                    if (error instanceof InstagramApiError && error.metricUnavailable) {
                        return { name, value: null }
                    }
                    throw error
                }
            })
        )
    }

    async account(key: string, period: AnalyticsPeriod, range?: AnalyticsRange) {
        const { account } = await this.accounts.requireAccount(key)
        const { since, until } = range ?? analyticsRange(period)
        const metrics = await this.metrics(
            key,
            `${account.instagramUserId}/insights`,
            [
                "views",
                "reach",
                "total_interactions",
                "accounts_engaged",
                "likes",
                "comments",
                "saves",
                "shares",
                "replies",
                "reposts",
                "profile_links_taps"
            ],
            {
                period: "day",
                metric_type: "total_value",
                since: String(since),
                until: String(until)
            }
        )
        return { metrics, fetchedAt: new Date().toISOString() }
    }

    async posts(key: string, after?: string) {
        const { account } = await this.accounts.requireAccount(key)
        const response = await this.client.request(
            key,
            `${account.instagramUserId}/media`,
            "GET",
            {
                fields: mediaFields,
                limit: "20",
                ...(after ? { after } : {})
            },
            graphMediaPage
        )
        return {
            items: response.data.map((row) => this.serialize(row)),
            after: response.paging?.next ? response.paging?.cursors?.after || null : null
        }
    }

    async media(key: string, mediaId: string) {
        const { account } = await this.accounts.requireAccount(key)
        const row = await this.client.request(
            key,
            mediaId,
            "GET",
            {
                fields: `${mediaFields},owner`
            },
            graphMedia
        )
        // Media owner uses the app-scoped ID, while configuration may store user_id.
        const profile = await this.client.request(
            key,
            "me",
            "GET",
            { fields: "id,user_id" },
            graphOwner
        )
        const identities = [profile.id, profile.user_id].filter(
            (id): id is string => typeof id === "string" && /^\d+$/.test(id)
        )
        if (
            !identities.includes(account.instagramUserId) ||
            !identities.includes(String(row.owner?.id))
        ) {
            throw new ForbiddenException("Instagram media does not belong to this account")
        }
        const media = this.serialize(row)
        const names =
            media.product === "STORY"
                ? ["views", "reach", "replies", "navigation"]
                : [
                      "views",
                      "reach",
                      "likes",
                      "comments",
                      "saved",
                      "shares",
                      "total_interactions",
                      ...(media.product === "FEED"
                          ? ["follows", "profile_visits", "profile_activity"]
                          : [])
                  ]
        const metrics = await this.metrics(key, `${mediaId}/insights`, names)
        return { media, metrics, fetchedAt: new Date().toISOString() }
    }
}
