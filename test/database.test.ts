import { CreateUsers1792022398000 } from "../src/database/migrations/1792022398000-create-users"
import { CreateContacts1792022399000 } from "../src/database/migrations/1792022399000-create-contacts"
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import type { Hono } from "hono"
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
            for (const table of ["users", "contacts", "password_reset_tokens"]) {
                expect(await runner.hasTable(table)).toBe(true)
            }
            expect(await AppDataSource.showMigrations()).toBe(false)
            expect(await AppDataSource.runMigrations({ transaction: "each" })).toHaveLength(0)
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
            await new CreateUsers1792022398000().up(runner)
            await new CreateContacts1792022399000().up(runner)
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
