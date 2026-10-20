import { AppDataSource } from "../../../config/database"
import { workflowEntityMap } from "../../shared/entities"
import type {
    BrowseFilters,
    IReportingRepository
} from "../interfaces/reporting.repository.interface"

export class TypeOrmReportingRepository implements IReportingRepository {
    private query(kind: "job" | "asset" | "draft" | "batch", filters: Partial<BrowseFilters>) {
        const query = AppDataSource.getRepository(
            workflowEntityMap[kind] as typeof workflowEntityMap.job
        ).createQueryBuilder("item")
        if (kind === "draft") {
            query
                .innerJoin("jobs", "job", "job.id = item.job_id")
                .innerJoin("batches", "batch", "batch.id = job.batch_id")
        } else if (kind !== "batch") {
            query.innerJoin("batches", "batch", "batch.id = item.batch_id")
        }
        const batch = kind === "batch" ? "item" : "batch"
        if (filters.uploaderId) {
            query.andWhere(`${batch}.uploader_id = :uploader`, { uploader: filters.uploaderId })
        }
        if (filters.q) {
            query.andWhere(`${batch}.project_name LIKE :q`, { q: `%${filters.q}%` })
        }
        if (filters.batchId) {
            query.andWhere(`${batch}.id = :batchId`, { batchId: filters.batchId })
        }
        if (filters.days) {
            query.andWhere("item.created_at >= :since", {
                since: new Date(Date.now() - filters.days * 86400000)
            })
        }
        if (filters.status && kind !== "asset") {
            query.andWhere(`item.${kind === "draft" ? "review_status" : "status"} = :status`, {
                status: filters.status
            })
        }
        if (kind === "asset") {
            query.andWhere("item.deleted_at IS NULL")
        }
        if (filters.output && kind === "job") {
            query.andWhere("JSON_CONTAINS(item.requested_outputs, :output)", {
                output: JSON.stringify(filters.output)
            })
        }
        return query
    }

    async browse(kind: "job" | "asset" | "draft" | "auditLog" | "batch", filters: BrowseFilters) {
        const query =
            kind === "auditLog"
                ? AppDataSource.getRepository(workflowEntityMap.auditLog).createQueryBuilder("item")
                : this.query(kind, filters)
        if (kind === "auditLog" && filters.q) {
            query.andWhere("(item.entity_id = :q OR item.event LIKE :search)", {
                q: filters.q,
                search: `%${filters.q}%`
            })
        }
        if (kind !== "auditLog") {
            const batch = kind === "batch" ? "item" : "batch"
            query
                .addSelect(`${batch}.project_name`, "projectName")
                .innerJoin("users", "uploader", `uploader.id = ${batch}.uploader_id`)
                .addSelect("uploader.name", "uploaderName")
                .addSelect("uploader.photo", "uploaderPhoto")
        } else if (filters.days) {
            query.andWhere("item.created_at >= :since", {
                since: new Date(Date.now() - filters.days * 86400000)
            })
        }
        const total = await query.getCount()
        const { entities, raw } = await query
            .orderBy("item.createdAt", "DESC")
            .addOrderBy("item.id", "DESC")
            .skip((filters.page - 1) * filters.limit)
            .take(filters.limit)
            .getRawAndEntities()
        const metadata = new Map(raw.map((row) => [row.item_id, row]))
        const data = entities.map((item) =>
            kind === "auditLog"
                ? item
                : {
                      ...item,
                      projectName: metadata.get(item.id)?.projectName,
                      uploaderName: metadata.get(item.id)?.uploaderName,
                      uploaderPhoto: metadata.get(item.id)?.uploaderPhoto
                  }
        )
        return { data, total }
    }

    async contentCounts(days?: number): Promise<Record<string, number>> {
        // Match the same date scope and joins as the lists, without fetching rows.
        const groups = await Promise.all([
            this.query("job", { days })
                .andWhere("item.status IN (:...statuses)", {
                    statuses: ["QUEUED", "DISPATCHED", "PROCESSING", "FAILED"]
                })
                .select("item.status", "status")
                .addSelect("COUNT(*)", "count")
                .groupBy("item.status")
                .getRawMany<{ status: string; count: string }>(),
            this.query("draft", { days })
                .select("item.review_status", "status")
                .addSelect("COUNT(*)", "count")
                .groupBy("item.review_status")
                .getRawMany<{ status: string; count: string }>()
        ])
        const counts: Record<string, number> = Object.fromEntries(
            [
                "QUEUED",
                "DISPATCHED",
                "PROCESSING",
                "FAILED",
                "READY_FOR_REVIEW",
                "PUBLISH",
                "REJECTED"
            ].map((status) => [status, 0])
        )
        for (const row of groups.flat()) {
            counts[row.status] = Number(row.count)
        }
        return counts
    }

    async overview(days?: number) {
        const count = (kind: "job" | "asset" | "draft" | "batch", status?: string) =>
            this.query(kind, { days, status }).getCount()
        const [batches, assets, queued, dispatched, processing, ready, failed, publish] =
            await Promise.all([
                count("batch"),
                count("asset"),
                count("job", "QUEUED"),
                count("job", "DISPATCHED"),
                count("job", "PROCESSING"),
                count("draft", "READY_FOR_REVIEW"),
                count("job", "FAILED"),
                count("draft", "PUBLISH")
            ])
        return {
            batches,
            assets,
            processing: queued + dispatched + processing,
            ready,
            failed,
            publish
        }
    }
}
