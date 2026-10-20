import type { AnalyticsPeriod, AnalyticsRange } from "../interfaces/analytics.interface"

/** Calendar boundaries in Asia/Jakarta (UTC+7); weeks begin on Monday. */
export function analyticsRange(period: AnalyticsPeriod, now = new Date()) {
    const offset = 7 * 60 * 60 * 1000
    const local = new Date(now.getTime() + offset)
    const start = new Date(
        Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
    )
    if (period === "this_week") {
        start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7))
    } else if (period === "this_month") {
        start.setUTCDate(1)
    } else if (period === "last_7_days" || period === "last_30_days") {
        start.setUTCDate(start.getUTCDate() - (period === "last_7_days" ? 6 : 29))
    }
    return {
        since: Math.floor((start.getTime() - offset) / 1000),
        until: Math.floor(now.getTime() / 1000)
    }
}

/** Compare the same elapsed portion of the previous calendar period. */
export function previousAnalyticsRange(
    period: AnalyticsPeriod,
    current: AnalyticsRange
): AnalyticsRange {
    const day = 86400
    if (period === "this_month") {
        const local = new Date((current.since + 7 * 3600) * 1000)
        const since = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1) / 1000 - 7 * 3600
        return { since, until: Math.min(since + current.until - current.since, current.since) }
    }
    const shift = (period === "today" ? 1 : period === "last_30_days" ? 30 : 7) * day
    return { since: current.since - shift, until: current.until - shift }
}
