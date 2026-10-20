import { Publication } from "../publishing/entities/publication.entity"
import { Batch } from "../content/entities/batch.entity"
import { Asset } from "../content/media/entities/asset.entity"
import { Job } from "../ai-job/entities/job.entity"
import { Dispatch } from "../ai-job/entities/dispatch.entity"
import { AiResult } from "../ai-job/workflow/entities/ai-result.entity"
import { Render } from "../content/media/entities/render.entity"
import { Draft } from "../content-review/entities/draft.entity"
import { Revision } from "../content-review/entities/revision.entity"
import { Review } from "../content-review/entities/review.entity"
import { AuditLog } from "../reporting/entities/audit-log.entity"
import { Setting } from "../integration/entities/setting.entity"

export interface WorkflowRecords {
    publication: Publication
    batch: Batch
    asset: Asset
    job: Job
    dispatch: Dispatch
    aiResult: AiResult
    render: Render
    draft: Draft
    revision: Revision
    review: Review
    auditLog: AuditLog
    setting: Setting
}

export const workflowEntityMap = {
    publication: Publication,
    batch: Batch,
    asset: Asset,
    job: Job,
    dispatch: Dispatch,
    aiResult: AiResult,
    render: Render,
    draft: Draft,
    revision: Revision,
    review: Review,
    auditLog: AuditLog,
    setting: Setting
}

export const workflowEntities = Object.values(workflowEntityMap)
