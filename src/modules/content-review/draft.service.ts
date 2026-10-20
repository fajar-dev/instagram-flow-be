import { lockDraftProject } from "../shared/draft-project"
import { ConflictException } from "../../core/exceptions/base"
import type { User } from "../user/entities/user.entity"
import type { IWorkflowRepository } from "../shared/interfaces/workflow.repository.interface"
import type { RejectInput } from "./validators/draft.validator"
import { id } from "../shared/workflow.helpers"
import { WorkflowContextService } from "../shared/context.service"

export class DraftService {
    constructor(
        private readonly repository: IWorkflowRepository,
        private readonly context: WorkflowContextService
    ) {}

    async reject(actor: User, draftId: string, input: RejectInput) {
        return this.repository.transaction(async (store) => {
            const { draft, batch } = await lockDraftProject(store, draftId)
            if (draft.contentHash !== input.contentHash) {
                throw new ConflictException("Content has changed; reload before deciding")
            }
            if ((await store.find("publication", { batchId: batch.id })).length) {
                throw new ConflictException("Project already has a publication")
            }
            if (draft.reviewStatus === "REJECTED") {
                return draft
            }
            if (draft.reviewStatus !== "READY_FOR_REVIEW") {
                throw new ConflictException("Only ready content can be rejected")
            }
            await store.save("review", {
                id: id(),
                draftId,
                reviewerId: actor.id,
                decision: "REJECTED",
                notes: input.notes,
                contentHash: input.contentHash
            })
            const saved = await store.save("draft", { ...draft, reviewStatus: "REJECTED" })
            await this.context.audit(store, actor, "DRAFT_REJECTED", "draft", draftId, {
                decision: "REJECTED",
                contentHash: draft.contentHash
            })
            return saved
        })
    }
}
