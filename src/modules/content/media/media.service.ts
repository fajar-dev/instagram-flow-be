import type { ThumbnailService } from "./thumbnail.service"
import { createHash } from "node:crypto"
import { readUploadImage } from "../../../core/helpers/upload-image"
import { logger } from "../../../core/helpers/logger"
import { config } from "../../../config/config"
import {
    BadRequestException,
    ConflictException,
    NotFoundException
} from "../../../core/exceptions/base"
import type { User } from "../../user/entities/user.entity"
import type { IWorkflowRepository } from "../../shared/interfaces/workflow.repository.interface"
import type { IContentMedia } from "./interfaces/content-media.interface"
import { id } from "../../shared/workflow.helpers"
import { WorkflowContextService } from "../../shared/context.service"

export class MediaService {
    constructor(
        private readonly repository: IWorkflowRepository,
        private readonly media: IContentMedia,
        private readonly context: WorkflowContextService,
        private readonly thumbnails: ThumbnailService
    ) {}

    async upload(actor: User, batchId: string, file: File) {
        await this.context.batch(batchId)
        const { original, metadata, preview } = await readUploadImage(
            file,
            config.media.maxUploadMb
        )
        const assetId = id()
        const originalStorageKey = `batches/${batchId}/original/${assetId}.${metadata.format}`
        const safePreviewStorageKey = `batches/${batchId}/preview/${assetId}.jpg`
        const sha256 = createHash("sha256").update(original).digest("hex")
        try {
            await this.media.put(originalStorageKey, original)
            await this.media.put(safePreviewStorageKey, preview)
            const asset = await this.repository.transaction(async (store) => {
                const batch = await this.context.batch(batchId, store, true)
                if (batch.status !== "DRAFT" && batch.status !== "READY") {
                    throw new ConflictException("Batch is locked for processing")
                }
                const assets = await store.find("asset", { batchId })
                const duplicate = assets.find((a) => a.sha256 === sha256 && !a.deletedAt)
                if (duplicate) {
                    return duplicate
                }
                if (
                    assets.filter((asset) => !asset.deletedAt).length >= config.media.maxBatchFiles
                ) {
                    throw new BadRequestException("Batch photo limit reached")
                }
                const saved = await store.save("asset", {
                    id: assetId,
                    batchId,
                    originalStorageKey,
                    safePreviewStorageKey,
                    sha256,
                    mime: file.type,
                    byteSize: file.size,
                    width: metadata.width!,
                    height: metadata.height!,
                    deletedAt: null
                })
                await store.save("batch", { ...batch, status: "READY" })
                await this.context.audit(store, actor, "ASSET_UPLOADED", "batch", batchId, {
                    assetId
                })
                return saved
            })
            if (asset.id !== assetId) {
                await this.media.remove(originalStorageKey)
                await this.media.remove(safePreviewStorageKey)
            }
            return asset
        } catch (error) {
            const cleanup = await Promise.allSettled([
                this.media.remove(originalStorageKey),
                this.media.remove(safePreviewStorageKey)
            ])
            if (cleanup.some((result) => result.status === "rejected")) {
                logger.warn("Failed upload media requires cleanup", { assetId })
            }
            throw error
        }
    }

    async previews(assetId: string) {
        const asset = await this.repository.get("asset", assetId)
        if (!asset || asset.deletedAt) {
            throw new NotFoundException("Asset not found")
        }
        await this.context.batch(asset.batchId)
        return this.thumbnails.previews(
            asset.safePreviewStorageKey,
            `batches/${asset.batchId}/thumbnail/${asset.id}.jpg`
        )
    }

    async signedUrl(assetId: string) {
        const asset = await this.repository.get("asset", assetId)
        if (!asset || asset.deletedAt) {
            throw new NotFoundException("Asset not found")
        }
        return this.media.signedUrl(asset.safePreviewStorageKey, config.media.signedTtl)
    }

    async assetFile(assetId: string, original = false) {
        const asset = await this.repository.get("asset", assetId)
        if (!asset || asset.deletedAt) {
            throw new NotFoundException("Asset not found")
        }
        await this.context.batch(asset.batchId)
        return {
            data: await this.media.get(
                original ? asset.originalStorageKey : asset.safePreviewStorageKey
            ),
            mime: original ? asset.mime : "image/jpeg"
        }
    }

    async renderFile(renderId: string) {
        const render = await this.repository.get("render", renderId)
        if (!render) {
            throw new NotFoundException("Render not found")
        }
        const ai = await this.repository.get("aiResult", render.aiResultId)
        await this.context.job(ai!.jobId)
        return this.media.get(render.storageKey)
    }

    async deleteAsset(actor: User, assetId: string) {
        return this.repository.transaction(async (store) => {
            const asset = await store.get("asset", assetId)
            if (!asset) {
                throw new NotFoundException("Asset not found")
            }
            await this.context.batch(asset.batchId, store, true)
            if ((await store.find("job", { batchId: asset.batchId })).length) {
                throw new ConflictException("Asset is referenced by a job")
            }
            await store.save("asset", { ...asset, deletedAt: new Date() })
            await this.context.audit(store, actor, "ASSET_ARCHIVED", "asset", assetId)
            return null
        })
    }
}
