import type { JobNotificationService } from "../notifications/notification.service"
import { config } from "../../../config/config"
import { BadRequestException, ConflictException } from "../../../core/exceptions/base"
import type { IWorkflowRepository } from "../../shared/interfaces/workflow.repository.interface"
import type { RenderService } from "../../content/media/render.service"
import type { ResultInput, FailureInput } from "./validators/workflow.validator"
import { contentHash, id } from "../../shared/workflow.helpers"
import { WorkflowContextService } from "../../shared/context.service"
import { MediaService } from "../../content/media/media.service"

export class WorkflowService {
    constructor(
        private readonly repository: IWorkflowRepository,
        private readonly renders: RenderService,
        private readonly context: WorkflowContextService,
        private readonly mediaAccess: MediaService,
        private readonly notifications: JobNotificationService
    ) {}

    async claim(jobId: string, executionId: string, eventId: string) {
        return this.repository.transaction(async (store) => {
            const job = await this.context.job(jobId, store, true)
            const dispatch = (await store.find("dispatch", { jobId }))[0]
            if (!dispatch || dispatch.eventId !== eventId) {
                throw new ConflictException("Unknown dispatch event")
            }
            // A retried HTTP claim from the same execution must survive a lost response.
            if (job.status === "PROCESSING" && job.lastExecutionId === executionId) {
                return { claimed: true }
            }
            if (!["QUEUED", "DISPATCHED"].includes(job.status)) {
                return { claimed: false }
            }
            await store.save("job", {
                ...job,
                status: "PROCESSING",
                startedAt: new Date(),
                lastExecutionId: executionId
            })
            await this.context.audit(store, null, "JOB_CLAIMED", "job", job.id)
            return { claimed: true }
        })
    }

    async manifest(jobId: string) {
        const job = await this.context.job(jobId)
        if (job.status !== "PROCESSING") {
            throw new ConflictException("Job has not been claimed")
        }
        const batch = await this.context.batch(job.batchId)
        const assets = (await this.repository.find("asset", { batchId: batch.id })).filter(
            (a) => !a.deletedAt
        )
        return {
            jobId,
            designReferences: await this.mediaAccess.designReferences(),
            projectName: batch.projectName,
            clientName: batch.clientName,
            activity: batch.activity,
            location: batch.location,
            description: batch.description,
            reviewUrl: `${config.app.frontendUrl}/content/${jobId}`,
            assets: await Promise.all(
                assets.map(async (a) => {
                    const previewUrl = await this.mediaAccess.signedUrl(
                        a.id,
                        Math.max(config.media.signedTtl, 7500)
                    )
                    return {
                        assetId: a.id,
                        aiImageUrl: previewUrl,
                        renderImageUrl: previewUrl,
                        description: batch.activity
                    }
                })
            )
        }
    }

    async result(jobId: string, input: ResultInput) {
        if (input.jobId !== jobId) {
            throw new BadRequestException("Job ID mismatch")
        }
        const hash = contentHash(input)
        const storedKeys: string[] = []
        try {
            return await this.repository.transaction(async (store) => {
                const job = await this.context.job(jobId, store, true)
                const previous = (await store.find("aiResult", { jobId }))[0]
                if (previous) {
                    if (previous.rawPayloadHash !== hash) {
                        throw new ConflictException("Result already exists with different content")
                    }
                    return { accepted: true, duplicate: true, jobId }
                }
                if (job.status !== "PROCESSING" || job.lastExecutionId !== input.executionId) {
                    throw new ConflictException("Stale execution callback")
                }
                const batch = await this.context.batch(job.batchId, store)
                const assets = (await store.find("asset", { batchId: job.batchId })).filter(
                    (a) => !a.deletedAt
                )
                const ids = new Set(assets.map((a) => a.id))
                if (
                    input.rankings.length !== assets.length ||
                    new Set(input.rankings.map((r) => r.assetId)).size !== assets.length ||
                    input.rankings.some((r) => !ids.has(r.assetId)) ||
                    input.selectedAssetIds.some((a) => !ids.has(a)) ||
                    new Set(input.selectedAssetIds).size !== input.selectedAssetIds.length
                ) {
                    throw new BadRequestException(
                        "Results must cover every batch asset exactly once"
                    )
                }
                if (
                    input.renders.some((r) => r.placement !== job.output) ||
                    (job.output === "story"
                        ? input.renders.length !== 1
                        : input.renders.length !== assets.length ||
                          new Set(input.renders.map((r) => r.assetId)).size !== assets.length)
                ) {
                    throw new BadRequestException("Result must contain exactly the selected output")
                }
                if (
                    job.output === "feed"
                        ? !input.caption
                        : input.caption !== "" || input.hashtags.length > 0
                ) {
                    throw new BadRequestException(
                        "Caption and hashtags must match the selected output"
                    )
                }
                const aiResultId = id()
                const safeRenders = await this.renders.create(
                    input.renders,
                    assets,
                    job.output,
                    input.selectedAssetIds[0],
                    aiResultId,
                    storedKeys
                )
                await store.save("aiResult", {
                    id: aiResultId,
                    jobId,
                    executionId: input.executionId,
                    resultVersion: input.resultVersion,
                    rankings: input.rankings,
                    selectedAssetIds: input.selectedAssetIds,
                    rawCaption: input.caption,
                    rawTitle: input.title,
                    rawHashtags: input.hashtags,
                    rawPayloadHash: hash
                })
                for (const render of safeRenders) {
                    await store.save("render", render)
                }
                const content = {
                    title: input.title,
                    caption: input.caption,
                    hashtags: input.hashtags,
                    location: batch.location,
                    activity: batch.activity
                }
                await store.save("draft", {
                    id: id(),
                    jobId,
                    decisionStatus: "READY_FOR_REVIEW",
                    ...content,
                    contentHash: contentHash(content)
                })
                await store.save("job", {
                    ...job,
                    status: "READY_FOR_REVIEW",
                    completedAt: new Date()
                })
                await store.save("batch", { ...batch, status: "COMPLETED" })
                await this.notifications.enqueue(store, jobId, batch.projectName, job.output, {
                    caption: content.caption,
                    hashtags: content.hashtags,
                    coverKey: safeRenders.find(
                        (render) => render.assetId === input.selectedAssetIds[0]
                    )!.storageKey
                })
                await this.context.audit(store, null, "JOB_READY", "job", jobId)
                return { accepted: true, jobId }
            })
        } catch (error) {
            await this.renders.cleanup(storedKeys)
            throw error
        }
    }

    async failure(jobId: string, input: FailureInput) {
        return this.repository.transaction(async (store) => {
            const job = await this.context.job(jobId, store, true)
            if (job.lastExecutionId !== input.executionId) {
                throw new ConflictException("Stale execution callback")
            }
            if (job.status === "READY_FOR_REVIEW" || job.status === "FAILED") {
                return { accepted: true, duplicate: true }
            }
            if (job.status !== "PROCESSING") {
                throw new ConflictException("Job is not processing")
            }
            // Never persist arbitrary worker text; it may contain secrets even after regex redaction.
            const safeError =
                "Workflow failed. Check the private n8n execution log and retry after fixing the cause."
            await store.save("job", {
                ...job,
                status: "FAILED",
                completedAt: new Date(),
                errorCode: "WORKFLOW_ERROR",
                safeError,
                retryable: input.retryable
            })
            await store.save("batch", { id: job.batchId, status: "FAILED" })
            await this.context.audit(store, null, "JOB_FAILED", "job", jobId)
            return { accepted: true }
        })
    }
}
