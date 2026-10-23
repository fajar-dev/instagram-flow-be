import { DraftSerializer } from "./serializers/draft.serialize"
import { ApiResponse } from "../../core/helpers/response"
import type { Context } from "hono"
import { DraftService } from "./draft.service"
import { actor, id } from "../shared/request-context"

export class DraftController {
    constructor(private readonly service: DraftService) {}

    async reject(c: Context) {
        const result = await this.service.reject(
            actor(c),
            id(c, "draftId"),
            c.req.valid("json" as never)
        )
        return ApiResponse.success(c, DraftSerializer.single(result))
    }
}
