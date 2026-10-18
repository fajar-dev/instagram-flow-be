import { mockExternalServices, restoreExternalServices } from "./external-services"
import "reflect-metadata"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { DataSource } from "typeorm"
import { User } from "../src/modules/user/entities/user.entity"
import { ApiResponse } from "../src/core/helpers/response"
import { BaseException, ValidationException } from "../src/core/exceptions/base"
import { ZodError } from "zod"
import { config } from "../src/config/config"
import { databaseOptions, setDataSource } from "../src/config/database"
import { languageMiddleware } from "../src/core/middlewares/language.middleware"
import { requestLogger } from "../src/core/middlewares/logger.middleware"

// ── Test Database ───────────────────────────────────────────────────────────
// Uses real database with a separate test database name
// Ensure DB_TEST_NAME database exists before running tests

const testDbName = config.database.testName

if (testDbName === config.database.name || !/^[a-zA-Z0-9_]+_test$/.test(testDbName)) {
    throw new Error('Tests require a dedicated *_test database different from DB_NAME')
}

const TestDataSource = new DataSource({
    ...databaseOptions,
    database: testDbName,
    dropSchema: true,
    logging: false,
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
    if (!TestDataSource.isInitialized) return

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
    // Import routes — they use AppDataSource which is now TestDataSource
    const { registerRoutes } = require("../src/routes/api")

    const app = new Hono()

    app.use("*", requestLogger)
    app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }))
    app.use("*", languageMiddleware)
    registerRoutes(app)

    // Global Error Handler (matches production)
    app.onError((err, c) => {
        if (err instanceof ZodError) {
            const valErr = new ValidationException(err)
            return ApiResponse.error(c, valErr.message, valErr.status, valErr.context)
        }

        if (err instanceof BaseException) {
            return ApiResponse.error(c, err.message, err.status, err.context)
        }

        return ApiResponse.error(c, "Internal Server Error", 500, {
            message: err.message,
            stack: err.stack,
        })
    })

    return app
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
        headers: { "Content-Type": "application/json", ...headers },
    }

    if (body) {
        init.body = JSON.stringify(body)
    }

    const res = await app.request(path, init)
    const json = await res.json() as any

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
        body: { email: userData.email, password: userData.password },
    })
    if (!loginRes.body.success) {
        throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`)
    }

    return {
        accessToken: loginRes.body.data.accessToken,
        refreshToken: loginRes.body.data.refreshToken,
        headers: { Authorization: `Bearer ${loginRes.body.data.accessToken}` },
        user: loginRes.body.data.user,
    }
}
