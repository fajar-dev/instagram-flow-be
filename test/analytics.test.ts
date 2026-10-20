import { expect, test } from "bun:test"
import { InstagramService } from "../src/modules/instagram/instagram.service"
import { GraphInstagramClient } from "../src/modules/instagram/adapters/graph-client"
import { InstagramAnalyticsAdapter } from "../src/modules/instagram/analytics/analytics.adapter"
import { InstagramAnalyticsService } from "../src/modules/instagram/analytics/analytics.service"
import {
    analyticsQuery,
    analyticsPostsQuery
} from "../src/modules/instagram/analytics/validators/analytics.validator"
import type { IWorkflowRepository } from "../src/modules/shared/interfaces/workflow.repository.interface"

const credentials = {
    graphVersion: "v24.0",
    app: { appId: "", appSecret: "" },
    accounts: [
        {
            key: "test",
            label: "Test",
            instagramUserId: "123",
            accessToken: "private-token",
            enabled: true,
            tokenExpiresAt: null
        }
    ]
}
const accounts = new InstagramService({ read: async () => credentials })

function adapter(reply: (url: URL) => unknown) {
    const transport = (async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input))
        expect(url.hostname).toBe("graph.instagram.com")
        expect(url.searchParams.has("access_token")).toBe(false)
        expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer private-token")
        const body = reply(url) as Record<string, unknown>
        return Response.json(body, { status: body?.error ? 400 : 200 })
    }) as typeof fetch
    return new InstagramAnalyticsAdapter(new GraphInstagramClient(accounts, transport), accounts)
}

test("account insights preserves zero and missing values, with a bounded time range", async () => {
    const api = adapter((url) => {
        expect(url.searchParams.get("metric_type")).toBe("total_value")
        expect(
            Number(url.searchParams.get("until")) - Number(url.searchParams.get("since"))
        ).toBeLessThanOrEqual(7 * 86400)
        const name = url.searchParams.get("metric")
        return { data: name === "reach" ? [] : [{ name, total_value: { value: 0 } }] }
    })
    const report = await api.account("test", "last_7_days")
    expect(report.metrics.slice(0, 3)).toEqual([
        { name: "views", value: 0 },
        { name: "reach", value: null },
        { name: "total_interactions", value: 0 }
    ])
})

test("media insights validates app-scoped owner IDs and selects Story metrics", async () => {
    const api = adapter((url) => {
        if (url.pathname.endsWith("/me")) {
            return { id: "456", user_id: "123" }
        }
        if (!url.pathname.endsWith("/insights")) {
            return { id: "789", owner: { id: "456" }, media_product_type: "STORY" }
        }
        const name = url.searchParams.get("metric")
        if (name === "replies") {
            return {
                error: { code: 10, message: "Not enough viewers for the media to show insights" }
            }
        }
        return { data: [{ name, values: [{ value: 2 }] }] }
    })
    const report = await api.media("test", "789")
    expect(report.metrics.map((m) => m.name)).toEqual(["views", "reach", "replies", "navigation"])
    expect(report.metrics[2]?.value).toBeNull()
})

test("foreign media ownership is rejected before fetching insights", async () => {
    let insights = 0
    const api = adapter((url) => {
        if (url.pathname.endsWith("/insights")) {
            insights++
        }
        if (url.pathname.endsWith("/me")) {
            return { id: "456", user_id: "123" }
        }
        return { id: "789", owner: { id: "999" } }
    })
    await expect(api.media("test", "789")).rejects.toThrow("does not belong")
    expect(insights).toBe(0)
})

test("permission errors are not disguised as unavailable metric values", async () => {
    const api = adapter(() => ({ error: { code: 10, message: "Permission denied" } }))
    await expect(api.account("test", "last_7_days")).rejects.toThrow("Instagram API request failed")
})

test("post listing exposes an opaque cursor, never provider paging URLs or tokens", async () => {
    const api = adapter(() => ({
        data: [{ id: "789", permalink: "javascript:alert(1)", access_token: "secret" }],
        paging: {
            next: "https://graph.instagram.com?access_token=secret",
            cursors: { after: "next-cursor" }
        }
    }))
    const result = await api.posts("test")
    expect(result.after).toBe("next-cursor")
    expect(result.items[0]?.permalink).toBeNull()
    expect(JSON.stringify(result)).not.toContain("secret")
})

test("analytics cache coalesces requests and still verifies account availability", async () => {
    let calls = 0
    let enabled = true
    const serviceAccounts = new InstagramService({
        read: async () => ({
            ...credentials,
            accounts: credentials.accounts.map((a) => ({ ...a, enabled }))
        })
    })
    const api = adapter((url) => {
        calls++
        return { data: [{ name: url.searchParams.get("metric"), total_value: { value: 1 } }] }
    })
    const service = new InstagramAnalyticsService(api, serviceAccounts, {} as IWorkflowRepository)
    await Promise.all([
        service.account("test", "last_7_days"),
        service.account("test", "last_7_days")
    ])
    expect(calls).toBe(22)
    enabled = false
    await expect(service.account("test", "last_7_days")).rejects.toThrow("unavailable")
})

test("publication insights require a published record and matching configured account", async () => {
    let publication: any = {
        status: "SCHEDULED",
        mediaId: "789",
        accountKey: "test",
        snapshot: { instagramUserId: "123" }
    }
    const repository = { get: async () => publication } as unknown as IWorkflowRepository
    const service = new InstagramAnalyticsService(
        adapter(() => ({})),
        accounts,
        repository
    )
    await expect(service.publication("id")).rejects.toThrow("only for published")
    publication.status = "PUBLISHED"
    publication.snapshot.instagramUserId = "999"
    await expect(service.publication("id")).rejects.toThrow("no longer matches")
    publication = null
    await expect(service.publication("id")).rejects.toThrow("not found")
    expect(() => service.media("test", "../me")).toThrow("Invalid Instagram media ID")
})

test("analytics query validators reject unbounded periods and paging URLs", () => {
    expect(analyticsQuery.parse({}).period).toBe("this_week")
    expect(analyticsQuery.parse({ period: "today" }).period).toBe("today")
    expect(analyticsQuery.safeParse({ period: "year" }).success).toBe(false)
    expect(analyticsPostsQuery.safeParse({ after: "https://evil.example" }).success).toBe(false)
})

test("analytics routes require authentication before accessing Meta", async () => {
    const { createTestApp, request } = await import("./setup")
    const app = createTestApp()
    for (const path of [
        "/api/instagram/accounts/test/insights",
        "/api/instagram/accounts/test/top-posts",
        "/api/instagram/accounts/test/media",
        "/api/instagram/accounts/test/media/123/insights",
        "/api/publications/123/insights"
    ]) {
        const response = await request(app, path)
        expect(response.status).toBe(401)
    }
})

test("missing media ownership cannot match a missing profile identity", async () => {
    const api = adapter((url) => (url.pathname.endsWith("/me") ? { id: "123" } : { id: "789" }))
    await expect(api.media("test", "789")).rejects.toThrow("does not belong")
})

test("engagement rate preserves zero, missing reach and rates above one hundred", async () => {
    const { withEngagementRate } =
        await import("../src/modules/instagram/analytics/helpers/insight-metrics")
    const rate = (reach: number | null, interactions: number | null) =>
        withEngagementRate({
            fetchedAt: "",
            metrics: [
                { name: "reach", value: reach },
                { name: "total_interactions", value: interactions }
            ]
        }).engagementRate
    expect(rate(4, 1)).toBe(25)
    expect(rate(4, 0)).toBe(0)
    expect(rate(0, 0)).toBeNull()
    expect(rate(null, 2)).toBeNull()
    expect(rate(4, null)).toBeNull()
    expect(rate(2, 3)).toBe(150)
})

test("top posts ranks by interactions then reach, retains missing metrics last and reuses cache", async () => {
    let mediaCalls = 0
    const api = {
        account: async () => ({ metrics: [], fetchedAt: "" }),
        posts: async () => ({
            items: ["1", "2", "3"].map((id) => ({ id, product: "FEED" })),
            after: "next"
        }),
        media: async (_key: string, id: string) => {
            mediaCalls++
            return {
                media: { id, timestamp: "2026-10-20" },
                fetchedAt: "",
                metrics: [
                    { name: "total_interactions", value: id === "3" ? null : 2 },
                    { name: "reach", value: Number(id) * 10 }
                ]
            }
        }
    } as any
    const service = new InstagramAnalyticsService(api, accounts, {} as IWorkflowRepository)
    const report = await service.topPosts("test")
    expect(report.items.map((item) => item.media.id)).toEqual(["2", "1", "3"])
    expect(report.items[0]!.engagementRate).toBe(10)
    expect(report.sampled).toBe(3)
    expect(report.unavailable).toBe(1)
    expect(report.after).toBe("next")
    await service.topPosts("test")
    await service.media("test", "1")
    expect(mediaCalls).toBe(3)
})

test("analytics calendar periods use Jakarta midnight and Monday across month boundaries", async () => {
    const { analyticsRange } =
        await import("../src/modules/instagram/analytics/helpers/analytics-period")
    const now = new Date("2026-03-01T18:00:00Z") // Monday March 2, 01:00 WIB
    const start = (period: Parameters<typeof analyticsRange>[0]) =>
        new Date(analyticsRange(period, now).since * 1000).toISOString()
    expect(start("today")).toBe("2026-03-01T17:00:00.000Z")
    expect(start("this_week")).toBe("2026-03-01T17:00:00.000Z")
    expect(start("this_month")).toBe("2026-02-28T17:00:00.000Z")
    expect(start("last_7_days")).toBe("2026-02-23T17:00:00.000Z")
    const sunday = analyticsRange("this_week", new Date("2026-03-01T10:00:00Z"))
    expect(new Date(sunday.since * 1000).toISOString()).toBe("2026-02-22T17:00:00.000Z")
})

test("comparison ranges match elapsed weekdays and clamp shorter previous months", async () => {
    const { analyticsRange, previousAnalyticsRange } =
        await import("../src/modules/instagram/analytics/helpers/analytics-period")
    const current = analyticsRange("this_week", new Date("2026-10-20T08:00:00Z"))
    const previous = previousAnalyticsRange("this_week", current)
    expect(current.since - previous.since).toBe(7 * 86400)
    expect(current.until - previous.until).toBe(7 * 86400)
    const march = analyticsRange("this_month", new Date("2026-03-31T08:00:00Z"))
    const feb = previousAnalyticsRange("this_month", march)
    expect(new Date(feb.since * 1000).toISOString()).toBe("2026-01-31T17:00:00.000Z")
    expect(feb.until).toBe(march.since)
})

test("malformed provider payloads fail safely instead of becoming empty metrics", async () => {
    for (const payload of [null, [], { data: "invalid" }, { data: [{ name: 42 }] }]) {
        const api = adapter(() => payload)
        await expect(api.account("test", "today")).rejects.toThrow("Instagram API request failed")
    }
})

test("analytics retains domain errors and uses a gateway error for provider failures", async () => {
    const api = adapter((url) =>
        url.pathname.endsWith("/me") ? { id: "123" } : { id: "789", owner: { id: "999" } }
    )
    const service = new InstagramAnalyticsService(api, accounts, {} as IWorkflowRepository)
    try {
        await service.media("test", "789")
        throw new Error("Expected ownership error")
    } catch (error) {
        expect((error as { status: number }).status).toBe(403)
    }
    const unavailable = new InstagramAnalyticsService(
        adapter(() => ({ error: { code: 190 } })),
        accounts,
        {} as IWorkflowRepository
    )
    try {
        await unavailable.account("test", "today")
        throw new Error("Expected gateway error")
    } catch (error) {
        expect((error as { status: number }).status).toBe(502)
    }
})
