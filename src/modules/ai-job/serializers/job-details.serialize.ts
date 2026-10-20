import type { JobService } from "../job.service"
import { BatchSerializer } from "../../content/serializers/batch.serialize"
import { AssetSerializer } from "../../content/media/serializers/asset.serialize"
import { RenderSerializer } from "../../content/media/serializers/render.serialize"
import { JobSerializer } from "./job.serialize"
import { AiResultSerializer } from "../workflow/serializers/ai-result.serialize"
import { DraftSerializer } from "../../content-review/serializers/draft.serialize"
import { ReviewSerializer } from "../../content-review/serializers/review.serialize"

export class JobDetailsSerializer {
    static single(value: Awaited<ReturnType<JobService["details"]>>) {
        return {
            job: JobSerializer.single(value.job),
            batch: BatchSerializer.single(value.batch),
            assets: AssetSerializer.collection(value.assets),
            aiResult: value.aiResult ? AiResultSerializer.single(value.aiResult) : null,
            draft: value.draft ? DraftSerializer.single(value.draft) : null,
            reviews: ReviewSerializer.collection(value.reviews),
            renders: RenderSerializer.collection(value.renders)
        }
    }
}
