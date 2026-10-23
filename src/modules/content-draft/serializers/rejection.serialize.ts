import type { Rejection } from "../entities/rejection.entity"

type PublicFields = Pick<
    Rejection,
    "id" | "draftId" | "rejectedBy" | "notes" | "contentHash" | "createdAt" | "updatedAt"
>

export class RejectionSerializer {
    static single(value: PublicFields) {
        return {
            id: value.id,
            draftId: value.draftId,
            rejectedBy: value.rejectedBy,
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
