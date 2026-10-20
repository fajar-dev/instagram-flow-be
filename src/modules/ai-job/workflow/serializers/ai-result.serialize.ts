import type { AiResult } from "../entities/ai-result.entity"

type PublicFields = Pick<
    AiResult,
    | "id"
    | "jobId"
    | "executionId"
    | "resultVersion"
    | "rankings"
    | "selectedAssetIds"
    | "rawCaption"
    | "rawTitle"
    | "rawHashtags"
    | "createdAt"
    | "updatedAt"
>

export class AiResultSerializer {
    static single(value: PublicFields) {
        return {
            id: value.id,
            jobId: value.jobId,
            executionId: value.executionId,
            resultVersion: value.resultVersion,
            rankings: value.rankings,
            selectedAssetIds: value.selectedAssetIds,
            rawCaption: value.rawCaption,
            rawTitle: value.rawTitle,
            rawHashtags: value.rawHashtags,
            createdAt: value.createdAt,
            updatedAt: value.updatedAt
        }
    }

    static collection(values: PublicFields[]) {
        return values.map((value) => this.single(value))
    }
}
