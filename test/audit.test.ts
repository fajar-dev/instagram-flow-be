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
        try {
            expect((await request(app, "/api/auth/forgot-password", { method: "POST", body: { email: user.email } })).status).toBe(200)
            const link = new URL(body.split("\n").find(line => line.startsWith("http"))!)
            expect(link.searchParams.get("email")).toBe(user.email)
            expect(markup).not.toContain("<script>")
        } finally { send.mockRestore() }
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

    test("proxy validation uses the standard API error response", async () => {
        const result = await request(app, "/api/proxy")
        expect(result.status).toBe(400)
        expect(result.body.success).toBe(false)
        expect(result.body.statusCode).toBe(400)
    })
})
