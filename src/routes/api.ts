import { publishingController } from "../modules/publishing/publishing.module"
import { publicationSchema } from "../modules/publishing/validators/publication.validator"
import { instagramController } from "../modules/instagram/instagram.module"
import { querySchema } from "../modules/shared/validators/shared.validator"
import { bodyLimit } from "hono/body-limit"
import { z } from "zod"
import { config } from "../config/config"
import { ApiResponse } from "../core/helpers/response"
import { batchController, mediaController } from "../modules/content/content.module"
import { jobController, workflowController } from "../modules/ai-job/ai-job.module"
import { draftController } from "../modules/content-review/content-review.module"
import { settingsController } from "../modules/integration/integration.module"
import { reportingController } from "../modules/reporting/reporting.module"
import { serviceOnly, workflowMutationLimit } from "../modules/shared/workflow.middleware"
import { batchSchema } from "../modules/content/validators/batch.validator"
import { processSchema } from "../modules/ai-job/validators/job.validator"
import { revisionSchema, rejectSchema } from "../modules/content-review/validators/draft.validator"
import { settingsSchema } from "../modules/integration/validators/settings.validator"
import { serveStatic } from "hono/bun"
import { swaggerUI } from "@hono/swagger-ui"
import { AppDataSource } from "../config/database"
import { storageController } from "../modules/storage/storage.module"
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"

// ── Validators ──────────────────────────────────────────────────────────────
import {
    RegisterValidator,
    LoginValidator,
    ForgotPasswordValidator,
    ResetPasswordValidator,
    RefreshTokenValidator,
    GoogleLoginValidator,
    UpdateProfileValidator,
    UpdatePasswordValidator
} from "../modules/auth/validators/auth.validator"
import { CreateUserValidator, UpdateUserValidator } from "../modules/user/validators/user.validator"

// ── Middlewares ──────────────────────────────────────────────────────────────
import { authMiddleware } from "../core/middlewares/auth.middleware"
import { validationHook } from "../core/helpers/validator"

// ── Modules (controllers wired with their dependencies) ──────────────────────
import { authController } from "../modules/auth/auth.module"
import { userController } from "../modules/user/user.module"

// ── Routes ───────────────────────────────────────────────────────────────────
const routes = new Hono()

// Auth
routes.post("/auth/register", zValidator("json", RegisterValidator, validationHook), (c) =>
    authController.register(c)
)
routes.post("/auth/login", zValidator("json", LoginValidator, validationHook), (c) =>
    authController.login(c)
)
routes.post("/auth/google", zValidator("json", GoogleLoginValidator, validationHook), (c) =>
    authController.google(c)
)
routes.post(
    "/auth/forgot-password",
    zValidator("json", ForgotPasswordValidator, validationHook),
    (c) => authController.forgotPassword(c)
)
routes.get("/auth/validate-reset-token", (c) => authController.validateResetToken(c))
routes.post(
    "/auth/reset-password",
    zValidator("json", ResetPasswordValidator, validationHook),
    (c) => authController.resetPassword(c)
)
routes.post("/auth/refresh", zValidator("json", RefreshTokenValidator, validationHook), (c) =>
    authController.refreshToken(c)
)
routes.get("/auth/me", authMiddleware, (c) => authController.me(c))
routes.put(
    "/auth/profile",
    authMiddleware,
    zValidator("json", UpdateProfileValidator, validationHook),
    (c) => authController.updateProfile(c)
)
routes.put(
    "/auth/password",
    authMiddleware,
    zValidator("json", UpdatePasswordValidator, validationHook),
    (c) => authController.updatePassword(c)
)
routes.post("/auth/logout", authMiddleware, (c) => authController.logout(c))

// User
routes.get("/user", authMiddleware, (c) => userController.index(c))
routes.get("/user/:id", authMiddleware, (c) => userController.show(c))
routes.post("/user", authMiddleware, zValidator("json", CreateUserValidator, validationHook), (c) =>
    userController.store(c)
)
routes.put(
    "/user/:id",
    authMiddleware,
    zValidator("json", UpdateUserValidator, validationHook),
    (c) => userController.update(c)
)
routes.delete("/user/:id", authMiddleware, (c) => userController.destroy(c))

// Storage
routes.post("/upload", authMiddleware, (c) => storageController.upload(c))

// Content, AI jobs, review, reporting and integration
const json = (schema: z.ZodType) => zValidator("json", schema, validationHook)
const contentBodyLimit = bodyLimit({
    maxSize: (config.media.maxUploadMb + 1) * 1024 * 1024,
    onError: (c) => ApiResponse.error(c, "Request too large", 413)
})
const callbackBodyLimit = bodyLimit({
    maxSize: 1200000,
    onError: (c) => ApiResponse.error(c, "Request too large", 413)
})

// n8n callbacks
routes.post("/jobs/:jobId/claim", serviceOnly, callbackBodyLimit, json(z.unknown()), (c) =>
    workflowController.callback(c, "claim")
)
routes.post("/jobs/:jobId/result", serviceOnly, callbackBodyLimit, json(z.unknown()), (c) =>
    workflowController.callback(c, "result")
)
routes.post("/jobs/:jobId/failure", serviceOnly, callbackBodyLimit, json(z.unknown()), (c) =>
    workflowController.callback(c, "failure")
)
routes.get("/jobs/:jobId/manifest", serviceOnly, (c) => workflowController.callback(c, "manifest"))

// Reporting
routes.get(
    "/content/counts",
    authMiddleware,
    zValidator("query", querySchema, validationHook),
    (c) => reportingController.contentCounts(c)
)
routes.get("/overview", authMiddleware, zValidator("query", querySchema, validationHook), (c) =>
    reportingController.overview(c)
)

// Content batches
routes.get("/batches/limits", authMiddleware, (c) => batchController.limits(c))
routes.post(
    "/batches",
    authMiddleware,
    workflowMutationLimit,
    contentBodyLimit,
    json(batchSchema),
    (c) => batchController.createBatch(c)
)
routes.get("/batches/:batchId", authMiddleware, (c) => batchController.batch(c))
routes.post(
    "/batches/:batchId/assets",
    authMiddleware,
    workflowMutationLimit,
    contentBodyLimit,
    (c) => mediaController.upload(c)
)
routes.post(
    "/batches/:batchId/process",
    authMiddleware,
    workflowMutationLimit,
    contentBodyLimit,
    json(processSchema),
    (c) => jobController.process(c)
)

// AI jobs
routes.get("/jobs", authMiddleware, zValidator("query", querySchema, validationHook), (c) =>
    reportingController.browse(c, "job")
)
routes.get("/jobs/:jobId", authMiddleware, (c) => jobController.details(c))
routes.get("/jobs/:jobId/result", authMiddleware, (c) => jobController.details(c))
routes.post("/jobs/:jobId/retry", authMiddleware, workflowMutationLimit, contentBodyLimit, (c) =>
    jobController.retry(c)
)

// Content review
routes.get("/review", authMiddleware, zValidator("query", querySchema, validationHook), (c) =>
    reportingController.browse(c, "draft")
)
routes.patch(
    "/drafts/:draftId",
    authMiddleware,
    workflowMutationLimit,
    contentBodyLimit,
    json(revisionSchema),
    (c) => draftController.edit(c)
)
routes.post(
    "/drafts/:draftId/reject",
    authMiddleware,
    workflowMutationLimit,
    contentBodyLimit,
    json(rejectSchema),
    (c) => draftController.reject(c)
)

// Content media
routes.get("/media", authMiddleware, zValidator("query", querySchema, validationHook), (c) =>
    reportingController.browse(c, "asset")
)
routes.get("/assets/:assetId/previews", authMiddleware, (c) => mediaController.previews(c))
routes.get("/assets/:assetId/preview", authMiddleware, (c) => mediaController.media(c))
routes.get("/assets/:assetId/download", authMiddleware, (c) => mediaController.media(c, true))
routes.delete("/assets/:assetId", authMiddleware, workflowMutationLimit, contentBodyLimit, (c) =>
    mediaController.archive(c)
)
routes.get("/renders/:renderId", authMiddleware, (c) => mediaController.render(c))

// Activity logs
routes.get("/audit-logs", authMiddleware, zValidator("query", querySchema, validationHook), (c) =>
    reportingController.browse(c, "auditLog")
)

// Integration settings
routes.get("/settings", authMiddleware, (c) => settingsController.settings(c))
routes.patch(
    "/settings",
    authMiddleware,
    workflowMutationLimit,
    contentBodyLimit,
    json(settingsSchema),
    (c) => settingsController.updateSettings(c)
)

// Instagram accounts and durable publication jobs
routes.get("/instagram/accounts", authMiddleware, (c) => instagramController.index(c))
routes.post("/instagram/accounts/:accountKey/verify", authMiddleware, workflowMutationLimit, (c) =>
    instagramController.verify(c)
)
routes.get("/drafts/:draftId/publications", authMiddleware, (c) => publishingController.index(c))
routes.post(
    "/drafts/:draftId/publications",
    authMiddleware,
    workflowMutationLimit,
    contentBodyLimit,
    json(publicationSchema),
    (c) => publishingController.create(c)
)
routes.post("/publications/:publicationId/cancel", authMiddleware, workflowMutationLimit, (c) =>
    publishingController.cancel(c)
)
routes.post("/publications/:publicationId/retry", authMiddleware, workflowMutationLimit, (c) =>
    publishingController.retry(c)
)
routes.get("/publications/:publicationId/image", authMiddleware, (c) =>
    publishingController.image(c)
)

// API documentation
routes.get("/swagger.yaml", serveStatic({ path: "./swagger.yaml" }))
routes.get("/docs", swaggerUI({ url: "/api/swagger.yaml" }))

export default routes

/** Register every endpoint while preserving the public /health and /api paths. */
export function registerRoutes(application: Hono) {
    // Health Check (untuk load balancer, K8s, monitoring)
    application.get("/health", async (c) => {
        const dbConnected = AppDataSource.isInitialized
        const status = dbConnected ? "healthy" : "degraded"
        const statusCode = dbConnected ? 200 : 503

        return c.json(
            {
                status,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: config.app.env,
                checks: {
                    database: dbConnected ? "connected" : "disconnected"
                }
            },
            statusCode
        )
    })

    application.route("/api", routes)
}
