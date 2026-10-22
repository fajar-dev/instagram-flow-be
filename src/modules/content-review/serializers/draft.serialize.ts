import type { Draft } from "../entities/draft.entity"

type PublicFields = Pick<
    Draft,
    | "id"
    | "jobId"
    | "title"
    | "caption"
    | "hashtags"
    | "location"
    | "activity"
    | "contentHash"
    | "reviewStatus"
    | "createdAt"
    | "updatedAt"
>

export class DraftSerializer {
    static single(value: PublicFields) {
        return {
            id: value.id,
            jobId: value.jobId,
            title: value.title,
            caption: value.caption,
            hashtags: value.hashtags,
            location: value.location,
            activity: value.activity,
            contentHash: value.contentHash,
            reviewStatus: value.reviewStatus,
            createdAt: value.createdAt,
            updatedAt: value.updatedAt
        }
    }

    static collection(values: PublicFields[]) {
        return values.map((value) => this.single(value))
    }
}
