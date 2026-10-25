/** Single runtime environment parser. Never log environment values or secrets. */
export function createConfig(environment: Record<string, string | undefined>) {
    const env = environment.NODE_ENV || "development"
    const isProduction = env === "production"

    function requireEnv(key: string, fallback?: string): string {
        const value = environment[key] || fallback
        if (!value && isProduction) {
            throw new Error(`[CONFIG] Missing required environment variable: ${key}`)
        }
        return value || ""
    }

    function number(key: string, fallback: number): number {
        const raw = environment[key]
        if (raw === undefined || raw.trim() === "") {
            return fallback
        }
        const value = Number(raw)
        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new Error(`[CONFIG] ${key} must be a positive integer`)
        }
        return value
    }

    const port = number("PORT", 4000)
    const bucket = environment.MINIO_BUCKET || "hono-be"

    const telegramToken = (environment.TELEGRAM_BOT_TOKEN || "").trim()
    const telegramChat = (environment.TELEGRAM_CHAT_ID || "").trim()
    if (Boolean(telegramToken) !== Boolean(telegramChat)) {
        throw new Error(
            "[CONFIG] TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be configured together"
        )
    }
    const frontendUrl = environment.FRONTEND_URL || "http://localhost:3000"
    if (telegramToken) {
        const url = new URL(frontendUrl)
        if (
            !["http:", "https:"].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.search ||
            url.hash
        ) {
            throw new Error(
                "[CONFIG] FRONTEND_URL must be an HTTP(S) application URL without credentials, query or hash"
            )
        }
    }

    return {
        telegram: { botToken: telegramToken, chatId: telegramChat, frontendUrl },
        app: {
            name: environment.APP_NAME || "hono-be",
            hostname: environment.APP_HOSTNAME || "0.0.0.0",
            port,
            appUrl: environment.APP_URL || `http://localhost:${port}`,
            frontendUrl: environment.FRONTEND_URL || "http://localhost:3000",
            env,
            isProduction,
            jwtSecret: requireEnv(
                "JWT_SECRET",
                isProduction ? undefined : "dev-jwt-secret-change-me"
            ),
            jwtRefreshSecret: requireEnv(
                "JWT_REFRESH_SECRET",
                isProduction ? undefined : "dev-jwt-refresh-secret-change-me"
            )
        },
        media: {
            maxUploadMb: number("MAX_UPLOAD_MB", 15),
            maxBatchFiles: Math.min(19, number("MAX_BATCH_FILES", 19)),
            signedTtl: Math.min(86400, number("SIGNED_MEDIA_URL_TTL_SECONDS", 3600))
        },
        jobs: {
            maxJobFiles: Math.min(19, number("MAX_FILES_PER_AI_JOB", 19)),
            processingTimeout: Math.max(7500, number("PROCESSING_TIMEOUT_SECONDS", 7500)),
            retryMax: number("OUTBOX_RETRY_MAX", 5),
            retryBackoff: number("OUTBOX_RETRY_BACKOFF_SECONDS", 30)
        },
        n8n: {
            webhookUrl: environment.N8N_WEBHOOK_URL || "",
            webhookToken: environment.N8N_WEBHOOK_AUTH_TOKEN || "",
            serviceToken: environment.N8N_BACKEND_SERVICE_TOKEN || "",
            timeoutMs: number("N8N_WEBHOOK_TIMEOUT_MS", 15000)
        },
        redis: {
            host: environment.REDIS_HOST || "127.0.0.1",
            port: number("REDIS_PORT", 6379),
            password: environment.REDIS_PASSWORD || "",
            tls: environment.REDIS_TLS === "true"
        },
        instagram: {
            credentialsFile:
                environment.INSTAGRAM_CREDENTIALS_FILE || "secrets/instagram-accounts.json"
        },
        database: {
            type: "mysql" as const,
            host: environment.DB_HOST || "127.0.0.1",
            port: number("DB_PORT", 3306),
            user: environment.DB_USER || "root",
            pass: environment.DB_PASS || "",
            name: environment.DB_NAME || "hono_be",
            testName: environment.DB_TEST_NAME || "hono_be_test",
            // Schema changes are managed exclusively through migrations in every environment.
            sync: false
        },
        mail: {
            host: environment.SMTP_HOST || "smtp.gmail.com",
            port: number("SMTP_PORT", 587),
            user: environment.SMTP_USER || "",
            pass: environment.SMTP_PASS || "",
            from: environment.SMTP_FROM || '"Hono BE" <noreply@example.com>'
        },
        google: {
            clientId: environment.GOOGLE_CLIENT_ID || "",
            clientSecret: environment.GOOGLE_CLIENT_SECRET || ""
        },
        microsoft: {
            clientId: environment.MICROSOFT_CLIENT_ID || "",
            clientSecret: environment.MICROSOFT_CLIENT_SECRET || "",
            tenantId: environment.MICROSOFT_TENANT_ID || "common",
            redirectUri: environment.MICROSOFT_REDIRECT_URI || ""
        },
        minio: {
            endPoint: environment.MINIO_ENDPOINT || "127.0.0.1",
            port: number("MINIO_PORT", 9000),
            useSSL: environment.MINIO_USE_SSL === "true",
            accessKey: environment.MINIO_ACCESS_KEY || "",
            secretKey: environment.MINIO_SECRET_KEY || "",
            // One private bucket for avatars, content originals, previews and renders.
            bucket
        }
    }
}

export const config = createConfig(process.env)
