import type { Draft } from "../entities/draft.entity"

type PublicFields = Pick<
    Draft,
    "id" | "jobId" | "currentRevisionId" | "reviewStatus" | "createdAt" | "updatedAt"
>

export class DraftSerializer {
    static single(value: PublicFields) {
        return {
            id: value.id,
            jobId: value.jobId,
            currentRevisionId: value.currentRevisionId,
            reviewStatus: value.reviewStatus,
            createdAt: value.createdAt,
            updatedAt: value.updatedAt
        }
    }

    static collection(values: PublicFields[]) {
        return values.map((value) => this.single(value))
    }
}
