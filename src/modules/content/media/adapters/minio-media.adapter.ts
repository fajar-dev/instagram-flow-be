import type { Readable } from "node:stream"
import type { IContentMedia } from "../interfaces/content-media.interface"
import { BadRequestException } from "../../../../core/exceptions/base"

export interface IPrivateObjectStorage {
    getPresignedUrl(key: string, expiry: number, bucket: string): Promise<string>
    ensurePrivateBucket(bucket: string): Promise<void>
    upload(key: string, buffer: Buffer, contentType: string, bucket: string): Promise<string>
    getObject(key: string, bucket: string): Promise<{ stream: Readable }>
    delete(key: string, bucket: string): Promise<void>
}

/** Reuses the existing MinIO connection/helper; all media shares the configured private bucket. */
export class MinioMedia implements IContentMedia {
    constructor(
        private readonly storage: IPrivateObjectStorage,
        private readonly bucket: string
    ) {}

    private validateKey(key: string) {
        if (
            key !== "brand/partner-logo.jpeg" &&
            !/^brand\/(design-reference|logo)\.png$/.test(key) &&
            !/^publications\/[a-f0-9-]{36}\.jpg$/.test(key) &&
            !/^renders\/[a-f0-9-]{36}\.jpg$/.test(key) &&
            !/^batches\/[a-f0-9-]{36}\/(original|preview|thumbnail)\/[a-f0-9-]{36}\.(jpeg|jpg|png|webp)$/.test(
                key
            )
        ) {
            throw new BadRequestException("Invalid media key")
        }
    }

    async signedUrl(key: string, expiry: number) {
        this.validateKey(key)
        await this.storage.ensurePrivateBucket(this.bucket)
        return this.storage.getPresignedUrl(key, expiry, this.bucket)
    }

    async put(key: string, data: Buffer) {
        this.validateKey(key)
        await this.storage.ensurePrivateBucket(this.bucket)
        const extension = key.split(".").pop()
        const mime =
            extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg"
        await this.storage.upload(key, data, mime, this.bucket)
    }

    async get(key: string): Promise<Buffer> {
        this.validateKey(key)
        await this.storage.ensurePrivateBucket(this.bucket)
        const { stream } = await this.storage.getObject(key, this.bucket)
        const chunks: Buffer[] = []
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }
        return Buffer.concat(chunks)
    }

    async remove(key: string) {
        this.validateKey(key)
        await this.storage.delete(key, this.bucket)
    }
}
