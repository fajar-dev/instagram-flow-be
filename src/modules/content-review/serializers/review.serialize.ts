import type { Review } from "../entities/review.entity"

type PublicFields = Pick<
    Review,
    | "id"
    | "draftId"
    | "revisionId"
    | "reviewerId"
    | "decision"
    | "notes"
    | "contentHash"
    | "createdAt"
    | "updatedAt"
>

export class ReviewSerializer {
    static single(value: PublicFields) {
        return {
            id: value.id,
            draftId: value.draftId,
            revisionId: value.revisionId,
            reviewerId: value.reviewerId,
            decision: value.decision,
            notes: value.notes,
            contentHash: value.contentHash,
            createdAt: value.createdAt,
            updatedAt: value.updatedAt
        }
    }

    static collection(values: PublicFields[]) {
        return values.map((value) => this.single(value))
    }
}
