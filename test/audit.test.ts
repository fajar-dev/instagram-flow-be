import { config } from '../src/config/config'
import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import type { Hono } from "hono"
import { AppDataSource } from "../src/config/database"
import { User } from "../src/modules/user/entities/user.entity"
import { mail } from "../src/core/helpers/mail"
import { logger } from "../src/core/helpers/logger"
import { InternalServerException } from "../src/core/exceptions/base"
import { cleanTestDatabase, createTestApp, destroyTestDatabase, initTestDatabase, registerAndLogin, request } from "./setup"

let app: Hono
beforeAll(async () => { await initTestDatabase(); app = createTestApp() })
beforeEach(cleanTestDatabase)
afterAll(destroyTestDatabase)

describe("Audit regressions", () => {
    test("central route registration preserves public health/docs and protected feature routes", async () => {
        const health = await request(app, "/health")
        expect(health.status).toBe(200)
        expect(health.body.checks.database).toBe("connected")
        const docs = await app.request("/api/docs")
        expect(docs.status).toBe(200)
        expect(await docs.text()).toContain("/api/swagger.yaml")
        expect((await app.request("/api/swagger.yaml")).status).toBe(200)
        expect((await request(app, "/api/jobs")).status).toBe(401)
        expect((await request(app, "/api/user")).status).toBe(401)
    })

    test("feature routes preserve authentication and retired social routes are absent", async () => {
        for (const path of ["overview", "jobs", "batches/example", "review", "media", "assets/example/preview", "assets/example/download", "renders/example", "audit-logs", "settings"]) {
            expect((await app.request(`/api/${path}`)).status).toBe(401)
            expect((await app.request(`/api/social/${path}`)).status).toBe(404)
        }
        for (const [method, path] of [
            ["POST", "batches"], ["POST", "batches/example/assets"], ["POST", "batches/example/process"],
            ["POST", "jobs/example/retry"], ["PATCH", "drafts/example"], ["POST", "drafts/example/review"],
            ["DELETE", "assets/example"], ["PATCH", "settings"],
            ["POST", "jobs/example/claim"], ["POST", "jobs/example/result"], ["POST", "jobs/example/failure"]
        ]) {
            expect((await app.request(`/api/${path}`, { method })).status).toBe(401)
        }
        expect((await app.request("/api/jobs/example/manifest")).status).toBe(401)
    })

    test("dispatcher control validates readiness, persists toggles and excludes deployment details", async () => {
        const { headers } = await registerAndLogin(app)
        const original = { n8n: { ...config.n8n }, media: { ...config.media }, minio: { ...config.minio }, appUrl: config.app.appUrl }
        try {
            config.n8n.webhookUrl = 'https://'
            config.n8n.webhookToken = 'test-webhook-secret'
            config.n8n.serviceToken = 'test-service-secret'
            config.minio.accessKey = 'test-access-key'
            config.minio.secretKey = 'test-media-secret'
            config.app.appUrl = 'https://api.test'
            const update = (dispatchEnabled: boolean) => request(app, "/api/settings", { method: "PATCH", headers, body: { dispatchEnabled } })
            expect((await update(true)).status).toBe(400)
            config.n8n.webhookUrl = 'https://workflow.test/hook'
            const enabled = await update(true)
            expect(enabled.status).toBe(200)
            expect(enabled.body.data.dispatchEnabled).toBe(true)
            expect(enabled.body.data.ready).toBe(true)
            expect(Object.keys(enabled.body.data).sort()).toEqual(["dispatchEnabled", "ready", "webhookConfigured", "serviceConfigured", "storageConfigured"].sort())
            expect(JSON.stringify(enabled.body)).not.toContain('test-webhook-secret')
            config.minio.secretKey = ''
            expect((await request(app, "/api/settings", { headers })).body.data.ready).toBe(false)
            expect((await update(false)).body.data.dispatchEnabled).toBe(false)
        } finally {
            Object.assign(config.n8n, original.n8n)
            Object.assign(config.media, original.media)
            Object.assign(config.minio, original.minio)
            config.app.appUrl = original.appUrl
        }
    })

    test("upload limits come from runtime configuration and require authentication", async () => {
        expect((await app.request("/api/batches/limits")).status).toBe(401)
        const { headers } = await registerAndLogin(app)
        const previous = config.media.maxUploadMb
        try {
            config.media.maxUploadMb = 7
            const result = await request(app, "/api/batches/limits", { headers })
            expect(result.status).toBe(200)
            expect(result.body.data).toEqual({ maxUploadMb: 7, maxBatchFiles: config.media.maxBatchFiles, maxJobFiles: config.jobs.maxJobFiles })
        } finally { config.media.maxUploadMb = previous }
    })

    test("empty and out-of-range pagination uses a zero range", async () => {
        const { headers } = await registerAndLogin(app)
        const empty = await request(app, "/api/contact", { headers })
        expect(empty.body.meta).toMatchObject({ total: 0, from: 0, to: 0 })
        await request(app, "/api/contact", { method: "POST", headers, body: { name: "Audit Contact", email: "audit@example.com", phone: "123456", type: "customer" } })
        const outside = await request(app, "/api/contact?page=99&limit=10", { headers })
        expect(outside.body.meta).toMatchObject({ total: 1, from: 0, to: 0 })
        expect(outside.body.data).toEqual([])
    })

    test("reporting queries use the route validation envelope", async () => {
        const { headers } = await registerAndLogin(app)
        for (const route of ["overview", "jobs", "review", "media", "audit-logs"]) {
            const result = await request(app, `/api/${route}?page=0&limit=101`, { headers })
            expect(result.status).toBe(422)
            expect(result.body.success).toBe(false)
            expect(result.body.errors.length).toBeGreaterThan(0)
        }
    })

    test("users have no role field or database column and share management access", async () => {
        const first = await registerAndLogin(app, { name: "First", email: "first@example.com", password: "password123" })
        const second = await registerAndLogin(app, { name: "Second", email: "second@example.com", password: "password123" })
        for (const session of [first, second]) {
            const me = await request(app, "/api/auth/me", { headers: session.headers })
            expect(me.body.data.role).toBeUndefined()
            expect((await request(app, "/api/user", { headers: session.headers })).status).toBe(200)
            expect((await request(app, "/api/settings", { headers: session.headers })).status).toBe(200)
            expect((await request(app, "/api/audit-logs", { headers: session.headers })).status).toBe(200)
        }
        const columns = await AppDataSource.query("SHOW COLUMNS FROM users LIKE 'role'")
        expect(columns).toHaveLength(0)
        expect((await request(app, "/api/settings")).status).toBe(401)
    })

    test("inactive accounts cannot use existing access or refresh tokens", async () => {
        const { user, headers, refreshToken } = await registerAndLogin(app)
        await AppDataSource.getRepository(User).update(user.id, { isActive: false })
        expect((await request(app, "/api/auth/me", { headers })).status).toBe(401)
        expect((await request(app, "/api/auth/refresh", { method: "POST", body: { refreshToken } })).status).toBe(401)
    })

    test("protected routes keep domain errors instead of converting them to 401", async () => {
        const { headers } = await registerAndLogin(app)
        expect((await request(app, "/api/contact/999999999", { headers })).status).toBe(404)
    })

    test("profile photo null clears the persisted photo", async () => {
        const { user, headers } = await registerAndLogin(app)
        await AppDataSource.getRepository(User).update(user.id, { photo: "users/avatar.png" })
        const result = await request(app, "/api/auth/profile", {
            method: "PUT", headers, body: { name: user.name, email: user.email, photo: null },
        })
        expect(result.status).toBe(200)
        expect(result.body.data.photo).toBeNull()
        expect((await AppDataSource.getRepository(User).findOneByOrFail({ id: user.id })).photo).toBeNull()
    })

    test("reset email preserves plus addresses and HTML escapes user names", async () => {
        const { user } = await registerAndLogin(app, { name: "<script>alert(1)</script>", email: "user+reset@example.com", password: "password123" })
        let body = ""
        let markup = ""
        const send = spyOn(mail, "sendHtml").mockImplementation(async (_to, _subject, html, text) => {
            body = text || ""; markup = html
            return { messageId: "test" } as Awaited<ReturnType<typeof mail.sendHtml>>
        })
        const originalFrontendUrl = config.app.frontendUrl
        config.app.frontendUrl = 'https://frontend.example.test'
        try {
            expect((await request(app, "/api/auth/forgot-password", { method: "POST", body: { email: user.email } })).status).toBe(200)
            const link = new URL(body.split("\n").find(line => line.startsWith("http"))!)
            expect(link.origin).toBe("https://frontend.example.test")
            expect(link.pathname).toBe("/auth/reset-password")
            expect(link.searchParams.get("email")).toBe(user.email)
            expect(markup).not.toContain("<script>")
        } finally { send.mockRestore(); config.app.frontendUrl = originalFrontendUrl }
    })

    test("SMTP failure is reported instead of claiming the email was sent", async () => {
        const { user } = await registerAndLogin(app)
        const send = spyOn(mail, "sendHtml").mockRejectedValue(new InternalServerException("Failed to send email"))
        try {
            const result = await request(app, "/api/auth/forgot-password", { method: "POST", body: { email: user.email } })
            expect(result.status).toBe(500)
            expect(result.body.success).toBe(false)
        } finally { send.mockRestore() }
    })

    test("access logging redacts credentials in query parameters", async () => {
        const warn = spyOn(logger, "warn").mockImplementation(() => {})
        try {
            await request(app, "/api/auth/validate-reset-token?email=demo@example.com&token=secret-token&code=oauth-secret")
            const calls = JSON.stringify(warn.mock.calls)
            expect(calls).toContain("[REDACTED]")
            expect(calls).not.toContain("secret-token")
            expect(calls).not.toContain("oauth-secret")
        } finally { warn.mockRestore() }
    })

    test("removed proxy endpoint is not available", async () => {
        for (const path of ["/api/proxy", "/api/proxy?path=users/avatar.png"]) {
            const result = await app.request(path)
            expect(result.status).toBe(404)
        }
    })
})
