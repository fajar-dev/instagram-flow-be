import { config } from "../../config/config"
import { BadRequestException, ConflictException } from "../../core/exceptions/base"
import type { User } from "../user/entities/user.entity"
import type { IWorkflowRepository } from "../shared/interfaces/workflow.repository.interface"
import type { BatchInput } from "./validators/batch.validator"
import type { Batch } from "./entities/batch.entity"
import { id } from "../shared/workflow.helpers"
import { WorkflowContextService } from "../shared/context.service"

export class BatchService {
    constructor(
        private readonly repository: IWorkflowRepository,
        private readonly context: WorkflowContextService
    ) {}

    uploadLimits() {
        return {
            maxUploadMb: config.media.maxUploadMb,
            maxBatchFiles: config.media.maxBatchFiles,
            maxJobFiles: config.jobs.maxJobFiles
        }
    }

    getById(batchId: string) {
        return this.context.batch(batchId)
    }

    async createBatch(actor: User, input: BatchInput, key: string) {
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Jakarta",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date())
        if (input.documentationDate > today) {
            throw new BadRequestException("Documentation date cannot be in the future")
        }
        // Unique constraint is the final guard for parallel submissions.
        const existing = (
            await this.repository.find("batch", { uploaderId: actor.id, idempotencyKey: key })
        )[0]
        const replay = (batch: Batch) => {
            if (
                Object.entries(input).some(
                    ([field, value]) => batch[field as keyof Batch] !== value
                )
            ) {
                throw new ConflictException("Idempotency key was used for a different request")
            }
            return batch
        }
        if (existing) {
            return replay(existing)
        }
        try {
            return await this.repository.transaction(async (store) => {
                const batch = await store.save("batch", {
                    id: id(),
                    ...input,
                    uploaderId: actor.id,
                    status: "DRAFT",
                    idempotencyKey: key
                })
                await this.context.audit(store, actor, "BATCH_CREATED", "batch", batch.id)
                return batch
            })
        } catch (error) {
            const duplicate = (
                await this.repository.find("batch", { uploaderId: actor.id, idempotencyKey: key })
            )[0]
            if (duplicate) {
                return replay(duplicate)
            }
            throw error
        }
    }
}
