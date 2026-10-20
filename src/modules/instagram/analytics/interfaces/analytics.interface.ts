export type AnalyticsPeriod = "today" | "this_week" | "this_month" | "last_7_days" | "last_30_days"

export interface InsightMetric {
    name: string
    value: number | null
}

export interface InstagramMedia {
    id: string
    caption: string
    type: string
    product: string
    timestamp: string
    permalink: string | null
}

export interface InsightReport {
    metrics: InsightMetric[]
    fetchedAt: string
}

export interface IInstagramAnalyticsApi {
    account(key: string, period: AnalyticsPeriod, range?: AnalyticsRange): Promise<InsightReport>
    media(key: string, mediaId: string): Promise<InsightReport & { media: InstagramMedia }>
    posts(key: string, after?: string): Promise<{ items: InstagramMedia[]; after: string | null }>
}

export interface AnalyticsRange {
    since: number
    until: number
}
