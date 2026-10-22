import { describe, expect, test } from "bun:test"
import { createConfig } from "../src/config/config"

describe("runtime configuration", () => {
    test("derives URLs and uses one configured bucket", () => {
        const config = createConfig({ PORT: "4100", MINIO_BUCKET: "avatars" })
        expect(config.app.appUrl).toBe("http://localhost:4100")
        expect(config.minio.bucket).toBe("avatars")
        expect(config.database.sync).toBe(false)
    })

    test("retains explicit deployment overrides", () => {
        const config = createConfig({
            APP_URL: "https://api.example.com",
            DB_TEST_NAME: "integration_test"
        })
        expect(config.app.appUrl).toBe("https://api.example.com")
        expect(config.database.testName).toBe("integration_test")
    })

    test("rejects invalid numeric values without disclosing their contents", () => {
        for (const key of [
            "PORT",
            "DB_PORT",
            "REDIS_PORT",
            "MINIO_PORT",
            "SMTP_PORT",
            "MAX_UPLOAD_MB",
            "N8N_WEBHOOK_TIMEOUT_MS",
            "OUTBOX_RETRY_MAX"
        ]) {
            for (const value of ["-1", "0", "1.5", "secret-invalid-value"]) {
                expect(() => createConfig({ [key]: value })).toThrow(
                    `[CONFIG] ${key} must be a positive integer`
                )
            }
        }
    })

    test("keeps safe defaults and enforced upper limits", () => {
        const config = createConfig({
            MAX_BATCH_FILES: "100",
            MAX_FILES_PER_AI_JOB: "100",
            SIGNED_MEDIA_URL_TTL_SECONDS: "100000",
            PORT: ""
        })
        expect(config.app.port).toBe(4000)
        expect(config.media.maxBatchFiles).toBe(19)
        expect(config.jobs.maxJobFiles).toBe(19)
        expect(config.media.signedTtl).toBe(86400)
    })

    test("production startup requires JWT secrets but no unused API key", () => {
        const config = createConfig({
            NODE_ENV: "production",
            JWT_SECRET: "test-access-secret",
            JWT_REFRESH_SECRET: "test-refresh-secret"
        })
        expect(config.app.isProduction).toBe(true)
        expect("apiKey" in config.app).toBe(false)
        expect(() =>
            createConfig({ NODE_ENV: "production", JWT_SECRET: "test-access-secret" })
        ).toThrow("JWT_REFRESH_SECRET")
    })

    test("requires production secrets", () => {
        expect(() => createConfig({ NODE_ENV: "production" })).toThrow("JWT_SECRET")
    })
})
