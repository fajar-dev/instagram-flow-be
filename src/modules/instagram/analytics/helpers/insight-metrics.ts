import type {
    InsightReport,
    InsightMetric,
    InstagramMedia
} from "../interfaces/analytics.interface"

export function metricValue(metrics: InsightMetric[], name: string): number | null {
    return metrics.find((metric) => metric.name === name)?.value ?? null
}

export function withEngagementRate<T extends InsightReport>(report: T) {
    const reach = metricValue(report.metrics, "reach")
    const interactions = metricValue(report.metrics, "total_interactions")
    // This is interactions per reached account, not a percentage of unique engaged people.
    const engagementRate =
        reach !== null && reach > 0 && interactions !== null
            ? Math.round((interactions / reach) * 10000) / 100
            : null
    return { ...report, engagementRate }
}

export function rankPosts<T extends InsightReport & { media: InstagramMedia }>(reports: T[]) {
    return reports
        .slice()
        .sort(
            (a, b) =>
                (metricValue(b.metrics, "total_interactions") ?? -1) -
                    (metricValue(a.metrics, "total_interactions") ?? -1) ||
                (metricValue(b.metrics, "reach") ?? -1) - (metricValue(a.metrics, "reach") ?? -1) ||
                b.media.timestamp.localeCompare(a.media.timestamp) ||
                a.media.id.localeCompare(b.media.id)
        )
}
