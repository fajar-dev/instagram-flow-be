import {
    BadRequestException,
    BadGatewayException,
    BaseException,
    NotFoundException
} from "../../../core/exceptions/base"
import type { IWorkflowRepository } from "../../shared/interfaces/workflow.repository.interface"
import type { InstagramService } from "../instagram.service"
import { rankPosts, withEngagementRate } from "./helpers/insight-metrics"
import { analyticsRange, previousAnalyticsRange } from "./helpers/analytics-period"
import type { AnalyticsPeriod, IInstagramAnalyticsApi } from "./interfaces/analytics.interface"

/** Short-lived, bounded cache; secrets and provider paging URLs never reach clients. */
export class InstagramAnalyticsService {
    private readonly cache = new Map<string, { expires: number; value: Promise<unknown> }>()

    constructor(
        private readonly api: IInstagramAnalyticsApi,
        private readonly accounts: InstagramService,
        private readonly repository: IWorkflowRepository
    ) {}

    private async read<T>(accountKey: string, key: string, loader: () => Promise<T>): Promise<T> {
        const { account } = await this.accounts.requireAccount(accountKey)
        const cacheKey = `${accountKey}:${account.instagramUserId}:${key}`
        const cached = this.cache.get(cacheKey)
        if (cached && cached.expires > Date.now()) {
            return cached.value as Promise<T>
        }
        if (this.cache.size >= 128) {
            this.cache.delete(this.cache.keys().next().value!)
        }
        const value = loader().catch((error: unknown) => {
            // A stale request must not evict a newer entry after expiry or capacity eviction.
            if (this.cache.get(cacheKey)?.value === value) {
                this.cache.delete(cacheKey)
            }
            if (error instanceof BaseException) {
                throw error
            }
            throw new BadGatewayException(
                "Instagram insights are unavailable; check account access and permissions"
            )
        })
        this.cache.set(cacheKey, { expires: Date.now() + 300000, value })
        return value
    }

    account(key: string, period: AnalyticsPeriod) {
        const range = analyticsRange(period)
        const previousRange = previousAnalyticsRange(period, range)
        return this.read(key, `account:${period}:${range.since}`, async () => {
            const [current, previous] = await Promise.all([
                this.api.account(key, period, range),
                this.api.account(key, period, previousRange)
            ])
            return {
                ...withEngagementRate(current),
                range,
                previous: { ...withEngagementRate(previous), range: previousRange }
            }
        })
    }

    posts(key: string, after?: string) {
        return this.read(key, `posts:${after || ""}`, () => this.api.posts(key, after))
    }

    media(key: string, mediaId: string) {
        if (!/^\d{1,64}$/.test(mediaId)) {
            throw new BadRequestException("Invalid Instagram media ID")
        }
        return this.read(key, `media:${mediaId}`, async () =>
            withEngagementRate(await this.api.media(key, mediaId))
        )
    }

    topPosts(key: string, after?: string) {
        return this.read(key, `top-posts:${after || ""}`, async () => {
            const page = await this.posts(key, after)
            const candidates = page.items.slice(0, 20).filter((post) => post.product !== "STORY")
            const reports: Awaited<ReturnType<InstagramAnalyticsService["media"]>>[] = []
            // Two posts at a time bounds provider fan-out; individual reports share the normal cache.
            for (let index = 0; index < candidates.length; index += 2) {
                reports.push(
                    ...(await Promise.all(
                        candidates.slice(index, index + 2).map((post) => this.media(key, post.id))
                    ))
                )
            }
            return {
                items: rankPosts(reports),
                sampled: candidates.length,
                unavailable: reports.filter(
                    (report) =>
                        !report.metrics.some(
                            (metric) =>
                                metric.name === "total_interactions" && metric.value !== null
                        )
                ).length,
                limit: 20,
                after: page.after,
                fetchedAt: new Date().toISOString()
            }
        })
    }

    async publication(id: string) {
        const publication = await this.repository.get("publication", id)
        if (!publication) {
            throw new NotFoundException("Publication not found")
        }
        if (publication.status !== "PUBLISHED" || !publication.mediaId) {
            throw new BadRequestException("Insights are available only for published content")
        }
        const { account } = await this.accounts.requireAccount(publication.accountKey)
        if (account.instagramUserId !== publication.snapshot.instagramUserId) {
            throw new BadRequestException("Instagram account no longer matches this publication")
        }
        return this.media(publication.accountKey, publication.mediaId)
    }
}
