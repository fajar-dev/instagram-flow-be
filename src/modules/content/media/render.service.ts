import sharp from "sharp"
import { BadRequestException } from "../../../core/exceptions/base"
import { logger } from "../../../core/helpers/logger"
import type { IContentMedia } from "./interfaces/content-media.interface"
import type { Asset } from "./entities/asset.entity"
import type { ResultInput } from "../../ai-job/workflow/validators/workflow.validator"
import { id } from "../../shared/workflow.helpers"

/** Validates AI-produced pixels and normalizes delivery size; never composes a design. */
export class RenderService {
    constructor(private readonly media: IContentMedia) {}

    async create(
        renders: ResultInput["renders"],
        assets: Asset[],
        output: "feed" | "story",
        coverAssetId: string,
        aiResultId: string,
        storedKeys: string[]
    ) {
        const safeRenders = []
        for (const render of renders) {
            const asset = assets.find((a) => a.id === render.assetId && !a.deletedAt)
            if (
                !asset ||
                output !== render.placement ||
                (output === "story" && render.assetId !== coverAssetId) ||
                render.height !== (output === "story" ? 1920 : 1350)
            ) {
                throw new BadRequestException("Invalid render placement or primary asset")
            }
            const bytes = Buffer.from(render.imageBase64, "base64")
            if (
                bytes.length > 12 * 1024 * 1024 ||
                bytes.toString("base64") !== render.imageBase64
            ) {
                throw new BadRequestException("Invalid AI image encoding or size")
            }
            let image: Buffer
            try {
                const decoder = sharp(bytes, { limitInputPixels: 40000000, failOn: "warning" })
                const metadata = await decoder.metadata()
                if (
                    !["jpeg", "png", "webp"].includes(metadata.format || "") ||
                    (metadata.pages || 1) !== 1 ||
                    !metadata.width ||
                    !metadata.height ||
                    metadata.width < 512 ||
                    metadata.height < 512
                ) {
                    throw new Error("Unsupported AI image")
                }
                image = await decoder
                    .rotate()
                    .trim({ background: "#ffffff", threshold: 8 })
                    .resize(1080, render.height, {
                        fit: "cover",
                        position: "centre"
                    })
                    .flatten({ background: "#2d506f" })
                    .jpeg({ quality: 95 })
                    .toBuffer()
            } catch {
                throw new BadRequestException("Invalid or unsupported AI image")
            }
            const renderId = id()
            const storageKey = `renders/${renderId}.jpg`
            storedKeys.push(storageKey)
            await this.media.put(storageKey, image)
            safeRenders.push({
                id: renderId,
                aiResultId,
                placement: render.placement,
                format: "jpeg",
                width: 1080,
                height: render.height,
                assetId: asset.id,
                storageKey,
                renderState: "AI_IMAGE"
            })
        }
        return safeRenders
    }

    async cleanup(keys: string[]) {
        const results = await Promise.allSettled(keys.map((key) => this.media.remove(key)))
        if (results.some((result) => result.status === "rejected")) {
            logger.warn("Rolled back render objects require cleanup", { keys })
        }
    }
}
