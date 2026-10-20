import { CreateUsers1792490400000 } from "../src/database/migrations/1792490400000-create-users"
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import type { Hono } from "hono"
import { databaseMigrations } from "../src/database/migrations"
import { AppDataSource } from "../src/config/database"
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

describe("MySQL database integration", () => {
    test("creates all application tables through migrations with sync disabled", async () => {
        expect(AppDataSource.options.synchronize).toBe(false)
        const runner = AppDataSource.createQueryRunner()
        try {
            for (const table of [
                "users",
                "password_reset_tokens",
                "batches",
                "assets",
                "jobs",
                "job_dispatches",
                "ai_results",
                "renders",
                "drafts",
                "reviews",
                "audit_logs",
                "settings",
                "publications"
            ]) {
                expect(await runner.hasTable(table)).toBe(true)
            }
            expect(await AppDataSource.showMigrations()).toBe(false)
            expect(await AppDataSource.runMigrations({ transaction: "each" })).toHaveLength(0)
        } finally {
            await runner.release()
        }
    })

    test("fresh baseline has no legacy tables, role or inline media and supports rollback and reapply", async () => {
        const runner = AppDataSource.createQueryRunner()
        try {
            expect(databaseMigrations).toHaveLength(13)
            expect(await runner.hasTable("contacts")).toBe(false)
            const timestamps = databaseMigrations
                .slice(0, 13)
                .map((Migration) => Number(Migration.name.slice(-13)))
            expect(timestamps).toEqual(
                Array.from({ length: 13 }, (_, index) => 1792490400000 + index)
            )
            expect(await runner.hasColumn("users", "role")).toBe(false)
            expect(await runner.hasColumn("renders", "sanitized_svg")).toBe(false)
            expect(await runner.hasColumn("renders", "storage_key")).toBe(true)
            const tables = await runner.query("SHOW TABLES")
            expect(
                tables.some((row: object) => String(Object.values(row)[0]).startsWith("social_"))
            ).toBe(false)
            expect(await runner.hasTable("draft_revisions")).toBe(false)
            expect(await runner.hasColumn("drafts", "current_revision_id")).toBe(false)
            expect(await runner.hasColumn("drafts", "caption")).toBe(true)
            expect(await runner.hasColumn("publications", "revision_id")).toBe(false)
            for (const Migration of [...databaseMigrations].reverse()) {
                await new Migration().down(runner)
            }
            for (const Migration of databaseMigrations) {
                await new Migration().up(runner)
            }
            expect(await runner.hasTable("password_reset_tokens")).toBe(true)
            expect(await runner.hasTable("renders")).toBe(true)
        } finally {
            await runner.release()
        }
    })

    test("baseline user migration preserves existing users", async () => {
        const { user, headers } = await registerAndLogin(app)
        const runner = AppDataSource.createQueryRunner()
        try {
            await new CreateUsers1792490400000().up(runner)
            expect(await runner.hasTable("contacts")).toBe(false)
        } finally {
            await runner.release()
        }
        const profile = await request(app, "/api/auth/me", { headers })
        expect(profile.status).toBe(200)
        expect(profile.body.data.id).toBe(user.id)
    })

    test("restores foreign key checks after cleaning test data", async () => {
        const rows = await AppDataSource.query("SELECT @@SESSION.foreign_key_checks AS enabled")
        expect(Number(rows[0].enabled)).toBe(1)
        expect(AppDataSource.options.type).toBe("mysql")
    })

    test("removed contact routes are unavailable to authenticated and anonymous users", async () => {
        const { headers } = await registerAndLogin(app)
        for (const auth of [undefined, headers]) {
            for (const [method, path] of [
                ["GET", "/api/contact"],
                ["POST", "/api/contact"],
                ["GET", "/api/contact/1"],
                ["PUT", "/api/contact/1"],
                ["DELETE", "/api/contact/1"]
            ]) {
                expect((await app.request(path!, { method, headers: auth })).status).toBe(404)
            }
        }
    })
})
