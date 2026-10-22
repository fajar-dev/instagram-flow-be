import type { Context } from "hono"
import { ApiResponse } from "../../core/helpers/response"
import { actor } from "../shared/request-context"
import { resourceId } from "../shared/validators/shared.validator"
import type { PublicationInput } from "./validators/publication.validator"
import { PublicationSerializer } from "./serializers/publication.serialize"
import { PublishingService } from "./publishing.service"

export class PublishingController {
    constructor(private readonly service: PublishingService) {}

    async index(c: Context) {
        return ApiResponse.success(
            c,
            PublicationSerializer.collection(
                await this.service.list(resourceId.parse(c.req.param("draftId"))),
                c
            )
        )
    }

    async create(c: Context) {
        const data = await this.service.enqueue(
            actor(c),
            resourceId.parse(c.req.param("draftId")),
            c.req.valid("json" as never) as PublicationInput,
            c.req.header("Idempotency-Key") || ""
        )
        return ApiResponse.success(
            c,
            PublicationSerializer.single(data, c),
            "Publication queued",
            202
        )
    }

    async cancel(c: Context) {
        return ApiResponse.success(
            c,
            PublicationSerializer.single(
                await this.service.cancel(actor(c), resourceId.parse(c.req.param("publicationId"))),
                c
            )
        )
    }

    async retry(c: Context) {
        return ApiResponse.success(
            c,
            PublicationSerializer.single(
                await this.service.retry(actor(c), resourceId.parse(c.req.param("publicationId"))),
                c
            )
        )
    }
}
