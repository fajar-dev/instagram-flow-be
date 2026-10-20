import { config } from "../../config/config"
import { BadRequestException, ConflictException } from "../../core/exceptions/base"
import type { User } from "../user/entities/user.entity"
import type { IWorkflowRepository } from "../shared/interfaces/workflow.repository.interface"
import { contentHash, id } from "../shared/workflow.helpers"
import { WorkflowContextService } from "../shared/context.service"

export class JobService {
    constructor(
        private readonly repository: IWorkflowRepository,
        private readonly context: WorkflowContextService
    ) {}

    async process(
        actor: User,
        batchId: string,
        requestedOutputs: string[],
        key: string,
        retryOfJobId?: string
    ) {
        return this.repository.transaction(async (store) => {
            const batch = await this.context.batch(batchId, store, true)
            const existing = (await store.find("job", { batchId, idempotencyKey: key }))[0]
            if (existing) {
                if (
                    contentHash(existing.requestedOutputs) !== contentHash(requestedOutputs) ||
                    existing.retryOfJobId !== (retryOfJobId || null)
                ) {
                    throw new ConflictException("Idempotency key was used for a different request")
                }
                return existing
            }
            const jobs = await store.find("job", { batchId })
            if (jobs.some((j) => ["QUEUED", "DISPATCHED", "PROCESSING"].includes(j.status))) {
                throw new ConflictException("Batch already has an active job")
            }
            if (retryOfJobId) {
                const old = jobs.find((j) => j.id === retryOfJobId)
                if (old && !old.retryable) {
                    throw new ConflictException("Job cannot be retried")
                }
                if (!old || old.status !== "FAILED") {
                    throw new ConflictException("Only failed jobs can be retried")
                }
            } else if (jobs.length) {
                throw new ConflictException("Use retry for a failed job")
            }
            const assets = (await store.find("asset", { batchId })).filter((a) => !a.deletedAt)
            if (!batch.publicationPermission || !assets.length) {
                throw new BadRequestException("Publication permission and images are required")
            }
            if (assets.length > config.jobs.maxJobFiles) {
                throw new BadRequestException(
                    `Workflow supports at most ${config.jobs.maxJobFiles} images per job; split this batch or upgrade workflow`
                )
            }
            const job = await store.save("job", {
                id: id(),
                batchId,
                requestedOutputs,
                status: "QUEUED",
                attemptNo: jobs.length + 1,
                createdBy: actor.id,
                idempotencyKey: key,
                retryOfJobId: retryOfJobId || null,
                retryable: true
            })
            await store.save("dispatch", {
                id: id(),
                jobId: job.id,
                eventId: id(),
                status: "PENDING",
                attemptNo: 0,
                nextRetryAt: new Date()
            })
            await store.save("batch", { ...batch, status: "PROCESSING" })
            await this.context.audit(
                store,
                actor,
                retryOfJobId ? "JOB_RETRIED" : "JOB_QUEUED",
                "job",
                job.id
            )
            return job
        })
    }

    async retry(actor: User, jobId: string, key: string) {
        const job = await this.context.job(jobId)
        return this.process(actor, job.batchId, job.requestedOutputs, key, job.id)
    }

    async details(jobId: string) {
        const job = await this.context.job(jobId)
        const batch = await this.context.batch(job.batchId)
        const assets = (await this.repository.find("asset", { batchId: batch.id })).filter(
            (a) => !a.deletedAt
        )
        const aiResult = (await this.repository.find("aiResult", { jobId }))[0] || null
        const draft = (await this.repository.find("draft", { jobId }))[0] || null
        const revisions = draft ? await this.repository.find("revision", { draftId: draft.id }) : []
        const renders = aiResult
            ? await this.repository.find("render", { aiResultId: aiResult.id })
            : []
        const revision = revisions.find((r) => r.id === draft?.currentRevisionId) || null
        return {
            job,
            batch,
            assets,
            aiResult,
            draft,
            revision,
            revisions,
            reviews: draft ? await this.repository.find("review", { draftId: draft.id }) : [],
            renders: renders.map((render) => ({
                ...render,
                renderState:
                    revision && revisions[0]?.contentHash !== revision.contentHash
                        ? "OUTDATED"
                        : render.renderState
            }))
        }
    }
}
