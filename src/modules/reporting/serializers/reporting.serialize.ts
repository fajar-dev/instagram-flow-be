import { resolveStorageUrl } from "../../../core/helpers/storage-url"
import { BatchSerializer } from "../../content/serializers/batch.serialize"
import { AssetSerializer } from "../../content/media/serializers/asset.serialize"
import { JobSerializer } from "../../ai-job/serializers/job.serialize"
import { DraftSerializer } from "../../content-review/serializers/draft.serialize"
import { AuditLogSerializer } from "./audit-log.serialize"

const serializers = {
    batch: BatchSerializer,
    asset: AssetSerializer,
    job: JobSerializer,
    draft: DraftSerializer,
    auditLog: AuditLogSerializer
}

export class ReportingSerializer {
    static async collection(kind: keyof typeof serializers, values: unknown[]) {
        return Promise.all(
            values.map(async (value) => {
                const item = value as Parameters<(typeof serializers)[typeof kind]["single"]>[0] & {
                    projectName?: string
                    uploaderName?: string
                    uploaderPhoto?: string | null
                }
                const serialized = serializers[kind].single(item as never)
                return kind === "auditLog"
                    ? serialized
                    : {
                          ...serialized,
                          projectName: item.projectName,
                          uploaderName: item.uploaderName,
                          uploaderPhoto: await resolveStorageUrl(item.uploaderPhoto)
                      }
            })
        )
    }
}
