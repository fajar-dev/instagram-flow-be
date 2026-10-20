import { JobDetailsSerializer } from "./serializers/job-details.serialize"
import type { Context } from "hono"
import { ApiResponse } from "../../core/helpers/response"
import { JobService } from "./job.service"
import { actor, id, key } from "../shared/request-context"

export class JobController {
    constructor(private readonly service: JobService) {}

    async process(c: Context) {
        const input: { output: "feed" | "story" } = c.req.valid("json" as never)
        const job = await this.service.process(actor(c), id(c, "batchId"), input.output, key(c))
        return ApiResponse.success(
            c,
            { batchId: job.batchId, jobId: job.id, status: job.status },
            "Success",
            202
        )
    }

    async retry(c: Context) {
        const next = await this.service.retry(actor(c), id(c, "jobId"), key(c))
        return ApiResponse.success(
            c,
            { batchId: next.batchId, jobId: next.id, status: next.status },
            "Success",
            202
        )
    }

    async details(c: Context) {
        const result = await this.service.details(id(c, "jobId"))
        return ApiResponse.success(c, JobDetailsSerializer.single(result))
    }
}
