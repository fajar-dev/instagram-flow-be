import { AssetSerializer } from "./serializers/asset.serialize"
import { ApiResponse } from "../../../core/helpers/response"
import type { Context } from "hono"
import { BadRequestException } from "../../../core/exceptions/base"
import { MediaService } from "./media.service"
import { actor, id, binary } from "../../shared/request-context"

export class MediaController {
    constructor(private readonly service: MediaService) {}

    async upload(c: Context) {
        const body = await c.req.parseBody()
        if (!(body.file instanceof File)) {
            throw new BadRequestException("A file is required")
        }
        const result = await this.service.upload(actor(c), id(c, "batchId"), body.file)
        return ApiResponse.success(c, AssetSerializer.single(result))
    }

    async archive(c: Context) {
        return ApiResponse.success(c, await this.service.deleteAsset(actor(c), id(c, "assetId")))
    }

    async previews(c: Context) {
        return ApiResponse.success(c, await this.service.previews(id(c, "assetId")))
    }

    async media(c: Context, original = false) {
        const file = await this.service.assetFile(id(c, "assetId"), original)
        return binary(file.data, file.mime, original)
    }

    async render(c: Context) {
        return binary(
            Buffer.from(await this.service.renderFile(id(c, "renderId"))),
            "image/svg+xml"
        )
    }
}
