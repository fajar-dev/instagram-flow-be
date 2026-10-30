import { config } from "../../config/config"
import { BadRequestException, ConflictException } from "../../core/exceptions/base"
import type { IUserRepository } from "../user/interfaces/user.repository.interface"
import type { Rejection } from "../content-draft/entities/rejection.entity"
import type { User } from "../user/entities/user.entity"
import type { IWorkflowRepository } from "../shared/interfaces/workflow.repository.interface"
import { id } from "../shared/workflow.helpers"
import { WorkflowContextService } from "../shared/context.service"

export class JobService {
    constructor(
        private readonly repository: IWorkflowRepository,
        private readonly context: WorkflowContextService,
        private readonly users: Pick<IUserRepository, "findById">
    ) {}

    async process(
        actor: User,
        batchId: string,
        output: "feed" | "story",
        key: string,
        retryOfJobId?: string
    ) {
        return this.repository.transaction(async (store) => {
            const batch = await this.context.batch(batchId, store, true)
            const existing = (await store.find("job", { batchId, idempotencyKey: key }))[0]
            if (existing) {
                if (
                    existing.output !== output ||
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
                if (old && (!old.retryable || jobs.some((job) => job.attemptNo > old.attemptNo))) {
                    throw new ConflictException("Job cannot be retried")
                }
                if (!old || old.status !== "FAILED") {
                    throw new ConflictException("Only failed jobs can be retried")
                }
            } else if (jobs.length) {
                throw new ConflictException("Use retry for a failed job")
            }
            const assets = (await store.find("asset", { batchId })).filter((a) => !a.deletedAt)
            if (!assets.length) {
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
                output,
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
        return this.process(actor, job.batchId, job.output, key, job.id)
    }

    async details(jobId: string) {
        const job = await this.context.job(jobId)
        const batch = await this.context.batch(job.batchId)
        const attempts = await this.repository.find("job", { batchId: job.batchId })
        const retryable =
            job.retryable && !attempts.some((attempt) => attempt.attemptNo > job.attemptNo)
        const assets = (await this.repository.find("asset", { batchId: batch.id })).filter(
            (a) => !a.deletedAt
        )
        const aiResult = (await this.repository.find("aiResult", { jobId }))[0] || null
        const draft = (await this.repository.find("draft", { jobId }))[0] || null
        const renders = aiResult
            ? await this.repository.find("render", {
                  aiResultId: aiResult.id,
                  placement: job.output
              })
            : []
        const rejections = draft
            ? await this.repository.find("rejection", { draftId: draft.id })
            : []
        const uploader = await this.users.findById(batch.uploaderId)
        return {
            uploader: { id: batch.uploaderId, name: uploader?.name ?? null },
            job: { ...job, retryable },
            batch,
            assets,
            aiResult,
            draft,
            rejections,
            decisions: draft ? await this.decisions(draft.id, rejections) : [],
            renders
        }
    }

    private async decisions(draftId: string, rejections: Rejection[]) {
        const records: {
            action: "PUBLISH" | "REJECTED" | "CANCELLED"
            actorId: number | null
            createdAt: Date
        }[] = rejections.map((rejection) => ({
            action: "REJECTED",
            actorId: rejection.rejectedBy,
            createdAt: rejection.createdAt
        }))
        const publications = await this.repository.find("publication", { draftId })
        for (const publication of publications) {
            records.push({
                action: "PUBLISH",
                actorId: publication.createdBy,
                createdAt: publication.createdAt
            })
            if (publication.status === "CANCELLED") {
                const cancellations = await this.repository.find("auditLog", {
                    entityType: "publication",
                    entityId: publication.id,
                    event: "PUBLICATION_CANCELLED"
                })
                for (const cancellation of cancellations) {
                    records.push({
                        action: "CANCELLED",
                        actorId: cancellation.actorId,
                        createdAt: cancellation.createdAt
                    })
                }
            }
        }
        return Promise.all(
            records
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
                .map(async (record) => {
                    const user =
                        record.actorId === null ? null : await this.users.findById(record.actorId)
                    return { ...record, actorName: user?.name ?? null }
                })
        )
    }
}
