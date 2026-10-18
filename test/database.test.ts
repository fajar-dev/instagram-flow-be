import { CreateUsers1792195300000 } from "../src/database/migrations/1792195300000-create-users"
import { CreateContacts1792195300001 } from "../src/database/migrations/1792195300001-create-contacts"
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import type { Hono } from "hono"
import { databaseMigrations } from "../src/database/migrations"
import { AppDataSource } from "../src/config/database"
import { cleanTestDatabase, createTestApp, destroyTestDatabase, initTestDatabase, registerAndLogin, request } from "./setup"

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
            for (const table of ["users", "contacts", "password_reset_tokens", "batches", "assets", "jobs", "job_dispatches", "ai_results", "renders", "drafts", "draft_revisions", "reviews", "audit_logs", "settings"]) {
                expect(await runner.hasTable(table)).toBe(true)
            }
            expect(await AppDataSource.showMigrations()).toBe(false)
            expect(await AppDataSource.runMigrations({ transaction: "each" })).toHaveLength(0)
        } finally {
            await runner.release()
        }
    })

    test("fresh baseline has no legacy tables, role or inline media and supports rollback", async () => {
        const runner = AppDataSource.createQueryRunner()
        try {
            expect(databaseMigrations).toHaveLength(14)
            expect(await runner.hasColumn("users", "role")).toBe(false)
            expect(await runner.hasColumn("renders", "sanitized_svg")).toBe(false)
            expect(await runner.hasColumn("renders", "storage_key")).toBe(true)
            const tables = await runner.query("SHOW TABLES")
            expect(tables.some((row: object) => String(Object.values(row)[0]).startsWith("social_"))).toBe(false)
            for (const Migration of [...databaseMigrations].reverse()) await new Migration().down(runner)
            for (const Migration of databaseMigrations) await new Migration().up(runner)
            expect(await runner.hasTable("password_reset_tokens")).toBe(true)
            expect(await runner.hasTable("renders")).toBe(true)
        } finally {
            await runner.release()
        }
    })

    test("baseline migrations preserve existing users and contacts", async () => {
        const { user, headers } = await registerAndLogin(app)
        const created = await request(app, "/api/contact", {
            method: "POST", headers, body: { name: "Existing contact" },
        })
        expect(created.status).toBe(201)
        const runner = AppDataSource.createQueryRunner()
        try {
            await new CreateUsers1792195300000().up(runner)
            await new CreateContacts1792195300001().up(runner)
        } finally {
            await runner.release()
        }
        const profile = await request(app, "/api/auth/me", { headers })
        expect(profile.status).toBe(200)
        expect(profile.body.data.id).toBe(user.id)
        const contact = await request(app, `/api/contact/${created.body.data.id}`, { headers })
        expect(contact.status).toBe(200)
        expect(contact.body.data.name).toBe("Existing contact")
    })

    test("restores foreign key checks after cleaning test data", async () => {
        const rows = await AppDataSource.query("SELECT @@SESSION.foreign_key_checks AS enabled")
        expect(Number(rows[0].enabled)).toBe(1)
        expect(AppDataSource.options.type).toBe("mysql")
    })

    test("persists enum, nullable, and boolean fields through the API", async () => {
        const { headers } = await registerAndLogin(app)
        const created = await request(app, "/api/contact", {
            method: "POST",
            headers,
            body: { name: "MySQL Contact", salutation: "mrs", type: "supplier", isActive: false },
        })
        expect(created.status).toBe(201)

        const fetched = await request(app, `/api/contact/${created.body.data.id}`, { headers })
        expect(fetched.status).toBe(200)
        expect(fetched.body.data.salutation).toBe("mrs")
        expect(fetched.body.data.type).toBe("supplier")
        expect(fetched.body.data.isActive).toBe(false)
        expect(fetched.body.data.email).toBeNull()
        expect(fetched.body.data.phone).toBeNull()
    })
})
