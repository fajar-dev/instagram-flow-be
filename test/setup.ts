import { mockExternalServices, restoreExternalServices } from "./external-services"
import "reflect-metadata"
import { Hono } from "hono"
import { DataSource } from "typeorm"
import { config } from "../src/config/config"
import { databaseOptions, setDataSource } from "../src/config/database"

// ── Test Database ───────────────────────────────────────────────────────────
// Uses real database with a separate test database name
// Ensure DB_TEST_NAME database exists before running tests

const testDbName = config.database.testName

if (testDbName === config.database.name || !/^[a-zA-Z0-9_]+_test$/.test(testDbName)) {
    throw new Error("Tests require a dedicated *_test database different from DB_NAME")
}

const TestDataSource = new DataSource({
    ...databaseOptions,
    database: testDbName,
    dropSchema: true,
    logging: false,
    poolSize: 3
})

// ── Database Lifecycle ──────────────────────────────────────────────────────

export async function initTestDatabase() {
    mockExternalServices()
    if (!TestDataSource.isInitialized) {
        await TestDataSource.initialize()
        await TestDataSource.runMigrations({ transaction: "each" })
    }
    // Override the global AppDataSource so all modules use TestDataSource
    setDataSource(TestDataSource)
}

export async function destroyTestDatabase() {
    restoreExternalServices()
    if (TestDataSource.isInitialized) {
        await TestDataSource.destroy()
    }
}

export async function cleanTestDatabase() {
    mockExternalServices()
    if (!TestDataSource.isInitialized) {
        return
    }

    const queryRunner = TestDataSource.createQueryRunner()
    try {
        await queryRunner.query("SET FOREIGN_KEY_CHECKS = 0")
        try {
            for (const entity of TestDataSource.entityMetadatas) {
                await queryRunner.query(`DELETE FROM \`${entity.tableName}\``)
            }
        } finally {
            await queryRunner.query("SET FOREIGN_KEY_CHECKS = 1")
        }
    } finally {
        await queryRunner.release()
    }
}

// ── Test App Factory ────────────────────────────────────────────────────────

/**
 * Creates a fresh Hono app with all routes, using TestDataSource.
 * Must be called AFTER initTestDatabase().
 */
export function createTestApp(): Hono {
    const { createApp } = require("../src/app")
    return createApp()
}

// ── Request Helper ──────────────────────────────────────────────────────────

interface RequestOptions {
    method?: string
    headers?: Record<string, string>
    body?: any
}

export async function request(app: Hono, path: string, options: RequestOptions = {}) {
    const { method = "GET", headers = {}, body } = options

    const init: RequestInit = {
        method,
        headers: { "Content-Type": "application/json", ...headers }
    }

    if (body) {
        init.body = JSON.stringify(body)
    }

    const res = await app.request(path, init)
    const json = (await res.json()) as any

    return { status: res.status, body: json, headers: res.headers }
}

// ── Auth Helper ─────────────────────────────────────────────────────────────

export async function registerAndLogin(
    app: Hono,
    userData = { name: "Test User", email: "test@example.com", password: "password123" }
) {
    // Register
    const regRes = await request(app, "/api/auth/register", { method: "POST", body: userData })
    if (!regRes.body.success) {
        throw new Error(`Register failed: ${JSON.stringify(regRes.body)}`)
    }

    // Login
    const loginRes = await request(app, "/api/auth/login", {
        method: "POST",
        body: { email: userData.email, password: userData.password }
    })
    if (!loginRes.body.success) {
        throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`)
    }

    return {
        accessToken: loginRes.body.data.accessToken,
        refreshToken: loginRes.body.data.refreshToken,
        headers: { Authorization: `Bearer ${loginRes.body.data.accessToken}` },
        user: loginRes.body.data.user
    }
}
