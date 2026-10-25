import { JobNotification } from "../ai-job/notifications/notification.entity"
import { Publication } from "../publishing/entities/publication.entity"
import { Batch } from "../content/entities/batch.entity"
import { Asset } from "../content/media/entities/asset.entity"
import { Job } from "../ai-job/entities/job.entity"
import { Dispatch } from "../ai-job/entities/dispatch.entity"
import { AiResult } from "../ai-job/workflow/entities/ai-result.entity"
import { Render } from "../content/media/entities/render.entity"
import { Draft } from "../content-draft/entities/draft.entity"
import { Rejection } from "../content-draft/entities/rejection.entity"
import { AuditLog } from "../reporting/entities/audit-log.entity"
import { Setting } from "../settings/entities/setting.entity"

export interface WorkflowRecords {
    notification: JobNotification
    publication: Publication
    batch: Batch
    asset: Asset
    job: Job
    dispatch: Dispatch
    aiResult: AiResult
    render: Render
    draft: Draft
    rejection: Rejection
    auditLog: AuditLog
    setting: Setting
}

export const workflowEntityMap = {
    notification: JobNotification,
    publication: Publication,
    batch: Batch,
    asset: Asset,
    job: Job,
    dispatch: Dispatch,
    aiResult: AiResult,
    render: Render,
    draft: Draft,
    rejection: Rejection,
    auditLog: AuditLog,
    setting: Setting
}

export const workflowEntities = Object.values(workflowEntityMap)
