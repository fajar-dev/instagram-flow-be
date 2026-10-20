import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import type { Hono } from "hono"
import crypto from "node:crypto"
import { AppDataSource } from "../src/config/database"
import { PasswordResetToken } from "../src/modules/auth/entities/password-reset-token.entity"
import { mail } from "../src/core/helpers/mail"
import { createPasswordResetToken } from "./helpers"
import {
    cleanTestDatabase,
    createTestApp,
    destroyTestDatabase,
    initTestDatabase,
    registerAndLogin,
    request
} from "./setup"

let app: Hono
beforeAll(async () => {
    await initTestDatabase()
    app = createTestApp()
})
beforeEach(cleanTestDatabase)
afterAll(destroyTestDatabase)

const reset = (token: string) =>
    request(app, "/api/auth/reset-password", {
        method: "POST",
        body: { token, newPassword: "newpassword123" }
    })
const validate = (email: string, token: string) =>
    request(app, `/api/auth/validate-reset-token?${new URLSearchParams({ email, token })}`)

describe("Password reset token storage", () => {
    test("forgot password stores hashes and resends without invalidating previous links", async () => {
        const { user } = await registerAndLogin(app)
        const sent: string[] = []
        const sendMail = spyOn(mail, "sendHtml").mockImplementation(
            async (_to, _subject, html, text) => {
                sent.push(text || html)
                return {} as any
            }
        )
        try {
            for (let i = 0; i < 2; i++) {
                expect(
                    (
                        await request(app, "/api/auth/forgot-password", {
                            method: "POST",
                            body: { email: user.email }
                        })
                    ).status
                ).toBe(200)
            }
            expect(sent).toHaveLength(2)
            const tokens = sent.map((text) => text.match(/token=([a-f0-9]+)/)![1])
            expect(tokens[0]).not.toBe(tokens[1])
            const rows = await AppDataSource.getRepository(PasswordResetToken).find()
            expect(rows).toHaveLength(2)
            expect(rows.map((row) => row.tokenHash).sort()).toEqual(
                tokens
                    .map((token) => crypto.createHash("sha256").update(token).digest("hex"))
                    .sort()
            )
            for (const token of tokens) {
                expect((await validate(user.email, token)).status).toBe(200)
            }
            expect((await reset(tokens[0])).status).toBe(200)
            expect(await AppDataSource.getRepository(PasswordResetToken).count()).toBe(0)
            for (const token of tokens) {
                expect((await validate(user.email, token)).status).toBe(400)
                expect((await reset(token)).status).toBe(400)
            }
        } finally {
            sendMail.mockRestore()
        }
    })

    test("valid link changes the password and cannot be reused", async () => {
        const { user } = await registerAndLogin(app)
        const token = await createPasswordResetToken(user.id, user.email)
        expect((await validate("other@example.com", token)).status).toBe(400)
        expect((await validate(user.email, token)).status).toBe(200)
        expect((await reset(token)).status).toBe(200)
        expect(await AppDataSource.getRepository(PasswordResetToken).count()).toBe(0)
        expect((await reset(token)).status).toBe(400)
        expect((await validate(user.email, token)).status).toBe(400)
        for (const [password, status] of [
            ["password123", 401],
            ["newpassword123", 200]
        ] as const) {
            expect(
                (
                    await request(app, "/api/auth/login", {
                        method: "POST",
                        body: { email: user.email, password }
                    })
                ).status
            ).toBe(status)
        }
    })

    test("expired links are rejected by validation and reset", async () => {
        const { user } = await registerAndLogin(app)
        const token = await createPasswordResetToken(
            user.id,
            user.email,
            new Date(Date.now() - 10000)
        )
        expect((await validate(user.email, token)).status).toBe(400)
        expect((await reset(token)).status).toBe(400)
    })

    test("concurrent requests can consume a token only once", async () => {
        const { user } = await registerAndLogin(app)
        const token = await createPasswordResetToken(user.id, user.email)
        const results = await Promise.all([reset(token), reset(token)])
        expect(results.map((result) => result.status).sort()).toEqual([200, 400])
    })

    test("reset deletes all tokens for this user including expired tokens but preserves other users", async () => {
        const { user } = await registerAndLogin(app)
        const other = await registerAndLogin(app, {
            name: "Other User",
            email: "other@example.com",
            password: "password123"
        })
        await createPasswordResetToken(user.id, user.email)
        const latest = await createPasswordResetToken(user.id, user.email)
        const expired = await createPasswordResetToken(
            user.id,
            user.email,
            new Date(Date.now() - 10000)
        )
        const otherToken = await createPasswordResetToken(other.user.id, other.user.email)
        expect((await reset(expired)).status).toBe(400)
        expect(
            await AppDataSource.getRepository(PasswordResetToken).countBy({ userId: user.id })
        ).toBe(3)
        expect((await reset(latest)).status).toBe(200)
        expect(
            await AppDataSource.getRepository(PasswordResetToken).countBy({ userId: user.id })
        ).toBe(0)
        expect((await validate(other.user.email, otherToken)).status).toBe(200)
    })

    test("concurrent resets using different tokens for the same user succeed only once", async () => {
        const { user } = await registerAndLogin(app)
        const first = await createPasswordResetToken(user.id, user.email)
        const second = await createPasswordResetToken(user.id, user.email)
        const results = await Promise.all([reset(first), reset(second)])
        expect(results.map((result) => result.status).sort()).toEqual([200, 400])
        expect(await AppDataSource.getRepository(PasswordResetToken).count()).toBe(0)
    })

    test("deleting a user cascades to their reset token", async () => {
        const { user, headers } = await registerAndLogin(app)
        await createPasswordResetToken(user.id, user.email)
        expect(
            (await request(app, `/api/user/${user.id}`, { method: "DELETE", headers })).status
        ).toBe(200)
        expect(await AppDataSource.getRepository(PasswordResetToken).count()).toBe(0)
    })

    test("baseline stores reset tokens separately with a non-unique user index", async () => {
        const runner = AppDataSource.createQueryRunner()
        try {
            expect(await runner.hasColumn("users", "reset_password_token")).toBe(false)
            expect(await runner.hasColumn("users", "reset_password_expires")).toBe(false)
            const indexes = await runner.query(
                "SHOW INDEX FROM password_reset_tokens WHERE Column_name = 'user_id'"
            )
            expect(indexes.length).toBeGreaterThan(0)
            expect(
                indexes.every((index: { Non_unique: number }) => Number(index.Non_unique) === 1)
            ).toBe(true)
        } finally {
            await runner.release()
        }
    })
})
