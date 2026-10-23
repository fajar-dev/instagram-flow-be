import type { JobService } from "../job.service"
import { BatchSerializer } from "../../content/serializers/batch.serialize"
import { AssetSerializer } from "../../content/media/serializers/asset.serialize"
import { RenderSerializer } from "../../content/media/serializers/render.serialize"
import { JobSerializer } from "./job.serialize"
import { AiResultSerializer } from "../workflow/serializers/ai-result.serialize"
import { DraftSerializer } from "../../content-draft/serializers/draft.serialize"
import { RejectionSerializer } from "../../content-draft/serializers/rejection.serialize"

export class JobDetailsSerializer {
    static single(value: Awaited<ReturnType<JobService["details"]>>) {
        return {
            uploader: { id: value.uploader.id, name: value.uploader.name },
            job: JobSerializer.single(value.job),
            batch: BatchSerializer.single(value.batch),
            assets: AssetSerializer.collection(value.assets),
            aiResult: value.aiResult ? AiResultSerializer.single(value.aiResult) : null,
            draft: value.draft ? DraftSerializer.single(value.draft) : null,
            rejections: RejectionSerializer.collection(value.rejections),
            decisions: value.decisions.map((decision) => ({
                action: decision.action,
                actorId: decision.actorId,
                actorName: decision.actorName,
                createdAt: decision.createdAt
            })),
            renders: RenderSerializer.collection(value.renders)
        }
    }
}
