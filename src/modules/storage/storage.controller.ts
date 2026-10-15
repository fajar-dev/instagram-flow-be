import type { Context } from "hono"
import { BadRequestException } from "../../core/exceptions/base"
import { ApiResponse } from "../../core/helpers/response"
import { StorageService } from "./storage.service"

export class StorageController {
    constructor(private readonly service: StorageService) {}

    async upload(c: Context) {
        const body = await c.req.parseBody()
        const file = body.file
        if (!(file instanceof File)) throw new BadRequestException("No file uploaded or invalid file")
        return ApiResponse.success(c, await this.service.upload(file), "File uploaded successfully")
    }

    proxy(c: Context) {
        return this.service.proxy(c.req.query("path"))
    }
}
